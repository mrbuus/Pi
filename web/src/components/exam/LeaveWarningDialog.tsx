"use client";

import { AlertTriangle, Ban } from "lucide-react";

/* ============================================================================
 * LeaveWarningDialog — горимоос гарсан үеийн факт мэдэгдэл (буруутгасан
 * өнгө аяс биш). Сүүлчийн (auto-submit-ийн өмнөх) сануулга л илүү хатуу
 * өнгө/бичвэрээр ялгарна — дуу, чичрэлт ХЭЗЭЭ Ч байхгүй.
 * ========================================================================== */

export default function LeaveWarningDialog({
  open,
  leaveCount,
  maxLeaves,
  onAcknowledge,
}: {
  open: boolean;
  leaveCount: number;
  maxLeaves: number;
  onAcknowledge: () => void;
}) {
  if (!open) return null;
  // finalWarning: хэрэв дараагийн гаралт нь auto-submit үүсгэнэ
  const finalWarning = leaveCount >= maxLeaves - 1;

  return (
    // bg-black/60: модаль цонхны хараанцар — themed фон биш тул text-white хамаарахгүй
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-6"
    >
      <div
        className={`w-full max-w-sm rounded-2xl border p-6 text-center ${
          finalWarning ? "border-error bg-error/10" : "border-warning bg-warning/10"
        }`}
      >
        {finalWarning ? (
          <Ban className="mx-auto h-9 w-9 text-error" aria-hidden />
        ) : (
          <AlertTriangle className="mx-auto h-9 w-9 text-warning" aria-hidden />
        )}
        <p className={`mt-2 text-lg font-bold ${finalWarning ? "text-error" : "text-warning"}`}>
          Та шалгалтын дэлгэцээс гарлаа.
        </p>
        <p className="mt-3 text-sm text-ink-dim">
          Үргэлжлүүлэхийн тулд бүтэн дэлгэц рүү буцна уу.
        </p>
        <div className="mt-3 flex justify-center gap-1">
          {Array.from({ length: maxLeaves }, (_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${
                i < leaveCount ? "bg-error/60" : finalWarning && i === leaveCount ? "bg-error" : "bg-line"
              }`}
            />
          ))}
        </div>
        <p className={`mt-2 text-xs font-semibold ${finalWarning ? "text-error" : "text-warning"}`}>
          {maxLeaves - leaveCount} {maxLeaves - leaveCount === 1 ? "удаа" : "удаа"} үлдсэн
        </p>
        {finalWarning && (
          <p className="mt-3 text-sm font-semibold text-error">
            Сүүлийн сунуулга! Дахин гарвал шалгалт автоматаар илгээгдэнэ.
          </p>
        )}
        <button
          type="button"
          onClick={onAcknowledge}
          className={`mt-4 rounded-lg border px-6 py-2.5 text-sm font-bold ${
            finalWarning ? "border-error bg-error/15 text-error" : "border-warning bg-warning/15 text-warning"
          }`}
        >
          Ойлголоо, үргэлжлүүлэх
        </button>
      </div>
    </div>
  );
}
