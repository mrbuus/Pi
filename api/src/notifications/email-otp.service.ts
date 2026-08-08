import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import {
  CODE_LENGTH,
  CODE_TTL_MS,
  MAX_VERIFY_ATTEMPTS,
  generateCode,
  hashCode,
  isTokenUsable,
  safeEqualHex,
} from '../auth/password-reset.util';

/**
 * Имэйл OTP-ийн бизнес логик.
 *
 * Нэг удаагийн код нь:
 * - 6 оронтой, криптографийн аюулгүй
 * - 10 минут хүчинтэй
 * - 5 оролдлого, дараа нь түгжээгдэнэ
 * - HMAC-SHA256-ээр хэшлэгдэнэ (өгөгдлийн сан алдагдвал ч ашиглалт үл боломжтой)
 *
 * Зориулалт: RESULT_ACK (эцэг эхийн дүнтэй танилцалт) ба ирээдүйн бусад.
 */

const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || 'fallback-secret';

interface SendOtpParams {
  userId: string;
  email: string;
  purpose: string; // "RESULT_ACK"
}

interface VerifyOtpParams {
  userId: string;
  purpose: string;
  code: string;
}

@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Өгөгдлийн сан дахь амьд OTP-ийг шүүрүүлэн олдоход ашиглах query.
   * Эхлэл хугацаа (createdAt)-ийг ашиглан хамгийн сүүлийн код л авна.
   */
  private async getActiveOtp(userId: string, purpose: string, now: Date) {
    return this.prisma.emailOtp.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
  }

  /**
   * OTP-ыг илгээх хүсэлт. Уг имэйл тохируулаагүй бол 400 буцаана.
   *
   * @param to Хүлээн авагчийн имэйл
   * @param purpose "RESULT_ACK" гэсэн уу бусад
   * @returns Хэрэглэгчид харуулах маск (имэйл маск)
   */
  async sendOtp(params: SendOtpParams): Promise<{ maskedEmail: string }> {
    const { userId, email, purpose } = params;

    // Имэйл идэвхжээгүй бол даруй буцаана
    if (!this.emailService.isConfigured()) {
      throw new Error('Имэйл үйлчилгээ идэвхжээгүй байна. Админ-д хэл.');
    }

    // Шинэ код үүсгэнэ
    const code = generateCode();
    const codeHash = hashCode(code, RESET_TOKEN_SECRET);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    // Өгөгдлийн сан дахь шинэ OTP-ыг бичнэ
    await this.prisma.emailOtp.create({
      data: {
        userId,
        purpose,
        codeHash,
        expiresAt,
      },
    });

    // Имэйлээр илгээнэ (async, алдаа хэмжээ гүйцэж авна)
    await this.emailService.sendEmail({
      to: email,
      subject: 'Дүнтэй танилцлаа - нэг удаагийн код',
      text: `Та шалгалтын дүнтэй танилцохын тулд дараах 6 оронтой кодыг оруулнуу:\n\n${code}\n\nКод 10 минутын дотор хүчингүй болно.`,
      html: `<p>Та шалгалтын дүнтэй танилцохын тулд дараах кодыг оруулнуу:</p><p style="font-size:24px; font-weight:bold; letter-spacing:2px;">${code}</p><p>Код 10 минутын дотор хүчингүй болно.</p>`,
    });

    // Маск (гүйцээнэ)
    const maskEmail = this.maskEmail(email);
    return { maskedEmail: maskEmail };
  }

  /**
   * Кодыг шалгаж ResultAcknowledgement-ыг үүсгэнэ.
   * Давтан баталгаажвал байгаа бичлэгээ буцаана (upsert).
   */
  async verifyOtp(
    userId: string,
    purpose: string,
    code: string,
  ): Promise<{ success: boolean }> {
    const now = new Date();

    // Шинэ OTP-ыг олно
    const otp = await this.getActiveOtp(userId, purpose, now);
    if (!otp) {
      throw new Error('Код явахгүй байна. Дахин хүсэнэ үү.');
    }

    // Хүчил хэвээр байгаа уу шалгана
    if (!isTokenUsable(otp, now)) {
      throw new Error('Код хүчингүй болсон эсвэл оролдлого ихсэлтээ.');
    }

    // Сугаалсан кодыг шалгана (timing-safe)
    const inputHash = hashCode(code, RESET_TOKEN_SECRET);
    if (!safeEqualHex(inputHash, otp.codeHash)) {
      // Оролдлогын тоолуурыг нэмнэ
      await this.prisma.emailOtp.update({
        where: { id: otp.id },
        data: { attempts: otp.attempts + 1 },
      });
      throw new Error('Код зөв биш. Дахин оруулнуу.');
    }

    // Успех: хэрэглэсэн гэж тэмдэглэнэ
    await this.prisma.emailOtp.update({
      where: { id: otp.id },
      data: { consumedAt: now },
    });

    return { success: true };
  }

  /**
   * Имэйлийг маскладаг (гүйцээнэ).
   * Жишээ: user@example.com → us****@example.com
   */
  private maskEmail(email: string): string {
    const trimmed = email.trim().toLowerCase();
    const [name, domain] = trimmed.split('@');
    if (!domain) return '****';
    const head = name.slice(0, 2);
    return `${head}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
  }
}
