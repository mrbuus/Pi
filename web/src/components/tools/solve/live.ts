/* ============================================================================
 * Бичиж байх зуурх АВТОМАТ бодолт (Photomath маяг) — react-гүй, тестлэгдэнэ.
 *
 *   liveSolve(latex) →
 *     empty       — юу ч бичээгүй
 *     incomplete  — хоосон нүд, хаалт хаагдаагүй, «2+» гэх мэт: юу ч ХАРУУЛАХГҮЙ
 *     error       — бүрэн бөгөөд буруу: зөөлөн «Оролтыг шалгана уу»
 *     implicit    — x, y-тэй, y-ээр шийдэгдэхгүй: «График дээр харах»
 *     need        — нэмэлт утга хэрэгтэй (хязгаарт x хаашаа г.м.)
 *     done        — хариу бэлэн (sol.ok=false бол «бодож чадсангүй» үнэнээр)
 * ========================================================================== */

import { compile, niceTex, parse, toLatex } from "../core/expr.ts";
import { analyze, toRequest, type Action, type Analysis } from "./auto.ts";
import { prepare } from "./input.ts";
import { isIncomplete, readLatex } from "./latex.ts";
import { decTex } from "./steps.ts";
import { solve, type SolveRequest } from "./solve.ts";
import type { Solution } from "./steps.ts";

export type Live =
  | { status: "empty" }
  | { status: "incomplete" }
  | { status: "error"; message: string }
  | { status: "implicit"; analysis: Analysis }
  | { status: "need"; analysis: Analysis; action: Action }
  | { status: "done"; analysis: Analysis; action: Action; sol: Solution };

export function safeSolve(req: SolveRequest): Solution {
  try {
    return solve(req);
  } catch {
    return { ok: false, title: "Бодож чадсангүй", answer: [], steps: [], notes: ["Энэ хэлбэрийг бодож чадсангүй"] };
  }
}

/** Оруулгыг уншиж төрлийг таних */
export function readInput(latex: string, plain = false): { analysis: Analysis | null; error: string | null; incomplete: boolean } {
  if (!latex.trim()) return { analysis: null, error: null, incomplete: false };
  try {
    const r = plain ? { text: latex, calc: null } : readLatex(latex);
    return { analysis: analyze(r.text, r.calc), error: null, incomplete: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Бодлогыг ойлгосонгүй";
    return { analysis: null, error: message, incomplete: isIncomplete(e) };
  }
}

/** Үйлдэлд шаардлагатай нэмэлт утга (оруулгаас эсвэл гараас); дутуу бол null */
export function paramsFor(action: Action, an: Analysis, params: Record<string, string> = {}): Record<string, string> | null {
  const p = (k: string) => (params[k] ?? "").trim();
  if (action === "lim") {
    const to = an.extra.to ?? p("to");
    return to ? { to } : null;
  }
  if (action === "defint") {
    const a = an.extra.a ?? p("a"), b = an.extra.b ?? p("b");
    return a && b ? { a, b } : null;
  }
  if (action === "deriv") {
    const out: Record<string, string> = {};
    if (an.extra.order) out.order = an.extra.order;
    else if (p("order") && p("order") !== "1") out.order = p("order");
    if (p("at")) out.at = p("at");
    return out;
  }
  return {};
}

/** «15%» гэх мэт хувьтай тоонд аравтын хэлбэрийг нэмнэ (0.15) */
function withPercent(sol: Solution, an: Analysis, latex: string): Solution {
  if (!sol.ok || an.kind !== "number" || !/\\%/.test(latex)) return sol;
  try {
    const v = compile(parse(prepare(an.body)))({});
    if (!Number.isFinite(v)) return sol;
    const d = decTex(v, 6);
    if (sol.answer.some((a) => a.replace(/\s/g, "").endsWith(`=${d}`))) return sol;
    return { ...sol, answer: [...sol.answer, `= ${d}`] };
  } catch {
    return sol;
  }
}

/** (2x)^2 = y → эхний алхам «y-ээр илэрхийлбэл y = 4x^2» */
function withYStep(sol: Solution, fr: { rel: string; y: string }): Solution {
  return { ...sol, steps: [{ text: "$y$-ээр илэрхийлбэл", tex: [fr.rel, fr.y] }, ...sol.steps] };
}

/** x-ийн илэрхийлэл ямар ч x-д ижил утгатай бол (sin^2 x + cos^2 x = 1) тэр утгаар хариулна */
function constantIdentity(an: Analysis, degrees: boolean): Solution | null {
  if (an.kind !== "expression" || !an.inX || an.primary !== "deriv") return null;
  try {
    const node = parse(prepare(an.body, { degrees }));
    const f = compile(node, { degrees });
    const xs = [0.37, 1.3, 2.1, -0.8, 3.7, -2.45];
    const vs = xs.map((x) => f({ x }));
    if (!vs.every(Number.isFinite)) return null;
    const v = vs[0];
    if (!vs.every((y) => Math.abs(y - v) < 1e-9 * (1 + Math.abs(v)))) return null;
    const p = toLatex(node), r = niceTex(v);
    return {
      ok: true,
      title: "Хялбарчлах",
      problem: p,
      answer: [`${p} = ${r}`],
      steps: [{ text: "$x$-ийн ямар ч утгад илэрхийлэл ижил утгатай (адилтгал)", tex: [`${p} = ${r}`] }],
    };
  } catch {
    return null;
  }
}

/** Бодолт амжилтгүй бөгөөд шалтгаан нь «дутуу оролт» мөн эсэх */
function failedIncomplete(sol: Solution): boolean {
  return !sol.ok && (sol.notes ?? []).some((n) => isIncomplete(n));
}

/** Задлагчийн мессеж дэх «*» → «×» (хэрэглэгч × товч дарсан) */
const tidyMsg = (m: string) => m.replace(/«\*»/g, "«$\\times$»");

export function liveSolve(
  latex: string,
  opts: { plain?: boolean; degrees?: boolean; action?: Action; params?: Record<string, string> } = {},
): Live {
  if (!latex.trim()) return { status: "empty" };
  const { analysis, error, incomplete } = readInput(latex, opts.plain);
  if (!analysis) return incomplete ? { status: "incomplete" } : { status: "error", message: tidyMsg(error ?? "Бодлогыг ойлгосонгүй") };
  if (analysis.kind === "implicit") return { status: "implicit", analysis };
  const action = opts.action && analysis.actions.includes(opts.action) ? opts.action : analysis.primary;
  const extra = paramsFor(action, analysis, opts.params);
  if (!extra) return { status: "need", analysis, action };
  const ident = !opts.action ? constantIdentity(analysis, !!opts.degrees) : null;
  if (ident) return { status: "done", analysis, action, sol: ident };
  let sol = withPercent(safeSolve(toRequest(analysis, action, extra, !!opts.degrees)), analysis, latex);
  if (analysis.fromRelation) sol = withYStep(sol, analysis.fromRelation);
  if (failedIncomplete(sol)) return { status: "incomplete" };
  if (!sol.ok && (sol.title === "Оролтыг шалгана уу" || analysis.kind === "invalid")) return { status: "error", message: tidyMsg(sol.notes?.[0] ?? "Бодлогыг ойлгосонгүй") };
  return { status: "done", analysis, action, sol };
}
