import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/enums';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersController } from './users.controller';
import { StudentsExportController } from './students-export.controller';

function context(handler: object, controller: object, role: Role) {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as never;
}

describe('student maintenance role gates', () => {
  const guard = new RolesGuard(new Reflector());
  const handlerOf = (action: string) =>
    Object.getOwnPropertyDescriptor(UsersController.prototype, action)
      ?.value as object;
  it('keeps Excel import ADMIN-only', () => {
    for (const action of ['previewStudentImport', 'commitStudentImport']) {
      const handler = handlerOf(action);
      expect(
        guard.canActivate(context(handler, UsersController, Role.ADMIN)),
      ).toBe(true);
      expect(
        guard.canActivate(context(handler, UsersController, Role.TEACHER_PLUS)),
      ).toBe(false);
      expect(
        guard.canActivate(context(handler, UsersController, Role.STUDENT)),
      ).toBe(false);
    }
  });
  it('lets ADMIN and TEACHER_PLUS (only) archive and restore students', () => {
    for (const action of ['archiveStudent', 'unarchiveStudent']) {
      const handler = handlerOf(action);
      for (const role of [Role.ADMIN, Role.TEACHER_PLUS])
        expect(
          guard.canActivate(context(handler, UsersController, role)),
        ).toBe(true);
      for (const role of [Role.TEACHER, Role.STUDENT, Role.PARENT, Role.BUYER])
        expect(
          guard.canActivate(context(handler, UsersController, role)),
        ).toBe(false);
    }
  });
  it('allows CSV export to ADMIN and TEACHER_PLUS only', () => {
    const handler = Object.getOwnPropertyDescriptor(
      StudentsExportController.prototype,
      'exportStudents',
    )?.value as object;
    expect(
      guard.canActivate(context(handler, StudentsExportController, Role.ADMIN)),
    ).toBe(true);
    expect(
      guard.canActivate(
        context(handler, StudentsExportController, Role.TEACHER_PLUS),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        context(handler, StudentsExportController, Role.STUDENT),
      ),
    ).toBe(false);
  });
});
