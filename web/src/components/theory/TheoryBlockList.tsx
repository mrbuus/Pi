"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import type { TheoryBlock } from "./types";

/**
 * Онолын блокуудын жагсаалт — сонгох, "дээш/доош" товчоор эрэмбэлэх,
 * устгах. Чирж (drag-and-drop) эрэмбэлэхийг ЗОРИУДААР ХЭРЭГЖҮҮЛЭЭГҮЙ —
 * WCAG 2.2-ын шаардлагаар чирэх UI-д заавал чирэлгүйгээр ижил үйлдлийг
 * хийх өөр арга байх ёстой тул шууд ТЭР "өөр арга"-ыг л ганцаараа санал
 * болгож байна (энгийн товч, keyboard-ээр бүрэн ажиллана).
 */
export default function TheoryBlockList({
  blocks,
  selectedId,
  reordering,
  onSelect,
  onMove,
  onDelete,
  onCreateNew,
}: {
  blocks: TheoryBlock[];
  selectedId: string | null;
  reordering: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onDelete: (block: TheoryBlock) => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onCreateNew}
        className={`w-full rounded-lg px-3 py-2 text-sm font-bold transition ${
          selectedId === "__new__"
            ? "bg-brand-bright text-on-brand"
            : "border border-line text-ink hover:border-brand"
        }`}
      >
        + Шинэ блок нэмэх
      </button>

      <ol className="space-y-2">
        {blocks.map((b, i) => {
          const active = b.id === selectedId;
          return (
            <li
              key={b.id}
              className={`rounded-lg border p-2.5 transition ${
                active ? "border-brand bg-brand-bright/10" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-xs font-semibold text-ink-dim">
                  {i + 1}.
                </span>
                <button
                  type="button"
                  onClick={() => onSelect(b.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink hover:underline"
                  title={b.title}
                >
                  {b.title || "(гарчиггүй блок)"}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onMove(b.id, "up")}
                    disabled={i === 0 || reordering}
                    aria-label={`"${b.title}"-ийг дээш зөөх`}
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-dim transition hover:text-ink disabled:opacity-30"
                  >
                    <ChevronUp className="h-3 w-3" aria-hidden />
                    дээш
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(b.id, "down")}
                    disabled={i === blocks.length - 1 || reordering}
                    aria-label={`"${b.title}"-ийг доош зөөх`}
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-dim transition hover:text-ink disabled:opacity-30"
                  >
                    <ChevronDown className="h-3 w-3" aria-hidden />
                    доош
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(b)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-error hover:underline"
                >
                  Устгах
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
