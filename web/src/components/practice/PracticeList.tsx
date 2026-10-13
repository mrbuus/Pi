'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import ProblemCard from './ProblemCard';
import AttemptModal from './AttemptModal';

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

const REASON_TEXT: Record<RecommendReason, string> = {
  RETRY_TOPIC: 'Өмнө нь бүдэрсэн сэдэв — одоо дахин оролдох цаг болжээ',
  WEAK_TOPIC: 'Энэ сэдвийг бэхжүүлэх хэрэгтэй',
  RIGHT_LEVEL: 'Танд яг тохирох түвшин',
  NEW_TOPIC: 'Шинэ сэдэв',
  CONFIDENCE: 'Сайн эзэмшсэн сэдэв — мартахгүйн тулд',
};

/**
 * Санал болгосон бодлогуудын жагсаалт.
 * Сурагч сонгоод AttemptModal нээнэ.
 */
interface PracticeListProps {
  recommendations: Recommendation[];
}

export default function PracticeList({ recommendations }: PracticeListProps) {
  const [selectedProblem, setSelectedProblem] = useState<Recommendation | null>(null);
  const [submitted, setSubmitted] = useState(false);
  // Картад харуулах бодлогын текст (problemId → statementText)
  const [previews, setPreviews] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let alive = true;
    Promise.all(
      recommendations.map((rec) =>
        api<{ statementText?: string | null }>(`/problems/${rec.problemId}`)
          .then((p) => [rec.problemId, p.statementText ?? null] as const)
          .catch(() => [rec.problemId, null] as const),
      ),
    ).then((rows) => {
      if (alive) setPreviews(Object.fromEntries(rows));
    });
    return () => {
      alive = false;
    };
  }, [recommendations]);

  const handleSelect = (rec: Recommendation) => {
    setSelectedProblem(rec);
    setSubmitted(false);
  };

  const handleSubmitSuccess = () => {
    setSubmitted(true);
    // 3 сек дараа модалыг хаа
    setTimeout(() => {
      setSelectedProblem(null);
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div>
      {/* Санал болгосон бодлогуудын сүлжээ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {recommendations.map((rec) => (
          <ProblemCard
            key={rec.problemId}
            recommendation={rec}
            reasonText={REASON_TEXT[rec.reason]}
            statement={previews[rec.problemId]}
            selected={selectedProblem?.problemId === rec.problemId}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Бодлого бодох модал */}
      {selectedProblem && (
        <AttemptModal
          recommendation={selectedProblem}
          onClose={() => setSelectedProblem(null)}
          onSubmitSuccess={handleSubmitSuccess}
          submitted={submitted}
        />
      )}
    </div>
  );
}
