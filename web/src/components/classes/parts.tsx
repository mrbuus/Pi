"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import InfoHint from "@/components/ui/InfoHint";
import { cn } from "@/lib/cn";
import { flagMeta, rateTone, RISK_META } from "./meta";
import type { Competency, RiskFlag, WeekRate } from "./types";

/**
 * Самбарын том тоо — тоо байхгүй бол «—» ба шалтгаан (тоо зохиохгүй).
 * `onOpen` өгвөл карт бүхэлдээ дарагдана (дотрын «i» товч тусдаа ажиллана).
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
  empty = "Мэдээлэл алга",
  action,
  onOpen,
  openLabel,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string | null;
  suffix?: string;
  hint?: ReactNode;
  empty?: string;
  /** Дарахад холбогдох жагсаалт руу (картыг бүхэлд нь товч болгохгүй — дотор нь «i» товч бий) */
  action?: { label: string; onClick: () => void };
  onOpen?: () => void;
  openLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4", onOpen && "surface-interactive")}>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-dim">
        <Icon className="h-4 w-4 shrink-0 text-brand-soft" aria-hidden />
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={openLabel ?? label}
            className="min-w-0 truncate text-left after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {label}
          </button>
        ) : (
          <span className="min-w-0 truncate">{label}</span>
        )}
        {hint && (
          <span className="relative z-10 inline-flex">
            <InfoHint>{hint}</InfoHint>
          </span>
        )}
        {onOpen && <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-ink-dim" aria-hidden />}
      </div>
      {value === null ? (
        <p className="mt-2 text-sm font-semibold text-ink-dim">{empty}</p>
      ) : (
        <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">
          {value}
          {suffix && <span className="text-base font-semibold text-ink-dim">{suffix}</span>}
        </p>
      )}
      {children}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-auto inline-flex min-h-11 items-center self-start pt-1 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/** 7 хоногийн жижиг баганан хандлага. null = тэмдэглэгээгүй 7 хоног (тасархай). */
export function WeekBars({ weeks, label }: { weeks: WeekRate[]; label: string }) {
  const any = weeks.some((w) => w.rate !== null);
  return (
    <div className="mt-3" aria-label={label} role="img">
      <div className="flex h-10 items-end gap-1">
        {weeks.map((w) =>
          w.rate === null ? (
            <span key={w.week} className="h-1 flex-1 rounded-sm border border-dashed border-line" />
          ) : (
            <span
              key={w.week}
              title={`${w.week} — ${w.rate}%`}
              className={cn("flex-1 rounded-sm", rateTone(w.rate))}
              style={{ height: `${Math.max(8, w.rate)}%` }}
            />
          ),
        )}
      </div>
      {!any && <p className="mt-1 text-xs text-ink-dim">Сүүлийн 8 долоо хоногт тэмдэглэгээ алга</p>}
    </div>
  );
}

/** Нимгэн хувь мөр + тоо. Өнгө нь зөвхөн мөрөнд, тоо ink. */
export function RateCell({ rate, marked, className }: { rate: number | null; marked?: number; className?: string }) {
  if (rate === null) return <span className={cn("text-sm text-ink-dim", className)}>—</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)} title={marked ? `${marked} тэмдэглэгээ` : undefined}>
      <span className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-ink/10" aria-hidden>
        <span className={cn("block h-full rounded-full", rateTone(rate))} style={{ width: `${rate}%` }} />
      </span>
      <span className="text-sm font-semibold tabular-nums text-ink">{rate}%</span>
    </span>
  );
}

export function FlagChip({ kind, note, onClick }: { kind: string; note?: string | null; onClick?: () => void }) {
  const m = flagMeta(kind);
  const Icon = m.icon;
  const body = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{m.label}</span>
    </>
  );
  const cls = cn(
    "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
    m.tone,
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, "min-h-7 hover:brightness-95")} title={note ?? undefined}>
      {body}
    </button>
  ) : (
    <span className={cls} title={note ?? undefined}>
      {body}
    </span>
  );
}

export function RiskChip({ risk }: { risk: RiskFlag }) {
  const m = RISK_META[risk];
  const Icon = m.icon;
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-error/30 px-2 py-0.5 text-xs font-semibold text-error"
      title={m.hint}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{m.label}</span>
    </span>
  );
}

/** Чадамжийн оноо — тоо + өөрчлөлт, мэдээлэл хангалтгүй бол тодорхой бичнэ. */
export function CompetencyValue({ c, compact = false }: { c: Competency; compact?: boolean }) {
  if (c.score === null)
    return <span className="text-xs font-semibold text-ink-dim">{compact ? "Хангалтгүй" : "Мэдээлэл хангалтгүй"}</span>;
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-display text-lg font-bold tabular-nums text-ink">{c.score}</span>
      {c.change !== null && c.change !== 0 && (
        <span className={cn("text-xs font-semibold tabular-nums", c.change > 0 ? "text-success" : "text-error")}>
          {c.change > 0 ? `+${c.change}` : c.change}
        </span>
      )}
    </span>
  );
}

export function CompetencyHint() {
  return (
    <InfoHint label="Чадамжийн оноо гэж юу вэ">
      <span className="block font-semibold">Чадамжийн оноо — v0 туршилтын</span>
      <span className="mt-1 block">
        Шалгалтын нарийвчлал 50%, бие даасан бодлого 20%, даалгавар 15%, ирц 15%. Сүүлийн шалгалт хамгийн их жинтэй.
        «Буудсан» хариулт зөвд тооцогдохгүй, хувиараа торгуультай.
      </span>
      <span className="mt-1 block">
        Шалгалт эсвэл 10+ бие даасан бодлого байхгүй бол «Мэдээлэл хангалтгүй». Алгоритмыг эзэн нарийвчилна.
      </span>
    </InfoHint>
  );
}

/** Сегмент хэлбэрийн сонголт — 44px өндөр. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex min-w-0 flex-wrap gap-1.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition",
              on ? "border-transparent bg-brand-bright text-on-brand" : "border-line bg-surface text-ink-dim hover:text-ink",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", on ? "bg-on-brand/20" : "bg-ink/8")}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
