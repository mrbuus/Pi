import { Subject } from '../generated/prisma/enums';
import { dateKey } from '../common/date';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildCoverageTree,
  furthestCoveredChapter,
  type CoverageBookOut,
} from './class-coverage.logic';

/** Сонгогчийн каталог: ангийн хичээлийн архивлаагүй ном → бүлэг → нийтэлсэн тест. */
export async function loadCoverageCatalog(
  prisma: PrismaService,
  subject: Subject | null,
) {
  const books = await prisma.book.findMany({
    where: {
      deletedAt: null,
      archived: false,
      subject: subject ?? Subject.MATH,
    },
    select: { id: true, code: true, title: true },
  });
  const chapters = books.length
    ? await prisma.chapter.findMany({
        where: { bookId: { in: books.map((b) => b.id) }, deletedAt: null },
        select: { id: true, bookId: true, order: true, title: true },
      })
    : [];
  const tests = chapters.length
    ? await prisma.test.findMany({
        where: {
          chapterId: { in: chapters.map((c) => c.id) },
          deletedAt: null,
          isDraft: false,
        },
        select: { id: true, chapterId: true, title: true, variantLabel: true },
      })
    : [];
  return { books, chapters, tests };
}

/**
 * Ангийн үзсэн сэдвийн түүхийг ӨС-ээс уншина: сонгох номууд (ангийн хичээлийн,
 * архивлаагүй, тесттэй), бүлэг, тест, огноотой (ClassTestSession) ба огноогүй
 * (ClassCoveredTest, removedAt = null) тэмдэглэгээ. Самбар (`detail`) болон
 * сонгогч (`GET …/coverage`) хоёул ЭНЭ нэг функцээр уншина.
 */
export async function loadClassCoverage(
  prisma: PrismaService,
  classroomId: string,
  subject: Subject | null,
): Promise<{ books: CoverageBookOut[]; furthestChapterId: string | null }> {
  const { books, chapters, tests } = await loadCoverageCatalog(prisma, subject);
  const testIds = tests.map((t) => t.id);
  const [sessions, past] = testIds.length
    ? await Promise.all([
        prisma.classTestSession.findMany({
          where: { classroomId, testId: { in: testIds } },
          select: { testId: true, date: true },
        }),
        prisma.classCoveredTest.findMany({
          where: { classroomId, removedAt: null, testId: { in: testIds } },
          select: { testId: true },
        }),
      ])
    : [[], []];

  const lessonDates = new Map<string, string[]>();
  for (const s of sessions) {
    if (!s.testId) continue;
    const list = lessonDates.get(s.testId) ?? [];
    list.push(dateKey(s.date));
    lessonDates.set(s.testId, list);
  }
  const chapterOf = new Map(tests.map((t) => [t.id, t.chapterId ?? '']));
  const coveredChapterIds = new Set<string>();
  for (const id of [...lessonDates.keys(), ...past.map((p) => p.testId)]) {
    const ch = chapterOf.get(id);
    if (ch) coveredChapterIds.add(ch);
  }
  return {
    books: buildCoverageTree({
      books,
      chapters: chapters.map((c) => ({ ...c, bookId: c.bookId ?? '' })),
      tests: tests.map((t) => ({ ...t, chapterId: t.chapterId ?? '' })),
      pastTestIds: past.map((p) => p.testId),
      lessonDates,
    }),
    furthestChapterId: furthestCoveredChapter({
      books,
      chapters,
      coveredChapterIds,
    }),
  };
}
