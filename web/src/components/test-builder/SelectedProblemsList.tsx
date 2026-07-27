"use client";

import { useState } from "react";
import { FORMAT_LABEL, hasKnownAnswer, type Problem } from "./types";

export interface SelectedItem {
  problem: Problem;
  points: number;
}

/**
 * Алхам 3 · Оноо, дараалал — сонгосон бодлогуудыг ЯГ тестэд орох дарааллаар
 * харуулна. Чирж эрэмбэлэхийг (drag-and-drop) санаатайгаар ХЭРЭГЛЭЭГҮЙ —
 * WCAG 2.2 (2.5.7 Dragging Movements) drag-гүй ижил үйлдэл шаарддаг тул
 * дээш/доош товч л ашиглав (гар/screen-reader-д бүрэн ажиллана).
 */
export default function SelectedProblemsList({
  items,
  onMoveUp,
  onMoveDown,
  onRemove,
  onPointsChange,
  onBulkSetPoints,
  onPreview,
}: {
  items: SelectedItem[];
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
  onPointsChange: (id: string, points: number) => void;
  onBulkSetPoints: (points: number) => void;
  onPreview: (p: Problem) => void;
}) {
  const [bulkValue, setBulkValue] = useState("1");

  if (items.length === 0) {
    return (
      <p className="text-base text-ink-dim">
        Одоогоор бодлого сонгоогүй байна — Алхам 2-т буцаж сонгоно уу.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-bg p-3">
        <div>
          <label htmlFor="bulk-points" className="mb-1 block text-sm text-ink-dim">
            Бүгдэд оноо тавих
          </label>
          <input
            id="bulk-points"
            type="number"
            min={1}
            inputMode="numeric"
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="w-24 min-h-11 rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-brand"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const n = parseInt(bulkValue, 10);
            if (Number.isFinite(n) && n > 0) onBulkSetPoints(n);
          }}
          className="min-h-11 rounded-lg border border-brand-bright/40 px-4 py-2 text-base font-semibold text-brand-soft transition hover:bg-brand-bright/10"
        >
          Бүх {items.length} бодлогод хэрэглэх
        </button>
      </div>

      <ol className="space-y-2">
        {items.map(({ problem: p, points }, i) => {
          const known = hasKnownAnswer(p);
          return (
            <li
              key={p.id}
              className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${
                known ? "border-line" : "border-error/40 bg-error/5"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-bright/15 text-sm font-bold text-brand-soft">
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base text-ink">
                  {p.statementText || p.token}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="rounded bg-line/30 px-2 py-0.5 font-mono text-ink-dim">
                    {p.token}
                  </span>
                  <span className="rounded bg-brand-bright/15 px-2 py-0.5 text-brand-soft">
                    {FORMAT_LABEL[p.format] ?? p.format}
                  </span>
                  {!known && (
                    <span className="rounded border border-error/40 bg-error/10 px-2 py-0.5 font-semibold text-error">
                      ⚠ хариугүй — оноонд орохгүй
                    </span>
                  )}
                </p>
              </div>

              <label className="flex shrink-0 items-center gap-1.5 text-sm text-ink-dim">
                Оноо
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={points}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (Number.isFinite(n) && n > 0) onPointsChange(p.id, n);
                  }}
                  aria-label={`${p.token} бодлогын оноо`}
                  className="w-16 min-h-11 rounded-lg border border-line bg-bg px-2 py-2 text-base text-ink outline-none focus:border-brand"
                />
              </label>

              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onMoveUp(p.id)}
                  disabled={i === 0}
                  aria-label={`${p.token}-г дээш зөөх`}
                  className="min-h-11 min-w-11 rounded-lg border border-line px-2 text-base transition hover:border-brand disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMoveDown(p.id)}
                  disabled={i === items.length - 1}
                  aria-label={`${p.token}-г доош зөөх`}
                  className="min-h-11 min-w-11 rounded-lg border border-line px-2 text-base transition hover:border-brand disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onPreview(p)}
                  aria-label={`${p.token}-г харах`}
                  className="min-h-11 rounded-lg border border-line px-3 text-base transition hover:border-brand"
                >
                  Харах
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
                  aria-label={`${p.token}-г тестээс хасах`}
                  className="min-h-11 min-w-11 rounded-lg border border-error/40 px-2 text-base text-error transition hover:bg-error/10"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
