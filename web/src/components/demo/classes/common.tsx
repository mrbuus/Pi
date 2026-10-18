"use client";

import { ChevronLeft, ChevronRight, CircleCheck, CircleDashed, CircleX, TriangleAlert, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { Badge } from "@/components/ui/kit/badge";
import { cn } from "@/lib/cn";
import { DEFAULT_CRITERIA, SEASON_START, fromKey, initials, monthLabel, todayKey, type PaymentSummary, type RiskFlag } from "../world";

/* ───────── Хувь: шалгуураас доогуур бол улаан (тоо өөрөө үргэлж харагдана) ───────── */

export function Rate({ value, floor, className }: { value: number | null; floor: number; className?: string }) {
  if (value === null) return <span className={cn("text-ink-dim", className)}>—</span>;
  const low = value < floor;
  return (
    <span className={cn("font-semibold tabular-nums", low ? "text-error" : "text-ink", className)} title={low ? "Шалгуураас доогуур" : undefined}>
      {value}%
    </span>
  );
}

export function AttRate({ value, className }: { value: number | null; className?: string }) {
  return <Rate value={value} floor={DEFAULT_CRITERIA.minAttendance} className={className} />;
}

export function HwRate({ value, className }: { value: number | null; className?: string }) {
  return <Rate value={value} floor={DEFAULT_CRITERIA.minHomework} className={className} />;
}

/* ───────── Төлбөрийн төлөв ───────── */

export const PAY_META = {
  paid: { label: "Төлсөн", tone: "success", icon: CircleCheck },
  partial: { label: "Хэсэгчлэн", tone: "warning", icon: CircleDashed },
  unpaid: { label: "Төлөөгүй", tone: "danger", icon: CircleX },
} as const satisfies Record<PaymentSummary["status"], { label: string; tone: "success" | "warning" | "danger"; icon: LucideIcon }>;

export function PayBadge({ status, className }: { status: PaymentSummary["status"]; className?: string }) {
  const m = PAY_META[status];
  const Icon = m.icon;
  return (
    <Badge tone={m.tone} className={className}>
      <Icon aria-hidden />
      {m.label}
    </Badge>
  );
}

/* ───────── Асуудалтай хүүхдийн шалтгаан (улаан) ───────── */

/** Тоолуур, тайлбар дахь чимэглэлийн улаан цэг (RiskMark-тай ижил дүр, дэлгэц уншигчид нууцлагдсан) */
export function RiskDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-flex size-2.5 shrink-0 rounded-full bg-error ring-2 ring-error/20", className)} />;
}

export function FlagBadges({ flags }: { flags: RiskFlag[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {flags.map((f) => (
        <li key={f.kind}>
          <Badge tone="danger">
            <TriangleAlert aria-hidden />
            {f.label}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/* ───────── Сурагчийн нэр (хуудас руу) ───────── */

export function StudentLink({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={`/demo/students/${id}`}
      prefetch={false}
      className={cn(
        "cyrillic-tight inline-flex min-h-11 items-center font-semibold text-ink underline decoration-ink-dim/40 decoration-dotted underline-offset-4 hover:text-brand-soft hover:decoration-brand-soft sm:min-h-8",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-bright/15 text-xs font-bold text-brand-soft ring-1 ring-line",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/* ───────── Хүрээ, KPI хавтан ───────── */

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-surface p-4 sm:p-5", className)}>{children}</div>;
}

export function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  danger,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className={cn("flex items-center gap-1.5 text-xs font-semibold", danger ? "text-error" : "text-ink-dim")}>
        <Icon className="size-4 shrink-0" />
        <span className="cyrillic-tight min-w-0 truncate">{label}</span>
      </span>
      <span className={cn("mt-1 block font-display text-xl font-bold tabular-nums sm:text-2xl", danger ? "text-error" : "text-ink")}>{value}</span>
      {hint && <span className="mt-0.5 block text-xs text-ink-dim">{hint}</span>}
    </>
  );
  const cls = "chunky block min-h-[4.75rem] p-3 text-left sm:min-h-[5.5rem]";
  if (!onClick) return <div className={cls}>{body}</div>;
  return (
    <button type="button" onClick={onClick} className={cn(cls, "chunky-press w-full outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/60")}>
      {body}
    </button>
  );
}

/* ───────── Явцын мөр: оноо + ангийн дундажийн босоо зураас ───────── */

export function ScoreBar({ value, avg, className }: { value: number; avg?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("relative block h-2 overflow-hidden rounded-full bg-ink/10", className)}>
      <span className="absolute inset-y-0 left-0 rounded-full bg-brand-bright" style={{ width: `${value}%` }} />
      {avg !== undefined && <span className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${avg}%` }} />}
    </span>
  );
}

/* ───────── Сегмент товч (радио маягийн сонголт): 44px өндөр ───────── */

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex overflow-hidden rounded-xl border border-line bg-surface", className)}>
      {options.map((o, i) => (
        <button
          key={o.value || "all"}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-11 px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-bright/60",
            i > 0 && "border-l border-line",
            value === o.value ? "bg-brand-bright text-on-brand" : "text-ink-dim hover:bg-ink/5 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ───────── Сар сонгогч ───────── */

export interface YM {
  y: number;
  m: number;
}

export function monthOfToday(): YM {
  const d = fromKey(todayKey());
  return { y: d.getFullYear(), m: d.getMonth() };
}

const ymIndex = (v: YM) => v.y * 12 + v.m;
const NAV_BTN =
  "inline-flex size-11 items-center justify-center rounded-lg text-ink-dim outline-none transition-colors hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-bright/60 disabled:pointer-events-none disabled:opacity-35";

/** Улирал эхэлсэн сараас өнөөдрийн сар хүртэл */
export function MonthNav({ view, onView, className }: { view: YM; onView: (v: YM) => void; className?: string }) {
  const start = fromKey(SEASON_START);
  const min: YM = { y: start.getFullYear(), m: start.getMonth() };
  const max = monthOfToday();
  const shift = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    onView({ y: d.getFullYear(), m: d.getMonth() });
  };
  return (
    <div className={cn("inline-flex items-center", className)}>
      <button type="button" onClick={() => shift(-1)} disabled={ymIndex(view) <= ymIndex(min)} aria-label="Өмнөх сар" className={NAV_BTN}>
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <span aria-live="polite" className="min-w-[8.5rem] text-center text-sm font-bold tabular-nums text-ink">
        {monthLabel(view.y, view.m)}
      </span>
      <button type="button" onClick={() => shift(1)} disabled={ymIndex(view) >= ymIndex(max)} aria-label="Дараах сар" className={NAV_BTN}>
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}

/* ───────── Тайлбар (legend) — үргэлж доор ───────── */

export function Legend({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="note" className={cn("mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-dim", className)}>
      {children}
    </div>
  );
}

export function LegendItem({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5">{children}</span>;
}
