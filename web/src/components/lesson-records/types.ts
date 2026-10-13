/** GET /lesson-records/day, /classroom/:id — зөвхөн ажилтанд. */
export interface LessonRecord {
  id: string;
  scheduleId: string;
  classroomId: string;
  date: string;
  classroomName: string;
  startMinute: number;
  endMinute: number;
  room: string | null;
  topic: string | null;
  leadTeacherName: string | null;
  assistantTeacherName: string | null;
  tests: { id: string; testId: string | null; title: string }[];
  testCount: number;
  enrolledCount: number;
  presentCount: number;
  absentCount: number;
  attendanceMarked: number;
  confirmedByName: string;
  confirmedAt: string;
}

export interface LessonNote {
  scheduleId: string;
  body: string;
  updatedByName: string;
  updatedAt: string;
}

export interface LessonDay {
  date: string;
  records: LessonRecord[];
  notes: LessonNote[];
  dismissals: { classroomId: string; approximateAt: string }[];
}

/** GET /lesson-records/me — сурагчийн өөрийн түүх (тайлбаргүй). */
export interface MyLesson {
  id: string;
  date: string;
  classroomName: string;
  startMinute: number;
  endMinute: number;
  room: string | null;
  topic: string | null;
  leadTeacherName: string | null;
  assistantTeacherName: string | null;
  attendance: string | null;
}

export const NOTE_MAX = 500;

/** ISO цагийг УБ-ын «ЦЦ:ММ» болгоно (браузерын цагийн бүсээс хамааралгүй). */
export function clockUB(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** ISO цагийг УБ-ын «ММ.ӨӨ ЦЦ:ММ» болгоно. */
export function stampUB(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${get("month")}.${get("day")} ${clockUB(iso)}`;
}

/** «ЦЦ:ММ» + минут (өдрийн хүрээнд). */
export function shiftClock(clock: string, delta: number): string {
  const [h, m] = clock.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + delta));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Тухайн өдрийн тарсан цагийг тэмдэглэж болох уу — өнгөрсөн өдөр эсвэл өнөөдөр 17:00-оос хойш (УБ). */
export function dismissalOpen(date: string, today: string): boolean {
  if (date < today) return true;
  if (date > today) return false;
  return (new Date().getUTCHours() + 8) % 24 >= 17;
}

export const ATTENDANCE_LABEL: Record<string, string> = {
  PRESENT: "Ирсэн",
  LATE: "Хоцорсон",
  ABSENT: "Ирээгүй",
  EXCUSED: "Чөлөөтэй",
};
