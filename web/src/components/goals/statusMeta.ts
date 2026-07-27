import type { GoalStatus, GoalSubject } from "./types";

// Төлөв бүрийг ХЭЗЭЭ Ч зөвхөн өнгөөр ялгахгүй — дүрс (icon) + монгол нэрийг
// үргэлж хамт ашиглана (өнгө хараагүй сурагчид ч ялгагдана).
export const STATUS_META: Record<
  GoalStatus,
  { label: string; icon: string; colorClass: string; badgeClass: string }
> = {
  PLANNED: {
    label: "Төлөвлөсөн",
    icon: "🗒",
    colorClass: "text-info",
    badgeClass: "bg-info/15 text-info",
  },
  IN_PROGRESS: {
    label: "Хийгдэж байгаа",
    icon: "▶",
    colorClass: "text-brand",
    badgeClass: "bg-brand/15 text-brand",
  },
  DONE: {
    label: "Биелсэн",
    icon: "✓",
    colorClass: "text-success",
    badgeClass: "bg-success/15 text-success",
  },
  BLOCKED: {
    label: "Саатсан",
    icon: "⛔",
    colorClass: "text-error",
    badgeClass: "bg-error/15 text-error",
  },
  CANCELLED: {
    label: "Цуцалсан",
    icon: "✕",
    colorClass: "text-ink-dim",
    badgeClass: "bg-panel text-ink-dim",
  },
};

export const STATUS_OPTIONS: GoalStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
  "BLOCKED",
  "CANCELLED",
];

// Жагсаалтад идэвхтэй зорилтуудыг эхэнд, дууссан/цуцалсныг ард харуулах эрэмбэ.
export const STATUS_ORDER_FOR_SORT: Record<GoalStatus, number> = {
  IN_PROGRESS: 0,
  PLANNED: 1,
  BLOCKED: 2,
  DONE: 3,
  CANCELLED: 4,
};

export const SUBJECT_LABEL: Record<GoalSubject, string> = {
  MATH: "Математик",
  SOCIAL_STUDIES: "Нийгмийн ухаан",
};

export function formatDate(d?: string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(d));
}

/** Өнөөдрөөс хойш үлдсэн хоног (сөрөг бол хугацаа өнгөрсөн). */
export function daysUntil(targetDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
