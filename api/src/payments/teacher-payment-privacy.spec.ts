import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { FinanceController } from '../finance/finance.controller';
import { ReconcileController } from '../reconcile/reconcile.controller';
import { StoreController } from '../store/store.controller';
import { TuitionController } from '../tuition/tuition.controller';
import { UsersService } from '../users/users.service';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import { PaymentsLedgerController } from './ledger.controller';
import { PaymentsExportController } from './payments-export.controller';
import { PaymentsController } from './payments.controller';

/**
 * Төлбөрийн нууцлал (эзэн 2026-10-23): Багш (TEACHER) нийт дүн, сарын/ангийн
 * хураангуй, урт хугацааны түүх, төлбөрийн бүртгэл, «Төлбөр» хуудсыг ХАРАХГҮЙ.
 * Зөвхөн нэг сурагчийн одоогийн төлөв (paid-until) нээлттэй.
 */
type Ctor = { prototype: object; name: string };

function ctx(handler: object, controller: Ctor, role: Role) {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  } as never;
}

const handler = (controller: Ctor, name: string) => {
  const fn = Object.getOwnPropertyDescriptor(controller.prototype, name)
    ?.value as object | undefined;
  if (!fn) throw new Error(`${controller.name}.${name} олдсонгүй`);
  return fn;
};

const guard = new RolesGuard(new Reflector());
const allows = (c: Ctor, name: string, role: Role) =>
  guard.canActivate(ctx(handler(c, name), c, role));

// Нэгтгэсэн/урт хугацааны мөнгөн мэдээлэл буцаадаг бүх маршрут
const AGGREGATE_ROUTES: [Ctor, string, string][] = [
  [PaymentsController, 'list', 'GET /payments (бүртгэл)'],
  [PaymentsController, 'monthStatus', 'GET /payments/months/:month'],
  [PaymentsController, 'studentHistory', 'GET /payments/student/:id (түүх)'],
  [PaymentsController, 'outstanding', 'GET /payments/outstanding'],
  [PaymentsLedgerController, 'overview', 'GET /payments/ledger/overview'],
  [PaymentsLedgerController, 'board', 'GET /payments/ledger/board'],
  [PaymentsLedgerController, 'student', 'GET /payments/ledger/student/:id'],
  [PaymentsExportController, 'csv', 'GET /payments/export/csv'],
  [FinanceController, 'getMonthlyReport', 'GET /finance/report'],
  [FinanceController, 'getExpenses', 'GET /finance/expenses'],
  [ReconcileController, 'getTransactions', 'GET /reconcile/transactions'],
  [StoreController, 'adminGetRevenueSummary', 'GET /store/admin/revenue'],
  [TuitionController, 'listRefunds', 'GET /tuition/refunds'],
  [TuitionController, 'getRefund', 'GET /tuition/refund/:id'],
];

describe('Төлбөрийн нууцлал — Багш (TEACHER)', () => {
  it.each(AGGREGATE_ROUTES)(
    '%p.%s (%s): Багш 403, Багш+/Админ нэвтэрнэ',
    (controller, name) => {
      expect(allows(controller, name, Role.TEACHER)).toBe(false);
      expect(allows(controller, name, Role.TEACHER_PLUS)).toBe(true);
      expect(allows(controller, name, Role.ADMIN)).toBe(true);
    },
  );

  it.each(AGGREGATE_ROUTES)(
    '%p.%s: мөн finance.manage шаардана (Багш+ хоёр давхар хамгаалалттай)',
    (controller, name) => {
      const guards = [
        ...((Reflect.getMetadata(GUARDS_METADATA, controller) as unknown[]) ??
          []),
        ...((Reflect.getMetadata(
          GUARDS_METADATA,
          handler(controller, name),
        ) as unknown[]) ?? []),
      ];
      expect(guards).toContain(FinanceCapabilityGuard);
    },
  );

  it('нэг сурагчийн одоогийн төлөв (GET /tuition/paid-until/:studentId) Багшид нээлттэй', () => {
    expect(allows(TuitionController, 'getPaidUntil', Role.TEACHER)).toBe(true);
  });

  describe('GET /users/:id — сурагчийн дэлгэрэнгүй', () => {
    const studentProfile = {
      userId: 's1',
      tuitionPlan: 'MONTHLY',
      tuitionAmount: 400000,
      tuitionNote: '2 сар урьдчилж төлсөн',
      fatherPhone: '99000000',
      motherPhone: '88000000',
      grade: 10,
    };
    function setup() {
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 's1',
            role: Role.STUDENT,
            phone: '95000000',
            archivedAt: null,
            studentProfile: { ...studentProfile },
          }),
        },
        enrollment: { findFirst: jest.fn().mockResolvedValue(null) },
        submission: { count: jest.fn().mockResolvedValue(0) },
        testResult: { count: jest.fn().mockResolvedValue(0) },
        attendance: { count: jest.fn().mockResolvedValue(0) },
        attempt: { count: jest.fn().mockResolvedValue(0) },
      };
      const service = new UsersService(
        prisma as never,
        {} as never,
        {} as never,
      );
      jest
        .spyOn(
          service as unknown as { studentFocus: () => Promise<null> },
          'studentFocus',
        )
        .mockResolvedValue(null);
      return service;
    }

    it('Багш: төлбөрийн багц/дүн/тайлбар хоосон, утасгүй', async () => {
      const res = await setup().getUserDetail('s1', 't1', Role.TEACHER);
      expect(res.studentProfile).toMatchObject({
        tuitionPlan: null,
        tuitionAmount: null,
        tuitionNote: null,
        fatherPhone: null,
        motherPhone: null,
        grade: 10,
      });
    });

    it('Багш+/Админ: бүрэн харна', async () => {
      for (const role of [Role.TEACHER_PLUS, Role.ADMIN]) {
        const res = await setup().getUserDetail('s1', 'p1', role);
        expect(res.studentProfile).toMatchObject({
          tuitionPlan: 'MONTHLY',
          tuitionAmount: 400000,
          tuitionNote: '2 сар урьдчилж төлсөн',
        });
      }
    });
  });
});
