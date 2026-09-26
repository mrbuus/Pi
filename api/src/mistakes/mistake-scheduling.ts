export type MistakeStatus = 'NEW' | 'RETRYING' | 'MASTERED';

export interface MistakeRetryState {
  status: MistakeStatus;
  retryCount: number;
  consecutiveCorrect: number;
  lastRetryAt: Date;
  lastCorrectAt: Date | null;
  nextRetryAt: Date | null;
}

function ubDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function ubMidnight(date: Date): Date {
  return new Date(`${ubDayKey(date)}T00:00:00.000Z`);
}

function plusDays(date: Date, days: number): Date {
  const next = ubMidnight(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function nextMistakeRetryState(
  current: Pick<MistakeRetryState, 'status' | 'retryCount' | 'consecutiveCorrect' | 'lastCorrectAt'>,
  correct: boolean,
  now: Date,
): MistakeRetryState {
  const retryCount = current.retryCount + 1;
  if (!correct) {
    const interval = [1, 3, 7][Math.min(current.retryCount, 2)];
    return {
      status: 'RETRYING', retryCount, consecutiveCorrect: 0,
      lastRetryAt: now, lastCorrectAt: current.lastCorrectAt,
      nextRetryAt: plusDays(now, interval),
    };
  }

  const sameCorrectDay = current.lastCorrectAt !== null
    && ubDayKey(current.lastCorrectAt) === ubDayKey(now);
  const consecutiveCorrect = sameCorrectDay
    ? current.consecutiveCorrect
    : current.consecutiveCorrect + 1;
  const status: MistakeStatus = current.status === 'MASTERED' || consecutiveCorrect >= 2
    ? 'MASTERED'
    : 'RETRYING';
  return {
    status, retryCount, consecutiveCorrect, lastRetryAt: now,
    lastCorrectAt: sameCorrectDay ? current.lastCorrectAt : now,
    nextRetryAt: status === 'MASTERED' ? null : plusDays(now, 1),
  };
}
