"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { api } from "@/lib/api";
import { type SaveStatus } from "@/components/exam/AutosaveChip";
import OfflineBanner from "@/components/exam/OfflineBanner";
import ExamToast from "@/components/exam/ExamToast";
import ExamHeader from "@/components/exam/ExamHeader";
import QuestionCard from "@/components/exam/QuestionCard";
import QuestionFooterNav from "@/components/exam/QuestionFooterNav";
import QuestionNavigator, { type NavigatorCell } from "@/components/exam/QuestionNavigator";
import PreSubmitReview from "@/components/exam/PreSubmitReview";
import SubmitDialog from "@/components/exam/SubmitDialog";
import LeaveWarningDialog from "@/components/exam/LeaveWarningDialog";
import ExamIntro from "@/components/exam/ExamIntro";
import ExamResult from "@/components/exam/ExamResult";
import { parseFillSlots, slotsTotalLength } from "@/components/exam/fillSlots";

/* ============================================================================
 * Тест бодох хуудас — session-т суурилсан шалгалтын орчин (Шийдвэр 2, 3, 6)
 *
 * - Сервер session: дараалал анх нэг удаа үүсээд хөлдөнө, таймерыг сервер барина
 * - Autosave: хариулт бүр ~1.2с дотор серверт бичигдэнэ — refresh/гацалтад тэсвэртэй
 * - Анти-чит: fullscreen + таб/цонхноос гарахыг мэдэрч 3 удаагийн дараа авто-илгээнэ
 * - Сонголтууд: TEXT горимд үсэггүй, зөвхөн утга (сурагч бүрд өөр дараалалтай);
 *   LETTER горимд (хуучин импортын дата) үсэг хэвээр, байрлал хөдлөхгүй
 * - FILL_NUMBER: бодлогын текстэд [a]/[bc] мэт тэмдэглэгээ байвал цифрийн
 *   нүднүүдээр (см. FillNumberAnswer/fillSlots), үгүй бол чөлөөт талбараар
 * - Дууссаны дараа review: аль бодлогод алдсанаа харна (зөв хариу задрахгүй)
 *
 * ЭНЭ ФАЙЛ бол зөвхөн UI/UX rebuild — дээрх сервер-талын механизмыг СУЛАРГААГҮЙ,
 * зөвхөн дэлгэцийн харагдац/харилцан үйлдлийг өндөр эрсдэлт шалгалтын стандарт
 * руу шинэчилсэн. Тэмдэглэсэн (⚑) төлөв нь зөвхөн клиент талд (энэ browser tab-ын
 * үргэлжлэх хугацаанд) хадгалагдана — серверийн session схемд оноо бус тул
 * дүнд нөлөөгүй, зөвхөн навигаторт л харагдана.
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

const MAX_LEAVES = 3; // энэ тооны дараа шалгалт автоматаар дуусна
const SAVE_DEBOUNCE_MS = 1200;
const HEARTBEAT_MS = 20_000;
const FIVE_MIN_TOAST_SEC = 300;

export default function TakeTestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  // NumericKeypad-ийн "navy"/"light" theme нь глобал light/dark системээс
  // гаралтай — NumericKeypad.tsx-г засахгүйгээр, зөвхөн харагдах горимыг нь
  // тухайн үеийн бодит (resolved) горимтой тааруулна (NumericKeypad "navy"
  // өгөгдмөл нь LIGHT горимд бараг үл үзэгдэх контраст үүсгэдэг байсан).
  const { resolvedTheme } = useTheme();
  const keypadTheme = resolvedTheme === "light" ? "light" : "navy";

  const [meta, setMeta] = useState<Meta | null>(null);
  const [phase, setPhase] = useState<"loading" | "intro" | "taking" | "result">("loading");
  const [subView, setSubView] = useState<"question" | "review">("question");
  const [confirmStart, setConfirmStart] = useState(false);

  const [problems, setProblems] = useState<ProblemView[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [selfStates, setSelfStates] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [pageIdx, setPageIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [leaveCount, setLeaveCount] = useState(0);
  const [leaveWarnOpen, setLeaveWarnOpen] = useState(false);
  const [result, setResult] = useState<{ total: number; max: number } | null>(null);
  const [review, setReview] = useState<ReviewResp | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [offline, setOffline] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Refs — autosave/илгээлтэд үргэлж хамгийн сүүлийн утга очно (stale closure-гүй)
  const answersRef = useRef(answers);
  const statesRef = useRef(selfStates);
  const timesRef = useRef<Record<string, number>>({});
  const dirtyAnswersRef = useRef<Record<string, number | string>>({});
  const dirtyStatesRef = useRef<Record<string, string>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);
  const phaseRef = useRef(phase);
  const subViewRef = useRef(subView);
  const pageIdxRef = useRef(0);
  const problemsRef = useRef<ProblemView[]>([]);
  const leaveCountRef = useRef(0);
  const lastLeaveAtRef = useRef(0);
  const fiveMinToastShownRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
    subViewRef.current = subView;
    pageIdxRef.current = pageIdx;
    problemsRef.current = problems;
    leaveCountRef.current = leaveCount;
  }, [phase, subView, pageIdx, problems, leaveCount]);

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
  // Амжилтгүй болвол dirty-г ЦЭВЭРЛЭХГҮЙ (зөвхөн амжилттай илгээгдсэн, дараа нь
  // дахин өөрчлөгдөөгүй утгуудыг л хасна) — сүлжээ тасрахад хариулт алдагдахгүй,
  // OfflineBanner-ийн амлалт ("хадгалагдахгүй байна") жинхэнэ утгатай байх ёстой.
  const flushSave = useCallback(
    async (event?: "LEAVE" | "RETURN" | "FULLSCREEN_EXIT") => {
      if (submittedRef.current) return;
      const answersSnapshot = { ...dirtyAnswersRef.current };
      const statesSnapshot = { ...dirtyStatesRef.current };
      const timesSnapshot = { ...timesRef.current };
      const body: Record<string, unknown> = {};
      if (Object.keys(answersSnapshot).length) body.answers = answersSnapshot;
      if (Object.keys(statesSnapshot).length) body.selfStates = statesSnapshot;
      if (Object.keys(timesSnapshot).length) body.problemTimes = timesSnapshot;
      if (event) body.event = event;
      if (Object.keys(body).length === 0) return;
      setSaveStatus("saving");
      try {
        const r = await api<{ status: string; remainingSec?: number | null; leaveCount?: number; result?: { totalScore: number; maxScore: number } }>(
          `/tests/${params.id}/session`,
          { method: "PATCH", body },
        );
        for (const k of Object.keys(answersSnapshot)) {
          if (dirtyAnswersRef.current[k] === answersSnapshot[k]) delete dirtyAnswersRef.current[k];
        }
        for (const k of Object.keys(statesSnapshot)) {
          if (dirtyStatesRef.current[k] === statesSnapshot[k]) delete dirtyStatesRef.current[k];
        }
        setSaveStatus("saved");
        setOffline(false);
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
        // Сүлжээний алдаа — dirty өгөгдлийг хэвээр үлдээж, тогтмол banner харуулна
        setOffline(true);
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
  // "Дараа эргэж харах" — зөвхөн клиент/навигаторт зориулсан, дүнд нөлөөгүй
  function toggleFlag(pid: string) {
    setFlagged((f) => ({ ...f, [pid]: !f[pid] }));
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
        setSubmitDialogOpen(false);
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

  // ---------- 5 минутын үлдэлтэй сануулга (нэг л удаа, non-blocking toast) ----------
  useEffect(() => {
    if (phase !== "taking" || secondsLeft === null) return;
    if (secondsLeft <= FIVE_MIN_TOAST_SEC && !fiveMinToastShownRef.current) {
      fiveMinToastShownRef.current = true;
      const unanswered = problemsRef.current.filter(
        (p) => answersRef.current[p.id] === undefined || answersRef.current[p.id] === "",
      ).length;
      setToastMsg(`5 минут үлдлээ — ${unanswered} бодлого хариулаагүй байна`);
    }
  }, [phase, secondsLeft]);

  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(null), 8000);
    return () => clearTimeout(id);
  }, [toastMsg]);

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

  // ---------- Гарын товчлуур: FILL бодлогод шууд цифр, MC-д 1-5 сонголт ----------
  useEffect(() => {
    if (phase !== "taking") return;
    function onKey(e: KeyboardEvent) {
      if (subViewRef.current !== "question") return;
      const target = e.target as HTMLElement;
      const typingInField = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const cur = problemsRef.current[pageIdxRef.current];
      if (!cur) return;
      const pid = cur.id;

      if (cur.format === "FILL_NUMBER") {
        if (typingInField) return; // жинхэнэ input дээр байгаа бол native оролт ажиллана
        const prev = String(answersRef.current[pid] ?? "");
        // Бодлогын текстэд [a]/[bc] мэт нүдний тэмдэглэгээ байвал зөвхөн
        // цифр (max нүдний тоо хүртэл) — тэмдэг/аравтын цэг энд хамаагүй.
        const slotGroups = parseFillSlots(cur.statementText);
        if (slotGroups.length > 0) {
          const total = slotsTotalLength(slotGroups);
          if (/^[0-9]$/.test(e.key) && prev.length < total) setAnswer(pid, prev + e.key);
          else if (e.key === "Backspace") setAnswer(pid, prev.slice(0, -1));
          return;
        }
        if (/^[0-9]$/.test(e.key)) setAnswer(pid, prev + e.key);
        else if (e.key === "-" && !prev.includes("-")) setAnswer(pid, "-" + prev);
        else if (e.key === "." && !prev.includes(".")) setAnswer(pid, prev + ".");
        else if (e.key === "Backspace") setAnswer(pid, prev.slice(0, -1));
        return;
      }

      if (typingInField) return;
      if ((cur.choiceMode === "TEXT" || cur.choiceMode === "LETTER") && cur.choices) {
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= 5 && n <= cur.choices.length) {
          if (cur.choiceMode === "TEXT") setAnswer(pid, n - 1);
          else setAnswer(pid, cur.choices[n - 1]);
        }
      }
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
      problemsRef.current = r.problems ?? [];
      setAnswers(draftA);
      answersRef.current = draftA;
      setSelfStates(draftS);
      statesRef.current = draftS;
      setSecondsLeft(r.session.remainingSec ?? null);
      setLeaveCount(r.session.leaveCount ?? 0);
      lastLeaveAtRef.current = Date.now(); // эхлэх мөчийн fullscreen шилжилтийг тооцохгүй
      setPageIdx(0);
      setSubView("question");
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
  const flaggedCount = useMemo(
    () => problems.filter((p) => flagged[p.id]).length,
    [flagged, problems],
  );
  const navigatorCells: NavigatorCell[] = useMemo(
    () =>
      problems.map((p) => ({
        id: p.id,
        answered: answers[p.id] !== undefined && answers[p.id] !== "",
        flagged: !!flagged[p.id],
      })),
    [problems, answers, flagged],
  );
  // Хэсэг I (сонгох) / Хэсэг II (тоо нөхөх) хоорондын зааг — навигатор торыг
  // бүлэглэхэд ашиглана (ЭЕШ загвар: эхлээд CHOICE, дараа нь FILL_NUMBER).
  const partIIStart = useMemo(() => {
    const idx = problems.findIndex((p) => p.format === "FILL_NUMBER");
    return idx === -1 ? undefined : idx;
  }, [problems]);

  function jumpTo(idx: number) {
    setPageIdx(idx);
    setSubView("question");
  }

  // ---------- Ачаалал / алдаа ----------
  if (error && phase === "loading") {
    return (
      <div className="rounded-2xl border border-error/30 bg-error/5 p-6 text-center text-error">
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
      <ExamIntro
        title={meta.title}
        variantLabel={meta.variantLabel}
        problemCount={meta.problemCount}
        minutes={minutes}
        totalPoints={meta.totalPoints}
        manualGrading={manualGrading}
        maxLeaves={MAX_LEAVES}
        resume={resume}
        starting={starting}
        confirmStart={confirmStart}
        error={error}
        onStart={() => (resume ? void beginTest() : setConfirmStart(true))}
        onConfirmStart={() => void beginTest()}
        onCancelConfirm={() => setConfirmStart(false)}
        onBack={() => router.push("/app/tests")}
      />
    );
  }

  /* ====================== ҮР ДҮН + REVIEW ====================== */
  if (phase === "result") {
    return (
      <ExamResult
        title={meta.title}
        total={result?.total ?? 0}
        max={result?.max ?? 0}
        leaveCount={review?.leaveCount ?? 0}
        items={review?.items ?? []}
        onBackToList={() => router.push("/app/tests")}
      />
    );
  }

  /* ====================== ШАЛГАЛТ БОДОХ ====================== */
  const tp = problems[pageIdx];
  if (!tp) return null;
  const pid = tp.id;
  const isLast = pageIdx === problems.length - 1;

  return (
    // Exam горим: апп-ын цэсийг бүрэн далдалсан тусдаа давхарга (fixed inset-0)
    <div
      className="fixed inset-0 z-[60] flex select-none flex-col overflow-hidden bg-bg text-ink"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
      {offline && <OfflineBanner />}

      <ExamHeader
        title={meta.title}
        saveStatus={saveStatus}
        leaveCount={leaveCount}
        maxLeaves={MAX_LEAVES}
        answeredCount={answeredCount}
        totalCount={problems.length}
        onOpenNavigator={() => setNavigatorOpen(true)}
        onFinish={() => setSubView("review")}
        secondsLeft={secondsLeft}
        totalSec={minutes ? minutes * 60 : null}
      />

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {subView === "review" ? (
          <PreSubmitReview
            cells={navigatorCells}
            secondsLeft={secondsLeft}
            onJump={jumpTo}
            onBack={() => setSubView("question")}
            onOpenSubmit={() => setSubmitDialogOpen(true)}
          />
        ) : (
          <>
            {/* Бодлого — нэг дэлгэцэнд НЭГ асуулт (урт scroll-той жагсаалт биш).
                key={pid}: асуулт солигдох бүрт (тухайлбал FillNumberAnswer-ийн
                идэвхтэй нүд гэх мэт) дотоод UI төлөв цэвэрхэн дахин эхэлнэ. */}
            <QuestionCard
              key={pid}
              problem={tp}
              problemNumber={pageIdx + 1}
              answer={answers[pid]}
              onAnswer={(value) => setAnswer(pid, value)}
              selfState={selfStates[pid]}
              onSelfState={(value) => setSelfState(pid, value)}
              keypadTheme={keypadTheme}
            />

            <QuestionFooterNav
              canGoPrev={pageIdx > 0}
              onPrev={() => setPageIdx((i) => Math.max(0, i - 1))}
              flagged={!!flagged[pid]}
              onToggleFlag={() => toggleFlag(pid)}
              isLast={isLast}
              onNext={() => setPageIdx((i) => Math.min(problems.length - 1, i + 1))}
              onReview={() => setSubView("review")}
            />
          </>
        )}

        {error && (
          <p className="mx-auto mb-4 max-w-2xl rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
        )}
      </main>

      <QuestionNavigator
        open={navigatorOpen}
        onClose={() => setNavigatorOpen(false)}
        cells={navigatorCells}
        currentIndex={pageIdx}
        onJump={jumpTo}
        partIIStart={partIIStart}
      />

      <SubmitDialog
        open={submitDialogOpen}
        answeredCount={answeredCount}
        total={problems.length}
        flaggedCount={flaggedCount}
        secondsLeft={secondsLeft}
        onCancel={() => setSubmitDialogOpen(false)}
        onConfirm={() => void finish("USER")}
      />

      {toastMsg && <ExamToast message={toastMsg} onDismiss={() => setToastMsg(null)} />}

      <LeaveWarningDialog
        open={leaveWarnOpen}
        leaveCount={leaveCount}
        maxLeaves={MAX_LEAVES}
        onAcknowledge={() => {
          setLeaveWarnOpen(false);
          void document.documentElement.requestFullscreen?.().catch(() => {});
        }}
      />
    </div>
  );
}
