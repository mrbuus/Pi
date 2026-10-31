// GET /payments/ledger/* хариунуудын төрөл (api/src/payments/ledger.service.ts).

export type BlockState = "PAID" | "PARTIAL" | "OWED" | "FUTURE" | "OFF";
export type PlanKind = "FULL_YEAR" | "INSTALLMENT" | "MONTHLY";
export type PromiseState = "UPCOMING" | "BROKEN" | "KEPT";

export interface MonthBlock {
  month: string;
  state: BlockState;
  due: number;
  paid: number;
  dueOn: string | null;
  /** Бүрэн төлөгдсөн өдөр (төлбөрийн огноогоор) */
  paidOn: string | null;
  /** Хугацаанаас хэдэн хоног хоцорч бүрэн төлөгдсөн (цагтаа бол 0) */
  lateDays: number;
}

export interface YearView {
  id: string;
  months: string[];
  firstHalfEnd: string;
  secondHalfDue: string;
}

export interface LedgerRow {
  id: string;
  firstName: string;
  lastName: string;
  code: string | null;
  phone: string | null;
  classroom: { id: string; name: string } | null;
  /** settled = Багш+ гараар «бүтэн жил» гэж тооцсон (гэрээ = төлсөн дүн) */
  plan: { kind: PlanKind; guessed: boolean; settled: boolean; fee: number; total: number; first: number; raw: string | null };
  startDate: string | null;
  leftOn: string | null;
  blocks: MonthBlock[];
  price: number;
  paidTotal: number;
  dueNow: number;
  owedNow: number;
  owedMonths: number;
  remaining: number;
  credit: number;
  nextDue: { month: string; amount: number; dueOn: string } | null;
  /** Хамгийн эртний төлөгдөөгүй сарын хугацаа хэтэрсэн хоног */
  overdueDays: number;
  coveredThrough: string | null;
  notes: { count: number; last: { body: string; authorName: string | null; at: string } | null };
  promise: { on: string; state: PromiseState; overdueDays: number } | null;
}

export interface ClassStat {
  id: string;
  name: string;
  students: number;
  expected: number;
  covered: number;
  late: number;
  owedStudents: number;
  owedNow: number;
  brokenPromises: number;
  notes: number;
}

export interface LedgerOverview {
  year: YearView;
  today: string;
  month: string;
  totals: ClassStat & {
    problems: number;
    upcomingPromises: number;
    unassigned: number;
    pending: { count: number; amount: number };
  };
  classes: ClassStat[];
}

export interface LedgerBoard {
  year: YearView;
  today: string;
  month: string;
  classroom?: { id: string; name: string };
  total: number;
  owedNow?: number;
  rows: LedgerRow[];
}

export interface LedgerPayment {
  id: string;
  amount: number;
  method: string;
  status: string;
  description: string | null;
  forMonth: string | null;
  paidAt: string | null;
  createdAt: string;
  confirmedBy: string | null;
}

export interface LedgerNote {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  promisedOn: string | null;
  resolvedAt: string | null;
  promise: { state: PromiseState; overdueDays: number } | null;
}

export interface LedgerRefund {
  id: string;
  status: string;
  leftOn: string | null;
  refundAmount: number;
  shortfall: number;
  createdAt: string;
  classroom: string;
}

export interface PriceTier {
  key: string;
  label: string;
  monthly: number;
  fullYear: number;
  installment: number | null;
  installmentFirst: number | null;
}

export interface StudentLedger {
  year: YearView;
  today: string;
  month: string;
  row: LedgerRow;
  tier: PriceTier;
  /** Суудаг анги 7 хоногт хэдэн өдөр ордог (үнэ үүнээс) */
  daysPerWeek: number | null;
  settlement: { note: string | null; at: string; authorName: string | null } | null;
  profile: {
    grade: number | null;
    tuitionPlan: string | null;
    tuitionAmount: number | null;
    tuitionNote: string | null;
    fatherPhone: string | null;
    motherPhone: string | null;
  } | null;
  payments: LedgerPayment[];
  notes: LedgerNote[];
  refunds: LedgerRefund[];
}
