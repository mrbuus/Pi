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
