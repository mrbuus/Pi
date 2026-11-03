/**
 * Сонгосон зургийг ямар ч утсан дээр найдвартай уншиж, EXIF-гүй, босоо JPEG болгоно
 * (эзэн 2026-11-03: Galaxy A10 зэрэг 2 ГБ санах ойтой утаснаас зураг «уншигдахгүй»).
 *
 * Хаасан шалтгаанууд:
 *  - createImageBitmap-д `imageOrientation` зэрэг ТОХИРУУЛГА ӨГӨХГҮЙ — хуучин Chrome /
 *    Samsung Internet үл таних enum-д TypeError шиддэг.
 *  - EXIF эргэлтийг өөрсдөө уншина (exifOrientation.ts). Decode зам бүр (createImageBitmap,
 *    <img>) EXIF-ийг автоматаар хэрэглэдэг эсэхийг ажиллах үед жижиг туршилтын JPEG-ээр
 *    нэг удаа шалгаж санана; хэрэглээгүй бол canvas дээр өөрсдөө эргүүлнэ.
 *  - Android-ийн content:// файл хожим NotReadableError өгдөг — сонгосон даруйд байтыг нь
 *    санах ойд хуулна (arrayBuffer → FileReader → нэг удаа дахин).
 *  - Санах ой: bitmap/canvas-ийг тухай бүр суллана, амжилтгүй бол урт талыг
 *    2000 → 1600 → 1200 болгож дахин оролдоно; toBlob null бол toDataURL нөөц.
 *  - HEIC задалж чадахгүй бол ойлгомжтой Монгол алдаа.
 */

import {
  isJpeg,
  orientationTransform,
  readJpegOrientation,
  readJpegSize,
  sniffImageType,
  swapsSides,
  withExifOrientation,
  type Orientation,
} from "./exifOrientation";

export const NORMALIZE_LONG_SIDE = 2000;
export const NORMALIZE_QUALITY = 0.88;
const FALLBACK_SIDES = [1600, 1200];
const DECODE_TIMEOUT = 15_000;
const READ_TIMEOUT = 30_000;

export const IMAGE_READ_ERROR = "Зургийг уншиж чадсангүй. Дахин зураарай эсвэл өөр зураг сонгоно уу";
export const HEIC_READ_ERROR =
  "HEIC зургийг уншиж чадсангүй. Камерын тохиргоонд JPEG хэлбэр сонгоод дахин зураарай эсвэл өөр зураг сонгоно уу";

/** Хэрэглэгчид харуулах Монгол алдаатай. `heic` — HEIC/HEIF файл байсан эсэх */
export class ImageReadError extends Error {
  readonly heic: boolean;
  constructor(heic = false) {
    super(heic ? HEIC_READ_ERROR : IMAGE_READ_ERROR);
    this.name = "ImageReadError";
    this.heic = heic;
  }
}

/** Босоо (EXIF хэрэглэсэн) зураг: `drawImage(source, 0, 0, width, height)` зурахад босоо гарна */
export interface UprightImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  close(): void;
}

type Decoded = UprightImage;
type DecodePath = "bitmap" | "img";
type ExifBehavior = "auto" | "raw" | "unknown";
interface ImageInfo {
  orientation: Orientation;
  size: { width: number; height: number } | null;
}

const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number, onLate?: (v: T) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const t = setTimeout(() => {
      settled = true;
      reject(new Error("timeout"));
    }, ms);
    p.then(
      (v) => {
        if (settled) return onLate?.(v);
        settled = true;
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** iOS Safari canvas-ийн нийт санах ойг хязгаарладаг — ашигласан canvas-ийг шууд суллана */
export function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

function readOnce(blob: Blob): Promise<Uint8Array> {
  const viaReader = () =>
    new Promise<ArrayBuffer>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => (r.result instanceof ArrayBuffer ? resolve(r.result) : reject(new Error("read")));
      r.onerror = () => reject(r.error ?? new Error("read"));
      r.readAsArrayBuffer(blob);
    });
  const run = async () => {
    if (typeof blob.arrayBuffer === "function") {
      try {
        return new Uint8Array(await blob.arrayBuffer());
      } catch {
        // доорх FileReader зам руу
      }
    }
    return new Uint8Array(await viaReader());
  };
  return withTimeout(run(), READ_TIMEOUT);
}

/** Файлын бүх байт. Алдвал (эсвэл 0 байт) хэсэг хүлээгээд нэг удаа дахин уншина */
export async function readFileBytes(blob: Blob): Promise<Uint8Array> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await pause(400);
    try {
      const bytes = await readOnce(blob);
      if (bytes.length) return bytes;
    } catch {
      // дахин оролдоно
    }
  }
  throw new ImageReadError(looksHeic(blob, null));
}

function looksHeic(blob: Blob, bytes: Uint8Array | null): boolean {
  const name = blob instanceof File ? blob.name : "";
  return /hei[cf]/i.test(blob.type) || /\.hei[cf]$/i.test(name) || (!!bytes && sniffImageType(bytes) === "image/heic");
}

function asFile(bytes: Uint8Array | Blob, name: string, type: string): File {
  return new File([bytes as BlobPart], name, { type, lastModified: Date.now() });
}

/**
 * Сонгосон файлын байтыг ДАРУЙ санах ойд хуулна (Android-ийн content:// файл хожим
 * уншигдахгүй болох, камер/Google Photos файлыг өөрчлөхөөс сэргийлнэ).
 */
export async function copyFileToMemory(file: File): Promise<File> {
  const bytes = await readFileBytes(file);
  return asFile(bytes, file.name || "zurag", sniffImageType(bytes) ?? file.type ?? "");
}

// ---------------------------------------------------------------- decode

async function decodeVia(path: DecodePath, blob: Blob, ms: number): Promise<Decoded> {
  if (path === "bitmap") {
    if (typeof createImageBitmap !== "function") throw new Error("no createImageBitmap");
    // ТОХИРУУЛГАГҮЙ — хуучин хөтөч үл таних тохиргоонд TypeError шиддэг
    const bmp = await withTimeout(createImageBitmap(blob), ms, (late) => late.close());
    if (!bmp.width || !bmp.height) {
      bmp.close();
      throw new Error("empty bitmap");
    }
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  }
  if (typeof Image === "undefined") throw new Error("no Image");
  const url = URL.createObjectURL(blob);
  const img = new Image();
  const cleanup = () => {
    img.onload = null;
    img.onerror = null;
    img.removeAttribute("src");
    URL.revokeObjectURL(url);
  };
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const ok = () => {
        if (settled || !img.naturalWidth || !img.naturalHeight) return;
        settled = true;
        clearTimeout(t);
        resolve();
      };
      const fail = (e: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        reject(e);
      };
      const t = setTimeout(() => fail(new Error("timeout")), ms);
      img.onload = ok;
      img.onerror = () => fail(new Error("img error"));
      img.decoding = "async";
      img.src = url;
      // decode() байвал түүгээр, үгүй/алдвал onload/onerror шийднэ
      if (typeof img.decode === "function") img.decode().then(ok, () => undefined);
    });
  } catch (e) {
    cleanup();
    throw e;
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: cleanup };
}

let probeCache: Promise<Record<DecodePath, ExifBehavior>> | null = null;

/**
 * Decode зам бүр EXIF эргэлтийг автоматаар хэрэглэдэг эсэх (нэг удаа шалгаж санана).
 * 16×8 (зүүн тал хар, баруун тал цагаан) JPEG-д orientation=6 шургуулж, буцаасан хэмжээ
 * болон зурсан пикселийг шалгана: 8×16 + дээд тал хар = "auto", 16×8 + зүүн тал хар = "raw".
 */
function probeExifBehavior(): Promise<Record<DecodePath, ExifBehavior>> {
  probeCache ??= runProbe().catch(() => ({ bitmap: "unknown", img: "unknown" }) as Record<DecodePath, ExifBehavior>);
  return probeCache;
}

async function runProbe(): Promise<Record<DecodePath, ExifBehavior>> {
  const result: Record<DecodePath, ExifBehavior> = { bitmap: "unknown", img: "unknown" };
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 8;
  const ctx = c.getContext("2d");
  if (!ctx) return result;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 16, 8);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 8, 8);
  const plain = await canvasToJpeg(c, 0.95);
  releaseCanvas(c);
  const bytes = withExifOrientation(await readFileBytes(plain), 6);
  const blob = new Blob([bytes as BlobPart], { type: "image/jpeg" });
  for (const path of ["bitmap", "img"] as const) {
    let d: Decoded | null = null;
    try {
      d = await decodeVia(path, blob, 4000);
      result[path] = classifyProbe(d);
    } catch {
      // "unknown" хэвээр
    } finally {
      d?.close();
    }
  }
  return result;
}

function classifyProbe(d: Decoded): ExifBehavior {
  const { width: w, height: h } = d;
  const oriented = w === 8 && h === 16;
  const raw = w === 16 && h === 8;
  if (!oriented && !raw) return "unknown";
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  try {
    const ctx = c.getContext("2d");
    if (!ctx) return oriented ? "auto" : "raw";
    ctx.drawImage(d.source, 0, 0, w, h);
    const luma = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[0];
    // Хэмжээ ба зурсан агуулга зөрвөл тэр замд эргэлттэй зураг даатгахгүй
    if (oriented) return luma(4, 3) < 100 && luma(4, 12) > 160 ? "auto" : "unknown";
    return luma(3, 4) < 100 && luma(12, 4) > 160 ? "raw" : "unknown";
  } catch {
    return oriented ? "auto" : "raw";
  } finally {
    releaseCanvas(c);
  }
}

/** Бид canvas дээр хэрэглэх эргэлт: 1 = хөтөч аль хэдийн босоо болгосон (эсвэл EXIF-гүй) */
function decideTransform(info: ImageInfo, d: Decoded, behavior: ExifBehavior): Orientation {
  const o = info.orientation;
  if (o === 1) return 1;
  const s = info.size;
  // Энэ зургийн өөрийн нотолгоо: хадгалсан хэмжээтэй харьцуулна (дөрвөлжин бол ялгаагүй)
  if (swapsSides(o) && s && s.width !== s.height) {
    if (d.width === s.height && d.height === s.width) return 1;
    if (d.width === s.width && d.height === s.height) return o;
  }
  return behavior === "raw" ? o : 1;
}

async function decodeForDraw(blob: Blob, info: ImageInfo): Promise<{ d: Decoded; transform: Orientation }> {
  let order: DecodePath[] = ["bitmap", "img"];
  let probe: Record<DecodePath, ExifBehavior> = { bitmap: "unknown", img: "unknown" };
  if (info.orientation !== 1) {
    probe = await probeExifBehavior();
    // EXIF зан төлөв нь тодорхой замыг түрүүлж ашиглана
    const known = (p: DecodePath) => (probe[p] === "unknown" ? 1 : 0);
    order = [...order].sort((a, b) => known(a) - known(b));
  }
  let lastErr: unknown = new Error("decode");
  for (const path of order) {
    try {
      const d = await decodeVia(path, blob, DECODE_TIMEOUT);
      return { d, transform: decideTransform(info, d, probe[path]) };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/** Цагаан дэвсгэртэй canvas дээр босоо болгож, урт талыг `longSide` хүртэл багасгаж зурна */
function drawUpright(d: Decoded, o: Orientation, longSide: number): HTMLCanvasElement {
  const t = orientationTransform(o, d.width, d.height);
  const k = Math.min(1, longSide / Math.max(t.width, t.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(t.width * k));
  canvas.height = Math.max(1, Math.round(t.height * k));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    releaseCanvas(canvas);
    throw new Error("no 2d context");
  }
  ctx.fillStyle = "#ffffff"; // тунгалаг PNG-ийн дэвсгэр (JPEG-д алфа байхгүй)
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.scale(canvas.width / t.width, canvas.height / t.height);
  const [a, b, c, e, f, g] = t.matrix;
  ctx.transform(a, b, c, e, f, g);
  ctx.drawImage(d.source, 0, 0, d.width, d.height);
  assertPainted(ctx, canvas);
  return canvas;
}

/** Санах ой дутсан canvas хоосон (тунгалаг) үлддэг — цагаан дэвсгэр ч алга бол алдаа */
function assertPainted(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  let alpha = 255;
  try {
    alpha = ctx.getImageData(0, 0, 1, 1).data[3];
  } catch {
    return; // шалгаж чадахгүй — үргэлжлүүлнэ
  }
  if (alpha === 0) {
    releaseCanvas(canvas);
    throw new Error("canvas not painted");
  }
}

/** canvas → JPEG Blob. toBlob null/байхгүй/гацвал toDataURL-аар нөөцөлнө */
export async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  if (typeof canvas.toBlob === "function") {
    try {
      const blob = await withTimeout(
        new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality)),
        DECODE_TIMEOUT,
      );
      if (blob && blob.size > 0 && blob.type === "image/jpeg") return blob;
    } catch {
      // доорх toDataURL зам руу
    }
  }
  const url = canvas.toDataURL("image/jpeg", quality);
  const comma = url.indexOf(",");
  if (!url.startsWith("data:image/jpeg") || comma < 0 || comma === url.length - 1)
    throw new Error("jpeg encode failed");
  const bin = atob(url.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "image/jpeg" });
}

function infoOf(bytes: Uint8Array | null): ImageInfo {
  return bytes && isJpeg(bytes)
    ? { orientation: readJpegOrientation(bytes), size: readJpegSize(bytes) }
    : { orientation: 1, size: null };
}

/**
 * Зургийг босоо байдлаар задална. Хөтөч EXIF-ийг өөрөө хэрэглэсэн (эсвэл EXIF-гүй) бол
 * decode хийсэн эх сурвалжийг шууд, үгүй бол өөрсдөө эргүүлсэн canvas-ийг (урт тал
 * ≤ maxSide) буцаана. Ашиглаад `close()` заавал дуудна. Алдвал ImageReadError.
 */
export async function decodeUpright(blob: Blob, opts: { maxSide?: number } = {}): Promise<UprightImage> {
  // EXIF/SOF нь файлын эхэнд — бүтнээр нь уншихгүй
  const head = await readFileBytes(blob.slice(0, 512 * 1024)).catch(() => null);
  let dec: { d: Decoded; transform: Orientation };
  try {
    dec = await decodeForDraw(blob, infoOf(head));
  } catch {
    throw new ImageReadError(looksHeic(blob, head));
  }
  if (dec.transform === 1) return dec.d;
  try {
    const sides = [opts.maxSide ?? 2400, ...FALLBACK_SIDES.filter((s) => s < (opts.maxSide ?? 2400))];
    for (const side of sides) {
      try {
        const canvas = drawUpright(dec.d, dec.transform, side);
        return { source: canvas, width: canvas.width, height: canvas.height, close: () => releaseCanvas(canvas) };
      } catch {
        await pause(60);
      }
    }
    throw new ImageReadError(false);
  } finally {
    dec.d.close();
  }
}

async function renderJpeg(blob: Blob, info: ImageInfo, sides: number[], quality: number): Promise<Blob> {
  let dec: { d: Decoded; transform: Orientation } | null = null;
  let lastErr: unknown = new Error("render");
  try {
    for (const side of sides) {
      // decode алдаа шууд гарна (жижгэрүүлэх нь decode-д тус болохгүй)
      dec ??= await decodeForDraw(blob, info);
      let canvas: HTMLCanvasElement | null = null;
      try {
        canvas = drawUpright(dec.d, dec.transform, side);
        // Том bitmap-ыг шахахаас өмнө суллана (2 ГБ утсанд чухал)
        dec.d.close();
        dec = null;
        return await canvasToJpeg(canvas, quality);
      } catch (e) {
        lastErr = e;
      } finally {
        if (canvas) releaseCanvas(canvas);
      }
      await pause(60);
    }
  } finally {
    dec?.d.close();
  }
  throw lastErr;
}

export interface NormalizeOptions {
  /** Урт талын дээд хэмжээ (анхдагч 2000) */
  longSide?: number;
  /** JPEG чанар (анхдагч 0.88) */
  quality?: number;
}

/**
 * Сонгосон зургийг EXIF-гүй, босоо, JPEG (урт тал ≤2000, q≈0.88) File болгоно. Нэг дор нэг
 * зураг боловсруулна (дуудагч дараалан дуудна). Алдвал ImageReadError (Монгол бичвэртэй).
 */
export async function normalizePickedImage(file: File, opts: NormalizeOptions = {}): Promise<File> {
  const bytes = await readFileBytes(file);
  const heic = looksHeic(file, bytes);
  const info = infoOf(bytes);
  const blob = new Blob([bytes as BlobPart], { type: sniffImageType(bytes) ?? file.type ?? "" });
  const longSide = opts.longSide ?? NORMALIZE_LONG_SIDE;
  const quality = opts.quality ?? NORMALIZE_QUALITY;
  const sides = [longSide, ...FALLBACK_SIDES.filter((s) => s < longSide)];
  let out: Blob | null = null;
  try {
    out = await renderJpeg(blob, info, sides, quality);
  } catch {
    // Санах ой чөлөөлөгдөх хугацаа өгөөд хамгийн жижиг хэмжээгээр нэг удаа дахин
    await pause(300);
    out = await renderJpeg(blob, info, sides.slice(-1), quality).catch(() => null);
  }
  if (!out) throw new ImageReadError(heic);
  const base = (file.name || "").replace(/\.[^.]*$/, "") || "zurag";
  return asFile(out, `${base}.jpg`, "image/jpeg");
}
