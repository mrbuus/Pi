"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, RotateCcw, Send, XCircle } from "lucide-react";
import FillNumberAnswer from "@/components/exam/FillNumberAnswer";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api, apiUrl } from "@/lib/api";
import UnlockPanel from "./UnlockPanel";
import type { TryAnswers, TryProblem, TryResult, TryView } from "./types";

// Үнэгүй тестийг нэвтрэлтгүй бодох. Хариу хөтөчид хадгалагдана, дүн серверт
// бодогдоно (зөв/буруу л ирнэ — зөв хариу, бодолт эрхтэй сурагчдад).

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const storeKey = (id: string) => `try:${id}`;

interface Saved { answers: TryAnswers; startedAt: number }
const load = (id: string): Saved | null => { try { return JSON.parse(localStorage.getItem(storeKey(id)) ?? "null"); } catch { return null; } };
const save = (id: string, v: Saved | null) => { try { if (v) localStorage.setItem(storeKey(id), JSON.stringify(v)); else localStorage.removeItem(storeKey(id)); } catch { /* хувийн цонх */ } };

export default function TryTest({ testId, bookId, bookName, onBack, next }: {
  testId: string; bookId: string; bookName: string; onBack: () => void;
  next?: { label: string; onOpen: () => void } | null;
}) {
  const [view, setView] = useState<TryView | null>(null);
  const [failed, setFailed] = useState<"locked" | "error" | null>(null);
  const [answers, setAnswers] = useState<TryAnswers>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<TryResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    api<TryView>(`/catalog/try/tests/${encodeURIComponent(testId)}`, { auth: false })
      .then((v) => {
        if (!alive) return;
        setView(v);
        const s = load(testId);
        setAnswers(s?.answers ?? {});
        setStartedAt(s?.startedAt ?? null);
      })
      .catch((e: unknown) => { if (alive) setFailed(e instanceof Error && /403/.test(e.message) ? "locked" : "error"); });
    return () => { alive = false; };
  }, [testId, retry]);

  // Цаг (хугацаатай тест) — дуусахад автоматаар дүгнүүлнэ
  const limitSec = (view?.timeLimitMin ?? 0) * 60;
  const left = startedAt && limitSec ? Math.max(0, Math.round((startedAt + limitSec * 1000 - now) / 1000)) : null;
  const gradeRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!startedAt || result) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (limitSec && t >= startedAt + limitSec * 1000) gradeRef.current();
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, limitSec, result]);

  // Цагийг хэрэглэгчийн үйлдлийн мөчөөс эхлүүлнэ — зөвхөн товч/хариу сонгоход дуудагдана, render дотор биш
  // eslint-disable-next-line react-hooks/purity -- хэрэглэгчийн үйлдлийн мөч
  const begin = () => { const t = Date.now(); setStartedAt(t); setNow(t); };
  // Функцэн шинэчлэл: хоёр хариуг зэрэг сонгоход ч аль нэг нь алдагдахгүй
  const setAnswer = (pid: string, v: number | string) => {
    setAnswers((a) => ({ ...a, [pid]: v }));
    if (!startedAt) begin();
  };
  // Хариу, эхэлсэн мөчийг хөтөчид хадгална (дүгнүүлснийх нь дараа устгана)
  useEffect(() => {
    if (!view || result) return;
    if (startedAt || Object.keys(answers).length) save(testId, { answers, startedAt: startedAt ?? Date.now() });
  }, [answers, startedAt, testId, view, result]);

  const grade = useCallback(async () => {
    if (busy || result) return;
    setBusy(true);
    try {
      const r = await api<TryResult>(`/catalog/try/tests/${encodeURIComponent(testId)}/grade`, { method: "POST", body: { answers }, auth: false });
      setResult(r);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch { /* сүлжээ: товч идэвхтэй үлдэнэ */ } finally { setBusy(false); }
  }, [answers, busy, result, testId]);
  useEffect(() => { gradeRef.current = () => void grade(); }, [grade]);

  const reset = () => { setAnswers({}); setResult(null); setStartedAt(null); save(testId, null); topRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const answered = useMemo(() => (view?.problems ?? []).filter((p) => answers[p.id] !== undefined && answers[p.id] !== "").length, [answers, view]);

  if (failed === "locked") return <ErrorState message="Энэ тест номын эрхтэй сурагчдад нээлттэй" onRetry={onBack} />;
  if (failed === "error") return <ErrorState message="Тестийг ачаалж чадсангүй" onRetry={() => setRetry((r) => r + 1)} />;
  if (!view) return <LoadingState rows={6} />;

  const pct = result && result.max ? Math.round((result.score / result.max) * 100) : 0;
  const variant = view.variantLabel ? ` · ${view.variantLabel} хувилбар` : "";
  const img = (key: string) => apiUrl(`/catalog/try/tests/${encodeURIComponent(testId)}/files/${encodeURIComponent(key)}`);

  return (
    <div ref={topRef} className="space-y-4 scroll-mt-24">
      {/* Толгой: буцах, нэр, цаг, явц, дүгнүүлэх */}
      <div className="sticky top-16 z-20 -mx-1 rounded-2xl border border-line bg-surface/95 px-3 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft aria-hidden />Тестүүд</Button>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{view.chapter.title.split(" · ").pop()}{variant}</span>
          {left !== null && !result && (
            <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-sm font-bold tabular-nums ${left < 120 ? "bg-error/12 text-error" : "bg-brand-bright/12 text-brand-soft"}`}><Clock className="h-3.5 w-3.5" aria-hidden />{mmss(left)}</span>
          )}
          {!result && <span className="text-xs text-ink-dim">{answered}/{view.problemCount}</span>}
          {!result && <Button size="sm" onClick={grade} disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}Дүгнүүлэх</Button>}
        </div>
      </div>

      {!startedAt && !result && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-bright/8 px-4 py-3 text-sm">
          <span className="font-semibold">{view.problemCount} бодлого{view.timeLimitMin ? `, ${view.timeLimitMin} минут` : ""}</span>
          <span className="text-ink-dim">Эхний хариугаа сонгомогц цаг явна</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={begin}><Clock aria-hidden />Цагаа эхлүүлэх</Button>
        </div>
      )}

      {result && (
        <section aria-labelledby="try-res" className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-5">
            <ScoreRing pct={pct} />
            <div className="min-w-0 flex-1">
              <h2 id="try-res" className="text-2xl font-extrabold tracking-tight">{result.score} / {result.max} оноо</h2>
              <p className="mt-1 text-sm text-ink-dim">{result.answered} бодлогод хариулсан, {verdict(pct)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={reset}><RotateCcw aria-hidden />Дахин бодох</Button>
                {next && <Button size="sm" onClick={next.onOpen}>{next.label}<ArrowRight aria-hidden /></Button>}
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-dim">Зөв хариу, бодолт, видео тайлбар номын эрхтэй сурагчдад нээгдэнэ</p>
        </section>
      )}

      <ol className="space-y-3">
        {view.problems.map((p) => (
          <li key={p.id}>
            <ProblemCard p={p} answer={answers[p.id]} onAnswer={(v) => setAnswer(p.id, v)} img={img} locked={!!result} verdict={result ? result.perProblem[p.id] : undefined} />
          </li>
        ))}
      </ol>

      {!result && <Button className="w-full" size="lg" onClick={grade} disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}Дүгнүүлэх</Button>}
      <UnlockPanel bookId={bookId} bookName={bookName} compact />
    </div>
  );
}

function verdict(pct: number) {
  if (pct >= 90) return "маш сайн";
  if (pct >= 70) return "сайн";
  if (pct >= 50) return "дунд, давтах сэдэв бий";
  return "суурь дээрээ ажиллах хэрэгтэй";
}

function ScoreRing({ pct }: { pct: number }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`${pct} хувь`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-line" />
      <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-brand" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 44 44)" style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.7,.2,1)" }} />
      <text x="44" y="49" textAnchor="middle" className="fill-current font-display text-lg font-bold">{pct}%</text>
    </svg>
  );
}

function ProblemCard({ p, answer, onAnswer, img, locked, verdict: v }: {
  p: TryProblem; answer: number | string | undefined; onAnswer: (v: number | string) => void;
  img: (key: string) => string; locked: boolean; verdict: boolean | null | undefined;
}) {
  const badge = v === undefined ? null : v === null
    ? <span className="rounded-full bg-ink/8 px-2.5 py-0.5 text-xs font-semibold text-ink-dim">Дүнд ороогүй</span>
    : v ? <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden />Зөв</span>
      : <span className="inline-flex items-center gap-1 rounded-full bg-error/15 px-2.5 py-0.5 text-xs font-semibold text-error"><XCircle className="h-3.5 w-3.5" aria-hidden />Буруу</span>;
  return (
    <article className={`rounded-3xl border bg-surface p-4 sm:p-5 ${v === true ? "border-success/40" : v === false ? "border-error/40" : "border-line"}`} aria-labelledby={`tp-${p.id}`}>
      <div className="flex items-start gap-3">
        <span id={`tp-${p.id}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-bright/15 font-display text-sm font-bold text-brand-soft">{p.n}</span>
        <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden py-1 text-[17px] leading-relaxed"><MathText>{p.statementText ?? ""}</MathText></div>
        <div className="flex shrink-0 flex-col items-end gap-1"><span className="text-[11px] text-ink-dim">{p.points} оноо</span>{badge}</div>
      </div>
      {p.imageKey && (
        // eslint-disable-next-line @next/next/no-img-element -- нийтийн API зам (токенгүй), next/image хэрэггүй
        <img src={img(p.imageKey)} alt="Бодлогын зураг" loading="lazy" className="mt-3 max-h-72 w-auto max-w-full rounded-xl border border-line bg-bg object-contain" />
      )}
      <fieldset disabled={locked} className="mt-4 border-t border-line pt-4 disabled:opacity-90">
        {p.choiceMode && p.choices ? (
          <div role="radiogroup" aria-label={`${p.n}-р бодлогын хариу`} className={`grid gap-2 ${p.choiceMode === "LETTER" ? "grid-cols-5" : "sm:grid-cols-2"}`}>
            {p.choices.map((c, i) => {
              const val = p.choiceMode === "TEXT" ? i : c;
              const on = answer === val;
              return (
                <button key={i} type="button" role="radio" aria-checked={on} onClick={() => onAnswer(val)}
                  className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${on ? "border-brand-bright bg-brand-bright/12 text-brand-soft" : "border-line bg-bg hover:border-brand-bright/50"} ${p.choiceMode === "LETTER" ? "justify-center" : ""}`}>
                  {p.choiceMode === "TEXT" && <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold ${on ? "bg-brand-bright text-on-brand" : "bg-surface text-ink-dim"}`}>{LETTERS[i] ?? i + 1}</span>}
                  {p.choiceMode === "TEXT" ? (
                    <span className="min-w-0 text-[16px] leading-normal">
                      <MathText>{c}</MathText>
                      {p.choiceImages?.[i] && (
                        // eslint-disable-next-line @next/next/no-img-element -- нийтийн API зам
                        <img src={img(p.choiceImages[i]!)} alt="" className="mt-1 max-h-28 rounded-lg" />
                      )}
                    </span>
                  ) : <span className="font-bold">{c}</span>}
                </button>
              );
            })}
          </div>
        ) : p.format === "FILL_NUMBER" ? (
          <FillNumberAnswer problemNumber={p.n} statementText={p.statementText} value={String(answer ?? "")} onChange={(u) => onAnswer(u(String(answer ?? "")))} theme="light" />
        ) : (
          <label className="block max-w-xs text-xs text-ink-dim">Хариугаа бич
            <input value={String(answer ?? "")} onChange={(e) => onAnswer(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-line bg-bg px-4 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/60" />
          </label>
        )}
      </fieldset>
    </article>
  );
}
