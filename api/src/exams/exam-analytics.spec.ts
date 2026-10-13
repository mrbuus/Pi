import { ExamItem, ItemStatus } from '../tests/exam-items';
import {
  AnalyticsStudent,
  buildExamAnalytics,
  chapterTopicName,
  choiceDistribution,
  choiceKeyOf,
  chosenLetter,
  discriminationIndex,
  discriminationLabel,
  histogram,
  median,
  problemTopics,
  reliability,
  reliabilityLevel,
  statusesFromSession,
  studentBreakdown,
  studentReviewPolicy,
  topicMastery,
  visibleTopics,
  weakestTopics,
} from './exam-analytics';

const item = (
  n: number,
  points = 1,
  extra: Partial<ExamItem> = {},
): ExamItem => ({
  key: `p:q${n}`,
  label: String(n),
  part: 1,
  problemId: `q${n}`,
  order: n,
  points,
  group: null,
  ...extra,
});

const marks = (row: string, items: ExamItem[]): Map<string, ItemStatus> =>
  new Map(
    items.map((it, i) => [
      it.key,
      row[i] === '1' ? 'CORRECT' : row[i] === '-' ? 'BLANK' : 'WRONG',
    ]),
  );

// 10 сурагч × 4 зүйл — Гуттманы төгс загвар (гараар бодсон утгатай):
// p = .8, .6, .4, .2 → Σpq = .8; нийт оноо 4,4,3,3,2,2,1,1,0,0 → σ² = 2
// KR-20 = 4/3 · (1 − .8/2) = 0.8
const GUTTMAN = [
  '1111',
  '1111',
  '1110',
  '1110',
  '1100',
  '1100',
  '1000',
  '1000',
  '0000',
  '0000',
];
const FOUR = [1, 2, 3, 4].map((n) => item(n));
const guttmanStudents = GUTTMAN.map((row, i) => ({
  studentId: `s${String(i + 1).padStart(2, '0')}`,
  percent: (row.split('').filter((c) => c === '1').length / 4) * 100,
  statuses: marks(row, FOUR),
}));

describe('Энгийн статистик', () => {
  it('медиан — сондгой, тэгш, хоосон', () => {
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 3])).toBe(2);
    expect(median([40, 10, 30, 20])).toBe(25);
  });

  it('5 баганатай тархалт — хил дээд баганад, 100% сүүлд, хэтэрсэн утга хавчина', () => {
    expect(histogram([0, 19.99, 20, 39, 40, 59.9, 60, 79, 80, 100])).toEqual([
      2, 2, 2, 2, 2,
    ]);
    expect(histogram([-5, 105, NaN])).toEqual([1, 0, 0, 0, 1]);
    expect(histogram([])).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('Найдвартай байдал (KR-20)', () => {
  it('гараар бодсон жишээ = 0.8', () => {
    expect(reliability(FOUR, guttmanStudents)).toBeCloseTo(0.8, 10);
  });

  it('онооны жинтэй үед Кронбахын α (бүх зүйл 2 оноо → ижил утга)', () => {
    const doubled = FOUR.map((i) => ({ ...i, points: 2 }));
    expect(reliability(doubled, guttmanStudents)).toBeCloseTo(0.8, 10);
  });

  it('10-аас цөөн сурагч, тэг дисперс → null', () => {
    expect(reliability(FOUR, guttmanStudents.slice(0, 9))).toBeNull();
    const same = guttmanStudents.map((s) => ({
      ...s,
      statuses: marks('1111', FOUR),
    }));
    expect(reliability(FOUR, same)).toBeNull();
  });

  it('бүх сурагчид төлөвгүй зүйлийг тооцохгүй', () => {
    const extra = item(5);
    const withGap = guttmanStudents.map((s, i) => ({
      ...s,
      statuses:
        i === 0
          ? s.statuses
          : new Map<string, ItemStatus>([...s.statuses, [extra.key, 'WRONG']]),
    }));
    expect(reliability([...FOUR, extra], withGap)).toBeCloseTo(0.8, 10);
  });

  it('ногоон ≥0.7, шар 0.5–0.7, улаан <0.5', () => {
    expect(reliabilityLevel(0.82)).toBe('GOOD');
    expect(reliabilityLevel(0.7)).toBe('GOOD');
    expect(reliabilityLevel(0.6)).toBe('FAIR');
    expect(reliabilityLevel(0.49)).toBe('LOW');
    expect(reliabilityLevel(-0.2)).toBe('LOW');
  });
});

describe('Ялгах чадвар (дээд 27% − доод 27%)', () => {
  it('дээд 3, доод 3 сурагч (тэнцвэл ID-аар) — гараар бодсон утга', () => {
    const d = discriminationIndex(FOUR, guttmanStudents);
    // дээд: s01,s02,s03; доод: s08,s09,s10
    expect(d.get('p:q1')).toBeCloseTo(1 - 1 / 3, 10);
    expect(d.get('p:q2')).toBeCloseTo(1, 10);
    expect(d.get('p:q3')).toBeCloseTo(1, 10);
    expect(d.get('p:q4')).toBeCloseTo(2 / 3, 10);
  });

  it('сул сурагч зөв, сайн сурагч буруу → Асуудалтай', () => {
    const odd = item(5);
    const students = guttmanStudents.map((s, i) => ({
      ...s,
      statuses: new Map([
        ...s.statuses,
        [odd.key, (i >= 7 ? 'CORRECT' : 'WRONG') as ItemStatus],
      ]),
    }));
    const d = discriminationIndex([odd], students).get(odd.key)!;
    expect(d).toBeCloseTo(-1, 10);
    expect(discriminationLabel(d, false)).toBe('PROBLEM');
  });

  it('шошго: ≥0.3 сайн, (0, 0.3) сул, ≤0 асуудалтай, бүгд зөв → шошгогүй', () => {
    expect(discriminationLabel(0.45, false)).toBe('GOOD');
    expect(discriminationLabel(0.3, false)).toBe('GOOD');
    expect(discriminationLabel(0.1, false)).toBe('WEAK');
    expect(discriminationLabel(0, false)).toBe('PROBLEM');
    expect(discriminationLabel(0, true)).toBeNull();
    expect(discriminationLabel(null, false)).toBeNull();
  });

  it('10-аас цөөн сурагч → бодохгүй', () => {
    const d = discriminationIndex(FOUR, guttmanStudents.slice(0, 5));
    expect([...d.values()].every((v) => v === null)).toBe(true);
  });
});

describe('Сэдвийн эзэмшил (Σавсан / Σболомжит)', () => {
  const items = [item(1, 1), item(2, 2), item(3, 3), item(4, 4)];
  const topicOf = (pid: string) =>
    pid === 'q1' || pid === 'q2'
      ? [{ key: 'ch:A', name: 'Алгебр' }]
      : [{ key: 'ch:G', name: 'Геометр' }];

  it('оноогоор жинлэнэ, сул сэдэв эхэнд', () => {
    const students = [
      { statuses: marks('1001', items) }, // A: 1/3, G: 4/7
      { statuses: marks('0111', items) }, // A: 2/3, G: 7/7
    ];
    const t = topicMastery(items, students, topicOf);
    expect(t.map((x) => [x.name, x.earned, x.max, x.percent, x.items])).toEqual(
      [
        ['Алгебр', 3, 6, 50, 2],
        ['Геометр', 11, 14, 79, 2],
      ],
    );
  });

  it('төлөвгүй зүйл хуваарьт орохгүй', () => {
    const partial = new Map<string, ItemStatus>([['p:q1', 'CORRECT']]);
    const t = topicMastery(items, [{ statuses: partial }], topicOf);
    expect(t).toEqual([
      expect.objectContaining({
        name: 'Алгебр',
        earned: 1,
        max: 1,
        percent: 100,
      }),
    ]);
  });

  it('сул сэдэв: 100%-иас доош; хаалт нээгдэхээс өмнө < 3 зүйлтэй сэдэв нуугдана', () => {
    const t = topicMastery(
      items,
      [{ statuses: marks('1100', items) }],
      topicOf,
    );
    expect(weakestTopics(t, 3).map((x) => x.name)).toEqual(['Геометр']);
    expect(visibleTopics(t, false)).toEqual([]);
    expect(visibleTopics(t, true)).toHaveLength(2);
  });

  it('сэдвийн эх: SUBTOPIC шошго → БҮТ муж → бүлгийн нэр («· Тест N»-гүй)', () => {
    expect(chapterTopicName('Интеграл · Тест 12')).toBe('Интеграл');
    expect(chapterTopicName('Интеграл · Тест 1-A')).toBe('Интеграл');
    expect(chapterTopicName('1000 бодлого · Сорил 10-A')).toBe(
      '1000 бодлого · Сорил 10-A',
    );
    expect(
      problemTopics({
        tags: [{ id: 't1', name: 'Виет' }],
        chapter: { title: 'Х · Тест 1', topic: { id: 'a', name: 'Алгебр' } },
      }),
    ).toEqual([{ key: 'tag:t1', name: 'Виет' }]);
    expect(
      problemTopics({
        tags: [],
        chapter: { title: 'Х · Тест 1', topic: { id: 'a', name: 'Алгебр' } },
      }),
    ).toEqual([{ key: 'topic:a', name: 'Алгебр' }]);
    expect(
      problemTopics({
        tags: [],
        chapter: { title: 'Логарифм тэгшитгэл · Тест 4', topic: null },
      }),
    ).toEqual([{ key: 'ch:Логарифм тэгшитгэл', name: 'Логарифм тэгшитгэл' }]);
  });
});

describe('Сонголтын тархалт', () => {
  const text = {
    id: 'q1',
    format: 'CHOICE' as const,
    choices: null,
    correctAnswer: null,
    choiceOptions: [
      { order: 0, text: '1', isCorrect: false },
      { order: 1, text: '2', isCorrect: true },
      { order: 2, text: '3', isCorrect: false, mistakeNote: 'Тэмдэг алдсан' },
    ],
  };

  it('TEXT горим: display индекс → холилтын дараалал → канон үсэг', () => {
    expect(chosenLetter(text, 0, [2, 0, 1])).toBe('C');
    expect(chosenLetter(text, 2, [2, 0, 1])).toBe('B');
    expect(chosenLetter(text, 1)).toBe('B');
    expect(chosenLetter(text, 9)).toBe('');
    expect(chosenLetter(text, undefined)).toBe('');
  });

  it('LETTER горим (placeholder) — үсэг хэвээр', () => {
    const letter = {
      id: 'q2',
      format: 'CHOICE' as const,
      choices: ['A', 'B', 'C', 'D', 'E'],
      correctAnswer: 'D',
    };
    expect(chosenLetter(letter, 'b')).toBe('B');
    expect(chosenLetter(letter, 'Z')).toBe('');
    expect(choiceKeyOf(letter)).toEqual({
      letters: ['A', 'B', 'C', 'D', 'E'],
      correct: 'D',
      notes: {},
    });
  });

  it('хамгийн их сонгогдсон буруу хариу + багшийн тайлбар', () => {
    const key = choiceKeyOf(text)!;
    expect(key.correct).toBe('B');
    const d = choiceDistribution(key, ['C', 'C', 'B', 'A', '', 'C']);
    expect(d.counts).toEqual({ A: 1, B: 1, C: 3 });
    expect(d.blank).toBe(1);
    expect(d.total).toBe(6);
    expect(d.mostWrong).toEqual({
      letter: 'C',
      count: 3,
      note: 'Тэмдэг алдсан',
    });
  });

  it('зөв хариу тодорхойгүй бол «ихэнх нь …» гэхгүй', () => {
    const d = choiceDistribution(
      { letters: ['A', 'B'], correct: null, notes: {} },
      ['A'],
    );
    expect(d.mostWrong).toBeNull();
  });
});

describe('Нэгтгэсэн анализ', () => {
  const items = [item(1), item(2), item(3, 2)];
  const problems = new Map(
    items.map((i) => [
      i.problemId,
      {
        problemId: i.problemId,
        choice:
          i.problemId === 'q1'
            ? { letters: ['A', 'B', 'C'], correct: 'A', notes: {} }
            : null,
        topics: [{ key: 'ch:T', name: 'Сэдэв' }],
      },
    ]),
  );
  const st = (
    id: string,
    classroomId: string,
    row: string | null,
    extra: Partial<AnalyticsStudent> = {},
  ): AnalyticsStudent => {
    const statuses = row ? marks(row, items) : null;
    const total = row
      ? items.reduce((s, it, i) => s + (row[i] === '1' ? it.points : 0), 0)
      : 0;
    return {
      studentId: id,
      classroomId,
      absent: false,
      result: row ? { total, max: 4 } : null,
      statuses,
      choices: null,
      ...extra,
    };
  };

  it('ирээгүй сурагч дундаж, тархалт, өгсөн тоонд орохгүй', () => {
    const a = buildExamAnalytics({
      items,
      problems,
      classes: [
        { id: 'c1', name: '12-1' },
        { id: 'c2', name: '12-2' },
      ],
      withReliability: true,
      students: [
        st('a', 'c1', '111'), // 100%
        st('b', 'c1', '100'), // 25%
        st('c', 'c2', '010'), // 25%
        st('d', 'c2', null, { absent: true }),
        st('e', 'c2', null), // дүн хараахан ороогүй
        // Ирээгүй гэж тэмдэглэсэн ч хуучин дүн үлдсэн бол ч тооцохгүй
        st('f', 'c2', '000', { absent: true }),
      ],
    });
    expect(a.summary).toEqual({
      students: 6,
      absent: 2,
      taken: 3,
      pending: 1,
      avg: 50,
      median: 25,
      max: 100,
      min: 25,
    });
    expect(a.histogram).toEqual([0, 2, 0, 0, 1]);
    expect(a.classes).toEqual([
      { id: 'c1', name: '12-1', students: 2, taken: 2, avg: 63 },
      { id: 'c2', name: '12-2', students: 4, taken: 1, avg: 25 },
    ]);
    // 10-аас цөөн сурагч — найдвартай байдал, ялгах чадвар бодохгүй
    expect(a.reliability).toBeNull();
    expect(a.items.every((i) => i.discrimination === null)).toBe(true);
    expect(a.items.map((i) => [i.key, i.percent])).toEqual([
      ['p:q1', 67],
      ['p:q2', 67],
      ['p:q3', 33],
    ]);
    expect(a.attention[0]).toBe('p:q3');
    expect(a.topics).toEqual([
      expect.objectContaining({
        name: 'Сэдэв',
        earned: 6,
        max: 12,
        percent: 50,
      }),
    ]);
  });

  it('нийт оноо л байгаа (Excel «нийт») сурагч зүйлийн статистикт орохгүй', () => {
    const a = buildExamAnalytics({
      items,
      problems,
      classes: [{ id: 'c1', name: '12-1' }],
      withReliability: true,
      students: [
        st('a', 'c1', '111'),
        { ...st('b', 'c1', null), result: { total: 1, max: 4 } },
      ],
    });
    expect(a.summary.taken).toBe(2);
    expect(a.markedStudents).toBe(1);
    expect(a.items[0].marked).toBe(1);
  });

  it('A–E тархалт зөвхөн онлайн хариутай сурагчаар, 2-р хэсгийн багцад байхгүй', () => {
    const a = buildExamAnalytics({
      items,
      problems,
      classes: [{ id: 'c1', name: '12-1' }],
      withReliability: false,
      students: [
        st('a', 'c1', '111', { choices: new Map([['q1', 'A']]) }),
        st('b', 'c1', '011', { choices: new Map([['q1', 'C']]) }),
        st('c', 'c1', '011'), // гар шивэлт — сонголт мэдэгдэхгүй
      ],
    });
    expect(a.onlineStudents).toBe(2);
    expect(a.items[0].choices).toEqual(
      expect.objectContaining({
        counts: { A: 1, B: 0, C: 1 },
        total: 2,
        mostWrong: { letter: 'C', count: 1, note: null },
      }),
    );
    expect(a.items[1].choices).toBeNull();
  });

  it('найдвартай байдал зөвхөн withReliability (Багш+/Админ) үед', () => {
    const students = GUTTMAN.map((row, i) => ({
      studentId: `s${String(i + 1).padStart(2, '0')}`,
      classroomId: 'c1',
      absent: false,
      result: {
        total: row.split('').filter((c) => c === '1').length,
        max: 4,
      },
      statuses: marks(row, FOUR),
      choices: null,
    }));
    const base = {
      items: FOUR,
      problems: new Map(),
      classes: [{ id: 'c1', name: '12-1' }],
      students,
    };
    expect(
      buildExamAnalytics({ ...base, withReliability: true }).reliability,
    ).toEqual({
      value: 0.8,
      level: 'GOOD',
    });
    expect(
      buildExamAnalytics({ ...base, withReliability: false }).reliability,
    ).toBeNull();
    const full = buildExamAnalytics({ ...base, withReliability: true });
    expect(full.items.map((i) => i.discrimination?.label)).toEqual([
      'GOOD',
      'GOOD',
      'GOOD',
      'GOOD',
    ]);
  });
});

describe('Сурагчийн задаргаа', () => {
  it('хэсэг тус бүр, буруу/хоосон зүйлс', () => {
    const items = [
      item(1, 1),
      item(2, 1),
      item(37, 2, {
        key: 'g:q37:1-1',
        label: '1-1',
        part: 2,
        problemId: 'q37',
        group: { label: '1-1', boxes: ['a'], points: 2 },
      }),
      item(37, 3, {
        key: 'g:q37:1-2',
        label: '1-2',
        part: 2,
        problemId: 'q37',
        group: { label: '1-2', boxes: ['b'], points: 3 },
      }),
    ];
    const statuses = new Map<string, ItemStatus>([
      ['p:q1', 'CORRECT'],
      ['p:q2', 'BLANK'],
      ['g:q37:1-1', 'CORRECT'],
      ['g:q37:1-2', 'WRONG'],
    ]);
    const b = studentBreakdown(items, statuses, () => []);
    expect([b.part1, b.part1Max, b.part2, b.part2Max]).toEqual([1, 2, 2, 5]);
    expect(b.wrong.map((w) => [w.label, w.status])).toEqual([
      ['2', 'BLANK'],
      ['1-2', 'WRONG'],
    ]);
  });

  it('TestItemMark-аас өмнөх онлайн дүн: сессийн хариугаар дүгнэнэ, түлхүүргүйг алгасна', () => {
    const items = [item(1), item(2), item(3)];
    const problems = new Map([
      [
        'q1',
        {
          id: 'q1',
          format: 'CHOICE' as const,
          choices: null,
          correctAnswer: null,
          statementText: null,
          choiceOptions: [
            { order: 0, text: 'x', isCorrect: true },
            { order: 1, text: 'y', isCorrect: false },
          ],
        },
      ],
      [
        'q2',
        {
          id: 'q2',
          format: 'CHOICE' as const,
          choices: ['A', 'B', 'C'],
          correctAnswer: 'B',
          statementText: null,
        },
      ],
      [
        'q3',
        {
          id: 'q3',
          format: 'CHOICE' as const,
          choices: ['A', 'B'],
          correctAnswer: null,
          statementText: null,
        },
      ],
    ]);
    const s = statusesFromSession(
      items,
      problems,
      { q1: 1, q2: 'B' },
      { q1: [1, 0] },
      (p) => p.correctAnswer !== null || !!p.choiceOptions,
    );
    expect(Object.fromEntries(s)).toEqual({
      'p:q1': 'CORRECT',
      'p:q2': 'CORRECT',
    });
  });
});

describe('Сурагчийн дүнгийн дэлгэцийн хаалт', () => {
  it('1000 бодлого: зөв/буруу, бодолт, бичлэг зөвхөн FULL үед', () => {
    for (const level of ['NONE', 'PROBLEMS'] as const) {
      expect(studentReviewPolicy('THOUSAND', level)).toEqual({
        open: false,
        problems: false,
        correctAnswer: false,
        solutions: 'NONE',
        youtube: false,
      });
    }
    expect(studentReviewPolicy('THOUSAND', 'FULL')).toEqual({
      open: true,
      problems: true,
      correctAnswer: true,
      solutions: 'ALL',
      youtube: true,
    });
  });

  it('бусад шалгалт: хаалтгүй, зөв хариу биш, зөвхөн баталгаажсан бодолт', () => {
    expect(studentReviewPolicy('CHAPTER_EXAM', 'NONE')).toEqual({
      open: true,
      problems: true,
      correctAnswer: false,
      solutions: 'VERIFIED',
      youtube: true,
    });
  });
});
