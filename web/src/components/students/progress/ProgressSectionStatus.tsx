"use client";

import { AlertCircle } from "lucide-react";

// Сурагчийн явцын хуудасны хэсгүүдэд ХАМТ ашиглагдах ачаалж
// байна/алдаа/хоосон төлвүүд — TeacherDashboardClient.tsx-ийн SectionStatus-тай
// ижил хэв маягтай.

export function SectionLoading({ label }: { label: string }) {
  return (
    <p className="animate-pulse text-sm text-ink-dim" role="status">
      {label} ачаалж байна…
    </p>
  );
}

export function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
      <span className="inline-flex items-center gap-2">
        <AlertCircle size={16} aria-hidden />
        {message}
      </span>
      <button
        onClick={onRetry}
        className="shrink-0 rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold text-error transition hover:bg-error/10"
      >
        Дахин оролдох
      </button>
    </div>
  );
}

export function SectionEmpty({ text }: { text: string }) {
  return <p className="text-sm text-ink-dim">{text}</p>;
}
