import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './devices.dto';
import { PUSH_SENDER, type PushMessage, type PushSender } from './push-sender';

/** Нэг хэрэглэгчид хэт олон токен хуримтлагдахаас (хуучин утас, дахин суулгалт) */
const MAX_ACTIVE_PER_USER = 10;

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(PUSH_SENDER) private push: PushSender,
  ) {}

  /**
   * Токен бүртгэх / сэргээх. Ижил токен өөр хэрэглэгчид байсан бол (нэг утсанд
   * өөр хүн нэвтэрсэн) энэ хэрэглэгч рүү шилжинэ — өмнөх хүний мэдэгдэл
   * энэ утсанд ирэхгүй.
   */
  async register(userId: string, dto: RegisterDeviceDto) {
    const token = dto.token.trim();
    const now = new Date();
    // FCM/APNs токен нь тухайн суулгалтад л мэдэгдэх таамаглашгүй утга тул эзэмшигч нь
    // утсыг барьж буй хүн. Эзэн солигдохыг (нэг утсанд өөр хүн нэвтэрсэн) аудитад үлдээнэ.
    const previous = await this.prisma.deviceToken.findUnique({
      where: { token },
      select: { userId: true, revokedAt: true },
    });
    if (previous && previous.userId !== userId && !previous.revokedAt) {
      this.logger.warn(`Төхөөрөмжийн токен эзэн солигдлоо: ${previous.userId} → ${userId}`);
    }
    const row = await this.prisma.deviceToken.upsert({
      where: { token },
      create: {
        userId,
        token,
        platform: dto.platform,
        appVersion: dto.appVersion ?? null,
        lastSeenAt: now,
      },
      update: {
        userId,
        platform: dto.platform,
        appVersion: dto.appVersion ?? null,
        lastSeenAt: now,
        revokedAt: null,
      },
      select: { id: true, platform: true, lastSeenAt: true },
    });
    await this.trimOld(userId);
    return { registered: true, device: row, pushEnabled: this.push.isEnabled() };
  }

  /** Гарах үед: зөвхөн өөрийн токеныг идэвхгүй болгоно (мөр устахгүй). */
  async unregister(userId: string, token: string) {
    const result = await this.prisma.deviceToken.updateMany({
      where: { token, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Төхөөрөмж олдсонгүй');
    return { registered: false };
  }

  /**
   * Бусад модуль (мэдэгдэл, даалгавар, ирц, төлбөр) дуудна. Firebase
   * тохируулаагүй бол чимээгүй алгасна. Алдаа шидэхгүй — push бол нэмэлт суваг.
   */
  async sendToUsers(userIds: string[], message: PushMessage) {
    if (!this.push.isEnabled() || userIds.length === 0) {
      return { sent: 0, skipped: true };
    }
    const devices = await this.prisma.deviceToken.findMany({
      where: { userId: { in: [...new Set(userIds)] }, revokedAt: null },
      select: { token: true },
    });
    if (devices.length === 0) return { sent: 0, skipped: false };
    try {
      const result = await this.push.send(
        devices.map((d) => d.token),
        message,
      );
      if (result.invalidTokens.length) {
        await this.prisma.deviceToken.updateMany({
          where: { token: { in: result.invalidTokens } },
          data: { revokedAt: new Date() },
        });
      }
      return { sent: result.sent, skipped: result.skipped };
    } catch (e) {
      this.logger.warn(`Push илгээж чадсангүй: ${e instanceof Error ? e.message : e}`);
      return { sent: 0, skipped: false };
    }
  }

  private async trimOld(userId: string) {
    const active = await this.prisma.deviceToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
      select: { id: true },
    });
    const stale = active.slice(MAX_ACTIVE_PER_USER).map((d) => d.id);
    if (stale.length) {
      await this.prisma.deviceToken.updateMany({
        where: { id: { in: stale } },
        data: { revokedAt: new Date() },
      });
    }
  }
}
