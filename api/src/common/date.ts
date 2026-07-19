// УБ-ын цагийн бүсээр «өнөөдөр» — @db.Date талбаруудад бичихэд ашиглана.
// UTC slice ашиглавал УБ-ын 00:00–07:59-д өмнөх өдрөөр бичигдэх алдаатай.
export function todayUB(): Date {
  return new Date(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(
      new Date(),
    ),
  );
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateOnly(value: string): Date {
  const key = value.slice(0, 10);
  const date = new Date(key);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(key) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== key
  ) {
    throw new Error('Invalid date');
  }
  return date;
}

export function addDateDays(date: Date, days: number): Date {
  const next = parseDateOnly(dateKey(date));
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function daysBetweenDateOnly(later: Date, earlier: Date): number {
  return Math.floor(
    (parseDateOnly(dateKey(later)).getTime() -
      parseDateOnly(dateKey(earlier)).getTime()) /
      DAY_MS,
  );
}
