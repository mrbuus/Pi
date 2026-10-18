"use client";

import { FileCheck, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Meta } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/StateBlock";
import { cn } from "@/lib/cn";
import { Legend, LegendItem, ScoreBar } from "../classes/common";
import { dayMonth } from "../classes/format";
import { classExams, type DemoClass, type DemoStudent } from "../world";

/** Явцын шалгалтын оноо ба ангийн дундаж: оноог өнгөт мөрөөр, ангийн дундажийг босоо зураасаар харуулна */
export default function ExamsTab({ cls, student }: { cls: DemoClass; student: DemoStudent }) {
  const exams = useMemo(() => classExams(cls).filter((e) => student.joinedOn <= e.dateKey), [cls, student]);
  const taken = exams.filter((e) => e.scores[student.id] !== undefined);

  if (!exams.length) {
    return <EmptyState icon={FileCheck} title="Явцын шалгалт одоогоор байхгүй" hint="Анги шалгалт өгсний дараа оноо нь энд гарна" />;
  }

  const own = taken.length ? Math.round(taken.reduce((s, e) => s + e.scores[student.id], 0) / taken.length) : null;
  const classAvg = taken.length ? Math.round(taken.reduce((s, e) => s + e.average, 0) / taken.length) : null;
  const diff = own !== null && classAvg !== null ? own - classAvg : null;

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-line p-3">
          <p className="text-xs font-semibold text-ink-dim">Сурагчийн дундаж</p>
          <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-ink">{own === null ? "—" : `${own}%`}</p>
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="text-xs font-semibold text-ink-dim">Ангийн дундаж</p>
          <p className="mt-0.5 font-display text-lg font-bold tabular-nums text-ink">{classAvg === null ? "—" : `${classAvg}%`}</p>
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="text-xs font-semibold text-ink-dim">Зөрүү</p>
          <p className={cn("mt-0.5 flex items-center gap-1 font-display text-lg font-bold tabular-nums", diff === null ? "text-ink" : diff < 0 ? "text-error" : "text-success")}>
            {diff !== null && (diff < 0 ? <TrendingDown className="size-4" aria-hidden /> : <TrendingUp className="size-4" aria-hidden />)}
            {diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff}`}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {exams.map((e) => {
          const v = e.scores[student.id];
          const d = v === undefined ? null : v - e.average;
          return (
            <li key={e.id} className="rounded-xl border border-line p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-ink-dim">
                    <Meta items={[dayMonth(e.dateKey), `Ангийн дундаж ${e.average}%`]} />
                  </p>
                  <p className="cyrillic-tight text-sm font-semibold text-ink">{e.title}</p>
                </div>
                {v === undefined ? (
                  <span className="shrink-0 rounded-lg border border-dashed border-line px-2 py-1 text-xs font-semibold text-ink-dim">Өгөөгүй</span>
                ) : (
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-lg font-bold tabular-nums text-ink">{v}%</span>
                    {d !== null && (
                      <span className={cn("block text-xs font-semibold tabular-nums", d < 0 ? "text-error" : "text-success")}>
                        {d > 0 ? "+" : ""}
                        {d}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {v !== undefined && <ScoreBar value={v} avg={e.average} className="mt-2" />}
            </li>
          );
        })}
      </ul>

      <Legend>
        <LegendItem>
          <span aria-hidden className="block h-2 w-5 rounded-full bg-brand-bright" />
          Сурагчийн оноо
        </LegendItem>
        <LegendItem>
          <span aria-hidden className="block h-3 w-0.5 bg-ink" />
          Босоо зураас: ангийн дундаж
        </LegendItem>
        <LegendItem>Зөрүү: сурагчийн оноо ба ангийн дундажийн ялгавар</LegendItem>
      </Legend>
    </div>
  );
}
