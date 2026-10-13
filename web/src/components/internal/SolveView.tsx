"use client";

import { ArrowLeft, Check, CircleCheck, CircleHelp, CircleX, ListChecks, LoaderCircle, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import FillNumberAnswer from "@/components/exam/FillNumberAnswer";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { getRole } from "@/lib/api";
import { cn } from "@/lib/cn";
import { draftApi, type CheckResult, type CheckSummary } from "./draftApi";
import { LETTERS, type DraftBlock, type DraftSetFull } from "./model";
import { DraftImage, SolutionView } from "./ProblemView";
import { NoAccess } from "./SetDialogs";

const noop = () => () => {};
const storeKey = (id: string) => `pi_draft_solve_${id}`;

function readAnswers(id: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(storeKey(id));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export default function SolveView({ id }: { id: string }) {
  const role = useSyncExternalStore(noop, getRole, () => null);
  if (role === null) return null;
  if (role !== "ADMIN" && role !== "TEACHER_PLUS") return <NoAccess />;
  return <Solve id={id} />;
}

/**
 * «Бодох» — ажилтан ноорогийг сурагч шиг бодож, түлхүүртэй тулгана. Дүгнэлт
 * серверийн шалгалтын хөдөлгүүрээр (gradeAnswer) — хадгалахгүй. Хариулт энэ
 * төхөөрөмжид үлдэнэ, дараа нь үргэлжлүүлж болно.
 */
function Solve({ id }: { id: string }) {
  const [set, setSet] = useState<DraftSetFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => readAnswers(id));
  const [result, setResult] = useState<CheckSummary | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let alive = true;
    draftApi
      .get(id)
      .then((data) => alive && setSet(data))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Ноорогийг нээж чадсангүй"));
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  useEffect(() => {
    try {
      localStorage.setItem(storeKey(id), JSON.stringify(answers));
    } catch {
      /* хувийн горимд хадгалахгүй — бодоход саад биш */
    }
  }, [answers, id]);

  const byBlock = useMemo(() => new Map(result?.results.map((r) => [r.blockId, r]) ?? []), [result]);
  const answered = set ? set.blocks.filter((b) => answers[b.id]?.replace(/_/g, "").trim()).length : 0;

  async function check() {
    setChecking(true);
    try {
      setResult(await draftApi.check(id, answers));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Шалгаж чадсангүй");
    } finally {
      setChecking(false);
    }
  }

  function restart() {
    setAnswers({});
    setResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (error && !set) return <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!set)
    return (
      <div role="status" aria-label="Ачаалж байна" className="mx-auto max-w-2xl space-y-4">
        <SkeletonLine width="40%" height={28} />
        {[0, 1].map((i) => (
          <div key={i} className="chunky space-y-3 p-6">
            <SkeletonLine width={40} height={40} />
            <SkeletonLine width="85%" />
            <SkeletonLine width="60%" />
          </div>
        ))}
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl pb-32">
      <Link
        href={`/app/internal/${id}`}
        className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-1 text-sm font-semibold text-ink-dim transition hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Засвар руу
      </Link>
      <h1 className="cyrillic-heading mt-1 text-2xl font-extrabold tracking-tight text-ink">{set.title}</h1>
      <p className="mt-1 text-sm text-ink-dim">Сурагч шиг бодоод түлхүүртэй тулгана</p>

      {result && <Summary result={result} onRestart={restart} id={id} />}

      {set.blocks.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={ListChecks} title="Бодлого алга" hint="Эхлээд ноорогт бодлого нэмнэ" />
        </div>
      ) : (
        <ol className="mt-6 space-y-5">
          {set.blocks.map((b, i) => (
            <li key={b.id}>
              <SolveCard
                block={b}
                n={i + 1}
                value={answers[b.id] ?? ""}
                locked={!!result}
                result={byBlock.get(b.id)}
                onChange={(v) => setAnswers((a) => ({ ...a, [b.id]: v }))}
              />
            </li>
          ))}
        </ol>
      )}

      {!result && set.blocks.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 lg:bottom-6 lg:left-auto lg:right-8 lg:w-auto lg:px-0">
          <div className="chunky elev-2 mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 lg:max-w-none">
            <span className="text-sm text-ink-dim">
              <span className="font-display text-base font-bold text-ink">{answered}</span>/{set.blocks.length} хариулсан
            </span>
            <span className="flex-1" />
            <Button onClick={() => void check()} disabled={checking || answered === 0}>
              {checking ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}
              Шалгах
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ result, onRestart, id }: { result: CheckSummary; onRestart: () => void; id: string }) {
  const keyed = result.total - result.unkeyed;
  const pct = keyed ? Math.round((result.correct / keyed) * 100) : 0;
  return (
    <section aria-label="Дүн" className="chunky mt-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-5">
        <div
          className="relative flex size-20 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--success) ${pct * 3.6}deg, color-mix(in oklab, var(--ink) 8%, transparent) 0deg)` }}
          aria-hidden
        >
          <span className="flex size-16 items-center justify-center rounded-full bg-surface font-display text-lg font-bold text-ink">
            {pct}%
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold text-ink">
            {result.correct}/{keyed} зөв
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5 text-xs font-semibold">
            {result.wrong > 0 && <li className="rounded-full bg-error/10 px-2.5 py-1 text-error">{result.wrong} буруу</li>}
            {result.blank > 0 && <li className="rounded-full bg-ink/5 px-2.5 py-1 text-ink-dim">{result.blank} хоосон</li>}
            {result.unkeyed > 0 && <li className="rounded-full bg-brand-tint px-2.5 py-1 text-brand-soft">{result.unkeyed} хариугүй бодлого</li>}
          </ul>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={onRestart}>
          <RotateCcw aria-hidden /> Дахин бодох
        </Button>
        <Button variant="secondary" asChild>
          <Link href={`/app/internal/${id}`}>Засвар руу</Link>
        </Button>
      </div>
    </section>
  );
}

function ResultLine({ result, kind }: { result: CheckResult; kind: string }) {
  if (result.correct === null)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-brand-tint/70 px-3 py-2 text-sm font-semibold text-brand-soft">
        <CircleHelp className="size-4 shrink-0" aria-hidden /> Түлхүүр оруулаагүй тул шалгахгүй
      </p>
    );
  if (result.correct)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-sm font-bold text-success">
        <CircleCheck className="size-4 shrink-0" aria-hidden /> Зөв
      </p>
    );
  return (
    <p className="flex flex-wrap items-center gap-2 rounded-xl bg-error/10 px-3 py-2 text-sm font-bold text-error">
      <CircleX className="size-4 shrink-0" aria-hidden />
      {result.given ? "Буруу" : "Хариулаагүй"}
      <span className="font-semibold text-ink">
        — зөв хариу {kind === "CHOICE" ? result.key : <span className="font-mono">{result.key}</span>}
      </span>
    </p>
  );
}

function SolveCard({
  block,
  n,
  value,
  locked,
  result,
  onChange,
}: {
  block: DraftBlock;
  n: number;
  value: string;
  locked: boolean;
  result?: CheckResult;
  onChange: (value: string) => void;
}) {
  const textless = block.kind === "CHOICE" && block.choices.every((c) => !c.trim());
  return (
    <article aria-label={`${n}-р бодлого`} className="chunky p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-bright/15 font-display text-base font-bold text-brand-soft">
          {n}
        </span>
        <span className="text-xs text-ink-dim">{block.points} оноо</span>
      </div>
      {block.statement.trim() && (
        <div className="selectable text-lg leading-relaxed text-ink">
          <MathText>{block.statement}</MathText>
        </div>
      )}
      {block.imageKey && <DraftImage imageKey={block.imageKey} className="mt-3" />}

      <div className="mt-5 border-t border-line pt-5">
        {block.kind === "CHOICE" ? (
          textless ? (
            <div role="group" aria-label={`${n}-р бодлогын сонголт`} className="flex flex-wrap gap-2.5">
              {block.choices.map((_, i) => {
                const letter = LETTERS[i];
                return (
                  <ChoiceButton key={letter} letter={letter} selected={value === letter} locked={locked} result={result} onSelect={() => onChange(letter)} compact />
                );
              })}
            </div>
          ) : (
            <div role="group" aria-label={`${n}-р бодлогын сонголт`} className="space-y-2.5">
              {block.choices.map((text, i) => {
                const letter = LETTERS[i];
                return (
                  <ChoiceButton key={letter} letter={letter} selected={value === letter} locked={locked} result={result} onSelect={() => onChange(letter)}>
                    <MathText>{text}</MathText>
                  </ChoiceButton>
                );
              })}
            </div>
          )
        ) : locked ? (
          <p className="text-sm text-ink-dim">
            Таны хариу: <span className="font-mono font-bold text-ink">{value.replace(/_/g, "") || "—"}</span>
          </p>
        ) : (
          <FillNumberAnswer
            problemNumber={n}
            statementText={block.statement}
            value={value}
            onChange={(update) => onChange(update(value))}
            theme="light"
          />
        )}
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          <ResultLine result={result} kind={block.kind} />
          <SolutionView solution={block.solution} />
        </div>
      )}
    </article>
  );
}

function ChoiceButton({
  letter,
  selected,
  locked,
  result,
  onSelect,
  compact = false,
  children,
}: {
  letter: string;
  selected: boolean;
  locked: boolean;
  result?: CheckResult;
  onSelect: () => void;
  compact?: boolean;
  children?: ReactNode;
}) {
  const isKey = locked && result?.key === letter;
  const wrongPick = locked && selected && result?.correct === false;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={locked}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-2xl border-2 border-b-4 text-left text-base leading-relaxed transition disabled:cursor-default",
        compact ? "size-14 justify-center p-0 text-lg font-bold" : "w-full px-4 py-3.5",
        !locked && "active:translate-y-0.5 active:border-b-2 motion-reduce:active:translate-y-0",
        isKey
          ? "border-success bg-success/10"
          : wrongPick
            ? "border-error bg-error/10"
            : selected
              ? "border-brand-bright bg-brand-bright/15"
              : "border-line bg-surface hover:border-brand-bright/50",
      )}
    >
      {compact ? (
        letter
      ) : (
        <>
          <span
            aria-hidden
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold",
              isKey
                ? "border-success bg-success text-on-success"
                : wrongPick
                  ? "border-error bg-error text-on-error"
                  : selected
                    ? "border-brand-bright bg-brand-bright text-on-brand"
                    : "border-line text-ink-dim",
            )}
          >
            {isKey ? <Check className="size-4" /> : wrongPick ? <X className="size-4" /> : letter}
          </span>
          <span className="min-w-0 flex-1">{children}</span>
          <span className="sr-only">{letter} сонголт</span>
        </>
      )}
    </button>
  );
}
