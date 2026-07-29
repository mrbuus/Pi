"use client";

import { useMemo } from "react";
import { STATUS_META, STATUS_ORDER } from "./statusMeta";
import type { SubTask, Task } from "./types";

const MONTH_LABELS = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

const PX_PER_DAY = 2.6;
const LABEL_COL_WIDTH = 176;

interface DateRange {
  start: Date;
  end: Date;
}

function toRange(task: Task | SubTask): DateRange | null {
  if (!task.startDate && !task.dueDate) return null;
  const start = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!);
  const end = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!);
  return { start, end: end < start ? start : end };
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * ХУГАЦАА (timeline) харагдац — сонгосон жилийн 12 сарыг дээгүүр, даалгавар
 * бүрийг хэвтээ зурвас (bar) болгож харуулна. Хэвтээ чиглэлд гүйлгэдэг тул
 * жижиг дэлгэц (утас)-нд ч уншигдана. Өнөөдрийг босоо шугамаар тэмдэглэнэ.
 */
export default function TimelineView({
  tasks,
  year,
  onYearChange,
}: {
  tasks: Task[];
  year: number;
  onYearChange: (year: number) => void;
}) {
  const yearStart = useMemo(() => new Date(year, 0, 1), [year]);
  const yearEndExclusive = useMemo(() => new Date(year + 1, 0, 1), [year]);
  const totalDays = daysBetween(yearStart, yearEndExclusive);
  const totalWidth = totalDays * PX_PER_DAY;

  const months = useMemo(() => {
    return MONTH_LABELS.map((label, m) => {
      const start = new Date(year, m, 1);
      const end = new Date(year, m + 1, 1);
      const offsetDays = daysBetween(yearStart, start);
      const widthDays = daysBetween(start, end);
      return { label, left: offsetDays * PX_PER_DAY, width: widthDays * PX_PER_DAY };
    });
  }, [year, yearStart]);

  const today = new Date();
  const todayOffsetDays = daysBetween(yearStart, today);
  const showToday = todayOffsetDays >= 0 && todayOffsetDays <= totalDays;
  const todayLeft = LABEL_COL_WIDTH + todayOffsetDays * PX_PER_DAY;

  function overlapsYear(r: DateRange) {
    return r.end >= yearStart && r.start < yearEndExclusive;
  }

  function barStyle(r: DateRange) {
    const clampedStart = r.start < yearStart ? yearStart : r.start;
    const clampedEnd = r.end > yearEndExclusive ? yearEndExclusive : r.end;
    const left = daysBetween(yearStart, clampedStart) * PX_PER_DAY;
    const widthDays = Math.max(1, daysBetween(clampedStart, clampedEnd));
    const width = Math.max(widthDays * PX_PER_DAY, 10);
    return { left, width };
  }

  const rows = useMemo(() => {
    return tasks
      .map((task) => {
        const range = toRange(task);
        const subtaskRows = task.subtasks
          .map((sub) => ({ sub, range: toRange(sub) }))
          .filter(
            (r): r is { sub: SubTask; range: DateRange } =>
              !!r.range && overlapsYear(r.range),
          );
        const taskVisible = !!range && overlapsYear(range);
        if (!taskVisible && subtaskRows.length === 0) return null;
        return { task, range: taskVisible ? range : null, subtaskRows };
      })
      .filter((r): r is NonNullable<typeof r> => !!r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, year]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            aria-label="Өмнөх жил"
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-dim transition hover:text-ink"
          >
            ‹
          </button>
          <span className="min-w-16 text-center text-base font-bold text-ink">{year}</span>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            aria-label="Дараагийн жил"
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-dim transition hover:text-ink"
          >
            ›
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {STATUS_ORDER.map((s) => {
            const meta = STATUS_META[s];
            return (
              <span key={s} className={`flex items-center gap-1 ${meta.colorClass}`}>
                <meta.icon className="h-3 w-3" aria-hidden />
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-panel px-4 py-6 text-center text-sm text-ink-dim">
          {year} онд огноотой даалгавар алга.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <div
            className="relative"
            style={{ width: LABEL_COL_WIDTH + totalWidth, minWidth: "100%" }}
          >
            {showToday && (
              <div
                aria-hidden
                className="pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 bg-error"
                style={{ left: todayLeft }}
              >
                <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded bg-error px-1 text-[10px] font-bold text-on-error">
                  Өнөөдөр
                </span>
              </div>
            )}

            {/* Сарын толгой */}
            <div className="sticky top-0 z-10 flex border-b border-line bg-surface">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-line bg-surface"
                style={{ width: LABEL_COL_WIDTH }}
              />
              <div className="relative h-8" style={{ width: totalWidth }}>
                {months.map((m) => (
                  <div
                    key={m.label}
                    className="absolute top-0 h-full border-l border-line/60 pl-1 text-xs font-semibold text-ink-dim"
                    style={{ left: m.left, width: m.width }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Даалгаврын мөрүүд */}
            <div>
              {rows.map(({ task, range, subtaskRows }) => (
                <div key={task.id}>
                  <div className="flex items-center border-b border-line/60">
                    <div
                      className="sticky left-0 z-10 shrink-0 truncate border-r border-line bg-surface px-2 py-2 text-sm text-ink"
                      style={{ width: LABEL_COL_WIDTH }}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                    <div className="relative h-9" style={{ width: totalWidth }}>
                      {range && (
                        <TimelineBar task={task} pos={barStyle(range)} />
                      )}
                    </div>
                  </div>
                  {subtaskRows.map(({ sub, range: subRange }) => (
                    <div key={sub.id} className="flex items-center border-b border-line/60">
                      <div
                        className="sticky left-0 z-10 shrink-0 truncate border-r border-line bg-surface py-1.5 pl-6 pr-2 text-xs text-ink-dim"
                        style={{ width: LABEL_COL_WIDTH }}
                        title={sub.title}
                      >
                        ↳ {sub.title}
                      </div>
                      <div className="relative h-7" style={{ width: totalWidth }}>
                        <TimelineBar task={sub} pos={barStyle(subRange)} small />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineBar({
  task,
  pos,
  small,
}: {
  task: Task | SubTask;
  pos: { left: number; width: number };
  small?: boolean;
}) {
  const meta = STATUS_META[task.status];
  return (
    <div
      className={`absolute ${small ? "top-1 h-5" : "top-1.5 h-6"} flex items-center gap-1 overflow-hidden rounded-md border-l-4 ${meta.barBorderClass} ${meta.barBgClass} px-1.5 text-[11px] font-medium text-ink`}
      style={{ left: pos.left, width: pos.width }}
      title={`${task.title} — ${meta.label}`}
    >
      <meta.icon className={`h-3 w-3 shrink-0 ${meta.colorClass}`} aria-hidden />
      <span className="truncate">{task.title}</span>
    </div>
  );
}
