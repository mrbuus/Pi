"use client";

import type { TopicRow } from "./types";

function band(rate: number): string {
  if (rate < 0.5) return "bg-error";
  if (rate < 0.7) return "bg-warning";
  return "bg-success";
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export default function TopicWeaknessList({
  topics,
  minSample,
}: {
  topics: TopicRow[];
  minSample: number;
}) {
  if (topics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line px-3 py-4 text-sm text-ink-dim">
        Сонгосон хугацаанд үнэлэгдэх оролдлого алга.
      </div>
    );
  }

  return (
    <div>
      <ul className="flex flex-col gap-2">
        {topics.map((t) => (
          <li
            key={t.chapterId}
            className={`rounded-lg border border-line px-3 py-2 ${t.lowSample ? "opacity-60" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {t.chapterTitle}
                </p>
                {t.bookTitle && (
                  <p className="text-xs text-ink-dim">{t.bookTitle}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div
                  className="h-2 w-20 overflow-hidden rounded-full bg-line/60"
                  role="img"
                  aria-label={`Амжилтын хувь ${pct(t.successRate)}`}
                >
                  <div
                    className={`h-full rounded-full ${band(t.successRate)}`}
                    style={{ width: pct(t.successRate) }}
                  />
                </div>
                <span className="text-sm font-semibold text-ink">
                  {pct(t.successRate)}
                </span>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-ink-dim">
              {t.totalAttempts} оролдлого
              {t.lowSample && ` — дата хомс (${minSample}-с цөөн), итгэлтэй дүгнэлт хийхэд хангалтгүй`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
