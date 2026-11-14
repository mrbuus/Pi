import { randomInt } from 'crypto';

// Номд хэвлэх QR-ийн код — ЦЭВЭР логик (I/O байхгүй, бүрэн тесттэй).
//
// Яагаад Problem.token биш вэ: token ("100-23-05") сурагчид ХЭЗЭЭ Ч очихгүй
// (common/strip-problem-token.interceptor.ts) бөгөөд дараалсан тул таамаглаж
// болно. Энэ код санамсаргүй, 8 тэмдэгт Crockford base32 (~10^12 хослол) тул
// 12,000 бодлогоос нэгийг санамсаргүй таах магадлал нэг оролдлогод ~10^-8.
//
// Crockford цагаан толгойд I, L, O, U байхгүй — гараар бичихэд андуурагддаг
// үсгүүдийг normalizeScanCode зөв цифр рүү буулгана.
export const SCAN_CODE_LENGTH = 8;
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const VALID = new RegExp(`^[${ALPHABET}]{${SCAN_CODE_LENGTH}}$`);

export const SCAN_URL_BASE = 'https://pimath.mn/q/';

export function generateScanCode(rand: (max: number) => number = randomInt): string {
  let out = '';
  for (let i = 0; i < SCAN_CODE_LENGTH; i++) out += ALPHABET[rand(ALPHABET.length)];
  return out;
}

/** Хэрэглэгчийн оруулсан эсвэл URL-аас авсан кодыг каноник болгоно; буруу бол null. */
export function normalizeScanCode(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 40) return null;
  const code = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  return VALID.test(code) ? code : null;
}

export function scanUrl(code: string): string {
  return SCAN_URL_BASE + code;
}
