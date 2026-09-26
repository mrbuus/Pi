const UB_TIME_ZONE = 'Asia/Ulaanbaatar';

export function formatMoney(amount: number | null | undefined): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  return `${amount.toLocaleString('en-US').replace(/,/g, ' ')}₮`;
}

function dateParts(date: Date, withTime = false): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: UB_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(withTime ? { hour: '2-digit' as const, minute: '2-digit' as const, hourCycle: 'h23' as const } : {}),
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  const day = `${part('year')}.${part('month')}.${part('day')}`;
  return withTime ? `${day} ${part('hour')}:${part('minute')}` : day;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+08:00` : value);
  return Number.isNaN(date.getTime()) ? '—' : dateParts(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateParts(date, true);
}
