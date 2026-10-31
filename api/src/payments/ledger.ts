// Сургалтын төлбөрийн «сарын блок»-ийн ЦЭВЭР логик — I/O байхгүй тул unit
// тестэд бүрэн ордог (tuition/proration.ts-тэй ижил зарчим).
//
// Эзний шаардлага (2026-10-13): сурагч бүрт хичээлийн жилийн сар бүрийн блок.
//  - Бүтэн жил төлсөн → бүх мөр ногоон
//  - Хагас жил (хуваан төлөх эхний хэсэг) → 12-р сар дуустал ногоон, төлсөн дүн
//  - Сар бүр → сар бүр өөрийн төлөвтэй: төлсөн / дутуу (дүнтэй) / өртэй / хугацаа болоогүй
//
// ══ ГОЛ ШИЙДВЭР 1: ТӨЛБӨР ХУУЧИН ӨРӨӨС ЭХЭЛЖ ДҮҮРГЭНЭ («waterfall») ═══════
//
// Төлбөр хаанаас ирснээс (банкны хуулга, QPay, гараар) үл хамааран нийт
// баталгаажсан дүнг сурагчийн ИДЭВХТЭЙ эхний сараас эхлэн дараалан дүүргэнэ.
// Банкны хуулга forMonth-ыг гүйлгээ орсон сараар тавьдаг тул 10-р сарын 3-нд
// хийсэн 9-р сарын төлбөр «10-р сар» гэж ирнэ. forMonth-оор шууд тавибал
// 9-р сар өртэй, 10-р сар төлсөн мэт буруу харагдана — waterfall үүнийг засна.
//
// ══ ГОЛ ШИЙДВЭР 2: БҮТЭН/ХАГАС ЖИЛД forMonth ХАМААРАХГҮЙ ═════════════════
//
// Бүтэн жилийн 2.5 сая 4-р сард урьдчилгаа, 7-р сард үлдэгдэл хэлбэрээр
// орж ирдэг. Тэд бүгд тухайн жилийн гэрээнд тооцогдоно.
//
// ══ ГОЛ ШИЙДВЭР 3: ЗУНЫ ХИЧЭЭЛИЙН ТӨЛБӨР ЖИЛИЙН САРД ОРОХГҮЙ ══════════════
//
// Зунаас (6, 7-р сар) сар бүр төлж суусан сурагчийн зуны төлбөр нь зуны
// хичээлийнх. Түүнийг 9-р сарын блок руу урсгавал 9-р сар «төлсөн» мэт
// харагдана. Тиймээс СОР БҮРИЙН багцад жил эхлэхээс ӨМНӨХ сарын төлбөрийг
// зөвхөн сурагч жил эхлэхээс өмнө суусан үед хасна.

export type MonthKey = string; // «YYYY-MM»
export type DateKey = string; // «YYYY-MM-DD»
export type PlanKind = 'FULL_YEAR' | 'INSTALLMENT' | 'MONTHLY' | 'UNKNOWN';
export type BlockState = 'PAID' | 'PARTIAL' | 'OWED' | 'FUTURE' | 'OFF';

export interface AcademicYear {
  id: string;
  /** Төлбөрийн мөчлөг, ЭХЛЭХ сараар нь (Excel: «9-10сар» … «05-06сар») */
  months: MonthKey[];
  /** Хагас жилийн (хуваан төлөх эхний хэсэг) сүүлийн сар */
  firstHalfLast: MonthKey;
  /** Хагас жилийн хамрах сүүлийн өдөр (харуулахад) */
  firstHalfEnd: DateKey;
  /** Хуваан төлөхийн үлдэгдэл төлөх эцсийн өдөр */
  secondHalfDue: DateKey;
  /** Энэ өдрөөс хойш орсон төлбөр энэ жилийнх (урьдчилгаа 4-р сараас ирдэг) */
  paymentsFrom: DateKey;
}

/**
 * 2026–2027 оны хичээлийн жил. Эзний Excel («2027 оны төлбөрийн мэдээлэл»)
 * мөчлөгүүд «9-10сар» → «05-06сар» (9 мөчлөг, 6-р сард дуусна; «06-07сар» нь
 * «Дууссан» багана). Тиймээс 9 блок: 9, 10, 11, 12, 1, 2, 3, 4, 5.
 */
export const ACADEMIC_YEAR: AcademicYear = {
  id: '2026-2027',
  months: [
    '2026-09',
    '2026-10',
    '2026-11',
    '2026-12',
    '2027-01',
    '2027-02',
    '2027-03',
    '2027-04',
    '2027-05',
  ],
  firstHalfLast: '2026-12',
  firstHalfEnd: '2026-12-28',
  secondHalfDue: '2026-12-20',
  paymentsFrom: '2026-03-01',
};

export interface PriceTier {
  key: 'g12' | 'g9_11' | 'social';
  label: string;
  monthly: number;
  fullYear: number;
  installment: number | null;
  installmentFirst: number | null;
}

// web/src/lib/orgInfo.ts TUITION-тэй ижил. Нийгмийн анги: Excel-ийн «Нийгэм»
// хуудас (бүтэн 1.5 сая, суудал/сар 300 мянга); хуваан төлөх үнэ тогтоогоогүй.
// Түлхүүр (g12, g9_11) хуучнаараа — шатлалыг одоо 7 хоногийн өдрөөр сонгоно (tierFor).
export const PRICE_TIERS: Record<PriceTier['key'], PriceTier> = {
  g12: {
    key: 'g12',
    label: '7 хоногт 4 өдөр',
    monthly: 350_000,
    fullYear: 2_500_000,
    installment: 3_000_000,
    installmentFirst: 1_500_000,
  },
  g9_11: {
    key: 'g9_11',
    label: '7 хоногт 3 өдөр',
    monthly: 300_000,
    fullYear: 2_000_000,
    installment: 2_500_000,
    installmentFirst: 1_300_000,
  },
  social: {
    key: 'social',
    label: 'Нийгэм',
    monthly: 300_000,
    fullYear: 1_500_000,
    installment: null,
    installmentFirst: null,
  },
};

/**
 * Үнийн шатлал СУУДАГ АНГИАС (эзэн 2026-10-31): 7 хоногт 4 өдөр ордог анги =
 * 350 мянга / 2.5 сая, 3 өдөр = 300 мянга / 2 сая. Хүүхэд сургуульдаа хэддүгээр
 * ангид сурдгаас хамаарахгүй — 11-р ангийн хүүхэд 12-р ангийнхантай (4 өдөр)
 * суувал 12-ын үнэ. Ангийн хуваарь (ClassSchedule) алга бол сургуулийн ангиар.
 * 13-х анги нь 12-р ангийн бүлэг.
 */
export function tierFor(
  grade: number | null | undefined,
  classroomName?: string | null,
  daysPerWeek?: number | null,
): { tier: PriceTier; guessed: boolean } {
  if (classroomName && /нийгэм/i.test(classroomName))
    return { tier: PRICE_TIERS.social, guessed: false };
  if (daysPerWeek != null && daysPerWeek >= 4)
    return { tier: PRICE_TIERS.g12, guessed: false };
  if (daysPerWeek != null && daysPerWeek >= 1)
    return { tier: PRICE_TIERS.g9_11, guessed: false };
  if (grade === 9 || grade === 10 || grade === 11)
    return { tier: PRICE_TIERS.g9_11, guessed: false };
  if (grade === 12 || grade === 13)
    return { tier: PRICE_TIERS.g12, guessed: false };
  return { tier: PRICE_TIERS.g12, guessed: true };
}

export interface LedgerPayment {
  amount: number;
  forMonth: MonthKey | null;
  paidOn: DateKey | null;
}

export interface LedgerInput {
  plan: PlanKind | null;
  tuitionAmount: number | null;
  tier: PriceTier;
  /** Сурагч суж эхэлсэн өдөр (StudentProfile.joinedOn) */
  startDate: DateKey | null;
  /** Төвөөс гарсан өдөр — тэр сар идэвхтэй, дараагийнх нь үгүй */
  leftOn: DateKey | null;
  /** Зөвхөн БАТАЛГААЖСАН сургалтын төлбөр (дэлгүүрийн бус) */
  payments: LedgerPayment[];
  today: DateKey;
  year?: AcademicYear;
  /** Багш+ гараар «бүтэн жил» гэж тооцсон (TuitionSettlement) */
  settled?: boolean;
}

export interface MonthBlock {
  month: MonthKey;
  state: BlockState;
  /** Энэ сард ногдох дүн */
  due: number;
  /** Энэ сард хуваарилагдсан дүн */
  paid: number;
  /** Энэ сарын дүн төлөгдөх өдөр (OFF үед null) */
  dueOn: DateKey | null;
  /** Энэ сар БҮРЭН төлөгдсөн өдөр (төлбөрийн огноогоор; тодорхойгүй бол null) */
  paidOn: DateKey | null;
  /** Төлөгдөх өдрөөс хэдэн хоног хоцорч бүрэн төлөгдсөн (цагтаа бол 0) */
  lateDays: number;
}

export interface ResolvedPlan {
  kind: Exclude<PlanKind, 'UNKNOWN'>;
  /** Багц бүртгэлгүй (UNKNOWN) тул таамагласан */
  guessed: boolean;
  /** Сар бүрийн төлбөр (MONTHLY) */
  fee: number;
  /** Гэрээний нийт дүн (бүтэн/хуваан төлөх) */
  total: number;
  /** Хуваан төлөхийн эхний хэсэг */
  first: number;
  /** Гараар бүтэн жилд тооцсон — гэрээ = бодит төлсөн дүн */
  settled: boolean;
}

export interface LedgerResult {
  plan: ResolvedPlan;
  blocks: MonthBlock[];
  /** Идэвхтэй сарын нийт ногдох дүн */
  price: number;
  /** Энэ жилд тооцогдсон нийт төлбөр (илүү төлөлтийг оруулаад) */
  paidTotal: number;
  /** Өнөөдрийг хүртэл төлөгдөх ёстой байсан */
  dueNow: number;
  /** Өнөөдрийн байдлаар өр */
  owedNow: number;
  /** Хугацаа нь болоод бүрэн төлөгдөөгүй сарын тоо */
  owedMonths: number;
  /** Гэрээний үлдэгдэл (ирээдүйн сарыг оруулаад) */
  remaining: number;
  /** Гэрээнээс илүү төлсөн дүн */
  credit: number;
  /** Эхний бүрэн төлөгдөөгүй сар */
  nextDue: { month: MonthKey; amount: number; dueOn: DateKey } | null;
  /** Хамгийн эртний төлөгдөөгүй сарын хугацаа хэтэрсэн хоног (өргүй бол 0) */
  overdueDays: number;
  /** Эхнээсээ дараалан бүрэн төлсөн сүүлийн сар */
  coveredThrough: MonthKey | null;
}

const inRange = (n: number | null, lo: number, hi: number): n is number =>
  n != null && Number.isFinite(n) && n >= lo && n <= hi;

const monthOf = (d: DateKey): MonthKey => d.slice(0, 7);

/** Хоёр өдрийн зөрүү (хоногоор) */
const daysBetween = (from: DateKey, to: DateKey): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * Багцыг тодорхойлно. Гэрээний дүн = суудаг ангийн СТАНДАРТ үнэ (эзэн 2026-10-31).
 * Профайлын tuitionAmount нь шийтээс ирсэн «төлсөн дүн» (бүтэн жилд FULL нүдний
 * нийлбэр, сар бүрд хамгийн олон давтагдсан дүн) — үүнийг гэрээ болговол бага
 * төлсөн хүүхэд үргэлж «бүрэн» харагдаж, 3 өдрийн ангийн 350 мянга төлсөн хүүхэд
 * 300 мянга төлмөгц «дутуу» болдог байсан. Онцгой тохиолдлыг Багш+ гараар
 * «бүтэн жил» гэж тооцно (LedgerInput.settled). tuitionAmount одоо зөвхөн
 * бүртгэлгүй багцыг таамаглахад.
 */
export function resolvePlan(
  plan: PlanKind | null,
  tuitionAmount: number | null,
  tier: PriceTier,
): ResolvedPlan {
  const yearly = inRange(tuitionAmount, 800_000, 6_000_000)
    ? tuitionAmount
    : null;
  const installTotal = tier.installment ?? tier.fullYear;
  const firstOf = (total: number) =>
    Math.min(tier.installmentFirst ?? Math.round(total / 2), total);
  const make = (
    kind: ResolvedPlan['kind'],
    guessed: boolean,
    fee: number,
    total: number,
  ): ResolvedPlan => ({ kind, guessed, fee, total, first: firstOf(total), settled: false });

  switch (plan) {
    case 'MONTHLY':
      return make('MONTHLY', false, tier.monthly, 0);
    case 'FULL_YEAR':
      return make('FULL_YEAR', false, 0, tier.fullYear);
    case 'INSTALLMENT':
      return make('INSTALLMENT', false, 0, installTotal);
    default:
      // Бүртгэлгүй багц: дүн нь шатлалын бүтэн/хуваан үнэтэй яг таарвал тэр,
      // эс бөгөөс сар бүр гэж таамаглана (хамгийн түгээмэл).
      if (yearly === tier.fullYear)
        return make('FULL_YEAR', true, 0, tier.fullYear);
      if (tier.installment && yearly === tier.installment)
        return make('INSTALLMENT', true, 0, tier.installment);
      return make('MONTHLY', true, tier.monthly, 0);
  }
}

/** n хэсэгт бүхэл тоогоор хуваана — үлдэгдлийг эхний хэсгүүдэд нэг нэгээр. */
function split(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Мөчлөгийн эхлэх өдөр — сурагч 9/7-нд орсон бол 10-р сарын мөчлөг 10/7-нд. */
export function cycleDay(startDate: DateKey | null, year: AcademicYear): number {
  if (!startDate || monthOf(startDate) < year.months[0]) return 1;
  return Math.min(Math.max(Number(startDate.slice(8, 10)) || 1, 1), 28);
}

export function activeMonths(
  startDate: DateKey | null,
  leftOn: DateKey | null,
  year: AcademicYear = ACADEMIC_YEAR,
): MonthKey[] {
  const startMonth =
    startDate && monthOf(startDate) > year.months[0]
      ? monthOf(startDate)
      : year.months[0];
  const endMonth = leftOn ? monthOf(leftOn) : year.months[year.months.length - 1];
  return year.months.filter((m) => m >= startMonth && m <= endMonth);
}

/** Тухайн төлбөр энэ жилийн гэрээнд тооцогдох эсэх. */
export function countsForYear(
  p: LedgerPayment,
  kind: ResolvedPlan['kind'],
  startDate: DateKey | null,
  year: AcademicYear = ACADEMIC_YEAR,
): boolean {
  const key = p.forMonth ?? (p.paidOn ? monthOf(p.paidOn) : null);
  if (!key) return true;
  const last = year.months[year.months.length - 1];
  if (key > last) return false;
  if (key < monthOf(year.paymentsFrom)) return false;
  // Шийдвэр 3: зунаас суусан сар бүрийн сурагчийн зуны төлбөр.
  const startedBefore = !!startDate && monthOf(startDate) < year.months[0];
  if (kind === 'MONTHLY' && startedBefore && key < year.months[0]) return false;
  return true;
}

export function computeLedger(input: LedgerInput): LedgerResult {
  const year = input.year ?? ACADEMIC_YEAR;
  let plan = resolvePlan(input.plan, input.tuitionAmount, input.tier);
  if (input.settled)
    plan = { ...plan, kind: 'FULL_YEAR', guessed: false, fee: 0, settled: true };
  const active = activeMonths(input.startDate, input.leftOn, year);
  const day = pad2(cycleDay(input.startDate, year));
  const startDue = active.length ? `${active[0]}-${day}` : null;

  // Энэ жилд тооцогдох төлбөр (багцын төрлөөс хамаарна)
  const counted = input.payments.filter((p) =>
    countsForYear(p, plan.kind, input.startDate, year),
  );
  const paidTotal = counted.reduce((s, p) => s + Math.max(0, Math.round(p.amount)), 0);
  // Гараар бүтэн жил: гэрээ = бодит төлсөн дүн → идэвхтэй сар бүр «төлсөн»
  // (0₮ ч байж болно), илүү төлөлт ч, өр ч үгүй. Буцаалтад мөн энэ гэрээ.
  if (plan.settled) plan = { ...plan, total: paidTotal, first: paidTotal };

  // 1) Сар бүрийн ногдох дүн ба төлөгдөх өдөр
  const dues = new Map<MonthKey, { due: number; dueOn: DateKey }>();
  if (plan.kind === 'MONTHLY') {
    for (const m of active) dues.set(m, { due: plan.fee, dueOn: `${m}-${day}` });
  } else if (plan.kind === 'FULL_YEAR') {
    split(plan.total, active.length).forEach((d, i) =>
      dues.set(active[i], { due: d, dueOn: startDue! }),
    );
  } else {
    // Эхний хагас (9–12-р сар) = эхний төлбөр, 2-р хагас = үлдэгдэл. 1-р
    // сараас хойш орсон сурагч зөвхөн үлдэгдлийн хэсгийг төлнө.
    const h1 = active.filter((m) => m <= year.firstHalfLast);
    const h2 = active.filter((m) => m > year.firstHalfLast);
    split(plan.first, h1.length).forEach((d, i) =>
      dues.set(h1[i], { due: d, dueOn: startDue! }),
    );
    const secondAmount = plan.total - plan.first;
    // Үлдэгдлийн эцсийн өдөр болохоос өмнө эхний хэсэг ч төлөгдөөгүй бол
    // 2-р хагас нь ирээдүй хэвээр (хуваан төлөхийн утга).
    const h2Due =
      h1.length || !startDue
        ? year.secondHalfDue
        : startDue > year.secondHalfDue
          ? startDue
          : year.secondHalfDue;
    split(secondAmount, h2.length).forEach((d, i) =>
      dues.set(h2[i], { due: d, dueOn: h2Due }),
    );
  }

  // Сар БҮРЭН төлөгдсөн өдөр (хоцорч төлсөн эсэх): төлбөрийг огноогоор нь
  // дараалуулж хуримтлуулна. Гараар бүтэн жилд утгагүй тул тооцохгүй.
  const dated = plan.settled
    ? []
    : counted
        .map((p) => ({
          amount: Math.max(0, Math.round(p.amount)),
          on: p.paidOn ?? (p.forMonth ? `${p.forMonth}-01` : null),
        }))
        .sort((a, b) => (a.on ?? '9999').localeCompare(b.on ?? '9999'));
  let k = 0;
  let acc = dated[0]?.amount ?? 0;
  const coveredOn = (target: number): DateKey | null => {
    while (k < dated.length && acc < target) {
      k++;
      if (k < dated.length) acc += dated[k].amount;
    }
    return k < dated.length ? dated[k].on : null;
  };

  // 2) Төлбөрийг хуучнаас нь дүүргэнэ (Шийдвэр 1)
  let left = paidTotal;
  let need = 0;
  const blocks: MonthBlock[] = year.months.map((month) => {
    const d = dues.get(month);
    if (!d) return { month, state: 'OFF', due: 0, paid: 0, dueOn: null, paidOn: null, lateDays: 0 };
    const paid = Math.min(d.due, left);
    left -= paid;
    need += d.due;
    const state: BlockState =
      paid >= d.due
        ? 'PAID'
        : paid > 0
          ? 'PARTIAL'
          : d.dueOn <= input.today
            ? 'OWED'
            : 'FUTURE';
    const paidOn = state === 'PAID' && d.due > 0 ? coveredOn(need) : null;
    const lateDays = paidOn && paidOn > d.dueOn ? daysBetween(d.dueOn, paidOn) : 0;
    return { month, state, due: d.due, paid, dueOn: d.dueOn, paidOn, lateDays };
  });

  // 3) Хураангуй
  let price = 0;
  let dueNow = 0;
  let paidToDue = 0;
  let owedMonths = 0;
  let nextDue: LedgerResult['nextDue'] = null;
  let coveredThrough: MonthKey | null = null;
  let chain = true;
  for (const b of blocks) {
    if (b.state === 'OFF' || !b.dueOn) continue;
    price += b.due;
    if (b.dueOn <= input.today) {
      dueNow += b.due;
      paidToDue += b.paid;
      if (b.paid < b.due) owedMonths++;
    }
    if (b.paid < b.due && !nextDue)
      nextDue = { month: b.month, amount: b.due - b.paid, dueOn: b.dueOn };
    if (chain && b.state === 'PAID') coveredThrough = b.month;
    else chain = false;
  }

  return {
    plan,
    blocks,
    price,
    paidTotal,
    dueNow,
    owedNow: dueNow - paidToDue,
    owedMonths,
    remaining: Math.max(0, price - (paidTotal - left)),
    credit: left,
    nextDue,
    overdueDays:
      nextDue && nextDue.dueOn < input.today ? daysBetween(nextDue.dueOn, input.today) : 0,
    coveredThrough,
  };
}

/**
 * Дарагдсан блок хүртэл бүх дутууг бөглөх дүн — «энд хүртэл төлөх».
 * 11-р сарыг дарахад 9, 10 өртэй бол гурвын нийлбэр.
 */
export function amountThrough(blocks: MonthBlock[], month: MonthKey): number {
  let sum = 0;
  for (const b of blocks) {
    if (b.state !== 'OFF') sum += b.due - b.paid;
    if (b.month === month) break;
  }
  return sum;
}

export type PromiseState = 'UPCOMING' | 'BROKEN' | 'KEPT';

/**
 * Амлалтын төлөв. Тэмдэглэл бичигдсэнээс хойш баталгаажсан төлбөр ирсэн бол
 * KEPT; ирээгүй, амласан өдөр өнгөрсөн бол BROKEN; үгүй бол UPCOMING.
 */
export function promiseState(
  promisedOn: DateKey,
  notedOn: DateKey,
  paymentDates: DateKey[],
  today: DateKey,
): { state: PromiseState; overdueDays: number } {
  if (paymentDates.some((d) => d >= notedOn))
    return { state: 'KEPT', overdueDays: 0 };
  if (promisedOn < today)
    return { state: 'BROKEN', overdueDays: daysBetween(promisedOn, today) };
  return { state: 'UPCOMING', overdueDays: 0 };
}

/** Монголын цагаар (UTC+8) өнөөдрийн «YYYY-MM-DD» — сервер UTC-д ажилладаг. */
export function todayKeyUB(now: Date = new Date()): DateKey {
  return new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
}
