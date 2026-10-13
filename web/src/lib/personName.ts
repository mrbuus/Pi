/**
 * Хүний нэрийг монгол жишгээр: овгийн эхний үсэг + нэр — «Б. Өсөхбаяр»
 * (эзэн 2026-10-13). Овог хоосон бол зөвхөн нэр.
 */
export function shortName(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName ?? "").trim();
  const initial = (lastName ?? "").trim().charAt(0);
  return initial ? `${initial.toUpperCase()}. ${first}` : first;
}
