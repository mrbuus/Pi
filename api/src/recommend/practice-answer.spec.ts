import { ProblemFormat } from '../generated/prisma/enums';
import { canonicalizePracticeChoiceInput } from './recommend.service';

describe('canonicalizePracticeChoiceInput', () => {
  const problem = {
    id: 'problem-1',
    format: ProblemFormat.CHOICE,
    choices: null,
    correctAnswer: null,
    choiceOptions: [
      { order: 0, text: '4', isCorrect: true },
      { order: 1, text: '5', isCorrect: false },
    ],
  };

  it('matches numeric-looking free text before interpreting legacy letters', () => {
    expect(canonicalizePracticeChoiceInput(problem, '4')).toBe(0);
  });

  it('preserves numeric JSON indices and supports legacy letter submissions', () => {
    expect(canonicalizePracticeChoiceInput(problem, 1)).toBe(1);
    expect(canonicalizePracticeChoiceInput(problem, 'B')).toBe(1);
  });
});
