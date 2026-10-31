"use client";

import { BookOpen, ChevronDown } from "lucide-react";
import { useState } from "react";
import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import ChoiceGrid, { type DisplayChoice } from "@/components/library/ChoiceGrid";
import { useSection } from "@/components/students/progress/useSection";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateBlock";

/** GET /schedule/test-problems — тестийн дарааллаар, хариутай (зөвхөн ажилтан) */
interface TestProblemsResponse {
  testId: string;
  short: string;
  problems: {
    id: string;
    number: number;
    format: string;
    statementText: string | null;
    imageKey: string | null;
    choices: unknown;
    choiceOptions: { label: string; text: string; imageKey: string | null; isCorrect: boolean }[];
    correctAnswer: unknown;
  }[];
}

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/**
 * Сонголтыг нэг хэлбэрт (бодлогын сангийн хуудастай ижил дүрэм): шинэ загвар
 * (choiceOptions) эсвэл хуучин JSON (`choices` + үсгэн `correctAnswer`).
 */
function choicesOf(p: TestProblemsResponse["problems"][number]): DisplayChoice[] {
  if (p.choiceOptions.length > 0)
    return p.choiceOptions.map((o) => ({ label: o.label, text: o.text, imageKey: o.imageKey, isCorrect: o.isCorrect }));
  if (!Array.isArray(p.choices) || p.choices.length === 0) return [];
  const texts = p.choices.map((t) => (typeof t === "string" ? t : String(t ?? "")));
  if (texts.every((t, i) => t.trim().toUpperCase() === LETTERS[i])) return [];
  const raw = typeof p.correctAnswer === "string" ? p.correctAnswer.trim() : "";
  const byLetter = /^[A-Ha-h]$/.test(raw) ? LETTERS.indexOf(raw.toUpperCase()) : -1;
  const correct = byLetter >= 0 ? byLetter : texts.findIndex((t) => raw !== "" && t.trim() === raw);
  return texts.map((text, i) => ({ label: LETTERS[i] ?? String(i + 1), text, isCorrect: i === correct }));
}

function answerText(answer: unknown): string | null {
  if (answer === null || answer === undefined || answer === "") return null;
  if (typeof answer !== "object") return String(answer);
  return Object.entries(answer as Record<string, unknown>)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}

/**
 * Хуваарийн цонхноос тестийн бодлогууд (эзэн 2026-10-31): багш хичээлдээ
 * өөр таб руу явалгүй бэлдэнэ — нэг жагсаалтад олон бодлого, хариутай,
 * шинжилгээгүй. Нээх хүртэл татахгүй.
 */
export default function TestProblems({ testId, label }: { testId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const { data, status, error, reload } = useSection<TestProblemsResponse | null>(
    open ? `/schedule/test-problems?testId=${encodeURIComponent(testId)}` : null,
    null,
  );
  return (
    <div className="rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-ink hover:bg-ink/[0.03]"
      >
        <BookOpen className="size-4 shrink-0 text-brand-soft" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="shrink-0 text-xs font-normal text-ink-dim">
          {data ? `${data.problems.length} бодлого` : "Бодлого харах"}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-ink-dim transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="border-t border-line px-3 py-3">
          {status === "loading" && !data && <SkeletonRows rows={4} />}
          {status === "error" && !data && <ErrorState message={error} onRetry={reload} />}
          {data && data.problems.length === 0 && <p className="text-sm text-ink-dim">Энэ тестэд бодлого алга</p>}
          {data && data.problems.length > 0 && (
            <ol className="space-y-4">
              {data.problems.map((p) => {
                const choices = p.format === "CHOICE" ? choicesOf(p) : [];
                const answer = choices.length ? null : answerText(p.correctAnswer);
                return (
                  <li key={p.id} className="flex items-start gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-bright/10 text-sm font-bold tabular-nums text-brand-soft">
                      {p.number}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <ProblemFigure imageKey={p.imageKey} alt={`${p.number}-р бодлогын зураг`} isStaffView variant="stacked">
                        <p className="text-sm text-ink">
                          <MathText>{p.statementText ?? ""}</MathText>
                        </p>
                      </ProblemFigure>
                      {choices.length > 0 && <ChoiceGrid choices={choices} showCorrect />}
                      {answer && (
                        <span className="inline-block rounded-lg bg-success/15 px-2 py-0.5 text-xs text-success ring-1 ring-success/40">
                          <MathText>{answer}</MathText>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
