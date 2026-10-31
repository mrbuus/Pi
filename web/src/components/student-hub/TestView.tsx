"use client";

import { ArrowLeft, CircleCheck, Clock, Eye, EyeOff, FileQuestion, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ChoiceContent from "@/components/ChoiceContent";
import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { cleanTitle } from "@/lib/studentTitle";
import { dayTitle, errorText } from "./lib";
import type { HubProblem, HubTestDetail } from "./types";

type Load =
  | { kind: "loading" }
  | { kind: "ready"; data: HubTestDetail }
  | { kind: "locked"; reason: "tomorrow" | "notDone" }
  | { kind: "missing" }
  | { kind: "error"; message: string };

/** 403-ийн хоёр шалтгааныг серверийн мессеж/кодоор ялгана (гэрээнд тусдаа код байхгүй) */
function lockReason(e: ApiError): "tomorrow" | "notDone" {
  const body = (e.body ?? {}) as { code?: unknown; message?: unknown };
  const text = [e.message, typeof body.message === "string" ? body.message : "", typeof body.code === "string" ? body.code : ""]
    .join(" ")
    .toLowerCase();
  return /маргааш|tomorrow|not_open|not open|today|өнөөдөр/.test(text) ? "tomorrow" : "notDone";
}

/**
 * Анги хийсэн тестийн бодлогууд (SURAGCH-V2-GEREE): нөхцөл, сонголт LaTeX-ээр, зураг,
 * бодлого бүрийн зөв хариу товчоор нээгдэнэ (анхдагч нуусан — өөрийгөө шалгах).
 */
export default function TestView({ testId }: { testId: string }) {
  const router = useRouter();
  const [state, setState] = useState<Load>({ kind: "loading" });
  const [tick, setTick] = useState(0);
  const [revealAll, setRevealAll] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let alive = true;
    api<HubTestDetail>(`/student-hub/tests/${encodeURIComponent(testId)}`)
      .then((data) => alive && setState({ kind: "ready", data }))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 403) setState({ kind: "locked", reason: lockReason(e) });
        else if (e instanceof ApiError && e.status === 404) setState({ kind: "missing" });
        else setState({ kind: "error", message: errorText(e) });
      });
    return () => {
      alive = false;
    };
  }, [testId, tick]);

  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/app/my-class?tab=tests");
  };

  const toggle = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button
        type="button"
        onClick={back}
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-ink-dim hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Буцах
      </button>

      {state.kind === "loading" && (
        <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-4">
          <SkeletonLine width="60%" height={24} />
          <SkeletonLine width="35%" />
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-40 rounded-xl" />
          ))}
        </div>
      )}
      {state.kind === "error" && <ErrorState message={state.message} onRetry={() => setTick((t) => t + 1)} />}
      {state.kind === "missing" && <EmptyState icon={FileQuestion} title="Тест олдсонгүй" />}
      {state.kind === "locked" &&
        (state.reason === "tomorrow" ? (
          <EmptyState icon={Clock} title="Маргааш нээгдэнэ" hint="Ангид хийсэн тест дараагийн өдөр нь энд нээгдэнэ" />
        ) : (
          <EmptyState icon={Lock} title="Танай анги энэ тестийг хийгээгүй" />
        ))}

      {state.kind === "ready" && (
        <>
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="cyrillic-heading text-xl font-extrabold text-ink">
                {cleanTitle(state.data.title, state.data.variant, state.data.title)}
              </h1>
              <Meta
                className="mt-1 text-sm text-ink-dim"
                items={[
                  dayTitle(state.data.date),
                  state.data.variant ? `${state.data.variant} хувилбар` : null,
                  `${state.data.problems.length} бодлого`,
                ]}
              />
            </div>
            {state.data.problems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setRevealAll((v) => !v);
                  setRevealed(new Set());
                }}
                aria-pressed={revealAll}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:bg-ink/5"
              >
                {revealAll ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                {revealAll ? "Хариуг нуух" : "Бүх хариу"}
              </button>
            )}
          </header>

          {state.data.problems.length === 0 ? (
            <EmptyState icon={FileQuestion} title="Энэ тестэд бодлого алга" />
          ) : (
            <ol className="space-y-3">
              {[...state.data.problems]
                .sort((a, b) => a.order - b.order)
                .map((p, i) => (
                  <ProblemCard
                    key={p.id}
                    problem={p}
                    number={i + 1}
                    open={revealAll !== revealed.has(p.id)}
                    onToggle={() => toggle(p.id)}
                  />
                ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

function ProblemCard({
  problem,
  number,
  open,
  onToggle,
}: {
  problem: HubProblem;
  number: number;
  open: boolean;
  onToggle: () => void;
}) {
  const answer = problem.correctAnswer?.trim() ?? "";
  const correctChoice = problem.choices.find((c) => c.label.trim().toUpperCase() === answer.toUpperCase()) ?? null;
  const answerId = `answer-${problem.id}`;

  return (
    <li className="rounded-xl border border-line bg-surface p-4 elev-1">
      <div className="flex gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-bright/15 text-sm font-bold tabular-nums text-brand-soft">
          {number}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <ProblemFigure imageKey={problem.imageKey} variant="stacked">
            <div className="text-ink">
              <MathText>{problem.stem}</MathText>
            </div>
          </ProblemFigure>

          {problem.choices.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {problem.choices.map((c) => {
                const right = open && correctChoice?.label === c.label;
                return (
                  <li
                    key={c.label}
                    className={cn(
                      "flex min-w-0 items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                      right ? "border-success bg-success/10" : "border-line",
                    )}
                  >
                    <span className={cn("shrink-0 font-bold", right ? "text-success" : "text-ink-dim")}>{c.label}</span>
                    <span className="min-w-0 flex-1 overflow-x-auto text-ink">
                      <ChoiceContent text={c.text} image={c.imageKey} />
                    </span>
                    {right && <CircleCheck className="size-4 shrink-0 text-success" aria-label="Зөв хариу" />}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls={answerId}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-soft hover:bg-brand-bright/10"
            >
              {open ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              {open ? "Хариуг нуух" : "Хариу харах"}
            </button>
            <div id={answerId} aria-live="polite">
              {open && answer && (
                <span className="inline-flex items-center gap-1.5 text-sm text-ink">
                  <span className="text-ink-dim">Хариу</span>
                  <b className="font-bold text-success">
                    {correctChoice ? correctChoice.label : <MathText>{answer}</MathText>}
                  </b>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
