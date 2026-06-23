"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MathText from "@/components/MathText";
import NumericKeypad from "@/components/NumericKeypad";
import { api } from "@/lib/api";

/* ============================================================================
 * Тест бодох хуудас — official шалгалтын орчин
 *
 * Урсгал: intro (эхлэх дэлгэц + хугацааны анхааруулга) → taking (нэг бодлого/
 * хуудас, навигатортай) → result. Хариунуудыг төгсгөлд нь нэг дор илгээнэ —
 * бодлого бүрийн хариу шууд харагдахгүй (жинхэнэ шалгалттай адил).
 *
 * Математик томьёог LaTeX-ээр (KaTeX) рендерлэнэ — MathText компонент.
 * Theme: navy (хар хөх) ба цагаан 2 сонголттой.
 * ========================================================================== */

interface TP {
  order: number;
  points: number;
  problem: {
    id: string;
    token: string;
    format: string;
    statementText?: string;
    imageKey?: string;
    choices?: string[];
  };
}
interface TestData {
  id: string;
  title: string;
  variantLabel?: string;
  gradingMode?: string;
  pdfKey?: string;
  timeLimitMin?: number;
  problems: TP[];
}

// Сурагчийн өөрийн үнэлгээ (адаптив аналитикийн дата — SPEC §9.1)
const SELF_STATES = [
  { value: "SOLVED_CLEAN", label: "Алдаагүй", tone: "ok" },
  { value: "FIXED_AFTER_ERROR", label: "Зассан", tone: "warn" },
  { value: "FAILED", label: "Алдсан", tone: "bad" },
  { value: "GUESSED", label: "Буудсан", tone: "guess" },
] as const;

type Theme = "navy" | "light";

// Theme бүрийн өнгөний багц — exam орчныг бүхэлд нь хувиргана
const THEMES: Record<
  Theme,
  {
    page: string;
    card: string;
    bar: string;
    text: string;
    dim: string;
    border: string;
    chip: string;
    navIdle: string;
  }
> = {
  navy: {
    page: "bg-[#060c1d] text-[#e9eefb]",
    card: "bg-[#0b142e] border-white/8",
    bar: "bg-[#060c1d]/95 border-white/8",
    text: "text-[#e9eefb]",
    dim: "text-[#93a3c7]",
    border: "border-white/10",
    chip: "bg-white/5 text-[#93a3c7]",
    navIdle: "border-white/10 text-[#93a3c7] hover:border-white/30",
  },
  light: {
    page: "bg-white text-[#0b142e]",
    card: "bg-[#f7f9fc] border-black/10",
    bar: "bg-white/95 border-black/10",
    text: "text-[#0b142e]",
    dim: "text-[#5c6b8a]",
    border: "border-black/15",
    chip: "bg-black/5 text-[#5c6b8a]",
    navIdle: "border-black/15 text-[#5c6b8a] hover:border-black/30",
  },
};

const SELF_TONE: Record<string, string> = {
  ok: "bg-teal-400/20 text-teal-700 border-teal-400/50",
  warn: "bg-amber-400/20 text-amber-700 border-amber-400/50",
  bad: "bg-red-400/20 text-red-700 border-red-400/50",
  guess: "bg-indigo-400/20 text-indigo-700 border-indigo-400/50",
};

export default function TakeTestPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [test, setTest] = useState<TestData | null>(null);
  const [phase, setPhase] = useState<"intro" | "taking" | "result">("intro");
  const [theme, setTheme] = useState<Theme>("navy");
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selfStates, setSelfStates] = useState<Record<string, string>>({});
  const [pageIdx, setPageIdx] = useState(0); // одоогийн бодлогын индекс
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [result, setResult] = useState<{ total: number; max: number } | null>(null);
  const [error, setError] = useState("");

  const startRef = useRef(0);
  const submittedRef = useRef(false);
  const t = THEMES[theme];

  // --- Тест ачаалах ---
  useEffect(() => {
    api<TestData>(`/tests/${params.id}`)
      .then(setTest)
      .catch((e) => setError(e instanceof Error ? e.message : "Алдаа"));
  }, [params.id]);

  const totalPoints = useMemo(
    () => test?.problems.reduce((s, p) => s + p.points, 0) ?? 0,
    [test],
  );
  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers],
  );
  const manualGrading = test?.gradingMode === "MANUAL";

  // --- Илгээх ---
  const submit = useCallback(async () => {
    if (submittedRef.current || !test) return;
    if (manualGrading) {
      setError("Энэ тестийг багш гараар дүгнэнэ — авто оноо бодохгүй.");
      return;
    }
    submittedRef.current = true;
    setError("");
    try {
      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      const res = await api<{ result: { totalScore: number; maxScore: number } }>(
        `/tests/${params.id}/submit`,
        {
          method: "POST",
          body: {
            answers: test.problems.map((tp) => ({
              problemId: tp.problem.id,
              answer: answers[tp.problem.id] ?? "",
              selfState: selfStates[tp.problem.id],
              timeSpentSec: Math.round(elapsed / test.problems.length),
            })),
          },
        },
      );
      setResult({ total: res.result.totalScore, max: res.result.maxScore });
      setPhase("result");
    } catch (e) {
      submittedRef.current = false;
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    }
  }, [test, manualGrading, params.id, answers, selfStates]);

  // --- Хугацаа тоолох (зөвхөн taking фазад) ---
  useEffect(() => {
    if (phase !== "taking" || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      const id = setTimeout(() => void submit(), 0); // цаг дуусахад автоматаар илгээнэ
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, secondsLeft, submit]);

  function beginTest() {
    setConfirmStart(false);
    startRef.current = Date.now();
    if (test?.timeLimitMin) setSecondsLeft(test.timeLimitMin * 60);
    setPhase("taking");
  }

  // ---------- Ачаалал / алдаа ----------
  if (error && !test) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-center text-red-300">
        {error}
      </div>
    );
  }
  if (!test) return <p className="text-ink-dim">Ачаалж байна…</p>;

  const minutes = test.timeLimitMin ?? 0;

  /* ====================== ИНТРО ДЭЛГЭЦ ====================== */
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-3xl border border-white/8 bg-[#0b142e] p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-bright">
            Шалгалт
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">
            {test.title}
            {test.variantLabel && (
              <span className="ml-1 text-ink-dim">({test.variantLabel})</span>
            )}
          </h1>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Бодлого" value={`${test.problems.length}`} />
            <Stat label="Хугацаа" value={minutes ? `${minutes} мин` : "Хязгааргүй"} />
            <Stat label="Нийт оноо" value={`${totalPoints}`} />
          </div>

          <ul className="mt-6 space-y-2 text-left text-sm text-ink-dim">
            <li>• Бодлого бүрийг нэг нэгээр нь бодож, хариугаа тэмдэглэнэ.</li>
            <li>• Хариу шууд харагдахгүй — төгсгөлд бүгдийг нэг дор илгээнэ.</li>
            {minutes > 0 && <li>• Цаг дуусахад автоматаар илгээгдэнэ.</li>}
          </ul>

          {/* Theme сонголт */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <span className="text-ink-dim">Дэлгэцийн өнгө:</span>
            <button
              onClick={() => setTheme("navy")}
              className={`rounded-lg border px-3 py-1.5 ${theme === "navy" ? "border-brand-bright bg-brand-bright/15 text-brand-soft" : "border-white/10 text-ink-dim"}`}
            >
              Хар хөх
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`rounded-lg border px-3 py-1.5 ${theme === "light" ? "border-brand-bright bg-brand-bright/15 text-brand-soft" : "border-white/10 text-ink-dim"}`}
            >
              Цагаан
            </button>
          </div>

          <button
            onClick={() => setConfirmStart(true)}
            className="glow-pulse mt-7 w-full rounded-xl bg-brand-bright py-4 text-lg font-bold text-white transition hover:bg-[#6190f0]"
          >
            Шалгалт эхлэх
          </button>
          <button
            onClick={() => router.push("/app/tests")}
            className="mt-3 text-sm text-ink-dim hover:text-ink"
          >
            Буцах
          </button>
        </div>

        {/* Эхлэхээс өмнөх хугацааны анхааруулга */}
        {confirmStart && (
          <div className="mt-4 flex min-h-[200px] items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6">
            <div className="text-center">
              <p className="text-lg font-bold text-amber-200">⏱ Анхаар!</p>
              <p className="mt-2 text-sm text-amber-100/80">
                {minutes > 0 ? (
                  <>
                    Танд <b>{minutes} минут</b> байна. Эхлэх товч дармагц цаг
                    гүйж эхэлнэ. Бэлэн үү?
                  </>
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
                  onClick={beginTest}
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

  /* ====================== ҮР ДҮН ====================== */
  if (phase === "result" && result) {
    const pct = Math.round((result.total / result.max) * 100);
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-white/8 bg-[#0b142e] p-8 text-center">
        <p className="text-sm text-ink-dim">{test.title}</p>
        <p className="my-4 text-5xl font-extrabold text-brand-soft">
          {result.total}
          <span className="text-2xl text-ink-dim">/{result.max}</span>
        </p>
        <div className="mx-auto mb-4 h-3 max-w-xs overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-bright to-teal-400"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-ink-dim">{pct}% оноо авлаа</p>
        <button
          onClick={() => router.push("/app/tests")}
          className="mt-6 rounded-xl bg-brand-bright px-6 py-3 font-bold text-white"
        >
          Шалгалтын жагсаалт руу
        </button>
      </div>
    );
  }

  /* ====================== ШАЛГАЛТ БОДОХ ====================== */
  const tp = test.problems[pageIdx];
  const pid = tp.problem.id;
  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;
  const lowTime = secondsLeft !== null && secondsLeft < 300;
  const isLast = pageIdx === test.problems.length - 1;

  return (
    <div className={`-mx-4 -my-8 min-h-screen px-4 py-6 ${t.page}`}>
      {/* Дээд мөр — таймер + прогресс + theme */}
      <div
        className={`sticky top-14 z-30 -mx-4 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur ${t.bar}`}
      >
        <div className="min-w-0">
          <p className="truncate font-bold">{test.title}</p>
          <p className={`text-xs ${t.dim}`}>
            {answeredCount}/{test.problems.length} хариулсан
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

      {/* Бодлогын навигатор — дугаар дээр дарж шилжинэ */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {test.problems.map((p, i) => {
          const done = !!answers[p.problem.id];
          const cur = i === pageIdx;
          return (
            <button
              key={p.problem.id}
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

      {/* Нэг бодлого (фокус) */}
      <div className={`mt-4 rounded-2xl border p-6 ${t.card}`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-bright/15 text-base font-bold text-brand-soft">
            {pageIdx + 1}
          </span>
          <span className={`font-mono text-[11px] ${t.dim}`}>
            {tp.problem.token} · {tp.points} оноо
          </span>
        </div>

        {/* Бодлогын текст — LaTeX томьёотойгоор */}
        <div className="text-lg leading-relaxed">
          <MathText>{tp.problem.statementText ?? ""}</MathText>
        </div>

        {/* Хариулт — формат бүрд тохирсон оролт */}
        {tp.problem.format === "CHOICE" && tp.problem.choices ? (
          // Сонгох тест: A–E хувилбарууд
          <div className="mt-5 space-y-2">
            {tp.problem.choices.map((c, ci) => {
              const letter = String.fromCharCode(65 + ci);
              const sel = answers[pid] === letter;
              return (
                <button
                  key={letter}
                  onClick={() => setAnswers((a) => ({ ...a, [pid]: letter }))}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    sel
                      ? "border-brand-bright bg-brand-bright/15"
                      : t.navIdle
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${sel ? "border-brand-bright bg-brand-bright text-white" : t.border}`}
                  >
                    {letter}
                  </span>
                  <span className="flex-1">
                    <MathText>{c}</MathText>
                  </span>
                </button>
              );
            })}
          </div>
        ) : tp.problem.format === "FILL_NUMBER" ? (
          // Тоо нөхөх: 11 товчит цифрэн гар (0–9, -, .)
          <NumericKeypad
            value={answers[pid] ?? ""}
            onChange={(update) =>
              setAnswers((a) => ({ ...a, [pid]: update(a[pid] ?? "") }))
            }
            theme={theme}
          />
        ) : (
          // Задгай хариулт (OPEN): чөлөөт текст
          <input
            value={answers[pid] ?? ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [pid]: e.target.value }))}
            placeholder="Хариугаа бичнэ үү"
            className={`mt-5 w-full max-w-xs rounded-xl border bg-transparent px-4 py-3 outline-none focus:border-brand-bright ${t.border}`}
          />
        )}

        {/* Өөрийн тэмдэглэгээ (адаптив дата) */}
        <div className="mt-5 border-t border-white/5 pt-4">
          <p className={`mb-2 text-xs ${t.dim}`}>Би энэ бодлогыг:</p>
          <div className="flex flex-wrap gap-1.5">
            {SELF_STATES.map((s) => {
              const sel = selfStates[pid] === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setSelfStates((m) => ({ ...m, [pid]: s.value }))}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${sel ? SELF_TONE[s.tone] : t.navIdle}`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Доод навигац — Өмнөх / Дараах / Дуусгах */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
          disabled={pageIdx === 0}
          className={`rounded-xl border px-5 py-3 font-semibold disabled:opacity-30 ${t.navIdle}`}
        >
          ← Өмнөх
        </button>
        {!isLast ? (
          <button
            onClick={() => setPageIdx((i) => Math.min(test.problems.length - 1, i + 1))}
            className="flex-1 rounded-xl bg-brand-bright py-3 font-bold text-white"
          >
            Дараах →
          </button>
        ) : (
          <button
            onClick={() => setConfirmFinish(true)}
            disabled={manualGrading}
            className="flex-1 rounded-xl bg-teal-500 py-3 font-bold text-white disabled:opacity-50"
          >
            {manualGrading ? "Багшийн дүн хүлээнэ" : "Шалгалт дуусгах"}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Дуусгахын өмнөх баталгаажуулалт */}
      {confirmFinish && (
        <div className="mt-4 flex min-h-[180px] items-center justify-center rounded-2xl border border-white/15 bg-[#0b142e] p-6">
          <div className="text-center">
            <p className="font-bold">Шалгалтыг дуусгах уу?</p>
            <p className="mt-1 text-sm text-ink-dim">
              {test.problems.length - answeredCount > 0
                ? `${test.problems.length - answeredCount} бодлого хариулаагүй байна.`
                : "Бүх бодлогыг хариулсан байна."}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => setConfirmFinish(false)}
                className="rounded-lg border border-white/15 px-5 py-2 text-sm"
              >
                Үргэлжлүүлэх
              </button>
              <button
                onClick={() => {
                  setConfirmFinish(false);
                  void submit();
                }}
                className="rounded-lg bg-teal-500 px-6 py-2 text-sm font-bold text-white"
              >
                Тийм, илгээх
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Интро дэлгэцийн жижиг статистик карт
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-xl font-extrabold">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-dim">{label}</p>
    </div>
  );
}
