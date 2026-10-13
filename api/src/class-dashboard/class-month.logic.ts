/**
 * «Ангиуд» — сарын харагдац (эзэн 2026-10-13): ирц/даалгаврын сурагч × хичээлийн
 * өдрийн тор, шалгалт, бие даасан ажил, сурагч бүр ангийн дундажтай.
 * Цэвэр тооцоо (I/O-гүй) — class-month.spec.ts.
 *
 * Огноо бүр «YYYY-MM-DD» УБ-ын өдөр. Хуваарийн гараг JS (0=Ням…6=Бямба),
 * эзний дугаарлалт биш (STATUS §3.11).
 */
import { mean } from '../exams/exam-analytics';
import { monthRange, weekStartsOfMonth } from '../schedule/teacher-hours';
import { resolveWeek } from '../schedule/week-resolver';
import {
  attendancePercent,
  homeworkPercent,
  scoreBins,
  type AttendanceStatus,
  type HomeworkStatus,
} from './class-dashboard.logic';

const DAY = 86_400_000;
const UB_OFFSET = 8 * 3_600_000;

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Сарын эхний/сүүлийн өдөр ба УБ-ын цагаар [эхлэл, дараа сарын эхлэл) UTC мөч. */
export function monthWindow(month: string) {
  const { first, days } = monthRange(month);
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1, days)).toISOString().slice(0, 10);
  return {
    first,
    last,
    days,
    fromUtc: new Date(Date.UTC(y, m - 1, 1) - UB_OFFSET),
    toUtc: new Date(Date.UTC(y, m, 1) - UB_OFFSET),
  };
}

/** UTC мөчийг УБ-ын өдөр болгоно (Монгол 2017-оос хойш зуны цаггүй, +08). */
export function ubDay(d: Date): string {
  return new Date(d.getTime() + UB_OFFSET).toISOString().slice(0, 10);
}

export function daysOfMonth(month: string): string[] {
  const { first, days } = monthRange(month);
  const base = Date.parse(`${first}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, i) =>
    new Date(base + i * DAY).toISOString().slice(0, 10),
  );
}

/** Сард огтлолцох Даваа–Ням 7 хоногууд (сараар хязгаарласан). */
export function monthWeeks(month: string): { start: string; end: string }[] {
  const days = daysOfMonth(month);
  const out: { start: string; end: string }[] = [];
  for (const d of days) {
    const dow = (new Date(`${d}T00:00:00.000Z`).getUTCDay() + 6) % 7; // Даваа = 0
    if (out.length === 0 || dow === 0) out.push({ start: d, end: d });
    else out[out.length - 1].end = d;
  }
  return out;
}

export type LessonDay = {
  date: string;
  weekday: number;
  /** Хуваарьт хичээлтэй өдөр (false = зөвхөн тэмдэглэгээ байгаа эсвэл амралт) */
  scheduled: boolean;
  /** Хичээл байх ёстой байсан ч амралт/онцгой өдөр */
  holiday: string | null;
  /** Батлагдсан хичээл (LessonRecord) */
  confirmed: boolean;
};

type ResolveInput = Omit<Parameters<typeof resolveWeek>[0], 'weekStart'>;

/**
 * Ангийн бодит хичээлийн өдрүүд: хуваарийг сарын 7 хоног бүрээр resolveWeek-ээр
 * задлана (цуцалсан хасагдана, зөөсөн шинэ өдөртөө). Бүх ангийн амралт ба зөвхөн
 * энэ ангид хамаарах онцгой өдөр нь `holiday`-тай. Тэмдэглэгээ байгаа ч
 * хуваарьгүй өдрийг (`markedDays`) нууж болохгүй — `scheduled:false`-аар нэмнэ.
 */
export function lessonDaysOf(
  month: string,
  classroomId: string,
  input: ResolveInput,
  markedDays: Iterable<string>,
  confirmedDays: Iterable<string> = [],
): LessonDay[] {
  const prefix = `${month}-`;
  const byDate = new Map<string, LessonDay>();
  const confirmed = new Set(confirmedDays);
  for (const weekStart of weekStartsOfMonth(month)) {
    for (const day of resolveWeek({ ...input, weekStart })) {
      if (!day.date.startsWith(prefix) || byDate.has(day.date)) continue;
      const has = day.entries.some((e) => e.classroomId === classroomId);
      const resting = day.restingClasses.find((r) => r.classroomId === classroomId);
      if (has && !day.isHoliday)
        byDate.set(day.date, {
          date: day.date,
          weekday: day.weekday,
          scheduled: true,
          holiday: null,
          confirmed: confirmed.has(day.date),
        });
      else if ((has && day.isHoliday) || resting)
        byDate.set(day.date, {
          date: day.date,
          weekday: day.weekday,
          scheduled: false,
          holiday: day.holiday?.title ?? resting?.title ?? 'Амралт',
          confirmed: false,
        });
    }
  }
  for (const d of [...markedDays, ...confirmed]) {
    if (!d.startsWith(prefix)) continue;
    const cur = byDate.get(d);
    if (cur) {
      // Амралтын өдөр тэмдэглэгээ хийсэн бол баганыг энгийн болгоно
      if (cur.holiday) byDate.set(d, { ...cur, holiday: null, confirmed: confirmed.has(d) });
      continue;
    }
    byDate.set(d, {
      date: d,
      weekday: new Date(`${d}T00:00:00.000Z`).getUTCDay(),
      scheduled: false,
      holiday: null,
      confirmed: confirmed.has(d),
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Тоотой утгуудын дундаж (бүхэлчилсэн), утгагүй бол null. */
export function avgOf(values: (number | null | undefined)[]): number | null {
  const xs = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const m = mean(xs);
  return m === null ? null : Math.round(m);
}

export interface IndependentDay {
  problems: number;
  correct: number;
  judged: number;
  tests: number;
}

export interface StudentMonthStats {
  attendance: {
    rate: number | null;
    present: number;
    late: number;
    absent: number;
    excused: number;
  };
  homework: {
    rate: number | null;
    done: number;
    partial: number;
    notDone: number;
  };
  exam: { avg: number | null; taken: number; missed: number };
  independent: {
    problems: number;
    accuracy: number | null;
    activeDays: number;
    tests: number;
    testAvg: number | null;
  };
}

export function studentMonthStats(input: {
  attendance: Record<string, AttendanceStatus>;
  homework: Record<string, HomeworkStatus>;
  /** Сарын шалгалт бүрийн хувь (null = дүнгүй) ба ирээгүй эсэх */
  exams: { percent: number | null; absent: boolean }[];
  independent: Record<string, IndependentDay>;
  testPercents: number[];
}): StudentMonthStats {
  const att = Object.values(input.attendance);
  const a = attendancePercent(att);
  const hw = Object.values(input.homework);
  const h = homeworkPercent(hw);
  const examPercents = input.exams
    .map((e) => e.percent)
    .filter((p): p is number => p !== null);
  const ind = Object.values(input.independent);
  const problems = ind.reduce((s, d) => s + d.problems, 0);
  const correct = ind.reduce((s, d) => s + d.correct, 0);
  const judged = ind.reduce((s, d) => s + d.judged, 0);
  return {
    attendance: {
      rate: a.rate,
      present: att.filter((s) => s === 'PRESENT').length,
      late: att.filter((s) => s === 'LATE').length,
      absent: a.absent,
      excused: att.filter((s) => s === 'EXCUSED').length,
    },
    homework: {
      rate: h.rate,
      done: hw.filter((s) => s === 'DONE').length,
      partial: hw.filter((s) => s === 'PARTIAL').length,
      notDone: hw.filter((s) => s === 'NOT_DONE').length,
    },
    exam: {
      avg: avgOf(examPercents),
      taken: examPercents.length,
      missed: input.exams.filter((e) => e.percent === null && e.absent).length,
    },
    independent: {
      problems,
      accuracy: judged ? Math.round((correct / judged) * 100) : null,
      activeDays: ind.filter((d) => d.problems + d.tests > 0).length,
      tests: ind.reduce((s, d) => s + d.tests, 0),
      testAvg: avgOf(input.testPercents),
    },
  };
}

/**
 * Ангийн дундаж — сурагч бүрийн утгын дундаж (өгөгдөлтэй сурагчдаар). Бие
 * даасан бодлогын тоо нь бүх сурагчаар (0 ч тоологдоно) — «ангийнхан дунджаар
 * хэдийг бодсон бэ».
 */
export function classMonthStats(rows: StudentMonthStats[]) {
  // Тоо ширхэгийн дундаж бага байхад (0.2 бодлого) бүхэлчилбэл 0 болж
  // худал харагдана — нэг оронтой бутархайгаар
  const avg1 = (xs: number[]) => {
    const m = mean(xs);
    return m === null ? null : Math.round(m * 10) / 10;
  };
  return {
    attendance: avgOf(rows.map((r) => r.attendance.rate)),
    homework: avgOf(rows.map((r) => r.homework.rate)),
    exam: avgOf(rows.map((r) => r.exam.avg)),
    problems: avg1(rows.map((r) => r.independent.problems)),
    accuracy: avgOf(rows.map((r) => r.independent.accuracy)),
    activeDays: avg1(rows.map((r) => r.independent.activeDays)),
    tests: avg1(rows.map((r) => r.independent.tests)),
  };
}

/** Сарын шалгалтын нэгтгэл (дүнгүй/ирээгүйг тусад нь) */
export function monthExamSummary(
  rosterIds: string[],
  percentBy: Map<string, number>,
  absentIds: Set<string>,
) {
  const results: Record<string, number> = {};
  const percents: number[] = [];
  for (const id of rosterIds) {
    const p = percentBy.get(id);
    if (p === undefined) continue;
    results[id] = p;
    percents.push(p);
  }
  const absent = rosterIds.filter((id) => absentIds.has(id) && !(id in results));
  return {
    students: rosterIds.length,
    taken: percents.length,
    absent: absent.length,
    absentIds: absent,
    avg: avgOf(percents),
    bins: scoreBins(percents),
    results,
  };
}
