'use client';

import { useEffect, useState } from 'react';
import { LoadingState, ErrorState } from '@/components/ui/StateBlock';

import { api } from "@/lib/api";
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
 * Бодлого бодох модал.
 * 1. Бодлогын асуулт уншина (GET /api/problems/:id)
 * 2. Сурагч хариулт оруулна
 * 3. POST /api/recommend/attempt дуудаж үр дүнг хадгалана
 */
interface AttemptModalProps {
  recommendation: Recommendation;
  submitted: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

interface Problem {
  id: string;
  token: string;
  statementText?: string;
  correctAnswer: any;
  format: string;
}

export default function AttemptModal({
  recommendation,
  submitted,
  onClose,
  onSubmitSuccess,
}: AttemptModalProps) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Бодлогыг уншина
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        setProblem(await api(`/problems/${recommendation.problemId}`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Алдаа гарлаа';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [recommendation.problemId]);

  // Оруулсан үр дүнг явуулна
  const handleSubmit = async () => {
    if (!answer.trim()) {
      setError('Хариулт оруулна уу');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api('/recommend/attempt', {
        method: 'POST',
        body: {
          problemId: recommendation.problemId,
          givenAnswer: answer, // ⚠️ ЗААВАЛ бөглөнө (ML-д үнэ цэнэтэй)
          autoCorrect: null,
          selfState: null,
        },
      });

      // Амжилтын мэдэгдэл 3 сек харуул
      onSubmitSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Алдаа гарлаа';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Modal onClose={onClose}><LoadingState /></Modal>;
  if (error && !problem)
    return (
      <Modal onClose={onClose}>
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
        />
      </Modal>
    );

  if (!problem) return null;

  if (submitted) {
    return (
      <Modal onClose={onClose}>
        <div className="text-center py-12">
          <p className="text-lg font-semibold text-success mb-2">Баялалаа!</p>
          <p className="text-sm text-ink-dim">Таны хариулт хадгалагдлаа</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="max-h-96 overflow-y-auto">
        {/* Бодлогын асуулт */}
        <div className="mb-6">
          <h3 className="font-semibold text-ink mb-3">Бодлого</h3>
          <p className="text-sm text-ink-dim bg-surface p-3 rounded">
            {problem.statementText || '(Асуулт уншихыг сөрөгүүлэв)'}
          </p>
          <div className="text-xs font-mono text-ink-dim mt-2">
            Token: {problem.token}
          </div>
        </div>

        {/* Хариулт оруулах */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-ink mb-2">
            Таны хариулт
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Хариулт оруулна уу…"
            disabled={submitting}
            className="w-full p-3 border border-line rounded-lg text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-brand text-sm"
            rows={4}
          />
        </div>

        {/* Алдаа */}
        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded text-error text-sm">
            {error}
          </div>
        )}

        {/* Товлуур */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2 px-4 border border-line rounded-lg text-ink text-sm font-medium hover:bg-panel disabled:opacity-50"
          >
            Цуцлах
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !answer.trim()}
            className="flex-1 py-2 px-4 bg-brand text-on-brand rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Оруулаж байна…' : 'Оруулах'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Modal сайн бүрхүүлэлт.
 */
function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div
        className="bg-bg rounded-lg shadow-lg max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-ink">Бодлого бодох</h2>
          <button
            onClick={onClose}
            className="text-ink-dim hover:text-ink text-2xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
