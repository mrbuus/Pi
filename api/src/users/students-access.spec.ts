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
  it('keeps archive and import actions ADMIN-only', () => {
    const proto = UsersController.prototype;
    for (const action of [
      'archiveStudent',
      'unarchiveStudent',
      'previewStudentImport',
      'commitStudentImport',
    ]) {
      const handler = Object.getOwnPropertyDescriptor(proto, action)
        ?.value as object;
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
