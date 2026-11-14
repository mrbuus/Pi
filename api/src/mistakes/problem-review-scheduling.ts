/**
 * Алдсан бодлогын хугацаатай давталт — SM-2-ийн хялбар хувилбар (цэвэр логик, I/O-гүй).
 *
 * - Буруу бодсон бодлого (дасгал, давтлага, тест, гэрийн даалгавар) → маргааш (УБ шөнө дунд) давтагдана.
 * - Давтлагаар зөв: 1 дэх удаа 3 хоног, 2 дахь удаа 7 хоног, дараа нь интервал × ease (дээд тал 180 хоног).
 * - Давтлагаар буруу: интервал 1 хоног, reps 0, lapses + 1, ease −0.2 (доод тал 1.3).
 *
 * ⚠️ STATUS.md §7.5: бодлогыг цээжлэх биш — зорилго нь алдсан бодлогоо хэдэн өдрийн дараа дахин
 * бие даан бодож чадаж байгаа эсэхийг шалгах. Тиймээс интервал хурдан урт болохгүй, 180 хоногоор хязгаарлана.
 */

export type ProblemReviewResult = 'WRONG' | 'CORRECT';
export type ProblemReviewSource = 'PRACTICE' | 'TEST' | 'STUDY_REVIEW' | 'HOMEWORK' | 'REVIEW';

export interface ProblemReviewState {
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
}

export interface ProblemReviewSchedule extends ProblemReviewState {
  dueAt: Date;
  lastResult: ProblemReviewResult;
}

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 180;
const FIRST_SUCCESS_DAYS = 3;
const SECOND_SUCCESS_DAYS = 7;

/** Улаанбаатарын хуанлийн өдрийн эхлэл + [days] өдөр. Сервер UTC-д ажилладаг тул +08:00-аар тооцно. */
export function ubDayStartPlus(now: Date, days: number): Date {
  if (!Number.isFinite(now.getTime())) throw new RangeError('Invalid time');
  const local = new Date(now.getTime() + 8 * 3_600_000);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 8 * 3_600_000;
  return new Date(midnight + days * 86_400_000);
}

/** Анх буруу бодсон, эсвэл давтлагаас гадуур дахин буруу бодсон бодлого: маргааш давтана. */
export function wrongEventSchedule(previous: ProblemReviewState | null, now: Date): ProblemReviewSchedule {
  return {
    intervalDays: 1,
    ease: previous?.ease ?? INITIAL_EASE,
    reps: 0,
    lapses: previous ? previous.lapses + 1 : 0,
    dueAt: ubDayStartPlus(now, 1),
    lastResult: 'WRONG',
  };
}

/** Давтлагын хариу. Зөв бол интервал уртасна, буруу бол 1 хоног руу буцна. */
export function nextProblemReview(previous: ProblemReviewState, correct: boolean, now: Date): ProblemReviewSchedule {
  if (!correct) {
    return {
      intervalDays: 1,
      ease: Math.max(MIN_EASE, round2(previous.ease - 0.2)),
      reps: 0,
      lapses: previous.lapses + 1,
      dueAt: ubDayStartPlus(now, 1),
      lastResult: 'WRONG',
    };
  }
  const reps = previous.reps + 1;
  const ease = Math.max(MIN_EASE, previous.ease);
  const raw =
    reps === 1 ? FIRST_SUCCESS_DAYS : reps === 2 ? SECOND_SUCCESS_DAYS : Math.round(previous.intervalDays * ease);
  const intervalDays = Math.min(MAX_INTERVAL_DAYS, Math.max(previous.intervalDays + 1, raw));
  return {
    intervalDays,
    ease,
    reps,
    lapses: previous.lapses,
    dueAt: ubDayStartPlus(now, intervalDays),
    lastResult: 'CORRECT',
  };
}

/** Хугацаа нь болсон эсэх. */
export function isReviewDue(dueAt: Date, now: Date): boolean {
  return dueAt.getTime() <= now.getTime();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
