"use client";

import { ArrowRightLeft, DoorOpen, Minus } from "lucide-react";
import { ATTENDANCE_MARKS, HOMEWORK_MARKS, TONE_TEXT, type AttendanceStatus, type HomeworkStatus } from "@/components/attendance/marks";
import { cn } from "@/lib/cn";
import { QuizPctBadge, type QuizDayRow } from "./QuizDay";

/**
 * Сарын хуанлийн НЭГ хичээлийн хайрцаг (эзэн 2026-11-08) — самбарын сурагчийн drawer ба сурагчийн
 * бүтэн хуудасны «Хичээлийн түүх» хоёулаа ЭНИЙГ хэрэглэнэ (ижил дүрс, ижил байрлал):
 * өдөр, ирцийн дүрс, даалгаврын дүрс, шалгалтын хувь. Тэмдэглээгүй бол зураас, ирээдүй/элсэхээс
 * өмнөх өдөр тасархай хүрээтэй. `kind="makeup"` — нөхөлтийн хайрцаг (өөр өнгө, газрын дүрс).
 */
export interface DayBoxProps {
  /** Сарын өдөр (1..31) */
  dayOfMonth: number;
  attendance: AttendanceStatus | null;
  homework: HomeworkStatus | null;
  /** Даалгаврын мөр харуулах эсэх (танхимын анги) */
  showHomework: boolean;
  quiz: QuizDayRow | null;
  /** Сард шалгалт байгаа — бүх хайрцаг ижил өндөр */
  quizRow: boolean;
  /** Ирээдүйн / элсэхээс өмнөх (тасархай хүрээ, дүрсгүй) */
  muted: boolean;
  /** Өөр ангид тэмдэглэгдсэн */
  otherClass?: boolean;
  /** Нөхөлт: 406 эсвэл өөр анги */
  makeup?: "ROOM_406" | "CLASS" | null;
  selected?: boolean;
  /** Дэлгэц уншигч ба title */
  label: string;
  /** Өгвөл товч болно (дарахад дэлгэрэнгүй) */
  onClick?: () => void;
  className?: string;
}

export default function DayBox({
  dayOfMonth,
  attendance,
  homework,
  showHomework,
  quiz,
  quizRow,
  muted,
  otherClass,
  makeup,
  selected,
  label,
  onClick,
  className,
}: DayBoxProps) {
  const am = attendance ? ATTENDANCE_MARKS[attendance] : null;
  const hm = homework ? HOMEWORK_MARKS[homework] : null;
  const AttIcon = am?.icon;
  const HwIcon = hm?.icon;
  const PlaceIcon = makeup === "ROOM_406" ? DoorOpen : ArrowRightLeft;
  const box = cn(
    "flex w-10 flex-col items-center justify-center gap-0.5 rounded-lg border py-1 text-[11px] tabular-nums",
    showHomework ? (quizRow ? "h-[4.75rem]" : "h-[3.75rem]") : quizRow ? "h-[3.75rem]" : "h-12",
    makeup
      ? "border-brand-bright/60 bg-brand-bright/[0.08] text-ink"
      : muted
        ? "border-dashed border-line text-ink-dim/60"
        : "border-line bg-surface text-ink",
    !makeup && otherClass && "border-info/50",
    selected && "ring-2 ring-brand-bright ring-offset-1 ring-offset-surface",
    onClick && "cursor-pointer transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-brand",
    className,
  );
  const inner = (
    <>
      <span className="font-semibold leading-none">{dayOfMonth}</span>
      {AttIcon && am ? (
        <AttIcon className={cn("size-3.5", TONE_TEXT[am.tone])} aria-hidden />
      ) : makeup ? (
        <PlaceIcon className="size-3.5 text-brand" aria-hidden />
      ) : muted ? (
        <span className="h-3.5" />
      ) : (
        <Minus className="size-3.5 text-ink-dim/60" aria-hidden />
      )}
      {showHomework &&
        (HwIcon && hm ? (
          <HwIcon className={cn("size-3.5", TONE_TEXT[hm.tone])} aria-hidden />
        ) : muted || quiz || makeup ? (
          // Шалгалтын оноотой бол «тэмдэглээгүй» зураас тавихгүй
          <span className="h-3.5" />
        ) : (
          <Minus className="size-3.5 text-ink-dim/60" aria-hidden />
        ))}
      {quizRow && (quiz ? <QuizPctBadge row={quiz} /> : <span className="h-3.5" />)}
      <span className="sr-only">{label}</span>
    </>
  );
  return onClick ? (
    <button type="button" title={label} onClick={onClick} className={box}>
      {inner}
    </button>
  ) : (
    <div title={label} className={box}>
      {inner}
    </div>
  );
}
