"use client";

import { Check, Loader } from "lucide-react";

/* ============================================================================
 * AutosaveChip — толгой хэсгийн жижиг индикатор (toast биш).
 * "Хадгалж байна…" ⇄ "Бүгд хадгалагдсан". Холболт тасрахад OfflineBanner
 * (тогтмол, хаах боломжгүй) энэ chip-ийг орлож дэлгэц дээр гарч ирнэ.
 * ========================================================================== */

export type SaveStatus = "saving" | "saved";

export default function AutosaveChip({ status }: { status: SaveStatus }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-[11px] font-medium text-ink-dim"
    >
      {status === "saving" ? (
        <>
          <Loader size={12} className="shrink-0 animate-spin text-info" aria-hidden />
          Хадгалж байна…
        </>
      ) : (
        <>
          <Check size={14} className="shrink-0 text-success" aria-hidden />
          Бүгд хадгалагдсан
        </>
      )}
    </span>
  );
}
