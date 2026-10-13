"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { Progress } from "@/components/ui/kit/progress";
import { MetaTitle } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";

interface Card {
  testResultId: string;
  test: { title: string; type: string };
  totalScore: number;
  maxScore: number;
  percent: number;
  parts: { part1: number; part1Max: number; part2: number; part2Max: number } | null;
  weakTopics: { name: string; percent: number }[];
  takenAt: string;
  acknowledgedAt: string | null;
  canAcknowledge: boolean;
}

/**
 * Эцэг эхийн «Хамгийн сүүлийн дүн» карт (SHALGALT-TOLOVLOGOO §4): оноо,
 * хувь, сул 2–3 сэдэв → [Дүнтэй танилцлаа] (одоо байгаа имэйл кодын урсгал).
 * Карт ачаалагдахгүй бол `fallback` (хуучин энгийн мөр) харагдана.
 */
export default function ExamResultCard({
  testResultId,
  version,
  onAcknowledge,
  fallback,
}: {
  testResultId: string;
  /** Танилцсаны дараа дахин ачаалах түлхүүр */
  version: number;
  onAcknowledge: () => void;
  fallback: ReactNode;
}) {
  const [card, setCard] = useState<Card | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setCard(await api<Card>(`/exam-results/parent/${encodeURIComponent(testResultId)}`));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [testResultId]);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load, version]);

  if (failed) return <>{fallback}</>;
  if (!card) return <div className="skeleton h-32 rounded-lg" aria-label="Дүн ачаалж байна" />;

  const tone = card.percent >= 70 ? "bg-success" : card.percent >= 40 ? "bg-warning" : "bg-error";
  return (
    <div className="space-y-3 rounded-lg bg-panel p-3">
      <div>
        <h3 className="font-semibold">Хамгийн сүүлийн дүн</h3>
        <p className="text-sm text-ink-dim">
          <MetaTitle>{card.test.title}</MetaTitle>
        </p>
      </div>
      <div className="flex items-end gap-3">
        <p className="font-display text-3xl font-extrabold tabular-nums text-ink">
          {card.totalScore}
          <span className="text-base text-ink-dim">/{card.maxScore}</span>
        </p>
        <p className="pb-1 font-bold tabular-nums text-ink">{card.percent}%</p>
      </div>
      <Progress value={card.percent} indicatorClassName={tone} aria-label={`${card.percent} хувь`} />
      {card.parts && card.parts.part2Max > 0 && (
        <p className="text-sm text-ink-dim">
          I хэсэг {card.parts.part1}/{card.parts.part1Max}, II хэсэг {card.parts.part2}/{card.parts.part2Max}
        </p>
      )}
      {card.weakTopics.length > 0 && (
        <div>
          <p className="text-sm font-semibold">Анхаарах сэдэв</p>
          <ul className="mt-1 space-y-1">
            {card.weakTopics.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  <MetaTitle>{t.name}</MetaTitle>
                </span>
                <span
                  className={cn(
                    "shrink-0 font-semibold tabular-nums",
                    t.percent < 40 ? "text-error" : t.percent < 70 ? "text-warning" : "text-ink",
                  )}
                >
                  {t.percent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-ink-dim">{card.takenAt.slice(0, 10)}</p>
      {card.acknowledgedAt ? (
        <p className="flex items-center gap-2 text-sm text-success">
          <Check size={16} aria-hidden /> Танилцсан — {card.acknowledgedAt.slice(0, 10)}
        </p>
      ) : card.canAcknowledge ? (
        <Button variant="outline" onClick={onAcknowledge} className="w-full sm:w-auto">
          Дүнтэй танилцлаа
        </Button>
      ) : null}
    </div>
  );
}
