import { MistakeCollector } from './mistake-collector.service';

describe('MistakeCollector', () => {
  it('does not reset a mastered entry when the same source attempt is retried', async () => {
    const prisma = { mistakeEntry: { findUnique: jest.fn().mockResolvedValue({ sourceRefId: 'attempt-1' }), upsert: jest.fn() } };
    const collector = new MistakeCollector(prisma as any);
    await expect(collector.collect({ userId: 'u1', problemId: 'p1', source: 'PRACTICE', sourceRefId: 'attempt-1' })).resolves.toBe(true);
    expect(prisma.mistakeEntry.upsert).not.toHaveBeenCalled();
  });
  it('reports collection failures for retry without throwing into the caller', async () => {
    const prisma = { mistakeEntry: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockRejectedValue(new Error('temporary')) } };
    const collector = new MistakeCollector(prisma as any);
    await expect(collector.collect({ userId: 'u1', problemId: 'p1', source: 'TEST' })).resolves.toBe(false);
  });
});
