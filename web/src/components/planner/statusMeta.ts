import { Ban, Check, NotebookPen, Play, X, type LucideIcon } from "lucide-react";
import type { TaskPriority, TaskStatus, TaskSubject } from "./types";

// Төлөв бүрийг ХЭЗЭЭ Ч зөвхөн өнгөөр ялгахгүй — дүрс (icon) + монгол нэрийг
// үргэлж хамт ашиглана (өнгө хараагүй сурагч/ажилтанд ч ялгагдана).
export const STATUS_META: Record<
  TaskStatus,
  {
    label: string;
    icon: LucideIcon;
    colorClass: string;
    dotClass: string;
    // ХУГАЦАА харагдацын багана — литерал class нэрс (Tailwind JIT-д тодорхой
    // харагдахын тулд dynamic template-ээр биш, шууд бичсэн байх ёстой).
    barBgClass: string;
    barBorderClass: string;
  }
> = {
  PLANNED: {
    label: "Төлөвлөсөн",
    icon: NotebookPen,
    colorClass: "text-info",
    dotClass: "bg-info",
    barBgClass: "bg-info/15",
    barBorderClass: "border-info",
  },
  IN_PROGRESS: {
    label: "Хийгдэж байгаа",
    icon: Play,
    colorClass: "text-brand",
    dotClass: "bg-brand",
    barBgClass: "bg-brand/15",
    barBorderClass: "border-brand",
  },
  DONE: {
    label: "Дууссан",
    icon: Check,
    colorClass: "text-success",
    dotClass: "bg-success",
    barBgClass: "bg-success/15",
    barBorderClass: "border-success",
  },
  BLOCKED: {
    label: "Хоригдсон",
    icon: Ban,
    colorClass: "text-error",
    dotClass: "bg-error",
    barBgClass: "bg-error/15",
    barBorderClass: "border-error",
  },
  CANCELLED: {
    label: "Цуцалсан",
    icon: X,
    colorClass: "text-ink-dim",
    dotClass: "bg-ink-dim",
    barBgClass: "bg-ink-dim/10",
    barBorderClass: "border-ink-dim",
  },
};

export const STATUS_ORDER: TaskStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
];

export const PRIORITY_META: Record<
  TaskPriority,
  { label: string; icon: string; colorClass: string }
> = {
  LOW: { label: "Бага", icon: "▽", colorClass: "text-ink-dim" },
  NORMAL: { label: "Энгийн", icon: "–", colorClass: "text-ink-dim" },
  HIGH: { label: "Өндөр", icon: "△", colorClass: "text-warning" },
  URGENT: { label: "Яаралтай", icon: "‼", colorClass: "text-error" },
};

export const SUBJECT_LABEL: Record<TaskSubject, string> = {
  MATH: "Математик",
  SOCIAL_STUDIES: "Нийгмийн ухаан",
};

export function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.lastName} ${u.firstName}`;
}

export function formatDate(d?: string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(d));
}
