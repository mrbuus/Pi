import { problemTopic, TAG_RULES, tagProblem, type TagFormula } from './tagger';

// These realistic synthetic tasks compete against all fixture candidates.
const cases: [string, string, string][] = [
  ['LOGEXP', 'log-product', String.raw`$\log_2(ab)$-г нийлбэр болгон задал.`],
  [
    'LOGEXP',
    'log-quotient',
    String.raw`$\log_3\frac{x}{y}$-г ялгавраар илэрхийл.`,
  ],
  ['LOGEXP', 'log-power', String.raw`$\log_2 x^5$-ийг хялбарчил.`],
  ['LOGEQ', 'log-equation', String.raw`$\log_2(x-1)=3$ тэгшитгэлийг бод.`],
  ['LOGINEQ', 'log-inequality', String.raw`$\log_2(x-1)>3$-г бод.`],
  ['EXPEQ', 'exponential-equation', '$2^{x+1}=16$ тэгшитгэлийг бод.'],
  ['EXPINEQ', 'exponential-inequality', '$3^{x-1}<9$-г бод.'],
  ['IRREQ', 'radical-equation', String.raw`$\sqrt{x+5}=x-1$-ийн шийдийг ол.`],
  [
    'IRREQ',
    'radical-domain',
    String.raw`$\sqrt{2x-6}$ тодорхойлогдох мужийг ол.`,
  ],
  ['ABSEQ', 'absolute-equation', '$|x-3|=7$-г бод.'],
  ['ABSINEQ', 'absolute-inequality', '$|2x+1|<5$-г бод.'],
  ['RATEQ', 'quadratic-root-formula', '$x^2-5x+6=0$-г бод.'],
  ['RATEQ', 'vieta', '$x^2-7x+12=0$-ийн язгууруудын үржвэрийг ол.'],
  ['RATEQ', 'discriminant', '$x^2+kx+4=0$ давхар язгууртай байх $k$-г ол.'],
  ['RATEQ', 'linear-equation', 'Шугаман тэгшитгэл $3x+7=19$-г бод.'],
  ['RATEQ', 'rational-domain', String.raw`$\frac{1}{x-2}=3$-г бод.`],
  ['RATINEQ', 'interval-sign', 'Тэмдгийн аргаар $(x-1)(x+3)>0$-г бод.'],
  [
    'SYSTEM',
    'system-linear',
    String.raw`$\begin{cases}x+y=5\\x-y=1\end{cases}$ системийг бод.`,
  ],
  ['ALG', 'square-sum', '$(x+3)^2$-ыг задла.'],
  ['ALG', 'square-difference', '$(a-b)^2$-ыг задла.'],
  ['ALG', 'difference-squares', '$a^2-b^2$-ыг үржигдэхүүн болго.'],
  ['ALG', 'cube-sum', '$(a+b)^3$-ыг задла.'],
  [
    'TOO',
    'percent-of-number',
    'Үнэ $20$ хувиар буурсан бол $150$-ийн шинэ үнийг ол.',
  ],
  ['TOO', 'gcd', '$18$ ба $24$-ийн ХИЕХ-ийг ол.'],
  ['TOO', 'lcm', '$12$ ба $15$-ын ХБЕХ-ийг ол.'],
  [
    'TRIG',
    'trig-double-sin',
    String.raw`$\sin 2x$-ийг $\sin x,\cos x$-ээр илэрхийл.`,
  ],
  [
    'TRIG',
    'trig-double-cos',
    String.raw`$\cos 2x$-ийг зөвхөн $\cos x$-ээр илэрхийл.`,
  ],
  ['TRIG', 'trig-pythagorean', String.raw`$\sin^2 x+\cos^2 x$ хэд вэ?`],
  ['TRIG', 'trig-sin-add', String.raw`$\sin(x+y)$-г задла.`],
  ['TRIG', 'trig-cos-add', String.raw`$\cos(x+y)$-г задла.`],
  ['TRIGEQ', 'sine-equation', String.raw`$\sin x=1/2$-ийн бүх шийдийг ол.`],
  ['TRIGEQ', 'cosine-equation', String.raw`$\cos x=0$-ийн бүх шийдийг ол.`],
  ['TRIGEQ', 'tangent-equation', String.raw`$\tan x=1$-ийн бүх шийдийг ол.`],
  ['TRIG', 'radians', '$60$ градусыг радианаар илэрхийл.'],
  [
    'SEQ',
    'arithmetic-term',
    'Арифметик прогрессийн $a_1=2,d=3$ бол $a_8$-г ол.',
  ],
  [
    'SEQ',
    'arithmetic-sum',
    'Арифметик прогрессийн эхний $12$ гишүүний нийлбэрийг ол.',
  ],
  ['SEQ', 'geometric-term', 'Геометр прогрессийн $b_1=3,q=2$ бол $b_5$-г ол.'],
  [
    'SEQ',
    'geometric-sum',
    'Геометр прогрессийн эхний таван гишүүний нийлбэрийг ол.',
  ],
  [
    'SEQ',
    'geometric-infinite',
    'Хязгааргүй нийлбэр $1+1/2+1/4$-г үргэлжлүүлэн ол.',
  ],
  ['COMB', 'factorial', '$7!/5!$ хэд вэ?'],
  ['COMB', 'combination', '$C_8^3$ хэсэглэлийн тоог ол.'],
  ['COMB', 'arrangement', '$A_5^2$ байрлалын тоог ол.'],
  [
    'COMB',
    'permutation',
    '$5$ өөр номыг нэг эгнээнд хэдэн аргаар байрлуулах вэ?',
  ],
  ['COMB', 'binomial', 'Бином $(a+b)^n$-ын коэффициентийн нийлбэрийг ол.'],
  [
    'PROB',
    'probability-classical',
    'Шударга шоо хаяхад тэгш тоо буух магадлал хэд вэ?',
  ],
  ['PROB', 'conditional-probability', '$P(A|B)$ нөхцөлт магадлалыг ол.'],
  [
    'PROB',
    'independence',
    'Үл хамаарах $A,B$ үзэгдэл зэрэг тохиолдох магадлалыг ол.',
  ],
  [
    'PROB',
    'complement',
    'Шоо гурван удаа хаяхад дор хаяж нэг зургаа буух магадлалыг ол.',
  ],
  [
    'PROB',
    'bayes',
    'Байесын томьёогоор эерэг сорилын дараах урвуу магадлалыг ол.',
  ],
  ['STAT', 'mean', '$2,4,9$ өгөгдлийн дундажийг ол.'],
  ['STAT', 'variance', '$1,3$ өгөгдлийн дисперсийг ол.'],
  ['STAT', 'median', '$3,1,7$ өгөгдлийн медианыг ол.'],
  ['LIMIT', 'limit', String.raw`$\lim_{x\to0}\frac{\sin x}{x}$-г ол.`],
  ['DERIV', 'derivative-power', '$f(x)=x^5$ функцийн уламжлалыг ол.'],
  [
    'DERIV',
    'derivative-product',
    'Үржвэрийн уламжлалаар $x^2e^x$-ийг уламжил.',
  ],
  ['DERIV', 'derivative-chain', 'Давхар функц $f(g(x))$-ийн уламжлалыг ол.'],
  [
    'DERIV',
    'tangent',
    '$y=x^2$-ын $(1,1)$ цэг дэх шүргэгчийн тэгшитгэлийг ол.',
  ],
  ['INTEG', 'integral', String.raw`$\int x^2 dx$-г ол.`],
  [
    'INTEG',
    'integral-parts',
    'Хэсэгчлэн интегралчлах аргаар $xe^x$-ийг интегралчил.',
  ],
  [
    'PLANE',
    'pythagoras',
    'Катетууд нь $3,4$ тэгш өнцөгт гурвалжны гипотенузыг ол.',
  ],
  ['PLANE', 'triangle-area', 'Суурь $6$, өндөр $4$ гурвалжны талбайг ол.'],
  ['PLANE', 'heron', 'Героны томьёогоор $3,4,5$ талтай гурвалжны талбайг ол.'],
  ['PLANE', 'circle-area', 'Радиус $3$ дугуйн талбайг ол.'],
  [
    'PLANE',
    'cosine-rule',
    'Косинусын теоремоор хоёр тал ба завсрын өнцгөөс гурав дахь талыг ол.',
  ],
  ['SOLID', 'sphere-volume', 'Радиус $3$ бөмбөрцгийн эзлэхүүнийг ол.'],
  ['SOLID', 'cone-volume', 'Радиус $3$, өндөр $4$ конусын эзлэхүүнийг ол.'],
  [
    'SOLID',
    'cylinder-volume',
    'Радиус $2$, өндөр $5$ цилиндрийн эзлэхүүнийг ол.',
  ],
  [
    'SOLID',
    'prism-volume',
    'Суурийн талбай $6$, өндөр $7$ призмийн эзлэхүүнийг ол.',
  ],
  ['VECTOR', 'dot-product', 'Хоёр векторын скаляр үржвэрийг ол.'],
  ['VECTOR', 'vector-length', '$(3,4)$ координаттай векторын уртыг ол.'],
  ['COORD', 'distance', 'Хоёр цэгийн хоорондох зайг ол.'],
  ['COORD', 'line-slope', '$y=3x+2$ шулууны налалтыг ол.'],
];
const catalog: TagFormula[] = cases.map(([topic, slug]) => ({
  slug,
  topicSlugs: [topic],
  keywords: [],
  level: 'CORE',
}));
describe('explainable curriculum tagging', () => {
  it.each(cases)('%s / %s', (topic, slug, statementText) => {
    const result = tagProblem(
      { token: `100V3-${topic}-A-01`, statementText },
      catalog,
    );
    expect(result.map((row) => row.slug)).toContain(slug);
    expect(result.length).toBeLessThanOrEqual(4);
    expect(
      result.every((row) => row.score >= 0.5 && row.reasons.length > 0),
    ).toBe(true);
  });
  it('has at least60 unique explained rules', () => {
    expect(TAG_RULES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(TAG_RULES.map((r) => r.id)).size).toBe(TAG_RULES.length);
    expect(TAG_RULES.every((r) => r.reason.length > 10)).toBe(true);
  });
  it('does not infer from topic alone', () =>
    expect(
      tagProblem(
        { token: '100V3-RATEQ-A-1', statementText: 'Утгыг ол.' },
        catalog,
      ),
    ).toEqual([]));
  it('does not infer from distractors alone', () =>
    expect(
      tagProblem(
        { token: '100V3-ALG-A-1', choices: [{ text: 'Нийлбэрийн квадрат' }] },
        [
          {
            slug: 'square-sum',
            topicSlugs: ['ALG'],
            keywords: ['Нийлбэрийн квадрат'],
          },
        ],
      ),
    ).toEqual([]));
  it('ignores generic catalog words', () =>
    expect(
      tagProblem(
        {
          token: '100V3-ALG-A-1',
          statementText: 'Алгебр тэгшитгэл функц хувьсагч',
        },
        [
          {
            slug: 'square-sum',
            topicSlugs: ['ALG'],
            keywords: ['алгебр', 'тэгшитгэл', 'функц', 'хувьсагч'],
          },
        ],
      ),
    ).toEqual([]));
  it('does not mistake хувьсагч for percentages', () =>
    expect(
      tagProblem(
        { token: '100V3-TOO-A-1', statementText: 'Хувьсагч $x$-ийн утгыг ол.' },
        catalog,
      ),
    ).toEqual([]));
  it('prioritizes explicit nested analysis over heuristics', () => {
    const result = tagProblem(
      {
        token: '100V3-RATEQ-A-1',
        statementText: '$x^2-5x+6=0$ дискриминант',
        analysis: { formulas: [{ name: 'vieta' }] },
      },
      catalog,
    );
    expect(result[0]).toMatchObject({ slug: 'vieta', score: 1 });
  });
  it('matches explicit LaTeX with math delimiters', () =>
    expect(
      tagProblem({ analysis: { formulas: ['$a^2-b^2=(a-b)(a+b)$'] } }, [
        {
          slug: 'difference-squares',
          topicSlugs: ['ALG'],
          keywords: [],
          latex: 'a^2-b^2=(a-b)(a+b)',
        },
      ])[0]?.score,
    ).toBe(1));
  it('corroborates an analysis method with CORE topic', () =>
    expect(
      tagProblem(
        { chapterTitle: 'PROB', analysis: { methods: ['Байесын томьёо'] } },
        catalog,
      )[0]?.slug,
    ).toBe('bayes'));
  it('ignores EXTRA topic-only candidates', () =>
    expect(
      tagProblem({ chapterTitle: 'PROB' }, [
        { slug: 'bayes', topicSlugs: ['PROB'], keywords: [], level: 'EXTRA' },
      ]),
    ).toEqual([]));
  it('deduplicates slugs and sorts independent of catalog order', () => {
    const p = { token: '100V3-RATEQ-A-1', statementText: '$x^2-5x+6=0$' };
    expect(tagProblem(p, [...catalog].reverse().concat(catalog))).toEqual(
      tagProblem(p, catalog),
    );
  });
  it('caps explicit matches at4', () =>
    expect(
      tagProblem(
        { analysis: { formulas: catalog.map((f) => f.slug) } },
        catalog,
      ),
    ).toHaveLength(4));
  it('supports conservative threshold and limit', () => {
    expect(
      tagProblem({ token: '100V3-COMB-A-1', statementText: '$7!$' }, catalog, {
        threshold: 0.9,
      }),
    ).toEqual([]);
    expect(
      tagProblem(
        { analysis: { formulas: catalog.map((f) => f.slug) } },
        catalog,
        { limit: 1 },
      ),
    ).toHaveLength(1);
  });
  it.each([
    { threshold: 0.1 },
    { threshold: NaN },
    { limit: 5 },
    { limit: 1.1 },
  ])('rejects unsafe option %j', (options) =>
    expect(() => tagProblem({}, catalog, options)).toThrow(RangeError),
  );
  it('is pure and bounds cyclic analysis', () => {
    const cyclic: Record<string, unknown> = { name: 'vieta' };
    cyclic.self = cyclic;
    expect(
      tagProblem(
        Object.freeze({ analysis: Object.freeze({ formulas: cyclic }) }),
        Object.freeze(catalog.map((f) => Object.freeze(f))),
      )[0]?.slug,
    ).toBe('vieta');
  });
  it('rejects invalid slugs', () =>
    expect(
      tagProblem({ analysis: { formulas: ['../secret'] } }, [
        { slug: '../secret', topicSlugs: [], keywords: [] },
      ]),
    ).toEqual([]));
  it('prefers token code, then chapter or analysis', () => {
    expect(
      problemTopic({ token: '100V3-COMB-A-1', chapterTitle: 'Интеграл' }),
    ).toBe('COMB');
    expect(problemTopic({ chapterTitle: 'Магадлал' })).toBe('PROB');
    expect(problemTopic({ analysis: { topic: 'VECTOR' } })).toBe('VECTOR');
    expect(problemTopic({ chapterTitle: 'Тодорхойгүй' })).toBe('UNKNOWN');
  });
});

// Exercise the actual operator CLI helpers without opening a database.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cli = require('../../prisma/tag-problem-formulas.cjs') as {
  parseArgs: (args: string[]) => { commit: boolean; onlyBook?: string };
  eligibleWhere: (options: Record<string, unknown>) => unknown;
  planLinks: (
    row: unknown,
    catalog: unknown,
    tagger: typeof tagProblem,
  ) => { suggestions: unknown[]; additions: { formulaId: string }[] };
  sampleInto: (
    sample: unknown[],
    value: unknown,
    seen: number,
    random?: (seen: number) => number,
  ) => void;
};
describe('append-only operator controls', () => {
  it('defaults to dry-run and requires explicit commit', () => {
    expect(cli.parseArgs([])).toEqual({ commit: false, onlyBook: undefined });
    expect(cli.parseArgs(['--commit', '--only-book=100V3'])).toEqual({
      commit: true,
      onlyBook: '100V3',
    });
  });
  it.each([
    '--only-book=',
    '--only-book=../secret',
    '--write',
    '--commit=false',
  ])('rejects argument %s', (arg) =>
    expect(() => cli.parseArgs([arg])).toThrow(),
  );
  it('excludes unidentified/private variants before content fetch', () => {
    expect(cli.eligibleWhere({ onlyBook: '100V3' })).toMatchObject({
      deletedAt: null,
      analysis: { is: { sourceVariant: { in: ['A', 'B'] } } },
      chapter: { book: { code: '100V3', deletedAt: null } },
    });
  });
  it('preserves manual links and only fills remaining slots', () => {
    const formulas = catalog.map((f, i) => ({ ...f, id: `f${i}` }));
    const row = {
      chapter: { title: 'ALG' },
      analysis: { formulas: formulas.map((f) => f.slug) },
      formulas: [
        { formulaId: 'manual-1' },
        { formulaId: 'manual-2' },
        { formulaId: 'manual-3' },
      ],
    };
    const before = JSON.stringify(row);
    expect(cli.planLinks(row, formulas, tagProblem).additions).toHaveLength(1);
    expect(JSON.stringify(row)).toBe(before);
    row.formulas.push({ formulaId: 'manual-4' });
    expect(cli.planLinks(row, formulas, tagProblem).additions).toEqual([]);
  });
  it('does not add duplicate existing associations', () => {
    const formulas = [
      { id: 'v1', slug: 'vieta', topicSlugs: ['RATEQ'], keywords: [] },
    ];
    expect(
      cli.planLinks(
        {
          chapter: { title: 'RATEQ' },
          analysis: { formulas: ['vieta'] },
          formulas: [{ formulaId: 'v1' }],
        },
        formulas,
        tagProblem,
      ).additions,
    ).toEqual([]);
  });
  it('uses bounded reservoir sampling rather than first30 only', () => {
    const sample: unknown[] = [];
    for (let i = 1; i <= 40; i++) cli.sampleInto(sample, i, i, () => 0);
    expect(sample).toHaveLength(30);
    expect(sample[0]).toBe(40);
    expect(sample[29]).toBe(30);
  });
});

// C1 is the reviewed catalog already merged on this task's base.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const reviewed = require('../../prisma/data/formulas/numbers-algebra.json') as {
  formulas: TagFormula[];
};
describe('merged catalog compatibility', () => {
  it.each([
    ['ALG', 'square-sum', '$(x+4)^2$-ыг задла.'],
    ['ALG', 'square-difference-binomial', '$(x-7)^2$-ыг задла.'],
    ['ALG', 'difference-squares', '$a^2-b^2$-ыг үржигдэхүүнд задал.'],
    ['ALG', 'cube-sum-binomial', '$(x+2)^3$-ыг задла.'],
    ['TOO', 'gcd-lcm', '$12$ ба $18$-ын ХИЕХ-ийг ол.'],
    ['TOO', 'gcd-lcm', '$12$ ба $18$-ын ХБЕХ-ийг ол.'],
    ['ALG', 'power-product', String.raw`$a^m\cdot a^n$-г нэг зэрэг болго.`],
    ['ALG', 'power-quotient', String.raw`$\frac{a^m}{a^n}$-г нэг зэрэг болго.`],
  ])('matches published %s / %s', (topic, slug, statementText) => {
    expect(
      tagProblem(
        { token: `100V3-${topic}-A-001`, statementText },
        reviewed.formulas,
      ).map((f) => f.slug),
    ).toContain(slug);
  });
});
