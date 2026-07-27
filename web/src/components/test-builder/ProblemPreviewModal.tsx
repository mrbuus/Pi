"use client";

import { useEffect, useRef } from "react";
import ProblemStudentPreview from "@/components/ProblemStudentPreview";
import { FORMAT_LABEL, hasKnownAnswer, type Problem } from "./types";

/**
 * "Сонгосон бодлого зөв мөн үү?" — багш дэлгэцээс гарахгүйгээр бүрэн
 * харах жижиг цонх (modal). ProblemStudentPreview-г дахин ашиглаж сурагчид
 * харагдах яг ижил хэлбэрээр (зөв хариу ✓ зөвхөн багшид) харуулна.
 */
export default function ProblemPreviewModal({
  problem,
  points,
  onClose,
}: {
  problem: Problem;
  points: number;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const choices = (problem.choiceOptions ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((o) => ({ text: o.text, isCorrect: o.isCorrect }));

  const known = hasKnownAnswer(problem);
  const reviewNeeded = known && problem.analysis?.answerKeyStatus === "REVIEW_REQUIRED";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Бодлого ${problem.token} — урьдчилан харах`}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-ink-dim">{problem.token}</p>
            <p className="text-base font-bold text-ink">
              {FORMAT_LABEL[problem.format] ?? problem.format}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 shrink-0 rounded-lg border border-line px-4 py-2 text-base transition hover:border-brand"
          >
            Хаах ✕
          </button>
        </div>

        {!known && (
          <p
            role="alert"
            className="mb-3 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-base text-error"
          >
            ⚠ Энэ бодлого хариугүй импортлогдсон — тестэд орвол ХЭНД Ч оноо
            өгөхгүй (сурагчийг &ldquo;буруу&rdquo; гэж дүгнэхгүй, гэхдээ оноо ч авахгүй).
          </p>
        )}
        {reviewNeeded && (
          <p
            role="status"
            className="mb-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-base text-warning"
          >
            ⚠ Хариу шалгах шаардлагатай гэж тэмдэглэгдсэн — эх сурвалжтай
            баталгаажаагүй байж болно.
          </p>
        )}

        <ProblemStudentPreview
          statementText={problem.statementText}
          imageKey={problem.imageKey}
          format={problem.format}
          points={points}
          choices={choices}
        />

        {problem.tags && problem.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {problem.tags.map((t) => (
              <span
                key={t.tag.id}
                className="rounded bg-line/30 px-2 py-0.5 text-sm text-ink-dim"
              >
                {t.tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
