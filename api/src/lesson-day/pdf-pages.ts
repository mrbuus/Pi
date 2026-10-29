import { inflateSync } from 'zlib';

/**
 * PDF-ийн хуудасны тоо (эзэн 2026-10-18, D13: онолын зураг / нөхөх тэмдэглэл = нэг
 * PDF, ≤10 хуудас). Хөтөч `@cantoo/pdf-lib`-ээр `useObjectStreams: true` хадгалдаг тул
 * хуудасны мод шахсан объектын урсгал дотор байдаг — FlateDecode урсгалуудыг задлаад
 * `/Type /Pages … /Count N`-ийн хамгийн их утгыг (үндэс) авна. Тодорхойлж чадахгүй бол null.
 * Сан нэмэхгүйн тулд энгийн задлагч (зөвхөн тоо хэрэгтэй).
 */
export function pdfPageCount(bytes: Buffer | Uint8Array): number | null {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (!isPdfHeader(buf)) return null;
  return countIn(buf, false);
}

const isPdfHeader = (buf: Buffer) => buf.subarray(0, 5).toString('latin1') === '%PDF-';

/** Хэсгийн текст + бүтэн FlateDecode урсгалуудыг задалсан текстүүд */
// Задлах нийт хэмжээ, урсгалын тоонд дээд хязгаар — олон жижиг «бөмбөг» урсгалаар
// санах ойг дүүргэхээс хамгаална (хуудасны мод нь хэдхэн КБ).
const INFLATE_TOTAL_MAX = 24 * 1024 * 1024;
const INFLATE_STREAMS_MAX = 2000;

function textsOf(buf: Buffer): string[] {
  const texts = [buf.toString('latin1')];
  let from = 0;
  let inflatedTotal = 0;
  let streams = 0;
  for (;;) {
    const start = buf.indexOf('stream', from, 'latin1');
    if (start < 0) break;
    // «endstream»-ийн сүүл хэсэг — хэсэгчилсэн (сүүл) уншилтад тасарсан урсгалын төгсгөл
    if (start >= 3 && buf.toString('latin1', start - 3, start) === 'end') {
      from = start + 6;
      continue;
    }
    let dataStart = start + 6;
    if (buf[dataStart] === 0x0d) dataStart++;
    if (buf[dataStart] === 0x0a) dataStart++;
    const end = buf.indexOf('endstream', dataStart, 'latin1');
    if (end < 0) break;
    // Зургийн (DCTDecode) урсгалыг задлах гэж оролдохгүй — зөвхөн zlib толгойтой нь
    if (buf[dataStart] === 0x78) {
      if (++streams > INFLATE_STREAMS_MAX || inflatedTotal > INFLATE_TOTAL_MAX)
        break;
      try {
        // maxOutputLength — шахалтын «бөмбөг»-өөс хамгаална (хуудасны мод хэдхэн КБ)
        const out = inflateSync(buf.subarray(dataStart, end), {
          maxOutputLength: 8 * 1024 * 1024,
        });
        inflatedTotal += out.length;
        texts.push(out.toString('latin1'));
      } catch {
        // гэмтсэн/өөр шүүлтүүр — алгасна
      }
    }
    from = end + 9;
  }
  return texts;
}

/**
 * `/Type /Pages … /Count N`-ийн хамгийн их утга. `rootOnly` = зөвхөн `/Parent`-гүй
 * (үндэс) зангилаа — хэсэгчилсэн уншилтад дунд зангилааны бага тоог авахаас сэргийлнэ.
 */
function countIn(buf: Buffer, rootOnly: boolean): number | null {
  let best: number | null = null;
  for (const text of textsOf(buf)) {
    // Объект бүрийг тусад нь шалгана (<< … >> хооронд)
    for (const dict of text.match(/<<(?:[^<>]|<(?!<)|>(?!>))*>>/g) ?? []) {
      if (!/\/Type\s*\/Pages\b/.test(dict)) continue;
      if (rootOnly && /\/Parent\b/.test(dict)) continue;
      const m = /\/Count\s+(\d+)/.exec(dict);
      if (m) best = Math.max(best ?? 0, Number(m[1]));
    }
  }
  return best;
}

/** Хэсэгчилсэн уншилтын хэмжээ: эхний ба сүүлийн 64 КБ */
export const PDF_PROBE_BYTES = 64 * 1024;

/**
 * Файлыг бүтэн уншилгүй хуудас тоолно: эхний `head` (заавал `%PDF-`-ээр эхэлнэ) ба
 * сүүлийн `tail` хэсэг. `@cantoo/pdf-lib` хуудасны модыг (obj 1) файлын эхэнд,
 * объектын урсгал + xref-ийг төгсгөлд бичдэг тул 6 хуудас ≈ 2 МБ PDF-д ч хоёр 64 КБ
 * хангалттай. Үндэс `/Pages` олдохгүй бол null — дуудагч бүтэн уншилт эсвэл
 * хөтчийн мэдэгдсэн тоо руу шилжинэ.
 */
export function pdfPageCountFromRanges(
  head: Buffer | Uint8Array,
  tail: Buffer | Uint8Array | null,
): number | null {
  const h = Buffer.isBuffer(head) ? head : Buffer.from(head);
  if (!isPdfHeader(h)) return null;
  const counts = [countIn(h, true)];
  if (tail?.length) counts.push(countIn(Buffer.isBuffer(tail) ? tail : Buffer.from(tail), true));
  const found = counts.filter((n): n is number => n !== null);
  return found.length ? Math.max(...found) : null;
}
