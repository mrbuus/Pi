import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { MistakeType, Role, StudentType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { CreateProblemDto } from './dto/create-problem.dto';

const TEACHER_ROLES: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  createBook(dto: CreateBookDto) {
    return this.prisma.book.create({ data: dto });
  }

  // Архивласан (хуучин V2 биш) номыг каталогт харуулахгүй.
  // problemCount нь library UI-д хоосон shell номыг нуухад хэрэгтэй; admin талд
  // номын үндсэн жагсаалт хэвээр буцна.
  async listBooks() {
    const books = await this.prisma.book.findMany({
      where: { archived: false },
      include: {
        _count: { select: { chapters: true } },
        chapters: {
          select: {
            _count: { select: { problems: true } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return books.map(({ chapters, ...book }) => ({
      ...book,
      problemCount: chapters.reduce(
        (sum, chapter) => sum + chapter._count.problems,
        0,
      ),
    }));
  }

  createChapter(dto: CreateChapterDto) {
    return this.prisma.chapter.create({ data: dto });
  }

  listChapters(grade?: number, bookId?: string) {
    return this.prisma.chapter.findMany({
      where: {
        ...(grade ? { grade } : {}),
        ...(bookId ? { bookId } : {}),
        // Архивласан номын (хуучин V2 биш) бүлгүүдийг харуулахгүй
        OR: [{ bookId: null }, { book: { archived: false } }],
      },
      include: {
        book: { select: { code: true, title: true } },
        _count: { select: { problems: true, theories: true } },
      },
      orderBy: [{ grade: 'asc' }, { order: 'asc' }],
    });
  }

  async createProblem(dto: CreateProblemDto, userId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: dto.chapterId },
      include: { book: true },
    });
    if (!chapter) throw new NotFoundException('Бүлэг сэдэв олдсонгүй');

    let token = dto.token;
    if (!token) {
      if (!chapter.book || dto.page == null || dto.number == null) {
        throw new BadRequestException(
          'Token эсвэл (номтой бүлэг + хуудас + дугаар) аль нэг нь хэрэгтэй',
        );
      }
      // Token формат: ном-хуудас-дугаар, ж: "100-23-05" (SPEC §7)
      token = `${chapter.book.code}-${dto.page}-${String(dto.number).padStart(2, '0')}`;
    }

    // Шинэ загвар: сонголтын текстүүд ирвэл ProblemChoice мөрүүд үүсгэж,
    // грейдинг isCorrect FLAG-аар явна (харагдах байрлал/үсгээс үл хамаарна).
    const opts = dto.choiceOptions;
    let choices = dto.choices;
    let correctAnswer = dto.correctAnswer;
    let choiceOptionsCreate:
      | {
          create: {
            label: string;
            text: string;
            isCorrect: boolean;
            mistakeType: MistakeType;
            order: number;
          }[];
        }
      | undefined;
    if (opts && opts.length > 0) {
      if (opts.length < 2) {
        throw new BadRequestException('Дор хаяж 2 сонголт оруулна уу');
      }
      const correctCount = opts.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        throw new BadRequestException('Яг 1 сонголтыг зөв гэж тэмдэглэх ёстой');
      }
      // Зөв сонголтын текстийг бүртгэлд correctAnswer болгон хадгална (хүн
      // уншихад). Грейдинг үүнийг БИШ, isCorrect flag-ийг ашиглана.
      correctAnswer = opts.find((o) => o.isCorrect)!.text;
      choices = undefined; // шинэ загварт A–E placeholder choices хэрэггүй
      choiceOptionsCreate = {
        create: opts.map((o, i) => ({
          label: String.fromCharCode(65 + i), // дотоод нэр; харагдацын байрлал биш
          text: o.text,
          isCorrect: o.isCorrect,
          mistakeType: o.isCorrect ? MistakeType.NONE : MistakeType.OTHER,
          order: i + 1,
        })),
      };
    } else if (
      correctAnswer === undefined ||
      correctAnswer === null ||
      correctAnswer === ''
    ) {
      throw new BadRequestException('Зөв хариу эсвэл сонголтууд заавал хэрэгтэй');
    }

    try {
      return await this.prisma.problem.create({
        data: {
          chapterId: dto.chapterId,
          token,
          page: dto.page,
          number: dto.number,
          format: dto.format,
          statementText: dto.statementText,
          imageKey: dto.imageKey,
          choices: choices as Prisma.InputJsonValue,
          correctAnswer: correctAnswer as Prisma.InputJsonValue,
          choiceOptions: choiceOptionsCreate,
          points: dto.points,
          price: dto.price,
          createdById: userId,
          tags: dto.tags?.length
            ? {
                create: dto.tags.map((t) => ({
                  tag: {
                    connectOrCreate: {
                      where: { type_name: { type: t.type, name: t.name } },
                      create: { type: t.type, name: t.name },
                    },
                  },
                })),
              }
            : undefined,
          formulas: dto.formulas?.length
            ? {
                create: dto.formulas.map((name) => ({
                  formula: {
                    connectOrCreate: {
                      where: { name },
                      create: { name },
                    },
                  },
                })),
              }
            : undefined,
        },
        include: {
          tags: { include: { tag: true } },
          formulas: { include: { formula: true } },
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `"${token}" token-той бодлого бүртгэлтэй байна`,
        );
      }
      throw e;
    }
  }

  // Хандалтын дүрэм: багш нар бүгдийг; нээлттэй бүлгийг хэн ч; танхимын идэвхтэй
  // сурагч бүгдийг; бусад нь хүчинтэй эрхийнхээ (pass) хамрах хүрээгээр (SPEC §11)
  private async canViewFullChapter(
    userId: string,
    role: Role,
    chapter: { id: string; bookId: string | null; freePreview: boolean },
  ): Promise<boolean> {
    if (TEACHER_ROLES.includes(role)) return true;
    if (chapter.freePreview) return true;

    if (role === Role.STUDENT) {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId },
      });
      if (profile?.type === StudentType.CLASSROOM && profile.activatedAt) {
        const active = await this.prisma.enrollment.findFirst({
          where: { studentId: userId, leftAt: null },
        });
        if (active) return true;
      }
    }

    // Хүчинтэй эрх шалгана — хугацаа дууссан нь автоматаар хүчингүй
    const passes = await this.prisma.userPass.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      include: { pass: { select: { scope: true } } },
    });
    for (const up of passes) {
      const scope = up.pass.scope as {
        all?: boolean;
        chapterIds?: string[];
        bookIds?: string[];
      } | null;
      if (!scope) continue;
      if (scope.all) return true;
      if (scope.chapterIds?.includes(chapter.id)) return true;
      if (chapter.bookId && scope.bookIds?.includes(chapter.bookId)) {
        return true;
      }
    }
    return false;
  }

  async listProblems(
    chapterId: string,
    userId: string,
    role: Role,
    skip = 0,
    take = 50,
  ) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) throw new NotFoundException('Бүлэг сэдэв олдсонгүй');

    const allowed = await this.canViewFullChapter(userId, role, chapter);
    if (!allowed) {
      throw new ForbiddenException(
        'Энэ бүлгийг үзэх эрхгүй байна — эрх худалдаж авах эсвэл ангид элсэх шаардлагатай',
      );
    }

    const problems = await this.prisma.problem.findMany({
      where: { chapterId },
      include: {
        tags: { include: { tag: true } },
        formulas: { include: { formula: true } },
        analysis: true,
      },
      orderBy: [{ page: 'asc' }, { number: 'asc' }],
      skip,
      take: Math.min(take, 100),
    });

    // Багш нар хариутай нь харна (SPEC §13), сурагчид хариу харагдахгүй
    const withAnswers = TEACHER_ROLES.includes(role);
    return problems.map((p) =>
      withAnswers ? p : { ...p, correctAnswer: undefined, analysis: undefined },
    );
  }

  listTags(type?: string) {
    return this.prisma.tag.findMany({
      where: type ? { type: type as never } : undefined,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  listFormulas() {
    return this.prisma.formula.findMany({
      include: { _count: { select: { problems: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // ===== Нийтийн (нэвтрэлтгүй) каталог — freemium preview (SPEC §5) =====

  publicChaptersByGrade(grade: number) {
    return this.prisma.chapter.findMany({
      // Архивласан номын бүлгүүдийг нийтийн каталогт харуулахгүй
      where: {
        grade,
        problems: { some: {} },
        OR: [{ bookId: null }, { book: { archived: false } }],
      },
      select: {
        id: true,
        title: true,
        order: true,
        freePreview: true,
        book: { select: { code: true, title: true } },
        _count: { select: { problems: true, theories: true } },
      },
      orderBy: { order: 'asc' },
    });
  }

  async publicChapterPreview(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        title: true,
        order: true,
        grade: true,
        freePreview: true,
        book: { select: { code: true, title: true } },
        _count: { select: { problems: true } },
      },
    });
    if (!chapter) throw new NotFoundException('Бүлэг сэдэв олдсонгүй');

    if (!chapter.freePreview) {
      return { ...chapter, locked: true, theories: [], problems: [] };
    }

    const [theories, problems] = await Promise.all([
      this.prisma.theoryBlock.findMany({
        where: { chapterId },
        select: { id: true, title: true, content: true, imageKeys: true },
        orderBy: { order: 'asc' },
      }),
      this.prisma.problem.findMany({
        where: { chapterId },
        select: {
          id: true,
          token: true,
          format: true,
          statementText: true,
          imageKey: true,
          choices: true,
          points: true,
        },
        orderBy: [{ page: 'asc' }, { number: 'asc' }],
        take: 10,
      }),
    ]);
    return { ...chapter, locked: false, theories, problems };
  }
}
