"use client";

/* ============================================================================
 * QuestionFooterNav — доод навигацийн мөр: Өмнөх / Тэмдэглэх / Дараах-Тойм.
 * ========================================================================== */

export default function QuestionFooterNav({
  canGoPrev,
  onPrev,
  flagged,
  onToggleFlag,
  isLast,
  onNext,
  onReview,
}: {
  canGoPrev: boolean;
  onPrev: () => void;
  flagged: boolean;
  onToggleFlag: () => void;
  isLast: boolean;
  onNext: () => void;
  onReview: () => void;
}) {
  return (
    <div className="mx-auto mt-5 flex max-w-2xl items-center gap-2 pb-6 sm:gap-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        className="rounded-xl border border-line px-4 py-3 font-semibold text-ink transition disabled:opacity-30 sm:px-5"
      >
        ← Өмнөх
      </button>
      <button
        type="button"
        onClick={onToggleFlag}
        aria-pressed={flagged}
        className={`flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition sm:text-sm ${
          flagged ? "border-warning bg-warning/10 text-warning" : "border-line text-ink-dim hover:text-ink"
        }`}
      >
        <span aria-hidden>⚑</span>
        <span className="hidden sm:inline">{flagged ? "Тэмдэглэсэн" : "Дараа эргэж харах"}</span>
      </button>
      {!isLast ? (
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-xl bg-brand-bright py-3 font-bold text-on-brand"
        >
          Дараах →
        </button>
      ) : (
        <button
          type="button"
          onClick={onReview}
          className="flex-1 rounded-xl bg-accent-teal py-3 font-bold text-on-teal"
        >
          Тойм харах
        </button>
      )}
    </div>
  );
}
