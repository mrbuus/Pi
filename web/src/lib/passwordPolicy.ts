/**
 * Нууц үгийн бодлого — сервер талын `api/src/auth/password-policy.ts`-тэй
 * ЯГ ИЖИЛ байх ёстой. Зөвхөн нууц үг солих / сэргээх үед; бүртгэлийн анхны
 * нууц үг = утасны дугаар (эзний дүрэм) хэвээр.
 */
export const PASSWORD_MIN_LENGTH = 8;

export type PasswordChecks = { length: boolean; letter: boolean; digit: boolean };

export function passwordChecks(pw: string): PasswordChecks {
  return {
    length: pw.length >= PASSWORD_MIN_LENGTH,
    // Латин эсвэл кирилл — Unicode-ийн аль ч үсэг
    letter: /\p{L}/u.test(pw),
    digit: /\d/.test(pw),
  };
}

export function isPasswordStrong(pw: string): boolean {
  const c = passwordChecks(pw);
  return c.length && c.letter && c.digit;
}
