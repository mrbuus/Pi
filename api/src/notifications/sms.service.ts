import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toE164Mn } from './phone';
import { calculateSmsSegments } from './sms-segments';

/**
 * SMS илгээх давхарга — НИЙЛҮҮЛЭГЧЭЭС ХАРААТ БУС.
 *
 * Яагаад адаптер болгосон бэ: Монгол руу SMS илгээх арга нэг биш — Twilio
 * (+976 дэмждэг) эсвэл дотоодын агрегатор (Mobicom/Unitel/Skytel-тэй шууд
 * холбогддог) байж болно. Аль нийлүүлэгчийг сонгохоос үл хамааран нууц үг
 * сэргээх ЛОГИК өөрчлөгдөх ёсгүй. Тиймээс энд ганц `send()` интерфэйс үлдээж,
 * нийлүүлэгчийг зөвхөн ОРЧНЫ ХУВЬСАГЧААР сольдог болгов — код дахин бичихгүйгээр
 * нийлүүлэгч солих боломжтой.
 *
 * Тохиргоо (Render → Environment):
 *   SMS_PROVIDER = console | twilio | http
 *
 *   twilio:  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 *   http:    SMS_HTTP_URL       — {to} ба {text} орлуулагчтай бүтэн URL
 *            SMS_HTTP_METHOD    — GET (өгөгдмөл) эсвэл POST
 *            SMS_HTTP_HEADERS   — JSON объект, жишээ: {"Authorization":"Bearer x"}
 *            SMS_HTTP_BODY      — POST үед бие, {to}/{text} орлуулагчтай
 *
 * `console` нь ЗӨВХӨН хөгжүүлэлтэд: кодыг лог руу хэвлэнэ, хаашаа ч илгээхгүй.
 */

/** Нийлүүлэгч хариу өгөхгүй байвал хүсэлт мөнхөд өлгөгдөхөөс сэргийлнэ */
const SEND_TIMEOUT_MS = 10_000;

export type SmsProviderKind = 'console' | 'twilio' | 'http';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private prisma: PrismaService) {}

  private get provider(): SmsProviderKind | null {
    const raw = process.env.SMS_PROVIDER?.trim().toLowerCase();
    if (raw === 'twilio' || raw === 'http' || raw === 'console') return raw;
    // Тохируулаагүй бол: хөгжүүлэлтэд console-оор ажиллана (кодыг лог дээр
    // харна), продакшнд ОГТ ажиллахгүй — дуугүй "илгээлээ" гэж хуурахаас
    // илүү шударга.
    return process.env.NODE_ENV === 'production' ? null : 'console';
  }

  /** SMS илгээх боломжтой эсэх. Байхгүй бол дуудагч хэрэглэгчид үнэнийг хэлнэ. */
  isConfigured(): boolean {
    const kind = this.provider;
    if (kind === null) return false;
    if (kind === 'console') return true;
    if (kind === 'twilio') {
      return Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
          process.env.TWILIO_AUTH_TOKEN &&
          process.env.TWILIO_FROM,
      );
    }
    return Boolean(process.env.SMS_HTTP_URL);
  }

  /**
   * SMS илгээнэ. Амжилтгүй бол throw хийнэ — дуудагч нь ерөнхий мессеж рүү
   * хөрвүүлэх үүрэгтэй (хэрэглэгч байгаа эсэхийг илчлэхгүйн тулд).
   */










  /**
   * Орлуулагчийг нээх
   */
  private extractVariables(text: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...text.matchAll(regex)];
    return [...new Set(matches.map((m) => m[1]))];
  }

  /**
   * Нэг SMS явуулах (приват)
   */
  private async sendSingle(toRaw: string, text: string): Promise<void> {
    const to = toE164Mn(toRaw);
    if (!to) throw new Error(`Утасны дугаар танигдсангүй: ${toRaw}`);

    const kind = this.provider;
    if (kind === null) throw new Error('SMS_PROVIDER тохируулаагүй байна');

    switch (kind) {
      case 'console':
        // ⚠️ Зөвхөн хөгжүүлэлт. Бодит текстийг лог руу хэвлэнэ.
        this.logger.warn(`[SMS:console] ${to} ← ${text}`);
        return;
      case 'twilio':
        return this.sendViaTwilio(to, text);
      case 'http':
        return this.sendViaHttp(to, text);
    }
  }

  /**
   * SMS илгээж, үндсэнд нь SmsMessage мөр үүсгэнэ. Эгүүлэх урсгалд
   * (нууц үг сэргээх, явуулалт гэх мэт) ашигладаг.
   *
   * НУУЦЛАЛ (PASSWORD_RESET): Мессежийн body-д кодыг ХАДГАЛАХГҮЙ.
   * Зөвхөн "код илгээсэн" гэсэн үйл явдлыг бүртгэнэ.
   *
   * @param toPhone Үндэсний дугаар ("99112233") эсвэл E.164 ("+97699112233")
   * @param text SMS мессеж (кодгүй!)
   * @param createdByUserId Илгээгч ажилтны ID (админ/багш+)
   * @param kind SmsKind (PASSWORD_RESET, ANNOUNCEMENT гэх мэт)
   * @param templateId Хэрэглэсэн template-ы ID (сонгогдох)
   *
   * @throws Error уг нийлүүлэгчийн алдаа
   *
   * @returns SmsMessage-ын ID + metadata
   */
  async sendAndLog(
    toPhone: string,
    text: string,
    createdByUserId: string,
    kind: 'PASSWORD_RESET' | 'ANNOUNCEMENT' | 'PAYMENT_REMINDER' | 'ATTENDANCE' | 'EXAM' | 'MANUAL' | 'OTHER' = 'MANUAL',
    templateId?: string,
    userId?: string, // сурагч эсвэл хүлээн авагчийн ID (сонгогдох)
  ): Promise<{
    messageId: string;
    phone: string;
    segments: number;
    status: 'QUEUED' | 'SENT' | 'FAILED';
  }> {
    const national = toE164Mn(toPhone);
    if (!national) throw new Error(`Утасны дугаар танигдсангүй: ${toPhone}`);

    const segments = calculateSmsSegments(text);

    // Мөрийг үүсгэнэ, статус QUEUED эхэлнэ
    const message = await this.prisma.smsMessage.create({
      data: {
        toPhone: national,
        body: text,
        status: 'QUEUED',
        kind,
        segments,
        userId: userId ?? null,
        templateId: templateId ?? null,
        createdById: createdByUserId,
      },
    });

    // Нийлүүлэгчээр илгээхийг оролддог
    let sendStatus: 'SENT' | 'FAILED' = 'FAILED';
    let errorMsg: string | null = null;

    try {
      // Нийлүүлэгчийн API-г шууд дуудаж (send() дуудахгүй)
      const kind = this.provider;
      if (kind === null) throw new Error('SMS_PROVIDER тохируулаагүй байна');

      switch (kind) {
        case 'console':
          this.logger.warn(`[SMS:console] ${national} ← ${text}`);
          break;
        case 'twilio':
          await this.sendViaTwilio(national, text);
          break;
        case 'http':
          await this.sendViaHttp(national, text);
          break;
      }

      sendStatus = 'SENT';

      // SmsMessage-г SENT руу өөрчилнө
      await this.prisma.smsMessage.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      this.logger.log(`SMS ilgeegdsen: id=${message.id} to=${national}`);
    } catch (err) {
      sendStatus = 'FAILED';
      errorMsg = err instanceof Error ? err.message : String(err);

      // FAILED-т оруулна + алдаа бичнэ
      await this.prisma.smsMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          error: errorMsg.slice(0, 500),
        },
      });

      this.logger.error(`SMS aldaa: id=${message.id} to=${national} — ${errorMsg}`);
      throw err;
    }

    return {
      messageId: message.id,
      phone: national,
      segments,
      status: sendStatus,
    };
  }

  private async sendViaTwilio(to: string, text: string): Promise<void> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) {
      throw new Error('Twilio-ийн тохиргоо дутуу (SID/TOKEN/FROM)');
    }

    // Twilio-ийн REST API-г ШУУД дуудна — SDK нэмэх шаардлагагүй, ингэснээр
    // хамаарлын жин болон нийлүүлэгчид "гинжлэгдэх" эрсдэл нэмэгдэхгүй.
    const body = new URLSearchParams({ To: to, From: from, Body: text });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Twilio алдаа ${res.status}: ${detail.slice(0, 300)}`);
    }
  }

  private async sendViaHttp(to: string, text: string): Promise<void> {
    const urlTemplate = process.env.SMS_HTTP_URL;
    if (!urlTemplate) throw new Error('SMS_HTTP_URL тохируулаагүй байна');

    const method = (process.env.SMS_HTTP_METHOD ?? 'GET').toUpperCase();
    const fill = (template: string) =>
      template
        .replaceAll('{to}', encodeURIComponent(to))
        .replaceAll('{text}', encodeURIComponent(text));

    let headers: Record<string, string> = {};
    if (process.env.SMS_HTTP_HEADERS) {
      try {
        headers = JSON.parse(process.env.SMS_HTTP_HEADERS) as Record<string, string>;
      } catch {
        throw new Error('SMS_HTTP_HEADERS нь хүчинтэй JSON биш байна');
      }
    }

    const res = await fetch(fill(urlTemplate), {
      method,
      headers,
      body:
        method === 'GET' || !process.env.SMS_HTTP_BODY
          ? undefined
          : fill(process.env.SMS_HTTP_BODY),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`SMS нийлүүлэгчийн алдаа ${res.status}: ${detail.slice(0, 300)}`);
    }
  }
}
