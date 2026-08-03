"use client";

import type { ReactNode } from "react";
import { RotateCw, TriangleAlert, type LucideIcon } from "lucide-react";
import { SkeletonRows } from "./Skeleton";

/**
 * Ачаалж буй / хоосон / алдаатай гурван төлөвийн НЭГДСЭН харагдац.
 *
 * Өмнө нь 17 өөр газар "Ачаалж байна…" гэсэн ганц мөр текст, 111 файлд
 * өөр өөр хэлбэрийн алдааны блок давтагдаж байсан. Тус бүр өөр өнгө,
 * өөр үг хэллэгтэй байсан тул бүтээгдэхүүн замбараагүй мэдрэгддэг байв.
 * Эндээс цаашид гурвуулаа ижил харагдана.
 */

/** Ачаалж байна — бүтцийн сүүдэр (хоосон дэлгэц ХЭЗЭЭ Ч харуулахгүй) */
export function LoadingState({
  rows = 5,
  label = "Ачаалж байна",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-label={label}>
      <SkeletonRows rows={rows} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Алдаа — монголоор ойлгомжтой мессеж + дахин оролдох боломж.
 * Техникийн англи алдааг шууд харуулахаас сэргийлж, дуудагч нь аль хэдийн
 * орчуулсан мессеж дамжуулна гэж үзнэ.
 */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"
    >
      <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-error/40 px-3 py-1.5 font-semibold transition hover:bg-error/10"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          Дахин оролдох
        </button>
      )}
    </div>
  );
}

/**
 * Хоосон — ЯАГААД хоосон байгаа, ЮУ хийвэл дүүрэхийг хэлнэ.
 * Ганцхан "Мэдээлэл алга" гэсэн үг нь хэрэглэгчийг гацаана.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {Icon && <Icon className="h-7 w-7 text-ink-dim" aria-hidden />}
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink-dim">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
