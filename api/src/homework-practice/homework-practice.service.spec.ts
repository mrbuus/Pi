import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HomeworkPracticeService } from './homework-practice.service';
import { HomeworkMarksService } from '../assignments/homework-marks.service';
import { Role } from '../generated/prisma/enums';
import { buildSlots, gradingInput, mergeAnswers, remainingSec } from './homework-logic';

// УБ 2026-10-28 18:00 — анги 10-27-нд A хувилбар хийсэн, дараагийн хичээл 10-29
const NOW = new Date('2026-10-28T10:00:00Z');
const d = (k: string) => new Date(`${k}T00:00:00.000Z`);

type Row = Record<string, any>;

function problem(id: string, correct: string, extra: Row = {}) {
  return {
    problemId: id,
    order: Number(id.replace(/\D/g, '')) || 1,
    problem: {
      id,
      format: 'CHOICE',
      statementText: `$x$ ${id}`,
      imageKey: null,
      choices: ['1', '2', '3', '4', '5'],
      correctAnswer: correct,
      choiceOptions: [],
      ...extra,
    },
  };
}

function makeDb() {
  const tests: Row[] = [
    { id: 'A1', title: 'Тест 18', groupKey: 'G1', variantLabel: 'А', type: 'DAILY', deletedAt: null, isDraft: false, gradingMode: 'AUTO', timeLimitMin: 30, _count: { problems: 2 } },
    { id: 'B1', title: 'Тест 18', groupKey: 'G1', variantLabel: 'B', type: 'DAILY', deletedAt: null, isDraft: false, gradingMode: 'AUTO', timeLimitMin: 30, _count: { problems: 2 } },
    { id: 'T1', title: '1000 бодлого', groupKey: 'G2', variantLabel: 'A', type: 'THOUSAND', deletedAt: null, isDraft: false, gradingMode: 'AUTO', timeLimitMin: null, _count: { problems: 1 } },
    { id: 'T2', title: '1000 бодлого', groupKey: 'G2', variantLabel: 'B', type: 'THOUSAND', deletedAt: null, isDraft: false, gradingMode: 'AUTO', timeLimitMin: null, _count: { problems: 1 } },
  ];
  const sessions: Row[] = [
    { classroomId: 'c1', date: d('2026-10-27'), testId: 'A1' },
    { classroomId: 'c1', date: d('2026-10-27'), testId: 'T1' },
    { classroomId: 'c1', date: d('2026-10-29'), testId: null },
  ];
  const problems: Record<string, Row[]> = {
    B1: [problem('p1', 'B'), problem('p2', 'C')],
  };
  const enrollments: Row[] = [
    { studentId: 's1', classroomId: 'c1', joinedAt: d('2026-09-01'), classroom: { name: '10А' } },
  ];
  const attempts: Row[] = [];
  const accesses: Row[] = [];
  const checks: Row[] = [];
  const photos: Row[] = [];
  const files: Record<string, Row> = {
    'f1.pdf': { ownerId: 's1', mime: 'application/pdf', size: 1000, pages: 3, expiresAt: new Date() },
    'f2.pdf': { ownerId: 's1', mime: 'application/pdf', size: 1000, pages: 2, expiresAt: new Date() },
    'x.pdf': { ownerId: 's2', mime: 'application/pdf', size: 1000, pages: 1, expiresAt: new Date() },
    'img.jpg': { ownerId: 's1', mime: 'image/jpeg', size: 1000, pages: null, expiresAt: new Date() },
    'nopages.pdf': { ownerId: 's1', mime: 'application/pdf', size: 1000, pages: null, expiresAt: new Date() },
  };
  let seq = 0;
  const matchAttempt = (a: Row, w: Row) =>
    (!w.id || a.id === w.id) &&
    (!w.status || a.status === w.status) &&
    (w.checksUsed === undefined || a.checksUsed === w.checksUsed);
  const db: any = {
    studentProfile: {
      findUnique: jest.fn(async ({ where }: any) =>
        ['s1', 's2'].includes(where.userId) ? { type: 'CLASSROOM', activatedAt: d('2026-09-01') } : null,
      ),
    },
    enrollment: {
      findMany: jest.fn(async ({ where }: any) =>
        enrollments.filter(
          (e) =>
            (!where.studentId || e.studentId === where.studentId) &&
            (!where.classroomId || e.classroomId === where.classroomId),
        ),
      ),
    },
    classTestSession: {
      findMany: jest.fn(async ({ where }: any) =>
        sessions.filter(
          (s) =>
            (where.classroomId.in ? where.classroomId.in.includes(s.classroomId) : s.classroomId === where.classroomId) &&
            (!where.date?.gte || s.date >= where.date.gte) &&
            (!where.date?.lte || s.date <= where.date.lte) &&
            (!where.date?.lt || s.date < where.date.lt) &&
            (!where.testId?.in || where.testId.in.includes(s.testId)),
        ),
      ),
    },
    testAccess: {
      findMany: jest.fn(async ({ where }: any) =>
        accesses.filter(
          (a) =>
            where.classroomId.in.includes(a.classroomId) &&
            (!where.testId?.in || where.testId.in.includes(a.testId)) &&
            (!where.assignedAt?.gt || a.assignedAt > where.assignedAt.gt),
        ),
      ),
    },
    test: {
      findMany: jest.fn(async ({ where }: any) =>
        tests.filter(
          (t) =>
            (!where.id || where.id.in.includes(t.id)) &&
            (!where.groupKey || where.groupKey.in.includes(t.groupKey)) &&
            (!where.type || !where.type.notIn.includes(t.type)) &&
            (where.deletedAt !== null || t.deletedAt === null) &&
            (where.isDraft === undefined || t.isDraft === where.isDraft) &&
            (!where.gradingMode || t.gradingMode === where.gradingMode),
        ),
      ),
      findUnique: jest.fn(async ({ where }: any) => {
        const t = tests.find((x) => x.id === where.id);
        return t ? { timeLimitMin: (t as any).timeLimitMin ?? null } : null;
      }),
    },
    testProblem: {
      findMany: jest.fn(async ({ where }: any) => problems[where.testId] ?? []),
    },
    homeworkAttempt: {
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.id) return attempts.find((a) => a.id === where.id) ?? null;
        const k = where.studentId_testId_lessonDate;
        return (
          attempts.find(
            (a) =>
              a.studentId === k.studentId &&
              a.testId === k.testId &&
              a.lessonDate.getTime() === k.lessonDate.getTime(),
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: `att${++seq}`,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          answers: {},
          firstAnswers: null,
          checksUsed: 0,
          score: null,
          total: null,
          submittedAt: null,
          ...data,
        };
        attempts.push(row);
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hit = attempts.filter((a) => matchAttempt(a, where));
        for (const a of hit) Object.assign(a, data);
        return { count: hit.length };
      }),
      findMany: jest.fn(async ({ where }: any) =>
        attempts.filter(
          (a) =>
            a.studentId === where.studentId &&
            (!where.testId || where.testId.in.includes(a.testId)),
        ),
      ),
    },
    homeworkCheck: {
      create: jest.fn(async ({ data }: any) => {
        checks.push({ ...data, createdAt: new Date() });
        return data;
      }),
      findFirst: jest.fn(async ({ where, orderBy }: any) => {
        let list = checks.filter((c) => c.attemptId === where.attemptId);
        if (where.n?.gt !== undefined) list = list.filter((c) => c.n > where.n.gt);
        if (typeof where.n === 'number') list = list.filter((c) => c.n === where.n);
        list.sort((a, b) => (orderBy?.n === 'desc' ? b.n - a.n : a.n - b.n));
        return list[0] ?? null;
      }),
    },
    homeworkPhoto: {
      findFirst: jest.fn(async ({ where }: any) =>
        photos
          .filter(
            (p) =>
              p.studentId === where.studentId &&
              p.classroomId === where.classroomId &&
              p.lessonDate.getTime() === where.lessonDate.getTime() &&
              p.deletedAt === null,
          )
          .slice(-1)[0] ?? null,
      ),
      findUnique: jest.fn(async ({ where }: any) => photos.find((p) => p.id === where.id) ?? null),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const hit = photos.filter(
          (p) =>
            p.deletedAt === null &&
            (!where.id || p.id === where.id) &&
            (!where.studentId || p.studentId === where.studentId),
        );
        for (const p of hit) Object.assign(p, data);
        return { count: hit.length };
      }),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `ph${++seq}`, createdAt: new Date(), deletedAt: null, ...data };
        photos.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        photos.filter((p) => p.studentId === where.studentId && p.deletedAt === null),
      ),
    },
    storedFile: { findUnique: jest.fn(async ({ where }: any) => files[where.key] ?? null) },
    dailyHomeworkMark: { findMany: jest.fn(async () => [{ classroomId: 'c1', date: d('2026-10-29'), status: 'PARTIAL' }]) },
    $transaction: jest.fn(async (fn: any) => fn(db)),
  };
  return { db, attempts, accesses, checks, photos, enrollments, sessions, tests };
}

describe('HomeworkPracticeService — танхимын сурагчийн гэрийн даалгавар', () => {
  let env: ReturnType<typeof makeDb>;
  let svc: HomeworkPracticeService;
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    env = makeDb();
    svc = new HomeworkPracticeService(env.db);
  });
  afterEach(() => jest.useRealTimers());

  it('жагсаалт: ангид A хийсэн өдөр → B хувилбар; 1000 бодлого хасагдана; хугацаа = дараагийн хичээл', async () => {
    const res = await svc.my('s1');
    expect(res.days).toHaveLength(1);
    const day = res.days[0];
    expect(day).toMatchObject({
      date: '2026-10-27',
      classroomId: 'c1',
      classroomName: '10А',
      deadlineAt: '2026-10-28T16:00:00.000Z',
      photo: null,
      mark: 'PARTIAL',
    });
    expect(day.items).toEqual([
      {
        testId: 'B1',
        title: 'Тест 18',
        variantLabel: 'B',
        problemCount: 2,
        timeLimitMin: 30,
        status: 'NOT_STARTED',
        attemptId: null,
        checksUsed: 0,
        maxChecks: 2,
        score: null,
        submittedAt: null,
        late: false,
      },
    ]);
    // THOUSAND хасагдсан
    expect(JSON.stringify(res)).not.toContain('T2');
  });

  it('ангид элсээгүй / өөр ангийн сурагчид юу ч гарахгүй', async () => {
    await expect(svc.my('s2')).resolves.toEqual({ days: [] });
    await expect(svc.start('s2', { testId: 'B1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('эрхгүй тест/огноо: ангийн өөрийн A, буруу өдөр, ирээдүй, 1000 бодлого — 403', async () => {
    await expect(svc.start('s1', { testId: 'A1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.start('s1', { testId: 'B1', date: '2026-10-26' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.start('s1', { testId: 'B1', date: '2026-10-29' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.start('s1', { testId: 'T2', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('start: зөв хариу, isCorrect хэзээ ч ирэхгүй; давтан дуудвал нэг оролдлого', async () => {
    const res = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    const json = JSON.stringify(res);
    expect(json).not.toMatch(/correctAnswer|isCorrect|solution|token/);
    expect(res).toMatchObject({
      status: 'IN_PROGRESS',
      deadlineAt: '2026-10-28T16:00:00.000Z',
      remainingSec: 1800,
      checksUsed: 0,
      maxChecks: 2,
      answers: {},
      lastCheck: null,
    });
    expect(res.problems[0]).toEqual({
      id: 'p1',
      order: 1,
      format: 'CHOICE',
      statementText: '$x$ p1',
      imageKey: null,
      choices: [
        { label: 'A', text: '1', imageKey: null },
        { label: 'B', text: '2', imageKey: null },
        { label: 'C', text: '3', imageKey: null },
        { label: 'D', text: '4', imageKey: null },
        { label: 'E', text: '5', imageKey: null },
      ],
    });
    const again = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(again.attemptId).toBe(res.attemptId);
    expect(env.attempts).toHaveLength(1);
  });

  it('өөр сурагчийн оролдлогыг хадгалах/шалгах/илгээх — 404', async () => {
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    await expect(svc.save('s2', attemptId, { p1: 'B' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.check('s2', attemptId, { p1: 'B' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.submit('s2', attemptId, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ангиас гарсан бол эхлүүлэх/илгээх үед бүтэн эрхийг дахин шалгана', async () => {
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    env.enrollments.length = 0;
    await expect(svc.start('s1', { testId: 'B1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.submit('s1', attemptId, { p1: 'B' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('autosave/шалгах хөнгөн: бүтэн жагсаалт дахин босгохгүй, Test уншихгүй, бодлого санах ойгоос', async () => {
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(env.attempts[0].timeLimitMin).toBe(30);
    const counts = () => ({
      enroll: env.db.enrollment.findMany.mock.calls.length,
      sess: env.db.classTestSession.findMany.mock.calls.length,
      tests: env.db.test.findMany.mock.calls.length,
      problems: env.db.testProblem.findMany.mock.calls.length,
    });
    const before = counts();
    await svc.save('s1', attemptId, { p1: 'B' });
    await svc.check('s1', attemptId, { p2: 'C' });
    expect(counts()).toEqual(before);
    expect(env.db.test.findUnique).not.toHaveBeenCalled();
    // MAX_DAYS цонхноос гадуурх хичээлийн өдрийн оролдлого — хадгалахгүй
    jest.setSystemTime(new Date('2026-12-15T02:00:00Z'));
    await expect(svc.save('s1', attemptId, { p1: 'A' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('B хувилбарыг анги дараа нь танхимд бодох бол гэрийн даалгавар болохгүй', async () => {
    env.sessions.push({ classroomId: 'c1', date: d('2026-11-20'), testId: 'B1' });
    await expect(svc.my('s1')).resolves.toEqual({ days: [] });
    await expect(svc.start('s1', { testId: 'B1', date: '2026-10-27' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('B хувилбар ирээдүйд ангид оноогдсон (TestAccess.assignedAt > одоо) бол гэрийн даалгавар болохгүй', async () => {
    env.accesses.push({ classroomId: 'c1', testId: 'B1', assignedAt: new Date('2026-11-05T00:00:00Z') });
    await expect(svc.my('s1')).resolves.toEqual({ days: [] });
    // Өмнө оноосон (өнгөрсөн) бол саад болохгүй
    env.accesses[0].assignedAt = new Date('2026-10-01T00:00:00Z');
    expect((await svc.my('s1')).days).toHaveLength(1);
  });

  it('шалгах: зөвхөн зөв/буруу, 2 удаа; 3 дахь нь 409; эхний хариу хадгалагдана', async () => {
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    await svc.save('s1', attemptId, { p1: 'A', bogus: 'X' });
    const first = await svc.check('s1', attemptId, {});
    expect(first).toEqual({ checksUsed: 1, results: { p1: 'WRONG', p2: 'BLANK' }, correct: 0, total: 2 });
    const second = await svc.check('s1', attemptId, { p1: 'B', p2: 'C' });
    expect(second).toEqual({ checksUsed: 2, results: { p1: 'CORRECT', p2: 'CORRECT' }, correct: 2, total: 2 });
    await expect(svc.check('s1', attemptId, { p1: 'B' })).rejects.toBeInstanceOf(ConflictException);
    const a = env.attempts[0];
    expect(a.firstAnswers).toEqual({ p1: 'A' });
    expect(env.checks.map((c) => c.n)).toEqual([1, 2]);
    expect(JSON.stringify(first)).not.toMatch(/"B"|"C"/); // зөв үсэг задрахгүй
    const resumed = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(resumed.lastCheck).toEqual({ p1: 'CORRECT', p2: 'CORRECT' });
    expect(resumed.answers).toEqual({ p1: 'B', p2: 'C' });
  });

  it('илгээх: оноо хадгална, давтан дуудвал ижил хариу, дараа нь autosave/шалгах 409', async () => {
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect((await svc.start('s1', { testId: 'B1', date: '2026-10-27' })).score).toBeNull();
    const res = await svc.submit('s1', attemptId, { p1: 'B', p2: 'D' });
    expect(res.score).toEqual({ correct: 1, total: 2 });
    const view = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    expect(view).toMatchObject({ status: 'SUBMITTED', score: { correct: 1, total: 2 }, remainingSec: null });
    expect(res.results).toEqual({ p1: 'CORRECT', p2: 'WRONG' });
    expect(env.attempts[0]).toMatchObject({ status: 'SUBMITTED', score: 1, total: 2 });
    const again = await svc.submit('s1', attemptId, { p1: 'A' });
    expect(again).toEqual(res);
    await expect(svc.save('s1', attemptId, { p1: 'A' })).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.check('s1', attemptId, {})).rejects.toBeInstanceOf(ConflictException);
    const list = await svc.my('s1');
    expect(list.days[0].items[0]).toMatchObject({
      status: 'SUBMITTED',
      score: { correct: 1, total: 2 },
      late: false,
    });
  });

  it('хоцорсон: хугацаа (дараагийн хичээлийн 00:00) өнгөрсний дараа илгээвэл late', async () => {
    jest.setSystemTime(new Date('2026-10-28T10:00:00Z')); // УБ 10-28 18:00
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    jest.setSystemTime(new Date('2026-10-29T02:00:00Z')); // УБ 10-29 10:00 — хугацаа өнгөрсөн
    await svc.submit('s1', attemptId, { p1: 'B' });
    const list = await svc.my('s1');
    expect(list.days[0].items[0].late).toBe(true);
  });

  it('хугацааны хязгаар серверт: 30 мин + 60с-ийн дараа хадгалах/шалгах 409, илгээхэд шинэ хариуг авахгүй', async () => {
    jest.setSystemTime(new Date('2026-10-28T10:00:00Z'));
    const { attemptId } = await svc.start('s1', { testId: 'B1', date: '2026-10-27' });
    await svc.save('s1', attemptId, { p1: 'B' });
    jest.setSystemTime(new Date('2026-10-28T10:31:30Z')); // 31.5 мин — зай өнгөрсөн
    await expect(svc.save('s1', attemptId, { p2: 'C' })).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.check('s1', attemptId, { p2: 'C' })).rejects.toBeInstanceOf(ConflictException);
    const res = await svc.submit('s1', attemptId, { p2: 'C' });
    expect(res.score).toEqual({ correct: 1, total: 2 }); // p2-ийн хожуу хариу тооцогдоогүй
  });

  it('зураг: өөрийн PDF, шинээр илгээвэл хуучныг зөөлөн устгана; бусдын/зураг файл татгалзана', async () => {
    const p1 = await svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f1.pdf', pages: 3 });
    expect(p1).toMatchObject({ fileKey: 'f1.pdf', pages: 3 });
    const same = await svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f1.pdf', pages: 3 });
    expect(same.id).toBe(p1.id);
    const p2 = await svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f2.pdf', pages: 5 });
    expect(p2.pages).toBe(2); // StoredFile-ийн бодит хуудас
    expect(env.photos.find((p) => p.id === p1.id)!.deletedAt).toBeInstanceOf(Date);
    expect((await svc.my('s1')).days[0].photo).toMatchObject({ id: p2.id, fileKey: 'f2.pdf' });

    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'x.pdf', pages: 1 })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'img.jpg', pages: 1 })).rejects.toThrow('PDF');
    // Серверт хуудас тоолоогүй PDF — клиентийн тоонд итгэхгүй
    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'nopages.pdf', pages: 2 })).rejects.toThrow('хуудс');
    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-27', fileKey: 'f1.pdf', pages: 7 })).rejects.toThrow('хуудас');
    await expect(svc.addPhoto('s1', { classroomId: 'c1', date: '2026-10-26', fileKey: 'f1.pdf', pages: 1 })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.addPhoto('s1', { classroomId: 'c9', date: '2026-10-27', fileKey: 'f1.pdf', pages: 1 })).rejects.toBeInstanceOf(ForbiddenException);

    await expect(svc.deletePhoto('s2', p2.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.deletePhoto('s1', p2.id)).resolves.toEqual({ deleted: true });
    await expect(svc.deletePhoto('s1', p2.id)).resolves.toEqual({ deleted: true });
    expect((await svc.my('s1')).days[0].photo).toBeNull();
  });
});

describe('homework-logic — цэвэр функцууд', () => {
  it('buildSlots: ангид орохоос өмнөх өдөр алгасна, B хийсэн бол A', () => {
    const slots = buildSlots({
      enrollments: [{ classroomId: 'c', classroomName: 'C', joinedKey: '2026-10-20' }],
      sessions: [
        { classroomId: 'c', date: '2026-10-18', testId: 'a' },
        { classroomId: 'c', date: '2026-10-22', testId: 'b' },
      ],
      done: [
        { id: 'a', groupKey: 'g', variantLabel: 'A' },
        { id: 'b', groupKey: 'g', variantLabel: 'B' },
      ],
      siblings: [
        { id: 'a', groupKey: 'g', variantLabel: 'A', title: 'A', timeLimitMin: null, problemCount: 1 },
        { id: 'b', groupKey: 'g', variantLabel: 'B', title: 'B', timeLimitMin: null, problemCount: 1 },
      ],
      fromKey: '2026-10-01',
      toKey: '2026-10-29',
    });
    expect(slots.map((s) => [s.date, s.items.map((i) => i.id), s.deadlineAt])).toEqual([
      ['2026-10-22', ['a'], null],
    ]);
  });

  it('gradingInput: TEXT горимд үсэг → индекс; mergeAnswers: null арилгана, бусад түлхүүр хаягдана', () => {
    const g = { id: 'p', format: 'CHOICE' as const, choices: ['1', '2'], correctAnswer: 'B' };
    expect(gradingInput(g, 'b')).toBe(1);
    expect(gradingInput(g, 1)).toBe(1);
    const rows = [{ problemId: 'p', problem: { format: 'CHOICE', correctAnswer: 'B' } }];
    expect(mergeAnswers(rows, { p: 'A', old: 'x' }, { p: null, q: 'B' })).toEqual({});
    expect(mergeAnswers(rows, {}, { p: 'C', __proto__: 'x' })).toEqual({ p: 'C' });
  });

  it('remainingSec: хязгааргүй бол null, хэтэрвэл 0', () => {
    const start = new Date('2026-10-29T00:00:00Z');
    expect(remainingSec(null, start)).toBeNull();
    expect(remainingSec(10, start, new Date('2026-10-29T00:05:00Z'))).toBe(300);
    expect(remainingSec(10, start, new Date('2026-10-29T01:00:00Z'))).toBe(0);
  });
});

describe('Багшийн самбар «Онлайн» — илгээсэн гэрийн даалгаврын оноо', () => {
  it('TestResult-гүй сурагчид HomeworkAttempt (SUBMITTED)-ын зөв/нийт харагдана, TestResult давхардахгүй', async () => {
    const env = makeDb();
    const db = env.db;
    db.classroom = { findUnique: jest.fn(async () => ({ id: 'c1', archived: false, teacherId: 't' })) };
    db.classSchedule = { findMany: jest.fn(async () => []) };
    db.scheduleException = { findMany: jest.fn(async () => []) };
    db.academicCalendarDay = { findMany: jest.fn(async () => []) };
    db.enrollment.findMany = jest.fn(async () => [{ studentId: 's1' }, { studentId: 's2' }, { studentId: 's3' }]);
    db.testResult = {
      findMany: jest.fn(async () => [{ testId: 'B1', studentId: 's2', totalScore: 2, maxScore: 2 }]),
    };
    db.homeworkAttempt.findMany = jest.fn(async () => [
      { testId: 'B1', studentId: 's1', score: 1, total: 2 },
      { testId: 'B1', studentId: 's2', score: 0, total: 2 }, // TestResult байгаа — тоологдохгүй
    ]);
    const svc = new HomeworkMarksService(db, { record: jest.fn() } as never);
    const res = await svc.online('c1', '2026-10-29', 'admin', Role.ADMIN);
    expect(res.previousLessonDate).toBe('2026-10-27');
    expect(res.tests.map((t) => t.testId)).toContain('B1');
    expect(res.students).toEqual({
      s1: { score: 1, max: 2, testId: 'B1', taken: 1 },
      s2: { score: 2, max: 2, testId: 'B1', taken: 1 },
    });
    expect(db.homeworkAttempt.findMany.mock.calls[0][0].where).toMatchObject({
      classroomId: 'c1',
      status: 'SUBMITTED',
      lessonDate: d('2026-10-27'),
    });
  });
});
