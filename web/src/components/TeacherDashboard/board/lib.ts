/**
 * Ирц ба даалгаврын самбар (эзэн 2026-10-18) — өгөгдлийн төрөл, огноо, шошго.
 * API: api/src/attendance (самбар, шалгуур), api/src/assignments/homework-marks* (онлайн дүн).
 */
import type { AttendanceStatus, HomeworkStatus } from "@/components/attendance/marks";
import type { LateRangeValue } from "@/components/attendance/LateRangePicker";
import { NOTE_SUGGESTIONS } from "@/components/attendance/NoteAutocomplete";

export type { AttendanceStatus, HomeworkStatus, LateRangeValue };

/* ───────── API хэлбэр ───────── */

export interface BoardLesson {
  scheduleId: string;
  startMinute: number;
  endMinute: number;
  room: string | null;
  topic: string | null;
  teacherName: string | null;
  leadTeacher: string | null;
  assistantTeacher: string | null;
}

export interface DayClass {
  id: string;
  name: string;
  type: string;
  grade: number | null;
  studentCount: number;
  lessons: BoardLesson[];
}

export interface BoardStudent {
  id: string;
  firstName: string;
  lastName: string;
  code: string | null;
  joinedAt: string;
}

export interface AttRow {
  studentId: string;
  status: AttendanceStatus;
  note: string | null;
  lateRange: LateRangeValue | null;
  markedBy: string | null;
}

export interface HwRow {
  studentId: string;
  status: HomeworkStatus | null;
  comment: string | null;
  markedBy: string | null;
  updatedAt?: string | null;
}

export interface RiskFlag {
  kind: string;
  label: string;
}

export interface Criteria {
  windowDays: number;
  minAttendance: number;
  maxAbsences: number;
  maxLates: number;
  minHomework: number;
  missingStreak: number;
}

export const DEFAULT_CRITERIA: Criteria = {
  windowDays: 30,
  minAttendance: 80,
  maxAbsences: 3,
  maxLates: 4,
  minHomework: 60,
  missingStreak: 2,
};

/** Хэн ирц авсан / даалгавар шалгасан (эзэн 2026-10-22): багш тус бүрийн сүүлийн цаг */
export interface Recorder {
  id: string;
  /** «Б. Нэр» */
  name: string;
  /** ISO; мэдэгдэхгүй бол null */
  at: string | null;
  count: number;
}
export interface RecordedBy {
  attendance: Recorder[];
  homework: Recorder[];
}

export interface MarksPayload {
  date: string;
  attendance: AttRow[];
  homework: HwRow[];
  criteria: Criteria;
  risk: Record<string, RiskFlag[]>;
  /** «Илгээсэн»: тухайн хичээлийн даалгаврыг илгээсэн сурагчид (Assignment/Submission) */
  sent?: { assignmentIds: string[]; students: string[] };
  recordedBy?: RecordedBy;
}

export interface BoardPayload extends MarksPayload {
  today: string;
  classroom: { id: string; name: string; type: string; grade: number | null };
  holiday: string | null;
  lessons: BoardLesson[];
  students: BoardStudent[];
  canEditCriteria: boolean;
}

export interface OnlinePayload {
  date: string;
  previousLessonDate: string | null;
  tests: { testId: string; title: string; variant: string | null; problems: number; fromTestId: string }[];
  students: Record<string, { score: number; max: number; testId: string; taken: number }>;
}

export type MakeupStatus = "PENDING" | "PARTIAL" | "DONE" | "WAIVED";
export interface MakeupRow {
  studentId: string;
  status: MakeupStatus;
}

export interface LessonNote {
  scheduleId: string;
  body: string;
  updatedByName: string;
  updatedAt: string;
}

/* ───────── Нэг сурагчийн тэр өдрийн бүртгэл ───────── */

export interface DayRec {
  att: AttendanceStatus | null;
  lateRange: LateRangeValue | null;
  attNote: string;
  hw: HomeworkStatus | null;
  hwNote: string;
  attBy: string | null;
  hwBy: string | null;
}

export const EMPTY_REC: DayRec = { att: null, lateRange: null, attNote: "", hw: null, hwNote: "", attBy: null, hwBy: null };

/* ───────── Төлөв бүрийн тоо (эзэн 2026-10-22: Ирсэн ба Хоцорсон ТУСДАА) ───────── */

/** = api/src/attendance/board-logic.ts StatusCounts */
export interface StatusCounts {
  attendance: Record<AttendanceStatus, number> & { unmarked: number };
  homework: Record<HomeworkStatus, number> & { unmarked: number };
}

export function emptyCounts(): StatusCounts {
  return {
    attendance: { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, unmarked: 0 },
    homework: { DONE: 0, PARTIAL: 0, NOT_DONE: 0, unmarked: 0 },
  };
}

/** Тухайн өдрийн самбарын тоо: сурагч бүрийн одоогийн (хадгалагдаж буйг оруулаад) төлөв */
export function dayCounts(ids: string[], recs: Map<string, DayRec>): StatusCounts {
  const out = emptyCounts();
  for (const id of ids) {
    const r = recs.get(id);
    if (r?.att) out.attendance[r.att]++;
    else out.attendance.unmarked++;
    if (r?.hw) out.homework[r.hw]++;
    else out.homework.unmarked++;
  }
  return out;
}

/* ───────── Шошго ───────── */

export const LATE_RANGES: LateRangeValue[] = ["FIVE_TO_TEN", "TEN_TO_THIRTY", "THIRTY_TO_SIXTY", "OVER_ONE_HOUR"];
/** = components/attendance/LateRangePicker LATE_RANGE_OPTIONS */
export const LATE_RANGE_LABEL: Record<LateRangeValue, string> = {
  FIVE_TO_TEN: "5–10 минут",
  TEN_TO_THIRTY: "10–30 минут",
  THIRTY_TO_SIXTY: "30 минут – 1 цаг",
  OVER_ONE_HOUR: "1 цагаас дээш",
};
export const LATE_RANGE_SHORT: Record<LateRangeValue, string> = {
  FIVE_TO_TEN: "5–10 мин",
  TEN_TO_THIRTY: "10–30 мин",
  THIRTY_TO_SIXTY: "30–60 мин",
  OVER_ONE_HOUR: "1 ц+",
};
// Тасалсан: «өвчтэй» болон өвчний ямар ч сонголт ХОРИОТОЙ (эзний шийдвэр)
export const ABSENCE_REASONS: readonly string[] = NOTE_SUGGESTIONS.filter((s) => !s.includes("өвч"));
export const EXCUSED_REASONS: readonly string[] = ["өөр давтлагатай", ...ABSENCE_REASONS];
export const HOMEWORK_REASONS: readonly string[] = ["ойлгоогүй", "дутуу хийсэн", "өмнөх хичээлдээ суугаагүй"];
export const NOTE_MAX = 200;

export const MAKEUP_LABEL: Record<MakeupStatus, string> = {
  PENDING: "Нөхөөгүй",
  PARTIAL: "Хагас нөхсөн",
  DONE: "Нөхсөн",
  WAIVED: "Чөлөөлсөн",
};

/* ───────── Огноо (Улаанбаатарын цагаар) ───────── */

export const WEEKDAYS_SHORT = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
export const WEEKDAYS_FULL = ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба", "Ням"];

const pad = (n: number) => String(n).padStart(2, "0");

export function ubTodayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date());
}

/** Одоогийн УБ цагийг шөнө дундаас хойшхи минутаар */
export function ubNowMinute(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** 0 = Даваа … 6 = Ням */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}
export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fromKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(k: string, n: number): string {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}
export function monthLabel(y: number, m: number): string {
  return `${y} оны ${m + 1}-р сар`;
}
export function daysOfMonth(y: number, m: number): Date[] {
  const n = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => new Date(y, m, i + 1));
}
/** «10-р сарын 17, Бямба» */
export function dayLabel(k: string): string {
  const d = fromKey(k);
  return `${d.getMonth() + 1}-р сарын ${d.getDate()}, ${WEEKDAYS_FULL[mondayIndex(d)]}`;
}
/** «10-р сарын 17» */
export function shortDay(k: string): string {
  const d = fromKey(k);
  return `${d.getMonth() + 1}-р сарын ${d.getDate()}`;
}
export function fullDate(k: string): string {
  const d = fromKey(k);
  return `${d.getFullYear()} оны ${d.getMonth() + 1}-р сарын ${d.getDate()}`;
}
/** 600 → «10:00» */
export function hm(minute: number): string {
  return `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}`;
}
/** ISO → УБ-ын «YYYY-MM-DD» ба «HH:mm» */
export function ubParts(iso: string): { key: string; time: string } {
  const d = new Date(iso);
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return { key, time };
}
/** «Өнөөдөр 14:32», «Өчигдөр 22:10», «10-р сарын 12, 09:40» */
export function whenLabel(iso: string | null, today: string, never = "Нэвтэрч үзээгүй"): string {
  if (!iso) return never;
  const { key, time } = ubParts(iso);
  if (key === today) return `Өнөөдөр ${time}`;
  if (key === addDays(today, -1)) return `Өчигдөр ${time}`;
  return `${shortDay(key)}, ${time}`;
}
/** Тэмдэглэлийн блокийн цаг: «Өнөөдөр 14:32», «10-р сарын 12, 09:40», өөр он бол «2025 оны 3-р сарын 2, 09:40» */
export function stampLabel(iso: string, today: string): string {
  const { key, time } = ubParts(iso);
  if (key.slice(0, 4) !== today.slice(0, 4)) return `${fullDate(key)}, ${time}`;
  return whenLabel(iso, today);
}

/** Самбарын өдрийн «хэн тэмдэглэсэн» цаг: тэр өдөр бол «15:32», бусад үед «10-р сарын 23, 09:10» */
export function recordedAtLabel(iso: string, date: string): string {
  const { key, time } = ubParts(iso);
  return key === date ? time : `${shortDay(key)}, ${time}`;
}

/** «2026-10» → «2026 оны 10-р сар» */
export function monthKeyLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return monthLabel(y, m - 1);
}
/** «2026-10» ± n сар */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** «8797 4469» */
export function fmtPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 4)} ${d.slice(4)}` : p;
}

/* ───────── Сонгосон таб: нөхцөл тус бүрээр санана ───────── */

export type Tab = "monitor" | "mark";
const TAB_STORE = "pi_board_tab";

/** Өнөөдөр хичээл яг явагдаж байвал «Тэмдэглэх», бусад үед «Хяналт»; багшийн сонголтыг тэр нөхцөлд санана */
export function initialTab(lessonNow: boolean): Tab {
  try {
    const raw = window.localStorage.getItem(TAB_STORE);
    const v = raw ? (JSON.parse(raw) as Record<string, unknown>)[lessonNow ? "now" : "other"] : null;
    if (v === "monitor" || v === "mark") return v;
  } catch {
    // хувийн цонх, хаалттай хадгалалт — өгөгдмөлөөр
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
    // хадгалж чадахгүй бол зүгээр л санахгүй
  }
}

export function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeStore(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // алгасна
  }
}

/** Тайлбар нь шалтгааны жагсаалтын нэг утга яг байгаа эсэх (төлөв солигдоход цэвэрлэнэ) */
export const isReason = (text: string, list: readonly string[]) => list.includes(text.trim());

export function needsDetail(rec: DayRec, homework: boolean): boolean {
  return (
    rec.att === "LATE" ||
    rec.att === "ABSENT" ||
    rec.att === "EXCUSED" ||
    (homework && (rec.hw === "PARTIAL" || rec.hw === "NOT_DONE"))
  );
}
export function hasNote(rec: DayRec): boolean {
  return rec.attNote.trim() !== "" || rec.hwNote.trim() !== "";
}
