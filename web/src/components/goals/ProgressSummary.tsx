import type { Goal } from "./types";
import { daysUntil } from "./statusMeta";

/** Зорилтуудын нэгдсэн явцыг харуулах — биелсэн тоо/хувь + хугацаа
 * хэтэрсэн зорилтын тоог нэг харцаар харуулна. */
export default function ProgressSummary({ goals }: { goals: Goal[] }) {
  const active = goals.filter((g) => g.status !== "CANCELLED");
  const done = active.filter((g) => g.status === "DONE").length;
  const total = active.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const overdue = active.filter(
    (g) =>
      g.status !== "DONE" && g.targetDate && daysUntil(g.targetDate) < 0,
  ).length;

  if (total === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-brand-soft">Явц</h2>
        <p className="text-sm text-ink-dim">
          <span className="font-semibold text-ink">{done}</span> / {total} зорилго биелсэн
        </p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-success transition-all"
          style={{ width: `${Math.max(percent, done > 0 ? 4 : 0)}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-ink-dim">{percent}% гүйцэтгэсэн</span>
        {overdue > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-error/15 px-2.5 py-0.5 text-xs font-semibold text-error">
            ⚠ {overdue} зорилтот хугацаа хэтэрсэн
          </span>
        )}
      </div>
    </div>
  );
}
