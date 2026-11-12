"use client";

import { Meta } from "@/components/ui/Meta";
import ExamDialog from "@/components/exams/ExamDialog";
import { cn } from "@/lib/cn";
import AreaBars from "./AreaBars";
import { scoreText, STATUS_CELL, STATUS_LABEL, STATUS_OF_CHAR, type BoardRow, type PaperItem } from "./types";

/** Нэг сурагчийн хуудас: бодлого бүрийн хариу, зөв хариу, агуулгын хувь. */
export default function SheetDialog({
  row,
  items,
  onOpenChange,
}: {
  row: BoardRow | null;
  items: PaperItem[];
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
                  title={[it.area, STATUS_LABEL[st]].filter(Boolean).join(" — ")}
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
            <h3 className="mb-2 text-sm font-bold text-brand-soft">Агуулгаар</h3>
            <AreaBars areas={row.areas} />
          </div>
        </div>
      )}
    </ExamDialog>
  );
}
