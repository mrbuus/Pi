import {
  BadgeCheck,
  CircleCheck,
  Clock,
  FileCheck2,
  GraduationCap,
  ListPlus,
  PenLine,
  Radio,
  Star,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import RoomShape from "@/components/schedule/RoomShape";
import { Badge } from "@/components/ui/kit/badge";
import { cn } from "@/lib/cn";
import { initials, type DemoTeacher, type LessonChip, type LessonStatus } from "../world";

/** Багш ба Багш+ өнгөт блок: хоёулаа өнгө + дүрс + бичвэрээр ялгарна (өнгө дангаараа биш) */
export const ROLE = {
  TEACHER_PLUS: { label: "Багш+", icon: Star, solid: "bg-brand-bright text-on-brand", tint: "bg-brand-bright/15 text-brand-soft" },
  TEACHER: { label: "Багш", icon: GraduationCap, solid: "bg-accent-teal text-on-teal", tint: "bg-accent-teal/15 text-accent-teal" },
} as const;

const STATUS: Record<LessonStatus, { label: string; icon: LucideIcon; tone: "neutral" | "brand" }> = {
  upcoming: { label: "Удахгүй", icon: Clock, tone: "neutral" },
  now: { label: "Явагдаж байна", icon: Radio, tone: "brand" },
  done: { label: "Дууссан", icon: CircleCheck, tone: "neutral" },
};

export function StatusBadge({ status, className }: { status: LessonStatus; className?: string }) {
  const { label, icon: Icon, tone } = STATUS[status];
  return (
    <Badge tone={tone} className={cn("whitespace-nowrap", className)}>
      <Icon aria-hidden className={status === "now" ? "motion-safe:animate-pulse" : undefined} />
      {label}
    </Badge>
  );
}

export function ConfirmedBadge({ className }: { className?: string }) {
  return (
    <Badge tone="success" className={cn("whitespace-nowrap", className)}>
      <BadgeCheck aria-hidden />
      Батлагдсан
    </Badge>
  );
}

const CHIP: Record<LessonChip, { icon: LucideIcon; tone: "brand" | "info" | "neutral" }> = {
  "Явцын шалгалт": { icon: FileCheck2, tone: "brand" },
  "Нэмэлт бодлого": { icon: ListPlus, tone: "info" },
  "Гар аргаар шалгалт": { icon: PenLine, tone: "neutral" },
};

export function ChipBadge({ chip }: { chip: LessonChip }) {
  const { icon: Icon, tone } = CHIP[chip];
  return (
    <Badge tone={tone} className="whitespace-nowrap">
      <Icon aria-hidden />
      {chip}
    </Badge>
  );
}

/** Анхааруулга: дүрс + бичвэр (өнгө дангаараа биш) */
export function WarnBadge({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <Badge tone="warning" title={title} className="whitespace-nowrap">
      <TriangleAlert aria-hidden />
      {children}
    </Badge>
  );
}

/** Багшийн нэр: ролийн өнгөт үсгэн тэмдэг + нэр (+ нэгэн зэрэг хоёр ангид орсон бол анхааруулга) */
export function TeacherTag({ teacher, clash, className }: { teacher: DemoTeacher; clash?: boolean; className?: string }) {
  const role = ROLE[teacher.role];
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        aria-hidden
        title={role.label}
        className={cn("flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold", role.tint)}
      >
        {initials(teacher.name)}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-ink">{teacher.name}</span>
      {clash && (
        <span title={CLASH_TEXT} className="inline-flex shrink-0 text-warning">
          <TriangleAlert className="size-3.5" aria-hidden />
          <span className="sr-only">{CLASH_TEXT}</span>
        </span>
      )}
    </span>
  );
}

export const CLASH_TEXT = "Нэгэн зэрэг хоёр ангид хичээлтэй";

/** Ролийн нэр: өнгөт блок + дүрс + бичвэр */
export function RolePill({ role, className }: { role: DemoTeacher["role"]; className?: string }) {
  const { label, icon: Icon, solid } = ROLE[role];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none", solid, className)}>
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}

/** Танхимын дүрс + дугаар (+ суудал) */
export function RoomTag({ room, capacity, className }: { room: string; capacity: number | null; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-ink", className)}>
      <RoomShape room={room} size={18} />
      <span className="text-sm font-semibold tabular-nums">
        {room}
        {capacity ? <span className="font-normal text-ink-dim">, {capacity} суудал</span> : null}
      </span>
    </span>
  );
}

/** Сурагч / суудлын дүүргэлт: зурвас + тоо. Илүү бол анхааруулгын өнгө + дүрс */
export function Occupancy({ students, capacity, className }: { students: number; capacity: number; className?: string }) {
  const over = students > capacity;
  const pct = Math.min(100, Math.round((students / capacity) * 100));
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span aria-hidden className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-ink/10">
        <span className={cn("block h-full rounded-full", over ? "bg-warning" : "bg-brand-bright")} style={{ width: `${pct}%` }} />
      </span>
      <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums", over ? "text-warning" : "text-ink-dim")}>
        {over && <TriangleAlert className="size-3.5" aria-hidden />}
        {students}/{capacity}
      </span>
    </span>
  );
}

/** Дэлгэрэнгүй хэсгийн нэг блок: жижиг гарчиг + агуулга */
export function DetailBlock({ icon: Icon, label, children, className }: { icon: LucideIcon; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-dim">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}
