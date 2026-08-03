"use client";

import { Clock, X } from "lucide-react";

/* ============================================================================
 * ExamToast — жижиг, блоклохгүй мэдэгдэл (жишээ нь 5 минутын сануулга).
 * Modal биш: дэлгэцийг бүрхэхгүй, дарж хаах эсвэл цагийн дараа өөрөө алга
 * болно. Olipas & Luciano (2020): цочролтой сэрэмжлүүлэг түгшүүрийг
 * нэмэгдүүлдэг тул зөвхөн энэ зөөлөн хэлбэрийг ашиглана.
 * ========================================================================== */

export default function ExamToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-warning/50 bg-surface px-4 py-3 text-sm text-ink shadow-lg"
    >
      <div className="flex items-start gap-2">
        <Clock size={18} className="shrink-0 text-warning mt-0.5" aria-hidden />
        <p className="flex-1 leading-snug">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Мэдэгдлийг хаах"
          className="shrink-0 text-ink-dim transition hover:text-ink"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
