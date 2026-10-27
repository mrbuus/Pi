// «Өмнө үзсэн сэдэв» (эзэн 2026-10-27) — цэвэр логик (I/O-гүй, тесттэй).
//
// Ангийн үзсэн сэдвийн түүх = ХОЁР эх сурвалжийн нэгдэл:
//   LESSON — өдрийн хичээлээр батлагдсан, ОГНООТОЙ (ClassTestSession)
//   PAST   — систем эхлэхээс өмнө үзсэн, ОГНООГҮЙ (ClassCoveredTest, removedAt = null)
// Нэгж = тест; бүлэг (Chapter) нь аль нэг тест нь үзсэн бол «үзсэн».

import { ROADMAP_BOOK_CODES } from '../class-sessions/roadmap.logic';

export type CoverageSource = 'LESSON' | 'PAST';

/** Нэг удаад хадгалах тестийн дээд тоо (100V3 + 200V3 ≈ 400 тест) */
export const MAX_PAST_TESTS = 2000;

export interface CoveredRowIn {
  testId: string;
  removedAt: Date | null;
}

export interface PastSavePlan {
  /** Мөр огт байхгүй — шинээр үүсгэнэ */
  create: string[];
  /** Мөр бий, removedAt-тэй — сэргээнэ (removedAt = null) */
  restore: string[];
  /** Идэвхтэй мөр, сонголтод алга — зөөлөн хасна (removedAt тавина) */
  remove: string[];
  /** Идэвхтэй, сонгосон — өөрчлөхгүй */
  keep: string[];
}

/**
 * Багшийн сонгосон БҮТЭН багц (desired) ба одоогийн мөрүүдээс юу хийхийг тооцно.
 * Давтан хадгалбал create/restore/remove бүгд хоосон (idempotent).
 */
export function planPastSave(
  rows: CoveredRowIn[],
  desired: Iterable<string>,
): PastSavePlan {
  const want = new Set([...desired].filter(Boolean));
  const byTest = new Map(rows.map((r) => [r.testId, r]));
  const plan: PastSavePlan = { create: [], restore: [], remove: [], keep: [] };
  for (const id of want) {
    const row = byTest.get(id);
    if (!row) plan.create.push(id);
    else if (row.removedAt) plan.restore.push(id);
    else plan.keep.push(id);
  }
  for (const r of rows)
    if (!r.removedAt && !want.has(r.testId)) plan.remove.push(r.testId);
  for (const k of Object.keys(plan) as (keyof PastSavePlan)[]) plan[k].sort();
  return plan;
}

/** Номын дараалал: 100V3 → 200V3 → бусад (кодоор). */
export function bookRank(code: string): number {
  const i = (ROADMAP_BOOK_CODES as readonly string[]).indexOf(code);
  return i === -1 ? ROADMAP_BOOK_CODES.length : i;
}

export interface CoverageBookIn {
  id: string;
  code: string;
  title: string;
}
export interface CoverageChapterIn {
  id: string;
  bookId: string;
  order: number;
  title: string;
}
export interface CoverageTestIn {
  id: string;
  chapterId: string;
  title: string;
  variantLabel: string | null;
}

export interface CoverageTestOut {
  id: string;
  title: string;
  variant: string | null;
  /** Өмнө үзсэн гэж тэмдэглэсэн (огноогүй) */
  past: boolean;
  /** Өдрийн хичээлээр батлагдсан огноонууд (өсөх дарааллаар) */
  lessonDates: string[];
}
export interface CoverageChapterOut {
  id: string;
  order: number;
  title: string;
  tests: CoverageTestOut[];
}
export interface CoverageBookOut {
  id: string;
  code: string;
  title: string;
  chapters: CoverageChapterOut[];
  /** Тесттэй бүлгийн тоо */
  totalChapters: number;
  /** Аль нэг тест нь үзсэн (PAST эсвэл LESSON) бүлэг */
  coveredChapters: number;
  /** Зөвхөн өмнө үзсэн тэмдэглэгээгээр үзсэн бүлэг */
  pastChapters: number;
}

const variantRank = (v: string | null) => (v ? v.toUpperCase() : '~');

/**
 * Ном → бүлэг → тест мод. Тестгүй бүлэг, бүлэггүй ном орохгүй.
 * `lessonDates` — testId → YYYY-MM-DD[] (ClassTestSession).
 */
export function buildCoverageTree(input: {
  books: CoverageBookIn[];
  chapters: CoverageChapterIn[];
  tests: CoverageTestIn[];
  pastTestIds: Iterable<string>;
  lessonDates: Map<string, string[]>;
}): CoverageBookOut[] {
  const past = new Set(input.pastTestIds);
  const testsByChapter = new Map<string, CoverageTestIn[]>();
  for (const t of input.tests) {
    const list = testsByChapter.get(t.chapterId) ?? [];
    list.push(t);
    testsByChapter.set(t.chapterId, list);
  }
  const books = [...input.books].sort(
    (a, b) =>
      bookRank(a.code) - bookRank(b.code) || a.code.localeCompare(b.code),
  );
  const out: CoverageBookOut[] = [];
  for (const book of books) {
    const chapters = input.chapters
      .filter((c) => c.bookId === book.id && testsByChapter.has(c.id))
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    if (!chapters.length) continue;
    let coveredChapters = 0;
    let pastChapters = 0;
    const chOut: CoverageChapterOut[] = chapters.map((c) => {
      const tests = [...(testsByChapter.get(c.id) ?? [])]
        .sort(
          (a, b) =>
            variantRank(a.variantLabel).localeCompare(
              variantRank(b.variantLabel),
            ) || a.title.localeCompare(b.title),
        )
        .map((t) => ({
          id: t.id,
          title: t.title,
          variant: t.variantLabel,
          past: past.has(t.id),
          lessonDates: [...new Set(input.lessonDates.get(t.id) ?? [])].sort(),
        }));
      const anyLesson = tests.some((t) => t.lessonDates.length > 0);
      const anyPast = tests.some((t) => t.past);
      if (anyLesson || anyPast) coveredChapters++;
      if (anyPast && !anyLesson) pastChapters++;
      return { id: c.id, order: c.order, title: c.title, tests };
    });
    out.push({
      id: book.id,
      code: book.code,
      title: book.title,
      chapters: chOut,
      totalChapters: chOut.length,
      coveredChapters,
      pastChapters,
    });
  }
  return out;
}

/**
 * Номын дарааллаар ХАМГИЙН ХОЛ үзсэн бүлэг (PAST ∪ LESSON) — «Одоогийн бүлэг»-ийн
 * эх сурвалж. Үндсэн дараалал (100V3 → 200V3)-ын ном давамгайлна; түүнд үзсэн
 * бүлэг байхгүй үед л бусад номоос. Үзсэн тест байхгүй бол null.
 */
export function furthestCoveredChapter(input: {
  books: { id: string; code: string }[];
  chapters: { id: string; bookId: string | null; order: number }[];
  coveredChapterIds: Iterable<string>;
}): string | null {
  const covered = new Set(input.coveredChapterIds);
  const bookById = new Map(input.books.map((b) => [b.id, b]));
  let best: { id: string; rank: number; code: string; order: number } | null =
    null;
  for (const c of input.chapters) {
    if (!covered.has(c.id) || !c.bookId) continue;
    const book = bookById.get(c.bookId);
    if (!book) continue;
    const main = (ROADMAP_BOOK_CODES as readonly string[]).indexOf(book.code);
    // Үндсэн номууд 0,1,… ; бусад ном -1 (үндсэн номд үзсэн бүлэг байвал тэр нь давамгайлна)
    const cand = { id: c.id, rank: main, code: book.code, order: c.order };
    if (
      !best ||
      cand.rank > best.rank ||
      (cand.rank === best.rank && cand.code > best.code) ||
      (cand.rank === best.rank &&
        cand.code === best.code &&
        cand.order > best.order)
    )
      best = cand;
  }
  return best?.id ?? null;
}
