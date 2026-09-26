import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { GoogleOAuthPurpose } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

/* ============================================================================
 * Google-ээр нэвтрэх / Google бүртгэл холбох (OAuth 2.0 authorization code).
 *
 * Зарчим (эзний дүрэм + аюулгүй байдал):
 *  1. Google-ээр ШИНЭ бүртгэл ҮҮСГЭХГҮЙ. Сурагчийг төв бүртгэдэг (нууц үг =
 *     утас). Google нь зөвхөн аль хэдийн байгаа бүртгэлд орох нэмэлт хаалга.
 *  2. Холбох 2 зам: (a) нэвтэрсэн хэрэглэгч профайлаасаа «Google холбох»,
 *     (b) хэрэглэгчийн User.email нь Google-ийн баталгаажсан имэйлтэй яг
 *     таарвал анхны нэвтрэлтээр автоматаар холбоно.
 *  3. state ба нэг удаагийн солилцооны кодыг ЗӨВХӨН SHA-256 хэшээр хадгална —
 *     ӨС задарсан ч ашиглах боломжгүй. Хоёулаа богино хугацаатай, нэг удаагийн.
 *  4. JWT-г URL-д ХЭЗЭЭ Ч тавихгүй (браузерын түүх, лог, Referer-ээр задарна).
 *     Callback нь вэб рүү 60 секундийн нэг удаагийн код дамжуулна, вэб түүнийг
 *     POST-оор JWT болгож солино.
 *  5. id_token-ийг Google-ийн token endpoint-оос (TLS) шууд авсан тул OIDC
 *     Core §3.1.3.7-ийн дагуу гарын үсгийг дахин шалгахгүйгээр iss/aud/exp/
 *     email_verified-ийг шалгахад хангалттай. Шинэ npm сан шаардахгүй.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 *      (= https://<api>/api/auth/google/callback), WEB_ORIGIN.
 * Тохируулаагүй бол бүх endpoint 503, вэб товчоо нуудаг (GET /auth/google/config).
 * ========================================================================== */

const STATE_TTL_MS = 10 * 60_000;
const EXCHANGE_TTL_MS = 60_000;
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const VALID_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export interface GoogleClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  picture: string | null;
}

/** id_token-ийн payload-ийг задлаад iss/aud/exp/email-ийг шалгана. */
export function verifyIdTokenClaims(
  idToken: string,
  clientId: string,
  nowSec = Math.floor(Date.now() / 1000),
): GoogleClaims {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new BadRequestException('Google токен буруу');
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new BadRequestException('Google токен буруу');
  }
  const aud = payload.aud;
  const audOk = Array.isArray(aud) ? aud.includes(clientId) : aud === clientId;
  if (!audOk) throw new BadRequestException('Google токен өөр апп-д зориулагдсан');
  if (!VALID_ISSUERS.includes(String(payload.iss))) {
    throw new BadRequestException('Google токены эх сурвалж буруу');
  }
  if (typeof payload.exp !== 'number' || payload.exp < nowSec) {
    throw new BadRequestException('Google токены хугацаа дууссан');
  }
  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new BadRequestException('Google токен буруу');
  }
  if (typeof payload.email !== 'string' || !payload.email) {
    throw new BadRequestException('Google бүртгэлд имэйл алга');
  }
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    picture: typeof payload.picture === 'string' ? payload.picture : null,
  };
}

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  webOrigin: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private config(): GoogleConfig | null {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) return null;
    return {
      clientId,
      clientSecret,
      redirectUri,
      webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3001',
    };
  }

  private requireConfig(): GoogleConfig {
    const cfg = this.config();
    if (!cfg) {
      throw new ServiceUnavailableException('Google нэвтрэлт тохируулагдаагүй байна');
    }
    return cfg;
  }

  isEnabled(): boolean {
    return this.config() !== null;
  }

  /** Google-ийн зөвшөөрлийн хуудасны URL (state-ийг хадгалаад). */
  async authorizationUrl(purpose: GoogleOAuthPurpose, userId?: string): Promise<string> {
    const cfg = this.requireConfig();
    if (purpose === GoogleOAuthPurpose.LINK && !userId) {
      throw new BadRequestException('Холбохын тулд нэвтэрсэн байх шаардлагатай');
    }
    // Хуучирсан мөрүүдийг замдаа цэвэрлэнэ (cron шаардахгүй). Алдаа нь урсгалыг зогсоохгүй.
    this.purgeExpired().catch(() => undefined);
    const state = randomToken();
    await this.prisma.googleOAuthState.create({
      data: {
        stateHash: sha256(state),
        purpose,
        userId: purpose === GoogleOAuthPurpose.LINK ? userId : null,
        expiresAt: new Date(Date.now() + STATE_TTL_MS),
      },
    });
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
      access_type: 'online',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Google-ээс буцаж ирэх. Үр дүнд нь вэб рүү redirect хийх URL-ийг буцаана —
   * алдаа гарсан ч хэрэглэгчийг JSON биш, ойлгомжтой вэб хуудас руу илгээнэ.
   */
  async handleCallback(query: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<string> {
    const cfg = this.requireConfig();
    const web = (path: string, params: Record<string, string>) =>
      `${cfg.webOrigin}${path}?${new URLSearchParams(params).toString()}`;

    if (query.error) return web('/login', { google: 'cancelled' });
    if (!query.code || !query.state) return web('/login', { google: 'error' });

    // state-ийг нэг удаа, атомаар хэрэглэнэ (давхар callback-аас хамгаална).
    const stateRow = await this.prisma.googleOAuthState.findUnique({
      where: { stateHash: sha256(query.state) },
    });
    if (!stateRow || stateRow.consumedAt || stateRow.expiresAt < new Date()) {
      return web('/login', { google: 'expired' });
    }
    const consumed = await this.prisma.googleOAuthState.updateMany({
      where: { id: stateRow.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) return web('/login', { google: 'expired' });

    const failPath = stateRow.purpose === GoogleOAuthPurpose.LINK ? '/app/profile' : '/login';

    let claims: GoogleClaims;
    try {
      claims = await this.exchangeCode(cfg, query.code);
    } catch (e) {
      this.logger.warn(`Google code exchange failed: ${e instanceof Error ? e.message : e}`);
      return web(failPath, { google: 'error' });
    }
    if (!claims.emailVerified) return web(failPath, { google: 'unverified' });

    if (stateRow.purpose === GoogleOAuthPurpose.LINK) {
      const result = await this.link(stateRow.userId!, claims);
      return web('/app/profile', { google: result });
    }

    const userId = await this.resolveLoginUser(claims);
    if (!userId) return web('/login', { google: 'not_linked' });

    const code = randomToken();
    await this.prisma.googleLoginExchange.create({
      data: {
        codeHash: sha256(code),
        userId,
        expiresAt: new Date(Date.now() + EXCHANGE_TTL_MS),
      },
    });
    return web('/auth/google', { code });
  }

  private async exchangeCode(cfg: GoogleConfig, code: string): Promise<GoogleClaims> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) throw new Error(`token endpoint ${res.status}`);
    const body = (await res.json()) as { id_token?: string };
    if (!body.id_token) throw new Error('id_token missing');
    return verifyIdTokenClaims(body.id_token, cfg.clientId);
  }

  /** Нэвтрэх: холбогдсон бол тэр хэрэглэгч; эс бол имэйл таарвал автоматаар холбоно. */
  private async resolveLoginUser(claims: GoogleClaims): Promise<string | null> {
    const identity = await this.prisma.googleIdentity.findUnique({
      where: { googleSubject: claims.sub },
    });
    if (identity) {
      await this.prisma.googleIdentity.update({
        where: { id: identity.id },
        data: { email: claims.email, pictureUrl: claims.picture },
      });
      return identity.userId;
    }
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: claims.email, mode: 'insensitive' } },
      select: { id: true, googleIdentity: { select: { id: true } } },
    });
    // Тухайн хэрэглэгч өөр Google бүртгэлтэй аль хэдийн холбогдсон бол
    // автоматаар солихгүй — профайлаасаа өөрөө солих ёстой.
    if (!user || user.googleIdentity) return null;
    await this.prisma.googleIdentity.create({
      data: { userId: user.id, googleSubject: claims.sub, email: claims.email, pictureUrl: claims.picture },
    });
    return user.id;
  }

  private async link(userId: string, claims: GoogleClaims): Promise<'linked' | 'taken'> {
    const other = await this.prisma.googleIdentity.findUnique({
      where: { googleSubject: claims.sub },
    });
    if (other && other.userId !== userId) return 'taken';
    await this.prisma.googleIdentity.upsert({
      where: { userId },
      create: { userId, googleSubject: claims.sub, email: claims.email, pictureUrl: claims.picture },
      update: { googleSubject: claims.sub, email: claims.email, pictureUrl: claims.picture },
    });
    return 'linked';
  }

  /** Вэб нэг удаагийн кодыг JWT болгож солино. */
  async exchange(code: string) {
    const row = await this.prisma.googleLoginExchange.findUnique({
      where: { codeHash: sha256(code) },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!row || row.consumedAt || row.expiresAt < new Date()) {
      throw new BadRequestException('Нэвтрэх холбоосын хугацаа дууссан. Дахин оролдоно уу.');
    }
    const consumed = await this.prisma.googleLoginExchange.updateMany({
      where: { id: row.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new BadRequestException('Нэвтрэх холбоос аль хэдийн ашиглагдсан байна');
    }
    return {
      accessToken: this.jwt.sign({ sub: row.user.id, role: row.user.role }),
      userId: row.user.id,
      role: row.user.role,
    };
  }

  async status(userId: string) {
    const identity = await this.prisma.googleIdentity.findUnique({
      where: { userId },
      select: { email: true, pictureUrl: true, createdAt: true },
    });
    return { enabled: this.isEnabled(), linked: !!identity, identity };
  }

  async unlink(userId: string) {
    const identity = await this.prisma.googleIdentity.findUnique({ where: { userId } });
    if (!identity) throw new NotFoundException('Google бүртгэл холбогдоогүй байна');
    await this.prisma.googleIdentity.delete({ where: { userId } });
    return { linked: false };
  }

  /** Хуучирсан state/код мөрүүдийг цэвэрлэнэ (хүснэгт хязгааргүй өсөхгүй). */
  async purgeExpired(now = new Date()) {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60_000);
    await this.prisma.googleOAuthState.deleteMany({ where: { expiresAt: { lt: cutoff } } });
    await this.prisma.googleLoginExchange.deleteMany({ where: { expiresAt: { lt: cutoff } } });
  }
}

