import {
  canEditAccount,
  comparePeriods,
  daysInMonth,
  effectiveRate,
  formatHundredths,
  maskAccountNumber,
  normalizeAccountNumber,
  orderSheetPeople,
  parseHoursInput,
  parsePeriod,
  payAmount,
  periodOfDate,
  shiftPeriod,
  staffedDays,
  sumHundredths,
  validRate,
  weekStartsCovering,
} from './work-sheet.logic';
import { isPayRateOwner, PAY_RATE_OWNER_ID } from './pay-rate-owner';
import type { ResolvedDay, ResolvedEntry } from '../schedule/week-resolver';

describe('Хагас сарын үе', () => {
  it('1-р хагас нь 1–15 (15 өдөр)', () => {
    const p = parsePeriod('2026-11-1');
    expect(p.start).toBe('2026-11-01');
    expect(p.end).toBe('2026-11-15');
    expect(p.days).toHaveLength(15);
  });

  it.each([
    ['2026-01-2', '2026-01-31', 16],
    ['2026-04-2', '2026-04-30', 15],
    ['2026-02-2', '2026-02-28', 13], // энгийн жил
    ['2028-02-2', '2028-02-29', 14], // өндөр жил
    ['2100-02-2', '2100-02-28', 13], // 100-д хуваагддаг, 400-д үгүй
    ['2096-02-2', '2096-02-29', 14],
    ['2026-12-2', '2026-12-31', 16],
  ] as [string, string, number][])('%s 16-аас %s хүртэл (%s өдөр)', (id, end, count) => {
    const p = parsePeriod(id);
    expect(p.start).toBe(`${id.slice(0, 7)}-16`);
    expect(p.end).toBe(end);
    expect(p.days).toHaveLength(count);
  });

  it('сарын өдрийн тоо', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 12)).toBe(31);
    expect(daysInMonth(2026, 9)).toBe(30);
  });

  it.each(['2026-11', '2026-11-3', '2026-13-1', '2026-00-2', 'abc', '', '2026-1-1'])(
    'буруу хэлбэр «%s» — алдаа',
    (id) => expect(() => parsePeriod(id)).toThrow(),
  );

  it('огноо → үе (15 нь 1-р, 16 нь 2-р хагас)', () => {
    expect(periodOfDate('2026-11-01')).toBe('2026-11-1');
    expect(periodOfDate('2026-11-15')).toBe('2026-11-1');
    expect(periodOfDate('2026-11-16')).toBe('2026-11-2');
    expect(periodOfDate('2026-11-30')).toBe('2026-11-2');
  });

  it('шилжүүлэх — сар, жил дамжина', () => {
    expect(shiftPeriod('2026-11-1', -1)).toBe('2026-10-2');
    expect(shiftPeriod('2026-11-2', 1)).toBe('2026-12-1');
    expect(shiftPeriod('2026-12-2', 1)).toBe('2027-01-1');
    expect(shiftPeriod('2027-01-1', -1)).toBe('2026-12-2');
    expect(shiftPeriod('2026-11-1', -24)).toBe('2025-11-1');
    expect(shiftPeriod('2026-11-1', 0)).toBe('2026-11-1');
  });

  it('үеийг харьцуулах', () => {
    expect(comparePeriods('2026-10-2', '2026-11-1')).toBeLessThan(0);
    expect(comparePeriods('2026-11-1', '2026-11-1')).toBe(0);
    expect(comparePeriods('2027-01-1', '2026-12-2')).toBeGreaterThan(0);
  });

  it('7 хоногийн цонх үеийг бүрэн, давхцалгүй бүрхэнэ', () => {
    expect(weekStartsCovering(parsePeriod('2026-11-1'))).toEqual(['2026-11-01', '2026-11-08', '2026-11-15']);
    expect(weekStartsCovering(parsePeriod('2026-02-2'))).toEqual(['2026-02-16', '2026-02-23']);
    expect(weekStartsCovering(parsePeriod('2026-01-2'))).toEqual(['2026-01-16', '2026-01-23', '2026-01-30']);
  });
});

describe('Цагийн утга уншина', () => {
  it.each([
    ['7', 700],
    ['7.5', 750],
    ['7,5', 750],
    [' 9,5 ', 950],
    ['2.25', 225],
    ['0,75', 75],
    ['.5', 50],
    [',5', 50],
    ['7.', 700],
    ['0', 0],
    ['24', 2400],
    ['24.00', 2400],
    ['07', 700],
    [7.5, 750],
  ])('«%s» → %s', (raw, hundredths) => {
    expect(parseHoursInput(raw)).toEqual({ ok: true, hundredths });
  });

  it.each(['', '   ', null, undefined])('хоосон «%s» = арилгах (null)', (raw) => {
    expect(parseHoursInput(raw as string)).toEqual({ ok: true, hundredths: null });
  });

  it.each(['24.01', '25', '100', '-1', '7.555', 'abc', '1e1', '7.5.1', '.', ',', '7,5,0', '+5', '7 5x'])(
    '«%s» — алдаа',
    (raw) => {
      const r = parseHoursInput(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
    },
  );

  it('бүх цагийн алдааны мессеж монголоор', () => {
    for (const raw of ['25', '7.555', 'x']) {
      const r = parseHoursInput(raw);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/[А-Яа-яӨөҮү]/);
    }
  });

  it.each([
    [750, '7.5'],
    [725, '7.25'],
    [700, '7'],
    [5, '0.05'],
    [50, '0.5'],
    [0, '0'],
    [null, ''],
  ])('%s → «%s»', (h, text) => {
    expect(formatHundredths(h)).toBe(text);
  });

  it('уншиж → бичиж → дахин уншихад ижил', () => {
    for (let h = 0; h <= 2400; h += 1) {
      const r = parseHoursInput(formatHundredths(h));
      expect(r).toEqual({ ok: true, hundredths: h });
    }
  });
});

describe('Нийлбэр — хөвөгч цэгийн алдаагүй', () => {
  it('0.1 + 0.2 нь яг 0.3', () => {
    const cells = ['0,1', '0,2'].map((v) => {
      const r = parseHoursInput(v);
      return r.ok ? r.hundredths : null;
    });
    expect(sumHundredths(cells)).toBe(30);
    expect(formatHundredths(sumHundredths(cells))).toBe('0.3');
  });

  it('Excel-ийн мөр: Дуламсүрэн = 78.5 цаг', () => {
    const row = [5, 5, 5, null, 7.5, null, 7, 9.5, 8, 7, null, 9.5, null, 8, 7].map((v) =>
      v === null ? null : (parseHoursInput(String(v)) as { hundredths: number }).hundredths,
    );
    expect(sumHundredths(row)).toBe(7850);
  });

  it('олон бутархай нэмэхэд яг гарна', () => {
    const many = Array.from({ length: 16 }, () => 33); // 0.33 × 16 = 5.28
    expect(formatHundredths(sumHundredths(many))).toBe('5.28');
  });

  it('цалин = цаг × хөлс, төгрөгөөр бүхэлчилнэ', () => {
    expect(payAmount(10000, 25000)).toBe(2_500_000);
    expect(payAmount(750, 15000)).toBe(112_500);
    expect(payAmount(33, 10001)).toBe(3300); // 3300.33 → 3300
    expect(payAmount(50, 3)).toBe(2); // 1.5 → 2
    expect(payAmount(0, 25000)).toBe(0);
  });

  it('хөлсний утга: бүхэл, 0–1 000 000', () => {
    expect(validRate(25000)).toBe(true);
    expect(validRate(0)).toBe(true);
    expect(validRate(-1)).toBe(false);
    expect(validRate(1.5)).toBe(false);
    expect(validRate(1_000_001)).toBe(false);
    expect(validRate('25000')).toBe(false);
    expect(validRate(NaN)).toBe(false);
  });
});

describe('Хөлс — үеэс эхлэн өвлөгдөнө', () => {
  const rows = [
    { effectiveFrom: '2026-10-16', ratePerHour: 20000 },
    { effectiveFrom: '2026-12-01', ratePerHour: 25000 },
  ];
  it.each([
    ['2026-10-01', null],
    ['2026-10-16', 20000],
    ['2026-11-01', 20000],
    ['2026-11-16', 20000],
    ['2026-12-01', 25000],
    ['2027-03-16', 25000],
  ])('%s үеийн хөлс %s', (start, rate) => {
    expect(effectiveRate(rows, start)?.ratePerHour ?? null).toBe(rate);
  });

  it('эрэмбэгүй ирсэн ч зөв', () => {
    expect(effectiveRate([...rows].reverse(), '2026-12-16')?.ratePerHour).toBe(25000);
  });
});

describe('Хөлсийг зөвхөн Баасанжав харна', () => {
  it('Баасанжавын id', () => {
    expect(PAY_RATE_OWNER_ID).toBe('cmuzc9vry0002kq7nidiofdds');
    expect(isPayRateOwner('cmuzc9vry0002kq7nidiofdds')).toBe(true);
  });
  it.each([
    'cmuzbshof00008p7ntitgkur0', // админ
    'cmuzc9vol0000kq7noepdktaj', // Баасансүрэн (цаг бөглөх эрхтэй ч хөлс харахгүй)
    '',
    null,
    undefined,
    'CMUZC9VRY0002KQ7NIDIOFDDS',
    ' cmuzc9vry0002kq7nidiofdds',
  ])('%s — харахгүй', (id) => {
    expect(isPayRateOwner(id as string)).toBe(false);
  });
});

describe('Данс', () => {
  it.each([
    ['5012 3456 78', '5012345678'],
    ['5012-345-678', '5012345678'],
    ['mn12 0005 0050 1234 5678', 'MN120005005012345678'],
    ['12345', '12345'],
  ])('«%s» → %s', (raw, value) => {
    expect(normalizeAccountNumber(raw)).toEqual({ ok: true, value });
  });

  it.each(['', '1234', 'abc12345', 'MN1234', '1'.repeat(21), 'US120005005012345678'])('«%s» — алдаа', (raw) => {
    expect(normalizeAccountNumber(raw).ok).toBe(false);
  });

  it('аудитад сүүлийн 4 орон л', () => {
    expect(maskAccountNumber('5012345678')).toBe('****5678');
    expect(maskAccountNumber('MN120005005012345678')).toBe('****5678');
    expect(maskAccountNumber(null)).toBeNull();
    expect(maskAccountNumber('5012345678')).not.toContain('5012');
  });

  it('өөрийн дансыг хүн бүр, бусдынхыг зөвхөн цаг бөглөх эрхтэй', () => {
    expect(canEditAccount({ viewerId: 'a', targetId: 'a', canEditHours: false })).toBe(true);
    expect(canEditAccount({ viewerId: 'a', targetId: 'b', canEditHours: false })).toBe(false);
    expect(canEditAccount({ viewerId: 'a', targetId: 'b', canEditHours: true })).toBe(true);
    expect(canEditAccount({ viewerId: 'a', targetId: 'a', canEditHours: true })).toBe(true);
  });
});

function entry(p: Partial<ResolvedEntry> & { scheduleId: string }): ResolvedEntry {
  return {
    classroomId: 'c',
    classroomName: 'Анги',
    teacherId: null,
    teacherName: null,
    teacherRole: null,
    startMinute: 600,
    endMinute: 690,
    room: null,
    subject: null,
    topic: null,
    leadTeacher: null,
    assistantTeacher: null,
    exception: null,
    ...p,
  };
}
function day(date: string, entries: ResolvedEntry[], isHoliday = false): ResolvedDay {
  return { date, weekday: 0, isHoliday, holiday: null, restingClasses: [], entries };
}

describe('Өдрийн хуваарьт орсон өдрүүд', () => {
  const period = new Set(parsePeriod('2026-11-1').days);

  it('ахлах ба туслах хоёулаа тооцогдоно, минут нэмэгдэнэ', () => {
    const map = staffedDays(
      [
        day('2026-11-03', [
          entry({ scheduleId: 's1', leadTeacher: { id: 'A', name: 'A' }, assistantTeacher: { id: 'B', name: 'B' } }),
          entry({ scheduleId: 's2', startMinute: 720, endMinute: 810, leadTeacher: { id: 'A', name: 'A' } }),
        ]),
      ],
      period,
    );
    expect(map.get('A')?.get('2026-11-03')).toEqual({ minutes: 180, lessons: 2 });
    expect(map.get('B')?.get('2026-11-03')).toEqual({ minutes: 90, lessons: 1 });
  });

  it('хуваарийн үндсэн багш (оноогоогүй) тооцогдохгүй', () => {
    const map = staffedDays([day('2026-11-03', [entry({ scheduleId: 's1', teacherId: 'C' })])], period);
    expect(map.size).toBe(0);
  });

  it('амралтын өдөр, үеэс гадуурх өдөр тооцогдохгүй', () => {
    const lead = { id: 'A', name: 'A' };
    const map = staffedDays(
      [
        day('2026-11-04', [entry({ scheduleId: 's1', leadTeacher: lead })], true),
        day('2026-11-16', [entry({ scheduleId: 's1', leadTeacher: lead })]),
        day('2026-10-31', [entry({ scheduleId: 's1', leadTeacher: lead })]),
      ],
      period,
    );
    expect(map.size).toBe(0);
  });

  it('нэг хичээлийг давхар цонхонд 2 удаа тоолохгүй; ахлах = туслах бол нэг', () => {
    const lead = { id: 'A', name: 'A' };
    const e = entry({ scheduleId: 's1', leadTeacher: lead, assistantTeacher: lead });
    const map = staffedDays([day('2026-11-05', [e]), day('2026-11-05', [e])], period);
    expect(map.get('A')?.get('2026-11-05')).toEqual({ minutes: 90, lessons: 1 });
  });
});

describe('Мөрийн дараалал', () => {
  it('ажлын өдрийн хүснэгтийн дарааллаар, хүснэгтэд байхгүй нь нэрээр төгсгөлд', () => {
    const out = orderSheetPeople([
      { id: '4', rosterOrder: null, name: 'Ганзаяа' },
      { id: '2', rosterOrder: 2, name: 'Дуламсүрэн' },
      { id: '3', rosterOrder: null, name: 'Амар' },
      { id: '1', rosterOrder: 1, name: 'Баасанжав' },
      { id: '5', rosterOrder: 2, name: 'Бадрал' },
    ]);
    expect(out.map((p) => p.id)).toEqual(['1', '5', '2', '3', '4']);
  });
});
