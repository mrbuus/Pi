import { LoginAttempts } from './login-attempts';

describe('LoginAttempts', () => {
  let now: number, attempts: LoginAttempts;
  beforeEach(() => { now = 1000; attempts = new LoginAttempts(() => now, 10); });
  it('allows eight failed attempts, then blocks the ninth across normalized identifiers', () => {
    for (let n = 0; n < 8; n++) { expect(attempts.isLocked(' TEST @EXAMPLE.COM ')).toBe(false); attempts.failure('test@example.com'); }
    expect(attempts.isLocked(' TEST @EXAMPLE.COM ')).toBe(true);
    expect(attempts.isLocked('other@example.com')).toBe(false);
  });
  it('unlocks at fifteen minutes without extending locks on blocked requests', () => {
    for (let n = 0; n < 8; n++) attempts.failure('test');
    now += 14 * 60_000; attempts.failure('test'); expect(attempts.isLocked('test')).toBe(true);
    now += 60_000; expect(attempts.isLocked('test')).toBe(false);
  });
  it('uses a rolling window rather than accumulating old failures', () => {
    for (let n = 0; n < 7; n++) attempts.failure('test');
    now += 15 * 60_000; attempts.failure('test'); expect(attempts.isLocked('test')).toBe(false);
  });
  it('clears failures after success', () => {
    for (let n = 0; n < 7; n++) attempts.failure('test');
    attempts.success(' TEST '); attempts.failure('test'); expect(attempts.isLocked('test')).toBe(false);
  });
  it('bounds memory and clears expired entries at capacity', () => {
    for (let n = 0; n < 100; n++) attempts.failure(String(n));
    expect(attempts.size).toBe(10);
    now += 15 * 60_000; attempts.failure('new'); expect(attempts.size).toBe(1);
  });
});

import { AuthService } from './auth.service';
import { loginAttempts } from './login-attempts';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

describe('AuthService login lock integration', () => {
  const identifier = 'synthetic-lock@example.invalid';
  afterEach(() => { loginAttempts.success(identifier); jest.restoreAllMocks(); });
  it('returns the same failure for an unknown user and a wrong password, then 429', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new AuthService({ user: { findFirst } } as unknown as PrismaService, {} as JwtService);
    const input = { identifier, password: 'synthetic-password' };
    const missing = await service.login(input).catch((e: unknown) => e);
    findFirst.mockResolvedValue({ id: 'synthetic-user', role: Role.STUDENT, passwordHash: await bcrypt.hash('different', 4) });
    const wrong = await service.login(input).catch((e: unknown) => e);
    expect((wrong as Error).message).toBe((missing as Error).message);
    for (let n = 0; n < 6; n++) await expect(service.login(input)).rejects.toMatchObject({ status: 401 });
    await expect(service.login(input)).rejects.toMatchObject({ status: 429 });
    expect(findFirst).toHaveBeenCalledTimes(8);
  });
  it('clears the failure counter after a valid login', async () => {
    const password = 'synthetic-password';
    const user = { id: 'synthetic-user', role: Role.STUDENT, passwordHash: await bcrypt.hash(password, 4) };
    const service = new AuthService({ user: { findFirst: jest.fn().mockResolvedValue(user) } } as unknown as PrismaService, { sign: () => 'synthetic-token' } as unknown as JwtService);
    for (let n = 0; n < 7; n++) loginAttempts.failure(identifier);
    await expect(service.login({ identifier, password })).resolves.toMatchObject({ userId: user.id });
    loginAttempts.failure(identifier); expect(loginAttempts.isLocked(identifier)).toBe(false);
  });
});
