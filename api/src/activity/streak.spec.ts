import { ActivityService } from './activity.service';

// ActivityService.streak() нь цэвэр функц биш (PrismaService ашигладаг) тул
// гараар бичсэн stub-ээр дамжуулж тестлэнэ — mocking сан, амьд DB хэрэггүй.

function makeStreakPrisma(opts: {
  activeDates: string[]; // 'YYYY-MM-DD' — Attempt мөртэй өдрүүд
  freezeDates?: string[]; // StreakFreeze өдрүүд
  holidayDates?: string[]; // AcademicCalendarDay (HOLIDAY/BREAK/NO_CLASS) өдрүүд
}) {
  return {
    attempt: {
      groupBy: async () =>
        opts.activeDates.map((d) => ({
          occurredOn: new Date(d),
          _count: { _all: 1 },
        })),
    },
    streakFreeze: {
      findMany: async () =>
        (opts.freezeDates ?? []).map((d) => ({ date: new Date(d) })),
    },
    academicCalendarDay: {
      findMany: async () =>
        (opts.holidayDates ?? []).map((d) => ({ date: new Date(d) })),
    },
  } as any;
}

// УБ-ын өдрийг тогтмол болгохын тул системийн цагийг тухайн өдрийн
// UTC 02:00 (= УБ-аар ~10:00, хилийн асуудалгүй) цагт зогсооно.
function setTodayUB(dateOnly: string) {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(`${dateOnly}T02:00:00.000Z`));
}

afterEach(() => {
  jest.useRealTimers();
});

describe('ActivityService.streak — стрийкийн дүрэм', () => {
  it('огт идэвх байхгүй бол бүгд 0', async () => {
    const service = new ActivityService(makeStreakPrisma({ activeDates: [] }));
    const result = await service.streak('s1');
    expect(result).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
    });
  });

  it('ердийн идэвхгүй өдөр стрийкийг ТАСАЛНА', async () => {
    setTodayUB('2026-07-15');
    // 07-10, 07-11 идэвхтэй → 07-12 ЭНГИЙН идэвхгүй өдөр (хамгаалалтгүй) →
    // 07-13, 07-14 идэвхтэй (өчигдөр) → 07-15 (өнөөдөр) идэвхтэй.
    const service = new ActivityService(
      makeStreakPrisma({
        activeDates: [
          '2026-07-10',
          '2026-07-11',
          '2026-07-13',
          '2026-07-14',
          '2026-07-15',
        ],
      }),
    );
    const result = await service.streak('s1');
    // 07-12-ны тасралт учир одоогийн стрийк зөвхөн 07-13-аас эхэлнэ: 13,14,15 = 3
    expect(result.currentStreak).toBe(3);
    // хамгийн урт нь 07-10..07-11 (2) эсвэл 07-13..07-15 (3) — 3
    expect(result.longestStreak).toBe(3);
    expect(result.totalActiveDays).toBe(5);
  });

  it('StreakFreeze өдөр стрийкийг ТАСАЛДАГГҮЙ (хамгаалагдсан идэвхгүй өдөр)', async () => {
    setTodayUB('2026-07-15');
    // 07-12 идэвхгүй ч StreakFreeze-тэй тул стрийк тасрахгүй.
    const service = new ActivityService(
      makeStreakPrisma({
        activeDates: [
          '2026-07-10',
          '2026-07-11',
          '2026-07-13',
          '2026-07-14',
          '2026-07-15',
        ],
        freezeDates: ['2026-07-12'],
      }),
    );
    const result = await service.streak('s1');
    // Тасрахгүй тул 07-10-аас 07-15 хүртэл бүхэлдээ нэг стрийк: 5 идэвхтэй өдөр.
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
  });

  it('хуанлийн амралт/завсарлагын өдөр (AcademicCalendarDay) стрийкийг ТАСАЛДАГГҮЙ', async () => {
    setTodayUB('2026-07-15');
    const service = new ActivityService(
      makeStreakPrisma({
        activeDates: [
          '2026-07-10',
          '2026-07-11',
          '2026-07-13',
          '2026-07-14',
          '2026-07-15',
        ],
        holidayDates: ['2026-07-12'],
      }),
    );
    const result = await service.streak('s1');
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
  });

  it('longestStreak нь одоогийн (currentStreak) стрийкээс ялгаатай байж болно', async () => {
    setTodayUB('2026-07-20');
    // Өмнө нь 4 өдрийн урт стрийк байснаа ердийн (хамгаалагдаагүй) өдөр
    // тасарч, дараа нь зөвхөн 2 өдрийн богино стрийк (өчигдөр+өнөөдөр) үргэлжилсэн.
    const service = new ActivityService(
      makeStreakPrisma({
        activeDates: [
          '2026-07-05',
          '2026-07-06',
          '2026-07-07',
          '2026-07-08',
          // 07-09 ердийн идэвхгүй өдөр — тасалдал
          '2026-07-19',
          '2026-07-20',
        ],
      }),
    );
    const result = await service.streak('s1');
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(4);
  });

  it('өнөөдөр идэвхгүй байсан ч (хараахан дуусаагүй тул) стрийк шууд тасрахгүй', async () => {
    setTodayUB('2026-07-15');
    const service = new ActivityService(
      makeStreakPrisma({
        activeDates: ['2026-07-13', '2026-07-14'], // өчигдөр хүртэл идэвхтэй, өнөөдөр (15) хараахан үгүй
      }),
    );
    const result = await service.streak('s1');
    expect(result.currentStreak).toBe(2);
  });

  it('сарын хилээр (7 сар → 8 сар) стрийкийг зөв тоолно', async () => {
    setTodayUB('2026-08-02');
    const service = new ActivityService(
      makeStreakPrisma({
        activeDates: [
          '2026-07-30',
          '2026-07-31',
          '2026-08-01',
          '2026-08-02',
        ],
      }),
    );
    const result = await service.streak('s1');
    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(4);
    expect(result.totalActiveDays).toBe(4);
  });
});
