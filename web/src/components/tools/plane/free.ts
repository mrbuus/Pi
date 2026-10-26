/* ============================================================================
 * «Чөлөөт» горим — хөнгөн динамик геометр (цэвэр логик, React-гүй).
 * Объект бүр өмнөх объектуудаас л хамаарна (үүсгэсэн дарааллаар), тиймээс
 * нэг удаа дараалан тооцоолоход хангалттай. Чөлөөт цэгийг чирэхэд бүх
 * хамаарал, хэмжээс шууд шинэчлэгдэнэ.
 * ========================================================================== */

import {
  type Pt, add, angleAt, bisectorDir, circleCircle, dist, distToLine, distToSegment, lineCircle, lineLine, mid, norm,
  perimeter, perp, polygonArea, sub, toDeg,
} from "./geom.ts";
import { degVal, piVal, val, valTex } from "./fmt.ts";

export type Obj =
  | { id: number; t: "point"; x: number; y: number; name: string }
  | { id: number; t: "midpoint"; a: number; b: number; name: string }
  /** idx — хэд дэх огтлолцлын цэг (0 эсвэл 1) */
  | { id: number; t: "intersect"; o1: number; o2: number; idx: number; name: string }
  /** Шулуун/хэрчим/тойрог дээр гулсах цэг: u — шугамд параметр (a→b), тойрогт өнцөг (рад) */
  | { id: number; t: "on"; obj: number; u: number; name: string }
  | { id: number; t: "segment"; a: number; b: number }
  | { id: number; t: "line"; a: number; b: number }
  | { id: number; t: "ray"; a: number; b: number }
  | { id: number; t: "circle"; c: number; p: number }
  | { id: number; t: "polygon"; pts: number[] }
  /** p цэгээр дайрсан, line-д перпендикуляр/параллель шулуун */
  | { id: number; t: "perp"; line: number; p: number }
  | { id: number; t: "parallel"; line: number; p: number }
  /** ∠ABC-ийн биссектрис (B-ээс гарсан цацраг) */
  | { id: number; t: "bisector"; a: number; b: number; c: number }
  /** ∠ABC-ийн хэмжээ */
  | { id: number; t: "angle"; a: number; b: number; c: number };

export type ObjType = Obj["t"];

export type Res =
  | { k: "pt"; p: Pt }
  /** kind: segment — a..b, ray — a-аас b тийш, line — төгсгөлгүй */
  | { k: "lin"; kind: "segment" | "ray" | "line"; a: Pt; b: Pt }
  | { k: "circ"; c: Pt; r: number }
  | { k: "poly"; pts: Pt[] }
  | { k: "ang"; a: Pt; b: Pt; c: Pt; deg: number };

export const isPointObj = (o: Obj): o is Extract<Obj, { name: string }> => o.t === "point" || o.t === "midpoint" || o.t === "intersect" || o.t === "on";

/** Чирж болох цэг (чөлөөт эсвэл шугам дээр гулсах) */
export const isDraggable = (o: Obj) => o.t === "point" || o.t === "on";

/** Шугам/тойрог дээрх u параметрт харгалзах цэг (хэрчим, цацрагийн хязгаартай) */
export function pointOn(r: Res, u: number): Pt | null {
  if (r.k === "lin") {
    const t = r.kind === "segment" ? Math.min(1, Math.max(0, u)) : r.kind === "ray" ? Math.max(0, u) : u;
    return { x: r.a.x + (r.b.x - r.a.x) * t, y: r.a.y + (r.b.y - r.a.y) * t };
  }
  if (r.k === "circ") return { x: r.c.x + r.r * Math.cos(u), y: r.c.y + r.r * Math.sin(u) };
  return null;
}

/** p цэгийг шугам/тойрог руу буулгасан параметр (pointOn-ийн урвуу) */
export function projectParam(r: Res, p: Pt): number | null {
  if (r.k === "lin") {
    const d = sub(r.b, r.a);
    const l2 = d.x * d.x + d.y * d.y;
    if (l2 < 1e-18) return null;
    const t = ((p.x - r.a.x) * d.x + (p.y - r.a.y) * d.y) / l2;
    return r.kind === "segment" ? Math.min(1, Math.max(0, t)) : r.kind === "ray" ? Math.max(0, t) : t;
  }
  if (r.k === "circ") return Math.atan2(p.y - r.c.y, p.x - r.c.x);
  return null;
}

/** Шулуун/хэрчим/цацраг ба тойргийн огтлолцлууд (хэрчмийн гадна гарвал хасна) */
export function intersections(r1: Res, r2: Res): Pt[] {
  const inRange = (r: Res, t: number) => r.k !== "lin" || r.kind === "line" || (r.kind === "ray" ? t >= -1e-9 : t >= -1e-9 && t <= 1 + 1e-9);
  if (r1.k === "lin" && r2.k === "lin") {
    const x = lineLine(r1.a, sub(r1.b, r1.a), r2.a, sub(r2.b, r2.a));
    if (!x || !inRange(r1, x.t) || !inRange(r2, x.u)) return [];
    return [x.p];
  }
  if (r1.k === "circ" && r2.k === "lin") return intersections(r2, r1);
  if (r1.k === "lin" && r2.k === "circ") {
    return lineCircle(r1.a, sub(r1.b, r1.a), r2.c, r2.r).filter((h) => inRange(r1, h.t)).map((h) => h.p);
  }
  if (r1.k === "circ" && r2.k === "circ") return circleCircle(r1.c, r1.r, r2.c, r2.r);
  return [];
}

/**
 * Огтлолцлын idx-р цэг. Шулуун-тойрогт параметрийн дарааллаар,
 * тойрог-тойрогт тогтвортой дарааллаар (хэрчмийн гадна гарвал хасагдсан ч
 * дугаарлалт гулсахгүйн тулд хязгаарлалтгүй жагсаалтаар сонгоно).
 */
export function intersectionAt(r1: Res, r2: Res, idx: number): Pt | null {
  const asLine = (r: Res): Res => (r.k === "lin" ? { ...r, kind: "line" } : r);
  const all = intersections(asLine(r1), asLine(r2));
  const p = all[idx];
  if (!p) return null;
  // хэрчим/цацраг дээр байгаа эсэхийг шалгана
  const ok = intersections(r1, r2).some((q) => dist(q, p) < 1e-7);
  return ok ? p : null;
}

/** Бүх объектыг тооцоолно. Тодорхойгүй болсон (параллель г.м.) объект Map-д байхгүй */
export function resolve(objs: Obj[]): Map<number, Res> {
  const m = new Map<number, Res>();
  const P = (id: number): Pt | null => {
    const r = m.get(id);
    return r && r.k === "pt" ? r.p : null;
  };
  for (const o of objs) {
    let r: Res | null = null;
    switch (o.t) {
      case "point":
        r = { k: "pt", p: { x: o.x, y: o.y } };
        break;
      case "midpoint": {
        const a = P(o.a), b = P(o.b);
        if (a && b) r = { k: "pt", p: mid(a, b) };
        break;
      }
      case "intersect": {
        const r1 = m.get(o.o1), r2 = m.get(o.o2);
        if (r1 && r2) {
          const p = intersectionAt(r1, r2, o.idx);
          if (p) r = { k: "pt", p };
        }
        break;
      }
      case "on": {
        const host = m.get(o.obj);
        const p = host ? pointOn(host, o.u) : null;
        if (p) r = { k: "pt", p };
        break;
      }
      case "segment":
      case "line":
      case "ray": {
        const a = P(o.a), b = P(o.b);
        if (a && b && dist(a, b) > 1e-9) r = { k: "lin", kind: o.t, a, b };
        break;
      }
      case "circle": {
        const c = P(o.c), p = P(o.p);
        if (c && p) r = { k: "circ", c, r: dist(c, p) };
        break;
      }
      case "polygon": {
        const pts = o.pts.map(P);
        if (pts.every((x): x is Pt => !!x)) r = { k: "poly", pts };
        break;
      }
      case "perp":
      case "parallel": {
        const l = m.get(o.line), p = P(o.p);
        if (l && l.k === "lin" && p) {
          const d = norm(sub(l.b, l.a));
          const dir = o.t === "perp" ? perp(d) : d;
          r = { k: "lin", kind: "line", a: p, b: add(p, dir) };
        }
        break;
      }
      case "bisector": {
        const a = P(o.a), b = P(o.b), c = P(o.c);
        if (a && b && c && dist(a, b) > 1e-9 && dist(c, b) > 1e-9) r = { k: "lin", kind: "ray", a: b, b: add(b, bisectorDir(a, b, c)) };
        break;
      }
      case "angle": {
        const a = P(o.a), b = P(o.b), c = P(o.c);
        if (a && b && c) {
          const deg = toDeg(angleAt(a, b, c));
          if (Number.isFinite(deg)) r = { k: "ang", a, b, c, deg };
        }
        break;
      }
    }
    if (r) m.set(o.id, r);
  }
  return m;
}

/** Ашиглагдаагүй дараагийн нэр: A…Z, дараа нь A_1…Z_1, A_2… */
export function nextName(objs: Obj[]): string {
  const used = new Set(objs.filter(isPointObj).map((o) => o.name));
  for (let k = 0; k < 100; k++) {
    for (let i = 0; i < 26; i++) {
      const n = String.fromCharCode(65 + i) + (k ? `_${k}` : "");
      if (!used.has(n)) return n;
    }
  }
  return `P_${objs.length}`;
}

export const nextId = (objs: Obj[]) => objs.reduce((m, o) => Math.max(m, o.id), 0) + 1;

/** Объект ямар объектуудаас хамаарах */
export function deps(o: Obj): number[] {
  switch (o.t) {
    case "point": return [];
    case "midpoint": case "segment": case "line": case "ray": return [o.a, o.b];
    case "intersect": return [o.o1, o.o2];
    case "on": return [o.obj];
    case "circle": return [o.c, o.p];
    case "polygon": return o.pts;
    case "perp": case "parallel": return [o.line, o.p];
    case "bisector": case "angle": return [o.a, o.b, o.c];
  }
}

/** id-тай объект ба түүнээс хамаарах бүгдийг хасна */
export function removeWithDependents(objs: Obj[], id: number): Obj[] {
  const gone = new Set([id]);
  for (const o of objs) if (deps(o).some((d) => gone.has(d))) gone.add(o.id);
  return objs.filter((o) => !gone.has(o.id));
}

/** Сүүлчийн объектыг (хамааралтай нь хамт) хасна */
export function removeLast(objs: Obj[]): Obj[] {
  if (!objs.length) return objs;
  return removeWithDependents(objs, objs[objs.length - 1].id);
}

/** Торонд наалдуулах */
export function snap(p: Pt, step: number): Pt {
  return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step };
}

export interface Hit {
  id: number;
  kind: "pt" | "lin" | "circ" | "poly";
  d: number;
}

/**
 * Математик координатад p-д хамгийн ойр объект. Цэгт давуу эрх.
 * tolPt/tolLine нь математик нэгжээр (пикселийг масштабаар хувааж өгнө).
 */
export function hitTest(objs: Obj[], res: Map<number, Res>, p: Pt, tolPt: number, tolLine: number, filter?: (o: Obj) => boolean): Hit | null {
  let best: Hit | null = null;
  for (const o of objs) {
    if (filter && !filter(o)) continue;
    const r = res.get(o.id);
    if (!r || r.k !== "pt") continue;
    const d = dist(r.p, p);
    if (d <= tolPt && (!best || d < best.d)) best = { id: o.id, kind: "pt", d };
  }
  if (best) return best;
  for (const o of objs) {
    if (filter && !filter(o)) continue;
    const r = res.get(o.id);
    if (!r) continue;
    let d = Infinity;
    if (r.k === "lin") {
      if (r.kind === "segment") d = distToSegment(p, r.a, r.b);
      else if (r.kind === "line") d = distToLine(p, r.a, sub(r.b, r.a));
      else {
        const t = (p.x - r.a.x) * (r.b.x - r.a.x) + (p.y - r.a.y) * (r.b.y - r.a.y);
        d = t < 0 ? dist(p, r.a) : distToLine(p, r.a, sub(r.b, r.a));
      }
    } else if (r.k === "circ") d = Math.abs(dist(p, r.c) - r.r);
    else continue;
    if (d <= tolLine && (!best || d < best.d)) best = { id: o.id, kind: r.k, d };
  }
  return best;
}

/* ---------------- Наалдах ---------------- */

/**
 * p-д tol зайд байгаа хоёр шугам/тойргийн огтлолцол (байгуулахад наалдуулна).
 * Хамгийн ойрыг буцаана.
 */
export function snapIntersection(objs: Obj[], res: Map<number, Res>, p: Pt, tol: number): { o1: number; o2: number; idx: number; p: Pt } | null {
  const curves = objs.filter((o) => {
    const r = res.get(o.id);
    return r && (r.k === "lin" || r.k === "circ");
  });
  let best: { o1: number; o2: number; idx: number; p: Pt } | null = null;
  let bd = tol;
  for (let i = 0; i < curves.length; i++) {
    for (let j = i + 1; j < curves.length; j++) {
      const r1 = res.get(curves[i].id)!, r2 = res.get(curves[j].id)!;
      for (let idx = 0; idx < 2; idx++) {
        const q = intersectionAt(r1, r2, idx);
        if (!q) continue;
        const d = dist(q, p);
        if (d <= bd) {
          bd = d;
          best = { o1: curves[i].id, o2: curves[j].id, idx, p: q };
        }
      }
    }
  }
  return best;
}

/* ---------------- Хэмжээс ---------------- */

export interface Measure {
  id: number;
  /** LaTeX ($-гүй), нэг мөр — тасрахгүй богино */
  tex: string;
}

/**
 * Самбарт харуулах хэмжээсүүд (урт, өнцөг, талбай, радиус). Урт нь яг
 * хэлбэрээр боломжтой бол (\sqrt{13}\approx 3.61), өнцөг бүхэл эсвэл 1 орон.
 */
export function measures(objs: Obj[], res: Map<number, Res>, unit = ""): Measure[] {
  const name = (id: number) => {
    const o = objs.find((x) => x.id === id);
    return o && isPointObj(o) ? o.name : "?";
  };
  const u = unit ? `\\ \\text{${unit}}` : "";
  const u2 = unit ? `\\ \\text{${unit}}^2` : "";
  const out: Measure[] = [];
  for (const o of objs) {
    const r = res.get(o.id);
    if (!r) continue;
    if (o.t === "segment" && r.k === "lin") out.push({ id: o.id, tex: `${name(o.a)}${name(o.b)}${valTex(val(dist(r.a, r.b)), u)}` });
    else if (o.t === "circle" && r.k === "circ") {
      out.push({ id: o.id, tex: `r=${name(o.c)}${name(o.p)}${valTex(val(r.r), u)}` });
      out.push({ id: o.id, tex: `C=2\\pi r${valTex(piVal(2 * r.r), u)}` });
      out.push({ id: o.id, tex: `S=\\pi r^2${valTex(piVal(r.r * r.r), u2)}` });
    } else if (o.t === "polygon" && r.k === "poly") {
      const nm = o.pts.map(name).join("");
      out.push({ id: o.id, tex: `S_{${nm}}${valTex(val(polygonArea(r.pts)), u2)}` });
      out.push({ id: o.id, tex: `P_{${nm}}${valTex(val(perimeter(r.pts)), u)}` });
    } else if (o.t === "angle" && r.k === "ang") {
      out.push({ id: o.id, tex: `\\angle ${name(o.a)}${name(o.b)}${name(o.c)}${valTex(degVal(r.deg))}` });
    }
  }
  return out;
}

/** Хоёр цэгээр шаардлагатай объектын төрлүүд (хэрэгслийн тохиргоо) */
export const TWO_POINT_TOOLS = ["segment", "line", "ray", "circle", "midpoint"] as const;
