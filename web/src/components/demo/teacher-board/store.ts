/**
 * Самбарын өгөгдлийн давхарга. Анхны төлөв бүгд `../world.ts`-ээс; багшийн
 * засвар (товшилт бүр) түүн дээр давхарлагдана.
 *
 * Бодит системд: товшилт бүр Attendance / DailyHomeworkMark мөрийг upsert хийнэ,
 * эрсдэлийн тэмдэг серверийн нэгтгэлээс (хадгалсны дараа шинэчлэгдэнэ). Энд
 * хадгалалтыг 300–600 мс-ийн хоцролттой дуурайлгана, юу ч үлдэхгүй.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ABSENCE_REASONS,
  HOMEWORK_REASONS,
  WEEKDAYS_FULL,
  addDays,
  addToTally,
  emptyTally,
  fromKey,
  homeworkRate,
  lessonDateKeys,
  lessonOn,
  mondayIndex,
  testResult,
  todayKey,
  type AttStatus,
  type Criteria,
  type DayRecord,
  type DemoClass,
  type DemoStudent,
  type DemoTest,
  type HwStatus,
  type RiskFlag,
  type Slot,
  type Submission,
  type TestResult,
} from "../world";
import { nowTime } from "./mock";

/* ───────── Засвар ───────── */

export type Patch = Partial<Pick<DayRecord, "att" | "lateRange" | "attNote" | "hw" | "hwNote">>;
/** Түлхүүр: `${dateKey}|${studentId}` */
export type Edits = Record<string, Patch>;
export type RecordOf = (dateKey: string, student: DemoStudent) => DayRecord;

export const editKey = (dateKey: string, studentId: string) => `${dateKey}|${studentId}`;

export const NOTE_MAX = 200;

const isReason = (text: string, list: readonly string[]) => list.includes(text.trim());

/** Ирц солигдоход хамааралгүй болсон утгыг цэвэрлэнэ (хоцролтын хугацаа, нэг товшилтын шалтгаан) */
export function attPatch(cur: DayRecord, v: AttStatus | null): Patch {
  const p: Patch = { att: v };
  if (v !== "late" && cur.lateRange) p.lateRange = null;
  if (v !== "absent" && v !== "excused" && isReason(cur.attNote, ABSENCE_REASONS)) p.attNote = "";
  return p;
}

/** Даалгавар солигдоход «хийгээгүй» шалтгааны чипээр бөглөсөн тайлбарыг цэвэрлэнэ (гараар бичсэнийг үлдээнэ) */
export function hwPatch(cur: DayRecord, v: HwStatus | null): Patch {
  const p: Patch = { hw: v };
  if (v !== "partial" && v !== "missing" && isReason(cur.hwNote, HOMEWORK_REASONS)) p.hwNote = "";
  return p;
}

/** Нээлттэй тайлбар хэрэгтэй төлөв (хоцорсон/тасалсан/чөлөөтэй, дутуу/хийгээгүй) */
export function needsDetail(rec: DayRecord): boolean {
  return rec.att === "late" || rec.att === "absent" || rec.att === "excused" || rec.hw === "partial" || rec.hw === "missing";
}

export function hasNote(rec: DayRecord): boolean {
  return rec.attNote.trim() !== "" || rec.hwNote.trim() !== "";
}

/* ───────── Эрсдэл: world.riskOf-тай яг ижил дүрэм, гэхдээ засварласан бүртгэл дээр ───────── */

/**
 * world.riskOf-ийн хуулбар — ганц ялгаа нь бүртгэлийг `recordOf`-оор (засвартай)
 * уншина. Засваргүй үед үр дүн world.riskOf-тай бүрэн тэнцүү.
 */
export function riskWith(
  cls: DemoClass,
  student: DemoStudent,
  criteria: Criteria,
  recordOf: RecordOf,
  upTo: string = todayKey(),
): RiskFlag[] {
  const from = addDays(upTo, -criteria.windowDays);
  const start = from < student.joinedOn ? student.joinedOn : from;
  const today = todayKey();
  const last = upTo < today ? upTo : today;
  const t = emptyTally();
  for (const k of lessonDateKeys(cls, start, last)) {
    const l = lessonOn(cls, k);
    if (!l || l.status === "upcoming") continue;
    t.lessons++;
    addToTally(t, recordOf(k, student));
  }
  const flags: RiskFlag[] = [];
  const attDen = t.present + t.late + t.absent;
  const att = attDen ? Math.round(((t.present + t.late) / attDen) * 100) : null;
  if (att !== null && att < criteria.minAttendance) flags.push({ kind: "attendance", label: `Ирц ${att}%` });
  if (t.absent >= criteria.maxAbsences) flags.push({ kind: "absences", label: `${t.absent} удаа тасалсан` });
  if (t.late >= criteria.maxLates) flags.push({ kind: "lates", label: `${t.late} удаа хоцорсон` });
  const hw = homeworkRate(t);
  if (hw !== null && hw < criteria.minHomework) flags.push({ kind: "homework", label: `Даалгавар ${hw}%` });
  let streak = 0;
  for (const k of lessonDateKeys(cls, start, upTo).reverse()) {
    // Урьдчилж тэмдэглэсэн ирээдүйн хичээлийг тоолохгүй (анхны өгөгдөлд тэнд тэмдэглэгээ байдаггүй)
    if (lessonOn(cls, k)?.status === "upcoming") continue;
    const rec = recordOf(k, student);
    if (rec.hw === null) continue;
    if (rec.hw === "missing") streak++;
    else break;
  }
  if (streak >= criteria.missingStreak) flags.push({ kind: "streak", label: `${streak} удаа дараалан хийгээгүй` });
  return flags;
}

const riskCache = new Map<string, RiskFlag[]>();

/**
 * riskWith-ийн кэштэй хувилбар: товшилт бүрт зөвхөн засвар нь өөрчлөгдсөн
 * сурагчийн эрсдэлийг дахин тооцно (`sig` = тухайн сурагчийн засварын гарын үсэг).
 */
export function riskCached(cls: DemoClass, student: DemoStudent, criteria: Criteria, recordOf: RecordOf, sig: string): RiskFlag[] {
  // Өнөөдрийн хичээлийн төлөв (эхлээгүй/явагдаж буй/дууссан) нэгтгэлд нөлөөлдөг тул түлхүүрт орно
  const today = todayKey();
  const k = `${today}|${lessonOn(cls, today)?.status ?? "-"}|${cls.id}|${student.id}|${JSON.stringify(criteria)}|${sig}`;
  const hit = riskCache.get(k);
  if (hit) return hit;
  if (riskCache.size > 4000) riskCache.clear();
  const flags = riskWith(cls, student, criteria, recordOf);
  riskCache.set(k, flags);
  return flags;
}

/** Сурагч бүрийн засварын гарын үсэг (засваргүй бол хоосон мөр) */
export function editSignatures(edits: Edits): Map<string, string> {
  const parts = new Map<string, string[]>();
  for (const [k, p] of Object.entries(edits)) {
    const sid = k.slice(k.indexOf("|") + 1);
    const list = parts.get(sid) ?? [];
    list.push(`${k}=${JSON.stringify(p)}`);
    parts.set(sid, list);
  }
  return new Map([...parts].map(([sid, list]) => [sid, list.sort().join(";")]));
}

/* ───────── Даалгаврын хугацаа ───────── */

/** Автомат: тухайн өдрийн хичээл эхлэхэд хаагдана. Өөрөө тавих: өмнөх өдөр эсвэл тэр өдрийн цаг */
export type DeadlineRule = { mode: "auto" } | { mode: "custom"; offset: -1 | 0; time: string };
export const AUTO_RULE: DeadlineRule = { mode: "auto" };
export const DEFAULT_DEADLINE = "21:00";

export interface DeadlineState {
  /** Тухайн өдрийн дүрэм (давуу) */
  byDay: Record<string, DeadlineRule>;
  /** «Байнга энэ цагт» — хичээлтэй өдөр бүр */
  recurring: DeadlineRule | null;
}

export const EMPTY_DEADLINES: DeadlineState = { byDay: {}, recurring: null };

/** Өдрийн дүрэм > байнгын дүрэм > автомат */
export function ruleFor(state: DeadlineState, dateKey: string): { rule: DeadlineRule; recurring: boolean } {
  const own = state.byDay[dateKey];
  if (own) return { rule: own, recurring: false };
  if (state.recurring) return { rule: state.recurring, recurring: true };
  return { rule: AUTO_RULE, recurring: false };
}

/** Хугацаа дуусах агшин «YYYY-MM-DDTHH:mm» (Submission.submittedAt-тай шууд харьцуулна) */
export function deadlineStamp(rule: DeadlineRule, dateKey: string, slot: Slot): string {
  return rule.mode === "auto" ? `${dateKey}T${slot.start}` : `${addDays(dateKey, rule.offset)}T${rule.time}`;
}

export function isLateSubmission(sub: Submission | null, stamp: string | null): boolean {
  return !!sub && !!stamp && sub.submittedAt > stamp;
}

/* ───────── Огноо, цагийн шошго ───────── */

/** «10-р сарын 17, Бямба» */
export function dayLabel(dateKey: string): string {
  const d = fromKey(dateKey);
  return `${d.getMonth() + 1}-р сарын ${d.getDate()}, ${WEEKDAYS_FULL[mondayIndex(d)]}`;
}

/** «10-р сарын 17» */
export function shortDay(dateKey: string): string {
  const d = fromKey(dateKey);
  return `${d.getMonth() + 1}-р сарын ${d.getDate()}`;
}

/** Хичээлийн өдөртэй харьцуулсан илгээсэн цаг: «Өмнөх өдөр 21:22», «Тэр өдөр 09:10» */
export function sentLabel(submittedAt: string, dateKey: string): string {
  const [d, t] = submittedAt.split("T");
  if (d === dateKey) return `Тэр өдөр ${t}`;
  if (d === addDays(dateKey, -1)) return `Өмнөх өдөр ${t}`;
  return `${shortDay(d)}, ${t}`;
}

/** Хугацааны богино шошго: «15:00 хүртэл», «Өмнөх өдөр 21:00» */
export function deadlineText(rule: DeadlineRule, slot: Slot): string {
  if (rule.mode === "auto") return `${slot.start} хүртэл`;
  return `${rule.offset === -1 ? "Өмнөх өдөр " : ""}${rule.time}`;
}

/** «Сайтад сүүлд орсон»: «Өнөөдөр 14:32», «Өчигдөр 22:10», «10-р сарын 12, 09:40» */
export function seenLabel(at: string | null, today: string): string {
  if (!at) return "Нэвтэрч үзээгүй";
  const [d, t] = at.split("T");
  if (d === today) return `Өнөөдөр ${t}`;
  if (d === addDays(today, -1)) return `Өчигдөр ${t}`;
  return `${shortDay(d)}, ${t}`;
}

/* ───────── Онлайн тестийн дүн ───────── */

const resultCache = new Map<string, TestResult | null>();

/** world.testResult — тогтмол (seed) тул кэшлэнэ */
export function resultOf(student: DemoStudent, test: DemoTest): TestResult | null {
  const k = `${student.id}|${test.id}`;
  if (!resultCache.has(k)) resultCache.set(k, testResult(student, test));
  return resultCache.get(k) ?? null;
}

export interface OnlineStats {
  solved: number;
  total: number;
  /** Бодсон сурагчдын зөв бодлогын дундаж (1 оронтой) */
  avgCorrect: number | null;
  problems: number;
  /** Хамгийн олон хүн алдсан (буруу эсвэл бодоогүй) 3 бодлого */
  mostMissed: Array<{ n: number; missed: number }>;
}

export function onlineStats(students: DemoStudent[], test: DemoTest): OnlineStats {
  const results = students.map((s) => resultOf(s, test)).filter((r): r is TestResult => r !== null);
  const missed = Array.from({ length: test.problems }, (_, i) => ({ n: i + 1, missed: 0 }));
  for (const r of results) for (const p of r.problems) if (p.state !== "correct") missed[p.n - 1].missed++;
  const mostMissed = [...missed]
    .filter((m) => m.missed > 0)
    .sort((a, b) => b.missed - a.missed || a.n - b.n)
    .slice(0, 3);
  const avg = results.length ? results.reduce((s, r) => s + r.correct, 0) / results.length : null;
  return {
    solved: results.length,
    total: students.length,
    avgCorrect: avg === null ? null : Math.round(avg * 10) / 10,
    problems: test.problems,
    mostMissed,
  };
}

/* ───────── Хадгалалтын дуурайлга ───────── */

export interface SaveApi {
  /** Хүлээгдэж буй нүдний тоо */
  pending: number;
  /** Сүүлд бүрэн хадгалагдсан цаг «17:42» */
  savedAt: string | null;
  /** Товшилт: нүд бүр 300–600 мс-д хадгалагдана */
  send: (cells?: number) => void;
  /** Бичвэр: бичиж зогссоноос 600 мс-ийн дараа илгээнэ */
  sendLater: (key: string) => void;
}

const latency = () => 300 + Math.round(Math.random() * 300);

export function useAutosave(): SaveApi {
  const pendingRef = useRef(0);
  const [state, setState] = useState<{ pending: number; savedAt: string | null }>({ pending: 0, savedAt: null });
  const timers = useRef(new Set<number>());
  const typing = useRef(new Map<string, number>());

  useEffect(() => {
    const t = timers.current;
    const d = typing.current;
    return () => {
      t.forEach((id) => window.clearTimeout(id));
      d.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const finishOne = useCallback(() => {
    pendingRef.current = Math.max(0, pendingRef.current - 1);
    const p = pendingRef.current;
    setState((s) => ({ pending: p, savedAt: p === 0 ? nowTime() : s.savedAt }));
  }, []);

  const later = useCallback(
    (ms: number) => {
      const id = window.setTimeout(() => {
        timers.current.delete(id);
        finishOne();
      }, ms);
      timers.current.add(id);
    },
    [finishOne],
  );

  const send = useCallback(
    (cells = 1) => {
      if (cells <= 0) return;
      pendingRef.current += cells;
      const p = pendingRef.current;
      setState((s) => ({ ...s, pending: p }));
      for (let i = 0; i < cells; i++) later(latency());
    },
    [later],
  );

  const sendLater = useCallback(
    (key: string) => {
      const prev = typing.current.get(key);
      if (prev !== undefined) window.clearTimeout(prev);
      else {
        pendingRef.current += 1;
        const p = pendingRef.current;
        setState((s) => ({ ...s, pending: p }));
      }
      const id = window.setTimeout(() => {
        typing.current.delete(key);
        later(latency());
      }, 600);
      typing.current.set(key, id);
    },
    [later],
  );

  return { ...state, send, sendLater };
}

/* ───────── Сонгосон таб: нөхцөл тус бүрээр санана ───────── */

export type Tab = "monitor" | "mark";
const TAB_STORE = "pi_demo_board_tab";

/**
 * Ухаалаг өгөгдмөл: өнөөдөр хичээл яг явагдаж байвал «Тэмдэглэх», бусад үед «Хяналт».
 * Багш өөрөө таб сольвол тэр сонголтыг ТЭР нөхцөлд (хичээлийн үеэр / бусад үед)
 * санана — хичээлийн дараа санасан «Хяналт» нь дараагийн хичээлийн үеийн
 * «Тэмдэглэх»-ийг дарахгүй.
 */
export function initialTab(lessonNow: boolean): Tab {
  try {
    const raw = window.localStorage.getItem(TAB_STORE);
    const v = raw ? (JSON.parse(raw) as Record<string, unknown>)[lessonNow ? "now" : "other"] : null;
    if (v === "monitor" || v === "mark") return v;
  } catch {
    // Хувийн цонх, хаалттай хадгалалт — өгөгдмөлөөр
  }
  return lessonNow ? "mark" : "monitor";
}

export function rememberTab(lessonNow: boolean, tab: Tab): void {
  try {
    const raw = window.localStorage.getItem(TAB_STORE);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    obj[lessonNow ? "now" : "other"] = tab;
    window.localStorage.setItem(TAB_STORE, JSON.stringify(obj));
  } catch {
    // Хадгалж чадахгүй бол зүгээр л санахгүй
  }
}
