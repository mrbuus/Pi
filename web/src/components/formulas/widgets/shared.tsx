"use client";
import { useId, type ReactNode, type PointerEvent } from "react";
import MathText from "@/components/MathText";
export const C = {
  brand: "var(--brand)",
  success: "var(--success)",
  ink: "var(--ink)",
  dim: "var(--ink-dim)",
  line: "var(--line)",
  tint: "var(--brand-tint)",
  surface: "var(--surface)",
  error: "var(--error)",
};
export const num = (n: number) =>
  Number.isFinite(n)
    ? String(Math.abs(n) < 0.005 ? 0 : Number(n.toFixed(2)))
    : String.raw`\text{тодорхойгүй}`;
export function MathValue({ latex }: { latex: string }) {
  return (
    <div className="min-w-0 overflow-x-auto text-sm" data-widget-values role="group" aria-label="Тооцооны утга" tabIndex={0}>
      <MathText showErrorInTeacherView>{`$${latex}$`}</MathText>
    </div>
  );
}
export function Range({
  label,
  symbol,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium"
      >
        <span>{label}</span>
        <MathText
          showErrorInTeacherView
        >{`$${symbol}=${num(value)}$`}</MathText>
      </label>
      <input
        id={id}
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full cursor-pointer accent-brand focus-visible:outline-2 focus-visible:outline-brand"
      />
    </div>
  );
}
export function Panel({
  description,
  children,
}: {
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 min-w-0">
      <p className="text-sm text-ink-dim">{description}</p>
      {children}
    </div>
  );
}
export function Diagram({
  label,
  children,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  label: string;
  children: ReactNode;
  onPointerDown?: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (event: PointerEvent<SVGSVGElement>) => void;
}) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 360 280"
      className="mx-auto w-full max-w-xl rounded-xl border border-line bg-surface motion-reduce:transition-none"
      style={{ touchAction: onPointerDown ? "none" : "auto" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <title>{label}</title>
      {children}
    </svg>
  );
}
export function Line({
  x1,
  y1,
  x2,
  y2,
  color = C.ink,
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  dashed?: boolean;
}) {
  return (
    <line
      {...{ x1, y1, x2, y2 }}
      stroke={color}
      strokeWidth={2}
      strokeDasharray={dashed ? "5 4" : undefined}
    />
  );
}
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  color = C.brand,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1),
    length = Math.min(9, Math.hypot(x2 - x1, y2 - y1) / 2);
  return (
    <g>
      <Line {...{ x1, y1, x2, y2, color }} />
      {length > 0 && (
        <path
          d={`M${x2},${y2} L${x2 - length * Math.cos(angle - 0.45)},${y2 - length * Math.sin(angle - 0.45)} L${x2 - length * Math.cos(angle + 0.45)},${y2 - length * Math.sin(angle + 0.45)} Z`}
          fill={color}
        />
      )}
    </g>
  );
}
export function Point({
  x,
  y,
  color = C.brand,
}: {
  x: number;
  y: number;
  color?: string;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={4}
      fill={color}
      stroke={C.surface}
      strokeWidth={1.5}
    />
  );
}
export function usePlot(xMin = -6, xMax = 6, yMin = -8, yMax = 8) {
  const id = `clip-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const x = (v: number) => 30 + ((v - xMin) / (xMax - xMin)) * 300,
    y = (v: number) => 250 - ((v - yMin) / (yMax - yMin)) * 220;
  const curve = (f: (x: number) => number, start = xMin, end = xMax) => {
    let d = "",
      connected = false;
    for (let i = 0; i <= 200; i++) {
      const u = start + ((end - start) * i) / 200,
        v = f(u);
      if (!Number.isFinite(v) || Math.abs(v) > 1e5) {
        connected = false;
        continue;
      }
      d += `${connected ? "L" : "M"}${num(x(u))},${num(y(v))} `;
      connected = true;
    }
    return d;
  };
  const axes = (
    <>
      <defs>
        <clipPath id={id}>
          <rect x={30} y={30} width={300} height={220} />
        </clipPath>
      </defs>
      {Array.from({ length: 11 }, (_, i) => (
        <Line
          key={i}
          x1={30 + i * 30}
          x2={30 + i * 30}
          y1={30}
          y2={250}
          color={C.line}
        />
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <Line
          key={i}
          x1={30}
          x2={330}
          y1={30 + i * 27.5}
          y2={30 + i * 27.5}
          color={C.line}
        />
      ))}
      <Line x1={30} x2={330} y1={y(0)} y2={y(0)} color={C.dim} />
      <Line x1={x(0)} x2={x(0)} y1={30} y2={250} color={C.dim} />
      {[
        [30, 251, String.raw`x=${num(xMin)}`],
        [269, 251, String.raw`x=${num(xMax)}`],
        [32, 3, String.raw`y=${num(yMax)}`],
        [32, 225, String.raw`y=${num(yMin)}`],
      ].map(([left, top, label], i) => (
        <foreignObject key={i} x={left} y={top} width={90} height={28}>
          <div className="text-[11px] text-ink-dim">
            <MathText showErrorInTeacherView>{`$${label}$`}</MathText>
          </div>
        </foreignObject>
      ))}
    </>
  );
  return { x, y, curve, axes, clip: `url(#${id})` };
}
export function localPoint(event: PointerEvent<SVGSVGElement>) {
  const svg = event.currentTarget,
    ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = svg.createSVGPoint();
  p.x = event.clientX;
  p.y = event.clientY;
  return p.matrixTransform(ctm.inverse());
}

export function SvgMath({
  x,
  y,
  latex,
  width = 80,
}: {
  x: number;
  y: number;
  latex: string;
  width?: number;
}) {
  return (
    <foreignObject x={x} y={y} width={width} height={30} pointerEvents="none">
      <div className="text-center text-[12px] text-ink">
        <MathText showErrorInTeacherView>{`$${latex}$`}</MathText>
      </div>
    </foreignObject>
  );
}
