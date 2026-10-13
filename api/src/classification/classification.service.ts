import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MistakeType, Role, TagType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  beginRevision,
  commitRevision,
  RevisionDb,
} from '../revisions/revision-store';

const TEACHER_ROLES: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];

export interface ChoiceInput {
  label: string;
  text: string;
  isCorrect: boolean;
  mistakeType?: MistakeType;
  mistakeNote?: string;
  /** undefined — хуучин сонголтын (ижил үсэг) зургийг хадгална; null — хасна */
  imageKey?: string | null;
}

export interface ClassificationSaveInput {
  choices?: ChoiceInput[];
  tagIds?: string[];
  expectedVersion?: number;
  /** 409-ийн дараа «Миний хувилбарыг хадгалах» (revision-store BeginOptions) */
  overwrite?: boolean;
}

/**
 * Бодлогын ангилал/сонголтыг БАГШ гараар засах эрхийг хариуцна.
 *
 * Зарчим (SPEC §7.2, §9): AI/импорт автоматаар ангилахдаа AUTO_DRAFT гэж
 * тэмдэглэдэг, "баталгаажсан" гэж ХЭЛДЭГГҮЙ. Зөвхөн багш/админ гараар
 * баталгаажуулж, бодлогын төрөл (Tag), сонголт бүрийн алдааны шалтгааныг засна.
 *
 * Tag (ангилал) нь REFERENCED entity тул нэрийг нь нэг өөрчлөхөд тэр ангилалтай
 * холбоотой БҮХ бодлого автоматаар шинэчлэгдэнэ (нэрийг хувилж хадгалдаггүй).
 *
 * Засвар бүр өөрчлөлтийн түүхэд (ContentRevision) нэг transaction-д бичигдэнэ;
 * expectedVersion зөрвөл 409 (revisions/revision-store.ts).
 */
@Injectable()
export class ClassificationService {
  constructor(private prisma: PrismaService) {}

  private assertTeacher(role: Role) {
    if (!TEACHER_ROLES.includes(role)) {
      throw new ForbiddenException('Зөвхөн багш/админ засна');
    }
  }

  // Ангиллын төрлүүд (бодогдох төрөл, бодох арга, дэд сэдэв…) — бодлого холбох жагсаалт
  listCategories(type?: TagType) {
    return this.prisma.tag.findMany({
      where: type ? { type } : undefined,
      include: { _count: { select: { problems: true } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  // Шинэ ангилал үүсгэх (ж: "Дискриминантаар бодох")
  createCategory(type: TagType, name: string) {
    return this.prisma.tag.upsert({
      where: { type_name: { type, name } },
      create: { type, name },
      update: {},
    });
  }

  // Ангиллын нэр солих → энэ tag-тай БҮХ бодлого автоматаар шинэ нэртэй болно
  async renameCategory(tagId: string, name: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('Ангилал олдсонгүй');
    return this.prisma.tag.update({ where: { id: tagId }, data: { name } });
  }

  // Бодлогын бүрэн засварлах дата: текст, сонголтууд, ангилал, анализ (+ version)
  async getProblemForEdit(problemId: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        choiceOptions: { orderBy: { order: 'asc' } },
        tags: { include: { tag: true } },
        analysis: true,
      },
    });
    if (!problem) throw new NotFoundException('Бодлого олдсонгүй');
    return problem;
  }

  private async writeChoices(tx: RevisionDb, problemId: string, choices: ChoiceInput[]) {
    // Ангиллын цонх зураг илгээдэггүй — үсгээр нь хуучин зургийг шилжүүлнэ
    const prev = await tx.problemChoice.findMany({
      where: { problemId },
      select: { label: true, imageKey: true },
    });
    const imageOf = new Map(prev.map((c) => [c.label, c.imageKey]));
    await tx.problemChoice.deleteMany({ where: { problemId } });
    await tx.problemChoice.createMany({
      data: choices.map((c, i) => ({
        problemId,
        label: c.label,
        text: c.text,
        imageKey: c.imageKey === undefined ? (imageOf.get(c.label) ?? null) : c.imageKey,
        isCorrect: c.isCorrect,
        mistakeType: c.isCorrect
          ? MistakeType.NONE
          : (c.mistakeType ?? MistakeType.OTHER),
        mistakeNote: c.mistakeNote,
        order: i + 1,
      })),
    });
  }

  private async writeTags(tx: RevisionDb, problemId: string, tagIds: string[]) {
    await tx.problemTag.deleteMany({ where: { problemId } });
    if (tagIds.length > 0) {
      await tx.problemTag.createMany({
        data: tagIds.map((tagId) => ({ problemId, tagId })),
        skipDuplicates: true,
      });
    }
  }

  // Сонголтуудыг (correct/wrong + алдааны шалтгаан) бүхэлд нь дахин бичнэ
  async setChoices(
    problemId: string,
    choices: ChoiceInput[],
    actorId: string,
    role: Role,
    expectedVersion?: number,
  ) {
    this.assertTeacher(role);
    return this.prisma.$transaction(async (tx) => {
      const rev = await beginRevision(tx, 'PROBLEM', problemId, { expectedVersion });
      await this.writeChoices(tx, problemId, choices);
      await commitRevision(tx, rev, { actor: { id: actorId, role }, action: 'UPDATE' });
      return tx.problemChoice.findMany({
        where: { problemId },
        orderBy: { order: 'asc' },
      });
    });
  }

  // Бодлогод холбогдох ангиллуудыг (tag id-ууд) бүхэлд нь дахин тогтооно
  async setProblemTags(
    problemId: string,
    tagIds: string[],
    actorId: string,
    role: Role,
    expectedVersion?: number,
  ) {
    this.assertTeacher(role);
    return this.prisma.$transaction(async (tx) => {
      const rev = await beginRevision(tx, 'PROBLEM', problemId, { expectedVersion });
      await this.writeTags(tx, problemId, tagIds);
      await commitRevision(tx, rev, { actor: { id: actorId, role }, action: 'UPDATE' });
      return tx.problemTag.findMany({
        where: { problemId },
        include: { tag: true },
      });
    });
  }

  /**
   * «Ангилал» цонхны хадгалалт: сонголт + ангиллыг НЭГ transaction-д (өмнө нь хоёр
   * тусдаа дуудлага байсан — хоёр дахь нь унавал хагас хадгалагддаг байв) → нэг хувилбар.
   */
  async saveProblem(
    problemId: string,
    input: ClassificationSaveInput,
    actorId: string,
    role: Role,
  ) {
    this.assertTeacher(role);
    const result = await this.prisma.$transaction(async (tx) => {
      const rev = await beginRevision(tx, 'PROBLEM', problemId, {
        expectedVersion: input.expectedVersion,
        overwrite: input.overwrite,
      });
      if (input.choices !== undefined) await this.writeChoices(tx, problemId, input.choices);
      if (input.tagIds !== undefined) await this.writeTags(tx, problemId, input.tagIds);
      return commitRevision(tx, rev, { actor: { id: actorId, role }, action: 'UPDATE' });
    });
    const problem = await this.getProblemForEdit(problemId);
    return {
      version: result.version,
      changed: result.changed,
      summary: result.summary,
      mergedWith: result.mergedWith,
      problem,
    };
  }
}
