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

  it('data:image/png биш зургийг татгалзана', () => {
    expect(
      guideContentErrors({ ...choice, image: 'https://example.com/a.png' }),
    ).toContain('image нь data:image/png биш');
  });
});
