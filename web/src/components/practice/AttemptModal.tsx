"use client";

import ProblemVideoDisclosure from "@/components/lesson/ProblemVideoDisclosure";
import { useEffect, useState } from "react";
import { LoadingState, ErrorState } from "@/components/ui/StateBlock";
import MathText from "@/components/MathText";

import { api } from "@/lib/api";
// Recommendation type
type RecommendReason =
  "RETRY_TOPIC" | "WEAK_TOPIC" | "RIGHT_LEVEL" | "NEW_TOPIC" | "CONFIDENCE";

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
  statementText?: string | null;
  format: string;
  choices?: { label: string; text: string }[] | null;
}

export default function AttemptModal({
  recommendation,
  submitted,
  onClose,
  onSubmitSuccess,
}: AttemptModalProps) {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [answer, setAnswer] = useState<string>("");
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
        const msg = err instanceof Error ? err.message : "Алдаа гарлаа";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [recommendation.problemId]);

  // Esc дарахад хаана
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  // Оруулсан үр дүнг явуулна
  const handleSubmit = async () => {
    if (!answer.trim()) {
      setError("Хариулт оруулна уу");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api("/recommend/attempt", {
        method: "POST",
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
      const msg = err instanceof Error ? err.message : "Алдаа гарлаа";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <Modal onClose={onClose}>
        <LoadingState />
      </Modal>
    );
  if (error && !problem)
    return (
      <Modal onClose={onClose}>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </Modal>
    );

  if (!problem) return null;

  if (submitted) {
    return (
      <Modal onClose={onClose}>
        <div className="text-center py-12">
          <p className="text-lg font-semibold text-success mb-2">Баярлалаа!</p>
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
          <div className="text-sm text-ink bg-surface p-3 rounded">
            {problem.statementText ? (
              <MathText>{problem.statementText}</MathText>
            ) : (
              "Бодлогын текст алга — зургаас уншина уу."
            )}
          </div>
          <ProblemVideoDisclosure problemId={problem.id} />
        </div>

        {/* Хариулт оруулах */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-ink mb-2">
            Таны хариулт
          </label>
          {problem.choices?.length ? (
            <div className="grid gap-2" role="radiogroup" aria-label="Сонголтууд">
              {problem.choices.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  role="radio"
                  aria-checked={answer === c.label}
                  disabled={submitting}
                  onClick={() => setAnswer(c.label)}
                  className={`w-full rounded-lg border p-3 text-left text-sm text-ink ${
                    answer === c.label
                      ? "border-brand ring-2 ring-brand"
                      : "border-line hover:bg-panel"
                  }`}
                >
                  <MathText>{c.text}</MathText>
                </button>
              ))}
            </div>
          ) : (
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Хариулт оруулна уу…"
            disabled={submitting}
            className="w-full p-3 border border-line rounded-lg text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-brand text-sm"
            rows={4}
          />
          )}
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
            {submitting ? "Оруулаж байна…" : "Оруулах"}
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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
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
