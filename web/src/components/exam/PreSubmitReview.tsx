"use client";

import { Check } from "lucide-react";
import { formatRemaining } from "./ExamTimer";

/* ============================================================================
 * PreSubmitReview — эцсийн илгээхийн өмнөх ДҮҮРЭН ДЭЛГЭЦИЙН тойм.
 * Хариулаагүй болон тэмдэглэсэн бодлого бүр рүү шууд очих холбоостой.
 * ========================================================================== */

export interface ReviewCell {
  id: string;
  answered: boolean;
  flagged: boolean;
}

export default function PreSubmitReview({
  cells,
  secondsLeft,
  onJump,
  onBack,
  onOpenSubmit,
}: {
  cells: ReviewCell[];
  secondsLeft: number | null;
  onJump: (index: number) => void;
  onBack: () => void;
  onOpenSubmit: () => void;
}) {
  const total = cells.length;
  const answeredCount = cells.filter((c) => c.answered).length;
  const unanswered = cells
    .map((c, i) => ({ ...c, n: i + 1 }))
    .filter((c) => !c.answered);
  const flagged = cells
    .map((c, i) => ({ ...c, n: i + 1 }))
    .filter((c) => c.flagged);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-extrabold text-ink">Илгээхээсээ өмнө шалгах</h1>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-line bg-panel p-3 text-center">
          <p className="text-2xl font-extrabold text-ink">
            {answeredCount}
            <span className="text-sm text-ink-dim"> / {total}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-ink-dim">хариулсан</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-3 text-center">
          <p className="text-2xl font-extrabold text-ink">{flagged.length}</p>
          <p className="mt-0.5 text-[11px] text-ink-dim">тэмдэглэсэн</p>
        </div>
        <div className="rounded-xl border border-line bg-panel p-3 text-center">
          <p className="text-2xl font-extrabold text-ink">
            {secondsLeft !== null ? formatRemaining(secondsLeft) : "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-dim">үлдсэн хугацаа</p>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-ink">
          Хариулаагүй бодлого{unanswered.length > 0 ? ` (${unanswered.length})` : ""}
        </h2>
        {unanswered.length === 0 ? (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <Check size={16} aria-hidden />
            Бүх бодлогыг хариулсан байна.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unanswered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onJump(c.n - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-sm font-bold text-ink-dim transition hover:border-brand hover:text-ink"
              >
                {c.n}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-ink">
          Тэмдэглэсэн бодлого{flagged.length > 0 ? ` (${flagged.length})` : ""}
        </h2>
        {flagged.length === 0 ? (
          <p className="text-sm text-ink-dim">Тэмдэглэсэн бодлого алга.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {flagged.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onJump(c.n - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-warning/60 bg-warning/10 text-sm font-bold text-warning transition hover:bg-warning/20"
              >
                {c.n}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3 pb-6">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-line px-5 py-3 font-semibold text-ink transition hover:border-brand"
        >
          Буцаж бодох
        </button>
        <button
          type="button"
          onClick={onOpenSubmit}
          className="flex-1 rounded-xl bg-accent-teal py-3 font-bold text-on-teal"
        >
          Шалгалт илгээх
        </button>
      </div>
    </div>
  );
}
