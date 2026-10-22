import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { NotifyChannel } from '../generated/prisma/enums';
import { EmailService } from '../notifications/email.service';
import { maskPhone, toNationalMn } from '../notifications/phone';
import { SmsService } from '../notifications/sms.service';
import { PrismaService } from '../prisma/prisma.service';
import { loginAlertEmail, resetLinkEmail } from './auth-emails';
import { requireJwtSecret } from './jwt.strategy';
import { accountAttempts, loginAttempts } from './login-attempts';
import {
  PASSWORD_SAME_AS_PHONE_MESSAGE,
  isSameAsPhone,
  validatePasswordStrength,
} from './password-policy';
import {
  CODE_TTL_MS,
  EMAIL_LINK_TTL_MS,
  MAX_REQUESTS_PER_WINDOW,
  REQUEST_WINDOW_MS,
  generateCode,
  generateLinkToken,
  hashCode,
  isTokenUsable,
  maskEmail,
  maskIdentifier,
  safeEqualHex,
} from './password-reset.util';

/** Нийтийн «нууц үгээ мартсан» хариу — бүртгэл байгаа эсэхээс ҮЛ ХАМААРЧ ижил. */
export interface ForgotPasswordResponse {
  maskedTo: string;
  /** SMS кодын хугацаа (секунд) */
  expiresInSeconds: number;
  /** Имэйл холбоосын хугацаа (секунд) */
  linkExpiresInSeconds: number;
  /** СИСТЕМИЙН тохиргоо (хэрэглэгчийнх биш) — вэб аль замыг тайлбарлахыг шийднэ */
  channels: { sms: boolean; email: boolean };
}

/** Имэйлээр сэргээх/мэдэгдэл илгээхэд хэрэгтэй хэрэглэгчийн хэсэг */
export interface RecoveryUser {
  id: string;
  firstName?: string | null;
  email?: string | null;
  googleIdentity?: { email: string } | null;
}

/** Сэргээх имэйл: бүртгэлийн имэйл, эс бол холбосон Gmail */
export function recoveryEmail(user: RecoveryUser): string | null {
  return user.email?.trim() || user.googleIdentity?.email?.trim() || null;
}

/** Вэбийн хаяг (холбоос үүсгэхэд) — WEB_ORIGIN таслалтай жагсаалтын эхнийх */
function webOrigin(): string {
  return (process.env.WEB_ORIGIN ?? 'http://localhost:3001').split(',')[0].trim().replace(/\/+$/, '');
}

type EmailPurpose = 'RESET' | 'LOGIN_ALERT';

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
    private email: EmailService,
  ) {}

  /**
   * Кодыг хэшлэх нууц түлхүүр. Тусад нь RESET_TOKEN_SECRET өгвөл түүнийг,
   * үгүй бол JWT_SECRET-ийг ашиглана (JWT_SECRET нь заавал тохируулагдсан
   * байхыг сервер асахдаа шалгадаг тул хоосон байх боломжгүй).
   */
  private get secret(): string {
    return process.env.RESET_TOKEN_SECRET?.trim() || requireJwtSecret();
  }

  /**
   * Утас / имэйл / нэвтрэх нэр / холбосон Gmail-ийн аль нэгээр хэрэглэгч хайна.
   * Имэйлийг том жижиг үсэг ялгахгүй (Gmail-д «Bat@Gmail.com» = «bat@gmail.com»).
   */
  private async findUser(identifier: string) {
    const trimmed = identifier.trim();
    if (!trimmed) return null;
    const national = toNationalMn(trimmed);
    const isEmail = trimmed.includes('@');

    return this.prisma.user.findFirst({
      where: {
        OR: [
          ...(national ? [{ phone: national }] : []),
          ...(isEmail
            ? [
                { email: { equals: trimmed, mode: 'insensitive' as const } },
                { googleIdentity: { is: { email: trimmed.toLowerCase() } } },
              ]
            : []),
          { username: trimmed },
        ],
      },
      select: {
        id: true,
        phone: true,
        role: true,
        email: true,
        username: true,
        firstName: true,
        archivedAt: true,
        googleIdentity: { select: { email: true } },
      },
    });
  }

  /**
   * Сэргээх хүсэлт. Хариу нь бүртгэл байгаа эсэхээс ҮЛ ХАМААРЧ ижил.
   *
   * Зам (эзэн 2026-10-22): бүртгэлд имэйл эсвэл холбосон Gmail байвал тэр хаяг
   * руу 30 минутын нэг удаагийн ХОЛБООС; имэйлгүй (зөвхөн утастай) бол хуучин
   * SMS код. Аль аль нь тохируулагдаагүй бол 503 — «төвтэй холбогдоно уу».
   */
  async request(identifier: string, ip?: string): Promise<ForgotPasswordResponse> {
    // Энэ шалгалт хэрэглэгчээс хамаарахгүй, системийн төлөв тул илчлэл болохгүй.
    const channels = {
      sms: this.sms.isConfigured(),
      email: this.email.isConfigured(),
    };
    if (!channels.sms && !channels.email) {
      throw new ServiceUnavailableException(
        'Нууц үг сэргээх үйлчилгээ одоогоор тохируулагдаагүй байна. Сургалтын төвтэй холбогдоно уу.',
      );
    }

    const generic: ForgotPasswordResponse = {
      maskedTo: maskIdentifier(identifier),
      expiresInSeconds: Math.floor(CODE_TTL_MS / 1000),
      linkExpiresInSeconds: Math.floor(EMAIL_LINK_TTL_MS / 1000),
      channels,
    };

    const user = await this.findUser(identifier);
    // Бүртгэл олдсонгүй / архивлагдсан — чимээгүй зогсоно (хариу ижил).
    if (!user || user.archivedAt) return generic;

    const to = recoveryEmail(user);
    if (channels.email && to) {
      await this.issueEmailLink(user, to, 'RESET', ip);
    } else if (channels.sms && user.phone) {
      await this.issue(user.id, user.phone, ip);
    }
    return generic;
  }

  /**
   * «3 удаа буруу нууц үг» мэдэгдэл (эзэн 2026-10-22). AuthService.login нэг
   * түгжээний цонхонд НЭГ л удаа дуудна (accountAttempts.claimAlert). Имэйлгүй
   * эсвэл имэйл тохируулаагүй бол чимээгүй алгасна.
   */
  async sendLoginAlert(user: RecoveryUser): Promise<'SENT' | 'RATE_LIMITED' | 'SKIPPED'> {
    const to = recoveryEmail(user);
    if (!to || !this.email.isConfigured()) return 'SKIPPED';
    return this.issueEmailLink(user, to, 'LOGIN_ALERT');
  }

  /**
   * Имэйлээр нэг удаагийн сэргээх холбоос үүсгэж илгээнэ. ӨС-д зөвхөн HMAC хэш.
   * Илгээлтийг ХҮЛЭЭХГҮЙ: SMTP-ийн 1–3 секундийн саатал нь «энэ дугаар
   * бүртгэлтэй» гэдгийг хариуны хугацаагаар илчилнэ. Алдааг лог руу л бичнэ
   * (хаяг, токеныг бичихгүй).
   */
  private async issueEmailLink(
    user: RecoveryUser,
    to: string,
    purpose: EmailPurpose,
    ip?: string,
  ): Promise<'SENT' | 'RATE_LIMITED'> {
    const now = Date.now();
    const recent = await this.prisma.passwordResetToken.count({
      where: {
        userId: user.id,
        channel: NotifyChannel.EMAIL,
        createdAt: { gte: new Date(now - REQUEST_WINDOW_MS) },
      },
    });
    if (recent >= MAX_REQUESTS_PER_WINDOW) {
      this.logger.warn(
        `Сэргээх имэйлийн хязгаар давсан: userId=${user.id} ip=${ip ?? '?'}`,
      );
      return 'RATE_LIMITED';
    }

    const token = generateLinkToken();
    // Нэг үед нэг л идэвхтэй ИМЭЙЛ холбоос. SMS кодыг хөндөхгүй (өөр суваг).
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, channel: NotifyChannel.EMAIL, consumedAt: null },
        data: { consumedAt: new Date(now) },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          codeHash: hashCode(token, this.secret),
          channel: NotifyChannel.EMAIL,
          sentToMasked: maskEmail(to),
          expiresAt: new Date(now + EMAIL_LINK_TTL_MS),
          requestIp: ip ?? null,
        },
      }),
    ]);

    // Fragment (#) нь серверт ч, Referer-т ч очдоггүй — токен лог, түүхэнд үлдэхгүй.
    const link = `${webOrigin()}/forgot-password#t=${token}`;
    const minutes = Math.round(EMAIL_LINK_TTL_MS / 60000);
    const mail =
      purpose === 'LOGIN_ALERT'
        ? loginAlertEmail({ firstName: user.firstName, link, minutes })
        : resetLinkEmail({ firstName: user.firstName, link, minutes });
    void this.email
      .sendEmail({ to, ...mail })
      .catch(() =>
        this.logger.error(`Сэргээх имэйл илгээж чадсангүй: userId=${user.id} (${purpose})`),
      );
    return 'SENT';
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
      where: { userId, channel: NotifyChannel.SMS, createdAt: { gte: since } },
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
        where: { userId, channel: NotifyChannel.SMS, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId,
          codeHash: hashCode(code, this.secret),
          channel: NotifyChannel.SMS,
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
      where: { userId: user.id, channel: NotifyChannel.SMS },
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

    // DTO шалгасан ч сервисийн түвшинд давхар хамгаалалт (password-policy.ts)
    this.assertNewPassword(newPassword, user.phone);

    await this.applyNewPassword(user, newPassword);

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
   * Имэйлийн нэг удаагийн холбоосоор нууц үг солих (POST /auth/reset-password/link).
   * Бүх бүтэлгүй тохиолдолд ЯГ ИЖИЛ мессеж. Холбоосыг атомаар (consumedAt=null
   * нөхцөлтэй updateMany) хэрэглэнэ — зэрэг ирсэн хоёр хүсэлтийн зөвхөн нэг нь хүчинтэй.
   */
  async resetWithLink(token: string, newPassword: string): Promise<{ reset: true }> {
    const fail = () =>
      new BadRequestException(
        'Холбоос хүчингүй эсвэл хугацаа нь дууссан байна. Нууц үг сэргээхийг дахин хүснэ үү.',
      );
    if (!token || token.length > 200) throw fail();

    const row = await this.prisma.passwordResetToken.findFirst({
      where: { codeHash: hashCode(token, this.secret), channel: NotifyChannel.EMAIL },
      select: {
        id: true,
        expiresAt: true,
        consumedAt: true,
        attempts: true,
        sentToMasked: true,
        user: {
          select: { id: true, role: true, phone: true, email: true, username: true },
        },
      },
    });
    const now = new Date();
    if (!row || !isTokenUsable(row, now)) throw fail();

    // Сул нууц үг холбоосыг «шатаахгүй» — эхлээд шалгаад дараа нь хэрэглэнэ.
    this.assertNewPassword(newPassword, row.user.phone);

    const consumed = await this.prisma.passwordResetToken.updateMany({
      where: { id: row.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw fail();

    await this.applyNewPassword(row.user, newPassword);
    await this.audit.record({
      actorId: row.user.id,
      actorRole: row.user.role,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: row.user.id,
      reason: `Имэйлээр ирсэн холбоосоор сэргээв (${row.sentToMasked})`,
    });
    return { reset: true };
  }

  private assertNewPassword(newPassword: string, phone: string | null) {
    const weak = validatePasswordStrength(newPassword);
    if (weak) throw new BadRequestException(weak);
    if (isSameAsPhone(newPassword, phone)) {
      throw new BadRequestException(PASSWORD_SAME_AS_PHONE_MESSAGE);
    }
  }

  /** Нууц үгийг сольж, бүх сесс ба идэвхтэй код/холбоосыг хүчингүй болгоно */
  private async applyNewPassword(
    user: { id: string; phone?: string | null; email?: string | null; username?: string | null },
    newPassword: string,
  ) {
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
      // Ашигласан кодыг хаана + үлдсэн бүх код/холбоосыг (хоёр суваг) мөн хаана.
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: now },
      }),
    ]);
    // Шинэ нууц үгтэй хүн «олон удаа буруу» түгжээнд үлдэхгүй.
    for (const id of [user.phone, user.email, user.username]) {
      if (id) loginAttempts.success(id);
    }
    accountAttempts.success(user.id);
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
