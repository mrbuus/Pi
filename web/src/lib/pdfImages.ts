import { fileUrl } from "@/lib/api";

/**
 * Илгээсэн хуудсуудыг (утсан дээр `photosToPdf`-ээр угсарсан файл) апп дотор зураг
 * болгон харуулах. Тэр файл хуудас бүрт НЭГ JPEG агуулдаг тул PDF зурагч сан
 * (pdf.js) хэрэггүй: `@cantoo/pdf-lib`-ээр (аль хэдийн байгаа, тусдаа chunk) задлаад
 * JPEG байтыг шууд `blob:` URL болгоно. Сервер юу ч боловсруулахгүй.
 *
 * Өөр хэлбэрийн файл (JPEG биш хуудас) бол алдаа шиднэ — дуудагч «Шинэ цонхонд
 * нээх» нөөц зам руу шилжинэ. Нэг түлхүүрийг нэг л удаа татна (session кэш).
 */

const cache = new Map<string, Promise<string[]>>();

export class PdfImagesError extends Error {}

function blobUrl(bytes: Uint8Array, type: string) {
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
}

async function extract(key: string): Promise<string[]> {
  const url = fileUrl(key);
  if (!url) throw new PdfImagesError("Файл олдсонгүй");
  // Хоёртын файл тул `api()` (JSON) биш — бүтэн хаягтай fetch. /files/:key нь эрх
  // шалгаад S3-ийн түр холбоос руу 302 хийдэг; S3 CORS нь GET-ийг зөвшөөрсөн.
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new PdfImagesError(res.status === 404 ? "Файл устсан байна" : "Зургийг нээж чадсангүй");
  const bytes = new Uint8Array(await res.arrayBuffer());

  // Шууд зураг (хуучин өгөгдөл) — нэг хуудас
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return [blobUrl(bytes, "image/jpeg")];
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return [blobUrl(bytes, "image/png")];

  const { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const IMAGE = PDFName.of("Image");
  const DCT = PDFName.of("DCTDecode");
  const out: string[] = [];
  for (const page of doc.getPages()) {
    const xobjects = page.node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict);
    let best: { bytes: Uint8Array; area: number } | null = null;
    for (const [, ref] of xobjects?.entries() ?? []) {
      const obj = doc.context.lookup(ref);
      if (!(obj instanceof PDFRawStream)) continue;
      if (obj.dict.lookup(PDFName.of("Subtype")) !== IMAGE) continue;
      const filter = obj.dict.lookup(PDFName.of("Filter"));
      const filters = filter instanceof PDFArray ? filter.asArray() : [filter];
      if (filters.length !== 1 || filters[0] !== DCT) continue;
      const w = obj.dict.lookup(PDFName.of("Width"));
      const h = obj.dict.lookup(PDFName.of("Height"));
      const area = w instanceof PDFNumber && h instanceof PDFNumber ? w.asNumber() * h.asNumber() : 0;
      if (!best || area > best.area) best = { bytes: obj.contents, area };
    }
    if (!best) throw new PdfImagesError("Энэ файлыг апп дотор харуулах боломжгүй");
    out.push(blobUrl(best.bytes, "image/jpeg"));
  }
  if (!out.length) throw new PdfImagesError("Хуудас алга");
  return out;
}

const settled = new Map<string, string[]>();

/** Нэг файлын хуудас бүрийн зургийн `blob:` URL-ууд */
export function loadPdfImages(key: string): Promise<string[]> {
  let p = cache.get(key);
  if (!p) {
    p = extract(key).then((urls) => {
      settled.set(key, urls);
      return urls;
    });
    cache.set(key, p);
    // Алдаа гарвал дараагийн оролдлогод дахин татна
    p.catch(() => cache.delete(key));
  }
  return p;
}

/** Аль хэдийн татсан бол синхроноор буцаана (анивчилтгүй эхний рендер) */
export function peekPdfImages(key: string): string[] | null {
  return settled.get(key) ?? null;
}

/** Дата хэмнэх горим (утасны тохиргоо) — урьдчилж татахгүй */
export function saveDataOn(): boolean {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !!c?.saveData;
}
