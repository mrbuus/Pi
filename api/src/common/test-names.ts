// Тестийн нэрсийг товчлох (эзэн 2026-11-08) — I/O-гүй цэвэр логик, тест: test-names.spec.ts.
// Вэбд ижил логик: web/src/lib/testNames.ts (хоёуланг нь ХАМТ засна).
//
// «Квадрат тэгшитгэл 1, Квадрат тэгшитгэл 2, Квадрат тэгшитгэл 3» → «Квадрат тэгшитгэл 1, 2, 3».
// Өөр сэдвүүд «; »-оор тусгаарлагдана: «Иррационал тэгшитгэл 4, 5, 6; Илтгэгч тэгшитгэл 1, 2».
//
// Дүрэм:
//  - Нэр = «суурь нэр» + хоосон зай + ТӨГСГӨЛИЙН бүхэл тоо («Тоо тоолол 10» → «Тоо тоолол», «10»).
//    Суурь нэр яг ижил (хоосон зайг нэгтгэсний дараа) бол нэг бүлэг. «Тэгшитгэл» ба «Тэгшитгэл систем»
//    нь ӨӨР суурь (угтвар болох нь хамаагүй).
//  - Тоогүй нэр («Иррац шалгалт»), эсвэл зөвхөн тоо («5») — бие даасан нэг зүйл.
//  - Дараалал хадгалагдана: бүлэг анх гарсан байрандаа, бүлгийн доторх тоо гарсан дарааллаараа.
//  - Давхардсан нэр/тоо нэг л удаа. Хоосон мөр алгасна.

export interface TestNameGroup {
  /** Суурь нэр («Квадрат тэгшитгэл»), тоогүй нэр бол бүтэн нэр */
  base: string;
  /** Төгсгөлийн тоонууд (бичсэнээр нь, «01» хэвээр); тоогүй нэрд хоосон */
  numbers: string[];
}

const TRAILING_NUMBER = /^(.*\S)\s+(\d+)$/;

function clean(name: string): string {
  return String(name ?? '').replace(/\s+/g, ' ').trim();
}

/** Нэрсийг суурь нэрээр бүлэглэнэ (дараалал хадгалагдана). */
export function groupTestNameParts(names: readonly string[]): TestNameGroup[] {
  const groups: TestNameGroup[] = [];
  const numbered = new Map<string, TestNameGroup>();
  const plain = new Set<string>();
  for (const raw of names) {
    const name = clean(raw);
    if (!name) continue;
    const m = name.match(TRAILING_NUMBER);
    if (!m) {
      if (plain.has(name)) continue;
      plain.add(name);
      groups.push({ base: name, numbers: [] });
      continue;
    }
    const [, base, num] = m;
    const g = numbered.get(base);
    if (g) {
      if (!g.numbers.includes(num)) g.numbers.push(num);
      continue;
    }
    const fresh = { base, numbers: [num] };
    numbered.set(base, fresh);
    groups.push(fresh);
  }
  return groups;
}

/** Нэг бүлгийн бичвэр: «Квадрат тэгшитгэл 1, 2, 3» эсвэл «Иррац шалгалт». */
export function testNameGroupText(g: TestNameGroup): string {
  return g.numbers.length ? `${g.base} ${g.numbers.join(', ')}` : g.base;
}

/** «Квадрат тэгшитгэл 1, 2, 3; Илтгэгч тэгшитгэл 4» — бүлгүүдийг «; »-оор. */
export function groupTestNames(names: string[]): string {
  return groupTestNameParts(names).map(testNameGroupText).join('; ');
}

/**
 * Өмнө нь «, »-оор нийлүүлж хадгалсан гарчиг («А 1, А 2, Б 3») — товчилж харуулна.
 * Нэгтгэх зүйл байхгүй бол бичвэрийг ЯГ хэвээр нь буцаана (багшийн чөлөөт бичвэрийг эвдэхгүй).
 */
export function regroupTopicText(text: string | null | undefined): string {
  const raw = String(text ?? '');
  if (!raw.includes(',')) return raw;
  const parts = raw.split(/\s*,\s*/);
  const groups = groupTestNameParts(parts);
  const merged = groups.some((g) => g.numbers.length > 1);
  return merged ? groups.map(testNameGroupText).join('; ') : raw;
}
