/* ============================================================================
 * Бодогчийн нэг цонх: горим + дэд үйлдэл + оролт → Solution.
 * UI ба тест хоёулаа ЗӨВХӨН энэ функцийг дуудна. Ямар ч алдаа UI-г
 * унагахгүй — монгол мессеж буцаана.
 * ========================================================================== */

import { parse, parseRelation, ParseError, type Node } from "../core/expr.ts";
import { type Solution, failure, CANNOT } from "./steps.ts";
import { prepare, splitLines, InputError } from "./input.ts";
import { calculate } from "./calc.ts";
import { solveEquation } from "./equation.ts";
import { solveInequality } from "./ineq.ts";
import { solveSystem } from "./system.ts";
import { factorExpr, expandExpr, simplifyFraction, polyDivide, gcdLcm, primeFactorization } from "./algebra.ts";
import { derivative, indefiniteIntegral, definiteIntegral, limit, studyFunction } from "./calculus.ts";
import { arithmetic, geometric, combinatorics, classicalProbability, bernoulli } from "./seq.ts";

export type Mode = "calc" | "eq" | "sys" | "alg" | "an" | "seq";
export type AlgSub = "factor" | "expand" | "frac" | "div" | "gcd" | "prime";
export type AnSub = "deriv" | "int" | "defint" | "lim" | "study";
export type SeqSub = "arith" | "geom" | "comb" | "prob" | "bern";

export interface SolveRequest {
  mode: Mode;
  sub?: string;
  input: string;
  /** Нэмэлт талбарууд: order, at, a, b, to, d, q, n, k, m, p */
  extra?: Record<string, string>;
  degrees?: boolean;
}

function node(src: string, degrees = false): Node {
  return parse(prepare(src, { degrees }));
}

function run(req: SolveRequest): Solution {
  const { mode, sub, input, degrees } = req;
  const ex = req.extra ?? {};
  switch (mode) {
    case "calc":
      return calculate(input, { degrees });
    case "eq": {
      const lines = splitLines(input);
      if (lines.length > 1) return solveSystem(lines.map((l) => mustRel(l, degrees)));
      const src = prepare(input, { degrees });
      const r = parseRelation(src);
      if (!r) return solveEquation(parse(src), { t: "num", v: 0 }, { degrees });
      if (r.op === "=") return solveEquation(r.lhs, r.rhs, { degrees });
      return solveInequality(r.lhs, r.op, r.rhs, { degrees });
    }
    case "sys": {
      const lines = splitLines(input);
      return solveSystem(lines.map((l) => mustRel(l, degrees)));
    }
    case "alg":
      switch (sub as AlgSub) {
        case "factor": return factorExpr(node(input));
        case "expand": return expandExpr(node(input));
        case "frac": return simplifyFraction(node(input));
        case "div": {
          const n = node(input);
          if (n.t !== "div") return failure("Хуваах олон гишүүнтүүдээ $A/B$ эсвэл $A : B$ хэлбэрээр оруулна уу, ж: (x^3-1)/(x-1)");
          return polyDivide(n.a, n.b);
        }
        case "gcd": return gcdLcm(input);
        case "prime": return primeFactorization(input);
      }
      return failure(CANNOT);
    case "an":
      switch (sub as AnSub) {
        case "deriv": {
          const order = Number(ex.order || "1");
          const at = ex.at?.trim() ? node(ex.at) : undefined;
          return derivative(node(input), { order: Number.isFinite(order) ? order : 1, at });
        }
        case "int": return indefiniteIntegral(node(input));
        case "defint": {
          if (!ex.a?.trim() || !ex.b?.trim()) return failure("Интегралын доод ба дээд хязгаарыг оруулна уу");
          return definiteIntegral(node(input), node(ex.a), node(ex.b));
        }
        case "lim": {
          if (!ex.to?.trim()) return failure("$x$ хаашаа тэмүүлэхийг оруулна уу (тоо, inf, -inf)");
          return limit(node(input), prepare(ex.to));
        }
        case "study": return studyFunction(node(input));
      }
      return failure(CANNOT);
    case "seq":
      switch (sub as SeqSub) {
        case "arith": return arithmetic(ex.a1 ?? "", ex.d ?? "", ex.n ?? "");
        case "geom": return geometric(ex.b1 ?? "", ex.q ?? "", ex.n ?? "");
        case "comb": return combinatorics(ex.n ?? "", ex.k ?? "");
        case "prob": return classicalProbability(ex.m ?? "", ex.n ?? "");
        case "bern": return bernoulli(ex.n ?? "", ex.k ?? "", ex.p ?? "");
      }
      return failure(CANNOT);
  }
  return failure(CANNOT);
}

function mustRel(line: string, degrees?: boolean) {
  const r = parseRelation(prepare(line, { degrees }));
  if (!r) throw new InputError(`«${line}» мөр тэгшитгэл биш байна`);
  return r;
}

export function solve(req: SolveRequest): Solution {
  const needsInput = !(req.mode === "seq");
  if (needsInput && !req.input.trim()) return failure("Бодлогоо оруулна уу");
  try {
    return run(req);
  } catch (e) {
    if ((globalThis as { SOLVE_DEBUG?: boolean }).SOLVE_DEBUG && !(e instanceof ParseError) && !(e instanceof InputError)) throw e;
    if (e instanceof ParseError || e instanceof InputError) return failure(e.message, "Оролтыг шалгана уу");
    return failure(CANNOT);
  }
}
