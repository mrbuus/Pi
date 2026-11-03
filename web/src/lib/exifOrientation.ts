/**
 * JPEG-ийн EXIF эргэлтийг байт түвшинд унших/бичих цэвэр туслахууд (DOM-гүй, node-оор
 * шалгагдана). Хөтөч бүр EXIF эргэлтийг createImageBitmap / <img> / drawImage дээр өөр
 * өөрөөр хэрэглэдэг тул бид orientation-ийг өөрсдөө уншиж, хэрэгтэй бол canvas дээр
 * өөрсдөө эргүүлнэ (imageNormalize.ts).
 */

export type Orientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const TAG_ORIENTATION = 0x0112;

function u16(b: Uint8Array, i: number, little: boolean): number {
  return little ? b[i] | (b[i + 1] << 8) : (b[i] << 8) | b[i + 1];
}

function u32(b: Uint8Array, i: number, little: boolean): number {
  return little
    ? (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0
    : ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
}

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Файлын эхний байтаар төрлийг таана (file.type хоосон/буруу ирэх нь Android дээр түгээмэл). */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (isJpeg(bytes)) return "image/jpeg";
  const ascii = (from: number, len: number) =>
    bytes.length >= from + len ? String.fromCharCode(...Array.from(bytes.subarray(from, from + len))) : "";
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(1, 3) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 2) === "BM") return "image/bmp";
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand)) return "image/heic";
    if (/^(avif|avis)$/.test(brand)) return "image/avif";
  }
  return null;
}

type Segment = { marker: number; start: number; dataStart: number; end: number };

/** JPEG-ийн SOS хүртэлх сегментүүд. Эвдэрсэн бол олдсон хэсгийг л буцаана. */
function segments(b: Uint8Array): Segment[] {
  const out: Segment[] = [];
  if (!isJpeg(b)) return out;
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) break;
    let m = b[i + 1];
    let j = i + 1;
    while (m === 0xff && j + 1 < b.length) m = b[++j]; // дүүргэгч 0xFF байтууд
    const start = j - 1;
    if (m === 0xd9 || m === 0xda) break; // EOI / SOS — дараа нь пикселийн өгөгдөл
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      i = j + 1;
      continue;
    }
    if (j + 3 > b.length) break;
    const len = (b[j + 1] << 8) | b[j + 2];
    if (len < 2) break;
    const end = j + 1 + len;
    if (end > b.length) break;
    out.push({ marker: m, start, dataStart: j + 3, end });
    i = end;
  }
  return out;
}

function isExifApp1(b: Uint8Array, s: Segment): boolean {
  const d = s.dataStart;
  return (
    s.marker === 0xe1 &&
    s.end - d >= 14 &&
    b[d] === 0x45 && // E
    b[d + 1] === 0x78 && // x
    b[d + 2] === 0x69 && // i
    b[d + 3] === 0x66 && // f
    b[d + 4] === 0 &&
    b[d + 5] === 0
  );
}

/** EXIF orientation (1..8). JPEG биш, EXIF-гүй, эвдэрсэн бол 1. */
export function readJpegOrientation(bytes: Uint8Array): Orientation {
  try {
    for (const s of segments(bytes)) {
      if (!isExifApp1(bytes, s)) continue;
      const t = s.dataStart + 6; // TIFF толгой
      const end = s.end;
      if (t + 8 > end) continue;
      const little = bytes[t] === 0x49 && bytes[t + 1] === 0x49;
      const big = bytes[t] === 0x4d && bytes[t + 1] === 0x4d;
      if (!little && !big) continue;
      if (u16(bytes, t + 2, little) !== 42) continue;
      const ifd = t + u32(bytes, t + 4, little);
      if (ifd + 2 > end) continue;
      const count = u16(bytes, ifd, little);
      for (let k = 0; k < count; k++) {
        const e = ifd + 2 + k * 12;
        if (e + 12 > end) break;
        if (u16(bytes, e, little) !== TAG_ORIENTATION) continue;
        const type = u16(bytes, e + 2, little);
        // SHORT (3) байх ёстой; зарим программ LONG (4) бичдэг
        const v = type === 4 ? u32(bytes, e + 8, little) : u16(bytes, e + 8, little);
        return v >= 1 && v <= 8 ? (v as Orientation) : 1;
      }
    }
  } catch {
    // эвдэрсэн файл — эргүүлэхгүй
  }
  return 1;
}

/** SOF сегментээс хадгалсан (эргүүлээгүй) өргөн/өндөр. Олдохгүй бол null. */
export function readJpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  for (const s of segments(bytes)) {
    const m = s.marker;
    const sof = m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
    if (!sof || s.dataStart + 5 > s.end) continue;
    const height = (bytes[s.dataStart + 1] << 8) | bytes[s.dataStart + 2];
    const width = (bytes[s.dataStart + 3] << 8) | bytes[s.dataStart + 4];
    return width > 0 && height > 0 ? { width, height } : null;
  }
  return null;
}

/**
 * JPEG-д зөвхөн orientation-тэй EXIF APP1 сегмент шургуулна (байгаа EXIF APP1-ийг хасна).
 * Ажиллах үед хөтөч EXIF-ийг автоматаар хэрэглэдэг эсэхийг турших зориулалттай.
 * JPEG биш бол оролтыг өөрчлөхгүй буцаана.
 */
export function withExifOrientation(jpegBytes: Uint8Array, orientation: number): Uint8Array {
  if (!isJpeg(jpegBytes)) return jpegBytes;
  const o = Math.max(1, Math.min(8, Math.round(orientation)));
  // prettier-ignore
  const app1 = new Uint8Array([
    0xff, 0xe1, 0x00, 0x22,                   // APP1, урт = 34
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,       // "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // TIFF big-endian, IFD0 @8
    0x00, 0x01,                               // 1 бичлэг
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, o, 0x00, 0x00, // Orientation SHORT
    0x00, 0x00, 0x00, 0x00,                   // дараагийн IFD байхгүй
  ]);
  const segs = segments(jpegBytes);
  // JFIF APP0 байвал түүний дараа, үгүй бол SOI-гийн дараа
  const app0 = segs.find((s) => s.marker === 0xe0 && s.start === 2);
  const insertAt = app0 ? app0.end : 2;
  const drop = segs.filter((s) => isExifApp1(jpegBytes, s));
  const parts: Uint8Array[] = [];
  let pos = 0;
  const cut = (to: number) => {
    if (to > pos) parts.push(jpegBytes.subarray(pos, to));
  };
  cut(insertAt);
  parts.push(app1);
  pos = insertAt;
  for (const s of drop) {
    if (s.start < insertAt) continue;
    cut(s.start);
    pos = s.end;
  }
  cut(jpegBytes.length);
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/**
 * Хадгалсан (эргүүлээгүй) w×h зургийг босоо болгох canvas хувиргалт.
 * `ctx.setTransform(...matrix)` (эсвэл `transform`) хийгээд `drawImage(src, 0, 0, w, h)`
 * зурвал гаралтын `width`×`height` canvas дээр зураг босоо гарна. Масштабыг өмнө нь
 * `ctx.scale` хийж хослуулж болно.
 */
export function orientationTransform(
  o: number,
  w: number,
  h: number,
): { width: number; height: number; matrix: [number, number, number, number, number, number] } {
  switch (o) {
    case 2:
      return { width: w, height: h, matrix: [-1, 0, 0, 1, w, 0] };
    case 3:
      return { width: w, height: h, matrix: [-1, 0, 0, -1, w, h] };
    case 4:
      return { width: w, height: h, matrix: [1, 0, 0, -1, 0, h] };
    case 5:
      return { width: h, height: w, matrix: [0, 1, 1, 0, 0, 0] };
    case 6:
      return { width: h, height: w, matrix: [0, 1, -1, 0, h, 0] };
    case 7:
      return { width: h, height: w, matrix: [0, -1, -1, 0, h, w] };
    case 8:
      return { width: h, height: w, matrix: [0, -1, 1, 0, 0, w] };
    default:
      return { width: w, height: h, matrix: [1, 0, 0, 1, 0, 0] };
  }
}

/** 5–8 нь өргөн/өндрийг сэлгэнэ */
export const swapsSides = (o: number) => o >= 5 && o <= 8;
