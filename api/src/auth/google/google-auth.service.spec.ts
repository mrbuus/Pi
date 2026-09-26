import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GoogleOAuthPurpose } from '../../generated/prisma/enums';
import { GoogleExchangeDto } from './google-auth.dto';
import { GoogleAuthService, sha256, verifyIdTokenClaims } from './google-auth.service';

const CLIENT_ID = 'client-123.apps.googleusercontent.com';

function idToken(payload: Record<string, unknown>): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.sig`;
}

const good = {
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  exp: 2_000_000_000,
  sub: 'google-sub-1',
  email: 'Student@Gmail.com',
  email_verified: true,
  picture: 'https://lh3.googleusercontent.com/a/x',
};

describe('verifyIdTokenClaims', () => {
  it('зөв токеныг задалж имэйлийг жижиг үсэг болгоно', () => {
    const c = verifyIdTokenClaims(idToken(good), CLIENT_ID, 1_900_000_000);
    expect(c).toEqual({
      sub: 'google-sub-1',
      email: 'student@gmail.com',
      emailVerified: true,
      picture: good.picture,
    });
  });
  it.each([
    ['өөр aud', { ...good, aud: 'other' }],
    ['буруу iss', { ...good, iss: 'https://evil.example' }],
    ['хугацаа дууссан', { ...good, exp: 1 }],
    ['sub алга', { ...good, sub: '' }],
    ['имэйл алга', { ...good, email: undefined }],
  ])('%s → татгалзана', (_n, p) => {
    expect(() => verifyIdTokenClaims(idToken(p), CLIENT_ID, 1_900_000_000)).toThrow(BadRequestException);
  });
  it('гажуу токен → татгалзана', () => {
    expect(() => verifyIdTokenClaims('abc', CLIENT_ID)).toThrow(BadRequestException);
  });
});

describe('GoogleExchangeDto', () => {
  it('code заавал (whitelist-д хасагдахгүй)', async () => {
    expect(await validate(plainToInstance(GoogleExchangeDto, {}))).not.toHaveLength(0);
    expect(await validate(plainToInstance(GoogleExchangeDto, { code: 'x' }))).toHaveLength(0);
  });
});

function makePrisma() {
  const states: any[] = [];
  const exchanges: any[] = [];
  const identities: any[] = [];
  const users = [
    { id: 'u-email', email: 'student@gmail.com', role: 'STUDENT' },
    { id: 'u-other', email: null, role: 'TEACHER' },
  ];
  const consume = (rows: any[]) => ({ where, data }: any) => {
    const r = rows.find((x) => x.id === where.id && x.consumedAt === null);
    if (!r) return { count: 0 };
    Object.assign(r, data);
    return { count: 1 };
  };
  let n = 0;
  return {
    states,
    exchanges,
    identities,
    googleOAuthState: {
      create: jest.fn(async ({ data }) => states.push({ id: `s${++n}`, consumedAt: null, ...data })),
      findUnique: jest.fn(async ({ where }) => states.find((s) => s.stateHash === where.stateHash) ?? null),
      updateMany: jest.fn(async (a) => consume(states)(a)),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    googleLoginExchange: {
      create: jest.fn(async ({ data }) => exchanges.push({ id: `e${++n}`, consumedAt: null, ...data })),
      findUnique: jest.fn(async ({ where }) => {
        const e = exchanges.find((x) => x.codeHash === where.codeHash);
        return e ? { ...e, user: users.find((u) => u.id === e.userId) } : null;
      }),
      updateMany: jest.fn(async (a) => consume(exchanges)(a)),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    googleIdentity: {
      findUnique: jest.fn(async ({ where }) =>
        identities.find((i) => (where.googleSubject ? i.googleSubject === where.googleSubject : i.userId === where.userId)) ?? null),
      create: jest.fn(async ({ data }) => identities.push({ id: `i${++n}`, ...data })),
      update: jest.fn(async () => ({})),
      upsert: jest.fn(async ({ where, create, update }) => {
        const i = identities.find((x) => x.userId === where.userId);
        if (i) Object.assign(i, update);
        else identities.push({ id: `i${++n}`, ...create });
      }),
      delete: jest.fn(async () => ({})),
    },
    user: {
      findFirst: jest.fn(async ({ where }) => {
        const u = users.find((x) => x.email && x.email === where.email.equals.toLowerCase());
        return u ? { id: u.id, googleIdentity: identities.find((i) => i.userId === u.id) ?? null } : null;
      }),
    },
  };
}

describe('GoogleAuthService', () => {
  const env = process.env;
  let prisma: ReturnType<typeof makePrisma>;
  let svc: GoogleAuthService;
  const jwt = { sign: jest.fn(() => 'jwt-token') };

  beforeEach(() => {
    process.env = {
      ...env,
      GOOGLE_CLIENT_ID: CLIENT_ID,
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_REDIRECT_URI: 'https://api.example/api/auth/google/callback',
      WEB_ORIGIN: 'https://web.example',
    };
    prisma = makePrisma();
    svc = new GoogleAuthService(prisma as any, jwt as any);
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ id_token: idToken(good) }) })) as any;
  });
  afterAll(() => {
    process.env = env;
  });

  function stateFrom(url: string) {
    return new URL(url).searchParams.get('state')!;
  }

  it('тохируулаагүй бол 503', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect(svc.isEnabled()).toBe(false);
    await expect(svc.authorizationUrl(GoogleOAuthPurpose.LOGIN)).rejects.toThrow(ServiceUnavailableException);
  });

  it('state-ийг зөвхөн хэшээр хадгална', async () => {
    const url = await svc.authorizationUrl(GoogleOAuthPurpose.LOGIN);
    const state = stateFrom(url);
    expect(prisma.states[0].stateHash).toBe(sha256(state));
    expect(JSON.stringify(prisma.states)).not.toContain(state);
  });

  it('имэйл таарвал анхны нэвтрэлтээр холбож, нэг удаагийн код → JWT', async () => {
    const state = stateFrom(await svc.authorizationUrl(GoogleOAuthPurpose.LOGIN));
    const target = await svc.handleCallback({ code: 'g-code', state });
    expect(target.startsWith('https://web.example/auth/google?code=')).toBe(true);
    expect(target).not.toContain('jwt-token');
    expect(prisma.identities).toHaveLength(1);
    const code = new URL(target).searchParams.get('code')!;
    await expect(svc.exchange(code)).resolves.toMatchObject({ accessToken: 'jwt-token', userId: 'u-email' });
    // Нэг удаагийн
    await expect(svc.exchange(code)).rejects.toThrow(BadRequestException);
  });

  it('state дахин ашиглахад expired', async () => {
    const state = stateFrom(await svc.authorizationUrl(GoogleOAuthPurpose.LOGIN));
    await svc.handleCallback({ code: 'g-code', state });
    expect(await svc.handleCallback({ code: 'g-code', state })).toContain('google=expired');
  });

  it('холбоогүй, имэйл таарахгүй бол шинэ бүртгэл ҮҮСГЭХГҮЙ', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: idToken({ ...good, sub: 'x', email: 'nobody@gmail.com' }) }),
    });
    const state = stateFrom(await svc.authorizationUrl(GoogleOAuthPurpose.LOGIN));
    expect(await svc.handleCallback({ code: 'c', state })).toContain('google=not_linked');
    expect(prisma.identities).toHaveLength(0);
  });

  it('баталгаажаагүй имэйлтэй Google-ийг хүлээж авахгүй', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id_token: idToken({ ...good, email_verified: false }) }),
    });
    const state = stateFrom(await svc.authorizationUrl(GoogleOAuthPurpose.LOGIN));
    expect(await svc.handleCallback({ code: 'c', state })).toContain('google=unverified');
  });

  it('LINK: нэвтэрсэн хэрэглэгчид холбоно; өөр хүнд холбогдсон бол taken', async () => {
    await expect(svc.authorizationUrl(GoogleOAuthPurpose.LINK)).rejects.toThrow(BadRequestException);
    let state = stateFrom(await svc.authorizationUrl(GoogleOAuthPurpose.LINK, 'u-other'));
    expect(await svc.handleCallback({ code: 'c', state })).toBe('https://web.example/app/profile?google=linked');
    expect(prisma.identities[0].userId).toBe('u-other');
    // Нөгөө хэрэглэгч ижил Google-ийг холбох гэвэл
    prisma.identities[0].userId = 'u-other';
    state = stateFrom(await svc.authorizationUrl(GoogleOAuthPurpose.LINK, 'u-email'));
    expect(await svc.handleCallback({ code: 'c', state })).toContain('google=taken');
  });

  it('хэрэглэгч Google дээр цуцалбал cancelled', async () => {
    expect(await svc.handleCallback({ error: 'access_denied' })).toContain('google=cancelled');
  });
});
