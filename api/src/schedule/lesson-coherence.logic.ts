// Төлөвлөгөө ↔ батламж ↔ хийсэн тестийн уялдаа (эзэн 2026-11-08) — I/O-гүй цэвэр логик, тест:
// lesson-coherence.spec.ts.
//
// Эх сурвалж гурав:
//   LessonTopic      — ТӨЛӨВЛӨГӨӨ (хийх тест), түлхүүр = хуваарь + АНХНЫ огноо (зөөгдсөн бол)
//   ClassTestSession — ХИЙСЭН тест, түлхүүр = анги + тест + БОДИТ огноо
//   LessonRecord     — БАТЛАМЖ (snapshot), түлхүүр = хуваарь + БОДИТ огноо
// Дүрэм: батлагдсан хичээлд ЗӨВХӨН хийсэн тест үнэн — төлөвлөгөө нь «дараагийн тест»-ийг
// урагшлуулахгүй. Батлаагүй өнгөрсөн хичээлийн төлөвлөгөө түр зуурын (урьдчилж олон өдөр
// төлөвлөх боломжтой байлгахын тулд), цуцлагдсан хичээлийнх огт тооцогдохгүй.

export interface ExceptionRow {
  scheduleId: string;
  /** Анхны огноо (YYYY-MM-DD) */
  date: string;
  kind: 'CANCELLED' | 'MOVED';
  newDate: string | null;
}

/** Хичээлийн тохиолдлын БОДИТ огноо (зөөгдсөн бол шинэ огноо); цуцлагдсан бол null. */
export function actualDateOf(
  exceptions: readonly ExceptionRow[],
  scheduleId: string,
  occurrence: string,
): string | null {
  const ex = exceptions.find((e) => e.scheduleId === scheduleId && e.date === occurrence);
  if (!ex) return occurrence;
  if (ex.kind === 'CANCELLED') return null;
  return ex.newDate ?? occurrence;
}

export interface PlanRow {
  scheduleId: string;
  /** Анхны огноо (LessonTopic.date) */
  date: string;
  testIds: string[];
}

/**
 * Замын зурагт «төлөвлөсөн» гэж тооцох төлөвлөгөө: цуцлагдсан хичээлийнх, батлагдсан
 * хичээлийнх (батламжид хийсэн тест л үнэн) хасагдана. `confirmed` = `${scheduleId}|${бодит огноо}`.
 * Буцаах огноо нь бодит огноо (зөөгдсөн хичээл шинэ өдрөөрөө).
 */
export function tentativePlans(
  plans: readonly PlanRow[],
  exceptions: readonly ExceptionRow[],
  confirmed: ReadonlySet<string>,
): PlanRow[] {
  const out: PlanRow[] = [];
  for (const p of plans) {
    const actual = actualDateOf(exceptions, p.scheduleId, p.date);
    if (!actual || confirmed.has(`${p.scheduleId}|${actual}`)) continue;
    out.push({ ...p, date: actual });
  }
  return out;
}

/** Батламжийн snapshot-ын `tests` JSON-оос сангийн тестийн id-г уншина. */
export function recordTestIds(tests: unknown): string[] {
  if (!Array.isArray(tests)) return [];
  return tests.flatMap((t) =>
    t && typeof t === 'object' && typeof (t as { testId?: unknown }).testId === 'string'
      ? [(t as { testId: string }).testId]
      : [],
  );
}

/**
 * Нэг анги нэг өдөр ХОЁР хичээлтэй байж болно (өөр өдрөөс зөөсөн г.м.). Тестийн бүртгэл
 * хичээлгүй (анги+өдөр) тул: өөр хичээлийн БАТЛАМЖИД орсон тест тэр хичээлийнх; бусад нь
 * (батлаагүй, эсвэл энэ хичээлийнх) энэ хичээлд харагдана. Ганц хичээлтэй өдөр бүгд энэнийх.
 */
export function sessionVisibleFor(
  testId: string | null,
  ownTests: ReadonlySet<string>,
  otherLessonsTests: ReadonlySet<string>,
): boolean {
  if (!testId) return true;
  return ownTests.has(testId) || !otherLessonsTests.has(testId);
}

/**
 * Батлахад тестийн бүртгэлийг солих төлөвлөгөө: `desired`-д байхгүй, өөр хичээлийн
 * батламжид ороогүй бүртгэлийг хасна (`remove` — id). Гараар бичсэн (testId-гүй) бүртгэлд
 * хүрэхгүй.
 */
export function planSessionSync(
  current: readonly { id: string; testId: string | null }[],
  desired: readonly string[],
  otherLessonsTests: ReadonlySet<string>,
): { remove: string[] } {
  const want = new Set(desired);
  return {
    remove: current
      .filter((s) => s.testId && !want.has(s.testId) && !otherLessonsTests.has(s.testId))
      .map((s) => s.id),
  };
}

/**
 * Хассан бодлого = тухайн тестийн ОДООГИЙН бодлогууд дотроос л. Тестээс хожим хасагдсан
 * бодлогын id хуучин бүртгэлд үлдсэн байж болно — алдаа өгөхийн оронд шүүнэ (дахин
 * хадгалахад «Хассан бодлого энэ тестэд алга» гэж гацдаг байсан).
 */
export function cleanExcluded(excluded: readonly string[], testProblemIds: readonly string[]): string[] {
  const own = new Set(testProblemIds);
  return [...new Set(excluded)].filter((id) => own.has(id));
}

/** Хоёр жагсаалт ижил эсэх (дараалал, давхардал үл хамаарна). */
export function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const x = new Set(a);
  const y = new Set(b);
  return x.size === y.size && [...x].every((v) => y.has(v));
}

/**
 * Зэрэг засварын хамгаалалт: клиент нээх үедээ харсан хувилбараа (`expected`) илгээвэл
 * одоогийнхтой таарах ёстой. undefined = шалгахгүй (хуучин клиент).
 */
export function isStale(expected: string | null | undefined, current: Date | null | undefined): boolean {
  if (expected === undefined) return false;
  const now = current ? current.getTime() : null;
  const want = expected ? new Date(expected).getTime() : null;
  if (want !== null && Number.isNaN(want)) return true;
  return now !== want;
}
