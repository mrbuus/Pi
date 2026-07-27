// Хичээлийн хуваарь + сургалтын хуанлийн UI-д хамтдаа ашиглах төрөл, монгол
// орчуулга, туслах функцууд. API-тай нэг эх сурвалж — бэкенд ClassSchedule.weekday
// коммент харна уу: 0=Ням, 1=Даваа … 6=Бямба (JS Date.getDay()-тэй ижил).

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

// Өнгө дангаараа утга агуулахгүй байх зорилгоор төрөл бүрт ялгаатай тэмдэг
export const CALENDAR_TYPE_ICON: Record<string, string> = {
  HOLIDAY: "🏖️",
  BREAK: "🍃",
  EXAM_DAY: "📝",
  SPECIAL: "★",
  NO_CLASS: "🚫",
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
