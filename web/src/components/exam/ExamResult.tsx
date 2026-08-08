"use client";

import { useMemo } from "react";
import MathText from "@/components/MathText";

/* ============================================================================
 * ExamResult — дүн + сэдвээр задалсан задаргаа + бодлого бүрийн review +
 * дараагийн алхам (суралцахад үр дүнтэй болгосон).
 * ========================================================================== */

export interface ExamReviewItem {
  n: number;
  points: number;
  chapterId?: string;
  chapterTitle?: string;
  statementText?: string | null;
  answered: boolean;
  correct: boolean;
  answerUnknown?: boolean;
  myAnswer: string | null;
  solution?: string | null;
}

export default function ExamResult({
  title,
  total,
  max,
  leaveCount,
  items,
  onBackToList,
}: {
  title: string;
  total: number;
  max: number;
  leaveCount: number;
  items: ExamReviewItem[];
  onBackToList: () => void;
}) {
  const pct = max > 0 ? Math.round((total / max) * 100) : 0;

  // Сэдвээр задалсан дүн
  const topicStats = useMemo(() => {
    const byTopic = new Map<
      string,
      { title: string; correctPoints: number; totalPoints: number; count: number; correctCount: number }
    >();

    items.forEach((item) => {
      if (!item.chapterId) return;
      const key = item.chapterId;
      const existing = byTopic.get(key) || {
        title: item.chapterTitle || "Сэдэв",
        correctPoints: 0,
        totalPoints: 0,
        count: 0,
        correctCount: 0,
      };

      existing.totalPoints += item.points;
      existing.count += 1;

      if (item.answered && !item.answerUnknown) {
        if (item.correct) {
          existing.correctPoints += item.points;
          existing.correctCount += 1;
        }
      }

      byTopic.set(key, existing);
    });

    return Array.from(byTopic.values()).sort((a, b) => b.correctPoints - a.correctPoints);
  }, [items]);

  // Алдсан бодлогууд
  const missedItems = useMemo(
    () => items.filter((it) => it.answered && !it.answerUnknown && !it.correct),
    [items],
  );

  // Хариулаагүй бодлогууд
  const unansweredItems = useMemo(() => items.filter((it) => !it.answered), [items]);

  // Дараагийн алхам сугалах
  const nextSteps = useMemo(() => {
    const steps: string[] = [];

    if (pct < 50) {
      steps.push("Шалгалтад сул дүн авлаа. Үндсэн ойлголтуудыг дахин судлах шаардлагатай.");
    } else if (pct < 70) {
      steps.push("Дүн сайжирч болно. Сул гарсан сэдвүүдэд анхаарал өгнө үү.");
    } else if (pct < 85) {
      steps.push("Хэлэлцэх түвшний дүн авлаа. Жижиг нарийн ширийн зүйлүүдэд хүлээн авъя.");
    }

    if (missedItems.length > 0) {
      if (missedItems.length === 1) {
        steps.push(`${missedItems.length} бодлого буруу гарлаа. Түүний бодолтыг сайтар ойлгоно уу.`);
      } else if (missedItems.length <= 3) {
        steps.push(`${missedItems.length} бодлого буруу гарлаа. Эдгээр төрлийн асуулт дахин хийнэ үү.`);
      } else {
        steps.push(`${missedItems.length} бодлогод алдаа гарсан. Сэдвийн материалыг дахин унш.`);
      }
    }

    if (unansweredItems.length > 0) {
      if (unansweredItems.length === 1) {
        steps.push(`${unansweredItems.length} бодлогод хариул өгөөгүй байна.`);
      } else {
        steps.push(`${unansweredItems.length} бодлогод хариул өгөөгүй байна. Цагийн удирдлагыг сайжирна уу.`);
      }
    }

    if (steps.length === 0) {
      steps.push("Гайхалтай ажил! Дараагийн түвшний асуултуудыг оролдоно уу.");
    }

    return steps;
  }, [pct, missedItems, unansweredItems]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Оноо + хувь */}
      <div className="rounded-3xl border border-line bg-surface p-8 text-center">
        <p className="text-sm text-ink-dim">{title}</p>
        <p className="my-4 text-5xl font-extrabold text-brand-soft">
          {total}
          <span className="text-2xl text-ink-dim">/{max}</span>
        </p>
        <div className="mx-auto mb-4 h-3 max-w-xs overflow-hidden rounded-full bg-panel">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-bright to-accent-teal"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-ink-dim">{pct}% оноо авлаа</p>
        {leaveCount > 0 && (
          <p className="mt-2 text-xs text-warning">
            Шалгалтын горимоос {leaveCount} удаа гарсан нь бүртгэгдсэн.
          </p>
        )}
      </div>

      {/* Сэдвээр задалсан задаргаа */}
      {topicStats.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Сэдвүүдээр авсан оноо</h2>
          <div className="space-y-3">
            {topicStats.map((stat) => {
              const topicPct = Math.round((stat.correctPoints / stat.totalPoints) * 100);
              return (
                <div key={stat.title} className="rounded-lg border border-line bg-panel p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-ink">{stat.title}</p>
                    <p className="text-sm font-bold text-ink-dim">
                      {stat.correctPoints}/{stat.totalPoints} ({topicPct}%)
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg">
                    <div
                      className={`h-full ${
                        topicPct >= 80
                          ? "bg-success"
                          : topicPct >= 50
                            ? "bg-warning"
                            : "bg-error"
                      }`}
                      style={{ width: `${topicPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-ink-dim">
                    {stat.correctCount}/{stat.count} бодлого зөв
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Дараагийн алхам */}
      <div className="rounded-2xl border border-line bg-brand-bright/5 p-6">
        <h2 className="mb-3 font-bold text-brand">Дараагийн алхам</h2>
        <ul className="space-y-2">
          {nextSteps.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink">
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Бодлого бүрийн дүн */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Бодлого бүрийн дүн</h2>
          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it.n}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                  !it.answered || it.answerUnknown
                    ? "border-line opacity-70"
                    : it.correct
                      ? "border-success/30 bg-success/5"
                      : "border-error/30 bg-error/5"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    !it.answered || it.answerUnknown
                      ? "bg-panel text-ink-dim"
                      : it.correct
                        ? "bg-success/20 text-success"
                        : "bg-error/20 text-error"
                  }`}
                >
                  {it.n}
                </span>
                <div className="min-w-0 flex-1">
                  {it.chapterTitle && (
                    <p className="text-xs text-ink-dim">{it.chapterTitle}</p>
                  )}
                  {it.statementText && (
                    <div className="line-clamp-2 text-xs text-ink-dim">
                      <MathText>{it.statementText}</MathText>
                    </div>
                  )}
                  <p className="mt-1">
                    {!it.answered ? (
                      <span className="text-ink-dim">Хариулаагүй</span>
                    ) : it.answerUnknown ? (
                      <span className="text-ink-dim">Зөв хариу тодорхойгүй — дүнд тооцогдоогүй</span>
                    ) : (
                      <>
                        <span className={it.correct ? "text-success" : "text-error"}>
                          {it.correct ? "Зөв" : "Буруу"}
                        </span>
                        {it.myAnswer && (
                          <span className="ml-2 text-ink-dim">
                            Таны хариулт: <MathText>{it.myAnswer}</MathText>
                          </span>
                        )}
                      </>
                    )}
                  </p>
                  {/* Багшийн баталгаажуулсан бодолт — байвал л харагдана */}
                  {it.solution && (
                    <div className="mt-2 rounded-lg border border-brand-bright/20 bg-brand-bright/5 px-3 py-2 text-xs leading-relaxed">
                      <span className="font-bold text-brand-soft">Бодолт: </span>
                      <MathText>{it.solution}</MathText>
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-xs text-ink-dim">{it.points} оноо</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={onBackToList}
          className="rounded-xl bg-brand-bright px-6 py-3 font-bold text-on-brand"
        >
          Шалгалтын жагсаалт руу
        </button>
      </div>
    </div>
  );
}
