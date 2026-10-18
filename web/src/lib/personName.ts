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
