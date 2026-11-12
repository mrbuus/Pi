import {
  areaScores,
  classifyBy,
  competitionRanks,
  gradeSheet,
  itemStats,
  normalizeLetter,
  orderAreas,
  publicName,
  statusOf,
  weakAreas,
  type PaperItem,
} from './paper-exam-logic';

const item = (number: number, over: Partial<PaperItem> = {}): PaperItem => ({
  number,
  answerKey: null,
  points: 1,
  area: null,
  voided: false,
  ...over,
});

describe('statusOf', () => {
  it('«+»/«-» түлхүүргүй ч дүгнэгдэнэ (эзний Excel: 1 = зөв)', () => {
    expect(statusOf('+', item(1))).toBe('CORRECT');
    expect(statusOf('-', item(1))).toBe('WRONG');
  });
  it('үсэг түлхүүртэй харьцуулагдана, түлхүүргүй бол тооцогдохгүй', () => {
    expect(statusOf('C', item(1, { answerKey: 'C' }))).toBe('CORRECT');
    expect(statusOf('B', item(1, { answerKey: 'C' }))).toBe('WRONG');
    expect(statusOf('B', item(1))).toBe('UNGRADED');
  });
  it('хоосон, давхар будсан нь ялгаатай төлөвтэй, хэзээ ч зөв биш', () => {
    expect(statusOf('', item(1, { answerKey: 'A' }))).toBe('BLANK');
    expect(statusOf(undefined, item(1, { answerKey: 'A' }))).toBe('BLANK');
    expect(statusOf('*', item(1, { answerKey: 'A' }))).toBe('MULTI');
  });
  it('хүчингүй бодлого хэзээ ч тооцогдохгүй', () => {
    expect(statusOf('+', item(1, { voided: true }))).toBe('UNGRADED');
    expect(statusOf('A', item(1, { answerKey: 'A', voided: true }))).toBe(
      'UNGRADED',
    );
  });
});

describe('gradeSheet', () => {
  it('оноо ба боломжит оноог жингээр бодно, тооцогдохгүй бодлогыг max-аас хасна', () => {
    const items = [
      item(1, { answerKey: 'A', points: 2 }),
      item(2, { answerKey: 'B' }),
      item(3), // түлхүүргүй, үсгээр ирсэн
      item(4, { answerKey: 'D', voided: true }),
    ];
    const g = gradeSheet(['A', 'C', 'E', 'D'], items);
    expect(g.statuses).toEqual(['CORRECT', 'WRONG', 'UNGRADED', 'UNGRADED']);
    expect(g.totalScore).toBe(2);
    expect(g.maxScore).toBe(3);
  });
  it('хариу дутуу бол үлдсэн нь хоосон', () => {
    const g = gradeSheet(
      ['A'],
      [item(1, { answerKey: 'A' }), item(2, { answerKey: 'A' })],
    );
    expect(g.statuses).toEqual(['CORRECT', 'BLANK']);
    expect(g).toMatchObject({ totalScore: 1, maxScore: 2 });
  });
});

describe('areaScores, weakAreas', () => {
  // Жишээ файлын хэлбэр: 4 агуулга
  const items = [
    item(1, { area: 'Алгебр' }),
    item(2, { area: 'Алгебр' }),
    item(3, { area: 'Магадлал статистик' }),
    item(4, { area: 'Геометр ба тригонометр' }),
    item(5), // агуулга оноогоогүй
  ];
  it('агуулга бүрийн хувь, БҮТ-ийн дарааллаар', () => {
    const s = areaScores(
      [
        ['CORRECT', 'WRONG', 'WRONG', 'CORRECT', 'CORRECT'],
        ['CORRECT', 'CORRECT', 'CORRECT', 'WRONG', 'WRONG'],
      ],
      items,
    );
    expect(s.map((a) => a.area)).toEqual([
      'Алгебр',
      'Геометр ба тригонометр',
      'Магадлал статистик',
    ]);
    expect(s.find((a) => a.area === 'Алгебр')).toMatchObject({
      earned: 3,
      possible: 4,
      pct: 75,
    });
    expect(s.find((a) => a.area === 'Магадлал статистик')?.pct).toBe(50);
  });
  it('сул агуулга = хамгийн бага хувь; тэнцвэл хоёуланг', () => {
    const s = areaScores(
      [['CORRECT', 'CORRECT', 'WRONG', 'WRONG', 'CORRECT']],
      items,
    );
    expect(weakAreas(s)).toEqual([
      'Геометр ба тригонометр',
      'Магадлал статистик',
    ]);
  });
  it('бүгд 100% эсвэл агуулгагүй бол хоосон', () => {
    expect(
      weakAreas(
        areaScores(
          [['CORRECT', 'CORRECT', 'CORRECT', 'CORRECT', 'WRONG']],
          items,
        ),
      ),
    ).toEqual([]);
    expect(weakAreas(areaScores([['WRONG']], [item(1)]))).toEqual([]);
  });
  it('тооцогдохгүй бодлого агуулгын хувьд орохгүй', () => {
    const s = areaScores(
      [['UNGRADED', 'CORRECT']],
      [item(1, { area: 'Алгебр' }), item(2, { area: 'Алгебр' })],
    );
    expect(s[0]).toMatchObject({ earned: 1, possible: 1, pct: 100 });
  });
  it('жагсаалтад байхгүй агуулга төгсгөлд', () => {
    expect(orderAreas(['Шинэ', 'Алгебр', 'Тоо тоолол'])).toEqual([
      'Тоо тоолол',
      'Алгебр',
      'Шинэ',
    ]);
  });
});

describe('сэдвээр ангилах', () => {
  const items = [
    item(1, { area: 'Алгебр', topic: 'Модультай тэнцэтгэл биш' }),
    item(2, { area: 'Алгебр', topic: 'Модультай тэгшитгэл' }),
    item(3, { area: 'Алгебр', topic: 'Модультай тэгшитгэл' }),
    item(4, { area: 'Алгебр' }),
  ];
  it('сэдэв оноосон бол сэдвээр, үгүй бол агуулгаар', () => {
    expect(classifyBy(items)).toBe('topic');
    expect(classifyBy([item(1, { area: 'Алгебр' })])).toBe('area');
    expect(classifyBy([item(1, { topic: 'X', voided: true })])).toBe('area');
  });
  it('сэдвийн хувь — шалгалтад анх гарсан дарааллаар, сэдэвгүй бодлого орохгүй', () => {
    const s = areaScores(
      [['WRONG', 'CORRECT', 'WRONG', 'CORRECT']],
      items,
      'topic',
    );
    expect(s.map((a) => [a.area, a.pct])).toEqual([
      ['Модультай тэнцэтгэл биш', 0],
      ['Модультай тэгшитгэл', 50],
    ]);
    expect(weakAreas(s)).toEqual(['Модультай тэнцэтгэл биш']);
  });
});

describe('itemStats', () => {
  it('бодлого бүрийн зөв хувь ба хамгийн олон сонгогдсон буруу үсэг', () => {
    const items = [item(1, { answerKey: 'A' }), item(2)];
    const stats = itemStats(
      [
        { statuses: ['CORRECT', 'CORRECT'], answers: ['A', '+'] },
        { statuses: ['WRONG', 'WRONG'], answers: ['C', '-'] },
        { statuses: ['WRONG', 'CORRECT'], answers: ['C', '+'] },
        { statuses: ['BLANK', 'UNGRADED'], answers: ['', ''] },
      ],
      items,
    );
    expect(stats[0]).toMatchObject({
      correct: 1,
      graded: 4,
      pct: 25,
      topWrong: { letter: 'C', count: 2 },
    });
    expect(stats[1]).toMatchObject({
      correct: 2,
      graded: 3,
      pct: 67,
      topWrong: null,
    });
  });
});

describe('competitionRanks', () => {
  it('ижил оноо ижил байр (1, 2, 2, 4)', () => {
    expect(competitionRanks([40, 35, 35, 10])).toEqual([1, 2, 2, 4]);
    expect(competitionRanks([10, 40])).toEqual([2, 1]);
    expect(competitionRanks([])).toEqual([]);
  });
});

describe('publicName, normalizeLetter', () => {
  it('нэр + овгийн эхний үсэг', () => {
    expect(publicName('Болор-Эрдэнэ', 'батболд')).toBe('Болор-Эрдэнэ Б.');
    expect(publicName('Сараа', '')).toBe('Сараа');
  });
  it('кирилл ижил дүрстэй үсгийг латин болгоно, бусдыг татгалзана', () => {
    expect(normalizeLetter('а')).toBe('A');
    expect(normalizeLetter('С')).toBe('C');
    expect(normalizeLetter('d')).toBe('D');
    expect(normalizeLetter('Г')).toBeNull();
    expect(normalizeLetter('AB')).toBeNull();
    expect(normalizeLetter('F')).toBeNull();
  });
});
