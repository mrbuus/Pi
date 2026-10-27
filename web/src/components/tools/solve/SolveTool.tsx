"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ChartSpline, ChevronDown, CircleAlert, Copy, FunctionSquare, History, Infinity as InfinityIcon, Keyboard, ListOrdered, Play, Printer,
  Settings2, Sigma, SquareRadical, Trash2, X, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import MathText from "@/components/MathText";
import { EmptyState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import MathInput, { type MathInputHandle } from "../core/MathInput";
import MathKeyboard from "../core/MathKeyboard";
import { loadState, saveState } from "../core/export";
import { useToolsNav } from "../core/hub";
import { ACTION_LABEL, type Action } from "./auto";
import { liveSolve, safeSolve, type Live } from "./live";
import MiniGraph from "./MiniGraph";
import OtherCalcs, { seqLabel, SEQ_SUBS } from "./OtherCalcs";
import ResultView from "./ResultView";
import type { SeqSub } from "./solve";
import type { Solution } from "./steps";

/* ============================================================================
 * БОДОГЧ — Photomath-ын тооцоолуурын хэрэглээ:
 *   - дээр нь цэвэр оруулга, бичиж байх зуур (≈400мс) хариу АВТОМАТААР гарна
 *     («Бодох» товчгүй); дутуу оролтод юу ч харуулахгүй, бүрэн бөгөөд буруу
 *     бол л зөөлөн «Оролтыг шалгана уу»
 *   - ↵ эсвэл «Алхамаар харах» → алхам нэг нэгээр
 *   - гар утсан дээр дэлгэцийн доор бэхлэгдсэн, компьютер дээр оруулгын доор
 * Бодолт өөрөө live.ts → auto.ts → solve.ts (өөрийн алгоритм, интернэтгүй).
 * ========================================================================== */

interface Saved {
  latex: string;
  plain: boolean;
  degrees: boolean;
  seqSub: SeqSub;
  seq: Record<string, string>;
}
interface HistoryItem {
  latex?: string;
  plain?: boolean;
  action: Action | "seq";
  extra?: Record<string, string>;
  seqSub?: SeqSub;
  degrees: boolean;
  title: string;
}

const DEFAULT: Saved = { latex: "", plain: false, degrees: false, seqSub: "arith", seq: { a1: "", d: "", n: "", b1: "", q: "", k: "", m: "", p: "" } };
const DEBOUNCE = 400;

const ACTION_ICON: Partial<Record<Action, LucideIcon>> = {
  deriv: FunctionSquare,
  int: Sigma,
  defint: Sigma,
  lim: InfinityIcon,
  study: ChartSpline,
  factor: SquareRadical,
};

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  [data-solve-print], [data-solve-print] * { visibility: visible !important; }
  [data-solve-print] { position: absolute; inset: 0 auto auto 0; width: 100%; padding: 12mm; opacity: 1 !important;
    color-scheme: light; --ink: CanvasText; --ink-dim: GrayText; --surface: Canvas; --bg: Canvas; --line: GrayText;
    background: Canvas; color: CanvasText; }
  [data-print-hide] { display: none !important; }
}`;

const DESKTOP_MQ = "(min-width: 1024px)";
const isDesktop = () => typeof window !== "undefined" && window.matchMedia(DESKTOP_MQ).matches;
const subscribeDesktop = (cb: () => void) => {
  const mq = window.matchMedia(DESKTOP_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
/** Компьютерийн өргөн дэлгэц эсэх (гар доор бэхлэгдэх эсэхийг шийднэ) */
const useDesktop = () => useSyncExternalStore(subscribeDesktop, isDesktop, () => false);

/** Хураагддаг жижиг хэсэг (Тохиргоо, Бусад тооцоо) */
function Fold({ icon: Icon, title, open, onToggle, children }: { icon: LucideIcon; title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-12 w-full items-center gap-2 px-4 text-sm font-semibold text-ink">
        <Icon className="h-4 w-4 text-ink-dim" aria-hidden />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-ink-dim transition-transform duration-[var(--dur-micro)]", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="space-y-4 border-t border-line p-4">{children}</div>}
    </div>
  );
}

function Chip({ on, onClick, icon: Icon, children }: { on?: boolean; onClick: () => void; icon?: LucideIcon; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors duration-[var(--dur-micro)]",
        on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line bg-surface text-ink hover:border-brand-bright/50 hover:bg-brand-bright/5",
      )}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
}

function ParamField({ tex, value, onChange, onEnter, hint, width = "w-24" }: { tex: string; value: string; onChange: (v: string) => void; onEnter: () => void; hint?: string; width?: string }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-sm text-ink-dim">
        <MathText>{`$${tex}$`}</MathText>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
        placeholder={hint}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={cn("h-11 min-w-0 rounded-xl border border-line bg-bg px-3 text-base text-ink placeholder:text-ink-dim/60", width)}
      />
    </label>
  );
}

/** Бодож байна: гурван жижиг дугуй (CSS — тэмдэгт биш) */
function Dots() {
  return (
    <div role="status" aria-label="Бодож байна" className="flex h-10 items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-ink-dim/60" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </div>
  );
}

export default function SolveTool() {
  const nav = useToolsNav();
  const desktop = useDesktop();
  const [st, setSt] = useState<Saved>(() => {
    const s = loadState<Saved>("solve-v2", DEFAULT);
    return { ...DEFAULT, ...s, seq: { ...DEFAULT.seq, ...s.seq } };
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => loadState<HistoryItem[]>("solve-history-v2", []));
  const [live, setLive] = useState<Live>({ status: "empty" });
  const [liveFor, setLiveFor] = useState("");
  const [pending, setPending] = useState(() => !!st.latex.trim());
  const [action, setAction] = useState<Action | null>(null);
  const [params, setParams] = useState<Record<string, string>>({ to: "", a: "", b: "", order: "1", at: "" });
  const [derivOpts, setDerivOpts] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [kbOpen, setKbOpen] = useState(true);
  const [histOpen, setHistOpen] = useState(false);
  const [fold, setFold] = useState<"settings" | "other" | null>(null);
  const [seqRes, setSeqRes] = useState<Solution | null>(null);
  const [kbH, setKbH] = useState(0);
  const input = useRef<MathInputHandle>(null);
  const resultRef = useRef<HTMLElement>(null);
  const kbRef = useRef<HTMLDivElement>(null);
  // Сүүлийн утгууд (effect-ийн хамаарал болгохгүй)
  const latest = useRef({ action, params });
  useEffect(() => {
    latest.current = { action, params };
  });

  useEffect(() => saveState("solve-v2", st), [st]);
  useEffect(() => saveState("solve-history-v2", history), [history]);

  // Гарын өндөр — утсан дээр доор бэхлэгдсэн гарын ард агуулга нуугдахгүй
  useEffect(() => {
    const el = kbRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setKbH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Бичиж байх зуурх автомат бодолт
  useEffect(() => {
    if (!st.latex.trim()) return;
    const latex = st.latex, plain = st.plain, degrees = st.degrees;
    const t = setTimeout(() => {
      const { action: a, params: p } = latest.current;
      setLive(liveSolve(latex, { plain, degrees, action: a ?? undefined, params: p }));
      setLiveFor(latex);
      setPending(false);
    }, DEBOUNCE);
    return () => clearTimeout(t);
  }, [st.latex, st.plain, st.degrees]);

  /** Одоо шууд бодох (чип, жишээ, параметр) */
  const computeNow = (latex = st.latex, opts: { action?: Action | null; params?: Record<string, string>; degrees?: boolean; plain?: boolean } = {}) => {
    const r = liveSolve(latex, {
      plain: opts.plain ?? st.plain,
      degrees: opts.degrees ?? st.degrees,
      action: (opts.action === undefined ? action : opts.action) ?? undefined,
      params: opts.params ?? params,
    });
    setLive(r);
    setLiveFor(latex);
    setPending(false);
    return r;
  };

  const remember = (r: Live, latex: string, plain: boolean, degrees: boolean) => {
    if (r.status !== "done" || !r.sol.ok) return;
    const item: HistoryItem = { latex, plain, action: r.action, degrees, title: r.sol.title || ACTION_LABEL[r.action] };
    const key = (h: HistoryItem) => JSON.stringify([h.latex, h.action, h.seqSub, h.extra]);
    setHistory((hs) => [item, ...hs.filter((h) => key(h) !== key(item))].slice(0, 30));
  };

  const setLatex = (latex: string, plain: boolean) => {
    setSt((s) => ({ ...s, latex, plain }));
    setAction(null);
    setDerivOpts(false);
    setStepsOpen(false);
    setPending(!!latex.trim());
    if (!latex.trim()) {
      setLive({ status: "empty" });
      setLiveFor("");
    }
  };

  const openSteps = () => {
    let r = live;
    if (pending || liveFor !== st.latex) r = computeNow();
    if (r.status !== "done") {
      if (r.status === "error") toast.message("Оролтыг шалгана уу");
      return;
    }
    remember(r, st.latex, st.plain, st.degrees);
    setStepsOpen(true);
    setHistOpen(false);
    if (!isDesktop()) {
      setKbOpen(false);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const runAction = (a: Action) => {
    setAction(a);
    setStepsOpen(false);
    const r = computeNow(st.latex, { action: a });
    remember(r, st.latex, st.plain, st.degrees);
  };

  /** Жишээ, түүхээс: талбарт тавиад шууд бодно */
  const loadAndRun = (latex: string, plain = false, act?: Action, degrees = st.degrees) => {
    input.current?.setValue(latex);
    setSt((s) => ({ ...s, latex, plain, degrees }));
    setAction(act ?? null);
    setStepsOpen(false);
    setHistOpen(false);
    const r = computeNow(latex, { action: act ?? null, degrees, plain });
    remember(r, latex, plain, degrees);
  };

  const runSeq = (sub: SeqSub, extra: Record<string, string>) => {
    setSt((s) => ({ ...s, seqSub: sub, seq: { ...s.seq, ...extra } }));
    const sol = safeSolve({ mode: "seq", sub, input: "", extra });
    setSeqRes(sol);
    if (sol.ok) {
      const item: HistoryItem = { action: "seq", seqSub: sub, extra, degrees: st.degrees, title: SEQ_SUBS.find((x) => x.value === sub)?.label ?? "" };
      setHistory((hs) => [item, ...hs.filter((h) => JSON.stringify([h.seqSub, h.extra]) !== JSON.stringify([sub, extra]))].slice(0, 30));
    }
  };

  const restore = (h: HistoryItem) => {
    if (h.action === "seq" && h.seqSub) {
      setHistOpen(false);
      setFold("other");
      runSeq(h.seqSub, h.extra ?? {});
      return;
    }
    loadAndRun(h.latex ?? "", !!h.plain, h.action === "seq" ? undefined : h.action, h.degrees);
  };

  const setDegrees = (v: boolean) => setSt((s) => ({ ...s, degrees: v }));

  const done = live.status === "done" ? live : null;
  const stale = pending || liveFor !== st.latex;
  const an = live.status === "done" || live.status === "need" || live.status === "implicit" ? live.analysis : null;
  const graphExprs = done?.sol.graph?.length ? done.sol.graph : an?.graph ?? [];
  const openGraph = () => graphExprs.length && nav.go("graph", { exprs: graphExprs });

  const showMini =
    !!done &&
    (["equation", "function", "calculus"].includes(done.analysis.kind) || ["deriv", "int", "study", "lim", "defint"].includes(done.action)) &&
    !done.sol.numberLine;

  const copy = () => {
    if (!done) return toast.error("Эхлээд бодлогоо бичнэ үү");
    const text = done.sol.answer.join("\n");
    if (!navigator.clipboard) return toast.error("Хуулж чадсангүй");
    navigator.clipboard.writeText(text).then(
      () => toast.success("LaTeX хуулагдлаа"),
      () => toast.error("Хуулж чадсангүй"),
    );
  };
  const print = () => {
    if (!done) return toast.error("Эхлээд бодлогоо бичнэ үү");
    const style = document.createElement("style");
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    const cleanup = () => {
      style.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    setTimeout(cleanup, 60000);
  };

  /* ---------- Хариуны хэсэг ---------- */

  // Утсан дээр гар нээлттэй: Photomath шиг жижиг урьдчилсан карт (дарвал бүрэн бодолт)
  const compact = !desktop && kbOpen && !stepsOpen;
  const activeAction = done ? done.action : live.status === "need" ? live.action : null;
  const showGraphChip = graphExprs.length > 0 && !(done && showMini) && live.status !== "implicit";
  const chips = an && !stale && !compact && (an.actions.length > 1 || showGraphChip) && (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Үйлдэл">
      {an.actions.length > 1 &&
        an.actions.map((a) => (
          <Chip key={a} on={activeAction === a} onClick={() => runAction(a)} icon={ACTION_ICON[a]}>
            {a === an.primary && (a === "solve" || a === "calc") ? "Бодох" : ACTION_LABEL[a]}
          </Chip>
        ))}
      {showGraphChip && (
        <Chip onClick={openGraph} icon={ChartSpline}>
          Графикт харах
        </Chip>
      )}
    </div>
  );

  const needAct = live.status === "need" ? live.action : derivOpts && done?.action === "deriv" ? "deriv" : null;
  const runParams = (a: Action) => {
    const r = computeNow(st.latex, { action: a });
    remember(r, st.latex, st.plain, st.degrees);
  };
  const paramRow = needAct && !stale && (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-3">
      {needAct === "lim" && (
        <>
          <ParamField tex="x \to" value={params.to} onChange={(v) => setParams((p) => ({ ...p, to: v }))} onEnter={() => runParams("lim")} hint="0, inf" />
          {(["inf", "-inf"] as const).map((v) => (
            <Button key={v} variant="outline" size="sm" className="min-h-11" onClick={() => setParams((p) => ({ ...p, to: v }))} aria-label={v === "inf" ? "нэмэх хязгааргүй" : "хасах хязгааргүй"}>
              <MathText>{v === "inf" ? "$+\\infty$" : "$-\\infty$"}</MathText>
            </Button>
          ))}
        </>
      )}
      {needAct === "defint" && (
        <>
          <ParamField tex="a" value={params.a} onChange={(v) => setParams((p) => ({ ...p, a: v }))} onEnter={() => runParams("defint")} hint="доод" width="w-20" />
          <ParamField tex="b" value={params.b} onChange={(v) => setParams((p) => ({ ...p, b: v }))} onEnter={() => runParams("defint")} hint="дээд" width="w-20" />
        </>
      )}
      {needAct === "deriv" && (
        <>
          <ParamField tex="n" value={params.order} onChange={(v) => setParams((p) => ({ ...p, order: v }))} onEnter={() => runParams("deriv")} hint="эрэмбэ" width="w-16" />
          <ParamField tex="x_0" value={params.at} onChange={(v) => setParams((p) => ({ ...p, at: v }))} onEnter={() => runParams("deriv")} hint="цэг" width="w-24" />
        </>
      )}
      <Button size="sm" className="min-h-11" onClick={() => runParams(needAct)}>
        <Play aria-hidden />
        {ACTION_LABEL[needAct]}
      </Button>
    </div>
  );

  let body: ReactNode = null;
  if (live.status === "empty" && !pending) {
    body = (
      <div className="hidden lg:block">
        <EmptyState title="Бодлогоо бичнэ үү" hint="Бичих зуур хариу автоматаар гарна" />
      </div>
    );
  } else if (pending && (!done || liveFor === "")) {
    body = <Dots />;
  } else if (live.status === "error" && !stale) {
    body = (
      <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm" role="status">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-ink">Оролтыг шалгана уу</p>
          <MathText className="block text-ink-dim">{live.message}</MathText>
        </div>
      </div>
    );
  } else if (live.status === "implicit" && !stale) {
    body = (
      <article className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <p className="text-xs font-semibold text-ink-dim">Муруй</p>
        <p className="text-sm text-ink-dim">
          <MathText>{`$y$-ээр нэг утгатай илэрхийлэгдэхгүй тул график дээр харна`}</MathText>
        </p>
        <MiniGraph exprs={live.analysis.graph} onOpen={openGraph} />
        <Button onClick={openGraph} className="min-h-11 w-full">
          <ChartSpline aria-hidden />
          График дээр харах
        </Button>
      </article>
    );
  } else if (done) {
    body = (
      <>
        {pending && <Dots />}
        <ResultView
          key={liveFor + done.action}
          sol={done.sol}
          stale={stale}
          graphExprs={showMini || (done.analysis.kind === "function" && graphExprs.length) ? graphExprs : undefined}
          onOpenGraph={openGraph}
          stepsOpen={stepsOpen}
          onSteps={(o) => (o ? openSteps() : setStepsOpen(false))}
          compact={compact}
          headline={done.action === "study" && done.sol.problem ? (/y/.test(liveFor) ? done.sol.problem.replace(/^f\(x\)\s*=/, "y =") : done.sol.problem) : undefined}
        />
        {done.action === "deriv" && !derivOpts && !stale && !compact && (
          <button type="button" onClick={() => setDerivOpts(true)} className="min-h-10 rounded-lg px-2 text-sm font-medium text-brand hover:bg-brand-bright/5">
            Эрэмбэ, цэг дээрх утга
          </button>
        )}
      </>
    );
  } else if (pending) {
    body = <Dots />;
  }

  /* ---------- Түүх ---------- */
  const historyList = (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-sm font-semibold text-ink">Түүх</p>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setHistory([])} aria-label="Түүхийг цэвэрлэх">
              <Trash2 aria-hidden />
              Цэвэрлэх
            </Button>
          )}
          <button type="button" onClick={() => setHistOpen(false)} aria-label="Түүхийг хаах" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim hover:bg-ink/5 hover:text-ink">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
      {history.length === 0 ? (
        <p className="flex items-center gap-2 px-1 pb-2 text-sm text-ink-dim">
          <History className="h-4 w-4" aria-hidden />
          Бодсон бодлого энд хадгалагдана
        </p>
      ) : (
        <ul className="space-y-0.5">
          {history.map((h, i) => (
            <li key={i}>
              <button type="button" onClick={() => restore(h)} className="flex min-h-11 w-full min-w-0 flex-col items-start rounded-xl px-2 py-1.5 text-left hover:bg-bg">
                <span className="text-xs text-ink-dim">{h.title}</span>
                <span className="max-w-full overflow-x-auto text-sm text-ink">
                  {h.action === "seq" && h.seqSub ? (
                    <MathText>{seqLabel(h.seqSub, h.extra ?? {})}</MathText>
                  ) : h.plain ? (
                    <code>{h.latex}</code>
                  ) : (
                    <MathText>{`$${(h.latex ?? "").replace(/;/g, ",\\ ")}$`}</MathText>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
      {/* ---------- Оруулга + гар ---------- */}
      <section aria-label="Бодлого оруулах" className="order-1 min-w-0 space-y-3 lg:col-start-1 lg:row-start-1">
        <div className="rounded-2xl border border-line bg-surface px-3 py-2 transition-colors duration-[var(--dur-micro)] focus-within:border-brand-bright">
          <div className="flex items-center gap-1">
            <MathInput
              ref={input}
              value={st.latex}
              onChange={setLatex}
              onEnter={openSteps}
              onFocus={() => {
                setKbOpen(true);
                if (!isDesktop()) setStepsOpen(false);
              }}
              placeholder="Бодлогоо бичнэ үү"
              ariaLabel="Бодлого"
              size={28}
              className="flex-1 overflow-x-auto"
            />
            {st.latex.trim() && (
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => input.current?.clear()}
                aria-label="Цэвэрлэх"
                title="Цэвэрлэх"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-dim hover:bg-ink/5 hover:text-ink"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => setKbOpen((v) => !v)}
              aria-pressed={kbOpen}
              aria-label={kbOpen ? "Гарыг нуух" : "Гар гаргах"}
              title={kbOpen ? "Гарыг нуух" : "Гар гаргах"}
              className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-ink/5 lg:hidden", kbOpen ? "text-brand" : "text-ink-dim")}
            >
              <Keyboard className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Утсан дээр доор бэхлэгдсэн, компьютер дээр оруулгын доор */}
        <div
          ref={kbRef}
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)]",
            "lg:static lg:z-auto lg:rounded-2xl lg:border lg:p-2 lg:shadow-none",
            !kbOpen && "max-lg:hidden",
          )}
        >
          {histOpen && <div className="mx-auto mb-1.5 max-h-[38vh] max-w-xl overflow-y-auto border-b border-line px-2 pb-1.5 lg:max-h-80">{historyList}</div>}
          <div className="mx-auto max-w-xl lg:max-w-none">
            <MathKeyboard
              field={input}
              onEnter={openSteps}
              onHistory={() => setHistOpen((v) => !v)}
              historyActive={histOpen}
              degrees={st.degrees}
              onDegrees={setDegrees}
            />
          </div>
        </div>
      </section>

      {/* ---------- Хариу ---------- */}
      <section ref={resultRef} aria-label="Хариу" className="order-2 min-w-0 scroll-mt-20 space-y-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {chips}
        {paramRow}
        {body}
      </section>

      {/* ---------- Бусад тооцоо, тохиргоо (жишээ хэсгийг эзэн хасуулсан 2026-10-27) ---------- */}
      <section aria-label="Нэмэлт" className="order-3 min-w-0 space-y-3 lg:col-start-1 lg:row-start-2">
        <Fold icon={ListOrdered} title="Бусад тооцоо: прогресс, магадлал" open={fold === "other"} onToggle={() => setFold((f) => (f === "other" ? null : "other"))}>
          <OtherCalcs
            sub={st.seqSub}
            values={st.seq}
            onSub={(s) => setSt((x) => ({ ...x, seqSub: s }))}
            onValue={(key, v) => setSt((x) => ({ ...x, seq: { ...x.seq, [key]: v } }))}
            onSolve={runSeq}
          />
          {seqRes && <SeqResult sol={seqRes} />}
        </Fold>

        <Fold icon={Settings2} title="Хуулах, хэвлэх, түүх" open={fold === "settings"} onToggle={() => setFold((f) => (f === "settings" ? null : "settings"))}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="min-h-11" onClick={copy} disabled={!done?.sol.answer.length}>
              <Copy aria-hidden />
              LaTeX хуулах
            </Button>
            <Button variant="outline" size="sm" className="min-h-11" onClick={print} disabled={!done}>
              <Printer aria-hidden />
              Хэвлэх
            </Button>
            <Button variant="outline" size="sm" className="min-h-11" onClick={() => { setHistOpen(true); setKbOpen(true); }}>
              <History aria-hidden />
              Түүх
            </Button>
          </div>
        </Fold>

        {/* Утсан дээр бэхлэгдсэн гарын ард агуулга нуугдахгүй */}
        <div aria-hidden className="lg:hidden" style={{ height: kbOpen ? kbH : 0 }} />
      </section>
    </div>
  );
}

/** «Бусад тооцоо»-ны хариу (алхам нэг дор) */
function SeqResult({ sol }: { sol: Solution }) {
  const [open, setOpen] = useState(false);
  return <ResultView sol={sol} stepsOpen={open} onSteps={setOpen} />;
}
