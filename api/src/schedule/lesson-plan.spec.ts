import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { LessonPlanService } from './lesson-plan.service';
import {
  compareBookOrder,
  planTitle,
  resolveOccurrence,
  suggestPhotoStudent,
} from './lesson-plan.logic';
import { ScheduleController } from './schedule.controller';
import { resolveWeek } from './week-resolver';

const MON = { weekday: 1, effectiveFrom: '2026-09-01', effectiveTo: null };

describe('resolveOccurrence — төлөвлөгөө/оноолтын түлхүүр огноо', () => {
  it('жирийн өдөр → тэр огноо; зөөгдөж ирсэн → анхны огноо; анхны огноог шууд өгч болно', () => {
    expect(resolveOccurrence(MON, [], '2026-10-19')).toEqual({ key: '2026-10-19' });
    const moved = [{ date: '2026-10-19', kind: 'MOVED' as const, newDate: '2026-10-21' }];
    expect(resolveOccurrence(MON, moved, '2026-10-21')).toEqual({ key: '2026-10-19' });
    expect(resolveOccurrence(MON, moved, '2026-10-19')).toEqual({ key: '2026-10-19' });
    // Зөвхөн цаг/танхим сольсон (newDate хоосон)
    expect(
      resolveOccurrence(MON, [{ date: '2026-10-19', kind: 'MOVED', newDate: null }], '2026-10-19'),
    ).toEqual({ key: '2026-10-19' });
  });

  it('дараа 7 хоногийн ижил гараг руу зөөсөн ч жирийн хичээлтэйгээ холилдохгүй', () => {
    const moved = [{ date: '2026-10-19', kind: 'MOVED' as const, newDate: '2026-10-26' }];
    expect(resolveOccurrence(MON, moved, '2026-10-26')).toEqual({ key: '2026-10-26' });
    expect(resolveOccurrence(MON, moved, '2026-10-19')).toEqual({ key: '2026-10-19' });
  });

  it('цуцлагдсан, товлоогүй өдөр — алдаа', () => {
    expect(
      resolveOccurrence(MON, [{ date: '2026-10-19', kind: 'CANCELLED', newDate: null }], '2026-10-19'),
    ).toEqual({ error: 'CANCELLED' });
    expect(resolveOccurrence(MON, [], '2026-10-20')).toEqual({ error: 'NOT_SCHEDULED' });
    expect(resolveOccurrence(MON, [], '2026-08-31')).toEqual({ error: 'NOT_SCHEDULED' });
  });
});

describe('week-resolver — зөөгдсөн хичээлийн оноолт (2026-10-18 засвар)', () => {
  const schedule = {
    id: 's',
    classroomId: 'c',
    classroomName: '12-1',
    weekday: 1,
    startMinute: 900,
    endMinute: 1020,
    teacherId: null,
    teacherName: null,
    room: '501',
    subject: null,
    effectiveFrom: '2026-09-01',
    effectiveTo: null,
  };
  const exc = {
    scheduleId: 's',
    date: '2026-10-19',
    kind: 'MOVED' as const,
    newDate: '2026-10-21',
    newStartMinute: null,
    newEndMinute: null,
    newRoom: null,
    note: null,
  };
  const run = (staffDate: string) =>
    resolveWeek({
      weekStart: '2026-10-19',
      schedules: [schedule],
      exceptions: [exc],
      topics: [],
      holidays: [],
      staffing: [{ scheduleId: 's', date: staffDate, lead: { id: 't', name: 'Бат' }, assistant: null }],
    }).find((d) => d.date === '2026-10-21')!.entries[0];
  it('анхны огноогоор хадгалсныг уншина; хуучин (харагдах огноогоор) мөрийг нөөцөөр', () => {
    expect(run('2026-10-19').leadTeacher?.id).toBe('t');
    expect(run('2026-10-21').leadTeacher?.id).toBe('t');
  });
});

describe('Төлөвлөгөөний цэвэр логик', () => {
  it('гарчиг — богино нэрс таслалаар', () => {
    expect(planTitle(['Урвуу функц 1', '', 'Урвуу функц 2'])).toBe('Урвуу функц 1, Урвуу функц 2');
  });
  it('номын дараалал: 100V3 → 200V3 → бусад', () => {
    const t = (bookCode: string | null, chapterOrder: number, variantLabel = 'A') => ({
      bookCode,
      chapterOrder,
      variantLabel,
    });
    const list = [t('200V3', 101), t('HG1', 1), t('100V3', 1202), t('100V3', 101)];
    expect(list.sort(compareBookOrder).map((x) => `${x.bookCode}${x.chapterOrder}`)).toEqual([
      '100V3101',
      '100V31202',
      '200V3101',
      'HG11',
    ]);
  });
  it('онолын зургийн ээлж: илгээгээгүй нь сүүлд илгээсний дараахаас, бүгд бол хамгийн эрт', () => {
    const roster = ['a', 'b', 'c', 'd'];
    expect(suggestPhotoStudent(roster, [])).toBe('a');
    expect(suggestPhotoStudent(roster, [{ studentId: 'b', date: '2026-10-10' }])).toBe('c');
    expect(
      suggestPhotoStudent(roster, [
        { studentId: 'd', date: '2026-10-12' },
        { studentId: 'a', date: '2026-10-10' },
      ]),
    ).toBe('b');
    expect(
      suggestPhotoStudent(['a', 'b'], [
        { studentId: 'a', date: '2026-10-12' },
        { studentId: 'b', date: '2026-10-05' },
      ]),
    ).toBe('b');
    expect(suggestPhotoStudent([], [])).toBeNull();
  });
});

function makePlanService() {
  const prisma: any = {
    lessonTopic: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => ({ id: 'lt1', updatedAt: new Date(), ...data })),
      update: jest.fn(async ({ data }: any) => ({ id: 'lt1', updatedAt: new Date(), ...data })),
      delete: jest.fn(async () => ({})),
    },
    test: {
      findMany: jest.fn(async () => [
        {
          id: 'u2',
          title: 'Урвуу функц 2',
          variantLabel: 'A',
          deletedAt: null,
          isDraft: false,
          chapterId: 'ch502',
          chapter: { order: 502, title: 'Урвуу функц · Тест 2', book: { code: '200V3', title: '200x200' } },
          problems: [{ problemId: 'p1' }],
        },
        {
          id: 't1',
          title: 'Тоо тоолол 1',
          variantLabel: 'A',
          deletedAt: null,
          isDraft: false,
          chapterId: 'ch101',
          chapter: { order: 101, title: 'Тоо тоолол · Тест 1', book: { code: '100V3', title: '100x100' } },
          problems: [],
        },
        {
          id: 'dead',
          title: 'Устсан',
          variantLabel: 'A',
          deletedAt: new Date(),
          isDraft: false,
          chapterId: null,
          chapter: null,
          problems: [],
        },
      ]),
    },
    enrollment: { findFirst: jest.fn(async () => ({ id: 'e' })) },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  const schedule: any = {
    occurrenceKey: jest.fn(async (_id: string, key: string) => ({
      schedule: { classroomId: 'c1' },
      key,
    })),
  };
  return { prisma, schedule, service: new LessonPlanService(prisma, schedule) };
}

describe('LessonPlanService.putPlan', () => {
  const tp = { userId: 'tp', role: Role.TEACHER_PLUS };

  it('тестүүдийг номын дарааллаар хадгалж, гарчгийг богино нэрээс үүсгэнэ', async () => {
    const { service, prisma } = makePlanService();
    const out = await service.putPlan(tp, 's1', {
      date: '2026-10-19',
      testIds: ['u2', 't1', 'u2'],
      dismissMode: 'DISMISS',
      photoStudentId: 'st1',
    });
    const data = prisma.lessonTopic.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      testIds: ['t1', 'u2'],
      title: 'Тоо тоолол 1, Урвуу функц 2',
      dismissMode: 'DISMISS',
      photoStudentId: 'st1',
      chapterId: 'ch502',
      createdById: 'tp',
    });
    expect(out.plan?.testIds).toEqual(['t1', 'u2']);
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ entity: 'LessonTopic', action: 'CREATE' });
  });

  it('Багш, сурагч бичихгүй; устсан тест, ангид байхгүй сурагч — 400', async () => {
    const { service, prisma } = makePlanService();
    for (const role of [Role.TEACHER, Role.STUDENT, Role.PARENT])
      await expect(
        service.putPlan({ userId: 'x', role }, 's1', { date: '2026-10-19', testIds: [] }),
      ).rejects.toThrow();
    await expect(
      service.putPlan(tp, 's1', { date: '2026-10-19', testIds: ['dead'] }),
    ).rejects.toThrow('тест');
    prisma.enrollment.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.putPlan(tp, 's1', { date: '2026-10-19', testIds: ['t1'], photoStudentId: 'zz' }),
    ).rejects.toThrow('сурагч');
    expect(prisma.lessonTopic.create).not.toHaveBeenCalled();
  });

  it('хоосон төлөвлөгөө мөрийг устгана; гараар бичсэн гарчиг тестгүй үед хадгалагдана', async () => {
    const { service, prisma } = makePlanService();
    prisma.lessonTopic.findUnique.mockResolvedValueOnce({
      id: 'lt1',
      title: 'Тоо тоолол 1',
      testIds: ['t1'],
      dismissMode: null,
      photoStudentId: null,
      chapterId: 'ch101',
    });
    const out = await service.putPlan(tp, 's1', { date: '2026-10-19', testIds: [] });
    expect(out.plan).toBeNull();
    expect(prisma.lessonTopic.delete).toHaveBeenCalled();

    prisma.lessonTopic.findUnique.mockResolvedValueOnce({
      id: 'lt1',
      title: 'Давтлага',
      testIds: [],
      dismissMode: null,
      photoStudentId: null,
      chapterId: null,
    });
    await service.putPlan(tp, 's1', { date: '2026-10-19', testIds: [], dismissMode: 'STAY' });
    expect(prisma.lessonTopic.update.mock.calls[0][0].data).toMatchObject({
      title: 'Давтлага',
      dismissMode: 'STAY',
    });
  });

  it('«Орох тест» чөлөөт бичвэр: тест сонгосон ч гарчиг болно; хоосон бол тестийн нэр (эзэн 2026-10-27)', async () => {
    const { service, prisma } = makePlanService();
    const out = await service.putPlan(tp, 's1', { date: '2026-10-19', testIds: ['t1'], title: '  Давтлага   хичээл ' });
    expect(prisma.lessonTopic.create.mock.calls[0][0].data).toMatchObject({ title: 'Давтлага хичээл', testIds: ['t1'] });
    expect(out.plan?.customTitle).toBe('Давтлага хичээл');

    await service.putPlan(tp, 's1', { date: '2026-10-19', testIds: [], title: 'Номноос гадуур' });
    expect(prisma.lessonTopic.create.mock.calls[1][0].data).toMatchObject({ title: 'Номноос гадуур', testIds: [] });

    prisma.lessonTopic.findUnique.mockResolvedValueOnce({
      id: 'lt1',
      title: 'Давтлага',
      testIds: [],
      dismissMode: null,
      photoStudentId: null,
      chapterId: null,
    });
    const cleared = await service.putPlan(tp, 's1', { date: '2026-10-19', testIds: ['t1'], title: '' });
    expect(prisma.lessonTopic.update.mock.calls[0][0].data).toMatchObject({ title: 'Тоо тоолол 1' });
    expect(cleared.plan?.customTitle).toBeNull();
  });

  it('маршрут: day-plan — ажилтан; plan бичих/унших — Багш+, Админ', () => {
    const roles = (n: keyof ScheduleController) =>
      [...Reflect.getMetadata(ROLES_KEY, ScheduleController.prototype[n])].sort();
    expect(roles('dayPlan')).toEqual([Role.ADMIN, Role.TEACHER, Role.TEACHER_PLUS].sort());
    for (const n of ['putPlan', 'getPlan', 'upsertTopic', 'clearTopic'] as const)
      expect(roles(n)).toEqual([Role.ADMIN, Role.TEACHER_PLUS].sort());
  });
});

describe('Өдрийн самбарын «ажиллах багш» = «Багшийн ажлын өдөр» хүснэгт', () => {
  it('dayPlan нь тухайн огнооны roster-ыг огноогоор нь авна (индексээр биш)', async () => {
    const roster = (date: string, ids: string[]) => ({
      date,
      weekday: 0,
      parity: 1 as const,
      mode: 'ALTERNATING' as const,
      inRange: true,
      teachers: ids.map((id) => ({ id, name: id.toUpperCase(), role: 'TEACHER' })),
    });
    const schedule: any = {
      getWeek: jest.fn(async () => ({
        start: '2026-10-18',
        days: [{ date: '2026-10-18', isHoliday: false, holiday: null, restingClasses: [], entries: [] }],
        // дараалал санаатайгаар солигдсон
        teacherRoster: [roster('2026-10-19', ['x']), roster('2026-10-18', ['a', 'b'])],
      })),
    };
    const empty = { findMany: jest.fn(async () => []) };
    const prisma: any = {
      lessonTopic: empty,
      lessonNote: empty,
      lessonRecord: empty,
      classDismissal: empty,
      classTestSession: empty,
      enrollment: empty,
      classroom: empty,
      user: empty,
      test: empty,
    };
    const out = await new LessonPlanService(prisma, schedule).dayPlan(
      { userId: 'tp', role: Role.TEACHER_PLUS },
      '2026-10-18',
    );
    expect(out.roster?.teachers.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('Ням гараг: weekday 0 мөр, Даваагаас эхлэх 7 хоногийн сондгой/тэгш ээлж', () => {
    const { resolveTeacherRoster, weekParityOf } = jest.requireActual('./week-resolver');
    // 2026-10-18 (Ням) нь 10-12 (Даваа)-ны 7 хоног — сондгой (1); 10-19 (Даваа) — тэгш (2)
    expect(weekParityOf('2026-10-18')).toBe(1);
    expect(weekParityOf('2026-10-19')).toBe(2);
    const days = resolveTeacherRoster({
      weekStart: '2026-10-18',
      teachers: [
        { id: 'sun-odd', name: 'А' },
        { id: 'mon-even', name: 'Б' },
        { id: 'sun-even', name: 'В' },
      ],
      workDays: [
        { teacherId: 'sun-odd', weekday: 0, parity: 1 },
        { teacherId: 'sun-even', weekday: 0, parity: 2 },
        { teacherId: 'mon-even', weekday: 1, parity: 2 },
      ],
      exceptions: [{ teacherId: 'sun-even', date: '2026-10-18', working: true }],
    });
    const ids = (d: string) => days.find((x: { date: string }) => x.date === d).teachers.map((t: { id: string }) => t.id);
    expect(ids('2026-10-18').sort()).toEqual(['sun-even', 'sun-odd']);
    expect(ids('2026-10-19')).toEqual(['mon-even']);
  });
});
