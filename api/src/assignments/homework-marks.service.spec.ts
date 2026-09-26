import { HomeworkMarksService, MY_MARKS_DAYS } from './homework-marks.service';

// mine() — сурагч өөрийн тэмдэглэгээг харах (эзний шийдвэр 2026-09-26:
// танхимын даалгавар = DailyHomeworkMark). Prisma-г гараар stub хийнэ.
function makeService() {
  const calls: any[] = [];
  const prisma = {
    dailyHomeworkMark: {
      findMany: async (args: any) => {
        calls.push(args);
        return [];
      },
    },
  } as any;
  const service = new HomeworkMarksService(prisma, {} as any);
  return { service, calls };
}

describe('HomeworkMarksService.mine', () => {
  const now = new Date('2026-09-26T10:00:00Z');

  it('зөвхөн тухайн сурагчийн, тэмдэглэгдсэн мөрийг шинээс нь авна', async () => {
    const { service, calls } = makeService();
    await service.mine('stu-1', MY_MARKS_DAYS, now);
    expect(calls[0].where.studentId).toBe('stu-1');
    expect(calls[0].where.status).toEqual({ not: null });
    expect(calls[0].orderBy).toEqual({ date: 'desc' });
  });

  it('14 хоног = өнөөдөр оруулаад 14 өдөр (09-13 .. 09-26)', async () => {
    const { service, calls } = makeService();
    await service.mine('stu-1', 14, now);
    expect(calls[0].where.date.gte.toISOString()).toBe('2026-09-13T00:00:00.000Z');
  });

  it('хэт урт хугацааг 60 хоногоор хязгаарлана, 0/буруу утгыг өгөгдмөл болгоно', async () => {
    const { service, calls } = makeService();
    await service.mine('stu-1', 9999, now);
    await service.mine('stu-1', 0, now);
    expect(calls[0].where.date.gte.toISOString()).toBe('2026-07-29T00:00:00.000Z');
    expect(calls[1].where.date.gte.toISOString()).toBe('2026-09-13T00:00:00.000Z');
  });
});
