"use client";
import { useState } from "react";
import {
  C,
  SvgMath,
  num,
  MathValue,
  Range,
  Panel,
  Diagram,
  Line,
  Point,
  Arrow,
  usePlot,
} from "./shared";
export function Pythagoras() {
  const [a, A] = useState(3),
    [b, B] = useState(4),
    s = a + b,
    k = 210 / s,
    pts = [
      [a, 0],
      [s, a],
      [b, s],
      [0, b],
    ],
    to = (ps: number[][]) =>
      ps.map(([x, y]) => `${65 + x * k},${30 + y * k}`).join(" ");
  return (
    <Panel description="Дөрвөн ижил тэгш өнцөгт гурвалжин хасахад голд гипотенузын квадрат үлдэнэ.">
      <Diagram label="Пифагорын теоремийн талбайн баталгаа">
        <rect
          x={65}
          y={30}
          width={210}
          height={210}
          fill={C.tint}
          stroke={C.ink}
        />
        {[
          [[0, 0], pts[0], pts[3]],
          [[s, 0], pts[1], pts[0]],
          [[s, s], pts[2], pts[1]],
          [[0, s], pts[3], pts[2]],
        ].map((triangle, i) => (
          <polygon
            key={i}
            points={to(triangle)}
            fill={C.success}
            fillOpacity={0.18}
            stroke={C.success}
          />
        ))}
        <polygon
          points={to(pts)}
          fill={C.brand}
          fillOpacity={0.15}
          stroke={C.brand}
          strokeWidth={2}
        />
        <SvgMath x={145} y={120} latex="c^2" />
        <SvgMath x={65 + (a * k) / 2 - 25} y={3} width={50} latex="a" />
        <SvgMath x={65 + a * k + (b * k) / 2 - 25} y={3} width={50} latex="b" />
      </Diagram>
      <Range
        label="Эхний катет"
        symbol="a"
        value={a}
        min={1}
        max={8}
        onChange={A}
      />
      <Range
        label="Хоёр дахь катет"
        symbol="b"
        value={b}
        min={1}
        max={8}
        onChange={B}
      />
      <MathValue
        latex={String.raw`c^2=(a+b)^2-4\frac{ab}2=a^2+b^2=${a * a + b * b}`}
      />
      <MathValue
        latex={String.raw`c=\sqrt{${a * a + b * b}}=${num(Math.hypot(a, b))}`}
      />
    </Panel>
  );
}
export function TriangleArea() {
  const [b, B] = useState(6),
    [h, H] = useState(4),
    [offset, O] = useState(3),
    x = 90 + offset * 22,
    y = 230 - h * 28;
  return (
    <Panel description="Оройг хажуу тийш шилжүүлсэн ч суурь, перпендикуляр өндөр хэвээр бол талбай өөрчлөгдөхгүй.">
      <Diagram label="Гурвалжны суурь ба перпендикуляр өндөр">
        <polygon
          points={`90,230 ${90 + b * 22},230 ${x},${y}`}
          fill={C.tint}
          stroke={C.brand}
          strokeWidth={2}
        />
        <Line x1={40} x2={320} y1={230} y2={230} color={C.line} />
        <Line x1={x} x2={x} y1={y} y2={230} color={C.success} dashed />
        <path d={`M${x},220 h10 v10`} stroke={C.success} fill="none" />
        <SvgMath x={90 + b * 11 - 30} y={236} width={60} latex="b" />
        <SvgMath x={x + 8} y={(y + 230) / 2 - 14} width={36} latex="h" />
      </Diagram>
      <Range
        label="Гурвалжны суурь"
        symbol="b"
        value={b}
        min={2}
        max={8}
        onChange={B}
      />
      <Range
        label="Перпендикуляр өндөр"
        symbol="h"
        value={h}
        min={1}
        max={6}
        onChange={H}
      />
      <Range
        label="Оройн хэвтээ байрлал"
        symbol="x"
        value={offset}
        min={-2}
        max={8}
        onChange={O}
      />
      <MathValue latex={String.raw`S=\frac{bh}2=${num((b * h) / 2)}`} />
    </Panel>
  );
}
export function InscribedAngle() {
  const [t, T] = useState(90),
    [shift, S] = useState(0),
    r = 98,
    pos = (deg: number) => [
      180 + r * Math.cos((deg * Math.PI) / 180),
      140 - r * Math.sin((deg * Math.PI) / 180),
    ],
    a = pos(-t / 2),
    b = pos(t / 2),
    c = pos(180 + shift);
  return (
    <Panel description="Нэг жижиг нумыг тулсан багтсан өнцөг төв өнцгийн хагастай тэнцэнэ. Орой эсрэг том нум дээр хөдөлнө.">
      <Diagram label="Нэг нумыг тулсан төв ба багтсан өнцөг">
        <circle
          cx={180}
          cy={140}
          r={r}
          fill="none"
          stroke={C.dim}
          strokeWidth={2}
        />
        <path
          d={`M${a[0]},${a[1]} A${r},${r} 0 0 0 ${b[0]},${b[1]}`}
          stroke={C.brand}
          strokeWidth={5}
          fill="none"
        />
        <path
          d={`M${a[0]},${a[1]} L180,140 L${b[0]},${b[1]}`}
          fill="none"
          stroke={C.brand}
          strokeWidth={2}
        />
        <path
          d={`M${a[0]},${a[1]} L${c[0]},${c[1]} L${b[0]},${b[1]}`}
          fill="none"
          stroke={C.success}
          strokeWidth={2}
        />
        <Point x={c[0]} y={c[1]} color={C.success} />
        <SvgMath x={182} y={126} width={36} latex={String.raw`\alpha`} />
        <SvgMath
          x={c[0] + 8}
          y={c[1] - 16}
          width={36}
          latex={String.raw`\beta`}
        />
      </Diagram>
      <Range
        label="Төв өнцөг"
        symbol={String.raw`\alpha`}
        value={t}
        min={30}
        max={150}
        step={10}
        onChange={T}
      />
      <Range
        label="Багтсан өнцгийн оройн шилжилт"
        symbol={String.raw`\gamma`}
        value={shift}
        min={-60}
        max={60}
        step={10}
        onChange={S}
      />
      <MathValue
        latex={String.raw`\alpha=${t}^{\circ},\quad \beta=\frac\alpha2=${num(t / 2)}^{\circ}`}
      />
    </Panel>
  );
}
export function CircleSector() {
  const [r, R] = useState(3),
    [t, T] = useState(90),
    radius = r * 20,
    rad = (t * Math.PI) / 180,
    x = 180 + radius * Math.cos(rad),
    y = 140 - radius * Math.sin(rad);
  return (
    <Panel description="Секторын өнцгийг радианаар илэрхийлж нумын урт, талбайг олно.">
      <Diagram label="Тойргийн секторын талбай ба нум">
        <circle cx={180} cy={140} r={radius} fill="none" stroke={C.line} />
        <path
          d={`M180,140 L${180 + radius},140 A${radius},${radius} 0 ${t > 180 ? 1 : 0} 0 ${x},${y} Z`}
          fill={C.tint}
          stroke={C.brand}
          strokeWidth={2}
        />
        <SvgMath x={180 + radius / 2 - 20} y={144} width={40} latex="r" />
      </Diagram>
      <Range
        label="Тойргийн радиус"
        symbol="r"
        value={r}
        min={1}
        max={5}
        onChange={R}
      />
      <Range
        label="Секторын өнцөг"
        symbol={String.raw`\alpha`}
        value={t}
        min={10}
        max={330}
        step={10}
        onChange={T}
      />
      <MathValue
        latex={String.raw`\theta=${num(rad)}\ \text{рад},\quad l=r\theta=${num(r * rad)}`}
      />
      <MathValue
        latex={String.raw`S=\frac12r^2\theta=${num((r * r * rad) / 2)}`}
      />
    </Panel>
  );
}
export function PrismVolume() {
  const [a, A] = useState(4),
    [b, B] = useState(3),
    [h, H] = useState(4),
    w = a * 28,
    d = b * 12,
    height = h * 26,
    front = `60,230 ${60 + w},230 ${60 + w},${230 - height} 60,${230 - height}`,
    top = `60,${230 - height} ${60 + d},${230 - height - d} ${60 + w + d},${230 - height - d} ${60 + w},${230 - height}`,
    side = `${60 + w},230 ${60 + w + d},${230 - d} ${60 + w + d},${230 - height - d} ${60 + w},${230 - height}`;
  return (
    <Panel description="Тэгш өнцөгт призмийн эзлэхүүн нь суурийн талбайг өндрөөр үржүүлсэнтэй тэнцэнэ. Зураг нь ташуу проекц.">
      <Diagram label="Тэгш өнцөгт призмийн суурь ба өндөр">
        <polygon points={front} fill={C.tint} stroke={C.brand} />
        <polygon
          points={side}
          fill={C.brand}
          fillOpacity={0.15}
          stroke={C.brand}
        />
        <polygon
          points={top}
          fill={C.success}
          fillOpacity={0.15}
          stroke={C.success}
        />
        <SvgMath x={60 + w / 2 - 20} y={233} width={40} latex="a" />
        <SvgMath x={60 + w + d / 2 + 5} y={224 - d / 2} width={30} latex="b" />
        <SvgMath x={16} y={225 - height / 2} width={40} latex="h" />
      </Diagram>
      <Range
        label="Призмийн урт"
        symbol="a"
        value={a}
        min={1}
        max={6}
        onChange={A}
      />
      <Range
        label="Призмийн өргөн"
        symbol="b"
        value={b}
        min={1}
        max={6}
        onChange={B}
      />
      <Range
        label="Призмийн өндөр"
        symbol="h"
        value={h}
        min={1}
        max={6}
        onChange={H}
      />
      <MathValue
        latex={String.raw`S_{\rm base}=ab=${a * b},\quad V=S_{\rm base}h=${a * b * h}`}
      />
    </Panel>
  );
}
export function ConeCylinder() {
  const [r, R] = useState(3),
    [h, H] = useState(5),
    radius = r * 10,
    height = h * 22,
    top = 230 - height;
  return (
    <Panel description="Ижил радиус, ижил өндөртэй конусын эзлэхүүн цилиндрийн гуравны нэг. Хоёр зураг ижил хэмжээсээр дүрслэгдсэн.">
      <Diagram label="Ижил суурь, өндөртэй цилиндр ба конус">
        <path
          d={`M${95 - radius},${top} L${95 - radius},230 A${radius},12 0 0 0 ${95 + radius},230 L${95 + radius},${top}`}
          fill={C.tint}
          stroke={C.brand}
          strokeWidth={2}
        />
        <ellipse
          cx={95}
          cy={top}
          rx={radius}
          ry={12}
          fill={C.tint}
          stroke={C.brand}
        />
        <ellipse
          cx={95}
          cy={230}
          rx={radius}
          ry={12}
          fill="none"
          stroke={C.brand}
          strokeDasharray="3 3"
        />
        <path
          d={`M265,${top} L${265 - radius},230 A${radius},12 0 0 0 ${265 + radius},230 Z`}
          fill={C.success}
          fillOpacity={0.18}
          stroke={C.success}
          strokeWidth={2}
        />
        <ellipse
          cx={265}
          cy={230}
          rx={radius}
          ry={12}
          fill="none"
          stroke={C.success}
          strokeDasharray="3 3"
        />
        <Line x1={265} x2={265} y1={top} y2={230} dashed color={C.dim} />
        <SvgMath x={245} y={top + height / 2 - 12} width={40} latex="h" />
        <SvgMath x={90} y={238} width={60} latex="r" />
        <SvgMath x={250} y={238} width={60} latex="r" />
      </Diagram>
      <Range
        label="Хоёр биетийн радиус"
        symbol="r"
        value={r}
        min={1}
        max={5}
        onChange={R}
      />
      <Range
        label="Хоёр биетийн өндөр"
        symbol="h"
        value={h}
        min={1}
        max={8}
        onChange={H}
      />
      <MathValue
        latex={String.raw`V_{\rm cylinder}=\pi r^2h=${num(Math.PI * r * r * h)}`}
      />
      <MathValue
        latex={String.raw`V_{\rm cone}=\frac13\pi r^2h=${num((Math.PI * r * r * h) / 3)}`}
      />
    </Panel>
  );
}
export function VectorAdd() {
  const [ux, Ux] = useState(2),
    [uy, Uy] = useState(1),
    [vx, Vx] = useState(1),
    [vy, Vy] = useState(3),
    p = usePlot(-7, 7, -7, 7),
    arrow = (x1: number, y1: number, x2: number, y2: number, color: string) => (
      <Arrow
        x1={p.x(x1)}
        y1={p.y(y1)}
        x2={p.x(x2)}
        y2={p.y(y2)}
        color={color}
      />
    );
  return (
    <Panel description="Хоёр дахь векторын эхлэлийг эхнийхийн төгсгөлд залгана. Нийлбэр нь эхний эхлэлээс сүүлийн төгсгөл рүү чиглэнэ.">
      <Diagram label="Векторуудын нэмэх гурвалжин ба параллелограммын дүрэм">
        {p.axes}
        {arrow(0, 0, ux, uy, C.brand)}
        {arrow(ux, uy, ux + vx, uy + vy, C.success)}
        {arrow(0, 0, ux + vx, uy + vy, C.ink)}
        <Line
          x1={p.x(0)}
          y1={p.y(0)}
          x2={p.x(vx)}
          y2={p.y(vy)}
          color={C.success}
          dashed
        />
        <Line
          x1={p.x(vx)}
          y1={p.y(vy)}
          x2={p.x(ux + vx)}
          y2={p.y(uy + vy)}
          color={C.brand}
          dashed
        />
      </Diagram>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Range
          label="Эхний векторын хэвтээ утга"
          symbol="u_x"
          value={ux}
          min={-3}
          max={3}
          onChange={Ux}
        />
        <Range
          label="Эхний векторын босоо утга"
          symbol="u_y"
          value={uy}
          min={-3}
          max={3}
          onChange={Uy}
        />
        <Range
          label="Хоёр дахь векторын хэвтээ утга"
          symbol="v_x"
          value={vx}
          min={-3}
          max={3}
          onChange={Vx}
        />
        <Range
          label="Хоёр дахь векторын босоо утга"
          symbol="v_y"
          value={vy}
          min={-3}
          max={3}
          onChange={Vy}
        />
      </div>
      <MathValue
        latex={String.raw`\vec u+\vec v=(${ux};${uy})+(${vx};${vy})=(${ux + vx};${uy + vy})`}
      />
    </Panel>
  );
}
export function LineSlope() {
  const [m, M] = useState(1),
    [b, B] = useState(1),
    p = usePlot(-5, 5, -8, 8);
  return (
    <Panel description="Хэвтээ нэг нэгж шилжихэд босоо өөрчлөлт нь налалттай тэнцэнэ. Тасархай гурвалжин үүнийг харуулна.">
      <Diagram label="Шулууны налалт, хэвтээ ба босоо өөрчлөлт">
        {p.axes}
        <g clipPath={p.clip}>
          <path
            d={p.curve((x) => m * x + b)}
            fill="none"
            stroke={C.brand}
            strokeWidth={3}
          />
          <Line
            x1={p.x(0)}
            x2={p.x(1)}
            y1={p.y(b)}
            y2={p.y(b)}
            dashed
            color={C.success}
          />
          <Line
            x1={p.x(1)}
            x2={p.x(1)}
            y1={p.y(b)}
            y2={p.y(m + b)}
            dashed
            color={C.success}
          />
          <Point x={p.x(0)} y={p.y(b)} />
          <Point x={p.x(1)} y={p.y(m + b)} />
        </g>
      </Diagram>
      <Range
        label="Шулууны налалт"
        symbol="m"
        value={m}
        min={-3}
        max={3}
        step={0.5}
        onChange={M}
      />
      <Range
        label="Шулууны огтлолцол"
        symbol="b"
        value={b}
        min={-3}
        max={3}
        onChange={B}
      />
      <MathValue
        latex={String.raw`y=${num(m)}x+(${num(b)}),\quad \Delta x=1,\quad \Delta y=${num(m)}`}
      />
    </Panel>
  );
}
