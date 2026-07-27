"use client";

import { useState } from "react";
import type { DateRangeValue } from "./types";

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

type PresetId = "7d" | "30d" | "quarter" | "custom";

const PRESETS: { id: PresetId; label: string; days?: number }[] = [
  { id: "7d", label: "Сүүлийн 7 хоног", days: 6 },
  { id: "30d", label: "Сүүлийн 30 хоног", days: 29 },
  // "Улирал"-ын яг эхлэл/төгсгөлийг тодорхойлсон хуанли (АНТИК хугацаа) одоогоор
  // системд алга тул сүүлийн 90 хоногоор ойролцоолно — багш нар үүнийг мэдэж
  // байх ёстой тул badge дээр тайлбарласан.
  { id: "quarter", label: "Энэ улирал", days: 89 },
  { id: "custom", label: "Өөрөө сонгох" },
];

export default function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
}) {
  const [active, setActive] = useState<PresetId>("30d");

  function choose(preset: (typeof PRESETS)[number]) {
    setActive(preset.id);
    if (preset.id === "custom") return; // input талбарууд өөрсдөө onChange дуудна
    const to = new Date();
    to.setUTCHours(0, 0, 0, 0);
    const from = daysAgo(preset.days ?? 29);
    onChange({ from: toKey(from), to: toKey(to) });
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label="Хугацааны муж сонгох"
        className="flex flex-wrap gap-1.5"
      >
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => choose(p)}
            aria-pressed={active === p.id}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active === p.id
                ? "bg-brand-bright text-on-brand"
                : "border border-line text-ink-dim hover:text-ink"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {active === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1.5 text-ink-dim">
            Эхлэх
            <input
              type="date"
              value={value.from}
              max={value.to}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className="rounded-lg border border-line bg-bg px-2 py-1 text-ink"
            />
          </label>
          <label className="flex items-center gap-1.5 text-ink-dim">
            Дуусах
            <input
              type="date"
              value={value.to}
              min={value.from}
              max={toKey(new Date())}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className="rounded-lg border border-line bg-bg px-2 py-1 text-ink"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function defaultRange(): DateRangeValue {
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  return { from: toKey(daysAgo(29)), to: toKey(to) };
}
