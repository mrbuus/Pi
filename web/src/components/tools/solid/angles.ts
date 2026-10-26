/* ============================================================================
 * Өнцөг ба зай — огторгуйн геометрийн ЭЕШ-ийн хамгийн их гардаг бодлогууд:
 *   lp — шулуун ба хавтгайн хоорондох өнцөг (ирмэг-суурь, диагональ-суурь)
 *   pp — хоёр хавтгайн хоорондох өнцөг (хажуу талс-суурь)
 *   ll — хоёр шулууны хоорондох өнцөг ба зай (огтлолцдоггүй шулуун)
 *   dp — цэгээс хавтгай хүртэлх зай
 *
 * Хариуг яг хэлбэрээр: 45^\circ, \operatorname{arctg}\frac{\sqrt{2}}{2},
 * \frac{\sqrt{3}}{3}. Зурагт тэмдэглэх байгууламжийг (перпендикуляр, проекц,
 * өнцгийн нум) мөн энд тооцно — SolidScene зөвхөн зурна.
 * React-гүй, цэвэр функц.
 * ========================================================================== */

import { decTex, exactTex } from "./measure.ts";
import { resolvePoint, type PointRef } from "./section.ts";
import type { SolidModel } from "./solids.ts";
import { add, centroid, cross, dist, dot, len, mul, norm, sub, type Vec3 } from "./vec.ts";

export type MeasureKind = "lp" | "pp" | "ll" | "dp";

export const MEASURE_KINDS: { value: MeasureKind; label: string }[] = [
  { value: "lp", label: "Шулуун ба хавтгай" },
  { value: "pp", label: "Хоёр хавтгай" },
  { value: "ll", label: "Хоёр шулуун" },
  { value: "dp", label: "Цэгээс хавтгай" },
];

/** Сонгох цэгүүдийн бүлэг (UI-д: «Шулуун: A C_1», «Хавтгай: A B C») */
export const MEASURE_GROUPS: Record<MeasureKind, { name: string; count: number }[]> = {
  lp: [{ name: "Шулуун", count: 2 }, { name: "Хавтгай", count: 3 }],
  pp: [{ name: "1-р хавтгай", count: 3 }, { name: "2-р хавтгай", count: 3 }],
  ll: [{ name: "1-р шулуун", count: 2 }, { name: "2-р шулуун", count: 2 }],
  dp: [{ name: "Цэг", count: 1 }, { name: "Хавтгай", count: 3 }],
};

export const slotCount = (k: MeasureKind) => MEASURE_GROUPS[k].reduce((s, g) => s + g.count, 0);

const D2R = Math.PI / 180;
const EPS = 1e-9;

/* ----------------------------------------------- яг хэлбэр -- */

export interface AngleValue {
  deg: number;
  /** Яг хэлбэр: 45^\circ, \operatorname{arctg}\sqrt{2}. Олдохгүй бол null */
  exact: string | null;
  /** «\approx 35.26^\circ» — яг хэлбэр нь бүхэл градус бол null */
  approx: string | null;
  sin: number;
  cos: number;
}

const wrapArg = (t: string) => (/^-?\d+$|^\\frac|^\\sqrt\{\d+\}$|^\d+\\sqrt\{\d+\}$/.test(t) ? t : `\\left(${t}\\right)`);

/**
 * sin, cos (0..90°)-оос өнцгийг яг хэлбэрээр: бүхэл градус бол 60^\circ,
 * үгүй бол arctg / arcsin / arccos-оос хамгийн богино нь (тэнцвэл arctg)
 */
export function angleValue(sin: number, cos: number): AngleValue {
  const s = Math.min(1, Math.max(0, Math.abs(sin)));
  const c = Math.min(1, Math.max(0, Math.abs(cos)));
  const deg = Math.atan2(s, c) / D2R;
  const approx = `\\approx ${decTex(deg, 2)}^\\circ`;
  const k = Math.round(deg);
  if (Math.abs(deg - k) < 1e-7) return { deg, exact: `${k}^\\circ`, approx: null, sin: s, cos: c };
  const cands: string[] = [];
  if (c > 1e-12) {
    const t = exactTex(s / c);
    if (t) cands.push(`\\operatorname{arctg}${wrapArg(t)}`);
  }
  const ts = exactTex(s);
  if (ts) cands.push(`\\arcsin${wrapArg(ts)}`);
  const tc = exactTex(c);
  if (tc) cands.push(`\\arccos${wrapArg(tc)}`);
  // богино нь (тэнцвэл эрэмбээрээ: arctg, arcsin, arccos)
  let best: string | null = null;
  for (const x of cands) if (best === null || x.replace(/\\operatorname\{arctg\}|\\arcsin|\\arccos/, "").length < best.replace(/\\operatorname\{arctg\}|\\arcsin|\\arccos/, "").length) best = x;
  return { deg, exact: best, approx, sin: s, cos: c };
}

export interface DistValue {
  value: number;
  exact: string | null;
  approx: string | null;
}

export function distValue(d: number): DistValue {
  const e = exactTex(d);
  if (!e) return { value: d, exact: null, approx: `\\approx ${decTex(d, 2)}` };
  return { value: d, exact: e, approx: /\\sqrt|\\frac/.test(e) ? `\\approx ${decTex(d, 2)}` : null };
}

/* ----------------------------------------------- байгууламж -- */

export type LineRole = "main" | "main2" | "perp" | "proj" | "aux";

export interface Construction {
  /** Тэмдэглэх хэрчмүүд: main — 1-р шулуун, main2 — 2-р, perp — перпендикуляр, proj — проекц, aux — үргэлжлэл */
  lines: { a: Vec3; b: Vec3; role: LineRole; label?: string }[];
  /** Тэмдэглэх хавтгай (биеттэй огтлолцлыг нь будна) */
  planes: { n: Vec3; d: number; role: "p1" | "p2" }[];
  /** Өнцгийн нум: o оройтой, u-ээс v хүртэл (нэгж вектор), r радиус */
  arcs: { o: Vec3; u: Vec3; v: Vec3; r: number; label: string }[];
  /** Тэгш өнцгийн тэмдэг */
  rights: { o: Vec3; u: Vec3; v: Vec3; s: number }[];
  /** Онцлох цэг (суурь H, огтлолцол O) — label байхгүй бол нэрлэсэн цэг */
  points: { p: Vec3; role: "foot" | "meet" | "given" }[];
}

export interface MeasureResult {
  kind: MeasureKind;
  angle: AngleValue | null;
  dist: DistValue | null;
  /** Нэмэлт тайлбар (параллель, хавтгай дээр оршино) */
  note: string | null;
  error: string | null;
  draw: Construction;
}

const empty = (): Construction => ({ lines: [], planes: [], arcs: [], rights: [], points: [] });

/** Хавтгай n·x = d (n нэгж) */
function planeOf(a: Vec3, b: Vec3, c: Vec3): { n: Vec3; d: number } | null {
  const raw = cross(sub(b, a), sub(c, a));
  const scale = Math.max(dist(a, b) * dist(a, c), EPS);
  if (len(raw) < 1e-9 * scale) return null;
  const n = norm(raw);
  return { n, d: dot(n, a) };
}

/** u-тэй перпендикуляр, хавтгай дотор, ref руу харсан нэгж вектор */
function inPlaneToward(n: Vec3, from: Vec3, ref: Vec3): Vec3 {
  let w = sub(ref, from);
  w = sub(w, mul(n, dot(w, n)));
  if (len(w) < EPS) {
    const t: Vec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    w = cross(n, t);
  }
  return norm(w);
}

/**
 * Цэгүүдээс хэмжилт хийнэ. R — биетийн хүрээлэх радиус (нум, тэмдгийн хэмжээ).
 * Цэг дутуу, давхцсан, нэг шулуун дээр байвал error-той.
 */
export function computeMeasure(model: SolidModel, kind: MeasureKind, refs: PointRef[], R: number): MeasureResult {
  const draw = empty();
  const res = (p: Partial<MeasureResult>): MeasureResult => ({ kind, angle: null, dist: null, note: null, error: null, draw, ...p });
  const need = slotCount(kind);
  const pts = refs.slice(0, need).map((r) => resolvePoint(model, r));
  if (pts.length < need || pts.some((p) => !p)) return res({ error: "Цэгүүдээ сонгоно уу" });
  const P = pts as Vec3[];
  // ирмэг дээрх (нэргүй) цэгийг зурагт тэмдэглэнэ — нэрийг SolidScene өгнө
  refs.slice(0, need).forEach((r, i) => {
    if (!("name" in r) && !draw.points.some((x) => dist(x.p, P[i]) < 1e-9)) draw.points.push({ p: P[i], role: "given" });
  });
  const arcR = (len1: number, len2: number) => Math.max(R * 0.08, Math.min(R * 0.28, len1 * 0.4, len2 * 0.4));
  const markS = R * 0.07;

  if (kind === "dp") {
    const [Q, A, B, C] = P;
    const pl = planeOf(A, B, C);
    if (!pl) return res({ error: "Хавтгайн гурван цэг нэг шулуун дээр байна" });
    draw.planes.push({ ...pl, role: "p1" });
    const sd = dot(pl.n, Q) - pl.d;
    const H = sub(Q, mul(pl.n, sd));
    draw.points.push({ p: Q, role: "given" });
    if (Math.abs(sd) < 1e-9 * Math.max(1, R)) return res({ dist: distValue(0), note: "Цэг хавтгай дээр оршино" });
    draw.lines.push({ a: Q, b: H, role: "perp", label: "d" });
    draw.points.push({ p: H, role: "foot" });
    draw.rights.push({ o: H, u: norm(sub(Q, H)), v: inPlaneToward(pl.n, H, centroid([A, B, C])), s: markS });
    return res({ dist: distValue(Math.abs(sd)) });
  }

  if (kind === "lp") {
    const [L1, L2, A, B, C] = P;
    if (dist(L1, L2) < EPS) return res({ error: "Шулууны хоёр цэг давхцаж байна" });
    const pl = planeOf(A, B, C);
    if (!pl) return res({ error: "Хавтгайн гурван цэг нэг шулуун дээр байна" });
    const u = sub(L2, L1);
    const ul = len(u);
    const un = mul(u, 1 / ul);
    const sn = dot(un, pl.n);
    const sin = Math.abs(sn);
    const cos = len(sub(un, mul(pl.n, sn)));
    draw.planes.push({ ...pl, role: "p1" });
    draw.lines.push({ a: L1, b: L2, role: "main" });
    const angle = angleValue(sin, cos);
    if (sin < 1e-9) {
      const d1 = Math.abs(dot(pl.n, L1) - pl.d);
      return res({ angle, note: d1 < 1e-9 * Math.max(1, R) ? "Шулуун хавтгай дээр оршино" : "Шулуун хавтгайтай параллель" });
    }
    // огтлолцлын цэг O, хавтгайгаас хол төгсгөл Q, түүний проекц H
    const t = (pl.d - dot(pl.n, L1)) / dot(pl.n, u);
    const O = add(L1, mul(u, t));
    const dA = Math.abs(dot(pl.n, L1) - pl.d), dB = Math.abs(dot(pl.n, L2) - pl.d);
    const Q = dA >= dB ? L1 : L2;
    const H = sub(Q, mul(pl.n, dot(pl.n, Q) - pl.d));
    if (t < -1e-9 || t > 1 + 1e-9) draw.lines.push({ a: t < 0 ? L1 : L2, b: O, role: "aux" });
    if (!draw.points.some((x) => dist(x.p, O) < 1e-9)) draw.points.push({ p: O, role: "meet" });
    if (dist(H, O) < 1e-9 * Math.max(1, R)) {
      draw.rights.push({ o: O, u: norm(sub(Q, O)), v: inPlaneToward(pl.n, O, centroid([A, B, C])), s: markS });
      return res({ angle });
    }
    draw.lines.push({ a: Q, b: H, role: "perp" });
    draw.lines.push({ a: O, b: H, role: "proj" });
    draw.points.push({ p: H, role: "foot" });
    draw.rights.push({ o: H, u: norm(sub(Q, H)), v: norm(sub(O, H)), s: markS });
    draw.arcs.push({ o: O, u: norm(sub(Q, O)), v: norm(sub(H, O)), r: arcR(dist(O, Q), dist(O, H)), label: "\\varphi" });
    return res({ angle });
  }

  if (kind === "pp") {
    const [A1, A2, A3, B1, B2, B3] = P;
    const p1 = planeOf(A1, A2, A3), p2 = planeOf(B1, B2, B3);
    if (!p1 || !p2) return res({ error: "Хавтгайн гурван цэг нэг шулуун дээр байна" });
    draw.planes.push({ ...p1, role: "p1" }, { ...p2, role: "p2" });
    const cx = cross(p1.n, p2.n);
    const sin = len(cx);
    const cos = Math.abs(dot(p1.n, p2.n));
    const angle = angleValue(sin, cos);
    if (sin < 1e-9) {
      const d = Math.abs(dot(p1.n, B1) - p1.d);
      if (d < 1e-9 * Math.max(1, R)) return res({ angle, note: "Хоёр хавтгай давхцаж байна" });
      return res({ angle, dist: distValue(d), note: "Хавтгайнууд параллель" });
    }
    // огтлолцлын шулуун: x0 + s·e
    const e = norm(cx);
    const n12 = dot(p1.n, p2.n);
    const k = sin * sin;
    const x0 = add(mul(p1.n, (p1.d - p2.d * n12) / k), mul(p2.n, (p2.d - p1.d * n12) / k));
    // биетийн төвийн проекц — шулуун дээрх «дунд» цэг
    const c = centroid(model.body.faces.flatMap((f) => f.pts));
    const O = add(x0, mul(e, dot(sub(c, x0), e)));
    const half = R * 0.9;
    draw.lines.push({ a: sub(O, mul(e, half)), b: add(O, mul(e, half)), role: "aux" });
    const w1 = inPlaneToward(p1.n, O, centroid([A1, A2, A3]));
    let w2 = norm(cross(p2.n, e));
    const ref2 = sub(centroid([B1, B2, B3]), O);
    if (dot(w2, ref2) < 0) w2 = mul(w2, -1);
    // w1 нь e-д перпендикуляр байх ёстой
    const w1p = norm(sub(w1, mul(e, dot(w1, e))));
    if (dot(w1p, w2) < 0) w2 = mul(w2, -1); // хурц өнцгийг тэмдэглэнэ
    const r = R * 0.42;
    draw.lines.push({ a: O, b: add(O, mul(w1p, r)), role: "proj" }, { a: O, b: add(O, mul(w2, r)), role: "proj" });
    draw.points.push({ p: O, role: "meet" });
    draw.arcs.push({ o: O, u: w1p, v: w2, r: r * 0.55, label: "\\varphi" });
    return res({ angle });
  }

  // ll
  const [A1, A2, B1, B2] = P;
  if (dist(A1, A2) < EPS || dist(B1, B2) < EPS) return res({ error: "Шулууны хоёр цэг давхцаж байна" });
  const u = sub(A2, A1), v = sub(B2, B1);
  const un = norm(u), vn = norm(v);
  const cx = cross(un, vn);
  const sin = len(cx);
  const cos = Math.abs(dot(un, vn));
  const angle = angleValue(sin, cos);
  draw.lines.push({ a: A1, b: A2, role: "main" }, { a: B1, b: B2, role: "main2" });
  if (sin < 1e-9) {
    const w = sub(B1, A1);
    const d = len(sub(w, mul(un, dot(w, un))));
    if (d < 1e-9 * Math.max(1, R)) return res({ angle, dist: distValue(0), note: "Хоёр шулуун давхцаж байна" });
    const F = add(A1, mul(un, dot(w, un)));
    draw.lines.push({ a: B1, b: F, role: "perp", label: "d" });
    return res({ angle, dist: distValue(d), note: "Шулуунууд параллель" });
  }
  // ойрын цэгүүд: A1 + s u, B1 + t v
  const w0 = sub(A1, B1);
  const a = dot(u, u), b = dot(u, v), cc = dot(v, v), d0 = dot(u, w0), e0 = dot(v, w0);
  const den = a * cc - b * b;
  const s = (b * e0 - cc * d0) / den, t = (a * e0 - b * d0) / den;
  const Pa = add(A1, mul(u, s)), Pb = add(B1, mul(v, t));
  const d = dist(Pa, Pb);
  const ext = (X: Vec3, Y1: Vec3, Y2: Vec3, k: number) => {
    if (k < -1e-9) draw.lines.push({ a: Y1, b: X, role: "aux" });
    else if (k > 1 + 1e-9) draw.lines.push({ a: Y2, b: X, role: "aux" });
  };
  ext(Pa, A1, A2, s);
  if (d < 1e-9 * Math.max(1, R)) {
    ext(Pb, B1, B2, t);
    // огтлолцох: нумыг төгсгөл рүү чиглэлд
    const fu = dist(A1, Pa) > dist(A2, Pa) ? norm(sub(A1, Pa)) : norm(sub(A2, Pa));
    let fv = dist(B1, Pa) > dist(B2, Pa) ? norm(sub(B1, Pa)) : norm(sub(B2, Pa));
    if (dot(fu, fv) < 0) fv = mul(fv, -1);
    if (!draw.points.some((x) => dist(x.p, Pa) < 1e-9)) draw.points.push({ p: Pa, role: "meet" });
    draw.arcs.push({ o: Pa, u: fu, v: fv, r: arcR(len(u), len(v)), label: "\\varphi" });
    return res({ angle, dist: distValue(0), note: "Шулуунууд огтлолцоно" });
  }
  // огтлолцдоггүй: нийтлэг перпендикуляр ба Pa-аар b-тэй параллель туслах шулуун
  draw.lines.push({ a: Pa, b: Pb, role: "perp", label: "d" });
  draw.points.push({ p: Pa, role: "foot" }, { p: Pb, role: "foot" });
  const half = Math.min(len(v), R) * 0.5;
  let fv = vn;
  const fu = s > 0.5 ? mul(un, -1) : un;
  if (dot(fu, fv) < 0) fv = mul(fv, -1);
  draw.lines.push({ a: sub(Pa, mul(vn, half)), b: add(Pa, mul(vn, half)), role: "aux" });
  draw.arcs.push({ o: Pa, u: fu, v: fv, r: Math.min(half * 0.6, R * 0.22), label: "\\varphi" });
  draw.rights.push({ o: Pa, u: norm(sub(Pb, Pa)), v: fu, s: markS });
  return res({ angle, dist: distValue(d) });
}

/* ----------------------------------------------- анхдагч -- */

/** Биет бүрийн сурах бичгийн жишээ цэгүүд (хэрэглэгч шууд үр дүн харна) */
export function defaultMeasureRefs(model: SolidModel, kind: MeasureKind): PointRef[] {
  const has = (k: string) => !!model.points[k];
  const N = (...names: string[]): PointRef[] => names.map((name) => ({ name }));
  const k = model.kind;
  if (k === "cylinder" || k === "fcone") {
    const map: Record<MeasureKind, string[]> = {
      lp: ["O_1", "A", "O", "A", "B"],
      pp: ["O_1", "A", "B", "O", "A", "B"],
      ll: ["A", "A_1", "O_1", "B"],
      dp: ["O", "O_1", "A", "B"],
    };
    return N(...map[kind]);
  }
  if (k === "cone") {
    const map: Record<MeasureKind, string[]> = {
      lp: ["S", "A", "O", "A", "B"],
      pp: ["S", "A", "B", "O", "A", "B"],
      ll: ["S", "A", "S", "B"],
      dp: ["O", "S", "A", "B"],
    };
    return N(...map[kind]);
  }
  if (k === "sphere") return N(...(kind === "dp" ? ["O", "A", "A", "A"] : ["O", "A", "O", "A", "O", "A"]));
  const apex = has("S") ? "S" : k === "tetra" ? "D" : k === "octa" ? "E" : null;
  if (apex) {
    const base = k === "octa" ? ["A", "B", "C"] : ["A", "B", "C"];
    const map: Record<MeasureKind, string[]> = {
      lp: [apex, "A", ...base],
      pp: [apex, "A", "B", ...base],
      ll: [apex, "A", "B", "C"],
      dp: k === "octa" ? ["E", ...base] : k === "tetra" ? ["D", ...base] : ["A", apex, "B", "C"],
    };
    return N(...map[kind]);
  }
  // призм, куб, параллелепипед, тайрсан пирамид
  const quad = has("D");
  const map: Record<MeasureKind, string[]> = {
    lp: quad ? ["A", "C_1", "A", "B", "C"] : ["A", "B_1", "A", "B", "C"],
    pp: quad ? ["A_1", "B", "D", "A", "B", "C"] : ["A_1", "B", "C", "A", "B", "C"],
    ll: ["A", "B_1", "B", "C_1"],
    dp: quad ? ["A", "A_1", "B", "D"] : ["A", "A_1", "B", "C"],
  };
  if (k === "frustum") {
    map.lp = ["A", "A_1", "A", "B", "C"];
    map.pp = ["A", "B", "B_1", "A", "B", "C"];
    map.dp = ["A_1", "A", "B", "C"];
  }
  return N(...map[kind]);
}
