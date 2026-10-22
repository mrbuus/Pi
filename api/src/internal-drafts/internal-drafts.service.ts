import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { DraftBlock, DraftSet } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { markPlus, teacherPlusIds } from '../common/teacher-plus';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../content/content.service';
import type { CreateProblemDto } from '../content/dto/create-problem.dto';
import { recordCreated } from '../revisions/revision-store';
import {
  blockIssues,
  changedFields,
  checkBlock,
  editSummary,
  fieldsFromSummary,
  LETTERS,
  MAX_CHOICES,
  problemInput,
  problemToken,
  shortPersonName,
} from './draft-model';
import {
  BulkDraftBlocksDto,
  CheckDraftAnswersDto,
  CreateDraftBlockDto,
  CreateDraftSetDto,
  DraftBlockFieldsDto,
  PublishDraftSetDto,
  ReorderDraftBlocksDto,
  UpdateDraftBlockDto,
  UpdateDraftSetDto,
} from './internal-drafts.dto';

type Tx = Prisma.TransactionClient;
interface Actor {
  id: string;
  role: Role;
  name: string;
}

/** Нэг хүний нэг блок дээрх засварыг түүхэнд нэг мөр болгох хугацаа */
const COALESCE_MS = 10 * 60 * 1000;
const DEFAULT_TITLE = 'Шинэ ноорог';

type BlockFields = Pick<
  DraftBlock,
  | 'kind'
  | 'statement'
  | 'choices'
  | 'answer'
  | 'solution'
  | 'imageKey'
  | 'tag'
  | 'points'
>;

function cleanText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = value.replace(/\r\n?/g, '\n');
  return text.trim() ? text : null;
}

/** DTO-гийн ирсэн талбаруудыг л (undefined = хөндөхгүй) хэвийн болгоно. */
function blockPatch(dto: DraftBlockFieldsDto): Partial<BlockFields> {
  const patch: Partial<BlockFields> = {};
  if (dto.kind !== undefined) patch.kind = dto.kind;
  if (dto.statement !== undefined)
    patch.statement = (dto.statement ?? '').replace(/\r\n?/g, '\n');
  if (dto.choices !== undefined)
    patch.choices = (dto.choices ?? [])
      .slice(0, MAX_CHOICES)
      .map((c) => c.replace(/\r\n?/g, '\n'));
  if (dto.answer !== undefined) {
    const answer = dto.answer?.trim() ?? '';
    patch.answer = answer
      ? /^[a-e]$/i.test(answer)
        ? answer.toUpperCase()
        : answer
      : null;
  }
  if (dto.solution !== undefined) patch.solution = cleanText(dto.solution);
  if (dto.imageKey !== undefined) patch.imageKey = dto.imageKey || null;
  if (dto.tag !== undefined) patch.tag = dto.tag?.trim() || null;
  if (dto.points !== undefined) patch.points = dto.points;
  return patch;
}

function newBlockFields(dto: DraftBlockFieldsDto): BlockFields {
  const patch = blockPatch(dto);
  const kind = patch.kind ?? 'CHOICE';
  return {
    kind,
    statement: patch.statement ?? '',
    choices:
      patch.choices ??
      (kind === 'CHOICE' ? LETTERS.map(() => '') : []),
    answer: patch.answer ?? null,
    solution: patch.solution ?? null,
    imageKey: patch.imageKey ?? null,
    tag: patch.tag ?? null,
    points: patch.points ?? 1,
  };
}

export function blockView(b: DraftBlock) {
  return {
    id: b.id,
    order: b.order,
    kind: b.kind,
    statement: b.statement,
    choices: b.choices,
    answer: b.answer,
    solution: b.solution,
    imageKey: b.imageKey,
    tag: b.tag,
    points: b.points,
    version: b.version,
    publishedProblemId: b.publishedProblemId,
    updatedByName: b.updatedByName,
    updatedAt: b.updatedAt,
    issues: blockIssues(b),
  };
}

type ChapterInfo = {
  id: string;
  title: string;
  book: { code: string; title: string } | null;
};

function setView(
  set: DraftSet & { _count?: { blocks: number } },
  chapter: ChapterInfo | null,
  // Багш+ хүмүүсийн id — snapshot нэрийн ард «+» (эзэн 2026-10-23)
  plus: Set<string> = new Set(),
) {
  return {
    id: set.id,
    title: set.title,
    subject: set.subject,
    chapterId: set.chapterId,
    chapter: chapter
      ? {
          id: chapter.id,
          title: chapter.title,
          bookCode: chapter.book?.code ?? null,
          bookTitle: chapter.book?.title ?? null,
        }
      : null,
    topic: set.topic,
    count: set._count?.blocks,
    status: set.publishedAt ? ('PUBLISHED' as const) : ('DRAFT' as const),
    publishedAt: set.publishedAt,
    publishCount: set.publishCount,
    publishedTestId: set.publishedTestId,
    changedSincePublish:
      !!set.publishedAt && set.updatedAt.getTime() > set.publishedAt.getTime(),
    createdByName: markPlus(set.createdByName, set.createdById, plus),
    createdAt: set.createdAt,
    updatedByName: markPlus(set.updatedByName, set.updatedById, plus),
    updatedAt: set.updatedAt,
  };
}

const CHAPTER_SELECT = {
  id: true,
  title: true,
  book: { select: { code: true, title: true } },
} as const;

@Injectable()
export class InternalDraftsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Багш+/Админ (архивлаагүй, гадны багш биш) — ӨС-ийн бодит эрхээр. */
  private async actor(userId: string): Promise<Actor> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        archivedAt: true,
        firstName: true,
        lastName: true,
        externalTeacherProfile: { select: { userId: true } },
      },
    });
    if (
      !user ||
      user.archivedAt ||
      user.externalTeacherProfile ||
      (user.role !== Role.ADMIN && user.role !== Role.TEACHER_PLUS)
    )
      throw new ForbiddenException('Багш+ эсвэл админ эрх шаардлагатай');
    return {
      id: user.id,
      role: user.role,
      name: shortPersonName(user.firstName ?? '', user.lastName ?? ''),
    };
  }

  /** Ноорогийн мөрийг түгжинэ — дараалал, нийтлэлт зэрэг явахгүй. */
  private async lockSet(tx: Tx, setId: string) {
    const rows = await tx.$queryRaw<{ id: string; publishCount: number }[]>(
      Prisma.sql`SELECT "id", "publishCount" FROM "DraftSet" WHERE "id" = ${setId} AND "deletedAt" IS NULL FOR UPDATE`,
    );
    if (!rows.length) throw new NotFoundException('Ноорог олдсонгүй');
    return rows[0];
  }

  private touchSet(tx: Tx, setId: string, actor: Actor) {
    return tx.draftSet.update({
      where: { id: setId },
      data: {
        updatedAt: new Date(),
        updatedById: actor.id,
        updatedByName: actor.name,
      },
    });
  }

  private event(
    tx: Tx,
    setId: string,
    actor: Actor,
    action: string,
    summary: string,
    blockId: string | null = null,
  ) {
    return tx.draftEvent.create({
      data: {
        setId,
        blockId,
        actorId: actor.id,
        actorName: actor.name,
        action,
        summary: summary.slice(0, 300),
      },
    });
  }

  /** Автосейв бүр түүх бохирдуулахгүй: 10 мин дотор ижил хүн, ижил блок → нэг мөр. */
  private async recordEdit(
    tx: Tx,
    setId: string,
    blockId: string,
    n: number,
    fields: string[],
    actor: Actor,
  ) {
    const since = new Date(Date.now() - COALESCE_MS);
    const last = await tx.draftEvent.findFirst({
      where: {
        setId,
        blockId,
        actorId: actor.id,
        action: 'EDIT_BLOCK',
        at: { gte: since },
      },
      orderBy: { at: 'desc' },
    });
    if (last)
      return tx.draftEvent.update({
        where: { id: last.id },
        data: {
          at: new Date(),
          summary: editSummary(n, [
            ...fieldsFromSummary(last.summary),
            ...fields,
          ]),
        },
      });
    return this.event(
      tx,
      setId,
      actor,
      'EDIT_BLOCK',
      editSummary(n, fields),
      blockId,
    );
  }

  private async assertImage(db: Tx | PrismaService, key: string | null) {
    if (!key) return;
    const file = await db.storedFile.findUnique({
      where: { key },
      select: { mime: true },
    });
    if (!file || !file.mime.startsWith('image/'))
      throw new BadRequestException('Зураг олдсонгүй — дахин оруулна уу');
  }

  private async chapterMap(ids: (string | null)[]) {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    if (!unique.length) return new Map<string, ChapterInfo>();
    const rows = await this.prisma.chapter.findMany({
      where: { id: { in: unique } },
      select: CHAPTER_SELECT,
    });
    return new Map(rows.map((c) => [c.id, c]));
  }

  private async assertChapter(chapterId: string | null | undefined) {
    if (!chapterId) return;
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        deletedAt: true,
        book: { select: { archived: true, deletedAt: true } },
      },
    });
    if (
      !chapter ||
      chapter.deletedAt ||
      chapter.book?.deletedAt ||
      chapter.book?.archived
    )
      throw new NotFoundException('Идэвхтэй бүлэг сэдэв олдсонгүй');
  }

  // ───────────────────────────── Ноорог ─────────────────────────────

  async listSets(userId: string, q?: string, status?: string) {
    await this.actor(userId);
    const search = q?.trim().slice(0, 100);
    const sets = await this.prisma.draftSet.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? { title: { contains: search, mode: 'insensitive' as const } }
          : {}),
        ...(status === 'DRAFT'
          ? { publishedAt: null }
          : status === 'PUBLISHED'
            ? { publishedAt: { not: null } }
            : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: { _count: { select: { blocks: true } } },
    });
    const chapters = await this.chapterMap(sets.map((s) => s.chapterId));
    const plus = await teacherPlusIds(
      this.prisma,
      sets.flatMap((s) => [s.createdById, s.updatedById]),
    );
    return sets.map((s) =>
      setView(s, s.chapterId ? (chapters.get(s.chapterId) ?? null) : null, plus),
    );
  }

  async createSet(dto: CreateDraftSetDto, userId: string) {
    const actor = await this.actor(userId);
    await this.assertChapter(dto.chapterId);
    const set = await this.prisma.$transaction(async (tx) => {
      const row = await tx.draftSet.create({
        data: {
          title: dto.title?.trim() || DEFAULT_TITLE,
          subject: dto.subject,
          chapterId: dto.chapterId || null,
          topic: dto.topic?.trim() || null,
          createdById: actor.id,
          createdByName: actor.name,
          updatedById: actor.id,
          updatedByName: actor.name,
        },
        include: { _count: { select: { blocks: true } } },
      });
      await this.event(tx, row.id, actor, 'CREATE_SET', 'Ноорог үүсгэсэн');
      return row;
    });
    return setView(set, null);
  }

  async getSet(setId: string, userId: string) {
    await this.actor(userId);
    const set = await this.prisma.draftSet.findFirst({
      where: { id: setId, deletedAt: null },
      include: {
        blocks: { orderBy: { order: 'asc' } },
        _count: { select: { blocks: true } },
      },
    });
    if (!set) throw new NotFoundException('Ноорог олдсонгүй');
    const [chapters, events] = await Promise.all([
      this.chapterMap([set.chapterId]),
      this.prisma.draftEvent.findMany({
        where: { setId },
        orderBy: { at: 'desc' },
        take: 30,
        select: { id: true, actorName: true, summary: true, at: true },
      }),
    ]);
    return {
      ...setView(
        set,
        set.chapterId ? (chapters.get(set.chapterId) ?? null) : null,
      ),
      blocks: set.blocks.map(blockView),
      events,
    };
  }

  async updateSet(setId: string, dto: UpdateDraftSetDto, userId: string) {
    const actor = await this.actor(userId);
    const current = await this.prisma.draftSet.findFirst({
      where: { id: setId, deletedAt: null },
    });
    if (!current) throw new NotFoundException('Ноорог олдсонгүй');
    if (dto.chapterId) await this.assertChapter(dto.chapterId);
    const data: Prisma.DraftSetUpdateInput = {};
    if (dto.title !== undefined)
      data.title = dto.title?.trim() || DEFAULT_TITLE;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.chapterId !== undefined) data.chapterId = dto.chapterId || null;
    if (dto.topic !== undefined) data.topic = dto.topic?.trim() || null;
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.draftSet.update({
        where: { id: setId },
        data: {
          ...data,
          updatedAt: new Date(),
          updatedById: actor.id,
          updatedByName: actor.name,
        },
        include: { _count: { select: { blocks: true } } },
      });
      const since = new Date(Date.now() - COALESCE_MS);
      const last = await tx.draftEvent.findFirst({
        where: {
          setId,
          actorId: actor.id,
          action: 'EDIT_SET',
          at: { gte: since },
        },
        orderBy: { at: 'desc' },
      });
      if (last)
        await tx.draftEvent.update({
          where: { id: last.id },
          data: { at: new Date() },
        });
      else
        await this.event(tx, setId, actor, 'EDIT_SET', 'Нэр, шошгыг зассан');
      return row;
    });
    const chapters = await this.chapterMap([updated.chapterId]);
    return setView(
      updated,
      updated.chapterId ? (chapters.get(updated.chapterId) ?? null) : null,
    );
  }

  /** Зөөлөн устгал — AuditLog-д нэр, бодлогын тоотой нь үлдэнэ. */
  async deleteSet(setId: string, userId: string) {
    const actor = await this.actor(userId);
    const current = await this.prisma.draftSet.findFirst({
      where: { id: setId, deletedAt: null },
      include: { _count: { select: { blocks: true } } },
    });
    if (!current) throw new NotFoundException('Ноорог олдсонгүй');
    await this.prisma.$transaction(async (tx) => {
      await tx.draftSet.update({
        where: { id: setId },
        data: {
          deletedAt: new Date(),
          updatedById: actor.id,
          updatedByName: actor.name,
        },
      });
      await this.event(tx, setId, actor, 'DELETE_SET', 'Ноорогийг устгасан');
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: 'DELETE',
          entity: 'DraftSet',
          entityId: setId,
          before: {
            title: current.title,
            blocks: current._count.blocks,
            publishedAt: current.publishedAt?.toISOString() ?? null,
          },
        },
      });
    });
    return { deleted: true };
  }

  // ───────────────────────────── Блок ─────────────────────────────

  async addBlock(setId: string, dto: CreateDraftBlockDto, userId: string) {
    const actor = await this.actor(userId);
    const fields = newBlockFields(dto);
    await this.assertImage(this.prisma, fields.imageKey);
    const block = await this.prisma.$transaction(async (tx) => {
      await this.lockSet(tx, setId);
      const blocks = await tx.draftBlock.findMany({
        where: { setId },
        select: { id: true, order: true },
        orderBy: { order: 'asc' },
      });
      let order = (blocks.at(-1)?.order ?? 0) + 1;
      if (dto.atStart) order = blocks[0]?.order ?? 1;
      else if (dto.afterId) {
        const after = blocks.find((b) => b.id === dto.afterId);
        if (!after) throw new NotFoundException('Бодлого олдсонгүй');
        order = after.order + 1;
      }
      await tx.draftBlock.updateMany({
        where: { setId, order: { gte: order } },
        data: { order: { increment: 1 } },
      });
      const row = await tx.draftBlock.create({
        data: {
          ...fields,
          setId,
          order,
          updatedById: actor.id,
          updatedByName: actor.name,
        },
      });
      await this.touchSet(tx, setId, actor);
      const n = blocks.filter((b) => b.order < order).length + 1;
      await this.event(tx, setId, actor, 'ADD_BLOCK', `${n}-р бодлого нэмсэн`, row.id);
      return row;
    });
    return blockView(block);
  }

  async addBlocks(setId: string, dto: BulkDraftBlocksDto, userId: string) {
    const actor = await this.actor(userId);
    const rows = dto.blocks.map(newBlockFields);
    for (const row of rows) await this.assertImage(this.prisma, row.imageKey);
    const created = await this.prisma.$transaction(async (tx) => {
      await this.lockSet(tx, setId);
      const last = await tx.draftBlock.findFirst({
        where: { setId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      const start = (last?.order ?? 0) + 1;
      const result = await tx.draftBlock.createManyAndReturn({
        data: rows.map((row, i) => ({
          ...row,
          setId,
          order: start + i,
          updatedById: actor.id,
          updatedByName: actor.name,
        })),
      });
      await this.touchSet(tx, setId, actor);
      const source = dto.source === 'WORD' ? 'Word файлаас' : 'ChatGPT-ээс';
      await this.event(
        tx,
        setId,
        actor,
        'IMPORT',
        `${source} ${rows.length} бодлого нэмсэн`,
      );
      return result;
    });
    return created.sort((a, b) => a.order - b.order).map(blockView);
  }

  private async findBlock(blockId: string) {
    const block = await this.prisma.draftBlock.findUnique({
      where: { id: blockId },
      include: { set: { select: { deletedAt: true } } },
    });
    if (!block || block.set.deletedAt)
      throw new NotFoundException('Бодлого олдсонгүй');
    return block;
  }

  private conflict(block: DraftBlock) {
    return new ConflictException({
      message: `${block.updatedByName} энэ бодлогыг саяхан өөрчилсөн байна`,
      code: 'DRAFT_VERSION_CONFLICT',
      block: blockView(block),
    });
  }

  async updateBlock(blockId: string, dto: UpdateDraftBlockDto, userId: string) {
    const actor = await this.actor(userId);
    const current = await this.findBlock(blockId);
    if (!dto.overwrite && dto.expectedVersion !== current.version)
      throw this.conflict(current);
    const patch = blockPatch(dto);
    const fields = changedFields(current, patch);
    if (!fields.length) return blockView(current);
    if (fields.includes('imageKey'))
      await this.assertImage(this.prisma, patch.imageKey ?? null);
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.draftBlock.updateMany({
        where: { id: blockId, version: current.version },
        data: {
          ...patch,
          version: { increment: 1 },
          updatedAt: new Date(),
          updatedById: actor.id,
          updatedByName: actor.name,
        },
      });
      if (result.count !== 1) {
        const fresh = await tx.draftBlock.findUniqueOrThrow({
          where: { id: blockId },
        });
        throw this.conflict(fresh);
      }
      await this.touchSet(tx, current.setId, actor);
      const n = await tx.draftBlock.count({
        where: { setId: current.setId, order: { lte: current.order } },
      });
      await this.recordEdit(tx, current.setId, blockId, n, fields, actor);
      return tx.draftBlock.findUniqueOrThrow({ where: { id: blockId } });
    });
    return blockView(updated);
  }

  async duplicateBlock(blockId: string, userId: string) {
    const actor = await this.actor(userId);
    const source = await this.findBlock(blockId);
    const copy = await this.prisma.$transaction(async (tx) => {
      await this.lockSet(tx, source.setId);
      const fresh = await tx.draftBlock.findUniqueOrThrow({
        where: { id: blockId },
      });
      await tx.draftBlock.updateMany({
        where: { setId: fresh.setId, order: { gt: fresh.order } },
        data: { order: { increment: 1 } },
      });
      const row = await tx.draftBlock.create({
        data: {
          setId: fresh.setId,
          order: fresh.order + 1,
          kind: fresh.kind,
          statement: fresh.statement,
          choices: fresh.choices,
          answer: fresh.answer,
          solution: fresh.solution,
          imageKey: fresh.imageKey,
          tag: fresh.tag,
          points: fresh.points,
          updatedById: actor.id,
          updatedByName: actor.name,
        },
      });
      await this.touchSet(tx, fresh.setId, actor);
      const n = await tx.draftBlock.count({
        where: { setId: fresh.setId, order: { lte: fresh.order } },
      });
      await this.event(tx, fresh.setId, actor, 'DUPLICATE_BLOCK', `${n}-р бодлогыг хуулбарласан`, row.id);
      return row;
    });
    return blockView(copy);
  }

  async deleteBlock(blockId: string, userId: string) {
    const actor = await this.actor(userId);
    const block = await this.findBlock(blockId);
    return this.prisma.$transaction(async (tx) => {
      await this.lockSet(tx, block.setId);
      const before = await tx.draftBlock.findFirst({
        where: { setId: block.setId, order: { lt: block.order } },
        orderBy: { order: 'desc' },
        select: { id: true },
      });
      const n = await tx.draftBlock.count({
        where: { setId: block.setId, order: { lte: block.order } },
      });
      await tx.draftBlock.delete({ where: { id: blockId } });
      await this.touchSet(tx, block.setId, actor);
      await this.event(tx, block.setId, actor, 'DELETE_BLOCK', `${n}-р бодлогыг устгасан`);
      return { deleted: true, afterId: before?.id ?? null };
    });
  }

  async reorder(setId: string, dto: ReorderDraftBlocksDto, userId: string) {
    const actor = await this.actor(userId);
    await this.prisma.$transaction(async (tx) => {
      await this.lockSet(tx, setId);
      const existing = await tx.draftBlock.findMany({
        where: { setId },
        select: { id: true },
      });
      const ids = new Set(existing.map((b) => b.id));
      if (
        dto.blockIds.length !== ids.size ||
        new Set(dto.blockIds).size !== ids.size ||
        dto.blockIds.some((id) => !ids.has(id))
      )
        throw new ConflictException(
          'Бодлогын жагсаалт өөрчлөгдсөн байна — хуудсаа шинэчилнэ үү',
        );
      for (const [i, id] of dto.blockIds.entries())
        await tx.draftBlock.update({ where: { id }, data: { order: i + 1 } });
      await this.touchSet(tx, setId, actor);
      const since = new Date(Date.now() - COALESCE_MS);
      const last = await tx.draftEvent.findFirst({
        where: { setId, actorId: actor.id, action: 'REORDER', at: { gte: since } },
        orderBy: { at: 'desc' },
      });
      if (last)
        await tx.draftEvent.update({ where: { id: last.id }, data: { at: new Date() } });
      else await this.event(tx, setId, actor, 'REORDER', 'Дарааллыг өөрчилсөн');
    });
    return { ok: true };
  }

  /** «Бодох» горим — хадгалахгүй, зөвхөн тулгана. */
  async check(setId: string, dto: CheckDraftAnswersDto, userId: string) {
    await this.actor(userId);
    const set = await this.prisma.draftSet.findFirst({
      where: { id: setId, deletedAt: null },
      include: { blocks: { orderBy: { order: 'asc' } } },
    });
    if (!set) throw new NotFoundException('Ноорог олдсонгүй');
    const answers = dto.answers ?? {};
    const results = set.blocks.map((b, i) => ({
      n: i + 1,
      ...checkBlock(b, answers[b.id]),
    }));
    return {
      results,
      correct: results.filter((r) => r.correct === true).length,
      wrong: results.filter((r) => r.correct === false && r.given).length,
      blank: results.filter((r) => r.correct === false && !r.given).length,
      unkeyed: results.filter((r) => r.correct === null).length,
      total: results.length,
    };
  }

  /**
   * Нийтлэх: блок бүр → Problem (ContentService.createProblem, түүх IMPORT),
   * бодолт/сэдэв → ProblemAnalysis, сонгосон бол Test (+TestProblem). Бүгд НЭГ
   * transaction-д — дутуу нийтлэл үлдэхгүй. Дутуу блоктой бол юу ч бичихгүй.
   */
  async publish(setId: string, dto: PublishDraftSetDto, userId: string) {
    const actor = await this.actor(userId);
    const set = await this.prisma.draftSet.findFirst({
      where: { id: setId, deletedAt: null },
      include: { blocks: { orderBy: { order: 'asc' } } },
    });
    if (!set) throw new NotFoundException('Ноорог олдсонгүй');
    if (!set.blocks.length)
      throw new BadRequestException('Ноорогт бодлого алга');
    const incomplete = set.blocks
      .map((b, i) => ({
        n: i + 1,
        blockId: b.id,
        messages: blockIssues(b).map((issue) => issue.message),
      }))
      .filter((b) => b.messages.length);
    if (incomplete.length)
      throw new BadRequestException({
        message: `${incomplete.length} бодлого дутуу байна — тэмдэглэснийг засна уу`,
        code: 'DRAFT_INCOMPLETE',
        blocks: incomplete,
      });
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: dto.chapterId },
      include: { book: { select: { archived: true, deletedAt: true } } },
    });
    if (
      !chapter ||
      chapter.deletedAt ||
      chapter.book?.deletedAt ||
      chapter.book?.archived
    )
      throw new NotFoundException('Идэвхтэй бүлэг сэдэв олдсонгүй');

    const publishNo = set.publishCount + 1;
    const result = await this.prisma.$transaction(
      async (tx) => {
        const locked = await this.lockSet(tx, setId);
        const versions = await tx.draftBlock.findMany({
          where: { setId },
          select: { id: true, version: true },
        });
        const same =
          locked.publishCount === set.publishCount &&
          versions.length === set.blocks.length &&
          versions.every(
            (v) => set.blocks.find((b) => b.id === v.id)?.version === v.version,
          );
        if (!same)
          throw new ConflictException(
            'Нийтлэх зуур ноорог өөрчлөгдлөө — дахин оролдоно уу',
          );
        const content = new ContentService(tx as unknown as PrismaService);
        const problemIds: string[] = [];
        for (const [i, b] of set.blocks.entries()) {
          const problem = await content.createProblem(
            problemInput(
              b,
              chapter.id,
              problemToken(set.id, publishNo, i),
            ) as CreateProblemDto,
            actor.id,
            { action: 'IMPORT', summary: 'Дотоод ноорогоос нийтэлсэн' },
          );
          await tx.problemAnalysis.create({
            data: {
              problemId: problem.id,
              status: 'VERIFIED',
              answerKeyStatus: 'VERIFIED',
              confidence: 1,
              sourcePath: `internal-drafts/${set.id}#${i + 1}`,
              topic: (b.tag ?? set.topic ?? chapter.title).slice(0, 200),
              solutionOutline: b.solution?.trim() || null,
              skills: [],
              methods: [],
              formulas: [],
              domainNotes: [],
              signRules: [],
              commonMistakes: [],
              auditNotes: [`Дотоод ноорог: ${actor.name}`],
            },
          });
          await tx.draftBlock.update({
            where: { id: b.id },
            data: { publishedProblemId: problem.id },
          });
          problemIds.push(problem.id);
        }
        let testId: string | null = null;
        if (dto.test) {
          const test = await tx.test.create({
            data: {
              title: dto.test.title.trim(),
              type: dto.test.type,
              chapterId: chapter.id,
              timeLimitMin: dto.test.timeLimitMin ?? null,
              createdById: actor.id,
              isDraft: dto.test.isDraft,
              problems: {
                create: problemIds.map((problemId, i) => ({
                  problemId,
                  order: i + 1,
                  points: Math.max(1, set.blocks[i].points || 1),
                })),
              },
            },
          });
          await recordCreated(tx, 'TEST', test.id, {
            actor: { id: actor.id, role: actor.role },
            action: 'CREATE',
            summary: 'Дотоод ноорогоос үүсгэсэн',
          });
          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              actorRole: actor.role,
              action: 'CREATE',
              entity: 'Test',
              entityId: test.id,
              after: {
                title: test.title,
                isDraft: test.isDraft,
                problems: problemIds.length,
                draftSetId: set.id,
              },
            },
          });
          testId = test.id;
        }
        const now = new Date();
        await tx.draftSet.update({
          where: { id: setId },
          data: {
            publishCount: publishNo,
            publishedAt: now,
            publishedTestId: testId ?? set.publishedTestId,
            chapterId: chapter.id,
            updatedAt: now,
            updatedById: actor.id,
            updatedByName: actor.name,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            actorRole: actor.role,
            action: 'PUBLISH',
            entity: 'DraftSet',
            entityId: setId,
            after: { chapterId: chapter.id, problemIds, testId, publishNo },
          },
        });
        await this.event(
          tx,
          setId,
          actor,
          'PUBLISH',
          `${problemIds.length} бодлогыг «${chapter.title}» бүлэгт нийтэлсэн${testId ? ', тест үүсгэсэн' : ''}`,
        );
        return { problemIds, testId };
      },
      { timeout: 60_000, maxWait: 10_000 },
    );
    return {
      ...result,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      count: result.problemIds.length,
      publishNo,
    };
  }
}
