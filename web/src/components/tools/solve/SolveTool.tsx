"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChartSpline, ChevronDown, Copy, FunctionSquare, History, Infinity as InfinityIcon, Keyboard, ListOrdered, Play, Printer,
  Settings2, Sigma, SquareRadical, Trash2, X, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import MathText from "@/components/MathText";
import { EmptyState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import MathInput, { MathKeyboard, type MathInputHandle } from "../core/MathInput";
import { Segmented } from "../core/ToolFrame";
import { loadState, saveState } from "../core/export";
import { useToolsNav } from "../core/hub";
import { ACTION_LABEL, analyze, toRequest, type Action, type Analysis } from "./auto";
import { LATEX_EXAMPLES } from "./examples";
import { LatexError, readLatex } from "./latex";
import OtherCalcs, { seqLabel, SEQ_SUBS } from "./OtherCalcs";
import ResultView from "./ResultView";
import { solve, type SeqSub, type SolveRequest } from "./solve";
import type { Solution } from "./steps";

/* ============================================================================
 * БОДОГЧ (Photomath маяг) — өөрийн алгоритм, интернэтгүй, бүгд клиентэд.
 * Нэг оруулга → төрлийг автоматаар таньж (auto.ts) тохирох үйлдлээр бодно.
 * Бусад үйлдэл (Задлах, Уламжлал …) хариуны дээрх чипээр.
 * ========================================================================== */

type Act = Action | "seq";

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
  action: Act;
  extra?: Record<string, string>;
  seqSub?: SeqSub;
  degrees: boolean;
  title: string;
}
interface Result {
  sol: Solution;
  action: Act;
  latex: string;
  analysis?: Analysis;
}

const DEFAULT: Saved = { latex: "", plain: false, degrees: false, seqSub: "arith", seq: { a1: "", d: "", n: "", b1: "", q: "", k: "", m: "", p: "" } };

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

function safeSolve(req: SolveRequest): Solution {
  try {
    return solve(req);
  } catch {
    return { ok: false, title: "Бодож чадсангүй", answer: [], steps: [], notes: ["Энэ хэлбэрийг бодож чадсангүй"] };
  }
}

/** Оруулгыг уншиж төрлийг таних (алдаа бол монгол мессеж) */
function read(latex: string, plain: boolean): { analysis: Analysis | null; error: string | null } {
  if (!latex.trim()) return { analysis: null, error: null };
  try {
    const r = plain ? { text: latex, calc: null } : readLatex(latex);
    return { analysis: analyze(r.text, r.calc), error: null };
  } catch (e) {
    return { analysis: null, error: e instanceof LatexError ? e.message : "Бодлогыг ойлгосонгүй" };
  }
}

const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

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

export default function SolveTool() {
  const nav = useToolsNav();
  const [st, setSt] = useState<Saved>(() => {
    const s = loadState<Saved>("solve-v2", DEFAULT);
    return { ...DEFAULT, ...s, seq: { ...DEFAULT.seq, ...s.seq } };
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => loadState<HistoryItem[]>("solve-history-v2", []));
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [kbOpen, setKbOpen] = useState(true);
  const [fold, setFold] = useState<"settings" | "other" | null>(null);
  const [params, setParams] = useState<Record<string, string>>({ to: "", a: "", b: "", order: "1", at: "" });
  const [needParam, setNeedParam] = useState<Action | null>(null);
  const input = useRef<MathInputHandle>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => saveState("solve-v2", st), [st]);
  useEffect(() => saveState("solve-history-v2", history), [history]);

  const { analysis, error } = useMemo(() => read(st.latex, st.plain), [st.latex, st.plain]);

  const finish = useCallback((res: Result, item: HistoryItem | null) => {
    setResult(res);
    setBusy(false);
    if (item && res.sol.ok) {
      const key = (h: HistoryItem) => JSON.stringify([h.latex, h.action, h.extra, h.seqSub]);
      setHistory((hs) => [item, ...hs.filter((h) => key(h) !== key(item))].slice(0, 20));
    }
    if (!isDesktop()) {
      setKbOpen(false);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, []);

  /** Хүнд тооцоо UI-г гацаахгүй: дэлгэц шинэчлэгдсэний дараа бодно */
  const runReq = useCallback(
    (req: SolveRequest, res: Omit<Result, "sol">, item: HistoryItem | null) => {
      setBusy(true);
      setTimeout(() => finish({ ...res, sol: safeSolve(req) }, item), 16);
    },
    [finish],
  );

  const paramsFor = (action: Action, an: Analysis): Record<string, string> | null => {
    if (action === "lim") {
      const to = an.extra.to ?? params.to.trim();
      return to ? { to } : null;
    }
    if (action === "defint") {
      const a = an.extra.a ?? params.a.trim(), b = an.extra.b ?? params.b.trim();
      return a && b ? { a, b } : null;
    }
    if (action === "deriv") {
      const out: Record<string, string> = {};
      if (an.extra.order) out.order = an.extra.order;
      else if (params.order.trim() && params.order.trim() !== "1") out.order = params.order.trim();
      if (params.at.trim()) out.at = params.at.trim();
      return out;
    }
    return {};
  };

  const run = (action: Action, an: Analysis | null = analysis, latex = st.latex, plain = st.plain, degrees = st.degrees) => {
    setTried(true);
    if (!an) {
      if (!latex.trim()) toast.message("Бодлогоо бичнэ үү");
      return;
    }
    const extra = paramsFor(action, an);
    if (!extra) {
      setNeedParam(action);
      return;
    }
    setNeedParam(action === "deriv" && needParam === "deriv" ? "deriv" : null);
    const req = toRequest(an, action, extra, degrees);
    runReq(req, { action, latex, analysis: an }, { latex, plain, action, extra, degrees, title: ACTION_LABEL[action] });
  };

  const solvePrimary = () => analysis && run(analysis.primary);

  const setLatex = (latex: string, plain: boolean) => {
    setSt((s) => ({ ...s, latex, plain }));
    setTried(false);
    setNeedParam(null);
  };

  /** Жишээ, түүхээс: талбарт тавиад шууд бодно */
  const loadAndRun = (latex: string, plain = false, action?: Act, extra?: Record<string, string>, degrees = st.degrees) => {
    input.current?.setValue(latex);
    setSt((s) => ({ ...s, latex, plain, degrees }));
    const { analysis: an } = read(latex, plain);
    if (!an) {
      setTried(true);
      return;
    }
    if (extra) setParams((p) => ({ ...p, ...extra }));
    const act = action && action !== "seq" && an.actions.includes(action) ? action : an.primary;
    const ex = { ...(paramsFor(act, an) ?? {}), ...(extra ?? {}) };
    setTried(true);
    setNeedParam(null);
    runReq(toRequest(an, act, ex, degrees), { action: act, latex, analysis: an }, { latex, plain, action: act, extra: ex, degrees, title: ACTION_LABEL[act] });
  };

  const runSeq = (sub: SeqSub, extra: Record<string, string>) => {
    setSt((s) => ({ ...s, seqSub: sub, seq: { ...s.seq, ...extra } }));
    runReq({ mode: "seq", sub, input: "", extra }, { action: "seq", latex: "" }, { action: "seq", seqSub: sub, extra, degrees: st.degrees, title: SEQ_SUBS.find((x) => x.value === sub)?.label ?? "" });
  };

  const restore = (h: HistoryItem) => {
    if (h.action === "seq" && h.seqSub) {
      setFold("other");
      runSeq(h.seqSub, h.extra ?? {});
      return;
    }
    loadAndRun(h.latex ?? "", !!h.plain, h.action, h.extra, h.degrees);
  };

  const graphExprs = result?.sol.graph?.length ? result.sol.graph : analysis?.graph ?? [];
  const openGraph = () => graphExprs.length && nav.go("graph", { exprs: graphExprs });

  const copy = () => {
    if (!result) return toast.error("Эхлээд бодлогоо бодуулна уу");
    const text = result.sol.answer.join("\n");
    if (!navigator.clipboard) return toast.error("Хуулж чадсангүй");
    navigator.clipboard.writeText(text).then(
      () => toast.success("LaTeX хуулагдлаа"),
      () => toast.error("Хуулж чадсангүй"),
    );
  };
  const print = () => {
    if (!result) return toast.error("Эхлээд бодлогоо бодуулна уу");
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

  const stale = !!result && result.action !== "seq" && result.latex !== st.latex;
  const activeAction = result && !stale ? result.action : null;
  // Мини график: тэгшитгэл, функц, матанализын хариунд
  const showMini =
    !!result &&
    result.action !== "seq" &&
    !!result.analysis &&
    (["equation", "function", "calculus"].includes(result.analysis.kind) || ["deriv", "int", "study", "lim", "defint"].includes(result.action)) &&
    !result.sol.numberLine;

  const showGraphChip = graphExprs.length > 0 && !(result && !stale && showMini);
  const chips = analysis && (analysis.actions.length > 1 || showGraphChip) && (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Үйлдэл">
      {analysis.actions.length > 1 && analysis.actions.map((a) => (
        <Chip key={a} on={activeAction === a} onClick={() => run(a)} icon={ACTION_ICON[a]}>
          {a === analysis.primary && (a === "solve" || a === "calc") ? "Бодох" : ACTION_LABEL[a]}
        </Chip>
      ))}
      {showGraphChip && (
        <Chip onClick={openGraph} icon={ChartSpline}>
          Графикт харах
        </Chip>
      )}
    </div>
  );

  const paramRow = needParam && analysis && (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-3">
      {needParam === "lim" && (
        <>
          <ParamField tex="x \to" value={params.to} onChange={(v) => setParams((p) => ({ ...p, to: v }))} onEnter={() => run("lim")} hint="0, inf" />
          {(["inf", "-inf"] as const).map((v) => (
            <Button key={v} variant="outline" size="sm" className="min-h-11" onClick={() => setParams((p) => ({ ...p, to: v }))} aria-label={v === "inf" ? "нэмэх хязгааргүй" : "хасах хязгааргүй"}>
              <MathText>{v === "inf" ? "$+\\infty$" : "$-\\infty$"}</MathText>
            </Button>
          ))}
        </>
      )}
      {needParam === "defint" && (
        <>
          <ParamField tex="a" value={params.a} onChange={(v) => setParams((p) => ({ ...p, a: v }))} onEnter={() => run("defint")} hint="доод" width="w-20" />
          <ParamField tex="b" value={params.b} onChange={(v) => setParams((p) => ({ ...p, b: v }))} onEnter={() => run("defint")} hint="дээд" width="w-20" />
        </>
      )}
      {needParam === "deriv" && (
        <>
          <ParamField tex="n" value={params.order} onChange={(v) => setParams((p) => ({ ...p, order: v }))} onEnter={() => run("deriv")} hint="эрэмбэ" width="w-16" />
          <ParamField tex="x_0" value={params.at} onChange={(v) => setParams((p) => ({ ...p, at: v }))} onEnter={() => run("deriv")} hint="цэг" width="w-24" />
        </>
      )}
      <Button size="sm" className="min-h-11" onClick={() => run(needParam)}>
        <Play aria-hidden />
        {ACTION_LABEL[needParam]}
      </Button>
    </div>
  );

  const derivMore = activeAction === "deriv" && needParam !== "deriv" && (
    <button type="button" onClick={() => setNeedParam("deriv")} className="min-h-10 rounded-lg px-2 text-sm font-medium text-brand hover:bg-brand-bright/5">
      Эрэмбэ, цэг дээрх утга
    </button>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
      {/* ---------- Оруулга + гар ---------- */}
      <section aria-label="Бодлого оруулах" className="order-1 min-w-0 space-y-3 lg:col-start-1 lg:row-start-1">
        <div className={cn("rounded-2xl border bg-surface p-2 transition-colors duration-[var(--dur-micro)] focus-within:border-brand-bright sm:p-3", tried && error ? "border-error/60" : "border-line")}>
          <div className="flex items-center gap-1">
            <MathInput
              ref={input}
              value={st.latex}
              onChange={setLatex}
              onEnter={solvePrimary}
              onFocus={() => setKbOpen(true)}
              placeholder="Бодлогоо бичнэ үү"
              ariaLabel="Бодлого"
              className="flex-1 overflow-x-auto"
            />
            {st.latex.trim() && (
              <button type="button" onClick={() => input.current?.clear()} aria-label="Цэвэрлэх" title="Цэвэрлэх" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-ink/5 hover:text-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => setKbOpen((v) => !v)}
              aria-pressed={kbOpen}
              aria-label={kbOpen ? "Гарыг нуух" : "Гар гаргах"}
              title={kbOpen ? "Гарыг нуух" : "Гар гаргах"}
              className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-ink/5", kbOpen ? "text-brand" : "text-ink-dim")}
            >
              <Keyboard className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {tried && error && <p className="px-1 pb-1 text-sm text-error"><MathText>{error}</MathText></p>}
        </div>

        {kbOpen ? (
          <div className="rounded-2xl border border-line bg-surface p-2 sm:p-3">
            <MathKeyboard target={input} onSubmit={solvePrimary} submitLabel={analysis ? (analysis.primary === "solve" || analysis.primary === "calc" ? "Бодох" : ACTION_LABEL[analysis.primary]) : "Бодох"} />
          </div>
        ) : (
          <Button onClick={solvePrimary} className="min-h-12 w-full">
            <Play aria-hidden />
            {analysis && analysis.primary !== "solve" && analysis.primary !== "calc" ? ACTION_LABEL[analysis.primary] : "Бодох"}
          </Button>
        )}
      </section>

      {/* ---------- Хариу ---------- */}
      <section ref={resultRef} aria-label="Хариу" className="order-2 min-w-0 scroll-mt-20 space-y-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {chips}
        {paramRow}
        {busy ? (
          <div className="space-y-3 rounded-2xl border border-line bg-surface p-4" aria-busy>
            <div className="h-6 w-40 rounded-full skeleton" />
            <div className="h-10 w-2/3 rounded-lg skeleton" />
            <div className="h-4 w-1/2 rounded skeleton" />
          </div>
        ) : result ? (
          <>
            {stale && <p className="text-sm text-ink-dim">Бодлого өөрчлөгдсөн — дахин бодуулна уу</p>}
            <ResultView sol={result.sol} stale={stale} graphExprs={showMini ? result.sol.graph : undefined} onOpenGraph={openGraph} />
            {derivMore}
          </>
        ) : (
          <div className="hidden lg:block">
            <EmptyState title="Бодлогоо бичээд «Бодох» товчийг дарна уу" hint="Төрлийг нь автоматаар таньж бодно" />
          </div>
        )}
      </section>

      {/* ---------- Жишээ, бусад тооцоо, тохиргоо ---------- */}
      <section aria-label="Нэмэлт" className="order-3 min-w-0 space-y-3 lg:col-start-1 lg:row-start-2">
        <div>
          <h3 className="mb-2 px-1 text-xs font-semibold text-ink-dim">Жишээ</h3>
          <div className="flex flex-wrap gap-1.5">
            {LATEX_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => loadAndRun(ex)}
                className="min-h-10 max-w-full overflow-x-auto rounded-full border border-line bg-surface px-3 text-sm text-ink transition-colors duration-[var(--dur-micro)] hover:border-brand-bright/50 hover:bg-brand-bright/5"
              >
                <MathText>{`$${ex.replace(/;/g, ",\\ ")}$`}</MathText>
              </button>
            ))}
          </div>
        </div>

        <Fold icon={ListOrdered} title="Бусад тооцоо: прогресс, магадлал" open={fold === "other"} onToggle={() => setFold((f) => (f === "other" ? null : "other"))}>
          <OtherCalcs
            sub={st.seqSub}
            values={st.seq}
            onSub={(s) => setSt((x) => ({ ...x, seqSub: s }))}
            onValue={(k, v) => setSt((x) => ({ ...x, seq: { ...x.seq, [k]: v } }))}
            onSolve={runSeq}
          />
        </Fold>

        <Fold icon={Settings2} title="Тохиргоо, түүх" open={fold === "settings"} onToggle={() => setFold((f) => (f === "settings" ? null : "settings"))}>
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink">Өнцгийн нэгж</p>
            <Segmented
              label="Өнцгийн нэгж"
              value={st.degrees ? "deg" : "rad"}
              onChange={(v) => setSt((s) => ({ ...s, degrees: v === "deg" }))}
              options={[{ value: "rad", label: "Радиан" }, { value: "deg", label: "Градус" }]}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="min-h-11" onClick={copy} disabled={!result?.sol.answer.length}>
              <Copy aria-hidden />
              LaTeX хуулах
            </Button>
            <Button variant="outline" size="sm" className="min-h-11" onClick={print} disabled={!result}>
              <Printer aria-hidden />
              Хэвлэх
            </Button>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-ink">Түүх</p>
              {history.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setHistory([])} aria-label="Түүхийг цэвэрлэх">
                  <Trash2 aria-hidden />
                  Цэвэрлэх
                </Button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-ink-dim">
                <History className="h-4 w-4" aria-hidden />
                Бодсон бодлого энд хадгалагдана
              </p>
            ) : (
              <ul className="space-y-1">
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
        </Fold>
      </section>
    </div>
  );
}
