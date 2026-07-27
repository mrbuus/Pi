"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { TestPickerRow } from "./types";
import { errMsg } from "./format";

function testLabel(t: TestPickerRow): string {
  const topic = t.chapter?.topic?.name ?? t.chapter?.title;
  return topic ? `${t.title} · ${topic}` : t.title;
}

export default function AssignTestDialog({
  open,
  saving,
  error,
  onAssign,
  onCancel,
}: {
  open: boolean;
  saving: boolean;
  error: string | null;
  onAssign: (testId: string, note: string) => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<TestPickerRow | null>(null);
  const [tests, setTests] = useState<TestPickerRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || tests) return;
    api<TestPickerRow[]>("/tests")
      .then(setTests)
      .catch((e) => setLoadError(errMsg(e)));
  }, [open, tests]);

  const filtered = useMemo(() => {
    if (!tests) return [];
    const q = query.trim().toLowerCase();
    if (!q) return tests.slice(0, 30);
    return tests
      .filter((t) => testLabel(t).toLowerCase().includes(q))
      .slice(0, 30);
  }, [tests, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-line bg-surface p-5"
      >
        <h2 id={titleId} className="text-base font-bold text-ink">
          Тест оноох
        </h2>

        <label className="sr-only" htmlFor="test-search">
          Тестийн нэрээр хайх
        </label>
        <input
          id="test-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder="Тестийн нэрээр хайх…"
          className="mt-3 w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-dim/70 focus-visible:border-brand"
        />

        {loadError && <p className="mt-2 text-sm text-error">{loadError}</p>}

        <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-line">
          {!tests && !loadError && (
            <p className="p-3 text-sm text-ink-dim">Ачаалж байна…</p>
          )}
          {tests && filtered.length === 0 && (
            <p className="p-3 text-sm text-ink-dim">Тохирох тест олдсонгүй.</p>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t)}
              className={`block w-full truncate px-3 py-2 text-left text-sm transition ${
                selected?.id === t.id
                  ? "bg-brand-bright/15 text-brand-soft"
                  : "text-ink hover:bg-panel"
              }`}
            >
              {testLabel(t)}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="assign-note">
          Тэмдэглэл (заавал биш)
        </label>
        <textarea
          id="assign-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus-visible:border-brand"
        />

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
            disabled={!selected || saving}
            onClick={() => selected && onAssign(selected.id, note.trim())}
            className="rounded-lg bg-brand-bright px-3 py-1.5 text-sm font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Оноож байна…" : "Оноох"}
          </button>
        </div>
      </div>
    </div>
  );
}
