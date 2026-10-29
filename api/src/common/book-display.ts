import { Prisma } from '../generated/prisma/client';

// Сурагчид харагдах номын нэр/дараалал (эзэн 2026-10-29, шийдвэр 6).
// Book.title нь дотоод/импортын нэр («100x100» г.м.) хэвээр; сурагчид
// displayName ?? title харагдана. studentHidden=true ном сурагчийн каталогт
// огт гарахгүй (V2 давхардал, LAB, тест ном). Ажилтан бүгдийг харна.

export interface BookDisplayFields {
  title: string;
  displayName?: string | null;
}

/** Сурагчид харагдах нэр: displayName (хоосон биш) эсвэл title */
export function bookDisplayName(b: BookDisplayFields): string {
  const name = b.displayName?.trim();
  return name ? name : b.title;
}

/** Сурагчийн (ажилтан биш) каталогийн нэмэлт WHERE */
export function studentBookWhere(isStaff: boolean): Prisma.BookWhereInput {
  return isStaff ? {} : { studentHidden: false };
}

/** Каталогийн дараалал: displayOrder (null хамгийн сүүлд), дараа нь code */
export const BOOK_DISPLAY_ORDER: Prisma.BookOrderByWithRelationInput[] = [
  { displayOrder: { sort: 'asc', nulls: 'last' } },
  { code: 'asc' },
];

/** In-memory эрэмбэ (BOOK_DISPLAY_ORDER-тэй ижил) — цэвэр функц */
export function compareBookDisplay(
  a: { code: string; displayOrder?: number | null },
  b: { code: string; displayOrder?: number | null },
): number {
  const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
  const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
  return ao - bo || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
}

/** Select-д нэмэх талбарууд (book: { select: { ...BOOK_DISPLAY_SELECT } }) */
export const BOOK_DISPLAY_SELECT = { displayName: true } as const;
