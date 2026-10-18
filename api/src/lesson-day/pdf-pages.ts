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
  if (buf.subarray(0, 5).toString('latin1') !== '%PDF-') return null;
  const texts = [buf.toString('latin1')];
  let from = 0;
  for (;;) {
    const start = buf.indexOf('stream', from, 'latin1');
    if (start < 0) break;
    let dataStart = start + 6;
    if (buf[dataStart] === 0x0d) dataStart++;
    if (buf[dataStart] === 0x0a) dataStart++;
    const end = buf.indexOf('endstream', dataStart, 'latin1');
    if (end < 0) break;
    // Зургийн (DCTDecode) урсгалыг задлах гэж оролдохгүй — зөвхөн zlib толгойтой нь
    if (buf[dataStart] === 0x78) {
      try {
        texts.push(inflateSync(buf.subarray(dataStart, end)).toString('latin1'));
      } catch {
        // гэмтсэн/өөр шүүлтүүр — алгасна
      }
    }
    from = end + 9;
  }
  let best: number | null = null;
  for (const text of texts) {
    // Объект бүрийг тусад нь шалгана (<< … >> хооронд)
    for (const dict of text.match(/<<(?:[^<>]|<(?!<)|>(?!>))*>>/g) ?? []) {
      if (!/\/Type\s*\/Pages\b/.test(dict)) continue;
      const m = /\/Count\s+(\d+)/.exec(dict);
      if (m) best = Math.max(best ?? 0, Number(m[1]));
    }
  }
  return best;
}
