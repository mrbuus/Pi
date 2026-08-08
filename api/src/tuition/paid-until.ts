/**
 * Төлбөр дуусах огноо — ЦЭВЭР ЛОГИК (I/O байхгүй)
 *
 * ДҮРЭМ (эзний гэрээ):
 * • 1 сарын төлбөр = fromDate-ээс хуанлийн 1 сар
 * • ГЭХДЭЭ интервалд таарсан НИЙТИЙН АМРАЛТЫН өдөр бүрээр сунгана
 *   (амралт төлбөрт тооцогдохгүй)
 * • Чөлөө/таслалт СУНГАХГҮЙ (тооцогдоно)
 * • Сунгалтаар нэмэгдсэн өдрөт дахин амралт таарвал мөн сунгана (давталт)
 */

export interface PaidUntilInput {
  fromDate: Date;
  monthsPaid: number;
  holidayDates: Date[];
}

/**
 * Төлбөрийн эцсийн огноог бодно — амралтаар сунгаж.
 *
 * @param input - Эхлэлийн огноо, төлсөн сарын тоо, амралтын өдрүүд
 * @returns Төлбөр дуусах огноо (UTC 00:00)
 */
export function computePaidUntil(input: PaidUntilInput): Date {
  const { fromDate, monthsPaid, holidayDates } = input;

  // Зан огнооны хулимдлыг нэгтгэнэ
  const holidaySet = new Set<string>();
  for (const hol of holidayDates) {
    const key = hol.toISOString().split('T')[0];
    holidaySet.add(key);
  }

  // Хуанлийн төгсгөл огноо (эхлээсээ N сар шалаж, хүүхэл өглөгү (30-р, 31-р))
  let endDate = new Date(fromDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + monthsPaid);
  endDate.setUTCDate(endDate.getUTCDate() - 1); // өмнөх өдөр = төлбөр төгсөх

  // Сунгалтын логик: төлбөр төгсөх өмнөх өдрөөс нэг өдөр цаашаа,
  // амралтын өдрүүдийг үргэлжүүлэн сканна.
  let additionalDays = 0;
  let current = new Date(endDate);
  current.setUTCDate(current.getUTCDate() + 1); // сунгалт эхлэх: endDate + 1

  const MAX_ADDITIONS = 120; // хамгийн их 120 өдөр амралт

  while (additionalDays < MAX_ADDITIONS) {
    const key = current.toISOString().split('T')[0];
    if (holidaySet.has(key)) {
      // Энэ өдөр амралт
      additionalDays++;
      current.setUTCDate(current.getUTCDate() + 1);
      // Дахин сканна
    } else {
      // Амралт БИШ → сунгалт зогсоно
      break;
    }
  }

  // Төлбөрийн эцсийн огноо = хуанлийн төгсгөл + амралтын хоног
  const finalDate = new Date(endDate);
  finalDate.setUTCDate(finalDate.getUTCDate() + additionalDays);
  return finalDate;
}
