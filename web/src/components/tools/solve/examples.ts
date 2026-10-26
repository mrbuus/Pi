/* Жишээ бодлогууд (нэг дарж бөглөөд шууд бодно) */

import type { SeqSub } from "./solve.ts";

/** Үндсэн оруулгын жишээ — LaTeX (MathLive-д шууд тавина) */
export const LATEX_EXAMPLES: string[] = [
  "x^{2}-5x+6=0",
  "\\frac{1}{x}+\\frac{1}{x-1}=\\frac{3}{2}",
  "x^{2}-3x+2\\le 0",
  "2x+y=5;x-y=1",
  "\\sqrt{x+3}=x+1",
  "4^{x}-3\\cdot 2^{x}+2=0",
  "2\\sin^{2}x-3\\sin x+1=0",
  "\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(x\\sin x\\right)",
  "\\int_{0}^{1}x^{2}\\,\\mathrm{d}x",
  "\\lim_{x\\to 0}\\frac{\\sin x}{x}",
  "y=x^{3}-3x",
  "x^{3}-8",
  "\\sqrt{50}+\\sqrt{18}",
  "\\left(2a-3b\\right)^{3}",
];

export interface SeqExample {
  sub: SeqSub;
  extra: Record<string, string>;
}

/** «Бусад тооцоо» — прогресс, хослол, магадлал */
export const SEQ_EXAMPLES: SeqExample[] = [
  { sub: "arith", extra: { a1: "2", d: "3", n: "10" } },
  { sub: "geom", extra: { b1: "3", q: "2", n: "5" } },
  { sub: "geom", extra: { b1: "1", q: "1/2", n: "6" } },
  { sub: "comb", extra: { n: "10", k: "3" } },
  { sub: "prob", extra: { m: "3", n: "36" } },
  { sub: "bern", extra: { n: "5", k: "2", p: "1/6" } },
];
