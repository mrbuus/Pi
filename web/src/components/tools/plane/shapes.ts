/* ============================================================================
 * «Загвар» горим: хэмжээнээс зураг (Prim[]) ба тооцоо (Metric[]) үүсгэнэ.
 * Цэвэр логик — React-гүй. Тест: shapes.test.mjs
 * ========================================================================== */

import {
  type Pt, type Tri, add, angleAt, bisectorFoot, centroid, centroidOf, chordLength, circumcenter, dist, dot,
  foot, heron, incenter, lerp, mid, mul, norm, orthocenter, paramOn, parallelogram, perp, placeTriangle, polar,
  regularPolygon, segmentArea, solveAAS, solveASA, solveSAS, solveSSA, solveSSS, sub, tangentLength,
  tangentPoints, toRad, trapezoidFromLegs, trapezoidPts, medianTo, bisectorTo, type TriResult,
} from "./geom.ts";
import type { Metric, Prim, Row, Tone } from "./figure.ts";
import { degLabel, degTex, degVal, lenLabel, num, piVal, val, valTex, unitTex } from "./fmt.ts";

export type ShapeKind = "triangle" | "rectangle" | "square" | "parallelogram" | "rhombus" | "trapezoid" | "polygon" | "circle";
export type TriKind = "sss" | "sas" | "asa" | "aas" | "ssa" | "right" | "iso" | "equi";
export type Vertex = "A" | "B" | "C" | "all";

export interface Params {
  shape: ShapeKind;
  triKind: TriKind;
  /** Гурвалжны талууд a=BC, b=CA, c=AB */
  a: number;
  b: number;
  c: number;
  /** Гурвалжны өнцгүүд (градус) */
  A: number;
  B: number;
  C: number;
  ssaAlt: boolean;
  /** Тэгш өнцөгт */
  rw: number;
  rh: number;
  /** Квадрат */
  sq: number;
  /** Параллелограмм */
  pa: number;
  pb: number;
  palpha: number;
  /** Ромб */
  rhKind: "angle" | "diag";
  rha: number;
  rhAlpha: number;
  d1: number;
  d2: number;
  /** Трапец: доод суурь ta, дээд суурь tb, өндөр th, хажуу tc, td */
  trKind: "iso" | "right" | "legs";
  ta: number;
  tb: number;
  th: number;
  tc: number;
  td: number;
  /** Зөв олон өнцөгт */
  n: number;
  pside: number;
  /** Тойрог */
  r: number;
  rAsD: boolean;
  theta: number;
  tanD: number;
}

export interface Opts {
  vertexNames: boolean;
  sideLabels: "none" | "value" | "letter";
  angleLabels: "none" | "value" | "letter";
  marks: boolean;
  unit: "" | "см";
  from: Vertex;
  height: boolean;
  median: boolean;
  bisector: boolean;
  perpBis: boolean;
  midline: boolean;
  incircle: boolean;
  circumcircle: boolean;
  orthoC: boolean;
  centroidC: boolean;
  inC: boolean;
  circumC: boolean;
  euler: boolean;
  diagonals: boolean;
  qHeight: boolean;
  qCircles: boolean;
  pR: boolean;
  pr: boolean;
  pIn: boolean;
  pOut: boolean;
  pDiag: boolean;
  pCentral: boolean;
  cRadius: boolean;
  cDiameter: boolean;
  cChord: boolean;
  cSector: boolean;
  cSegment: boolean;
  cCentral: boolean;
  cInscribed: boolean;
  cTangent: boolean;
  cTangentExt: boolean;
  fill: boolean;
  /** «Тестэд зориулж»: зурган дээр тоо биш үсэг (a, b, c, α) — бодлогын зураг */
  exam: boolean;
}

export const DEFAULT_PARAMS: Params = {
  shape: "triangle",
  triKind: "sss",
  a: 5, b: 4, c: 3,
  A: 60, B: 50, C: 70,
  ssaAlt: false,
  rw: 6, rh: 4,
  sq: 4,
  pa: 6, pb: 4, palpha: 60,
  rhKind: "angle", rha: 5, rhAlpha: 60, d1: 8, d2: 6,
  trKind: "iso", ta: 8, tb: 4, th: 3, tc: 4, td: 5,
  n: 6, pside: 3,
  r: 4, rAsD: false, theta: 100, tanD: 8,
};

export const DEFAULT_OPTS: Opts = {
  vertexNames: true,
  sideLabels: "value",
  angleLabels: "value",
  marks: true,
  unit: "",
  from: "A",
  height: false, median: false, bisector: false, perpBis: false, midline: false,
  incircle: false, circumcircle: false,
  orthoC: false, centroidC: false, inC: false, circumC: false, euler: false,
  diagonals: false, qHeight: false, qCircles: false,
  pR: false, pr: false, pIn: false, pOut: false, pDiag: false, pCentral: false,
  cRadius: true, cDiameter: false, cChord: false, cSector: false, cSegment: false,
  cCentral: false, cInscribed: false, cTangent: false, cTangentExt: false,
  fill: false,
  exam: false,
};

/** Зураг дээр чирж хэмжээг өөрчлөх цэг (математик координат) */
export interface Handle {
  id: string;
  p: Pt;
}

export type Built =
  | { ok: true; prims: Prim[]; metrics: Metric[]; note?: string; hasAlt?: boolean; tri?: Tri; handles: Handle[] }
  | { ok: false; reason: string; tex?: string };

/* ---------------- Туслах ---------------- */

const NAMES = "ABCDEFGHIJKL";
const near = (x: number, y: number, tol = 1e-7) => Math.abs(x - y) <= tol * Math.max(1, Math.abs(x), Math.abs(y));

/** Тэнцүү утгуудыг бүлэглэж зураасны тоо (1, 2, 3); ганцаараа бол 0 */
export function equalGroups(vals: number[], tol = 1e-7): number[] {
  const out = vals.map(() => 0);
  let g = 0;
  for (let i = 0; i < vals.length; i++) {
    if (out[i]) continue;
    const same = vals.map((v, j) => (j > i && !out[j] && near(v, vals[i], tol) ? j : -1)).filter((j) => j >= 0);
    if (!same.length) continue;
    g++;
    out[i] = g;
    for (const j of same) out[j] = g;
  }
  return out;
}

interface Ctx {
  prims: Prim[];
  metrics: Metric[];
  o: Opts;
  u1: string;
  u2: string;
}

function ctx(o: Opts): Ctx {
  return { prims: [], metrics: [], o, u1: unitTex(o.unit, 1), u2: unitTex(o.unit, 2) };
}

/** «A=B=C»-г хаалтны гадна талын тэнцүүгээр хуваана */
export function splitEq(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "{" || ch === "(") depth++;
    else if (ch === "}" || ch === ")") depth--;
    if (ch === "=" && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.filter((x) => x.length);
}

/** Мөрийг нэг мөрт LaTeX болгох: «S=\frac{ab}{2}=6» */
export function rowTex(r: Row): string {
  return `${r.sym}${(r.steps ?? []).map((s) => `=${s}`).join("")}${valTex(r.v, r.unit ?? "")}`;
}

function push(c: Ctx, name: string, rows: Row[], key = false, brief?: number) {
  c.metrics.push({ name, rows, key, brief, tex: rows.map(rowTex).join(",\\ ") });
}

const unitOf = (c: Ctx, power: 0 | 1 | 2) => (power === 1 ? c.u1 : power === 2 ? c.u2 : "");

/** Урт/талбайн мөр */
function row(sym: string, subst: string, value: number, unit = ""): Row {
  return { sym, steps: subst ? splitEq(subst) : [], v: val(value), unit };
}

/** Өнцгийн мөр */
function angRow(sym: string, subst: string, deg: number): Row {
  return { sym, steps: subst ? splitEq(subst) : [], v: degVal(deg) };
}

/** Үр дүн: lhs = subst = утга (нэгжтэй) */
function metric(c: Ctx, name: string, lhs: string, subst: string, value: number, power: 0 | 1 | 2 = 1, key = false) {
  push(c, name, [row(lhs, subst, value, unitOf(c, power))], key);
}

/** π-тэй үр дүн: lhs = subst = kπ */
function piMetric(c: Ctx, name: string, lhs: string, subst: string, k: number, power: 1 | 2, key = false) {
  push(c, name, [{ sym: lhs, steps: splitEq(subst), v: piVal(k), unit: unitOf(c, power) }], key);
}

/** Олон өнцөгтийн хүрээ + оройн нэр */
function outline(c: Ctx, pts: Pt[], names: string[]) {
  c.prims.push({ k: "poly", pts, fill: c.o.fill, w: 2.4 });
  const g = centroidOf(pts);
  if (c.o.vertexNames) pts.forEach((p, i) => c.prims.push({ k: "label", p, text: names[i], away: g }));
}

function sideText(c: Ctx, value: number, letter: string): string | null {
  if (c.o.sideLabels === "none") return null;
  return c.o.sideLabels === "letter" || c.o.exam ? letter || null : lenLabel(value, c.o.unit);
}

/** Өнцгийн шошгоны горим (тестэд зориулбал тоо биш үсэг) */
const angleMode = (o: Opts) => (o.exam && o.angleLabels === "value" ? "letter" : o.angleLabels);

function addSide(c: Ctx, a: Pt, b: Pt, inside: Pt, value: number, letter: string) {
  const t = sideText(c, value, letter);
  if (t) c.prims.push({ k: "side", a, b, text: t, inside });
}

/** Олон өнцөгтийн дотоод өнцгийн тэмдэг */
function addAngle(c: Ctx, prev: Pt, v: Pt, next: Pt, deg: number, letter: string, arcs: number, showText = true) {
  const right = c.o.marks && near(deg, 90, 1e-9);
  let text: string | undefined;
  const mode = angleMode(c.o);
  if (showText && mode === "value" && !right) text = degLabel(deg);
  if (showText && mode === "letter" && letter) text = letter;
  if (!right && !text && !(c.o.marks && arcs > 0)) return;
  c.prims.push({ k: "angle", v, a: prev, b: next, text, right, arcs: c.o.marks ? Math.max(1, arcs) : 1 });
}

function addTicks(c: Ctx, pairs: [Pt, Pt][], groups: number[]) {
  if (!c.o.marks) return;
  pairs.forEach(([a, b], i) => groups[i] && c.prims.push({ k: "ticks", a, b, n: groups[i] }));
}

function pointMark(c: Ctx, p: Pt, name: string, away: Pt | null, tone: Tone = "brand") {
  c.prims.push({ k: "dot", p, tone });
  if (name) c.prims.push(away ? { k: "label", p, text: name, away, size: 15 } : { k: "label", p, text: name, dir: { x: 0.7, y: 0.7 }, size: 15 });
}

/** Тэгш өнцгийн тэмдэг: v оройд v→a ба v→b хооронд */
function rightMark(c: Ctx, v: Pt, a: Pt, b: Pt, tone: Tone = "brand") {
  if (c.o.marks) c.prims.push({ k: "angle", v, a, b, right: true, tone });
}

/* ---------------- Гурвалжин ---------------- */

function solveTri(p: Params): TriResult {
  switch (p.triKind) {
    case "sss": return solveSSS(p.a, p.b, p.c);
    case "sas": return solveSAS(p.b, p.A, p.c);
    case "asa": return solveASA(p.B, p.a, p.C);
    case "aas": return solveAAS(p.A, p.B, p.a);
    case "ssa": return solveSSA(p.a, p.b, p.A);
    case "right": {
      if (!(p.a > 0 && p.b > 0)) return { ok: false, reason: "Катетын урт эерэг тоо байх ёстой" };
      return solveSSS(p.a, p.b, Math.hypot(p.a, p.b));
    }
    case "iso": {
      const r = solveSSS(p.a, p.b, p.b);
      if (!r.ok && p.a > 0 && p.b > 0) return { ok: false, reason: "Хажуу талын хоёрын нийлбэр сууриас их байх ёстой", tex: `2b>a` };
      return r;
    }
    case "equi": return solveSSS(p.a, p.a, p.a);
  }
}

export function triangleKindText(t: Tri): string {
  const maxA = Math.max(t.A, t.B, t.C);
  const byAngle = near(maxA, 90, 1e-7) ? "тэгш өнцөгт" : maxA > 90 ? "мохоо өнцөгт" : "хурц өнцөгт";
  const eq = equalGroups([t.a, t.b, t.c]);
  const n = eq.filter((x) => x).length;
  const bySide = n === 3 ? "зөв (адил талт)" : n === 2 ? "адил хажуут" : "элдэв талт";
  return `${bySide}, ${byAngle}`;
}

/** Талын урт тохирч байвал чирсэн байрлалыг (pose) ашиглана, үгүй бол стандарт байрлал */
function triPlace(t: Tri, pose?: Pt[]): { A: Pt; B: Pt; C: Pt } {
  if (pose && pose.length === 3) {
    const [A, B, C] = pose;
    const ok = [dist(B, C) / t.a, dist(C, A) / t.b, dist(A, B) / t.c].every((k) => Math.abs(k - 1) < 0.08);
    if (ok) return { A, B, C };
  }
  return placeTriangle(t);
}

function buildTriangle(p: Params, o: Opts, pose?: Pt[]): Built {
  const r = solveTri(p);
  if (!r.ok) return r;
  const t = p.triKind === "ssa" && p.ssaAlt && r.alt ? r.alt : r.tri;
  const { A, B, C } = triPlace(t, pose);
  const c = ctx(o);
  const G = centroid(A, B, C);
  const V: Record<"A" | "B" | "C", Pt> = { A, B, C };

  outline(c, [A, B, C], ["A", "B", "C"]);
  const sides = equalGroups([t.a, t.b, t.c]);
  addSide(c, B, C, A, t.a, "a");
  addSide(c, C, A, B, t.b, "b");
  addSide(c, A, B, C, t.c, "c");
  addTicks(c, [[B, C], [C, A], [A, B]], sides);

  const angG = equalGroups([t.A, t.B, t.C]);
  const bisAt = (k: "A" | "B" | "C") => o.bisector && (o.from === "all" || o.from === k);
  addAngle(c, B, A, C, t.A, "\\alpha", angG[0], true);
  addAngle(c, C, B, A, t.B, "\\beta", angG[1], true);
  addAngle(c, A, C, B, t.C, "\\gamma", angG[2], true);

  const verts = (o.from === "all" ? ["A", "B", "C"] : [o.from]) as ("A" | "B" | "C")[];
  const opp = (k: "A" | "B" | "C"): [Pt, Pt] => (k === "A" ? [B, C] : k === "B" ? [C, A] : [A, B]);
  const idx = { A: 1, B: 2, C: 3 } as const;
  const single = verts.length === 1;
  const s = Math.max(t.a, t.b, t.c);

  for (const k of verts) {
    const P = V[k];
    const [U, W] = opp(k);
    if (o.height) {
      const H = foot(P, U, W);
      const tp = paramOn(H, U, W);
      if (tp < -1e-9) c.prims.push({ k: "seg", a: U, b: H, dash: true, tone: "dim" });
      if (tp > 1 + 1e-9) c.prims.push({ k: "seg", a: W, b: H, dash: true, tone: "dim" });
      c.prims.push({ k: "seg", a: P, b: H, tone: "brand", w: 1.8 });
      const other = dist(H, U) > 1e-9 ? U : W;
      if (dist(H, P) > 1e-9) rightMark(c, H, P, other);
      pointMark(c, H, single && !o.orthoC ? "H" : `H_${idx[k]}`, P);
    }
    if (o.median) {
      const M = mid(U, W);
      c.prims.push({ k: "seg", a: P, b: M, tone: "brand", w: 1.8 });
      if (o.marks) {
        c.prims.push({ k: "ticks", a: U, b: M, n: idx[k], tone: "brand" });
        c.prims.push({ k: "ticks", a: M, b: W, n: idx[k], tone: "brand" });
      }
      pointMark(c, M, `${k}_1`, P);
    }
    if (bisAt(k)) {
      const L = bisectorFoot(P, U, W);
      c.prims.push({ k: "seg", a: P, b: L, tone: "brand", w: 1.8 });
      if (o.marks) {
        c.prims.push({ k: "angle", v: P, a: U, b: L, arcs: 1, tone: "brand", r: 34 });
        c.prims.push({ k: "angle", v: P, a: L, b: W, arcs: 1, tone: "brand", r: 34 });
      }
      pointMark(c, L, single ? "L" : `L_${idx[k]}`, P);
    }
    if (o.perpBis) {
      const M = mid(U, W);
      const n = norm(perp(sub(W, U)));
      const O = circumcenter(A, B, C);
      const tO = O ? dot(sub(O, M), n) : 0;
      const t0 = Math.min(0, tO) - 0.2 * s, t1 = Math.max(0, tO) + 0.2 * s;
      c.prims.push({ k: "seg", a: add(M, mul(n, t0)), b: add(M, mul(n, t1)), tone: "brand", dash: true, w: 1.6 });
      rightMark(c, M, add(M, n), W);
      if (o.marks && !o.median) {
        c.prims.push({ k: "ticks", a: U, b: M, n: 1, tone: "brand" });
        c.prims.push({ k: "ticks", a: M, b: W, n: 1, tone: "brand" });
      }
    }
    if (o.midline) {
      // P оройгоос гарсан хоёр талын дундыг холбоно — эсрэг талтай параллель
      const nk = (["A", "B", "C"] as const).filter((x) => x !== k);
      const m1 = mid(P, V[nk[0]]), m2 = mid(P, V[nk[1]]);
      c.prims.push({ k: "seg", a: m1, b: m2, tone: "brand", w: 1.8 });
      const third = (x: "A" | "B" | "C") => (["A", "B", "C"] as const).find((y) => y !== k && y !== x)!;
      pointMark(c, m1, `${third(nk[0])}_1`, G);
      pointMark(c, m2, `${third(nk[1])}_1`, G);
    }
  }

  const I = incenter(A, B, C);
  const O = circumcenter(A, B, C);
  const H = orthocenter(A, B, C);
  const rIn = heron(t.a, t.b, t.c) / ((t.a + t.b + t.c) / 2);
  const R = (t.a * t.b * t.c) / (4 * heron(t.a, t.b, t.c));
  if (o.incircle) {
    c.prims.push({ k: "circle", c: I, r: rIn, tone: "brand", w: 1.8 });
    const T = foot(I, B, C);
    c.prims.push({ k: "seg", a: I, b: T, tone: "brand", dash: true });
    c.prims.push({ k: "side", a: I, b: T, text: "r", inside: C, tone: "brand", size: 15 });
  }
  if (o.circumcircle && O) {
    c.prims.push({ k: "circle", c: O, r: R, tone: "brand", w: 1.8 });
    c.prims.push({ k: "seg", a: O, b: A, tone: "brand", dash: true });
    c.prims.push({ k: "side", a: O, b: A, text: "R", inside: C, tone: "brand", size: 15 });
  }
  if (o.euler && O && H && dist(O, H) > 1e-6) {
    const d = norm(sub(H, O));
    c.prims.push({ k: "seg", a: add(O, mul(d, -0.3 * s)), b: add(H, mul(d, 0.3 * s)), tone: "accent", dash: true, w: 1.4 });
  }
  if (o.orthoC && H) pointMark(c, H, "H", null, "accent");
  if (o.centroidC) pointMark(c, G, "G", null, "accent");
  if (o.inC || o.incircle) pointMark(c, I, "I", null, "accent");
  if ((o.circumC || o.circumcircle) && O) pointMark(c, O, "O", null, "accent");

  /* ---- Тооцоо ---- */
  const S = heron(t.a, t.b, t.c);
  const P = t.a + t.b + t.c;
  const pp = P / 2;
  const sinA = (x: number) => `\\sin ${degTex(x)}`;
  const [na, nb, nc, nS] = [num(t.a), num(t.b), num(t.c), num(S)];
  switch (p.triKind) {
    case "sas":
      metric(c, "a тал (косинусын теорем)", "a", `\\sqrt{b^2+c^2-2bc\\cos A}=\\sqrt{${nb}^2+${nc}^2-2\\cdot ${nb}\\cdot ${nc}\\cos ${degTex(t.A)}}`, t.a);
      break;
    case "asa":
      push(c, "Гурав дахь өнцөг", [angRow("\\angle A", `180^\\circ-\\angle B-\\angle C=180^\\circ-${degTex(t.B)}-${degTex(t.C)}`, t.A)]);
      metric(c, "b тал (синусын теорем)", "b", `\\frac{a\\sin B}{\\sin A}=\\frac{${na}\\cdot ${sinA(t.B)}}{${sinA(t.A)}}`, t.b);
      metric(c, "c тал (синусын теорем)", "c", `\\frac{a\\sin C}{\\sin A}=\\frac{${na}\\cdot ${sinA(t.C)}}{${sinA(t.A)}}`, t.c);
      break;
    case "aas":
      push(c, "Гурав дахь өнцөг", [angRow("\\angle C", `180^\\circ-\\angle A-\\angle B=180^\\circ-${degTex(t.A)}-${degTex(t.B)}`, t.C)]);
      metric(c, "b тал (синусын теорем)", "b", `\\frac{a\\sin B}{\\sin A}=\\frac{${na}\\cdot ${sinA(t.B)}}{${sinA(t.A)}}`, t.b);
      metric(c, "c тал (синусын теорем)", "c", `\\frac{a\\sin C}{\\sin A}=\\frac{${na}\\cdot ${sinA(t.C)}}{${sinA(t.A)}}`, t.c);
      break;
    case "ssa":
      push(c, "Синусын теорем", [
        { sym: "\\sin B", steps: [`\\frac{b\\sin A}{a}`, `\\frac{${nb}\\cdot ${sinA(t.A)}}{${na}}`], v: val(Math.sin(toRad(t.B))) },
        angRow("\\angle B", "", t.B),
      ]);
      metric(c, "c тал (синусын теорем)", "c", `\\frac{a\\sin C}{\\sin A}=\\frac{${na}\\cdot ${sinA(t.C)}}{${sinA(t.A)}}`, t.c);
      break;
    case "right":
      metric(c, "Гипотенуз (Пифагор)", "c", `\\sqrt{a^2+b^2}=\\sqrt{${na}^2+${nb}^2}`, t.c);
      break;
    case "iso":
      metric(c, "Суурь руу буусан өндөр", "h_a", `\\sqrt{b^2-\\frac{a^2}{4}}=\\sqrt{${nb}^2-\\frac{${na}^2}{4}}`, Math.sqrt(t.b * t.b - (t.a * t.a) / 4));
      break;
    default:
      break;
  }
  // Олдох ёстой (өгөгдөөгүй) тал, өнцөг — гол үр дүнд
  const unknownSide: Record<TriKind, boolean> = { sss: false, sas: true, asa: true, aas: true, ssa: true, right: true, iso: false, equi: false };
  push(c, "Талууд", [row("a", "", t.a, c.u1), row("b", "", t.b, c.u1), row("c", "", t.c, c.u1)], unknownSide[p.triKind]);
  push(c, "Өнцгүүд", [angRow("\\angle A", "", t.A), angRow("\\angle B", "", t.B), angRow("\\angle C", "", t.C)], p.triKind !== "equi");
  metric(c, "Периметр", "P", `a+b+c=${na}+${nb}+${nc}`, P, 1, true);
  let areaKey = true;
  if (p.triKind === "right") metric(c, "Талбай", "S", `\\frac{ab}{2}=\\frac{${na}\\cdot ${nb}}{2}`, S, 2, true);
  else if (p.triKind === "equi") metric(c, "Талбай", "S", `\\frac{\\sqrt{3}}{4}a^2=\\frac{\\sqrt{3}}{4}\\cdot ${na}^2`, S, 2, true);
  else if (p.triKind === "sas") metric(c, "Талбай", "S", `\\frac{1}{2}bc\\sin A=\\frac{1}{2}\\cdot ${nb}\\cdot ${nc}\\cdot ${sinA(t.A)}`, S, 2, true);
  else if (p.triKind === "iso") metric(c, "Талбай", "S", `\\frac{1}{2}a\\,h_a=\\frac{1}{2}\\cdot ${na}\\cdot ${num(Math.sqrt(t.b * t.b - (t.a * t.a) / 4))}`, S, 2, true);
  else if (p.triKind !== "sss") metric(c, "Талбай", "S", `\\frac{1}{2}ab\\sin C=\\frac{1}{2}\\cdot ${na}\\cdot ${nb}\\cdot ${sinA(t.C)}`, S, 2, true);
  else areaKey = false;
  push(
    c,
    "Талбай (Герон)",
    [
      row("p", `\\frac{a+b+c}{2}=\\frac{${num(P)}}{2}`, pp, c.u1),
      row("S", `\\sqrt{p(p-a)(p-b)(p-c)}=\\sqrt{${num(pp)}\\cdot ${num(pp - t.a)}\\cdot ${num(pp - t.b)}\\cdot ${num(pp - t.c)}}`, S, c.u2),
    ],
    !areaKey,
    1,
  );
  push(c, "Өндрүүд", [
    row("h_a", `\\frac{2S}{a}=\\frac{2\\cdot ${nS}}{${na}}`, (2 * S) / t.a, c.u1),
    row("h_b", `\\frac{2S}{b}=\\frac{2\\cdot ${nS}}{${nb}}`, (2 * S) / t.b, c.u1),
    row("h_c", `\\frac{2S}{c}=\\frac{2\\cdot ${nS}}{${nc}}`, (2 * S) / t.c, c.u1),
  ]);
  push(c, "Медианууд", [
    row("m_a", `\\frac{1}{2}\\sqrt{2b^2+2c^2-a^2}=\\frac{1}{2}\\sqrt{2\\cdot ${nb}^2+2\\cdot ${nc}^2-${na}^2}`, medianTo(t.a, t.b, t.c), c.u1),
    row("m_b", `\\frac{1}{2}\\sqrt{2a^2+2c^2-b^2}=\\frac{1}{2}\\sqrt{2\\cdot ${na}^2+2\\cdot ${nc}^2-${nb}^2}`, medianTo(t.b, t.c, t.a), c.u1),
    row("m_c", `\\frac{1}{2}\\sqrt{2a^2+2b^2-c^2}=\\frac{1}{2}\\sqrt{2\\cdot ${na}^2+2\\cdot ${nb}^2-${nc}^2}`, medianTo(t.c, t.a, t.b), c.u1),
  ]);
  push(c, "Биссектрисууд", [
    row("l_a", `\\frac{\\sqrt{bc\\left((b+c)^2-a^2\\right)}}{b+c}`, bisectorTo(t.a, t.b, t.c), c.u1),
    row("l_b", `\\frac{\\sqrt{ac\\left((a+c)^2-b^2\\right)}}{a+c}`, bisectorTo(t.b, t.c, t.a), c.u1),
    row("l_c", `\\frac{\\sqrt{ab\\left((a+b)^2-c^2\\right)}}{a+b}`, bisectorTo(t.c, t.a, t.b), c.u1),
  ]);
  metric(c, "Багтсан тойргийн радиус", "r", `\\frac{S}{p}=\\frac{${nS}}{${num(pp)}}`, rIn);
  metric(c, "Багтаасан тойргийн радиус", "R", `\\frac{abc}{4S}=\\frac{${na}\\cdot ${nb}\\cdot ${nc}}{4\\cdot ${nS}}`, R);
  c.metrics.push({ name: "Төрөл", text: triangleKindText(t), key: true });

  return {
    ok: true,
    prims: c.prims,
    metrics: c.metrics,
    tri: t,
    handles: [{ id: "A", p: A }, { id: "B", p: B }, { id: "C", p: C }],
    hasAlt: p.triKind === "ssa" && !!r.alt,
    note: p.triKind === "ssa" && r.alt ? "Ийм өгөгдөлтэй хоёр өөр гурвалжин байна" : undefined,
  };
}

/* ---------------- Дөрвөн өнцөгт ---------------- */

function quadAngles(c: Ctx, pts: Pt[], letters: string[], groups: number[]) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const prev = pts[(i + n - 1) % n], v = pts[i], next = pts[(i + 1) % n];
    addAngle(c, prev, v, next, (angleAt(prev, v, next) * 180) / Math.PI, letters[i], groups[i]);
  }
}

function diagonals(c: Ctx, pts: Pt[]) {
  const [A, B, C, D] = pts;
  c.prims.push({ k: "seg", a: A, b: C, tone: "brand", w: 1.6 });
  c.prims.push({ k: "seg", a: B, b: D, tone: "brand", w: 1.6 });
}

function quadHeight(c: Ctx, from: Pt, a: Pt, b: Pt, name = "H") {
  const H = foot(from, a, b);
  const tp = paramOn(H, a, b);
  if (tp < -1e-9) c.prims.push({ k: "seg", a, b: H, dash: true, tone: "dim" });
  if (tp > 1 + 1e-9) c.prims.push({ k: "seg", a: b, b: H, dash: true, tone: "dim" });
  c.prims.push({ k: "seg", a: from, b: H, tone: "brand", dash: true, w: 1.8 });
  rightMark(c, H, from, dist(H, b) > 1e-9 ? b : a);
  pointMark(c, H, name, from);
  c.prims.push({ k: "side", a: from, b: H, text: "h", inside: lerp(a, b, tp < 0.5 ? 1 : 0), tone: "brand", size: 15 });
}

function buildRectangle(w: number, h: number, o: Opts, square: boolean): Built {
  if (!(w > 0 && h > 0)) return { ok: false, reason: "Талын урт эерэг тоо байх ёстой" };
  const pts: Pt[] = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  const [A, B, C, D] = pts;
  const c = ctx(o);
  const sq = square || near(w, h);
  outline(c, pts, ["A", "B", "C", "D"]);
  const g = centroidOf(pts);
  addSide(c, A, B, g, w, "a");
  addSide(c, B, C, g, h, sq ? "a" : "b");
  addTicks(c, [[A, B], [B, C], [C, D], [D, A]], sq ? [1, 1, 1, 1] : [1, 2, 1, 2]);
  quadAngles(c, pts, ["", "", "", ""], [0, 0, 0, 0]);
  const d = Math.hypot(w, h);
  if (o.diagonals) {
    diagonals(c, pts);
    pointMark(c, g, "O", null);
  }
  if (o.qCircles) {
    c.prims.push({ k: "circle", c: g, r: d / 2, tone: "brand", w: 1.6 });
    if (sq) c.prims.push({ k: "circle", c: g, r: w / 2, tone: "brand", w: 1.6 });
    pointMark(c, g, "O", null);
  }
  if (sq) {
    metric(c, "Периметр", "P", `4a=4\\cdot ${num(w)}`, 4 * w, 1, true);
    metric(c, "Талбай", "S", `a^2=${num(w)}^2`, w * w, 2, true);
    metric(c, "Диагональ", "d", `a\\sqrt{2}=${num(w)}\\sqrt{2}`, d, 1, true);
    metric(c, "Багтсан тойргийн радиус", "r", `\\frac{a}{2}=\\frac{${num(w)}}{2}`, w / 2);
    metric(c, "Багтаасан тойргийн радиус", "R", `\\frac{d}{2}=\\frac{a\\sqrt{2}}{2}`, d / 2);
  } else {
    metric(c, "Периметр", "P", `2(a+b)=2(${num(w)}+${num(h)})`, 2 * (w + h), 1, true);
    metric(c, "Талбай", "S", `ab=${num(w)}\\cdot ${num(h)}`, w * h, 2, true);
    metric(c, "Диагональ", "d", `\\sqrt{a^2+b^2}=\\sqrt{${num(w)}^2+${num(h)}^2}`, d, 1, true);
    metric(c, "Багтаасан тойргийн радиус", "R", `\\frac{d}{2}`, d / 2);
  }
  return { ok: true, prims: c.prims, metrics: c.metrics, handles: [{ id: "C", p: C }] };
}

function buildParallelogram(a: number, b: number, alpha: number, o: Opts, rhombus: boolean, viaDiag?: [number, number]): Built {
  if (!(a > 0 && b > 0)) return { ok: false, reason: "Талын урт эерэг тоо байх ёстой" };
  if (!(alpha > 0 && alpha < 180)) return { ok: false, reason: "Өнцөг 0-ээс их, 180-аас бага байх ёстой" };
  const pts = parallelogram(a, b, alpha);
  const [A, B, C, D] = pts;
  const c = ctx(o);
  const g = centroidOf(pts);
  outline(c, pts, ["A", "B", "C", "D"]);
  addSide(c, A, B, g, a, "a");
  addSide(c, A, D, g, b, rhombus ? "a" : "b");
  addTicks(c, [[A, B], [B, C], [C, D], [D, A]], rhombus ? [1, 1, 1, 1] : [1, 2, 1, 2]);
  const beta = 180 - alpha;
  const isRect = near(alpha, 90);
  quadAngles(c, pts, ["\\alpha", "\\beta", "\\alpha", "\\beta"], isRect ? [0, 0, 0, 0] : [1, 2, 1, 2]);
  const h = b * Math.sin(toRad(alpha));
  const d1 = Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(toRad(alpha)));
  const d2 = Math.sqrt(Math.max(0, a * a + b * b - 2 * a * b * Math.cos(toRad(alpha))));
  if (o.diagonals) {
    diagonals(c, pts);
    pointMark(c, g, "O", null);
    if (rhombus && !isRect) rightMark(c, g, A, B);
    if (o.marks) {
      c.prims.push({ k: "ticks", a: A, b: g, n: 1, tone: "brand", at: 0.5 });
      c.prims.push({ k: "ticks", a: g, b: C, n: 1, tone: "brand", at: 0.5 });
      if (!near(d1, d2)) {
        c.prims.push({ k: "ticks", a: B, b: g, n: 2, tone: "brand", at: 0.5 });
        c.prims.push({ k: "ticks", a: g, b: D, n: 2, tone: "brand", at: 0.5 });
      }
    }
  }
  if (o.qHeight && !isRect) quadHeight(c, D, A, B);
  if (o.qCircles && rhombus) {
    c.prims.push({ k: "circle", c: g, r: h / 2, tone: "brand", w: 1.6 });
    pointMark(c, g, "O", null);
  }
  if (rhombus) {
    if (viaDiag) {
      metric(c, "Тал", "a", `\\sqrt{\\left(\\frac{d_1}{2}\\right)^2+\\left(\\frac{d_2}{2}\\right)^2}=\\sqrt{${num(viaDiag[0] / 2)}^2+${num(viaDiag[1] / 2)}^2}`, a);
      push(c, "Өнцөг", [angRow("\\angle A", "2\\operatorname{arctg}\\frac{d_2}{d_1}", alpha)]);
    }
    metric(c, "Периметр", "P", `4a=4\\cdot ${num(a)}`, 4 * a, 1, true);
    if (viaDiag) metric(c, "Талбай", "S", `\\frac{d_1d_2}{2}=\\frac{${num(viaDiag[0])}\\cdot ${num(viaDiag[1])}}{2}`, (viaDiag[0] * viaDiag[1]) / 2, 2, true);
    else metric(c, "Талбай", "S", `a^2\\sin\\alpha=${num(a)}^2\\cdot\\sin ${degTex(alpha)}`, a * a * Math.sin(toRad(alpha)), 2, true);
    metric(c, "Өндөр", "h", `a\\sin\\alpha=${num(a)}\\cdot\\sin ${degTex(alpha)}`, h, 1, true);
    push(c, "Диагоналиуд", [row("d_1", "AC", d1, c.u1), row("d_2", "BD", d2, c.u1)], !viaDiag);
    metric(c, "Талбай (диагоналиар)", "S", `\\frac{d_1d_2}{2}`, (d1 * d2) / 2, 2);
    metric(c, "Багтсан тойргийн радиус", "r", `\\frac{h}{2}`, h / 2);
  } else {
    metric(c, "Периметр", "P", `2(a+b)=2(${num(a)}+${num(b)})`, 2 * (a + b), 1, true);
    metric(c, "Өндөр", "h", `b\\sin\\alpha=${num(b)}\\cdot\\sin ${degTex(alpha)}`, h, 1, true);
    metric(c, "Талбай", "S", `ah=ab\\sin\\alpha=${num(a)}\\cdot ${num(b)}\\cdot\\sin ${degTex(alpha)}`, a * h, 2, true);
    metric(c, "Урт диагональ", "d_1", `\\sqrt{a^2+b^2+2ab\\cos\\alpha}`, d1);
    metric(c, "Богино диагональ", "d_2", `\\sqrt{a^2+b^2-2ab\\cos\\alpha}`, d2);
    push(c, "Өнцгүүд", [angRow("\\alpha", "", alpha), angRow("\\beta", "180^\\circ-\\alpha", beta)]);
  }
  const handles: { id: string; p: Pt }[] = viaDiag ? [] : rhombus ? [{ id: "D", p: D }] : [{ id: "B", p: B }, { id: "D", p: D }];
  return { ok: true, prims: c.prims, metrics: c.metrics, handles };
}

function buildTrapezoid(p: Params, o: Opts): Built {
  const { ta: a, tb: b } = p;
  if (!(a > 0 && b > 0)) return { ok: false, reason: "Суурийн урт эерэг тоо байх ёстой" };
  let off: number, h: number;
  if (p.trKind === "legs") {
    if (near(a, b)) return { ok: false, reason: "Суурь тэнцүү бол параллелограмм болно, өөр утга өгнө үү" };
    const r = trapezoidFromLegs(a, b, p.tc, p.td);
    if (!r) {
      return {
        ok: false,
        reason: "Ийм трапец байхгүй: хажуу талууд ба суурийн ялгавраас гурвалжин үүсэх ёстой",
        tex: `|c-d|<|a-b|<c+d`,
      };
    }
    off = r.p;
    h = r.h;
  } else {
    if (!(p.th > 0)) return { ok: false, reason: "Өндөр эерэг тоо байх ёстой" };
    h = p.th;
    off = p.trKind === "iso" ? (a - b) / 2 : 0;
  }
  const pts = trapezoidPts(a, b, off, h);
  const [A, B, C, D] = pts;
  const c = ctx(o);
  const g = centroidOf(pts);
  outline(c, pts, ["A", "B", "C", "D"]);
  const cLen = dist(A, B), dLen = dist(C, D);
  addSide(c, A, D, g, a, "a");
  addSide(c, B, C, g, b, "b");
  addSide(c, A, B, g, cLen, "c");
  addSide(c, C, D, g, dLen, "d");
  const iso = near(cLen, dLen);
  addTicks(c, [[A, B], [C, D]], iso ? [1, 1] : [0, 0]);
  const angs = [angleAt(B, A, D), angleAt(A, B, C), angleAt(B, C, D), angleAt(C, D, A)].map((x) => (x * 180) / Math.PI);
  const ord = [D, A, B, C];
  for (let i = 0; i < 4; i++) {
    const v = pts[i], prev = ord[i], next = pts[(i + 1) % 4];
    const groups = iso ? [1, 2, 2, 1] : [0, 0, 0, 0];
    addAngle(c, prev, v, next, angs[i], ["\\alpha", "\\beta", "\\gamma", "\\delta"][i], groups[i]);
  }
  if (o.diagonals) diagonals(c, pts);
  if (o.qHeight) quadHeight(c, p.trKind === "right" ? C : B, A, D);
  const m = (a + b) / 2;
  if (o.midline) {
    const M = mid(A, B), N = mid(C, D);
    c.prims.push({ k: "seg", a: M, b: N, tone: "brand", w: 1.8 });
    pointMark(c, M, "M", g);
    pointMark(c, N, "N", g);
  }
  if (p.trKind === "legs") {
    metric(c, "Өндөр", "h", "", h, 1, true);
  } else {
    metric(c, "Хажуу тал", "c", p.trKind === "iso" ? `\\sqrt{h^2+\\left(\\frac{a-b}{2}\\right)^2}` : "h", cLen);
    metric(c, "Хажуу тал", "d", p.trKind === "iso" ? "c" : `\\sqrt{h^2+(a-b)^2}`, dLen);
  }
  metric(c, "Дундаж шугам", "m", `\\frac{a+b}{2}=\\frac{${num(a)}+${num(b)}}{2}`, m, 1, true);
  metric(c, "Талбай", "S", `\\frac{a+b}{2}\\cdot h=\\frac{${num(a)}+${num(b)}}{2}\\cdot ${num(h)}`, m * h, 2, true);
  metric(c, "Периметр", "P", `a+b+c+d=${num(a)}+${num(b)}+${num(cLen)}+${num(dLen)}`, a + b + cLen + dLen, 1, true);
  push(c, "Диагоналиуд", [row("AC", "", dist(A, C), c.u1), row("BD", "", dist(B, D), c.u1)]);
  push(c, "Өнцгүүд", [angRow("\\angle A", "", angs[0]), angRow("\\angle B", "", angs[1]), angRow("\\angle C", "", angs[2]), angRow("\\angle D", "", angs[3])]);
  const handles: { id: string; p: Pt }[] = p.trKind === "legs" ? [] : [{ id: "C", p: C }, { id: "D", p: D }];
  return { ok: true, prims: c.prims, metrics: c.metrics, handles };
}

/* ---------------- Зөв олон өнцөгт ---------------- */

function buildPolygon(nRaw: number, a: number, o: Opts): Built {
  const n = Math.round(nRaw);
  if (!(n >= 3 && n <= 12)) return { ok: false, reason: "Өнцгийн тоо 3-аас 12 хүртэл байна" };
  if (!(a > 0)) return { ok: false, reason: "Талын урт эерэг тоо байх ёстой" };
  const rp = regularPolygon(n, a);
  const pts = rp.pts;
  const O = { x: 0, y: 0 };
  const c = ctx(o);
  const names = Array.from({ length: n }, (_, i) => NAMES[i]);
  outline(c, pts, names);
  if (o.pOut) c.prims.push({ k: "circle", c: O, r: rp.R, tone: "brand", w: 1.6 });
  if (o.pIn) c.prims.push({ k: "circle", c: O, r: rp.r, tone: "brand", w: 1.6 });
  if (o.pDiag) {
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) if (!(i === 0 && j === n - 1)) c.prims.push({ k: "seg", a: pts[i], b: pts[j], tone: "dim", w: 1.1 });
  }
  addSide(c, pts[0], pts[1], O, a, "a");
  addTicks(c, pts.map((p, i) => [p, pts[(i + 1) % n]] as [Pt, Pt]), pts.map(() => 1));
  for (let i = 0; i < n; i++) {
    addAngle(c, pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], rp.interior, "\\alpha", 1, n <= 6 || i === 1);
  }
  const showO = o.pR || o.pr || o.pIn || o.pOut || o.pCentral || o.pDiag;
  if (o.pR) {
    c.prims.push({ k: "seg", a: O, b: pts[n - 1], tone: "brand", dash: true, w: 1.6 });
    c.prims.push({ k: "side", a: O, b: pts[n - 1], text: "R", inside: pts[0], tone: "brand", size: 15 });
  }
  if (o.pr) {
    const H = mid(pts[0], pts[1]);
    c.prims.push({ k: "seg", a: O, b: H, tone: "brand", dash: true, w: 1.6 });
    rightMark(c, H, O, pts[1]);
    c.prims.push({ k: "side", a: O, b: H, text: "r", inside: pts[1], tone: "brand", size: 15 });
  }
  if (o.pCentral) {
    c.prims.push({ k: "seg", a: O, b: pts[1], tone: "brand", w: 1.4 });
    c.prims.push({ k: "seg", a: O, b: pts[2], tone: "brand", w: 1.4 });
    const cm = angleMode(o);
    c.prims.push({ k: "angle", v: O, a: pts[1], b: pts[2], text: cm === "letter" ? "\\varphi" : cm === "value" ? degLabel(rp.central) : undefined, tone: "brand" });
  }
  if (showO) pointMark(c, O, "O", null);
  const t = `\\operatorname{tg}\\frac{180^\\circ}{${n}}`;
  metric(c, "Периметр", "P", `na=${n}\\cdot ${num(a)}`, rp.P, 1, true);
  metric(c, "Талбай", "S", `\\frac{na^2}{4${t}}=\\frac{${n}\\cdot ${num(a)}^2}{4${t}}`, rp.S, 2, true);
  if (n === 6) metric(c, "Талбай (зургаан өнцөгт)", "S", `\\frac{3\\sqrt{3}}{2}a^2=\\frac{3\\sqrt{3}}{2}\\cdot ${num(a)}^2`, rp.S, 2);
  metric(c, "Багтаасан тойргийн радиус", "R", `\\frac{a}{2\\sin\\frac{180^\\circ}{${n}}}`, rp.R);
  metric(c, "Багтсан тойргийн радиус (апофем)", "r", `\\frac{a}{2${t}}`, rp.r);
  push(c, "Дотоод өнцөг", [angRow("\\alpha", `\\frac{180^\\circ(n-2)}{n}=\\frac{180^\\circ\\cdot ${n - 2}}{${n}}`, rp.interior)], true);
  push(c, "Төв өнцөг", [angRow("\\varphi", `\\frac{360^\\circ}{n}=\\frac{360^\\circ}{${n}}`, rp.central)]);
  push(c, "Диагоналийн тоо", [row("N", `\\frac{n(n-3)}{2}=\\frac{${n}\\cdot ${n - 3}}{2}`, (n * (n - 3)) / 2)]);
  return { ok: true, prims: c.prims, metrics: c.metrics, handles: [{ id: "V", p: pts[1] }] };
}

/* ---------------- Тойрог ---------------- */

function buildCircle(p: Params, o: Opts): Built {
  const r = p.rAsD ? p.r / 2 : p.r;
  if (!(r > 0)) return { ok: false, reason: "Радиус эерэг тоо байх ёстой" };
  const th = p.theta;
  const needTh = o.cChord || o.cSector || o.cSegment || o.cCentral || o.cInscribed;
  if (needTh && !(th > 0 && th < 360)) return { ok: false, reason: "Төв өнцөг 0-ээс их, 360-аас бага байх ёстой" };
  const O = { x: 0, y: 0 };
  const c = ctx(o);
  c.prims.push({ k: "circle", c: O, r, w: 2.4 });
  pointMark(c, O, o.vertexNames ? "O" : "", null, "ink");
  const a0 = toRad(-90 - th / 2), a1 = toRad(-90 + th / 2);
  const A = polar(O, r, a0), B = polar(O, r, a1), Cp = polar(O, r, toRad(100));
  const L = (pnt: Pt, name: string) => c.o.vertexNames && c.prims.push({ k: "label", p: pnt, text: name, away: O });
  const dot = (pnt: Pt) => c.prims.push({ k: "dot", p: pnt, tone: "ink" });

  if (o.cSector) c.prims.push({ k: "region", kind: "sector", c: O, r, a0, a1 });
  if (o.cSegment) c.prims.push({ k: "region", kind: "segment", c: O, r, a0, a1, strong: true });
  if (o.cRadius) {
    const K = polar(O, r, toRad(130));
    c.prims.push({ k: "seg", a: O, b: K, w: 1.8 });
    dot(K);
    L(K, "K");
    const t = sideText(c, r, "r");
    if (t) c.prims.push({ k: "side", a: O, b: K, text: t, inside: polar(O, r, toRad(40)) });
  }
  if (o.cDiameter) {
    const M = polar(O, r, Math.PI), N = polar(O, r, 0);
    c.prims.push({ k: "seg", a: M, b: N, w: 1.8 });
    dot(M); dot(N);
    L(M, "M"); L(N, "N");
    const t = sideText(c, 2 * r, "d");
    if (t) c.prims.push({ k: "side", a: mid(O, N), b: N, text: t, inside: { x: 0, y: -r } });
  }
  if (o.cChord || o.cSegment) {
    c.prims.push({ k: "seg", a: A, b: B, w: 1.8 });
    const t = o.cChord ? sideText(c, chordLength(r, th), "") : null;
    if (t) c.prims.push({ k: "side", a: A, b: B, text: t, inside: th < 180 ? polar(O, r, toRad(-90)) : O });
  }
  if (o.cSector || o.cCentral) {
    c.prims.push({ k: "seg", a: O, b: A, w: 1.6 });
    c.prims.push({ k: "seg", a: O, b: B, w: 1.6 });
  }
  if (o.cCentral || o.cSector) {
    const am = angleMode(o);
    c.prims.push({ k: "angle", v: O, a: A, b: B, ccw: true, text: am === "letter" ? "\\theta" : am === "value" ? degLabel(th) : undefined, tone: "brand" });
  }
  if (o.cInscribed) {
    c.prims.push({ k: "seg", a: Cp, b: A, tone: "brand", w: 1.6 });
    c.prims.push({ k: "seg", a: Cp, b: B, tone: "brand", w: 1.6 });
    dot(Cp);
    L(Cp, "C");
    const am = angleMode(o);
    c.prims.push({ k: "angle", v: Cp, a: A, b: B, text: am === "value" ? degLabel(th / 2) : am === "letter" ? "\\varphi" : undefined, tone: "brand" });
  }
  if (needTh) {
    dot(A); dot(B);
    L(A, "A"); L(B, "B");
  }
  if (o.cTangent) {
    const T = polar(O, r, toRad(50));
    const d = norm(perp(sub(T, O)));
    c.prims.push({ k: "seg", a: add(T, mul(d, -1.1 * r)), b: add(T, mul(d, 1.1 * r)), tone: "brand", w: 1.8 });
    c.prims.push({ k: "seg", a: O, b: T, dash: true, tone: "dim" });
    rightMark(c, T, O, add(T, d));
    dot(T);
    L(T, "T");
  }
  let tanLen = NaN;
  if (o.cTangentExt) {
    const d = p.tanD;
    if (!(d > r)) return { ok: false, reason: "Гадна цэг тойргоос гадна байх ёстой: зай нь радиусаас их", tex: `d>r` };
    const P = { x: d, y: 0 };
    const [T1, T2] = tangentPoints(P, O, r);
    tanLen = tangentLength(d, r);
    for (const T of [T1, T2]) {
      c.prims.push({ k: "seg", a: P, b: T, tone: "brand", w: 1.8 });
      c.prims.push({ k: "seg", a: O, b: T, dash: true, tone: "dim" });
      rightMark(c, T, O, P);
      dot(T);
    }
    c.prims.push({ k: "seg", a: O, b: P, dash: true, tone: "dim" });
    if (o.marks) {
      c.prims.push({ k: "ticks", a: P, b: T1, n: 1, tone: "brand" });
      c.prims.push({ k: "ticks", a: P, b: T2, n: 1, tone: "brand" });
    }
    dot(P);
    L(P, "P"); L(T1, "T_1"); L(T2, "T_2");
  }

  const rTex = num(r);
  if (p.rAsD) metric(c, "Радиус", "r", `\\frac{d}{2}=\\frac{${num(p.r)}}{2}`, r, 1, true);
  else metric(c, "Диаметр", "d", `2r=2\\cdot ${rTex}`, 2 * r, 1, true);
  piMetric(c, "Тойргийн урт", "C", `2\\pi r=2\\pi\\cdot ${rTex}`, 2 * r, 1, true);
  piMetric(c, "Дугуйн талбай", "S", `\\pi r^2=\\pi\\cdot ${rTex}^2`, r * r, 2, true);
  if (o.cChord || o.cSegment) metric(c, "Хөвч", "AB", `2r\\sin\\frac{\\theta}{2}=2\\cdot ${rTex}\\cdot\\sin ${degTex(th / 2)}`, chordLength(r, th));
  if (needTh) piMetric(c, "Нумын урт", "l", `\\frac{\\pi r\\theta}{180^\\circ}=\\frac{\\pi\\cdot ${rTex}\\cdot ${num(th)}}{180}`, (r * th) / 180, 1);
  if (o.cSector) piMetric(c, "Секторын талбай", "S", `\\frac{\\pi r^2\\theta}{360^\\circ}=\\frac{\\pi\\cdot ${rTex}^2\\cdot ${num(th)}}{360}`, (r * r * th) / 360, 2);
  if (o.cSegment) metric(c, "Сегментийн талбай", "S", `\\frac{r^2}{2}\\left(\\frac{\\pi\\theta}{180^\\circ}-\\sin\\theta\\right)=\\frac{${rTex}^2}{2}\\left(\\frac{\\pi\\cdot ${num(th)}}{180}-\\sin ${degTex(th)}\\right)`, segmentArea(r, th), 2);
  if (o.cCentral || o.cSector) push(c, "Төв өнцөг", [angRow("\\angle AOB", "\\theta", th)]);
  if (o.cInscribed) push(c, "Тойргийн (багтсан) өнцөг", [angRow("\\angle ACB", `\\frac{\\theta}{2}=\\frac{${degTex(th)}}{2}`, th / 2)]);
  if (o.cTangent) c.metrics.push({ name: "Шүргэгч", text: "Шүргэгч нь шүргэлтийн цэгт татсан радиуст перпендикуляр" });
  if (o.cTangentExt) {
    metric(c, "Шүргэгчийн урт", "PT_1=PT_2", `\\sqrt{d^2-r^2}=\\sqrt{${num(p.tanD)}^2-${rTex}^2}`, tanLen);
    push(c, "Шүргэгчдийн хоорондох өнцөг", [angRow("\\angle T_1PT_2", "2\\arcsin\\frac{r}{d}", (2 * Math.asin(r / p.tanD) * 180) / Math.PI)]);
  }
  const handles: Handle[] = [{ id: "K", p: polar(O, r, toRad(130)) }];
  if (needTh) handles.push({ id: "B", p: B });
  if (o.cTangentExt) handles.push({ id: "P", p: { x: p.tanD, y: 0 } });
  return { ok: true, prims: c.prims, metrics: c.metrics, handles };
}

/* ---------------- Нэгдсэн оролт ---------------- */

/** pose — чирсэн гурвалжны оройн байрлал (түр, хадгалахгүй) */
export function buildShape(p: Params, o: Opts, pose?: Pt[]): Built {
  switch (p.shape) {
    case "triangle": return buildTriangle(p, o, pose);
    case "rectangle": return buildRectangle(p.rw, p.rh, o, false);
    case "square": return buildRectangle(p.sq, p.sq, o, true);
    case "parallelogram": return buildParallelogram(p.pa, p.pb, p.palpha, o, false);
    case "rhombus": {
      if (p.rhKind === "diag") {
        if (!(p.d1 > 0 && p.d2 > 0)) return { ok: false, reason: "Диагональ эерэг тоо байх ёстой" };
        const a = Math.hypot(p.d1 / 2, p.d2 / 2);
        const alpha = (2 * Math.atan(p.d2 / p.d1) * 180) / Math.PI;
        return buildParallelogram(a, a, alpha, o, true, [p.d1, p.d2]);
      }
      return buildParallelogram(p.rha, p.rha, p.rhAlpha, o, true);
    }
    case "trapezoid": return buildTrapezoid(p, o);
    case "polygon": return buildPolygon(p.n, p.pside, o);
    case "circle": return buildCircle(p, o);
  }
}

