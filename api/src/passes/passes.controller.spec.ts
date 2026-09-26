import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Role } from '../generated/prisma/enums';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PassesController } from './passes.controller';

describe('PassesController эрхийн хамгаалалт', () => {
  const proto = PassesController.prototype;
  const roles = (method: string) =>
    Reflect.getMetadata(ROLES_KEY, proto[method]);
  const guards = (method: string) =>
    Reflect.getMetadata(GUARDS_METADATA, proto[method]) as unknown[];

  it.each(['listAll', 'holders', 'update', 'remove', 'revoke'])(
    '%s зөвхөн ADMIN',
    (method) => {
      expect(roles(method)).toEqual([Role.ADMIN]);
      expect(guards(method)).toEqual(
        expect.arrayContaining([JwtAuthGuard, RolesGuard]),
      );
    },
  );

  it('гараар олгох нь ADMIN болон TEACHER_PLUS-д нээлттэй', () => {
    expect(roles('grant')).toEqual([Role.ADMIN, Role.TEACHER_PLUS]);
    expect(guards('grant')).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
  });

  it('шалтгаантай олголт цуцлах нь ADMIN болон TEACHER_PLUS-д нээлттэй', () => {
    expect(roles('revokeWithReason')).toEqual([Role.ADMIN, Role.TEACHER_PLUS]);
    expect(guards('revokeWithReason')).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
  });

  it.each([Role.TEACHER, Role.STUDENT])(
    '%s жагсаалт, эзэмшигч, устгах зэрэг админ үйлдлээс татгалзана',
    (role) => {
      const guard = new RolesGuard(new Reflector());
      const handler = proto.listAll;
      const context = {
        getHandler: () => handler,
        getClass: () => PassesController,
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
      } as never;
      expect(guard.canActivate(context)).toBe(false);
    },
  );

  it.each([Role.TEACHER, Role.STUDENT])('%s эрх олгож чадахгүй', (role) => {
    const guard = new RolesGuard(new Reflector());
    const context = {
      getHandler: () => proto.grant,
      getClass: () => PassesController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as never;
    expect(guard.canActivate(context)).toBe(false);
  });

  it.each([Role.TEACHER, Role.STUDENT])(
    '%s шалтгаантай эрх цуцалж чадахгүй',
    (role) => {
      const guard = new RolesGuard(new Reflector());
      const context = {
        getHandler: () => proto.revokeWithReason,
        getClass: () => PassesController,
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
      } as never;
      expect(guard.canActivate(context)).toBe(false);
    },
  );
});
