import { guideContentErrors, type GuideContent } from './paper-exam-guide';

const choice: GuideContent = {
  kind: 'choice',
  points: 2,
  statement: ['$x^2+4x+5\\ge 0$ тэнцэтгэл бишийг бод'],
  choices: [']-\\infty;\\infty[', '\\text{шийдгүй}'],
  answer: 'A',
  rule: ['$D<0$ ба $a>0$ бол бүх $x$-д эерэг'],
  easy: ['Парабол тэнхлэгийг огтлохгүй'],
  refs: [
    {
      chapter: 'Рациональ тэнцэтгэл биш',
      test: 5,
      number: '10',
      text: '$x^2+x+2<0$',
    },
  ],
  steps: ['$$D=16-20=-4<0$$', 'Бүх бодит тоо шийд болно'],
  topic: 'Рациональ тэнцэтгэл биш',
};

const fill: GuideContent = {
  ...choice,
  kind: 'fill',
  points: 7,
  choices: undefined,
  answer: undefined,
  fields: [
    { key: 'a', value: '2', part: 0 },
    { key: 'ef', value: '18', part: 1 },
  ],
  parts: [{ points: 3 }, { points: 4 }],
};

describe('guideContentErrors', () => {
  it('зөв сонгох ба нөхөх тайлбарт алдаа гаргахгүй', () => {
    expect(guideContentErrors(choice)).toEqual([]);
    expect(guideContentErrors(fill)).toEqual([]);
  });

  it('объект биш утгыг татгалзана', () => {
    expect(guideContentErrors(null)).toEqual(['content объект биш']);
  });

  it('хаагдаагүй томьёог илрүүлнэ', () => {
    expect(guideContentErrors({ ...choice, steps: ['$x+1'] })).toContain(
      'steps: $ тэмдэг хаагдаагүй',
    );
  });

  it('сонголтод байхгүй зөв хариуг илрүүлнэ', () => {
    expect(guideContentErrors({ ...choice, answer: 'C' })).toContain(
      'answer сонголтод алга',
    );
  });

  it('нөхөх бодлогын нүд ба онооны зөрүүг илрүүлнэ', () => {
    expect(
      guideContentErrors({
        ...fill,
        fields: [{ key: 'ef', value: '8', part: 0 }],
      }),
    ).toContain('fields буруу (нүдний нэр, утгын урт, хэсэг)');
    expect(
      guideContentErrors({ ...fill, parts: [{ points: 3 }, { points: 3 }] }),
    ).toContain('parts-ийн онооны нийлбэр points-тэй тэнцэхгүй');
  });

  it('хасах тэмдгийн нүдийг зөвшөөрнө (Нэгдсэн шалгалт 2 A II.4: «-2»)', () => {
    expect(
      guideContentErrors({ ...fill, fields: [{ key: 'fg', value: '-2', part: 1 }] }),
    ).toEqual([]);
    expect(
      guideContentErrors({ ...fill, fields: [{ key: 'f', value: 'x', part: 1 }] }),
    ).toContain('fields буруу (нүдний нэр, утгын урт, хэсэг)');
  });

  it('data:image/png биш зургийг татгалзана', () => {
    expect(
      guideContentErrors({ ...choice, image: 'https://example.com/a.png' }),
    ).toContain('image нь data:image/png биш');
  });

  describe('mistakes (түгээмэл алдаа)', () => {
    it('буруу сонголтын тайлбарыг зөвшөөрнө', () => {
      expect(
        guideContentErrors({ ...choice, mistakes: { B: '$D$-г буруу бодсон' } }),
      ).toEqual([]);
    });

    it('нөхөх бодлогод татгалзана', () => {
      expect(guideContentErrors({ ...fill, mistakes: { A: 'т' } })).toEqual([
        'mistakes зөвхөн сонгох бодлогод',
      ]);
    });

    it('сонголтод байхгүй үсэг, зөв хариу, хоосон утгыг илрүүлнэ', () => {
      const errs = guideContentErrors({
        ...choice,
        mistakes: { C: 'т', A: 'т', B: '  ' },
      });
      expect(errs).toContain('mistakes.C: сонголтод алга');
      expect(errs).toContain('mistakes.A: зөв хариунд тайлбар бичихгүй');
      expect(errs).toContain('mistakes.B: хоосон');
    });

    it('мөр биш утга, хаагдаагүй томьёог илрүүлнэ', () => {
      expect(
        guideContentErrors({
          ...choice,
          mistakes: { B: 5 } as unknown as Record<string, string>,
        }),
      ).toContain('mistakes.B: хоосон');
      expect(
        guideContentErrors({ ...choice, mistakes: { B: '$x' } }),
      ).toContain('mistakes.B: $ тэмдэг хаагдаагүй');
    });
  });
});
