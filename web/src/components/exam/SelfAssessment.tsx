"use client";

/* ============================================================================
 * SelfAssessment — "Би энэ бодлогыг:" адаптив тэмдэглэгээ (SPEC §9.1).
 * Зөвхөн клиент/навигаторт зориулсан, дүнд нөлөөгүй.
 * ========================================================================== */

export const SELF_STATES = [
  { value: "SOLVED_CLEAN", label: "Алдаагүй", tone: "ok" },
  { value: "FIXED_AFTER_ERROR", label: "Зассан", tone: "warn" },
  { value: "FAILED", label: "Алдсан", tone: "bad" },
  { value: "GUESSED", label: "Буудсан", tone: "guess" },
] as const;

const SELF_TONE: Record<string, string> = {
  ok: "bg-success/15 text-success border-success/40",
  warn: "bg-warning/15 text-warning border-warning/40",
  bad: "bg-error/15 text-error border-error/40",
  guess: "bg-accent-violet/15 text-accent-violet border-accent-violet/40",
};

export default function SelfAssessment({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="mb-2 text-xs text-ink-dim">Би энэ бодлогыг:</p>
      <div className="flex flex-wrap gap-1.5">
        {SELF_STATES.map((s) => {
          const sel = value === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange(s.value)}
              aria-pressed={sel}
              className={`flex min-h-11 items-center justify-center rounded-lg border px-3 text-xs transition ${
                sel ? SELF_TONE[s.tone] : "border-line text-ink-dim"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
