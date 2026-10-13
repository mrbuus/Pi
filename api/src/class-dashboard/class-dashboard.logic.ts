/**
 * «Анги» самбарын цэвэр тооцоо (I/O-гүй, class-dashboard.spec.ts).
 * Шалгалт/сэдвийн нэгтгэл нь exams/class-overview.ts-ийг дахин ашиглана —
 * энд зөвхөн самбарт нэмэгдсэн зүйлс: 7 хоногийн хандлага, эрсдэлийн дохио,
 * нөхөх хичээл, онооны тархалт, төлбөрийн төлөв.
 */

const DAY = 86_400_000;

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
export type HomeworkStatus = 'DONE' | 'PARTIAL' | 'NOT_DONE';

/** Ирсэн (хоцорсон ч) / (тэмдэглэсэн − чөлөөтэй), % — тэмдэглэгээгүй бол null */
export function attendancePercent(statuses: AttendanceStatus[]): {
  rate: number | null;
  marked: number;
  absent: number;
} {
  let came = 0;
  let total = 0;
  let absent = 0;
  for (const s of statuses) {
    if (s === 'EXCUSED') continue;
    total += 1;
    if (s === 'ABSENT') absent += 1;
    else came += 1;
  }
  return {
    rate: total ? Math.round((came / total) * 100) : null,
    marked: total,
    absent,
  };
}

/** (Хийсэн + дутуу × 0.5) / тэмдэглэсэн, % */
export function homeworkPercent(statuses: (HomeworkStatus | null)[]): {
  rate: number | null;
  marked: number;
} {
  let credit = 0;
  let total = 0;
  for (const s of statuses) {
    if (!s) continue;
    total += 1;
    if (s === 'DONE') credit += 1;
    else if (s === 'PARTIAL') credit += 0.5;
  }
  return {
    rate: total ? Math.round((credit / total) * 100) : null,
    marked: total,
  };
}

/** Даваа гарагаас эхлэх 7 хоногийн эхлэл (UTC огноо). */
export function weekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // Даваа = 0
  x.setUTCDate(x.getUTCDate() - dow);
  return x;
}

/**
 * Сүүлийн `weeks` долоо хоногийн хувь (хуучнаас шинэ рүү). `credit` 0–1,
 * тухайн 7 хоногт тэмдэглэгээгүй бол rate=null (тоо зохиохгүй).
 */
export function weeklyRates(
  rows: { at: Date; credit: number | null }[],
  asOf: Date,
  weeks = 8,
): { week: string; rate: number | null; n: number }[] {
  const end = weekStart(asOf);
  const buckets = new Map<number, { sum: number; n: number }>();
  for (let k = 0; k < weeks; k += 1)
    buckets.set(end.getTime() - k * 7 * DAY, { sum: 0, n: 0 });
  for (const r of rows) {
    if (r.credit === null) continue;
    const b = buckets.get(weekStart(r.at).getTime());
    if (!b) continue;
    b.sum += r.credit;
    b.n += 1;
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, b]) => ({
      week: new Date(t).toISOString().slice(0, 10),
      rate: b.n ? Math.round((b.sum / b.n) * 100) : null,
      n: b.n,
    }));
}

export const attendanceCredit = (s: AttendanceStatus): number | null =>
  s === 'EXCUSED' ? null : s === 'ABSENT' ? 0 : 1;
export const homeworkCredit = (s: HomeworkStatus | null): number | null =>
  s === 'DONE' ? 1 : s === 'PARTIAL' ? 0.5 : s === 'NOT_DONE' ? 0 : null;

export type RiskFlag =
  | 'LOW_ATTENDANCE'
  | 'LOW_HOMEWORK'
  | 'LOW_SCORE'
  | 'FALLING'
  | 'MISSED_EXAMS';

export const RISK_RULES = {
  /** Ирц үүнээс доош (≥3 тэмдэглэгээтэй) */
  attendance: 75,
  /** Даалгавар үүнээс доош (≥3 тэмдэглэгээтэй) */
  homework: 50,
  /** Шалгалтын дундаж үүнээс доош */
  score: 40,
  /** Сүүлийн шалгалт өмнөхөөсөө ийм хувиар, эсвэл чадамж ийм оноогоор буурвал */
  fallExam: 10,
  fallCompetency: 8,
  missedExams: 2,
  minMarked: 3,
} as const;

export function riskFlags(input: {
  attendanceRate: number | null;
  attendanceMarked: number;
  homeworkRate: number | null;
  homeworkMarked: number;
  examAvg: number | null;
  /** Хуучнаас шинэ рүү */
  examTrend: number[];
  missedExams: number;
  competencyChange: number | null;
}): RiskFlag[] {
  const out: RiskFlag[] = [];
  if (
    input.attendanceRate !== null &&
    input.attendanceMarked >= RISK_RULES.minMarked &&
    input.attendanceRate < RISK_RULES.attendance
  )
    out.push('LOW_ATTENDANCE');
  if (
    input.homeworkRate !== null &&
    input.homeworkMarked >= RISK_RULES.minMarked &&
    input.homeworkRate < RISK_RULES.homework
  )
    out.push('LOW_HOMEWORK');
  if (input.examAvg !== null && input.examAvg < RISK_RULES.score)
    out.push('LOW_SCORE');
  const [prev, last] = input.examTrend.slice(-2);
  const examFall =
    input.examTrend.length >= 2 && last < prev - RISK_RULES.fallExam;
  const compFall =
    input.competencyChange !== null &&
    input.competencyChange <= -RISK_RULES.fallCompetency;
  if (examFall || compFall) out.push('FALLING');
  if (input.missedExams >= RISK_RULES.missedExams) out.push('MISSED_EXAMS');
  return out;
}

/** Онооны тархалт — 5 багана (0–19, 20–39, … 80–100). */
export function scoreBins(percents: number[]): number[] {
  const bins = [0, 0, 0, 0, 0];
  for (const p of percents) {
    if (!Number.isFinite(p)) continue;
    bins[Math.min(4, Math.max(0, Math.floor(p / 20)))] += 1;
  }
  return bins;
}

/**
 * Нөхөх хичээл: батлагдсан хичээлд ТАСАЛСАН (ABSENT) тоо. Нөхсөнийг бүртгэх
 * систем хараахан байхгүй тул энэ нь «нөхөх ёстой байж болох» дээд хязгаар.
 * Батлагдсан хичээл огт байхгүй бол null (тоо зохиохгүй).
 */
export function makeupOwed(
  lessons: { attendance: string | null }[],
): number | null {
  if (lessons.length === 0) return null;
  return lessons.filter((l) => l.attendance === 'ABSENT').length;
}

export type PaymentState = 'PAID' | 'PARTIAL' | 'PENDING' | 'NONE';

/**
 * Энэ сарын төлбөрийн төлөв. Жилийн төлбөрт (FULL_YEAR) энэ хичээлийн жилд
 * баталгаажсан төлбөр байвал PAID. Дүн мэдэгдэхгүй бол баталгаажсан ямар ч
 * төлбөрийг PAID гэж үзнэ.
 */
export function paymentState(input: {
  plan: string | null;
  tuitionAmount: number | null;
  confirmedThisMonth: number;
  confirmedThisYear: number;
  pendingThisMonth: number;
}): PaymentState {
  if (input.plan === 'FULL_YEAR' && input.confirmedThisYear > 0) return 'PAID';
  if (input.confirmedThisMonth > 0) {
    if (!input.tuitionAmount || input.confirmedThisMonth >= input.tuitionAmount)
      return 'PAID';
    return 'PARTIAL';
  }
  if (input.pendingThisMonth > 0) return 'PENDING';
  return 'NONE';
}

/** "2026-10" — Улаанбаатарын цагаар. */
export function monthKeyUB(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
    year: 'numeric',
    month: '2-digit',
  })
    .format(d)
    .slice(0, 7);
}

/** Хичээлийн жилийн эхлэх сар (9-р сар): "2026-09". */
export function schoolYearStartMonth(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return `${m >= 9 ? y : y - 1}-09`;
}

/** Сул сэдэв: хувь < 50 ба ≥2 оноо боломжтой, хамгийн сул 3. */
export function laggingTopics<
  T extends { name: string; percent: number; max: number },
>(topics: T[], limit = 3): { name: string; percent: number }[] {
  return topics
    .filter((t) => t.max >= 2 && t.percent < 50)
    .sort((a, b) => a.percent - b.percent)
    .slice(0, limit)
    .map((t) => ({ name: t.name, percent: t.percent }));
}
