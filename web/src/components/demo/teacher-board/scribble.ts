import { rngFrom, type Rng } from "../world";

/**
 * Дэвтрийн хуудасны ГАР БИЧМЭЛ дүр төрх — зураггүйгээр, SVG зам (path)-аар.
 * Үсэг бүр жижиг санамсаргүй хэлбэр; тэгшитгэл, бутархай, язгуур, хайрцагтай хариу.
 * Гурван зам буцаана: ink (харандаа), pen (хариу, үзэг), thin (огноо, дугаар).
 */

export const PAGE_W = 600;
export const PAGE_H = 850;
export const LINE_GAP = 34;
export const FIRST_LINE = 118;

export interface PageArt {
  ink: string;
  pen: string;
  thin: string;
}

const f = (n: number) => Math.round(n * 10) / 10;

function smooth(pts: Array<[number, number]>): string {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    d += `Q${f(x1)} ${f(y1)} ${f((x1 + x2) / 2)} ${f((y1 + y2) / 2)}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d}L${f(lx)} ${f(ly)}`;
}

/** Нэг үг: налуу, холбоотой, гогцоотой дугуй долгио — холоос гар бичмэл шиг харагдана */
function word(r: Rng, x: number, y: number, h: number, letters: number): [string, number] {
  const xh = h * 0.8;
  const slant = 0.3;
  const pts: Array<[number, number]> = [[x, y]];
  let cx = x;
  for (let i = 0; i < letters; i++) {
    const tall = r() < 0.2;
    const b = tall ? xh * (1.7 + r() * 0.5) : xh * (0.5 + r() * 0.5);
    const s = (6 + r() * 3.5) * (h / 10);
    const loop = tall ? s * 0.28 : r() < 0.25 ? s * 0.15 : 0;
    for (let k = 1; k <= 7; k++) {
      const t = (k / 7) * Math.PI * 2;
      const hy = (b * (1 - Math.cos(t))) / 2;
      pts.push([cx + (s * t) / (Math.PI * 2) - loop * Math.sin(t) + hy * slant, y - hy]);
    }
    cx += s;
  }
  return [smooth(pts), cx - x + 2];
}

function textLine(r: Rng, x0: number, y: number, maxW: number, h = 13): string {
  let cx = x0;
  let d = "";
  for (let guard = 0; guard < 14; guard++) {
    const [p, w] = word(r, cx, y, h, 2 + Math.floor(r() * 5));
    if (cx + w > x0 + maxW) break;
    d += p;
    cx += w + 6 + r() * 6;
  }
  return d;
}

function operator(r: Rng, x: number, y: number): [string, number] {
  const t = r();
  if (t < 0.4) return [`M${x} ${y - 7}L${x + 10} ${y - 7}M${x} ${y - 3}L${x + 10} ${y - 3}`, 20];
  if (t < 0.75) return [`M${x + 1} ${y - 5}L${x + 11} ${y - 5}M${x + 6} ${y - 10}L${x + 6} ${y}`, 22];
  return [`M${x} ${y - 5}L${x + 10} ${y - 5}`, 20];
}

function mathLine(r: Rng, x0: number, y: number, maxW: number): string {
  let cx = x0;
  let d = "";
  const parts = 3 + Math.floor(r() * 3);
  for (let i = 0; i < parts && cx < x0 + maxW - 60; i++) {
    const t = r();
    if (t < 0.28) {
      const [p, w] = word(r, cx, y, 13, 2 + Math.floor(r() * 3));
      d += p;
      cx += w + 5;
    } else if (t < 0.5) {
      const w = 26 + r() * 22;
      d += `M${f(cx)} ${y - 5}L${f(cx + w)} ${y - 5}`;
      d += word(r, cx + 3, y - 8, 8.5, 2 + Math.floor(r() * 2))[0];
      d += word(r, cx + 3, y + 10, 8.5, 2 + Math.floor(r() * 2))[0];
      cx += w + 6;
    } else if (t < 0.66) {
      const w = 18 + r() * 14;
      d += `M${f(cx)} ${y - 3}L${f(cx + 4)} ${y + 1}L${f(cx + 9)} ${y - 16}L${f(cx + 9 + w)} ${y - 16}`;
      d += word(r, cx + 12, y, 11, 2 + Math.floor(r() * 2))[0];
      cx += 9 + w + 6;
    } else if (t < 0.82) {
      const [p, w] = word(r, cx, y, 13, 1 + Math.floor(r() * 2));
      d += p;
      d += word(r, cx + w + 1, y - 9, 7, 1)[0];
      cx += w + 14;
    } else {
      const [p, w] = word(r, cx, y, 13, 1 + Math.floor(r() * 2));
      d += p;
      cx += w + 5;
    }
    const [op, adv] = operator(r, cx, y);
    d += op;
    cx += adv + 4;
  }
  return d;
}

function answerBox(r: Rng, x: number, y: number): string {
  const w = 44 + r() * 40;
  const tilt = (r() - 0.5) * 2;
  return (
    `M${f(x)} ${f(y - 17 + tilt)}L${f(x + w)} ${f(y - 17)}L${f(x + w)} ${f(y + 6)}L${f(x)} ${f(y + 6 + tilt)}Z` +
    word(r, x + 8, y, 13, 2 + Math.floor(r() * 3))[0]
  );
}

/** Нэг хуудасны гар бичмэл. seed: сурагч+өдөр; pageIdx 0-ээс эхэлнэ */
export function buildPage(seed: number, pageIdx: number, total: number): PageArt {
  const r = rngFrom(seed + pageIdx * 7919);
  let ink = "";
  let pen = "";
  let thin = "";

  // Гарчиг ба огноо (дээд талд)
  pen += textLine(r, 84, 70, 200, 15);
  thin += textLine(r, 440, 70, 100, 11);

  const lastPage = pageIdx === total - 1;
  const rows = lastPage && total > 1 ? 9 + Math.floor(r() * 7) : 19;
  let k = 0;
  while (k < rows) {
    const y = FIRST_LINE + LINE_GAP * k - 6;
    // Бодлогын дугаар
    thin += word(r, 72, y, 9, 1)[0] + `M${f(86)} ${y - 12}Q${f(91)} ${y - 5} ${f(86)} ${y + 2}`;
    ink += textLine(r, 100, y, 380 + r() * 40);
    k++;
    const steps = 2 + Math.floor(r() * 2);
    for (let s = 0; s < steps && k < rows; s++, k++) {
      const yy = FIRST_LINE + LINE_GAP * k - 6;
      ink += r() < 0.7 ? mathLine(r, 100, yy, 400) : textLine(r, 100, yy, 300 + r() * 120);
    }
    if (k < rows) {
      const ya = FIRST_LINE + LINE_GAP * k - 6;
      pen += answerBox(r, 110, ya);
      k++;
    }
    if (r() < 0.5) k++;
  }

  // Хуудасны дугаар (доод талд)
  thin += word(r, 296, 830, 8, 1)[0];
  return { ink, pen, thin };
}

/** Хуудасны сул шугам (нэг path-д нэгтгэсэн) */
export const RULED_LINES = Array.from({ length: 21 }, (_, i) => `M0 ${FIRST_LINE + LINE_GAP * i}H${PAGE_W}`).join("");
