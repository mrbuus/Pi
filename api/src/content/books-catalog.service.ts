import { Injectable, NotFoundException } from '@nestjs/common';
import { Subject, TestGradingMode, TestType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { BOOK_DISPLAY_ORDER, studentBookWhere } from '../common/book-display';

// Нийтийн номын каталог (/books, нэвтрэлтгүй): ном → сэдэв → бүлэг → тест.
// Сэдэв = бүлгийн нэрний « · »-ээс өмнөх хэсэг («Тоо тоолол · Тест 1» → «Тоо тоолол»).
// ҮНЭГҮЙ тест = сэдэв бүрийн ЭХНИЙ (онлайн бодогдох тесттэй) бүлгийн эхний тест
// (A/B хувилбар бол хоёулаа), мөн эзний freePreview гэж тэмдэглэсэн бүлгийн эхний
// тест (эзэн 2026-10-14). Бүтэн сорил (THOUSAND, EESH_MOCK) үнэгүй өгөхгүй —
// тэдгээр нь тусдаа бүтээгдэхүүн (1000 бодлого, жишиг сорил).

export interface TestLite {
  id: string;
  title: string;
  variantLabel: string | null;
  groupKey: string | null;
  createdAt: Date;
  gradingMode: TestGradingMode;
  type: TestType;
  problemCount: number;
}
export interface ChapterLite {
  id: string;
  title: string;
  order: number;
  freePreview: boolean;
  tests: TestLite[];
}

export const topicOf = (title: string) => title.split(' · ')[0].trim() || title;

/** «Аналитик геометр 3» → 3, «Сорил 12-A» → 12; дугааргүй бол хамгийн сүүлд */
export function numSuffix(title: string): number {
  const m = title.match(/(\d+)\s*(?:-\s*[A-ZА-ЯЁӨҮ])?\s*$/u);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

export const solvable = (t: TestLite) => t.gradingMode === TestGradingMode.AUTO && t.problemCount > 0;
const sampleable = (t: TestLite) => solvable(t) && t.type !== TestType.THOUSAND && t.type !== TestType.EESH_MOCK;

/** Үнэгүй тестүүдийн id — цэвэр функц (unit тесттэй) */
export function freeTestIds(chapters: ChapterLite[]): Set<string> {
  const firstByTopic = new Map<string, ChapterLite>();
  for (const ch of [...chapters].sort((a, b) => a.order - b.order)) {
    const t = topicOf(ch.title);
    if (!firstByTopic.has(t) && ch.tests.some(sampleable)) firstByTopic.set(t, ch);
  }
  const freeChapters = new Set([...firstByTopic.values()].map((c) => c.id));
  chapters.filter((c) => c.freePreview).forEach((c) => freeChapters.add(c.id));
  const out = new Set<string>();
  for (const ch of chapters) {
    if (!freeChapters.has(ch.id)) continue;
    const list = ch.tests.filter(sampleable);
    if (!list.length) continue;
    const sorted = [...list].sort(
      (a, b) => numSuffix(a.title) - numSuffix(b.title) || a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const first = sorted[0];
    // A/B хувилбартай бол нэг бүлгийн бүх хувилбар; үгүй бол зөвхөн эхнийх
    const group = first.variantLabel && first.groupKey ? list.filter((t) => t.groupKey === first.groupKey) : [first];
    group.forEach((t) => out.add(t.id));
  }
  return out;
}

const PUBLIC_BOOK_SELECT = { id: true, code: true, title: true, displayName: true, subject: true } as const;
const CHAPTER_WITH_TESTS = {
  id: true,
  title: true,
  order: true,
  freePreview: true,
  tests: {
    where: { deletedAt: null, isDraft: false },
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      title: true,
      variantLabel: true,
      groupKey: true,
      createdAt: true,
      gradingMode: true,
      timeLimitMin: true,
      type: true,
      _count: { select: { problems: true } },
    },
  },
  _count: { select: { problems: { where: { deletedAt: null } } } },
} as const;

type ChapterRow = {
  id: string; title: string; order: number; freePreview: boolean;
  tests: { id: string; title: string; variantLabel: string | null; groupKey: string | null; createdAt: Date; gradingMode: TestGradingMode; timeLimitMin: number | null; type: TestType; _count: { problems: number } }[];
  _count: { problems: number };
};

const lite = (ch: ChapterRow): ChapterLite => ({
  id: ch.id, title: ch.title, order: ch.order, freePreview: ch.freePreview,
  tests: ch.tests.map((t) => ({ id: t.id, title: t.title, variantLabel: t.variantLabel, groupKey: t.groupKey, createdAt: t.createdAt, gradingMode: t.gradingMode, type: t.type, problemCount: t._count.problems })),
});

@Injectable()
export class BooksCatalogService {
  constructor(private prisma: PrismaService) {}

  /** Нийтэд харагдах номууд: архивлаагүй, туршилтын (LAB, v2-*) биш; V3 хувилбартай бол хуучныг нуух */
  private async publicBooks() {
    const rows = await this.prisma.book.findMany({
      // Нийтэд зөвхөн MATH — бусад хичээл ангиар хаалттай (эзэн 2026-10-18)
      // studentHidden (эзэн 2026-10-29, шийдвэр 6): V2 давхардал, LAB, тест ном
      where: { archived: false, deletedAt: null, subject: Subject.MATH, ...studentBookWhere(false) },
      select: PUBLIC_BOOK_SELECT,
      orderBy: BOOK_DISPLAY_ORDER,
    });
    const codes = new Set(rows.map((b) => b.code));
    return rows.filter((b) => !/LAB|legacy/i.test(b.code) && !b.id.startsWith('v2-') && !codes.has(`${b.code}V3`));
  }

  async listBooks() {
    const books = await this.publicBooks();
    const chapters = (await this.prisma.chapter.findMany({
      where: { bookId: { in: books.map((b) => b.id) }, deletedAt: null },
      select: { bookId: true, ...CHAPTER_WITH_TESTS },
      orderBy: { order: 'asc' },
    })) as (ChapterRow & { bookId: string })[];
    return books.map((b) => {
      const mine = chapters.filter((c) => c.bookId === b.id);
      const free = freeTestIds(mine.map(lite));
      const tests = mine.flatMap((c) => c.tests);
      return {
        ...b,
        topics: new Set(mine.map((c) => topicOf(c.title))).size,
        chapters: mine.length,
        tests: tests.length,
        solvableTests: tests.filter((t) => t.gradingMode === TestGradingMode.AUTO && t._count.problems > 0).length,
        freeTests: free.size,
        problems: mine.reduce((s, c) => s + c._count.problems, 0),
      };
    });
  }

  async bookDetail(code: string) {
    const book = (await this.publicBooks()).find((b) => b.code === code);
    if (!book) throw new NotFoundException('Ном олдсонгүй');
    const chapters = (await this.prisma.chapter.findMany({
      where: { bookId: book.id, deletedAt: null },
      select: CHAPTER_WITH_TESTS,
      orderBy: { order: 'asc' },
    })) as ChapterRow[];
    const free = freeTestIds(chapters.map(lite));
    const topics: { name: string; chapters: unknown[]; tests: number; freeTests: number; problems: number }[] = [];
    for (const ch of chapters) {
      const name = topicOf(ch.title);
      let topic = topics.find((t) => t.name === name);
      if (!topic) { topic = { name, chapters: [], tests: 0, freeTests: 0, problems: 0 }; topics.push(topic); }
      const tests = ch.tests.map((t) => ({
        id: t.id, title: t.title, variantLabel: t.variantLabel, groupKey: t.groupKey, timeLimitMin: t.timeLimitMin,
        type: t.type, problemCount: t._count.problems, free: free.has(t.id),
        solvable: t.gradingMode === TestGradingMode.AUTO && t._count.problems > 0,
      }));
      topic.chapters.push({ id: ch.id, title: ch.title, label: ch.title.split(' · ').slice(1).join(' · ').trim() || ch.title, order: ch.order, problems: ch._count.problems, tests });
      topic.tests += tests.length;
      topic.freeTests += tests.filter((t) => t.free).length;
      topic.problems += ch._count.problems;
    }
    return { ...book, topics, freeTests: free.size };
  }

  async isFreeTest(bookId: string, testId: string): Promise<boolean> {
    const chapters = (await this.prisma.chapter.findMany({
      // MATH-аас бусад хичээлийн ном үнэгүй тестгүй (ангиар хаалттай)
      where: { bookId, deletedAt: null, book: { subject: Subject.MATH } },
      select: CHAPTER_WITH_TESTS,
    })) as ChapterRow[];
    return freeTestIds(chapters.map(lite)).has(testId);
  }
}
