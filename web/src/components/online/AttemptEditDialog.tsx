"use client";

import { useId, useState } from "react";
import { SELF_STATE_OPTIONS } from "./selfState";

// Нэг Attempt-ийн тэмдэглэгээг засах жижиг цонх — "Устгах уу?" шиг хоосон
// баталгаажуулалт биш, ЯГ АЛЬ бодлогыг засаж буйгаа token-оор нэрлэж харуулна.
export default function AttemptEditDialog({
  open,
  problemToken,
  initialSelfState,
  saving,
  error,
  onSave,
  onCancel,
}: {
  open: boolean;
  problemToken: string;
  initialSelfState: string | null;
  saving: boolean;
  error: string | null;
  onSave: (selfState: string) => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const [selfState, setSelfState] = useState(initialSelfState ?? "SOLVED_CLEAN");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5"
      >
        <h2 id={titleId} className="text-base font-bold text-ink">
          «{problemToken}» бодлогын тэмдэглэгээг засах
        </h2>
        <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="self-state-select">
          Шинэ тэмдэглэгээ
        </label>
        <select
          id="self-state-select"
          value={selfState}
          onChange={(e) => setSelfState(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus-visible:border-brand"
        >
          {SELF_STATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50"
          >
            Болих
          </button>
          <button
            type="button"
            onClick={() => onSave(selfState)}
            disabled={saving}
            className="rounded-lg bg-brand-bright px-3 py-1.5 text-sm font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Хадгалж байна…" : "Хадгалах"}
          </button>
        </div>
      </div>
    </div>
  );
}
