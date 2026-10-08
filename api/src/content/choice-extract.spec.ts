import { extractChoices } from './choice-extract.js';
import { gradeAnswer } from '../tests/grading.js';
import { ProblemFormat } from '../generated/prisma/enums.js';

const labels = ['A.', 'B)', '(C)', 'D.', 'E.'];
const cyrillicLabels = ['А.', 'Б)', '(В)', 'Г.', 'Д.'];

describe('extractChoices', () => {
  it.each(
    Array.from({ length: 60 }, (_, index) => {
      const labelSet = index % 2 === 0 ? labels : cyrillicLabels;
      const separator = ['  ', '\n', ' \\qquad ', ' \\quad '][index % 4];
      const variant = index % 3;
      const bodies =
        variant === 0
          ? ['1', '2', '3', '4', '5']
          : variant === 1
            ? ['$x+1$', '$x+2$', '$x+3$', '$x+4$', '$x+5$']
            : [
                '\\frac{1}{2}',
                '\\sqrt{2}',
                '\\frac{3}{4}',
                '\\sqrt{5}',
                '\\frac{7}{8}',
              ];
      const optionText = labelSet.map(
        (label, choiceIndex) => `${label} ${bodies[choiceIndex]}`,
      );
      const block =
        variant === 2
          ? `$${optionText.join(separator)}$`
          : optionText.join(separator);
      return [
        `Бодлогын нөхцөл ${index + 1}. ${block}`,
        variant === 2
          ? [
              `$${bodies[0]}$`,
              `$${bodies[1]}$`,
              `$${bodies[2]}$`,
              `$${bodies[3]}$`,
              `$${bodies[4]}$`,
            ]
          : bodies,
      ] as const;
    }),
  )('extracts labeled option set %#', (statement, expected) => {
    const result = extractChoices(statement);
    expect(result.choices).toEqual(expected);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.issues).toHaveLength(0);
    for (const expression of [result.stem, ...result.choices]) {
      const delimiters = expression.match(/(?<!\\)\$\$?/g) ?? [];
      expect(delimiters.length % 2).toBe(0);
    }
  });

  it('separates choices embedded in one shared display-math span', () => {
    const result = extractChoices(
      'Бодлого $x=1$: $A. 1 \\qquad B. 2 \\qquad C. 3 \\qquad D. 4 \\qquad E. 5$',
    );
    expect(result.choices).toEqual(['$1$', '$2$', '$3$', '$4$', '$5$']);
  });

  it.each([
    ['', 'EMPTY_STATEMENT'],
    ['Энд сонголт алга.', 'NO_OPTION_SEQUENCE'],
    [
      'Бодлого. A. 1 B. 2 C. 3 D. 4 E. 5; жишээ A. 1 B. 2 C. 3 D. 4 E. 5',
      'AMBIGUOUS_OPTION_SEQUENCE',
    ],
    ['Бодлого. A. 1 B. 2 C. 3 D. 4 E. ', 'EMPTY_OPTION'],
    ['Бодлого $x=1. A. 1 B. 2 C. 3 D. 4 E. 5', 'UNBALANCED_MATH'],
    [
      'Бодлого. A. 1 B. 2 C. \\begin{aligned}x D. 4 E. 5',
      'UNBALANCED_LATEX_ENVIRONMENT',
    ],
  ])('leaves uncertain input unchanged for %s', (statement, expectedIssue) => {
    const result = extractChoices(statement);
    expect(result.choices).toEqual([]);
    expect(result.stem).toBe(statement.trim());
    expect(result.issues[0]?.code).toBe(expectedIssue);
  });

  it('rejects markers that do not form one complete ordered set', () => {
    const result = extractChoices('Бодлого. A. 1 B. 2 D. 4 E. 5');
    expect(result.choices).toEqual([]);
    expect(result.issues[0]?.code).toBe('NO_OPTION_SEQUENCE');
  });

  it('keeps mixed Latin and Cyrillic marker sets below the auto-repair threshold', () => {
    const result = extractChoices('Бодлого. A. 1 Б. 2 C. 3 Г. 4 E. 5');
    expect(result.choices).toHaveLength(5);
    expect(result.confidence).toBeLessThan(0.9);
  });

  it.each([
    [
      'Бодлого \\text{A. fake B. fake C. fake D. fake E. fake}. A. real A B. real B C. real C D. real D E. real E',
      ['real A', 'real B', 'real C', 'real D', 'real E'],
    ],
    [
      'Нөхцөл {\\text{(A) fake (Б) fake}}. А. бодит А Б) бодит Б (В) бодит В Г. бодит Г Д. бодит Д',
      ['бодит А', 'бодит Б', 'бодит В', 'бодит Г', 'бодит Д'],
    ],
    [
      'Бодлого. a. alpha b. beta c. gamma d. delta e. epsilon',
      ['alpha', 'beta', 'gamma', 'delta', 'epsilon'],
    ],
    [
      'Бодлого. а. альфа б. бета в. гамма г. дельта д. эпсилон',
      ['альфа', 'бета', 'гамма', 'дельта', 'эпсилон'],
    ],
    [
      'Бодлого. A. \\frac{1}{2}\\hspace{1cm}B. \\sqrt{2}\\hspace{1cm}C. 3\\hspace{1cm}D. 4\\hspace{1cm}E. 5',
      ['\\frac{1}{2}', '\\sqrt{2}', '3', '4', '5'],
    ],
    [
      'Бодлого. A. {x+1} B. {x+2} C. {x+3} D. {x+4} E. {x+5}',
      ['{x+1}', '{x+2}', '{x+3}', '{x+4}', '{x+5}'],
    ],
    [
      'Бодлого. A. $\\{1,2\\}$ B. $\\{2,3\\}$ C. $\\{3,4\\}$ D. $\\{4,5\\}$ E. $\\{5,6\\}$.',
      [
        '$\\{1,2\\}$',
        '$\\{2,3\\}$',
        '$\\{3,4\\}$',
        '$\\{4,5\\}$',
        '$\\{5,6\\}$.',
      ],
    ],
    [
      'Бодлого. A. \\text{сонголт A.} B. \\text{сонголт B.} C. \\text{сонголт C.} D. \\text{сонголт D.} E. \\text{сонголт E.}',
      [
        '\\text{сонголт A.}',
        '\\text{сонголт B.}',
        '\\text{сонголт C.}',
        '\\text{сонголт D.}',
        '\\text{сонголт E.}',
      ],
    ],
    [
      'Бодлого. (A) нэг (B) хоёр (C) гурав (D) дөрөв (E) тав',
      ['нэг', 'хоёр', 'гурав', 'дөрөв', 'тав'],
    ],
  ])('handles nested markup and label edge cases', (statement, expected) => {
    const result = extractChoices(statement);
    expect(result.choices).toEqual(expected);
  });

  it.each([
    ['Бодлого. A. $\\frac{1}{2} B. 2 C. 3 D. 4 E. 5', 'UNBALANCED_MATH'],
    ['Бодлого. A. $\\frac{1}{2}$ B. {2 C. 3 D. 4 E. 5', 'UNBALANCED_BRACES'],
    ['Бодлого. A. $\\frac{1}{2}$ B. 2} C. 3 D. 4 E. 5', 'UNBALANCED_BRACES'],
    [
      'Бодлого. A. \\begin{aligned} x B. 2 C. 3 D. 4 E. 5',
      'UNBALANCED_LATEX_ENVIRONMENT',
    ],
  ])(
    'rejects malformed delimiters and LaTeX groups',
    (statement, expectedIssue) => {
      const result = extractChoices(statement);
      expect(result.choices).toEqual([]);
      expect(result.issues[0]?.code).toBe(expectedIssue);
    },
  );

  it('keeps legacy letter grading and grades newly structured options by the same key', () => {
    const oldLetterSession = gradeAnswer(
      {
        id: 'synthetic',
        format: ProblemFormat.CHOICE,
        choices: ['A', 'B', 'C', 'D', 'E'],
        correctAnswer: 'C',
      },
      'C',
    );
    expect(oldLetterSession).toEqual({ correct: true, canonicalAnswer: 'C' });

    const structuredChoice = gradeAnswer(
      {
        id: 'synthetic',
        format: ProblemFormat.CHOICE,
        choices: ['1', '2', '3', '4', '5'],
        correctAnswer: 'C',
        choiceOptions: [
          { order: 0, text: '1', isCorrect: false },
          { order: 1, text: '2', isCorrect: false },
          { order: 2, text: '3', isCorrect: true },
          { order: 3, text: '4', isCorrect: false },
          { order: 4, text: '5', isCorrect: false },
        ],
      },
      2,
    );
    expect(structuredChoice.correct).toBe(true);
  });
});
