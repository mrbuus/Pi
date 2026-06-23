import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePassDto } from './dto/pass.dto';

@Injectable()
export class PassesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreatePassDto) {
    return this.prisma.pass.create({
      data: {
        name: dto.name,
        durationDays: dto.durationDays,
        scope: dto.scope as Prisma.InputJsonValue,
        price: dto.price,
        active: dto.active ?? true,
      },
    });
  }

  // Нийтэд зарагдах идэвхтэй эрхүүд — дэлгүүрийн жагсаалт
  listActive() {
    return this.prisma.pass.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  async grant(passId: string, userId: string, paymentId?: string) {
    const pass = await this.prisma.pass.findUnique({ where: { id: passId } });
    if (!pass) throw new NotFoundException('Эрх олдсонгүй');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');

    const startsAt = new Date();
    const expiresAt = new Date(
      startsAt.getTime() + pass.durationDays * 24 * 60 * 60 * 1000,
    );
    return this.prisma.userPass.create({
      data: { userId, passId, startsAt, expiresAt, paymentId },
      include: { pass: { select: { name: true } } },
    });
  }

  myPasses(userId: string) {
    return this.prisma.userPass.findMany({
      where: { userId },
      include: { pass: true },
      orderBy: { expiresAt: 'desc' },
    });
  }
}
