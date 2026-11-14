import { Role } from '../generated/prisma/enums';
import { PaymentsLedgerController } from './ledger.controller';
import {
  amountsHiddenFor,
  redactBoard,
  redactOverview,
  redactRow,
  redactStudent,
  studentPaymentView,
} from './ledger-redact';
import type { LedgerRow } from './ledger.service';

/**
 * Эзний хатуу дүрэм: Багш+ төлбөрөөс ЗӨВХӨН ТӨЛӨВ харна — мөнгөн дүн серверээс
 * гарахгүй. Админ өөрчлөгдөхгүй.
 */
const row = (): LedgerRow => ({
  id: 's1',
  firstName: 'Нэр',
  lastName: 'Овог',
  code: 'B27120001',
  phone: '99112233',
  classroom: { id: 'c1', name: '12А' },
  plan: { kind: 'MONTHLY', guessed: false, fee: 350_000, total: 2_500_000, first: 0, settled: false, raw: null },
  startDate: '2026-09-01',
  leftOn: null,
  blocks: [
    { month: '2026-09', state: 'PAID', due: 350_000, paid: 350_000, dueOn: '2026-09-05', paidOn: '2026-09-03', lateDays: 0 },
    { month: '2026-10', state: 'OWED', due: 350_000, paid: 100_000, dueOn: '2026-10-05', paidOn: null, lateDays: 0 },
  ],
  price: 3_500_000,
  paidTotal: 450_000,
  dueNow: 700_000,
  owedNow: 250_000,
  owedMonths: 1,
  remaining: 3_050_000,
  credit: 0,
  nextDue: { month: '2026-10', amount: 250_000, dueOn: '2026-10-05' },
  overdueDays: 12,
  coveredThrough: '2026-09',
  notes: { count: 1, last: { body: 'Ээж нь залгана', authorName: 'Б. Болортуяа+', at: '2026-10-20T00:00:00Z' } },
  promise: { on: '2026-11-05', state: 'UPCOMING', overdueDays: 0 },
});

const MONEY = /^(fee|first|due|paid|price|paidTotal|dueNow|owedNow|remaining|credit|amount|monthly|fullYear|installment|installmentFirst|tuitionAmount|refundAmount|shortfall|expected|covered|late|paidThisMonth)$/;

/** Объект доторх мөнгөн талбар бүр null эсэх (тоо үлдээгүй) */
function moneyLeaks(v: unknown, path = ''): string[] {
  if (Array.isArray(v)) return v.flatMap((x, i) => moneyLeaks(x, `${path}[${i}]`));
  if (v && typeof v === 'object')
    return Object.entries(v).flatMap(([k, x]) =>
      MONEY.test(k) && typeof x === 'number' ? [`${path}.${k}`] : moneyLeaks(x, `${path}.${k}`),
    );
  return [];
}

describe('Багш+ — төлбөрийн дүнг серверээс хасна', () => {
  it('зөвшөөрлийн жагсаалт: дүнг зөвхөн Админ харна, бусад бүх role-д нуугдана', () => {
    expect(amountsHiddenFor(Role.ADMIN)).toBe(false);
    expect(amountsHiddenFor(Role.TEACHER_PLUS)).toBe(true);
    expect(amountsHiddenFor(Role.TEACHER)).toBe(true);
    expect(amountsHiddenFor('SOME_NEW_ROLE')).toBe(true);
    expect(amountsHiddenFor(undefined)).toBe(true);
  });

  it('мөр: дүн бүр null, төлөв/тоо/огноо/амлалт үлдэнэ', () => {
    const r = redactRow(row());
    expect(moneyLeaks(r)).toEqual([]);
    expect(r.blocks.map((b) => b.state)).toEqual(['PAID', 'OWED']);
    expect(r).toMatchObject({
      owedMonths: 1,
      overdueDays: 12,
      coveredThrough: '2026-09',
      plan: { kind: 'MONTHLY', settled: false, fee: null, total: null, first: null },
      nextDue: { month: '2026-10', amount: null, dueOn: '2026-10-05' },
      promise: { state: 'UPCOMING' },
      notes: { count: 1 },
    });
  });

  it('самбар, хураангуй, сурагчийн дэлгэрэнгүй — нэг ч дүн гарахгүй', () => {
    const board = redactBoard({ total: 1, owedNow: 250_000, rows: [row()] });
    expect(moneyLeaks(board)).toEqual([]);
    expect(board).toMatchObject({ total: 1, owedNow: null, amountsHidden: true });

    const stat = {
      id: 'c1', name: '12А', students: 3, expected: 1_050_000, covered: 700_000, late: 350_000,
      activeStudents: 3, paidStudents: 2, lateStudents: 1, owedStudents: 1, owedNow: 350_000,
      brokenPromises: 0, notes: 1,
    };
    const overview = redactOverview({
      year: { id: '2026-2027', months: [], firstHalfEnd: '', secondHalfDue: '' },
      today: '2026-11-03',
      month: '2026-11',
      totals: { ...stat, problems: 1, upcomingPromises: 0, unassigned: 0, pending: { count: 2, amount: 500_000 } },
      classes: [stat],
    });
    expect(moneyLeaks(overview)).toEqual([]);
    expect(overview.totals).toMatchObject({ students: 3, paidStudents: 2, lateStudents: 1, owedStudents: 1, pending: { count: 2, amount: null } });

    const student = redactStudent({
      year: overview.year,
      today: '2026-11-03',
      month: '2026-11',
      row: row(),
      tier: { key: 'g12', label: '7 хоногт 4 өдөр', monthly: 350_000, fullYear: 2_500_000, installment: 3_000_000, installmentFirst: 1_500_000 },
      daysPerWeek: 4,
      settlement: null,
      profile: { grade: 12, tuitionPlan: 'MONTHLY', tuitionAmount: 350_000, tuitionNote: null, fatherPhone: null, motherPhone: null },
      payments: [{ id: 'p1', amount: 350_000, method: 'CASH', status: 'CONFIRMED', description: null, forMonth: '2026-09', paidAt: null, createdAt: new Date(), confirmedBy: null }],
      notes: [],
      refunds: [{ id: 'r1', status: 'DRAFT', leftOn: null, refundAmount: 100_000, shortfall: 0, createdAt: new Date(), classroom: '12А' }],
      sources: { '2026-09': [{ paymentId: 'p1', amount: 350_000 }] },
    } as never);
    expect(moneyLeaks(student)).toEqual([]);
    expect(student.payments[0]).toMatchObject({ status: 'CONFIRMED', forMonth: '2026-09', amount: null });
    expect(student.sources['2026-09']).toEqual([{ paymentId: 'p1', amount: null }]);
  });

  it('ангийн самбар: Багш+-д төлөв л, Админд дүнтэй', () => {
    const pay = { state: 'PARTIAL' as const, tuitionAmount: 350_000, paidThisMonth: 100_000 };
    expect(studentPaymentView(pay, Role.TEACHER_PLUS)).toEqual({ state: 'PARTIAL', tuitionAmount: null, paidThisMonth: null });
    expect(studentPaymentView(pay, Role.ADMIN)).toEqual(pay);
  });

  describe('PaymentsLedgerController', () => {
    const ledger = {
      overview: jest.fn(),
      board: jest.fn().mockResolvedValue({ total: 1, owedNow: 250_000, rows: [row()] }),
      student: jest.fn(),
      pay: jest.fn().mockResolvedValue({ paymentId: 'p9', row: row() }),
      settle: jest.fn().mockResolvedValue({ row: row() }),
    };
    const ctrl = new PaymentsLedgerController(ledger as never);
    const req = (role: Role) => ({ user: { userId: 'u1', role } });

    it('Багш+ — board/pay/settle хариунд дүн алга', async () => {
      expect(moneyLeaks(await ctrl.board({} as never, req(Role.TEACHER_PLUS)))).toEqual([]);
      expect(moneyLeaks(await ctrl.pay('s1', {} as never, req(Role.TEACHER_PLUS)))).toEqual([]);
      expect(moneyLeaks(await ctrl.settle('s1', {} as never, req(Role.TEACHER_PLUS)))).toEqual([]);
    });

    it('Админ — өөрчлөгдөхгүй', async () => {
      const b = await ctrl.board({} as never, req(Role.ADMIN));
      expect(b).toEqual({ total: 1, owedNow: 250_000, rows: [row()] });
    });
  });
});
