"use client";

import type { SVGProps } from "react";

/* ============================================================================
 * Зургийн доторх математик шошго (оройн нэр A, B_1, урт a, өнцөг \alpha).
 *
 * KaTeX-ийг SVG-д оруулбал PNG/SVG татахад фонт, foreignObject алдагддаг тул
 * зураг дотор цэвэр SVG <text>: сурах бичгийн налуу serif, доод индекс <tspan>.
 * Грек үсгийг LaTeX нэрээр нь өгнө (\alpha) — гараар глиф бичихгүй.
 * ========================================================================== */

export const MATH_FONT = "'Times New Roman', 'STIX Two Text', 'Cambria Math', Georgia, serif";

const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varphi: "φ",
  phi: "φ", theta: "θ", lambda: "λ", mu: "μ", pi: "π", rho: "ρ",
  sigma: "σ", tau: "τ", omega: "ω", Delta: "Δ", circ: "°",
};

/** «A_1», «B_{12}», «\alpha», «h», «60^\circ», «\sqrt{2}» → хэсгүүд */
export function splitLabel(src: string): { main: string; sub?: string; sup?: string } {
  let s = src.replace(/\\(alpha|beta|gamma|delta|epsilon|varphi|phi|theta|lambda|mu|pi|rho|sigma|tau|omega|Delta)/g, (_m, g: string) => GREEK[g]);
  s = s.replace(/\\sqrt\{([^}]*)\}/g, "√$1").replace(/\\sqrt(\d+)/g, "√$1");
  s = s.replace(/\\cdot/g, "·").replace(/\\,/g, " ");
  let sup: string | undefined;
  s = s.replace(/\^\\circ|\^\{\\circ\}/g, () => { sup = "°"; return ""; });
  const m = /^(.*?)_\{?([^}]*)\}?$/.exec(s);
  if (m) return { main: m[1], sub: m[2], sup };
  return { main: s, sup };
}

interface Props extends Omit<SVGProps<SVGTextElement>, "children"> {
  x: number;
  y: number;
  label: string;
  size?: number;
  /** Нэр, хувьсагч налуу; тоо босоо */
  italic?: boolean;
}

export function SvgLabel({ x, y, label, size = 16, italic, fill = "var(--ink)", ...rest }: Props) {
  const { main, sub, sup } = splitLabel(label);
  const slant = italic ?? (/^[A-Za-zα-ω]/.test(main) && !/^\d/.test(main));
  return (
    <text
      x={x}
      y={y}
      fontFamily={MATH_FONT}
      fontSize={size}
      fontStyle={slant ? "italic" : "normal"}
      fill={fill}
      textAnchor="middle"
      dominantBaseline="central"
      {...rest}
    >
      {main}
      {sub && (
        <tspan fontSize={size * 0.68} dy={size * 0.28} fontStyle={/^\d+$/.test(sub) ? "normal" : undefined}>
          {sub}
        </tspan>
      )}
      {sup && (
        <tspan fontSize={size * 0.75} dy={sub ? -size * 0.7 : -size * 0.35}>
          {sup}
        </tspan>
      )}
    </text>
  );
}

/** Графикийн муруйн өнгө — шар/алтан хориотой (эзний амт) */
export const SERIES_COLORS = [
  "var(--brand)",
  "var(--rose)",
  "var(--teal)",
  "var(--violet)",
  "var(--sky)",
  "var(--fuchsia)",
] as const;
