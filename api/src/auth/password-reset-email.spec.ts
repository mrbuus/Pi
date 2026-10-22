import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { accountAttempts, loginAttempts } from './login-attempts';

/* Имэйлээр нууц үг сэргээх (эзэн 2026-10-22): нэг удаагийн холбоос, ~30 мин,
   хурдны хязгаар, бүртгэл байгаа эсэхийг илчлэхгүй. ӨС бүхэлдээ санах ойд. */

const flush = () => new Promise((r) => setImmediate(r));
const NEW_PASSWORD = 'shine2026pass';

type Token = {
  id: string;
  userId: string;
  codeHash: string;
  channel: 'SMS' | 'EMAIL';
  sentToMasked: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
  createdAt: Date;
  requestIp: string | null;
};

function setup(opts: { email?: boolean; sms?: boolean } = {}) {
  const users = [
    { id: 'u-gmail', phone: '99112233', role: 'STUDENT', email: null, username: 'bat', firstName: 'Бат', archivedAt: null, googleIdentity: { email: 'bat@gmail.com' } },
    { id: 'u-phone', phone: '88112233', role: 'STUDENT', email: null, username: 'dorj', firstName: 'Дорж', archivedAt: null, googleIdentity: null },
    { id: 'u-mail', phone: '80112233', role: 'PARENT', email: 'Parent@Example.com', username: 'eej', firstName: 'Сараа', archivedAt: null, googleIdentity: null },
  ];
  const tokens: Token[] = [];
  let seq = 0;
  const match = (t: Token, where: any) =>
    Object.entries(where).every(([k, v]: [string, any]) => {
      const value = (t as any)[k];
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('gte' in v) return value >= v.gte;
        if ('gt' in v) return value > v.gt;
      }
      return value === v;
    });
  const prisma: any = {
    user: {
      findFirst: jest.fn(async ({ where }: any) => {
        for (const cond of where.OR) {
          const u = users.find((x) => {
            if (cond.phone) return x.phone === cond.phone;
            if (cond.username) return x.username === cond.username;
            if (cond.email) return x.email?.toLowerCase() === cond.email.equals.toLowerCase();
            if (cond.googleIdentity) return x.googleIdentity?.email === cond.googleIdentity.is.email;
            return false;
          });
          if (u) return u;
        }
        return null;
      }),
      update: jest.fn(async () => ({})),
    },
    passwordResetToken: {
      count: jest.fn(async ({ where }: any) => tokens.filter((t) => match(t, where)).length),
      updateMany: jest.fn(({ where, data }: any) => {
        const rows = tokens.filter((t) => match(t, where));
        rows.forEach((t) => Object.assign(t, data));
        return { count: rows.length };
      }),
      create: jest.fn(({ data }: any) => {
        const row = { id: `t${++seq}`, consumedAt: null, attempts: 0, createdAt: new Date(), requestIp: null, ...data };
        tokens.push(row);
        return row;
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        const t = tokens.find((x) => x.codeHash === where.codeHash && x.channel === where.channel);
        if (!t) return null;
        return { ...t, user: users.find((u) => u.id === t.userId) };
      }),
      update: jest.fn(async () => ({})),
    },
    $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
  };
  const sms = { isConfigured: jest.fn(() => opts.sms ?? false), sendAndLog: jest.fn(async () => ({})) };
  const email = { isConfigured: jest.fn(() => opts.email ?? true), sendEmail: jest.fn(async (_m: any) => undefined) };
  const audit = { record: jest.fn(async () => undefined) };
  const svc = new PasswordResetService(prisma, sms as any, audit as any, email as any);
  const linkToken = () => {
    const mail = email.sendEmail.mock.calls.at(-1)![0];
    return /#t=([A-Za-z0-9_-]+)/.exec(mail.text)![1];
  };
  return { svc, prisma, tokens, sms, email, audit, linkToken, users };
}

describe('Нууц үг сэргээх — имэйлийн холбоос', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.JWT_SECRET = 'synthetic-jwt-secret';
    process.env.WEB_ORIGIN = 'https://pimath.mn,https://www.pimath.mn';
  });
  afterEach(() => {
    process.env = { ...env };
    jest.useRealTimers();
  });

  it('утасны дугаараар хүссэн ч холбосон Gmail руу 30 минутын холбоос илгээнэ', async () => {
    const { svc, email, tokens } = setup();
    const res = await svc.request('99112233');
    await flush();
    expect(res.channels).toEqual({ sms: false, email: true });
    expect(res.linkExpiresInSeconds).toBe(30 * 60);
    expect(email.sendEmail).toHaveBeenCalledTimes(1);
    const mail = email.sendEmail.mock.calls[0][0];
    expect(mail.to).toBe('bat@gmail.com');
    expect(mail.text).toContain('https://pimath.mn/forgot-password#t=');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].channel).toBe('EMAIL');
    expect(tokens[0].expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 60_000);
    // ӨС-д зөвхөн хэш — токен өөрөө хадгалагдахгүй
    const raw = /#t=([A-Za-z0-9_-]+)/.exec(mail.text)![1];
    expect(JSON.stringify(tokens)).not.toContain(raw);
  });

  it('бүртгэлийн имэйлийг том жижиг үсэг ялгахгүй олно', async () => {
    const { svc, email } = setup();
    await svc.request('parent@example.com');
    await flush();
    expect(email.sendEmail.mock.calls[0][0].to).toBe('Parent@Example.com');
  });

  it('бүртгэлгүй / имэйлгүй / бүртгэлтэй — хариу ЯГ ИЖИЛ (бүртгэл илчлэхгүй)', async () => {
    const { svc, email } = setup();
    const unknown = await svc.request('99999999');
    const phoneOnly = await svc.request('88112233');
    const known = await svc.request('99112233');
    await flush();
    const strip = (r: any) => ({ ...r, maskedTo: undefined });
    expect(strip(unknown)).toEqual(strip(known));
    expect(strip(phoneOnly)).toEqual(strip(known));
    expect(unknown.maskedTo).toBe('9999****');
    expect(email.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('холбоос нэг л удаа ажиллана, бүх сессийг таслаж түгжээг арилгана', async () => {
    const { svc, prisma, linkToken, audit } = setup();
    for (let i = 0; i < 8; i++) loginAttempts.failure('99112233');
    expect(loginAttempts.isLocked('99112233')).toBe(true);
    await svc.request('99112233');
    await flush();
    const token = linkToken();
    await expect(svc.resetWithLink(token, NEW_PASSWORD)).resolves.toEqual({ reset: true });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u-gmail' }, data: expect.objectContaining({ passwordChangedAt: expect.any(Date) }) }),
    );
    expect(loginAttempts.isLocked('99112233')).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'PASSWORD_RESET', entityId: 'u-gmail' }));
    await expect(svc.resetWithLink(token, NEW_PASSWORD)).rejects.toThrow(BadRequestException);
  });

  it('30 минутын дараа хүчингүй', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-22T03:00:00Z'), doNotFake: ['setImmediate', 'nextTick'] });
    const { svc, linkToken, prisma } = setup();
    await svc.request('99112233');
    await flush();
    jest.setSystemTime(new Date('2026-10-22T03:30:01Z'));
    await expect(svc.resetWithLink(linkToken(), NEW_PASSWORD)).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('буруу/зохиосон токен ба сул нууц үг — холбоосыг шатаахгүй', async () => {
    const { svc, linkToken, tokens } = setup();
    await expect(svc.resetWithLink('made-up-token', NEW_PASSWORD)).rejects.toThrow(BadRequestException);
    await svc.request('99112233');
    await flush();
    const token = linkToken();
    await expect(svc.resetWithLink(token, 'short')).rejects.toThrow(BadRequestException);
    // утасны дугаартай ижил нууц үг хориотой
    await expect(svc.resetWithLink(token, '99112233')).rejects.toThrow(BadRequestException);
    expect(tokens[0].consumedAt).toBeNull();
    await expect(svc.resetWithLink(token, NEW_PASSWORD)).resolves.toEqual({ reset: true });
  });

  it('шинэ холбоос хуучнаа хүчингүй болгоно; 15 минутад 3-аас илүү илгээхгүй', async () => {
    const { svc, email, linkToken } = setup();
    await svc.request('99112233');
    await flush();
    const first = linkToken();
    await svc.request('99112233');
    await svc.request('99112233');
    await svc.request('99112233'); // 4 дэх — хязгаар
    await flush();
    expect(email.sendEmail).toHaveBeenCalledTimes(3);
    await expect(svc.resetWithLink(first, NEW_PASSWORD)).rejects.toThrow(BadRequestException);
    await expect(svc.resetWithLink(linkToken(), NEW_PASSWORD)).resolves.toEqual({ reset: true });
  });

  it('имэйлгүй, утастай хэрэглэгч SMS тохируулсан бол хуучин SMS замаар', async () => {
    const { svc, sms, email, tokens } = setup({ sms: true });
    await svc.request('88112233');
    await flush();
    expect(email.sendEmail).not.toHaveBeenCalled();
    expect(sms.sendAndLog).toHaveBeenCalledTimes(1);
    expect(tokens[0].channel).toBe('SMS');
  });

  it('SMS ч имэйл ч тохируулаагүй бол 503 (төвтэй холбогдоно уу)', async () => {
    const { svc } = setup({ email: false, sms: false });
    await expect(svc.request('99112233')).rejects.toThrow(ServiceUnavailableException);
  });

  it('«3 удаа буруу» мэдэгдэл: эзний бичвэр + ажилладаг холбоос; имэйлгүй бол алгасна', async () => {
    const { svc, email, users, linkToken } = setup();
    await expect(svc.sendLoginAlert(users[1])).resolves.toBe('SKIPPED');
    await expect(svc.sendLoginAlert(users[0])).resolves.toBe('SENT');
    await flush();
    const mail = email.sendEmail.mock.calls[0][0];
    expect(mail.to).toBe('bat@gmail.com');
    expect(mail.text).toContain(
      'Таны pimath.mn бүртгэлд 3 удаа буруу нууц үг оролдлоо, хэрэв та биш бол нууц үгээ солино уу',
    );
    expect(mail.html).toContain('<html lang="mn">');
    accountAttempts.success('u-gmail');
    await expect(svc.resetWithLink(linkToken(), NEW_PASSWORD)).resolves.toEqual({ reset: true });
  });
});
