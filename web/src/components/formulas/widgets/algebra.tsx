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
  usePlot,
} from "./shared";
export function SquareOfSum() {
  const [a, A] = useState(3),
    [b, B] = useState(2),
    s = a + b,
    k = 210 / s;
  return (
    <Panel description="Том квадратыг хоёр квадрат, хоёр тэгш өнцөгт болгон хуваая.">
      <Diagram label="Нийлбэрийн квадратын дөрвөн хэсгийн талбай">
        <rect
          x={65}
          y={30}
          width={210}
          height={210}
          fill={C.tint}
          stroke={C.ink}
        />
        <rect
          x={65}
          y={30}
          width={a * k}
          height={a * k}
          fill={C.brand}
          fillOpacity={0.25}
        />
        <rect
          x={65 + a * k}
          y={30 + a * k}
          width={b * k}
          height={b * k}
          fill={C.success}
          fillOpacity={0.25}
        />
        <Line x1={65 + a * k} y1={30} x2={65 + a * k} y2={240} />
        <Line x1={65} y1={30 + a * k} x2={275} y2={30 + a * k} />
        <SvgMath
          x={65 + (a * k) / 2 - 20}
          y={30 + (a * k) / 2 - 12}
          width={40}
          latex="a^2"
        />
        <SvgMath
          x={65 + a * k + (b * k) / 2 - 20}
          y={30 + a * k + (b * k) / 2 - 12}
          width={40}
          latex="b^2"
        />
        <SvgMath
          x={65 + a * k + (b * k) / 2 - 20}
          y={30 + (a * k) / 2 - 12}
          width={40}
          latex="ab"
        />
        <SvgMath
          x={65 + (a * k) / 2 - 20}
          y={30 + a * k + (b * k) / 2 - 12}
          width={40}
          latex="ab"
        />
      </Diagram>
      <Range
        label="Эхний тал"
        symbol="a"
        value={a}
        min={1}
        max={8}
        onChange={A}
      />
      <Range
        label="Хоёр дахь тал"
        symbol="b"
        value={b}
        min={1}
        max={8}
        onChange={B}
      />
      <MathValue
        latex={String.raw`(a+b)^2=a^2+2ab+b^2=${a * a}+${2 * a * b}+${b * b}=${s * s}`}
      />
    </Panel>
  );
}
export function DifferenceOfSquares() {
  const [a, A] = useState(5),
    [ratio, R] = useState(0.4),
    b = a * ratio,
    k = 100 / a;
  return (
    <Panel description="Хассан жижиг квадратаас үлдсэн талбай нь баруун талын тэгш өнцөгтийн талбайтай тэнцэнэ.">
      <Diagram label="Квадратуудын ялгавар ба тэнцүү талбайтай тэгш өнцөгт">
        <rect
          x={25}
          y={90}
          width={100}
          height={100}
          fill={C.tint}
          stroke={C.brand}
        />
        <rect
          x={125 - b * k}
          y={90}
          width={b * k}
          height={b * k}
          fill={C.surface}
          stroke={C.error}
          strokeDasharray="4 3"
        />
        <rect
          x={165}
          y={90}
          width={(a + b) * k}
          height={(a - b) * k}
          fill={C.tint}
          stroke={C.brand}
        />
        <SvgMath x={50} y={193} width={50} latex="a" />
        <SvgMath x={173} y={65} width={130} latex="a+b" />
        <SvgMath x={285} y={105} width={70} latex="a-b" />
      </Diagram>
      <Range
        label="Том квадратын тал"
        symbol="a"
        value={a}
        min={2}
        max={8}
        onChange={A}
      />
      <Range
        label="Жижиг талын харьцаа"
        symbol="b/a"
        value={ratio}
        min={0.1}
        max={0.9}
        step={0.1}
        onChange={R}
      />
      <MathValue
        latex={String.raw`b=${num(b)},\quad a^2-b^2=(a-b)(a+b)=${num(a * a - b * b)}`}
      />
    </Panel>
  );
}
export function QuadraticGraph() {
  const [a, A] = useState(1),
    [b, B] = useState(-2),
    [c, Dc] = useState(-3),
    p = usePlot(-6, 6, -10, 10),
    D = b * b - 4 * a * c,
    x0 = a ? -b / (2 * a) : 0,
    y0 = a * x0 * x0 + b * x0 + c;
  const roots = a
    ? D >= 0
      ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)]
      : []
    : b
      ? [-c / b]
      : [];
  return (
    <Panel description="Коэффициент өөрчлөхөд график, орой, бодит язгуур хэрхэн өөрчлөгдөхийг ажигла.">
      <Diagram label="Квадрат функцийн график, орой, бодит язгуурууд">
        {p.axes}
        <g clipPath={p.clip}>
          {a !== 0 && (
            <Line
              x1={p.x(x0)}
              x2={p.x(x0)}
              y1={30}
              y2={250}
              dashed
              color={C.success}
            />
          )}
          <path
            d={p.curve((x) => a * x * x + b * x + c)}
            fill="none"
            stroke={C.brand}
            strokeWidth={3}
          />
          {a !== 0 && <Point x={p.x(x0)} y={p.y(y0)} color={C.success} />}{" "}
          {roots.map((r, i) => (
            <Point key={i} x={p.x(r)} y={p.y(0)} />
          ))}
        </g>
      </Diagram>
      <Range
        label="Квадрат гишүүний коэффициент"
        symbol="a"
        value={a}
        min={-3}
        max={3}
        step={0.5}
        onChange={A}
      />
      <Range
        label="Шугаман гишүүний коэффициент"
        symbol="b"
        value={b}
        min={-6}
        max={6}
        onChange={B}
      />
      <Range
        label="Тогтмол гишүүн"
        symbol="c"
        value={c}
        min={-6}
        max={6}
        onChange={Dc}
      />
      <MathValue latex={String.raw`y=${num(a)}x^2+(${num(b)})x+(${num(c)})`} />
      {a !== 0 ? (
        <>
          <MathValue
            latex={String.raw`D=${num(D)},\quad (x_0;y_0)=(${num(x0)};${num(y0)})`}
          />
          <MathValue
            latex={
              D < 0
                ? String.raw`D<0:\ \text{бодит язгуургүй}`
                : String.raw`x=${[...new Set(roots.map(num))].join(",\ ")}`
            }
          />
        </>
      ) : (
        <p className="text-sm">
          Квадрат гишүүн тэг бол парабол биш.{" "}
          {b === 0
            ? c === 0
              ? "Бүх бодит тоо тэгшитгэлийн шийд."
              : "Тэгшитгэл шийдгүй."
            : "Шугаман тэгшитгэл нэг шийдтэй."}
        </p>
      )}
      {a === 0 && b !== 0 && <MathValue latex={String.raw`x=${num(-c / b)}`} />}
    </Panel>
  );
}
export function Vieta() {
  const [r1, R1] = useState(-2),
    [r2, R2] = useState(3),
    p = usePlot(-6, 6, -10, 10);
  return (
    <Panel description="Язгууруудаа өөрчилж, нийлбэр ба үржвэр нь коэффициенттой хэрхэн холбогдохыг хар.">
      <Diagram label="Виетийн теоремийн хоёр язгууртай парабол">
        {p.axes}
        <g clipPath={p.clip}>
          <path
            d={p.curve((x) => (x - r1) * (x - r2))}
            fill="none"
            stroke={C.brand}
            strokeWidth={3}
          />
          <Point x={p.x(r1)} y={p.y(0)} />
          <Point x={p.x(r2)} y={p.y(0)} color={C.success} />
        </g>
      </Diagram>
      <Range
        label="Эхний язгуур"
        symbol="x_1"
        value={r1}
        min={-5}
        max={5}
        onChange={R1}
      />
      <Range
        label="Хоёр дахь язгуур"
        symbol="x_2"
        value={r2}
        min={-5}
        max={5}
        onChange={R2}
      />
      <MathValue
        latex={String.raw`x_1+x_2=${r1 + r2},\quad x_1x_2=${r1 * r2}`}
      />
      <MathValue
        latex={String.raw`(x-(${r1}))(x-(${r2}))=x^2-(${r1 + r2})x+(${r1 * r2})`}
      />
    </Panel>
  );
}
export function AbsGraph() {
  const [h, H] = useState(0),
    [k, K] = useState(0),
    p = usePlot();
  return (
    <Panel description="Модулийн график хэвтээ ба босоо чиглэлд шилжинэ.">
      <Diagram label="Шилжсэн модулийн график">
        {p.axes}
        <g clipPath={p.clip}>
          <path
            d={p.curve((x) => Math.abs(x - h) + k)}
            fill="none"
            stroke={C.brand}
            strokeWidth={3}
          />
          <Point x={p.x(h)} y={p.y(k)} />
        </g>
      </Diagram>
      <Range
        label="Хэвтээ шилжилт"
        symbol="h"
        value={h}
        min={-4}
        max={4}
        onChange={H}
      />
      <Range
        label="Босоо шилжилт"
        symbol="k"
        value={k}
        min={-4}
        max={4}
        onChange={K}
      />
      <MathValue
        latex={String.raw`y=|x-(${h})|+(${k}),\quad \text{орой }(${h};${k})`}
      />
    </Panel>
  );
}
