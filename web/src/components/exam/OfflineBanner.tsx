"use client";

/* ============================================================================
 * OfflineBanner — сүлжээ тасрахад гарч ирэх ТОГТМОЛ, ХААХ БОЛОМЖГҮЙ мэдэгдэл.
 * Autosave амжилтгүй болох бүрт харагдана, дараагийн амжилттай хадгалалт
 * дээр л алга болно (page.tsx-ийн flushSave-д удирдана).
 * ========================================================================== */

export default function OfflineBanner() {
  return (
    <div
      role="alert"
      className="border-b border-error/50 bg-error/10 px-4 py-2 text-center text-sm font-semibold text-error"
    >
      ⚠ Холболт тасарлаа — хариултууд хадгалагдахгүй байна
    </div>
  );
}
