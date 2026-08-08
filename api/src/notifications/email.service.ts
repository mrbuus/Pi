import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Имэйл илгээх үйлчилгээ — SMTP серверээр дамжуулан хүлээн авагчид хүргүүлнэ.
 *
 * Яагаад өөр үйлчилгээ үүсгэсэн:
 * SMS-тай адилаар имэйл нь ӨМНӨХ тооцоо өлтөрөгчийн ялгаатай үйлчилгээ —
 * SMTP сервер (gmail, company server, external provider) нь сонгогддог.
 * Нууц үг сэргээх, мэдэгдэл ЛОГИК өөрчлөгдөх ёсгүй. Тиймээс энд ганц il
 * интерфэйс үлдээж, серверийг ОРЧНЫ ХУВЬСАГЧААР сольдог болгов.
 *
 * Тохиргоо (Render → Environment):
 *   EMAIL_SMTP_HOST    — SMTP хост (жишээ: smtp.gmail.com)
 *   EMAIL_SMTP_PORT    — SMTP портын дугаар (465 эсвэл 587)
 *   EMAIL_SMTP_USER    — SMTP өгөлтийн нэр
 *   EMAIL_SMTP_PASS    — SMTP пасс (gmail-д App Password ашигла)
 *   EMAIL_FROM         — Илгээгчийн хаяг + нэр ("Шинэ ирээдүйн эзэд <noreply@...>")
 *
 * SPAM PREVENTION:
 * - Plain text болон энгийн HTML байдаар явуул (маркетингийн үг үгүй)
 * - Subject товч, ойлгомжтой
 * - From нэр тодорхой ("Шинэ ирээдүйн эзэд" гэсэн байх, огт анахлын үг үгүй)
 * - Олон линк, зураг, эффект үгүй (өндөр SPAM оноо авна)
 */

interface SendEmailParams {
  to: string; // Хүлээн авагчийн имэйл хаяг
  subject: string; // Гарчиг (товч, өөрөг үг үгүй)
  text: string; // Plain text хувилбар (ЗААВАЛ байх)
  html?: string; // HTML хувилбар (сонгогдох, энгийн байх)
}

/** Нийлүүлэгч хариу өгөхгүй байвал хүсэлт мөнхөд өлгөгдөхөөс сэргийлнэ */
const SEND_TIMEOUT_MS = 10_000;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * SMTP транспортыг дүнгэлж шалгах. Байхгүй бол null үлдэнэ.
   * Энэ нь ажилуулахдаа АШИГЛАГДДАГГҮЙ — үйлчилгээ ажилладаг үед л шалгадаг
   * (isConfigured() буцаах үед).
   */
  private initializeTransporter(): void {
    const host = process.env.EMAIL_SMTP_HOST?.trim();
    const portRaw = process.env.EMAIL_SMTP_PORT?.trim();
    const user = process.env.EMAIL_SMTP_USER?.trim();
    const pass = process.env.EMAIL_SMTP_PASS?.trim();

    // Заавал байх хувьсагч дутуу бол үйлчилгээ тохируулаагүй гэж үзнэ
    if (!host || !portRaw || !user || !pass) {
      this.logger.warn(
        'EMAIL_SMTP_* хувьсагчууд дутуу → имэйл үйлчилгээ идэвхгүй байна',
      );
      return;
    }

    const port = parseInt(portRaw, 10);
    if (isNaN(port)) {
      this.logger.error(`EMAIL_SMTP_PORT-ийн утга сохи биш: ${portRaw}`);
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // SSL-д 465, TLS-д 587
        auth: { user, pass },
      });
      this.logger.debug(`SMTP транспорт дүнгэлсэн: ${host}:${port}`);
    } catch (err) {
      this.logger.error(`SMTP транспорт үүсгэлт амжилтгүй: ${err}`);
    }
  }

  /**
   * Имэйл илгээх боломжтой эсэх. Үйлчилгээ БҮРЭН тохируулагдсан байх ёстой.
   * Байхгүй бол дуудагч дүндүн мөрдөлгүүний оронд хэрэглэгчид ОЙЛГОМЖТОЙ
   * мессеж өгнө ("Имэйл сервис идэвхжээгүй байна" гэсэн үг).
   */
  isConfigured(): boolean {
    return this.transporter !== null && Boolean(process.env.EMAIL_FROM);
  }

  /**
   * Имэйл илгээнэ. Тохируулаагүй бол дуугүй алгасна (үйлчилгээ танахгүй).
   *
   * SPAM PREVENTION:
   * - Plain text болон HTML хоёулаа явуул (imei ба HTML дээр уншихад хүнтэй)
   * - HTML-д inline CSS ашигла, зөвхөн үндсэн стиль (жишээ: bold, цэвэр ёж)
   * - Зураг, flash, script үгүй
   * - Линк муу байж болох тул боломжоор цөөн байх (зөвхөн үхлийн үйл явдлын линк)
   *
   * @param params Гүйцээлтийн дэлгэрэнгүй (to, subject, text, html?)
   * @throws Error SMTP сервер алдаа (дуудагч гүйцэж авна)
   */
  async sendEmail(params: SendEmailParams): Promise<void> {
    // Тохируулаагүй бол дуугүй алгасна — хэрэглэгчид "имэйл идэвхжээгүй" гэж
    // харуулсан бол сервис үйлдэл хийхгүй (мөнхөд хүлээлтээ сэргийлнэ)
    if (!this.isConfigured()) {
      this.logger.warn(
        `Имэйл үйлчилгээ идэвхжээгүй байна; ${params.to} уг иммэйл явахгүй`,
      );
      return;
    }

    const { to, subject, text, html } = params;

    try {
      // Timeout үүсгэх — SMTP сервер хариугүй бол сүйтэнэ
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(`SMTP сервер ${SEND_TIMEOUT_MS}мс дотор хариу өгөөгүй`),
            ),
          SEND_TIMEOUT_MS,
        );
      });

      // Имэйлийн мета (From - анахлын нэр ба хаяг хавсаргасан)
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to: to.trim(),
        subject: subject.trim(),
        text: text.trim(),
        ...(html && { html: html.trim() }), // HTML сонгогдох
      };

      // Илгээлтийг хүлээх (timeout-тай)
      await Promise.race([
        this.transporter!.sendMail(mailOptions),
        timeoutPromise,
      ]);

      this.logger.debug(
        `Имэйл амжилттай илгээгдсэн: ${to} (гарчиг: "${subject}")`,
      );
    } catch (err) {
      // Алдаа бүрэлсэн — дуудагч гүйцэж авна (нуугүй)
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Имэйл илгээлт амжилтгүй: ${to} → ${errorMessage}`,
      );
      throw err;
    }
  }
}
