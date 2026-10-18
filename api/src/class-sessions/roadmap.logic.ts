// Ангийн «замын зураг» (эзэн 2026-10-18) — номын дарааллаар аль тест хийгдсэн,
// аль нь үлдсэн (алгассан), аль нь хасагдсаныг ТООЦООЛОХ цэвэр логик (I/O-гүй, тесттэй).
//
// Нэгж = бүлэг (Chapter): V3 номд бүлэг бүр НЭГ тест, A/B хоёр хувилбартай.
// Ангид ҮРГЭЛЖ A хувилбарыг хийнэ (ClassDidTest.tsx-ийн эзний дүрэм) — тиймээс
// төлөв нь бүлгийн түвшинд: аль нэг хувилбар хийгдсэн бол бүлэг «хийсэн».

/** Замын зургийн номын дараалал: 100V3 дуусвал 200V3 үргэлжилнэ. */
export const ROADMAP_BOOK_CODES = ['100V3', '200V3'] as const;

export type RoadmapStatus = 'DONE' | 'REMOVED' | 'SKIPPED' | 'TODO';

export interface RoadmapBookIn {
  id: string;
  code: string;
  title: string;
}
export interface RoadmapChapterIn {
  id: string;
  bookId: string;
  order: number;
  title: string;
}
export interface RoadmapTestIn {
  id: string;
  chapterId: string;
  title: string;
  variantLabel: string | null;
  /** TestProblem.order-оор эрэмбэлсэн бодлогын id — дугаар = байр (1-ээс) */
  problemIds: string[];
}
export interface RoadmapSessionIn {
  testId: string;
  date: string; // YYYY-MM-DD
  excludedProblemIds: string[];
}
export interface RoadmapPlanIn {
  testIds: string[];
  date: string; // YYYY-MM-DD
}

export interface RoadmapTestOut {
  testId: string;
  title: string;
  short: string;
  variant: string | null;
  problemCount: number;
  status: RoadmapStatus;
  doneOn?: string;
  excludedNumbers?: number[];
  /** Өмнөх хичээлд төлөвлөсөн боловч хараахан хийгдээгүй (нэмэлт талбар) */
  plannedOn?: string;
}
export interface RoadmapResult {
  books: {
    code: string;
    title: string;
    topics: {
      name: string;
      chapters: {
        chapterId: string;
        order: number;
        title: string;
        tests: RoadmapTestOut[];
      }[];
    }[];
  }[];
  next: string[];
}

/** «Урвуу функц · Тест 1» → «Урвуу функц». */
export function topicNameOf(chapterTitle: string): string {
  const head = chapterTitle.split(' · ')[0]?.trim();
  return head || chapterTitle.trim();
}

/** Мөрөнд багтах богино нэр: тестийн нэр («Урвуу функц 1»), илүү зайгүй. */
export function shortTestName(title: string): string {
  return title.replace(/\s+/g, ' ').trim();
}

/** Хасагдсан бодлогын id-г TestProblem.order дээрх байрлал (1-ээс) болгоно. */
export function excludedNumbersOf(
  problemIds: string[],
  excluded: string[],
): number[] {
  if (!excluded.length) return [];
  const set = new Set(excluded);
  const out: number[] = [];
  problemIds.forEach((id, i) => set.has(id) && out.push(i + 1));
  return out;
}

const variantRank = (v: string | null) => (v ? v.toUpperCase() : '~');

/** Ангид хийх хувилбар — A, байхгүй бол эхний хувилбар. */
export function classVariantOf<T extends { variantLabel: string | null }>(
  tests: T[],
): T | undefined {
  return (
    tests.find((t) => (t.variantLabel ?? '').toUpperCase() === 'A') ??
    [...tests].sort((a, b) =>
      variantRank(a.variantLabel).localeCompare(variantRank(b.variantLabel)),
    )[0]
  );
}

export function buildRoadmap(input: {
  books: RoadmapBookIn[];
  chapters: RoadmapChapterIn[];
  tests: RoadmapTestIn[];
  sessions: RoadmapSessionIn[];
  removedTestIds: string[];
  /** Өмнөх хичээлүүдийн төлөвлөгөө (зорилтот өдрөөс ӨМНӨХ) — next-ийг урагшлуулна */
  plans?: RoadmapPlanIn[];
  nextLimit?: number;
}): RoadmapResult {
  const rank = (code: string) => {
    const i = (ROADMAP_BOOK_CODES as readonly string[]).indexOf(code);
    return i === -1 ? ROADMAP_BOOK_CODES.length : i;
  };
  const books = [...input.books].sort(
    (a, b) => rank(a.code) - rank(b.code) || a.code.localeCompare(b.code),
  );
  const testsByChapter = new Map<string, RoadmapTestIn[]>();
  for (const t of input.tests) {
    const list = testsByChapter.get(t.chapterId) ?? [];
    list.push(t);
    testsByChapter.set(t.chapterId, list);
  }
  // Тест бүрийн хамгийн сүүлийн хийсэн өдөр (+ тэр өдрийн хассан бодлого)
  const lastSession = new Map<string, RoadmapSessionIn>();
  for (const s of input.sessions) {
    const prev = lastSession.get(s.testId);
    if (!prev || prev.date < s.date) lastSession.set(s.testId, s);
  }
  const removed = new Set(input.removedTestIds);
  const plannedOn = new Map<string, string>();
  for (const p of input.plans ?? [])
    for (const id of p.testIds) {
      const prev = plannedOn.get(id);
      if (!prev || prev < p.date) plannedOn.set(id, p.date);
    }

  // Нэгжүүдийг (бүлэг) номын дарааллаар нэг шугамд жагсаана
  interface Unit {
    book: RoadmapBookIn;
    chapter: RoadmapChapterIn;
    tests: RoadmapTestIn[];
    done: boolean;
    doneOn: string | null;
    removed: boolean;
    planned: string | null;
  }
  const units: Unit[] = [];
  for (const book of books) {
    const chapters = input.chapters
      .filter((c) => c.bookId === book.id && testsByChapter.has(c.id))
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
    for (const chapter of chapters) {
      const tests = [...(testsByChapter.get(chapter.id) ?? [])].sort((a, b) =>
        variantRank(a.variantLabel).localeCompare(variantRank(b.variantLabel)),
      );
      const dates = tests
        .map((t) => lastSession.get(t.id)?.date)
        .filter((d): d is string => !!d)
        .sort();
      const planned = tests
        .map((t) => plannedOn.get(t.id))
        .filter((d): d is string => !!d)
        .sort();
      units.push({
        book,
        chapter,
        tests,
        done: dates.length > 0,
        doneOn: dates.at(-1) ?? null,
        removed: tests.some((t) => removed.has(t.id)),
        planned: planned.at(-1) ?? null,
      });
    }
  }

  // Ном бүрийн хамгийн хол хийсэн нэгж — түүнээс өмнөх хийгээгүй нь «үлдсэн»
  const furthestInBook = new Map<string, number>();
  let furthest = -1; // хийсэн эсвэл өмнөх хичээлд төлөвлөсөн хамгийн хол нэгж
  units.forEach((u, i) => {
    if (u.done) furthestInBook.set(u.book.id, i);
    if (u.done || (u.planned && !u.removed)) furthest = Math.max(furthest, i);
  });
  const statusOf = (u: Unit, i: number): RoadmapStatus =>
    u.done
      ? 'DONE'
      : u.removed
        ? 'REMOVED'
        : i < (furthestInBook.get(u.book.id) ?? -1)
          ? 'SKIPPED'
          : 'TODO';

  const next: string[] = [];
  const limit = input.nextLimit ?? 12;
  units.forEach((u, i) => {
    if (i <= furthest || next.length >= limit) return;
    if (statusOf(u, i) !== 'TODO' || u.planned) return;
    const pick = classVariantOf(u.tests);
    if (pick) next.push(pick.id);
  });

  const result: RoadmapResult = { books: [], next };
  units.forEach((u, i) => {
    let book = result.books.find((b) => b.code === u.book.code);
    if (!book) {
      book = { code: u.book.code, title: u.book.title, topics: [] };
      result.books.push(book);
    }
    const name = topicNameOf(u.chapter.title);
    let topic = book.topics.at(-1);
    if (!topic || topic.name !== name) {
      topic = { name, chapters: [] };
      book.topics.push(topic);
    }
    const status = statusOf(u, i);
    topic.chapters.push({
      chapterId: u.chapter.id,
      order: u.chapter.order,
      title: u.chapter.title,
      tests: u.tests.map((t) => {
        const own = lastSession.get(t.id);
        const out: RoadmapTestOut = {
          testId: t.id,
          title: t.title,
          short: shortTestName(t.title),
          variant: t.variantLabel,
          problemCount: t.problemIds.length,
          status,
        };
        if (status === 'DONE' && u.doneOn) out.doneOn = own?.date ?? u.doneOn;
        if (own) {
          const nums = excludedNumbersOf(t.problemIds, own.excludedProblemIds);
          if (nums.length) out.excludedNumbers = nums;
        }
        if (!u.done && u.planned) out.plannedOn = u.planned;
        return out;
      }),
    });
  });
  return result;
}
