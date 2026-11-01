import { Injectable, Logger } from '@nestjs/common';
import { JWT } from 'google-auth-library';

/* ============================================================================
 * Push мэдэгдэл илгээгч (FCM HTTP v1) — интерфейсийн ард.
 *
 * Эзэн Firebase төсөл үүсгээгүй үед (env дутуу) илгээгч НЭ-ҮЙЛДЭЛГҮЙ (no-op):
 * алдаа шидэхгүй, `{ sent: 0, skipped: true }` буцаана. Ингэснээр мэдэгдлийн
 * бусад суваг (апп доторх, SMS) push-аас хамааралгүй ажиллана.
 *
 * Env: FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY (service account-ийн
 * private_key; мөр шилжилтийг `\n` гэж бичиж болно). Шинэ npm сан шаардахгүй —
 * google-auth-library аль хэдийн бий.
 * ========================================================================== */

export const PUSH_SENDER = Symbol('PUSH_SENDER');

export interface PushMessage {
  title: string;
  body: string;
  /** Апп дотор нээх зам гэх мэт — FCM data нь зөвхөн string утгатай */
  data?: Record<string, string>;
}

export interface PushSendResult {
  sent: number;
  /** FCM «бүртгэлгүй/хүчингүй» гэсэн токенууд — дуудагч revokedAt тавина */
  invalidTokens: string[];
  skipped: boolean;
}

export interface PushSender {
  isEnabled(): boolean;
  send(tokens: string[], message: PushMessage): Promise<PushSendResult>;
}

interface FcmConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function readFcmConfig(env: NodeJS.ProcessEnv = process.env): FcmConfig | null {
  const projectId = env.FCM_PROJECT_ID?.trim();
  const clientEmail = env.FCM_CLIENT_EMAIL?.trim();
  const privateKey = env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

@Injectable()
export class FcmPushSender implements PushSender {
  private readonly logger = new Logger(FcmPushSender.name);
  private readonly config = readFcmConfig();
  private client: JWT | null = null;

  isEnabled(): boolean {
    return this.config !== null;
  }

  async send(tokens: string[], message: PushMessage): Promise<PushSendResult> {
    if (!this.config || tokens.length === 0) {
      return { sent: 0, invalidTokens: [], skipped: !this.config };
    }
    const accessToken = await this.accessToken();
    if (!accessToken) return { sent: 0, invalidTokens: [], skipped: true };

    const url = `https://fcm.googleapis.com/v1/projects/${this.config.projectId}/messages:send`;
    let sent = 0;
    const invalidTokens: string[] = [];
    for (const token of tokens) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: message.title, body: message.body },
              data: message.data ?? {},
            },
          }),
        });
        if (res.ok) {
          sent += 1;
        } else if (res.status === 404 || res.status === 400) {
          // UNREGISTERED / INVALID_ARGUMENT — апп устгагдсан эсвэл токен хуучирсан
          const body = await res.text();
          if (/UNREGISTERED|registration-token-not-registered|INVALID_ARGUMENT/.test(body))
            invalidTokens.push(token);
        } else {
          this.logger.warn(`FCM илгээлт амжилтгүй: HTTP ${res.status}`);
        }
      } catch (e) {
        this.logger.warn(`FCM холболтын алдаа: ${e instanceof Error ? e.message : e}`);
      }
    }
    return { sent, invalidTokens, skipped: false };
  }

  private async accessToken(): Promise<string | null> {
    if (!this.config) return null;
    try {
      this.client ??= new JWT({
        email: this.config.clientEmail,
        key: this.config.privateKey,
        scopes: [FCM_SCOPE],
      });
      const { token } = await this.client.getAccessToken();
      return token ?? null;
    } catch (e) {
      this.logger.error(`FCM токен авч чадсангүй: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }
}
