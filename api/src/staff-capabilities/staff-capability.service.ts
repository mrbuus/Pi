import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';

export const STAFF_CAPABILITIES = [
  'schedule.manage',
  'time.review',
  'payroll.view',
  'finance.manage',
] as const;
export type StaffCapability = (typeof STAFF_CAPABILITIES)[number];

@Injectable()
export class StaffCapabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, archivedAt: true },
    });
    if (!user || user.archivedAt)
      throw new ForbiddenException('Идэвхтэй ажилтны эрх шаардлагатай.');
    return user;
  }

  async has(
    userId: string,
    capability: StaffCapability,
    scopeClassroomId?: string,
  ): Promise<boolean> {
    if (!STAFF_CAPABILITIES.includes(capability)) return false;
    const actor = await this.actor(userId);
    if (actor.role === Role.ADMIN) return true;
    if (actor.role !== Role.TEACHER_PLUS) return false;
    // Эзний шийдвэр (2026-10-08): Багш+ төлбөрийн хэсгийг БАЙНГА удирдана —
    // тусгай эрх олгох шаардлагагүй. Хуваарь/цаг/цалин нь тусгай эрхтэй хэвээр.
    if (capability === 'finance.manage') return true;
    return !!(await this.prisma.staffCapabilityGrant.findFirst({
      where: {
        userId,
        capability,
        revokedAt: null,
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          {
            scopeKey: { in: scopeClassroomId ? ['', scopeClassroomId] : [''] },
          },
        ],
      },
      select: { id: true },
    }));
  }

  async assert(
    userId: string,
    capability: StaffCapability,
    scopeClassroomId?: string,
  ): Promise<void> {
    if (!(await this.has(userId, capability, scopeClassroomId)))
      throw new ForbiddenException(
        'Энэ үйлдлийн тусгай эрх олгогдоогүй эсвэл хугацаа нь дууссан.',
      );
  }

  async mine(userId: string) {
    const actor = await this.actor(userId);
    const grants =
      actor.role === Role.TEACHER_PLUS
        ? await this.prisma.staffCapabilityGrant.findMany({
            where: {
              userId,
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: {
              id: true,
              capability: true,
              scopeKey: true,
              expiresAt: true,
            },
            orderBy: { capability: 'asc' },
          })
        : [];
    return { administrator: actor.role === Role.ADMIN, grants };
  }

  private async assertAdmin(actorId: string) {
    if ((await this.actor(actorId)).role !== Role.ADMIN)
      throw new ForbiddenException('Зөвхөн админ нарийн эрхийг удирдана.');
  }

  async list(actorId: string) {
    await this.assertAdmin(actorId);
    const [grants, staff, classrooms] = await Promise.all([
      this.prisma.staffCapabilityGrant.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 500,
        select: {
          id: true,
          userId: true,
          capability: true,
          scopeKey: true,
          reason: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.findMany({
        where: { role: Role.TEACHER_PLUS, archivedAt: null },
        select: { id: true, firstName: true, lastName: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 500,
      }),
      this.prisma.classroom.findMany({
        where: { archived: false },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 500,
      }),
    ]);
    return {
      asOf: new Date().toISOString(),
      grants,
      staff,
      classrooms,
      capabilities: STAFF_CAPABILITIES,
    };
  }

  async grant(
    actorId: string,
    input: {
      userId: string;
      capability: StaffCapability;
      scopeKey?: string;
      reason: string;
      expiresAt?: string;
    },
  ) {
    await this.assertAdmin(actorId);
    if (!STAFF_CAPABILITIES.includes(input.capability))
      throw new BadRequestException('Эрхийн төрөл тохирохгүй.');
    const scopeKey = input.scopeKey?.trim() || '';
    if (scopeKey && input.capability !== 'schedule.manage')
      throw new BadRequestException('Энэ эрх ангид хязгаарлагдахгүй.');
    const reason = input.reason.trim();
    if (reason.length < 3 || reason.length > 500)
      throw new BadRequestException('Шалтгааныг тодорхой бичнэ үү.');
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (
      expiresAt &&
      (!Number.isFinite(expiresAt.getTime()) ||
        expiresAt.getTime() <= Date.now())
    )
      throw new BadRequestException('Эрхийн дуусах хугацаа ирээдүйд байна.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`staff-capability:${input.userId}:${input.capability}:${scopeKey}`}))`;
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { role: true, archivedAt: true },
      });
      if (!user || user.archivedAt || user.role !== Role.TEACHER_PLUS)
        throw new BadRequestException('Идэвхтэй Багш+ ажилтныг сонгоно уу.');
      if (
        scopeKey &&
        !(await tx.classroom.findFirst({
          where: { id: scopeKey, archived: false },
          select: { id: true },
        }))
      )
        throw new BadRequestException('Идэвхтэй анги олдсонгүй.');
      const where = {
        userId_capability_scopeKey: {
          userId: input.userId,
          capability: input.capability,
          scopeKey,
        },
      };
      const previous = await tx.staffCapabilityGrant.findUnique({ where });
      const row = await tx.staffCapabilityGrant.upsert({
        where,
        create: {
          userId: input.userId,
          capability: input.capability,
          scopeKey,
          reason,
          expiresAt,
          grantedById: actorId,
        },
        update: { reason, expiresAt, revokedAt: null, grantedById: actorId },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole: Role.ADMIN,
          action: 'GRANT',
          entity: 'StaffCapabilityGrant',
          entityId: row.id,
          before: previous
            ? {
                capability: previous.capability,
                scopeKey: previous.scopeKey,
                revoked: !!previous.revokedAt,
                expiresAt: previous.expiresAt?.toISOString() ?? null,
              }
            : undefined,
          after: {
            userId: row.userId,
            capability: row.capability,
            scopeKey: row.scopeKey,
            expiresAt: row.expiresAt?.toISOString() ?? null,
          },
          reason,
        },
      });
      return row;
    });
  }

  async revoke(actorId: string, id: string, reason: string) {
    await this.assertAdmin(actorId);
    const cleanReason = reason.trim();
    if (cleanReason.length < 3 || cleanReason.length > 500)
      throw new BadRequestException('Цуцлах шалтгааныг бичнэ үү.');
    return this.prisma.$transaction(async (tx) => {
      const initial = await tx.staffCapabilityGrant.findUnique({
        where: { id },
      });
      if (!initial) throw new NotFoundException('Эрх олдсонгүй.');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`staff-capability:${initial.userId}:${initial.capability}:${initial.scopeKey}`}))`;
      const previous = await tx.staffCapabilityGrant.findUniqueOrThrow({
        where: { id },
      });
      if (previous.revokedAt) return previous;
      const row = await tx.staffCapabilityGrant.update({
        where: { id },
        data: { revokedAt: new Date(), reason: cleanReason },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole: Role.ADMIN,
          action: 'REVOKE',
          entity: 'StaffCapabilityGrant',
          entityId: id,
          before: {
            userId: row.userId,
            capability: row.capability,
            scopeKey: row.scopeKey,
          },
          after: { revokedAt: row.revokedAt!.toISOString() },
          reason: cleanReason,
        },
      });
      return row;
    });
  }
}
