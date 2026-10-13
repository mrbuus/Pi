import { ForbiddenException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { StaffCapabilityService } from './staff-capability.service';

describe('staff capability decision boundaries', () => {
  let prisma: any;
  let service: StaffCapabilityService;
  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'plus',
            role: Role.TEACHER_PLUS,
            archivedAt: null,
          }),
      },
      staffCapabilityGrant: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new StaffCapabilityService(prisma);
  });
  it('never infers privilege from a TEACHER_PLUS role alone', async () => {
    await expect(
      service.assert('plus', 'schedule.manage', 'class'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('TEACHER_PLUS manages payments by role (owner decision 2026-10-08), but nothing else', async () => {
    expect(await service.has('plus', 'finance.manage')).toBe(true);
    expect(await service.has('plus', 'payroll.view')).toBe(false);
    expect(await service.has('plus', 'time.review')).toBe(false);
    prisma.user.findUnique.mockResolvedValue({
      id: 't',
      role: Role.TEACHER,
      archivedAt: null,
    });
    expect(await service.has('t', 'finance.manage')).toBe(false);
  });
  it('checks current database role; administrator bypass is explicit', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin',
      role: Role.ADMIN,
      archivedAt: null,
    });
    expect(await service.has('admin', 'schedule.manage', 'class')).toBe(true);
    expect(prisma.staffCapabilityGrant.findFirst).not.toHaveBeenCalled();
  });
  it('denies archived admins as well as archived staff', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin',
      role: Role.ADMIN,
      archivedAt: new Date(),
    });
    await expect(
      service.has('admin', 'schedule.manage'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('a teacher cannot exploit a stale grant after role downgrade', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'plus',
      role: Role.TEACHER,
      archivedAt: null,
    });
    prisma.staffCapabilityGrant.findFirst.mockResolvedValue({
      id: 'old-grant',
    });
    expect(await service.has('plus', 'schedule.manage', 'class')).toBe(false);
    expect(prisma.staffCapabilityGrant.findFirst).not.toHaveBeenCalled();
  });
  it('only matches global or requested class; expired and revoked grants are excluded', async () => {
    prisma.staffCapabilityGrant.findFirst.mockResolvedValue({ id: 'grant' });
    expect(await service.has('plus', 'schedule.manage', 'class-A')).toBe(true);
    const where = prisma.staffCapabilityGrant.findFirst.mock.calls[0][0].where;
    expect(where.revokedAt).toBeNull();
    expect(where.AND[0].OR[1].expiresAt.gt).toBeInstanceOf(Date);
    expect(where.AND[1].scopeKey.in).toEqual(['', 'class-A']);
  });
  it('a global operation does not inherit a class-only grant', async () => {
    await service.has('plus', 'time.review');
    expect(
      prisma.staffCapabilityGrant.findFirst.mock.calls[0][0].where.AND[1]
        .scopeKey.in,
    ).toEqual(['']);
  });
  it('unknown capability fails closed, including for an admin', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin',
      role: Role.ADMIN,
      archivedAt: null,
    });
    expect(await service.has('admin', 'invented' as any)).toBe(false);
  });
  it('only a current admin can list or create grants', async () => {
    await expect(service.list('plus')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.grant('plus', {
        userId: 'x',
        capability: 'schedule.manage',
        reason: 'test',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
