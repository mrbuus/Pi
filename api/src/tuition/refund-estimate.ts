// «Одоо гарвал буцаах дүн» — сурагчийн хуудас, ирцийн самбарын drawer-т (эзэн 2026-11-08).
// ЦЭВЭР логик: «Сургалтаас хасах»-ын тооцоог (withdrawal.ts) өнөөдрөөр гаргаад эрхээр нь шүүнэ.
//
// Эрх (эзний 2026-11-08 шийдвэр — CLAUDE.md-ийн «Багш төлбөрийн нийт дүн харахгүй» дүрмийн ЦОРЫН ГАНЦ
// үл хамаарал): Багш (TEACHER) зөвхөн БУЦААХ ДҮН ба хичээлийн тооны үндэслэлийг харна — төлсөн,
// ногдох дүн, сарын төлбөр, мөчлөг бүрийн мөнгө СЕРВЕРЭЭС ГАРАХГҮЙ. Админ, Багш+ бүтэн задаргаа харна.

import type { DateKey, WithdrawalResult } from './withdrawal';

/** Тооцооны үндэслэл — хичээлийн тоо (бүх ажилтанд) */
export interface EstimateBasis {
  /** Тооцоо эхэлсэн өдөр (мөчлөгийн эхлэл) */
  countFrom: DateKey;
  /** «Одоо гарвал» — өнөөдөр */
  asOf: DateKey;
  /** Вэбд ирц бүртгэж эхэлсэн өдөр; өмнөх хичээлд бүгдэд нь суусан гэж үзсэн */
  webStart: DateKey | null;
  /** Бүтэн суусан сар (мөчлөг) */
  fullMonths: number;
  /** Тооцоонд орсон хугацаанд ангид болсон нийт хичээл */
  lessonsHeld: number;
  /** Үүнээс вэбээс өмнөх (суусан гэж үзсэн) */
  lessonsAssumed: number;
  /** Сард ногдох хичээл (16 эсвэл 12) */
  lessonsPerMonth: number;
  /** Одоогийн (гарах) мөчлөг — хичээлээр тооцогдоно */
  current: {
    start: DateKey;
    end: DateKey;
    lessons: number;
    counted: number;
    leaveDay: DateKey | null;
  } | null;
}

/** Мөнгөн задаргаа — зөвхөн Админ, Багш+ */
export interface EstimateMoney {
  monthlyFee: number;
  perLesson: number;
  owed: number;
  paid: number;
  refundedBefore: number;
  /** Мөчлөг бүрийн дүн */
  cycles: { start: DateKey; end: DateKey; full: boolean; counted: number; charge: number }[];
}

export type RefundEstimate =
  | {
      applicable: true;
      refund: number;
      basis: EstimateBasis;
      /** Багшид null */
      money: EstimateMoney | null;
    }
  | {
      applicable: false;
      reason: 'ARCHIVED' | 'NO_CLASS' | 'NO_SCHEDULE';
    };

export interface EstimateSource {
  countFrom: DateKey;
  leftOn: DateKey;
  webStart: DateKey | null;
  noSchedule: boolean;
  monthlyFee: number;
  lessonsPerMonth: number;
  result: WithdrawalResult;
}

/** Мөнгөн задаргааг харах эрх: Админ, Багш+ (finance.manage-ийг байнга эзэмшдэг). Бусад — үгүй. */
export const seesRefundMoney = (role: string | null | undefined): boolean =>
  role === 'ADMIN' || role === 'TEACHER_PLUS';

export function toEstimate(src: EstimateSource, role: string): RefundEstimate {
  if (src.noSchedule) return { applicable: false, reason: 'NO_SCHEDULE' };
  const r = src.result;
  const last = r.cycles.at(-1);
  const current =
    last && !last.full
      ? {
          start: last.start,
          end: last.end,
          lessons: last.lessons,
          counted: last.counted,
          leaveDay: last.leaveDay,
        }
      : null;
  const basis: EstimateBasis = {
    countFrom: src.countFrom,
    asOf: src.leftOn,
    webStart: src.webStart,
    fullMonths: r.fullMonths,
    lessonsHeld: r.cycles.reduce((s, c) => s + c.lessons, 0),
    lessonsAssumed: r.cycles.reduce((s, c) => s + c.assumed, 0),
    lessonsPerMonth: src.lessonsPerMonth,
    current,
  };
  const money: EstimateMoney | null = seesRefundMoney(role)
    ? {
        monthlyFee: src.monthlyFee,
        perLesson: r.perLesson,
        owed: r.owed,
        paid: r.paid,
        refundedBefore: r.refundedBefore,
        cycles: r.cycles.map((c) => ({
          start: c.start,
          end: c.end,
          full: c.full,
          counted: c.counted,
          charge: c.charge,
        })),
      }
    : null;
  return { applicable: true, refund: r.refund, basis, money };
}
