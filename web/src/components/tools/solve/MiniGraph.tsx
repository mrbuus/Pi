"use client";

import { useMemo } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { SvgLabel } from "../core/svgText";
import { graphData } from "./graphData";

/* ============================================================================
 * Хариуны доорх жижиг график (өөрийн SVG, ачаалал бага). Огтлолцлын/тэгийн
 * цэгийг тэмдэглэнэ. «Томоор харах» → График хэрэгсэл.
 * ========================================================================== */

const W = 360, H = 200, PAD = 8;
const COLORS = ["var(--brand)", "var(--ink)", "var(--ink-dim)"];

export default function MiniGraph({ exprs, onOpen }: { exprs: string[]; onOpen?: () => void }) {
  const g = useMemo(() => graphData(exprs, W, H, PAD), [exprs]);
  if (!g) return null;
  const { paths, points, xTicks, yTicks, X, Y } = g;
  // Тэнхлэгийн байрлал (харагдах хүрээнд хавчина)
  const ax = Math.min(H - PAD, Math.max(PAD, Y(0)));
  const ay = Math.min(W - PAD, Math.max(PAD, X(0)));
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-surface">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Функцийн график">
        {/* тор */}
        {xTicks.map((v) => (
          <line key={`gx${v}`} x1={X(v)} y1={PAD} x2={X(v)} y2={H - PAD} stroke="var(--line)" strokeWidth={1} />
        ))}
        {yTicks.map((v) => (
          <line key={`gy${v}`} x1={PAD} y1={Y(v)} x2={W - PAD} y2={Y(v)} stroke="var(--line)" strokeWidth={1} />
        ))}
        {/* тэнхлэг */}
        <line x1={PAD} y1={ax} x2={W - PAD} y2={ax} stroke="var(--ink-dim)" strokeWidth={1.25} />
        <line x1={ay} y1={PAD} x2={ay} y2={H - PAD} stroke="var(--ink-dim)" strokeWidth={1.25} />
        {/* шошго: x тэнхлэгийн доор, y тэнхлэгийн зүүн талд; 0-г алгасна (давхцахгүй) */}
        {xTicks.filter((v) => v !== 0).map((v) => {
          const below = ax + 16 <= H - 4;
          return <SvgLabel key={`lx${v}`} x={X(v)} y={below ? ax + 13 : ax - 11} label={fmt(v)} size={14} fill="var(--ink-dim)" italic={false} />;
        })}
        {yTicks.filter((v) => v !== 0).map((v) => {
          const left = ay - 8 >= 26;
          return (
            <SvgLabel key={`ly${v}`} x={left ? ay - 6 : ay + 6} y={Y(v)} label={fmt(v)} size={14} fill="var(--ink-dim)" italic={false} textAnchor={left ? "end" : "start"} />
          );
        })}
        {/* муруй */}
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={i === 0 ? 2.5 : 2} strokeDasharray={i === 1 ? "6 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {points.map((p, i) => (
          <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={4.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
        ))}
        <SvgLabel x={W - PAD - 6} y={ax - 11 < PAD + 6 ? ax + 13 : ax - 11} label="x" size={15} italic />
        <SvgLabel x={ay + 10 > W - PAD ? ay - 10 : ay + 10} y={PAD + 8} label="y" size={15} italic />
      </svg>
      {onOpen && (
        <figcaption className="flex items-center justify-end border-t border-line px-2 py-1">
          <Button variant="ghost" size="sm" onClick={onOpen} className="min-h-11">
            <Maximize2 aria-hidden />
            Томоор харах
          </Button>
        </figcaption>
      )}
    </figure>
  );
}

function fmt(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return String(Number(v.toFixed(2)));
}
