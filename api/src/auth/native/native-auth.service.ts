import {
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, createPublicKey, type JsonWebKey } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';
import { tokenTtl } from '../session-ttl';
import { GoogleAuthService, verifyIdTokenClaims } from '../google/google-auth.service';
import { signSignupTicket } from '../google/signup-ticket';

/* ============================================================================
 * Гар утасны аппын нэвтрэлт: Google (native SDK-ийн idToken), Apple
 * (identityToken). Google WebView OAuth-г хориглодог, App Store 4.8 нь Google
 * байвал Apple-ийг заавал шаардана (piemath_app/docs/ARCHITECTURE.md §6).
 *
 * Вэбийн Google урсгалаас ялгаа: токен КЛИЕНТЭЭС ирдэг тул гарын үсгийг
 * ЗААВАЛ шалгана (Google — google-auth-library, Apple — JWKS + jsonwebtoken,
 * шинэ npm сан нэмэхгүй). Дүрэм вэбтэй ижил:
 *  - Бүртгэл ҮҮСГЭХГҮЙ. Холбогдсон эсвэл баталгаажсан имэйл нь таарсан хүн л нэвтэрнэ.
 *  - Google-д бүртгэлгүй Gmail → `signup` тасалбар (вэбийн /register-тэй ижил).
 *  - Архивлагдсан бүртгэл нэвтрэхгүй.
 *
 * Env: GOOGLE_NATIVE_CLIENT_IDS (таслалаар: iOS, Android, вэб client ID — апп
 *      serverClientId-д өгсөн ID нь aud болдог), GOOGLE_CLIENT_ID (нэмэлтээр
 *      зөвшөөрөгдөнө), APPLE_CLIENT_IDS (таслалаар: bundle ID, Services ID).
 *      Тохируулаагүй бол тухайн endpoint 503.
 * ========================================================================== */

export type NativeLoginResult =
  | { status: 'ok'; accessToken: string; userId: string; role: string }
  | { status: 'signup'; ticket: string }
  | { status: 'not_linked' };

/** Гарын үсэг шалгасан Google id_token-ийн payload-ийг буцаана. */
export type GoogleIdTokenVerifier = (
  idToken: string,
  audiences: string[],
) => Promise<Record<string, unknown>>;
export const GOOGLE_ID_TOKEN_VERIFIER = Symbol('GOOGLE_ID_TOKEN_VERIFIER');

/** Apple-ийн нийтийн түлхүүрүүд (https://appleid.apple.com/auth/keys). */
export type AppleJwksFetcher = () => Promise<JsonWebKey[]>;
export const APPLE_JWKS_FETCHER = Symbol('APPLE_JWKS_FETCHER');

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const JWKS_TTL_MS = 60 * 60_000;
const JWKS_MIN_REFRESH_MS = 60_000;

export function envList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

const defaultGoogleVerifier: GoogleIdTokenVerifier = async (idToken, audiences) => {
  const ticket = await new OAuth2Client().verifyIdToken({ idToken, audience: audiences });
  return (ticket.getPayload() ?? {}) as Record<string, unknown>;
};

const defaultAppleFetcher: AppleJwksFetcher = async () => {
  const res = await fetch(APPLE_KEYS_URL);
  if (!res.ok) throw new Error(`Apple keys ${res.status}`);
  const body = (await res.json()) as { keys?: JsonWebKey[] };
  return body.keys ?? [];
};

export interface AppleClaims {
  sub: string;
  email: string | null;
  emailVerified: boolean;
}

@Injectable()
export class NativeAuthService {
  private readonly logger = new Logger(NativeAuthService.name);
  /** Модулийн JwtService нь өөрийн secret-ийг давуу үздэг тул Apple-д тусдаа (түлхүүргүй) */
  private readonly rsaJwt = new JwtService({});
  private jwksCache: { keys: JsonWebKey[]; at: number } | null = null;
  /** Ашигласан Apple токен (sha256) → хугацаа дуусах мс. Нэг токеныг 2 удаа ашиглахгүй (replay). */
  private readonly usedAppleTokens = new Map<string, number>();

  private consumeOnce(token: string, exp: unknown) {
    const now = Date.now();
    for (const [k, until] of this.usedAppleTokens) if (until <= now) this.usedAppleTokens.delete(k);
    const key = createHash('sha256').update(token).digest('hex');
    if (this.usedAppleTokens.has(key)) throw new UnauthorizedException('Apple нэвтрэлтийг дахин эхлүүлнэ үү');
    const until = typeof exp === 'number' ? exp * 1000 : now + 10 * 60_000;
    this.usedAppleTokens.set(key, until);
  }

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private google: GoogleAuthService,
    @Optional() @Inject(GOOGLE_ID_TOKEN_VERIFIER) private googleVerifier?: GoogleIdTokenVerifier,
    @Optional() @Inject(APPLE_JWKS_FETCHER) private appleFetcher?: AppleJwksFetcher,
  ) {}

  googleAudiences(): string[] {
    const list = envList(process.env.GOOGLE_NATIVE_CLIENT_IDS);
    const web = process.env.GOOGLE_CLIENT_ID?.trim();
    if (list.length && web && !list.includes(web)) list.push(web);
    return list;
  }

  appleAudiences(): string[] {
    return envList(process.env.APPLE_CLIENT_IDS);
  }

  // ---------------------------------------------------------------- Google

  private async verifyGoogle(idToken: string) {
    const audiences = this.googleAudiences();
    if (!audiences.length) {
      throw new ServiceUnavailableException('Google нэвтрэлт апп-д тохируулагдаагүй байна');
    }
    let payload: Record<string, unknown>;
    try {
      payload = await (this.googleVerifier ?? defaultGoogleVerifier)(idToken, audiences);
    } catch (e) {
      this.logger.warn(`Google idToken шалгалт амжилтгүй: ${e instanceof Error ? e.message : e}`);
      throw new UnauthorizedException('Google токен хүчингүй байна. Дахин оролдоно уу.');
    }
    const aud = String(payload.aud ?? '');
    if (!audiences.includes(aud)) {
      throw new UnauthorizedException('Google токен өөр апп-д зориулагдсан');
    }
    // iss/exp/sub/email-ийг вэбтэй ижил функцээр дахин шалгана (гарын үсэг дээр шалгагдсан).
    const claims = verifyIdTokenClaims(idToken, aud);
    if (!claims.emailVerified) {
      throw new UnauthorizedException('Google бүртгэлийн имэйл баталгаажаагүй байна');
    }
    return claims;
  }

  async googleLogin(idToken: string, remember?: boolean): Promise<NativeLoginResult> {
    const claims = await this.verifyGoogle(idToken);
    const userId = await this.google.resolveLoginUser(claims);
    if (!userId) {
      const emailTaken = await this.prisma.user.findFirst({
        where: { email: { equals: claims.email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (emailTaken) return { status: 'not_linked' };
      return {
        status: 'signup',
        ticket: signSignupTicket({
          googleSubject: claims.sub,
          email: claims.email,
          firstName: claims.givenName ?? '',
          lastName: claims.familyName ?? '',
          picture: claims.picture,
        }),
      };
    }
    return this.issue(userId, remember);
  }

  async googleLink(userId: string, idToken: string) {
    const claims = await this.verifyGoogle(idToken);
    return { result: await this.google.link(userId, claims) };
  }

  // ---------------------------------------------------------------- Apple

  private async appleKeys(forceRefresh: boolean): Promise<JsonWebKey[]> {
    const now = Date.now();
    const cached = this.jwksCache;
    const fresh = cached && now - cached.at < JWKS_TTL_MS;
    const canRefresh = !cached || now - cached.at > JWKS_MIN_REFRESH_MS;
    if (cached && fresh && !(forceRefresh && canRefresh)) return cached.keys;
    const keys = await (this.appleFetcher ?? defaultAppleFetcher)();
    this.jwksCache = { keys, at: now };
    return keys;
  }

  async verifyApple(identityToken: string, nonce?: string): Promise<AppleClaims> {
    const audiences = this.appleAudiences();
    if (!audiences.length) {
      throw new ServiceUnavailableException('Apple нэвтрэлт тохируулагдаагүй байна');
    }
    const invalid = () => new UnauthorizedException('Apple токен хүчингүй байна. Дахин оролдоно уу.');
    const decoded = this.rsaJwt.decode(identityToken, { complete: true }) as {
      header?: { kid?: string; alg?: string };
    } | null;
    const kid = decoded?.header?.kid;
    if (!kid || decoded?.header?.alg !== 'RS256') throw invalid();

    let jwk: JsonWebKey | undefined;
    try {
      jwk = (await this.appleKeys(false)).find((k) => k.kid === kid);
      // Apple түлхүүрээ сэлгэсэн бол нэг удаа шинээр татна
      jwk ??= (await this.appleKeys(true)).find((k) => k.kid === kid);
    } catch (e) {
      this.logger.warn(`Apple түлхүүр татаж чадсангүй: ${e instanceof Error ? e.message : e}`);
      throw new ServiceUnavailableException('Apple-тэй холбогдож чадсангүй. Дахин оролдоно уу.');
    }
    if (!jwk) throw invalid();

    let payload: Record<string, unknown>;
    try {
      const pem = createPublicKey({ key: jwk, format: 'jwk' })
        .export({ type: 'spki', format: 'pem' })
        .toString();
      payload = this.rsaJwt.verify<Record<string, unknown>>(identityToken, {
        publicKey: pem,
        algorithms: ['RS256'],
        issuer: APPLE_ISSUER,
        audience: audiences as [string, ...string[]],
      });
    } catch {
      throw invalid();
    }
    if (typeof payload.sub !== 'string' || !payload.sub) throw invalid();
    // nonce ЗААВАЛ: өөр газраас (өөр апп, сайт) олж авсан токеныг энд ашиглахаас сэргийлнэ.
    if (!nonce) throw invalid();
    this.consumeOnce(identityToken, payload.exp);
    {
      // Апп nonce-ийг шууд эсвэл SHA-256 hex хэлбэрээр Apple-д дамжуулдаг
      const hashed = createHash('sha256').update(nonce).digest('hex');
      if (payload.nonce !== nonce && payload.nonce !== hashed) throw invalid();
    }
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
    return {
      sub: payload.sub,
      email,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    };
  }

  async appleLogin(identityToken: string, nonce?: string, remember?: boolean): Promise<NativeLoginResult> {
    const claims = await this.verifyApple(identityToken, nonce);
    const identity = await this.prisma.appleIdentity.findUnique({
      where: { appleSubject: claims.sub },
    });
    if (identity) {
      if (claims.email && claims.email !== identity.email) {
        await this.prisma.appleIdentity.update({
          where: { id: identity.id },
          data: { email: claims.email },
        });
      }
      return this.issue(identity.userId, remember);
    }
    // Имэйлээр автоматаар ХОЛБОХГҮЙ: манай бүртгэлийн имэйл баталгаажаагүй тул хэн нэгэн
    // бусдын имэйлээр урьдчилан бүртгэл үүсгэж хулгайлах (pre-hijacking) боломжтой.
    // Apple-ээр бүртгэл үүсгэхгүй — утсаараа нэвтэрч профайлаасаа холбоно.
    return { status: 'not_linked' };
  }

  async appleLink(userId: string, identityToken: string, nonce?: string) {
    const claims = await this.verifyApple(identityToken, nonce);
    const other = await this.prisma.appleIdentity.findUnique({
      where: { appleSubject: claims.sub },
    });
    if (other && other.userId !== userId) return { result: 'taken' as const };
    await this.prisma.appleIdentity.upsert({
      where: { userId },
      create: { userId, appleSubject: claims.sub, email: claims.email },
      update: { appleSubject: claims.sub, email: claims.email },
    });
    return { result: 'linked' as const };
  }

  // ---------------------------------------------------------------- JWT

  private async issue(userId: string, remember?: boolean): Promise<NativeLoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, archivedAt: true },
    });
    if (!user) throw new UnauthorizedException('Хэрэглэгч олдсонгүй');
    if (user.archivedAt) {
      throw new UnauthorizedException(
        'Энэ сурагчийн бүртгэл архивлагдсан байна. Сургалтын төвтэй холбогдоно уу.',
      );
    }
    const payload = { sub: user.id, role: user.role };
    const ttl = tokenTtl(remember);
    return {
      status: 'ok',
      accessToken: ttl ? this.jwt.sign(payload, { expiresIn: ttl }) : this.jwt.sign(payload),
      userId: user.id,
      role: user.role,
    };
  }
}

