// Шалгалтын бүрэн бүтэн байдлын үйл явдал (piemath_app/docs/EXAM-INTEGRITY.md).
// Цэвэр логик — I/O-гүй, тесттэй.
//
// LEAVE / FULLSCREEN_EXIT л `leaveCount`-ийг нэмэгдүүлнэ. Гар утасны аппын
// SCREENSHOT, RECORDING_START, RECORDING_STOP нь зөвхөн `events`-д бичигдэж,
// багшид тоогоор харагдана — сурагчийг «гарсан» гэж тооцохгүй.

export const SESSION_EVENTS = [
  'LEAVE',
  'RETURN',
  'FULLSCREEN_EXIT',
  'SCREENSHOT',
  'RECORDING_START',
  'RECORDING_STOP',
] as const;

export type SessionEvent = (typeof SESSION_EVENTS)[number];

const LEAVE_EVENTS: ReadonlySet<string> = new Set(['LEAVE', 'FULLSCREEN_EXIT']);

/** Энэ үйл явдал `leaveCount`-ийг нэмэх үү */
export function countsAsLeave(event: string | undefined | null): boolean {
  return !!event && LEAVE_EVENTS.has(event);
}

export type IntegrityCounts = {
  screenshotCount: number;
  recordingCount: number;
};

/**
 * Session-ий `events` (JSON массив `{ t, type }`)-ээс дэлгэцийн зураг, бичлэгийн
 * тоог гаргана. `events` нь сүүлийн MAX_EVENTS-ээр хязгаарлагддаг тул тоо нь
 * хадгалагдсан үйл явдлаас л тооцогдоно.
 */
export function countIntegrityEvents(events: unknown): IntegrityCounts {
  const counts: IntegrityCounts = { screenshotCount: 0, recordingCount: 0 };
  if (!Array.isArray(events)) return counts;
  for (const e of events) {
    const type =
      e && typeof e === 'object' ? (e as { type?: unknown }).type : undefined;
    if (type === 'SCREENSHOT') counts.screenshotCount += 1;
    else if (type === 'RECORDING_START') counts.recordingCount += 1;
  }
  return counts;
}
