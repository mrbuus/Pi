"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { CalendarX2, ChevronRight, Clock, Users } from "lucide-react";
import { getClassroomColor } from "@/lib/classroomColor";
import { millions, monthName } from "./ledgerFormat";
import type { ClassStat, LedgerOverview } from "./ledgerTypes";

/** Энэ сарын төлөвийн зурвас: төлсөн | хугацаа хэтэрсэн | болоогүй. */
export function MonthBar({ s, className = "h-2" }: { s: Pick<ClassStat, "expected" | "covered" | "late">; className?: string }) {
  const total = Math.max(1, s.expected);
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / total) * 100))}%`;
  const rest = Math.max(0, s.expected - s.covered - s.late);
  return (
    <div
      role="img"
      aria-label={`Төлсөн ${millions(s.covered)}, хугацаа хэтэрсэн ${millions(s.late)}, болоогүй ${millions(rest)}`}
      className={`flex w-full overflow-hidden rounded-full bg-ink/10 ${className}`}
    >
      <span className="bg-success" style={{ width: pct(s.covered) }} />
      <span className="bg-error/45" style={{ width: pct(s.late) }} />
    </div>
  );
}

function Legend({ s }: { s: ClassStat }) {
  const rest = Math.max(0, s.expected - s.covered - s.late);
  const items = [
    { cls: "bg-success", label: "Төлсөн", v: s.covered },
    { cls: "bg-error/45", label: "Хэтэрсэн", v: s.late },
    { cls: "bg-ink/15", label: "Болоогүй", v: rest },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2 text-sm">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs text-ink-dim">
            <span aria-hidden className={`h-2 w-2 rounded-full ${i.cls}`} />
            {i.label}
          </dt>
          <dd className="font-bold tabular-nums text-ink">{millions(i.v)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Төвийн хураангуй + анги бүрийн мөр. */
export default function ClassOverview({
  data,
  onShowProblems,
  onShowPromises,
  onShowPending,
}: {
  data: LedgerOverview;
  onShowProblems: () => void;
  onShowPromises: () => void;
  onShowPending: () => void;
}) {
  const t = data.totals;
  return (
    <div className="space-y-4">
      <section className="chunky space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold text-ink">{monthName(data.month)}</h2>
          <p className="text-sm text-ink-dim">
            <span className="font-bold tabular-nums text-ink">{millions(t.covered)}</span> / {millions(t.expected)}
          </p>
        </div>
        <MonthBar s={t} className="h-3" />
        <Legend s={t} />
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={onShowProblems}
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-error/10 px-3 py-2 text-left hover:bg-error/15"
          >
            <span>
              <span className="block text-xs text-ink-dim">Өртэй</span>
              <span className="font-bold tabular-nums text-ink">
                {t.owedStudents} сурагч <span className="font-semibold text-error">{millions(t.owedNow)}</span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-ink-dim" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onShowPromises}
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-ink/5 px-3 py-2 text-left hover:bg-ink/10"
          >
            <span>
              <span className="block text-xs text-ink-dim">Амлалт тасарсан</span>
              <span className="inline-flex items-center gap-1.5 font-bold tabular-nums text-ink">
                <CalendarX2 className="h-4 w-4 text-error" aria-hidden />
                {t.brokenPromises}
                <span className="text-sm font-normal text-ink-dim">хүлээгдэж буй {t.upcomingPromises}</span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-ink-dim" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onShowPending}
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-ink/5 px-3 py-2 text-left hover:bg-ink/10"
          >
            <span>
              <span className="block text-xs text-ink-dim">Батлах төлбөр</span>
              <span className="inline-flex items-center gap-1.5 font-bold tabular-nums text-ink">
                <Clock className="h-4 w-4 text-info" aria-hidden />
                {t.pending.count}
                {t.pending.count > 0 && <span className="text-sm font-normal text-ink-dim">{millions(t.pending.amount)}</span>}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-ink-dim" aria-hidden />
          </button>
        </div>
      </section>

      <ul className="chunky divide-y divide-line p-1.5">
        {data.classes.map((c) => (
          <li key={c.id}>
            <Link
              href={`/app/payments/class/${encodeURIComponent(c.id)}`}
              style={{ "--cls": getClassroomColor(c.id) } as CSSProperties}
              className="class-row class-row-interactive grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-lg px-3 py-2.5 sm:grid-cols-[12rem_1fr_9rem_auto]"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink">{c.name}</span>
                <span className="flex items-center gap-1 text-xs text-ink-dim">
                  <Users className="h-3.5 w-3.5" aria-hidden /> {c.students}
                </span>
              </span>
              <span className="order-3 col-span-2 sm:order-none sm:col-span-1">
                <MonthBar s={c} />
                <span className="mt-1 block text-xs tabular-nums text-ink-dim">
                  {millions(c.covered)} / {millions(c.expected)}
                </span>
              </span>
              <span className="text-right text-sm">
                {c.owedStudents > 0 ? (
                  <span className="font-semibold text-error">
                    {c.owedStudents} өртэй
                    <span className="block text-xs font-normal tabular-nums text-ink-dim">{millions(c.owedNow)}</span>
                  </span>
                ) : (
                  <span className="text-success">Өргүй</span>
                )}
              </span>
              <span className="hidden items-center gap-1 sm:flex">
                {c.brokenPromises > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-error" title="Амлалт тасарсан">
                    <CalendarX2 className="h-4 w-4" aria-label="Амлалт тасарсан" />
                    {c.brokenPromises}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-ink-dim" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {t.unassigned > 0 && <p className="text-sm text-ink-dim">Ангигүй {t.unassigned} сурагч хайлтаар олдоно</p>}
    </div>
  );
}
