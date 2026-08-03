"use client";

import { AlertTriangle } from "lucide-react";
import AutosaveChip, { type SaveStatus } from "./AutosaveChip";
import ExamTimer from "./ExamTimer";

/* ============================================================================
 * ExamHeader — шалгалтын дээд тогтмол мөр: гарчиг + autosave chip + горимоос
 * гарсан тоо, навигатор товч, "Дуусгах", таймер (үргэлж НЭГ байрлалд).
 * ========================================================================== */

export default function ExamHeader({
  title,
  saveStatus,
  leaveCount,
  maxLeaves,
  answeredCount,
  totalCount,
  onOpenNavigator,
  onFinish,
  secondsLeft,
  totalSec,
}: {
  title: string;
  saveStatus: SaveStatus;
  leaveCount: number;
  maxLeaves: number;
  answeredCount: number;
  totalCount: number;
  onOpenNavigator: () => void;
  onFinish: () => void;
  secondsLeft: number | null;
  totalSec: number | null;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-bold">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <AutosaveChip status={saveStatus} />
          {leaveCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
              <AlertTriangle size={12} aria-hidden />
              <span>{leaveCount}/{maxLeaves}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenNavigator}
          aria-haspopup="dialog"
          className="flex min-h-11 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink-dim transition hover:text-ink"
          title="Бодлогын навигатор"
        >
          ▦ {answeredCount}/{totalCount}
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="flex min-h-11 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink-dim transition hover:text-ink"
        >
          Дуусгах
        </button>
        <ExamTimer secondsLeft={secondsLeft} totalSec={totalSec} />
      </div>
    </header>
  );
}
