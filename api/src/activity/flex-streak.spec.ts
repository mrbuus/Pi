import { ActivityService } from './activity.service';
import { computeFlexStreak, isoWeekKey } from './flex-streak';

const set = (...days: string[]) => new Set(days);

describe('isoWeekKey', () => {
  it('Даваа гарагаар эхэлнэ', () => {
    expect(isoWeekKey('2026-11-02')).toBe('2026-11-02'); // Даваа
    expect(isoWeekKey('2026-11-08')).toBe('2026-11-02'); // Ням
    expect(isoWeekKey('2026-11-09')).toBe('2026-11-09');
  });
});

describe('computeFlexStreak', () => {
  // 2026-11-04 = Лхагва
  it('7 хоногт нэг идэвхгүй өдөр цувралыг тасалдаггүй, амралтын өдөр гэж тэмдэглэнэ', () => {
    const r = computeFlexStreak(set('2026-11-02', '2026-11-04'), set(), '2026-11-04');
    expect(r).toEqual({ flexStreak: 2, restDayUsedThisWeek: true, activeDaysThisWeek: 2 });
  });

  it('нэг 7 хоногт хоёр дахь идэвхгүй өдөр тасална', () => {
    const r = computeFlexStreak(set('2026-11-02', '2026-11-05'), set(), '2026-11-05');
    expect(r.flexStreak).toBe(1);
    expect(r.restDayUsedThisWeek).toBe(false);
  });

  it('7 хоног бүр шинэ амралтын өдөртэй', () => {
    // 10-28 (Лх) алгассан, 11-03 (Мя) алгассан — өөр 7 хоног
    const active = set('2026-10-26', '2026-10-27', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-04');
    const r = computeFlexStreak(active, set(), '2026-11-04');
    expect(r.flexStreak).toBe(8);
    expect(r.restDayUsedThisWeek).toBe(true);
  });

  it('хамгаалагдсан өдөр (амралт, freeze) амралтын өдөр зарцуулахгүй', () => {
    const r = computeFlexStreak(set('2026-11-02', '2026-11-05'), set('2026-11-03'), '2026-11-05');
    expect(r).toMatchObject({ flexStreak: 2, restDayUsedThisWeek: true });
  });

  it('өнөөдөр идэвхгүй байсан ч цуврал тасрахгүй', () => {
    const r = computeFlexStreak(set('2026-11-02', '2026-11-03'), set(), '2026-11-04');
    expect(r).toEqual({ flexStreak: 2, restDayUsedThisWeek: false, activeDaysThisWeek: 2 });
  });

  it('идэвхгүй бол 0', () => {
    expect(computeFlexStreak(set(), set(), '2026-11-04')).toEqual({
      flexStreak: 0,
      restDayUsedThisWeek: false,
      activeDaysThisWeek: 0,
    });
  });
});

describe('ActivityService.streak — нэмэлт талбарууд хуучин утгыг өөрчлөхгүй', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-04T02:00:00.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('currentStreak хатуу хэвээр, flexStreak амралтын өдрийг тэвчинэ, зорилго ирнэ', async () => {
    const db = {
      attempt: {
        groupBy: async () => ['2026-11-02', '2026-11-04'].map((d) => ({ occurredOn: new Date(d), _count: { _all: 1 } })),
      },
      streakFreeze: { findMany: async () => [] },
      academicCalendarDay: { findMany: async () => [] },
      studyWeeklyGoal: { findFirst: async () => ({ daysPerWeek: 4 }) },
    };
    const result = await new ActivityService(db as never).streak('s1');
    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      totalActiveDays: 2,
      flexStreak: 2,
      restDayUsedThisWeek: true,
      activeDaysThisWeek: 2,
      weeklyGoal: 4,
    });
  });
});
