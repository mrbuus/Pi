"use client";

import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ParsedBlock } from "./parse";
import ProblemView, { SolutionView } from "./ProblemView";

/**
 * Задалсан бодлогуудын урьдчилсан харагдац (ChatGPT-ээс буулгасан эсвэл Word).
 * Тэмдэглэлтэй блокийг нэмсний дараа засна — нэмэхэд саад болохгүй.
 */
export default function ImportReview({
  blocks,
  compact = false,
}: {
  blocks: ParsedBlock[];
  compact?: boolean;
}) {
  return (
    <ol className="space-y-3">
      {blocks.map((b, i) => (
        <li key={i} className={cn("rounded-2xl border border-line bg-surface", compact ? "p-3" : "p-4")}>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-tint text-xs font-extrabold text-brand-soft">
              {i + 1}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-dim">
              {b.kind === "CHOICE" ? "Сонгох" : "Тоон хариу"}
            </span>
            {b.tag && <span className="truncate text-xs text-ink-dim">{b.tag}</span>}
          </div>
          <ProblemView content={{ ...b, imageKey: null }} dense={compact} />
          {!compact && <div className="mt-2"><SolutionView solution={b.solution} /></div>}
          {b.notes.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {b.notes.map((note) => (
                <li
                  key={note}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-semibold text-brand-soft"
                >
                  <CircleAlert className="size-3.5" aria-hidden />
                  {note}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Задалсан блокийг серверт илгээх хэлбэр */
export function toBlockInput(b: ParsedBlock) {
  return {
    kind: b.kind,
    statement: b.statement,
    choices: b.choices,
    answer: b.answer,
    solution: b.solution,
    tag: b.tag,
    points: b.points,
  };
}
