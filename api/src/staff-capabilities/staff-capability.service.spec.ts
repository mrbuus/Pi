import { ForbiddenException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import {
  StaffCapabilityService,
  TEACHER_PLUS_DEFAULT,
} from './staff-capability.service';

describe('staff capability decision boundaries', () => {
  let prisma: any;
  let service: StaffCapabilityService;
  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
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
  it('TEACHER_PLUS edits the schedule by default (owner decision 2026-10-18); only a DENY row closes it', async () => {
    await expect(
      service.assert('plus', 'schedule.manage', 'class'),
    ).resolves.toBeUndefined();
    const where = prisma.staffCapabilityGrant.findFirst.mock.calls[0][0].where;
    // хаалт зөвхөн бүх ангид (scopeKey ''), идэвхтэй (цуцлагдаагүй, хугацаа дуусаагүй)
    expect(where).toEqual(
      expect.objectContaining({
        userId: 'plus',
        capability: 'schedule.manage',
        effect: 'DENY',
        scopeKey: '',
        revokedAt: null,
      }),
    );
    expect(where.OR[1].expiresAt.gt).toBeInstanceOf(Date);
    prisma.user.findUnique.mockResolvedValue({
      id: 't',
      role: Role.TEACHER,
      archivedAt: null,
    });
    await expect(
      service.assert('t', 'schedule.manage', 'class'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('TEACHER_PLUS manages payments by default (owner decision 2026-10-08), but grant-only rights stay closed', async () => {
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
  it.each(TEACHER_PLUS_DEFAULT)(
    'default-on %s: open for every TEACHER_PLUS, closed by DENY, reopened when DENY revoked',
    async (cap) => {
      expect(await service.has('plus', cap)).toBe(true);
      prisma.staffCapabilityGrant.findFirst.mockResolvedValueOnce({
        id: 'deny',
      });
      expect(await service.has('plus', cap)).toBe(false);
      await expect(
        service.assertForTeacherPlus('plus', cap),
      ).resolves.toBeUndefined();
      prisma.staffCapabilityGrant.findFirst.mockResolvedValueOnce({
        id: 'deny',
      });
      await expect(
        service.assertForTeacherPlus('plus', cap),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
  it('a DENY row never opens a grant-only right; ALLOW lookup ignores DENY rows', async () => {
    await service.has('plus', 'student-password.set');
    expect(
      prisma.staffCapabilityGrant.findFirst.mock.calls[0][0].where.effect,
    ).toBe('ALLOW');
  });
  it('the guard helper never restricts ADMIN or non-TEACHER_PLUS roles (RolesGuard decides)', async () => {
    prisma.staffCapabilityGrant.findFirst.mockResolvedValue({ id: 'deny' });
    for (const role of [Role.ADMIN, Role.TEACHER, Role.STUDENT]) {
      prisma.user.findUnique.mockResolvedValue({
        id: 'x',
        role,
        archivedAt: null,
      });
      await expect(
        service.assertForTeacherPlus('x', 'students.manage'),
      ).resolves.toBeUndefined();
    }
    // Админ DENY мөртэй байсан ч бүх эрхтэй
    prisma.user.findUnique.mockResolvedValue({
      id: 'a',
      role: Role.ADMIN,
      archivedAt: null,
    });
    expect(await service.has('a', 'students.manage')).toBe(true);
    // Багш анхдагч эрх эзэмшихгүй
    prisma.user.findUnique.mockResolvedValue({
      id: 't',
      role: Role.TEACHER,
      archivedAt: null,
    });
    prisma.staffCapabilityGrant.findFirst.mockResolvedValue(null);
    expect(await service.has('t', 'content.manage')).toBe(false);
  });
  it('financeRole downgrades a TEACHER_PLUS without finance.manage to TEACHER (amounts hidden)', async () => {
    expect(await service.financeRole('plus', Role.TEACHER_PLUS)).toBe(
      Role.TEACHER_PLUS,
    );
    prisma.staffCapabilityGrant.findFirst.mockResolvedValueOnce({ id: 'deny' });
    expect(await service.financeRole('plus', Role.TEACHER_PLUS)).toBe(
      Role.TEACHER,
    );
    expect(await service.financeRole('plus', Role.ADMIN)).toBe(Role.ADMIN);
  });
  it('/me lists default-on rights minus denied ones, plus active ALLOW grants', async () => {
    prisma.staffCapabilityGrant.findMany.mockResolvedValue([
      {
        id: 'd1',
        capability: 'students.export',
        scopeKey: '',
        expiresAt: null,
        effect: 'DENY',
      },
      {
        id: 'g1',
        capability: 'student-password.set',
        scopeKey: '',
        expiresAt: null,
        effect: 'ALLOW',
      },
      // хуучин ALLOW мөр анхдагч эрх дээр — давхардуулахгүй
      {
        id: 'g2',
        capability: 'finance.manage',
        scopeKey: '',
        expiresAt: null,
        effect: 'ALLOW',
      },
    ]);
    const me = await service.mine('plus');
    expect(me.denied).toEqual(['students.export']);
    expect(me.capabilities).not.toContain('students.export');
    expect(me.capabilities).toEqual(
      expect.arrayContaining([
        'student-password.set',
        'finance.manage',
        'schedule.manage',
      ]),
    );
    expect(
      me.grants.filter((g) => g.capability === 'finance.manage'),
    ).toHaveLength(1);
    expect(me.grants.some((g) => g.capability === 'students.export')).toBe(
      false,
    );
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
    expect(await service.has('plus', 'time.review', 'class-A')).toBe(true);
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
  it('admin DENY only for default-on rights; ALLOW only for grant-only rights', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin',
      role: Role.ADMIN,
      archivedAt: null,
    });
    await expect(
      service.grant('admin', {
        userId: 'p',
        capability: 'students.manage',
        reason: 'туршилт',
      }),
    ).rejects.toThrow(/анхдагчаар/);
    await expect(
      service.grant('admin', {
        userId: 'p',
        capability: 'payroll.view',
        reason: 'туршилт',
        effect: 'DENY',
      }),
    ).rejects.toThrow(/олголтоор/);
    await expect(
      service.grant('admin', {
        userId: 'p',
        capability: 'schedule.manage',
        scopeKey: 'c1',
        reason: 'туршилт',
        effect: 'DENY',
      }),
    ).rejects.toThrow(/ангид/);
  });
  it('admin DENY writes an effect=DENY row and a DENY audit entry', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin',
      role: Role.ADMIN,
      archivedAt: null,
    });
    const tx: any = {
      $executeRaw: jest.fn(),
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ role: Role.TEACHER_PLUS, archivedAt: null }),
      },
      classroom: { findFirst: jest.fn() },
      staffCapabilityGrant: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest
          .fn()
          .mockImplementation(({ create }: any) => ({
            id: 'row',
            ...create,
            revokedAt: null,
          })),
      },
      auditLog: { create: jest.fn() },
    };
    prisma.$transaction = (fn: any) => fn(tx);
    const row = await service.grant('admin', {
      userId: 'p',
      capability: 'students.export',
      reason: 'туршилт',
      effect: 'DENY',
    });
    expect(row.effect).toBe('DENY');
    expect(tx.staffCapabilityGrant.upsert.mock.calls[0][0].update).toEqual(
      expect.objectContaining({ effect: 'DENY', revokedAt: null }),
    );
    expect(tx.auditLog.create.mock.calls[0][0].data.action).toBe('DENY');
  });
  it('revoking a DENY row reopens the right and is audited as ALLOW (soft, revokedAt)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin',
      role: Role.ADMIN,
      archivedAt: null,
    });
    const deny = {
      id: 'd',
      userId: 'p',
      capability: 'students.export',
      scopeKey: '',
      effect: 'DENY',
      revokedAt: null,
    };
    const tx: any = {
      $executeRaw: jest.fn(),
      staffCapabilityGrant: {
        findUnique: jest.fn().mockResolvedValue(deny),
        findUniqueOrThrow: jest.fn().mockResolvedValue(deny),
        update: jest
          .fn()
          .mockImplementation(({ data }: any) => ({ ...deny, ...data })),
      },
      auditLog: { create: jest.fn() },
    };
    prisma.$transaction = (fn: any) => fn(tx);
    await service.revoke('admin', 'd', 'дахин нээв');
    expect(
      tx.staffCapabilityGrant.update.mock.calls[0][0].data.revokedAt,
    ).toBeInstanceOf(Date);
    expect(tx.auditLog.create.mock.calls[0][0].data.action).toBe('ALLOW');
  });
});
