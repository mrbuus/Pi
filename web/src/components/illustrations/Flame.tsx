import { useId } from "react";

/* Streak-ийн гал — гараар зурсан SVG (гадны зураг биш, ~1KB). Өнгө нь
   токеноос (--gold → --rose), тиймээс цайвар/харанхуй горимд хоёуланд тохирно.
   `lit=false` үед саарал, унтарсан гал (өнөөдөр хараахан бодоогүй). */
export default function Flame({ lit = true, className = "h-14 w-14" }: { lit?: boolean; className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={`${lit ? "flame-flicker" : ""} ${className}`}>
      <defs>
        <linearGradient id={`${id}-outer`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={lit ? "var(--rose)" : "var(--line)"} />
          <stop offset="1" stopColor={lit ? "var(--gold)" : "var(--ink-dim)"} stopOpacity={lit ? 1 : 0.5} />
        </linearGradient>
        <linearGradient id={`${id}-inner`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={lit ? "var(--gold)" : "var(--surface)"} />
          <stop offset="1" stopColor="var(--surface)" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id}-outer)`}
        d="M32 4c2 9 11 14 15 23 5 11 1 25-9 30-8 4-19 2-24-6-5-7-4-17 2-24 1 5 4 8 8 9-3-11 3-23 8-32z"
      />
      <path
        fill={`url(#${id}-inner)`}
        d="M33 30c1 5 7 8 8 14 1 7-4 12-10 12s-10-5-9-11c1-4 4-6 6-7-1 4 1 6 3 7-1-5 0-11 2-15z"
      />
    </svg>
  );
}
