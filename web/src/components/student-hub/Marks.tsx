"use client";

import { Minus } from "lucide-react";
import { ATTENDANCE_MARKS, HOMEWORK_MARKS, TONE_TEXT } from "@/components/attendance/marks";
import { LATE_RANGE_SHORT } from "@/components/TeacherDashboard/board/lib";
import { cn } from "@/lib/cn";
import type { HubDay } from "./types";

/**
 * Ирц, даалгаврын тэмдэг — багшийн самбартай ЯГ ижил дүрс, өнгө, шошго
 * (components/attendance/marks.tsx). Өнгө дангаараа утга илэрхийлэхгүй: дүрс + бичиг
 * (compact үед бичиг нь title/sr-only).
 */

function Mark({
  icon: Icon,
  tone,
  label,
  compact,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  compact?: boolean | "sm";
  className?: string;
}) {
  return (
    <span title={label} className={cn("inline-flex shrink-0 items-center gap-1 text-sm font-semibold", className)}>
      <Icon className={cn("size-4 shrink-0", tone)} aria-hidden />
      {compact === true ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className={cn("text-ink", compact === "sm" && "sr-only sm:not-sr-only")}>{label}</span>
      )}
    </span>
  );
}

export function AttendanceMark({
  att,
  compact,
  className,
}: {
  att: HubDay["attendance"];
  compact?: boolean | "sm";
  className?: string;
}) {
  if (!att) return <Mark icon={Minus} tone="text-ink-dim/70" label="Ирц тэмдэглээгүй" compact={compact} className={className} />;
  const m = ATTENDANCE_MARKS[att.status];
  const late = att.lateRange ? ` ${LATE_RANGE_SHORT[att.lateRange]}` : "";
  return <Mark icon={m.icon} tone={TONE_TEXT[m.tone]} label={`${m.label}${late}`} compact={compact} className={className} />;
}

export function HomeworkMark({
  status,
  compact,
  className,
}: {
  status: HubDay["homework"]["status"];
  compact?: boolean | "sm";
  className?: string;
}) {
  if (!status) return <Mark icon={Minus} tone="text-ink-dim/70" label="Шалгаагүй" compact={compact} className={className} />;
  const m = HOMEWORK_MARKS[status];
  return <Mark icon={m.icon} tone={TONE_TEXT[m.tone]} label={m.label} compact={compact} className={className} />;
}
