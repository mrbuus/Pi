// Хичээлийн хуваарь + сургалтын хуанлийн UI-д хамтдаа ашиглах төрөл, монгол
// орчуулга, туслах функцууд. API-тай нэг эх сурвалж — бэкенд ClassSchedule.weekday
// коммент харна уу: 0=Ням, 1=Даваа … 6=Бямба (JS Date.getDay()-тэй ижил).

import {
  Ban,
  FileText,
  Palmtree,
  Leaf,
  Star,
  type LucideIcon,
} from "lucide-react";

export const WEEKDAY_LABELS = [
  "Ням",
  "Даваа",
  "Мягмар",
  "Лхагва",
  "Пүрэв",
  "Баасан",
  "Бямба",
] as const;

export const WEEKDAY_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"] as const;

export const SUBJECT_LABEL: Record<string, string> = {
  MATH: "Математик",
  SOCIAL_STUDIES: "Нийгмийн ухаан",
};

export const CALENDAR_TYPE_LABEL: Record<string, string> = {
  HOLIDAY: "Амралтын өдөр",
  BREAK: "Завсарлага",
  EXAM_DAY: "Шалгалтын өдөр",
  SPECIAL: "Тусгай өдөр",
  NO_CLASS: "Хичээлгүй өдөр",
};

// Өнгө дангаараа утга агуулахгүй байх зорилгоор төрөл бүрт ялгаатай дүрс
export const CALENDAR_TYPE_ICON: Record<string, LucideIcon> = {
  HOLIDAY: Palmtree,
  BREAK: Leaf,
  EXAM_DAY: FileText,
  SPECIAL: Star,
  NO_CLASS: Ban,
};

export const CALENDAR_TYPES = [
  "HOLIDAY",
  "BREAK",
  "EXAM_DAY",
  "SPECIAL",
  "NO_CLASS",
] as const;

/** 540 → "09:00" */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "09:00" → 540 — <input type="time"> утгыг минут руу хөрвүүлнэ */
export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map((n) => Number.parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

/** УБ-ын өнөөдрийн огноо "YYYY-MM-DD" — /schedule/days-ийн эхлэл огноо
 * тооцоход хэрэглэгчийн browser timezone-оос үл хамааран зөв байхын тулд
 * (жишээ нь UTC 16:00-24:00 үед browser-ийн UTC огноо УБ-аас нэг өдрөөр
 * хоцордог тул шууд `new Date().toISOString()` ашиглаж болохгүй). */
export function todayUBKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date());
}

/** "YYYY-MM-DD" огноонд N хоног нэмнэ (UTC огноо-логикоор, цагийн бүсийн
 * асуудалгүй) */
export function addDaysToKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface ClassroomLite {
  id: string;
  name: string;
  type?: string;
  grade?: number | null;
  teacher?: { id: string; firstName: string; lastName: string } | null;
}

export interface TeacherLite {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ScheduleEntry {
  id: string;
  classroomId: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  teacherId: string | null;
  room: string | null;
  subject: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  classroom: { id: string; name: string };
  teacher: TeacherLite | null;
}

export interface ScheduleMeResponse {
  classroomId?: string | null;
  entries: ScheduleEntry[];
}

export interface DayClass {
  id: string;
  classroomId: string;
  classroomName: string;
  startMinute: number;
  endMinute: number;
  teacherId: string | null;
  teacherName: string | null;
  room: string | null;
  subject: string | null;
}

export interface DayExpansion {
  date: string;
  weekday: number;
  holiday: { type: string; title: string; note: string | null } | null;
  classes: DayClass[];
}

export interface CalendarDay {
  id: string;
  date: string;
  type: string;
  title: string;
  note: string | null;
  createdById: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Staff builder (GET /schedule/week, POST /schedule/bulk, exceptions, topics,
// teacher work days) — Хичээлийн хуваарь + Багшийн ажлын өдрийн менежер.
// ---------------------------------------------------------------------------

export interface ResolvedEntryException {
  kind: "MOVED";
  note: string | null;
  /** Энэ тохиолдлын АНХНЫ (давтагддаг хэв маягийн) огноо — exception upsert
   * хийхэд энэ огноог ашиглана (upsert scheduleId+date-ээр unique). */
  originalDate: string;
}

export interface WeekEntry {
  scheduleId: string;
  classroomId: string;
  classroomName: string;
  teacherId: string | null;
  teacherName: string | null;
  startMinute: number;
  endMinute: number;
  room: string | null;
  subject: string | null;
  topic: string | null;
  exception: ResolvedEntryException | null;
}

export interface WeekDay {
  date: string;
  weekday: number;
  isHoliday: boolean;
  entries: WeekEntry[];
}

export interface TeacherRosterDay {
  date: string;
  weekday: number;
  teachers: { id: string; name: string }[];
}

export interface WeekResponse {
  start: string;
  days: WeekDay[];
  teacherRoster: TeacherRosterDay[];
}

export interface TeacherWorkDayRow {
  id: string;
  teacherId: string;
  weekday: number;
  note: string | null;
  teacher: TeacherLite;
}

export interface TeacherWorkExceptionRow {
  id: string;
  teacherId: string;
  date: string;
  working: boolean;
  note: string | null;
  teacher: TeacherLite;
}

export interface TeacherWorkDaysResponse {
  workDays: TeacherWorkDayRow[];
  exceptions: TeacherWorkExceptionRow[];
}

export interface BookLite {
  id: string;
  code: string;
  title: string;
  subject: string;
}

export interface ChapterLite {
  id: string;
  title: string;
  order: number;
  grade?: number | null;
}

// Ажлын долоо хоногийг ХАРУУЛАХ дараалал: Даваа → Ням (API-ийн weekday нь
// 0=Ням based тул зөвхөн харуулах эрэмбийг л энд зохицуулна).
export const WORKWEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/**
 * Хичээл ЯГ ЭДГЭЭР танхимуудад л явагдана (эзний өгсөн жагсаалт, 2026-07-31).
 *
 * Чөлөөт текст биш, тогтмол жагсаалт болгосон шалтгаан: "403" / "403 тоот" /
 * "4-03" гэж янз бүрээр бичигдвэл танхимаар шүүх, давхцал хайх боломжгүй
 * болно. Шинэ танхим нэмэгдвэл ЗӨВХӨН энэ жагсаалтыг засна.
 *
 * `shape` — танхим бүрийн ХААЛГАН ДЭЭРХ бодит дүрс (эзний тэмдэглэгээ).
 * Дугаараас илүү хурдан танигддаг тул UI дээр дугаарын хамт үргэлж дүрсийг
 * харуулна (schedule/RoomShape.tsx).
 *
 * Эрэмбэ нь UI-д харагдах эрэмбэ мөн: 405 нь хамгийн жижиг танхим тул
 * Баруун 4-ийн жагсаалтын СҮҮЛД байрлана (эзний шийдвэр).
 */
export type RoomShapeKind =
  | "circle"
  | "triangle"
  | "trapezoid"
  | "square"
  | "rect"
  | "pentagon"
  | "diamond"
  | "online";

export const ROOMS: readonly {
  value: string;
  branch: string;
  shape: RoomShapeKind | null;
}[] = [
  { value: "501", branch: "Баруун 4", shape: "circle" },
  { value: "502", branch: "Баруун 4", shape: "triangle" },
  { value: "503", branch: "Баруун 4", shape: "trapezoid" },
  { value: "504", branch: "Баруун 4", shape: "square" },
  { value: "403", branch: "Баруун 4", shape: "diamond" },
  { value: "404", branch: "Баруун 4", shape: "pentagon" },
  { value: "405", branch: "Баруун 4", shape: "rect" },
  { value: "301", branch: "Зүүн 4", shape: null },
  { value: "302", branch: "Зүүн 4", shape: null },
  { value: "Онлайн", branch: "Зайнаас", shape: "online" },
] as const;

/** Танхимын дүрсийг олох — жагсаалтад байхгүй танхимд null */
export function roomShapeOf(room: string | null | undefined): RoomShapeKind | null {
  if (!room) return null;
  return ROOMS.find((r) => r.value === room)?.shape ?? null;
}

/**
 * Танхимын ТОГТМОЛ эрэмбэ (501,502,503,504,403,404,405 дараа нь 301,302 —
 * эзний заасан дараалал). Хуваарийн жагсаалт бүр энэ эрэмбээр гарна:
 * танхим байр сольж хөдөлдөггүй учир нүд дасаад шууд олдог болно.
 */
export function roomOrderOf(room: string | null | undefined): number {
  if (!room) return ROOMS.length + 1;
  const i = ROOMS.findIndex((r) => r.value === room);
  return i === -1 ? ROOMS.length : i;
}

export interface WeekdayPreset {
  label: string;
  hint: string;
  weekdays: number[];
}

// Эзэмшигчийн тодорхойлсон давтамжийн бэлэн загварууд: 12-р ангийн бүлгүүд
// 1,3,5,6 эсвэл 2,4,6,7 (Монгол тоолол: 1=Даваа…7=Ням), 9-11-р ангийн
// бүлгүүд 1,3,5 эсвэл 2,4,6 өдрүүдэд явагдана. Тэдгээрийг JS weekday
// (0=Ням…6=Бямба) руу шууд хөрвүүлсэн утгыг доор бэлдсэн.
export const WEEKDAY_PRESETS: WeekdayPreset[] = [
  { label: "1,3,5,6", hint: "Даваа, Лхагва, Баасан, Бямба", weekdays: [1, 3, 5, 6] },
  { label: "2,4,6,7", hint: "Мягмар, Пүрэв, Бямба, Ням", weekdays: [2, 4, 6, 0] },
  { label: "1,3,5", hint: "Даваа, Лхагва, Баасан", weekdays: [1, 3, 5] },
  { label: "2,4,6", hint: "Мягмар, Пүрэв, Бямба", weekdays: [2, 4, 6] },
];
