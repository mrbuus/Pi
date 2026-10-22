/**
 * Зургууд → НЭГ PDF (эзэн 2026-10-18, D13). Хөтөч дээр:
 *   1) зураг бүрийг canvas-аар JPEG болгон шахна (урт тал ≤1600px, q≈0.72), эргүүлэлтийг хэрэгжүүлнэ.
 *      Хуудас PDF_PAGE_BUDGET-ээс том бол чанарыг алхам алхмаар бууруулж, хэрэгтэй бол
 *      хэмжээг багасгана — 10 хуудас ≈ 3 МБ-аас хэтрэхгүй (S3 хадгалалт, утасны дата хямд)
 *   2) `@cantoo/pdf-lib`-ээр зураг бүрийг өөрийн харьцаатай нэг хуудас болгоно
 *   3) `save({ useObjectStreams: true })` → `application/pdf` File
 * HEIC: iOS Safari сонгох үед өөрөө JPEG болгодог; бусад хөтөч задалж чадахгүй бол
 * ойлгомжтой алдаа өгнө. Сан нь зөвхөн дуудах үед ачаалагдана (тусдаа chunk).
 * Онолын зураг, нөхөх тэмдэглэл ашигладаг; гэрийн даалгаварт ч дахин ашиглана.
 */

export const PDF_MAX_PAGES = 10;
export const PDF_LONG_SIDE = 1600;
export const PDF_JPEG_QUALITY = 0.72;
/** Нэг хуудасны зорилтот дээд хэмжээ (байт). Дэвтрийн зураг 1600px-д ихэвчлэн 200–300 КБ */
export const PDF_PAGE_BUDGET = 350 * 1024;
/** Бүтэн PDF-ийн хатуу хязгаар — серверийн 25 МБ-аас хол доогуур */
export const PDF_MAX_BYTES = 12 * 1024 * 1024;
/** Төсөвт багтаах үед туршиж үзэх чанарууд (эхнийх нь opts.quality) */
const FALLBACK_QUALITIES = [0.6, 0.5, 0.42];

export type Rotation = 0 | 90 | 180 | 270;

export interface PdfPhoto {
  file: File;
  rotation?: Rotation;
}

export interface PhotosToPdfOptions {
  longSide?: number;
  quality?: number;
  maxPages?: number;
  fileName?: string;
  /** Хуудас бүр боловсруулагдах үед (0..1) */
  onProgress?: (done: number, total: number) => void;
}

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // доорх <img> зам руу
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
  } catch {
    throw new Error(`«${file.name}» зургийг уншиж чадсангүй. JPG эсвэл PNG зураг сонгоно уу`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Decoded = CanvasImageSource & { width: number; height: number };

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Зургийг шахаж чадсангүй"))), "image/jpeg", quality),
  );
}

/** Эргүүлэлттэйгээр canvas-д зурна (цагаан дэвсгэр — PNG-ийн тунгалаг хэсэг хар болохоос сэргийлнэ). */
function draw(source: Decoded, longSide: number, rotation: Rotation): HTMLCanvasElement {
  const scale = Math.min(1, longSide / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const sideways = rotation === 90 || rotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = sideways ? h : w;
  canvas.height = sideways ? w : h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Зураг боловсруулах боломжгүй хөтөч байна");
  ctx.fillStyle = "#ffffff"; // тунгалаг PNG-ийн дэвсгэр (JPEG-д алфа байхгүй)
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  return canvas;
}

/** iOS Safari canvas-ийн нийт санах ойг хязгаарладаг — ашигласан canvas-ийг шууд суллана. */
function release(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Нэг зургийг шахсан JPEG байт болгоно (эргүүлэлттэй). `budget`-оос том бол чанарыг
 * бууруулж, тэгсэн ч том бол урт талыг 80% болгож дахин оролдоно (нэг удаа).
 */
export async function compressToJpeg(
  photo: PdfPhoto,
  longSide = PDF_LONG_SIDE,
  quality = PDF_JPEG_QUALITY,
  budget = PDF_PAGE_BUDGET,
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const source = await decode(photo.file);
  const rotation = photo.rotation ?? 0;
  const qualities = [quality, ...FALLBACK_QUALITIES.filter((q) => q < quality)];
  try {
    let best: { blob: Blob; width: number; height: number } | null = null;
    for (const side of [longSide, Math.round(longSide * 0.8)]) {
      const canvas = draw(source, side, rotation);
      try {
        for (const q of qualities) {
          const blob = await encode(canvas, q);
          if (!best || blob.size < best.blob.size) best = { blob, width: canvas.width, height: canvas.height };
          if (blob.size <= budget) break;
        }
      } finally {
        release(canvas);
      }
      if (best && best.blob.size <= budget) break;
    }
    if (!best) throw new Error("Зургийг шахаж чадсангүй");
    return { bytes: new Uint8Array(await best.blob.arrayBuffer()), width: best.width, height: best.height };
  } finally {
    if ("close" in source && typeof source.close === "function") source.close();
  }
}

/** Зургуудыг дарааллаар нь нэг PDF болгоно. Хуудас бүр зургийн харьцаатай (урт тал 842pt ≈ A4). */
export async function photosToPdf(
  photos: PdfPhoto[],
  opts: PhotosToPdfOptions = {},
): Promise<{ file: File; pages: number }> {
  const max = opts.maxPages ?? PDF_MAX_PAGES;
  if (!photos.length) throw new Error("Зураг сонгоогүй байна");
  if (photos.length > max) throw new Error(`${max} хүртэл зураг сонгоно`);
  const { PDFDocument } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.create();
  let done = 0;
  for (const photo of photos) {
    const jpeg = await compressToJpeg(photo, opts.longSide, opts.quality);
    const image = await doc.embedJpg(jpeg.bytes);
    const k = 842 / Math.max(jpeg.width, jpeg.height);
    const pw = jpeg.width * k;
    const ph = jpeg.height * k;
    const page = doc.addPage([pw, ph]);
    page.drawImage(image, { x: 0, y: 0, width: pw, height: ph });
    opts.onProgress?.(++done, photos.length);
    // Утсан дээр дэлгэц хөлдөхгүй — явцын мөр шинэчлэгдэх боломж өгнө
    await new Promise((r) => setTimeout(r, 0));
  }
  const bytes = await doc.save({ useObjectStreams: true });
  if (bytes.length > PDF_MAX_BYTES)
    throw new Error("PDF хэт том болчихлоо. Зургийн тоог цөөлөөд дахин оролдоно уу");
  const file = new File([bytes as BlobPart], opts.fileName ?? "zurag.pdf", { type: "application/pdf" });
  return { file, pages: photos.length };
}
