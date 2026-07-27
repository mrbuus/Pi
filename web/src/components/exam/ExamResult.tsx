"use client";

import MathText from "@/components/MathText";

/* ============================================================================
 * ExamResult — дүн + бодлого бүрийн review (зөв хариу задрахгүй, зөвхөн
 * зөв/буруу + багшийн баталгаажуулсан бодолт байвал).
 * ========================================================================== */

export interface ExamReviewItem {
  n: number;
  points: number;
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

  return (
    <div className="mx-auto max-w-2xl space-y-5">
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
