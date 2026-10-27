import { cellSlot, freeRequestId, reconcileStudent } from './cell-reconcile';
import {
  sectionText,
  assignRowKeys,
  buildPlan,
  DbStudent,
  findCycles,
  headerProblems,
  HEADER_SPECS,
  paymentRequestId,
  PlannedPayment,
  PlanIssue,
  SHEET,
  stableUuid,
} from './payment-plan';
import { colLetter, serialToIso, toBook, toCell } from './sheet-book';

// Хуучин Excel импорт (2026-10-13-нд 911 гүйлгээ оруулсан) — түлхүүр нь ЯГ ижил
// байх ёстой, эс бөгөөс синк тэр бүх гүйлгээг давхар оруулна.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const legacy = require('../../prisma/import-payments-2027.cjs') as { stableUuid: (...p: string[]) => string };

describe('sheet-book — Sheets API → Excel-тэй ижил утга', () => {
  it('серийн огноог ISO болгоно', () => {
    expect(serialToIso(46265)).toBe('2026-08-31');
    expect(serialToIso(0)).toBeNull();
  });
  it('дэлгэцэнд огноо харагдвал огноо, бусад нь тоо/текст', () => {
    expect(toCell(46265, '08/31')).toBe('2026-08-31');
    expect(toCell(46265, '2026-08-31')).toBe('2026-08-31');
    expect(toCell(2000000, '2,000,000')).toBe(2000000);
    expect(toCell(300000, '300000')).toBe(300000);
    expect(toCell('  ', '  ')).toBeNull();
    expect(toCell('ярьсан', 'ярьсан')).toBe('ярьсан');
  });
  it('огноо болсон ангийн нэрийг сэргээнэ', () => {
    expect(sectionText('2026-12-11')).toBe('12-11');
    expect(sectionText('11-3')).toBe('11-3');
    expect(sectionText(null)).toBeNull();
  });
  it('баганын үсэг', () => {
    expect([0, 25, 26, 51, 52].map(colLetter)).toEqual(['A', 'Z', 'AA', 'AZ', 'BA']);
  });
});

describe('түлхүүр — хуучин скрипттэй нийцтэй', () => {
  it('stableUuid нь import-payments-2027.cjs-тэй ижил', () => {
    for (const parts of [['import-payments-2027', 'u1', 'main|2026-09'], ['import-payments-2027', 'cabc', 'main|2026-09|dep']])
      expect(stableUuid(...parts)).toBe(legacy.stableUuid(...parts));
    expect(paymentRequestId('u1', 'main|2026-09')).toBe(legacy.stableUuid('import-payments-2027', 'u1', 'main|2026-09'));
  });
  it('мөрийн түлхүүр — давхардвал #2', () => {
    const rows = [[], [], [1, 'Бат', 'Болд', '11', '99112233'], [2, 'Бат', 'Болд', '11', '99112233'], [3, '', '']];
    const keys = assignRowKeys(rows, 2);
    expect(keys.get(2)).toBe('бат|болд|99112233');
    expect(keys.get(3)).toBe('бат|болд|99112233#2');
    expect(keys.has(4)).toBe(false);
  });
});

describe('гарчиг ба мөчлөг', () => {
  it('давхардсан сарын гарчгийг баганаар ялгаж, өгөгдөл алдахгүй', () => {
    const issues: PlanIssue[] = [];
    const rows = [
      Object.assign([], { 11: '9-10 сар', 14: '10-11 сар', 17: '9-10сар' }),
      Object.assign([], { 11: 'Төлсөн дүн', 14: 'Төлсөн дүн', 17: 'Төлсөн дүн' }),
    ];
    expect(findCycles(rows, SHEET.SOCIAL, issues).map((c) => c.key)).toEqual(['2026-09', '2026-10', '2026-09@R']);
  });
  it('бүтэц өөрчлөгдвөл илрүүлнэ', () => {
    expect(headerProblems(undefined, HEADER_SPECS[SHEET.MAIN])).toEqual(['хуудас олдсонгүй']);
    const rows = [['', 'Нэр', 'Овог']];
    expect(headerProblems(rows, HEADER_SPECS[SHEET.MAIN]).length).toBeGreaterThan(0);
  });
});

// Эзэн жагсаалтын хамгийн бага загвар (14-р баганаас «6-7 сар», «7-8 сар» …)
function mainSheet(dataRows: (string | number | null)[][]) {
  const h1: (string | null)[] = ['89', 'Овог', 'Нэр', 'Анги', 'Өөрийн утас', 'Аав', 'Ээж', 'Сургууль', 'Анги', null, 'Сууж эхэлсэн өдөр', 'Урьдчилгаа', 'Салбар', 'Хэлбэр', '6-7 сар', null, null, '7-8 сар', null, null, '8-9 сар', null, null, '9-10сар'];
  const h2: (string | null)[] = Array(14).fill(null).concat(['Төлсөн дүн', 'Хугацаа', 'Баримт', 'Төлсөн дүн', 'Хугацаа', 'Баримт', 'Төлсөн дүн', 'Хугацаа', 'Баримт', 'Төлсөн дүн', 'Хугацаа', 'Баримт']);
  return [h1, h2, ...dataRows];
}
const student = (over: Partial<DbStudent> = {}): DbStudent => ({
  id: 'u1', firstName: 'Болд', lastName: 'Бат', phone: '99112233', fatherPhone: null, motherPhone: null,
  plan: null, tuitionAmount: null, joinedOn: null, leftOn: null, classroomName: '11-3', ...over,
});
const row = (cyc: Record<number, string | number>, over: Record<number, string | number> = {}) =>
  Object.assign(Array(26).fill(null), { 0: 1, 1: 'Бат', 2: 'Болд', 3: '11-р анги', 4: '99112233', 8: '11-3', 10: '2026-09-01', 13: 'сар бүр' }, cyc, over);

describe('buildPlan', () => {
  const today = '2026-10-27';
  it('суудлын төлбөр + сарын төлбөр, огноо, тэмдэглэл', () => {
    const book = { [SHEET.MAIN]: mainSheet([row({ 11: 650000, 23: 350000, 24: '09/01-10/01', 25: '2026-08-20' })]) };
    // 9-10 сарын нүд (23..25) + урьдчилгааны нийлбэр зөв
    const plan = buildPlan(book, [student()], today);
    const b = plan.perStudent.get('u1')!;
    expect(b.payments).toEqual([
      expect.objectContaining({ key: 'main|2026-09', cell: 'main|2026-09', amount: 350000, forMonth: '2026-09', paidOn: '2026-08-20' }),
    ]);
    expect(plan.issues.find((i) => i.kind === 'TOTAL_MISMATCH')).toBeTruthy(); // 650,000 ≠ 350,000
    expect(plan.rowMatches.get(`${SHEET.MAIN}|бат|болд|99112233`)).toEqual({ studentId: 'u1', by: 'phone' });
  });
  it('ах дүү нэг утастай — нэр нь яг таарсан хүүхдийг сонгоно', () => {
    const sibling = student({ id: 'u2', firstName: 'Дорж', phone: null });
    const book = { [SHEET.MAIN]: mainSheet([row({ 11: 300000, 23: 300000 }, { 2: 'Дорж' })]) };
    const plan = buildPlan(book, [student(), sibling], today);
    expect([...plan.perStudent.keys()]).toEqual(['u2']);
  });
  it('таарахгүй мөрийг шинэ сурагчийн мэдээлэлтэй буцаана', () => {
    const book = { [SHEET.MAIN]: mainSheet([row({ 11: 300000, 23: 300000 }, { 1: 'Шинэ', 2: 'Хүүхэд', 4: '88001122', 12: 'зүүн' })]) };
    const plan = buildPlan(book, [student()], today);
    expect(plan.unmatched).toEqual([expect.objectContaining({ lastName: 'Шинэ', firstName: 'Хүүхэд', phone: '88001122', section: '11-3', branch: 'зүүн', start: '2026-09-01', grade: 11, paidTotal: 300000 })]);
  });
  it('бүтэц эвдэрсэн хуудсыг төлбөрт оруулахгүй', () => {
    const sheet = mainSheet([row({ 23: 350000 })]);
    sheet[0][4] = 'Утас';
    const plan = buildPlan({ [SHEET.MAIN]: sheet }, [student()], today);
    expect(plan.skippedTabs).toContain(SHEET.MAIN);
    expect(plan.perStudent.size).toBe(0);
  });
  it('toBook-ээр дамжсан ч ижил', () => {
    const raw = mainSheet([row({ 23: 350000, 25: 46253 })]);
    const formatted = raw.map((r) => r.map((v, c) => (c === 25 ? '08/19' : v)));
    const book = toBook([{ title: SHEET.MAIN, unformatted: raw, formatted }]);
    expect(buildPlan(book, [student()], today).perStudent.get('u1')!.payments[0].paidOn).toBe('2026-08-19');
  });
});

describe('нүдээр тулгах', () => {
  const p = (cell: string, amount: number, extra: Partial<PlannedPayment> = {}): PlannedPayment => ({
    key: cell, cell, amount, kind: 'MONTH', forMonth: '2026-09', paidOn: '2026-09-30', receipts: [], label: '9-р сарын төлбөр', ...extra,
  });
  it('шинэ нүд — хуучин түлхүүрээр (задаргаа тус бүр)', () => {
    const r = reconcileStudent('u1', [p('main|2026-09', 350000, { key: 'main|2026-09|dep' }), p('main|2026-09', 2150000, { key: 'main|2026-09|bal' })], [], new Set());
    expect(r.inserts.map((i) => [i.amount, i.requestId])).toEqual([
      [350000, paymentRequestId('u1', 'main|2026-09|dep')],
      [2150000, paymentRequestId('u1', 'main|2026-09|bal')],
    ]);
  });
  it('нүдэнд нэмэлт бичигдсэн — зөрүүг л нэмнэ, дахин ажиллуулахад юу ч нэмэхгүй', () => {
    const existing = [{ paymentId: 'p1', cell: 'main|2026-09', amount: 350000 }];
    const first = reconcileStudent('u1', [p('main|2026-09', 2500000)], existing, new Set());
    expect(first.inserts).toEqual([expect.objectContaining({ amount: 2150000, cell: 'main|2026-09' })]);
    const again = reconcileStudent('u1', [p('main|2026-09', 2500000)], [...existing, { paymentId: 'p2', cell: 'main|2026-09', amount: 2150000 }], new Set());
    expect(again.inserts).toEqual([]);
    expect(again.mismatches).toEqual([]);
  });
  it('нүд хооронд шилжсэн бол давхар оруулахгүй — Админд хүлээлгэнэ', () => {
    const r = reconcileStudent('u1', [p('main|2026-10', 350000)], [{ paymentId: 'p1', cell: 'main|2026-09', amount: 350000 }], new Set());
    expect(r.inserts).toEqual([]);
    expect(r.mismatches).toEqual([{ cell: 'main|2026-09', sheet: 0, web: 350000 }]);
    expect(r.held).toHaveLength(1);
  });
  it('«Сар бүр» ↔ эзэн жагсаалт — нэг сар', () => {
    expect(cellSlot('monthly|2026-06')).toBe('main|2026-06');
    const r = reconcileStudent('u1', [p('monthly|2026-06', 300000)], [{ paymentId: 'p1', cell: 'main|2026-06', amount: 300000 }], new Set());
    expect(r).toEqual({ inserts: [], mismatches: [], held: [] });
  });
  it('буцаасан гүйлгээний түлхүүртэй мөргөлдөхгүй', () => {
    const taken = new Set([paymentRequestId('u1', 'main|2026-09')]);
    expect(freeRequestId('u1', 'main|2026-09', taken)).toBe(paymentRequestId('u1', 'main|2026-09|re1'));
  });
});
