import { memo, useMemo } from "react";
import { PAGE_H, PAGE_W, RULED_LINES, buildPage } from "./scribble";

/**
 * Дэвтрийн нэг хуудас — зураггүй, зөвхөн SVG. Өнгө бүгд токен
 * (цаас = surface, шугам = line, харандаа = ink, үзэг = brand) тул
 * хоёр горимд хоёуланд нь уншигдана.
 */
function NotebookPageImpl({ seed, index, total }: { seed: number; index: number; total: number }) {
  const art = useMemo(() => buildPage(seed, index, total), [seed, index, total]);
  return (
    <svg
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      role="img"
      aria-label={`Дэвтрийн ${index + 1}-р хуудас`}
      className="block h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width={PAGE_W} height={PAGE_H} fill="var(--surface)" />
      <path d={RULED_LINES} stroke="var(--line)" strokeWidth={1} opacity={0.9} />
      <path d={`M64 0V${PAGE_H}`} stroke="var(--error)" strokeWidth={1.2} opacity={0.4} />
      <path d={art.ink} stroke="var(--ink)" strokeWidth={1.6} opacity={0.8} />
      <path d={art.thin} stroke="var(--ink-dim)" strokeWidth={1.3} opacity={0.85} />
      <path d={art.pen} stroke="var(--brand)" strokeWidth={1.9} />
    </svg>
  );
}

export default memo(NotebookPageImpl);
