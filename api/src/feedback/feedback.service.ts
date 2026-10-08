import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
import { CreateFeedbackDto, TriageFeedbackDto } from './feedback.dto';
const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;
@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}
  private matches(
    existing: {
      kind: string;
      subject: string;
      body: string;
      contextPath: string | null;
      attachmentKeys: string[];
    },
    dto: CreateFeedbackDto,
  ) {
    return (
      existing.kind === dto.kind &&
      existing.subject === dto.subject &&
      existing.body === dto.body &&
      existing.contextPath === (dto.contextPath ?? null) &&
      JSON.stringify(existing.attachmentKeys) ===
        JSON.stringify(dto.attachmentKeys ?? [])
    );
  }
  private replay<
    T extends {
      kind: string;
      subject: string;
      body: string;
      contextPath: string | null;
      attachmentKeys: string[];
    },
  >(existing: T, dto: CreateFeedbackDto): T {
    if (!this.matches(existing, dto))
      throw new ConflictException(
        'Энэ илгээлтийн дугаараар өөр мэдээлэл хадгалагдсан байна. Шинэ хүсэлтээр илгээнэ үү.',
      );
    return existing;
  }
  async create(authorId: string, dto: CreateFeedbackDto) {
    const unique = {
      authorId_clientRequestId: {
        authorId,
        clientRequestId: dto.clientRequestId,
      },
    };
    const existing = await this.prisma.feedback.findUnique({ where: unique });
    if (existing) return this.replay(existing, dto);
    const keys = dto.attachmentKeys ?? [];
    if (new Set(keys).size !== keys.length)
      throw new BadRequestException('Хавсралт давхардсан байна.');
    if (keys.length) {
      const owned = await this.prisma.storedFile.findMany({
        where: { key: { in: keys }, ownerId: authorId },
        select: { key: true, mime: true },
      });
      const allowed = new Set([
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ]);
      if (
        owned.length !== keys.length ||
        owned.some((file) => !allowed.has(file.mime))
      )
        throw new BadRequestException(
          'Зөвхөн өөрийн байршуулсан JPG, PNG, GIF, WEBP зураг хавсаргана.',
        );
    }
    try {
      return await this.prisma.feedback.create({
        data: {
          authorId,
          clientRequestId: dto.clientRequestId,
          kind: dto.kind,
          subject: dto.subject,
          body: dto.body,
          contextPath: dto.contextPath ?? null,
          attachmentKeys: keys,
        },
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const replay = await this.prisma.feedback.findUnique({ where: unique });
        if (replay) return this.replay(replay, dto);
      }
      throw error;
    }
  }
  async list(authorId: string, cursor?: string) {
    return this.prisma.feedback.findMany({
      where: { authorId },
      orderBy: { id: 'desc' },
      take: 51,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { author: { select: authorSelect } },
    });
  }
  async listAll(role: Role, cursor?: string) {
    if (role !== Role.ADMIN)
      throw new ForbiddenException('Хүсэлтүүдийг харах эрхгүй.');
    return this.prisma.feedback.findMany({
      orderBy: { id: 'desc' },
      take: 51,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { author: { select: authorSelect } },
    });
  }
  async detail(id: string, userId: string, role: Role) {
    const ticket = await this.prisma.feedback.findUnique({
      where: { id },
      include: { author: { select: authorSelect } },
    });
    if (!ticket) throw new NotFoundException('Хүсэлт олдсонгүй.');
    if (ticket.authorId !== userId && role !== Role.ADMIN)
      throw new ForbiddenException('Энэ хүсэлтийг харах эрхгүй.');
    return ticket;
  }
  async triage(
    id: string,
    adminId: string,
    role: Role,
    dto: TriageFeedbackDto,
  ) {
    if (role !== Role.ADMIN)
      throw new ForbiddenException('Хүсэлт шийдвэрлэх эрхгүй.');
    const existing = await this.prisma.feedback.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Хүсэлт олдсонгүй.');
    return this.prisma.feedback.update({
      where: { id },
      data: {
        state: dto.state,
        ...(dto.response !== undefined
          ? { response: dto.response || null, respondedById: adminId }
          : {}),
      },
      include: { author: { select: authorSelect } },
    });
  }
}
