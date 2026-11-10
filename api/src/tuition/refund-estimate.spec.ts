import { computeWithdrawal, projectLessonDays } from './withdrawal';
import { seesRefundMoney, toEstimate, type EstimateSource } from './refund-estimate';

// «Одоо гарвал буцаах дүн» — эрхийн шүүлт (эзэн 2026-11-08): Багш зөвхөн буцаах дүн + хичээлийн тоо.
const lessons = projectLessonDays('2026-09-01', '2026-12-31', [1, 2, 4, 6], new Set());
const src = (over: Partial<EstimateSource> = {}): EstimateSource => ({
  countFrom: '2026-09-01',
  leftOn: '2026-11-05',
  webStart: '2026-10-23',
  noSchedule: false,
  monthlyFee: 350_000,
  lessonsPerMonth: 16,
  result: computeWithdrawal({
    monthlyFee: 350_000,
    lessonsPerMonth: 16,
    countFrom: '2026-09-01',
    leftOn: '2026-11-05',
    lessonDays: lessons,
    assumedDays: lessons.filter((d) => d < '2026-10-23'),
    excusedDays: [],
    extraExcluded: [],
    paid: 2_500_000,
  }),
  ...over,
});

describe('Одоо гарвал буцаах дүн — эрх', () => {
  it('Багш (TEACHER): буцаах дүн + хичээлийн тоо, мөнгөн задаргаа (төлсөн/ногдох) СЕРВЕРЭЭС ГАРАХГҮЙ', () => {
    const e = toEstimate(src(), 'TEACHER');
    expect(e.applicable).toBe(true);
    if (!e.applicable) return;
    expect(e.refund).toBe(1_734_375);
    expect(e.money).toBeNull();
    expect(e.basis).toMatchObject({
      countFrom: '2026-09-01',
      asOf: '2026-11-05',
      webStart: '2026-10-23',
      fullMonths: 2,
      lessonsPerMonth: 16,
      current: { start: '2026-11-01', lessons: 3, counted: 3, leaveDay: null },
    });
    // JSON-д ч мөнгөн талбар үлдэхгүй
    const json = JSON.stringify(e);
    for (const k of ['paid', 'owed', 'monthlyFee', 'perLesson', 'charge', 'refundedBefore'])
      expect(json).not.toContain(`"${k}"`);
  });

  it('Админ, Багш+: бүтэн задаргаа', () => {
    for (const role of ['ADMIN', 'TEACHER_PLUS']) {
      const e = toEstimate(src(), role);
      if (!e.applicable) throw new Error('applicable');
      expect(e.money).toMatchObject({ paid: 2_500_000, owed: 765_625, monthlyFee: 350_000 });
      expect(e.money!.cycles.map((c) => c.charge)).toEqual([350_000, 350_000, 65_625]);
    }
  });

  it('мөнгө харах эрх: зөвхөн ADMIN, TEACHER_PLUS (шинэ/үл мэдэгдэх role — үгүй)', () => {
    expect(seesRefundMoney('ADMIN')).toBe(true);
    expect(seesRefundMoney('TEACHER_PLUS')).toBe(true);
    for (const r of ['TEACHER', 'STUDENT', 'PARENT', 'BUYER', '', null, undefined])
      expect(seesRefundMoney(r)).toBe(false);
  });

  it('хичээлийн нийт тоо ба вэбээс өмнөх (суусан гэж үзсэн) тоо', () => {
    const e = toEstimate(src(), 'TEACHER');
    if (!e.applicable) throw new Error('applicable');
    const before = lessons.filter((d) => d < '2026-10-23').length;
    const all = lessons.filter((d) => d <= '2026-11-05').length;
    expect(e.basis.lessonsHeld).toBe(all);
    expect(e.basis.lessonsAssumed).toBe(before);
  });

  it('хуваарьгүй анги — тооцоо гаргахгүй (хичээлийн тоо мэдэгдэхгүй тул буруу буцаалт харуулахгүй)', () => {
    expect(toEstimate(src({ noSchedule: true }), 'ADMIN')).toEqual({
      applicable: false,
      reason: 'NO_SCHEDULE',
    });
  });

  it('мөчлөгийн сүүлийн өдөр бол одоогийн мөчлөг null (бүгд бүтэн сар)', () => {
    const r = computeWithdrawal({
      monthlyFee: 350_000,
      lessonsPerMonth: 16,
      countFrom: '2026-09-01',
      leftOn: '2026-10-31',
      lessonDays: lessons,
      excusedDays: [],
      extraExcluded: [],
      paid: 700_000,
    });
    const e = toEstimate(src({ leftOn: '2026-10-31', result: r }), 'TEACHER');
    if (!e.applicable) throw new Error('applicable');
    expect(e.basis.current).toBeNull();
    expect(e.basis.fullMonths).toBe(2);
    expect(e.refund).toBe(0);
  });
});
