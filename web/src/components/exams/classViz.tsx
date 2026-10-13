"use client";

import { cn } from "@/lib/cn";

/** «Анги» табын жижиг дүрслэл: хувийн өнгө, явцын багана. */
export function toneOf(percent: number | null): "success" | "warning" | "danger" | "neutral" {
  if (percent === null) return "neutral";
  if (percent >= 70) return "success";
  if (percent >= 40) return "warning";
  return "danger";
}

export const barClass = { success: "bg-success", warning: "bg-warning", danger: "bg-error", neutral: "bg-line" } as const;

/** Явцын жижиг багана (хуучнаас шинэ) */
export function Trend({ values }: { values: number[] }) {
  if (values.length === 0) return <span className="text-sm text-ink-dim">—</span>;
  return (
    <span className="inline-flex h-8 items-end gap-0.5" aria-label={`Явц: ${values.join(", ")}%`}>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn("w-2 rounded-sm", barClass[toneOf(v)])}
          style={{ height: `${Math.max(8, v)}%` }}
        />
      ))}
    </span>
  );
}

