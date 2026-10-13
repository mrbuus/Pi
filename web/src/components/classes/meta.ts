import {
  CalendarX2,
  Check,
  ClipboardX,
  Clock3,
  Contrast,
  Copy,
  Eye,
  FileX2,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import type { AttendanceStatus, HomeworkStatus, PaymentState, RiskFlag } from "./types";

/**
 * Зан төлөвийн шошго — api/src/class-dashboard/behavior-flags.ts-тэй ижил
 * жагсаалт. Өнгө нь зөвхөн зөөлөн дэвсгэр + дүрс + шошго (өнгө дангаараа утга
 * илэрхийлэхгүй, STATUS §6.9). Шар/алтан өнгө хэрэглэхгүй (эзний амт).
 */
export const FLAG_META: Record<string, { label: string; icon: LucideIcon; tone: string; concern: boolean }> = {
  GUESSES: { label: "Буудаж боддог", icon: Target, tone: "bg-accent-violet/12 text-ink ring-accent-violet/30", concern: true },
  COPIES: { label: "Хуулдаг", icon: Copy, tone: "bg-error/10 text-ink ring-error/30", concern: true },
  ATTENTION: { label: "Анхаарал", icon: Eye, tone: "bg-info/10 text-ink ring-info/30", concern: true },
  IMPROVED: { label: "Сайжирсан", icon: TrendingUp, tone: "bg-success/12 text-ink ring-success/30", concern: false },
};

export const FLAG_KINDS = Object.keys(FLAG_META);

export function flagMeta(kind: string) {
  return FLAG_META[kind] ?? { label: kind, icon: TriangleAlert, tone: "bg-ink/5 text-ink ring-line", concern: false };
}

export const RISK_META: Record<RiskFlag, { label: string; icon: LucideIcon; hint: string }> = {
  LOW_ATTENDANCE: { label: "Ирц сул", icon: CalendarX2, hint: "Сүүлийн 30 хоногийн ирц 75%-иас доош" },
  LOW_HOMEWORK: { label: "Даалгавар сул", icon: ClipboardX, hint: "Сүүлийн 30 хоногт даалгаврын гүйцэтгэл 50%-иас доош" },
  LOW_SCORE: { label: "Дүн сул", icon: FileX2, hint: "Шалгалтын дундаж 40%-иас доош" },
  FALLING: { label: "Буурч байна", icon: TrendingDown, hint: "Сүүлийн шалгалт өмнөхөөсөө 10%-иар, эсвэл чадамжийн оноо 4 долоо хоногт 8-аар буурсан" },
  MISSED_EXAMS: { label: "Шалгалт алгассан", icon: FileX2, hint: "2 ба түүнээс олон шалгалт өгөөгүй" },
};

export const PAYMENT_META: Record<PaymentState, { label: string; tone: "success" | "info" | "neutral" | "danger" }> = {
  PAID: { label: "Төлсөн", tone: "success" },
  PARTIAL: { label: "Дутуу", tone: "danger" },
  PENDING: { label: "Хүлээгдэж буй", tone: "info" },
  NONE: { label: "Бүртгэлгүй", tone: "neutral" },
};

/** JS гараг (0=Ням…6=Бямба) → монгол товчлол. Эзний дугаарлалт 1=Даваа (STATUS §3.11). */
export const WEEKDAY_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

export function minuteLabel(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export const TEACHER_ROLE_LABEL: Record<string, string> = {
  CLASS: "Ангийн багш",
  CLASS_ASSISTANT: "Туслах ангийн багш",
  SCHEDULE: "Хуваарийн багш",
  LEAD: "Хичээлийн ахлах",
  ASSISTANT: "Хичээлийн туслах",
};

/**
 * Ирц/даалгаврын нүд — өнгө дангаараа утга илэрхийлэхгүй (STATUS §6.9):
 * дүрс + шошго. Шар/алтан хэрэглэхгүй.
 */
export const ATTENDANCE_META: Record<AttendanceStatus, { label: string; icon: LucideIcon; cell: string }> = {
  PRESENT: { label: "Ирсэн", icon: Check, cell: "bg-success/15 text-success" },
  LATE: { label: "Хоцорсон", icon: Clock3, cell: "bg-info/15 text-info" },
  ABSENT: { label: "Тасалсан", icon: X, cell: "bg-error/15 text-error" },
  EXCUSED: { label: "Чөлөөтэй", icon: Minus, cell: "bg-ink/8 text-ink-dim" },
};

export const HOMEWORK_META: Record<HomeworkStatus, { label: string; icon: LucideIcon; cell: string }> = {
  DONE: { label: "Хийсэн", icon: Check, cell: "bg-success/15 text-success" },
  PARTIAL: { label: "Дутуу", icon: Contrast, cell: "bg-brand-bright/15 text-brand-soft" },
  NOT_DONE: { label: "Хийгээгүй", icon: X, cell: "bg-error/15 text-error" },
};

/** "2026-10" → «2026 оны 10-р сар» */
export function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${y} оны ${Number(m)}-р сар`;
}

/** "2026-10-06" → «10/6» (торын толгойд) */
export function dayLabel(date: string) {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** Ангийн дунджаас ялгаа (өгөгдөлгүй бол null) */
export function deltaOf(value: number | null | undefined, avg: number | null | undefined): number | null {
  if (value === null || value === undefined || avg === null || avg === undefined) return null;
  return Math.round((value - avg) * 10) / 10;
}

/** Хувь → өнгөний токен (зөвхөн зурвас/цэгт) */
export function rateTone(rate: number | null, good = 80, bad = 60): string {
  if (rate === null) return "bg-ink/15";
  if (rate >= good) return "bg-success";
  if (rate >= bad) return "bg-brand-bright";
  return "bg-error";
}
