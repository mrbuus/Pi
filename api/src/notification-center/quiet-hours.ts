/** Сурагчид push илгээхгүй цаг: 21:00–08:00 (Улаанбаатар, UTC+8, зуны цаггүй). */
export const QUIET_FROM_HOUR = 21;
export const QUIET_TO_HOUR = 8;

export function ulaanbaatarHour(now: Date): number {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ulaanbaatar',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return Number(h) % 24;
}

export function isQuietHoursUB(now: Date): boolean {
  const h = ulaanbaatarHour(now);
  return h >= QUIET_FROM_HOUR || h < QUIET_TO_HOUR;
}
