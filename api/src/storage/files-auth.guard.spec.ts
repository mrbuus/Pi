import { FilesAuthGuard } from './files-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileAuthorizationService } from './file-authorization.service';

describe('file token lifecycle and object access', () => {
  const jwt = new JwtService({ secret: 'local-unit-test-only-secret' });
  let user: any;
  let files: any;
  let guard: FilesAuthGuard;
  function context(token?: string, key = 'known.png', header?: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: header ? { authorization: header } : {},
          query: token ? { token } : {},
          params: { key },
        }),
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    } as unknown as ExecutionContext;
  }
  beforeEach(() => {
    user = {
      id: 'pupil',
      role: 'STUDENT',
      archivedAt: null,
      passwordChangedAt: null,
    };
    files = { allowed: jest.fn().mockResolvedValue(true) };
    guard = new FilesAuthGuard(
      jwt,
      {
        user: { findUnique: jest.fn(async () => user) },
      } as unknown as PrismaService,
      files as FileAuthorizationService,
    );
  });
  it('uses current database role even when token says ADMIN', async () => {
    await expect(
      guard.canActivate(context(jwt.sign({ sub: 'pupil', role: 'ADMIN' }))),
    ).resolves.toBe(true);
    expect(files.allowed).toHaveBeenCalledWith(
      { id: 'pupil', role: 'STUDENT' },
      'known.png',
    );
  });
  it('denies a guessed key despite valid authentication', async () => {
    files.allowed.mockResolvedValue(false);
    await expect(
      guard.canActivate(context(jwt.sign({ sub: 'pupil' }))),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('rejects expired and archived tokens', async () => {
    await expect(
      guard.canActivate(context(jwt.sign({ sub: 'pupil', exp: 1 }))),
    ).rejects.toMatchObject({ status: 401 });
    user.archivedAt = new Date();
    await expect(
      guard.canActivate(context(jwt.sign({ sub: 'pupil' }))),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('rejects tokens issued before password change and absent iat', async () => {
    user.passwordChangedAt = new Date();
    await expect(
      guard.canActivate(context(jwt.sign({ sub: 'pupil', iat: 1 }))),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      guard.canActivate(
        context(jwt.sign({ sub: 'pupil' }, { noTimestamp: true })),
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('never falls back from an invalid bearer to a valid query token', async () => {
    await expect(
      guard.canActivate(
        context(jwt.sign({ sub: 'pupil' }), 'known.png', 'Bearer invalid'),
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(files.allowed).not.toHaveBeenCalled();
  });
  it('rejects unsafe keys before granting', async () => {
    await expect(
      guard.canActivate(context(jwt.sign({ sub: 'pupil' }), '../private')),
    ).rejects.toMatchObject({ status: 400 });
  });
});
