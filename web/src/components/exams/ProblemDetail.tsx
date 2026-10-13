"use client";

import { CircleCheck, Pencil, TriangleAlert } from "lucide-react";
import ChoiceContent from "@/components/ChoiceContent";
import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import TheoryContent from "@/components/theory/TheoryContent";
import FillAnswer from "@/components/thousand/FillAnswer";
import YoutubeEmbed from "@/components/thousand/YoutubeEmbed";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { MetaTitle } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import type { StaffProblem } from "./analytics";

/**
 * «Бодлого» табын мөр дэлгэрэхэд: бодлого (LaTeX + зураг), зөв хариу, бодолт,
 * YouTube бичлэг. Багш+/Админд одоо байгаа засварын цонх (ProblemClassifyEditor).
 */
export default function ProblemDetail({
  problem,
  onEdit,
}: {
  problem: StaffProblem;
  onEdit?: () => void;
}) {
  const right = typeof problem.correctAnswer === "string" ? problem.correctAnswer : null;
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">
          {problem.order}-р бодлого <span className="font-medium text-ink-dim">({problem.points} оноо)</span>
        </p>
        {onEdit && (
          <Button size="sm" variant="outline" type="button" onClick={onEdit}>
            <Pencil aria-hidden /> Засах
          </Button>
        )}
      </div>

      <ProblemFigure imageKey={problem.imageKey} alt={`${problem.order}-р бодлогын зураг`} isStaffView>
        <MathText className="block text-ink">{problem.statementText ?? ""}</MathText>
      </ProblemFigure>

      {problem.choices && (
        <ul className="grid gap-1.5" aria-label="Сонголтууд">
          {problem.choices.map((c) => {
            const ok = right === c.letter;
            return (
              <li
                key={c.letter}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-1.5",
                  ok ? "border-success/50 bg-success/10" : "border-line",
                )}
              >
                <span className="font-bold text-ink">{c.letter}</span>
                <span className="min-w-0 flex-1 text-ink">
                  <ChoiceContent text={c.text} image={c.image} />
                </span>
                {ok && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <CircleCheck className="h-3.5 w-3.5" aria-hidden /> Зөв
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!problem.choices && problem.format === "CHOICE" && right && (
        <p className="text-sm text-ink">
          Зөв хариу: <span className="font-bold">{right}</span>
        </p>
      )}
      {problem.format !== "CHOICE" && problem.correctAnswer !== null && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-ink">Зөв хариу:</span>
          <FillAnswer statement={problem.statementText} value={problem.correctAnswer} tone="success" />
        </div>
      )}
      {problem.correctAnswer === null && (
        <p className="flex items-center gap-2 text-sm text-warning">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> Хариуны түлхүүр алга — дүнд тооцогдоогүй.
        </p>
      )}
      {problem.answerNeedsCheck && (
        <p className="flex items-center gap-2 text-sm text-warning">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> Хариуны түлхүүрийг дахин шалгах шаардлагатай.
        </p>
      )}

      {problem.solution && (
        <section aria-label="Бодолт" className="rounded-xl border border-line bg-panel p-3">
          <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-bold text-brand-soft">
            Бодолт
            {!problem.solutionVerified && <Badge tone="neutral">Баталгаажаагүй</Badge>}
          </p>
          <TheoryContent markdown={problem.solution} className="text-sm" />
        </section>
      )}
      {problem.youtube && (
        <YoutubeEmbed embedUrl={problem.youtube.embedUrl} title={`${problem.order}-р бодлогын бодолт`} />
      )}
      {problem.topics.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-dim">
          Сэдэв:
          {problem.topics.map((t) => (
            <MetaTitle key={t}>{t}</MetaTitle>
          ))}
        </p>
      )}
    </div>
  );
}
