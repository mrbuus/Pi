/**
 * Багшийн ажилласан цагийн нүдний утга (эзэн 2026-11-08).
 *
 * ⚠️ api/src/teacher-hours/work-sheet.logic.ts-ийн parseHoursInput /
 * formatHundredths-тэй ЯГ ИЖИЛ байх ёстой — сервер эцсийн шийдвэр гаргана,
 * энд зөвхөн хэрэглэгчид шууд алдааг харуулна. Хоёулаа ижил хүснэгтээр
 * шалгагддаг (api/src/teacher-hours/hours-input-parity.spec.ts).
 *
 * Цагийг бүхэл «цаг×100» (hundredths) хэлбэрээр: 7.5 цаг = 750.
 */

export type HoursParse = { ok: true; hundredths: number | null } | { ok: false; error: string };

export const MAX_HOURS_PER_DAY = 24;

/** «7.5», «7,5», « 9 » → бүхэл; хоосон = арилгах (null). 0–24, бутархай 2 орон хүртэл. */
export function parseHoursInput(raw: string | number | null | undefined): HoursParse {
  if (raw === null || raw === undefined) return { ok: true, hundredths: null };
  const text = String(raw).trim().replace(/\s+/g, "").replace(",", ".");
  if (text === "") return { ok: true, hundredths: null };
  const m = /^(\d{0,2})(?:\.(\d*))?$/.exec(text);
  if (!m || (m[1] === "" && !m[2])) return { ok: false, error: "Зөвхөн тоо бичнэ үү (ж: 7 эсвэл 7,5)" };
  const frac = m[2] ?? "";
  if (frac.length > 2) return { ok: false, error: "Бутархай нь 2 оронгоос ихгүй (ж: 7,25)" };
  const hundredths = Number(m[1] || "0") * 100 + Number(frac.padEnd(2, "0"));
  if (hundredths > MAX_HOURS_PER_DAY * 100) return { ok: false, error: "Нэг өдөрт 0–24 цаг" };
  return { ok: true, hundredths };
}

/** 750 → «7.5», 725 → «7.25», 700 → «7», null → «». */
export function formatHundredths(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(Math.round(value));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  if (frac === 0) return `${sign}${whole}`;
  return `${sign}${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}`;
}
