import type { PrismaService } from '../prisma/prisma.service';

/**
 * Тестийн ЭХ PDF (эзэн 2026-11-03): номын бүлэг бүрийн («Функц · Тест 1») Word-оос
 * хэвлэсэн, гараар шивсэн файл — A, B хувилбар нэг файлд. Вэб бодлогоос ҮҮСГЭХГҮЙ.
 * Төвийн бүх багш (Багш, Багш+, Админ) номын хуудас, хуваарь хоёроос татна;
 * сурагч, эцэг эх татахгүй (FileAuthorizationService).
 *
 * Түлхүүр нь бүлгийн ID-аас тогтдог тул шинэ багана хэрэггүй. Хэрэглэгчийн
 * илгээсэн файл үргэлж `uuid.ext` түлхүүртэй — энэ угтварыг хуурамчаар авч чадахгүй.
 * Файлыг `prisma/chapter-pdfs.cjs` оруулна.
 */
export const SOURCE_PDF_PREFIX = 'chapter-pdf-';

export function sourcePdfKey(chapterId: string): string {
  return `${SOURCE_PDF_PREFIX}${chapterId}.pdf`;
}

/**
 * Татах үеийн файлын нэр — тестийн нэрээр (эзэн 2026-11-03: «сонин нэртэй
 * хадгалагдаж болохгүй»), ж: «100x100 V3 - Тоо тоолол - Тест 2.pdf».
 * Эх PDF-ийн түлхүүр биш эсвэл бүлэг олдохгүй бол null.
 */
export async function sourcePdfFileName(
  prisma: PrismaService,
  key: string,
): Promise<string | null> {
  if (!key.startsWith(SOURCE_PDF_PREFIX) || !key.endsWith('.pdf')) return null;
  const chapter = await prisma.chapter.findUnique({
    where: { id: key.slice(SOURCE_PDF_PREFIX.length, -'.pdf'.length) },
    select: { title: true, book: { select: { title: true, code: true } } },
  });
  if (!chapter) return null;
  const book = chapter.book
    ? `${chapter.book.title}${/V3$/i.test(chapter.book.code) && !/V3/i.test(chapter.book.title) ? ' V3' : ''}`
    : '';
  const title = chapter.title.replace(/\s*·\s*/g, ' - ');
  // «1000 бодлого · Сорил 7-A» — номын нэр гарчигт аль хэдийн байвал давтахгүй
  const full =
    book && !title.toLowerCase().startsWith(chapter.book!.title.toLowerCase())
      ? `${book} - ${title}`
      : title;
  const safe = full.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${safe || 'Тест'}.pdf`;
}

/** `Content-Disposition: attachment` — кирилл нэрийг RFC 5987-оор, ASCII нөөцтэй. */
export function attachmentHeader(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/** Эх PDF-тэй бүлгүүдийн ID (нэг асуулга). */
export async function chaptersWithSourcePdf(
  prisma: PrismaService,
  chapterIds: (string | null | undefined)[],
): Promise<Set<string>> {
  const ids = [...new Set(chapterIds.filter((id): id is string => !!id))];
  if (!ids.length) return new Set();
  const rows = await prisma.storedFile.findMany({
    where: { key: { in: ids.map(sourcePdfKey) } },
    select: { key: true },
  });
  return new Set(rows.map((r) => r.key.slice(SOURCE_PDF_PREFIX.length, -'.pdf'.length)));
}
