export interface CalendarEvent {
  scheduleId: string;
  date: string;
  startMinute: number;
  endMinute: number;
  summary: string;
  room: string | null;
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** RFC 5545 lines are limited to 75 octets. Fold only at Unicode codepoint edges. */
export function foldIcsLine(line: string): string[] {
  const folded: string[] = [];
  let chunk = '';
  let octets = 0;
  let continuation = false;

  for (const codePoint of line) {
    const size = Buffer.byteLength(codePoint, 'utf8');
    const limit = continuation ? 74 : 75;
    if (octets + size > limit && chunk) {
      folded.push(`${continuation ? ' ' : ''}${chunk}`);
      chunk = '';
      octets = 0;
      continuation = true;
    }
    chunk += codePoint;
    octets += size;
  }

  folded.push(`${continuation ? ' ' : ''}${chunk}`);
  return folded;
}

function icsDateTime(date: string, minute: number): string {
  const hour = Math.floor(minute / 60);
  const minuteOfHour = minute % 60;
  return `${date.replace(/-/g, '')}T${String(hour).padStart(2, '0')}${String(minuteOfHour).padStart(2, '0')}00`;
}

function utcTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function buildIcs(events: CalendarEvent[], now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pi.mn//Class Schedule//MN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Ulaanbaatar',
    'X-LIC-LOCATION:Asia/Ulaanbaatar',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:ULAT',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.scheduleId}-${event.date.replace(/-/g, '')}@pi.mn`,
      `DTSTAMP:${utcTimestamp(now)}`,
      `DTSTART;TZID=Asia/Ulaanbaatar:${icsDateTime(event.date, event.startMinute)}`,
      `DTEND;TZID=Asia/Ulaanbaatar:${icsDateTime(event.date, event.endMinute)}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
    );
    if (event.room) lines.push(`LOCATION:${escapeIcsText(event.room)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.flatMap(foldIcsLine).join('\r\n')}\r\n`;
}
