"use client";

import { Meta } from "@/components/ui/Meta";
import ExamDialog from "@/components/exams/ExamDialog";
import { cn } from "@/lib/cn";
import AreaBars from "./AreaBars";
import FormulaLine from "./FormulaLine";
import {
  CLASSIFY_LABEL,
  scoreText,
  STATUS_CELL,
  STATUS_LABEL,
  STATUS_OF_CHAR,
  type BoardRow,
  type ClassifyBy,
  type FormulaRef,
  type PaperItem,
} from "./types";

/** Нэг сурагчийн хуудас: бодлого бүрийн хариу, зөв хариу, агуулгын хувь. */
export default function SheetDialog({
  row,
  items,
  formulas,
  classifyBy,
  onOpenChange,
}: {
  row: BoardRow | null;
  items: PaperItem[];
  formulas: FormulaRef[];
  classifyBy: ClassifyBy;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <ExamDialog
      open={!!row}
      onOpenChange={onOpenChange}
      wide
      title={row ? `${row.lastName} ${row.firstName}` : ""}
      description={
        row ? (
          <Meta
            items={[
              row.code,
              `${scoreText(row.totalScore)} / ${scoreText(row.maxScore)} оноо`,
              row.pct !== null ? `${row.pct}%` : null,
              row.rank ? `төвд ${row.rank}-р байр` : null,
            ]}
          />
        ) : undefined
      }
    >
      {row && (
        <div className="space-y-5">
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5">
            {items.map((it, i) => {
              const st = STATUS_OF_CHAR[row.statuses[i]] ?? "UNGRADED";
              const ans = row.answers[i];
              const letter = ans && /^[A-E]$/.test(ans) ? ans : null;
              return (
                <li
                  key={it.number}
                  className={cn("rounded-lg px-2 py-1.5 text-xs", STATUS_CELL[st])}
                  title={[it.topic, it.area, STATUS_LABEL[st]].filter(Boolean).join(" — ")}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-bold tabular-nums">{it.number}</span>
                    <span className="font-bold">{letter ?? (st === "MULTI" ? "*" : "")}</span>
                  </div>
                  <div className="truncate text-[10px] opacity-80">
                    {st === "WRONG" && it.answerKey && letter ? `зөв: ${it.answerKey}` : STATUS_LABEL[st]}
                  </div>
                </li>
              );
            })}
          </ol>
          <div>
            <h3 className="mb-2 text-sm font-bold text-brand-soft">{CLASSIFY_LABEL[classifyBy].by}</h3>
            <AreaBars areas={classifyBy === "topic" ? row.topics : row.areas} />
          </div>
          {(() => {
            // Алдсан бодлогуудад хамаарах томьёо — сурагчтай ярилцахад бэлэн жагсаалт
            const need = new Map<string, number[]>();
            items.forEach((it, i) => {
              const st = STATUS_OF_CHAR[row.statuses[i]];
              if (st !== "WRONG" && st !== "BLANK" && st !== "MULTI") return;
              for (const slug of it.formulaSlugs) need.set(slug, [...(need.get(slug) ?? []), it.number]);
            });
            const list = formulas.filter((f) => need.has(f.slug));
            if (list.length === 0) return null;
            return (
              <div>
                <h3 className="mb-2 text-sm font-bold text-brand-soft">Алдсан бодлогын томьёо</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {list.map((f) => (
                    <li key={f.slug}>
                      <FormulaLine formula={f} compact />
                      <span className="mt-0.5 block text-xs text-ink-dim">Бодлого: {need.get(f.slug)!.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </div>
      )}
    </ExamDialog>
  );
}
