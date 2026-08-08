"use client";

import { useEffect, useState } from "react";
import type { ThemeColors } from "./theme";

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
}

// Сургалтын хөтөлбөрийн үндсэн биетүүд — 10 минут тутам дараагийнх нь гарна
export const CATALOG: Solid[] = [
  {
    title: "Куб",
    formula: "$V = a^{3}$",
    dims: [{ label: "ирмэг $a$", colorKey: "m1" }],
  },
  {
    title: "Тэгш өнцөгт параллелепипед",
    formula: "$V = a b h$",
    dims: [{ label: "өндөр $h$", colorKey: "m1" }],
  },
  {
    title: "Зөв гурвалжин суурьтай призм",
    formula: "$V = S h$",
    dims: [{ label: "өндөр $h$", colorKey: "m1" }],
  },
  {
    title: "Зөв дөрвөн өнцөгт суурьтай пирамид",
    formula: "$V = \\frac{1}{3} S h$",
    dims: [{ label: "өндөр $h$", colorKey: "m1" }],
  },
  {
    title: "Конус",
    formula: "$V = \\frac{1}{3}\\pi r^{2} h$",
    dims: [
      { label: "радиус $r$", colorKey: "m1" },
      { label: "өндөр $h$", colorKey: "m2" },
    ],
  },
  {
    title: "Огтлогдсон конус",
    formula: "$V = \\frac{1}{3}\\pi h (R^{2} + R r + r^{2})$",
    dims: [
      { label: "дээд радиус $r$", colorKey: "m1" },
      { label: "доод радиус $R$", colorKey: "m2" },
      { label: "өндөр $h$", colorKey: "m3" },
    ],
  },
  {
    title: "Цилиндр",
    formula: "$V = \\pi r^{2} h$",
    dims: [
      { label: "радиус $r$", colorKey: "m1" },
      { label: "өндөр $h$", colorKey: "m2" },
    ],
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
  },
  {
    title: "Бөмбөрцөг",
    formula: "$V = \\frac{4}{3}\\pi r^{3}$",
    dims: [{ label: "радиус $r$", colorKey: "m1" }],
  },
  {
    title: "Перпендикуляр шулуунууд",
    formula: "$a \\perp b$",
    dims: [
      { label: "шулуун $a$ (хэвтээ)", colorKey: "m1" },
      { label: "шулуун $b$ (босоо)", colorKey: "m2" },
    ],
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
