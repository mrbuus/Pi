"use client";

import { useEffect, useRef } from "react";
import { secondaryBtn } from "./ui";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Устгах гэж буй ТУХАЙН бичлэгийг нэрлэж, юу болохыг тодорхой хэлнэ. */
  description: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  /** Тодорхой нөхцөл хангагдаагүй үед (ж: cascade сонгоогүй) товчийг идэвхгүй болгоно. */
  disableConfirm?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Бүх устгах/эргэлт буцалтгүй үйлдлийн баталгаажуулалт энэ нэг цонхоор
// дамжина — "Устгах уу?" гэсэн хоосон асуулт ХЭЗЭЭ Ч гарахгүй, дуудагч тал
// description-д тухайн бичлэгийн нэр/токен + үр дагаврыг заавал бичнэ.
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  busy,
  disableConfirm,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="mb-2 text-lg font-bold">
          {title}
        </h2>
        <div className="mb-5 text-sm leading-relaxed text-ink-dim">
          {description}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className={secondaryBtn}>
            Болих
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={busy || disableConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
              danger
                ? "bg-error text-on-error hover:brightness-110"
                : "bg-brand-bright text-on-brand hover:brightness-110"
            }`}
          >
            {busy ? "Түр хүлээнэ үү…" : (confirmLabel ?? "Тийм, устгах")}
          </button>
        </div>
      </div>
    </div>
  );
}
