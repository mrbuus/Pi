"use client";

/* ============================================================================
 * AutosaveChip — толгой хэсгийн жижиг индикатор (toast биш).
 * "Хадгалж байна…" ⇄ "Бүгд хадгалагдсан ✓". Холболт тасрахад OfflineBanner
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
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-info" aria-hidden />
          Хадгалж байна…
        </>
      ) : (
        <>
          <span className="text-success" aria-hidden>✓</span>
          Бүгд хадгалагдсан
        </>
      )}
    </span>
  );
}
