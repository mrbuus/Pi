// Сургалтаас хасах үеийн төлбөрийн тооцоо — ЦЭВЭР логик (I/O байхгүй, unit тестэд бүрэн ордог).
//
// Гэрээ (2026-2027, «Найм. Сургалтын хугацаа, төлбөр») ба эзний тайлбар 2026-11-03:
//  - Тооцоог сургалтын төвд мэдэгдсэн өдрөөр (гарсан өдөр) тасална.
//  - Сарын мөчлөг = сууж эхэлсэн өдрөөс дараа сарын мөн өдрийн өмнөх өдөр хүртэл.
//  - БҮТЭН суусан мөчлөг бүр = тухайн ангийн САРЫН үндсэн төлбөр (350 000₮ / 300 000₮) —
//    хичээлийн тоогоор үржүүлэхгүй.
//  - ГАРСАН мөчлөг л хичээлээр: суусан хичээл × нэг хичээлийн үнэ (сарын төлбөр ÷ сард ногдох
//    хичээл: 7 хоногт 4 өдөр = 16, 3 өдөр = 12), сарын төлбөрөөс хэтрэхгүй.
//  - Суусан хичээл = ангид БОЛСОН хичээл (амралт, цуцалсан хичээл ороогүй). Хоцорсон, тасалсан нь
//    суусанд тооцогдоно (гэрээ 9.2). Гарсан мөчлөгт албан ёсны 1 чөлөө (гэрээ 8.x, 9.1.2) болон ажилтны
//    сонгосон өдөр (эмнэлгийн чөлөө гэх мэт) хасагдана.
//  - Буцаах дүн = төлсөн − ногдох; сөрөг бол 0 (нэхэхгүй).
// Дугуйруулалт сурагчийн талд: Math.floor.

export type DateKey = string;

export interface WithdrawalInput {
  /** Ангийн сарын үндсэн төлбөр (₮) */
  monthlyFee: number;
  /** Сард ногдох хичээл (16 эсвэл 12) */
  lessonsPerMonth: number;
  /** Тооцоо эхлэх өдөр (мөчлөгийн эхлэл) */
  countFrom: DateKey;
  /** Мэдэгдсэн/гарсан өдөр — энэ өдрийн хичээл тоологдоно */
  leftOn: DateKey;
  /** Сурагчийн ангид болсон хичээлийн өдрүүд (амралт, цуцлалт хассан) */
  lessonDays: DateKey[];
  /** Чөлөөтэй (EXCUSED) тэмдэглэгдсэн өдрүүд */
  excusedDays: DateKey[];
  /** Ажилтны «суугаагүй» гэж сонгосон өдрүүд (эмнэлгийн чөлөө гэх мэт) */
  extraExcluded: DateKey[];
  /** Энэ гэрээнд тооцогдох төлсөн нийт дүн (₮) */
  paid: number;
}

export interface WithdrawalCycle {
  start: DateKey;
  end: DateKey;
  /** Бүтэн суусан (сарын төлбөрөөр) эсвэл гарсан мөчлөг (хичээлээр) */
  full: boolean;
  /** Гарсан мөчлөг: эхнээс гарсан өдөр хүртэл болсон хичээл */
  lessons: number;
  /** Хасагдсан албан ёсны чөлөө (сард 1) */
  leaveDay: DateKey | null;
  /** Ажилтны хассан өдрүүд */
  extraDays: DateKey[];
  /** Тоологдсон хичээл */
  counted: number;
  charge: number;
}

export interface WithdrawalResult {
  cycles: WithdrawalCycle[];
  /** Нэг хичээлийн үнэ — ЗӨВХӨН харуулахад (тооцоо сарын төлбөр × тоо ÷ хичээлээр нэг үйлдлээр) */
  perLesson: number;
  fullMonths: number;
  owed: number;
  paid: number;
  refund: number;
  /** Суусан хичээлийн төлбөр төлсөн дүнгээс илүү (нэхэхгүй, мэдээлэл) */
  over: number;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const toUtc = (d: DateKey) => Date.parse(`${d}T00:00:00Z`);
const fromUtc = (t: number): DateKey => new Date(t).toISOString().slice(0, 10);
const prevDay = (d: DateKey): DateKey => fromUtc(toUtc(d) - 86_400_000);

/** «2026-09-07» + n сар (өдрийг тухайн сарын сүүлийн өдрөөр хязгаарлана: 01-31 + 1 → 02-28) */
export function addMonths(d: DateKey, n: number): DateKey {
  const [y, m, day] = d.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const yy = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  return `${yy}-${pad2(mm)}-${pad2(Math.min(day, last))}`;
}

export function computeWithdrawal(input: WithdrawalInput): WithdrawalResult {
  const fee = Math.max(0, Math.round(input.monthlyFee));
  const lpm = Math.max(1, Math.round(input.lessonsPerMonth));
  const lessons = [...new Set(input.lessonDays)].sort();
  const excused = new Set(input.excusedDays);
  const extra = new Set(input.extraExcluded);
  const cycles: WithdrawalCycle[] = [];
  if (input.leftOn >= input.countFrom) {
    for (let i = 0; i < 240; i++) {
      const start = addMonths(input.countFrom, i);
      if (start > input.leftOn) break;
      const end = prevDay(addMonths(input.countFrom, i + 1));
      if (end < input.leftOn) {
        cycles.push({
          start,
          end,
          full: true,
          lessons: 0,
          leaveDay: null,
          extraDays: [],
          counted: 0,
          charge: fee,
        });
        continue;
      }
      const held = lessons.filter((d) => d >= start && d <= input.leftOn);
      const leaveDay =
        held.find((d) => excused.has(d) && !extra.has(d)) ?? null;
      const extraDays = held.filter((d) => extra.has(d));
      const counted = held.length - extraDays.length - (leaveDay ? 1 : 0);
      cycles.push({
        start,
        end,
        full: false,
        lessons: held.length,
        leaveDay,
        extraDays,
        counted,
        charge: Math.min(fee, Math.floor((fee * counted) / lpm)),
      });
    }
  }
  const owed = cycles.reduce((s, c) => s + c.charge, 0);
  const paid = Math.max(0, Math.round(input.paid));
  return {
    cycles,
    perLesson: Math.round((fee / lpm) * 100) / 100,
    fullMonths: cycles.filter((c) => c.full).length,
    owed,
    paid,
    refund: Math.max(0, paid - owed),
    over: Math.max(0, owed - paid),
  };
}

/** Сард ногдох хичээл: 7 хоногт 4+ өдөр = 16, бусад = 12 (гэрээ) */
export function lessonsPerMonthFor(
  daysPerWeek: number | null | undefined,
  monthlyFee: number,
): number {
  if (daysPerWeek != null && daysPerWeek >= 4) return 16;
  if (daysPerWeek != null && daysPerWeek >= 1) return 12;
  return monthlyFee >= 350_000 ? 16 : 12;
}

/**
 * Хуваарийн өдрүүдэд цуцлалт/зөөлтийг хэрэглэнэ: CANCELLED — тэр хуваарийн хичээл болоогүй; MOVED —
 * анхны өдрөөс хасаж шинэ өдөрт нэмнэ (шинэ өдөр [from, to] дотор бол). Үлдсэн хичээлтэй өдрүүд.
 */
export function heldLessonDays(
  planned: { date: DateKey; scheduleIds: string[] }[],
  exceptions: {
    scheduleId: string;
    date: DateKey;
    kind: 'CANCELLED' | 'MOVED';
    newDate: DateKey | null;
  }[],
  from: DateKey,
  to: DateKey,
): DateKey[] {
  const map = new Map<DateKey, Set<string>>();
  for (const p of planned) map.set(p.date, new Set(p.scheduleIds));
  const known = new Set(planned.flatMap((p) => p.scheduleIds));
  for (const x of exceptions) {
    if (!known.has(x.scheduleId)) continue;
    map.get(x.date)?.delete(x.scheduleId);
    if (x.kind === 'MOVED' && x.newDate && x.newDate >= from && x.newDate <= to)
      (map.get(x.newDate) ?? map.set(x.newDate, new Set()).get(x.newDate)!).add(
        x.scheduleId,
      );
  }
  return [...map.entries()]
    .filter(([, ids]) => ids.size > 0)
    .map(([d]) => d)
    .sort();
}
