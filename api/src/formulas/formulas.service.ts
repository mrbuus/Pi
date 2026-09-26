import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FormulaDto } from './dto/formula.dto';
import { FormulaQueryDto } from './dto/formula-query.dto';
import { validateFormulaPayload } from './formula-validator';

@Injectable()
export class FormulasService {
  constructor(private readonly prisma: PrismaService) {}

  sections() {
    return this.prisma.formulaSection.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { formulas: { where: { slug: { not: null } } } } } },
    }).then((rows) => rows.map(({ _count, ...section }) => ({ ...section, count: _count.formulas })));
  }

  list(query: FormulaQueryDto) {
    const searchPattern = query.q ? `%${query.q}%` : null;
    const where: Prisma.FormulaWhereInput = {
      slug: { not: null },
      ...(query.section ? { sectionSlug: query.section } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.grade ? { grade: query.grade } : {}),
      ...(query.topic ? { topicSlugs: { has: query.topic } } : {}),
    };
    const search = searchPattern
      ? this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT f."id" FROM "Formula" f
          WHERE f."name" ILIKE ${searchPattern}
             OR f."slug" ILIKE ${searchPattern}
             OR EXISTS (SELECT 1 FROM unnest(f."keywords") AS kw(value) WHERE kw.value ILIKE ${searchPattern})
        `).then((rows) => rows.map(({ id }) => id))
      : Promise.resolve(null);
    return search.then((ids) => this.prisma.formula.findMany({
      where: { ...where, ...(ids ? { id: { in: ids } } : {}) },
      orderBy: [{ sectionSlug: 'asc' }, { order: 'asc' }], include: { section: true },
    })).then((rows) => rows.map((formula) => ({
      // id/name/description: хуучин content GET /formulas-ийн хэлбэртэй нийцтэй.
      id: formula.id, name: formula.name, description: formula.description,
      slug: formula.slug, title: formula.name, section: formula.section?.slug ?? formula.sectionSlug,
      order: formula.order, level: formula.level, grade: formula.grade, topicSlugs: formula.topicSlugs,
      latex: formula.latex, general: formula.general, widget: formula.widget,
    })));
  }

  async bySlug(slug: string) {
    const formula = await this.prisma.formula.findUnique({ where: { slug }, include: { section: true } });
    if (!formula) throw new NotFoundException('Томьёо олдсонгүй');
    const related = formula.relatedSlugs.length
      ? await this.prisma.formula.findMany({ where: { slug: { in: formula.relatedSlugs } }, select: { slug: true, name: true, latex: true } })
      : [];
    const problemRows = await this.prisma.problemFormula.findMany({
      // Practice examples are discoverable without a user entitlement here, so
      // expose only explicitly free preview content.
      where: { formulaId: formula.id, problem: { deletedAt: null, price: null, chapter: { freePreview: true, deletedAt: null, OR: [{ bookId: null }, { book: { archived: false, deletedAt: null } }] } } },
      take: 5,
      orderBy: { problem: { token: 'asc' } },
      select: { problem: { select: { id: true, token: true, statementText: true, chapter: { select: { title: true } } } } },
    });
    const { sectionSlug, section: sectionRow, relatedSlugs: _relatedSlugs, name, ...fields } = formula;
    return {
      ...fields, title: name,
      section: sectionRow ? { slug: sectionRow.slug, title: sectionRow.title, icon: sectionRow.icon } : null,
      related: related.map((item) => ({ slug: item.slug, title: item.name, latex: item.latex })),
      practice: problemRows.map(({ problem }) => ({ problemId: problem.id, token: problem.token, statementText: problem.statementText, chapterTitle: problem.chapter.title })),
    };
  }

  async my(requester: { userId: string; role: Role }, requestedStudentId?: string) {
    let studentId = requestedStudentId ?? requester.userId;
    if (requester.role === Role.STUDENT || requester.role === Role.BUYER) studentId = requester.userId;
    else if (requester.role === Role.PARENT) {
      if (!requestedStudentId) throw new ForbiddenException();
      const link = await this.prisma.parentLink.findFirst({ where: { parentId: requester.userId, studentId: requestedStudentId, verifiedAt: { not: null } }, select: { id: true } });
      if (!link) throw new ForbiddenException();
    } else if (requester.role === Role.TEACHER) {
      if (!requestedStudentId) throw new ForbiddenException();
      const enrollment = await this.prisma.enrollment.findFirst({ where: { studentId: requestedStudentId, leftAt: null, classroom: { teacherId: requester.userId } }, select: { id: true } });
      if (!enrollment) throw new ForbiddenException();
    } else if (requester.role !== Role.ADMIN && requester.role !== Role.TEACHER_PLUS) {
      throw new ForbiddenException();
    }

    const [attemptGroups, sessions] = await Promise.all([
      this.prisma.attempt.groupBy({ by: ['problemId', 'autoCorrect'], where: { studentId }, _count: { _all: true }, _min: { occurredOn: true }, _max: { occurredOn: true } }),
      // finalize() stores each answered exam item in Attempt and submits the
      // session atomically. Attempt is canonical for counts and correctness;
      // the session supplies only the test title to avoid double counting.
      this.prisma.testAttemptSession.findMany({ where: { studentId, status: 'SUBMITTED' }, orderBy: { submittedAt: 'asc' }, select: { submittedAt: true, problemOrder: true, test: { select: { title: true } } } }),
    ]);
    const attemptsByProblem = new Map<string, { seen: number; correct: number; first: Date | null; last: Date | null }>();
    for (const row of attemptGroups) {
      const entry = attemptsByProblem.get(row.problemId) ?? { seen: 0, correct: 0, first: row._min.occurredOn, last: row._max.occurredOn };
      entry.seen += row._count._all;
      if (row.autoCorrect === true) entry.correct += row._count._all;
      if (row._min.occurredOn && (!entry.first || row._min.occurredOn < entry.first)) entry.first = row._min.occurredOn;
      if (row._max.occurredOn && (!entry.last || row._max.occurredOn > entry.last)) entry.last = row._max.occurredOn;
      attemptsByProblem.set(row.problemId, entry);
    }
    const sessionTitles = new Map<string, { title: string; submittedAt: Date | null }>();
    for (const session of sessions) {
      const ids = Array.isArray(session.problemOrder) ? session.problemOrder : [];
      for (const id of ids) if (typeof id === 'string') sessionTitles.set(id, { title: session.test.title, submittedAt: session.submittedAt });
    }
    const problemIds = [...attemptsByProblem.keys()];
    if (!problemIds.length) return { totalFormulas: await this.prisma.formula.count({ where: { slug: { not: null } } }), seenFormulas: 0, items: [] };
    const [totalFormulas, formulas] = await Promise.all([this.prisma.formula.count({ where: { slug: { not: null } } }), this.prisma.formula.findMany({
      where: { slug: { not: null }, problems: { some: { problemId: { in: problemIds } } } },
      include: { section: { select: { slug: true, title: true } }, problems: { where: { problemId: { in: problemIds } }, select: { problemId: true } } },
    })]);
    const items = formulas.map((formula) => {
      const aggregates = formula.problems.map(({ problemId }) => attemptsByProblem.get(problemId)).filter((v): v is NonNullable<typeof v> => !!v);
      const seenCount = aggregates.reduce((sum, value) => sum + value.seen, 0);
      const dates = aggregates.flatMap((value) => [value.first, value.last]).filter((v): v is Date => v !== null).sort((a, b) => a.getTime() - b.getTime());
      const lastTest = formula.problems.map(({ problemId }) => sessionTitles.get(problemId)).filter((value): value is { title: string; submittedAt: Date | null } => !!value).sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))[0];
      return { slug: formula.slug, title: formula.name, section: formula.section, latex: formula.latex, general: formula.general, firstSeenAt: dates[0] ?? null, lastSeenAt: dates.at(-1) ?? null, seenCount, correctCount: aggregates.reduce((sum, value) => sum + value.correct, 0), lastTestTitle: lastTest?.title ?? null };
    }).filter((item) => item.seenCount > 0).sort((a, b) => (a.firstSeenAt?.getTime() ?? 0) - (b.firstSeenAt?.getTime() ?? 0));
    return { totalFormulas, seenFormulas: items.length, items };
  }

  async create(dto: FormulaDto) {
    const knownSlugs = await this.existingSlugs();
    this.assertValidPayload(dto, knownSlugs);
    await this.assertReferences(dto.section, dto.related);
    try {
      const { title, section, related, ...data } = dto;
      return await this.prisma.formula.create({ data: { ...data, name: title, section: { connect: { slug: section } }, relatedSlugs: related, variants: data.variants as unknown as Prisma.InputJsonValue, conditions: data.conditions as unknown as Prisma.InputJsonValue, derivation: data.derivation as unknown as Prisma.InputJsonValue, examples: data.examples as unknown as Prisma.InputJsonValue, commonMistakes: data.commonMistakes as unknown as Prisma.InputJsonValue, quiz: data.quiz as unknown as Prisma.InputJsonValue } });
    } catch (error) { this.rethrowWriteError(error); }
  }

  async update(slug: string, dto: Partial<FormulaDto>) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('Patch body must include at least one field');
    if (Object.entries(dto).some(([key, value]) => value === null && key !== 'widget')) throw new BadRequestException('Null cannot clear required formula fields');
    const existing = await this.prisma.formula.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Томьёо олдсонгүй');
    const payload = {
      slug: existing.slug, title: dto.title ?? existing.name, section: dto.section ?? existing.sectionSlug,
      order: dto.order ?? existing.order, level: dto.level ?? existing.level, grade: dto.grade ?? existing.grade,
      topicSlugs: dto.topicSlugs ?? existing.topicSlugs, latex: dto.latex ?? existing.latex, general: dto.general ?? existing.general,
      variants: dto.variants ?? existing.variants, conditions: dto.conditions ?? existing.conditions,
      explanation: dto.explanation ?? existing.explanation, derivation: dto.derivation ?? existing.derivation,
      mnemonic: dto.mnemonic ?? existing.mnemonic, examples: dto.examples ?? existing.examples,
      commonMistakes: dto.commonMistakes ?? existing.commonMistakes, eeshTip: dto.eeshTip ?? existing.eeshTip,
      related: dto.related ?? existing.relatedSlugs, keywords: dto.keywords ?? existing.keywords,
      widget: Object.hasOwn(dto, 'widget') ? dto.widget : existing.widget, quiz: dto.quiz ?? existing.quiz,
    };
    const knownSlugs = await this.existingSlugs();
    this.assertValidPayload(payload, knownSlugs);
    await this.assertReferences(payload.section, payload.related);
    const { title, section, related, variants, conditions, derivation, examples, commonMistakes, quiz, widget, ...data } = payload;
    if (typeof section !== 'string') throw new BadRequestException('Formula section is required');
    try {
      return await this.prisma.formula.update({ where: { slug }, data: { ...data, name: title, relatedSlugs: related, section: { connect: { slug: section } }, variants: variants as Prisma.InputJsonValue, conditions: conditions as Prisma.InputJsonValue, derivation: derivation as Prisma.InputJsonValue, examples: examples as Prisma.InputJsonValue, commonMistakes: commonMistakes as Prisma.InputJsonValue, quiz: quiz as Prisma.InputJsonValue, widget } });
    } catch (error) { this.rethrowWriteError(error); }
  }

  private existingSlugs() {
    return this.prisma.formula.findMany({ where: { slug: { not: null } }, select: { slug: true } })
      .then((rows) => new Set(rows.map(({ slug }) => slug).filter((value): value is string => typeof value === 'string')));
  }

  private assertValidPayload(payload: object, knownSlugs: Set<string>) {
    const errors = validateFormulaPayload(payload as Record<string, unknown>, knownSlugs);
    if (errors.length) throw new BadRequestException({ message: 'Formula payload failed validation', errors });
  }

  private async assertReferences(sectionSlug: unknown, relatedSlugs: unknown) {
    if (typeof sectionSlug !== 'string') throw new BadRequestException('Formula section is required');
    if (!Array.isArray(relatedSlugs) || relatedSlugs.some((slug) => typeof slug !== 'string')) throw new BadRequestException('Related formulas must be a slug array');
    const section = await this.prisma.formulaSection.findUnique({ where: { slug: sectionSlug }, select: { slug: true } });
    if (!section) throw new NotFoundException(`Formula section not found: ${sectionSlug}`);
    const existing = await this.prisma.formula.findMany({ where: { slug: { in: relatedSlugs } }, select: { slug: true } });
    const found = new Set(existing.map(({ slug }) => slug));
    const missing = [...new Set(relatedSlugs)].filter((value) => !found.has(value));
    if (missing.length) throw new BadRequestException({ message: 'Related formulas do not exist', missing });
  }

  private rethrowWriteError(error: unknown): never {
    if (error instanceof Error && 'getStatus' in error) throw error;
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === 'P2002') throw new ConflictException('Formula title or slug already exists');
    if (code === 'P2025') throw new NotFoundException('Formula or section reference not found');
    if (code === 'P2003') throw new BadRequestException('Formula section reference is invalid');
    throw error;
  }
}
