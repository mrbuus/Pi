import { Subject } from '../generated/prisma/enums';
import type { AggregatedPassScope, ClassroomRelease } from '../common/access';

// GET /chapters жагсаалтыг танхимын сурагчид шүүх (эзэн 2026-10-29, шийдвэр 1).
// common/access.ts chapterGrant-ийн (requiresVideo=false) логикийг БҮЛЭГ БҮРД
// DB дуудалгүйгээр давтана: эрхийн хүрээ, ангийн хичээл, нээгдсэн тестийг
// дуудагч НЭГ удаа тооцоод энд дамжуулна. Логикийг сулруулахгүй — chapterGrant
// өөрчлөгдвөл энд мөн адил өөрчилнө (chapter-visibility.spec.ts).

export interface ChapterListTarget {
  id: string;
  bookId: string | null;
  freePreview: boolean;
  subject: Subject;
}

export interface ChapterListContext {
  /** collectContentScope (pass + BOOK худалдан авалт) */
  scope: AggregatedPassScope;
  /** activeClassSubjects */
  ownSubjects: Set<Subject>;
  release: ClassroomRelease;
}

export type ChapterListAccess = 'full' | 'released' | 'none';

export function chapterListAccess(
  ch: ChapterListTarget,
  ctx: ChapterListContext,
): ChapterListAccess {
  const gated = ch.subject !== Subject.MATH;
  if (ch.freePreview && !gated) return 'full';
  if (gated) {
    if (!ctx.ownSubjects.has(ch.subject)) return 'none';
    if (ch.freePreview) return 'full';
  }
  const { scope } = ctx;
  if (
    scope.all ||
    scope.chapterIds.includes(ch.id) ||
    (ch.bookId !== null && scope.bookIds.includes(ch.bookId))
  )
    return 'full';
  if (ctx.release.chapterIds.has(ch.id) && ctx.ownSubjects.has(ch.subject))
    return 'released';
  return 'none';
}
