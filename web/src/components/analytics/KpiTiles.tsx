"use client";

import { TriangleAlert } from "lucide-react";
import type { OverviewResponse } from "./types";

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 1) return "<1 мин";
  if (totalMin < 60) return `${totalMin} мин`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} ц ${m} мин` : `${h} цаг`;
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <p className="text-xs font-semibold text-ink-dim">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-dim">{hint}</p>}
    </div>
  );
}

export default function KpiTiles({ data }: { data: OverviewResponse }) {
  return (
    <div>
      {data.lowConfidence && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          <p>
            Идэвхийн лог (LearningEvent) зөвхөн {data.eventStreamAgeDays} өдрийн
            турш хөтлөгдсөн тул DAU/WAU/MAU болон дундаж session-ийн тоонууд
            햶аахан тогтворжоогүй байж болзошгүй.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label="DAU (өдрийн идэвхтэй)" value={String(data.dau)} />
        <Tile label="WAU (7 хоногийн)" value={String(data.wau)} />
        <Tile label="MAU (30 хоногийн)" value={String(data.mau)} />
        <Tile
          label="Дундаж session"
          value={formatDuration(data.avgSessionMs)}
        />
        <Tile
          label="Идэвхтэй сурагч"
          value={String(data.totalActiveStudents)}
          hint="сонгосон хугацаанд"
        />
        <Tile
          label="Бодсон бодлого"
          value={String(data.totalProblemsAttempted)}
          hint="сонгосон хугацаанд"
        />
      </div>
    </div>
  );
}
