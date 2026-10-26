/* ============================================================================
 * Хариуг дэлгэцэнд цэвэрхэн харуулах (зөвхөн харагдац — тооцоо өөрчлөхгүй):
 *   - хэт олон оронтой аравтын тоог 2-3 орон болгоно (3.605551 → 3.61)
 *   - «бодлого = хариу» мөрөөс бодлогыг хасаж зөвхөн хариуг үлдээнэ
 *   - холимог тоог (2\frac{1}{3}) үндсэн хариунаас дэлгэрэнгүй рүү
 *   - утгагүй ойролцоо («0 \approx 0»)-г хасна
 * ========================================================================== */

import type { Solution } from "./steps.ts";

/** Нэг аравтын тоог богиносгоно: |v|>=1 → 2 орон, |v|<1 → 3 цифр */
export function shortDec(s: string): string {
  const v = Number(s);
  if (!Number.isFinite(v)) return s;
  const a = Math.abs(v);
  let out: string;
  if (a >= 1) out = v.toFixed(2);
  else out = Number(v.toPrecision(3)).toString();
  if (out.includes(".")) out = out.replace(/0+$/, "").replace(/\.$/, "");
  if (/e/i.test(out)) out = v.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return out;
}

/** LaTeX дотор 4+ орны бутархай хэсэгтэй тоо бүрийг богиносгоно */
export function tidyTex(tex: string): string {
  return tex.replace(/(\d+\.\d{4,})/g, (m) => shortDec(m));
}

/** $…$ дотор ба гадна аль алинд нь (MathText-ийн бичвэр) */
export function tidyText(text: string): string {
  return tidyTex(text);
}

const MIXED_RE = /^=\s*-?\d+\\frac\{\d+\}\{\d+\}$/;

export interface Display {
  /** Үндсэн хариу (том) */
  main: string[];
  /** Ойролцоо утга (жижиг саарал) */
  approx: string[];
  /** Холимог тоо гэх мэт нэмэлт хэлбэр (дэлгэрэнгүйд) */
  alt: string[];
  /** Богино хариу мөрүүд нэг мөрөнд багтах уу (x_1 = 2, x_2 = 3) */
  inline: boolean;
}

/** «бодлого = хариу» → «= хариу» (бодлого дээр нь тусад харагдана) */
function stripProblem(a: string, problem?: string): string {
  if (!problem) return a;
  const p = problem.trim();
  if (a.startsWith(p)) {
    const rest = a.slice(p.length).trim();
    if (/^(=|\\approx)/.test(rest)) return rest;
  }
  return a;
}

/** «a \approx a» эсвэл утгагүй ойролцоо мөр мөн эсэх */
function trivialApprox(s: string): boolean {
  const parts = s.split("\\approx").map((x) => x.trim());
  if (parts.length !== 2) return false;
  const [l, r] = parts;
  if (!l) return false;
  if (l === r) return true;
  return /^-?\d+$/.test(l);
}

export function displayOf(sol: Solution): Display {
  const main: string[] = [];
  const alt: string[] = [];
  for (const a of sol.answer) {
    const t = tidyTex(stripProblem(a, sol.problem));
    if (MIXED_RE.test(t.replace(/\s+/g, "")) && main.length) alt.push(t);
    else main.push(t);
  }
  const approx = (sol.approx ?? []).filter((x) => !trivialApprox(x)).map(tidyTex);
  const inline = main.length > 1 && main.length <= 4 && main.every((m) => m.length <= 28 && /^[a-z](_\{\d+\})?\s*=/.test(m));
  return { main, approx, alt, inline };
}

/** Алхмын тайлбар урт бол «Яагаад?» дотор хураана */
export function splitStepText(text: string | undefined, hasTex: boolean): { title?: string; why?: string } {
  if (!text) return {};
  const t = tidyText(text);
  if (!hasTex || t.length <= 90) return { title: t };
  // Эхний өгүүлбэр/хэсгийг гарчиг болгоно ($…$ дотор таслахгүй)
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "$") depth ^= 1;
    if (depth === 0 && (t[i] === ":" || t[i] === "." || t[i] === "—") && i > 12 && i < 80) {
      return { title: t.slice(0, i).trim(), why: t.slice(i + 1).trim() || undefined };
    }
  }
  return { title: undefined, why: t };
}
