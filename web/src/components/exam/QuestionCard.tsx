"use client";

import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import ChoiceList from "./ChoiceList";
import FillNumberAnswer from "./FillNumberAnswer";
import SelfAssessment from "./SelfAssessment";

/* ============================================================================
 * QuestionCard — нэг бодлогын карт: дугаар/оноо → мэдэгдэл (+байвал зураг)
 * → хариултын хэсэг (тодорхой тусгаарлагдсан) → өөрийн тэмдэглэгээ.
 *
 * READING COMFORT: мэдэгдэл .prose-measure-т хязгаарлагдана (урт мөр
 * дэлгэц дүүрэн сунахгүй), хариултын хэсэг зураас+зайгаар тодорхой тусдаа.
 * ========================================================================== */

export interface QuestionCardProblem {
  id: string;
  format: string;
  statementText?: string | null;
  imageKey?: string | null;
  points: number;
  choiceMode: "TEXT" | "LETTER" | null;
  choices: string[] | null;
}

export default function QuestionCard({
  problem,
  problemNumber,
  answer,
  onAnswer,
  selfState,
  onSelfState,
  keypadTheme,
}: {
  problem: QuestionCardProblem;
  problemNumber: number;
  answer: number | string | undefined;
  onAnswer: (value: number | string) => void;
  selfState: string | undefined;
  onSelfState: (value: string) => void;
  keypadTheme: "navy" | "light";
}) {
  const pid = problem.id;

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-bright/15 text-base font-bold text-brand-soft">
          {problemNumber}
        </span>
        <span className="text-[11px] text-ink-dim">{problem.points} оноо</span>
      </div>

      {/* Мэдэгдэл (+ байвал зураг хажуугаар) — уншихад тав тухтай өргөнд хязгаарлана */}
      <ProblemFigure imageKey={problem.imageKey} isCurrent>
        <div className="prose-measure text-lg leading-relaxed">
          <MathText>{problem.statementText ?? ""}</MathText>
        </div>
      </ProblemFigure>

      {/* Хариултын хэсэг — мэдэгдлээс тод тусгаарлагдсан */}
      <div className="mt-6 border-t border-line pt-5">
        {problem.choiceMode === "TEXT" && problem.choices ? (
          <ChoiceList
            mode="TEXT"
            choices={problem.choices}
            selected={answer}
            onSelect={onAnswer}
            problemNumber={problemNumber}
          />
        ) : problem.choiceMode === "LETTER" && problem.choices ? (
          <ChoiceList
            mode="LETTER"
            choices={problem.choices}
            selected={answer}
            onSelect={onAnswer}
            problemNumber={problemNumber}
          />
        ) : problem.format === "FILL_NUMBER" ? (
          <FillNumberAnswer
            problemNumber={problemNumber}
            statementText={problem.statementText}
            value={String(answer ?? "")}
            onChange={(update) => onAnswer(update(String(answer ?? "")))}
            theme={keypadTheme}
          />
        ) : (
          <div className="max-w-xs">
            <label htmlFor={`answer-${pid}`} className="mb-1 block text-xs text-ink-dim">
              Хариугаа бичнэ үү
            </label>
            <input
              id={`answer-${pid}`}
              value={String(answer ?? "")}
              onChange={(e) => onAnswer(e.target.value)}
              className="w-full rounded-xl border border-line bg-transparent px-4 py-3 text-base text-ink outline-none focus-visible:border-brand-bright"
            />
          </div>
        )}
      </div>

      <SelfAssessment value={selfState} onChange={onSelfState} />
    </div>
  );
}
