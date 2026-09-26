import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { TeacherGroupsController } from './teacher-groups.controller';

describe('TeacherGroupsController verification routes', () => {
  const prototype = TeacherGroupsController.prototype;
  const route = (method: string) =>
    (prototype as any)[method] as (...args: unknown[]) => unknown;

  it('registers static verified route before the group-id route', () => {
    const verified = route('getVerifiedTeachers');
    const details = route('getGroupDetails');
    const methodNames = Object.getOwnPropertyNames(prototype);

    expect(Reflect.getMetadata(PATH_METADATA, verified)).toBe('verified');
    expect(Reflect.getMetadata(METHOD_METADATA, verified)).toBe(
      RequestMethod.GET,
    );
    expect(methodNames.indexOf('getVerifiedTeachers')).toBeLessThan(
      methodNames.indexOf('getGroupDetails'),
    );
    expect(details).toBeDefined();
  });

  it('restricts the verified list to ADMIN and TEACHER_PLUS', () => {
    const handler = route('getVerifiedTeachers');
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      'ADMIN',
      'TEACHER_PLUS',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('restricts unverify to ADMIN only', () => {
    const handler = route('unverifyExternalTeacher');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(
      'unverify/:userId',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.PUT,
    );
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['ADMIN']);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });
});
