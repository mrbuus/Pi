import {
  boxValues,
  buildExamItems,
  effectiveGroups,
  ExamItemSource,
  gradeProblemItems,
  itemKey,
  manualStatuses,
  parseScoringGroups,
  slotLetters,
  totalsOf,
} from './exam-items';

// Эзний Excel-ийн «Сорил 19» 2-р хэсэгтэй ижил: 3-1 (4 нүд, 3 оноо), 3-2 (3 нүд, 4 оноо)
const FILL_STATEMENT =
  '**I.** $x=[a][b]$, $y=[c][d]$ (3 оноо)\n\n**II.** $z=[efg]$ (4 оноо)';
const GROUPS = [
  { label: '3-1', boxes: ['a', 'b', 'c', 'd'], points: 3 },
  { label: '3-2', boxes: ['e', 'f', 'g'], points: 4 },
];

function fillRow(
  over: Partial<ExamItemSource['problem']> = {},
  points = 7,
): ExamItemSource {
  return {
    problemId: 'fill',
    order: 39,
    points,
    problem: {
      format: 'FILL_NUMBER',
      statementText: FILL_STATEMENT,
      scoringGroups: GROUPS,
      ...over,
    },
  };
}
const choiceRow = (order: number, points = 1): ExamItemSource => ({
  problemId: `c${order}`,
  order,
  points,
  problem: { format: 'CHOICE', statementText: 'x', scoringGroups: null },
});

const fillProblem = {
  id: 'fill',
  format: 'FILL_NUMBER' as const,
  choices: null,
  // импортер нүднүүдийн цифрийг нэг стринг болгож хадгалдаг
  correctAnswer: '2332600',
  statementText: FILL_STATEMENT,
};

describe('slotLetters / boxValues', () => {
  it('[a][b] ба [efg]-ийг нүд бүрээр задлана', () => {
    expect(slotLetters(FILL_STATEMENT)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
    ]);
    expect(
      Object.fromEntries(boxValues('2332600', FILL_STATEMENT, true)!),
    ).toEqual({
      a: '2',
      b: '3',
      c: '3',
      d: '2',
      e: '6',
      f: '0',
      g: '0',
    });
  });
  it('объект хэлбэрийн түлхүүр ({ a, efg }) ч задарна', () => {
    const map = boxValues(
      { a: '2', b: '3', c: '3', d: '2', efg: '600' },
      FILL_STATEMENT,
      true,
    )!;
    expect(map.get('f')).toBe('0');
  });
  it('уртын зөрүүтэй түлхүүр — задлахгүй (null)', () => {
    expect(boxValues('23', FILL_STATEMENT, true)).toBeNull();
  });
});

describe('scoringGroups — бүтэц ба тестэд үйлчлэх эсэх', () => {
  it('шошго давтагдсан, нүд хоёр багцад — буруу', () => {
    expect(
      parseScoringGroups([
        ...GROUPS,
        { label: '3-1', boxes: ['z'], points: 0 },
      ]),
    ).toBeNull();
    expect(
      parseScoringGroups([
        { label: '1', boxes: ['a'], points: 1 },
        { label: '2', boxes: ['a'], points: 1 },
      ]),
    ).toBeNull();
  });
  it('нийлбэр тестийн оноотой тэнцэхгүй бол бодлого бүхэлдээ нэг зүйл', () => {
    expect(effectiveGroups(fillRow().problem, 7)).toHaveLength(2);
    expect(effectiveGroups(fillRow().problem, 5)).toBeNull();
  });
  it('0 оноотой багц тооцогдохгүй (эзний «3-3 = 0»)', () => {
    const groups = [...GROUPS, { label: '3-3', boxes: [], points: 0 }];
    // [a]… нүдтэй бодлогод нүдгүй багц байж болохгүй — бүхэл бодлого нэг зүйл
    expect(parseScoringGroups(groups)).not.toBeNull();
    expect(
      effectiveGroups({ ...fillRow().problem, scoringGroups: groups }, 7),
    ).toBeNull();
    const withZero = [
      { label: '3-1', boxes: ['a', 'b', 'c', 'd'], points: 3 },
      { label: '3-2', boxes: ['e', 'f'], points: 4 },
      { label: '3-3', boxes: ['g'], points: 0 },
    ];
    const eff = effectiveGroups(
      { ...fillRow().problem, scoringGroups: withZero },
      7,
    )!;
    expect(eff.map((g) => g.label)).toEqual(['3-1', '3-2']);
  });
});

describe('Нүдгүй (Word импорт) нөхөх бодлого — шошго, оноотой багц', () => {
  const plain = {
    format: 'FILL_NUMBER',
    statementText: 'Тэгшитгэлийг бод.',
    scoringGroups: [
      { label: '1-1', boxes: [], points: 3 },
      { label: '1-2', boxes: [], points: 4 },
    ],
  };
  it('гар/Excel шивэлтэд 1-1, 1-2 багана болно', () => {
    const items = buildExamItems([
      { problemId: 'w', order: 37, points: 7, problem: plain },
    ]);
    expect(items.map((i) => [i.key, i.label, i.points])).toEqual([
      ['g:w:1-1', '1-1', 3],
      ['g:w:1-2', '1-2', 4],
    ]);
  });
  it('онлайнаар бодлогын бүхэл дүн бүх багцад хэрэглэгдэнэ', () => {
    const items = buildExamItems([
      { problemId: 'w', order: 37, points: 7, problem: plain },
    ]);
    const problem = {
      id: 'w',
      format: 'FILL_NUMBER' as const,
      choices: null,
      correctAnswer: '12',
      statementText: plain.statementText,
    };
    expect([
      ...gradeProblemItems(problem, items, '12').statuses.values(),
    ]).toEqual(['CORRECT', 'CORRECT']);
    expect([
      ...gradeProblemItems(problem, items, '13').statuses.values(),
    ]).toEqual(['WRONG', 'WRONG']);
  });
});

describe('buildExamItems — хүснэгтийн баганууд', () => {
  it('1..36 сонгох, дараа нь 2-р хэсгийн алхмын багц', () => {
    const items = buildExamItems([fillRow(), choiceRow(2, 2), choiceRow(1)]);
    expect(items.map((i) => [i.label, i.part, i.points])).toEqual([
      ['1', 1, 1],
      ['2', 1, 2],
      ['3-1', 2, 3],
      ['3-2', 2, 4],
    ]);
    expect(items[2].key).toBe(itemKey('fill', '3-1'));
    expect(items[0].key).toBe('p:c1');
  });
  it('багцгүй нөхөх бодлого — бүхэлдээ нэг зүйл (бодлогын дугаараар)', () => {
    const items = buildExamItems([fillRow({ scoringGroups: null })]);
    expect(items).toEqual([
      expect.objectContaining({
        key: 'p:fill',
        label: '39',
        part: 2,
        points: 7,
        group: null,
      }),
    ]);
  });
  it('давхардсан шошгыг бодлогын дугаараар ялгана', () => {
    const items = buildExamItems([
      fillRow(),
      { ...fillRow(), problemId: 'fill2', order: 40 },
    ]);
    expect(items.map((i) => i.label)).toEqual([
      '39:3-1',
      '39:3-2',
      '40:3-1',
      '40:3-2',
    ]);
  });
});

describe('gradeProblemItems — алхмаар дүгнэх (онлайн)', () => {
  const items = buildExamItems([fillRow()]);
  it('багцын бүх нүд зөв → багцын оноо, нэг нь буруу → 0', () => {
    const graded = gradeProblemItems(fillProblem, items, '2332999');
    expect(Object.fromEntries(graded.statuses)).toEqual({
      'g:fill:3-1': 'CORRECT',
      'g:fill:3-2': 'WRONG',
    });
    expect(totalsOf(items, graded.statuses)).toMatchObject({
      total: 3,
      max: 7,
      part2: 3,
    });
    // Бодлого бүхэлдээ зөв биш (Attempt.autoCorrect)
    expect(graded.correct).toBe(false);
  });
  it('бүрэн зөв → 7, бодлого бүхэлдээ зөв', () => {
    const graded = gradeProblemItems(fillProblem, items, '2332600');
    expect(totalsOf(items, graded.statuses).total).toBe(7);
    expect(graded.correct).toBe(true);
  });
  it('эхний багцыг бөглөөд дууссан (богино стринг) — 2-р багц BLANK', () => {
    const graded = gradeProblemItems(fillProblem, items, '2332');
    expect(graded.statuses.get('g:fill:3-1')).toBe('CORRECT');
    expect(graded.statuses.get('g:fill:3-2')).toBe('BLANK');
  });
  it('хариулаагүй → бүх багц BLANK, 0 оноо', () => {
    const graded = gradeProblemItems(fillProblem, items, undefined);
    expect([...graded.statuses.values()]).toEqual(['BLANK', 'BLANK']);
    expect(graded.answered).toBe(false);
  });
  it('«0812» ба «812»-ыг тоогоор андуурахгүй (нүд тус бүр)', () => {
    const problem = {
      ...fillProblem,
      correctAnswer: '0812600',
      statementText: FILL_STATEMENT,
    };
    const graded = gradeProblemItems(problem, items, '812600');
    expect(graded.statuses.get('g:fill:3-1')).toBe('WRONG');
  });
  it('сонгох бодлого — нэг зүйл, хариулаагүй бол BLANK', () => {
    const choice = {
      id: 'c1',
      format: 'CHOICE' as const,
      choices: ['A', 'B', 'C', 'D', 'E'],
      correctAnswer: 'B',
      statementText: 'x',
    };
    const one = buildExamItems([choiceRow(1)]);
    expect(gradeProblemItems(choice, one, 'B').statuses.get('p:c1')).toBe(
      'CORRECT',
    );
    expect(gradeProblemItems(choice, one, 'C').statuses.get('p:c1')).toBe(
      'WRONG',
    );
    expect(gradeProblemItems(choice, one, null).statuses.get('p:c1')).toBe(
      'BLANK',
    );
  });
});

describe('Гар шивэлт — хоосон = зөв, 0 = буруу', () => {
  const items = buildExamItems([
    choiceRow(1),
    choiceRow(2, 2),
    choiceRow(3, 3),
    fillRow(),
  ]);
  it('зөвхөн буруу нүднүүдийн жинг хасна', () => {
    const statuses = manualStatuses(items, ['p:c2', 'g:fill:3-2']);
    expect(totalsOf(items, statuses)).toEqual({
      total: 1 + 3 + 3,
      max: 13,
      part1: 4,
      part1Max: 6,
      part2: 3,
      part2Max: 7,
    });
  });
  it('бүгд хоосон → бүтэн оноо, бүгд 0 → 0', () => {
    expect(totalsOf(items, manualStatuses(items, [])).total).toBe(13);
    expect(
      totalsOf(
        items,
        manualStatuses(
          items,
          items.map((i) => i.key),
        ),
      ).total,
    ).toBe(0);
  });
});

describe('Хоосон нүд — цифр шилжихгүй (2026-10-10 засвар)', () => {
  const items = buildExamItems([fillRow()]);
  it('дунд нүд хоосон («_») — зөвхөн тэр багц буруу, дараагийнх нь зөв', () => {
    // a,b,c,d = 2,3,_,2 (3-1 багц дутуу) · e,f,g = 6,0,0 (3-2 багц зөв)
    const graded = gradeProblemItems(fillProblem, items, '23_2600');
    expect(graded.statuses.get('g:fill:3-1')).toBe('WRONG');
    expect(graded.statuses.get('g:fill:3-2')).toBe('CORRECT');
    expect(totalsOf(items, graded.statuses).total).toBe(4);
  });
  it('«_» бүхий багц бүхэлдээ хоосон бол BLANK', () => {
    const graded = gradeProblemItems(fillProblem, items, '____600');
    expect(graded.statuses.get('g:fill:3-1')).toBe('BLANK');
    expect(graded.statuses.get('g:fill:3-2')).toBe('CORRECT');
  });
  it('\\lbrack a\\rbrack тэмдэглэгээ ч нүд болно', () => {
    expect(slotLetters('$\\lbrack a\\rbrack$ ба $[b]$ ба $\\lbrack\\lbrack c\\rbrack$')).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});
