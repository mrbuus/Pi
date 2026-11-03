"use client";

import { CircleX, CircleDashed } from "lucide-react";
import ChoiceContent from "@/components/ChoiceContent";
import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import TheoryContent from "@/components/theory/TheoryContent";
import FillAnswer from "@/components/thousand/FillAnswer";
import YoutubeEmbed from "@/components/thousand/YoutubeEmbed";
import { Badge } from "@/components/ui/kit/badge";
import { Card } from "@/components/ui/Surface";
import { isBlankAnswer } from "./lib";
import type { HwProblem, HwReview } from "./types";

/**
 * Илгээсний дараа алдсан бодлого: бодлого, сонголт дотор таны хариу (улаан) ба зөв хариу (ногоон),
 * баталгаажсан бодолт, бичлэг (эзэн 2026-11-03). Бодолт/зөв хариу байхгүй бол зөвхөн таны хариу.
 */
export default function HomeworkReviewCard({
  n,
  problem,
  mine,
  review,
  blank,
}: {
  n: number;
  problem: HwProblem;
  mine: unknown;
  /** Зөв хариу нээгдсэн бол; нууцлагдсан (хариулаагүй, хугацаа дуусаагүй) бол undefined */
  review: HwReview | undefined;
  blank: boolean;
}) {
  const myLabel = typeof mine === "string" ? mine.trim() : "";
  const right = typeof review?.correct === "string" ? review.correct : null;
  return (
    <Card padding="tight" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-ink">{n}-р бодлого</p>
        <Badge tone={blank ? "warning" : "danger"}>
          {blank ? <CircleDashed aria-hidden /> : <CircleX aria-hidden />} {blank ? "Хариулаагүй" : "Буруу"}
        </Badge>
      </div>

      <ProblemFigure imageKey={problem.imageKey} alt={`${n}-р бодлогын зураг`}>
        <MathText className="block text-ink">{problem.statementText ?? ""}</MathText>
      </ProblemFigure>

      {problem.choices && problem.choices.length > 0 && (
        <ul className="grid gap-2" aria-label="Сонголтууд">
          {problem.choices.map((c) => {
            const isMine = !!myLabel && myLabel.toUpperCase() === c.label.toUpperCase();
            const isRight = !!right && right.toUpperCase() === c.label.toUpperCase();
            const cls = isRight
              ? "border-success/50 bg-success/10"
              : isMine
                ? "border-error/50 bg-error/10"
                : "border-line";
            return (
              <li key={c.label} className={`flex items-start gap-3 rounded-xl border px-3 py-2 ${cls}`}>
                <span className="font-bold text-ink">{c.label}</span>
                <span className="min-w-0 flex-1 text-ink">
                  <ChoiceContent text={c.text} image={c.imageKey} />
                </span>
                {isMine && <span className="text-xs font-semibold text-ink-dim">Таны хариу</span>}
                {isRight && <span className="text-xs font-semibold text-success">Зөв хариу</span>}
              </li>
            );
          })}
        </ul>
      )}

      {(!problem.choices || problem.choices.length === 0) && (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">Таны хариу</span>
            {isBlankAnswer(mine) ? (
              <span className="text-ink-dim">Хариулаагүй</span>
            ) : (
              <FillAnswer statement={problem.statementText} value={mine} tone="error" />
            )}
          </div>
          {review && review.correct !== null && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">Зөв хариу</span>
              <FillAnswer statement={problem.statementText} value={review.correct} tone="success" />
            </div>
          )}
        </div>
      )}

      {review?.solution && (
        <section aria-label="Бодолт" className="rounded-xl border border-line bg-panel p-3">
          <p className="mb-1 text-sm font-bold text-brand-soft">Бодолт</p>
          <TheoryContent markdown={review.solution} className="text-sm" />
        </section>
      )}
      {review?.video && <YoutubeEmbed embedUrl={review.video.embedUrl} title={`${n}-р бодлогын бодолт`} />}
    </Card>
  );
}
