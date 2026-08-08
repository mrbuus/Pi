"use client";

// Loader (туяат нар) БИШ, Loader2 (нум) — туяат хувилбар нь Anthropic-ийн
// логотой ижил харагддаг тул эзэн хориглосон (2026-08-08).
import { Check, Loader2 } from "lucide-react";

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
          <Loader2 size={12} className="shrink-0 animate-spin text-info" aria-hidden />
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
