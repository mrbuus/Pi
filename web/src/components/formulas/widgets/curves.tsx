"use client";
import { useRef, useState, type PointerEvent } from "react";
import {
  C,
  num,
  MathValue,
  Range,
  Panel,
  Diagram,
  Line,
  Point,
  usePlot,
  localPoint,
} from "./shared";
export function ExpGraph() {
  const [a, A] = useState(2),
    p = usePlot(-4, 4, -1, 9);
  return (
    <Panel description="Суурь нэгээс их бол өснө, тэг ба нэгийн хооронд бол буурна.">
      <Diagram label="Илтгэгч функцийн график">
        {p.axes}
        <g clipPath={p.clip}>
          <path
            d={p.curve((x) => a ** x)}
            stroke={C.brand}
            strokeWidth={3}
            fill="none"
          />
          <Point x={p.x(0)} y={p.y(1)} />
        </g>
      </Diagram>
      <Range
        label="Илтгэгчийн суурь"
        symbol="a"
        value={a}
        min={0.25}
        max={3}
        step={0.25}
        onChange={A}
      />
      <MathValue latex={String.raw`y=${num(a)}^x,\quad a>0`} />
      <p className="text-sm">
        {a === 1
          ? "Суурь нэг үед тогтмол функц болно."
          : a > 1
            ? "Өсөх функц."
            : "Буурах функц."}
      </p>
    </Panel>
  );
}
export function LogGraph() {
  const [a, A] = useState(2),
    p = usePlot(-1, 7, -6, 6);
  return (
    <Panel description="Логарифм зөвхөн эерэг аргументтай. Суурь нэг үед логарифм тодорхойлогдохгүй.">
      <Diagram label="Логарифм функцийн график ба босоо асимптот">
        {p.axes}
        <Line x1={p.x(0)} x2={p.x(0)} y1={30} y2={250} color={C.error} dashed />
        {a !== 1 && (
          <g clipPath={p.clip}>
            <path
              d={p.curve((x) => Math.log(x) / Math.log(a), 0.01, 7)}
              stroke={C.brand}
              strokeWidth={3}
              fill="none"
            />
            <Point x={p.x(1)} y={p.y(0)} />
          </g>
        )}
      </Diagram>
      <Range
        label="Логарифмын суурь"
        symbol="a"
        value={a}
        min={0.25}
        max={3}
        step={0.25}
        onChange={A}
      />
      <MathValue
        latex={
          a === 1
            ? String.raw`a=1:\ \text{логарифм тодорхойгүй}`
            : String.raw`y=\log_{${num(a)}}x,\quad x>0`
        }
      />
    </Panel>
  );
}
export function UnitCircle() {
  const [degree, D] = useState(45),
    drag = useRef<number | null>(null),
    rad = (degree * Math.PI) / 180,
    x = 180 + 95 * Math.cos(rad),
    y = 140 - 95 * Math.sin(rad);
  function change(e: PointerEvent<SVGSVGElement>) {
    const p = localPoint(e);
    if (p)
      D(
        Math.round(
          ((Math.atan2(140 - p.y, p.x - 180) * 180) / Math.PI + 360) % 360,
        ),
      );
  }
  return (
    <Panel description="Тойрог дээрх цэгийг чирэх эсвэл өнцгийн гулсуурыг гарын сумаар хөдөлгө. Хэвтээ проекц косинус, босоо нь синус.">
      <Diagram
        label="Нэгж тойрог дээрх синус ба косинусын проекц"
        onPointerDown={(e) => {
          drag.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          change(e);
        }}
        onPointerMove={(e) => {
          if (drag.current === e.pointerId) change(e);
        }}
        onPointerUp={(e) => {
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <circle
          cx={180}
          cy={140}
          r={95}
          stroke={C.dim}
          strokeWidth={2}
          fill="none"
        />
        <Line x1={60} y1={140} x2={300} y2={140} color={C.line} />
        <Line x1={180} y1={20} x2={180} y2={260} color={C.line} />
        <Line x1={180} y1={140} x2={x} y2={y} />
        <Line x1={180} y1={140} x2={x} y2={140} color={C.brand} />
        <Line x1={x} y1={140} x2={x} y2={y} color={C.success} />
        <circle cx={x} cy={y} r={12} fill={C.brand} fillOpacity={0.2} />
        <Point x={x} y={y} />
      </Diagram>
      <Range
        label="Тойргийн өнцөг"
        symbol={String.raw`\theta`}
        value={degree}
        min={0}
        max={360}
        onChange={D}
      />
      <MathValue
        latex={String.raw`\theta=${degree}^{\circ}=${num(rad)}\ \text{рад}`}
      />
      <MathValue
        latex={String.raw`\cos\theta=${num(Math.cos(rad))},\quad \sin\theta=${num(Math.sin(rad))}`}
      />
      <MathValue
        latex={String.raw`\tan\theta=${Math.abs(Math.cos(rad)) < 1e-8 ? String.raw`\text{тодорхойгүй}` : num(Math.tan(rad))}`}
      />
    </Panel>
  );
}
export function SineGraph() {
  const [a, A] = useState(1),
    [w, W] = useState(1),
    [phase, P] = useState(0),
    p = usePlot(-2 * Math.PI, 2 * Math.PI, -4, 4);
  return (
    <Panel description="Далайц өндөр, давтамж үе, эхний фаз хэвтээ шилжилтийг өөрчилнө. Хэвтээ тэнхлэг радианаар.">
      <Diagram label="Далайц, давтамж, фаз өөрчлөгдөх синусын график">
        {p.axes}
        <g clipPath={p.clip}>
          <path
            d={p.curve((x) => a * Math.sin(w * x + (phase * Math.PI) / 180))}
            stroke={C.brand}
            strokeWidth={3}
            fill="none"
          />
        </g>
      </Diagram>
      <Range
        label="Синусын далайц"
        symbol="A"
        value={a}
        min={0}
        max={3}
        step={0.5}
        onChange={A}
      />
      <Range
        label="Өнцөг давтамж"
        symbol={String.raw`\omega`}
        value={w}
        min={0.5}
        max={3}
        step={0.5}
        onChange={W}
      />
      <Range
        label="Эхний фазын градус"
        symbol={String.raw`\varphi`}
        value={phase}
        min={-180}
        max={180}
        step={15}
        onChange={P}
      />
      <MathValue
        latex={String.raw`y=${num(a)}\sin(${num(w)}x+(${num((phase * Math.PI) / 180)}))`}
      />
      <MathValue
        latex={
          a === 0
            ? String.raw`A=0:\ \text{тогтмол тэг функц}`
            : String.raw`T=\frac{2\pi}{\omega}=${num((2 * Math.PI) / w)}`
        }
      />
    </Panel>
  );
}
export function DerivativeTangent() {
  const [t, T] = useState(1),
    [h, H] = useState(1),
    p = usePlot(-4, 4, -2, 10),
    drag = useRef<number | null>(null);
  function change(e: PointerEvent<SVGSVGElement>) {
    const q = localPoint(e);
    if (q)
      T(
        Math.max(
          -3,
          Math.min(3, Math.round((-4 + ((q.x - 30) / 300) * 8) * 10) / 10),
        ),
      );
  }
  return (
    <Panel description="Цэгийг чирэхэд шүргэгчийн налалт өөрчлөгдөнө. Тасархай секущийн налалт алхам багасахад уламжлалд ойртоно.">
      <Diagram
        label="Параболын шүргэгч ба секущ шулуун"
        onPointerDown={(e) => {
          drag.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          change(e);
        }}
        onPointerMove={(e) => {
          if (drag.current === e.pointerId) change(e);
        }}
        onPointerUp={(e) => {
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        {p.axes}
        <g clipPath={p.clip}>
          <path
            d={p.curve((x) => x * x)}
            stroke={C.brand}
            strokeWidth={3}
            fill="none"
          />
          <path
            d={p.curve((x) => t * t + 2 * t * (x - t))}
            stroke={C.success}
            strokeWidth={2}
            fill="none"
          />
          <path
            d={p.curve((x) => t * t + (2 * t + h) * (x - t))}
            stroke={C.dim}
            strokeWidth={2}
            strokeDasharray="4 3"
            fill="none"
          />
          <Point x={p.x(t)} y={p.y(t * t)} />
        </g>
      </Diagram>
      <Range
        label="Шүргэлтийн цэг"
        symbol="t"
        value={t}
        min={-3}
        max={3}
        step={0.1}
        onChange={T}
      />
      <Range
        label="Секущийн алхам"
        symbol="h"
        value={h}
        min={0.1}
        max={2}
        step={0.1}
        onChange={H}
      />
      <MathValue
        latex={String.raw`f(x)=x^2,\quad f'(${num(t)})=${num(2 * t)}`}
      />
      <MathValue latex={String.raw`\frac{f(t+h)-f(t)}h=${num(2 * t + h)}`} />
    </Panel>
  );
}
export function IntegralArea() {
  const [b, B] = useState(2),
    [n, N] = useState(8),
    [method, M] = useState("mid"),
    p = usePlot(0, 3, 0, 11),
    dx = b / n,
    shift = method === "left" ? 0 : method === "right" ? 1 : 0.5,
    heights = Array.from({ length: n }, (_, i) => ((i + shift) * dx) ** 2 + 1),
    sum = heights.reduce((a, v) => a + v * dx, 0),
    exact = b ** 3 / 3 + b;
  return (
    <Panel description="Тэгш өнцөгтүүдийн талбайг нэмэж муруйн доорх талбайг ойролцоолно. Хуваалтыг олшруулж алдааг ажигла.">
      <Diagram label="Интегралын Риманы тэгш өнцөгт нийлбэр">
        {p.axes}
        <g clipPath={p.clip}>
          {heights.map((h, i) => (
            <rect
              key={i}
              x={p.x(i * dx)}
              y={p.y(h)}
              width={p.x(dx) - p.x(0)}
              height={p.y(0) - p.y(h)}
              fill={C.tint}
              stroke={C.brand}
              strokeWidth={0.7}
            />
          ))}
          <path
            d={p.curve((x) => x * x + 1, 0, 3)}
            stroke={C.ink}
            strokeWidth={2}
            fill="none"
          />
        </g>
      </Diagram>
      <Range
        label="Интегралын дээд хязгаар"
        symbol="b"
        value={b}
        min={0.5}
        max={3}
        step={0.5}
        onChange={B}
      />
      <Range
        label="Хуваалтын тоо"
        symbol="n"
        value={n}
        min={1}
        max={30}
        onChange={N}
      />
      <label className="block text-sm font-medium">
        Тэгш өнцөгтийн өндөр сонгох
        <select
          aria-label="Риманы нийлбэрийн арга"
          value={method}
          onChange={(e) => M(e.target.value)}
          className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3"
        >
          <option value="left">Зүүн төгсгөл</option>
          <option value="mid">Дундаж цэг</option>
          <option value="right">Баруун төгсгөл</option>
        </select>
      </label>
      <MathValue
        latex={String.raw`\int_0^{${num(b)}}(x^2+1)\,dx=${num(exact)},\quad S_n=${num(sum)}`}
      />
      <MathValue latex={String.raw`|S_n-I|=${num(Math.abs(sum - exact))}`} />
    </Panel>
  );
}
