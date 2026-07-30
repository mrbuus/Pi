/**
 * Монголын утасны дугаарыг олон улсын (E.164) хэлбэрт оруулах цэвэр функцууд.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: манай өгөгдлийн санд дугаарууд 8 оронтой, дотоод
 * хэлбэрээр ("99112233") хадгалагдсан байдаг. SMS-ийн БҮХ нийлүүлэгч (Twilio,
 * дотоодын агрегаторууд) улсын кодтой E.164 хэлбэр ("+97699112233") шаарддаг.
 * Хэрэглэгч мөн "+976 9911 2233", "976-99112233", "0097699112233" гэх мэт
 * янз бүрээр бичиж болно — бүгдийг нэг хэлбэрт буулгана.
 */

const MN_COUNTRY_CODE = '976';
/** Монголын үндэсний дугаар яг 8 оронтой */
const MN_NATIONAL_LENGTH = 8;

/** Зөвхөн цифр үлдээнэ (зай, зураас, хаалт, "+" бүгдийг хаяна) */
function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '');
}

/**
 * Дурын бичиглэлээс 8 оронтой ҮНДЭСНИЙ дугаарыг гаргана. Танигдахгүй бол null.
 *
 * Зөвшөөрөх хэлбэрүүд:
 *   99112233, +976 9911 2233, 976-99112233, 0097699112233, (976) 99112233
 */
export function toNationalMn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = digitsOnly(raw);

  // Олон улсын залгах угтварууд: "00" (ITU) — түүнийг эхлээд хасна.
  if (d.startsWith('00')) d = d.slice(2);
  // Улсын код: "976". Гэхдээ болгоомжтой — 8 оронтой дугаар өөрөө "976"-аар
  // эхэлж БОЛОХГҮЙ (Монголын мобайл угтварууд 8/9-өөр, суурин 5/7-оор эхэлдэг),
  // тул урд талын "976"-г хасахад аюулгүй. Урт нь тохирч байгааг мөн шалгана.
  if (d.length === MN_COUNTRY_CODE.length + MN_NATIONAL_LENGTH && d.startsWith(MN_COUNTRY_CODE)) {
    d = d.slice(MN_COUNTRY_CODE.length);
  }

  return d.length === MN_NATIONAL_LENGTH ? d : null;
}

/** 8 оронтой дугаарыг "+97699112233" болгоно. Танигдахгүй бол null. */
export function toE164Mn(raw: string | null | undefined): string | null {
  const national = toNationalMn(raw);
  return national ? `+${MN_COUNTRY_CODE}${national}` : null;
}

/**
 * Хэрэглэгчид ХАРУУЛАХ маскласан дугаар: "99112233" → "9911****".
 *
 * Яагаад бүтнээр нь харуулахгүй вэ: "нууц үг сэргээх" хуудсанд бүтэн дугаар
 * гаргавал, дурын хүн зөвхөн нэр/утас таамаглаад тухайн бүртгэл байгаа эсэхийг
 * бас холбоо барих бүтэн мэдээллийг цуглуулах боломжтой болно.
 */
export function maskPhone(raw: string | null | undefined): string {
  const national = toNationalMn(raw);
  if (!national) return '****';
  return `${national.slice(0, 4)}****`;
}
