"use client";

import { useId } from "react";

/**
 * Ерөнхий баталгаажуулах цонх — устгах болон хадгалаагүй өөрчлөлт хаях үед
 * ХОЁУЛАНД нь ашиглана (TaskFormModal-тай ижил дизайн хэв маяг: overlay +
 * rounded-2xl surface dialog).
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Тийм",
  cancelLabel = "Болих",
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5"
      >
        <h2 id={titleId} className="text-base font-bold text-ink">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-ink-dim">{description}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
              danger
                ? "bg-error text-on-error hover:opacity-90"
                : "bg-brand-bright text-on-brand hover:opacity-90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
