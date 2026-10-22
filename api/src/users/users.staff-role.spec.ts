/* Synthetic test doubles only; jest mock tuples are `any`. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// Эрхийн матрицаас Багш ↔ Багш+ солих дүрэм (эзэн 2026-10-22):
// ADMIN-ыг өөрчлөхгүй, өөрийгөө өөрчлөхгүй, зөвхөн ажилтны хоёр түвшин, аудиттай.
function setup(opts: { actor?: any; target?: any; revoked?: number } = {}) {
  const actor =
    opts.actor === undefined
      ? { role: Role.ADMIN, archivedAt: null }
      : opts.actor;
  const target =
    opts.target === undefined
      ? { id: 't1', role: Role.TEACHER, archivedAt: null }
      : opts.target;
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    user: {
      findUnique: jest.fn().mockResolvedValue(target),
      update: jest.fn().mockResolvedValue({}),
    },
    teacherProfile: { upsert: jest.fn().mockResolvedValue({}) },
    staffCapabilityGrant: {
      updateMany: jest.fn().mockResolvedValue({ count: opts.revoked ?? 0 }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(actor) },
    $transaction: jest.fn((cb: (c: unknown) => unknown) => cb(tx)),
  };
  const service = new UsersService(prisma as any, {} as any, {} as any);
  return { service, prisma, tx };
}

describe('UsersService.setStaffRole', () => {
  it('promotes Teacher to Teacher+ and writes one audit row', async () => {
    const { service, tx } = setup();
    const res = await service.setStaffRole('t1', Role.TEACHER_PLUS, 'admin', ' Бүх ангийн төлбөр хариуцна ');
    expect(res).toEqual(
      expect.objectContaining({ id: 't1', role: Role.TEACHER_PLUS, changed: true }),
    );
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { role: Role.TEACHER_PLUS },
    });
    expect(tx.teacherProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { canManageStudents: true } }),
    );
    expect(tx.staffCapabilityGrant.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        actorId: 'admin',
        actorRole: Role.ADMIN,
        action: 'ROLE_CHANGE',
        entity: 'User',
        entityId: 't1',
        before: { role: Role.TEACHER },
        after: { role: Role.TEACHER_PLUS, revokedGrants: 0 },
        reason: 'Бүх ангийн төлбөр хариуцна',
      }),
    );
  });

  it('demotes Teacher+ to Teacher and revokes every active grant (no silent revival)', async () => {
    const { service, tx } = setup({
      target: { id: 't1', role: Role.TEACHER_PLUS, archivedAt: null },
      revoked: 2,
    });
    const res = await service.setStaffRole('t1', Role.TEACHER, 'admin');
    expect(res).toEqual(
      expect.objectContaining({ role: Role.TEACHER, revokedGrants: 2 }),
    );
    expect(tx.staffCapabilityGrant.updateMany).toHaveBeenCalledWith({
      where: { userId: 't1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(tx.teacherProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { canManageStudents: false } }),
    );
    expect(tx.auditLog.create.mock.calls[0][0].data.after).toEqual({
      role: Role.TEACHER,
      revokedGrants: 2,
    });
  });

  it('is a no-op (no write, no audit) when the role is already set', async () => {
    const { service, tx } = setup({
      target: { id: 't1', role: Role.TEACHER_PLUS, archivedAt: null },
    });
    const res = await service.setStaffRole('t1', Role.TEACHER_PLUS, 'admin');
    expect(res).toEqual({ id: 't1', role: Role.TEACHER_PLUS, changed: false });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('NEVER changes an ADMIN account, whichever role is requested', async () => {
    for (const role of [Role.TEACHER, Role.TEACHER_PLUS]) {
      const { service, tx } = setup({
        target: { id: 'other-admin', role: Role.ADMIN, archivedAt: null },
      });
      await expect(
        service.setStaffRole('other-admin', role, 'admin'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.auditLog.create).not.toHaveBeenCalled();
    }
  });

  it('NEVER lets an admin change their own role', async () => {
    const { service, prisma } = setup();
    await expect(
      service.setStaffRole('admin', Role.TEACHER, 'admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('only accepts the two staff roles as the new role', async () => {
    for (const role of [Role.ADMIN, Role.STUDENT, Role.PARENT, Role.BUYER]) {
      const { service, prisma } = setup();
      await expect(
        service.setStaffRole('t1', role, 'admin'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    }
  });

  it('only touches staff targets (students, parents, buyers are refused)', async () => {
    for (const role of [Role.STUDENT, Role.PARENT, Role.BUYER]) {
      const { service, tx } = setup({
        target: { id: 'x', role, archivedAt: null },
      });
      await expect(
        service.setStaffRole('x', Role.TEACHER_PLUS, 'admin'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.user.update).not.toHaveBeenCalled();
    }
  });

  it('refuses archived and missing targets', async () => {
    const archived = setup({
      target: { id: 't1', role: Role.TEACHER, archivedAt: new Date() },
    });
    await expect(
      archived.service.setStaffRole('t1', Role.TEACHER_PLUS, 'admin'),
    ).rejects.toBeInstanceOf(BadRequestException);
    const missing = setup({ target: null });
    await expect(
      missing.service.setStaffRole('nope', Role.TEACHER_PLUS, 'admin'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('re-checks the ACTOR in the database: only an active ADMIN may change roles', async () => {
    for (const actor of [
      { role: Role.TEACHER_PLUS, archivedAt: null },
      { role: Role.TEACHER, archivedAt: null },
      { role: Role.ADMIN, archivedAt: new Date() },
      null,
    ]) {
      const { service, prisma } = setup({ actor });
      await expect(
        service.setStaffRole('t1', Role.TEACHER_PLUS, 'actor'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    }
  });

  it('rejects an over-long reason before any write', async () => {
    const { service, prisma } = setup();
    await expect(
      service.setStaffRole('t1', Role.TEACHER_PLUS, 'admin', 'x'.repeat(501)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('PATCH /users/:id/staff-role endpoint contract', () => {
  const handler = UsersController.prototype.setStaffRole;

  it('is ADMIN-only behind JWT + Roles guards', () => {
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([Role.ADMIN]);
    const guards = Reflect.getMetadata(GUARDS_METADATA, UsersController);
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
  });

  it('validates the body: only TEACHER or TEACHER_PLUS, reason capped at 500', async () => {
    const dtoClass = Reflect.getMetadata(
      'design:paramtypes',
      UsersController.prototype,
      'setStaffRole',
    )[1];
    const check = (body: object) =>
      validate(plainToInstance(dtoClass, body) as object);
    expect(await check({ role: 'TEACHER_PLUS' })).toHaveLength(0);
    expect(await check({ role: 'TEACHER', reason: 'Туршилт' })).toHaveLength(0);
    for (const role of ['ADMIN', 'STUDENT', 'PARENT', 'BUYER', 'x', undefined])
      expect((await check({ role })).length).toBeGreaterThan(0);
    expect(
      (await check({ role: 'TEACHER', reason: 'x'.repeat(501) })).length,
    ).toBeGreaterThan(0);
  });
});
