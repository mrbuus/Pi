"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, LayoutGrid, ListChecks, LoaderCircle, Send, Timer } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import AutosaveChip, { type SaveStatus } from "@/components/exam/AutosaveChip";
import ExamTimer from "@/components/exam/ExamTimer";
import OfflineBanner from "@/components/exam/OfflineBanner";
import QuestionCard, { type QuestionCardProblem } from "@/components/exam/QuestionCard";
import QuestionFooterNav from "@/components/exam/QuestionFooterNav";
import QuestionNavigator, { type NavigatorCell } from "@/components/exam/QuestionNavigator";
import { Button } from "@/components/ui/kit/button";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { ApiError, api } from "@/lib/api";
import CheckMark from "./CheckMark";
import HomeworkResult from "./HomeworkResult";
import PhotoButton from "./PhotoButton";
import { cleanTitle, formatElapsed, isBlankAnswer } from "./lib";
import type {
  CheckResult,
  HwAnswers,
  HwAttempt,
  HwCheckResponse,
  HwItem,
  HwMyResponse,
  HwProblem,
  HwScore,
  HwSubmitResponse,
} from "./types";

/**
 * Гэрийн даалгавар бодох дэлгэц (эзэн 2026-10-29, шийдвэр 3):
 * Эхлэх → цаг явна (өнгөрсөн; хугацаатай бол үлдсэн) → хариу (autosave ~1.2с) →
 * «Шалгах» нь зөвхөн зөв/буруу (зөв хариуг ХЭЗЭЭ Ч үзүүлэхгүй) → засна → дахин
 * «Шалгах» (нийт 2) → «Илгээх». Шалгалтын анти-чит (fullscreen, гаралт) ЭНД БАЙХГҮЙ.
 * Шалгалтын UI хэсгүүдийг (QuestionCard, ChoiceList, FillNumberAnswer, навигатор,
 * AutosaveChip, OfflineBanner, ExamTimer) импортлож ашиглана.
 */

const SAVE_DEBOUNCE_MS = 1200;
const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30_000;

type Phase = "loading" | "solving" | "result" | "error";

interface ViewProblem {
  card: QuestionCardProblem;
  /** CHOICE TEXT горимд индекс ↔ label */
  labels: string[] | null;
}

/** Сонголтуудын бүх текст хоосон эсвэл үсэгтэйгээ ижил бол хуучин импортын LETTER горим */
function toView(p: HwProblem): ViewProblem {
  const ch = p.choices && p.choices.length ? p.choices : null;
  const letterOnly =
    !!ch && ch.every((c) => !c.imageKey && (!c.text?.trim() || c.text.trim().toUpperCase() === c.label.trim().toUpperCase()));
  return {
    card: {
      id: p.id,
      format: p.format,
      statementText: p.statementText,
      imageKey: p.imageKey,
      choiceMode: ch ? (letterOnly ? "LETTER" : "TEXT") : null,
      choices: ch ? (letterOnly ? ch.map((c) => c.label) : ch.map((c) => c.text)) : null,
      choiceImages: ch && !letterOnly && ch.some((c) => c.imageKey) ? ch.map((c) => c.imageKey ?? null) : null,
    },
    labels: ch && !letterOnly ? ch.map((c) => c.label) : null,
  };
}

function scoreFrom(results: Record<string, CheckResult> | null, total: number): HwScore | null {
  if (!results) return null;
  return { correct: Object.values(results).filter((r) => r === "CORRECT").length, total };
}

export default function HomeworkSolve({
  testId,
  date,
  classroomId,
}: {
  testId: string;
  date: string;
  classroomId: string;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const keypadTheme = resolvedTheme === "light" ? "light" : "navy";

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [attempt, setAttempt] = useState<HwAttempt | null>(null);
  const [item, setItem] = useState<HwItem | null>(null);
  const [answers, setAnswers] = useState<HwAnswers>({});
  const [marks, setMarks] = useState<Record<string, CheckResult>>({});
  const [checksUsed, setChecksUsed] = useState(0);
  const [lastCheckScore, setLastCheckScore] = useState<HwScore | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState<"" | "check" | "submit">("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [offline, setOffline] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [final, setFinal] = useState<{ score: HwScore | null; results: Record<string, CheckResult> | null } | null>(
    null,
  );

  const answersRef = useRef<HwAnswers>({});
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const doneRef = useRef(false);
  const flushRef = useRef<(() => Promise<void>) | null>(null);

  const problems = useMemo(
    () => [...(attempt?.problems ?? [])].sort((a, b) => a.order - b.order).map(toView),
    [attempt],
  );
  const maxChecks = attempt?.maxChecks ?? 2;

  /* ---------- Эхлэх / үргэлжлүүлэх ---------- */
  const start = useCallback(async () => {
    setPhase("loading");
    setError("");
    try {
      const a = await api<HwAttempt>("/homework/attempts", { method: "POST", body: { testId, date } });
      setAttempt(a);
      answersRef.current = a.answers ?? {};
      setAnswers(a.answers ?? {});
      setChecksUsed(a.checksUsed ?? 0);
      setMarks(a.lastCheck ?? {});
      setLastCheckScore(scoreFrom(a.lastCheck, a.problems.length));
      if (a.status === "SUBMITTED") {
        doneRef.current = true;
        // Серверийн эцсийн оноо (хариугүй бодлогыг тооцохгүй) — байхгүй бол дүнгээс тоолно
        setFinal({ score: a.score ?? scoreFrom(a.lastCheck, a.problems.length), results: a.lastCheck });
        setPhase("result");
        return;
      }
      doneRef.current = false;
      setSecondsLeft(typeof a.remainingSec === "number" ? a.remainingSec : null);
      setPhase("solving");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Даалгаврыг нээж чадсангүй");
      setPhase("error");
    }
  }, [testId, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ачаалал эхлүүлэх
    void start();
  }, [start]);

  // Гарчиг, хугацаа, оноог жагсаалтаас (гэрээнд start хариунд гарчиг байхгүй)
  useEffect(() => {
    let cancelled = false;
    api<HwMyResponse>("/homework/my?days=14")
      .then((r) => {
        if (cancelled) return;
        const day = r.days.find((d) => d.date === date && d.classroomId === classroomId) ?? r.days.find((d) => d.date === date);
        setItem(day?.items.find((i) => i.testId === testId) ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [testId, date, classroomId]);

  /* ---------- Цаг: өнгөрсөн (үргэлж) + үлдсэн (хугацаатай бол) ---------- */
  useEffect(() => {
    if (phase !== "solving" || !attempt) return;
    const t0 = new Date(attempt.startedAt).getTime();
    const tick = () => setElapsed(Number.isFinite(t0) ? (Date.now() - t0) / 1000 : 0);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, attempt]);

  /* ---------- Autosave (PATCH, debounce) ---------- */
  const flush = useCallback(async () => {
    if (!attempt || doneRef.current || !dirtyRef.current) return;
    const snapshot = answersRef.current;
    dirtyRef.current = false;
    setSaveStatus("saving");
    try {
      await api(`/homework/attempts/${encodeURIComponent(attempt.attemptId)}`, {
        method: "PATCH",
        body: { answers: snapshot },
      });
      retryCount.current = 0;
      setOffline(false);
      if (!dirtyRef.current) setSaveStatus("saved");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Өөр төхөөрөмжөөс илгээгдсэн — дүнг дахин ачаална
        doneRef.current = true;
        void start();
        return;
      }
      dirtyRef.current = true;
      setOffline(true);
      const n = retryCount.current;
      retryCount.current = Math.min(n + 1, 8);
      const wait = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** n) * (0.7 + Math.random() * 0.6);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => void flushRef.current?.(), wait);
    }
  }, [attempt, start]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  // Таб хаагдах/нуугдахад хүлээгдэж буй хариуг шууд илгээнэ
  useEffect(() => {
    if (phase !== "solving") return;
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushRef.current?.();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [phase]);

  function setAnswer(pid: string, value: unknown) {
    const next = { ...answersRef.current, [pid]: value };
    answersRef.current = next;
    setAnswers(next);
    // Хариугаа өөрчилсөн бодлогын хуучин дүн хүчингүй
    setMarks((m) => {
      if (!(pid in m)) return m;
      const rest = { ...m };
      delete rest[pid];
      return rest;
    });
    dirtyRef.current = true;
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    saveTimer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
  }

  function cancelPendingSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
    saveTimer.current = null;
    retryTimer.current = null;
  }

  /* ---------- Шалгах (2 удаа) ---------- */
  async function check() {
    if (!attempt || busy || checksUsed >= maxChecks) return;
    setBusy("check");
    setActionError("");
    cancelPendingSave();
    try {
      const r = await api<HwCheckResponse>(`/homework/attempts/${encodeURIComponent(attempt.attemptId)}/check`, {
        method: "POST",
        body: { answers: answersRef.current },
      });
      dirtyRef.current = false;
      setSaveStatus("saved");
      setOffline(false);
      setMarks(r.results);
      setChecksUsed(r.checksUsed);
      setLastCheckScore({ correct: r.correct, total: r.total });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Төлөв серверт өөрчлөгдсөн (хугацаа/илгээсэн/эрх дууссан) — дахин ачаална
        const msg = e.message ?? "";
        setActionError(
          /хугацаа/i.test(msg)
            ? "Хугацаа дууссан. Хариуг чинь илгээж байна"
            : /илгээгдсэн/i.test(msg)
              ? "Даалгавар аль хэдийн илгээгдсэн байна"
              : "Шалгах эрх дууссан. Одоо илгээж болно",
        );
        void start();
      } else {
        setActionError(e instanceof Error && e.message ? e.message : "Шалгаж чадсангүй. Дахин оролдоно уу");
      }
    } finally {
      setBusy("");
    }
  }

  /* ---------- Илгээх ---------- */
  const submit = useCallback(async () => {
    if (!attempt || doneRef.current) return;
    setBusy("submit");
    setActionError("");
    cancelPendingSave();
    try {
      const r = await api<HwSubmitResponse>(`/homework/attempts/${encodeURIComponent(attempt.attemptId)}/submit`, {
        method: "POST",
        body: { answers: answersRef.current },
      });
      doneRef.current = true;
      dirtyRef.current = false;
      setFinal({ score: r.score, results: r.results });
      setConfirmOpen(false);
      setPhase("result");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        void start();
      } else {
        setActionError(e instanceof Error && e.message ? e.message : "Илгээж чадсангүй. Дахин оролдоно уу");
      }
    } finally {
      setBusy("");
    }
  }, [attempt, start]);

  // Хугацаатай даалгавар: цаг дуусахад автоматаар илгээнэ
  useEffect(() => {
    if (phase !== "solving" || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      const id = setTimeout(() => void submit(), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, secondsLeft, submit]);

  const blankCount = useMemo(
    () => problems.filter((p) => isBlankAnswer(answers[p.card.id])).length,
    [problems, answers],
  );
  const cells: NavigatorCell[] = useMemo(
    () =>
      problems.map((p) => {
        const m = marks[p.card.id];
        return {
          id: p.card.id,
          answered: !isBlankAnswer(answers[p.card.id]),
          flagged: !!flagged[p.card.id],
          mark: m === "CORRECT" || m === "WRONG" ? m : null,
        };
      }),
    [problems, answers, flagged, marks],
  );

  const title = item ? cleanTitle(item.title, item.variantLabel) : "Гэрийн даалгавар";
  const backHref = "/app/homework";

  /* ====================== Ачаалал / алдаа ====================== */
  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-2xl">
        <LoadingState rows={5} />
      </div>
    );
  }
  if (phase === "error") {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <ErrorState message={error} onRetry={() => void start()} />
        <Button variant="ghost" onClick={() => router.push(backHref)}>
          <ArrowLeft aria-hidden />
          Жагсаалт руу
        </Button>
      </div>
    );
  }

  /* ====================== Дүн ====================== */
  if (phase === "result") {
    return (
      <HomeworkResult
        title={title}
        score={final?.score ?? item?.score ?? null}
        results={final?.results ?? null}
        problemIds={problems.map((p) => p.card.id)}
        classroomId={classroomId}
        date={date}
        backHref={backHref}
      />
    );
  }

  /* ====================== Бодох ====================== */
  const cur = problems[pageIdx];
  if (!cur) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <ErrorState message="Энэ даалгаварт бодлого алга" />
        <Link href={backHref} className="text-sm font-semibold text-brand hover:underline">
          Жагсаалт руу
        </Link>
      </div>
    );
  }
  const pid = cur.card.id;
  const raw = answers[pid];
  const cardAnswer: number | string | undefined =
    cur.labels !== null
      ? (() => {
          const i = cur.labels.indexOf(String(raw ?? ""));
          return i >= 0 ? i : undefined;
        })()
      : raw === undefined || raw === null
        ? undefined
        : typeof raw === "number"
          ? raw
          : String(raw);
  const mark = marks[pid];
  const checksLeft = Math.max(0, maxChecks - checksUsed);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-bg text-ink">
      {offline && <OfflineBanner />}

      <header className="flex items-center gap-2 border-b border-line bg-surface px-2 py-2 sm:px-4">
        <Link
          href={backHref}
          onClick={() => void flushRef.current?.()}
          aria-label="Жагсаалт руу буцах"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim transition hover:bg-ink/5 hover:text-ink"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold sm:text-base">{title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <AutosaveChip status={saveStatus} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNavigatorOpen(true)}
          aria-haspopup="dialog"
          aria-label={`Бодлогын навигатор, ${problems.length - blankCount}/${problems.length} хариулсан`}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-semibold tabular-nums text-ink-dim transition hover:text-ink"
        >
          <LayoutGrid className="size-4" aria-hidden />
          {problems.length - blankCount}/{problems.length}
        </button>
        {secondsLeft !== null ? (
          <ExamTimer secondsLeft={secondsLeft} totalSec={item?.timeLimitMin ? item.timeLimitMin * 60 : null} />
        ) : (
          <span
            role="timer"
            aria-label={`Өнгөрсөн хугацаа ${formatElapsed(elapsed)}`}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-line bg-panel px-2.5 font-mono text-sm font-bold tabular-nums text-ink"
          >
            <Timer className="size-4 text-ink-dim" aria-hidden />
            {formatElapsed(elapsed)}
          </span>
        )}
        <PhotoButton classroomId={classroomId} date={date} compact />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {mark && (
          <div className="mx-auto mb-3 flex max-w-2xl items-center gap-2" role="status">
            <CheckMark result={mark} />
            {mark === "WRONG" && checksLeft > 0 && (
              <span className="text-sm text-ink-dim">Дахин бодоод засаарай</span>
            )}
          </div>
        )}
        <QuestionCard
          key={pid}
          problem={cur.card}
          problemNumber={pageIdx + 1}
          answer={cardAnswer}
          onAnswer={(v) => setAnswer(pid, cur.labels !== null && typeof v === "number" ? cur.labels[v] : v)}
          keypadTheme={keypadTheme}
        />
        <QuestionFooterNav
          canGoPrev={pageIdx > 0}
          onPrev={() => setPageIdx((i) => Math.max(0, i - 1))}
          flagged={!!flagged[pid]}
          onToggleFlag={() => setFlagged((f) => ({ ...f, [pid]: !f[pid] }))}
          isLast={pageIdx === problems.length - 1}
          onNext={() => setPageIdx((i) => Math.min(problems.length - 1, i + 1))}
          onReview={() => setNavigatorOpen(true)}
        />
      </main>

      {/* Доод үйлдлийн мөр — Шалгах (2 хүртэл) + Илгээх үргэлж */}
      <footer className="border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2">
          {lastCheckScore && (
            <p className="flex items-center gap-1.5 text-sm text-ink-dim" aria-live="polite">
              <ListChecks className="size-4 text-brand-soft" aria-hidden />
              Шалгалт: <span className="font-bold tabular-nums text-ink">{lastCheckScore.correct}/{lastCheckScore.total}</span> зөв
            </p>
          )}
          <div className="ml-auto flex items-center gap-2">
            {checksLeft > 0 && (
              <Button variant="secondary" onClick={() => void check()} disabled={!!busy}>
                {busy === "check" ? (
                  <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />
                ) : (
                  <ListChecks aria-hidden />
                )}
                <span>
                  Шалгах <span className="tabular-nums">{checksUsed + 1}/{maxChecks}</span>
                </span>
              </Button>
            )}
            <Button onClick={() => setConfirmOpen(true)} disabled={!!busy}>
              <Send aria-hidden />
              Илгээх
            </Button>
          </div>
        </div>
        {actionError && (
          <p role="alert" className="mx-auto mt-2 max-w-2xl text-sm text-error">
            {actionError}
          </p>
        )}
      </footer>

      <QuestionNavigator
        open={navigatorOpen}
        onClose={() => setNavigatorOpen(false)}
        cells={cells}
        currentIndex={pageIdx}
        onJump={(i) => setPageIdx(i)}
      />

      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="hw-submit-title"
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center elev-1"
          >
            <p id="hw-submit-title" className="text-lg font-bold text-ink">
              Даалгавраа илгээх үү?
            </p>
            <p className="mt-2 text-sm text-ink-dim">
              <span className="font-semibold tabular-nums text-ink">
                {problems.length - blankCount}/{problems.length}
              </span>{" "}
              хариулсан
              {blankCount > 0 && <span className="font-semibold text-warning"> ({blankCount} хоосон)</span>}
            </p>
            <p className="mt-1 text-xs text-ink-dim">Илгээсний дараа хариугаа өөрчлөх боломжгүй</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy === "submit"} autoFocus>
                Буцах
              </Button>
              <Button onClick={() => void submit()} disabled={busy === "submit"}>
                {busy === "submit" ? (
                  <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />
                ) : (
                  <Send aria-hidden />
                )}
                Илгээх
              </Button>
            </div>
            {actionError && (
              <p role="alert" className="mt-3 text-sm text-error">
                {actionError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
