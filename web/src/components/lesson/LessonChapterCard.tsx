"use client";

import Link from "next/link";
import { Check, CheckCircle2, ChevronRight } from "lucide-react";
import type { LessonChapterSummary } from "./types";

export function chapterPercent(chapter: LessonChapterSummary): number {
  const p = chapter.progress?.percent;
  if (typeof p === "number" && Number.isFinite(p)) {
    return Math.max(0, Math.min(100, Math.round(p)));
  }
  const done = chapter.progress?.stepsDone;
  const total = chapter.progress?.stepsTotal;
  if (typeof done === "number" && typeof total === "number" && total > 0) {
    return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  }
  return 0;
}

export default function LessonChapterCard({
  chapter,
  subject,
}: {
  chapter: LessonChapterSummary;
  subject?: string;
}) {
  const percent = chapterPercent(chapter);
  return (
    <Link
      href={
        subject
          ? `/app/learn/${chapter.id}?subject=${subject}`
          : `/app/learn/${chapter.id}`
      }
      className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4 text-left transition hover:border-brand-bright/40 hover:-translate-y-0.5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold">{chapter.title}</p>
          {chapter.freePreview && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
              <Check className="h-3 w-3" aria-hidden="true" /> Үнэгүй
            </span>
          )}
        </div>
        <div className="mt-2 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-ink/10">
          <div
            className={`h-full rounded-full ${
              percent >= 100 ? "bg-success" : "bg-brand-bright"
            }`}
            style={{ width: `${Math.max(4, percent)}%` }}
          />
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-dim">
        {percent >= 100 ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            <span className="text-success">Дууссан</span>
          </>
        ) : (
          `${percent}%`
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
    </Link>
  );
}
