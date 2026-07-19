"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MathText from "@/components/MathText";
import NumericKeypad from "@/components/NumericKeypad";
import { api } from "@/lib/api";

/* ============================================================================
 * Тест бодох хуудас — session-т суурилсан шалгалтын орчин (Шийдвэр 2, 3, 6)
 *
 * - Сервер session: дараалал анх нэг удаа үүсээд хөлдөнө, таймерыг сервер барина
 * - Autosave: хариулт бүр ~1.2с дотор серверт бичигдэнэ — refresh/гацалтад тэсвэртэй
 * - Анти-чит: fullscreen + таб/цонхноос гарахыг мэдэрч 3 удаагийн дараа авто-илгээнэ
 * - Сонголтууд: TEXT горимд үсэггүй, зөвхөн утга (сурагч бүрд өөр дараалалтай);
 *   LETTER горимд (хуучин импортын дата) үсэг хэвээр, байрлал хөдлөхгүй
 * - Дууссаны дараа review: аль бодлогод алдсанаа харна (зөв хариу задрахгүй)
 * ========================================================================== */

interface ProblemView {
  id: string;
  format: string;
  statementText?: string | null;
  imageKey?: string | null;
  points: number;
  choiceMode: "TEXT" | "LETTER" | null;
  choices: string[] | null;
}
interface Meta {
  id: string;
  title: string;
  variantLabel?: string | null;
  gradingMode?: string;
  timeLimitMin?: number | null;
  problemCount: number;
  totalPoints: number;
  myResult?: { totalScore: number; maxScore: number } | null;
  sessionStatus?: "IN_PROGRESS" | "SUBMITTED" | null;
}
interface SessionView {
  status: string;
  remainingSec?: number | null;
  leaveCount?: number;
  draftAnswers?: Record<string, number | string>;
  draftStates?: Record<string, string>;
}
interface StartResp {
  test?: { title: string; variantLabel?: string | null; timeLimitMin?: number | null };
  session: SessionView;
  problems?: ProblemView[];
  result?: { totalScore: number; maxScore: number } | null;
}
interface ReviewItem {
  n: number;
  points: number;
  statementText?: string | null;
  answered: boolean;
  correct: boolean;
  // Импортын явцад хариу тодорхойгүй үлдсэн бодлого — "буруу" гэж бүү харуул
  answerUnknown?: boolean;
  myAnswer: string | null;
  // Багш баталгаажуулсан бодолт (VERIFIED үед л ирнэ — Шийдвэр Д)
  solution?: string | null;
}
interface ReviewResp {
  result: { totalScore: number; maxScore: number } | null;
  items: ReviewItem[];
  leaveCount: number;
}

const SELF_STATES = [
  { value: "SOLVED_CLEAN", label: "Алдаагүй", tone: "ok" },
  { value: "FIXED_AFTER_ERROR", label: "Зассан", tone: "warn" },
  { value: "FAILED", label: "Алдсан", tone: "bad" },
  { value: "GUESSED", label: "Буудсан", tone: "guess" },
] as const;

const SELF_TONE: Record<string, string> = {
  ok: "bg-teal-400/20 text-teal-700 border-teal-400/50",
  warn: "bg-amber-400/20 text-amber-700 border-amber-400/50",
  bad: "bg-red-400/20 text-red-700 border-red-400/50",
  guess: "bg-indigo-400/20 text-indigo-700 border-indigo-400/50",
};

type Theme = "navy" | "light";
const THEMES: Record<
  Theme,
  { page: string; card: string; bar: string; dim: string; border: string; chip: string; navIdle: string }
> = {
  navy: {
    page: "bg-[#060c1d] text-[#e9eefb]",
    card: "bg-[#0b142e] border-white/8",
    bar: "bg-[#060c1d]/95 border-white/8",
    dim: "text-[#93a3c7]",
    border: "border-white/10",
    chip: "bg-white/5 text-[#93a3c7]",
    navIdle: "border-white/10 text-[#93a3c7] hover:border-white/30",
  },
  light: {
    page: "bg-white text-[#0b142e]",
    card: "bg-[#f7f9fc] border-black/10",
    bar: "bg-white/95 border-black/10",
    dim: "text-[#5c6b8a]",
    border: "border-black/15",
    chip: "bg-black/5 text-[#5c6b8a]",
    navIdle: "border-black/15 text-[#5c6b8a] hover:border-black/30",
  },
};

const MAX_LEAVES = 3; // энэ тооны дараа шалгалт автоматаар дуусна
const SAVE_DEBOUNCE_MS = 1200;
const HEARTBEAT_MS = 20_000;

export default function TakeTestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [meta, setMeta] = useState<Meta | null>(null);
  const [phase, setPhase] = useState<"loading" | "intro" | "taking" | "result">("loading");
  const [theme, setTheme] = useState<Theme>("navy");
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const [problems, setProblems] = useState<ProblemView[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [selfStates, setSelfStates] = useState<Record<string, string>>({});
  const [pageIdx, setPageIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [leaveCount, setLeaveCount] = useState(0);
  const [leaveWarnOpen, setLeaveWarnOpen] = useState(false);
  const [result, setResult] = useState<{ total: number; max: number } | null>(null);
  const [review, setReview] = useState<ReviewResp | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  // Refs — autosave/илгээлтэд үргэлж хамгийн сүүлийн утга очно (stale closure-гүй)
  const answersRef = useRef(answers);
  const statesRef = useRef(selfStates);
  const timesRef = useRef<Record<string, number>>({});
  const dirtyAnswersRef = useRef<Record<string, number | string>>({});
  const dirtyStatesRef = useRef<Record<string, string>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);
  const phaseRef = useRef(phase);
  const pageIdxRef = useRef(0);
  const problemsRef = useRef<ProblemView[]>([]);
  const leaveCountRef = useRef(0);
  const lastLeaveAtRef = useRef(0);

  useEffect(() => {
    phaseRef.current = phase;
    pageIdxRef.current = pageIdx;
    problemsRef.current = problems;
    leaveCountRef.current = leaveCount;
  }, [phase, pageIdx, problems, leaveCount]);

  const t = THEMES[theme];
  const manualGrading = meta?.gradingMode === "MANUAL";

  // ---------- Review ачаалах ----------
  const loadReview = useCallback(async () => {
    try {
      const r = await api<ReviewResp>(`/tests/${params.id}/review`);
      setReview(r);
      if (r.result) setResult({ total: r.result.totalScore, max: r.result.maxScore });
    } catch {
      /* цаасан дүнтэй (session-гүй) бол review байхгүй — оноо meta-гаас */
    }
  }, [params.id]);

  // ---------- Мета ачаалах ----------
  useEffect(() => {
    api<Meta>(`/tests/${params.id}`)
      .then(async (m) => {
        setMeta(m);
        if (m.sessionStatus === "SUBMITTED" || m.myResult) {
          if (m.myResult) setResult({ total: m.myResult.totalScore, max: m.myResult.maxScore });
          await loadReview();
          setPhase("result");
        } else {
          setPhase("intro");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Алдаа"));
  }, [params.id, loadReview]);

  // ---------- Autosave ----------
  const flushSave = useCallback(
    async (event?: "LEAVE" | "RETURN" | "FULLSCREEN_EXIT") => {
      if (submittedRef.current) return;
      const body: Record<string, unknown> = {};
      if (Object.keys(dirtyAnswersRef.current).length) body.answers = dirtyAnswersRef.current;
      if (Object.keys(dirtyStatesRef.current).length) body.selfStates = dirtyStatesRef.current;
      if (Object.keys(timesRef.current).length) body.problemTimes = timesRef.current;
      if (event) body.event = event;
      if (Object.keys(body).length === 0) return;
      dirtyAnswersRef.current = {};
      dirtyStatesRef.current = {};
      try {
        const r = await api<{ status: string; remainingSec?: number | null; leaveCount?: number; result?: { totalScore: number; maxScore: number } }>(
          `/tests/${params.id}/session`,
          { method: "PATCH", body },
        );
        if (r.status === "SUBMITTED") {
          // Сервер хугацааг хаасан — үр дүн рүү шилжинэ
          submittedRef.current = true;
          if (r.result) setResult({ total: r.result.totalScore, max: r.result.maxScore });
          await loadReview();
          setPhase("result");
          return;
        }
        if (typeof r.remainingSec === "number") setSecondsLeft(r.remainingSec);
        if (typeof r.leaveCount === "number") setLeaveCount(r.leaveCount);
      } catch {
        /* сүлжээний түр алдаа — дараагийн heartbeat дахин оролдоно */
      }
    },
    [params.id, loadReview],
  );

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void flushSave(), SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  function setAnswer(pid: string, value: number | string) {
    setAnswers((a) => {
      const next = { ...a, [pid]: value };
      answersRef.current = next;
      return next;
    });
    dirtyAnswersRef.current[pid] = value;
    scheduleSave();
  }
  function setSelfState(pid: string, value: string) {
    setSelfStates((m) => {
      const next = { ...m, [pid]: value };
      statesRef.current = next;
      return next;
    });
    dirtyStatesRef.current[pid] = value;
    scheduleSave();
  }

  // ---------- Илгээх ----------
  const finish = useCallback(
    async (reason: "USER" | "TIME" | "LEAVES") => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setError("");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      try {
        const res = await api<{ result: { totalScore: number; maxScore: number } }>(
          `/tests/${params.id}/submit`,
          {
            method: "POST",
            body: {
              answers: answersRef.current,
              selfStates: statesRef.current,
              problemTimes: timesRef.current,
            },
          },
        );
        setResult({ total: res.result.totalScore, max: res.result.maxScore });
        await loadReview();
        setPhase("result");
        if (reason !== "USER") setLeaveWarnOpen(false);
        void document.exitFullscreen?.().catch(() => {});
      } catch (e) {
        submittedRef.current = false;
        setError(e instanceof Error ? e.message : "Алдаа гарлаа");
      }
    },
    [params.id, loadReview],
  );

  // ---------- Таймер (сервертэй autosave бүрд зэрэгцдэг) ----------
  useEffect(() => {
    if (phase !== "taking" || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      const id = setTimeout(() => void finish("TIME"), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, secondsLeft, finish]);

  // ---------- Бодлого бүрийн бодит хугацаа ----------
  useEffect(() => {
    if (phase !== "taking") return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const cur = problemsRef.current[pageIdxRef.current];
      if (!cur) return;
      timesRef.current[cur.id] = (timesRef.current[cur.id] ?? 0) + 1;
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ---------- Heartbeat autosave ----------
  useEffect(() => {
    if (phase !== "taking") return;
    const id = setInterval(() => void flushSave(), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [phase, flushSave]);

  // ---------- Анти-чит: горимоос гарахыг мэдрэх (Шийдвэр 3) ----------
  useEffect(() => {
    if (phase !== "taking") return;

    function onLeave(kind: "LEAVE" | "FULLSCREEN_EXIT") {
      if (submittedRef.current || phaseRef.current !== "taking") return;
      const now = Date.now();
      if (now - lastLeaveAtRef.current < 1500) return; // нэг гаралт = нэг үйл явдал
      lastLeaveAtRef.current = now;
      const next = leaveCountRef.current + 1;
      setLeaveCount(next);
      void flushSave(kind);
      if (next >= MAX_LEAVES) void finish("LEAVES");
      else setLeaveWarnOpen(true);
    }

    const onVisibility = () => {
      if (document.hidden) onLeave("LEAVE");
    };
    const onBlur = () => onLeave("LEAVE");
    const onFullscreen = () => {
      if (!document.fullscreenElement) onLeave("FULLSCREEN_EXIT");
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [phase, flushSave, finish]);

  // ---------- FILL бодлогод гарын оролт (компьютерээс хурдан бөглөх) ----------
  useEffect(() => {
    if (phase !== "taking") return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const cur = problemsRef.current[pageIdxRef.current];
      if (!cur || cur.format !== "FILL_NUMBER") return;
      const pid = cur.id;
      const prev = String(answersRef.current[pid] ?? "");
      if (/^[0-9]$/.test(e.key)) setAnswer(pid, prev + e.key);
      else if (e.key === "-" && !prev.includes("-")) setAnswer(pid, "-" + prev);
      else if (e.key === "." && !prev.includes(".")) setAnswer(pid, prev + ".");
      else if (e.key === "Backspace") setAnswer(pid, prev.slice(0, -1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ---------- Эхлэх / үргэлжлүүлэх ----------
  async function beginTest() {
    if (starting) return;
    setStarting(true);
    setConfirmStart(false);
    setError("");
    // Fullscreen-ийг товчлуурын үйлдэл дотор шууд хүснэ (browser-ийн шаардлага)
    void document.documentElement.requestFullscreen?.().catch(() => {});
    try {
      const r = await api<StartResp>(`/tests/${params.id}/start`, { method: "POST" });
      if (r.session.status === "SUBMITTED") {
        if (r.result) setResult({ total: r.result.totalScore, max: r.result.maxScore });
        await loadReview();
        setPhase("result");
        return;
      }
      const draftA = r.session.draftAnswers ?? {};
      const draftS = r.session.draftStates ?? {};
      setProblems(r.problems ?? []);
      setAnswers(draftA);
      answersRef.current = draftA;
      setSelfStates(draftS);
      statesRef.current = draftS;
      setSecondsLeft(r.session.remainingSec ?? null);
      setLeaveCount(r.session.leaveCount ?? 0);
      lastLeaveAtRef.current = Date.now(); // эхлэх мөчийн fullscreen шилжилтийг тооцохгүй
      setPageIdx(0);
      setPhase("taking");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
      void document.exitFullscreen?.().catch(() => {});
    } finally {
      setStarting(false);
    }
  }

  const answeredCount = useMemo(
    () => problems.filter((p) => answers[p.id] !== undefined && answers[p.id] !== "").length,
    [answers, problems],
  );

  // ---------- Ачаалал / алдаа ----------
  if (error && phase === "loading") {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-center text-red-300">
        {error}
      </div>
    );
  }
  if (phase === "loading" || !meta) return <p className="text-ink-dim">Ачаалж байна…</p>;

  const minutes = meta.timeLimitMin ?? 0;

  /* ====================== ИНТРО ====================== */
  if (phase === "intro") {
    const resume = meta.sessionStatus === "IN_PROGRESS";
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-3xl border border-white/8 bg-[#0b142e] p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-bright">
            Шалгалт
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">
            {meta.title}
            {meta.variantLabel && <span className="ml-1 text-ink-dim">({meta.variantLabel})</span>}
          </h1>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Бодлого" value={`${meta.problemCount}`} />
            <Stat label="Хугацаа" value={minutes ? `${minutes} мин` : "Хязгааргүй"} />
            <Stat label="Нийт оноо" value={`${meta.totalPoints}`} />
          </div>

          {manualGrading ? (
            <p className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">
              Энэ шалгалтын дүнг багш гараар оруулна — онлайнаар өгөгдөхгүй.
            </p>
          ) : (
            <>
              <ul className="mt-6 space-y-2 text-left text-sm text-ink-dim">
                <li>• Хариулт бүр шууд хадгалагдана — гэнэт тасарсан ч үргэлжлүүлж болно.</li>
                <li>• Шалгалтын горимоос ({MAX_LEAVES - 1} удаа хүртэл) гарвал анхааруулна, {MAX_LEAVES} дахь удаад автоматаар дуусна.</li>
                {minutes > 0 && <li>• Цагийг сервер тоолно — цаг дуусахад автоматаар илгээгдэнэ.</li>}
              </ul>

              <div className="mt-6 flex items-center justify-center gap-2 text-sm">
                <span className="text-ink-dim">Дэлгэцийн өнгө:</span>
                {(["navy", "light"] as Theme[]).map((th) => (
                  <button
                    key={th}
                    onClick={() => setTheme(th)}
                    className={`rounded-lg border px-3 py-1.5 ${theme === th ? "border-brand-bright bg-brand-bright/15 text-brand-soft" : "border-white/10 text-ink-dim"}`}
                  >
                    {th === "navy" ? "Хар хөх" : "Цагаан"}
                  </button>
                ))}
              </div>

              <button
                onClick={() => (resume ? void beginTest() : setConfirmStart(true))}
                disabled={starting}
                className="glow-pulse mt-7 w-full rounded-xl bg-brand-bright py-4 text-lg font-bold text-white transition hover:bg-[#6190f0] disabled:opacity-50"
              >
                {starting ? "Ачаалж байна…" : resume ? "Үргэлжлүүлэх" : "Шалгалт эхлэх"}
              </button>
            </>
          )}
          <button
            onClick={() => router.push("/app/tests")}
            className="mt-3 text-sm text-ink-dim hover:text-ink"
          >
            Буцах
          </button>
          {error && (
            <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          )}
        </div>

        {confirmStart && (
          <div className="mt-4 flex min-h-[200px] items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6">
            <div className="text-center">
              <p className="text-lg font-bold text-amber-200">⏱ Анхаар!</p>
              <p className="mt-2 text-sm text-amber-100/80">
                {minutes > 0 ? (
                  <>Танд <b>{minutes} минут</b> байна. Эхэлмэгц цагийг сервер тоолно. Бэлэн үү?</>
                ) : (
                  <>Шалгалтыг эхлүүлэх үү?</>
                )}
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  onClick={() => setConfirmStart(false)}
                  className="rounded-lg border border-white/15 px-5 py-2 text-sm"
                >
                  Болих
                </button>
                <button
                  onClick={() => void beginTest()}
                  className="rounded-lg bg-amber-400 px-6 py-2 text-sm font-bold text-amber-950"
                >
                  Тийм, эхлэх
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ====================== ҮР ДҮН + REVIEW ====================== */
  if (phase === "result") {
    const total = result?.total ?? 0;
    const max = result?.max ?? 0;
    const pct = max > 0 ? Math.round((total / max) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-3xl border border-white/8 bg-[#0b142e] p-8 text-center">
          <p className="text-sm text-ink-dim">{meta.title}</p>
          <p className="my-4 text-5xl font-extrabold text-brand-soft">
            {total}
            <span className="text-2xl text-ink-dim">/{max}</span>
          </p>
          <div className="mx-auto mb-4 h-3 max-w-xs overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-bright to-teal-400"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-ink-dim">{pct}% оноо авлаа</p>
          {review && review.leaveCount > 0 && (
            <p className="mt-2 text-xs text-amber-300/80">
              Шалгалтын горимоос {review.leaveCount} удаа гарсан нь бүртгэгдсэн.
            </p>
          )}
        </div>

        {review && review.items.length > 0 && (
          <div className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
            <h2 className="mb-4 font-bold text-brand-soft">Бодлого бүрийн дүн</h2>
            <div className="space-y-2">
              {review.items.map((it) => (
                <div
                  key={it.n}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    !it.answered || it.answerUnknown
                      ? "border-white/8 opacity-60"
                      : it.correct
                        ? "border-teal-400/25 bg-teal-400/5"
                        : "border-red-400/25 bg-red-400/5"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      !it.answered || it.answerUnknown
                        ? "bg-white/10 text-ink-dim"
                        : it.correct
                          ? "bg-teal-400/20 text-teal-300"
                          : "bg-red-400/20 text-red-300"
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
                        <span className="text-ink-dim">
                          Зөв хариу тодорхойгүй — дүнд тооцогдоогүй
                        </span>
                      ) : (
                        <>
                          <span className={it.correct ? "text-teal-300" : "text-red-300"}>
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
            onClick={() => router.push("/app/tests")}
            className="rounded-xl bg-brand-bright px-6 py-3 font-bold text-white"
          >
            Шалгалтын жагсаалт руу
          </button>
        </div>
      </div>
    );
  }

  /* ====================== ШАЛГАЛТ БОДОХ ====================== */
  const tp = problems[pageIdx];
  if (!tp) return null;
  const pid = tp.id;
  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;
  const lowTime = secondsLeft !== null && secondsLeft < 300;
  const isLast = pageIdx === problems.length - 1;

  return (
    // Exam горим: апп-ын цэсийг бүрэн далдалсан тусдаа давхарга (fixed inset-0)
    <div
      className={`fixed inset-0 z-[60] select-none overflow-y-auto px-4 py-4 ${t.page}`}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
      {/* Дээд мөр — гарчиг + таймер + theme */}
      <div
        className={`sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur ${t.bar}`}
      >
        <div className="min-w-0">
          <p className="truncate font-bold">{meta.title}</p>
          <p className={`text-xs ${t.dim}`}>
            {answeredCount}/{problems.length} хариулсан
            {leaveCount > 0 && (
              <span className="ml-2 text-amber-400">⚠ {leaveCount}/{MAX_LEAVES}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "navy" ? "light" : "navy")}
            className={`rounded-lg border px-2.5 py-2 text-xs ${t.navIdle}`}
            title="Өнгө солих"
          >
            {theme === "navy" ? "☀" : "🌙"}
          </button>
          {secondsLeft !== null && (
            <div
              className={`rounded-xl px-4 py-2 font-mono text-lg font-bold ${lowTime ? "bg-red-500/15 text-red-400" : t.chip}`}
            >
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </div>
          )}
        </div>
      </div>

      {/* Навигатор */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {problems.map((p, i) => {
          const done = answers[p.id] !== undefined && answers[p.id] !== "";
          const cur = i === pageIdx;
          return (
            <button
              key={p.id}
              onClick={() => setPageIdx(i)}
              className={`h-8 w-8 rounded-lg border text-xs font-bold transition ${
                cur
                  ? "border-brand-bright bg-brand-bright text-white"
                  : done
                    ? "border-teal-400/50 bg-teal-400/15 text-teal-300"
                    : t.navIdle
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Бодлого */}
      <div className={`mt-4 rounded-2xl border p-6 ${t.card}`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-bright/15 text-base font-bold text-brand-soft">
            {pageIdx + 1}
          </span>
          <span className={`text-[11px] ${t.dim}`}>{tp.points} оноо</span>
        </div>

        <div className="text-lg leading-relaxed">
          <MathText>{tp.statementText ?? ""}</MathText>
        </div>

        {/* Хариулт — горим бүрд тохирсон оролт */}
        {tp.choiceMode === "TEXT" && tp.choices ? (
          // Бүтэцтэй сонголт: үсэггүй, зөвхөн утга (сурагч бүрд өөр дараалалтай)
          <div className="mt-5 space-y-2">
            {tp.choices.map((c, ci) => {
              const sel = answers[pid] === ci;
              return (
                <button
                  key={ci}
                  onClick={() => setAnswer(pid, ci)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
                    sel ? "border-brand-bright bg-brand-bright/15" : t.navIdle
                  }`}
                >
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${sel ? "border-brand-bright bg-brand-bright" : t.border}`}
                  />
                  <span className="flex-1">
                    <MathText>{c}</MathText>
                  </span>
                </button>
              );
            })}
          </div>
        ) : tp.choiceMode === "LETTER" && tp.choices ? (
          // Хуучин импортын дата: хувилбарууд бодлогын текст дотор — үсгээр сонгоно
          <div className="mt-5 flex flex-wrap gap-2">
            {tp.choices.map((letter) => {
              const sel = answers[pid] === letter;
              return (
                <button
                  key={letter}
                  onClick={() => setAnswer(pid, letter)}
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-bold transition ${
                    sel ? "border-brand-bright bg-brand-bright text-white" : t.navIdle
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ) : tp.format === "FILL_NUMBER" ? (
          <NumericKeypad
            value={String(answers[pid] ?? "")}
            onChange={(update) => setAnswer(pid, update(String(answers[pid] ?? "")))}
            theme={theme}
          />
        ) : (
          <input
            value={String(answers[pid] ?? "")}
            onChange={(e) => setAnswer(pid, e.target.value)}
            placeholder="Хариугаа бичнэ үү"
            className={`mt-5 w-full max-w-xs rounded-xl border bg-transparent px-4 py-3 outline-none focus:border-brand-bright ${t.border}`}
          />
        )}

        {/* Өөрийн тэмдэглэгээ (адаптив дата — SPEC §9.1) */}
        <div className="mt-5 border-t border-white/5 pt-4">
          <p className={`mb-2 text-xs ${t.dim}`}>Би энэ бодлогыг:</p>
          <div className="flex flex-wrap gap-1.5">
            {SELF_STATES.map((s) => {
              const sel = selfStates[pid] === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setSelfState(pid, s.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${sel ? SELF_TONE[s.tone] : t.navIdle}`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Доод навигац */}
      <div className="mt-5 flex items-center gap-3 pb-6">
        <button
          onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
          disabled={pageIdx === 0}
          className={`rounded-xl border px-5 py-3 font-semibold disabled:opacity-30 ${t.navIdle}`}
        >
          ← Өмнөх
        </button>
        {!isLast ? (
          <button
            onClick={() => setPageIdx((i) => Math.min(problems.length - 1, i + 1))}
            className="flex-1 rounded-xl bg-brand-bright py-3 font-bold text-white"
          >
            Дараах →
          </button>
        ) : (
          <button
            onClick={() => setConfirmFinish(true)}
            className="flex-1 rounded-xl bg-teal-500 py-3 font-bold text-white"
          >
            Шалгалт дуусгах
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      {/* Дуусгах баталгаажуулалт */}
      {confirmFinish && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-6">
          <div className={`w-full max-w-sm rounded-2xl border p-6 text-center ${t.card}`}>
            <p className="font-bold">Шалгалтыг дуусгах уу?</p>
            <p className={`mt-1 text-sm ${t.dim}`}>
              {problems.length - answeredCount > 0
                ? `${problems.length - answeredCount} бодлого хариулаагүй байна.`
                : "Бүх бодлогыг хариулсан байна."}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => setConfirmFinish(false)}
                className={`rounded-lg border px-5 py-2 text-sm ${t.navIdle}`}
              >
                Үргэлжлүүлэх
              </button>
              <button
                onClick={() => {
                  setConfirmFinish(false);
                  void finish("USER");
                }}
                className="rounded-lg bg-teal-500 px-6 py-2 text-sm font-bold text-white"
              >
                Тийм, илгээх
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Горимоос гарсан анхааруулга (Шийдвэр 3) */}
      {leaveWarnOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-6">
          <div className="w-full max-w-sm rounded-2xl border border-amber-400/40 bg-[#1a1204] p-6 text-center">
            <p className="text-3xl">⚠️</p>
            <p className="mt-2 text-lg font-bold text-amber-200">
              Шалгалтын горимоос гарлаа! ({leaveCount}/{MAX_LEAVES})
            </p>
            <p className="mt-2 text-sm text-amber-100/80">
              Өөр таб/апп руу шилжих нь бүртгэгдэж багшид харагдана.{" "}
              {MAX_LEAVES}-Дахь удаад шалгалт автоматаар дуусна.
            </p>
            <button
              onClick={() => {
                setLeaveWarnOpen(false);
                void document.documentElement.requestFullscreen?.().catch(() => {});
              }}
              className="mt-4 rounded-lg bg-amber-400 px-6 py-2.5 text-sm font-bold text-amber-950"
            >
              Ойлголоо, үргэлжлүүлэх
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-xl font-extrabold">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-dim">{label}</p>
    </div>
  );
}
