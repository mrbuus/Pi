/**
 * Хүний нэрийг монгол жишгээр: овгийн эхний үсэг + нэр — «Б. Өсөхбаяр»
 * (эзэн 2026-10-13). Овог хоосон бол зөвхөн нэр.
 */
export function shortName(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName ?? "").trim();
  const initial = (lastName ?? "").trim().charAt(0);
  return initial ? `${initial.toUpperCase()}. ${first}` : first;
}

interface RosterPerson {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * Анги/жагсаалтын нэр (эзэн 2026-10-18): «Б. Нэр»; хэрэв ижил нэртэй хоёр хүүхдийн
 * овгийн эхний үсэг ч давхцвал тэдний овгийг бүтнээр — «Батдаваа Оюун-Эрдэнэ».
 */
export function rosterNames(people: RosterPerson[]): Map<string, string> {
  const key = (p: RosterPerson) => shortName(p.firstName, p.lastName).toLocaleLowerCase("mn");
  const seen = new Map<string, number>();
  for (const p of people) seen.set(key(p), (seen.get(key(p)) ?? 0) + 1);
  return new Map(
    people.map((p) => {
      const clash = (seen.get(key(p)) ?? 0) > 1 && (p.lastName ?? "").trim();
      const full = `${(p.lastName ?? "").trim()} ${(p.firstName ?? "").trim()}`;
      return [p.id, clash ? full : shortName(p.firstName, p.lastName)];
    }),
  );
}

/** Жагсаалтын эрэмбэ: НЭРЭЭР (овгоор биш), дараа нь овгоор */
export function byFirstName(a: RosterPerson, b: RosterPerson): number {
  return (
    (a.firstName ?? "").localeCompare(b.firstName ?? "", "mn") ||
    (a.lastName ?? "").localeCompare(b.lastName ?? "", "mn")
  );
}

/** Багш+ эсэх (эзэн 2026-10-23: Багш+ хүний нэрийн ард үргэлж «+»; Багш, Админд үгүй) */
export function isTeacherPlus(role?: string | null): boolean {
  return role === "TEACHER_PLUS";
}

/** Бэлэн нэрийн ард Багш+ бол «+» — «О. Баасанжав» → «О. Баасанжав+». Давхар «+» тавихгүй */
export function withPlus(name: string, role?: string | null): string;
export function withPlus(name: string | null | undefined, role?: string | null): string | null;
export function withPlus(name: string | null | undefined, role?: string | null): string | null {
  if (name == null) return null;
  const n = name.trimEnd();
  return n && isTeacherPlus(role) && !n.endsWith("+") ? `${n}+` : name;
}

export interface StaffPerson {
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
}

/**
 * Ажилтан/багшийн нэр: «Б. Нэр», Багш+ бол «Б. Нэр+» (эзэн 2026-10-23).
 * Нэр харуулах БҮХ газарт энэ функцийг ашигла.
 */
export function staffName(person: StaffPerson): string;
export function staffName(person: StaffPerson | null | undefined): string | null;
export function staffName(person: StaffPerson | null | undefined): string | null {
  if (!person) return null;
  return withPlus(shortName(person.firstName, person.lastName), person.role);
}

/** rosterNames-тэй ижил (ижил нэрийн давхцлыг бүтэн овгоор), Багш+ бол «+» */
export function staffNames(people: (RosterPerson & { role?: string | null })[]): Map<string, string> {
  const base = rosterNames(people);
  return new Map(people.map((p) => [p.id, withPlus(base.get(p.id) ?? "", p.role)]));
}
