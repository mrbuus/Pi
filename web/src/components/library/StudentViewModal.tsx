"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import ProblemStudentPreview from "@/components/ProblemStudentPreview";

/**
 * «Нүд» дүрс — бодлого сурагч, худалдан авагчид ЯГ хэрхэн харагдахыг
 * (шалгалтын дэлгэцийн картаар) шалгах цонх. Зөв хариуны тэмдэг харуулахгүй —
 * сурагч ч харахгүй тул.
 */
export default function StudentViewModal({
  statementText,
  imageKey,
  format,
  points,
  choices,
  onClose,
}: {
  statementText?: string | null;
  imageKey?: string | null;
  format: string;
  points: number;
  choices: { text: string; imageKey?: string | null }[];
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Сурагчид харагдах байдал"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-surface p-4 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-bold text-ink">Сурагч, худалдан авагчид ингэж харагдана</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <ProblemStudentPreview
          statementText={statementText}
          imageKey={imageKey}
          format={format}
          points={points}
          choices={choices.map((c) => ({ ...c, isCorrect: false }))}
        />
      </div>
    </div>
  );
}
