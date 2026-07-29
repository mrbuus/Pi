"use client";

import { useEffect, useState } from "react";
import type { ThemeColors } from "./theme";
import { FlatWire, MeasureLine, RightAngleMark, Wire } from "./primitives";

/* ============================================================================
 * 3D биетийн каталог (Шийдвэр 10) — нүүр хуудасны 3D элемент 10 минут тутам
 * дараагийн биетээ харуулна: хэмжигдэхүүн нь (өндөр h, радиус r, ирмэг a)
 * тус бүр ӨӨР өнгөөр ялгарч, хажууд нь нэр + томьёотой тайлбар гарна.
 *
 * «Бага энерги — их бүтээмж» зарчим:
 *   - Сервер огт оролцохгүй: биет = каталог[цагийн слот % урт] — бүх
 *     хэрэглэгчид тухайн 10 минутад ижил биет, API дуудлага 0
 *   - Модель файл татахгүй — Three.js-ийн бэлэн геометрүүд (сүлжээний ачаалал ~0)
 *   - prefers-reduced-motion үед автомат эргэлтгүй + frameloop="demand"
 * ========================================================================== */

// Нэг хэмжигдэхүүний тайлбар — легендэд нэр + өнгөний холбоос болно.
export interface Dimension {
  label: string; // жишээ: "радиус r"
  colorKey: "m1" | "m2" | "m3" | "m4";
}

export interface Solid {
  title: string;
  formula: string;
  dims: Dimension[];
  render: (colors: ThemeColors) => React.ReactNode;
}

// Сургалтын хөтөлбөрийн үндсэн биетүүд — 10 минут тутам дараагийнх нь гарна
export const CATALOG: Solid[] = [
  {
    title: "Куб",
    formula: "$V = a^{3}$",
    dims: [{ label: "ирмэг $a$", colorKey: "m1" }],
    render: (c) => (
      <>
        <mesh>
          <boxGeometry args={[1.7, 1.7, 1.7]} />
          <FlatWire colors={c} />
        </mesh>
        <MeasureLine axis="y" from={-0.85} to={0.85} at={[0.85, 0.85]} color={c.m1} />
      </>
    ),
  },
  {
    title: "Тэгш өнцөгт параллелепипед",
    formula: "$V = a b h$",
    dims: [{ label: "өндөр $h$", colorKey: "m1" }],
    render: (c) => (
      <>
        <mesh>
          <boxGeometry args={[2.1, 1.2, 1.4]} />
          <FlatWire colors={c} />
        </mesh>
        <MeasureLine axis="y" from={-0.6} to={0.6} at={[1.05, 0.7]} color={c.m1} />
      </>
    ),
  },
  {
    title: "Зөв гурвалжин суурьтай призм",
    formula: "$V = S h$",
    dims: [{ label: "өндөр $h$", colorKey: "m1" }],
    render: (c) => (
      <>
        <mesh>
          <cylinderGeometry args={[1.15, 1.15, 1.7, 3]} />
          <FlatWire colors={c} />
        </mesh>
        <MeasureLine axis="y" from={-0.85} to={0.85} color={c.m1} />
      </>
    ),
  },
  {
    title: "Зөв дөрвөн өнцөгт суурьтай пирамид",
    formula: "$V = \\frac{1}{3} S h$",
    dims: [{ label: "өндөр $h$", colorKey: "m1" }],
    render: (c) => (
      <>
        <mesh position={[0, -0.1, 0]}>
          <coneGeometry args={[1.35, 1.7, 4]} />
          <FlatWire colors={c} />
        </mesh>
        <MeasureLine axis="y" from={-0.95} to={0.75} color={c.m1} />
      </>
    ),
  },
  {
    title: "Конус",
    formula: "$V = \\frac{1}{3}\\pi r^{2} h$",
    dims: [
      { label: "радиус $r$", colorKey: "m1" },
      { label: "өндөр $h$", colorKey: "m2" },
    ],
    render: (c) => (
      <>
        <mesh position={[0, -0.05, 0]}>
          <coneGeometry args={[1.1, 1.8, 48]} />
          <Wire colors={c} />
        </mesh>
        {/* радиус r — суурийн хавтгай дээгүүр төвөөс ирмэг хүртэл */}
        <MeasureLine axis="x" from={0} to={1.1} at={[-0.95, 0]} color={c.m1} />
        {/* өндөр h — биетийн төв тэнхлэгийн дагуу, суурийн төвөөс оройг хүртэл */}
        <MeasureLine axis="y" from={-0.95} to={0.85} at={[0, 0]} color={c.m2} />
      </>
    ),
  },
  {
    title: "Огтлогдсон конус",
    formula: "$V = \\frac{1}{3}\\pi h (R^{2} + R r + r^{2})$",
    dims: [
      { label: "дээд радиус $r$", colorKey: "m1" },
      { label: "доод радиус $R$", colorKey: "m2" },
      { label: "өндөр $h$", colorKey: "m3" },
    ],
    render: (c) => (
      <>
        <mesh>
          <cylinderGeometry args={[0.65, 1.15, 1.6, 48]} />
          <Wire colors={c} />
        </mesh>
        {/* r — дээд радиус, дээд хавтгай дотор төвөөс ирмэг хүртэл */}
        <MeasureLine axis="x" from={0} to={0.65} at={[0.8, 0]} color={c.m1} />
        {/* R — доод радиус, доод хавтгай дотор төвөөс ирмэг хүртэл */}
        <MeasureLine axis="x" from={0} to={1.15} at={[-0.8, 0]} color={c.m2} />
        {/* h — биетийн төв тэнхлэгийн дагуу, доод хавтгайн төвөөс дээд хавтгайн төв хүртэл */}
        <MeasureLine axis="y" from={-0.8} to={0.8} at={[0, 0]} color={c.m3} />
      </>
    ),
  },
  {
    title: "Цилиндр",
    formula: "$V = \\pi r^{2} h$",
    dims: [
      { label: "радиус $r$", colorKey: "m1" },
      { label: "өндөр $h$", colorKey: "m2" },
    ],
    render: (c) => (
      <>
        <mesh>
          <cylinderGeometry args={[1.0, 1.0, 1.7, 48]} />
          <Wire colors={c} />
        </mesh>
        <MeasureLine axis="x" from={0} to={1.0} at={[-0.85, 0]} color={c.m1} />
        <MeasureLine axis="y" from={-0.85} to={0.85} at={[0, 0]} color={c.m2} />
      </>
    ),
  },
  {
    title: "Зөв 6 өнцөгт суурьтай призм",
    formula: "$V = \\frac{3\\sqrt{3}}{2} a^{2} h$",
    // Зөв 6 өнцөгтийн хувьд тойргийн радиус = ирмэгийн урттай тэнцүү тул
    // cylinderGeometry-ийн radius-аа шууд "ирмэг a" гэж тэмдэглэж болно.
    dims: [
      { label: "ирмэг $a$", colorKey: "m1" },
      { label: "өндөр $h$", colorKey: "m2" },
    ],
    render: (c) => (
      <>
        <mesh>
          <cylinderGeometry args={[1.05, 1.05, 1.7, 6]} />
          <FlatWire colors={c} />
        </mesh>
        <MeasureLine axis="x" from={0} to={1.05} at={[-0.85, 0]} color={c.m1} />
        <MeasureLine axis="y" from={-0.85} to={0.85} at={[0, 0]} color={c.m2} />
      </>
    ),
  },
  {
    title: "Бөмбөрцөг",
    formula: "$V = \\frac{4}{3}\\pi r^{3}$",
    dims: [{ label: "радиус $r$", colorKey: "m1" }],
    render: (c) => (
      <>
        <mesh>
          <sphereGeometry args={[1.4, 28, 20]} />
          <Wire colors={c} />
        </mesh>
        <MeasureLine axis="x" from={0} to={1.4} color={c.m1} />
      </>
    ),
  },
  {
    title: "Перпендикуляр шулуунууд",
    formula: "$a \\perp b$",
    dims: [
      { label: "шулуун $a$ (хэвтээ)", colorKey: "m1" },
      { label: "шулуун $b$ (босоо)", colorKey: "m2" },
    ],
    render: (c) => (
      <>
        <MeasureLine axis="x" from={-0.5} to={0.9} at={[-0.5, 0]} color={c.m1} />
        <MeasureLine axis="y" from={-0.5} to={0.9} at={[-0.5, 0]} color={c.m2} />
        <RightAngleMark corner={[-0.5, -0.5]} size={0.24} color={c.soft} />
      </>
    ),
  },
];

// Одоогийн 10 минутын цонхыг тодорхойлно (Unix epoch-той уялдсан тул
// цагийн бүсээс үл хамааран бүх хэрэглэгчид ижил үр дүнтэй, тогтвортой).
function slotIndex(date: Date, length: number): number {
  const minutesSinceEpoch = Math.floor(date.getTime() / 60_000);
  const slot = Math.floor(minutesSinceEpoch / 10);
  return ((slot % length) + length) % length;
}

export function solidOfSlot(date = new Date()): Solid {
  return CATALOG[slotIndex(date, CATALOG.length)];
}

// 10 минут тутам дараагийн биетээ автоматаар харуулна — reload хийх
// шаардлагагүй, зөвхөн клиент талын timer, сервер дуудлагагүй.
export function useHeroSolid(): Solid {
  const [solid, setSolid] = useState<Solid>(() => solidOfSlot());

  useEffect(() => {
    const update = () => setSolid(solidOfSlot());
    update();
    // 30 секунд тутам шалгах нь хямд бөгөөд 10 минутын цонх солигдмогц
    // хэдхэн секундэд шинэчлэгдэхэд хангалттай.
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return solid;
}
