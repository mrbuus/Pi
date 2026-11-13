/**
 * Ангийн чиглэл (api/src/common/class-track.ts-тэй ижил дүрэм, эзэн 2026-11-12):
 * сурагч чиглэл тус бүрт нэг ангид — математикийн анги + Нийгмийн ангид ЗЭРЭГ сууж болно.
 * subject хоосон бол нэрээр («НИЙГЭМ (Зүүн 4)» → Нийгэм, бусад нь математик).
 */
export type ClassTrack = "MATH" | "SOCIAL_STUDIES" | "SAT";

export function classTrack(c: { name: string; subject?: string | null }): ClassTrack {
  if (c.subject === "SOCIAL_STUDIES" || c.subject === "SAT" || c.subject === "MATH") return c.subject;
  return /нийгэм/i.test(c.name) ? "SOCIAL_STUDIES" : "MATH";
}

/** «12-4 (Баруун 4) + НИЙГЭМ (Зүүн 4)» — үндсэн анги эхэнд */
export function classNames(
  main: { name: string } | null | undefined,
  others: { name: string }[] | null | undefined,
): string | null {
  const names = [main?.name, ...(others ?? []).map((c) => c.name)].filter(Boolean);
  return names.length ? names.join(" + ") : null;
}
