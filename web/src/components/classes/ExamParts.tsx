"use client";

import { TriangleAlert } from "lucide-react";
import MathText from "@/components/MathText";
import { cn } from "@/lib/cn";
import { rateTone } from "./meta";
import { Panel } from "./OverviewTab";
import type { ClassDashboard } from "./types";

/**
 * Шалгалтын жижиг хэсгүүд — сарын торын шалгалт (тархалт, байр) ба
 * «Сэдэв, хөтөлбөр» (олон хүн алдсан бодлого, сэдвийн гүйцэтгэл).
 */

const BIN_LABELS = ["0–19", "20–39", "40–59", "60–79", "80–100"];

export function Distribution({ bins }: { bins: number[] }) {
  const max = Math.max(1, ...bins);
  return (
    <div className="grid grid-cols-5 gap-2" role="img" aria-label={`Тархалт: ${bins.map((b, i) => `${BIN_LABELS[i]}% — ${b}`).join(", ")}`}>
      {bins.map((b, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold tabular-nums text-ink">{b}</span>
          <div className="flex h-24 w-full items-end rounded-md bg-ink/5">
            <span className={cn("w-full rounded-md", i < 2 ? "bg-error/70" : i < 3 ? "bg-brand-bright/60" : "bg-success/70")} style={{ height: `${(b / max) * 100}%` }} />
          </div>
          <span className="text-[11px] tabular-nums text-ink-dim">{BIN_LABELS[i]}</span>
        </div>
      ))}
    </div>
  );
}

/** Байр — өндрөөс нь. Нэр дээр дарахад тухайн хүүхдийн товч самбар. */
export function ExamResultList({
  results,
  nameOf,
  onPick,
}: {
  results: { studentId: string; percent: number }[];
  nameOf: (id: string) => string;
  onPick?: (id: string) => void;
}) {
  if (results.length === 0) return <p className="text-sm text-ink-dim">Дүн оруулсны дараа байр гарна</p>;
  return (
    <ol className="max-h-80 divide-y divide-line overflow-y-auto" aria-label="Байр">
      {results.map((r, i) => (
        <li key={r.studentId}>
          <button
            type="button"
            onClick={() => onPick?.(r.studentId)}
            className="flex min-h-11 w-full items-center gap-2 text-left text-sm hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span className="w-6 text-right font-semibold tabular-nums text-ink-dim">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-ink">{nameOf(r.studentId)}</span>
            <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-ink/10" aria-hidden>
              <span className={cn("block h-full rounded-full", rateTone(r.percent, 80, 50))} style={{ width: `${r.percent}%` }} />
            </span>
            <span className="w-10 text-right font-semibold tabular-nums text-ink">{r.percent}%</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function TopicBar({ name, percent, note }: { name: string; percent: number | null; note?: string }) {
  return (
    <li className="text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-ink">{name}</span>
        <span className="shrink-0 tabular-nums text-ink">
          <span className="font-semibold">{percent === null ? "—" : `${percent}%`}</span>
          {note && <span className="ml-1.5 text-xs text-ink-dim">{note}</span>}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
        <span className={cn("block h-full rounded-full", rateTone(percent, 75, 50))} style={{ width: `${percent ?? 0}%` }} />
      </div>
    </li>
  );
}

/** Ангид оноосон шалгалтуудаас олон хүн алдсан бодлого */
export function MissedProblems({ problems }: { problems: ClassDashboard["problems"] }) {
  if (problems.length === 0) return null;
  return (
    <Panel icon={TriangleAlert} title="Олон хүн алдсан бодлого">
      <ul className="divide-y divide-line">
        {problems.map((p) => (
          <li key={`${p.testId}-${p.label}`} className="py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">{p.label}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-ink-dim">{p.testTitle}</span>
              <span className="shrink-0 font-semibold tabular-nums text-error">{p.percentWrong}% алдсан</span>
            </div>
            {p.statement && <MathText className="mt-1 line-clamp-2 text-ink-dim">{p.statement}</MathText>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
