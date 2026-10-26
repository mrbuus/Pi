/* ============================================================================
 * Бодогчийн АВТОМАТ таних: нэг оруулга → төрөл (тэгшитгэл, тэнцэтгэл биш,
 * систем, тоо, илэрхийлэл, функц, матанализ) ба тохирох үйлдлүүд.
 * Хэрэглэгч горим сонгохгүй — анхдагч үйлдэл автоматаар, бусад нь чипээр.
 *
 * Бодолт өөрөө solve.ts-ийн хуучин горимуудаар (eq/sys/calc/alg/an) хийгдэнэ —
 * энд зөвхөн аль горимыг дуудахыг шийднэ. React-гүй, тестлэгдэнэ.
 * ========================================================================== */

import { parse, parseRelation, freeSymbols, type Node } from "../core/expr.ts";
import { prepare, splitLines } from "./input.ts";
import { mfrom, mtotalDeg } from "./mpoly.ts";
import { toAscii } from "./steps.ts";
import type { SolveRequest } from "./solve.ts";
import type { CalcSpec } from "./latex.ts";

export type Action =
  | "solve" | "calc" | "factor" | "expand" | "frac" | "div"
  | "deriv" | "int" | "defint" | "lim" | "study" | "prime" | "gcd";

export type Kind =
  | "empty" | "number" | "intlist" | "equation" | "inequality" | "system"
  | "function" | "expression" | "calculus" | "invalid";

export interface Analysis {
  kind: Kind;
  /** Тохирох үйлдлүүд (чип), эхнийх нь анхдагч */
  actions: Action[];
  primary: Action;
  /** Бодох бичвэр (функцэд y= -ийн баруун тал, матанализад доторх функц) */
  body: string;
  /** Матанализын нэмэлт: эрэмбэ, хязгаар */
  extra: Record<string, string>;
  /** Графикт дамжуулж болох илэрхийллүүд (бодохоос өмнө) */
  graph: string[];
  /** Ганц хувьсагч x-ийн функц мөн эсэх (Уламжлал, Интеграл …) */
  inX: boolean;
}

export const ACTION_LABEL: Record<Action, string> = {
  solve: "Бодох",
  calc: "Бодох",
  factor: "Задлах",
  expand: "Хаалт задлах",
  frac: "Хялбарчлах",
  div: "Олон гишүүнт хуваах",
  deriv: "Уламжлал",
  int: "Интеграл",
  defint: "Тодорхой интеграл",
  lim: "Хязгаар",
  study: "Функцийн судалгаа",
  prime: "Анхны үржвэр",
  gcd: "ХИЕХ, ХБЕХ",
};

const EMPTY: Analysis = { kind: "empty", actions: [], primary: "solve", body: "", extra: {}, graph: [], inX: false };

function hasVar(n: Node, v?: string): boolean {
  const s = freeSymbols(n);
  return v ? s.has(v) : s.size > 0;
}

/** Хаалт задлах хэрэгтэй юу: (…)(…), k(…), (…)^n — нийлбэр үржигдэхүүн дотор */
function needsExpand(n: Node): boolean {
  const isSum = (m: Node) => (m.t === "add" || m.t === "sub") && hasVar(m);
  const walk = (m: Node): boolean => {
    switch (m.t) {
      case "mul": return isSum(m.a) || isSum(m.b) || walk(m.a) || walk(m.b);
      case "pow": return (isSum(m.a) && m.b.t === "num") || walk(m.a);
      case "neg": return isSum(m.a) || walk(m.a);
      case "add": case "sub": case "div": return walk(m.a) || walk(m.b);
      default: return false;
    }
  };
  return walk(n);
}

/** Хуваарьт хувьсагчтай бутархай байгаа эсэх */
function hasVarDenominator(n: Node): boolean {
  switch (n.t) {
    case "div": return hasVar(n.b) || hasVarDenominator(n.a) || hasVarDenominator(n.b);
    case "pow": return (n.b.t === "neg" || (n.b.t === "num" && n.b.v < 0)) && hasVar(n.a);
    case "add": case "sub": case "mul": return hasVarDenominator(n.a) || hasVarDenominator(n.b);
    case "neg": return hasVarDenominator(n.a);
    default: return false;
  }
}

const isPoly = (n: Node) => mfrom(n) !== null;

/** x-ийн функцэд тохирох үйлдлүүд */
const CALC_ACTIONS: Action[] = ["deriv", "int", "study", "lim"];

function analyzeExpr(text: string, node: Node): Analysis {
  const vars = [...freeSymbols(node)];
  if (vars.length === 0) {
    const actions: Action[] = ["calc"];
    if (/^\s*\d+\s*$/.test(text) && Number(text) > 1 && Number(text) < 1e12) actions.push("prime");
    return { ...EMPTY, kind: "number", actions, primary: "calc", body: text };
  }
  const inX = vars.length === 1 && vars[0] === "x";
  const graph = inX ? [toAscii(node)] : [];
  const actions: Action[] = [];
  let primary: Action;
  if (isPoly(node)) {
    const mp = mfrom(node)!;
    const deg = mtotalDeg(mp);
    const exp = needsExpand(node);
    if (exp) actions.push("expand");
    if (deg >= 2) actions.push("factor");
    if (!exp && deg < 2) actions.push("expand");
    primary = actions[0];
  } else if (hasVarDenominator(node)) {
    actions.push("frac");
    if (node.t === "div" && isPoly(node.a) && isPoly(node.b)) actions.push("div");
    primary = "frac";
  } else {
    if (needsExpand(node)) actions.push("expand");
    primary = inX ? "deriv" : actions[0] ?? "expand";
    if (!actions.length && !inX) actions.push("expand");
  }
  if (inX) for (const a of CALC_ACTIONS) if (!actions.includes(a)) actions.push(a);
  if (!actions.includes(primary)) actions.unshift(primary);
  // анхдагчийг эхэнд
  const ordered = [primary, ...actions.filter((a) => a !== primary)];
  return { kind: "expression", actions: ordered, primary, body: text, extra: {}, graph, inX };
}

/** «y = …» эсвэл «f(x) = …» хэлбэр */
const FUNC_RE = /^\s*(?:y|f\s*\(\s*x\s*\))\s*=(?![=<>])([\s\S]+)$/;

export function analyze(text: string, calc?: CalcSpec | null): Analysis {
  const src = text.trim();
  if (calc) {
    const body = calc.body;
    let inX = false, graph: string[] = [];
    try {
      const n = parse(prepare(body));
      const vs = [...freeSymbols(n)];
      inX = vs.length <= 1 && (vs.length === 0 || vs[0] === "x");
      graph = inX ? [toAscii(n)] : [];
    } catch {
      /* бодох үед алдааг харуулна */
    }
    const extra: Record<string, string> = {};
    if (calc.order) extra.order = String(calc.order);
    if (calc.a !== undefined) extra.a = calc.a;
    if (calc.b !== undefined) extra.b = calc.b;
    if (calc.to !== undefined) extra.to = calc.to;
    const others = inX ? (["deriv", "int", "study"] as Action[]).filter((a) => a !== calc.kind) : [];
    return { kind: "calculus", actions: [calc.kind, ...others], primary: calc.kind, body, extra, graph, inX };
  }
  if (!src) return EMPTY;

  // систем: олон мөр эсвэл «;»
  const lines = splitLines(src);
  if (lines.length > 1) {
    const allRel = lines.every((l) => /[=<>]/.test(l));
    if (allRel) {
      let graph: string[] = [];
      try {
        const ok = lines.every((l) => {
          const r = parseRelation(prepare(l));
          if (!r) return false;
          const vs = new Set([...freeSymbols(r.lhs), ...freeSymbols(r.rhs)]);
          return [...vs].every((v) => v === "x" || v === "y");
        });
        if (ok) graph = lines.map((l) => prepare(l));
      } catch {
        graph = [];
      }
      return { ...EMPTY, kind: "system", actions: ["solve"], primary: "solve", body: lines.join("\n"), graph };
    }
  }

  // ХИЕХ: «12, 18, 30»
  if (/^\s*\d+(\s*,\s*\d+)+\s*$/.test(src)) {
    return { ...EMPTY, kind: "intlist", actions: ["gcd"], primary: "gcd", body: src };
  }

  // y = f(x)
  const fm = FUNC_RE.exec(src);
  if (fm) {
    try {
      const n = parse(prepare(fm[1]));
      const vs = [...freeSymbols(n)];
      if (vs.every((v) => v === "x")) {
        const a = analyzeExpr(fm[1].trim(), n);
        const extraActs = a.actions.filter((x) => x !== "study" && x !== "lim" && x !== "expand" && x !== "frac");
        return {
          kind: "function",
          actions: ["study", ...extraActs, "lim"].filter((x, i, arr) => arr.indexOf(x) === i) as Action[],
          primary: "study",
          body: fm[1].trim(),
          extra: {},
          graph: [toAscii(n)],
          inX: true,
        };
      }
    } catch {
      /* доор энгийн тэгшитгэл гэж үзнэ */
    }
  }

  let rel = null;
  try {
    rel = parseRelation(prepare(src));
  } catch {
    return { ...EMPTY, kind: "invalid", actions: ["solve"], primary: "solve", body: src };
  }
  if (rel) {
    const ineq = rel.op !== "=";
    const vs = new Set([...freeSymbols(rel.lhs), ...freeSymbols(rel.rhs)]);
    const inX = vs.size === 1 && vs.has("x");
    const graph = inX ? [toAscii(rel.lhs), toAscii(rel.rhs)].filter((s, i) => !(i === 1 && s === "0")) : [];
    return { ...EMPTY, kind: ineq ? "inequality" : "equation", actions: ["solve"], primary: "solve", body: src, graph, inX };
  }

  let node: Node;
  try {
    node = parse(prepare(src));
  } catch {
    return { ...EMPTY, kind: "invalid", actions: ["calc"], primary: "calc", body: src };
  }
  return analyzeExpr(src, node);
}

/** Үйлдлийг бодогчийн хүсэлт болгоно */
export function toRequest(a: Analysis, action: Action, extra: Record<string, string>, degrees: boolean): SolveRequest {
  const ex = { ...a.extra, ...extra };
  switch (action) {
    case "solve":
      return a.kind === "system" ? { mode: "sys", input: a.body, degrees } : { mode: "eq", input: a.body, degrees };
    case "calc":
      return { mode: "calc", input: a.body, degrees };
    case "factor": case "expand": case "frac": case "div": case "gcd": case "prime":
      return { mode: "alg", sub: action, input: a.body, degrees };
    case "deriv": case "int": case "defint": case "lim": case "study":
      return { mode: "an", sub: action, input: a.body, extra: ex, degrees };
  }
}
