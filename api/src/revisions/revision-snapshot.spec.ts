import {
  answerText,
  changedProblemGroups,
  diffProblem,
  diffTest,
  joinSummary,
  pairChoices,
  parseProblemSnapshot,
  parseTestSnapshot,
  planProblemRestore,
  planTestRestore,
  ProblemSnapshot,
  problemSnapshotOf,
  problemView,
  shortName,
  snapshotsEqual,
  summarizeProblemChange,
  summarizeTestChange,
  testPlanIsEmpty,
  TestSnapshot,
  testSnapshotOf,
} from './revision-snapshot';

function choice(label: string, text: string, isCorrect = false, order = label.charCodeAt(0) - 64) {
  return { label, text, isCorrect, mistakeType: isCorrect ? 'NONE' : 'OTHER', mistakeNote: null, order };
}

function problem(over: Partial<ProblemSnapshot> = {}): ProblemSnapshot {
  const base = problemSnapshotOf({
    statementText: '$x^2 = 4$ бол $x$-ийг ол',
    imageKey: null,
    format: 'CHOICE',
    points: 1,
    choices: null,
    correctAnswer: '2',
    scoringGroups: null,
    youtubeUrl: null,
    choiceOptions: [choice('A', '1'), choice('B', '2', true), choice('C', '3'), choice('D', '4')],
    tags: [{ tag: { id: 't1', type: 'SOLUTION_TYPE', name: 'Дискриминантаар бодох' } }],
    analysis: { solutionOutline: 'Язгуур гаргана', answerKeyStatus: 'VERIFIED' },
  });
  return { ...base, ...over };
}

function test(over: Partial<TestSnapshot> = {}): TestSnapshot {
  return {
    ...testSnapshotOf({
      title: 'Логарифм 1',
      type: 'DAILY',
      gradingMode: 'AUTO',
      timeLimitMin: 40,
      price: null,
      chapterId: 'ch1',
      pdfKey: null,
      groupKey: null,
      variantLabel: null,
      problems: [
        { problemId: 'p1', order: 1, points: 1 },
        { problemId: 'p2', order: 2, points: 2 },
      ],
      access: [{ classroomId: 'c1' }],
    }),
    ...over,
  };
}

describe('snapshot — тогтвортой хэлбэр ба харьцуулалт', () => {
  it('сонголт, ангиллыг эрэмбэлж, jsonb түлхүүрийн дарааллаас үл хамаарна', () => {
    const a = problemSnapshotOf({
      statementText: 'x',
      imageKey: null,
      format: 'FILL_NUMBER',
      points: 2,
      choices: null,
      correctAnswer: { b: '2', a: '1' },
      choiceOptions: [choice('B', 'y', false, 2), choice('A', 'x', true, 1)],
      tags: [
        { tag: { id: '2', type: 'SUBTOPIC', name: 'Тойрог' } },
        { tag: { id: '1', type: 'METHOD', name: 'Орлуулах' } },
      ],
    });
    const b = problemSnapshotOf({
      ...a,
      correctAnswer: { a: '1', b: '2' },
      choiceOptions: [...a.choiceOptions].reverse(),
      tags: [...a.tags].reverse().map((t) => ({ tag: t })),
    });
    expect(a.choiceOptions.map((c) => c.label)).toEqual(['A', 'B']);
    expect(a.tags.map((t) => t.type)).toEqual(['METHOD', 'SUBTOPIC']);
    expect(snapshotsEqual(a, b)).toBe(true);
  });

  it('jsonb-ээс уншсан snapshot дахин бүрэн сэргэнэ', () => {
    const p = problem({ scoringGroups: [{ label: '1-1', boxes: ['a'], points: 1 }] as never });
    expect(parseProblemSnapshot(JSON.parse(JSON.stringify(p)))).toEqual(p);
    const t = test();
    expect(parseTestSnapshot(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });
});

describe('Монгол товч тайлбар', () => {
  it('зөв сонголт солих → «C сонголтыг зөв болгосон»', () => {
    const before = problem();
    const after = problem({
      choiceOptions: [choice('A', '1'), choice('B', '2'), choice('C', '3', true), choice('D', '4')],
    });
    expect(summarizeProblemChange(before, after)).toBe('C сонголтыг зөв болгосон');
  });

  it('бодлогын текст + зураг + оноо', () => {
    const after = problem({ statementText: 'Шинэ $x$', imageKey: 'img.png', points: 3 });
    expect(summarizeProblemChange(problem(), after)).toBe(
      'Бодлогын текст засварласан, оноог 3 болгосон, зураг нэмсэн',
    );
  });

  it('«Агуулга засах» B-г хасаж дахин шошголсон ч «B сонголтыг хассан» гэнэ', () => {
    const before = problem();
    // Агуулга засах цонх: байрлалаар A, B, C гэж дахин шошголно (C → B, D → C)
    const after = problem({
      choiceOptions: [choice('A', '1'), choice('B', '3'), choice('C', '4')],
      correctAnswer: '4',
    });
    after.choiceOptions[2].isCorrect = true;
    after.choiceOptions[2].mistakeType = 'NONE';
    expect(summarizeProblemChange(before, after)).toBe('C сонголтыг зөв болгосон, B сонголтыг хассан');
    const pairs = pairChoices(before.choiceOptions, after.choiceOptions);
    expect(pairs.removed.map((c) => c.text)).toEqual(['2']);
  });

  it('ганц сонголтын текст, алдааны шалтгаан', () => {
    const after = problem();
    after.choiceOptions[0] = { ...after.choiceOptions[0], text: '-1' };
    after.choiceOptions[2] = { ...after.choiceOptions[2], mistakeType: 'SIGN_ERROR' };
    expect(summarizeProblemChange(problem(), after)).toBe(
      'A сонголтын текстийг засварласан, C сонголтын алдааны шалтгааныг өөрчилсөн',
    );
  });

  it('ангилал нэмэх/хасах, алхмын багц, YouTube, бодолт', () => {
    const before = problem();
    const after = problem({
      tags: [...before.tags, { id: 't2', type: 'SUBTOPIC', name: 'Квадрат тэгшитгэл' }] as never,
    });
    expect(summarizeProblemChange(before, after)).toBe('«Квадрат тэгшитгэл» ангилал нэмсэн');
    expect(summarizeProblemChange(after, before)).toBe('«Квадрат тэгшитгэл» ангиллыг хассан');
    expect(
      summarizeProblemChange(before, problem({ scoringGroups: [{ label: '1-1', boxes: [], points: 1 }] as never })),
    ).toBe('Алхмын багц тохируулсан');
    expect(summarizeProblemChange(before, problem({ youtubeUrl: 'https://www.youtube.com/watch?v=x' }))).toBe(
      'YouTube холбоос нэмсэн',
    );
    expect(
      summarizeProblemChange(before, problem({ analysis: { solutionOutline: 'Өөр', answerKeyStatus: 'VERIFIED' } })),
    ).toBe('Бодолтыг засварласан');
  });

  it('3-аас олон өөрчлөлтийг товчилно', () => {
    const after = problem({ statementText: 'y', points: 5, imageKey: 'a.png', youtubeUrl: 'u' });
    expect(summarizeProblemChange(problem(), after)).toBe(
      'Бодлогын текст засварласан, оноог 5 болгосон, бусад 2 өөрчлөлт',
    );
    expect(joinSummary([])).toBe('Өөрчилсөн');
  });

  it('тест: нэр, хугацаа, бодлого, анги (нэрээр, ID-гүй)', () => {
    const names = new Map([
      ['c1', '10А'],
      ['c2', '10Б'],
    ]);
    expect(summarizeTestChange(test(), test({ timeLimitMin: 60 }))).toBe('Хугацааг 60 минут болгосон');
    expect(summarizeTestChange(test(), test({ classroomIds: ['c1', 'c2'] }), names)).toBe('10Б ангид оноосон');
    expect(summarizeTestChange(test(), test({ classroomIds: [] }), names)).toBe('10А ангиас хассан');
    expect(
      summarizeTestChange(
        test(),
        test({
          title: 'Шинэ',
          problems: [
            { problemId: 'p2', order: 1, points: 2 },
            { problemId: 'p3', order: 2, points: 1 },
          ],
        }),
      ),
    ).toBe('Нэрийг өөрчилсөн, 1 бодлого нэмсэн, 1 бодлого хассан');
    expect(summarizeTestChange(null, test())).toBe('Тест үүсгэсэн');
  });

  it('нэр «Б. Баасанжав» хэлбэр', () => {
    expect(shortName({ firstName: 'Баасанжав', lastName: 'Батболд' })).toBe('Б. Баасанжав');
    expect(shortName({ firstName: 'Багш', lastName: null })).toBe('Багш');
    expect(shortName(null)).toBe('Тодорхойгүй хэрэглэгч');
  });
});

describe('Ялгаа — ID харуулахгүй', () => {
  it('бодлогын ялгаа: текст (LaTeX), сонголт, ангилал нэрээр', () => {
    const before = problem();
    const after = problem({
      statementText: '$x^3$',
      choiceOptions: [choice('A', '1'), choice('B', '2'), choice('C', '3', true), choice('D', '4')],
      tags: [] as never,
    });
    const diff = diffProblem(before, after);
    expect(diff.map((d) => d.field)).toEqual(['statementText', 'choiceOptions', 'tags']);
    const choices = diff.find((d) => d.kind === 'choices');
    expect(choices && choices.kind === 'choices' && choices.rows.filter((r) => r.status === 'changed').map((r) => r.label)).toEqual(['B', 'C']);
    expect(JSON.stringify(diff)).not.toContain('t1');
    expect(diffProblem(null, after)).toEqual([]);
  });

  it('тестийн ялгаа: ангийн нэр, бодлогын текстээр; үнэ зөвхөн админд', () => {
    const r = {
      classNames: new Map([['c2', '10Б']]),
      problemStatements: new Map([['p3', '$a+b$']]),
    };
    const diff = diffTest(
      test({ price: 1000 }),
      test({ price: 2000, classroomIds: ['c1', 'c2'], problems: [...test().problems, { problemId: 'p3', order: 3, points: 1 }] }),
      r,
    );
    expect(diff.map((d) => d.field)).toEqual(['problems', 'classroomIds']);
    const json = JSON.stringify(diff);
    expect(json).toContain('10Б');
    expect(json).toContain('$a+b$');
    expect(json).not.toMatch(/"p3"|"c2"/);
    expect(diffTest(test({ price: 1 }), test({ price: 2 }), { showPrice: true }).map((d) => d.field)).toEqual(['price']);
  });

  it('харагдац: ангилал нэрээр, хариу уншигдахуйц', () => {
    expect(problemView(problem()).tags).toEqual(['Дискриминантаар бодох']);
    expect(answerText({ b: 2, a: '1' })).toBe('a = 1, b = 2');
    expect(answerText({ manualReview: true })).toBe('Гараар шалгана');
  });
});

describe('Сэргээх төлөвлөгөө — түгжээ ба эрх', () => {
  it('сурагч өгсөн бол алхмын багцыг сэргээхгүй, хариу өөрчлөгдвөл confirm', () => {
    const current = problem({ scoringGroups: [{ label: '1-1', boxes: ['a'], points: 1 }] as never });
    const target = problem({
      scoringGroups: null,
      choiceOptions: [choice('A', '1', true), choice('B', '2'), choice('C', '3'), choice('D', '4')],
    });
    const plan = planProblemRestore(current, target, { taken: true, contentEditor: true });
    expect(plan.groups).toEqual(['choices']);
    expect(plan.skipped).toEqual(['Алхмын багц']);
    expect(plan.answerChanges).toBe(true);
    expect(planProblemRestore(current, target, { taken: false, contentEditor: true }).answerChanges).toBe(false);
  });

  it('багш (TEACHER) зөвхөн сонголт/ангилал сэргээнэ', () => {
    const plan = planProblemRestore(problem(), problem({ statementText: 'хуучин' }), {
      taken: false,
      contentEditor: false,
    });
    expect(plan.forbidden).toEqual(['content']);
    expect(
      planProblemRestore(problem(), problem({ tags: [] as never }), { taken: false, contentEditor: false }).forbidden,
    ).toEqual([]);
    expect(changedProblemGroups(problem(), problem())).toEqual([]);
  });

  it('өгсөн тест: зөвхөн нэр, хугацаа', () => {
    const plan = planTestRestore(
      test(),
      test({ title: 'Хуучин нэр', timeLimitMin: 30, problems: [], classroomIds: [], gradingMode: 'MANUAL' }),
      { taken: true, isAdmin: true, manageableClassIds: null },
    );
    expect(plan.data).toEqual({ title: 'Хуучин нэр', timeLimitMin: 30 });
    expect(plan.problems).toBeNull();
    expect(plan.addClassIds).toEqual([]);
    expect(plan.skipped).toEqual(['Дүгнэх горим', 'Бодлого', 'Анги']);
  });

  it('өгөөгүй тест: бүгд; үнэ зөвхөн админ; багш зөвхөн өөрийн анги', () => {
    const target = test({ price: 5000, classroomIds: ['c2', 'c3'] });
    const teacher = planTestRestore(test(), target, {
      taken: false,
      isAdmin: false,
      manageableClassIds: new Set(['c1', 'c2']),
    });
    expect(teacher.data.price).toBeUndefined();
    expect(teacher.addClassIds).toEqual(['c2']);
    expect(teacher.removeClassIds).toEqual(['c1']);
    expect(teacher.skipped).toEqual(['Үнэ', 'Бусад багшийн анги']);
    const admin = planTestRestore(test(), target, { taken: false, isAdmin: true, manageableClassIds: null });
    expect(admin.data.price).toBe(5000);
    expect(admin.addClassIds).toEqual(['c2', 'c3']);
    expect(testPlanIsEmpty(planTestRestore(test(), test(), { taken: false, isAdmin: true, manageableClassIds: null }))).toBe(true);
  });
});
