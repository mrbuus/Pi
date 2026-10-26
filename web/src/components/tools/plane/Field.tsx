"use client";

import { useState, type ReactNode } from "react";

/* ============================================================================
 * Том тоон оролт (утсанд): 16px үсэг (iOS томруулдаггүй), тоон гар
 * (inputmode=decimal), бичих зуур шууд шинэчилнэ, доор нь гулсуур.
 * core/ToolFrame-ийн NumberField-ээс том — зөвхөн энэ хэрэгсэлд.
 * ========================================================================== */

interface Props {
  label: ReactNode;
  /** Дэлгэц уншигчид (label нь томьёо бол) */
  name: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: ReactNode;
}

const show = (v: number) => String(Number(v.toFixed(4)));

export default function Field({ label, name, value, onChange, min, max, step = 0.5, suffix }: Props) {
  // Бичиж байх үеийн ноорог; бусад үед утгаас (гулсуур, чирэлтээр өөрчлөгдсөн ч)
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? show(value);

  const parse = (s: string) => parseFloat(s.replace(",", "."));
  const type = (s: string) => {
    setDraft(s);
    const v = parse(s);
    if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
  };
  const finish = () => {
    const v = parse(text);
    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
    setDraft(null);
  };

  return (
    <div className="min-w-0">
      <label className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-sm text-ink-dim">{label}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <input
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            value={text}
            onFocus={(e) => {
              setDraft(show(value));
              e.currentTarget.select();
            }}
            onChange={(e) => type(e.target.value)}
            onBlur={finish}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            className="h-12 w-24 rounded-xl border border-line bg-bg px-3 text-right text-base font-medium tabular-nums text-ink"
            aria-label={name}
          />
          {suffix && <span className="w-3 text-sm text-ink-dim">{suffix}</span>}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="mt-1 h-8 w-full accent-[var(--brand-bright)]"
        aria-label={`${name} гулсуур`}
      />
    </div>
  );
}
