import { rankScores, RankingService } from './ranking.service';
describe('private exam rankings', () => {
  it('shares rank across equal percentages and skips tied places', () => {
    const scores = [
      { totalScore: 9, maxScore: 10 },
      { totalScore: 18, maxScore: 20 },
      { totalScore: 8, maxScore: 10 },
    ];
    expect(rankScores(scores[0], scores)).toEqual({
      rank: 1,
      participants: 3,
      tied: 2,
    });
    expect(rankScores(scores[2], scores).rank).toBe(3);
  });
  it('does not rank ungradable records', () => {
    expect(rankScores({ totalScore: 0, maxScore: 0 }, []).rank).toBeNull();
  });
  it('requires own result before loading peers', async () => {
    const prisma = {
      testResult: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
      },
    };
    await expect(
      new RankingService(prisma as never).ownRanking('test', 'viewer'),
    ).rejects.toThrow('Дууссан');
    expect(prisma.testResult.findMany).not.toHaveBeenCalled();
  });
  it('нэгдсэн шалгалт: хаах цаг хүртэл байр, оноо задрахгүй', async () => {
    const prisma = {
      testResult: {
        findFirst: jest.fn().mockResolvedValue({
          totalScore: 5,
          maxScore: 10,
          source: 'ONLINE_TEST',
          test: { id: 't', title: 'A', closesAt: new Date(Date.now() + 60_000) },
        }),
        findMany: jest.fn(),
      },
    };
    await expect(
      new RankingService(prisma as never).ownRanking('test', 'viewer'),
    ).rejects.toThrow('Хариу хүлээн авлаа');
    expect(prisma.testResult.findMany).not.toHaveBeenCalled();
  });
});
