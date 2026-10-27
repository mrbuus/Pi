import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { LessonRecordsController } from './lesson-records.controller';
import {
  buildSnapshot,
  enrolledOn,
  normalizeNote,
  parseProblemNumbers,
} from './lesson-records.logic';
import { LessonRecordsService } from './lesson-records.service';

const DATE = '2026-10-05';
const ENTRY = {
  scheduleId: 's1',
  classroomId: 'c1',
  classroomName: '12А (Баруун 4)',
  teacherId: null,
  teacherName: null,
  startMinute: 960,
  endMinute: 1080,
  room: 'Б1',
  subject: null,
  topic: 'Логарифм',
  leadTeacher: { id: 'lead', name: 'Бат Дорж' },
  assistantTeacher: { id: 'asst', name: 'Сараа Болд' },
  exception: null,
};

function makePrisma() {
  const prisma: any = {
    classSchedule: {
      findUnique: jest.fn(async () => ({
        classroomId: 'c1',
        teacherId: null,
        classroom: { teacherId: null },
      })),
      count: jest.fn(async () => 1),
    },
    enrollment: {
      findMany: jest.fn(async ({ where }: any) =>
        where.classroomId?.not ? [{ studentId: 'late' }] : [
        {
          studentId: 'st1',
          joinedAt: new Date('2026-09-01T00:00:00Z'),
          leftAt: null,
          student: { firstName: 'Анар', lastName: 'Б' },
        },
        {
          studentId: 'st2',
          joinedAt: new Date('2026-09-01T00:00:00Z'),
          leftAt: null,
          student: { firstName: 'Билгүүн', lastName: 'Г' },
        },
        // Тухайн өдрөөс ХОЙШ өөр ангиас шилжсэн — түүхэнд орохгүй
        {
          studentId: 'late',
          joinedAt: new Date('2026-10-06T03:00:00Z'),
          leftAt: null,
          student: { firstName: 'Хожуу', lastName: 'Э' },
        },
      ]),
    },
    attendance: {
      findMany: jest.fn(async () => [
        { studentId: 'st1', status: 'PRESENT' },
        { studentId: 'st2', status: 'ABSENT' },
      ]),
    },
    classTestSession: {
      findMany: jest.fn(async () => [
        { id: 'ts1', testId: 't1', manualTitle: null },
        { id: 'ts2', testId: null, manualTitle: 'Гараар тест' },
      ]),
    },
    test: { findMany: jest.fn(async () => [{ id: 't1', title: 'Тест 18' }]) },
    user: {
      findUnique: jest.fn(async () => ({ firstName: 'Ажилтан', lastName: 'А' })),
      // Багш+ тэмдэг (common/teacher-plus) — энд Багш+ хэн ч үгүй
      findMany: jest.fn(async () => []),
    },
    lessonRecord: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async ({ create }) => ({
        id: 'r1',
        confirmedAt: new Date(),
        ...create,
      })),
      findMany: jest.fn(async () => []),
      update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      delete: jest.fn(async () => ({})),
    },
    lessonRecordStudent: {
      deleteMany: jest.fn(async () => ({})),
      createMany: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({})),
      findMany: jest.fn(async () => []),
    },
    lessonNote: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async ({ create }) => ({
        id: 'n1',
        updatedAt: new Date(),
        ...create,
      })),
      update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
      delete: jest.fn(async () => ({})),
      findMany: jest.fn(async () => []),
    },
    classDismissal: { findMany: jest.fn(async () => []) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
  return prisma;
}

function makeService(prisma = makePrisma()) {
  const schedule: any = {
    getWeek: jest.fn(async () => ({
      days: [{ date: DATE, entries: [ENTRY] }],
    })),
  };
  return { service: new LessonRecordsService(prisma, schedule), prisma, schedule };
}

describe('lesson-records logic', () => {
  it('хоосон тайлбар null болно (хадгалахгүй); 500-аас урт нь татгалзана', () => {
    expect(normalizeNote('')).toBeNull();
    expect(normalizeNote('   \n ')).toBeNull();
    expect(normalizeNote(null)).toBeNull();
    expect(normalizeNote('  тэмдэглэл ')).toBe('тэмдэглэл');
    expect(normalizeNote('а'.repeat(500))).toHaveLength(500);
    expect(() => normalizeNote('а'.repeat(501))).toThrow();
    expect(() => normalizeNote(5)).toThrow();
  });

  it('шилжсэн сурагчид joinedAt-ыг УБ-ын өдрийн хилээр; анхны элсэлтэд үгүй', () => {
    const moved = (joinedAt: string) => ({ joinedAt: new Date(joinedAt), leftAt: null, movedIn: true });
    // УБ 2026-10-05 23:30 = 15:30Z — тэр өдөрт шилжсэн
    expect(enrolledOn(moved('2026-10-05T15:30:00Z'), DATE)).toBe(true);
    // УБ 2026-10-06 00:30 = 16:30Z — дараа өдөр
    expect(enrolledOn(moved('2026-10-05T16:30:00Z'), DATE)).toBe(false);
    // Анхны элсэлт (импортоор хожуу joinedAt) — өмнөх хичээлд гишүүн
    expect(
      enrolledOn({ joinedAt: new Date('2026-10-08T01:00:00Z'), leftAt: null }, DATE),
    ).toBe(true);
    // Өмнөх өдөр гарсан
    expect(
      enrolledOn(
        {
          joinedAt: new Date('2026-09-01T00:00:00Z'),
          leftAt: new Date('2026-10-04T10:00:00Z'),
        },
        DATE,
      ),
    ).toBe(false);
  });

  it('snapshot нь нэр/сэдэв/тест/ирцийг ТЕКСТ болгон хуулна', () => {
    const snap = buildSnapshot({
      entry: ENTRY,
      students: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
      ],
      attendance: [
        { studentId: 'a', status: 'LATE' },
        { studentId: 'b', status: 'EXCUSED' },
      ],
      tests: [{ id: 'x', testId: null, title: 'T' }],
    });
    expect(snap.record).toMatchObject({
      topic: 'Логарифм',
      leadTeacherName: 'Бат Дорж',
      assistantTeacherName: 'Сараа Болд',
      testCount: 1,
      enrolledCount: 3,
      presentCount: 1,
      absentCount: 1,
      attendanceMarked: 2,
    });
    expect(snap.students.map((s) => s.attendance)).toEqual(['LATE', 'EXCUSED', null]);
  });
});

describe('LessonRecordsService.confirm', () => {
  it('батлах үеийн баримтыг бүрэн хадгалж, аудит бичнэ', async () => {
    const { service, prisma } = makeService();
    const out = await service.confirm(
      { userId: 'tp', role: Role.TEACHER_PLUS },
      's1',
      DATE,
    );
    const create = prisma.lessonRecord.upsert.mock.calls[0][0].create;
    expect(create).toMatchObject({
      scheduleId: 's1',
      classroomId: 'c1',
      classroomName: '12А (Баруун 4)',
      topic: 'Логарифм',
      leadTeacherId: 'lead',
      leadTeacherName: 'Бат Дорж',
      assistantTeacherName: 'Сараа Болд',
      room: 'Б1',
      testCount: 2,
      enrolledCount: 2,
      presentCount: 1,
      absentCount: 1,
      confirmedById: 'tp',
      confirmedByName: 'Ажилтан А',
    });
    expect(create.tests.map((t: any) => t.title)).toEqual(['Тест 18', 'Гараар тест']);
    const students = prisma.lessonRecordStudent.createMany.mock.calls[0][0].data;
    expect(students.map((s: any) => [s.studentId, s.attendance])).toEqual([
      ['st1', 'PRESENT'],
      ['st2', 'ABSENT'],
    ]);
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
      action: 'CONFIRM',
      entity: 'LessonRecord',
      actorId: 'tp',
    });
    expect(out.date).toBe(DATE);
  });

  it('эрх: зөвхөн Багш+, Админ батална (эзэн 2026-10-18); Багш — тэр өдөр орсон ч үгүй', async () => {
    const { service, prisma } = makeService();
    for (const role of [Role.TEACHER, Role.STUDENT, Role.PARENT, Role.BUYER])
      await expect(
        service.confirm({ userId: 'lead', role }, 's1', DATE),
      ).rejects.toThrow();
    expect(prisma.lessonRecord.upsert).not.toHaveBeenCalled();
    await service.confirm({ userId: 'tp', role: Role.TEACHER_PLUS }, 's1', DATE);
    await service.confirm({ userId: 'adm', role: Role.ADMIN }, 's1', DATE);
    expect(prisma.lessonRecord.upsert).toHaveBeenCalledTimes(2);
  });

  it('батлахдаа хийсэн тест + хассан бодлогыг ClassTestSession-д бичнэ, бусдыг устгана', async () => {
    const { service, prisma } = makeService();
    prisma.test.findMany = jest.fn(async ({ select }: any) =>
      select?.problems
        ? [
            { id: 't1', problems: [{ problemId: 'p1' }, { problemId: 'p2' }] },
            { id: 't2', problems: [{ problemId: 'q1' }] },
          ]
        : [{ id: 't1', title: 'Тест 18' }],
    );
    prisma.classTestSession.findMany = jest.fn(async ({ where }: any) =>
      where.testId ? [{ id: 'old', testId: 't9', excludedProblemIds: [] }] : [],
    );
    prisma.classTestSession.deleteMany = jest.fn(async () => ({ count: 1 }));
    prisma.classTestSession.upsert = jest.fn(async () => ({}));
    await service.confirm({ userId: 'tp', role: Role.TEACHER_PLUS }, 's1', DATE, [
      { testId: 't1', excludedProblemIds: ['p2', 'p2'] },
      { testId: 't2', excludedProblemIds: [] },
    ]);
    const del = prisma.classTestSession.deleteMany.mock.calls[0][0].where;
    expect(del).toMatchObject({ classroomId: 'c1', testId: { not: null, notIn: ['t1', 't2'] } });
    const ups = prisma.classTestSession.upsert.mock.calls.map((c: any) => c[0]);
    expect(ups[0].where.classroomId_testId_date).toMatchObject({ classroomId: 'c1', testId: 't1' });
    expect(ups[0].create.excludedProblemIds).toEqual(['p2']);
    expect(ups[0].update).toEqual({ excludedProblemIds: ['p2'] });
    expect(ups[1].create.excludedProblemIds).toEqual([]);
    expect(prisma.lessonRecord.upsert).toHaveBeenCalled();
  });

  it('өөр тестийн бодлогыг хасах, байхгүй тест — 400, юу ч бичихгүй', async () => {
    const { service, prisma } = makeService();
    prisma.test.findMany = jest.fn(async () => [
      { id: 't1', problems: [{ problemId: 'p1' }] },
    ]);
    prisma.classTestSession.upsert = jest.fn();
    await expect(
      service.confirm({ userId: 'tp', role: Role.TEACHER_PLUS }, 's1', DATE, [
        { testId: 't1', excludedProblemIds: ['zzz'] },
      ]),
    ).rejects.toThrow('Хассан бодлого');
    await expect(
      service.confirm({ userId: 'tp', role: Role.TEACHER_PLUS }, 's1', DATE, [
        { testId: 't1', excludedProblemIds: [] },
        { testId: 'missing', excludedProblemIds: [] },
      ]),
    ).rejects.toThrow('олдсонгүй');
    expect(prisma.classTestSession.upsert).not.toHaveBeenCalled();
    expect(prisma.lessonRecord.upsert).not.toHaveBeenCalled();
  });

  it('ирээдүйн огноо болон тэр өдөр товлогдоогүй хичээлийг батлахгүй', async () => {
    const { service, schedule } = makeService();
    await expect(
      service.confirm({ userId: 'tp', role: Role.TEACHER_PLUS }, 's1', '2999-01-01'),
    ).rejects.toThrow('Ирээдүйн');
    schedule.getWeek.mockResolvedValueOnce({ days: [{ date: DATE, entries: [] }] });
    await expect(
      service.confirm({ userId: 'tp', role: Role.TEACHER_PLUS }, 's1', DATE),
    ).rejects.toThrow('товлогдоогүй');
  });

  it('буцаахад аудит REVERSE бичнэ; энгийн багш буцаахгүй', async () => {
    const { service, prisma } = makeService();
    prisma.lessonRecord.findUnique.mockResolvedValue({
      id: 'r1',
      confirmedById: 'tp',
      leadTeacherId: 'lead',
      assistantTeacherId: null,
      cancelledAt: null,
      students: [],
    });
    await expect(
      service.unconfirm({ userId: 'lead', role: Role.TEACHER }, 's1', DATE),
    ).rejects.toThrow();
    await service.unconfirm({ userId: 'tp', role: Role.TEACHER_PLUS }, 's1', DATE);
    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe('REVERSE');
  });

  it('батламж цуцлах ЗӨӨЛӨН: мөр, сурагчид устахгүй, cancelledAt бөглөгдөнө', async () => {
    const { service, prisma } = makeService();
    const row = {
      id: 'r1',
      topic: 'Логарифм',
      confirmedById: 'tp',
      cancelledAt: null,
      students: [{ id: 'rs1', studentId: 'st1', attendance: 'PRESENT' }],
    };
    prisma.lessonRecord.findUnique.mockResolvedValue(row);
    const out = await service.unconfirm(
      { userId: 'tp', role: Role.TEACHER_PLUS },
      's1',
      DATE,
    );
    expect(out).toEqual({ scheduleId: 's1', date: DATE, confirmed: false });
    expect(prisma.lessonRecord.delete).not.toHaveBeenCalled();
    expect(prisma.lessonRecordStudent.deleteMany).not.toHaveBeenCalled();
    const upd = prisma.lessonRecord.update.mock.calls[0][0];
    expect(upd.where).toEqual({ id: 'r1' });
    expect(upd.data.cancelledAt).toBeInstanceOf(Date);
    expect(upd.data.cancelledById).toBe('tp');
    // Аудитын before-д бүтэн мөр (сурагчидтай) үлдэнэ
    const audit = prisma.auditLog.create.mock.calls[0][0].data;
    expect(audit.before).toMatchObject({ id: 'r1', topic: 'Логарифм', students: [{ studentId: 'st1' }] });
    expect(audit.after).toMatchObject({ cancelledById: 'tp' });

    // Аль хэдийн цуцлагдсан бол дахин цуцлахгүй (404), юу ч бичихгүй
    prisma.lessonRecord.findUnique.mockResolvedValue({ ...row, cancelledAt: new Date() });
    await expect(
      service.unconfirm({ userId: 'tp', role: Role.TEACHER_PLUS }, 's1', DATE),
    ).rejects.toThrow('олдсонгүй');
    expect(prisma.lessonRecord.update).toHaveBeenCalledTimes(1);
  });

  it('цуцлагдсан мөрийг дахин батлахад шинээр үүсгэхгүй — сэргээнэ (RECONFIRM, before аудитад)', async () => {
    const { service, prisma } = makeService();
    const cancelled = {
      id: 'r1',
      scheduleId: 's1',
      topic: 'Хуучин сэдэв',
      description: 'Хуучин тайлбар',
      problemNumbersText: null,
      cancelledAt: new Date('2026-10-06T02:00:00Z'),
      cancelledById: 'tp',
      students: [
        { id: 'rs1', studentId: 'st1', studentName: 'Анар Б', attendance: 'ABSENT', removedAt: null },
        { id: 'rsX', studentId: 'gone', studentName: 'Явсан', attendance: 'PRESENT', removedAt: null },
      ],
    };
    prisma.lessonRecord.findUnique.mockResolvedValue(cancelled);
    await service.confirm({ userId: 'adm', role: Role.ADMIN }, 's1', DATE);

    const ups = prisma.lessonRecord.upsert.mock.calls[0][0];
    expect(ups.where).toEqual({ scheduleId_date: { scheduleId: 's1', date: expect.any(Date) } });
    expect(ups.update).toMatchObject({ cancelledAt: null, cancelledById: null, confirmedById: 'adm' });
    // Сурагчдыг хэзээ ч устгахгүй
    expect(prisma.lessonRecordStudent.deleteMany).not.toHaveBeenCalled();
    // Шинэ сурагч (st2) нэмэгдэнэ, байсан st1-ийн ирц шинэчлэгдэнэ
    expect(prisma.lessonRecordStudent.createMany.mock.calls[0][0].data.map((s: any) => s.studentId)).toEqual(['st2']);
    expect(prisma.lessonRecordStudent.update).toHaveBeenCalledWith({
      where: { id: 'rs1' },
      data: { studentName: 'Анар Б', attendance: 'PRESENT', removedAt: null },
    });
    // snapshot-оос гарсан сурагч — removedAt
    const gone = prisma.lessonRecordStudent.updateMany.mock.calls[0][0];
    expect(gone.where).toEqual({ id: { in: ['rsX'] } });
    expect(gone.data.removedAt).toBeInstanceOf(Date);

    const audit = prisma.auditLog.create.mock.calls
      .map((c: any) => c[0].data)
      .find((d: any) => d.entity === 'LessonRecord');
    expect(audit.action).toBe('RECONFIRM');
    expect(audit.before).toMatchObject({ topic: 'Хуучин сэдэв', description: 'Хуучин тайлбар', students: [{ studentId: 'st1' }, { studentId: 'gone' }] });
  });
});

describe('Багшийн тайлбар', () => {
  it('хоосон тайлбар мөр үүсгэхгүй; байсан бол ЗӨӨЛӨН хасна (устгахгүй, хуучин бичвэр аудитад)', async () => {
    const { service, prisma } = makeService();
    const r = await service.setNote(
      { userId: 't', role: Role.TEACHER },
      's1',
      DATE,
      '   ',
    );
    expect(r.note).toBeNull();
    expect(prisma.lessonNote.upsert).not.toHaveBeenCalled();
    expect(prisma.lessonNote.update).not.toHaveBeenCalled();
    prisma.lessonNote.findUnique.mockResolvedValueOnce({ id: 'n1', body: 'Самбар эвдэрсэн', deletedAt: null });
    const r2 = await service.setNote({ userId: 't', role: Role.TEACHER }, 's1', DATE, '');
    expect(r2.note).toBeNull();
    expect(prisma.lessonNote.delete).not.toHaveBeenCalled();
    expect(prisma.lessonNote.upsert).not.toHaveBeenCalled();
    const upd = prisma.lessonNote.update.mock.calls[0][0];
    expect(upd.where).toEqual({ id: 'n1' });
    expect(upd.data.deletedAt).toBeInstanceOf(Date);
    expect(upd.data.deletedById).toBe('t');
    expect(upd.data).not.toHaveProperty('body');
    const audit = prisma.auditLog.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({ action: 'DELETE', entity: 'LessonNote', before: { body: 'Самбар эвдэрсэн' } });

    // Аль хэдийн хасагдсаныг дахин хасахгүй
    prisma.lessonNote.findUnique.mockResolvedValueOnce({ id: 'n1', body: 'x', deletedAt: new Date() });
    await service.setNote({ userId: 't', role: Role.TEACHER }, 's1', DATE, '');
    expect(prisma.lessonNote.update).toHaveBeenCalledTimes(1);
  });

  it('хассан тайлбарт дахин бичихэд мөрийг сэргээнэ (deletedAt цэвэрлэнэ)', async () => {
    const { service, prisma } = makeService();
    prisma.lessonNote.findUnique.mockResolvedValueOnce({ id: 'n1', body: 'x', deletedAt: new Date() });
    await service.setNote({ userId: 't', role: Role.TEACHER }, 's1', DATE, 'Шинэ');
    expect(prisma.lessonNote.upsert.mock.calls[0][0].update).toMatchObject({
      body: 'Шинэ',
      deletedAt: null,
      deletedById: null,
    });
  });

  it('уншилт: цуцлагдсан батламж, хассан тайлбар хаана ч харагдахгүй', async () => {
    const { service, prisma } = makeService();
    await service.day({ userId: 'a', role: Role.ADMIN }, DATE);
    expect(prisma.lessonRecord.findMany.mock.calls[0][0].where).toMatchObject({ cancelledAt: null });
    expect(prisma.lessonNote.findMany.mock.calls[0][0].where).toMatchObject({ deletedAt: null });
    await service.classroomHistory({ userId: 'a', role: Role.ADMIN }, 'c1');
    expect(prisma.lessonRecord.findMany.mock.calls[1][0].where).toEqual({ classroomId: 'c1', cancelledAt: null });
  });

  it('бүх ажилтан бичнэ; сурагч/эцэг эх бичихгүй, өдрийн өгөгдлийг уншихгүй', async () => {
    const { service, prisma } = makeService();
    for (const role of [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER])
      await service.setNote({ userId: 'u', role }, 's1', DATE, 'Самбар эвдэрсэн');
    expect(prisma.lessonNote.upsert).toHaveBeenCalledTimes(3);
    for (const role of [Role.STUDENT, Role.PARENT]) {
      await expect(
        service.setNote({ userId: 'u', role }, 's1', DATE, 'x'),
      ).rejects.toThrow();
      await expect(service.day({ userId: 'u', role }, DATE)).rejects.toThrow();
    }
  });

  it('сурагчийн түүхэнд тайлбар, ангийн тоо БАЙХГҮЙ; зөвхөн өөрийн studentId-ээр', async () => {
    const { service, prisma } = makeService();
    prisma.lessonRecordStudent.findMany.mockResolvedValue([
      {
        attendance: 'PRESENT',
        record: {
          id: 'r1',
          date: new Date(`${DATE}T00:00:00Z`),
          classroomName: '12А',
          startMinute: 960,
          endMinute: 1080,
          room: 'Б1',
          topic: 'Логарифм',
          leadTeacherName: 'Бат Дорж',
          assistantTeacherName: null,
          presentCount: 10,
          enrolledCount: 12,
          confirmedByName: 'Ажилтан',
        },
      },
    ]);
    const rows = await service.mine({ userId: 'st1', role: Role.STUDENT });
    expect(prisma.lessonRecordStudent.findMany.mock.calls[0][0].where).toEqual({
      studentId: 'st1',
      removedAt: null,
      record: { cancelledAt: null },
    });
    expect(Object.keys(rows[0]).sort()).toEqual(
      [
        'id',
        'date',
        'classroomName',
        'startMinute',
        'endMinute',
        'room',
        'topic',
        'leadTeacherName',
        'assistantTeacherName',
        'attendance',
      ].sort(),
    );
    expect(JSON.stringify(rows)).not.toMatch(/note|body|presentCount/i);
    for (const role of [Role.TEACHER, Role.PARENT, Role.ADMIN])
      await expect(service.mine({ userId: 'u', role })).rejects.toThrow();
  });
});

describe('Сурагчийн хичээлийн түүх (ажилтан)', () => {
  const row = {
    attendance: 'PRESENT',
    record: {
      id: 'r1',
      date: new Date(`${DATE}T00:00:00Z`),
      classroomName: '12А',
      startMinute: 960,
      endMinute: 1080,
      room: 'Б1',
      topic: 'Логарифм',
      leadTeacherName: 'Бат Дорж',
      assistantTeacherName: null,
      testCount: 1,
      presentCount: 10,
      enrolledCount: 12,
    },
  };

  it('Админ — тухайн сурагчийн мөрүүд, тайлбаргүй', async () => {
    const { service, prisma } = makeService();
    prisma.lessonRecordStudent.findMany.mockResolvedValueOnce([row]);
    const rows = await service.studentHistory(
      { userId: 'a', role: Role.ADMIN },
      'st1',
    );
    expect(prisma.lessonRecordStudent.findMany.mock.calls[0][0].where).toEqual({
      studentId: 'st1',
      removedAt: null,
      record: { cancelledAt: null },
    });
    expect(rows[0]).toMatchObject({ date: DATE, attendance: 'PRESENT', presentCount: 10 });
    expect(JSON.stringify(rows)).not.toMatch(/note|body/i);
  });

  it('Багш — зөвхөн өөрийн ангийн сурагч; сурагч/эцэг эх — хориотой', async () => {
    const { service, prisma } = makeService();
    prisma.enrollment.findFirst = jest.fn(async () => ({
      classroom: { teacherId: 'tch' },
    }));
    await expect(
      service.studentHistory({ userId: 'tch', role: Role.TEACHER }, 'st1'),
    ).resolves.toEqual([]);
    await expect(
      service.studentHistory({ userId: 'other', role: Role.TEACHER }, 'st1'),
    ).rejects.toThrow();
    for (const role of [Role.STUDENT, Role.PARENT])
      await expect(
        service.studentHistory({ userId: 'st1', role }, 'st1'),
      ).rejects.toThrow();
  });
});

describe('LessonRecordsController маршрутын эрх', () => {
  const roles = (name: keyof LessonRecordsController) =>
    Reflect.getMetadata(ROLES_KEY, LessonRecordsController.prototype[name]);
  it('батлах/буцаах — Багш+, Админ; тайлбар/өдөр/анги — ажилтан; /me — сурагч', () => {
    for (const name of ['confirm', 'unconfirm'] as const)
      expect([...roles(name)].sort()).toEqual([Role.ADMIN, Role.TEACHER_PLUS].sort());
    for (const name of ['note', 'day', 'classroom', 'student'] as const)
      expect([...roles(name)].sort()).toEqual(
        [Role.ADMIN, Role.TEACHER, Role.TEACHER_PLUS].sort(),
      );
    expect(roles('mine')).toEqual([Role.STUDENT]);
  });
});

describe('Батлахад нэмэлт: сэдэв, тайлбар, бодлогын дугаар (эзэн 2026-10-27)', () => {
  it('«1-12, 15, 20» → тоон жагсаалт; танигдахгүй бол null', () => {
    expect(parseProblemNumbers('1-3, 15; 20 2')).toEqual([1, 2, 3, 15, 20]);
    expect(parseProblemNumbers('5–7')).toEqual([5, 6, 7]);
    expect(parseProblemNumbers('3,3,1')).toEqual([1, 3]);
    expect(parseProblemNumbers('')).toBeNull();
    expect(parseProblemNumbers('1-12, бусад')).toBeNull();
    expect(parseProblemNumbers('9-2')).toBeNull();
    expect(parseProblemNumbers('0')).toBeNull();
  });

  it('бичсэн сэдэв, тайлбар, дугаарыг хадгална; өгөөгүй бол өмнөхийг хадгална', async () => {
    const { service, prisma } = makeService();
    prisma.lessonTopic = {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => ({ id: 'lt1', ...data })),
      update: jest.fn(),
    };
    await service.confirm({ userId: 'tp', role: Role.TEACHER_PLUS }, 's1', DATE, undefined, {
      topic: '  Давтлага  ',
      description: 'Самбарт бодов',
      problemNumbers: '1-3, 7',
    });
    const create = prisma.lessonRecord.upsert.mock.calls[0][0].create;
    expect(create).toMatchObject({
      topic: 'Давтлага',
      description: 'Самбарт бодов',
      problemNumbersText: '1-3, 7',
      problemNumbers: [1, 2, 3, 7],
    });
    // Төлөвлөгөөгүй хичээлд сэдвийг LessonTopic-д шинээр нэмнэ (дарж бичихгүй)
    expect(prisma.lessonTopic.create.mock.calls[0][0].data).toMatchObject({ title: 'Давтлага', chapterId: null });

    prisma.lessonRecord.findUnique.mockResolvedValueOnce({
      id: 'r1',
      description: 'Өмнөх',
      problemNumbersText: 'бүгд',
    });
    await service.confirm({ userId: 'tp', role: Role.TEACHER_PLUS }, 's1', DATE);
    const update = prisma.lessonRecord.upsert.mock.calls[1][0].update;
    expect(update).toMatchObject({
      topic: 'Логарифм',
      description: 'Өмнөх',
      problemNumbersText: 'бүгд',
      problemNumbers: [],
    });
  });
});
