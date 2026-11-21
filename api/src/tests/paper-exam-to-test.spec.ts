import { readFileSync } from 'fs';
import { join } from 'path';
import { buildExamItems, effectiveGroups, gradeProblemItems, slotLetters } from './exam-items';
import { fillSlotKeys, gradeAnswer, hasKnownAnswer } from './grading';
import {
  GuideDoc,
  normalizeSlots,
  planPaperExam,
  PlannedProblem,
  slotKeysOf,
  wrapMath,
} from './paper-exam-to-test';

const DATA = join(__dirname, '../../prisma/data/paper-exam-guides');
const read = <T>(name: string): T => JSON.parse(readFileSync(join(DATA, name), 'utf8')) as T;
const doc = read<GuideDoc>('negdsen-shalgalt-1.json');

/** Төлөвлөгөөний бодлогыг хөдөлгүүрийн оролтын хэлбэрт (exam-items, grading) */
function engineRow(p: PlannedProblem) {
  return {
    problemId: p.token,
    order: p.order,
    points: p.points,
    problem: {
      id: p.token,
      format: p.format,
      statementText: p.statementText,
      scoringGroups: p.scoringGroups,
      choices: null,
      correctAnswer: p.correctAnswer,
      choiceOptions: p.choices.map((c) => ({ order: c.order, text: c.text, isCorrect: c.isCorrect })),
    },
  };
}

describe('planPaperExam — Нэгдсэн шалгалт 1 (бодит JSON)', () => {
  const plan = planPaperExam(doc, {
    mistakes: read('negdsen-shalgalt-1-mistakes.draft.json'),
    topics: read('negdsen-shalgalt-1-topics.json'),
  });

  it('алдаагүй, A/B хоёр тест, нэг groupKey, 100 минут', () => {
    expect(plan.errors).toEqual([]);
    expect(plan.tests.map((t) => t.variantLabel)).toEqual(['A', 'B']);
    expect(new Set(plan.tests.map((t) => t.groupKey))).toEqual(new Set(['Нэгдсэн шалгалт 1']));
    expect(plan.tests.every((t) => t.timeLimitMin === 100)).toBe(true);
  });

  it.each(['A', 'B'])('%s: 36 сонгох + 4 нөхөх, оноо 72 + 28 = 100 = цаасных', (v) => {
    const t = plan.tests.find((x) => x.variant === v)!;
    const choice = t.problems.filter((p) => p.format === 'CHOICE');
    const fill = t.problems.filter((p) => p.format === 'FILL_NUMBER');
    expect(choice).toHaveLength(36);
    expect(fill).toHaveLength(4);
    expect(choice.reduce((s, p) => s + p.points, 0)).toBe(72);
    expect(fill.reduce((s, p) => s + p.points, 0)).toBe(28);
    expect(t.totalPoints).toBe(100);
    expect(t.paperPoints).toBe(100);
    expect(t.problems.map((p) => p.order)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  });

  it.each(['A', 'B'])('%s: сонголт бүр 5, нэг нь зөв, `$…$`-тэй, түлхүүр JSON-той ижил', (v) => {
    const t = plan.tests.find((x) => x.variant === v)!;
    const src = doc.variants[v].filter((e) => e.content.kind === 'choice').sort((a, b) => a.order - b.order);
    t.problems
      .filter((p) => p.format === 'CHOICE')
      .forEach((p, i) => {
        expect(p.choices.map((c) => c.label)).toEqual(['A', 'B', 'C', 'D', 'E']);
        expect(p.choices.filter((c) => c.isCorrect).map((c) => c.label)).toEqual([src[i].content.answer]);
        expect(p.choices.every((c) => c.text.startsWith('$') && c.text.endsWith('$'))).toBe(true);
        expect(hasKnownAnswer(engineRow(p).problem as never)).toBe(true);
      });
  });

  it('буруу сонголтын тайлбар mistakeNote-д, зөв сонголтод хэзээ ч үгүй', () => {
    const notes = plan.tests.flatMap((t) => t.problems.flatMap((p) => p.choices));
    expect(notes.filter((c) => c.mistakeNote).length).toBe(112);
    expect(notes.some((c) => c.isCorrect && c.mistakeNote)).toBe(false);
  });

  it('нөхөх бодлого: нүд бүрийн үсэг өгүүлбэрт, багцын нийлбэр = 7, хөдөлгүүр багцыг хүлээн авна', () => {
    for (const t of plan.tests) {
      for (const p of t.problems.filter((x) => x.format === 'FILL_NUMBER')) {
        const letters = slotLetters(p.statementText);
        expect(p.scoringGroups!.flatMap((g) => g.boxes).sort()).toEqual([...letters].sort());
        expect(p.scoringGroups!.reduce((s, g) => s + g.points, 0)).toBe(7);
        expect(effectiveGroups(engineRow(p).problem, p.points)).not.toBeNull();
      }
    }
  });

  it('`[1d]` → `1[d]` (II.3), бусад өгүүлбэр хэвээр', () => {
    const a3 = plan.tests[0].problems.find((p) => p.label === 'II.3')!;
    expect(a3.normalized).toEqual(['[1d]']);
    expect(a3.statementText).toContain('\\overline{1[d]}');
    expect(fillSlotKeys(a3.statementText)).toEqual(['a', 'b', 'c', 'd', 'ef', 'gh']);
    const b1 = plan.tests[1].problems.find((p) => p.label === 'II.1')!;
    expect(b1.correctAnswer).toEqual({ a: '2', b: '1', c: '2', d: '2', ef: '18', g: '3', h: '1' });
    expect(b1.scoringGroups).toEqual([
      { label: 'II.1-1', boxes: ['a', 'b', 'c', 'd'], points: 3 },
      { label: 'II.1-2', boxes: ['e', 'f', 'g'], points: 2 },
      { label: 'II.1-3', boxes: ['h'], points: 2 },
    ]);
  });

  it('II.2-ийн зураг (хувилбар бүрд), түлхүүр тогтмол', () => {
    for (const t of plan.tests) {
      const withImage = t.problems.filter((p) => p.image);
      expect(withImage.map((p) => p.label)).toEqual(['II.2']);
      expect(withImage[0].image!.mime).toBe('image/png');
      expect(withImage[0].image!.key).toMatch(/^нэгдсэн-шалгалт-1-[ab]-ii-2-\d+\.png$/);
    }
  });

  it('сэдэв сэдвийн файлаас (цаасан шалгалттай ижил нэр)', () => {
    const a = plan.tests[0];
    expect(a.problems[0].topics).toEqual(['Тоо тоолол']);
    expect(a.problems[3].topics).toEqual(['Рационал тэгшитгэл']);
    expect(a.problems.every((p) => p.topics.length > 0)).toBe(true);
  });

  it('бүх зөв хариугаар бүтэн оноо, II хэсэгт хэсэгчилсэн оноо (хөдөлгүүрээр)', () => {
    const t = plan.tests[0];
    const rows = t.problems.map(engineRow);
    const items = buildExamItems(rows);
    const score = (answer: (p: PlannedProblem) => unknown) => {
      let total = 0;
      for (const p of t.problems) {
        const row = engineRow(p);
        const own = items.filter((i) => i.problemId === p.token);
        const g = gradeProblemItems(row.problem as never, own, answer(p));
        for (const i of own) if (g.statuses.get(i.key) === 'CORRECT') total += i.points;
      }
      return total;
    };
    // Холиогүй тул сонгох хариу = эх индекс; нөхөх = нүдний цифрүүд дарааллаар
    const correctFill = (p: PlannedProblem) =>
      fillSlotKeys(p.statementText)
        .map((k) => (p.correctAnswer as Record<string, string>)[k])
        .join('');
    const perfect = (p: PlannedProblem) =>
      p.format === 'CHOICE' ? p.choices.findIndex((c) => c.isCorrect) : correctFill(p);
    expect(score(perfect)).toBe(100);
    // II.1-ийн I хэсгийг (a) буруу — 3 оноо хасагдана, бусад багц хэвээр
    const wrongA = (p: PlannedProblem) =>
      p.label === 'II.1' ? '9' + correctFill(p).slice(1) : perfect(p);
    expect(score(wrongA)).toBe(97);
    // II хэсгийг огт бөглөөгүй → 72
    expect(score((p) => (p.format === 'CHOICE' ? perfect(p) : ''))).toBe(72);
    // Бүтэн бодлогын gradeAnswer ч зөв (Attempt.autoCorrect)
    const ii4 = t.problems.find((p) => p.label === 'II.4')!;
    expect(gradeAnswer(engineRow(ii4).problem as never, correctFill(ii4)).correct).toBe(true);
  });
});

describe('planPaperExam — алдааг барина (юу ч бичихгүй)', () => {
  const clone = (): GuideDoc => JSON.parse(JSON.stringify(doc)) as GuideDoc;

  it('зөв хариу A–E биш', () => {
    const d = clone();
    d.variants.A[0].content.answer = 'F';
    expect(planPaperExam(d).errors.join('\n')).toMatch(/A\/1: зөв хариу «F» A–E биш/);
  });

  it('хэсгийн оноо цаасныхтай зөрвөл', () => {
    const d = clone();
    const ii1 = d.variants.B.find((e) => e.label === 'II.1')!;
    ii1.content.parts![0].points = 4;
    const errors = planPaperExam(d).errors.join('\n');
    expect(errors).toMatch(/B\/II\.1: хэсгийн онооны нийлбэр 8, бодлогын оноо 7/);
  });

  it('өгүүлбэрт байхгүй нүд, цифрийн тоо зөрөх', () => {
    const d = clone();
    const ii1 = d.variants.A.find((e) => e.label === 'II.1')!;
    ii1.content.fields!.push({ key: 'z', value: '1', part: 0 });
    ii1.content.fields![0].value = '22';
    const errors = planPaperExam(d).errors.join('\n');
    expect(errors).toMatch(/\[z\] нүд өгүүлбэрт алга/);
    expect(errors).toMatch(/\[a\] утга «22»/);
  });

  it('зөв хариунд тайлбар, guide-д байхгүй label', () => {
    const errors = planPaperExam(doc, {
      mistakes: { variants: { A: { '1': { D: 'зөв' }, '99': { A: 'x' } } } },
    }).errors.join('\n');
    expect(errors).toMatch(/A\/1: D нь зөв хариу/);
    expect(errors).toMatch(/A\/99: тайлбарын файлд байгаа ч/);
  });

  it('хувилбаруудын бүтэц зөрвөл', () => {
    const d = clone();
    d.variants.B[0].content.points = 2;
    expect(planPaperExam(d).errors.join('\n')).toMatch(/бүтэц/);
  });
});

describe('туслах функц', () => {
  it('wrapMath', () => {
    expect(wrapMath('\\dfrac12')).toBe('$\\dfrac12$');
    expect(wrapMath('$x$ ба $y$')).toBe('$x$ ба $y$');
  });
  it('normalizeSlots, slotKeysOf', () => {
    expect(normalizeSlots('\\overline{[1d]} ба [e2]').text).toBe('\\overline{1[d]} ба [e]2');
    expect(slotKeysOf('k\\in[[a];[b]] [g][\\,\\cup\\,][g]')).toEqual(['a', 'b', 'g']);
  });
});
