import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../content/content.service';
import { ProblemFormat, Role } from '../generated/prisma/enums';
import { ImportBlock, ImportWarning, previewDocx } from './docx-parser';
import { ConfirmDocumentDto } from './confirm-document.dto';

interface ReviewParagraph {
  id: string;
  text: string;
  warnings: ImportWarning[];
}
interface ReviewSession {
  ownerId: string;
  sourceHash: string;
  expiresAt: number;
  blocks: ReviewParagraph[];
  bytes: number;
}
const TTL = 30 * 60 * 1000;
const MAX_CACHE_BYTES = 64 * 1024 * 1024;
function paragraphs(
  blocks: ImportBlock[],
  inherited: ImportWarning[] = [],
): ReviewParagraph[] {
  return blocks.flatMap((block) =>
    block.rows
      ? paragraphs(block.rows.flat(2), [
          ...inherited,
          ...block.warnings.filter((w) => w.code !== 'TABLE_MAPPING'),
        ])
      : [
          {
            id: block.id,
            text: block.text,
            warnings: [...inherited, ...block.warnings].map((w) => ({
              code: w.code,
              message: w.message,
            })),
          },
        ],
  );
}
const hash = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');
@Injectable()
export class DocumentImportService {
  private readonly signingKey = randomBytes(32);
  private readonly sessions = new Map<string, ReviewSession>();
  constructor(private readonly prisma: PrismaService) {}
  private requireRole(role: Role) {
    if (role !== Role.ADMIN && role !== Role.TEACHER_PLUS)
      throw new ForbiddenException('Багш+ эсвэл админ эрх шаардлагатай.');
  }
  private signature(payload: string) {
    return createHmac('sha256', this.signingKey)
      .update(payload)
      .digest('base64url');
  }
  private prune() {
    const now = Date.now();
    for (const [id, session] of this.sessions)
      if (session.expiresAt <= now) this.sessions.delete(id);
  }
  async preview(buffer: Buffer, filename: string, userId: string, role: Role) {
    this.requireRole(role);
    const preview = await previewDocx(buffer, filename);
    const blocks = paragraphs(preview.blocks);
    const bytes = Buffer.byteLength(JSON.stringify(blocks));
    this.prune();
    let used = [...this.sessions.values()].reduce((sum, s) => sum + s.bytes, 0);
    while (this.sessions.size >= 32 || used + bytes > MAX_CACHE_BYTES) {
      const oldest = this.sessions.keys().next().value as string | undefined;
      if (!oldest) throw new BadRequestException('Баримт хэт том байна.');
      used -= this.sessions.get(oldest)!.bytes;
      this.sessions.delete(oldest);
    }
    const id = randomUUID();
    const sourceHash = hash(buffer);
    const expiresAt = Date.now() + TTL;
    this.sessions.set(id, {
      ownerId: userId,
      sourceHash,
      expiresAt,
      blocks,
      bytes,
    });
    const payload = Buffer.from(
      JSON.stringify({ id, userId, sourceHash, expiresAt }),
    ).toString('base64url');
    return {
      ...preview,
      sourceHash,
      previewToken: `${payload}.${this.signature(payload)}`,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }
  async confirm(dto: ConfirmDocumentDto, userId: string, role: Role) {
    this.requireRole(role);
    if (
      dto?.confirmed !== true ||
      dto?.warningsAcknowledged !== true ||
      typeof dto.previewToken !== 'string' ||
      dto.previewToken.length > 2048 ||
      typeof dto.chapterId !== 'string' ||
      !dto.chapterId ||
      dto.chapterId.length > 100
    )
      throw new BadRequestException(
        'Эх баримт, анхааруулга, бүлэг сэдвийг шалгаж баталгаажуулна уу.',
      );
    const [payload, signature, extra] = dto.previewToken.split('.');
    if (!payload || !signature || extra)
      throw new BadRequestException('Урьдчилсан харагдацын баталгаа буруу.');
    const expected = Buffer.from(this.signature(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw new BadRequestException(
        'Урьдчилсан харагдац өөрчлөгдсөн эсвэл хугацаа дууссан.',
      );
    let claims: {
      id: string;
      userId: string;
      sourceHash: string;
      expiresAt: number;
    };
    try {
      claims = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as typeof claims;
    } catch {
      throw new BadRequestException('Урьдчилсан харагдацын баталгаа буруу.');
    }
    if (claims.userId !== userId)
      throw new ForbiddenException(
        'Өөрийн оруулсан баримтыг баталгаажуулна уу.',
      );
    this.prune();
    const session = this.sessions.get(claims.id);
    if (
      !session ||
      claims.expiresAt <= Date.now() ||
      session.ownerId !== userId ||
      session.sourceHash !== claims.sourceHash ||
      session.expiresAt !== claims.expiresAt
    )
      throw new BadRequestException(
        'Урьдчилсан харагдацын хугацаа дууссан. Файлаа дахин оруулна уу.',
      );
    const mapping = dto.mapping;
    if (
      !mapping ||
      typeof mapping.promptId !== 'string' ||
      !Array.isArray(mapping.choiceIds) ||
      mapping.choiceIds.length < 2 ||
      mapping.choiceIds.length > 4 ||
      mapping.choiceIds.some((id) => typeof id !== 'string') ||
      !mapping.choiceIds.includes(mapping.correctChoiceId)
    )
      throw new BadRequestException(
        'Асуулт, 2–4 сонголт, яг нэг зөв хариуг холбоно уу.',
      );
    const ids = [mapping.promptId, ...mapping.choiceIds];
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException(
        'Асуулт ба сонголтын мөрүүд давхцахгүй байна.',
      );
    const selected = ids.map((id) =>
      session.blocks.find((block) => block.id === id),
    );
    if (
      selected.some(
        (block) =>
          !block ||
          !block.text.trim() ||
          block.text.length > 20000 ||
          block.warnings.length > 0,
      )
    )
      throw new BadRequestException(
        'Сонгосон мөр алга эсвэл зураг/томьёог гараар засах шаардлагатай.',
      );
    const blocks = selected as ReviewParagraph[];
    // Existing globally unique Problem.token gives durable idempotency across retries,
    // process restarts and fresh previews of the same document and manual mapping.
    const token = `docx-${hash(JSON.stringify({ userId, sourceHash: session.sourceHash, chapterId: dto.chapterId, mapping: { promptId: mapping.promptId, choiceIds: mapping.choiceIds, correctChoiceId: mapping.correctChoiceId } })).slice(0, 48)}`;
    const result = (
      problem: { id: string; createdById: string; deletedAt: Date | null },
      duplicate: boolean,
    ) => {
      if (problem.createdById !== userId || problem.deletedAt)
        throw new ConflictException(
          'Энэ импортын бодлого өөрчлөгдсөн эсвэл устсан байна.',
        );
      return { problemId: problem.id, duplicate };
    };
    const existing = await this.prisma.problem.findUnique({
      where: { token },
      select: { id: true, createdById: true, deletedAt: true },
    });
    if (existing) return result(existing, true);
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const chapter = await tx.chapter.findUnique({
          where: { id: dto.chapterId },
          include: { book: true },
        });
        if (
          !chapter ||
          chapter.deletedAt ||
          chapter.book?.deletedAt ||
          chapter.book?.archived
        )
          throw new NotFoundException('Идэвхтэй бүлэг сэдэв олдсонгүй.');
        // Reuse ContentService's existing ProblemChoice flags and nested atomic create.
        const content = new ContentService(tx as unknown as PrismaService);
        const problem = await content.createProblem(
          {
            chapterId: dto.chapterId,
            token,
            format: ProblemFormat.CHOICE,
            statementText: blocks[0].text,
            choiceOptions: blocks.slice(1).map((block, i) => ({
              text: block.text,
              isCorrect: mapping.choiceIds[i] === mapping.correctChoiceId,
            })),
          },
          userId,
        );
        await tx.auditLog.create({
          data: {
            actorId: userId,
            actorRole: role,
            action: 'DOCX_IMPORT',
            entity: 'Problem',
            entityId: problem.id,
            after: {
              sourceHash: session.sourceHash,
              blockIds: ids,
              reviewed: true,
            },
          },
        });
        return problem;
      });
      return result(created, false);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        (error as { code?: string })?.code === 'P2002'
      ) {
        const duplicate = await this.prisma.problem.findUnique({
          where: { token },
          select: { id: true, createdById: true, deletedAt: true },
        });
        if (duplicate) return result(duplicate, true);
      }
      throw error;
    }
  }
}
