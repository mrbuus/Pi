import { ProblemFormat } from '../generated/prisma/enums';
import {
  answersEqual,
  buildChoiceOrder,
  choiceModeOf,
  choiceTextsOf,
  gradeAnswer,
  GradableProblem,
  isPlaceholderChoices,
  mulberry32,
  shuffledIndices,
} from './grading';

const CHOICE = ProblemFormat.CHOICE;
const FILL = ProblemFormat.FILL_NUMBER;

function p(over: Partial<GradableProblem>): GradableProblem {
  return {
    id: 'p1',
    format: CHOICE,
    choices: null,
    correctAnswer: null,
    ...over,
  };
}

describe('answersEqual — тоон каноник харьцуулалт', () => {
  it('аравтын тэг, тэмдгийг жигдрүүлнэ', () => {
    expect(answersEqual('4', '4.0')).toBe(true);
    expect(answersEqual('-3.5', '-3.50')).toBe(true);
    expect(answersEqual('5', '+5')).toBe(true);
    expect(answersEqual('4', '5')).toBe(false);
  });
  it('үсгийг том/жижиггүй тулгана', () => {
    expect(answersEqual('A', 'a')).toBe(true);
    expect(answersEqual('A', 'B')).toBe(false);
  });
  it('хоосон түлхүүр/хоосон хариу хэзээ ч зөв болохгүй', () => {
    expect(answersEqual('', 'A')).toBe(false);
    expect(answersEqual(null, 'A')).toBe(false);
    expect(answersEqual('A', '')).toBe(false);
    expect(answersEqual({ manualReview: true }, 'A')).toBe(false);
  });
  it('олон нүхт (объект) хариуг түлхүүр бүрээр тулгана', () => {
    expect(answersEqual({ a: '2', b: '-3' }, { a: '2.0', b: '-3' })).toBe(true);
    expect(answersEqual({ a: '2', b: '-3' }, { a: '2', b: '3' })).toBe(false);
  });
});

describe('placeholder илрүүлэлт ба горим', () => {
  it('["A".."E"] нь placeholder', () => {
    expect(isPlaceholderChoices(['A', 'B', 'C', 'D', 'E'])).toBe(true);
    expect(isPlaceholderChoices(['$4x+3$', '$2x$'])).toBe(false);
  });
  it('placeholder → LETTER, жинхэнэ текст → TEXT, options → TEXT', () => {
    expect(choiceModeOf(p({ choices: ['A', 'B', 'C'] }))).toBe('LETTER');
    expect(choiceModeOf(p({ choices: ['$1$', '$2$'] }))).toBe('TEXT');
    expect(
      choiceModeOf(
        p({
          choiceOptions: [
            { order: 1, text: 'x', isCorrect: true },
            { order: 2, text: 'y', isCorrect: false },
          ],
        }),
      ),
    ).toBe('TEXT');
    expect(choiceModeOf(p({ format: FILL }))).toBe(null);
  });
  it('choiceOptions-ийг order-оор эрэмбэлж текст гаргана', () => {
    const g = p({
      choiceOptions: [
        { order: 2, text: 'хоёр', isCorrect: false },
        { order: 1, text: 'нэг', isCorrect: true },
      ],
    });
    expect(choiceTextsOf(g)).toEqual(['нэг', 'хоёр']);
  });
});

describe('shuffle — детерминизм', () => {
  it('ижил seed ижил дараалал өгнө (session хөлдөлт)', () => {
    const a = shuffledIndices(5, mulberry32(42));
    const b = shuffledIndices(5, mulberry32(42));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([0, 1, 2, 3, 4]);
  });
  it('өөр seed ихэвчлэн өөр дараалал өгнө', () => {
    const perms = new Set(
      Array.from({ length: 20 }, (_, i) =>
        shuffledIndices(5, mulberry32(i + 1)).join(','),
      ),
    );
    expect(perms.size).toBeGreaterThan(10);
  });
  it('buildChoiceOrder: TEXT бодлогод л permutation үүсгэнэ', () => {
    const problems = [
      p({ id: 'text1', choices: ['$1$', '$2$', '$3$'] }),
      p({ id: 'letter1', choices: ['A', 'B', 'C', 'D', 'E'] }),
      p({ id: 'fill1', format: FILL }),
    ];
    const order = buildChoiceOrder(problems, 7);
    expect(order['text1']).toHaveLength(3);
    expect(order['letter1']).toBeUndefined();
    expect(order['fill1']).toBeUndefined();
    expect(buildChoiceOrder(problems, 7)).toEqual(order);
  });
});

describe('gradeAnswer — горим бүрийн дүн', () => {
  it('LETTER: үсгээр тулгана (байрлал хөдлөхгүй)', () => {
    const g = p({ choices: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 'D' });
    expect(gradeAnswer(g, 'D').correct).toBe(true);
    expect(gradeAnswer(g, 'd').correct).toBe(true);
    expect(gradeAnswer(g, 'A').correct).toBe(false);
  });

  it('TEXT (хуучин загвар): display индекс → эх индекс → үсэг', () => {
    // Эх: 0:"$4x+3$"(зөв=A) 1:"$2x$" 2:"$5$"; shuffle: display=[2,0,1]
    const g = p({
      choices: ['$4x+3$', '$2x$', '$5$'],
      correctAnswer: 'A',
    });
    const perm = [2, 0, 1];
    // display 1 = эх 0 = зөв
    expect(gradeAnswer(g, 1, perm).correct).toBe(true);
    expect(gradeAnswer(g, 0, perm).correct).toBe(false);
    expect(gradeAnswer(g, 2, perm).correct).toBe(false);
  });

  it('TEXT (шинэ загвар): isCorrect flag-аар — үсэг/текстийн зөрөөнөөс ангид', () => {
    const g = p({
      correctAnswer: '$16$', // текст хадгалагдсан ч грейдинд ашиглагдахгүй
      choiceOptions: [
        { order: 1, text: '$4$', isCorrect: false },
        { order: 2, text: '$16$', isCorrect: true },
        { order: 3, text: '$6$', isCorrect: false },
      ],
    });
    const perm = [1, 2, 0]; // display 0 = эх 1 = зөв
    expect(gradeAnswer(g, 0, perm).correct).toBe(true);
    expect(gradeAnswer(g, 1, perm).correct).toBe(false);
    expect(gradeAnswer(g, 0, perm).canonicalAnswer).toBe('$16$');
  });

  it('TEXT: буруу төрлийн/мужаас гадуурх оролтод унахгүй, буруу гэж дүгнэнэ', () => {
    const g = p({ choices: ['$1$', '$2$'], correctAnswer: 'A' });
    expect(gradeAnswer(g, 'A', [1, 0]).correct).toBe(false); // стринг ирвэл
    expect(gradeAnswer(g, 9, [1, 0]).correct).toBe(false); // мужаас гадуур
    expect(gradeAnswer(g, undefined, [1, 0]).correct).toBe(false);
  });

  it('FILL_NUMBER: тоон каноник', () => {
    const g = p({ format: FILL, correctAnswer: '-4' });
    expect(gradeAnswer(g, '-4').correct).toBe(true);
    expect(gradeAnswer(g, '-4.0').correct).toBe(true);
    expect(gradeAnswer(g, '4').correct).toBe(false);
  });

  it('хариуны түлхүүргүй (manualReview) бодлого хэзээ ч зөв болохгүй', () => {
    const g = p({
      format: FILL,
      correctAnswer: { manualReview: true },
    });
    expect(gradeAnswer(g, '5').correct).toBe(false);
  });
});
