import { Logger } from '@nestjs/common';
import { MistakeCollector } from './mistake-collector.service';

function makeHarness() {
  let row: Record<string, any> | null = null;
  let transactionTail = Promise.resolve();
  const tx = {
    mistakeEntry: {
      upsert: jest.fn(async ({ create }: any) => {
        if (!row) row = { id: 'entry-1', ...create, status: 'NEW', retryCount: 0, consecutiveCorrect: 0 };
        return { id: row!.id };
      }),
      findUniqueOrThrow: jest.fn(async () => row),
      update: jest.fn(async ({ data }: any) => { row = { ...row, ...data }; return row; }),
    },
    $queryRaw: jest.fn(async () => []),
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => {
      const previous = transactionTail;
      let release!: () => void;
      transactionTail = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try { return await callback(tx); } finally { release(); }
    }),
    attempt: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    test: { findUnique: jest.fn() },
  };
  return { collector: new MistakeCollector(prisma as any), prisma, tx, get row() { return row; }, set row(value: Record<string, any> | null) { row = value; } };
}

const base = {
  userId: 'learner-1', problemId: 'problem-1', source: 'TEST' as const,
  sourceOccurredAt: new Date('2026-09-01T03:00:00Z'), testTitle: 'Synthetic test',
  givenAnswer: 'wrong',
};

describe('MistakeCollector', () => {
  let loggerError: jest.SpyInstance;
  beforeEach(() => { loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined); });
  afterEach(() => loggerError.mockRestore());

  it('is idempotent for the same attempt event, even after mastery', async () => {
    const h = makeHarness();
    const input = { ...base, sourceRefId: 'attempt-1' };
    await expect(h.collector.collect(input)).resolves.toBe(true);
    h.row!.status = 'MASTERED';
    h.row!.consecutiveCorrect = 2;
    await expect(h.collector.collect(input)).resolves.toBe(true);
    expect(h.row).toMatchObject({ sourceRefId: 'attempt-1', status: 'MASTERED', consecutiveCorrect: 2 });
    expect(h.tx.mistakeEntry.update).not.toHaveBeenCalled();
  });

  it('serializes concurrent retries of one wrong attempt without duplicate state changes', async () => {
    const h = makeHarness();
    const input = { ...base, sourceRefId: 'attempt-1' };
    await Promise.all([h.collector.collect(input), h.collector.collect(input)]);
    expect(h.row).toMatchObject({ sourceRefId: 'attempt-1', status: 'NEW' });
    expect(h.tx.mistakeEntry.update).not.toHaveBeenCalled();
  });

  it('ignores an older out-of-order event and preserves a mastered entry', async () => {
    const h = makeHarness();
    await h.collector.collect({ ...base, sourceRefId: 'attempt-new', sourceOccurredAt: new Date('2026-09-03T03:00:00Z') });
    h.row!.status = 'MASTERED';
    h.row!.consecutiveCorrect = 2;
    await h.collector.collect({ ...base, sourceRefId: 'attempt-old', sourceOccurredAt: new Date('2026-09-02T03:00:00Z') });
    expect(h.row).toMatchObject({ sourceRefId: 'attempt-new', status: 'MASTERED', consecutiveCorrect: 2 });
    expect(h.tx.mistakeEntry.update).not.toHaveBeenCalled();
  });

  it('reopens a mastered entry for a genuinely newer wrong attempt', async () => {
    const h = makeHarness();
    await h.collector.collect({ ...base, sourceRefId: 'attempt-old' });
    h.row!.status = 'MASTERED';
    h.row!.retryCount = 4;
    h.row!.consecutiveCorrect = 2;
    await h.collector.collect({ ...base, sourceRefId: 'attempt-new', sourceOccurredAt: new Date('2026-09-02T03:00:00Z') });
    expect(h.row).toMatchObject({ sourceRefId: 'attempt-new', status: 'RETRYING', retryCount: 0, consecutiveCorrect: 0, lastCorrectAt: null });
  });

  it('does not reopen a mastered entry for an event older than a successful retry', async () => {
    const h = makeHarness();
    await h.collector.collect({ ...base, sourceRefId: 'attempt-old' });
    h.row!.status = 'MASTERED';
    h.row!.consecutiveCorrect = 2;
    h.row!.lastRetryAt = new Date('2026-09-05T03:00:00Z');
    await h.collector.collect({
      ...base,
      sourceRefId: 'delayed-attempt',
      sourceOccurredAt: new Date('2026-09-04T03:00:00Z'),
    });
    expect(h.row).toMatchObject({ sourceRefId: 'attempt-old', status: 'MASTERED', consecutiveCorrect: 2 });
    expect(h.tx.mistakeEntry.update).not.toHaveBeenCalled();
  });

  it('keeps a collection failure nonfatal so the attempt remains pending', async () => {
    const h = makeHarness();
    h.prisma.$transaction.mockRejectedValueOnce(new Error('temporary'));
    await expect(h.collector.collect({ ...base, sourceRefId: 'attempt-1' })).resolves.toBe(false);
    expect(loggerError).toHaveBeenCalled();
  });

  it('targets only the requested pending attempt from a grading hook', async () => {
    const h = makeHarness();
    h.prisma.attempt.findFirst.mockResolvedValue(null);
    await expect(h.collector.collectAttempt('attempt-target')).resolves.toBe(true);
    expect(h.prisma.attempt.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'attempt-target', mistakeCollectedAt: null }) }));
    expect(h.prisma.attempt.findMany).not.toHaveBeenCalled();
  });

  it('uses creation chronology and test linkage rather than date or ONLINE_TEST source', async () => {
    const h = makeHarness();
    const createdAt = new Date('2026-09-04T08:00:00Z');
    h.prisma.attempt.findFirst.mockResolvedValue({
      id: 'practice-attempt', studentId: 'learner-1', problemId: 'problem-1',
      source: 'ONLINE_TEST', testId: null, occurredOn: new Date('2026-09-01T00:00:00Z'),
      createdAt, givenAnswer: 'wrong',
    });
    h.prisma.attempt.updateMany.mockResolvedValue({ count: 1 });
    await expect(h.collector.collectAttempt('practice-attempt')).resolves.toBe(true);
    expect(h.tx.mistakeEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        source: 'PRACTICE', sourceRefId: 'practice-attempt', sourceOccurredAt: createdAt,
      }),
    }));
  });
});
