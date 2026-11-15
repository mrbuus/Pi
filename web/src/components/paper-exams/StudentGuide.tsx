"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Lightbulb, ListChecks, LockOpen, Sigma } from "lucide-react";
import MathText from "@/components/MathText";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Card } from "@/components/ui/Surface";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { errorText } from "@/components/exams/types";
import { cn } from "@/lib/cn";
import { choiceLayout, Lines, readStore, shownLabel, writeStore } from "./PaperGuide";
import type { GuideStageData, StudentGuide as Guide, StudentGuideEntry } from "./types";

/**
 * Сурагчийн «Алдсан бодлогын тайлбар» (эзэн 2026-11-15): зөвхөн өөрийн хувилбарын АЛДСАН
 * бодлого. Хуудсанд эхэндээ нөхцөл, сонголт л ирнэ; чанар → энгийн тайлбар → 100x100-ын
 * төстэй бодлого → бодолтын алхам → зөв хариуг «Нээх» дарах бүрд серверээс нэг нэгээр авна.
 * Дахин оролдлогыг сервер шалгана — зөв хариу хуудас руу эрт очихгүй.
 */
interface Progress {
  stage: number;
  tries: number;
  wrong: string[];
  fixed: boolean;
  retry?: Record<string, string>;
  parts?: boolean[];
  /** Сонгох бодлогод зассан үсэг */
  right?: string;
}
const EMPTY: Progress = { stage: 0, tries: 0, wrong: [], fixed: false };
const LETTERS = ["A", "B", "C", "D", "E"];
const HINTS = ["Ашиглагдах чанар", "Энгийнээр хэлбэл", "100x100 номын төстэй бодлого"];
const base = (id: string) => `/paper-exams/my/${encodeURIComponent(id)}/guide`;

export default function StudentGuide({
  examId,
  open,
  onOpen,
}: {
  examId: string;
  open: string | null;
  onOpen: (label: string | null) => void;
}) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    api<Guide>(base(examId))
      .then((g) => {
        setError("");
        setGuide(g);
      })
      .catch((e) => setError(errorText(e, "Тайлбарыг ачаалж чадсангүй")));
  }, [examId]);
  useEffect(load, [load]);

  const storeKey = `paper-student-guide:${examId}`;
  const [progress, setProgress] = useState<Record<string, Progress>>(() => readStore(storeKey, {}));
  useEffect(() => writeStore(storeKey, progress), [storeKey, progress]);
  const patch = (label: string, next: Partial<Progress>) =>
    setProgress((prev) => ({ ...prev, [label]: { ...(prev[label] ?? EMPTY), ...next } }));

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!guide) return <SkeletonRows rows={4} />;
  const entries = guide.entries;
  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-sm text-ink-dim">Алдсан бодлого алга — тайлбар шаардлагагүй</p>
      </Card>
    );
  }

  const current = open === null ? -1 : entries.findIndex((e) => e.label === open);
  if (current < 0) {
    return (
      <Card>
        <h2 className="mb-1 flex items-center gap-2 font-bold text-brand-soft">
          <ListChecks className="size-5" aria-hidden /> Алдсан бодлогын тайлбар
        </h2>
        <p className="mb-4 text-sm text-ink-dim">
          {guide.variant} хувилбар. Бодлогоо дарж санамжийг нэг нэгээр нээгээд дахин оролдоорой. Ногоон нь санамж аваад зассан бодлого
        </p>
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2">
          {entries.map((e) => (
            <li key={e.label}>
              <button
                onClick={() => onOpen(e.label)}
                className={cn(
                  "h-12 w-full rounded-xl border-2 text-sm font-bold tabular-nums",
                  progress[e.label]?.fixed ? "border-success bg-panel text-success" : "border-error bg-error/12 text-error",
                )}
              >
                {shownLabel(e.label)}
              </button>
            </li>
          ))}
        </ol>
      </Card>
    );
  }

  const entry = entries[current];
  return (
    <Problem
      key={entry.label}
      examId={examId}
      entry={entry}
      progress={progress[entry.label] ?? EMPTY}
      onPatch={(next) => patch(entry.label, next)}
      position={`${current + 1} / ${entries.length}`}
      onBack={() => onOpen(null)}
      onPrev={current > 0 ? () => onOpen(entries[current - 1].label) : undefined}
      onNext={current < entries.length - 1 ? () => onOpen(entries[current + 1].label) : undefined}
    />
  );
}

function Problem({
  examId,
  entry,
  progress: r,
  onPatch,
  position,
  onBack,
  onPrev,
  onNext,
}: {
  examId: string;
  entry: StudentGuideEntry;
  progress: Progress;
  onPatch: (next: Partial<Progress>) => void;
  position: string;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const c = entry.content;
  const last = 3 + c.stepCount;
  const [shown, setShown] = useState<GuideStageData>({ stage: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = `${base(examId)}/${encodeURIComponent(entry.label)}`;

  // Зассан бол бүх тайлбар, бодолт нээгдэнэ; эс бол нээсэн шат хүртэл
  const want = r.fixed ? last : r.stage;
  useEffect(() => {
    if (want === 0) return;
    let live = true;
    api<GuideStageData>(`${url}?stage=${want}`)
      .then((d) => live && (setError(""), setShown(d)))
      .catch((e) => live && setError(errorText(e, "Санамжийг ачаалж чадсангүй")));
    return () => {
      live = false;
    };
  }, [url, want]);

  const revealed = shown.answer !== undefined || shown.fields !== undefined;
  const steps = shown.steps ?? [];

  const check = async (answer: unknown) => {
    setBusy(true);
    try {
      const res = await api<{ correct: boolean; parts?: boolean[] }>(`${url}/check`, { method: "POST", body: { answer } });
      return res;
    } catch (e) {
      setError(errorText(e, "Шалгаж чадсангүй"));
      return null;
    } finally {
      setBusy(false);
    }
  };
  const choose = async (letter: string) => {
    if (busy || revealed || r.fixed || r.wrong.includes(letter)) return;
    const res = await check(letter);
    if (!res) return;
    onPatch(res.correct ? { tries: r.tries + 1, fixed: true, right: letter } : { tries: r.tries + 1, wrong: [...r.wrong, letter] });
  };
  const values: Record<string, string> = revealed
    ? Object.fromEntries((shown.fields ?? []).map((f) => [f.key, f.value]))
    : (r.retry ?? {});
  const submitFill = async () => {
    if (busy) return;
    const res = await check(r.retry ?? {});
    if (!res) return;
    onPatch({ tries: r.tries + 1, fixed: res.correct, parts: res.parts });
  };
  const layout = choiceLayout(c.choices ?? []);
  const five = c.choices?.length === 5;
  const correctLetter = shown.answer ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-dim hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Алдсан бодлогууд
        </button>
        {r.fixed ? <Badge tone="success">Санамж аваад зөв болголоо</Badge> : <Badge tone="danger">Алдсан</Badge>}
      </div>

      <Card>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tabular-nums text-ink">{shownLabel(entry.label)}</span>
          <span className="text-sm text-ink-dim">{c.points} оноо</span>
          <span className="ml-auto text-xs font-semibold text-brand-soft">{c.topic}</span>
        </div>
        {c.image && (
          // eslint-disable-next-line @next/next/no-img-element -- санд хадгалсан жижиг data URI зураг
          <img src={c.image} alt="Бодлогын зураг" draggable={false} className="mx-auto mb-3 block max-w-full rounded-lg bg-white sm:max-w-sm" />
        )}
        <div className="overflow-x-auto overflow-y-hidden text-ink">
          <Lines lines={c.statement} />
        </div>

        {c.kind === "choice" && c.choices && (
          <div
            className={cn(
              "mt-4 grid gap-2",
              layout === "stack" ? "grid-cols-1" : layout === "split" || !five ? "grid-cols-6" : "grid-cols-6 sm:grid-cols-5",
            )}
          >
            {c.choices.map((choice, i) => {
              const letter = LETTERS[i];
              const good = r.right === letter || correctLetter === letter;
              const bad = r.wrong.includes(letter);
              return (
                <button
                  key={letter}
                  onClick={() => choose(letter)}
                  aria-disabled={revealed || r.fixed || bad || busy}
                  className={cn(
                    "flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-xl border-2 px-3 py-1.5 text-ink",
                    layout === "split" && (i < 3 ? "col-span-2" : "col-span-3"),
                    layout === "row" && five && (i < 3 ? "col-span-2 sm:col-span-1" : "col-span-3 sm:col-span-1"),
                    layout === "row" && !five && "col-span-3",
                    good ? "border-success bg-success/15" : bad ? "border-error bg-error/12" : "border-line bg-panel",
                    !revealed && !r.fixed && !bad && "hover:border-brand",
                  )}
                >
                  <span className="font-bold text-ink-dim">{letter}</span>
                  <span className="whitespace-nowrap">
                    <MathText>{`$${choice}$`}</MathText>
                  </span>
                  {good && <Check className="size-4 shrink-0 text-success" aria-label="зөв хариу" />}
                </button>
              );
            })}
          </div>
        )}

        {c.kind === "fill" && c.fields && (
          <>
            <div className="mt-4 flex flex-wrap gap-3">
              {c.fields.map((f) => {
                const ok = revealed || r.fixed ? true : r.parts?.[f.part];
                return (
                  <label key={f.key} className="flex flex-col items-center gap-1 text-sm font-bold text-ink-dim">
                    {f.key}
                    <input
                      inputMode="numeric"
                      maxLength={f.key.length}
                      readOnly={revealed || r.fixed}
                      value={values[f.key] ?? ""}
                      onChange={(e) => onPatch({ retry: { ...(r.retry ?? {}), [f.key]: e.target.value.replace(/[^0-9]/g, "") } })}
                      className={cn(
                        "h-13 rounded-xl border-2 bg-panel text-center text-xl font-bold text-ink outline-none focus:border-brand",
                        f.key.length > 1 ? "w-19" : "w-14",
                        ok === undefined ? "border-line" : ok ? "border-success bg-success/15" : "border-error bg-error/12",
                      )}
                    />
                  </label>
                );
              })}
            </div>
            {!revealed && !r.fixed && (
              <button onClick={submitFill} disabled={busy} className="mt-4 min-h-12 rounded-xl bg-brand px-5 font-semibold text-on-brand disabled:opacity-60">
                Шалгах
              </button>
            )}
          </>
        )}

        {!revealed && !r.fixed && (
          <p className={cn("mt-3 text-sm font-semibold", r.tries ? "text-error" : "text-ink-dim")}>
            {r.tries === 0
              ? "Санамж аваад дахин оролдоорой. Зөв хариу хамгийн сүүлд нээгдэнэ"
              : c.kind === "fill"
                ? "Ногоон нүд зөв, улаан нүдийг засаарай. Хэрэгтэй бол дараагийн санамжийг аваарай"
                : "Алдсан байна. Дараагийн санамжийг аваад дахин оролдоорой"}
          </p>
        )}
        {r.fixed && <p className="mt-3 text-sm font-semibold text-success">Зөв! {r.stage} санамж ашиглалаа</p>}
        {error && <p className="mt-3 text-sm font-semibold text-error">{error}</p>}
      </Card>

      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < Math.min(4, r.fixed ? 4 : r.stage) ? "bg-brand" : "bg-line")} />
        ))}
      </div>

      {shown.rule && (
        <section className="rounded-2xl border border-line border-l-4 border-l-error bg-panel px-4 py-3">
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-error">
            <Sigma className="size-4" aria-hidden /> АШИГЛАГДАХ ЧАНАР
          </h3>
          <div className="overflow-x-auto overflow-y-hidden font-semibold text-ink">
            <Lines lines={shown.rule} />
          </div>
        </section>
      )}
      {shown.easy && (
        <section className="rounded-2xl border border-line bg-panel px-4 py-3">
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-dim">
            <Lightbulb className="size-4" aria-hidden /> ЭНГИЙНЭЭР ХЭЛБЭЛ
          </h3>
          <div className="overflow-x-auto overflow-y-hidden text-ink">
            <Lines lines={shown.easy} />
          </div>
        </section>
      )}
      {shown.refs && shown.refs.length > 0 && (
        <section className="rounded-2xl bg-brand-bright/10 px-4 py-3">
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-brand-soft">
            <BookOpen className="size-4" aria-hidden /> 100x100 НОМД ТӨСТЭЙ БОДЛОГО
          </h3>
          <ul className="text-sm text-ink">
            {shown.refs.map((ref, i) => (
              <li key={i} className="my-1.5 overflow-x-auto overflow-y-hidden">
                <span className="font-semibold">
                  {ref.chapter}, Тест {ref.test}, №{ref.number}
                </span>
                <span className="text-ink-dim"> — </span>
                <MathText>{ref.text}</MathText>
              </li>
            ))}
          </ul>
        </section>
      )}
      {steps.length > 0 && (
        <section className="rounded-2xl border border-line bg-panel px-4 py-3">
          <h3 className="mb-1 text-xs font-bold tracking-wide text-ink-dim">
            БОДОЛТ{steps.length < c.stepCount ? ` · ${steps.length} / ${c.stepCount} алхам` : ""}
          </h3>
          <div className="text-ink">
            <Lines lines={steps} mathClass="text-brand-soft" />
          </div>
        </section>
      )}
      {revealed && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-success bg-success/15 px-4 py-3 font-bold text-ink">
          Зөв хариу:
          {c.kind === "choice" && c.choices && shown.answer ? (
            <>
              {shown.answer} <MathText>{`$${c.choices[LETTERS.indexOf(shown.answer)]}$`}</MathText>
            </>
          ) : (
            <span>{(shown.fields ?? []).map((f) => `${f.key} = ${f.value}`).join(", ")}</span>
          )}
        </div>
      )}
      {!r.fixed && r.stage < last && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-line px-4 py-3">
          <span className="flex-1 font-semibold text-ink-dim">
            {r.stage < 3
              ? `${r.stage + 1}-р санамж: ${HINTS[r.stage]}`
              : r.stage === 3
                ? "4-р санамж: Бодолтыг алхам алхмаар"
                : r.stage === last - 1
                  ? "Бодолтын сүүлийн алхам, зөв хариу"
                  : "Бодолтын дараагийн алхам"}
          </span>
          <button
            onClick={() => onPatch({ stage: r.stage + 1 })}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-brand px-4 font-semibold text-on-brand"
          >
            <LockOpen className="size-4" aria-hidden /> Нээх
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button onClick={onPrev} disabled={!onPrev} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-panel px-4 font-semibold text-ink disabled:opacity-40">
          <ArrowLeft className="size-4" aria-hidden /> Өмнөх
        </button>
        <span className="flex-1 text-center font-semibold tabular-nums text-ink">{position}</span>
        <button onClick={onNext} disabled={!onNext} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-brand px-4 font-semibold text-on-brand disabled:opacity-40">
          Дараах <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
