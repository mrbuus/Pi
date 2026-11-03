import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { ProblemReviewService } from './problem-review.service';

const NOW = new Date('2026-11-04T02:00:00.000Z');

function problem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'problem-1',
    statementText: 'Тэгшитгэл $x+1=3$',
    imageKey: null,
    format: 'CHOICE',
    choices: null,
    correctAnswer: null,
    choiceOptions: [
      { order: 0, text: '1', isCorrect: false },
      { order: 1, text: '2', isCorrect: true },
    ],
    formulas: [],
    analysis: { status: 'VERIFIED', solutionOutline: 'Бодолт' },
    ...overrides,
  };
}

function reviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'review-1',
    studentId: 'student-1',
    problemId: 'problem-1',
    dueAt: new Date('2026-11-03T16:00:00.000Z'),
    intervalDays: 1,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    lastResult: 'WRONG',
    source: 'TEST',
    lastEventAt: new Date('2026-11-03T02:00:00.000Z'),
    problem: problem(),
    ...overrides,
  };
}

function harness() {
  const db = {
    problemReview: {
      findUnique: jest.fn(),
      updateMany: jest.fn(async () => ({ count: 1 })),
      createMany: jest.fn(async () => ({ count: 1 })),
      count: jest.fn(async () => 0),
      findMany: jest.fn(async (_args?: any) => [] as unknown[]),
      findFirst: jest.fn(),
    },
  };
  const access = { deletedAt: null };
  const mistakes = { accessibleChapterWhere: jest.fn(async () => access) };
  return { db, mistakes, access, service: new ProblemReviewService(db as never, mistakes as never) };
}

describe('ProblemReviewService.recordWrong (upsert hook)', () => {
  let loggerError: jest.SpyInstance;
  beforeEach(() => {
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => loggerError.mockRestore());

  const event = { studentId: 'student-1', problemId: 'problem-1', source: 'PRACTICE' as const, occurredAt: NOW };

  it('шинэ: маргааш давтагдахаар үүсгэнэ (давхардвал skipDuplicates)', async () => {
    const h = harness();
    h.db.problemReview.findUnique.mockResolvedValue(null);
    await expect(h.service.recordWrong(event)).resolves.toBe(true);
    expect(h.db.problemReview.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          studentId: 'student-1',
          problemId: 'problem-1',
          intervalDays: 1,
          reps: 0,
          lapses: 0,
          source: 'PRACTICE',
          lastEventAt: NOW,
          dueAt: new Date('2026-11-04T16:00:00.000Z'),
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('байгаа мөрийг тэглэнэ — зөвхөн шинэ үйл явдлаар (lastEventAt < occurredAt нөхцөлтэй)', async () => {
    const h = harness();
    h.db.problemReview.findUnique.mockResolvedValue({
      intervalDays: 18,
      ease: 2.3,
      reps: 3,
      lapses: 1,
      lastEventAt: new Date('2026-11-01T00:00:00Z'),
    });
    await h.service.recordWrong(event);
    expect(h.db.problemReview.updateMany).toHaveBeenCalledWith({
      where: { studentId: 'student-1', problemId: 'problem-1', lastEventAt: { lt: NOW } },
      data: expect.objectContaining({ intervalDays: 1, reps: 0, lapses: 2, ease: 2.3, lastEventAt: NOW }),
    });
    expect(h.db.problemReview.createMany).not.toHaveBeenCalled();
  });

  it('хоцорсон/давтагдсан үйл явдал хуваарийг өөрчлөхгүй', async () => {
    const h = harness();
    h.db.problemReview.findUnique.mockResolvedValue({ intervalDays: 7, ease: 2.5, reps: 2, lapses: 0, lastEventAt: NOW });
    await expect(h.service.recordWrong(event)).resolves.toBe(true);
    expect(h.db.problemReview.updateMany).not.toHaveBeenCalled();
    expect(h.db.problemReview.createMany).not.toHaveBeenCalled();
  });

  it('ӨС-ийн алдаа шидэхгүй (дүгнэлтийг унагаахгүй)', async () => {
    const h = harness();
    h.db.problemReview.findUnique.mockRejectedValue(new Error('down'));
    await expect(h.service.recordWrong(event)).resolves.toBe(false);
  });

  it('background: дараалан бүгдийг бүртгэж, унтрахдаа хүлээнэ', async () => {
    const h = harness();
    h.db.problemReview.findUnique.mockResolvedValue(null);
    h.service.recordWrongInBackground([event, { ...event, problemId: 'problem-2' }]);
    await h.service.onModuleDestroy();
    expect(h.db.problemReview.createMany).toHaveBeenCalledTimes(2);
  });
});

describe('ProblemReviewService.due', () => {
  it('зөвхөн өөрийн, хугацаа болсон, эрхтэй бүлгийн бодлого; түлхүүр/бодолт ирэхгүй', async () => {
    const h = harness();
    h.db.problemReview.count.mockResolvedValue(3);
    h.db.problemReview.findMany.mockResolvedValue([
      reviewRow(),
      reviewRow({ id: 'review-2', problem: problem({ id: 'nokey', choiceOptions: [], correctAnswer: null }) }),
    ]);
    const res = await h.service.due('student-1', '5');
    const where = h.db.problemReview.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      studentId: 'student-1',
      dueAt: { lte: expect.any(Date) },
      problem: { deletedAt: null, chapter: { is: h.access } },
    });
    expect(h.mistakes.accessibleChapterWhere).toHaveBeenCalledWith('student-1');
    expect(res.total).toBe(2);
    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toMatchObject({
      id: 'review-1',
      problem: { id: 'problem-1', choices: ['1', '2'], choiceMode: 'TEXT', format: 'CHOICE' },
      intervalDays: 1,
      reps: 0,
      lapses: 0,
    });
    const text = JSON.stringify(res);
    expect(text).not.toMatch(/correctAnswer|isCorrect|solutionOutline|Бодолт/);
  });

  it('limit 1–30', async () => {
    const h = harness();
    await expect(h.service.due('student-1', '0')).rejects.toBeInstanceOf(BadRequestException);
    await expect(h.service.due('student-1', '31')).rejects.toBeInstanceOf(BadRequestException);
    await expect(h.service.due('student-1', 'x')).rejects.toBeInstanceOf(BadRequestException);
    await h.service.due('student-1');
    expect(h.db.problemReview.findMany.mock.calls[0][0].take).toBe(20);
  });
});

describe('ProblemReviewService.answer', () => {
  beforeEach(() => jest.useFakeTimers({ now: NOW }));
  afterEach(() => jest.useRealTimers());

  it('өөр сурагчийн мөрийг олохгүй (studentId-аар шүүнэ)', async () => {
    const h = harness();
    h.db.problemReview.findFirst.mockResolvedValue(null);
    await expect(h.service.answer('student-2', 'review-1', 1)).rejects.toBeInstanceOf(NotFoundException);
    expect(h.db.problemReview.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'review-1', studentId: 'student-2' });
  });

  it('хоосон хариу 400', async () => {
    const h = harness();
    await expect(h.service.answer('student-1', 'review-1', '')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('хугацаа болсон, зөв: интервал 3 хоног болж, хариу/бодолт нээгдэнэ', async () => {
    const h = harness();
    h.db.problemReview.findFirst.mockResolvedValue(reviewRow());
    const res = await h.service.answer('student-1', 'review-1', 1);
    expect(res).toMatchObject({
      correct: true,
      correctAnswer: '2',
      solutionOutline: 'Бодолт',
      scheduled: true,
      intervalDays: 3,
      reps: 1,
    });
    expect(h.db.problemReview.updateMany).toHaveBeenCalledWith({
      where: { id: 'review-1', studentId: 'student-1', dueAt: reviewRow().dueAt, reps: 0, lapses: 0 },
      data: expect.objectContaining({ intervalDays: 3, reps: 1, lastResult: 'CORRECT', lastEventAt: NOW }),
    });
  });

  it('хугацаа болсон, буруу: 1 хоног руу буцна', async () => {
    const h = harness();
    h.db.problemReview.findFirst.mockResolvedValue(reviewRow({ intervalDays: 7, reps: 2 }));
    const res = await h.service.answer('student-1', 'review-1', 0);
    expect(res).toMatchObject({ correct: false, scheduled: true, intervalDays: 1, reps: 0, lapses: 1 });
  });

  it('хугацаа болоогүй: дүгнэнэ, хуваарь өөрчлөгдөхгүй (давхар товшилт сунгахгүй)', async () => {
    const h = harness();
    const later = new Date('2026-11-10T16:00:00.000Z');
    h.db.problemReview.findFirst.mockResolvedValue(reviewRow({ dueAt: later, intervalDays: 7, reps: 2 }));
    const res = await h.service.answer('student-1', 'review-1', 1);
    expect(res).toMatchObject({ correct: true, scheduled: false, dueAt: later, intervalDays: 7, reps: 2 });
    expect(h.db.problemReview.updateMany).not.toHaveBeenCalled();
  });

  it('зэрэг өөрчлөгдсөн бол 409', async () => {
    const h = harness();
    h.db.problemReview.findFirst.mockResolvedValue(reviewRow());
    h.db.problemReview.updateMany.mockResolvedValue({ count: 0 });
    await expect(h.service.answer('student-1', 'review-1', 1)).rejects.toBeInstanceOf(ConflictException);
  });

  it('хариуны түлхүүргүй бодлого 400', async () => {
    const h = harness();
    h.db.problemReview.findFirst.mockResolvedValue(reviewRow({ problem: problem({ choiceOptions: [] }) }));
    await expect(h.service.answer('student-1', 'review-1', 1)).rejects.toBeInstanceOf(BadRequestException);
  });
});
