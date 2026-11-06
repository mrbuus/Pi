import { coveredThrough, parseKhanStatement, shiftDay, StatementFormatError } from './khan-statement';

// Хаан банкны жинхэнэ хуулгын бүтэц (2026-11-05), дүн/нэр зохиомол
const grid = (rows: string[][], printed = '2026-11-05') => [
  ['Printed Date:', printed],
  ['Депозит дансны дэлгэрэнгүй хуулга'],
  [],
  ['Хэрэглэгч:', 'ЗОХИОМОЛ', 'Интервал: 2026-09-01-2026-11-05'],
  [],
  ['Валютын төрөл:', 'MNT', 'IBAN:', 'MN000500005000000000'],
  [],
  ['Гүйлгээний огноо', 'Салбар', 'Эхний үлдэгдэл', 'Кредит гүйлгээ', 'Дебит гүйлгээ', 'Эцсийн үлдэгдэл', 'Гүйлгээний утга', 'Харьцсан данс'],
  ...rows,
  [],
  ['Нийт дүн:', '650000.00', '-200.00'],
];
const row = (at: string, credit: string, debit: string, closing: string, desc: string, cp = '5001234567') => [at, '5000', '1000.00', credit, debit, closing, desc, cp];

describe('Хаан банкны хуулга', () => {
  const g = grid([
    row('2026-09-01 05:19:06', '0', '-200.00', '800.00', 'Ухаалаг банкны үйлчилгээний хураамж', ''),
    row('2026-09-01 11:21:00', '350000.00', '0', '350800.00', 'Тэмүүлэн 99110002'),
    // нэг секундэд ижил дүн, ижил утга — үлдэгдлээр ялгарна
    row('2026-09-01 11:21:00', '300000.00', '0', '650800.00', 'Ану 80110005'),
    row('2026-11-05 14:02:00', '300000.00', '0', '950800.00', 'Ану 80110005'),
  ]);

  it('толгой, данс, интервал, хэвлэсэн огноо', () => {
    const { info, rows, skipped } = parseKhanStatement(g);
    expect(info).toEqual({ accountNo: 'MN000500005000000000', from: '2026-09-01', to: '2026-11-05', printedOn: '2026-11-05' });
    expect(rows).toHaveLength(4);
    expect(skipped).toBe(2); // хоосон + «Нийт дүн»
  });

  it('орлого, зарлагын чиглэл ба эерэг дүн, УБ цаг', () => {
    const { rows } = parseKhanStatement(g);
    expect(rows[0]).toMatchObject({ direction: 'DEBIT', amount: 200, counterparty: null });
    expect(rows[1]).toMatchObject({ direction: 'CREDIT', amount: 350_000, date: '2026-09-01', counterparty: '5001234567' });
    expect(rows[1].bookedAt.toISOString()).toBe('2026-09-01T03:21:00.000Z');
  });

  it('түлхүүр: давтагдашгүй, дахин уншихад ижил (давхардахгүй)', () => {
    const a = parseKhanStatement(g).rows.map((r) => r.bankRef);
    const b = parseKhanStatement(g).rows.map((r) => r.bankRef);
    expect(new Set(a).size).toBe(4);
    expect(a).toEqual(b);
  });

  it('хуулгын сүүлийн өдөр бүтэн биш бол «бүрэн хамарсан» өдөр нь өмнөх өдөр', () => {
    const p = parseKhanStatement(g);
    expect(coveredThrough(p.info, p.rows)).toBe('2026-11-04');
    const later = parseKhanStatement(grid([row('2026-11-05 14:02:00', '1000.00', '0', '1.00', 'x')], '2026-11-06'));
    expect(coveredThrough(later.info, later.rows)).toBe('2026-11-05');
  });

  it('Excel огноо нүд (ISO) ч уншигдана', () => {
    const p = parseKhanStatement(grid([row('2026-09-01T11:21:00.000Z', '1000.00', '0', '1.00', 'x')]));
    expect(p.rows[0].at).toBe('2026-09-01 11:21:00');
  });

  it('буруу файл', () => {
    expect(() => parseKhanStatement([['a', 'b']])).toThrow(StatementFormatError);
  });

  it('өдөр шилжүүлэх', () => {
    expect(shiftDay('2026-09-01', -1)).toBe('2026-08-31');
  });
});
