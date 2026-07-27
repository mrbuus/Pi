"use client";

import type { StepStatus } from "./types";

const STEP_ICON: Record<StepStatus["key"], string> = {
  theory: "📖",
  video: "🎬",
  problems: "✍️",
  test: "📝",
};

/**
 * 4 алхамын шат (rail) — "Алхам 1 · ОНОЛ" гэх мэт.
 *
 * САНААТАЙГААР ХАТУУ ТҮГЖЭЭГҮЙ: сурагч шалгалтын өмнө давтахдаа шууд Алхам 4
 * рүү үсрэх ёстой тул `disabled` төлөв ХЭЗЭЭ Ч байхгүй — зөвхөн ахиц (тик)
 * харуулна, замыг хаахгүй.
 */
export default function StepRail({
  steps,
  activeKey,
  onSelect,
}: {
  steps: StepStatus[];
  activeKey: StepStatus["key"];
  onSelect: (key: StepStatus["key"]) => void;
}) {
  const contentSteps = steps.filter((s) => s.hasContent);
  const doneCount = contentSteps.filter((s) => s.done).length;
  const percent =
    contentSteps.length > 0
      ? Math.round((doneCount / contentSteps.length) * 100)
      : 0;

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-dim">
          Явц
        </p>
        <p className="text-xs font-semibold text-brand-soft">{percent}%</p>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full bg-brand-bright transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
        {steps.map((step, idx) => {
          const active = step.key === activeKey;
          const disabled = !step.hasContent;
          return (
            <button
              key={step.key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(step.key)}
              aria-current={active ? "step" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition sm:w-full ${
                active
                  ? "border-brand-bright bg-brand-bright/12 text-brand-soft"
                  : disabled
                    ? "cursor-not-allowed border-line text-ink-dim/50"
                    : "border-line text-ink-dim hover:border-brand-bright/40 hover:text-ink"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                  step.done
                    ? "bg-success/18 text-success"
                    : step.partial
                      ? "bg-warning/18 text-warning"
                      : "bg-ink/8"
                }`}
                aria-hidden
              >
                {step.done ? "✓" : STEP_ICON[step.key]}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-wide opacity-70">
                  Алхам {idx + 1}
                </span>
                <span className="block truncate text-sm font-semibold">
                  {step.label}
                  {disabled && " · алга"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
