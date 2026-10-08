import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';
import { snapshotPass } from './pass-snapshot';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePassDto, UpdatePassDto } from './dto/pass.dto';

// Аудит бичихдээ хэн (id + роль) хийж буйг мэднэ — payments модулиас дуудахдаа
// ч, passes controller-оос шууд дуудахдаа ч заавал өгнө.
export interface PassActor {
  id: string;
  role: string;
}

@Injectable()
export class PassesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private capabilities: StaffCapabilityService,
  ) {}

  async create(dto: CreatePassDto, actor: PassActor) {
    const pass = await this.prisma.pass.create({
      data: {
        name: dto.name,
        durationDays: dto.durationDays,
        // dto.scope нь validated PassScopeDto инстанс (class-transformer-ээр
        // хувиргагдсан) — Prisma Json баганад plain object болгож бичнэ.
        scope: { ...dto.scope } as Prisma.InputJsonValue,
        price: dto.price,
        active: dto.active ?? true,
      },
    });
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CREATE',
      entity: 'Pass',
      entityId: pass.id,
      after: { ...pass },
    });
    return pass;
  }

  // Нийтэд зарагдах идэвхтэй эрхүүд — дэлгүүрийн жагсаалт
  listActive() {
    return this.prisma.pass.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  // Удирдлагын дэлгэц: идэвхгүйг оролцуулж, өмнө нь олгосон эрхийн тоог өгнө.
  async listAll() {
    const passes = await this.prisma.pass.findMany({
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { userPasses: true } } },
    });
    return passes.map(({ _count, ...pass }) => ({
      ...pass,
      holdersCount: _count.userPasses,
    }));
  }

  // Хувийн мэдээллийг зөвхөн удирдлагын endpoint-д, хамгийн бага хэмжээгээр
  // буцаана. Утас болон имэйл энэ жагсаалтад шаардлагагүй.
  async holders(passId: string) {
    const pass = await this.prisma.pass.findUnique({
      where: { id: passId },
      select: { id: true },
    });
    if (!pass) throw new NotFoundException('Эрх олдсонгүй');

    const rows = await this.prisma.userPass.findMany({
      where: { passId },
      orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        startsAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentCode: true,
          },
        },
      },
    });
    const now = new Date();
    return rows.map((row) => ({
      ...row,
      active: row.startsAt <= now && row.expiresAt >= now,
    }));
  }

  // Админ: нэр/хугацаа/хамрах хүрээ/үнэ/идэвх засна (SPEC/эзэмшигчийн шаардлага)
  async update(id: string, dto: UpdatePassDto, actor: PassActor) {
    const pass = await this.prisma.pass.findUnique({ where: { id } });
    if (!pass) throw new NotFoundException('Эрх олдсонгүй');

    const data: Prisma.PassUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.durationDays !== undefined) data.durationDays = dto.durationDays;
    if (dto.scope !== undefined)
      data.scope = { ...dto.scope } as Prisma.InputJsonValue;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.active !== undefined) data.active = dto.active;

    const updated = await this.prisma.pass.update({ where: { id }, data });
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE',
      entity: 'Pass',
      entityId: id,
      before: { ...pass },
      after: { ...updated },
    });
    return updated;
  }

  // Админ: эрхийн тодорхойлолтыг устгана — аль хэдийн олгосон бол устгахгүй
  // (өгсөн хэрэглэгчдийн UserPass-ыг орфан үлдээхгүй)
  async remove(id: string, actor: PassActor) {
    const pass = await this.prisma.pass.findUnique({ where: { id } });
    if (!pass) throw new NotFoundException('Эрх олдсонгүй');
    const grantedCount = await this.prisma.userPass.count({
      where: { passId: id },
    });
    if (grantedCount > 0) {
      throw new BadRequestException(
        'Энэ эрхийг өмнө нь олгосон тул устгах боломжгүй',
      );
    }
    await this.prisma.pass.delete({ where: { id } });
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DELETE',
      entity: 'Pass',
      entityId: id,
      before: { ...pass },
    });
    return { deleted: true };
  }

  async grant(
    passId: string,
    userId: string,
    paymentId?: string,
    actor?: PassActor,
    manual = false,
    note?: string,
    transaction?: Prisma.TransactionClient,
  ) {
    if (actor) await this.capabilities.assert(actor.id, 'finance.manage');
    const work = async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'pass:' + userId + ':' + passId}))`;
      if (paymentId)
        await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} FOR UPDATE`;
      const pass = await tx.pass.findUnique({ where: { id: passId } });
      if (!pass) throw new NotFoundException('Эрх олдсонгүй');
      if (!pass.active)
        throw new BadRequestException('Идэвхгүй эрхийг шинээр олгох боломжгүй');
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.archivedAt)
        throw new NotFoundException('Хэрэглэгч олдсонгүй');
      if (
        ![Role.STUDENT, Role.BUYER].includes(user.role as typeof Role.STUDENT)
      )
        throw new BadRequestException(
          'Эрхийг зөвхөн сурагч эсвэл худалдан авагчид олгоно',
        );
      const startsAt = new Date();
      const active = await tx.userPass.findFirst({
        where: {
          userId,
          passId,
          startsAt: { lte: startsAt },
          expiresAt: { gt: startsAt },
        },
      });
      if (active) {
        if (paymentId && active.paymentId === paymentId) return active;
        throw new BadRequestException('Энэ эрх идэвхтэй байна');
      }
      if (paymentId) {
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
        });
        if (
          !payment ||
          payment.userId !== userId ||
          payment.status !== 'CONFIRMED'
        )
          throw new BadRequestException(
            'Баталгаажсан өөрийн төлбөр шаардлагатай',
          );
        const used = await tx.purchase.findFirst({ where: { paymentId } });
        const usedPass = await tx.userPass.findFirst({ where: { paymentId } });
        if (used || usedPass)
          throw new BadRequestException(
            'Энэ төлбөрөөр эрх аль хэдийн олгосон байна',
          );
      }
      const terms = snapshotPass(pass);
      const expiresAt = new Date(
        startsAt.getTime() + terms.durationDays * 86400000,
      );
      return tx.userPass.create({
        data: {
          userId,
          passId,
          startsAt,
          expiresAt,
          paymentId,
          scopeSnapshot: terms.scope as Prisma.InputJsonValue,
        },
        include: { pass: { select: { name: true } } },
      });
    };
    const granted = transaction
      ? await work(transaction)
      : await this.prisma.$transaction(work);
    if (actor) {
      await this.audit.record({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'GRANT',
        entity: 'UserPass',
        entityId: granted.id,
        after: {
          userId,
          passId,
          startsAt: granted.startsAt,
          expiresAt: granted.expiresAt,
          paymentId: paymentId ?? null,
          note: note ?? null,
        },
      });
    }
    return granted;
  }

  myPasses(userId: string) {
    return this.prisma.userPass.findMany({
      where: { userId },
      include: { pass: true },
      orderBy: { expiresAt: 'desc' },
    });
  }

  // Админ: аль хэдийн олгосон эрхийг цуцална (устгана)
  async revokeUserPass(userPassId: string, actor: PassActor, reason: string) {
    const auditReason = reason?.trim();
    if (!auditReason) {
      throw new BadRequestException('Цуцлах шалтгааныг бичнэ үү');
    }
    await this.capabilities.assert(actor.id, 'finance.manage');
    const userPass = await this.prisma.$transaction(async (tx) => {
      const original = await tx.userPass.findUnique({
        where: { id: userPassId },
      });
      if (!original) throw new NotFoundException('Олгосон эрх олдсонгүй');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'pass:' + original.userId + ':' + original.passId}))`;
      if (original.paymentId)
        await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${original.paymentId} FOR UPDATE`;
      const current = await tx.userPass.findUnique({
        where: { id: userPassId },
      });
      if (!current) throw new NotFoundException('Олгосон эрх олдсонгүй');
      await tx.userPass.delete({ where: { id: userPassId } });
      if (current.paymentId)
        await tx.purchase.updateMany({
          where: {
            userId: current.userId,
            paymentId: current.paymentId,
            productItem: { kind: 'PASS', refId: current.passId },
          },
          data: { grantedAt: null, expiresAt: new Date() },
        });
      if (!current.paymentId)
        await tx.purchase.updateMany({
          where: {
            userId: current.userId,
            price: 0,
            productItem: { kind: 'PASS', refId: current.passId },
          },
          data: { grantedAt: null, expiresAt: new Date() },
        });
      return current;
    });
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'REVOKE',
      entity: 'UserPass',
      entityId: userPassId,
      before: { ...userPass },
      reason: auditReason,
    });
    return { revoked: true };
  }
}
