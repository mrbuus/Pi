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

// Night-1 PRs deliberately share the owner's base. Missing sibling features are
// visible skips here; NIGHT1_COMPLETE=1 makes a merged/integration checkout fail
// if even one required contract is absent. Never call this mode a full check otherwise.
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ExecutionContext, RequestMethod } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Role } from '../generated/prisma/enums';
interface NightContract {
  gap: string;
  file: string;
  controller: string;
  method: string;
  path: string;
  roles: string[];
  feature?: string;
}
const contracts =
  require('../../test/smoke/night1-contracts.json') as NightContract[];
const missing: string[] = [];
const roleGuard = new RolesGuard(new Reflector());
function loadContract(contract: NightContract) {
  const file = join(__dirname, '..', contract.file + '.ts');
  if (
    !existsSync(file) ||
    (contract.feature &&
      !existsSync(join(__dirname, '../../..', contract.feature)))
  )
    return null;
  const controller = require(file)[contract.controller];
  if (!controller)
    throw new Error(`Missing controller export: ${contract.controller}`);
  const prefix = Reflect.getMetadata(PATH_METADATA, controller) ?? '';
  for (const name of Object.getOwnPropertyNames(controller.prototype)) {
    if (name === 'constructor') continue;
    const handler = controller.prototype[name];
    const method = RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler)];
    const path =
      '/api/' +
      [prefix, Reflect.getMetadata(PATH_METADATA, handler) ?? '']
        .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
        .filter(Boolean)
        .join('/');
    if (method === contract.method && path === contract.path)
      return { controller, handler };
  }
  return null;
}
describe('Night-1 route guards across six roles', () => {
  for (const contract of contracts) {
    const target = loadContract(contract);
    const label = `${contract.gap} ${contract.method} ${contract.path}`;
    if (!target) missing.push(label);
    (target ? it : it.skip)(label, () => {
      if (!target) throw new Error('Missing required route');
      const { controller, handler } = target;
      const guards = [...guardsOf(controller), ...guardsOf(handler)];
      if (!contract.roles.length) {
        expect(guards).not.toContain(JwtAuthGuard);
        return;
      }
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
      expect(
        [...(rolesOf(handler) ?? rolesOf(controller) ?? [])].sort(),
      ).toEqual([...contract.roles].sort());
      for (const role of [undefined, ...Object.values(Role)]) {
        const context = {
          getHandler: () => handler,
          getClass: () => controller,
          switchToHttp: () => ({
            getRequest: () => ({
              user: role ? { userId: 'synthetic-user', role } : undefined,
            }),
          }),
        } as unknown as ExecutionContext;
        expect(roleGuard.canActivate(context)).toBe(
          !!role && contract.roles.includes(role),
        );
      }
    });
  }
  it('strict integration mode requires every sibling feature', () => {
    if (process.env.NIGHT1_COMPLETE === '1') expect(missing).toEqual([]);
    else if (missing.length)
      console.info(
        `Night-1 pending sibling contracts: ${missing.length}; run NIGHT1_COMPLETE=1 after integrating listed PR dependencies.`,
      );
  });
});
