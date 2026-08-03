"use client";

import { AlertTriangle } from "lucide-react";

/* ============================================================================
 * OfflineBanner — сүлжээ тасрахад гарч ирэх ТОГТМОЛ, ХААХ БОЛОМЖГҮЙ мэдэгдэл.
 * Autosave амжилтгүй болох бүрт харагдана, дараагийн амжилттай хадгалалт
 * дээр л алга болно (page.tsx-ийн flushSave-д удирдана).
 * ========================================================================== */

export default function OfflineBanner() {
  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 border-b border-error/50 bg-error/10 px-4 py-2 text-center text-sm font-semibold text-error"
    >
      <AlertTriangle size={18} aria-hidden />
      <span>Холболт тасарлаа — хариултууд хадгалагдахгүй байна</span>
    </div>
  );
}
