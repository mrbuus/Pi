import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { maskPhone, toNationalMn } from '../notifications/phone';
import { SmsService } from '../notifications/sms.service';
import { PrismaService } from '../prisma/prisma.service';
import { requireJwtSecret } from './jwt.strategy';
import {
  CODE_TTL_MS,
  MAX_REQUESTS_PER_WINDOW,
  REQUEST_WINDOW_MS,
  generateCode,
  hashCode,
  isTokenUsable,
  maskIdentifier,
  safeEqualHex,
} from './password-reset.util';

/**
 * Нууц үг сэргээх урсгал.
 *
 * АЮУЛГҮЙ БАЙДЛЫН ГОЛ ЗАРЧИМ — "хэрэглэгч байгаа эсэхийг ИЛЧЛЭХГҮЙ":
 * дугаар бүртгэлтэй ч бай, үгүй ч бай хариу ЯГ ИЖИЛ буцна. Эс бөгөөс хэн ч
 * бай энэ маягтаар дамжуулан "аль дугаарууд манай системд байдаг вэ" гэдгийг
 * бөөнөөр нь шалгаж чадна (user enumeration). Тиймээс:
 *   - маскийг өгөгдлийн сангаас БИШ, хэрэглэгчийн бичсэн мөрөөс гаргана
 *   - хурдны хязгаар давсан ч, хэрэглэгч олдоогүй ч ижил хариу өгнө
 *   - SMS илгээхэд алдаа гарсныг дуудагчид дамжуулахгүй (лог руу л бичнэ)
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
    private audit: AuditService,
  ) {}

  /**
   * Кодыг хэшлэх нууц түлхүүр. Тусад нь RESET_TOKEN_SECRET өгвөл түүнийг,
   * үгүй бол JWT_SECRET-ийг ашиглана (JWT_SECRET нь заавал тохируулагдсан
   * байхыг сервер асахдаа шалгадаг тул хоосон байх боломжгүй).
   */
  private get secret(): string {
    return process.env.RESET_TOKEN_SECRET?.trim() || requireJwtSecret();
  }

  /** Утас / имэйл / нэвтрэх нэрийн аль нэгээр хэрэглэгч хайна */
  private async findUser(identifier: string) {
    const trimmed = identifier.trim();
    if (!trimmed) return null;
    const national = toNationalMn(trimmed);

    return this.prisma.user.findFirst({
      where: {
        OR: [
          ...(national ? [{ phone: national }] : []),
          { email: trimmed },
          { username: trimmed },
        ],
      },
      select: { id: true, phone: true, role: true },
    });
  }

  /**
   * Сэргээх код хүсэх. Хариу нь бүртгэл байгаа эсэхээс ҮЛ ХАМААРЧ ижил.
   */
  async request(
    identifier: string,
    ip?: string,
  ): Promise<{ maskedTo: string; expiresInSeconds: number }> {
    // Энэ шалгалт хэрэглэгчээс хамаарахгүй, системийн төлөв тул илчлэл болохгүй.
    if (!this.sms.isConfigured()) {
      throw new ServiceUnavailableException(
        'SMS үйлчилгээ одоогоор тохируулагдаагүй байна. Сургалтын төвтэй холбогдоно уу.',
      );
    }

    const maskedTo = maskIdentifier(identifier);
    const generic = {
      maskedTo,
      expiresInSeconds: Math.floor(CODE_TTL_MS / 1000),
    };

    const user = await this.findUser(identifier);
    // Бүртгэл олдсонгүй, эсвэл утасгүй (SMS явуулах газаргүй) — чимээгүй зогсоно.
    if (!user?.phone) return generic;

    await this.issue(user.id, user.phone, ip);
    return generic;
  }

  /**
   * Кодыг ҮНЭХЭЭР үүсгээд илгээх цөм хэсэг.
   *
   * Тусад нь салгасан шалтгаан: нийтийн `request()` нь илчлэлээс сэргийлж
   * ҮРГЭЛЖ амжилттай мэт хариу өгөх ёстой, харин ажилтны `sendForUser()` нь
   * эсрэгээрээ бодит үр дүнг мэдэх ёстой (эс бөгөөс багш "илгээгдлээ" гэж
   * итгээд хүлээсээр байна). Тиймээс цөм нь ТӨЛӨВ буцааж, дуудагч бүр
   * өөрийнхөөрөө шийднэ.
   */
  private async issue(
    userId: string,
    phone: string,
    ip?: string,
  ): Promise<'SENT' | 'RATE_LIMITED' | 'SEND_FAILED'> {
    // Хурдны хязгаар: нэг хэрэглэгч цонхонд хэдэн удаа код хүсэж болох.
    // ThrottlerGuard нь IP-гээр хамгаалдаг бол энэ нь БҮРТГЭЛЭЭР хамгаална —
    // өөр өөр IP-гээс нэг хүнийг SMS-ээр цэглэхээс сэргийлнэ.
    const since = new Date(Date.now() - REQUEST_WINDOW_MS);
    const recent = await this.prisma.passwordResetToken.count({
      where: { userId, createdAt: { gte: since } },
    });
    if (recent >= MAX_REQUESTS_PER_WINDOW) {
      this.logger.warn(
        `Нууц үг сэргээх хүсэлтийн хязгаар давсан: userId=${userId} ip=${ip ?? '?'}`,
      );
      return 'RATE_LIMITED';
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    // Өмнөх кодуудыг үхүүлнэ: нэг үед ЗӨВХӨН НЭГ идэвхтэй код байх ёстой.
    // Эс бөгөөс хэд хэдэн удаа код хүсээд, бүгдийг нь зэрэг турших боломж
    // үүсч, оролдлогын хязгаар утгагүй болно.
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId,
          codeHash: hashCode(code, this.secret),
          channel: 'SMS',
          sentToMasked: maskPhone(phone),
          expiresAt,
          requestIp: ip ?? null,
        },
      }),
    ]);

    const minutes = Math.round(CODE_TTL_MS / 60000);

    // SMS илгээх мессеж — КОДЫГ ХЭРЭЭНЭЭ ХАДГАЛАХГҮЙ. Зөвхөн "код илгээсэн"
    // гэсэн мэдэгдэл. Нууцлалын улмаас өгөгдлийн сан ялгарсан ч кодыг дахин
    // сэргээж сая хүрэхгүй.
    const message = `Шинэ Ирээдүйн Эзэд: нууц үг сэргээх код хүлээлгэе. ${minutes} мин дотор ашиглана уу. Зөвхөн өөрийнхөө утас!`;

    try {
      // НУУЦЛАЛ: password-reset мессеж бол кодгүй илгээнэ (sendAndLog нь body-д кодыг орохгүй)
      await this.sms.sendAndLog(
        phone,
        message,
        userId, // createdByUserId: өөрөө хүсэлт үнэ болсон хэрэглэгч
        'PASSWORD_RESET',
        undefined,
        userId, // userId: сэргээх хүсэлт ирсэн хэрэглэгч
      );
      return 'SENT';
    } catch (err) {
      // Нийтийн урсгалд алдааг дамжуулахгүй — "энэ дугаар руу илгээж чадсангүй"
      // гэдэг нь өөрөө бүртгэл байгааг илчилнэ. Лог руу чанга бичнэ.
      this.logger.error(
        `SMS илгээх амжилтгүй: userId=${userId} — ${err instanceof Error ? err.message : String(err)}`,
      );
      return 'SEND_FAILED';
    }
  }

  /**
   * Кодыг шалгаж нууц үгийг солино.
   *
   * Бүх бүтэлгүй тохиолдолд ЯГ ИЖИЛ мессеж буцна — "код буруу" эсвэл "хугацаа
   * дууссан" гэж ялгавал халдагч аль үе шатанд байгаагаа мэдэх болно.
   */
  async reset(
    identifier: string,
    code: string,
    newPassword: string,
  ): Promise<{ reset: true }> {
    const fail = () =>
      new BadRequestException(
        'Код буруу эсвэл хугацаа нь дууссан байна. Шинээр код хүснэ үү.',
      );

    const user = await this.findUser(identifier);
    if (!user) throw fail();

    const token = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!token || !isTokenUsable(token, new Date())) throw fail();

    if (!safeEqualHex(token.codeHash, hashCode(code, this.secret))) {
      // Буруу оролдлогыг тоолно — хязгаарт хүрмэгц код бүрмөсөн үхнэ.
      await this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      throw fail();
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          // Энэ мөчөөс ӨМНӨ олгогдсон бүх JWT хүчингүй болно — өөрөөр хэлбэл
          // халдагчийн хулгайлсан сесс автоматаар тасарна.
          passwordChangedAt: now,
          mustChangePassword: false,
        },
      }),
      // Ашигласан кодыг хаана + үлдсэн бүх кодыг мөн хаана.
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      }),
    ]);

    // Аудит: хэн, хэзээ сэргээснийг мөрдөх боломжтой байх ёстой. Кодыг ч,
    // нууц үгийг ч бичихгүй (AuditService нь "password"-той түлхүүрийг
    // автоматаар цэвэрлэдэг ч энд огт дамжуулахгүй байх нь илүү найдвартай).
    await this.audit.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: user.id,
      reason: `Утсаар ирсэн кодоор сэргээв (${token.sentToMasked})`,
    });

    return { reset: true };
  }

  /**
   * Ажилтан (Админ/Багш+) сурагчийн өмнөөс код илгээх.
   *
   * `request()`-ээс ялгаатай нь энд бүртгэл БАЙХГҮЙ бол шууд алдаа өгнө —
   * дуудагч нь аль хэдийн нэвтэрсэн, эрхтэй ажилтан тул илчлэлийн эрсдэлгүй,
   * харин "илгээгдлээ" гэж хуурах нь эргээд ажилтныг төөрөгдүүлнэ.
   */
  async sendForUser(
    targetUserId: string,
    actor: { userId: string; role: string },
  ): Promise<{ maskedTo: string }> {
    if (!this.sms.isConfigured()) {
      throw new ServiceUnavailableException(
        'SMS үйлчилгээ тохируулагдаагүй байна.',
      );
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, phone: true },
    });
    if (!target) throw new BadRequestException('Хэрэглэгч олдсонгүй');
    if (!target.phone) {
      throw new BadRequestException(
        'Энэ хэрэглэгчид утасны дугаар бүртгэгдээгүй тул SMS илгээх боломжгүй',
      );
    }

    const outcome = await this.issue(target.id, target.phone);
    if (outcome === 'RATE_LIMITED') {
      throw new BadRequestException(
        'Энэ хэрэглэгчид сүүлийн 15 минутад аль хэдийн 3 код илгээсэн байна. Түр хүлээгээд дахин оролдоно уу.',
      );
    }
    if (outcome === 'SEND_FAILED') {
      throw new ServiceUnavailableException(
        'SMS илгээхэд алдаа гарлаа. Дугаарыг шалгаад дахин оролдоно уу.',
      );
    }

    await this.audit.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'PASSWORD_RESET_SENT',
      entity: 'User',
      entityId: target.id,
      reason: 'Ажилтан сэргээх код илгээв',
    });

    return { maskedTo: maskPhone(target.phone) };
  }
}
