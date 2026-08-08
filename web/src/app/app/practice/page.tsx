'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PracticeList from '@/components/practice/PracticeList';
import { LoadingState, ErrorState } from '@/components/ui/StateBlock';

import { api } from "@/lib/api";
// Recommendation type (scheduler.ts-ээс экспортлогдоо)
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
 * Дасгал хуудас — сурагчийн дараагийн бодлогуудыг санал болгоно.
 *
 * LOGIC:
 * 1. GET /api/recommend/next?limit=10 дуудаж бодлого авна
 * 2. PracticeList компонентт шүүлэнэ (бодлого сонголт + REASON_TEXT)
 * 3. Сурагч сонгоод бодолгыг гүйцэтгэнэ
 * 4. POST /api/recommend/attempt дуудаж үр дүнг хадгалана
 */
export default function PracticePage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setRecommendations(await api('/recommend/next?limit=10'));
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ямар нэг алдаа гарлаа';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [router]);

  if (loading) return <LoadingState />;
  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={() => window.location.reload()}
      />
    );

  return (
    <div className="min-h-screen bg-bg p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-ink mb-2">Дасгал</h1>
        <p className="text-ink-dim text-sm mb-6">
          Та хамгийн сайн сурах бодлогуудыг үзүүлүүлэв
        </p>

        {recommendations.length === 0 ? (
          <div className="text-center py-12 bg-panel rounded-lg">
            <p className="text-ink-dim">Одоор бодлого байхгүй байна</p>
          </div>
        ) : (
          <PracticeList recommendations={recommendations} />
        )}
      </div>
    </div>
  );
}
