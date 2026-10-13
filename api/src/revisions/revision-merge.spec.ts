import {
  mergeProblemSnapshots,
  mergeSet,
  mergeTestSnapshots,
} from './revision-merge';
import { ProblemSnapshot, TestSnapshot } from './revision-snapshot';

const problem = (over: Partial<ProblemSnapshot> = {}): ProblemSnapshot => ({
  statementText: 'Бодлого',
  imageKey: null,
  format: 'CHOICE',
  points: 1,
  choices: null,
  correctAnswer: null,
  choiceOptions: ['A', 'B', 'C'].map((label, i) => ({
    label,
    text: String(i + 1),
    isCorrect: label === 'A',
    mistakeType: label === 'A' ? 'NONE' : 'OTHER',
    mistakeNote: null,
    order: i + 1,
  })),
  scoringGroups: null,
  youtubeUrl: null,
  tags: [],
  analysis: { solutionOutline: 'бодолт', answerKeyStatus: 'VERIFIED' },
  ...over,
});
const withChoice = (
  s: ProblemSnapshot,
  label: string,
  patch: Record<string, unknown>,
) => ({
  ...s,
  choiceOptions: s.choiceOptions.map((c) =>
    c.label === label ? { ...c, ...patch } : c,
  ),
});
const correct = (s: ProblemSnapshot, label: string) => ({
  ...s,
  choiceOptions: s.choiceOptions.map((c) => ({
    ...c,
    isCorrect: c.label === label,
  })),
});
const test = (over: Partial<TestSnapshot> = {}): TestSnapshot => ({
  title: 'Сорил',
  type: 'DAILY',
  gradingMode: 'AUTO',
  timeLimitMin: 40,
  price: null,
  chapterId: null,
  pdfKey: null,
  groupKey: null,
  variantLabel: null,
  problems: ['p1', 'p2', 'p3'].map((problemId, i) => ({
    problemId,
    order: i + 1,
    points: 1,
  })),
  classroomIds: ['c1'],
  ...over,
});
const seq = (s: TestSnapshot) => s.problems.map((p) => p.problemId);

describe('mergeSet', () => {
  it('нэмэлт нэгтгэгдэнэ, аль нэг тал хассан бол хасагдана', () => {
    expect(mergeSet(['a', 'b'], ['a', 'b', 'x'], ['b', 'y'])).toEqual([
      'b',
      'x',
      'y',
    ]);
  });
});

describe('mergeProblemSnapshots', () => {
  it('нэг тал л өөрчилсөн бол түүнийх (хуучин утгаа дахин илгээсэн нь бусдынхыг дарахгүй)', () => {
    const base = problem();
    const theirs = problem({ statementText: 'Засварласан' });
    const mine = correct(base, 'B');
    const { merged, conflicts } = mergeProblemSnapshots(base, mine, theirs);
    expect(conflicts).toEqual([]);
    expect(merged.statementText).toBe('Засварласан');
    expect(
      merged.choiceOptions.filter((c) => c.isCorrect).map((c) => c.label),
    ).toEqual(['B']);
  });

  it('зөв хариу нэг талбар: B ба C — зөрчил, давхар зөв үүсэхгүй', () => {
    const base = problem();
    const out = mergeProblemSnapshots(
      base,
      correct(base, 'C'),
      correct(base, 'B'),
    );
    expect(out.conflicts).toEqual(['Зөв хариу']);
  });

  it('ижил өөрчлөлт зөрчил биш', () => {
    const base = problem();
    expect(
      mergeProblemSnapshots(base, correct(base, 'B'), correct(base, 'B'))
        .conflicts,
    ).toEqual([]);
  });

  it('нэг сонголтын өөр шинжүүд нэгтгэгдэнэ; ижил шинж — тухайн сонголтын нэртэй зөрчил', () => {
    const base = problem();
    const ok = mergeProblemSnapshots(
      base,
      withChoice(base, 'B', { text: '22' }),
      withChoice(base, 'B', { mistakeNote: 'тэмдэг' }),
    );
    expect(ok.conflicts).toEqual([]);
    expect(ok.merged.choiceOptions[1]).toMatchObject({
      label: 'B',
      text: '22',
      mistakeNote: 'тэмдэг',
    });
    const bad = mergeProblemSnapshots(
      base,
      withChoice(base, 'B', { text: '22' }),
      withChoice(base, 'B', { text: '23' }),
    );
    expect(bad.conflicts).toEqual(['B сонголтын текст']);
  });

  it('нэг тал хассан, нөгөө нь хөндөөгүй → хасагдана; хоёулаа хөндвөл «Сонголтууд» зөрчил', () => {
    const base = problem();
    const removed = {
      ...base,
      choiceOptions: base.choiceOptions.filter((c) => c.label !== 'C'),
    };
    expect(
      mergeProblemSnapshots(base, removed, problem({ statementText: 'x' }))
        .merged.choiceOptions,
    ).toHaveLength(2);
    expect(
      mergeProblemSnapshots(
        base,
        removed,
        withChoice(base, 'C', { text: '33' }),
      ).conflicts,
    ).toEqual(['Сонголтууд']);
  });

  it('дахин үсэглэсэн (a,b,c → A,B,C) жагсаалтыг үсгээр холихгүй — давхардахгүй', () => {
    const lower = problem({
      choiceOptions: problem().choiceOptions.map((c) => ({
        ...c,
        label: c.label.toLowerCase(),
      })),
    });
    const relabeled = problem(); // агуулгын засварлагч A, B, C болгосон
    const mine = withChoice(lower, 'b', { mistakeNote: 'тайлбар' });
    const strict = mergeProblemSnapshots(lower, mine, relabeled);
    expect(strict.conflicts).toEqual(['Сонголтууд']);
    const out = mergeProblemSnapshots(lower, mine, relabeled, {
      preferMine: true,
    });
    expect(out.merged.choiceOptions).toEqual(mine.choiceOptions);
  });

  it('зөв болгосон сонголтыг нөгөө тал хассан бол зөрчил; «миний хувилбар» — миний жагсаалт', () => {
    const base = problem();
    const removedB = {
      ...base,
      choiceOptions: base.choiceOptions.filter((c) => c.label !== 'B'),
    };
    expect(
      mergeProblemSnapshots(base, correct(base, 'B'), removedB).conflicts,
    ).toEqual(['Сонголтууд']);
    // Миний хассан сонголтыг нөгөө нь зөв болгосон — preferMine бол миний жагсаалт бүтнээр
    const out = mergeProblemSnapshots(base, removedB, correct(base, 'B'), {
      preferMine: true,
    });
    expect(out.conflicts.length).toBeGreaterThan(0);
    expect(out.merged.choiceOptions).toEqual(removedB.choiceOptions);
  });

  it('«миний хувилбар»: нэг шинжийн зөрчилд зөвхөн тэр шинж минийх, бусдын бусад сонголтын засвар хэвээр', () => {
    // Амьд шалгалтаас: хоёулаа C-ийн тайлбарыг өөрөөр, нөгөө нь B-д тайлбар нэмсэн
    const base = withChoice(problem(), 'C', { mistakeNote: '1-ийг хассан' });
    const theirs = withChoice(
      withChoice(base, 'C', { mistakeNote: 'Хасах тэмдгийг анзаараагүй' }),
      'B',
      { mistakeNote: 'B тайлбар' },
    );
    const mine = withChoice(base, 'C', {
      mistakeNote: '1-ийг хассан (тодотгол)',
    });
    const strict = mergeProblemSnapshots(base, mine, theirs);
    expect(strict.conflicts).toEqual(['C сонголтын алдааны тайлбар']);
    const out = mergeProblemSnapshots(base, mine, theirs, { preferMine: true });
    expect(
      out.merged.choiceOptions.map((c) => [
        c.label,
        c.isCorrect,
        c.mistakeNote,
      ]),
    ).toEqual([
      ['A', true, null],
      ['B', false, 'B тайлбар'],
      ['C', false, '1-ийг хассан (тодотгол)'],
    ]);
  });

  it('хэлбэр солигдож, нөгөө тал хариуг засвал зөрчил', () => {
    const base = problem();
    expect(
      mergeProblemSnapshots(
        base,
        problem({ format: 'FILL_NUMBER' }),
        correct(base, 'B'),
      ).conflicts,
    ).toContain('Бодлогын хэлбэр');
  });

  it('бодолт ба хариуны төлөв тус тусдаа', () => {
    const base = problem();
    const out = mergeProblemSnapshots(
      base,
      problem({
        analysis: {
          solutionOutline: 'шинэ бодолт',
          answerKeyStatus: 'VERIFIED',
        },
      }),
      problem({
        analysis: {
          solutionOutline: 'бодолт',
          answerKeyStatus: 'NEEDS_REVIEW',
        },
      }),
    );
    expect(out).toEqual({
      merged: expect.objectContaining({
        analysis: {
          solutionOutline: 'шинэ бодолт',
          answerKeyStatus: 'NEEDS_REVIEW',
        },
      }),
      conflicts: [],
    });
  });
});

describe('mergeTestSnapshots', () => {
  it('өөр талбар (нэр ба хугацаа) нэгтгэгдэнэ, ижил талбар — зөрчил', () => {
    const base = test();
    const ok = mergeTestSnapshots(
      base,
      test({ timeLimitMin: 60 }),
      test({ title: 'Шинэ нэр' }),
    );
    expect(ok.conflicts).toEqual([]);
    expect(ok.merged).toMatchObject({ title: 'Шинэ нэр', timeLimitMin: 60 });
    expect(
      mergeTestSnapshots(base, test({ title: 'A' }), test({ title: 'B' }))
        .conflicts,
    ).toEqual(['Нэр']);
  });

  it('бодлого: нэг нь нэмж, нөгөө нь оноо өөрчилнө → хоёулаа; дугаар хэвээр', () => {
    const base = test();
    const mine = test({
      problems: [...base.problems, { problemId: 'p4', order: 4, points: 2 }],
    });
    const theirs = test({
      problems: base.problems.map((p) =>
        p.problemId === 'p2' ? { ...p, points: 3 } : p,
      ),
    });
    const { merged, conflicts } = mergeTestSnapshots(base, mine, theirs);
    expect(conflicts).toEqual([]);
    expect(merged.problems).toEqual([
      { problemId: 'p1', order: 1, points: 1 },
      { problemId: 'p2', order: 2, points: 3 },
      { problemId: 'p3', order: 3, points: 1 },
      { problemId: 'p4', order: 4, points: 2 },
    ]);
  });

  it('дараалал: нэг тал зөөсөн бол түүнийх; нөгөөгийн нэмсэн нь хөршийнхөө ард', () => {
    const base = test();
    const moved = test({
      problems: ['p3', 'p1', 'p2'].map((problemId, i) => ({
        problemId,
        order: i + 1,
        points: 1,
      })),
    });
    const added = test({
      problems: ['p1', 'p5', 'p2', 'p3'].map((problemId, i) => ({
        problemId,
        order: i + 1,
        points: 1,
      })),
    });
    const { merged, conflicts } = mergeTestSnapshots(base, added, moved);
    expect(conflicts).toEqual([]);
    expect(seq(merged)).toEqual(['p3', 'p1', 'p5', 'p2']);
    expect(merged.problems.map((p) => p.order)).toEqual([1, 2, 3, 4]);
  });

  it('хоёулаа өөрөөр зөөвөл зөрчил', () => {
    const base = test();
    const order = (ids: string[]) =>
      test({
        problems: ids.map((problemId, i) => ({
          problemId,
          order: i + 1,
          points: 1,
        })),
      });
    expect(
      mergeTestSnapshots(
        base,
        order(['p2', 'p1', 'p3']),
        order(['p3', 'p2', 'p1']),
      ).conflicts,
    ).toEqual(['Бодлогын дараалал']);
  });

  it('«миний хувилбар»: нэг нь хасаж, би оноог нь өөрчилсөн бол миний жагсаалт', () => {
    const base = test();
    const removed = test({
      problems: base.problems.filter((p) => p.problemId !== 'p2'),
    });
    const mine = test({
      problems: base.problems.map((p) =>
        p.problemId === 'p2' ? { ...p, points: 3 } : p,
      ),
    });
    expect(mergeTestSnapshots(base, mine, removed).conflicts).toEqual([
      'Бодлогын жагсаалт',
    ]);
    expect(
      mergeTestSnapshots(base, mine, removed, { preferMine: true }).merged
        .problems,
    ).toEqual(mine.problems);
  });

  it('анги олонлогоор', () => {
    const base = test();
    const out = mergeTestSnapshots(
      base,
      test({ classroomIds: ['c1', 'c2'] }),
      test({ classroomIds: [] }),
    );
    expect(out.merged.classroomIds).toEqual(['c2']);
  });
});

describe('сонголтын зураг (imageKey) нэгтгэл', () => {
  it('нэг багш B-д зураг нэмж, нөгөө нь C-ийн текст засвал хоёулаа үлдэнэ', () => {
    const base = problem();
    const mine = withChoice(base, 'B', { imageKey: 'fig-b.png' });
    const theirs = withChoice(base, 'C', { text: '33' });
    const { merged, conflicts } = mergeProblemSnapshots(base, mine, theirs);
    expect(conflicts).toEqual([]);
    const byLabel = new Map(merged.choiceOptions.map((c) => [c.label, c]));
    expect(byLabel.get('B')?.imageKey).toBe('fig-b.png');
    expect(byLabel.get('C')?.text).toBe('33');
  });

  it('хоёул ижил сонголтын зургийг өөрөөр солих нь зөрчил', () => {
    const base = problem();
    const mine = withChoice(base, 'A', { imageKey: 'mine.png' });
    const theirs = withChoice(base, 'A', { imageKey: 'theirs.png' });
    const { conflicts } = mergeProblemSnapshots(base, mine, theirs);
    expect(conflicts).toContain('A сонголтын зураг');
  });
});
