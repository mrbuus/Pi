import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DraftFileGuard } from './draft-file.guard';
import {
  InternalDraftFilesController,
  InternalDraftsController,
} from './internal-drafts.controller';

/**
 * Маршрутын эрхийн гэрээ: ноорогт нийтлээгүй хариу байдаг тул маршрут БҮР
 * JwtAuthGuard + RolesGuard + яг ADMIN/TEACHER_PLUS. Хэн нэгэн @Roles-ыг
 * санамсаргүй хасах эсвэл TEACHER/STUDENT нэмбэл энэ тест унана.
 */
const guardsOf = (target: object): unknown[] =>
  Reflect.getMetadata(GUARDS_METADATA, target) ?? [];
const rolesOf = (target: object): string[] | undefined =>
  Reflect.getMetadata(ROLES_KEY, target);

describe('InternalDraftsController — зөвхөн Багш+/Админ', () => {
  const proto = InternalDraftsController.prototype as unknown as Record<
    string,
    object
  >;
  const handlers = Object.getOwnPropertyNames(proto).filter(
    (name) => name !== 'constructor',
  );

  it('controller түвшинд JWT + Roles guard', () => {
    expect(guardsOf(InternalDraftsController)).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
    expect(rolesOf(InternalDraftsController)).toEqual(['ADMIN', 'TEACHER_PLUS']);
    expect(Reflect.getMetadata(PATH_METADATA, InternalDraftsController)).toBe(
      'internal-drafts',
    );
  });

  it.each(handlers)('%s — ADMIN, TEACHER_PLUS л', (name) => {
    expect(rolesOf(proto[name])).toEqual(['ADMIN', 'TEACHER_PLUS']);
  });

  it('13 маршрут бүгд бүртгэгдсэн', () => {
    expect(handlers.sort()).toEqual(
      [
        'addBlock',
        'addBlocks',
        'check',
        'create',
        'duplicate',
        'get',
        'list',
        'publish',
        'remove',
        'removeBlock',
        'reorder',
        'update',
        'updateBlock',
      ].sort(),
    );
  });
});

describe('InternalDraftFilesController — токен + ноорогийн холбоос', () => {
  it('зургийн маршрут DraftFileGuard-тай', () => {
    expect(guardsOf(InternalDraftFilesController.prototype.serve)).toContain(
      DraftFileGuard,
    );
  });
});
