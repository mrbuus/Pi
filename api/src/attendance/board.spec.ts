import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {
  DEFAULT_CRITERIA,
  computeRisk,
  criteriaToStore,
  homeworkVariants,
  normalizeCriteria,
  normalizeVariant,
  previousLessonDate,
} from './board-logic';
import { assertMarkAccess } from './marking-access';
import { AttendanceStatus, LateRange, Role } from '../generated/prisma/enums';
import { PRESENCE_KEY_RE } from '../presence/presence.dto';
import { HomeworkMarksService } from '../assignments/homework-marks.service';

/* ───────── ӨС-ийн жижиг stub: attendance хүснэгт санах ойд ───────── */

type Row = {
  id: string;
  classroomId: string;
  studentId: string;
  date: Date;
  status: AttendanceStatus;
  note: string | null;
  lateRange: LateRange | null;
  markedById: string;
};

function setup(initial: Partial<Row>[] = []) {
  let n = 0;
  const rows: Row[] = initial.map((r) => ({
    id: `a${++n}`,
    classroomId: 'class',
    studentId: 's1',
    date: new Date('2026-10-18'),
    status: AttendanceStatus.PRESENT,
    note: null,
    lateRange: null,
    markedById: 'teacher',
    ...r,
  }));
  const key = (w: { classroomId_studentId_date: { studentId: string; date: Date } }) =>
    rows.find(
      (r) =>
        r.studentId === w.classroomId_studentId_date.studentId &&
        r.date.getTime() === w.classroomId_studentId_date.date.getTime(),
    );
  const attendance = {
    findMany: jest.fn(async ({ where }: { where: { studentId?: { in: string[] } } }) =>
      rows.filter((r) => !where.studentId || where.studentId.in.includes(r.studentId)),
    ),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const cur = key(where);
      if (cur) {
        Object.assign(cur, update);
        return { ...cur };
      }
      const row = { id: `a${++n}`, ...create } as Row;
      rows.push(row);
      return { ...row };
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const cur = key(where)!;
      Object.assign(cur, data);
      return { ...cur };
    }),
    delete: jest.fn(async ({ where }: any) => {
      const cur = key(where)!;
      rows.splice(rows.indexOf(cur), 1);
      return cur;
    }),
  };
  const db: any = {
    classroom: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'class',
        teacherId: 'teacher',
        assistantTeacherId: 'assistant',
        archived: false,
        riskCriteria: null,
      }),
    },
    enrollment: {
      findMany: jest.fn().mockResolvedValue([
        { studentId: 's1' },
        { studentId: 's2' },
      ]),
    },
    classSchedule: { count: jest.fn().mockResolvedValue(0) },
    lessonStaffing: { count: jest.fn().mockResolvedValue(0) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    attendance,
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(db)),
  };
  const audit = { record: jest.fn() };
  return {
    db,
    rows,
    audit,
    service: new AttendanceService(db, {} as never, audit as never),
  };
}

describe('Ирц тэмдэглэх — нэг товшилт, тэмдэглэл устахгүй (D8)', () => {
  it('note ирүүлээгүй бол хуучин тэмдэглэл ХЭВЭЭР', async () => {
    const { service, rows } = setup([
      { status: AttendanceStatus.ABSENT, note: 'өвчтэй' },
    ]);
    await service.mark(
      'class',
      { date: '2026-10-18', entries: [{ studentId: 's1', status: AttendanceStatus.EXCUSED }] },
      'teacher',
      Role.TEACHER,
    );
    expect(rows[0]).toMatchObject({ status: AttendanceStatus.EXCUSED, note: 'өвчтэй' });
  });

  it('null эсвэл хоосон тэмдэглэл л цэвэрлэнэ', async () => {
    const { service, rows } = setup([{ note: 'хоцорсон' }]);
    await service.mark(
      'class',
      { date: '2026-10-18', entries: [{ studentId: 's1', status: AttendanceStatus.PRESENT, note: '  ' }] },
      'teacher',
      Role.TEACHER,
    );
    expect(rows[0].note).toBeNull();
    rows[0].note = 'дахин';
    await service.mark(
      'class',
      { date: '2026-10-18', entries: [{ studentId: 's1', note: null }] },
      'teacher',
      Role.TEACHER,
    );
    expect(rows[0].note).toBeNull();
  });

  it('огноог parseDateOnly-оор (UTC шөнө дунд), буруу бол 400', async () => {
    const { service, db } = setup();
    await service.mark(
      'class',
      { date: '2026-10-18', entries: [{ studentId: 's1', status: AttendanceStatus.PRESENT }] },
      'teacher',
      Role.TEACHER,
    );
    const created = db.attendance.upsert.mock.calls[0][0].create;
    expect(created.date.toISOString()).toBe('2026-10-18T00:00:00.000Z');
    await expect(
      service.mark(
        'class',
        { date: '2026-02-30', entries: [{ studentId: 's1', status: AttendanceStatus.PRESENT }] },
        'teacher',
        Role.TEACHER,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('хоцролтын хугацаа: LATE хэвээр бол хадгална, өөр төлөвт цэвэрлэнэ', async () => {
    const { service, rows } = setup([
      { status: AttendanceStatus.LATE, lateRange: LateRange.TEN_TO_THIRTY },
    ]);
    await service.mark(
      'class',
      { date: '2026-10-18', entries: [{ studentId: 's1', status: AttendanceStatus.LATE }] },
      'teacher',
      Role.TEACHER,
    );
    expect(rows[0].lateRange).toBe(LateRange.TEN_TO_THIRTY);
    await service.mark(
      'class',
      { date: '2026-10-18', entries: [{ studentId: 's1', status: AttendanceStatus.PRESENT }] },
      'teacher',
      Role.TEACHER,
    );
    expect(rows[0].lateRange).toBeNull();
  });

  it('status: null = цэвэрлэх; onlyIf өөр багшийн тэмдэглэснийг дарахгүй', async () => {
    const { service, rows } = setup([{ studentId: 's1', status: AttendanceStatus.ABSENT }]);
    const res = await service.mark(
      'class',
      {
        date: '2026-10-18',
        entries: [
          { studentId: 's1', status: AttendanceStatus.PRESENT, onlyIf: 'UNMARKED' },
          { studentId: 's2', status: AttendanceStatus.PRESENT, onlyIf: 'UNMARKED' },
        ],
      },
      'teacher',
      Role.TEACHER,
    );
    expect(res.applied).toEqual(['s2']);
    expect(res.skipped).toEqual(['s1']);
    expect(rows.find((r) => r.studentId === 's1')!.status).toBe(AttendanceStatus.ABSENT);
    // Буцаах: PRESENT хэвээр байвал л цэвэрлэнэ
    await service.mark(
      'class',
      {
        date: '2026-10-18',
        entries: [
          { studentId: 's1', status: null, onlyIf: AttendanceStatus.PRESENT },
          { studentId: 's2', status: null, onlyIf: AttendanceStatus.PRESENT },
        ],
      },
      'teacher',
      Role.TEACHER,
    );
    expect(rows.map((r) => r.studentId)).toEqual(['s1']);
  });
});

describe('Тэмдэглэх эрх — Багш (marking-access, D9)', () => {
  const date = new Date('2026-10-18');
  it('Багш — тухайн өдөр хуваарьт нэр нь байгаагүй ч бүх идэвхтэй ангийг тэмдэглэнэ (эзэн 2026-10-19)', async () => {
    const { db, service } = setup();
    await expect(assertMarkAccess(db, 'class', 'assistant', Role.TEACHER, { date })).resolves.toBeTruthy();
    await expect(assertMarkAccess(db, 'class', 'stranger', Role.TEACHER, { date })).resolves.toBeTruthy();
    expect(db.lessonStaffing.count).not.toHaveBeenCalled();
    await expect(
      service.mark(
        'class',
        { date: '2026-10-18', entries: [{ studentId: 's1', status: AttendanceStatus.PRESENT }] },
        'stranger',
        Role.TEACHER,
      ),
    ).resolves.toBeTruthy();
  });
  it('сурагч — хориотой; Багш+ — бүх анги', async () => {
    const { db } = setup();
    await expect(assertMarkAccess(db, 'class', 'kid', Role.STUDENT, { date })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(assertMarkAccess(db, 'class', 'plus', Role.TEACHER_PLUS, { date })).resolves.toBeTruthy();
  });
});

describe('Шалгуур ба эрсдэл (board-logic)', () => {
  it('буруу JSON-ыг анхдагчаар, анхдагчтай тэнцүүг null болгож хадгална', () => {
    expect(normalizeCriteria({ windowDays: 13, minAttendance: 90 })).toEqual({
      ...DEFAULT_CRITERIA,
      minAttendance: 90,
    });
    expect(criteriaToStore({ ...DEFAULT_CRITERIA })).toEqual({ ok: true, value: null });
    expect(criteriaToStore({ ...DEFAULT_CRITERIA, minHomework: 62 }).ok).toBe(false);
    expect(criteriaToStore({ ...DEFAULT_CRITERIA, maxLates: 2 })).toEqual({
      ok: true,
      value: { ...DEFAULT_CRITERIA, maxLates: 2 },
    });
  });

  it('цөөн тэмдэглэгээгээр хувь бодохгүй, дараалсан «хийгээгүй»-г тоолно', () => {
    const flags = computeRisk(
      ['a', 'b', 'c'],
      [
        { studentId: 'a', date: '2026-10-01', status: 'ABSENT' },
        { studentId: 'b', date: '2026-10-01', status: 'ABSENT' },
        { studentId: 'b', date: '2026-10-03', status: 'ABSENT' },
        { studentId: 'b', date: '2026-10-05', status: 'ABSENT' },
        { studentId: 'b', date: '2026-10-07', status: 'PRESENT' },
      ],
      [
        { studentId: 'c', date: '2026-10-01', status: 'DONE' },
        { studentId: 'c', date: '2026-10-03', status: 'NOT_DONE' },
        { studentId: 'c', date: '2026-10-05', status: 'NOT_DONE' },
      ],
      DEFAULT_CRITERIA,
    );
    expect(flags.a).toEqual([]);
    expect(flags.b.map((f) => f.label)).toEqual(['Ирц 25%', '3 удаа тасалсан']);
    expect(flags.c.map((f) => f.label)).toEqual(['Даалгавар 33%', '2 удаа дараалан хийгээгүй']);
  });
});

describe('Гэрийн даалгаврын онлайн тест', () => {
  it('өмнөх хичээл: амралт, цуцлалт алгасна; тест хийсэн өдөр хичээлд тооцогдоно', () => {
    const patterns = [{ id: 'p', weekday: 6, effectiveFrom: '2026-09-01', effectiveTo: null }];
    // 2026-10-17 Бямба (6), 2026-10-10 Бямба
    expect(previousLessonDate({ date: '2026-10-18', patterns, exceptions: [], holidays: [], sessionDates: [] })).toBe('2026-10-17');
    expect(
      previousLessonDate({
        date: '2026-10-18',
        patterns,
        exceptions: [{ scheduleId: 'p', date: '2026-10-17', kind: 'CANCELLED', newDate: null }],
        holidays: [],
        sessionDates: [],
      }),
    ).toBe('2026-10-10');
    expect(previousLessonDate({ date: '2026-10-18', patterns, exceptions: [], holidays: ['2026-10-17'], sessionDates: ['2026-10-14'] })).toBe('2026-10-14');
    expect(previousLessonDate({ date: '2026-10-18', patterns: [], exceptions: [], holidays: [], sessionDates: [] })).toBeNull();
  });

  it('A хийсэн бол B, кирилл «А»-г ч таних', () => {
    expect(normalizeVariant('А')).toBe('A');
    const pairs = homeworkVariants(
      [
        { id: 't1a', groupKey: 'g1', variantLabel: 'А' },
        { id: 'x', groupKey: null, variantLabel: null },
      ],
      [
        { id: 't1a', groupKey: 'g1', variantLabel: 'А' },
        { id: 't1b', groupKey: 'g1', variantLabel: 'B' },
      ],
    );
    expect(pairs).toEqual([{ fromTestId: 't1a', testId: 't1b' }]);
  });
});

describe('Зэрэг тэмдэглэх: «мөн тэмдэглэж байна» түлхүүр', () => {
  it('attendance:<анги>:<огноо> зөвшөөрнө, бусдыг үгүй', () => {
    expect(PRESENCE_KEY_RE.test('attendance:cmuzbhtr70006c97nt1f84wgm:2026-10-18')).toBe(true);
    expect(PRESENCE_KEY_RE.test('exam:t1')).toBe(true);
    expect(PRESENCE_KEY_RE.test('attendance:cls')).toBe(false);
    expect(PRESENCE_KEY_RE.test('attendance:cls:18-10-2026')).toBe(false);
  });
});

describe('Даалгаврын тэмдэглэгээ — нөхцөлт бичилт', () => {
  it('onlyIf таарахгүй бол бичихгүй (өөр багшийнхыг дарахгүй)', async () => {
    const db: any = {
      classroom: { findUnique: jest.fn().mockResolvedValue({ id: 'class', teacherId: 'teacher', archived: false }) },
      enrollment: { findFirst: jest.fn().mockResolvedValue({ id: 'e' }) },
      dailyHomeworkMark: {
        findUnique: jest.fn().mockResolvedValue({ status: 'NOT_DONE', comment: null, markedById: 'other', updatedAt: new Date() }),
        upsert: jest.fn(),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Анар', lastName: 'Ам' }) },
    };
    const svc = new HomeworkMarksService(db, { record: jest.fn() } as never);
    const res = await svc.setMark(
      'class',
      's1',
      { date: '2026-10-18', status: 'DONE', onlyIf: 'UNMARKED' } as never,
      'teacher',
      Role.TEACHER,
    );
    expect(res).toMatchObject({ applied: false, status: 'NOT_DONE', markedBy: 'А. Анар' });
    expect(db.dailyHomeworkMark.upsert).not.toHaveBeenCalled();
  });
});
