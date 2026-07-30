import { Injectable, Logger } from '@nestjs/common';
import { toE164Mn } from './phone';

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
  async send(toRaw: string, text: string): Promise<void> {
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
