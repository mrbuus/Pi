"use client";

import { useEffect, useRef } from "react";
import { formatRemaining } from "./ExamTimer";

/* ============================================================================
 * SubmitDialog — эцсийн баталгаажуулалт. Ямар ч "Тийм/Үгүй" биш, ХОЁУЛАА
 * үйлдлээ нэрлэсэн товч: "Хариултаа шалгах" (өгөгдмөл фокус, тойм руу
 * буцаана) ба "Шалгалт илгээх" (эргэлт буцалтгүй, шууд submit).
 * ========================================================================== */

export default function SubmitDialog({
  open,
  answeredCount,
  total,
  flaggedCount,
  secondsLeft,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  answeredCount: number;
  total: number;
  flaggedCount: number;
  secondsLeft: number | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;
  const unanswered = total - answeredCount;

  return (
    /* bg-black/60: модаль цонхны хараанцар (overlay) — themed фон биш тул text-white хамаарахгүй */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="submit-dialog-title"
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center"
      >
        <p id="submit-dialog-title" className="text-lg font-bold text-ink">
          Шалгалтыг илгээх үү?
        </p>
        <ul className="mt-3 space-y-1 text-sm text-ink-dim">
          <li>
            <span className="font-semibold text-ink">{answeredCount}/{total}</span> хариулсан
            {unanswered > 0 && (
              <span className="text-warning"> ({unanswered} хариулаагүй)</span>
            )}
          </li>
          <li>
            <span className="font-semibold text-ink">{flaggedCount}</span> тэмдэглэсэн
          </li>
          <li>
            Үлдсэн хугацаа:{" "}
            <span className="font-semibold text-ink">
              {secondsLeft !== null ? formatRemaining(secondsLeft) : "—"}
            </span>
          </li>
        </ul>

        <div className="mt-5 flex flex-col gap-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-brand bg-brand/10 px-5 py-3 text-sm font-bold text-ink"
          >
            Хариултаа шалгах
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-lg bg-accent-teal px-6 py-3 text-sm font-bold text-on-teal"
          >
            Шалгалт илгээх
          </button>
        </div>
      </div>
    </div>
  );
}
