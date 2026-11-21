// Нэгдсэн шалгалтын дүн нээгдэх цаг — Test.closesAt (эзэн 2026-11-21).
// Цэвэр логик — I/O-гүй, тесттэй (result-release.spec.ts).
//
// closesAt-тэй шалгалтад хаах цаг өнгөрөх хүртэл СУРАГЧ (эцэг эх) юу ч харахгүй: нийт оноо,
// бодлого тус бүрийн зөв/буруу, зөв хариу, бодолт, «Түгээмэл алдаа», бичлэг. Эрт илгээсэн
// сурагч найздаа оноо, хариу дамжуулахаас сэргийлнэ. closesAt null бол өмнөх зан төлөв.
// Багш, ажилтны замд нөлөөгүй.

import { formatUB } from './exam-window';

export interface ResultsPending {
  /** Дүн, бодолт нээгдэх агшин (UTC ISO, клиент Улаанбаатарын цагаар харуулна). */
  releaseAt: Date;
  /** Сурагчид харуулах бэлэн мессеж (монголоор, Улаанбаатарын цагаар). */
  message: string;
}

/** Дүн нуух ёстой бол нээгдэх агшин, үгүй бол null. */
export function resultsHiddenUntil(
  test: { closesAt?: Date | null },
  now: Date = new Date(),
): Date | null {
  const closesAt = test.closesAt;
  if (!closesAt) return null;
  return now.getTime() < closesAt.getTime() ? closesAt : null;
}

/** «Хариу хүлээн авлаа. Дүн, бодолт 11:40 цагт нээгдэнэ» — өөр өдөр бол огноотой. */
export function resultsPendingMessage(releaseAt: Date, now: Date = new Date()): string {
  const at = formatUB(releaseAt);
  const sameDay = at.slice(0, 10) === formatUB(now).slice(0, 10);
  return `Хариу хүлээн авлаа. Дүн, бодолт ${sameDay ? at.slice(11) : at} цагт нээгдэнэ`;
}

/** API-д нэмэх `resultsPending` талбар (нуух шаардлагагүй бол null). */
export function resultsPendingOf(
  test: { closesAt?: Date | null },
  now: Date = new Date(),
): ResultsPending | null {
  const releaseAt = resultsHiddenUntil(test, now);
  return releaseAt
    ? { releaseAt, message: resultsPendingMessage(releaseAt, now) }
    : null;
}

/** Prisma `test` нөхцөл: дүн нь сурагчид нээгдсэн шалгалт (хаах цаггүй эсвэл хаагдсан). */
export function releasedTestWhere(now: Date = new Date()) {
  return { OR: [{ closesAt: null }, { closesAt: { lte: now } }] };
}
