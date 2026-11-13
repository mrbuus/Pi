/**
 * Нэвтэрсний дараах «Нууц үгээ солиорой» сануулга (эзэн 2026-11-14).
 * Сервер /auth/login-ийн хариунд `securityNudge` өгнө (нууц үг = утас, анхны
 * нэвтрэлт биш). Сануулгыг sessionStorage-д хадгална — «Дараа» дарвал энэ
 * нэвтрэлтэд дахин гарахгүй, дараагийн нэвтрэлтэд сервер дахин өгнө.
 *
 * Нэвтрэхдээ бичсэн нууц үгийг ЗӨВХӨН санах ойд (модулийн хувьсагч) барина:
 * «Одоогийн нууц үг»-ийг дахин асуухгүйн тулд. Хадгалахгүй, хуудас дахин
 * ачаалбал алга болж, цонх тэр талбарыг харуулна.
 */
export interface SecurityNudge {
  passwordIsPhone: boolean;
  googleLinked: boolean;
}

const KEY = "security_nudge";
let typedPassword: string | null = null;

export function saveSecurityNudge(nudge: SecurityNudge | undefined, password: string) {
  try {
    if (nudge) {
      sessionStorage.setItem(KEY, JSON.stringify(nudge));
      typedPassword = password;
    } else {
      sessionStorage.removeItem(KEY);
      typedPassword = null;
    }
  } catch {
    // Хувийн цонх г.м. — сануулгагүй үргэлжилнэ
  }
}

export function readSecurityNudge(): SecurityNudge | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SecurityNudge) : null;
  } catch {
    return null;
  }
}

export function loginPassword(): string | null {
  return typedPassword;
}

export function clearSecurityNudge() {
  typedPassword = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
