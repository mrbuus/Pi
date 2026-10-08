import { BadRequestException } from '@nestjs/common';
/** Ledger timestamps use Ulaanbaatar (+08); ExpenseRecord dates are UTC calendar days. */
export function financeMonthBounds(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || Number(period.slice(0, 4)) < 1) {
    throw new BadRequestException('Сарын формат: YYYY-MM, сар 1–12 байна');
  }
  const dateStart = new Date(`${period}-01T00:00:00.000Z`);
  const dateEnd = new Date(dateStart);
  dateEnd.setUTCMonth(dateEnd.getUTCMonth() + 1);
  const previousDateStart = new Date(dateStart);
  previousDateStart.setUTCMonth(previousDateStart.getUTCMonth() - 1);
  const offset = 8 * 3600000;
  return { dateStart, dateEnd, previousDateStart,
    start: new Date(dateStart.getTime() - offset), end: new Date(dateEnd.getTime() - offset),
    previousStart: new Date(previousDateStart.getTime() - offset) };
}
export function exactMoney(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new BadRequestException('Нэгтгэсэн мөнгөн дүн тооцооны хязгаараас их байна');
  return number;
}
export function sumMoney(values: number[]): number { return exactMoney(values.reduce((sum, n) => sum + BigInt(n), 0n)); }
