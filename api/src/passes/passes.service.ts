import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';
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
  ) {
    const pass = await this.prisma.pass.findUnique({ where: { id: passId } });
    if (!pass) throw new NotFoundException('Эрх олдсонгүй');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');

    const startsAt = new Date();
    const expiresAt = new Date(
      startsAt.getTime() + pass.durationDays * 24 * 60 * 60 * 1000,
    );
    const granted = await this.prisma.userPass.create({
      data: { userId, passId, startsAt, expiresAt, paymentId },
      include: { pass: { select: { name: true } } },
    });
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
          startsAt,
          expiresAt,
          paymentId: paymentId ?? null,
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
  async revokeUserPass(userPassId: string, actor: PassActor) {
    const userPass = await this.prisma.userPass.findUnique({
      where: { id: userPassId },
    });
    if (!userPass) throw new NotFoundException('Олгосон эрх олдсонгүй');
    await this.prisma.userPass.delete({ where: { id: userPassId } });
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'REVOKE',
      entity: 'UserPass',
      entityId: userPassId,
      before: { ...userPass },
    });
    return { revoked: true };
  }
}
