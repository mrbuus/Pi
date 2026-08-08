import { prorateTuition, explainProration, type DateKey } from './proration';

/** «Да·Лх·Ба» гэсэн 3 удаагийн ангийн n долоо хоногийн хичээлийн өдрүүд. */
function mwfDays(startMonday: string, weeks: number): DateKey[] {
  const out: DateKey[] = [];
  const base = new Date(`${startMonday}T00:00:00.000Z`);
  for (let w = 0; w < weeks; w++) {
    for (const offset of [0, 2, 4]) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + w * 7 + offset);
      out.push(d.toISOString().slice(0, 10));
    }
  }
  return out;
}

describe('prorateTuition — бүтэн хугацаа', () => {
  const days = mwfDays('2026-09-07', 26); // 78 хичээл
  it('бүтэн хугацаа сууж, бүтэн төлсөн бол буцаалт байхгүй', () => {
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 400_000,
      joinedOn: '2026-09-07',
      leftOn: days[days.length - 1],
      totalPaid: 400_000,
    });
    expect(r.totalLessonDays).toBe(78);
    expect(r.attendedLessonDays).toBe(78);
    expect(r.owed).toBe(400_000);
    expect(r.refundAmount).toBe(0);
    expect(r.shortfall).toBe(0);
  });

  it('бүтэн хугацаанд төлбөр нь totalTuition-ээс ХЭТРЭХГҮЙ', () => {
    // Дугуйруулалт дээшээ гулсаад гэрээний дүнгээс давахгүй байх ёстой.
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 399_999,
      joinedOn: days[0],
      leftOn: days[77],
      totalPaid: 0,
    });
    expect(r.owed).toBe(399_999);
  });
});

describe('prorateTuition — хэсэгчилсэн хугацаа', () => {
  const days = mwfDays('2026-09-07', 26);

  it('яг хагасыг сууcан бол ойролцоогоор хагасыг төлнө', () => {
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 400_000,
      joinedOn: days[0],
      leftOn: days[38], // 39 дэх хичээл (0-ээс тоолсон)
      totalPaid: 400_000,
    });
    expect(r.attendedLessonDays).toBe(39);
    // 400000 × 39 / 78 = 200000 яг тэгш
    expect(r.owed).toBe(200_000);
    expect(r.refundAmount).toBe(200_000);
  });

  it('ГАРСАН өдөр хичээлтэй бол ТООЛОГДОНО', () => {
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 400_000,
      joinedOn: days[0],
      leftOn: days[9],
      totalPaid: 400_000,
    });
    expect(r.attendedLessonDays).toBe(10);
  });

  it('ГАРСАН өдөр хичээлгүй бол тооцогдохгүй', () => {
    // days[9] = Лхагва гэж үзвэл түүний маргааш (Пүрэв) хичээлгүй.
    const wednesday = days[9];
    const thursday = new Date(`${wednesday}T00:00:00.000Z`);
    thursday.setUTCDate(thursday.getUTCDate() + 1);
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 400_000,
      joinedOn: days[0],
      leftOn: thursday.toISOString().slice(0, 10),
      totalPaid: 400_000,
    });
    // Пүрэвт хичээл байхгүй тул тоо нь Лхагватайгаа ижил
    expect(r.attendedLessonDays).toBe(10);
  });

  it('дунд нь орсон сурагч зөвхөн үлдсэн хичээлийг төлнө', () => {
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 400_000,
      joinedOn: days[60],
      leftOn: days[77],
      totalPaid: 0,
    });
    expect(r.attendedLessonDays).toBe(18);
    expect(r.owed).toBe(Math.floor((400_000 * 18) / 78));
    expect(r.shortfall).toBe(r.owed);
    expect(r.refundAmount).toBe(0);
  });
});

describe('prorateTuition — дугуйруулалт', () => {
  it('өдрийн ханшийг ҮРЖҮҮЛЭХ аргаас илүү нарийн (алдаа хуримтлагдахгүй)', () => {
    const days = mwfDays('2026-09-07', 26); // 78
    const total = 400_000;
    const attended = 30;
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: total,
      joinedOn: days[0],
      leftOn: days[attended - 1],
      totalPaid: total,
    });
    const naive = Math.round(total / 78) * attended; // БУРУУ арга
    const exact = Math.floor((total * attended) / 78); // ЗӨВ арга
    expect(r.owed).toBe(exact);
    expect(r.owed).not.toBe(naive);
  });

  it('дугуйруулалт СУРАГЧИЙН талд (owed доошоо)', () => {
    const days = mwfDays('2026-09-07', 1); // 3 хичээл
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 100, // 100 / 3 = 33.33
      joinedOn: days[0],
      leftOn: days[0],
      totalPaid: 100,
    });
    expect(r.owed).toBe(33); // 34 биш
    expect(r.refundAmount).toBe(67);
  });

  it('буцаалт ба дутуу нь хэзээ ч зэрэг эерэг байхгүй', () => {
    const days = mwfDays('2026-09-07', 4);
    for (const paid of [0, 5_000, 50_000, 400_000]) {
      const r = prorateTuition({
        lessonDays: days,
        totalTuition: 100_000,
        joinedOn: days[0],
        leftOn: days[5],
        totalPaid: paid,
      });
      expect(Math.min(r.refundAmount, r.shortfall)).toBe(0);
      expect(r.refundAmount).toBeGreaterThanOrEqual(0);
      expect(r.shortfall).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('prorateTuition — ирмэгийн тохиолдол', () => {
  it('хичээлийн өдөр байхгүй бол бүгдийг буцаана + анхааруулга', () => {
    const r = prorateTuition({
      lessonDays: [],
      totalTuition: 400_000,
      joinedOn: '2026-09-07',
      leftOn: '2026-10-01',
      totalPaid: 120_000,
    });
    expect(r.warnings).toContain('NO_LESSON_DAYS');
    expect(r.owed).toBe(0);
    expect(r.refundAmount).toBe(120_000);
  });

  it('төлбөр тохируулаагүй бол анхааруулна', () => {
    const days = mwfDays('2026-09-07', 4);
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 0,
      joinedOn: days[0],
      leftOn: days[3],
      totalPaid: 50_000,
    });
    expect(r.warnings).toContain('ZERO_TUITION');
    expect(r.refundAmount).toBe(50_000);
  });

  it('гарах огноо орсон огнооноос өмнө бол 0 хичээл', () => {
    const days = mwfDays('2026-09-07', 4);
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 100_000,
      joinedOn: days[5],
      leftOn: days[2],
      totalPaid: 100_000,
    });
    expect(r.warnings).toContain('LEFT_BEFORE_JOINED');
    expect(r.attendedLessonDays).toBe(0);
    expect(r.owed).toBe(0);
    expect(r.refundAmount).toBe(100_000);
  });

  it('гарах огноо сүүлийн хичээлээс хойш бол бүтнээр тооцно + анхааруулга', () => {
    const days = mwfDays('2026-09-07', 4);
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 100_000,
      joinedOn: days[0],
      leftOn: '2030-01-01',
      totalPaid: 100_000,
    });
    expect(r.warnings).toContain('LEFT_AFTER_LAST_LESSON');
    expect(r.attendedLessonDays).toBe(days.length);
    expect(r.owed).toBe(100_000);
  });

  it('давхардсан болон эрэмбэлэгдээгүй өдрийг зөв боловсруулна', () => {
    const r = prorateTuition({
      lessonDays: ['2026-09-11', '2026-09-07', '2026-09-07', '2026-09-09'],
      totalTuition: 90_000,
      joinedOn: '2026-09-07',
      leftOn: '2026-09-09',
      totalPaid: 90_000,
    });
    expect(r.totalLessonDays).toBe(3); // давхардсан нь нэг болсон
    expect(r.attendedLessonDays).toBe(2);
    expect(r.owed).toBe(60_000);
  });
});

describe('explainProration', () => {
  it('буцаалттай тохиолдолд буцаах дүнг дурдана', () => {
    const days = mwfDays('2026-09-07', 26);
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 400_000,
      joinedOn: days[0],
      leftOn: days[38],
      totalPaid: 400_000,
    });
    const text = explainProration(r).join('\n');
    expect(text).toContain('Буцаах дүн');
    expect(text).toContain('78 өдөр');
    expect(text).toContain('39 өдөр');
  });

  it('дутуу төлсөн тохиолдолд нэхэх дүнг дурдана', () => {
    const days = mwfDays('2026-09-07', 4);
    const r = prorateTuition({
      lessonDays: days,
      totalTuition: 100_000,
      joinedOn: days[0],
      leftOn: days[11],
      totalPaid: 10_000,
    });
    expect(explainProration(r).join('\n')).toContain('Дутуу төлбөр');
  });
});
