"use client";

import { type LucideIcon, type LucideProps } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Ирц, даалгаврын тэмдэглэгээний НЭГ хэв маяг (эзэн 2026-10-18, демогоос шилжүүлсэн):
 * ирц = нэг хүний дүрс + танай журналын тэмдэг (✓ Х ● Ч), даалгавар = нэг дэвтэр +
 * тэмдэг (✓ ◐ ✕ ↑). Самбар, ангийн сарын хүснэгт, сурагчийн хуудас бүгд ЭНИЙГ хэрэглэнэ.
 * Төлөвийн түлхүүр нь Prisma enum-тай яг адил (AttendanceStatus, HomeworkMarkStatus).
 */

/* ───────── Дүрсийн «гэр бүл» (эзэн 2026-10-18): ирц = нэг хүн + журналын тэмдэг,
   даалгавар = нэг дэвтэр + дотор нь тэмдэг. Lucide-ийн user/book суурь, зураас 2. ───────── */

function Stroke({ className, children, ...rest }: LucideProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("lucide", className)}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

const PERSON = (
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
  </>
);

/** Ирсэн — хүн + ✓ */
export function AttPresentIcon(p: LucideProps) {
  return <Stroke {...p}>{PERSON}<path d="m16 11 2 2 4-4" /></Stroke>;
}
/** Хоцорсон — хүн + «Х» (журналын тэмдэг) */
export function AttLateIcon(p: LucideProps) {
  return <Stroke {...p}>{PERSON}<path d="m17 8 5 6M22 8l-5 6" /></Stroke>;
}
/** Тасалсан — хүн + бүдүүн цэг */
export function AttAbsentIcon(p: LucideProps) {
  return <Stroke {...p}>{PERSON}<circle cx="19.5" cy="11" r="2.75" fill="currentColor" /></Stroke>;
}
/** Чөлөөтэй — хүн + «Ч» */
export function AttExcusedIcon(p: LucideProps) {
  return <Stroke {...p}>{PERSON}<path d="M17 8v2.2a1.8 1.8 0 0 0 1.8 1.8H22M22 8v6" /></Stroke>;
}

const BOOK = <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />;

/** Хийсэн — дэвтэр + ✓ */
export function HwDoneIcon(p: LucideProps) {
  return <Stroke {...p}>{BOOK}<path d="m9 9.5 2 2 4-4" /></Stroke>;
}
/** Дутуу — дэвтэр + хагас будсан тойрог */
export function HwPartialIcon(p: LucideProps) {
  return (
    <Stroke {...p}>
      {BOOK}
      <circle cx="12" cy="9.5" r="3.25" />
      <path d="M12 6.25a3.25 3.25 0 0 1 0 6.5z" fill="currentColor" stroke="none" />
    </Stroke>
  );
}
/** Хийгээгүй — дэвтэр + ✕ */
export function HwMissingIcon(p: LucideProps) {
  return <Stroke {...p}>{BOOK}<path d="m14.5 7-5 5M9.5 7l5 5" /></Stroke>;
}
/** Илгээсэн — дэвтэр + дээш сум (зураг илгээсэн) */
export function HwSentIcon(p: LucideProps) {
  return <Stroke {...p}>{BOOK}<path d="M12 13V6.5M9 9.5l3-3 3 3" /></Stroke>;
}

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export type HomeworkStatus = "DONE" | "PARTIAL" | "NOT_DONE";
export type Tone = "success" | "warning" | "error" | "info";

export interface MarkMeta {
  label: string;
  icon: LucideIcon | typeof AttPresentIcon;
  tone: Tone;
}

export const ATTENDANCE_MARKS: Record<AttendanceStatus, MarkMeta> = {
  PRESENT: { label: "Ирсэн", icon: AttPresentIcon, tone: "success" },
  LATE: { label: "Хоцорсон", icon: AttLateIcon, tone: "warning" },
  ABSENT: { label: "Тасалсан", icon: AttAbsentIcon, tone: "error" },
  EXCUSED: { label: "Чөлөөтэй", icon: AttExcusedIcon, tone: "info" },
};
export const ATTENDANCE_ORDER: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];

export const HOMEWORK_MARKS: Record<HomeworkStatus, MarkMeta> = {
  DONE: { label: "Хийсэн", icon: HwDoneIcon, tone: "success" },
  PARTIAL: { label: "Дутуу", icon: HwPartialIcon, tone: "warning" },
  NOT_DONE: { label: "Хийгээгүй", icon: HwMissingIcon, tone: "error" },
};
export const HOMEWORK_ORDER: HomeworkStatus[] = ["DONE", "PARTIAL", "NOT_DONE"];

/** Сонгогдсон хайрцаг/чипийн өнгө (хүрээ + дэвсгэр + бичвэр) */
export const TONE_SELECTED: Record<Tone, string> = {
  success: "border-success bg-success/15 text-success",
  warning: "border-warning bg-warning/15 text-warning",
  error: "border-error bg-error/15 text-error",
  info: "border-info bg-info/15 text-info",
};

/** Зөвхөн бичвэр/дүрсний өнгө (жагсаалт, хүснэгтэд) */
export const TONE_TEXT: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
};

/**
 * Асуудалтай хүүхдийн тэмдэг — нэрийн ӨМНӨ. Шалгуур хангаагүй бол улаан цэг
 * (title/дэлгэц уншигчид шалтгаан), асуудалгүй бол ижил өргөнтэй хоосон зай.
 */
export function RiskMark({ reasons, className }: { reasons: string[]; className?: string }) {
  if (!reasons.length) return <span aria-hidden className={cn("inline-block size-2.5 shrink-0", className)} />;
  const text = reasons.join(", ");
  return (
    <span title={text} className={cn("inline-flex size-2.5 shrink-0 rounded-full bg-error ring-2 ring-error/20", className)}>
      <span className="sr-only">Шалгуур хангаагүй: {text}</span>
    </span>
  );
}

