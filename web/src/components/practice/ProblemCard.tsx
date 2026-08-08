'use client';

import { Card } from '@/components/ui/Surface';

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
  selected: boolean;
  onSelect: (rec: Recommendation) => void;
}

export default function ProblemCard({
  recommendation,
  reasonText,
  selected,
  onSelect,
}: ProblemCardProps) {
  // Score → хувь (0..1 → 0..100)
  const scorePercent = Math.round(recommendation.score * 100);

  return (
    <div
      onClick={() => onSelect(recommendation)}
      className={`cursor-pointer transition-all rounded-2xl border border-line bg-panel elev-1 p-5 md:p-6 ${
        selected
          ? 'ring-2 ring-brand bg-brand-bright'
          : 'hover:border-line-focus'
      }`}
    >
      <div>
        {/* Бодлогын ID (ходлого төрөл үзүүлэх) */}
        <div className="text-xs font-mono text-ink-dim mb-2">
          {recommendation.problemId.substring(0, 8)}…
        </div>

        {/* Яагаад санал болгосон */}
        <p className="text-sm text-ink mb-3 font-medium">
          {reasonText}
        </p>

        {/* Таарц оноо */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand h-full transition-all"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <span className="text-xs text-ink-dim font-mono">{scorePercent}%</span>
        </div>

        {/* Хэм сонго */}
        {selected && (
          <div className="text-xs text-on-brand bg-brand px-2 py-1 rounded inline-block">
            Сонгосон
          </div>
        )}
      </div>
    </div>
  );
}
