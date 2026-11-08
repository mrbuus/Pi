// Төлөвлөгөө ↔ батламж ↔ хийсэн тестийн уялдаа (эзэн 2026-11-08) — логикийн алдаа бүрт тест.
import { Role } from '../generated/prisma/enums';
import { ClassSessionsService } from '../class-sessions/class-sessions.service';
import {
  buildRoadmap,
  topicNameOf,
  type RoadmapChapterIn,
  type RoadmapTestIn,
} from '../class-sessions/roadmap.logic';
import { LessonRecordsService } from '../lesson-records/lesson-records.service';
import {
  actualDateOf,
  cleanExcluded,
  isStale,
  planSessionSync,
  recordTestIds,
  sameSet,
  sessionVisibleFor,
  tentativePlans,
} from './lesson-coherence.logic';

// ---------- Номын жижиг загвар: Тоо тоолол 1..4 (100V3), бүлэг бүр A хувилбартай ----------
const BOOKS = [{ id: 'b100', code: '100V3', title: '100x100' }];
const CH: RoadmapChapterIn[] = [1, 2, 3, 4].map((n) => ({
  id: `c${n}`,
  bookId: 'b100',
  order: 100 + n,
  title: `Тоо тоолол · Тест ${n}`,
}));
const TESTS: RoadmapTestIn[] = CH.map((c, i) => ({
  id: `T${i + 1}`,
  chapterId: c.id,
  title: `${topicNameOf(c.title)} ${i + 1}`,
  variantLabel: 'A',
  problemIds: [`T${i + 1}p1`, `T${i + 1}p2`],
}));
const base = {
  books: BOOKS,
  chapters: CH,
  tests: TESTS,
  removedTestIds: [] as string[],
};
const statusOf = (r: ReturnType<typeof buildRoadmap>, id: string) =>
  r.books[0].topics[0].chapters
    .flatMap((c) => c.tests)
    .find((t) => t.testId === id);

describe('lesson-coherence.logic', () => {
  it('actualDateOf: жирийн → тэр өдөр; зөөсөн → шинэ өдөр; цуцалсан → null', () => {
    const ex = [
      {
        scheduleId: 's',
        date: '2026-11-03',
        kind: 'MOVED' as const,
        newDate: '2026-11-05',
      },
      {
        scheduleId: 's',
        date: '2026-11-04',
        kind: 'CANCELLED' as const,
        newDate: null,
      },
      {
        scheduleId: 's',
        date: '2026-11-06',
        kind: 'MOVED' as const,
        newDate: null,
      }, // зөвхөн цаг солисон
    ];
    expect(actualDateOf(ex, 's', '2026-11-02')).toBe('2026-11-02');
    expect(actualDateOf(ex, 's', '2026-11-03')).toBe('2026-11-05');
    expect(actualDateOf(ex, 's', '2026-11-04')).toBeNull();
    expect(actualDateOf(ex, 's', '2026-11-06')).toBe('2026-11-06');
    expect(actualDateOf(ex, 'other', '2026-11-03')).toBe('2026-11-03');
  });

  it('tentativePlans: батлагдсан хичээлийн төлөвлөгөө ТООЦОГДОХГҮЙ (батламжийн тест л үнэн)', () => {
    const plans = [
      { scheduleId: 's', date: '2026-11-07', testIds: ['T2'] }, // буруу баталсан өдөр
      { scheduleId: 's', date: '2026-11-05', testIds: ['T9'] }, // батлаагүй — түр зуурын хэвээр
    ];
    const out = tentativePlans(plans, [], new Set(['s|2026-11-07']));
    expect(out).toEqual([
      { scheduleId: 's', date: '2026-11-05', testIds: ['T9'] },
    ]);
  });

  it('tentativePlans: цуцлагдсан хичээлийн төлөвлөгөө хасагдана; зөөсөн нь шинэ өдрөөр, батламжийг шинэ өдрөөр шалгана', () => {
    const ex = [
      {
        scheduleId: 's',
        date: '2026-11-03',
        kind: 'CANCELLED' as const,
        newDate: null,
      },
      {
        scheduleId: 's',
        date: '2026-11-04',
        kind: 'MOVED' as const,
        newDate: '2026-11-06',
      },
    ];
    const plans = [
      { scheduleId: 's', date: '2026-11-03', testIds: ['T1'] },
      { scheduleId: 's', date: '2026-11-04', testIds: ['T2'] },
    ];
    expect(tentativePlans(plans, ex, new Set())).toEqual([
      { scheduleId: 's', date: '2026-11-06', testIds: ['T2'] },
    ]);
    // Батламж ШИНЭ (бодит) өдөрт
    expect(tentativePlans(plans, ex, new Set(['s|2026-11-06']))).toEqual([]);
    // Анхны огноогоор батламж хайвал буруу — анхны огноонд батламж байсан ч хасахгүй
    expect(tentativePlans(plans, ex, new Set(['s|2026-11-04']))).toHaveLength(
      1,
    );
  });

  it('recordTestIds: snapshot JSON-оос сангийн тест; гараар бичсэн, буруу хэлбэр алгасна', () => {
    expect(
      recordTestIds([
        { id: 'a', testId: 'T1', title: 'x' },
        { id: 'b', testId: null },
        5,
        null,
      ]),
    ).toEqual(['T1']);
    expect(recordTestIds(null)).toEqual([]);
    expect(recordTestIds({})).toEqual([]);
  });

  it('sessionVisibleFor: нэг анги нэг өдөр 2 хичээл — өөр хичээлийн батламжийнх тэр хичээлд л', () => {
    const own = new Set(['T1']);
    const others = new Set(['T2', 'T1']);
    expect(sessionVisibleFor('T1', own, others)).toBe(true); // хоёуланд нь — өөрийнх
    expect(sessionVisibleFor('T2', own, others)).toBe(false);
    expect(sessionVisibleFor('T3', own, others)).toBe(true); // эзэнгүй
    expect(sessionVisibleFor(null, own, others)).toBe(true); // гараар бичсэн
    expect(sessionVisibleFor('T2', new Set(), new Set())).toBe(true); // ганц хичээлтэй өдөр
  });

  it('planSessionSync: жагсаалтаас гарсныг хасна; гараар бичсэн, өөр хичээлийнхэд хүрэхгүй', () => {
    const current = [
      { id: 'x1', testId: 'T1' },
      { id: 'x2', testId: 'T2' },
      { id: 'x3', testId: null },
      { id: 'x4', testId: 'T4' },
    ];
    expect(planSessionSync(current, ['T1'], new Set(['T4'])).remove).toEqual([
      'x2',
    ]);
    expect(planSessionSync(current, [], new Set()).remove).toEqual([
      'x1',
      'x2',
      'x4',
    ]);
    expect(planSessionSync([], ['T1'], new Set()).remove).toEqual([]);
  });

  it('cleanExcluded: тестийн одоогийн бодлого л, давхардалгүй', () => {
    expect(cleanExcluded(['p2', 'p2', 'gone'], ['p1', 'p2'])).toEqual(['p2']);
    expect(cleanExcluded([], ['p1'])).toEqual([]);
  });

  it('sameSet, isStale', () => {
    expect(sameSet(['a', 'b', 'a'], ['b', 'a'])).toBe(true);
    expect(sameSet(['a'], ['a', 'b'])).toBe(false);
    const at = new Date('2026-11-07T10:00:00.000Z');
    expect(isStale(undefined, at)).toBe(false);
    expect(isStale('2026-11-07T10:00:00.000Z', at)).toBe(false);
    expect(isStale('2026-11-07T10:00:00Z', at)).toBe(false); // өөр бичлэг, ижил агшин
    expect(isStale('2026-11-07T09:00:00.000Z', at)).toBe(true);
    expect(isStale(null, at)).toBe(true); // нээхэд батлаагүй байсан, одоо батлагдсан
    expect(isStale(null, null)).toBe(false);
    expect(isStale('2026-11-07T10:00:00.000Z', null)).toBe(true); // хооронд нь цуцалсан
    expect(isStale('буруу', at)).toBe(true);
  });
});

describe('buildRoadmap asOf — өнгөрсөн өдрийг засах (эзэн 2026-11-08)', () => {
  it('зорилтот өдрөөс ХОЙШ хийсэн тест «хийсэн» биш, санал болгохгүй, laterOn шошготой', () => {
    const r = buildRoadmap({
      ...base,
      asOf: '2026-11-05',
      sessions: [
        { testId: 'T1', date: '2026-11-03', excludedProblemIds: [] },
        { testId: 'T3', date: '2026-11-07', excludedProblemIds: [] },
      ],
    });
    expect(statusOf(r, 'T1')).toMatchObject({
      status: 'DONE',
      doneOn: '2026-11-03',
    });
    expect(statusOf(r, 'T3')).toMatchObject({
      status: 'TODO',
      laterOn: '2026-11-07',
    });
    // T2 нь T1-ийн дараах; T3 хожим хийгдсэн тул алгасна
    expect(r.next).toEqual(['T2', 'T4']);
  });

  it('тэр өдрийн өөрийнх нь бүртгэл «хийсэн» болохгүй (батлах цонх өөрөө харуулна)', () => {
    const r = buildRoadmap({
      ...base,
      asOf: '2026-11-05',
      sessions: [{ testId: 'T2', date: '2026-11-05', excludedProblemIds: [] }],
    });
    expect(statusOf(r, 'T2')?.status).toBe('TODO');
    expect(statusOf(r, 'T2')?.laterOn).toBeUndefined();
  });

  it('asOf-гүй (хуучин дуудлага) бол бүх бүртгэл хэвээр тооцогдоно', () => {
    const r = buildRoadmap({
      ...base,
      sessions: [{ testId: 'T3', date: '2026-11-07', excludedProblemIds: [] }],
    });
    expect(statusOf(r, 'T3')?.status).toBe('DONE');
    expect(r.next).toEqual(['T4']);
  });
});

// ---------- Замын зургийн сервис (Prisma mock) ----------
function roadmapPrisma(opts: {
  sessions?: { testId: string; date: string; excludedProblemIds?: string[] }[];
  plans?: { scheduleId: string; date: string; testIds: string[] }[];
  records?: { scheduleId: string; date: string }[];
  exceptions?: {
    scheduleId: string;
    date: string;
    kind: 'CANCELLED' | 'MOVED';
    newDate: string | null;
  }[];
}) {
  const d = (k: string) => new Date(`${k}T00:00:00.000Z`);
  return {
    classroom: {
      findUnique: jest.fn(async () => ({
        id: 'cls',
        archived: false,
        teacherId: 'homeroom',
        assistantTeacherId: null,
      })),
    },
    book: { findMany: jest.fn(async () => BOOKS) },
    chapter: { findMany: jest.fn(async () => CH) },
    test: {
      findMany: jest.fn(async () =>
        TESTS.map((t) => ({
          ...t,
          problems: t.problemIds.map((problemId) => ({ problemId })),
        })),
      ),
    },
    classTestSession: {
      findMany: jest.fn(async () =>
        (opts.sessions ?? []).map((s) => ({
          testId: s.testId,
          date: d(s.date),
          excludedProblemIds: s.excludedProblemIds ?? [],
        })),
      ),
    },
    classTestStatus: { findMany: jest.fn(async () => []) },
    classCoveredTest: { findMany: jest.fn(async () => []) },
    lessonTopic: {
      findMany: jest.fn(async () =>
        (opts.plans ?? []).map((p) => ({ ...p, date: d(p.date) })),
      ),
    },
    lessonRecord: {
      findMany: jest.fn(async () =>
        (opts.records ?? []).map((r) => ({ ...r, date: d(r.date) })),
      ),
    },
    scheduleException: {
      findMany: jest.fn(async () =>
        (opts.exceptions ?? []).map((e) => ({
          ...e,
          date: d(e.date),
          newDate: e.newDate ? d(e.newDate) : null,
        })),
      ),
    },
  } as any;
}

describe('Эзний жишээ: 12-10 — өчигдөр буруу тестийг «хийсэн» гэж баталсан (2026-11-08)', () => {
  const today = '2026-11-08';
  const yesterday = '2026-11-07';

  it('РЕГРЕСС: өчигдрийн батламжаас буруу тестийг (T2) хассаны дараа өнөөдрийн «дараагийн тест» T2-оос эхэлнэ', async () => {
    // Хуучин өгөгдөл: өчигдрийн төлөвлөгөөнд T2 үлдсэн, хичээл батлагдсан, T2-ийн бүртгэл хасагдсан
    const svc = new ClassSessionsService(
      roadmapPrisma({
        sessions: [{ testId: 'T1', date: '2026-11-05' }],
        plans: [{ scheduleId: 's', date: yesterday, testIds: ['T2'] }],
        records: [{ scheduleId: 's', date: yesterday }],
      }),
    );
    const r = await svc.roadmap('cls', 'tp', Role.TEACHER_PLUS, today);
    expect(r.next[0]).toBe('T2');
    expect(statusOf(r, 'T2')).toMatchObject({ status: 'TODO' });
    expect(statusOf(r, 'T2')?.plannedOn).toBeUndefined();
  });

  it('батлаагүй өнгөрсөн төлөвлөгөө түр зуур хэвээр (урьдчилж олон өдөр төлөвлөх)', async () => {
    const svc = new ClassSessionsService(
      roadmapPrisma({
        sessions: [{ testId: 'T1', date: '2026-11-05' }],
        plans: [{ scheduleId: 's', date: yesterday, testIds: ['T2'] }],
      }),
    );
    const r = await svc.roadmap('cls', 'tp', Role.TEACHER_PLUS, today);
    expect(statusOf(r, 'T2')?.plannedOn).toBe(yesterday);
    expect(r.next[0]).toBe('T3');
  });

  it('цуцлагдсан хичээлийн төлөвлөгөө тестийг «алгасуулахгүй»', async () => {
    const svc = new ClassSessionsService(
      roadmapPrisma({
        plans: [{ scheduleId: 's', date: yesterday, testIds: ['T1'] }],
        exceptions: [
          {
            scheduleId: 's',
            date: yesterday,
            kind: 'CANCELLED',
            newDate: null,
          },
        ],
      }),
    );
    const r = await svc.roadmap('cls', 'tp', Role.TEACHER_PLUS, today);
    expect(r.next[0]).toBe('T1');
  });

  it('ангийн багш биш Багш ч батлах цонхонд замын зургийг уншина (өмнө нь 403)', async () => {
    const svc = new ClassSessionsService(roadmapPrisma({}));
    await expect(
      svc.roadmap('cls', 'not-homeroom', Role.TEACHER, today),
    ).resolves.toBeTruthy();
    await expect(
      svc.roadmap('cls', 'st', Role.STUDENT, today),
    ).rejects.toThrow();
  });
});

// ---------- Батлах (LessonRecordsService) ----------
const DATE = '2026-11-07';
const ENTRY = {
  scheduleId: 's1',
  classroomId: 'c1',
  classroomName: '12-10 (Баруун 4)',
  startMinute: 960,
  endMinute: 1080,
  room: '503',
  topic: 'Тоо тоолол 2',
  leadTeacher: { id: 'lead', name: 'Бат' },
  assistantTeacher: null,
  exception: null,
};

function recordsPrisma(state: {
  sessions: {
    id: string;
    classroomId: string;
    testId: string | null;
    manualTitle?: string | null;
    excludedProblemIds: string[];
    date?: Date;
  }[];
  plan: {
    id: string;
    title: string;
    testIds: string[];
    customTopics: string[];
    chapterId: string | null;
  } | null;
  record?: { confirmedAt: Date; cancelledAt: Date | null } | null;
  otherRecords?: { tests: unknown }[];
  deleted?: string[];
}) {
  const tests = TESTS.map((t) => ({
    id: t.id,
    title: t.title,
    chapterId: t.chapterId,
    variantLabel: 'A',
    deletedAt: state.deleted?.includes(t.id) ? new Date() : null,
    chapter: {
      order: CH.find((c) => c.id === t.chapterId)!.order,
      book: { code: '100V3' },
    },
    problems: t.problemIds.map((problemId) => ({ problemId })),
  }));
  const prisma: any = {
    classSchedule: {
      findUnique: jest.fn(async () => ({
        classroomId: 'c1',
        teacherId: null,
        classroom: { teacherId: null },
      })),
    },
    enrollment: { findMany: jest.fn(async () => []) },
    attendance: { findMany: jest.fn(async () => []) },
    classTestSession: {
      findMany: jest.fn(async ({ where }: any) =>
        state.sessions.filter((s) => (where.testId ? s.testId !== null : true)),
      ),
      deleteMany: jest.fn(async ({ where }: any) => {
        state.sessions = state.sessions.filter(
          (s) => !where.id.in.includes(s.id),
        );
        return { count: 1 };
      }),
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const k = where.classroomId_testId_date;
        const found = state.sessions.find((s) => s.testId === k.testId);
        if (found) Object.assign(found, update);
        else
          state.sessions.push({
            id: `new-${k.testId}`,
            classroomId: k.classroomId,
            testId: k.testId,
            excludedProblemIds: create.excludedProblemIds,
          });
        return {};
      }),
    },
    test: {
      findMany: jest.fn(async ({ where }: any) =>
        tests.filter((t) => where.id.in.includes(t.id)),
      ),
    },
    user: {
      findUnique: jest.fn(async () => ({ firstName: 'Багш', lastName: 'Б' })),
      findMany: jest.fn(async () => []),
    },
    lessonRecord: {
      findUnique: jest.fn(async ({ select }: any) =>
        select ? (state.record ?? null) : null,
      ),
      findMany: jest.fn(async () => state.otherRecords ?? []),
      upsert: jest.fn(async ({ create }: any) => ({
        id: 'r1',
        confirmedAt: new Date(),
        ...create,
      })),
    },
    lessonRecordStudent: {
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    lessonTopic: {
      findUnique: jest.fn(async () => state.plan),
      create: jest.fn(
        async ({ data }: any) => (state.plan = { id: 'lt-new', ...data }),
      ),
      update: jest.fn(
        async ({ data }: any) => (state.plan = { ...state.plan!, ...data }),
      ),
    },
    auditLog: { create: jest.fn(async () => ({})) },
  };
  prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
  const schedule: any = {
    getWeek: jest.fn(async () => ({
      days: [{ date: DATE, entries: [ENTRY] }],
    })),
  };
  return { prisma, service: new LessonRecordsService(prisma, schedule), state };
}
const tp = { userId: 'tp', role: Role.TEACHER_PLUS };

describe('Батламж засах — төлөвлөгөө, бүртгэл, сэдэв нэг утгатай (эзэн 2026-11-08)', () => {
  it('РЕГРЕСС: буруу баталсан T2-ыг хасахад бүртгэл, төлөвлөгөө, сэдвээс бүгдээс арилна', async () => {
    const { service, state, prisma } = recordsPrisma({
      sessions: [
        { id: 'x2', classroomId: 'c1', testId: 'T2', excludedProblemIds: [] },
      ],
      plan: {
        id: 'lt1',
        title: 'Тоо тоолол 2',
        testIds: ['T2'],
        customTopics: [],
        chapterId: 'c2',
      },
    });
    const out = await service.confirm(tp, 's1', DATE, [], { customTopics: [] });
    expect(state.sessions).toEqual([]);
    // Төлөвлөгөө ч хоосорно — замын зураг T2-ыг «өчигдөр төлөвлөсөн» гэж алгасахгүй
    expect(state.plan).toMatchObject({ testIds: [], title: '' });
    // Батламжийн сэдэвт T2 үлдэхгүй (өмнө нь төлөвлөгөөний гарчгийг авдаг байсан)
    expect(out.topic).toBeNull();
    expect(prisma.lessonRecord.upsert.mock.calls[0][0].create.testCount).toBe(
      0,
    );
  });

  it('РЕГРЕСС: тэр тестийг өнөөдөр батлахад бүртгэл, төлөвлөгөө, сэдэв T2 болно', async () => {
    const { service, state } = recordsPrisma({ sessions: [], plan: null });
    const out = await service.confirm(
      tp,
      's1',
      DATE,
      [{ testId: 'T2', excludedProblemIds: ['T2p2'] }],
      { customTopics: [] },
    );
    expect(state.sessions).toMatchObject([
      { testId: 'T2', excludedProblemIds: ['T2p2'] },
    ]);
    expect(state.plan).toMatchObject({
      testIds: ['T2'],
      title: 'Тоо тоолол 2',
      chapterId: 'c2',
    });
    expect(out.topic).toBe('Тоо тоолол 2');
  });

  it('тест солих: шинэ нь нэмэгдэж хуучин нь хасагдана, төлөвлөгөөний тарах/зураг хөндөгдөхгүй, сэдэв товчлогдоно', async () => {
    const { service, state } = recordsPrisma({
      sessions: [
        { id: 'x2', classroomId: 'c1', testId: 'T2', excludedProblemIds: [] },
      ],
      plan: {
        id: 'lt1',
        title: 'Тоо тоолол 2',
        testIds: ['T2'],
        customTopics: ['Давталт'],
        chapterId: 'c2',
      },
    });
    const out = await service.confirm(tp, 's1', DATE, [
      { testId: 'T4', excludedProblemIds: [] },
      { testId: 'T3', excludedProblemIds: [] },
    ]);
    expect(state.sessions.map((s) => s.testId).sort()).toEqual(['T3', 'T4']);
    expect(state.plan).toMatchObject({
      testIds: ['T3', 'T4'],
      customTopics: ['Давталт'],
      chapterId: 'c4',
    });
    expect(out.topic).toBe('Тоо тоолол 3, 4; Давталт');
  });

  it('нэг анги нэг өдөр 2 хичээл: өөр хичээлийн батламжид орсон тестийг устгахгүй, snapshot-д оруулахгүй', async () => {
    const { service, state, prisma } = recordsPrisma({
      sessions: [
        { id: 'x1', classroomId: 'c1', testId: 'T1', excludedProblemIds: [] },
        { id: 'x3', classroomId: 'c1', testId: 'T3', excludedProblemIds: [] },
      ],
      plan: null,
      otherRecords: [
        { tests: [{ id: 'x1', testId: 'T1', title: 'Тоо тоолол 1' }] },
      ],
    });
    await service.confirm(tp, 's1', DATE, [
      { testId: 'T2', excludedProblemIds: [] },
    ]);
    expect(state.sessions.map((s) => s.testId).sort()).toEqual(['T1', 'T2']);
    const snap = prisma.lessonRecord.upsert.mock.calls[0][0].create;
    expect(snap.tests.map((t: any) => t.testId)).toEqual(['T2']);
  });

  it('тэр өдөр бүртгэгдсэн тест хожим устсан ч батламжийг дахин хадгална; ШИНЭЭР устсан тест нэмбэл 400', async () => {
    const { service } = recordsPrisma({
      sessions: [
        {
          id: 'x2',
          classroomId: 'c1',
          testId: 'T2',
          excludedProblemIds: ['T2p1', 'хуучин'],
        },
      ],
      plan: null,
      deleted: ['T2', 'T3'],
    });
    await expect(
      service.confirm(tp, 's1', DATE, [
        { testId: 'T2', excludedProblemIds: ['T2p1', 'хуучин'] },
      ]),
    ).resolves.toBeTruthy();
    await expect(
      service.confirm(tp, 's1', DATE, [
        { testId: 'T3', excludedProblemIds: [] },
      ]),
    ).rejects.toThrow('олдсонгүй');
  });

  it('зэрэг засвар: өөр багш хооронд нь баталсан бол 409, юу ч бичихгүй', async () => {
    const { service, prisma } = recordsPrisma({
      sessions: [],
      plan: null,
      record: {
        confirmedAt: new Date('2026-11-07T11:00:00Z'),
        cancelledAt: null,
      },
    });
    await expect(
      service.confirm(
        tp,
        's1',
        DATE,
        [{ testId: 'T1', excludedProblemIds: [] }],
        { expectedConfirmedAt: null },
      ),
    ).rejects.toThrow('өөр хүн');
    expect(prisma.classTestSession.upsert).not.toHaveBeenCalled();
    await expect(
      service.confirm(
        tp,
        's1',
        DATE,
        [{ testId: 'T1', excludedProblemIds: [] }],
        {
          expectedConfirmedAt: '2026-11-07T11:00:00.000Z',
        },
      ),
    ).resolves.toBeTruthy();
  });

  it('цуцалсан батламжийг дахин батлах: хуучин confirmedAt-ыг хүлээх клиентэд 409 биш (null = батлаагүй)', async () => {
    const { service } = recordsPrisma({
      sessions: [],
      plan: null,
      record: {
        confirmedAt: new Date('2026-11-07T11:00:00Z'),
        cancelledAt: new Date(),
      },
    });
    await expect(
      service.confirm(tp, 's1', DATE, [], { expectedConfirmedAt: null }),
    ).resolves.toBeTruthy();
  });
});
