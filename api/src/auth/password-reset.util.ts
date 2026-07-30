import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { toNationalMn } from '../notifications/phone';

/**
 * Нууц үг сэргээх кодын ЦЭВЭР (side-effect-гүй) логик. Өгөгдлийн сан, HTTP-ээс
 * бүрэн ангид тул шууд тестлэгдэнэ.
 */

/** Кодын урт. 6 нь SMS-д уншихад хялбар, брутфорсын эсрэг оролдлогын
 * хязгаартай хослоод хангалттай. */
export const CODE_LENGTH = 6;

/** Код хүчинтэй байх хугацаа (10 минут) */
export const CODE_TTL_MS = 10 * 60 * 1000;

/** Нэг код дээр зөвшөөрөх БУРУУ оролдлогын дээд тоо */
export const MAX_VERIFY_ATTEMPTS = 5;

/** Нэг хэрэглэгч энэ цонхонд хамгийн ихдээ хэдэн код хүсэж болох */
export const REQUEST_WINDOW_MS = 15 * 60 * 1000;
export const MAX_REQUESTS_PER_WINDOW = 3;

/**
 * Криптографийн хувьд аюулгүй 6 оронтой код.
 *
 * `Math.random()` ХЭРЭГЛЭХГҮЙ: тэр нь таамаглах боломжтой PRNG бөгөөд
 * нэвтрэлтийн код үүсгэхэд ашиглавал халдагч дараагийн кодыг тооцоолж чадна.
 * `crypto.randomInt` нь жигд тархалттай, аюулгүй эх үүсвэр ашиглана.
 */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

/**
 * Кодыг серверийн нууц түлхүүрээр HMAC-SHA256 хийнэ.
 *
 * Яагаад энгийн SHA-256 биш вэ: 6 оронтой код нийт 1 сая хувилбартай — өгөгдлийн
 * сан алдагдвал бүгдийг нь секундын дотор тооцоолж, хэшээр нь тааруулж болно.
 * HMAC-д серверийн НУУЦ түлхүүр орсноор түлхүүргүй халдагч энэ довтолгоог
 * огт хийж чадахгүй.
 */
export function hashCode(code: string, secret: string): string {
  return createHmac('sha256', secret).update(code).digest('hex');
}

/**
 * Хоёр hex хэшийг ТОГТМОЛ ХУГАЦААНД харьцуулна.
 *
 * Энгийн `===` нь эхний зөрсөн тэмдэгт дээр шууд зогсдог тул хариу өгөх хугацаа
 * нь "хэдэн тэмдэгт таарсныг" алдагдуулж, кодыг тэмдэгт тэмдэгтээр таах
 * (timing attack) боломж олгоно.
 */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Хэрэглэгчид харуулах маск — БҮРТГЭЛ БАЙГАА ЭСЭХИЙГ ИЛЧЛЭХГҮЙ.
 *
 * Гол санаа: маскийг өгөгдлийн сангаас биш, ХЭРЭГЛЭГЧИЙН ӨӨРИЙН БИЧСЭН
 * мөрөөс гаргана. Тиймээс бүртгэл байсан ч, байхгүй ч хариу яг ижил гарах
 * бөгөөд халдагч "энэ дугаар бүртгэлтэй юу?" гэдгийг ялгаж мэдэхгүй.
 */
export function maskIdentifier(identifier: string): string {
  const national = toNationalMn(identifier);
  if (national) return `${national.slice(0, 4)}****`;

  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    const [name, domain] = trimmed.split('@');
    const head = name.slice(0, 2);
    return `${head}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
  }
  return '****';
}

/** Код хүчинтэй хэвээр эсэх (хугацаа, ашиглалт, оролдлого) */
export function isTokenUsable(
  token: { expiresAt: Date; consumedAt: Date | null; attempts: number },
  now: Date,
): boolean {
  if (token.consumedAt !== null) return false;
  if (token.attempts >= MAX_VERIFY_ATTEMPTS) return false;
  return token.expiresAt.getTime() > now.getTime();
}

/**
 * JWT нь нууц үг сүүлд солигдсоноос ХОЙШ олгогдсон эсэх.
 *
 * `iat` нь СЕКУНД (JWT стандарт), `passwordChangedAt` нь миллисекунд —
 * харьцуулахын өмнө нэг нэгжид оруулна.
 *
 * ЯАГААД `>` БИШ `>=` ВЭ (мэдээжийн буулт): нууц үгээ сольсон хэрэглэгчид
 * шууд шинэ токен олгодог бөгөөд тэр токен ИЖИЛ СЕКУНДЭД гарын үсэг зурагдана.
 * Хатуу `>` хэрэглэвэл тэр шинэ токен төрөнгүүтээ хүчингүй болж, хэрэглэгч
 * нууц үгээ сольмогцоо гарчихна. Үүний үнэ нь: нууц үг солигдсонтой ЯГ ИЖИЛ
 * секундэд олгогдсон токен амьд үлдэнэ. Халдагч хохирогчийн сэргээлттэй яг
 * нэг секундэд нэвтэрсэн байх шаардлагатай тул практик эрсдэл үл ялиг.
 */
export function isTokenIssuedAfterPasswordChange(
  issuedAtSeconds: number | undefined,
  passwordChangedAt: Date | null | undefined,
): boolean {
  if (!passwordChangedAt) return true;
  if (issuedAtSeconds === undefined) return false;
  return issuedAtSeconds >= Math.floor(passwordChangedAt.getTime() / 1000);
}
