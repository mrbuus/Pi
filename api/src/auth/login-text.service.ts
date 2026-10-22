import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LOGIN_TEXT_MAX } from './dto/login-text.dto';

/** Ганц мөр — тохиргоо шиг (эзэн 2026-10-22) */
export const LOGIN_TEXT_ID = 'default';

/**
 * Хадгалахын өмнөх цэвэрлэгээ: мөрийн төгсгөлийг нэгтгэж (\r\n → \n), хяналтын
 * тэмдэгтийг хасаж, 3+ хоосон мөрийг 2 болгоно. HTML-ийг ХАДГАЛЖ болно —
 * вэб үүнийг React текстээр (escape хийж) зурдаг тул хэзээ ч HTML болж ажиллахгүй.
 */
export function normalizeLoginText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

@Injectable()
export class LoginTextService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** Нийтэд — нэвтрэх хуудас. Мөр байхгүй бол хоосон. */
  async get(): Promise<{ body: string; updatedAt: Date | null }> {
    const row = await this.prisma.loginText.findUnique({
      where: { id: LOGIN_TEXT_ID },
      select: { body: true, updatedAt: true },
    });
    return { body: row?.body ?? '', updatedAt: row?.updatedAt ?? null };
  }

  /** Зөвхөн ADMIN (controller-ийн @Roles). Хоосон бичвэр = нуух. */
  async set(body: string, actor: { userId: string; role: string }) {
    const clean = normalizeLoginText(body ?? '');
    if (clean.length > LOGIN_TEXT_MAX) {
      throw new BadRequestException(`Тайлбар ${LOGIN_TEXT_MAX} тэмдэгтээс хэтрэхгүй`);
    }
    const row = await this.prisma.loginText.upsert({
      where: { id: LOGIN_TEXT_ID },
      create: { id: LOGIN_TEXT_ID, body: clean, updatedById: actor.userId },
      update: { body: clean, updatedById: actor.userId },
      select: { body: true, updatedAt: true },
    });
    await this.audit.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'LOGIN_TEXT_UPDATE',
      entity: 'LoginText',
      entityId: LOGIN_TEXT_ID,
      reason: clean ? `Нэвтрэх хуудасны тайлбар шинэчлэв (${clean.length} тэмдэгт)` : 'Нэвтрэх хуудасны тайлбарыг хоосолсон',
    });
    return row;
  }
}
