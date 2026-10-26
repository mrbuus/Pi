/* ============================================================================
 * Тэнцэтгэл биш — интервалын арга.
 *
 * F = L - R. F-ийн бүх тэг (тэгшитгэлийн бодогчоор, БҮРЭН байх ёстой) ба
 * тасралт/тодорхойлогдох мужийн хил (хуваарь, язгуурын доорх, логарифмын
 * доорх илэрхийллийн тэг)-ийг олж, завсар бүрт тэмдгийг шалгана.
 * Цэг бүрт F-ийг ЯГ тооцоолж оруулах эсэхийг шийднэ.
 * ========================================================================== */

import { toLatex, type Node, type RelOp } from "../core/expr.ts";
import { type Q, qTex, neg as qneg, div as qdiv, isZ } from "./q.ts";
import { isZero, xsign, xlabel, approx } from "./exact.ts";
import { polyFrom, deg, ptex } from "./poly.ts";
import { type Root, mergeRoots } from "./roots.ts";
import { N, dep, collect, findZeros, numAt, exactAt, pickVar, type Zeros } from "./equation.ts";
import { type Step, type Solution, type NumberLineData, failure, CANNOT, toAscii, decTex, relTex } from "./steps.ts";

export interface Piece {
  /** null = -∞ / +∞ */
  a: Root | null;
  b: Root | null;
  aClosed: boolean;
  bClosed: boolean;
}

const OPTEX: Record<RelOp, string> = { "=": "=", "<": "<", ">": ">", "<=": "\\le", ">=": "\\ge" };
const FLIP: Record<RelOp, RelOp> = { "=": "=", "<": ">", ">": "<", "<=": ">=", ">=": "<=" };

function sat(s: number, op: RelOp): boolean {
  if (Number.isNaN(s)) return false;
  switch (op) {
    case "<": return s < 0;
    case ">": return s > 0;
    case "<=": return s <= 0;
    case ">=": return s >= 0;
    default: return s === 0;
  }
}

/** Завсрын нэгдлийг LaTeX: (-\infty;-2)\cup[1;+\infty) */
export function piecesTex(ps: Piece[]): string {
  if (!ps.length) return "\\varnothing";
  return ps
    .map((p) => {
      if (p.a && p.b && p.aClosed && p.bClosed && Math.abs(p.a.v - p.b.v) < 1e-12) return `\\left\\{${p.a.tex}\\right\\}`;
      const l = p.a ? `${p.aClosed ? "\\left[" : "\\left("}${p.a.tex}` : "\\left(-\\infty";
      const r = p.b ? `${p.b.tex}${p.bClosed ? "\\right]" : "\\right)"}` : "+\\infty\\right)";
      return `${l};\\ ${r}`;
    })
    .join("\\cup ");
}

/** Тасралт / тодорхойлогдох мужийн хилийн илэрхийллүүд */
export function breakExprs(F: Node, v: string): Node[] {
  const out: Node[] = [];
  collect(F, (n) => {
    if (n.t === "div" && dep(n.b, v)) out.push(n.b);
    if (n.t === "call" && (n.f === "sqrt" || n.f === "ln" || n.f === "lg" || n.f === "abs" || n.f === "tan" || n.f === "cot") && dep(n.args[0], v)) out.push(n.args[0]);
    if (n.t === "call" && (n.f === "log" || n.f === "root") && dep(n.args[1], v)) out.push(n.args[1]);
    if (n.t === "pow" && dep(n.a, v) && !dep(n.b, v)) out.push(n.a);
    return false;
  });
  return out;
}

export interface SignAnalysis {
  points: Root[];
  /** завсар бүрийн тэмдэг (+1, -1, 0, NaN), points.length + 1 */
  signs: number[];
  /** цэг бүрийн утгын тэмдэг (NaN = тодорхойгүй) */
  pointSigns: number[];
  zeros: Root[];
}

/** F-ийн тэмдгийн хүснэгт. Чадахгүй бол null */
export function signAnalysis(F: Node, v: string, degrees: boolean, zeroSteps?: Step[]): SignAnalysis | null {
  const z: Zeros = findZeros(F, { v, degrees, steps: zeroSteps ?? [], quiet: !zeroSteps, depth: 0 });
  if (z.kind !== "finite" || !z.complete) return null;
  const pts: Root[] = [...z.roots];
  for (const s of z.segments ?? []) pts.push(s.a, s.b);
  for (const e of breakExprs(F, v)) {
    if (e.t === "call" && (e.f === "tan" || e.f === "cot")) return null;
    const bz = findZeros(e, { v, degrees, steps: [], quiet: true, depth: 0 });
    if (bz.kind !== "finite" || !bz.complete) {
      // хувьсагчгүй эсвэл тэггүй хил — зүгээр
      if (bz.kind === "finite" && bz.all) continue;
      return null;
    }
    pts.push(...bz.roots);
    for (const s of bz.segments ?? []) pts.push(s.a, s.b);
  }
  const points = mergeRoots(pts).map((r) => ({ ...r, mult: 1 }));
  const signs: number[] = [];
  for (let i = 0; i <= points.length; i++) {
    const lo = i > 0 ? points[i - 1].v : null, hi = i < points.length ? points[i].v : null;
    const t = lo !== null && hi !== null ? (lo + hi) / 2 : lo !== null ? lo + Math.max(1, Math.abs(lo)) : hi !== null ? hi - Math.max(1, Math.abs(hi)) : 0.5;
    const y = numAt(F, v, t, degrees);
    signs.push(Number.isFinite(y) ? (Math.abs(y) < 1e-13 ? 0 : Math.sign(y)) : NaN);
  }
  const zeroSet = z.roots;
  const pointSigns = points.map((p) => {
    if (p.x) {
      const ex = exactAt(F, v, p.x, degrees);
      if (ex === "nan") return NaN;
      if (ex) return isZero(ex) ? 0 : xsign(ex);
    }
    if (zeroSet.some((r) => Math.abs(r.v - p.v) < 1e-9 * Math.max(1, Math.abs(p.v)))) return 0;
    const y = numAt(F, v, p.v, degrees);
    return Number.isFinite(y) ? Math.sign(y) : NaN;
  });
  return { points, signs, pointSigns, zeros: z.roots };
}

/** Тэмдгийн хүснэгтээс хариуны завсрууд */
export function piecesFrom(sa: SignAnalysis, op: RelOp): Piece[] {
  const { points, signs, pointSigns } = sa;
  type Item = { kind: "int"; i: number; ok: boolean } | { kind: "pt"; i: number; ok: boolean };
  const items: Item[] = [];
  for (let i = 0; i <= points.length; i++) {
    items.push({ kind: "int", i, ok: sat(signs[i], op) });
    if (i < points.length) items.push({ kind: "pt", i, ok: sat(pointSigns[i], op) });
  }
  const out: Piece[] = [];
  let k = 0;
  while (k < items.length) {
    if (!items[k].ok) { k++; continue; }
    let j = k;
    while (j + 1 < items.length && items[j + 1].ok) j++;
    const s = items[k], e = items[j];
    const a = s.kind === "pt" ? points[s.i] : s.i > 0 ? points[s.i - 1] : null;
    const b = e.kind === "pt" ? points[e.i] : e.i < points.length ? points[e.i] : null;
    out.push({ a, b, aClosed: s.kind === "pt", bClosed: e.kind === "pt" });
    k = j + 1;
  }
  return out;
}

export function numberLineFrom(sa: SignAnalysis, pieces: Piece[]): NumberLineData {
  const label = (r: Root) => (r.x ? xlabel(r.x) : String(Number(r.v.toFixed(2))));
  const points = sa.points.map((p, i) => ({
    v: p.v,
    label: label(p),
    filled: pieces.some((pc) => (pc.a === p && pc.aClosed) || (pc.b === p && pc.bClosed)) && !Number.isNaN(sa.pointSigns[i]),
  }));
  const idx = (r: Root | null) => (r ? sa.points.indexOf(r) : null);
  const segments: NumberLineData["segments"] = [];
  const isolated: number[] = [];
  for (const pc of pieces) {
    if (pc.a && pc.b && pc.a === pc.b) isolated.push(sa.points.indexOf(pc.a));
    else segments.push({ from: idx(pc.a), to: idx(pc.b) });
  }
  const signs = sa.signs.map((s) => (s > 0 ? "+" : s < 0 ? "-" : "")) as ("+" | "-" | "")[];
  return { points, segments, signs, isolated };
}

/* ---------- Дээд түвшин ---------- */

export interface IneqOpts {
  v?: string;
  degrees?: boolean;
}

export function solveInequality(lhs: Node, op: RelOp, rhs: Node, opts: IneqOpts = {}): Solution {
  const problem = relTex({ lhs, op, rhs });
  const { v, extra } = pickVar([lhs, rhs], opts.v);
  if (!v) return failure("Тэнцэтгэл бишид үл мэдэгдэгч алга");
  if (extra.length) return failure(`Нэг үл мэдэгдэгчтэй тэнцэтгэл биш оруулна уу ($${extra.join(",\\ ")}$ илүү байна)`);
  const degrees = !!opts.degrees;
  const F = N.sub(lhs, rhs);
  const steps: Step[] = [];
  const graph = [toAscii(lhs), toAscii(rhs)].filter((s, i) => !(i === 1 && s === "0"));
  const p = polyFrom(F, v);
  let title = "Тэнцэтгэл биш";
  const hasAbs = collect(F, (n) => n.t === "call" && n.f === "abs" && dep(n, v)).length > 0;
  const hasRad = collect(F, (n) => n.t === "call" && (n.f === "sqrt" || n.f === "root") && dep(n, v)).length > 0;
  const hasLogExp = collect(F, (n) => (n.t === "call" && ["ln", "lg", "log", "exp"].includes(n.f) && dep(n, v)) || (n.t === "pow" && dep(n.b, v))).length > 0;
  const hasTrig = collect(F, (n) => n.t === "call" && ["sin", "cos", "tan", "cot"].includes(n.f) && dep(n, v)).length > 0;
  if (hasTrig) return { ...failure(`${CANNOT}: тригонометрийн тэнцэтгэл бишийг одоогоор бодохгүй`), problem, graph };

  // Шугаман: тусгай тодорхой алхам
  if (p && deg(p) === 1) {
    const [b, a] = p;
    const r: Q = qdiv(qneg(b), a);
    const op2 = a.n < 0 ? FLIP[op] : op;
    const lines = [`${ptex(p, v)} ${OPTEX[op]} 0`];
    if (!isZ(b)) lines.push(`${ptex([{ n: 0, d: 1 }, a], v)} ${OPTEX[op]} ${qTex(qneg(b))}`);
    lines.push(`${v} ${OPTEX[op2]} ${qTex(r)}`);
    steps.push({ text: "Шугаман тэнцэтгэл биш: үл мэдэгдэгчийг нэг талд шилжүүлээд коэффициентэд хуваана", tex: lines });
    if (a.n < 0) steps.push({ text: "Сөрөг тоонд хуваахад тэнцэтгэл бишийн тэмдэг эсрэгээр солигдоно", tone: "note" });
    title = "Шугаман тэнцэтгэл биш";
  }

  const zsteps: Step[] = [];
  const sa = signAnalysis(F, v, degrees, zsteps);
  if (!sa) return { ...failure(CANNOT, CANNOT, steps), problem, graph };
  const pieces = piecesFrom(sa, op);

  if (!(p && deg(p) === 1)) {
    if (p && deg(p) === 2) {
      title = "Квадрат тэнцэтгэл биш";
      steps.push({ text: `Харгалзах тэгшитгэл $${ptex(p, v)} = 0$-ийг бодно` }, ...zsteps);
      const a = p[2];
      steps.push({
        text: `$y = ${ptex(p, v)}$ парабол${a.n > 0 ? "ын салаа дээшээ ($a>0$)" : "ын салаа доошоо ($a<0$)"} тул тэмдэг нь язгууруудын хооронд ба гадна талд ялгаатай`,
      });
    } else {
      if (hasAbs) title = "Модультай тэнцэтгэл биш";
      else if (hasRad) title = "Иррациональ тэнцэтгэл биш";
      else if (hasLogExp) title = "Үзүүлэнт, логарифм тэнцэтгэл биш";
      else if (p) title = `${deg(p)}-р зэргийн тэнцэтгэл биш`;
      else title = "Рационал тэнцэтгэл биш";
      if (!p && !hasAbs && !hasRad && !hasLogExp) title = "Рационал тэнцэтгэл биш (интервалын арга)";
      steps.push({ text: `Зүүн тал руу шилжүүлбэл $${toLatex(F)} ${OPTEX[op]} 0$. Тэгтэй тэнцэх цэгүүдийг олно` }, ...zsteps);
    }
    const crit = sa.points.map((pt, i) => {
      const s = sa.pointSigns[i];
      const kind = Number.isNaN(s) ? "тодорхойлогдохгүй" : s === 0 ? "тэг" : "хил";
      return `$${pt.tex}$ (${kind})`;
    });
    if (sa.points.length) steps.push({ text: `Тоон шулууныг хуваах цэгүүд: ${crit.join(", ")}` });
    const signTxt = sa.signs.map((s, i) => {
      const lo = i > 0 ? sa.points[i - 1].tex : "-\\infty", hi = i < sa.points.length ? sa.points[i].tex : "+\\infty";
      const st = Number.isNaN(s) ? "тодорхойлогдохгүй" : s > 0 ? "$+$" : s < 0 ? "$-$" : "$0$";
      return `$(${lo};\\ ${hi})$: ${st}`;
    });
    steps.push({ text: `Завсар бүрт нэг цэгийг орлуулж тэмдгийг тогтооно: ${signTxt.join(", ")}` });
    if (op === "<=" || op === ">=") steps.push({ text: "Тэнцэтгэл бишийн тэмдэг хатуу биш тул тэг болох цэгүүд орно (тасралтын цэг орохгүй)", tone: "note" });
  }

  const ans = piecesTex(pieces);
  const full = pieces.length === 1 && !pieces[0].a && !pieces[0].b;
  const answer = [full ? `${v}\\in\\mathbb{R}` : `${v}\\in ${ans}`];
  const ap = sa.points.filter((x) => x.x && !(x.x.length <= 1 && x.x[0]?.n === 1 && x.x[0]?.pi === 0 && x.x[0]?.e === 0)).map((x) => `${x.tex} \\approx ${decTex(approx(x.x!), 4)}`);
  const notes: string[] = [];
  if (!pieces.length) notes.push("Шийдгүй");
  if (sa.points.some((x) => !x.x && x.tex.startsWith("\\approx"))) notes.push("Зарим хилийн цэгийг тоон аргаар (ойролцоогоор) олсон");
  return {
    ok: true, title, problem, steps, answer, approx: ap.length ? ap : undefined, notes: notes.length ? notes : undefined,
    numberLine: numberLineFrom(sa, pieces), graph,
  };
}
