import { buildIcs, escapeIcsText, foldIcsLine } from './ics-format';

describe('ICS formatting', () => {
  it('escapes RFC text values', () => {
    expect(escapeIcsText('Алгебр, 1; x\\y\nдараа')).toBe(
      'Алгебр\\, 1\\; x\\\\y\\nдараа',
    );
  });

  it('folds at 75 UTF-8 octets without splitting a code point', () => {
    const folded = foldIcsLine(`SUMMARY:${'Монгол'.repeat(20)}`);
    expect(folded.length).toBeGreaterThan(1);
    for (const line of folded) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
    expect(folded.slice(1).every((line) => line.startsWith(' '))).toBe(true);
    expect(folded.join('').replace(/ /g, '')).toBe(
      `SUMMARY:${'Монгол'.repeat(20)}`,
    );
  });

  it('writes a fixed Ulaanbaatar timezone, stable occurrence UID, and CRLF', () => {
    const ics = buildIcs(
      [
        {
          scheduleId: 'schedule-1',
          date: '2026-09-28',
          startMinute: 540,
          endMinute: 600,
          summary: 'Математик - 10А',
          room: 'Өрөө 2',
        },
      ],
      new Date('2026-09-26T04:00:00.000Z'),
    );

    expect(ics).toContain('TZID:Asia/Ulaanbaatar\r\n');
    expect(ics).toContain('TZOFFSETFROM:+0800\r\n');
    expect(ics).toContain('TZOFFSETTO:+0800\r\n');
    expect(ics).toContain('UID:schedule-1-20260928@pi.mn\r\n');
    expect(ics).toContain('DTSTART;TZID=Asia/Ulaanbaatar:20260928T090000\r\n');
    expect(ics).toContain('LOCATION:Өрөө 2\r\n');
    expect(ics).not.toMatch(/(?<!\r)\n/);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\r');
  });
});
