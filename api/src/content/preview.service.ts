import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class PreviewService {
  constructor(private readonly prisma: PrismaService) {}
  async books() {
    return this.prisma.book.findMany({
      where: { archived: false, deletedAt: null },
      orderBy: [{ code: 'asc' }, { id: 'asc' }],
      take: 100,
      select: {
        id: true,
        code: true,
        title: true,
        chapters: {
          where: { deletedAt: null },
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          take: 500,
          select: { id: true, title: true, order: true },
        },
      },
    });
  }
  async chapter(id: string) {
    const chapter = await this.prisma.chapter.findFirst({
      where: {
        id,
        deletedAt: null,
        book: { archived: false, deletedAt: null },
      },
      select: {
        id: true,
        title: true,
        book: { select: { id: true, title: true } },
        problems: {
          where: { deletedAt: null },
          orderBy: [{ page: 'asc' }, { number: 'asc' }, { id: 'asc' }],
          take: 3,
          select: { id: true, token: true, statementText: true },
        },
      },
    });
    if (!chapter) throw new NotFoundException('Бүлэг сэдэв олдсонгүй');
    // Explicit projection is intentional: no choices JSON, answer keys, analysis,
    // relations, media URLs, or pagination capable of exposing further questions.
    return {
      id: chapter.id,
      title: chapter.title,
      book: chapter.book
        ? { id: chapter.book.id, title: chapter.book.title }
        : null,
      problems: chapter.problems.map((p) => ({
        id: p.id,
        token: p.token,
        statementText: p.statementText,
      })),
    };
  }
}
