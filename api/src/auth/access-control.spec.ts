import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { FinanceController } from '../finance/finance.controller';
import { TuitionController } from '../tuition/tuition.controller';

/**
 * Мөнгөний маршрутуудын эрхийн хамгаалалт — 2026-09-26 (G02–G03).
 *
 * Өмнө нь эдгээр маршрутад зөвхөн JwtAuthGuard байсан тул НЭВТЭРСЭН ямар ч
 * хүн (сурагч ч) цалин, орлого, буцаалтын жагсаалтыг уншиж чаддаг байв.
 * @Roles-ыг хэн нэгэн санамсаргүй хасвал энэ тест унана.
 */
function rolesOf(target: object): string[] | undefined {
  return Reflect.getMetadata(ROLES_KEY, target);
}
function guardsOf(target: object): unknown[] {
  return Reflect.getMetadata(GUARDS_METADATA, target) ?? [];
}

describe('Санхүүгийн маршрутууд — зөвхөн ADMIN', () => {
  it('FinanceController бүхэлдээ RolesGuard + ADMIN', () => {
    expect(guardsOf(FinanceController)).toContain(RolesGuard);
    expect(rolesOf(FinanceController)).toEqual(['ADMIN']);
  });
});

describe('Буцаалтын маршрутууд — зөвхөн ажилтан', () => {
  const proto = TuitionController.prototype;
  const readers = ['listRefunds', 'getRefund'] as const;

  it.each(readers)('%s — RolesGuard + ADMIN/TEACHER_PLUS', (name) => {
    const handler = proto[name];
    expect(guardsOf(handler)).toContain(RolesGuard);
    expect(rolesOf(handler)).toEqual(['ADMIN', 'TEACHER_PLUS']);
  });

  it('буцаалтын БҮХ маршрут @Roles-тэй (сурагчийн paid-until/my-ээс бусад)', () => {
    const names = Object.getOwnPropertyNames(proto).filter(
      (n) => n !== 'constructor' && typeof (proto as any)[n] === 'function',
    );
    const unguarded = names.filter((n) => !rolesOf((proto as any)[n]));
    expect(unguarded).toEqual([]);
  });
});
