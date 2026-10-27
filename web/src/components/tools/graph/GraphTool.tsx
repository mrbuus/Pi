"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Home, Keyboard, Pause, Play, Plus, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import { fmt, niceTex, type Scope } from "../core/expr";
import { loadState, saveState } from "../core/export";
import { usePending } from "../core/hub";
import { MATH_FONT, SERIES_COLORS, SvgLabel } from "../core/svgText";
import ToolFrame, { NumberField, Panel, Toggle } from "../core/ToolFrame";
import MathInput, { type MathInputHandle } from "../core/MathInput";
import MathKeyboard from "../core/MathKeyboard";
import { isIncomplete, readLatex } from "../solve/latex";
import {
  analyze,
  clamp,
  contourPath,
  fnPath,
  niceStep,
  numLabel,
  pairTex,
  piLabel,
  piStep,
  pxOf,
  pyOf,
  regionPath,
  sampleGrid,
  specialPoints,
  tickValues,
  valueTable,
  viewFromRange,
  xOf,
  xRange,
  yRange,
  zoomAbout,
  areaPath,
  derivAt,
  simpson,
  type Special,
  type View,
} from "./graphMath";
import { placeLabels, shortNum, textWidth } from "./labels";

/* ============================================================================
 * График: олон функц y=f(x), x=c, далд тэгшитгэл, тэнцэтгэл бишийн муж, цэг,
 * параметрийн гулсуур (a, b, k…), онцгой цэгүүд, утгын хүснэгт.
 * ========================================================================== */

interface Line {
  id: number;
  /** Задлагчийн бичвэр (analyze-д) */
  src: string;
  /** Талбарт харагдах LaTeX (MathLive); хуучин хадгалалтад байхгүй бол src-ээс */
  latex?: string;
  /** Бүрэн бөгөөд буруу оруулгын мессеж (дутуу үед хоосон) */
  bad?: string;
  on: boolean;
  ci: number;
}

/** MathLive-ийн LaTeX → задлагчийн бичвэр. Дутуу (хоосон нүд) үед зураг зурахгүй, алдаа харуулахгүй */
function fromLatex(latex: string): { src: string; bad?: string } {
  if (!latex.trim()) return { src: "" };
  try {
    return { src: readLatex(latex).text };
  } catch (e) {
    return isIncomplete(e) ? { src: "" } : { src: "", bad: e instanceof Error ? e.message : "Оролтыг шалгана уу" };
  }
}
interface Saved {
  lines: Line[];
  cx: number;
  cy: number;
  sx: number;
  sy: number;
  lock: boolean;
  grid: boolean;
  special: boolean;
  pi: boolean;
  deg: boolean;
  table: boolean;
  tangent: boolean;
  area: boolean;
  areaA: number;
  areaB: number;
  params: Record<string, number>;
}

const DEFAULTS: Saved = {
  lines: [{ id: 1, src: "x^2-4x+3", on: true, ci: 0 }],
  cx: 0,
  cy: 0,
  sx: 50,
  sy: 50,
  lock: true,
  grid: true,
  special: true,
  pi: false,
  deg: false,
  table: false,
  tangent: false,
  area: false,
  areaA: 0,
  areaB: 2,
  params: {},
};



const KIND_LABEL: Record<Special["kind"], string> = {
  zero: "Тэг",
  yint: "y тэнхлэгтэй огтлолцол",
  max: "Дээд цэг",
  min: "Доод цэг",
  cross: "Огтлолцол",
};

const colorOf = (ci: number) => SERIES_COLORS[ci % SERIES_COLORS.length];
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function degStep(pxPerUnit: number, target = 70) {
  const steps = [1, 2, 5, 10, 15, 30, 45, 90, 180, 360, 720, 1440];
  return steps.find((s) => s * pxPerUnit >= target) ?? 1440;
}

const coordTex = (x: number, y: number) => pairTex(niceTex(x), niceTex(y));

/** Цэвэр хэлбэр олдвол «= 1/3», үгүй бол «≈ 0.33» (хэт олон оронгүй) */
function approxTex(v: number): string {
  const t = niceTex(v);
  return /^-?[\d]+\.\d{3,}/.test(t) || /\.\d{4}/.test(t) ? `\\approx ${Number(v.toFixed(2))}` : `=${t}`;
}

/** y = kx + b-ийн цэвэр LaTeX */
function lineTex(k: number, b: number): string {
  const kt = Math.abs(k) < 1e-9 ? "" : Math.abs(k - 1) < 1e-9 ? "x" : Math.abs(k + 1) < 1e-9 ? "-x" : `${niceTex(k)}x`;
  if (Math.abs(b) < 1e-9) return kt || "0";
  const bt = niceTex(Math.abs(b));
  if (!kt) return niceTex(b);
  return `${kt}${b < 0 ? "-" : "+"}${bt}`;
}

export default function GraphTool() {
  const [init] = useState(() => loadState<Saved>("graph", DEFAULTS));
  const [lines, setLines] = useState<Line[]>(init.lines.length ? init.lines : DEFAULTS.lines);
  const [vp, setVp] = useState({ cx: init.cx, cy: init.cy, sx: init.sx, sy: init.sy });
  const [lock, setLock] = useState(init.lock);
  const [grid, setGrid] = useState(init.grid);
  const [special, setSpecial] = useState(init.special);
  const [piAxis, setPiAxis] = useState(init.pi);
  const [deg, setDeg] = useState(init.deg);
  const [showTable, setShowTable] = useState(init.table);
  const [params, setParams] = useState<Record<string, number>>(init.params);
  const [tangent, setTangent] = useState(init.tangent);
  const [area, setArea] = useState(init.area);
  const [areaAB, setAreaAB] = useState({ a: init.areaA, b: init.areaB });
  const [size, setSize] = useState({ w: 640, h: 480 });
  const [trace, setTrace] = useState<number | null>(null);
  const [anim, setAnim] = useState<string | null>(null);
  const [tbl, setTbl] = useState({ start: -3, step: 1 });
  const wrap = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nextId = useRef(Math.max(...init.lines.map((l) => l.id), 1) + 1);
  // Нэг нийтлэг гар: идэвхтэй мөрийн талбар руу бичнэ
  const handles = useRef(new Map<number, MathInputHandle | null>());
  const activeField = useRef<MathInputHandle | null>(null);
  const [kbOpen, setKbOpen] = useState(false);
  const clipId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const view: View = useMemo(() => ({ ...vp, w: size.w, h: size.h }), [vp, size]);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  });
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  });

  /* ---------- Хэмжээ ---------- */
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 20 && r.height > 20) setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- Хадгалах ---------- */
  useEffect(() => {
    const t = setTimeout(
      () => saveState("graph", { lines, ...vp, lock, grid, special, pi: piAxis, deg, table: showTable, tangent, area, areaA: areaAB.a, areaB: areaAB.b, params }),
      300,
    );
    return () => clearTimeout(t);
  }, [lines, vp, lock, grid, special, piAxis, deg, showTable, tangent, area, areaAB, params]);

  /* ---------- Бодогчоос ирсэн томьёо ---------- */
  usePending<{ exprs: string[] }>("graph", (p) => {
    const exprs = (p.exprs ?? []).filter((s) => s.trim());
    if (!exprs.length) return;
    setLines(exprs.map((src, i) => ({ id: nextId.current++, src, on: true, ci: i })));
  });

  /* ---------- Задлалт ---------- */
  const items = useMemo(() => lines.map((l) => analyze(l.src, deg)), [lines, deg]);
  const paramNames = useMemo(() => {
    const s = new Set<string>();
    items.forEach((it, i) => {
      if (!lines[i].on) return;
      if ("params" in it) it.params.forEach((p) => s.add(p));
    });
    return [...s].sort();
  }, [items, lines]);

  const draws = useMemo(() => {
    const scope: Scope = { ...params };
    for (const n of paramNames) if (scope[n] === undefined) scope[n] = 1;
    return items.map((it, i) => {
      if (!lines[i].on) return null;
      scope.x = 0;
      scope.y = 0;
      switch (it.kind) {
        case "fn":
          return { kind: "fn" as const, d: fnPath(it.f, scope, view) };
        case "vline": {
          const c = it.c(scope);
          return Number.isFinite(c) ? { kind: "vline" as const, px: pxOf(view, c) } : null;
        }
        case "implicit":
          return { kind: "implicit" as const, d: contourPath(sampleGrid(it.F, scope, view)) };
        case "ineq": {
          const g = sampleGrid(it.F, scope, view);
          return { kind: "ineq" as const, fill: regionPath(g, it.op), edge: contourPath(g), strict: it.op === "<" || it.op === ">" };
        }
        case "point": {
          const x = it.px(scope);
          const y = it.py(scope);
          return Number.isFinite(x) && Number.isFinite(y) ? { kind: "point" as const, x, y } : null;
        }
        default:
          return null;
      }
    });
  }, [items, lines, params, paramNames, view]);

  const specials = useMemo(() => {
    if (!special) return [];
    const fl = items.flatMap((it, i) => {
      if (!lines[i].on || it.kind !== "fn") return [];
      const sc: Scope = { ...params };
      for (const n of paramNames) if (sc[n] === undefined) sc[n] = 1;
      return [{ idx: i, f: it.f, scope: sc }];
    });
    if (!fl.length) return [];
    const [a, b] = xRange(view);
    return specialPoints(fl, a, b);
  }, [special, items, lines, params, paramNames, view]);

  /* ---------- Хулганы/хурууны удирдлага ---------- */
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const setView = useCallback((v: View) => setVp({ cx: v.cx, cy: v.cy, sx: v.sx, sy: v.sy }), []);

  const localPt = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    ptrs.current.set(e.pointerId, localPt(e));
    moved.current = 0;
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = localPt(e);
    const prev = ptrs.current.get(e.pointerId);
    const v = viewRef.current;
    if (!prev) {
      if (e.pointerType === "mouse") setTrace(xOf(v, p.x));
      return;
    }
    if (ptrs.current.size === 1) {
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      moved.current += Math.abs(dx) + Math.abs(dy);
      ptrs.current.set(e.pointerId, p);
      if (moved.current > 4) setView({ ...v, cx: v.cx - dx / v.sx, cy: v.cy + dy / v.sy });
    } else if (ptrs.current.size === 2) {
      const other = [...ptrs.current.entries()].find(([id]) => id !== e.pointerId)![1];
      const d0 = Math.hypot(prev.x - other.x, prev.y - other.y) || 1;
      const d1 = Math.hypot(p.x - other.x, p.y - other.y) || 1;
      const m0 = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 };
      const m1 = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
      ptrs.current.set(e.pointerId, p);
      moved.current += 10;
      let nv = zoomAbout(v, m0.x, m0.y, d1 / d0);
      nv = { ...nv, cx: nv.cx - (m1.x - m0.x) / nv.sx, cy: nv.cy + (m1.y - m0.y) / nv.sy };
      setView(nv);
    }
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = localPt(e);
    if (ptrs.current.size === 1 && moved.current <= 4) setTrace(xOf(viewRef.current, p.x));
    ptrs.current.delete(e.pointerId);
  };

  const lockRef = useRef(lock);
  useEffect(() => {
    lockRef.current = lock;
  });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const f = Math.exp(-clamp(e.deltaY, -200, 200) * 0.0015);
      const v = viewRef.current;
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      if (!lockRef.current && e.shiftKey) setView(zoomAbout(v, px, py, 1, f));
      else if (!lockRef.current && e.altKey) setView(zoomAbout(v, px, py, f, 1));
      else setView(zoomAbout(v, px, py, f));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setView]);

  const zoomBy = (f: number) => setView(zoomAbout(view, view.w / 2, view.h / 2, f));
  const reset = () => {
    setLock(true);
    setVp(deg ? { cx: 180, cy: 0, sx: Math.max(0.5, size.w / 540), sy: 50 } : { cx: 0, cy: 0, sx: 50, sy: 50 });
    if (deg) setLock(false);
  };

  /* ---------- Мөрүүд ---------- */
  const update = (id: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addLine = (src = "") =>
    setLines((ls) => {
      const used = new Set(ls.map((l) => l.ci));
      let ci = 0;
      while (used.has(ci) && ci < SERIES_COLORS.length) ci++;
      return [...ls, { id: nextId.current++, src, on: true, ci: ci % SERIES_COLORS.length }];
    });
  const remove = (id: number) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls.map((l) => ({ ...l, src: "" }))));

  /* ---------- Параметр хөдөлгөөн ---------- */
  useEffect(() => {
    if (!anim) return;
    let raf = 0;
    let last = performance.now();
    let dir = 1;
    const tick = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      let v = (paramsRef.current[anim] ?? 1) + dir * 2 * dt;
      if (v > 5) { v = 5; dir = -1; }
      if (v < -5) { v = -5; dir = 1; }
      setParams((p) => ({ ...p, [anim]: Math.round(v * 100) / 100 }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim]);

  /* ---------- Зураг ---------- */
  const [xa, xb] = xRange(view);
  const [ya, yb] = yRange(view);
  const xStep = piAxis ? piStep(view.sx) : deg ? degStep(view.sx) : niceStep(view.sx);
  const yStep = niceStep(view.sy, 60);
  const xTicks = tickValues(xa, xb, xStep);
  const yTicks = tickValues(ya, yb, yStep);
  const ox = pxOf(view, 0);
  const oy = pyOf(view, 0);
  const lblY = clamp(oy + 15, 15, view.h - 6);
  const lblX = clamp(ox - 6, 34, view.w - 4);
  const minor = (step: number, scale: number) => {
    const m = Math.round(step / Math.pow(10, Math.floor(Math.log10(step) + 1e-9)));
    const div = m === 2 ? 4 : 5;
    return step * scale >= 40 && !piAxis ? step / div : 0;
  };
  const gridPath = (ticksV: number[], vertical: boolean, major: number, scale: number) => {
    let d = "";
    const mn = minor(major, scale);
    const [lo, hi] = vertical ? [xa, xb] : [ya, yb];
    if (grid && mn) {
      for (const t of tickValues(lo, hi, mn)) {
        if (Math.abs(t / major - Math.round(t / major)) < 1e-6) continue;
        const p = vertical ? pxOf(view, t) : pyOf(view, t);
        d += vertical ? `M${p.toFixed(1)} 0V${view.h}` : `M0 ${p.toFixed(1)}H${view.w}`;
      }
    }
    void ticksV;
    return d;
  };
  const majorPath = (ts: number[], vertical: boolean) =>
    ts.map((t) => (vertical ? `M${pxOf(view, t).toFixed(1)} 0V${view.h}` : `M0 ${pyOf(view, t).toFixed(1)}H${view.w}`)).join("");

  const fnLines = lines.map((l, i) => ({ l, i, it: items[i] })).filter((o) => o.l.on && o.it.kind === "fn");

  const traceVals = useMemo(() => {
    if (trace === null) return [];
    const sc: Scope = { ...params };
    for (const n of paramNames) if (sc[n] === undefined) sc[n] = 1;
    return items.flatMap((it, i) => {
      if (!lines[i].on || it.kind !== "fn") return [];
      sc.x = trace;
      return [{ i, y: it.f(sc), ci: lines[i].ci }];
    });
  }, [trace, items, lines, params, paramNames]);

  /* ---------- Утгын хүснэгт ---------- */
  const tableRows = useMemo(() => {
    if (!showTable || !fnLines.length) return [];
    const first = fnLines[0].it;
    if (first.kind !== "fn") return [];
    const sc: Scope = { ...params };
    for (const n of paramNames) if (sc[n] === undefined) sc[n] = 1;
    return valueTable(first.f, sc, tbl.start, tbl.step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTable, items, lines, params, paramNames, tbl]);

  /* ---------- Шүргэгч ба талбай (эхний харагдаж буй функцээр) ---------- */
  const analysis = useMemo(() => {
    const first = fnLines[0];
    if (!first || first.it.kind !== "fn" || (!tangent && !area)) return null;
    const f = first.it.f;
    const sc: Scope = { ...params };
    for (const n of paramNames) if (sc[n] === undefined) sc[n] = 1;
    const out: {
      ci: number;
      idx: number;
      tan?: { x0: number; y0: number; k: number; b: number };
      area?: { a: number; b: number; value: number; d: string };
    } = { ci: first.l.ci, idx: first.i };
    if (tangent) {
      const x0 = trace ?? 1;
      sc.x = x0;
      const y0 = f(sc);
      const k = derivAt(f, { ...sc }, x0);
      if (Number.isFinite(y0) && Number.isFinite(k)) out.tan = { x0, y0, k, b: y0 - k * x0 };
    }
    if (area) {
      const value = simpson(f, { ...sc }, areaAB.a, areaAB.b);
      out.area = { a: areaAB.a, b: areaAB.b, value, d: areaPath(f, { ...sc }, view, areaAB.a, areaAB.b) };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tangent, area, areaAB, trace, items, lines, params, paramNames, view]);

  /* ---------- Харагдац ---------- */
  const setRange = (which: "xmin" | "xmax" | "ymin" | "ymax", v: number) => {
    const r = { xmin: xa, xmax: xb, ymin: ya, ymax: yb, [which]: v };
    if (r.xmax <= r.xmin || r.ymax <= r.ymin) return;
    setView(viewFromRange(r.xmin, r.xmax, r.ymin, r.ymax, view.w, view.h));
    setLock(false);
  };
  const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

  const toggleDeg = (on: boolean) => {
    setDeg(on);
    setPiAxis(false);
    if (on) {
      setLock(false);
      setVp({ cx: 180, cy: 0, sx: Math.max(0.5, size.w / 540), sy: 50 });
    } else {
      setLock(true);
      setVp({ cx: 0, cy: 0, sx: 50, sy: 50 });
    }
  };

  const traceX = trace;
  // Онцгой цэгийн шошгыг давхцалгүй байрлуулна: тэнхлэгийн шошго, бие биетэйгээ
  const LABEL = 12;
  const placed = useMemo(() => {
    if (!special) return [];
    const reqs = specials.map((s) => {
      const t = `(${shortNum(s.x)}; ${shortNum(s.y)})`;
      return { px: pxOf(view, s.x), py: pyOf(view, s.y), w: textWidth(t, LABEL) + 6, h: LABEL + 4, t };
    });
    // Утсан дээр цөөн шошго: ихэнх нь доорх жагсаалтад
    const max = view.w < 520 ? 4 : 10;
    // Нэг цэг хоёр төрөлтэй (жишээ нь оргил ба y-огтлол) бол шошго нэг л удаа
    const seenT = new Set<string>();
    const order = reqs
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.px > 0 && r.px < view.w && r.py > 0 && r.py < view.h)
      .filter(({ r }) => (seenT.has(r.t) ? false : (seenT.add(r.t), true)));
    const keep = order.slice(0, max);
    // x, y, O тэнхлэгийн нэрийн байрыг хориглоно
    const ax0 = pxOf(view, 0);
    const ay0 = pyOf(view, 0);
    const blocked = [
      { x: clamp(ax0, 16, view.w - 14) + 4, y: 2, w: 18, h: 22 },
      { x: view.w - 26, y: clamp(ay0, 14, view.h - 22) - 26, w: 24, h: 22 },
      { x: ax0 - 20, y: ay0 + 2, w: 18, h: 20 },
    ];
    const res = placeLabels(keep.map((o) => o.r), view, blocked);
    const out: ({ tx: number; ty: number; t: string } | null)[] = specials.map(() => null);
    keep.forEach((o, j) => {
      const p = res[j];
      if (p) out[o.i] = { tx: p.tx + 3, ty: p.ty, t: o.r.t };
    });
    return out;
  }, [special, specials, view]);

  return (
    <ToolFrame
      svgRef={svgRef}
      fileName="grafik"
      wide
      toolbar={
        <>
          <Button variant="ghost" size="icon" onClick={() => zoomBy(1.4)} aria-label="Томруулах">
            <ZoomIn className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => zoomBy(1 / 1.4)} aria-label="Жижгээрүүлэх">
            <ZoomOut className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" onClick={reset} aria-label="Анхны харагдац">
            <Home className="h-4 w-4" aria-hidden />
          </Button>
        </>
      }
      footer={
        <div className="min-h-12 px-3 py-2 text-sm" aria-live="polite">
          {traceX === null || !traceVals.length ? (
            <p className="text-ink-dim">Муруй дээр хулгана аваачих эсвэл хүрч утгыг харна</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <MathText>{`$x=${fmt(traceX, 3)}$`}</MathText>
              {traceVals.map((t) => (
                <span key={t.i} className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(t.ci) }} aria-hidden />
                  <MathText>{`$y_{${t.i + 1}}=${Number.isFinite(t.y) ? fmt(t.y, 3) : "\\text{тодорхойгүй}"}$`}</MathText>
                </span>
              ))}
            </div>
          )}
        </div>
      }
      controls={
        <>
          <Panel
            title="Тэгшитгэл"
            action={
              <Button variant="outline" size="sm" onClick={() => addLine()}>
                <Plus className="h-4 w-4" aria-hidden />
                Нэмэх
              </Button>
            }
          >
            <ul className="space-y-3">
              {lines.map((l, i) => {
                const it = items[i];
                return (
                  <li key={l.id} className="flex items-start gap-2">
                    <button
                      type="button"
                      aria-pressed={l.on}
                      aria-label={l.on ? "Муруйг нуух" : "Муруйг харуулах"}
                      onClick={() => update(l.id, { on: !l.on })}
                      className="grid h-11 w-11 shrink-0 place-items-center"
                    >
                      <span
                        className="block h-5 w-5 rounded-full border-2"
                        style={{ borderColor: colorOf(l.ci), background: l.on ? colorOf(l.ci) : "transparent" }}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "rounded-lg border bg-bg px-2 transition-colors duration-[var(--dur-micro)] focus-within:border-brand-bright",
                          l.bad || it.kind === "error" ? "border-error" : "border-line",
                        )}
                      >
                        <MathInput
                          ref={(h) => {
                            handles.current.set(l.id, h);
                          }}
                          value={l.latex ?? ("tex" in it ? it.tex : l.src)}
                          onChange={(latex, plain) => update(l.id, plain ? { latex, src: latex, bad: undefined } : { latex, ...fromLatex(latex), bad: fromLatex(latex).bad })}
                          onFocus={() => {
                            activeField.current = handles.current.get(l.id) ?? null;
                            setKbOpen(true);
                          }}
                          onEnter={() => setKbOpen(false)}
                          placeholder="y = x^2"
                          ariaLabel={`Тэгшитгэл ${i + 1}`}
                          size={20}
                          className="min-w-0 overflow-x-auto"
                        />
                      </div>
                      {(l.bad || it.kind === "error") && <p className="mt-1 text-xs text-error">{l.bad ?? (it.kind === "error" ? it.message : "")}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(l.id)} aria-label="Тэгшитгэлийг устгах">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => {
                if (!activeField.current) activeField.current = handles.current.get(lines[lines.length - 1].id) ?? null;
                setKbOpen((v) => !v);
              }}
              aria-pressed={kbOpen}
              className={cn(
                "mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium",
                kbOpen ? "text-brand" : "text-ink-dim hover:text-ink",
              )}
            >
              <Keyboard className="h-4 w-4" aria-hidden />
              {kbOpen ? "Гарыг нуух" : "Математик гар"}
            </button>
            {/* Утсан дээр доор бэхлэгдсэн, компьютер дээр тэгшитгэлийн доор (физик гараар ч бичнэ) */}
            <div
              className={cn(
                "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.25)]",
                "lg:static lg:z-auto lg:mt-2 lg:rounded-2xl lg:border lg:p-2 lg:shadow-none",
                !kbOpen && "hidden",
              )}
            >
              <div className="mx-auto max-w-xl lg:max-w-none">
                <MathKeyboard field={activeField} onEnter={() => setKbOpen(false)} degrees={deg} onDegrees={toggleDeg} />
              </div>
            </div>
            {/* Утсан дээр гар доорх агуулгыг хаахгүйн тулд зай */}
            {kbOpen && <div className="h-[22rem] lg:hidden" aria-hidden />}
          </Panel>

          {paramNames.length > 0 && (
            <Panel title="Параметр">
              <ul className="space-y-3">
                {paramNames.map((n) => {
                  const v = params[n] ?? 1;
                  const R = Math.max(10, Math.ceil(Math.abs(v) / 10) * 10);
                  return (
                    <li key={n}>
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-center text-sm">
                          <MathText>{`$${n}$`}</MathText>
                        </span>
                        <input
                          type="range"
                          min={-R}
                          max={R}
                          step={0.1}
                          value={v}
                          onChange={(e) => setParams((p) => ({ ...p, [n]: parseFloat(e.target.value) }))}
                          className="h-8 min-w-0 flex-1 accent-[var(--brand-bright)]"
                          aria-label={`Параметр ${n}`}
                        />
                        <input
                          inputMode="decimal"
                          value={String(r4(v))}
                          onChange={(e) => {
                            const x = parseFloat(e.target.value.replace(",", "."));
                            if (Number.isFinite(x)) setParams((p) => ({ ...p, [n]: x }));
                          }}
                          className="h-10 w-16 rounded-lg border border-line bg-bg px-2 text-right text-sm tabular-nums text-ink"
                          aria-label={`${n} утга`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={reducedMotion()}
                          onClick={() => setAnim((a) => (a === n ? null : n))}
                          aria-label={anim === n ? "Хөдөлгөөнийг зогсоох" : "Хөдөлгөөнт болгох"}
                        >
                          {anim === n ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          <Panel title="Шүргэгч ба талбай">
            {fnLines.length === 0 ? (
              <p className="text-sm text-ink-dim">Эхлээд y=f(x) хэлбэрийн функц нэм</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Toggle on={tangent} onChange={setTangent}>Шүргэгч</Toggle>
                  <Toggle on={area} onChange={setArea}>Интеграл, талбай</Toggle>
                </div>
                {tangent && analysis?.tan && (
                  <div className="space-y-1 text-sm">
                    <p className="text-ink-dim">Муруй дээр хүрч цэгээ сонгоно</p>
                    <MathText>{`$x_0=${niceTex(analysis.tan.x0)},\\quad k=f'(x_0)=${niceTex(analysis.tan.k)}$`}</MathText>
                    <div className="text-base">
                      <MathText>{`$y=${lineTex(analysis.tan.k, analysis.tan.b)}$`}</MathText>
                    </div>
                  </div>
                )}
                {area && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <NumberField label={<MathText>{"$a$"}</MathText>} value={areaAB.a} onChange={(v) => setAreaAB((s) => ({ ...s, a: v }))} min={-1e6} max={1e6} slider={false} />
                      <NumberField label={<MathText>{"$b$"}</MathText>} value={areaAB.b} onChange={(v) => setAreaAB((s) => ({ ...s, b: v }))} min={-1e6} max={1e6} slider={false} />
                    </div>
                    {analysis?.area && (
                      <div className="text-base">
                        {Number.isFinite(analysis.area.value) ? (
                          <MathText>{`$\\int_{${niceTex(analysis.area.a)}}^{${niceTex(analysis.area.b)}} f(x)\\,dx${approxTex(analysis.area.value)}$`}</MathText>
                        ) : (
                          <p className="text-sm text-ink-dim">Энэ завсарт функц тасралттай тул интеграл тодорхойлогдохгүй</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Panel>


          <Panel title="Харагдац">
            <div className="flex flex-wrap gap-1.5">
              <Toggle on={grid} onChange={setGrid}>Тор</Toggle>
              <Toggle on={special} onChange={setSpecial}>Онцгой цэг</Toggle>
              <Toggle
                on={lock}
                onChange={(v) => {
                  setLock(v);
                  if (v) setVp((p) => ({ ...p, sy: p.sx }));
                }}
              >
                1:1 масштаб
              </Toggle>
              <Toggle on={piAxis} onChange={(v) => { setPiAxis(v); if (v) setDeg(false); }}>
                Тэнхлэг <MathText>{"$\\pi$"}</MathText>-ээр
              </Toggle>
              <Toggle on={deg} onChange={toggleDeg}>Градус</Toggle>
              <Toggle on={showTable} onChange={setShowTable}>Утгын хүснэгт</Toggle>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <NumberField label={<MathText>{"$x_{\\min}$"}</MathText>} value={r4(xa)} onChange={(v) => setRange("xmin", v)} min={-1e6} max={1e6} slider={false} />
              <NumberField label={<MathText>{"$x_{\\max}$"}</MathText>} value={r4(xb)} onChange={(v) => setRange("xmax", v)} min={-1e6} max={1e6} slider={false} />
              <NumberField label={<MathText>{"$y_{\\min}$"}</MathText>} value={r4(ya)} onChange={(v) => setRange("ymin", v)} min={-1e6} max={1e6} slider={false} />
              <NumberField label={<MathText>{"$y_{\\max}$"}</MathText>} value={r4(yb)} onChange={(v) => setRange("ymax", v)} min={-1e6} max={1e6} slider={false} />
            </div>
          </Panel>

          {showTable && (
            <Panel title="Утгын хүснэгт">
              {fnLines.length === 0 ? (
                <p className="text-sm text-ink-dim">Эхлээд y=f(x) хэлбэрийн функц нэм</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField label="Эхлэх x" value={tbl.start} onChange={(v) => setTbl((t) => ({ ...t, start: v }))} min={-1e6} max={1e6} slider={false} />
                    <NumberField label="Алхам" value={tbl.step} onChange={(v) => setTbl((t) => ({ ...t, step: v || 1 }))} min={0.001} max={1e6} slider={false} />
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm tabular-nums">
                      <thead>
                        <tr className="text-ink-dim">
                          <th className="px-2 py-1 text-left font-medium"><MathText>{"$x$"}</MathText></th>
                          <th className="px-2 py-1 text-right font-medium"><MathText>{`$y_{${fnLines[0].i + 1}}$`}</MathText></th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((r) => (
                          <tr key={r.x} className="border-t border-line">
                            <td className="px-2 py-1">{fmt(r.x, 4)}</td>
                            <td className="px-2 py-1 text-right">{Number.isFinite(r.y) ? fmt(r.y, 4) : "тодорхойгүй"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Panel>
          )}

          {special && specials.length > 0 && (
            <Panel title="Онцгой цэгүүд">
              <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">
                {specials.map((s, k) => (
                  <li key={k} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 border-b border-line pb-1.5 last:border-0">
                    <span className="flex items-center gap-1.5 text-ink-dim">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorOf(lines[s.line].ci) }} aria-hidden />
                      {KIND_LABEL[s.kind]}
                      {s.kind === "cross" && s.other !== undefined && ` (${s.line + 1} ба ${s.other + 1})`}
                    </span>
                    <MathText>{`$${coordTex(s.x, s.y)}$`}</MathText>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      }
    >
      <div ref={wrap} className="absolute inset-0 touch-none select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${view.w} ${view.h}`}
          width={view.w}
          height={view.h}
          className="block h-full w-full cursor-crosshair touch-none"
          role="img"
          aria-label="Функцийн график"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setTrace(null);
          }}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={view.w} height={view.h} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            {grid && (
              <g fill="none">
                <path d={gridPath(xTicks, true, xStep, view.sx) + gridPath(yTicks, false, yStep, view.sy)} stroke="var(--line)" strokeWidth="0.5" opacity="0.7" />
                <path d={majorPath(xTicks, true) + majorPath(yTicks, false)} stroke="var(--line)" strokeWidth="1" />
              </g>
            )}
            {/* тэнхлэг */}
            <g stroke="var(--ink)" strokeWidth="1.4" fill="var(--ink)">
              {oy >= 0 && oy <= view.h && <path d={`M0 ${oy}H${view.w - 8}`} fill="none" />}
              {ox >= 0 && ox <= view.w && <path d={`M${ox} ${view.h}V8`} fill="none" />}
              {oy >= 0 && oy <= view.h && <path d={`M${view.w - 2} ${oy}l-9 -4v8z`} strokeWidth="0" />}
              {ox >= 0 && ox <= view.w && <path d={`M${ox} 2l-4 9h8z`} strokeWidth="0" />}
            </g>
            {/* тэнхлэгийн цэг, шошго */}
            <g stroke="var(--ink)" strokeWidth="1">
              {xTicks.map((t) => oy >= 0 && oy <= view.h && Math.abs(t) > xStep * 1e-6 && <path key={`xt${t}`} d={`M${pxOf(view, t).toFixed(1)} ${oy - 3}v6`} />)}
              {yTicks.map((t) => ox >= 0 && ox <= view.w && Math.abs(t) > yStep * 1e-6 && <path key={`yt${t}`} d={`M${ox - 3} ${pyOf(view, t).toFixed(1)}h6`} />)}
            </g>
            {xTicks.map((t) =>
              Math.abs(t) < xStep * 1e-6 ? null : (
                <text key={`xl${t}`} x={pxOf(view, t)} y={lblY} textAnchor="middle" fontFamily={MATH_FONT} fontSize="13" fill="var(--ink-dim)" stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">
                  {piAxis ? piLabel(t) : numLabel(t, xStep)}
                </text>
              ),
            )}
            {yTicks.map((t) =>
              Math.abs(t) < yStep * 1e-6 ? null : (
                <text key={`yl${t}`} x={lblX} y={pyOf(view, t) + 4} textAnchor="end" fontFamily={MATH_FONT} fontSize="13" fill="var(--ink-dim)" stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">
                  {numLabel(t, yStep)}
                </text>
              ),
            )}
            {ox >= 0 && ox <= view.w && oy >= 0 && oy <= view.h && <SvgLabel x={ox - 10} y={oy + 12} label="O" size={14} fill="var(--ink-dim)" />}
            <SvgLabel x={view.w - 14} y={clamp(oy, 14, view.h - 22) - 14} label="x" size={15} />
            <SvgLabel x={clamp(ox, 16, view.w - 14) + 12} y={14} label="y" size={15} />

            {/* муж, муруй, цэг */}
            {draws.map((dr, i) => {
              if (!dr) return null;
              const c = colorOf(lines[i].ci);
              switch (dr.kind) {
                case "fn":
                case "implicit":
                  return <path key={lines[i].id} d={dr.d} fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />;
                case "vline":
                  return <path key={lines[i].id} d={`M${dr.px} 0V${view.h}`} fill="none" stroke={c} strokeWidth="2.4" />;
                case "ineq":
                  return (
                    <g key={lines[i].id}>
                      <path d={dr.fill} fill={c} opacity="0.16" />
                      <path d={dr.edge} fill="none" stroke={c} strokeWidth="2.2" strokeDasharray={dr.strict ? "7 5" : undefined} strokeLinecap="round" />
                    </g>
                  );
                case "point":
                  return (
                    <g key={lines[i].id}>
                      <circle cx={pxOf(view, dr.x)} cy={pyOf(view, dr.y)} r="5.5" fill={c} stroke="var(--surface)" strokeWidth="1.5" />
                      <SvgLabel x={pxOf(view, dr.x) + 10} y={pyOf(view, dr.y) - 12} label={`(${shortNum(dr.x)}; ${shortNum(dr.y)})`} size={13} italic={false} textAnchor="start" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke" />
                    </g>
                  );
              }
            })}

            {/* интегралын талбай, шүргэгч */}
            {analysis?.area && Number.isFinite(analysis.area.value) && (
              <path d={analysis.area.d} fill={colorOf(analysis.ci)} opacity="0.18" stroke="none" />
            )}
            {analysis?.tan && (
              <g>
                <path
                  d={`M0 ${pyOf(view, analysis.tan.k * xOf(view, 0) + analysis.tan.b)}L${view.w} ${pyOf(view, analysis.tan.k * xOf(view, view.w) + analysis.tan.b)}`}
                  stroke="var(--ink)"
                  strokeWidth="1.6"
                  strokeDasharray="8 5"
                  fill="none"
                />
                <circle cx={pxOf(view, analysis.tan.x0)} cy={pyOf(view, analysis.tan.y0)} r="5" fill="var(--ink)" stroke="var(--surface)" strokeWidth="1.5" />
              </g>
            )}

            {/* онцгой цэгүүд */}
            {special &&
              specials.map((s, k) => {
                const px = pxOf(view, s.x);
                const py = pyOf(view, s.y);
                if (px < -10 || px > view.w + 10 || py < -10 || py > view.h + 10) return null;
                return (
                  <g key={k}>
                    <circle cx={px} cy={py} r="4.5" fill="var(--surface)" stroke={s.kind === "cross" ? "var(--ink)" : colorOf(lines[s.line].ci)} strokeWidth="2" />
                    {placed[k] && (
                      <text x={placed[k]!.tx} y={placed[k]!.ty} dominantBaseline="central" fontFamily={MATH_FONT} fontSize={LABEL} fill="var(--ink)" stroke="var(--surface)" strokeWidth="3" paintOrder="stroke">
                        {placed[k]!.t}
                      </text>
                    )}
                  </g>
                );
              })}

            {/* шалгах шугам (татахад орохгүй) */}
            {traceX !== null && (
              <g data-export-skip="1" pointerEvents="none">
                <path d={`M${pxOf(view, traceX)} 0V${view.h}`} stroke="var(--ink-dim)" strokeWidth="1" strokeDasharray="4 4" />
                {traceVals.map((t) =>
                  Number.isFinite(t.y) ? <circle key={t.i} cx={pxOf(view, traceX)} cy={pyOf(view, t.y)} r="5" fill={colorOf(t.ci)} stroke="var(--surface)" strokeWidth="2" /> : null,
                )}
              </g>
            )}
          </g>
        </svg>
      </div>
    </ToolFrame>
  );
}
