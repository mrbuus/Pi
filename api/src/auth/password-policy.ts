/**
 * Нууц үгийн бодлого — ЗӨВХӨН хэрэглэгч өөрөө нууц үгээ солих / сэргээх үед.
 *
 * Бүртгэл болон ажилтны үүсгэсэн бүртгэлийн анхны нууц үг = утасны дугаар
 * (эзний дүрэм, STATUS.md §3.4) — энэ бодлого тэнд ХАМААРАХГҮЙ, нэвтрэлтэд ч
 * хамаарахгүй. Вэб талын шууд шалгалт (`web/src/lib/passwordPolicy.ts`) яг
 * ижил дүрэмтэй байх ЁСТОЙ.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt 72 байтаас хойшхыг үл тоомсорлоно

/** Латин эсвэл кирилл — Unicode-ийн аль ч үсэг */
export const PASSWORD_LETTER_RE = /\p{L}/u;
export const PASSWORD_DIGIT_RE = /\d/;

export const PASSWORD_POLICY_MESSAGE =
  'Нууц үг дор хаяж 8 тэмдэгт, үсэг ба тоо холилдсон байх ёстой';
export const PASSWORD_SAME_AS_PHONE_MESSAGE =
  'Шинэ нууц үг утасны дугаараас өөр байх ёстой';

/** Хүчтэй бол null, эс бөгөөс хэрэглэгчид харуулах мессеж */
export function validatePasswordStrength(pw: unknown): string | null {
  if (typeof pw !== 'string') return PASSWORD_POLICY_MESSAGE;
  if (
    pw.length < PASSWORD_MIN_LENGTH ||
    !PASSWORD_LETTER_RE.test(pw) ||
    !PASSWORD_DIGIT_RE.test(pw)
  ) {
    return PASSWORD_POLICY_MESSAGE;
  }
  return null;
}

/** Утасны дугаартай (зай, +976, зураас зэргийг хасаад) ижил эсэх */
export function isSameAsPhone(
  pw: string,
  phone: string | null | undefined,
): boolean {
  if (!phone) return false;
  const digits = (s: string) => s.replace(/\D/g, '');
  const p = digits(phone);
  if (!p) return false;
  const w = pw.trim();
  if (w === phone.trim()) return true;
  // Зөвхөн цифр/тусгаарлагчаас бүрдсэн бол дугаартай цифрээр нь тулгана
  if (/^[\d\s+\-()]+$/.test(w)) {
    const d = digits(w);
    return d === p || d === `976${p}` || `976${d}` === p;
  }
  return false;
}
