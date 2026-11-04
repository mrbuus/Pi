import { chapterBaseTitle, matchChapter, normalizeTopicTitle } from './chapter-match';

const ch = (id: string, title: string, order = 0, grade: number | null = null) => ({ id, title, order, grade });

describe('normalizeTopicTitle', () => {
  it('жижиг үсэг, хашилт, дугаарлалт, илүү зай, төгсгөлийн цэг', () => {
    expect(normalizeTopicTitle('  1.2  «Логарифм   тэгшитгэл».')).toBe('логарифм тэгшитгэл');
    expect(normalizeTopicTitle('3) Уламжлал')).toBe('уламжлал');
  });
  it('« · Тест N» дагаварыг суурь гарчгаас хасна', () => {
    expect(chapterBaseTitle('Рациональ тэгшитгэл · Тест 8')).toBe('рациональ тэгшитгэл');
    expect(chapterBaseTitle('1000 бодлого · Явцын 4-A')).toBe('1000 бодлого · явцын 4-a');
  });
});

describe('matchChapter', () => {
  const chapters = [
    ch('u', 'Уламжлалын хэрэглээ', 5),
    ch('r2', 'Рациональ тэгшитгэл · Тест 2', 12),
    ch('r1', 'Рациональ тэгшитгэл · Тест 1', 11),
    ch('l11', 'Логарифм тэгшитгэл', 3, 11),
    ch('l12', 'Логарифм тэгшитгэл', 3, 12),
  ];

  it('яг гарчиг (хэвшүүлсэн) нэг бол түүнийг', () => {
    expect(matchChapter('уламжлалын  хэрэглээ.', chapters)).toEqual({
      chapterId: 'u',
      chapterIds: ['u'],
      title: 'Уламжлалын хэрэглээ',
    });
  });

  it('« · Тест N» бүлгүүд — суурь гарчгаар, дарааллаар', () => {
    expect(matchChapter('Рациональ тэгшитгэл', chapters)).toMatchObject({ chapterId: 'r1', chapterIds: ['r1', 'r2'] });
  });

  it('ижил гарчигтай хоёр бүлэг: анги тодорхойгүй бол null, анги өгвөл тэр анги', () => {
    expect(matchChapter('Логарифм тэгшитгэл', chapters)).toBeNull();
    expect(matchChapter('Логарифм тэгшитгэл', chapters, 12)).toMatchObject({ chapterId: 'l12' });
  });

  it('ойролцоо таамаглахгүй: үг дутуу, зөрүүтэй бичсэн, хэт богино бол null', () => {
    expect(matchChapter('Уламжлал', chapters)).toBeNull();
    expect(matchChapter('Рационал тэгшитгэл', chapters)).toBeNull();
    expect(matchChapter('ab', chapters)).toBeNull();
  });
});
