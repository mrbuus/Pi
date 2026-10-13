"use client";

import { useState } from "react";
import { CalendarRange, Repeat, Save } from "lucide-react";
import { api } from "@/lib/api";
import type { RosterMode, TeacherRosterConfig } from "../types";

const MODES: { key: RosterMode; label: string; icon: typeof Repeat }[] = [
  { key: "FIXED", label: "Тогтмол", icon: CalendarRange },
  { key: "ALTERNATING", label: "Сондгой / Тэгш", icon: Repeat },
];

/**
 * Хүснэгтийн горим (7 хоног бүр ижил эсвэл сондгой/тэгш ээлж) ба хүчинтэй
 * хугацаа. Горим солиход хоёр хүснэгтийн аль аль нь хадгалагдсан хэвээр —
 * зөвхөн аль нь хэрэгжихийг сольно.
 */
export default function RosterSettings({
  config,
  onSaved,
}: {
  config: TeacherRosterConfig;
  onSaved: (c: TeacherRosterConfig) => void;
}) {
  const [mode, setMode] = useState<RosterMode>(config.mode);
  const [from, setFrom] = useState(config.validFrom ?? "");
  const [to, setTo] = useState(config.validTo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = mode !== config.mode || from !== (config.validFrom ?? "") || to !== (config.validTo ?? "");
  const invalid = !!from && !!to && from > to;

  async function save(next: { mode: RosterMode; from: string; to: string }) {
    setSaving(true);
    setError(null);
    try {
      const r = await api<TeacherRosterConfig>("/schedule/teacher-workdays/config", {
        method: "PUT",
        body: { mode: next.mode, validFrom: next.from || null, validTo: next.to || null },
      });
      onSaved(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Хадгалж чадсангүй");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-dim">Хүснэгтийн төрөл</span>
          <div role="radiogroup" aria-label="Хүснэгтийн төрөл" className="flex gap-1.5">
            {MODES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                disabled={saving}
                onClick={() => {
                  setMode(key);
                  // Горим солих нь ганц товшилт — шууд хадгална
                  void save({ mode: key, from, to });
                }}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition disabled:opacity-60 ${
                  mode === key
                    ? "border-brand-bright bg-brand-bright text-on-brand"
                    : "border-line bg-panel text-ink hover:border-brand"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-dim">Хүчинтэй эхлэх</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-ink-dim">Дуусах</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={!dirty || invalid || saving}
          onClick={() => save({ mode, from, to })}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-panel px-3 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden />
          Хадгалах
        </button>
      </div>
      {invalid && <p className="mt-2 text-xs text-warning">Эхлэх огноо дуусахаас хойш байна.</p>}
      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
