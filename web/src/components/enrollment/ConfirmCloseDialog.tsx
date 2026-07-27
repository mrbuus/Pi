"use client";

import { useEffect, useRef } from "react";

interface ConfirmCloseDialogProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Хичээлийг "Дууссан" болгох бол ЭРГЭЛТ БУЦАЛТГҮЙ шинэ хүсэлтийг зогсоодог
// тул үргэлж энэ баталгаажуулалтаар дамжина (нэг хичээл дээр ч, "бүгдийг нэг
// дор" дээр ч) — content-admin/ConfirmDialog-тэй ижил хээ, гэхдээ энэ модул
// зөвхөн энэ хуудсанд хамааралтай тул дундаа хуваалцахгүй.
export default function ConfirmCloseDialog({
  open,
  title,
  description,
  busy,
  onConfirm,
  onCancel,
}: ConfirmCloseDialogProps) {
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
        aria-labelledby="enrollment-confirm-title"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="enrollment-confirm-title" className="mb-2 text-lg font-bold text-ink">
          {title}
        </h2>
        <div className="mb-5 text-sm leading-relaxed text-ink-dim">
          {description}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50"
          >
            Болих
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-error px-4 py-2.5 text-sm font-bold text-on-error transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Хаагдаж байна…" : "Тийм, хаах"}
          </button>
        </div>
      </div>
    </div>
  );
}
