"use client";

import { Progress } from "@/components/ui/kit/progress";
import { BAR_FILL } from "@/components/exams/analytics";
import { toneOf } from "./types";

/** «Агуулгын төрлөөр — гүйцэтгэл %»: агуулга бүр нэг мөр (нэр, мөр, хувь). */
export default function AreaBars({
  areas,
  compare,
  compareLabel,
}: {
  areas: { area: string; pct: number | null }[];
  /** Харьцуулах хувь (жиш: төвийн дундаж) — мөрийн ард жижиг тоогоор */
  compare?: Map<string, number | null>;
  compareLabel?: string;
}) {
  if (areas.length === 0) {
    return <p className="text-sm text-ink-dim">Бодлогуудад агуулга оноогоогүй байна.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {areas.map((a) => {
        const other = compare?.get(a.area);
        return (
          <li key={a.area} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
            <span className="text-sm font-semibold text-ink">{a.area}</span>
            <Progress
              value={a.pct ?? 0}
              indicatorClassName={BAR_FILL[toneOf(a.pct)]}
              className="order-3 col-span-2 h-2.5 sm:order-none sm:col-span-1"
              aria-label={`${a.area} ${a.pct ?? 0}%`}
            />
            <span className="text-right text-sm tabular-nums">
              <span className="font-bold text-ink">{a.pct === null ? "" : `${a.pct}%`}</span>
              {other !== undefined && other !== null && (
                <span className="ml-1.5 text-xs text-ink-dim" title={compareLabel}>
                  {compareLabel ? `${compareLabel} ` : ""}
                  {other}%
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
