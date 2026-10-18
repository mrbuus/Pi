import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { UPLOAD_DIR } from '../storage/uploads.controller';
import {
  GradableProblem,
  choiceImagesOf,
  choiceModeOf,
  choiceTextsOf,
  gradeAnswer,
  hasKnownAnswer,
} from '../tests/grading';
import { BooksCatalogService } from './books-catalog.service';

// Үнэгүй тестийг нэвтрэлтгүй бодох (/books). Хөдөлгүүртэй (tests.service) ИЖИЛ
// дүрэм: бодлогын харагдац choiceModeOf/choiceTextsOf, дүн gradeAnswer; зөвхөн
// хариуг холихгүй (session байхгүй). Хариуны түлхүүр, бодолт нийтэд ХЭЗЭЭ Ч
// очихгүй — зөвхөн зөв/буруу ба нийт оноо буцна (эзний контентын дүрэм 2026-10-08).

const PROBLEM_SELECT = {
  id: true, format: true, statementText: true, imageKey: true, choices: true, correctAnswer: true,
  choiceOptions: { select: { order: true, text: true, isCorrect: true, imageKey: true } },
} as const;

@Injectable()
export class TryService {
  constructor(private prisma: PrismaService, private catalog: BooksCatalogService) {}

  private async loadFree(testId: string) {
    const test = await this.prisma.test.findFirst({
      where: { id: testId, deletedAt: null, isDraft: false },
      select: {
        id: true, title: true, variantLabel: true, timeLimitMin: true, type: true,
        chapter: { select: { id: true, title: true, bookId: true, book: { select: { code: true, title: true, archived: true, deletedAt: true } } } },
        problems: { orderBy: { order: 'asc' }, select: { points: true, problem: { select: PROBLEM_SELECT } } },
      },
    });
    const bookId = test?.chapter?.bookId;
    if (!test?.chapter?.book || !bookId || test.chapter.book.archived || test.chapter.book.deletedAt) throw new NotFoundException('Тест олдсонгүй');
    if (!(await this.catalog.isFreeTest(bookId, testId))) {
      throw new ForbiddenException({ locked: true, message: 'Энэ тест номын эрхтэй сурагчдад нээлттэй' });
    }
    return test;
  }

  async view(testId: string) {
    const t = await this.loadFree(testId);
    const problems = t.problems.map((tp, i) => {
      const g = tp.problem as GradableProblem & { imageKey: string | null; statementText: string | null };
      const mode = choiceModeOf(g);
      const images = mode === 'TEXT' ? choiceImagesOf(g) : null;
      return {
        id: g.id, n: i + 1, format: g.format, statementText: g.statementText, points: tp.points,
        imageKey: g.imageKey, choiceMode: mode, choices: mode ? choiceTextsOf(g) : null, choiceImages: images,
      };
    });
    return {
      id: t.id, title: t.title, variantLabel: t.variantLabel, timeLimitMin: t.timeLimitMin, type: t.type,
      book: { code: t.chapter!.book!.code, title: t.chapter!.book!.title },
      chapter: { id: t.chapter!.id, title: t.chapter!.title },
      problemCount: problems.length, problems,
    };
  }

  async grade(testId: string, raw: unknown) {
    const t = await this.loadFree(testId);
    const answers = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const per: Record<string, boolean | null> = {};
    let score = 0, max = 0, answered = 0;
    for (const tp of t.problems) {
      const g = tp.problem as GradableProblem;
      if (!hasKnownAnswer(g)) { per[g.id] = null; continue; } // түлхүүргүй бодлого дүнд орохгүй (хөдөлгүүртэй ижил)
      max += tp.points;
      const given = answers[g.id];
      if (given === undefined || given === null || given === '') { per[g.id] = false; continue; }
      answered++;
      const ok = gradeAnswer(g, given).correct;
      per[g.id] = ok;
      if (ok) score += tp.points;
    }
    return { score, max, answered, perProblem: per };
  }

  /** Үнэгүй тестийн бодлогын зураг (нэвтрэлтгүй) — зөвхөн тэр тестийн бодлого/сонголтын түлхүүр */
  async file(testId: string, key: string) {
    if (!/^[\w][\w.-]*$/.test(key)) throw new NotFoundException('Зураг олдсонгүй');
    const t = await this.loadFree(testId);
    const allowed = t.problems.some((tp) => tp.problem.imageKey === key || tp.problem.choiceOptions.some((c) => c.imageKey === key));
    if (!allowed) throw new NotFoundException('Зураг олдсонгүй');
    const path = join(UPLOAD_DIR, key);
    if (existsSync(path)) {
      const stored = await this.prisma.storedFile.findUnique({ where: { key }, select: { mime: true } });
      return { bytes: readFileSync(path), mime: stored?.mime ?? 'application/octet-stream' };
    }
    const stored = await this.prisma.storedFile.findUnique({ where: { key } });
    if (!stored) throw new NotFoundException('Зураг олдсонгүй');
    return { bytes: Buffer.from(stored.bytes), mime: stored.mime };
  }
}
