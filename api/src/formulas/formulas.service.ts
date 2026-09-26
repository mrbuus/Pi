import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FormulaDto } from './dto/formula.dto';
import { FormulaQueryDto } from './dto/formula-query.dto';

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
    const { title, section, related, ...data } = dto;
    return this.prisma.formula.create({ data: { ...data, name: title, section: { connect: { slug: section } }, relatedSlugs: related, variants: data.variants as unknown as Prisma.InputJsonValue | undefined, conditions: data.conditions as unknown as Prisma.InputJsonValue | undefined, derivation: data.derivation as unknown as Prisma.InputJsonValue | undefined, examples: data.examples as unknown as Prisma.InputJsonValue, commonMistakes: data.commonMistakes as unknown as Prisma.InputJsonValue | undefined, quiz: data.quiz as unknown as Prisma.InputJsonValue } });
  }

  async update(slug: string, dto: Partial<FormulaDto>) {
    const { title, section, related, variants, conditions, derivation, examples, commonMistakes, quiz, ...data } = dto;
    return this.prisma.formula.update({ where: { slug }, data: { ...data, ...(title ? { name: title } : {}), ...(related ? { relatedSlugs: related } : {}), ...(section ? { section: { connect: { slug: section } } } : {}), ...(variants ? { variants: variants as unknown as Prisma.InputJsonValue } : {}), ...(conditions ? { conditions: conditions as unknown as Prisma.InputJsonValue } : {}), ...(derivation ? { derivation: derivation as unknown as Prisma.InputJsonValue } : {}), ...(examples ? { examples: examples as unknown as Prisma.InputJsonValue } : {}), ...(commonMistakes ? { commonMistakes: commonMistakes as unknown as Prisma.InputJsonValue } : {}), ...(quiz ? { quiz: quiz as unknown as Prisma.InputJsonValue } : {}) } });
  }
}
