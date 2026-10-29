import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { MistakeType, Role, Subject } from '../generated/prisma/enums';
import {
  canAccessChapter,
  canAccessProblem,
  canAccessVideoChapter,
  chapterAccessGrant,
  catalogSubjectsFor,
  chapterSubjectWhere,
  internalTeachingRole,
  assertInternalTeachingStaff,
  TEACHER_ROLES,
} from '../common/access';
import { SubjectChapterDto } from './dto/subject-chapter.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  beginRevision,
  commitRevision,
  recordCreated,
  runInTransaction,
} from '../revisions/revision-store';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { CreateProblemDto } from './dto/create-problem.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

// Номгүй хичээлийн үндсэн ном (POST /chapters/for-subject үүсгэнэ). Код нь
// номын сангийн ?book= холбоос болон бодлогын token-д харагдах тул латин, богино.
const SUBJECT_BOOK_DEFAULTS: Record<Subject, { code: string; title: string }> =
  {
    [Subject.MATH]: { code: 'MATH', title: 'Математик' },
    [Subject.SOCIAL_STUDIES]: { code: 'SOCIAL', title: 'Нийгмийн ухаан' },
    [Subject.SAT]: { code: 'SAT', title: 'SAT' },
  };

interface ChoiceRowInput {
  label: string;
  text: string;
  imageKey: string | null;
  isCorrect: boolean;
  mistakeType: MistakeType;
  order: number;
}

/**
 * «Агуулга засах» (PATCH /problems/:id) сонголтыг бүхэлд нь дахин үүсгэдэг тул
 * багшийн ангиллын цонхонд тэмдэглэсэн алдааны шалтгаан (mistakeType/mistakeNote)
 * ялгаагүй арчигддаг байв. Хуучин сонголттой эхлээд текстээр, дараа нь
 * байрлалаар тулгаж шилжүүлнэ. Зөв сонголт → NONE (тайлбар хадгалагдана).
 */
export function carryChoiceMistakes(
  existing: {
    text: string;
    mistakeType: MistakeType;
    mistakeNote: string | null;
  }[],
  next: ChoiceRowInput[],
): (ChoiceRowInput & { mistakeNote: string | null })[] {
  const pool = existing.map((c) => ({ ...c, used: false }));
  const match: ((typeof pool)[number] | undefined)[] = next.map(() => undefined);
  next.forEach((c, i) => {
    const hit = pool.find((p) => !p.used && p.text.trim() === c.text.trim());
    if (hit) {
      hit.used = true;
      match[i] = hit;
    }
  });
  next.forEach((_c, i) => {
    if (match[i]) return;
    const same = pool[i];
    if (same && !same.used) {
      same.used = true;
      match[i] = same;
    }
  });
  return next.map((c, i) => {
    const old = match[i];
    if (c.isCorrect)
      return { ...c, mistakeType: MistakeType.NONE, mistakeNote: old?.mistakeNote ?? null };
    return {
      ...c,
      mistakeType:
        old && old.mistakeType !== MistakeType.NONE ? old.mistakeType : MistakeType.OTHER,
      mistakeNote: old?.mistakeNote ?? null,
    };
  });
}

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  // ===== Аудит (Wave: CONTENT CRUD gaps) =====
  // TODO(followUp): api/src/audit/audit.service.ts бэлэн болмогц энэ helper-ийг
  // хасаад тэрхүү нэгдсэн AuditService-ийг DI-аар оруулж ашиглах (доор
  // followUps-д тэмдэглэсэн). Одоохондоо мөн зарчмаар шууд AuditLog бичнэ.
  private toAuditJson(
    v: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
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

  async createBook(dto: CreateBookDto, actorId: string) {
    await assertInternalTeachingStaff(this.prisma, actorId);
    return this.prisma.book.create({ data: dto });
  }

  // Архивласан (хуучин V2 биш) номыг каталогт харуулахгүй.
  // problemCount нь library UI-д хоосон shell номыг нуухад хэрэгтэй; admin талд
  // номын үндсэн жагсаалт хэвээр буцна.
  //
  // Хичээлийн шүүлт (эзэн 2026-10-18): нэвтрээгүй → MATH, сурагч → өөрийн
  // ангиудын хичээл, ажилтан → бүгд (common/access.ts catalogSubjectsFor).
  async listBooks(
    subject?: Subject,
    viewer?: { userId: string; role: Role } | null,
  ) {
    const visible = await catalogSubjectsFor(this.prisma, viewer);
    if (subject && visible && !visible.includes(subject)) return [];
    const books = await this.prisma.book.findMany({
      where: {
        archived: false,
        deletedAt: null,
        ...(subject
          ? { subject }
          : visible
            ? { subject: { in: visible } }
            : {}),
      },
      include: {
        // Зөөлөн устгасан бүлэг тоологдвол хоосон ном номын санд харагдана
        _count: { select: { chapters: { where: { deletedAt: null } } } },
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
  async updateBook(
    id: string,
    dto: UpdateBookDto,
    actorId: string,
    actorRole: Role,
  ) {
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book || book.deletedAt) throw new NotFoundException('Ном олдсонгүй');

    const data: Prisma.BookUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.coverKey !== undefined) data.coverKey = dto.coverKey;
    if (dto.sourceLabel !== undefined) data.sourceLabel = dto.sourceLabel;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.archived !== undefined) data.archived = dto.archived;

    const updated = await this.prisma.book.update({ where: { id }, data });
    await this.recordAudit(
      actorId,
      actorRole,
      'UPDATE',
      'Book',
      id,
      book,
      updated,
    );
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
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
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

  /**
   * Номгүй хичээлийн тестийн бүлэг (эзэн 2026-10-18: «Нийгмийн ухаан» таб хоосон).
   * Тухайн хичээлийн идэвхтэй ном байхгүй бол үндсэн номыг үүсгэнэ (жишээ нь
   * SOCIAL — «Нийгмийн ухаан»), дотор нь тестийн нэртэй бүлэг үүсгэнэ. Ижил
   * нэртэй идэвхтэй бүлэг байвал түүнийг буцаана (давтан хүсэлт давхардуулахгүй).
   * MATH-ийн бүтэц номын сангаас удирдагддаг тул энд үүсгэхгүй.
   */
  async ensureSubjectChapter(dto: SubjectChapterDto, actorId: string) {
    const actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
    if (dto.subject === Subject.MATH)
      throw new BadRequestException(
        'Математикийн бүлгийг номын сангаас сонгоно уу',
      );
    const title = dto.title.trim().replace(/\s+/g, ' ');
    if (!title) throw new BadRequestException('Тестийн нэр оруулна уу');

    const defaults = SUBJECT_BOOK_DEFAULTS[dto.subject];
    const bookSelect = { id: true, code: true, title: true, subject: true };
    const activeBook = {
      archived: false,
      deletedAt: null,
      subject: dto.subject,
    };
    let createdBook = false;
    let book =
      (await this.prisma.book.findFirst({
        where: { ...activeBook, code: defaults.code },
        select: bookSelect,
      })) ??
      (await this.prisma.book.findFirst({
        where: activeBook,
        select: bookSelect,
        orderBy: { code: 'asc' },
      }));
    if (!book) {
      // Үндсэн код (SOCIAL) өөр/устгасан номд эзлэгдсэн бол дагавартай код
      const taken = await this.prisma.book.findUnique({
        where: { code: defaults.code },
        select: { id: true },
      });
      try {
        book = await this.prisma.book.create({
          data: {
            code: taken
              ? `${defaults.code}-${Date.now().toString(36).toUpperCase()}`
              : defaults.code,
            title: defaults.title,
            subject: dto.subject,
          },
          select: bookSelect,
        });
        createdBook = true;
      } catch (e) {
        // Зэрэг хүсэлт: нөгөө нь түрүүлж үүсгэсэн бол түүнийг ашиглана
        if (
          !(e instanceof Prisma.PrismaClientKnownRequestError) ||
          e.code !== 'P2002'
        )
          throw e;
        book = await this.prisma.book.findFirst({
          where: activeBook,
          select: bookSelect,
          orderBy: { code: 'asc' },
        });
        if (!book) throw e;
      }
      if (createdBook)
        await this.recordAudit(
          actorId,
          actorRole,
          'CREATE',
          'Book',
          book.id,
          null,
          book,
        );
    }

    const chapterSelect = {
      id: true,
      title: true,
      order: true,
      grade: true,
      bookId: true,
      book: { select: bookSelect },
    };
    const existing = await this.prisma.chapter.findFirst({
      where: { bookId: book.id, deletedAt: null, title },
      select: chapterSelect,
    });
    if (existing) return { ...existing, created: false };

    const last = await this.prisma.chapter.findFirst({
      where: { bookId: book.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const chapter = await this.prisma.chapter.create({
      data: { bookId: book.id, title, order: (last?.order ?? 0) + 1 },
      select: chapterSelect,
    });
    await this.recordAudit(
      actorId,
      actorRole,
      'CREATE',
      'Chapter',
      chapter.id,
      null,
      chapter,
    );
    return { ...chapter, created: true };
  }

  async createChapter(dto: CreateChapterDto, actorId: string) {
    await assertInternalTeachingStaff(this.prisma, actorId);
    return this.prisma.chapter.create({ data: dto });
  }

  async listChapters(
    grade?: number,
    bookId?: string,
    subject?: Subject,
    viewer?: { userId: string; role: Role } | null,
  ) {
    const visible = await catalogSubjectsFor(this.prisma, viewer);
    if (subject && visible && !visible.includes(subject)) return [];
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
        // Хичээлээр хаалттай контент (нэвтрээгүй → MATH, сурагч → ангийн хичээл)
        ...(visible ? { AND: [chapterSubjectWhere(visible)] } : {}),
      },
      include: {
        book: { select: { code: true, title: true } },
        _count: {
          select: {
            problems: true,
            theories: { where: { archivedAt: null } },
            tests: true,
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { order: 'asc' }],
    });
  }

  /**
   * Бүлэг/сэдэв хайх (хуваарийн сэдэв сонгогч). Үг бүр (хоосон зайгаар
   * тусгаарлагдсан) гарчигт агуулагдсан байх ёстой. Үндсэн ном (100V3) эхэнд,
   * дараа нь 100/200/300 …, туршилтын ном хамгийн сүүлд.
   */
  async searchChapters(q: string, limit = 20) {
    const words = q
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6);
    if (!words.length || q.length > 100) return [];
    const take = Math.min(Math.max(Number.isFinite(limit) ? limit : 20, 1), 40);
    const rows = await this.prisma.chapter.findMany({
      where: {
        deletedAt: null,
        book: { archived: false, deletedAt: null, subject: Subject.MATH },
        AND: words.map((w) => ({
          title: { contains: w, mode: 'insensitive' as const },
        })),
      },
      select: {
        id: true,
        title: true,
        order: true,
        book: {
          select: { id: true, code: true, title: true, sourceLabel: true },
        },
      },
      take: 300,
    });
    const rank = (code: string) =>
      code === '100V3' ? 0 : code === '100-V3-LAB' ? 9 : code === '100' ? 1 : /^\d+$/.test(code) ? 2 : 3;
    return rows
      .sort(
        (a, b) =>
          rank(a.book!.code) - rank(b.book!.code) ||
          a.book!.code.localeCompare(b.book!.code) ||
          a.order - b.order,
      )
      .slice(0, take)
      .map((c) => ({
        id: c.id,
        title: c.title,
        bookId: c.book!.id,
        bookCode: c.book!.code,
        bookLabel: /^\S+x\S+( V\d+)?$/.test(c.book!.sourceLabel ?? '')
          ? c.book!.sourceLabel
          : c.book!.title,
      }));
  }

  // Багш+/Админ бүлэг сэдвийг засна — өөр ном руу шилжүүлэх (bookId), БҮТ-ийн
  // муж холбох (topicId) орно. Аль алиных нь оршин тогтнохыг заавал шалгана.
  async updateChapter(
    id: string,
    dto: UpdateChapterDto,
    actorId: string,
    actorRole: Role,
  ) {
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
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
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
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
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
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
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
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
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
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
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
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

  // revision: импортоор үүссэн бол (DocumentImport) түүхэнд IMPORT гэж бичнэ.
  async createProblem(
    dto: CreateProblemDto,
    userId: string,
    revision: { action?: 'CREATE' | 'IMPORT'; summary?: string } = {},
  ) {
    const actorRole = await assertInternalTeachingStaff(this.prisma, userId);
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
            imageKey: string | null;
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
          imageKey: o.imageKey ?? null,
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
      // Бодлого + түүхийн хувилбар 0 нэг transaction-д (this.prisma нь DocumentImport-ийн
      // transaction байж болно — тэр үед давхар transaction үүсгэхгүй).
      return await runInTransaction(this.prisma, async (tx) => {
        const created = await tx.problem.create({
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
        const rev = await recordCreated(tx, 'PROBLEM', created.id, {
          actor: { id: userId, role: actorRole },
          action: revision.action ?? 'CREATE',
          ...(revision.summary ? { summary: revision.summary } : {}),
        });
        return { ...created, version: rev.version };
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
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
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
      | ChoiceRowInput[]
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
        imageKey: o.imageKey ?? null,
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

    const { updated, version, changed, mergedWith } = await this.prisma.$transaction(async (tx) => {
      // Түүх: мөрийг түгжиж өмнөх төлөвийг авна; expectedVersion зөрвөл 409.
      const rev = await beginRevision(tx, 'PROBLEM', problemId, {
        expectedVersion: dto.expectedVersion,
        overwrite: dto.overwrite,
      });
      if (rev.deletedAt) throw new NotFoundException('Бодлого олдсонгүй');
      if (choiceOptionsReplace) {
        const existing = await tx.problemChoice.findMany({
          where: { problemId },
          orderBy: { order: 'asc' },
          select: { text: true, mistakeType: true, mistakeNote: true },
        });
        await tx.problemChoice.deleteMany({ where: { problemId } });
        await tx.problemChoice.createMany({
          data: carryChoiceMistakes(existing, choiceOptionsReplace).map(
            (c) => ({ ...c, problemId }),
          ),
        });
      }
      const include = {
        choiceOptions: { orderBy: { order: 'asc' } },
        tags: { include: { tag: true } },
        formulas: { include: { formula: true } },
      } satisfies Prisma.ProblemInclude;
      const row = await tx.problem.update({ where: { id: problemId }, data, include });
      const committed = await commitRevision(tx, rev, {
        actor: { id: actorId, role: actorRole },
        action: 'UPDATE',
      });
      // Бусдын өөрчлөлттэй нэгтгэсэн бол мөр өөрчлөгдсөн — шинэ төлөвийг буцаана
      const fresh = committed.mergedWith
        ? await tx.problem.findUniqueOrThrow({ where: { id: problemId }, include })
        : row;
      return {
        updated: fresh,
        version: committed.version,
        changed: committed.changed,
        mergedWith: committed.mergedWith,
      };
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
    return { ...updated, version, changed, mergedWith };
  }

  // Багш+/Админ бодлогыг зөөлөн устгана — Attempt/TestProblem зэрэг
  // аналитикийн түүхэн бичлэгүүд орфон үлдэхгүйн тулд hard DELETE хийхгүй.
  async deleteProblem(problemId: string, actorId: string, actorRole: Role) {
    actorRole = await assertInternalTeachingStaff(this.prisma, actorId);
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

    const grant = await chapterAccessGrant(this.prisma, userId, role, chapter);
    if (grant.level === 'none') {
      throw new ForbiddenException(
        'Энэ бүлгийг үзэх эрхгүй байна — эрх худалдаж авах эсвэл ангид элсэх шаардлагатай',
      );
    }
    // Танхимын сурагч: зөвхөн ангид нээгдсэн тестийн бодлогууд (эзэн 2026-10-29)
    const releasedOnly =
      grant.level === 'released' ? [...grant.problemIds] : null;
    // Бодолтын YouTube холбоос — бичлэгийн эрхгүй бол хасна
    const videoAllowed =
      grant.level === 'released' ||
      (await canAccessVideoChapter(this.prisma, userId, role, chapter));

    const problems = await this.prisma.problem.findMany({
      where: {
        chapterId,
        deletedAt: null,
        ...(releasedOnly ? { id: { in: releasedOnly } } : {}),
      },
      include: {
        choiceOptions: { orderBy: { order: 'asc' } },
        tags: { include: { tag: true } },
        formulas: { include: { formula: true } },
        analysis: true,
        // A/B хувилбарыг UI-д тусад нь харуулахын тулд (эзэн 2026-10-08)
        testItems: {
          where: { test: { deletedAt: null } },
          select: { order: true, test: { select: { variantLabel: true } } },
          take: 1,
        },
      },
      orderBy: [{ page: 'asc' }, { number: 'asc' }, { token: 'asc' }],
      skip,
      take: Math.min(take, 100),
    });

    // Багш нар хариутай нь харна (SPEC §13), сурагчид хариу харагдахгүй.
    // CHOICE сонголтоос isCorrect/mistakeType-ийг ЗААВАЛ хасна — үгүй бол
    // сурагч хариуны түлхүүрийг choiceOptions-оос шууд харах болно.
    const withAnswers = !!(await internalTeachingRole(this.prisma, userId));
    const shaped = problems
      .map(({ testItems, ...p }) => ({
        ...p,
        variantLabel: testItems[0]?.test.variantLabel ?? null,
        testOrder: testItems[0]?.order ?? null,
      }))
      .sort(
        (a, b) =>
          (a.variantLabel ?? '').localeCompare(b.variantLabel ?? '') ||
          (a.testOrder ?? 0) - (b.testOrder ?? 0),
      );
    return shaped.map((p) =>
      withAnswers
        ? p
        : {
            ...p,
            correctAnswer: undefined,
            analysis: undefined,
            youtubeUrl: videoAllowed ? p.youtubeUrl : null,
            // Засварын түүхийн мэдээлэл сурагчид хэрэггүй (хэн зассан — ажилтны ID)
            version: undefined,
            updatedAt: undefined,
            updatedById: undefined,
            choices:
              Array.isArray(p.choices) &&
              p.choices.every((c) => typeof c === 'string')
                ? p.choices
                : null,
            choiceOptions: p.choiceOptions.map((o) => ({
              label: o.label,
              text: o.text,
              imageKey: o.imageKey,
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
        // Нийтийн каталог зөвхөн MATH (бусад хичээл ангиар хаалттай)
        AND: [chapterSubjectWhere([Subject.MATH])],
      },
      select: {
        id: true,
        title: true,
        order: true,
        freePreview: true,
        book: { select: { code: true, title: true } },
        _count: {
          select: { problems: true, theories: { where: { archivedAt: null } } },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async publicChapterPreview(chapterId: string) {
    const chapter = await this.prisma.chapter.findFirst({
      where: {
        id: chapterId,
        deletedAt: null,
        OR: [{ bookId: null }, { book: { archived: false, deletedAt: null } }],
        // Нийтийн каталог зөвхөн MATH (бусад хичээл ангиар хаалттай)
        AND: [chapterSubjectWhere([Subject.MATH])],
      },
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
    void _deletedAt;

    if (!chapter.freePreview) {
      return { ...chapterView, locked: true, theories: [], problems: [] };
    }

    const [theories, problems] = await Promise.all([
      this.prisma.theoryBlock.findMany({
        where: { chapterId, archivedAt: null },
        select: { id: true, title: true, content: true, imageKeys: true },
        orderBy: { order: 'asc' },
      }),
      this.prisma.problem.findMany({
        where: { chapterId, deletedAt: null },
        // бодлогын код (token) нийтэд харагдахгүй (эзний дүрэм 2026-10-08)
        select: {
          id: true,
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
   * Суралцагчид бодлогын нөхцөл ба сонголтыг өгнө; хариуны түлхүүрийг нууж хадгална.
   */
  async getProblem(problemId: string, userId: string, role: Role) {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        chapter: { include: { book: true } },
        choiceOptions: { orderBy: { order: 'asc' } },
      },
    });
    if (
      !problem ||
      problem.deletedAt ||
      problem.chapter.deletedAt ||
      problem.chapter.book?.deletedAt
    ) {
      throw new NotFoundException('Бодлого олдсонгүй');
    }
    if (!(await canAccessProblem(this.prisma, userId, role, problem))) {
      throw new ForbiddenException('Энэ бүлгийн эрх шаардлагатай');
    }
    const view = {
      id: problem.id,
      // бодлогын код зөвхөн ажилтанд (эзний дүрэм 2026-10-08)
      ...(TEACHER_ROLES.includes(role) ? { token: problem.token } : {}),
      format: problem.format,
      statementText: problem.statementText,
      imageKey: problem.imageKey,
      choices: problem.choiceOptions.length
        ? problem.choiceOptions.map(({ label, text }) => ({ label, text }))
        : Array.isArray(problem.choices) &&
            problem.choices.every((c) => typeof c === 'string')
          ? problem.choices
          : null,
    };
    return (await internalTeachingRole(this.prisma, userId))
      ? { ...view, correctAnswer: problem.correctAnswer }
      : view;
  }
}
