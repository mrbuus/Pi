'use client';

import MathText from '@/components/MathText';



// Recommendation type
type RecommendReason =
  | 'RETRY_TOPIC'
  | 'WEAK_TOPIC'
  | 'RIGHT_LEVEL'
  | 'NEW_TOPIC'
  | 'CONFIDENCE';

interface Recommendation {
  problemId: string;
  topicId: string;
  score: number;
  reason: RecommendReason;
}

/**
 * Нэг бодлогын сонголтын картанэ.
 * REASON_TEXT-ээр яагаад санал болгосон, score-ээр хүссэн түвшин харуулна.
 */
interface ProblemCardProps {
  recommendation: Recommendation;
  reasonText: string;
  /** undefined = ачаалж байна, null = текстгүй (зурагтай) бодлого */
  statement?: string | null;
  selected: boolean;
  onSelect: (rec: Recommendation) => void;
}

export default function ProblemCard({
  recommendation,
  reasonText,
  statement,
  selected,
  onSelect,
}: ProblemCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(recommendation)}
      aria-pressed={selected}
      className={`w-full text-left cursor-pointer transition-all chunky elev-1 p-5 md:p-6 ${
        selected
          ? 'ring-2 ring-brand bg-brand-bright'
          : 'hover:border-line-focus'
      }`}
    >
      {/* Яагаад санал болгосон */}
      <p className="text-xs font-semibold text-brand mb-2">{reasonText}</p>

      {/* Бодлогын текст */}
      <div className="text-sm text-ink line-clamp-3 min-h-[3.75rem]">
        {statement === undefined ? (
          <span className="text-ink-dim">Ачаалж байна…</span>
        ) : statement ? (
          <MathText>{statement}</MathText>
        ) : (
          <span className="text-ink-dim">Зурагтай бодлого — нээж үзнэ үү</span>
        )}
      </div>
    </button>
  );
}
