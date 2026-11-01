import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, generateKeyPairSync, type JsonWebKey } from 'crypto';
import { NativeAuthService, type GoogleIdTokenVerifier } from './native-auth.service';

const ANDROID = 'android-123.apps.googleusercontent.com';
const BUNDLE = 'mn.pimath.app';

function b64(o: object) {
  return Buffer.from(JSON.stringify(o)).toString('base64url');
}
function googleToken(payload: Record<string, unknown>) {
  return `${b64({ alg: 'RS256' })}.${b64(payload)}.sig`;
}
const googlePayload = {
  iss: 'https://accounts.google.com',
  aud: ANDROID,
  exp: Math.floor(Date.now() / 1000) + 3600,
  sub: 'g-sub',
  email: 'Student@Gmail.com',
  email_verified: true,
  given_name: 'Бат',
  family_name: 'Дорж',
};

// Apple: жинхэнэ RSA түлхүүрээр гарын үсэг зурж JWKS-ээр шалгана
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...(publicKey.export({ format: 'jwk' }) as JsonWebKey), kid: 'k1', alg: 'RS256', use: 'sig' };
const signer = new JwtService({});
function appleToken(
  payload: Record<string, unknown>,
  opts: { key?: typeof privateKey; kid?: string; aud?: string } = {},
) {
  return signer.sign(payload, {
    privateKey: (opts.key ?? privateKey).export({ type: 'pkcs8', format: 'pem' }).toString(),
    algorithm: 'RS256',
    keyid: opts.kid ?? 'k1',
    issuer: 'https://appleid.apple.com',
    audience: opts.aud ?? BUNDLE,
    expiresIn: 600,
  });
}

function makeDb() {
  return {
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({ id: 'u1', role: 'STUDENT', archivedAt: null }),
    },
    appleIdentity: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  };
}

function make(opts: { db?: ReturnType<typeof makeDb>; verifier?: GoogleIdTokenVerifier; resolve?: string | null } = {}) {
  const db = opts.db ?? makeDb();
  const jwt = { sign: jest.fn().mockReturnValue('access.jwt') };
  const google = {
    resolveLoginUser: jest.fn().mockResolvedValue(opts.resolve === undefined ? 'u1' : opts.resolve),
    link: jest.fn().mockResolvedValue('linked'),
  };
  const verifier = opts.verifier ?? jest.fn(async (t: string) => JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()));
  const fetcher = jest.fn().mockResolvedValue([jwk]);
  const svc = new NativeAuthService(db as never, jwt as never, google as never, verifier, fetcher);
  return { svc, db, jwt, google, verifier, fetcher };
}

const saved = { ...process.env };
beforeEach(() => {
  process.env.GOOGLE_NATIVE_CLIENT_IDS = `${ANDROID}, ios-1.apps.googleusercontent.com`;
  process.env.GOOGLE_CLIENT_ID = 'web-1.apps.googleusercontent.com';
  process.env.APPLE_CLIENT_IDS = BUNDLE;
  process.env.JWT_SECRET = 'test-secret';
});
afterAll(() => {
  process.env = saved;
});

describe('POST /auth/google/native', () => {
  it('тохируулаагүй бол 503', async () => {
    delete process.env.GOOGLE_NATIVE_CLIENT_IDS;
    await expect(make().svc.googleLogin(googleToken(googlePayload))).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('аудиторын жагсаалтыг (вэб client ID-тай) verifier-т дамжуулж, холбогдсон хэрэглэгчид JWT өгнө', async () => {
    const { svc, verifier, google } = make();
    const res = await svc.googleLogin(googleToken(googlePayload), true);
    expect(verifier).toHaveBeenCalledWith(expect.any(String), [
      ANDROID,
      'ios-1.apps.googleusercontent.com',
      'web-1.apps.googleusercontent.com',
    ]);
    expect(google.resolveLoginUser.mock.calls[0][0]).toMatchObject({ sub: 'g-sub', email: 'student@gmail.com' });
    expect(res).toEqual({ status: 'ok', accessToken: 'access.jwt', userId: 'u1', role: 'STUDENT' });
  });

  it('гарын үсэг буруу (verifier шидсэн) бол 401', async () => {
    const { svc } = make({ verifier: jest.fn().mockRejectedValue(new Error('bad sig')) });
    await expect(svc.googleLogin('x.y.z')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('өөр апп-ын aud бол 401', async () => {
    const { svc } = make();
    await expect(svc.googleLogin(googleToken({ ...googlePayload, aud: 'evil' }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('имэйл баталгаажаагүй бол 401, хэрэглэгч хайхгүй', async () => {
    const { svc, google } = make();
    await expect(
      svc.googleLogin(googleToken({ ...googlePayload, email_verified: false })),
    ).rejects.toThrow('баталгаажаагүй');
    expect(google.resolveLoginUser).not.toHaveBeenCalled();
  });

  it('бүртгэлгүй Gmail → signup тасалбар (бүртгэл ҮҮСГЭХГҮЙ)', async () => {
    const { svc } = make({ resolve: null });
    const res = await svc.googleLogin(googleToken(googlePayload));
    expect(res.status).toBe('signup');
  });

  it('имэйл нь өөр Google-тэй холбогдсон бүртгэлд байвал not_linked', async () => {
    const db = makeDb();
    db.user.findFirst.mockResolvedValue({ id: 'u9' });
    const res = await make({ db, resolve: null }).svc.googleLogin(googleToken(googlePayload));
    expect(res).toEqual({ status: 'not_linked' });
  });

  it('архивлагдсан бүртгэл нэвтрэхгүй', async () => {
    const db = makeDb();
    db.user.findUnique.mockResolvedValue({ id: 'u1', role: 'STUDENT', archivedAt: new Date() });
    await expect(make({ db }).svc.googleLogin(googleToken(googlePayload))).rejects.toThrow('архивлагдсан');
  });
});

describe('POST /auth/apple', () => {
  const base = { sub: 'apple-sub', email: 'bat@gmail.com', email_verified: 'true' };

  it('тохируулаагүй бол 503', async () => {
    delete process.env.APPLE_CLIENT_IDS;
    await expect(make().svc.appleLogin(appleToken(base))).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('холбогдсон Apple бүртгэлд JWT өгнө (JWKS-ээр гарын үсэг шалгана)', async () => {
    const db = makeDb();
    db.appleIdentity.findUnique.mockResolvedValue({ id: 'a1', userId: 'u1', email: 'bat@gmail.com' });
    const { svc, fetcher } = make({ db });
    expect(await svc.appleLogin(appleToken(base))).toMatchObject({ status: 'ok', userId: 'u1' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('өөр түлхүүрээр зурсан токеныг татгалзана', async () => {
    await expect(make().svc.appleLogin(appleToken(base, { key: other.privateKey }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('өөр aud-тэй токеныг татгалзана', async () => {
    await expect(make().svc.appleLogin(appleToken(base, { aud: 'com.evil.app' }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('үл мэдэгдэх kid бол JWKS-ийг дахин татаад олдохгүй бол 401', async () => {
    const { svc, fetcher } = make();
    await expect(svc.appleLogin(appleToken(base, { kid: 'unknown' }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    // Эхний татлага + сэлгэлтийн нэг дахин татлага (минутын хязгаартай)
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('nonce: түүхий эсвэл SHA-256 hex таарах ёстой', async () => {
    const db = makeDb();
    db.appleIdentity.findUnique.mockResolvedValue({ id: 'a1', userId: 'u1', email: 'bat@gmail.com' });
    const { svc } = make({ db });
    const hashed = createHash('sha256').update('n-123').digest('hex');
    await expect(svc.appleLogin(appleToken({ ...base, nonce: hashed }), 'n-123')).resolves.toMatchObject({
      status: 'ok',
    });
    await expect(svc.appleLogin(appleToken({ ...base, nonce: 'other' }), 'n-123')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('баталгаажсан имэйл бүртгэлтэй таарвал автоматаар холбоно', async () => {
    const db = makeDb();
    db.user.findFirst.mockResolvedValue({ id: 'u1', appleIdentity: null });
    const res = await make({ db }).svc.appleLogin(appleToken(base));
    expect(db.appleIdentity.create).toHaveBeenCalledWith({
      data: { userId: 'u1', appleSubject: 'apple-sub', email: 'bat@gmail.com' },
    });
    expect(res.status).toBe('ok');
  });

  it('privaterelay имэйлээр холбохгүй, бүртгэл үүсгэхгүй → not_linked', async () => {
    const db = makeDb();
    const res = await make({ db }).svc.appleLogin(
      appleToken({ ...base, email: 'x@privaterelay.appleid.com' }),
    );
    expect(res).toEqual({ status: 'not_linked' });
    expect(db.user.findFirst).not.toHaveBeenCalled();
    expect(db.appleIdentity.create).not.toHaveBeenCalled();
  });

  it('холбох: өөр хэрэглэгчид холбогдсон Apple бол taken', async () => {
    const db = makeDb();
    db.appleIdentity.findUnique.mockResolvedValue({ id: 'a1', userId: 'u2' });
    expect(await make({ db }).svc.appleLink('u1', appleToken(base))).toEqual({ result: 'taken' });
    expect(db.appleIdentity.upsert).not.toHaveBeenCalled();
  });
});
