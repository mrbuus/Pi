/* Synthetic test doubles only. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { CAPABILITY_KEY, CapabilityGuard } from './capability.guard';
import { StaffCapabilityService } from './staff-capability.service';
import { StudentsExportController } from '../users/students-export.controller';
import { UsersController } from '../users/users.controller';
import { ClassroomsController } from '../classrooms/classrooms.controller';
import { MockExamsController } from '../mock-exams/mock-exams.controller';
import { ContentController } from '../content/content.controller';
import { TasksController } from '../tasks/tasks.controller';
import { AuditController } from '../audit/audit.controller';
import { ScheduleController } from '../schedule/schedule.controller';

// Эрхийн матриц (эзэн 2026-11-16): Багш+-ийн кодонд шууд байсан эрхүүд матрицаар
// хаагдана. Маршрут бүр @Roles-оо хэвээр үлдээж, CapabilityGuard нэмэгдэнэ.
describe('Эрхийн матриц — маршрутын эрх', () => {
  const cases: [object, string, string][] = [
    [StudentsExportController, 'exportXlsx', 'students.export'],
    [StudentsExportController, 'exportStudents', 'students.export'],
    [UsersController, 'sendPasswordReset', 'students.manage'],
    [UsersController, 'createClassroomStudent', 'students.manage'],
    [ClassroomsController, 'create', 'classes.manage'],
    [ClassroomsController, 'disband', 'classes.manage'],
    [ClassroomsController, 'setTeachers', 'classes.manage'],
    [ClassroomsController, 'enroll', 'students.manage'],
    [MockExamsController, 'create', 'exams.manage'],
    [ContentController, 'updateProblem', 'content.manage'],
    [TasksController, 'create', 'tasks.manage'],
    [AuditController, 'list', 'reports.view'],
    [ScheduleController, 'update', 'schedule.manage'],
  ];
  it.each(cases)(
    '%p.%s → %s, Roles хэвээр (Багш ороогүй)',
    (C: any, name, cap) => {
      const h = C.prototype[name];
      expect(Reflect.getMetadata(CAPABILITY_KEY, h)).toBe(cap);
      expect(Reflect.getMetadata(GUARDS_METADATA, h)).toContain(
        CapabilityGuard,
      );
      const roles =
        Reflect.getMetadata(ROLES_KEY, h) ?? Reflect.getMetadata(ROLES_KEY, C);
      expect(roles).toContain(Role.TEACHER_PLUS);
      expect(roles).not.toContain(Role.TEACHER);
    },
  );
});

describe('CapabilityGuard', () => {
  function ctx(handler: () => void, userId?: string) {
    return {
      getHandler: () => handler,
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({ user: userId ? { userId } : undefined }),
      }),
    } as any;
  }
  function build(role: Role, denied: boolean) {
    const prisma: any = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'u', role, archivedAt: null }),
      },
      staffCapabilityGrant: {
        findFirst: jest.fn().mockResolvedValue(denied ? { id: 'd' } : null),
      },
    };
    return new CapabilityGuard(
      new Reflector(),
      new StaffCapabilityService(prisma),
    );
  }
  const handler = () => undefined;
  Reflect.defineMetadata(CAPABILITY_KEY, 'students.export', handler);

  it('Багш+ анхдагчаар нэвтэрнэ', async () => {
    await expect(
      build(Role.TEACHER_PLUS, false).canActivate(ctx(handler, 'u')),
    ).resolves.toBe(true);
  });
  it('Багш+ хаалттай бол 403', async () => {
    await expect(
      build(Role.TEACHER_PLUS, true).canActivate(ctx(handler, 'u')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('Админ хаалт мөртэй байсан ч нэвтэрнэ', async () => {
    await expect(
      build(Role.ADMIN, true).canActivate(ctx(handler, 'u')),
    ).resolves.toBe(true);
  });
  it('Багшид нөлөөлөхгүй (RolesGuard шийднэ)', async () => {
    await expect(
      build(Role.TEACHER, true).canActivate(ctx(handler, 'u')),
    ).resolves.toBe(true);
  });
  it('нэвтрээгүй бол нэвтрүүлэхгүй', async () => {
    await expect(
      build(Role.TEACHER_PLUS, false).canActivate(ctx(handler)),
    ).resolves.toBe(false);
  });
});
