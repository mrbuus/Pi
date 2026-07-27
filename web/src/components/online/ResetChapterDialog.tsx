"use client";

import { useId, useState } from "react";
import { ChapterProgressRow } from "./types";

export default function ResetChapterDialog({
  chapter,
  saving,
  error,
  onConfirm,
  onCancel,
}: {
  chapter: ChapterProgressRow | null;
  saving: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const [reason, setReason] = useState("");

  if (!chapter) return null;
  const canConfirm = reason.trim().length >= 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5"
      >
        <h2 id={titleId} className="text-base font-bold text-ink">
          «{chapter.title}» бүлгийн явцыг дахин эхлүүлэх үү?
        </h2>
        <p className="mt-2 rounded-lg bg-warning/10 p-3 text-sm text-ink">
          ⚠️ Энэ үйлдэл явцын тэмдэглэгээг (дэвшил) цэвэрлэнэ, ГЭХДЭЭ бодлого
          бодсон түүх (оролдлогууд) устахгүй, хадгалагдана.
        </p>
        <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="reset-reason">
          Шалтгаан (заавал)
        </label>
        <textarea
          id="reset-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Жишээ: сурагчийн хүсэлтээр дахин бодох боломж олгов"
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-dim/70 focus-visible:border-brand"
        />
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50"
          >
            Болих
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={saving || !canConfirm}
            className="rounded-lg bg-error px-3 py-1.5 text-sm font-bold text-on-error transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Хадгалж байна…" : `«${chapter.title}»-г дахин эхлүүлэх`}
          </button>
        </div>
      </div>
    </div>
  );
}
