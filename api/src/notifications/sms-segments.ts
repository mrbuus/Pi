/**
 * SMS мессежийн хэсгийн тооцоо (segment count).
 *
 * GSM-7 (латин, англи, ихэнхи символ): 160 тэмдэгт/хэсэг
 * UCS-2 (монгол кирилл, бусад цомог): 70 тэмдэгт/хэсэг
 *
 * ЯАГААД ЧУХАЛ ВЭ: SMS илгээх өртөг = хэсгийн тоо * үнэ. Мессеж удаагүй
 * болоход зардал 2 дахин ихэвхэгдэнэ. Тооцоо зөв байх ёстой.
 */

/**
 * GSM-7-д кодлогдох боломжтой нэг тэмдэгтүүд.
 * Орно: A–Z, a–z, 0–9, цэлгээлт, ихэнхи пунктуацион.
 * Орохгүй: кирилл, эмодзи, CJK, дээрх escape авах тэмдэгтүүд.
 */
const GSM7_CHARS = new Set(
  '@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞ{}\\[~]|^' +
    '0123456789' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    'abcdefghijklmnopqrstuvwxyz' +
    ' !"#¤%&\'()*+,-./:;<=>?¡¿§ªº',
);

/**
 * GSM-7-ийн extended character set — 2 байттай кодлогддог, тийм болохоор
 * лимит нь 160 / 2 байдал мэт ажилладаг (үнэндээ үлдсэн байтанд орно).
 */
const GSM7_EXTENDED_CHARS = new Set(
  '[]{}\\~|€' // Escape { + одоо нэр байхгүй хэрвээ
);

/**
 * Монгол кирилл үг санагдах тэмдэгтүүд. Кирилл алфавит нь a...я
 * болон Cyrillic block-д (U+0400 – U+04FF) байдаг.
 */
function isCyrillic(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x0400 && code <= 0x04ff) || (code >= 0x0100 && code <= 0x017f);
}

/**
 * Бүтэн мессежийг скэн хийж, GSM-7 эсвэл UCS-2 ашиглахаа сонгоно.
 * Кирилл байгаа бол UCS-2 (70 т/х), эс бөгөөс GSM-7 (160 т/х).
 *
 * Тайлбар: мессеж холимог (кирилл + латин) байвал БҮХЭЛДЭЭ UCS-2-т
 * кодлогддог — хагас GSM7, хагас UCS2 боломжгүй (нийлүүлэгчийн сахилга).
 */
export function calculateSmsSegments(message: string): number {
  if (!message) return 0;

  // 1. Кирилл ямар нэгэн байгаа эсэх
  let hasCyrillic = false;
  for (const char of message) {
    if (isCyrillic(char)) {
      hasCyrillic = true;
      break;
    }
  }

  // 2. Хэсгийг тооцоолох — UCS-2 эсвэл GSM-7 аль нэг сонгоно
  const charsPerSegment = hasCyrillic ? 70 : 160;
  return Math.ceil(message.length / charsPerSegment);
}

/**
 * DEBUG: мессежийн тэмдэгтийн бүтцийг дүрслэн гаргана (unit test-д хэргэтэй).
 *
 * Жишээ: "Привет123" → "Cyrillic, GSM7 ambiguous, GSM7 digits"
 */
export function analyzeMessageCharacters(message: string): string {
  const analysis: string[] = [];
  for (const char of message) {
    if (isCyrillic(char)) {
      analysis.push('Cyrillic');
    } else if (GSM7_CHARS.has(char)) {
      analysis.push('GSM7');
    } else if (GSM7_EXTENDED_CHARS.has(char)) {
      analysis.push('GSM7-ext');
    } else {
      analysis.push(`Unknown(U+${char.charCodeAt(0).toString(16).toUpperCase()})`);
    }
  }
  return analysis.join(' ');
}
