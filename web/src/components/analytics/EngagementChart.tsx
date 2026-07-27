"use client";

import { useId, useMemo, useState } from "react";
import type { EngagementDay } from "./types";

const WIDTH = 640;
const HEIGHT = 160;
const PAD_X = 8;
const PAD_Y = 14;

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

// Идэвхтэй сурагчийн өдөр тутмын чиг хандлага — ганц цуврал тул легенд
// шаардлагагүй (гарчиг өөрөө нэрлэж байна), гэхдээ дэлгэцийн уншигчид
// зориулж <details> дотор бүрэн хүснэгт үргэлж бэлэн байна.
export default function EngagementChart({
  days,
  lowConfidence,
  eventStreamAgeDays,
}: {
  days: EngagementDay[];
  lowConfidence: boolean;
  eventStreamAgeDays: number;
}) {
  const gradientId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { points, maxVal, path, areaPath } = useMemo(() => {
    const max = Math.max(1, ...days.map((d) => d.activeStudents));
    const innerW = WIDTH - PAD_X * 2;
    const innerH = HEIGHT - PAD_Y * 2;
    const step = days.length > 1 ? innerW / (days.length - 1) : 0;
    const pts = days.map((d, i) => {
      const x = PAD_X + step * i;
      const y = PAD_Y + innerH - (d.activeStudents / max) * innerH;
      return { x, y, day: d };
    });
    const linePath = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    const area =
      pts.length > 0
        ? `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${HEIGHT - PAD_Y} L${pts[0].x.toFixed(1)},${HEIGHT - PAD_Y} Z`
        : "";
    return { points: pts, maxVal: max, path: linePath, areaPath: area };
  }, [days]);

  if (days.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line px-3 py-4 text-sm text-ink-dim">
        Сонгосон хугацаанд дата алга.
      </div>
    );
  }

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div>
      {lowConfidence && (
        <p className="mb-2 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
          ⚠ Идэвхийн лог зөвхөн {eventStreamAgeDays} өдрийн турш хөтлөгдсөн байна
          — чиг хандлагыг найдвартай гэж дүгнэхэд дата хараахан хангалтгүй.
        </p>
      )}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full min-w-[420px]"
          role="img"
          aria-label={`Өдөр тутмын идэвхтэй сурагчийн тоо, ${days[0].date}-с ${days[days.length - 1].date} хүртэл. Дээд утга ${maxVal} сурагч.`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-bright)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--brand-bright)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Суурь шугам */}
          <line
            x1={PAD_X}
            y1={HEIGHT - PAD_Y}
            x2={WIDTH - PAD_X}
            y2={HEIGHT - PAD_Y}
            stroke="var(--line)"
            strokeWidth={1}
          />
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
          <path d={path} fill="none" stroke="var(--brand-bright)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={p.day.date}>
              {/* Хулгайн бүсийг цэгээс томруулж hover/touch-д хялбар болгоно */}
              <rect
                x={p.x - (points.length > 1 ? (WIDTH / points.length) / 2 : 12)}
                y={0}
                width={points.length > 1 ? WIDTH / points.length : 24}
                height={HEIGHT}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                onFocus={() => setHoverIdx(i)}
                tabIndex={0}
                role="button"
                aria-label={`${p.day.date}: ${p.day.activeStudents} идэвхтэй сурагч`}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIdx === i ? 4 : 2.5}
                fill="var(--brand-bright)"
                stroke="var(--surface)"
                strokeWidth={1.5}
              />
            </g>
          ))}
        </svg>
        {hovered && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2 py-1 text-xs shadow-md"
            style={{
              left: `${(hovered.x / WIDTH) * 100}%`,
              top: `${(hovered.y / HEIGHT) * 100}%`,
            }}
          >
            <p className="font-semibold text-ink">{hovered.day.date}</p>
            <p className="text-ink-dim">{hovered.day.activeStudents} идэвхтэй сурагч</p>
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-dim">
        <span>{formatShortDate(days[0].date)}</span>
        <span>{formatShortDate(days[days.length - 1].date)}</span>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-ink-dim hover:text-ink">
          Хүснэгтээр харах
        </summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-panel">
              <tr>
                <th className="px-2 py-1.5 font-semibold text-ink-dim">Огноо</th>
                <th className="px-2 py-1.5 font-semibold text-ink-dim">
                  Идэвхтэй сурагч
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-t border-line">
                  <td className="px-2 py-1 text-ink">{d.date}</td>
                  <td className="px-2 py-1 text-ink">{d.activeStudents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
