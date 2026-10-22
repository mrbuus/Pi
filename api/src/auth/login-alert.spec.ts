import 'reflect-metadata';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { LoginAttempts, accountAttempts, loginAttempts } from './login-attempts';
import { PasswordResetService } from './password-reset.service';

/* 3 удаа буруу нууц үг → бүртгэлийн эзэнд НЭГ имэйл (эзэн 2026-10-22) +
   «Намайг сана»-ны токены хугацаа. */

describe('LoginAttempts.claimAlert', () => {
  let now: number, attempts: LoginAttempts;
  beforeEach(() => {
    now = 1_000;
    attempts = new LoginAttempts(() => now, 10);
  });
  it('3 дахь буруу оролдлогод НЭГ удаа, цонхон дотор дахин үгүй', () => {
    attempts.failure('u1');
    attempts.failure('u1');
    expect(attempts.claimAlert('u1')).toBe(false);
    expect(attempts.failure('u1')).toBe(3);
    expect(attempts.claimAlert('u1')).toBe(true);
    for (let i = 0; i < 5; i++) attempts.failure('u1');
    expect(attempts.claimAlert('u1')).toBe(false);
  });
  it('15 минутын дараа шинэ цонхонд дахин мэдэгдэнэ', () => {
    for (let i = 0; i < 3; i++) attempts.failure('u1');
    expect(attempts.claimAlert('u1')).toBe(true);
    now += 15 * 60_000;
    for (let i = 0; i < 3; i++) attempts.failure('u1');
    expect(attempts.claimAlert('u1')).toBe(true);
  });
  it('амжилттай нэвтэрвэл тоолуур шинээр эхэлнэ', () => {
    for (let i = 0; i < 3; i++) attempts.failure('u1');
    expect(attempts.claimAlert('u1')).toBe(true);
    attempts.success('u1');
    attempts.failure('u1');
    expect(attempts.claimAlert('u1')).toBe(false);
  });
});

describe('AuthService.login — буруу оролдлогын мэдэгдэл ба «Намайг сана»', () => {
  const password = 'synthetic-pass1';
  let user: Record<string, unknown>;
  let sendLoginAlert: jest.Mock;
  let sign: jest.Mock;
  let service: AuthService;
  const ids = ['alert-a@example.invalid', 'alert-b', '99000011'];

  beforeEach(async () => {
    user = {
      id: 'synthetic-alert-user',
      role: Role.STUDENT,
      firstName: 'Тест',
      email: null,
      archivedAt: null,
      googleIdentity: { email: 'synthetic@gmail.com' },
      passwordHash: await bcrypt.hash(password, 4),
    };
    sendLoginAlert = jest.fn().mockResolvedValue('SENT');
    sign = jest.fn().mockReturnValue('synthetic-token');
    service = new AuthService(
      { user: { findFirst: jest.fn().mockResolvedValue(user) } } as unknown as PrismaService,
      { sign } as unknown as JwtService,
      { sendLoginAlert } as unknown as PasswordResetService,
    );
  });
  afterEach(() => {
    ids.forEach((id) => loginAttempts.success(id));
    accountAttempts.success('synthetic-alert-user');
  });

  it('гурван ӨӨР нэрээр оролдсон ч нэг бүртгэлд тооцож ЯГ НЭГ имэйл', async () => {
    for (const identifier of ids) {
      await expect(service.login({ identifier, password: 'wrong' })).rejects.toMatchObject({ status: 401 });
    }
    expect(sendLoginAlert).toHaveBeenCalledTimes(1);
    expect(sendLoginAlert).toHaveBeenCalledWith(expect.objectContaining({ id: 'synthetic-alert-user' }));
    for (let i = 0; i < 3; i++) {
      await service.login({ identifier: ids[0], password: 'wrong' }).catch(() => undefined);
    }
    expect(sendLoginAlert).toHaveBeenCalledTimes(1);
  });

  it('2 буруу оролдлогод имэйл явахгүй; зөв нэвтэрвэл тоолуур арилна', async () => {
    await service.login({ identifier: ids[0], password: 'wrong' }).catch(() => undefined);
    await service.login({ identifier: ids[0], password: 'wrong' }).catch(() => undefined);
    await expect(service.login({ identifier: ids[0], password })).resolves.toMatchObject({ accessToken: 'synthetic-token' });
    await service.login({ identifier: ids[0], password: 'wrong' }).catch(() => undefined);
    expect(sendLoginAlert).not.toHaveBeenCalled();
  });

  it('имэйл илгээх алдаа нэвтрэлтийн хариуг өөрчлөхгүй', async () => {
    sendLoginAlert.mockRejectedValue(new Error('smtp down'));
    for (let i = 0; i < 3; i++) {
      await expect(service.login({ identifier: ids[1], password: 'wrong' })).rejects.toMatchObject({ status: 401 });
    }
  });

  it.each([
    [true, { expiresIn: '30d' }],
    [false, { expiresIn: '12h' }],
  ])('remember=%p → %p', async (remember, options) => {
    await service.login({ identifier: ids[2], password, remember });
    expect(sign).toHaveBeenCalledWith({ sub: 'synthetic-alert-user', role: Role.STUDENT }, options);
  });

  it('remember ирээгүй (хуучин клиент) → JwtModule-ийн өгөгдмөл', async () => {
    await service.login({ identifier: ids[2], password });
    expect(sign).toHaveBeenCalledWith({ sub: 'synthetic-alert-user', role: Role.STUDENT });
  });
});
