"use client";

import { CalendarCheck, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ATTENDANCE_MARKS,
  ATTENDANCE_ORDER,
  TONE_SELECTED,
  TONE_TEXT,
} from "@/components/attendance/marks";
import { Legend, LegendItem } from "@/components/TeacherDashboard/board/parts";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { cn } from "@/lib/cn";
import { dayKey, dayTitle, monthTitle, todayKey, useApi } from "./lib";
import type { HubOverview, MyAttendanceRow } from "./types";

const WEEK_HEAD = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
const MONTH_STEP = 3;

/**
 * «Ирц» таб: бүх хугацааны нийт (тоо, хувь) + сар бүрийн хуанлийн тор. Өнгө нь багшийн
 * самбартай ижил (marks.tsx), дүрс дагалдана. Тайлбар (legend) ХАМГИЙН ДООР.
 * Өгөгдөл: GET /attendance/my (бүх түүх, нэг дуудлага) — сар бүрээр дахин татахгүй.
 */
export default function AttendanceTab({ onOpen }: { onOpen: (date: string, classroomId: string) => void }) {
  const overview = useApi<HubOverview>("/student-hub/overview");
  const rows = useApi<MyAttendanceRow[]>("/attendance/my");
  const [shown, setShown] = useState(MONTH_STEP);
  const today = todayKey();

  const months = useMemo(() => {
    const byMonth = new Map<string, Map<string, MyAttendanceRow>>();
    for (const r of rows.data ?? []) {
      const k = dayKey(r.date);
      const m = k.slice(0, 7);
      if (!byMonth.has(m)) byMonth.set(m, new Map());
      const days = byMonth.get(m)!;
      if (!days.has(k)) days.set(k, r);
    }
    return [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows.data]);

  const a = overview.data?.attendance;

  return (
    <div className="space-y-4">
      <section aria-labelledby="att-total" className="rounded-xl border border-line bg-surface p-4 elev-1">
        <h2 id="att-total" className="text-xs font-bold text-ink-dim">
          Бүх хугацааны ирц
        </h2>
        {overview.status === "error" ? (
          <div className="mt-2">
            <ErrorState message={overview.error} onRetry={overview.reload} />
          </div>
        ) : !a ? (
          <div aria-busy="true" className="mt-2 space-y-2">
            <div className="skeleton h-9 w-24 rounded-lg" />
            <div className="skeleton h-4 w-3/4 rounded" />
          </div>
        ) : a.total === 0 ? (
          <p className="mt-2 text-sm text-ink-dim">Ирц хараахан тэмдэглэгдээгүй</p>
        ) : (
          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="font-display text-4xl font-bold tabular-nums text-ink">
              {a.rate}
              <span className="text-xl text-ink-dim">%</span>
              <span className="ml-2 font-sans text-xs font-medium text-ink-dim">{a.total} хичээлээс</span>
            </p>
            <ul className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {ATTENDANCE_ORDER.map((s) => {
                const m = ATTENDANCE_MARKS[s];
                const Icon = m.icon;
                return (
                  <li key={s} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Icon className={cn("size-4 shrink-0", TONE_TEXT[m.tone])} aria-hidden />
                    <span className="text-ink-dim">{m.label}</span>
                    <b className="font-bold tabular-nums text-ink">{a[s]}</b>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {rows.status === "error" ? (
        <ErrorState message={rows.error} onRetry={rows.reload} />
      ) : rows.status === "loading" ? (
        <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-3">
          <div className="skeleton h-64 rounded-xl" />
        </div>
      ) : months.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="Ирцийн түүх алга" hint="Багш ирц тэмдэглэхэд энд хуанлиар харагдана" />
      ) : (
        <>
          {months.slice(0, shown).map(([m, days]) => (
            <MonthGrid key={m} month={m} days={days} today={today} onOpen={onOpen} />
          ))}
          {months.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + MONTH_STEP)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-semibold text-ink-dim hover:text-ink"
            >
              <ChevronDown className="size-4" aria-hidden />
              Өмнөх сарууд
            </button>
          )}
          <Legend label="Ирцийн тайлбар" className="px-1 pt-1">
            {ATTENDANCE_ORDER.map((s) => {
              const m = ATTENDANCE_MARKS[s];
              const Icon = m.icon;
              return (
                <LegendItem key={s} icon={<Icon className={cn("size-4", TONE_TEXT[m.tone])} aria-hidden />}>
                  {m.label}
                </LegendItem>
              );
            })}
          </Legend>
        </>
      )}
    </div>
  );
}

function MonthGrid({
  month,
  days,
  today,
  onOpen,
}: {
  month: string;
  days: Map<string, MyAttendanceRow>;
  today: string;
  onOpen: (date: string, classroomId: string) => void;
}) {
  const [y, mo] = month.split("-").map(Number);
  const total = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  // Даваа = 0 (эзний дүрэм: долоо хоног Даваагаас)
  const lead = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  const headingId = `att-${month}`;

  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-line bg-surface p-3 elev-1">
      <h3 id={headingId} className="mb-2 flex items-baseline justify-between px-1">
        <span className="cyrillic-heading text-sm font-bold text-ink">{monthTitle(month)}</span>
        <span className="text-xs text-ink-dim tabular-nums">{days.size} хичээл</span>
      </h3>
      <div aria-hidden className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-ink-dim">
        {WEEK_HEAD.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <ul className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((k, i) => {
          if (!k) return <li key={`e-${i}`} aria-hidden />;
          const r = days.get(k);
          const num = Number(k.slice(8, 10));
          if (!r) {
            return (
              <li
                key={k}
                aria-hidden
                className={cn(
                  "flex h-11 items-start justify-center rounded-lg pt-1.5 text-xs tabular-nums text-ink-dim/60",
                  k === today && "ring-1 ring-brand-bright",
                )}
              >
                {num}
              </li>
            );
          }
          const mark = ATTENDANCE_MARKS[r.status];
          const Icon = mark.icon;
          const label = `${dayTitle(k)}, ${mark.label}`;
          const inner = (
            <>
              <span className="leading-none">{num}</span>
              <Icon className="size-3.5" aria-hidden />
              <span className="sr-only">{label}</span>
            </>
          );
          const cls = cn(
            "flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-semibold tabular-nums",
            TONE_SELECTED[mark.tone],
            k === today && "ring-2 ring-brand-bright ring-offset-1 ring-offset-surface",
          );
          return (
            <li key={k}>
              {r.classroom ? (
                <button type="button" title={label} onClick={() => onOpen(k, r.classroom!.id)} className={cn(cls, "transition hover:opacity-80")}>
                  {inner}
                </button>
              ) : (
                <span title={label} className={cls}>
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
