/* ============================================================================
 * Бодолтын алхам, хариуны бүтэц ба LaTeX туслахууд (react-гүй).
 * ========================================================================== */

import { toLatex, type Node, type Relation } from "../core/expr.ts";
import { type Q, qTex } from "./q.ts";
import { type X, xtex, approx, isRational } from "./exact.ts";

export interface Step {
  /** Тайлбар (дотор нь $...$ томьёо байж болно) */
  text?: string;
  /** Тусдаа мөрийн томьёонууд */
  tex?: string[];
  /** ok — шалгалт тохирсон, bad — гаднах язгуур, note — анхааруулга */
  tone?: "ok" | "bad" | "note";
}

export interface NumberLinePoint {
  v: number;
  label: string;
  /** дүүрэн (орно) эсвэл хоосон (орохгүй) */
  filled: boolean;
}
export interface NumberLineData {
  points: NumberLinePoint[];
  /** Будах хэсгүүд: points-ийн индекс, null = ±∞ */
  segments: { from: number | null; to: number | null }[];
  /** Завсар бүрийн тэмдэг (интервалын арга), points.length+1 ширхэг */
  signs?: ("+" | "-" | "")[];
  /** Ганц цэгүүд (тусгаарлагдсан шийд) */
  isolated?: number[];
}

export interface Solution {
  ok: boolean;
  /** Бодлогын ангилал: «Квадрат тэгшитгэл» */
  title: string;
  /** Бодлогыг LaTeX-ээр */
  problem?: string;
  /** Хариу (LaTeX мөрүүд) */
  answer: string[];
  /** Аравтын ойролцоо (LaTeX) */
  approx?: string[];
  steps: Step[];
  /** Тэмдэглэл (бичвэр, $…$-тэй) */
  notes?: string[];
  numberLine?: NumberLineData;
  /** «Графикт харах» — график хэрэгслийн илэрхийллүүд (ASCII) */
  graph?: string[];
}

export function failure(message: string, title = "Бодож чадсангүй", steps: Step[] = []): Solution {
  return { ok: false, title, answer: [], steps, notes: [message] };
}

export const CANNOT = "Энэ хэлбэрийг бодож чадсангүй";

/** Сөрөг бол хаалтанд: (-3) */
export const par = (s: string) => (s.startsWith("-") ? `\\left(${s}\\right)` : s);
export const qp = (a: Q) => par(qTex(a));

/** Аравтын тоог LaTeX-ээр (6 орон хүртэл) */
export function decTex(v: number, digits = 6): string {
  if (!Number.isFinite(v)) return v > 0 ? "+\\infty" : v < 0 ? "-\\infty" : "\\text{тодорхойгүй}";
  if (Math.abs(v) < 1e-12) return "0";
  const a = Math.abs(v);
  if (a >= 1e9 || a < 1e-5) {
    const [m, e] = v.toExponential(digits - 1).split("e");
    return `${Number(m)}\\cdot 10^{${Number(e)}}`;
  }
  return String(Number(v.toFixed(digits)));
}

/** Яг тоо, рационал биш бол «≈ аравтын» нэмнэ */
export function xWithApprox(x: X): string {
  const t = xtex(x);
  return isRational(x) ? t : `${t}\\approx ${decTex(approx(x), 4)}`;
}

/* ---------- Модыг ASCII болгох (График хэрэгсэлд дамжуулна) ---------- */

const PREC: Record<string, number> = { add: 1, sub: 1, mul: 2, div: 2, neg: 3, pow: 4, fact: 5, call: 6, num: 6, sym: 6 };

export function toAscii(n: Node): string {
  const wrap = (c: Node, p: number) => {
    const s = toAscii(c);
    return PREC[c.t] < p || (c.t === "num" && c.v < 0) ? `(${s})` : s;
  };
  switch (n.t) {
    case "num": return Number.isInteger(n.v) ? String(n.v) : String(Number(n.v.toPrecision(12)));
    case "sym": return n.n;
    case "neg": return `-${wrap(n.a, 3)}`;
    case "add": return `${toAscii(n.a)}+${wrap(n.b, 1)}`;
    case "sub": return `${toAscii(n.a)}-${wrap(n.b, 2)}`;
    case "mul": return `${wrap(n.a, 2)}*${wrap(n.b, 2)}`;
    case "div": return `${wrap(n.a, 2)}/${wrap(n.b, 3)}`;
    case "pow": return `${wrap(n.a, 5)}^${wrap(n.b, 5)}`;
    case "fact": return `${wrap(n.a, 6)}!`;
    case "call": {
      if (n.f === "log") return `log(${toAscii(n.args[0])},${toAscii(n.args[1])})`;
      const name = n.f === "tan" ? "tan" : n.f === "cot" ? "cot" : n.f;
      return `${name}(${n.args.map(toAscii).join(",")})`;
    }
  }
}

/** Харьцааг LaTeX: core-ийн relationLatex нь «\\ge x»-ийг «\\gex» гэж нийлүүлдэг тул өөрийн хувилбар */
export function relTex(r: Relation): string {
  const op = { "=": "=", "<": "<", ">": ">", "<=": "\\le", ">=": "\\ge" }[r.op];
  return `${toLatex(r.lhs)} ${op} ${toLatex(r.rhs)}`;
}
