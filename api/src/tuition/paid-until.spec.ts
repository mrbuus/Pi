import { computePaidUntil, PaidUntilInput } from './paid-until';

describe('computePaidUntil — Төлбөр дуусах огноо', () => {
  /**
   * Туршилтын үндсэн дүрэм:
   * • UTC таймзонд ажиллана (Date төрлүүд YYYY-MM-DD)
   * • Хуанлийн 1 сар = 1 сар урьдчилан
   * • Амралтын өдөр = нэмэлт сунгалт
   */

  function dateUTC(isoStr: string): Date {
    return new Date(`${isoStr}T00:00:00Z`);
  }

  function formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  // ===== 1. САРЫН БА АМРАЛТГҮЙ =====
  test('1 сар, амралтгүй', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-09-15'),
      monthsPaid: 1,
      holidayDates: [],
    };
    const result = computePaidUntil(input);
    // 09-15 + 1 сар = 10-15, тэгвэл 10-14 = төлбөр дуусах
    expect(formatDate(result)).toBe('2026-10-14');
  });

  test('3 сар, амралтгүй', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-09-01'),
      monthsPaid: 3,
      holidayDates: [],
    };
    const result = computePaidUntil(input);
    // 09-01 + 3 сар = 12-01, тэгвэл 11-30 = төлбөр дуусах
    expect(formatDate(result)).toBe('2026-11-30');
  });

  // ===== 2. ЭНЕ АМРАЛТТАЙ =====
  test('1 сар, төгсгөлд амралт 3 өдөр', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-09-01'),
      monthsPaid: 1,
      holidayDates: [
        dateUTC('2026-10-01'), // амралт
        dateUTC('2026-10-02'), // амралт
        dateUTC('2026-10-03'), // амралт
      ],
    };
    const result = computePaidUntil(input);
    // 09-01 + 1 сар = 09-30
    // Сунгалт: 10-01, 10-02, 10-03 амралт → 3 өдөр сунгана
    // = 09-30 + 3 = 10-03
    expect(formatDate(result)).toBe('2026-10-03');
  });

  test('1 сар, дээр нь 5 өдрийн амралт', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-09-01'),
      monthsPaid: 1,
      holidayDates: [
        dateUTC('2026-10-01'),
        dateUTC('2026-10-02'),
        dateUTC('2026-10-03'),
        dateUTC('2026-10-04'),
        dateUTC('2026-10-05'),
      ],
    };
    const result = computePaidUntil(input);
    // 09-01 + 1 сар = 09-30
    // Сунгалт: 10-01 → 10-05 (5 өдөр)
    // = 09-30 + 5 = 10-05
    expect(formatDate(result)).toBe('2026-10-05');
  });

  // ===== 3. СУНГАЛТ ДЭЭ ДАВХАР АМРАЛТ =====
  test('1 сар, төгсгөлд 2+3 өдрийн давхар амралт', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-09-01'),
      monthsPaid: 1,
      holidayDates: [
        dateUTC('2026-10-01'), // 1-р амралт
        dateUTC('2026-10-02'), // 1-р амралт
        dateUTC('2026-10-04'), // 2-р амралт
        dateUTC('2026-10-05'), // 2-р амралт
        dateUTC('2026-10-06'), // 2-р амралт
      ],
    };
    const result = computePaidUntil(input);
    // 09-01 + 1 сар = 09-30
    // Сунгалт эхлэл: 10-01 (амралт) → 10-02 (амралт) → 10-03 (амралт БИШ) → СТОП
    // Эхний сунгалт = 2 өдөр (10-01, 10-02)
    // = 09-30 + 2 = 10-02
    // ⚠️ Адилхан сунгалтыг давталж орсон (10-04..06) тэр үе дээр ирэхгүй
    expect(formatDate(result)).toBe('2026-10-02');
  });

  // ===== 4. ОЛОН САР + АМРАЛТ =====
  test('6 сар, хүүхэл амралт 10 өдөр', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-09-01'),
      monthsPaid: 6,
      holidayDates: [
        dateUTC('2027-03-01'),
        dateUTC('2027-03-02'),
        dateUTC('2027-03-03'),
        dateUTC('2027-03-04'),
        dateUTC('2027-03-05'),
        dateUTC('2027-03-06'),
        dateUTC('2027-03-07'),
        dateUTC('2027-03-08'),
        dateUTC('2027-03-09'),
        dateUTC('2027-03-10'),
      ],
    };
    const result = computePaidUntil(input);
    // 09-01 + 6 сар = 03-01, тэгвэл 02-28 (төлбөр төгсгөл)
    // Сунгалт: 03-01..10 (10 өдөр амралт)
    // = 02-28 + 10 = 03-10
    expect(formatDate(result)).toBe('2027-03-10');
  });

  // ===== 5. САРЫН ТӨГСГӨЛИЙН НЮАНС =====
  test('2 сар, 01-31 эхлэл (шинэ жилд орно)', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-01-31'),
      monthsPaid: 2,
      holidayDates: [],
    };
    const result = computePaidUntil(input);
    // 01-31 + 2 сар = 03-31, тэгвэл 03-30
    expect(formatDate(result)).toBe('2026-03-30');
  });

  test('өндөрлөг сар (2 → 4)', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-02-15'),
      monthsPaid: 2,
      holidayDates: [],
    };
    const result = computePaidUntil(input);
    // 02-15 + 2 сар = 04-15, тэгвэл 04-14
    expect(formatDate(result)).toBe('2026-04-14');
  });

  // ===== 6. ХИЛИЙН ӨДӨРТ АМРАЛТ =====
  test('Төлбөр дуусах өнгөрсөн өдөр = амралт эсвэл үгүй', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-09-01'),
      monthsPaid: 1,
      holidayDates: [dateUTC('2026-09-30')], // хэрэ дээр
    };
    const result = computePaidUntil(input);
    // 09-01 + 1 сар = 09-30, тэгвэл 09-29
    // Сунгалт: 09-30 амралт → 1 өдөр сунгана
    // = 09-29 + 1 = 09-30
    expect(formatDate(result)).toBe('2026-09-30');
  });

  test('Төлбөр дуусах хуцрах өдөр + амралтгүй сунгалт', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-09-01'),
      monthsPaid: 1,
      holidayDates: [dateUTC('2026-10-01')],
    };
    const result = computePaidUntil(input);
    // 09-01 + 1 сар = 09-30, тэгвэл 09-29
    // Сунгалт: 10-01 амралт → 1 өдөр
    // = 09-30 + 1 = 10-01 (09-29 төгсгөл, дараа нь 10-01 сунгалт)
    expect(formatDate(result)).toBe('2026-10-01');
  });

  // ===== 7. НЭМЭЛТ БУЛАА ТЕСТ =====
  test('0 сар (төлбөргүй)', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-09-15'),
      monthsPaid: 0,
      holidayDates: [],
    };
    const result = computePaidUntil(input);
    // 09-15 + 0 сар = 09-15, тэгвэл 09-14
    expect(formatDate(result)).toBe('2026-09-14');
  });

  test('Өндөр хэмжээний амралт (хүүхэл амралт + Их сайтрын дадлага)', () => {
    const holidays: Date[] = [];
    // 20 өдрийн амралт
    for (let i = 1; i <= 20; i++) {
      holidays.push(dateUTC(`2026-10-${String(i).padStart(2, '0')}`));
    }
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-09-01'),
      monthsPaid: 1,
      holidayDates: holidays,
    };
    const result = computePaidUntil(input);
    // 09-01 + 1 сар = 09-30, тэгвэл 09-29
    // Сунгалт: 10-01..20 (20 өдөр) = 09-29 + 20 = 10-19
    // ГЭХДЭЭ computePaidUntil энэ 20 өдрүүдийг адилхан нэмэнэ
    // = 09-30 + 20 = 10-20 (10-01..20 таарж байна)
    expect(formatDate(result)).toBe('2026-10-20');
  });

  test('Амралтын дараа ажлын өдөр → сунгалт зогс', () => {
    const input: PaidUntilInput = {
      fromDate: dateUTC('2026-09-01'),
      monthsPaid: 1,
      holidayDates: [
        dateUTC('2026-10-01'),
        dateUTC('2026-10-02'),
        // 10-03 АЖИЛ (амралт БИШ)
      ],
    };
    const result = computePaidUntil(input);
    // 09-01 + 1 сар = 09-30, тэгвэл 09-29
    // Сунгалт: 10-01, 10-02 (амралт) → 10-03 (амралт БИШ) → СТОП
    // = 09-30 + 2 = 10-02 (09-29 нь хуанли төгсгөл, дараа нь 10-01, 10-02 сунгалт)
    expect(formatDate(result)).toBe('2026-10-02');
  });
});
