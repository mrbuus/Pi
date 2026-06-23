import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MistakeType, Role, TagType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

const TEACHER_ROLES: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];

export interface ChoiceInput {
  label: string;
  text: string;
  isCorrect: boolean;
  mistakeType?: MistakeType;
  mistakeNote?: string;
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

  // Бодлогын бүрэн засварлах дата: текст, сонголтууд, ангилал, анализ
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

  // Сонголтуудыг (correct/wrong + алдааны шалтгаан) бүхэлд нь дахин бичнэ
  async setChoices(problemId: string, choices: ChoiceInput[], role: Role) {
    this.assertTeacher(role);
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
    });
    if (!problem) throw new NotFoundException('Бодлого олдсонгүй');

    return this.prisma.$transaction(async (tx) => {
      await tx.problemChoice.deleteMany({ where: { problemId } });
      await tx.problemChoice.createMany({
        data: choices.map((c, i) => ({
          problemId,
          label: c.label,
          text: c.text,
          isCorrect: c.isCorrect,
          mistakeType: c.isCorrect
            ? MistakeType.NONE
            : (c.mistakeType ?? MistakeType.OTHER),
          mistakeNote: c.mistakeNote,
          order: i + 1,
        })),
      });
      return tx.problemChoice.findMany({
        where: { problemId },
        orderBy: { order: 'asc' },
      });
    });
  }

  // Бодлогод холбогдох ангиллуудыг (tag id-ууд) бүхэлд нь дахин тогтооно
  async setProblemTags(problemId: string, tagIds: string[], role: Role) {
    this.assertTeacher(role);
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
    });
    if (!problem) throw new NotFoundException('Бодлого олдсонгүй');

    return this.prisma.$transaction(async (tx) => {
      await tx.problemTag.deleteMany({ where: { problemId } });
      if (tagIds.length > 0) {
        await tx.problemTag.createMany({
          data: tagIds.map((tagId) => ({ problemId, tagId })),
          skipDuplicates: true,
        });
      }
      return tx.problemTag.findMany({
        where: { problemId },
        include: { tag: true },
      });
    });
  }
}
