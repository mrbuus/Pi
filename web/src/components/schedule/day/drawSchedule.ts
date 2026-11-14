// Өдрийн хуваарийн зургийг Canvas 2D-ээр ШУУД зурна (эзэн 2026-11-08: «Зураг татах» огт
// ажилладаггүй байв). Өмнөх html-to-image нь DOM-ийг SVG foreignObject-оор хуулдаг тул
// Safari/iPhone дээр хоосон эсвэл фонтгүй зураг өгөх, унах тохиолдолтой. Canvas нь бүх
// хөтөчид ижил ажилладаг; монгол кирилл (Ү ү Ө ө) зөв гарахын тулд Onest фонтыг (кирилл
// болон кирилл-өргөтгөл subset) зурахаас ӨМНӨ ачаална.
import type { ExportModel } from "./exportModel";

/** Зураг үргэлж цагаан хуудас (хэрэглэгчийн хар горимоос үл хамаарна) — globals.css :root-тэй ижил */
const C = {
  page: "#FFFFFF",
  head: "#FAF9F6",
  line: "#DFDCD5",
  ink: "#1B1B18",
  dim: "#57544D",
  brand: "#1E3A8A",
  info: "#1D4ED8",
  warn: "#B45309",
  success: "#15803D",
};
const FONT = `"Onest", system-ui, -apple-system, "Segoe UI", sans-serif`;
const W = 1080;
const PAD = 48;
const COLS = { cls: 200, lead: 170, assistant: 170 };
const GAP = 16;

/** Монгол кирилл (ext subset-д Ү Ө) бүх жингээр ачаалагдтал хүлээнэ. */
export async function loadExportFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const sample = "АаБбҮүӨөЁё 0123456789";
  await Promise.all(
    [400, 600, 700, 800].map((w) => document.fonts.load(`${w} 20px Onest`, sample).catch(() => [])),
  );
  await document.fonts.ready;
}

function font(ctx: CanvasRenderingContext2D, size: number, weight = 400) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

/** Үгээр (хэт урт үгийг тэмдэгтээр) мөр таслана. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of String(text).split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= width) {
        line = next;
        continue;
      }
      if (line) out.push(line);
      if (ctx.measureText(word).width <= width) {
        line = word;
        continue;
      }
      // Хэт урт үг — тэмдэгтээр
      let part = "";
      for (const ch of word) {
        if (ctx.measureText(part + ch).width > width && part) {
          out.push(part);
          part = ch;
        } else part += ch;
      }
      line = part;
    }
    out.push(line);
  }
  return out.length ? out : [""];
}

interface Op {
  (ctx: CanvasRenderingContext2D, y: number): void;
}

/**
 * Хуудсыг хоёр шаттай зурна: эхлээд өндрийг тооцоолж (measure), дараа нь зөв хэмжээтэй
 * canvas дээр зурна. `scale` — пикселийн нягт (2 = ретина).
 */
export function drawSchedule(model: ExportModel, scale: number): HTMLCanvasElement {
  const measure = document.createElement("canvas").getContext("2d")!;
  const ops: { y: number; op: Op }[] = [];
  let y = PAD;
  const at = (op: Op) => ops.push({ y, op });

  const text = (s: string, x: number, size: number, weight: number, color: string, dy = 0) =>
    at((ctx, top) => {
      font(ctx, size, weight);
      ctx.fillStyle = color;
      ctx.fillText(s, x, top + dy);
    });

  // ---- Толгой ----
  text(`Хичээлийн хуваарь, ${model.year}`, PAD, 24, 700, C.brand, 24);
  y += 36;
  text(model.title, PAD, 40, 800, C.ink, 40);
  y += 56;
  for (const n of model.notices) {
    font(measure, 20, 600);
    for (const line of wrap(measure, n, W - PAD * 2)) {
      text(line, PAD, 20, 600, C.warn, 20);
      y += 28;
    }
  }

  const testX = PAD + 20 + COLS.cls + GAP;
  const leadX = W - PAD - 20 - COLS.assistant - GAP - COLS.lead;
  const assistantX = W - PAD - 20 - COLS.assistant;
  const testW = leadX - GAP - testX;

  for (const b of model.branches) {
    y += 24;
    text(b.name, PAD, 24, 800, C.ink, 24);
    font(measure, 24, 800);
    text(`${b.count} хичээл`, PAD + measure.measureText(b.name).width + 14, 18, 500, C.dim, 24);
    y += 40;
    for (const blk of b.blocks) {
      // Цагийн толгой + баганын нэр
      at((ctx, top) => {
        ctx.fillStyle = C.head;
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 2;
        roundRect(ctx, PAD, top, W - PAD * 2, 44, 12, true);
        font(ctx, 22, 800);
        ctx.fillStyle = C.ink;
        ctx.fillText(blk.time, PAD + 20, top + 30);
        const timeW = ctx.measureText(blk.time).width;
        font(ctx, 15, 600);
        ctx.fillStyle = C.dim;
        ctx.fillText(`${blk.rows.length} анги`, PAD + 20 + timeW + 10, top + 29);
        ctx.fillText("Тест", testX, top + 29);
        ctx.fillText("Ахлах багш", leadX, top + 29);
        ctx.fillText("Туслах багш", assistantX, top + 29);
      });
      y += 44;
      blk.rows.forEach((r, i) => {
        const top = y;
        // Багана тус бүрийн мөрүүд
        font(measure, 21, 600);
        const testLines = wrap(measure, r.tests || "—", testW - (r.done ? 26 : 0));
        font(measure, 19, 500);
        const leadLines = wrap(measure, r.lead || "—", COLS.lead);
        const assistantLines = wrap(measure, r.assistant || "—", COLS.assistant);
        font(measure, 17, 400);
        const extraLines = r.extras.flatMap((x) =>
          wrap(measure, x.label ? `${x.label}: ${x.text}` : x.text, testW).map((line) => ({ line, tone: x.tone })),
        );
        const leftH = 30 + 24;
        const midH = testLines.length * 28 + (extraLines.length ? 6 + extraLines.length * 24 : 0);
        const rightH = Math.max(leadLines.length, assistantLines.length) * 26;
        const h = Math.max(leftH, midH, rightH) + 28;
        ops.push({
          y: top,
          op: (ctx, t) => {
            if (i > 0) {
              ctx.strokeStyle = C.line;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(PAD + 20, t);
              ctx.lineTo(W - PAD - 20, t);
              ctx.stroke();
            }
            // Ангийн өнгө — зүүн зурвас л (өнгийг текст дээр тавихгүй)
            ctx.fillStyle = r.color;
            ctx.fillRect(PAD + 6, t + 14, 5, h - 28);
            font(ctx, 24, 800);
            ctx.fillStyle = C.ink;
            ctx.fillText(r.className, PAD + 20, t + 40);
            font(ctx, 15, 400);
            ctx.fillStyle = C.dim;
            ctx.fillText(r.sub, PAD + 20, t + 64);
            let ty = t + 38;
            font(ctx, 21, 600);
            testLines.forEach((line, li) => {
              let x = testX;
              if (r.done && li === 0) {
                drawCheck(ctx, x, ty - 15, C.success);
                x += 26;
              } else if (r.done) x += 26;
              ctx.fillStyle = r.tests ? C.ink : C.dim;
              ctx.fillText(line, x, ty);
              ty += 28;
            });
            if (extraLines.length) ty += 4;
            font(ctx, 17, 400);
            for (const x of extraLines) {
              ctx.fillStyle = x.tone === "info" ? C.info : x.tone === "warn" ? C.warn : C.dim;
              ctx.fillText(x.line, testX, ty);
              ty += 24;
            }
            font(ctx, 19, 500);
            leadLines.forEach((line, li) => {
              ctx.fillStyle = r.lead ? C.ink : C.dim;
              ctx.fillText(line, leadX, t + 38 + li * 26);
            });
            assistantLines.forEach((line, li) => {
              ctx.fillStyle = r.assistant ? C.ink : C.dim;
              ctx.fillText(line, assistantX, t + 38 + li * 26);
            });
          },
        });
        y += h;
      });
      y += 18;
    }
  }

  if (model.footer.length) {
    y += 16;
    for (const f of model.footer) {
      font(measure, 19, 400);
      const lines = wrap(measure, `${f.label}: ${f.text}`, W - PAD * 2);
      for (const line of lines) {
        text(line, PAD, 19, 500, C.dim, 20);
        y += 28;
      }
    }
  }
  y += PAD;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(y * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = C.page;
  ctx.fillRect(0, 0, W, y);
  ctx.textBaseline = "alphabetic";
  for (const o of ops) o.op(ctx, o.y);
  return canvas;
}

/** Нийт өндрийг (CSS px) тооцоолж, canvas-ын хязгаарт багтах нягтыг сонгоно. */
export function pickScale(heightCss: number): number {
  // Safari: нэг canvas ≤ 16.7 мегапиксел, өндөр ≤ 32767px — хоёуланд нь багтаана
  const byArea = Math.sqrt(16_000_000 / (W * Math.max(heightCss, 1)));
  const byHeight = 32_000 / Math.max(heightCss, 1);
  return Math.max(0.5, Math.min(2, byArea, byHeight));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: boolean) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  ctx.stroke();
}

/** «Хийсэн» тэмдэг — lucide Check-тэй ижил хэлбэр (глиф биш, зурна) */
function drawCheck(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 9);
  ctx.lineTo(x + 7, y + 14);
  ctx.lineTo(x + 17, y + 3);
  ctx.stroke();
  ctx.restore();
}

/** Нийт өндрийг урьдчилан мэдэхийн тулд 1x-ээр нэг удаа зурж хэмжинэ. */
export function renderSchedule(model: ExportModel): HTMLCanvasElement {
  const probe = drawSchedule(model, 1);
  const scale = pickScale(probe.height);
  return scale === 1 ? probe : drawSchedule(model, scale);
}
