"use client";

import { SvgLabel } from "../core/svgText";
import type { NumberLineData } from "./steps";

/* ============================================================================
 * Тэнцэтгэл бишийн хариуг тооны шулуун дээр (сурах бичгийн хэв):
 * цэгүүд тэнцүү зайтай, дүүрэн — орно, хоосон — орохгүй, шийдийн хэсэг
 * тод хөх зураасаар, интервал бүрийн тэмдэг (+ / -) дээр нь.
 * ========================================================================== */

const W = 640, H = 104, Y = 56, L = 24, R = 612;

function Sign({ x, s }: { x: number; s: "+" | "-" | "" }) {
  if (!s) return null;
  const y = 24, k = 6;
  return (
    <g stroke="var(--ink-dim)" strokeWidth={2} strokeLinecap="round">
      <line x1={x - k} y1={y} x2={x + k} y2={y} />
      {s === "+" && <line x1={x} y1={y - k} x2={x} y2={y + k} />}
    </g>
  );
}

export default function NumberLine({ data, label }: { data: NumberLineData; label: string }) {
  const n = data.points.length;
  const xs = data.points.map((_, i) => (n === 1 ? (L + R) / 2 : 96 + ((R - 96 - 72) * i) / Math.max(1, n - 1)));
  const at = (i: number | null, side: "l" | "r") => (i === null ? (side === "l" ? L + 4 : R - 14) : xs[i]);
  const mids: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = i === 0 ? L : xs[i - 1], b = i === n ? R - 10 : xs[i];
    mids.push((a + b) / 2);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[640px]" role="img" aria-label={label}>
      {/* тэнхлэг */}
      <line x1={L} y1={Y} x2={R} y2={Y} stroke="var(--ink)" strokeWidth={1.5} />
      <polygon points={`${R + 10},${Y} ${R - 2},${Y - 5} ${R - 2},${Y + 5}`} fill="var(--ink)" />
      <SvgLabel x={R + 6} y={Y + 22} label="x" size={16} italic />
      {/* шийдийн хэсэг */}
      {data.segments.map((s, i) => (
        <line key={i} x1={at(s.from, "l")} y1={Y} x2={at(s.to, "r")} y2={Y} stroke="var(--brand)" strokeWidth={6} strokeLinecap="butt" />
      ))}
      {data.signs?.map((s, i) => <Sign key={i} x={mids[i]} s={s} />)}
      {data.points.map((p, i) => (
        <g key={i}>
          <circle
            cx={xs[i]}
            cy={Y}
            r={6.5}
            fill={p.filled || data.isolated?.includes(i) ? "var(--brand)" : "var(--surface)"}
            stroke="var(--brand)"
            strokeWidth={2.5}
          />
          <SvgLabel x={xs[i]} y={Y + 26} label={p.label} size={15} />
        </g>
      ))}
    </svg>
  );
}
