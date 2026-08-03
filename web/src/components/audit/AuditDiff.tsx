"use client";

import { ArrowRight } from "lucide-react";
import { computeDiff, fieldLabel, formatDiffValue } from "./auditHelpers";

/**
 * before/after JSON-г уншихад хялбар талбар тус бүрийн диф болгож харуулна —
 * түүхий JSON биш. Мөнгө/дүнтэй холбоотой талбарыг тодруулна.
 */
export default function AuditDiff({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const fields = computeDiff(before, after);
  if (fields.length === 0) {
    return <p className="text-sm text-ink-dim">Дэлгэрэнгүй мэдээлэл алга</p>;
  }
  return (
    <div className="space-y-1.5">
      {fields.map((f) => (
        <div
          key={f.key}
          className={`grid grid-cols-2 items-center gap-2 rounded-lg px-3 py-1.5 text-sm sm:grid-cols-[minmax(0,140px)_1fr_auto_1fr] ${
            f.prominent
              ? "border border-warning/30 bg-warning/10"
              : f.changed
                ? "bg-panel"
                : "opacity-70"
          }`}
        >
          <span className="col-span-2 truncate font-semibold text-ink-dim sm:col-span-1">
            {fieldLabel(f.key)}
          </span>
          <span
            className={
              f.changed
                ? "truncate text-error line-through decoration-error/60"
                : "truncate text-ink-dim"
            }
          >
            {formatDiffValue(f.key, f.before)}
          </span>
          <span className="hidden justify-center sm:flex">
            <ArrowRight className="h-4 w-4 text-ink-dim" aria-hidden />
          </span>
          <span
            className={
              f.changed
                ? "truncate font-bold text-success"
                : "truncate text-ink-dim"
            }
          >
            {formatDiffValue(f.key, f.after)}
          </span>
        </div>
      ))}
    </div>
  );
}
