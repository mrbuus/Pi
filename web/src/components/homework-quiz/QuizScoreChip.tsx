import { ClipboardCheck } from "lucide-react";
import { TONE_SELECTED } from "@/components/attendance/marks";
import { cn } from "@/lib/cn";
import { formatPercent, formatScore, quizPercent, quizTone } from "@/lib/quizScore";

/**
 * Шалгалтаар даалгавар шалгасан оноо — сурагч, эцэг эхэд (эзэн 2026-11-08 19:08): «Шалгалт 7,5/10»
 * + хувь өнгөт хайрцагт (самбарын өнгөтэй ижил: улаан < 50 <= улбар шар < 80 <= ногоон).
 * `compact` — жагсаалтын мөрөнд зөвхөн дүрс ба хувь.
 */
export default function QuizScoreChip({
  score,
  problemCount,
  compact = false,
  withLabel = true,
  className,
}: {
  score: number;
  problemCount: number;
  compact?: boolean;
  /** false — «Шалгалт» гэсэн үггүй (шошго нь хажууд байгаа үед) */
  withLabel?: boolean;
  className?: string;
}) {
  const tone = quizTone(score, problemCount);
  const pct = quizPercent(score, problemCount);
  if (!tone || pct === null) return null;
  const text = `Шалгалт ${formatScore(score)}/${problemCount}, ${formatPercent(pct)}`;
  return (
    <span title={text} className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}>
      <ClipboardCheck className="size-4 shrink-0 text-brand" aria-hidden />
      {!compact && (
        <span aria-hidden className="text-sm text-ink">
          {withLabel && "Шалгалт "}<b className="font-bold tabular-nums">{formatScore(score)}</b>
          <span className="tabular-nums text-ink-dim">/{problemCount}</span>
        </span>
      )}
      <span aria-hidden className={cn("rounded border px-1 text-xs font-bold leading-5 tabular-nums", TONE_SELECTED[tone])}>
        {formatPercent(pct)}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
