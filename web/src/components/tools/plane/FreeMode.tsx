"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import {
  ArrowUpRight, Check, Circle, Crosshair, Dot, Equal, Eraser, Grid3x3, Magnet, MousePointer2, MoveDiagonal, Pentagon,
  Radius, Redo2, Ruler, Scan, Slash, Split, SquareSplitHorizontal, Trash2, TriangleRight, Undo2, X, ZoomIn, ZoomOut,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import MathText from "@/components/MathText";
import InfoHint from "@/components/ui/InfoHint";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import ToolFrame, { Panel, Toggle } from "../core/ToolFrame";
import { loadState, saveState } from "../core/export";
import FigureSvg, { useMedia, useSize, type View } from "./FigureSvg";
import type { Prim } from "./figure";
import { type Pt, boxAdd, centroidOf, emptyBox, fitView, mid, norm, perp, sub } from "./geom";
import { dec, degLabel, lenLabel } from "./fmt";
import {
  type Hit, type Obj, type Res, hitTest, intersections, isDraggable, isPointObj, measures, nextId, nextName, projectParam,
  removeLast, removeWithDependents, resolve, snap, snapIntersection,
} from "./free";

/* ============================================================================
 * «Чөлөөт» горим: цэг тавих/чирэх, хэрчим, шулуун, тойрог, байгуулалт.
 * Pointer events (хулгана, хуруу), touch-action:none. Хэмжээс шууд шинэчлэгдэнэ.
 * ========================================================================== */

type Tool =
  | "move" | "point" | "segment" | "line" | "ray" | "circle" | "polygon" | "midpoint"
  | "perp" | "parallel" | "bisector" | "intersect" | "angle";

const TOOLS: { k: Tool; label: string; icon: LucideIcon }[] = [
  { k: "move", label: "Зөөх", icon: MousePointer2 },
  { k: "point", label: "Цэг", icon: Dot },
  { k: "segment", label: "Хэрчим", icon: Slash },
  { k: "line", label: "Шулуун", icon: MoveDiagonal },
  { k: "ray", label: "Цацраг", icon: ArrowUpRight },
  { k: "circle", label: "Тойрог", icon: Circle },
  { k: "polygon", label: "Олон өнцөгт", icon: Pentagon },
  { k: "midpoint", label: "Дунд цэг", icon: SquareSplitHorizontal },
  { k: "perp", label: "Перпендикуляр", icon: TriangleRight },
  { k: "parallel", label: "Параллель", icon: Equal },
  { k: "bisector", label: "Биссектрис", icon: Split },
  { k: "intersect", label: "Огтлолцол", icon: X },
  { k: "angle", label: "Өнцөг хэмжих", icon: Radius },
];

/** Хэрэгсэл бүрийн дараагийн алхмын зөвлөмж */
function hintFor(tool: Tool, n: number, hasLine: boolean): string {
  switch (tool) {
    case "move": return "Цэгийг чирч зөөнө, хоосон газрыг чирвэл зураг гүйнэ, цэг дээр дарвал нэрийг нь солино";
    case "point": return "Цэг тавих газраа дарна уу, шугам дээр дарвал наалдана";
    case "segment": case "line": case "ray": return n === 0 ? "Эхний цэгээ сонгоно уу" : "Хоёр дахь цэгээ сонгоно уу";
    case "circle": return n === 0 ? "Тойргийн төвийг сонгоно уу" : "Тойрог дайрах цэгийг сонгоно уу";
    case "polygon": return n < 3 ? `Оройгоо дараалан сонгоно уу (${n} сонгосон)` : "Эхний орой дээр дарж эсвэл «Дуусгах» товчоор битүүлнэ";
    case "midpoint": return n === 0 ? "Хоёр цэг эсвэл нэг хэрчим сонгоно уу" : "Хоёр дахь цэгээ сонгоно уу";
    case "perp": case "parallel": return hasLine ? "Дайрах цэгээ сонгоно уу" : n ? "Шулуун эсвэл хэрчмээ сонгоно уу" : "Шулуун (хэрчим) ба цэгээ сонгоно уу";
    case "bisector": case "angle": return ["Өнцгийн нэг талын цэгийг сонгоно уу", "Өнцгийн оройг сонгоно уу", "Нөгөө талын цэгийг сонгоно уу"][Math.min(n, 2)];
    case "intersect": return n === 0 ? "Огтлолцох эхний шугам, тойргийг сонгоно уу" : "Хоёр дахь шугам, тойргийг сонгоно уу";
  }
}

interface Saved {
  objs: Obj[];
  grid: boolean;
  snapOn: boolean;
  showMeasures: boolean;
  unit: "" | "см";
  view: { cx: number; cy: number; s: number };
}
const DEFAULT_SAVED: Saved = { objs: [], grid: true, snapOn: true, showMeasures: true, unit: "", view: { cx: 0, cy: 0, s: 40 } };

interface Hist {
  objs: Obj[];
  past: Obj[][];
  future: Obj[][];
}

const LINE_T = new Set(["segment", "line", "ray", "perp", "parallel", "bisector"]);

export default function FreeMode({ modeSwitch }: { modeSwitch: ReactNode }) {
  const [saved] = useState<Saved>(() => {
    const s = loadState<Saved>("plane-free", DEFAULT_SAVED);
    return { ...DEFAULT_SAVED, ...s, objs: Array.isArray(s.objs) ? s.objs : [] };
  });
  const [hist, setHist] = useState<Hist>({ objs: saved.objs, past: [], future: [] });
  const [tool, setTool] = useState<Tool>("point");
  const [grid, setGrid] = useState(saved.grid);
  const [snapOn, setSnapOn] = useState(saved.snapOn);
  const [showMeasures, setShowMeasures] = useState(saved.showMeasures);
  const [unit, setUnit] = useState<"" | "см">(saved.unit);
  const [cam, setCam] = useState(saved.view);
  const [pending, setPending] = useState<number[]>([]);
  const [pendLine, setPendLine] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  const objs = hist.objs;
  useEffect(() => saveState("plane-free", { objs, grid, snapOn, showMeasures, unit, view: cam }), [objs, grid, snapOn, showMeasures, unit, cam]);

  const svgRef = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);
  const lg = useMedia("(min-width: 1024px)");
  const view: View = { s: cam.s, ox: w / 2 - cam.cx * cam.s, oy: h / 2 + cam.cy * cam.s };
  const res = useMemo(() => resolve(objs), [objs]);

  /* ---------- Түүх ---------- */
  const commit = (next: Obj[]) => setHist((hh) => ({ objs: next, past: [...hh.past.slice(-199), hh.objs], future: [] }));
  const resetPending = () => {
    setPending([]);
    setPendLine(null);
  };
  const undo = () => {
    resetPending();
    setSelected(null);
    setHist((hh) => (hh.past.length ? { objs: hh.past[hh.past.length - 1], past: hh.past.slice(0, -1), future: [hh.objs, ...hh.future] } : hh));
  };
  const redo = () => {
    resetPending();
    setSelected(null);
    setHist((hh) => (hh.future.length ? { objs: hh.future[0], past: [...hh.past, hh.objs], future: hh.future.slice(1) } : hh));
  };
  const deleteLast = () => {
    if (!objs.length) return;
    resetPending();
    setSelected(null);
    commit(removeLast(objs));
  };
  const clearAll = () => {
    if (!objs.length) return;
    resetPending();
    setSelected(null);
    commit([]);
    toast("Зураг цэвэрлэгдлээ", { action: { label: "Буцаах", onClick: undo } });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Escape") {
        resetPending();
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- Координат ---------- */
  const toScreen = (e: { clientX: number; clientY: number }): Pt => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
  };
  const toWorld = (e: { clientX: number; clientY: number }): Pt => {
    const q = toScreen(e);
    return { x: (q.x - view.ox) / view.s, y: (view.oy - q.y) / view.s };
  };
  const snapStep = cam.s >= 30 ? 0.5 : 1;
  const maybeSnap = (p: Pt) => (snapOn ? snap(p, snapStep) : p);
  const clampS = (s: number) => Math.min(400, Math.max(6, s));

  /* ---------- Хуруу, хулгана ----------
   * Товшилт (хөдлөөгүй) — хэрэгслийн үйлдэл, суллахад хийгдэнэ.
   * Чирэх — «Зөөх» үед цэгийг зөөнө, бусад үед зургийг гүйлгэнэ.
   * Хоёр хуруу — чимхэж томруулна; дугуй — курсорын орчимд томруулна. */
  type Gesture =
    | { kind: "tap"; start: Pt; m: Pt; hit: Hit | null; tolPt: number; cam0: typeof cam }
    | { kind: "pan"; start: Pt; cam0: typeof cam }
    | { kind: "drag"; id: number; start: Pt; moved: boolean }
    | { kind: "pinch"; d0: number; mid0: Pt; cam0: typeof cam };
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<Gesture | null>(null);

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    const mid0 = toWorld({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
    gesture.current = { kind: "pinch", d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), mid0, cam0: cam };
  };

  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      const g = gesture.current;
      if (g && g.kind === "drag" && !g.moved) setHist((hh) => ({ ...hh, past: hh.past.slice(0, -1) }));
      startPinch();
      return;
    }
    const m = toWorld(e);
    const touch = e.pointerType === "touch";
    const tolPt = (touch ? 22 : 14) / view.s;
    const tolLine = (touch ? 16 : 9) / view.s;
    const hit = hitTest(objs, res, m, tolPt, tolLine);
    const start = { x: e.clientX, y: e.clientY };
    if (tool === "move") {
      const o = hit && hit.kind === "pt" ? objs.find((x) => x.id === hit.id) : undefined;
      if (o) {
        setSelected(o.id);
        setNameDraft(isPointObj(o) ? o.name : "");
      } else setSelected(null);
      if (o && isDraggable(o)) {
        setHist((hh) => ({ ...hh, past: [...hh.past.slice(-199), hh.objs], future: [] }));
        gesture.current = { kind: "drag", id: o.id, start, moved: false };
        return;
      }
      gesture.current = { kind: "pan", start, cam0: cam };
      return;
    }
    gesture.current = { kind: "tap", start, m, hit, tolPt, cam0: cam };
  };

  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const rect = svgRef.current?.getBoundingClientRect();
    const k = rect ? w / rect.width : 1;
    if (g.kind === "pinch") {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const s = clampS((g.cam0.s * Math.hypot(a.x - b.x, a.y - b.y)) / g.d0);
      const q = toScreen({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      setCam({ s, cx: g.mid0.x - (q.x - w / 2) / s, cy: g.mid0.y + (q.y - h / 2) / s });
      return;
    }
    const dx = e.clientX - g.start.x, dy = e.clientY - g.start.y;
    if (g.kind === "tap") {
      if (Math.hypot(dx, dy) < 6) return;
      gesture.current = { kind: "pan", start: g.start, cam0: g.cam0 };
    }
    const g2 = gesture.current!;
    if (g2.kind === "pan") {
      setCam({ ...g2.cam0, cx: g2.cam0.cx - (dx * k) / g2.cam0.s, cy: g2.cam0.cy + (dy * k) / g2.cam0.s });
    } else if (g2.kind === "drag") {
      if (!g2.moved && Math.hypot(dx, dy) < 4) return;
      g2.moved = true;
      const id = g2.id;
      const wpt = toWorld(e);
      setHist((hh) => {
        const o = hh.objs.find((x) => x.id === id);
        if (!o) return hh;
        if (o.t === "point") {
          const q = maybeSnap(wpt);
          return { ...hh, objs: hh.objs.map((x) => (x.id === id ? { ...o, x: q.x, y: q.y } : x)) };
        }
        if (o.t === "on") {
          const host = resolve(hh.objs).get(o.obj);
          const u = host ? projectParam(host, wpt) : null;
          if (u === null) return hh;
          return { ...hh, objs: hh.objs.map((x) => (x.id === id ? { ...o, u } : x)) };
        }
        return hh;
      });
    }
  };

  const onUp = (e: RPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch") {
      // нэг хуруу үлдвэл юу ч хийхгүй — бүгдийг өргөхөд дуусна
      if (pointers.current.size === 0) gesture.current = null;
      return;
    }
    gesture.current = null;
    if (g.kind === "drag" && !g.moved) setHist((hh) => ({ ...hh, past: hh.past.slice(0, -1) }));
    if (g.kind === "tap" && e.type === "pointerup") handleTap(g.m, g.hit, g.tolPt);
  };

  // Дугуйгаар томруулах (passive биш — хуудас гүйхгүй)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const sx = ((e.clientX - r.left) / r.width) * w, sy = ((e.clientY - r.top) / r.height) * h;
      setCam((c) => {
        const ox = w / 2 - c.cx * c.s, oy = h / 2 + c.cy * c.s;
        const wx = (sx - ox) / c.s, wy = (oy - sy) / c.s;
        const s = clampS(c.s * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
        return { s, cx: wx - (sx - w / 2) / s, cy: wy + (sy - h / 2) / s };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [w, h]);

  /* ---------- Байгуулалт ---------- */
  /**
   * Цэг онсон бол түүнийг; хоёр шугамын огтлолцолд ойр бол огтлолцлын цэг;
   * шулуун/тойрог дээр бол түүн дээр гулсах цэг; үгүй бол чөлөөт цэг.
   */
  const pointAt = (list: Obj[], m: Pt, hit: Hit | null, tolPt: number): { list: Obj[]; id: number } => {
    if (hit && hit.kind === "pt") return { list, id: hit.id };
    const id = nextId(list);
    const name = nextName(list);
    const x = snapIntersection(list, res, m, tolPt);
    if (x) return { list: [...list, { id, t: "intersect", o1: x.o1, o2: x.o2, idx: x.idx, name }], id };
    if (hit && (hit.kind === "lin" || hit.kind === "circ")) {
      const host = res.get(hit.id);
      const u = host ? projectParam(host, m) : null;
      if (u !== null) return { list: [...list, { id, t: "on", obj: hit.id, u, name }], id };
    }
    const p = maybeSnap(m);
    return { list: [...list, { id, t: "point", x: p.x, y: p.y, name }], id };
  };

  const handleTap = (m: Pt, hit: Hit | null, tolPt: number) => {
    setSelected(null);
    if (tool === "point") {
      if (hit && hit.kind === "pt") return;
      commit(pointAt(objs, m, hit, tolPt).list);
      return;
    }
    if (tool === "intersect") {
      if (!hit || hit.kind === "pt" || hit.kind === "poly") return;
      if (!pending.length) {
        setPending([hit.id]);
        return;
      }
      const o1 = pending[0], o2 = hit.id;
      resetPending();
      if (o1 === o2) return;
      const r1 = res.get(o1), r2 = res.get(o2);
      if (!r1 || !r2) return;
      const pts = intersections(r1, r2);
      if (!pts.length) {
        toast("Эдгээр нь огтлолцохгүй байна");
        return;
      }
      let list = objs;
      const lineLike = (r: Res) => r.k === "lin";
      const count = lineLike(r1) && lineLike(r2) ? 1 : 2;
      for (let idx = 0; idx < count; idx++) {
        const test: Obj = { id: nextId(list), t: "intersect", o1, o2, idx, name: nextName(list) };
        const rr = resolve([...list, test]);
        if (!rr.has(test.id)) continue;
        // ижил цэг давхар үүсгэхгүй
        const p = (rr.get(test.id) as { p: Pt }).p;
        const dup = list.some((o) => isPointObj(o) && (() => { const q = res.get(o.id); return q && q.k === "pt" && Math.hypot(q.p.x - p.x, q.p.y - p.y) < 1e-6; })());
        if (!dup) list = [...list, test];
      }
      if (list !== objs) commit(list);
      else toast("Огтлолцлын цэг аль хэдийн байна");
      return;
    }
    if (tool === "perp" || tool === "parallel") {
      let line = pendLine;
      let pid: number | null = pending[0] ?? null;
      let list = objs;
      if (hit && hit.kind === "lin" && line === null) {
        line = hit.id;
      } else {
        const r = pointAt(list, m, hit && hit.kind !== "poly" ? hit : null, tolPt);
        list = r.list;
        pid = r.id;
      }
      if (line !== null && pid !== null) {
        commit([...list, { id: nextId(list), t: tool, line, p: pid }]);
        resetPending();
      } else {
        if (list !== objs) commit(list);
        setPendLine(line);
        setPending(pid !== null ? [pid] : []);
      }
      return;
    }
    if (tool === "midpoint" && !pending.length && hit && hit.kind === "lin") {
      const o = objs.find((x) => x.id === hit.id);
      if (o && o.t === "segment") {
        commit([...objs, { id: nextId(objs), t: "midpoint", a: o.a, b: o.b, name: nextName(objs) }]);
        return;
      }
    }
    // Цэгүүдээр байгуулах хэрэгслүүд
    const { list, id } = pointAt(objs, m, hit && hit.kind !== "poly" ? hit : null, tolPt);
    if (tool === "polygon" && pending.length >= 3 && id === pending[0]) {
      commit([...list, { id: nextId(list), t: "polygon", pts: pending }]);
      resetPending();
      return;
    }
    if (pending.includes(id) && tool !== "polygon") return;
    if (tool === "polygon" && pending.includes(id)) return;
    const pend = [...pending, id];
    const need = tool === "bisector" || tool === "angle" ? 3 : tool === "polygon" ? Infinity : 2;
    if (pend.length >= need) {
      const nid = nextId(list);
      let obj: Obj | null = null;
      if (tool === "segment" || tool === "line" || tool === "ray") obj = { id: nid, t: tool, a: pend[0], b: pend[1] };
      else if (tool === "circle") obj = { id: nid, t: "circle", c: pend[0], p: pend[1] };
      else if (tool === "midpoint") obj = { id: nid, t: "midpoint", a: pend[0], b: pend[1], name: nextName(list) };
      else if (tool === "bisector" || tool === "angle") obj = { id: nid, t: tool, a: pend[0], b: pend[1], c: pend[2] };
      commit(obj ? [...list, obj] : list);
      resetPending();
    } else {
      if (list !== objs) commit(list);
      setPending(pend);
    }
  };

  const finishPolygon = () => {
    if (tool === "polygon" && pending.length >= 3) commit([...objs, { id: nextId(objs), t: "polygon", pts: pending }]);
    resetPending();
  };

  const pickTool = (t: Tool) => {
    setTool(t);
    resetPending();
    setSelected(null);
  };

  /* ---------- Харагдац ---------- */
  const zoom = (k: number) => setCam((c) => ({ ...c, s: clampS(c.s * k) }));
  const fitAll = () => {
    let b = emptyBox();
    for (const r of res.values()) {
      if (r.k === "pt") b = boxAdd(b, r.p);
      else if (r.k === "circ") {
        b = boxAdd(b, { x: r.c.x - r.r, y: r.c.y - r.r });
        b = boxAdd(b, { x: r.c.x + r.r, y: r.c.y + r.r });
      }
    }
    if (!Number.isFinite(b.minX)) {
      setCam({ cx: 0, cy: 0, s: 40 });
      return;
    }
    const v = fitView(b, w, h, 60);
    const s = clampS(Math.min(160, v.s));
    setCam({ cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, s });
  };

  /* ---------- Зураг ---------- */
  const prims = useMemo(() => {
    const out: Prim[] = [];
    const ptsOut: Prim[] = [];
    const highlight = new Set<number>([...pending, ...(selected !== null ? [selected] : []), ...(pendLine !== null ? [pendLine] : [])]);
    const name = (id: number) => {
      const o = objs.find((x) => x.id === id);
      return o && isPointObj(o) ? o.name : "";
    };
    for (const o of objs) {
      const r = res.get(o.id);
      if (!r) continue;
      const hl = highlight.has(o.id);
      if (r.k === "poly") {
        out.unshift({ k: "poly", pts: r.pts, fill: true, tone: hl ? "brand" : "ink", w: 1.8 });
        if (showMeasures && o.t === "polygon") {
          const area = Math.abs(r.pts.reduce((s, p, i) => s + p.x * r.pts[(i + 1) % r.pts.length].y - r.pts[(i + 1) % r.pts.length].x * p.y, 0) / 2);
          out.push({ k: "label", p: centroidOf(r.pts), text: `S=${dec(area)}`, gap: 0, size: 14, tone: "brand", italic: false });
        }
      } else if (r.k === "lin") {
        const tone = hl ? "brand" : LINE_T.has(o.t) && o.t !== "segment" ? "dim" : "ink";
        if (r.kind === "segment") {
          out.push({ k: "seg", a: r.a, b: r.b, tone, w: 2.2 });
          if (showMeasures) {
            const n = perp(norm(sub(r.b, r.a)));
            out.push({ k: "label", p: mid(r.a, r.b), dir: n, gap: 6, text: lenLabel(Math.hypot(r.b.x - r.a.x, r.b.y - r.a.y), unit), size: 14, tone: "dim" });
          }
        } else out.push({ k: r.kind, p: r.a, d: sub(r.b, r.a), tone, w: 1.8 });
      } else if (r.k === "circ") {
        out.push({ k: "circle", c: r.c, r: r.r, tone: hl ? "brand" : "ink", w: 2 });
      } else if (r.k === "ang") {
        out.push({ k: "angle", v: r.b, a: r.a, b: r.c, text: degLabel(r.deg), right: Math.abs(r.deg - 90) < 1e-6, tone: "brand", r: 26 });
      } else if (r.k === "pt" && isPointObj(o)) {
        const free = o.t === "point", glide = o.t === "on";
        ptsOut.push({ k: "dot", p: r.p, tone: hl || glide ? "brand" : free ? "ink" : "dim", r: hl ? 6 : free || glide ? 4.4 : 3.8 });
        ptsOut.push({ k: "label", p: r.p, text: name(o.id), dir: { x: 0.75, y: 0.66 }, gap: 9 });
      }
    }
    return [...out, ...ptsOut];
  }, [objs, res, pending, pendLine, selected, showMeasures, unit]);

  const gridLayer = useMemo(() => {
    if (!grid) return null;
    let step = 1;
    while (step * view.s < 14) step *= 2;
    const x0 = Math.floor(-view.ox / view.s / step) * step, x1 = (w - view.ox) / view.s;
    const y0 = Math.floor((view.oy - h) / view.s / step) * step, y1 = view.oy / view.s;
    const lines: ReactNode[] = [];
    for (let x = x0; x <= x1; x += step) {
      const sx = view.ox + x * view.s;
      const major = Math.abs(Math.round(x / step) % 5) === 0;
      lines.push(<line key={`x${x}`} x1={sx} y1={0} x2={sx} y2={h} stroke="var(--line)" strokeWidth={major ? 1 : 0.5} />);
    }
    for (let y = y0; y <= y1; y += step) {
      const sy = view.oy - y * view.s;
      const major = Math.abs(Math.round(y / step) % 5) === 0;
      lines.push(<line key={`y${y}`} x1={0} y1={sy} x2={w} y2={sy} stroke="var(--line)" strokeWidth={major ? 1 : 0.5} />);
    }
    return <g aria-hidden>{lines}</g>;
  }, [grid, view.ox, view.oy, view.s, w, h]);

  const ms = useMemo(() => measures(objs, res, unit), [objs, res, unit]);
  const selObj = selected !== null ? objs.find((o) => o.id === selected) : undefined;

  const rename = () => {
    if (!selObj || !isPointObj(selObj)) return;
    const n = nameDraft.trim();
    if (!n || n === selObj.name) {
      setNameDraft(selObj.name);
      return;
    }
    if (n.length > 6) {
      toast.error("Нэр 6 тэмдэгтээс богино байна");
      return;
    }
    if (objs.some((o) => isPointObj(o) && o.id !== selObj.id && o.name === n)) {
      toast.error("Ийм нэртэй цэг аль хэдийн байна");
      return;
    }
    commit(objs.map((o) => (o.id === selObj.id && isPointObj(o) ? { ...o, name: n } : o)));
  };

  const iconBtn = (label: string, Icon: LucideIcon, onClick: () => void, disabled = false) => (
    <Button variant="ghost" size="icon" onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <Icon className="h-4 w-4" aria-hidden />
    </Button>
  );

  const toolbar = (
    <>
      {modeSwitch}
      <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden />
      {iconBtn("Буцаах", Undo2, undo, !hist.past.length)}
      {iconBtn("Дахин хийх", Redo2, redo, !hist.future.length)}
      {iconBtn("Томруулах", ZoomIn, () => zoom(1.25))}
      {iconBtn("Жижигрүүлэх", ZoomOut, () => zoom(0.8))}
      {iconBtn("Бүгдийг багтаах", Scan, fitAll)}
    </>
  );

  const controls = (
    <>
      <Panel title="Хэрэгсэл">
        <div role="radiogroup" aria-label="Хэрэгсэл" className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-3">
          {TOOLS.map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={tool === k}
              onClick={() => pickTool(k)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-xs font-medium transition-colors duration-[var(--dur-micro)]",
                tool === k ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line bg-surface text-ink-dim hover:text-ink",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="cyrillic-tight leading-tight">{label}</span>
            </button>
          ))}
        </div>
        {tool === "polygon" && pending.length >= 3 && (
          <Button variant="secondary" size="md" className="mt-3 w-full" onClick={finishPolygon}>
            <Check className="h-4 w-4" aria-hidden />
            Дуусгах
          </Button>
        )}
      </Panel>
      {selObj && isPointObj(selObj) && (
        <Panel title="Сонгосон цэг">
          <div className="flex items-center gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={rename}
              onKeyDown={(e) => e.key === "Enter" && rename()}
              className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm text-ink"
              aria-label="Цэгийн нэр"
            />
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                commit(removeWithDependents(objs, selObj.id));
                setSelected(null);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Устгах
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-ink-dim">
            Доод индекс
            <InfoHint label="Нэр бичих тайлбар">
              <MathText>{"«A_1» гэж бичвэл $A_1$, «\\alpha» гэж бичвэл $\\alpha$ болно"}</MathText>
            </InfoHint>
          </p>
        </Panel>
      )}
      <Panel title="Харагдац">
        <div className="flex flex-wrap gap-1.5">
          <Toggle on={grid} onChange={setGrid}>
            <span className="inline-flex items-center gap-1.5"><Grid3x3 className="h-4 w-4" aria-hidden />Тор</span>
          </Toggle>
          <Toggle on={snapOn} onChange={setSnapOn}>
            <span className="inline-flex items-center gap-1.5"><Magnet className="h-4 w-4" aria-hidden />Торонд наалдах</span>
          </Toggle>
          <Toggle on={showMeasures} onChange={setShowMeasures}>
            <span className="inline-flex items-center gap-1.5"><Ruler className="h-4 w-4" aria-hidden />Хэмжээс зурган дээр</span>
          </Toggle>
          <Toggle on={unit === "см"} onChange={(v) => setUnit(v ? "см" : "")}>
            см
          </Toggle>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="md" onClick={deleteLast} disabled={!objs.length}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Сүүлчийнхийг устгах
          </Button>
          <Button variant="danger" size="md" onClick={clearAll} disabled={!objs.length}>
            <Eraser className="h-4 w-4" aria-hidden />
            Бүгдийг цэвэрлэх
          </Button>
        </div>
      </Panel>
    </>
  );

  const footer = ms.length ? (
    <ul className="flex flex-wrap gap-2 px-3 py-3 sm:px-4">
      {ms.map((m, i) => (
        <li key={`${m.id}-${i}`} className="max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-xl border border-line bg-bg px-3 py-1.5 text-[15px] text-ink [scrollbar-width:none]">
          <MathText>{`$${m.tex}$`}</MathText>
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <ToolFrame svgRef={svgRef} fileName="pimath-zurag" controls={controls} toolbar={toolbar} footer={footer}>
      {/* утсан дээр зураг өргөн, өндөр; 1024px+ дээр хүрээ өөрөө дүүргэнэ */}
      <div aria-hidden className="h-[58vh] lg:hidden" />
      <div ref={box} className="absolute inset-0">
        <FigureSvg
          prims={prims}
          view={view}
          w={w}
          h={h}
          svgRef={svgRef}
          under={gridLayer}
          fontSize={lg ? 18 : 16}
          aria-label="Чөлөөт зураг"
          style={{ touchAction: "none", cursor: tool === "move" ? "grab" : "crosshair" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        <div className="pointer-events-none absolute inset-x-2 top-2 flex justify-center">
          <p className="flex max-w-full items-center gap-1.5 rounded-xl border border-line bg-surface/90 px-3 py-1.5 text-xs text-ink-dim">
            <Crosshair className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0">{hintFor(tool, pending.length, pendLine !== null)}</span>
          </p>
        </div>
        {!objs.length && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
            <p className="max-w-xs text-sm text-ink-dim">Хэрэгслээ сонгоод зураг дээр дарж эхэлнэ үү</p>
          </div>
        )}
      </div>
    </ToolFrame>
  );
}
