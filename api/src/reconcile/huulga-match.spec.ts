import { buildMatchIndex, matchTransaction, nameKey, skeleton, type PayerHint, type RosterStudent } from './huulga-match';

// Зохиомол нэрс — хэв маяг нь жинхэнэ хуулгад тааралдсан тохиолдлуудаас (2026-11-05)
const S = (id: string, lastName: string, firstName: string, phones: string[] = [], archived = false): RosterStudent => ({ id, lastName, firstName, phones, archived });
const roster = [
  S('irmuun', 'Бат-Очир', 'Ирмүүн', ['88110001']),
  S('temuulen', 'Батболд', 'Тэмүүлэн', ['99110002']),
  S('temuulen2', 'Ганзориг', 'Тэмүүлэн', ['99110003']),
  S('misheel', 'Дорж', 'Мишээл', ['95110004']),
  // ах дүү: ижил овог, ижил эцэг эхийн утас
  S('amar', 'Ганчулуун', 'Амар', ['95736900']),
  S('bayasgalan', 'Ганчулуун', 'Баясгалан', ['95736900']),
  S('anu', 'Сүхээ', 'Ану', ['80110005']),
  S('nomin', 'Цогт', 'Номин-Эрдэнэ', ['91110006']),
];
const idx = (hints: PayerHint[] = []) => buildMatchIndex(roster, hints);
const m = (description: string, counterparty: string | null = null, hints: PayerHint[] = []) => matchTransaction({ description, counterparty }, idx(hints));

describe('бичвэрийн түлхүүр', () => {
  it('зураас, зай, том үсгийг ялгахгүй', () => {
    expect(nameKey('Бат-Очир')).toBe(nameKey('бат очир'));
    expect(nameKey('Номин-Эрдэнэ')).toBe('номинэрдэнэ');
  });
  it('латин, кирилл ижил араг', () => {
    expect(skeleton('misheel')).toBe(skeleton('Мишээл'));
    expect(skeleton('temuulen')).toBe(skeleton('Тэмүүлэн'));
    expect(skeleton('tvmen')).toBe(skeleton('Түмэн')); // ү-г v гэж бичдэг
  });
});

describe('хүүхэд таних — «2 шүүлтүүр»', () => {
  it('утас + нэр → автомат', () => {
    expect(m('Тэмүүлэн 99110002 сургалтын төлбөр')).toMatchObject({ decision: 'AUTO', candidates: [{ studentId: 'temuulen' }] });
  });
  it('зураастай нэр, овог (Colab код хэзээ ч олдоггүй байсан)', () => {
    expect(m('Бат-Очир Ирмүүн 12-6 төлбөр').candidates[0].studentId).toBe('irmuun');
    expect(m('Бат-Очир Ирмүүн 12-6 төлбөр').decision).toBe('AUTO');
  });
  it('овгийн ялгалын нөхцөл, «Б.Нэр» хэлбэр', () => {
    expect(m('Батболдын Тэмүүлэн').decision).toBe('AUTO');
    expect(m('Б.Тэмүүлэн').candidates[0].studentId).toBe('temuulen');
  });
  it('латин эхний үсэг овгийг заана («B.Temuulen» = Батболд, Ганзориг биш)', () => {
    expect(m('B.Temuulen 12-1')).toMatchObject({ decision: 'AUTO', candidates: [{ studentId: 'temuulen' }] });
    expect(m('G.TEMUULEN')).toMatchObject({ decision: 'AUTO', candidates: [{ studentId: 'temuulen2' }] });
  });
  it('«350k»-ийн k-г эхний үсэг гэж үзэхгүй', () => {
    expect(m('Temuulen 10sarin-350k').decision).toBe('CHOOSE');
  });
  it('латинаар бичсэн', () => {
    expect(m('misheel dorj 10a').candidates[0].studentId).toBe('misheel');
  });
  it('ганц утас = ганц баримт → нэг товшилтын санал', () => {
    expect(m('99110002')).toMatchObject({ decision: 'SUGGEST', candidates: [{ studentId: 'temuulen' }] });
  });
  it('ижил нэртэй хоёр хүүхэд, бусад баримтгүй → сонгох', () => {
    expect(m('Тэмүүлэн төлбөр').decision).toBe('CHOOSE');
  });
  it('ах дүүгийн хамтын шилжүүлэг → хуваах', () => {
    const r = m('Ганчулуун Амар, Баясгалан 95736900');
    expect(r.decision).toBe('SPLIT');
    expect(r.candidates.map((c) => c.studentId).sort()).toEqual(['amar', 'bayasgalan']);
  });
  it('ах дүүгийн ганц утас дангаараа шийдэхгүй', () => {
    expect(m('95736900').decision).toBe('CHOOSE');
  });
  it('нэр нь «Номин» мэт байсан ч ажиллана', () => {
    expect(m('12-2 Ц.Номин-Эрдэнэ').candidates[0].studentId).toBe('nomin');
  });
  it('илгээгчийн нэр («ХААНААС: … НЭР») хүүхдийн нэр гэж тооцогдохгүй', () => {
    // Мишээл гэдэг эх төлсөн; хүүхэд нь Ану (утсаар)
    expect(m('80110005 ХААНААС: 150000 БАТ МИШЭЭЛ')).toMatchObject({ decision: 'SUGGEST', candidates: [{ studentId: 'anu' }] });
  });
  it('илгээгч аав бол түүний нэр = хүүхдийн овог', () => {
    expect(m('Тэмүүлэн ХААНААС: 150000 ДОРЖ БАТБОЛД')).toMatchObject({ decision: 'AUTO', candidates: [{ studentId: 'temuulen' }] });
  });
  it('хүүхэд танигдахгүй', () => {
    expect(m('ТӨЛБӨРҮҮД').decision).toBe('NONE');
  });
});

describe('сурсан данс, утас', () => {
  it('ах дүүгүй хүүхдийн сурсан данс → нэмэлт шүүлтүүргүй автомат', () => {
    expect(m('1', '5001234567', [{ kind: 'ACCOUNT', value: '5001234567', studentId: 'anu' }])).toMatchObject({ decision: 'AUTO', candidates: [{ studentId: 'anu' }] });
  });
  it('ах дүүтэй хүүхдийн сурсан данс шийдвэрлэхгүй (нэг данснаас хоёулангийнх нь төлбөр ирдэг)', () => {
    expect(m('1', '5001234567', [{ kind: 'ACCOUNT', value: '5001234567', studentId: 'amar' }]).decision).toBe('SUGGEST');
  });
  it('сурсан данс утгад нэрлэгдсэн өөр хүүхэдтэй зөрчилдвөл сонгуулна', () => {
    const r = m('ALTAN misheel 12-3', '5001234567', [{ kind: 'ACCOUNT', value: '5001234567', studentId: 'anu' }]);
    expect(r.decision).toBe('CHOOSE');
    expect(r.candidates.map((c) => c.studentId)).toEqual(expect.arrayContaining(['anu', 'misheel']));
  });
  it('гарсан (архивласан) хүүхэд идэвхтэйтэй тэнцвэл ар тал руу', () => {
    const r = matchTransaction(
      { description: 'Тэмүүлэн', counterparty: null },
      buildMatchIndex([S('a', 'Батболд', 'Тэмүүлэн', [], true), S('b', 'Ганзориг', 'Тэмүүлэн')], []),
    );
    expect(r.candidates[0].studentId).toBe('b');
  });
});

describe('нийгмийн төлбөр (эзэн 2026-11-12)', () => {
  // Ижил нэртэй хоёр хүүхэд: нэг нь математикт, нөгөө нь нийгэмд суудаг
  const r2 = [
    S('math', 'Батмөнх', 'Хонгорзул', ['99182538']),
    { ...S('soc', 'Мөнхзул', 'Хонгорзул', ['89819079']), social: true },
    S('both', 'Баатархүү', 'Насанбүтэдмаа', ['60696985']),
  ];
  const i2 = buildMatchIndex(
    r2.map((s) => (s.id === 'both' ? { ...s, social: true } : s)),
    [],
  );
  const mm = (d: string) => matchTransaction({ description: d, counterparty: null }, i2);

  it('«нийгэм» гэсэн гүйлгээг нийгэмд суудаг хүүхдэд л ононо', () => {
    const r = mm('Хонгорзул нийгэм 2027');
    expect(r.candidates.map((c) => c.studentId)).toEqual(['soc']);
    expect(r.social).toEqual({ known: true });
  });
  it('латинаар «niigm», «Niigmiin angi» ч таньна', () => {
    expect(mm('EB -B.Nasanbutedmaa 60696985 niigm 2027')).toMatchObject({ decision: 'AUTO', social: { known: true } });
    expect(mm('Niigmiin angi M.Khongorzul').candidates.map((c) => c.studentId)).toEqual(['soc']);
  });
  it('нийгэмд суудаг хүүхэд таарахгүй бол хасахгүй, гэхдээ «known: false»', () => {
    const r = mm('Батмөнх 99182538 нийгэм');
    expect(r.candidates[0].studentId).toBe('math');
    expect(r.social).toEqual({ known: false });
  });
  it('«нийгэм» үггүй бол математикийн хүүхэд хасагдахгүй', () => {
    expect(mm('Батмөнх Хонгорзул 99182538').decision).toBe('AUTO');
    expect(mm('Батмөнх Хонгорзул 99182538').social).toBeUndefined();
  });
});
