import { CalendarDayType } from '../generated/prisma/enums';

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Идэвхийн түвшний босго — GitHub маягийн heatmap-ийн 0-4 өнгөний
 * түвшинг ХЭДЭН БОДЛОГО бодсоноор тодорхойлно. Энэ бол ганц эх сурвалж —
 * бусад тооцоолол (frontend-ийн өнгөний зураглал ч гэсэн) ЭНД тодорхойлсон
 * түвшингээс (level 0-4) шууд авна, тоог өөрөө дахин ангилдаггүй.
 */
export const ACTIVITY_LEVEL_THRESHOLDS = [
  { level: 0 as const, min: 0, label: 'Идэвхгүй' },
  { level: 1 as const, min: 1, label: 'Бага идэвхтэй (1-3 бодлого)' },
  { level: 2 as const, min: 4, label: 'Дунд идэвхтэй (4-7 бодлого)' },
  { level: 3 as const, min: 8, label: 'Идэвхтэй (8-14 бодлого)' },
  { level: 4 as const, min: 15, label: 'Маш идэвхтэй (15+ бодлого)' },
];

export function computeActivityLevel(count: number): ActivityLevel {
  let level: ActivityLevel = 0;
  for (const t of ACTIVITY_LEVEL_THRESHOLDS) {
    if (count >= t.min) level = t.level;
  }
  return level;
}

/**
 * Ангийн бүлэг идэвхийн түвшин — тухайн өдөр идэвхтэй байсан сурагчийн ХУВЬ
 * (0-100%) дээр суурилна (ганц сурагчийн бодлогын тоо биш — энд зорилго нь
 * "анги бүхэлдээ идэвхтэй байсан уу", сурагч хоорондын харьцуулалт биш).
 */
export const CLASS_ACTIVITY_LEVEL_THRESHOLDS = [
  { level: 0 as const, min: 0 },
  { level: 1 as const, min: 0.01 },
  { level: 2 as const, min: 25 },
  { level: 3 as const, min: 50 },
  { level: 4 as const, min: 75 },
];

export function computeClassActivityLevel(percent: number): ActivityLevel {
  let level: ActivityLevel = 0;
  for (const t of CLASS_ACTIVITY_LEVEL_THRESHOLDS) {
    if (percent >= t.min) level = t.level;
  }
  return level;
}

// Хичээл ЯВАГДААГҮЙ гэж тооцох хуанлийн өдрийн төрлүүд (AcademicCalendarDay.type).
// EXAM_DAY, SPECIAL нь хичээлийн/идэвхийн өдөр гэж тооцогдоно — зөвхөн бодит
// амралт/завсарлагыг л "стрийк тасалдаггүй" өдөр гэж үзнэ.
export const NON_CLASS_DAY_TYPES: CalendarDayType[] = [
  CalendarDayType.HOLIDAY,
  CalendarDayType.BREAK,
  CalendarDayType.NO_CLASS,
];
