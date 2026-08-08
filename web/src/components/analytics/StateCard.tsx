"use client";
import { TriangleAlert } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";

// Ачаалж байгаа/алдаа/хоосон төлвүүдийг нэг стандарт харагдацтай болгоно —
// "алдаа" ба "дата байхгүй" ХОЁРЫГ ХАРИЛЦАН ЯЛГАГДАХУЙЦ харуулна (спекийн
// шаардлага): алдаа улаан, дахин оролдох товчтой; хоосон бол саарал, тайлбар
// текст, товчгүй.

export function LoadingCard({ label = "Ачаалж байна…" }: { label?: string }) {
  return (
    <p className="animate-pulse text-sm text-ink-dim" role="status">
      {label}
    </p>
  );
}

export function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
      <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
      <button
        onClick={onRetry}
        className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
      >
        Дахин ачаалах
      </button>
    </div>
  );
}

export function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-3 py-4 text-sm text-ink-dim">
      {message}
    </div>
  );
}
