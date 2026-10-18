import { CircleCheck, CircleDashed, CircleDot, CircleSlash, type LucideIcon } from "lucide-react";
import type { AttendanceStatus, Tone } from "@/components/attendance/marks";

/** API гэрээ: docs/v2/UDRIIN-HICHEEL-REWORK.md (Агент 4) */
export type MakeupReason = Extract<AttendanceStatus, "ABSENT" | "EXCUSED" | "LATE">;
export type MakeupStatus = "PENDING" | "PARTIAL" | "DONE" | "WAIVED";

export interface MakeupTest {
  testId: string;
  title: string;
  variant: string | null;
  done: boolean;
  /** Ангид хийсэн тул тооцогдсон (хоцорсон) */
  inClass?: boolean;
  /** Онлайнаар өгөх боломжтой (сурагчийн жагсаалтад л) */
  online?: boolean;
  /** Сурагчийн ангид аль хэдийн нээгдсэн (сурагчийн жагсаалтад л) */
  open?: boolean;
}

/** GET /makeup/me — сурагчийн өөрийн мөр */
export interface MyMakeup {
  /** photos — илгээсэн PDF-ийн нийт хуудасны тоо */
  classroomId: string;
  classroomName: string;
  date: string;
  reason: MakeupReason;
  status: MakeupStatus;
  photos: number;
  imageKeys: string[];
  submittedAt: string | null;
  resubmit: boolean;
  photosAccepted: boolean;
  tests: MakeupTest[];
}

/** GET /makeup/classrooms/:id — ажилтны мөр */
export interface StaffMakeup {
  studentId: string;
  studentName: string;
  date: string;
  reason: MakeupReason;
  status: MakeupStatus;
  photos: number;
  tests: MakeupTest[];
  classroomId: string;
  imageKeys: string[];
  submittedAt: string | null;
  photosAccepted: boolean;
  decision: "CONFIRMED" | "WAIVED" | "REOPENED" | null;
  decidedAt: string | null;
  decidedByName: string | null;
  note: string | null;
}

/** GET /lesson-day/me/photos, /lesson-day/:classroomId/:date/photos */
export interface TheoryDay {
  classroomId: string;
  classroomName: string;
  date: string;
  upcoming: boolean;
  tests: { testId: string; title: string; variant: string | null }[];
  uploader: { name: string; isMe: boolean; studentId?: string } | null;
  canUpload: boolean;
  photos: { id: string; uploaderName: string; isMine: boolean; imageKeys: string[]; pages: number; createdAt: string }[];
}

export const STATUS_META: Record<MakeupStatus, { label: string; icon: LucideIcon; tone: Tone | "neutral" }> = {
  PENDING: { label: "Нөхөөгүй", icon: CircleDashed, tone: "error" },
  PARTIAL: { label: "Дутуу", icon: CircleDot, tone: "warning" },
  DONE: { label: "Нөхсөн", icon: CircleCheck, tone: "success" },
  WAIVED: { label: "Чөлөөлсөн", icon: CircleSlash, tone: "neutral" },
};

export const STATUS_CHIP: Record<Tone | "neutral", string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  info: "bg-info/15 text-info",
  neutral: "bg-ink/8 text-ink-dim",
};

export function isOpen(status: MakeupStatus) {
  return status === "PENDING" || status === "PARTIAL";
}

const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

/** «10-р сарын 12, Даваа» — YYYY-MM-DD (цагийн бүсгүй өдөр) */
export function dayLabel(key: string, withWeekday = true) {
  const [y, m, d] = key.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const base = `${MONTHS[m - 1]}-р сарын ${d}`;
  return withWeekday ? `${base}, ${WEEKDAYS[wd]}` : base;
}

/** Тестийн нэр + хувилбар: «Илтгэгч тэгшитгэл 1» + «B» (гарчигт хувилбар байвал давтахгүй) */
export function testLabel(t: { title: string; variant: string | null }) {
  if (!t.variant) return { title: t.title, variant: null };
  const re = new RegExp(`[-\\s]${t.variant}$`, "i");
  return { title: t.title.replace(re, "").trim(), variant: t.variant };
}
