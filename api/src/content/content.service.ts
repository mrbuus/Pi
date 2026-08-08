import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { MistakeType, Role, Subject } from '../generated/prisma/enums';
import { canAccessChapter, TEACHER_ROLES } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { CreateProblemDto } from './dto/create-problem.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { ReorderChaptersDto } from './dto/reorder-chapters.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  // ===== Аудит (Wave: CONTENT CRUD gaps) =====
  // TODO(followUp): api/src/audit/audit.service.ts бэлэн болмогц энэ helper-ийг
  // хасаад тэрхүү нэгдсэн AuditService-ийг DI-аар оруулж ашиглах (доор
  // followUps-д тэмдэглэсэн). Одоохондоо мөн зарчмаар шууд AuditLog бичнэ.
  private toAuditJson(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (v === null || v === undefined) return Prisma.JsonNull;
    return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
  }

  private async recordAudit(
    actorId: string,
    actorRole: Role,
    action: string,
    entity: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action,
        entity,
        entityId,
        before: this.toAuditJson(before),
        after: this.toAuditJson(after),
      },
    });
  }

  createBook(dto: CreateBookDto) {
    return this.prisma.book.create({ data: dto });
  }

  // Архивласан (хуучин V2 биш) номыг каталогт харуулахгүй.
  // problemCount нь library UI-д хоосон shell номыг нуухад хэрэгтэй; admin талд
  // номын үндсэн жагсаалт хэвээр буцна.
  async listBooks(subject?: Subject) {
    const books = await this.prisma.book.findMany({
      where: {
        archived: false,
        deletedAt: null,
        ...(subject ? { subject } : {}),
      },
      include: {
        _count: { select: { chapters: true } },
        chapters: {
          select: {
            _count: { select: { problems: true, tests: true } },
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
      testCount: chapters.reduce(
        (sum, chapter) => sum + chapter._count.tests,
        0,
      ),
    }));
  }

  // Багш+/Админ номын мета мэдээллийг засна (SPEC-ийн эрхийн матрицаар шинээр
  // нээгдсэн — code талбарыг зориудаар DTO-д оруулаагүй, token-той холбоотой).
  async updateBook(id: string, dto: UpdateBookDto, actorId: string, actorRole: Role) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book || book.deletedAt) throw new NotFoundException('Ном олдсонгүй');

    const data: Prisma.BookUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.coverKey !== undefined) data.coverKey = dto.coverKey;
    if (dto.sourceLabel !== undefined) data.sourceLabel = dto.sourceLabel;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.archived !== undefined) data.archived = dto.archived;

    const updated = await this.prisma.book.update({ where: { id }, data });
    await this.recordAudit(actorId, actorRole, 'UPDATE', 'Book', id, book, updated);
    return updated;
  }

  // Зөөлөн устгал: идэвхтэй (устгаагүй) бүлэг сэдэвтэй бол ?cascade=true
  // шаардана — тэгвэл номтой хамт бүх бүлэг сэдвийг нэг transaction-д
  // зөөлөн устгана (SPEC: устгасан контент орфон түүхэн дата үлдээхгүй).
  async deleteBook(
    id: string,
    cascade: boolean,
    actorId: string,
    actorRole: Role,
  ) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book || book.deletedAt) throw new NotFoundException('Ном олдсонгүй');

    const activeChapters = await this.prisma.chapter.findMany({
      where: { bookId: id, deletedAt: null },
      select: { id: true },
    });
    if (activeChapters.length > 0 && !cascade) {
      throw new ConflictException(
        'Энэ номд идэвхтэй бүлэг сэдэв байна — эхлээд тэдгээрийг устгах эсвэл ?cascade=true ашиглана уу',
      );
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.book.update({ where: { id }, data: { deletedAt: now } });
      if (activeChapters.length > 0) {
        await tx.chapter.updateMany({
          where: { id: { in: activeChapters.map((c) => c.id) } },
          data: { deletedAt: now },
        });
      }
    });
    await this.recordAudit(actorId, actorRole, 'DELETE', 'Book', id, book, {
      deletedAt: now,
      cascadedChapterIds: activeChapters.map((c) => c.id),
    });
    return { deleted: true, cascadedChapters: activeChapters.length };
  }

  createChapter(dto: CreateChapterDto) {
    return this.prisma.chapter.create({ data: dto });
  }

  listChapters(grade?: number, bookId?: string, subject?: Subject) {
    return this.prisma.chapter.findMany({
      where: {
        ...(grade ? { grade } : {}),
        ...(bookId ? { bookId } : {}),
        // subject өгвөл номгүй (bookId: null) бүлгүүд хичээл тодорхойгүй тул
        // үр дүнд ороохгүй — доорх book:{subject} nested filter үүнийг хийнэ
        ...(subject ? { book: { subject } } : {}),
        deletedAt: null,
        // Архивласан/устгасан номын бүлгүүдийг харуулахгүй
        OR: [{ bookId: null }, { book: { archived: false, deletedAt: null } }],
      },
      include: {
        book: { select: { code: true, title: true } },
        _count: { select: { problems: true, theories: true, tests: true } },
      },
      orderBy: [{ grade: 'asc' }, { order: 'asc' }],
    });
  }

  // Багш+/Админ бүлэг сэдвийг засна — өөр ном руу шилжүүлэх (bookId), БҮТ-ийн
  // муж холбох (topicId) орно. Аль алиных нь оршин тогтнохыг заавал шалгана.
  async updateChapter(
    id: string,
    dto: UpdateChapterDto,
    actorId: string,
    actorRole: Role,
  ) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id } });
    if (!chapter || chapter.deletedAt) {
      throw new NotFoundException('Бүлэг сэдэв олдсонгүй');
    }

    if (dto.bookId !== undefined && dto.bookId !== null) {
      const book = await this.prisma.book.findUnique({
        where: { id: dto.bookId },
      });
      if (!book || book.deletedAt) {
        throw new BadRequestException('Заасан ном олдсонгүй');
      }
    }
    if (dto.topicId !== undefined && dto.topicId !== null) {
      const topic = await this.prisma.topic.findUnique({
        where: { id: dto.topicId },
      });
      if (!topic || topic.deletedAt) {
        throw new BadRequestException('Заасан БҮТ-ийн муж олдсонгүй');
      }
    }

    const data: Prisma.ChapterUpdateInput = {};
    if (dto.bookId !== undefined) {
      data.book =
        dto.bookId === null
          ? { disconnect: true }
          : { connect: { id: dto.bookId } };
    }
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.grade !== undefined) data.grade = dto.grade;
    if (dto.freePreview !== undefined) data.freePreview = dto.freePreview;
    if (dto.topicId !== undefined) {
      data.topic =
        dto.topicId === null
          ? { disconnect: true }
          : { connect: { id: dto.topicId } };
    }

    const updated = await this.prisma.chapter.update({ where: { id }, data });
    await this.recordAudit(
      actorId,
      actorRole,
      'UPDATE',
      'Chapter',
      id,
      chapter,
      updated,
    );
    return updated;
  }

  async deleteChapter(id: string, actorId: string, actorRole: Role) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id } });
    if (!chapter || chapter.deletedAt) {
      throw new NotFoundException('Бүлэг сэдэв олдсонгүй');
    }
    const updated = await this.prisma.chapter.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.recordAudit(
      actorId,
      actorRole,
      'DELETE',
      'Chapter',
      id,
      chapter,
      updated,
    );
    return { deleted: true };
  }

  // ids-ийн БАЙРЛАЛ шинэ order (1-ээс) болно — жагсаалтыг гараар эрэмбэлэх UI-д.
  async reorderChapters(ids: string[], actorId: string, actorRole: Role) {
    const chapters = await this.prisma.chapter.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, order: true },
    });
    if (chapters.length !== ids.length) {
      throw new BadRequestException(
        'Зарим бүлэг сэдэв олдсонгүй эсвэл устгагдсан байна',
      );
    }

    await this.prisma.$transaction(
      ids.map((id, i) =>
        this.prisma.chapter.update({ where: { id }, data: { order: i + 1 } }),
      ),
    );
    await this.recordAudit(
      actorId,
      actorRole,
      'UPDATE',
      'Chapter',
      ids.join(','),
      chapters,
      ids.map((id, i) => ({ id, order: i + 1 })),
    );
    return { reordered: ids.length };
  }

  // ===== БҮТ-ийн үндсэн агуулгын муж (Topic) — Багш+/Админ бүрэн CRUD =====

  listTopics() {
    return this.prisma.topic.findMany({
      where: { deletedAt: null },
      orderBy: { order: 'asc' },
    });
  }

  async createTopic(dto: CreateTopicDto, actorId: string, actorRole: Role) {
    try {
      const topic = await this.prisma.topic.create({
        data: { name: dto.name, order: dto.order ?? 0 },
      });
      await this.recordAudit(
        actorId,
        actorRole,
        'CREATE',
        'Topic',
        topic.id,
        null,
        topic,
      );
      return topic;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `"${dto.name}" нэртэй БҮТ-ийн муж бүртгэлтэй байна`,
        );
      }
      throw e;
    }
  }

  async updateTopic(
    id: string,
    dto: UpdateTopicDto,
    actorId: string,
    actorRole: Role,
  ) {
    const topic = await this.prisma.topic.findUnique({ where: { id } });
    if (!topic || topic.deletedAt) {
      throw new NotFoundException('БҮТ-ийн муж олдсонгүй');
    }
    const data: Prisma.TopicUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.order !== undefined) data.order = dto.order;

    try {
      const updated = await this.prisma.topic.update({ where: { id }, data });
      await this.recordAudit(
        actorId,
        actorRole,
        'UPDATE',
        'Topic',
        id,
        topic,
        updated,
      );
      return updated;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `"${dto.name}" нэртэй БҮТ-ийн муж бүртгэлтэй байна`,
        );
      }
      throw e;
    }
  }

  // force=true өгвөл идэвхтэй бүлэг сэдвүүдийн topicId-г null болгож салгаад
  // мужийг зөөлөн устгана (Chapter-ийг устгахгүй — topicId зөвхөн ангилал).
  async deleteTopic(
    id: string,
    force: boolean,
    actorId: string,
    actorRole: Role,
  ) {
    const topic = await this.prisma.topic.findUnique({ where: { id } });
    if (!topic || topic.deletedAt) {
      throw new NotFoundException('БҮТ-ийн муж олдсонгүй');
    }

    const linkedChapters = await this.prisma.chapter.findMany({
      where: { topicId: id, deletedAt: null },
      select: { id: true },
    });
    if (linkedChapters.length > 0 && !force) {
      throw new ConflictException(
        'Энэ БҮТ-ийн мужид идэвхтэй бүлэг сэдэв холбоотой байна — эхлээд салгах эсвэл ?force=true ашиглана уу',
      );
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.topic.update({ where: { id }, data: { deletedAt: now } });
      if (linkedChapters.length > 0) {
        await tx.chapter.updateMany({
          where: { id: { in: linkedChapters.map((c) => c.id) } },
          data: { topicId: null },
        });
      }
    });
    await this.recordAudit(actorId, actorRole, 'DELETE', 'Topic', id, topic, {
      deletedAt: now,
      unlinkedChapterIds: linkedChapters.map((c) => c.id),
    });
    return { deleted: true, unlinkedChapters: linkedChapters.length };
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
      throw new BadRequestException(
        'Зөв хариу эсвэл сонголтууд заавал хэрэгтэй',
      );
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

  // Багш+/Админ бодлогын АГУУЛГЫГ (статемент/сонголт/хариу/зураг) гараар засна.
  // LaTeX импортын алдааг засварлах зориулалттай — TEACHER (энгийн) энд ирэхгүй,
  // Roles guard controller талд шүүнэ (ADMIN, TEACHER_PLUS).
  async updateProblem(
    problemId: string,
    dto: UpdateProblemDto,
    actorId: string,
    actorRole: Role,
  ) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
    });
    if (!problem || problem.deletedAt) {
      throw new NotFoundException('Бодлого олдсонгүй');
    }

    const data: Prisma.ProblemUpdateInput = {};
    if (dto.statementText !== undefined) data.statementText = dto.statementText;
    if (dto.imageKey !== undefined) data.imageKey = dto.imageKey;
    if (dto.points !== undefined) data.points = dto.points;
    if (dto.format !== undefined) data.format = dto.format;

    // Шинэ загвар: сонголтын текст + isCorrect ирвэл createProblem-тэй ижил
    // зарчмаар шалгаад ProblemChoice мөрүүдийг бүхэлд нь дахин үүсгэнэ.
    const opts = dto.choiceOptions;
    let choiceOptionsReplace:
      | {
          label: string;
          text: string;
          isCorrect: boolean;
          mistakeType: MistakeType;
          order: number;
        }[]
      | undefined;
    if (opts && opts.length > 0) {
      if (opts.length < 2) {
        throw new BadRequestException('Дор хаяж 2 сонголт оруулна уу');
      }
      const correctCount = opts.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        throw new BadRequestException('Яг 1 сонголтыг зөв гэж тэмдэглэх ёстой');
      }
      data.correctAnswer = opts.find((o) => o.isCorrect)!.text;
      data.choices = Prisma.JsonNull; // шинэ загварт A–E placeholder choices хэрэггүй
      choiceOptionsReplace = opts.map((o, i) => ({
        label: String.fromCharCode(65 + i),
        text: o.text,
        isCorrect: o.isCorrect,
        mistakeType: o.isCorrect ? MistakeType.NONE : MistakeType.OTHER,
        order: i + 1,
      }));
    } else {
      // Хуучин загвар: choices/correctAnswer-ийг шууд утгаар шинэчилнэ
      if (dto.choices !== undefined) {
        data.choices = dto.choices;
      }
      if (dto.correctAnswer !== undefined) {
        if (
          dto.correctAnswer === null ||
          (typeof dto.correctAnswer === 'string' && dto.correctAnswer === '')
        ) {
          throw new BadRequestException('Зөв хариу хоосон байж болохгүй');
        }
        data.correctAnswer = dto.correctAnswer;
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (choiceOptionsReplace) {
        await tx.problemChoice.deleteMany({ where: { problemId } });
        await tx.problemChoice.createMany({
          data: choiceOptionsReplace.map((c) => ({ ...c, problemId })),
        });
      }
      return tx.problem.update({
        where: { id: problemId },
        data,
        include: {
          choiceOptions: { orderBy: { order: 'asc' } },
          tags: { include: { tag: true } },
          formulas: { include: { formula: true } },
        },
      });
    });
    await this.recordAudit(
      actorId,
      actorRole,
      'UPDATE',
      'Problem',
      problemId,
      problem,
      updated,
    );
    return updated;
  }

  // Багш+/Админ бодлогыг зөөлөн устгана — Attempt/TestProblem зэрэг
  // аналитикийн түүхэн бичлэгүүд орфон үлдэхгүйн тулд hard DELETE хийхгүй.
  async deleteProblem(problemId: string, actorId: string, actorRole: Role) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
    });
    if (!problem || problem.deletedAt) {
      throw new NotFoundException('Бодлого олдсонгүй');
    }
    const updated = await this.prisma.problem.update({
      where: { id: problemId },
      data: { deletedAt: new Date() },
    });
    await this.recordAudit(
      actorId,
      actorRole,
      'DELETE',
      'Problem',
      problemId,
      problem,
      updated,
    );
    return { deleted: true };
  }

  // Хандалтын дүрэм: багш нар бүгдийг; нээлттэй бүлгийг хэн ч; танхимын идэвхтэй
  // сурагч бүгдийг; бусад нь хүчинтэй эрхийнхээ (pass) хамрах хүрээгээр (SPEC §11)
  // — Tests/Videos-той хуваалцсан логик, /common/access.ts-д байна.
  private canViewFullChapter(
    userId: string,
    role: Role,
    chapter: { id: string; bookId: string | null; freePreview: boolean },
  ): Promise<boolean> {
    return canAccessChapter(this.prisma, userId, role, chapter);
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
    if (!chapter || chapter.deletedAt) {
      throw new NotFoundException('Бүлэг сэдэв олдсонгүй');
    }

    const allowed = await this.canViewFullChapter(userId, role, chapter);
    if (!allowed) {
      throw new ForbiddenException(
        'Энэ бүлгийг үзэх эрхгүй байна — эрх худалдаж авах эсвэл ангид элсэх шаардлагатай',
      );
    }

    const problems = await this.prisma.problem.findMany({
      where: { chapterId, deletedAt: null },
      include: {
        choiceOptions: { orderBy: { order: 'asc' } },
        tags: { include: { tag: true } },
        formulas: { include: { formula: true } },
        analysis: true,
      },
      orderBy: [{ page: 'asc' }, { number: 'asc' }],
      skip,
      take: Math.min(take, 100),
    });

    // Багш нар хариутай нь харна (SPEC §13), сурагчид хариу харагдахгүй.
    // CHOICE сонголтоос isCorrect/mistakeType-ийг ЗААВАЛ хасна — үгүй бол
    // сурагч хариуны түлхүүрийг choiceOptions-оос шууд харах болно.
    const withAnswers = TEACHER_ROLES.includes(role);
    return problems.map((p) =>
      withAnswers
        ? p
        : {
            ...p,
            correctAnswer: undefined,
            analysis: undefined,
            choiceOptions: p.choiceOptions.map((o) => ({
              label: o.label,
              text: o.text,
            })),
          },
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

  publicChaptersByGrade(grade: number, subject?: Subject) {
    return this.prisma.chapter.findMany({
      // Архивласан номын бүлгүүдийг нийтийн каталогт харуулахгүй
      where: {
        grade,
        problems: { some: { deletedAt: null } },
        ...(subject ? { book: { subject } } : {}),
        deletedAt: null,
        OR: [{ bookId: null }, { book: { archived: false, deletedAt: null } }],
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
        deletedAt: true,
        book: { select: { code: true, title: true } },
        _count: { select: { problems: true } },
      },
    });
    if (!chapter || chapter.deletedAt) {
      throw new NotFoundException('Бүлэг сэдэв олдсонгүй');
    }
    const { deletedAt: _deletedAt, ...chapterView } = chapter;

    if (!chapter.freePreview) {
      return { ...chapterView, locked: true, theories: [], problems: [] };
    }

    const [theories, problems] = await Promise.all([
      this.prisma.theoryBlock.findMany({
        where: { chapterId },
        select: { id: true, title: true, content: true, imageKeys: true },
        orderBy: { order: 'asc' },
      }),
      this.prisma.problem.findMany({
        where: { chapterId, deletedAt: null },
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
    return { ...chapterView, locked: false, theories, problems };
  }

  /**
   * Нэг бодлогыг унших (Practice маршрутаас сурагч дуудна).
   * Сурагчид statementText, correctAnswer-г л өгнө (hintAnswer биш).
   */
  async getProblem(problemId: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        token: true,
        format: true,
        statementText: true,
        choices: true,
        correctAnswer: true,
        imageKey: true,
      },
    });

    if (!problem || problem.imageKey === null) {
      throw new NotFoundException('Бодлого олдсонгүй');
    }

    return problem;
  }
}
