"use client";

import { cn } from "@/lib/cn";
import type { ExamClassChip } from "./types";

/** «Бүгд» + анги бүр — Тойм, Бодлого табын хүрээ (Багш — өөрийн анги л ирнэ). */
export default function ClassChips({
  chips,
  value,
  onChange,
}: {
  chips: ExamClassChip[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (chips.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Анги сонгох">
      {[{ id: "all", name: "Бүгд" }, ...chips].map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={value === c.id}
          onClick={() => onChange(c.id)}
          className={cn(
            "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-brand",
            value === c.id
              ? "border-transparent bg-brand-bright text-on-brand"
              : "border-line bg-surface text-ink hover:bg-ink/5",
          )}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
