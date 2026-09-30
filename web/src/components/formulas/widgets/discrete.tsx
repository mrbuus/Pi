"use client";
import { useId, useState } from "react";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
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
} from "./shared";
export function ArithSeq() {
  const [a, A] = useState(2),
    [d, D] = useState(1),
    [n, N] = useState(8),
    values = Array.from({ length: n }, (_, i) => a + i * d),
    lo = Math.min(0, ...values) - 2,
    hi = Math.max(0, ...values) + 2,
    p = usePlot(0, 21, lo, hi);
  return (
    <Panel description="Дараалсан гишүүд ижил ялгавартай. Цэгүүд нэг шулуун дээр байрлана.">
      <Diagram label="Арифметик прогрессийн эхний гишүүд">
        {p.axes}
        <g clipPath={p.clip}>
          {values.map((v, i) => (
            <g key={i}>
              <Line
                x1={p.x(i + 1)}
                x2={p.x(i + 1)}
                y1={p.y(0)}
                y2={p.y(v)}
                color={C.brand}
              />
              <Point x={p.x(i + 1)} y={p.y(v)} />
            </g>
          ))}
        </g>
      </Diagram>
      <Range
        label="Арифметик эхний гишүүн"
        symbol="a_1"
        value={a}
        min={-5}
        max={5}
        onChange={A}
      />
      <Range
        label="Ялгавар"
        symbol="d"
        value={d}
        min={-3}
        max={3}
        onChange={D}
      />
      <Range
        label="Гишүүний тоо"
        symbol="n"
        value={n}
        min={1}
        max={20}
        onChange={N}
      />
      <MathValue latex={String.raw`a_n=a_1+(n-1)d=${num(values[n - 1])}`} />
      <MathValue
        latex={String.raw`S_n=\frac{n(a_1+a_n)}2=${num(values.reduce((s, v) => s + v, 0))}`}
      />
    </Panel>
  );
}
export function GeomSeq() {
  const [b, B] = useState(3),
    [q, Q] = useState(0.5),
    [n, N] = useState(10),
    target = b / (1 - q),
    sums = Array.from(
      { length: n },
      (_, i) => (b * (1 - q ** (i + 1))) / (1 - q),
    ),
    p = usePlot(0, 21, 0, Math.max(target, ...sums) * 1.2);
  return (
    <Panel description="Энд харьцааны модуль нэгээс бага тул хэсэгчилсэн нийлбэрүүд тасархай хязгаарын шулуунд ойртоно. Сөрөг харьцаанд хоёр талаас ээлжилнэ.">
      <Diagram label="Геометр прогрессийн хэсэгчилсэн нийлбэр ба хязгаар">
        {p.axes}
        <g clipPath={p.clip}>
          <Line
            x1={30}
            x2={330}
            y1={p.y(target)}
            y2={p.y(target)}
            color={C.success}
            dashed
          />
          {sums.map((s, i) => (
            <rect
              key={i}
              x={p.x(i + 1) - 4}
              y={p.y(s)}
              width={8}
              height={p.y(0) - p.y(s)}
              fill={C.brand}
            />
          ))}
        </g>
      </Diagram>
      <Range
        label="Геометр эхний гишүүн"
        symbol="b_1"
        value={b}
        min={1}
        max={5}
        onChange={B}
      />
      <Range
        label="Прогрессийн харьцаа"
        symbol="q"
        value={q}
        min={-0.9}
        max={0.9}
        step={0.1}
        onChange={Q}
      />
      <Range
        label="Нийлбэрийн гишүүний тоо"
        symbol="n"
        value={n}
        min={1}
        max={20}
        onChange={N}
      />
      <MathValue
        latex={String.raw`S_n=${num(sums[n - 1])},\quad S=\frac{b_1}{1-q}=${num(target)}`}
      />
      <MathValue
        latex={String.raw`|S-S_n|=${num(Math.abs(target - sums[n - 1]))}`}
      />
    </Panel>
  );
}
export function PascalTriangle() {
  const [n, N] = useState(5),
    id = useId(),
    rows: number[][] = [[1]];
  for (let r = 1; r <= n; r++)
    rows.push(
      Array.from(
        { length: r + 1 },
        (_, k) => (rows[r - 1][k - 1] ?? 0) + (rows[r - 1][k] ?? 0),
      ),
    );
  return (
    <Panel description="Тоонууд нь дээрх зүүн, баруун хоёр тооны нийлбэр. Мөрийн нийлбэр нь хоёрын тухайн зэрэгтэй тэнцэнэ.">
      <Diagram label="Паскалийн гурвалжны мөрүүд">
        {rows.map((row, r) =>
          row.map((v, k) => (
            <g key={`${r}-${k}`}>
              <circle
                cx={180 + (k - r / 2) * 34}
                cy={22 + r * 28}
                r={13}
                fill={r === n ? C.tint : C.surface}
                stroke={C.line}
              />
              <foreignObject
                x={164 + (k - r / 2) * 34}
                y={9 + r * 28}
                width={32}
                height={26}
              >
                <div className="text-center text-[10px] text-ink">
                  <MathText showErrorInTeacherView>{`$${v}$`}</MathText>
                </div>
              </foreignObject>
            </g>
          )),
        )}
      </Diagram>
      <Range
        label="Паскалийн мөр"
        symbol="n"
        value={n}
        min={0}
        max={8}
        onChange={N}
      />
      <MathValue
        latex={String.raw`\sum_{k=0}^{${n}}\binom{${n}}k=2^{${n}}=${2 ** n}`}
      />
      <details>
        <summary
          className="min-h-11 cursor-pointer text-sm font-medium"
          aria-controls={id}
        >
          Мөрүүдийг хүснэгтээр харах
        </summary>
        <div id={id} className="space-y-2">
          {rows.map((row, r) => (
            <MathValue
              key={r}
              latex={String.raw`n=${r}:\quad ${row.join(",\ ")}`}
            />
          ))}
        </div>
      </details>
    </Panel>
  );
}
export function ProbabilityDice() {
  const [n, N] = useState(100),
    [counts, Counts] = useState([0, 0, 0, 0, 0, 0]),
    total = counts.reduce((a, b) => a + b, 0),
    max = Math.max(1 / 6, ...counts.map((c) => (total ? c / total : 0))),
    p = usePlot(0, 7, 0, max * 1.2);
  function roll() {
    const draws = Array.from({ length: n }, () =>
      Math.floor(Math.random() * 6),
    );
    Counts((previous) => {
      const next = [...previous],
        add = Math.min(
          draws.length,
          10_000 - previous.reduce((a, b) => a + b, 0),
        );
      for (let i = 0; i < add; i++) next[draws[i]]++;
      return next;
    });
  }
  return (
    <Panel description="Шударга шоог төхөөрөмж дээр дуурайлган шиднэ. Цөөн туршилтад хэлбэлзэнэ; олон боллоо ч яг тэнцүү давтамж баталгаагүй. Серверт хүсэлт илгээхгүй.">
      <Diagram label="Шооны зургаан талын харьцангуй давтамж ба онолын магадлал">
        {p.axes}
        <Line
          x1={30}
          x2={330}
          y1={p.y(1 / 6)}
          y2={p.y(1 / 6)}
          color={C.success}
          dashed
        />
        {counts.map((c, i) => (
          <rect
            key={i}
            x={p.x(i + 1) - 12}
            y={p.y(total ? c / total : 0)}
            width={24}
            height={p.y(0) - p.y(total ? c / total : 0)}
            fill={C.brand}
          />
        ))}
      </Diagram>
      <Range
        label="Нэг удаагийн шидэлтийн тоо"
        symbol="N"
        value={n}
        min={10}
        max={1000}
        step={10}
        onChange={N}
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={roll} disabled={total >= 10_000}>
          Шоо шидэх
        </Button>
        <Button variant="outline" onClick={() => Counts([0, 0, 0, 0, 0, 0])}>
          Дахин эхлэх
        </Button>
      </div>
      <MathValue
        latex={String.raw`N_{\rm total}=${total},\quad P(k)=\frac16\approx${num(1 / 6)}`}
      />
      <p role="status" className="text-sm">
        Нийт {total} шидэлт. Дээд хязгаар 10000.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {counts.map((c, i) => (
          <MathValue
            key={i}
            latex={String.raw`k=${i + 1}:\quad n_k=${c},\quad f_k=${total ? num(c / total) : String.raw`\text{туршилтгүй}`}`}
          />
        ))}
      </div>
    </Panel>
  );
}
