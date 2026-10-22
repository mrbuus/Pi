/* Synthetic test doubles only. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { StaffCapabilityController } from './staff-capability.controller';
import {
  STAFF_CAPABILITIES,
  StaffCapabilityService,
  TEACHER_PLUS_IMPLICIT,
} from './staff-capability.service';

// Эрхийн матриц: харах, олгох, цуцлах бүгд ЗӨВХӨН ADMIN (эзэн 2026-10-22).
describe('permission matrix endpoints are ADMIN-only', () => {
  const proto = StaffCapabilityController.prototype;

  it.each(['list', 'grant', 'revoke'] as const)(
    '%s requires Roles(ADMIN) behind JWT + RolesGuard',
    (name) => {
      expect(Reflect.getMetadata(ROLES_KEY, proto[name])).toEqual([Role.ADMIN]);
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        StaffCapabilityController,
      );
      expect(guards).toEqual(
        expect.arrayContaining([JwtAuthGuard, RolesGuard]),
      );
    },
  );

  it('every handler except /me carries an explicit ADMIN-only @Roles', () => {
    const names = Object.getOwnPropertyNames(proto).filter(
      (n) => n !== 'constructor' && typeof (proto as any)[n] === 'function',
    );
    const open = names.filter(
      (n) =>
        !Reflect.getMetadata(ROLES_KEY, (proto as any)[n]) &&
        n !== 'mine',
    );
    expect(open).toEqual([]);
    // /me yalgaa: only the caller's OWN grants (schedule/hours pages need it)
    expect(Reflect.getMetadata(ROLES_KEY, proto.mine)).toBeUndefined();
  });
});

describe('permission matrix data is refused to non-admins at the service too', () => {
  function build(role: Role) {
    const prisma: any = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'u', role, archivedAt: null }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      staffCapabilityGrant: { findMany: jest.fn().mockResolvedValue([]) },
      classroom: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return { prisma, service: new StaffCapabilityService(prisma) };
  }

  it.each([Role.TEACHER_PLUS, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.BUYER])(
    '%s cannot list, grant or revoke',
    async (role) => {
      const { prisma, service } = build(role);
      await expect(service.list('u')).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.grant('u', {
          userId: 'x',
          capability: 'payroll.view',
          reason: 'туршилт',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.revoke('u', 'grant-1', 'туршилт'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      // Нэг ч мөр өгөгдөл уншигдаагүй
      expect(prisma.user.findMany).not.toHaveBeenCalled();
      expect(prisma.staffCapabilityGrant.findMany).not.toHaveBeenCalled();
    },
  );

  it('ADMIN gets every active staff user (Admin, Teacher+, Teacher) with role and phone', async () => {
    const { prisma, service } = build(Role.ADMIN);
    prisma.user.findMany.mockResolvedValue([
      { id: 'a', firstName: 'Нэр', lastName: 'Б.', phone: '99112233', role: Role.TEACHER },
    ]);
    const res = await service.list('u');
    const query = prisma.user.findMany.mock.calls[0][0];
    expect(query.where.role.in.sort()).toEqual(
      [Role.ADMIN, Role.TEACHER, Role.TEACHER_PLUS].sort(),
    );
    expect(query.where.archivedAt).toBeNull();
    expect(query.select).toEqual(
      expect.objectContaining({ phone: true, role: true }),
    );
    expect(res.staff).toHaveLength(1);
    expect(res.capabilities).toEqual(STAFF_CAPABILITIES);
    expect(res.teacherPlusImplicit).toEqual(TEACHER_PLUS_IMPLICIT);
  });
});
