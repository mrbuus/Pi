import {
  DEFAULT_CRITERIA,
  computeRisk,
  criteriaToStore,
  normalizeCriteria,
  type QuizRow,
} from './board-logic';

/**
 * «Асуудалтай» — шалгалтаар даалгавар шалгасан оноо (эзэн 2026-11-08 19:08): цонх доторх хамгийн
 * сүүлийн шалгалтын хувь < minQuiz (анхдагч 50) бол «Шалгалт 40%» шалтгаантай.
 */
const q = (studentId: string, date: string, score: number, problemCount = 10): QuizRow => ({
  studentId,
  date,
  score,
  problemCount,
});
const quizFlags = (rows: QuizRow[], c = DEFAULT_CRITERIA) =>
  computeRisk(['s1'], [], [], c, rows).s1.filter((f) => f.kind === 'quiz');

describe('computeRisk — шалгалтын оноо', () => {
  it('анхдагч босго 50', () => {
    expect(DEFAULT_CRITERIA.minQuiz).toBe(50);
  });

  it.each([
    // [оноо, бодлого, асуудалтай, шалтгаан]
    [4, 10, true, 'Шалгалт 40%'],
    [4.99, 10, true, 'Шалгалт 49%'],
    [5, 10, false, null],
    [49.99, 100, true, 'Шалгалт 49%'],
    [50, 100, false, null],
    [4.5, 9, false, null], // яг 50%
    [4.49, 9, true, 'Шалгалт 49%'],
    [0, 7, true, 'Шалгалт 0%'],
  ])('%p/%p → асуудалтай=%p', (score, n, flagged, label) => {
    const f = quizFlags([q('s1', '2026-11-06', score, n)]);
    expect(f.length > 0).toBe(flagged);
    if (label) expect(f[0].label).toBe(label);
  });

  it('ХАМГИЙН СҮҮЛИЙН шалгалтыг харна (өмнөх муу, сүүлийнх сайн бол асуудалгүй)', () => {
    expect(quizFlags([q('s1', '2026-11-02', 2), q('s1', '2026-11-06', 9)])).toEqual([]);
    expect(quizFlags([q('s1', '2026-11-06', 9), q('s1', '2026-11-02', 2)])).toEqual([]);
    expect(quizFlags([q('s1', '2026-11-02', 9), q('s1', '2026-11-06', 2)])).toHaveLength(1);
  });

  it('ганц шалгалт ч хангалттай (MIN_SAMPLE хамаарахгүй), бусад сурагчид нөлөөлөхгүй', () => {
    const out = computeRisk(['s1', 's2'], [], [], DEFAULT_CRITERIA, [q('s2', '2026-11-06', 1)]);
    expect(out.s1).toEqual([]);
    expect(out.s2.map((f) => f.kind)).toEqual(['quiz']);
  });

  it('босгыг өөрчилнө: 60 → 5,5/10 асуудалтай; 0 → унтарсан', () => {
    expect(quizFlags([q('s1', 'd', 5.5)], { ...DEFAULT_CRITERIA, minQuiz: 60 })).toHaveLength(1);
    expect(quizFlags([q('s1', 'd', 6)], { ...DEFAULT_CRITERIA, minQuiz: 60 })).toEqual([]);
    expect(quizFlags([q('s1', 'd', 0)], { ...DEFAULT_CRITERIA, minQuiz: 0 })).toEqual([]);
  });

  it('шалгалтгүй бол хуучнаараа (4 дэх аргумент заавал биш)', () => {
    expect(computeRisk(['s1'], [], [], DEFAULT_CRITERIA).s1).toEqual([]);
  });
});

describe('шалгуурын minQuiz хадгалах', () => {
  it('хуучин хадгалсан JSON (minQuiz-гүй) → 50', () => {
    expect(normalizeCriteria({ ...DEFAULT_CRITERIA, minQuiz: undefined, maxLates: 2 }).minQuiz).toBe(50);
  });
  it('5-ын алхамтай 0..100', () => {
    expect(criteriaToStore({ ...DEFAULT_CRITERIA, minQuiz: 60 })).toEqual({ ok: true, value: { ...DEFAULT_CRITERIA, minQuiz: 60 } });
    expect(criteriaToStore({ ...DEFAULT_CRITERIA, minQuiz: 0 }).ok).toBe(true);
    expect(criteriaToStore({ ...DEFAULT_CRITERIA, minQuiz: 52 }).ok).toBe(false);
    expect(criteriaToStore({ ...DEFAULT_CRITERIA, minQuiz: 105 }).ok).toBe(false);
  });
  it('minQuiz ирүүлээгүй хуучин клиент → анхдагч (анхдагчтай тэнцүү бол null)', () => {
    const { minQuiz: _omit, ...old } = DEFAULT_CRITERIA;
    void _omit;
    expect(criteriaToStore({ ...old })).toEqual({ ok: true, value: null });
  });
});
