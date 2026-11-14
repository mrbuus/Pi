/**
 * «Уян» цуврал (2026-11-04, RESEARCH-2026-11 §2 «Цуврал + сул өдөр»). Цэвэр логик, тесттэй.
 *
 * Хуучин `currentStreak`-ийн утгыг ӨӨРЧЛӨХГҮЙ (вэб харуулдаг) — энэ нь тусдаа, нэмэлт талбар.
 * ISO 7 хоног (Даваа–Ням) бүрт нэг идэвхгүй өдрийг «амралтын өдөр» гэж тооцож цувралыг тасалдаггүй.
 * Хамгаалагдсан өдөр (StreakFreeze, амралт/завсарлага) ердийнх шигээ тасалдаггүй, амралтын өдөр зарцуулахгүй.
 * Идэвхгүй өдөр цувралыг өсгөхгүй — цуврал = цувралын доторх идэвхтэй өдрийн тоо.
 */

export interface FlexStreak {
  flexStreak: number;
  restDayUsedThisWeek: boolean;
  activeDaysThisWeek: number;
}

const DAY = 86_400_000;

function key(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Огноо (UTC шөнө дунд) → тухайн ISO 7 хоногийн Даваа гарагийн түлхүүр. */
export function isoWeekKey(dateKey: string): string {
  const ms = Date.parse(`${dateKey}T00:00:00.000Z`);
  const mondayOffset = (new Date(ms).getUTCDay() + 6) % 7;
  return key(ms - mondayOffset * DAY);
}

/**
 * [activeDates], [protectedDates] — 'YYYY-MM-DD' (УБ хуанлийн өдөр). [today] — УБ-ын өнөөдөр.
 * Өнөөдөр дуусаагүй тул идэвхгүй байсан ч цувралыг тасалдаггүй, амралтын өдөр ч зарцуулахгүй.
 */
export function computeFlexStreak(activeDates: Set<string>, protectedDates: Set<string>, today: string): FlexStreak {
  const todayMs = Date.parse(`${today}T00:00:00.000Z`);
  const thisWeek = isoWeekKey(today);
  let activeDaysThisWeek = 0;
  for (const d of activeDates) if (isoWeekKey(d) === thisWeek && d <= today) activeDaysThisWeek += 1;

  const sorted = [...activeDates].filter((d) => d <= today).sort();
  if (!sorted.length) return { flexStreak: 0, restDayUsedThisWeek: false, activeDaysThisWeek };

  let run = 0;
  let restWeeks = new Set<string>();
  for (let ms = Date.parse(`${sorted[0]}T00:00:00.000Z`); ms < todayMs; ms += DAY) {
    const d = key(ms);
    if (activeDates.has(d)) {
      run += 1;
    } else if (!protectedDates.has(d)) {
      const week = isoWeekKey(d);
      if (run > 0 && !restWeeks.has(week)) {
        restWeeks.add(week);
      } else {
        run = 0;
        restWeeks = new Set<string>();
      }
    }
  }
  if (activeDates.has(today)) run += 1;
  return { flexStreak: run, restDayUsedThisWeek: run > 0 && restWeeks.has(thisWeek), activeDaysThisWeek };
}
