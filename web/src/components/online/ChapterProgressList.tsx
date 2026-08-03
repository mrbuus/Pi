import { Clapperboard, Check } from "lucide-react";
import { ChapterProgressRow } from "./types";

function barTone(rate: number): string {
  if (rate >= 70) return "bg-success";
  if (rate >= 40) return "bg-warning";
  return "bg-error";
}

export default function ChapterProgressList({
  chapters,
  canEdit,
  onReset,
}: {
  chapters: ChapterProgressRow[];
  canEdit: boolean;
  onReset?: (chapter: ChapterProgressRow) => void;
}) {
  if (chapters.length === 0) {
    return (
      <p className="text-sm text-ink-dim">Одоогоор бүлэг рүү орж үзээгүй байна.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {chapters.map((c) => {
        const rate = c.successRate ?? 0;
        return (
          <li key={c.chapterId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-ink">{c.title}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-dim">
                  {c.successRate === null ? "—" : `${c.successRate}%`} ·{" "}
                  {c.problemsAttempted} бодлого
                </span>
                {canEdit && onReset && (
                  <button
                    type="button"
                    onClick={() => onReset(c)}
                    className="rounded-lg border border-line px-2 py-1 text-xs font-semibold text-ink-dim transition hover:border-error hover:text-error"
                  >
                    Дахин эхлүүлэх
                  </button>
                )}
              </div>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink/10"
              role="progressbar"
              aria-valuenow={rate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${c.title}: ${c.successRate === null ? "дата алга" : `${c.successRate}%`}`}
            >
              {c.successRate !== null && (
                <div
                  className={`h-full rounded-full ${barTone(rate)}`}
                  style={{ width: `${Math.max(0, Math.min(100, rate))}%` }}
                />
              )}
            </div>
            <p className="mt-1 inline-flex flex-wrap items-center gap-1 text-xs text-ink-dim">
              <span className="inline-flex items-center gap-1">
                {c.theoryRead ? (
                  <>
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Онол үзсэн
                  </>
                ) : (
                  "— Онол үзээгүй"
                )}
              </span>
              <span>·</span>
              <Clapperboard className="h-3 w-3" aria-hidden />
              <span>
                {c.videosWatched > 0 ? `${c.videosWatched} бичлэг үзсэн` : "Бичлэг үзээгүй"}
              </span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
