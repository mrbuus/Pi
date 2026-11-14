import { Role } from '../generated/prisma/enums';
import type { LedgerRow, PaymentsLedgerService } from './ledger.service';

/**
 * Багш+ (TEACHER_PLUS) төлбөрөөс ЗӨВХӨН ТӨЛӨВ харна — мөнгөн дүн серверээс
 * гарахгүй (эзний хатуу дүрэм, CLAUDE.md). Админ хэвээр. Төлөв, тоо, огноо,
 * хоцорсон хоног, амлалт, тэмдэглэл үлдэнэ; дүн бүр null болно.
 */
// Зөвшөөрлийн жагсаалт: дүнг ЗӨВХӨН Админ харна, бусад бүх role (шинэ role ч) дүнгүй.
export const amountsHiddenFor = (role: Role | string | null | undefined): boolean =>
  role !== Role.ADMIN;

/** Дүнгүй мөр — талбарууд хэвээр, мөнгөн утга null. */
export function redactRow(r: LedgerRow) {
  return {
    ...r,
    // raw = төлбөрийн төлөвлөгөөний чөлөөт бичвэр (дүн агуулж болно)
    plan: { ...r.plan, fee: null, total: null, first: null, raw: null },
    blocks: r.blocks.map((b) => ({ ...b, due: null, paid: null })),
    price: null,
    paidTotal: null,
    dueNow: null,
    owedNow: null,
    remaining: null,
    credit: null,
    nextDue: r.nextDue ? { ...r.nextDue, amount: null } : null,
  };
}

type Money = { owedNow?: number; rows: LedgerRow[] };

export function redactBoard<T extends Money>(b: T) {
  return {
    ...b,
    ...('owedNow' in b ? { owedNow: null } : {}),
    rows: b.rows.map(redactRow),
    amountsHidden: true as const,
  };
}

type Overview = Awaited<ReturnType<PaymentsLedgerService['overview']>>;
type Student = Awaited<ReturnType<PaymentsLedgerService['student']>>;
type Stat = Overview['classes'][number];

const redactStat = (s: Stat) => ({
  ...s,
  expected: null,
  covered: null,
  late: null,
  owedNow: null,
});

export function redactOverview(o: Overview) {
  return {
    ...o,
    totals: {
      ...o.totals,
      ...redactStat(o.totals),
      pending: { count: o.totals.pending.count, amount: null },
    },
    classes: o.classes.map(redactStat),
    amountsHidden: true as const,
  };
}

export function redactStudent(s: Student) {
  return {
    ...s,
    row: redactRow(s.row),
    tier: { ...s.tier, monthly: null, fullYear: null, installment: null, installmentFirst: null },
    profile: s.profile ? { ...s.profile, tuitionAmount: null } : null,
    // description нь гүйлгээний утга — дүн агуулж болно
    payments: s.payments.map((p) => ({ ...p, amount: null, description: null })),
    sources: Object.fromEntries(Object.entries(s.sources ?? {}).map(([m, xs]) => [m, xs.map((x) => ({ ...x, amount: null }))])),
    settlement: s.settlement ? { ...s.settlement, note: null } : null,
    refunds: s.refunds.map((r) => ({ ...r, refundAmount: null, shortfall: null })),
    amountsHidden: true as const,
  };
}

/** pay/settle-ийн хариу: `{ row, ... }` */
export function redactRowResult<T extends { row?: LedgerRow }>(res: T) {
  return { ...res, row: res.row ? redactRow(res.row) : res.row, amountsHidden: true as const };
}

/** Ангийн самбарын сурагчийн төлбөр: Багш+-д зөвхөн төлөв (дүн null). */
export function studentPaymentView<S extends string>(
  pay: { state: S; tuitionAmount: number | null; paidThisMonth: number },
  role: Role | string | null | undefined,
) {
  return amountsHiddenFor(role)
    ? { state: pay.state, tuitionAmount: null, paidThisMonth: null }
    : { state: pay.state, tuitionAmount: pay.tuitionAmount, paidThisMonth: pay.paidThisMonth };
}
