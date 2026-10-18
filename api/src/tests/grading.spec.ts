import { ProblemFormat } from '../generated/prisma/enums';
import {
  answersEqual,
  buildChoiceOrder,
  choiceImagesOf,
  choiceModeOf,
  choiceTextsOf,
  gradeAnswer,
  GradableProblem,
  hasKnownAnswer,
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

  // ── 2026-08-08-нд илэрсэн алдааны хамгаалалт ──────────────────────────
  // Дээд талын "хоосон бол дүгнэхгүй" хамгаалалт зөвхөн БҮХЭЛ утгыг шалгаж
  // байсан тул { a: '' } гэсэн объект түүнийг давж, доор нь
  // tokensMatch('', '') → үнэн буцааж, ХАРИУГҮЙ нүх автоматаар "зөв" гэж
  // тоологдож байв. Энэ нь шалгалтын дүнг шууд гажуудуулна.
  it('нүхний ЗӨВ хариу хоосон бол тэр бодлого зөв болохгүй', () => {
    expect(answersEqual({ a: '' }, { a: '' })).toBe(false);
    expect(answersEqual({ a: '' }, { a: '4' })).toBe(false);
    expect(answersEqual({ a: '4', b: '' }, { a: '4', b: '' })).toBe(false);
    // зөвхөн зай бичсэн ч хоосонтой ижил
    expect(answersEqual({ a: '  ' }, { a: '  ' })).toBe(false);
  });

  it('сурагч нүхийг огт бөглөөгүй бол буруу', () => {
    expect(answersEqual({ a: '4' }, {})).toBe(false);
    expect(answersEqual({ a: '4', b: '9' }, { a: '4' })).toBe(false);
    expect(answersEqual({ a: '4' }, { a: '' })).toBe(false);
    expect(answersEqual({ a: '4' }, { a: null })).toBe(false);
  });

  it('нүх бүр зөв бөглөгдсөн үед зөв гэж тоолно', () => {
    expect(answersEqual({ a: '4', b: '9' }, { a: '4.0', b: '9' })).toBe(true);
    // сурагч нэмэлт нүх бичсэн нь зөв хариуг үгүйсгэхгүй (одоогийн зан төлөв)
    expect(answersEqual({ a: '4' }, { a: '4', b: '9' })).toBe(true);
  });
});

describe('hasKnownAnswer — answersEqual-тай нийцтэй байх', () => {
  // Хоёр функц зөрвөл: бодлого maxScore-д ордог атлаа answersEqual хэзээ ч
  // үнэн буцаахгүй тул сурагч авах БОЛОМЖГҮЙ оноо алдана.
  it('нүхний хариу хоосон бол "хариутай" гэж тооцохгүй', () => {
    expect(hasKnownAnswer(p({ format: FILL, correctAnswer: { a: '' } }))).toBe(false);
    expect(
      hasKnownAnswer(p({ format: FILL, correctAnswer: { a: '4', b: '' } })),
    ).toBe(false);
    expect(hasKnownAnswer(p({ format: FILL, correctAnswer: {} }))).toBe(false);
  });

  it('нүх бүр утгатай бол "хариутай"', () => {
    expect(hasKnownAnswer(p({ format: FILL, correctAnswer: { a: '4' } }))).toBe(true);
    expect(
      hasKnownAnswer(p({ format: FILL, correctAnswer: { a: '4', b: '9' } })),
    ).toBe(true);
  });

  // 100x100/200x200 V3 импорт: ProblemChoice мөргүй, choices массив + үсэг түлхүүр
  // (1748/1768 бодлого). gradeAnswer энэ хэлбэрийг дүгнэдэг тул «хариутай» байх ёстой —
  // эс тэгвээс онлайн тест бүр 0/0 (2026-10-14-нд илэрсэн).
  it('хуучин загвар: choices + үсэг түлхүүр бол "хариутай", gradeAnswer-тай нийцнэ', () => {
    const legacy = p({ format: CHOICE, choices: ['8', '7', '10', '9', '11'], correctAnswer: 'B', choiceOptions: [] });
    expect(hasKnownAnswer(legacy)).toBe(true);
    expect(gradeAnswer(legacy, 1).correct).toBe(true);
    expect(gradeAnswer(legacy, 0).correct).toBe(false);
    expect(hasKnownAnswer(p({ format: CHOICE, choices: ['8', '7'], correctAnswer: 'E', choiceOptions: [] }))).toBe(false);
  });

  it('хуучин загвар: түлхүүр дутуу (ANSWER_KEY_MISSING) бол "хариугүй" хэвээр', () => {
    expect(
      hasKnownAnswer(p({ format: CHOICE, choices: ['1', '2', '3'], correctAnswer: { reason: 'ANSWER_KEY_MISSING' }, choiceOptions: [] })),
    ).toBe(false);
    expect(hasKnownAnswer(p({ format: CHOICE, choices: ['1', '2'], correctAnswer: '', choiceOptions: [] }))).toBe(false);
  });

  it('энгийн хоосон болон manualReview-г урьдын адил хасна', () => {
    expect(hasKnownAnswer(p({ format: FILL, correctAnswer: null }))).toBe(false);
    expect(hasKnownAnswer(p({ format: FILL, correctAnswer: '' }))).toBe(false);
    expect(
      hasKnownAnswer(p({ format: FILL, correctAnswer: { manualReview: true } })),
    ).toBe(false);
  });

  // ЯГ ТЭР ХОСЛОЛ: hasKnownAnswer үнэн бол answersEqual зөв хариунд үнэн
  // буцаах ЁСТОЙ. Энэ нь хоёр функцийн гэрээ.
  it('хариутай гэж үзсэн бодлого зөв хариунд оноо ӨГӨХ ёстой', () => {
    const prob = p({ format: FILL, correctAnswer: { a: '4', b: '9' } });
    expect(hasKnownAnswer(prob)).toBe(true);
    expect(answersEqual(prob.correctAnswer, { a: '4', b: '9' })).toBe(true);
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

describe('hasKnownAnswer — импортын хариуны түлхүүр илрүүлэлт', () => {
  it('TEXT горим: isCorrect=true choice байхгүй бол мэдэгдэхгүй', () => {
    const g = p({
      choiceOptions: [
        { order: 0, text: 'A', isCorrect: false },
        { order: 1, text: 'B', isCorrect: false },
      ],
    });
    expect(hasKnownAnswer(g)).toBe(false);
  });

  it('TEXT горим: isCorrect=true choice байвал мэдэгдэнэ', () => {
    const g = p({
      choiceOptions: [
        { order: 0, text: 'A', isCorrect: true },
        { order: 1, text: 'B', isCorrect: false },
      ],
    });
    expect(hasKnownAnswer(g)).toBe(true);
  });

  it('manualReview placeholder correctAnswer-тай бол мэдэгдэхгүй', () => {
    const g = p({
      format: FILL,
      correctAnswer: { manualReview: true, reason: 'ANSWER_KEY_MISSING' },
    });
    expect(hasKnownAnswer(g)).toBe(false);
  });

  it('бодит correctAnswer утгатай бол мэдэгдэнэ', () => {
    const g = p({ format: FILL, correctAnswer: '-4' });
    expect(hasKnownAnswer(g)).toBe(true);
  });

  it('correctAnswer хоосон/null бол мэдэгдэхгүй', () => {
    expect(hasKnownAnswer(p({ format: FILL, correctAnswer: null }))).toBe(
      false,
    );
    expect(hasKnownAnswer(p({ format: FILL, correctAnswer: '' }))).toBe(false);
  });
});

describe('Нөхөх бодлого — нүдний дараалал (2026-10-10 засвар)', () => {
  // Сорил 1-A маягийн объект түлхүүр + хөдөлгүүрийн нэг стринг хариу
  const keyed = p({
    format: FILL,
    correctAnswer: { a: '3', b: '2', c: '8' },
    statementText: '$x=[a]$, $y=[b][c]$',
  });
  it('объект түлхүүрийг стринг хариутай нүдний дарааллаар тулгана', () => {
    expect(gradeAnswer(keyed, '328').correct).toBe(true);
    expect(gradeAnswer(keyed, '329').correct).toBe(false);
  });
  it('хоосон нүд («_») — байрлал хадгалагдаж, бодлого зөв биш', () => {
    expect(gradeAnswer(keyed, '3_8').correct).toBe(false);
  });
  it('Word-ийн \\lbrack a\\rbrack тэмдэглэгээг нүд гэж танина (100V3)', () => {
    const word = p({
      format: FILL,
      correctAnswer: { a: '2', b: '8' },
      statementText: '$t^{2} - \\lbrack a\\rbrack t - \\lbrack b\\rbrack \\geq 0$',
    });
    expect(gradeAnswer(word, '28').correct).toBe(true);
    expect(gradeAnswer(word, '82').correct).toBe(false);
  });
  it('бүлгийн түлхүүр ({ bc: "54" })-ийг ч задална', () => {
    const grouped = p({
      format: FILL,
      correctAnswer: { a: '3', bc: '54' },
      statementText: '$[a]$ ба $[bc]$',
    });
    expect(gradeAnswer(grouped, '354').correct).toBe(true);
    expect(gradeAnswer(grouped, '3_4').correct).toBe(false);
  });
  it('стринг түлхүүр — «812600»-г «0812600»-тэй тоогоор андуурахгүй', () => {
    const str = p({
      format: FILL,
      correctAnswer: '0812600',
      statementText: '$[a][b][c][d]$ ба $[efg]$',
    });
    expect(gradeAnswer(str, '0812600').correct).toBe(true);
    expect(gradeAnswer(str, '812600').correct).toBe(false);
    expect(gradeAnswer(str, '08_2600').correct).toBe(false);
  });
  it('нүдгүй бодлого — хуучин дүрэм хэвээр (тоон каноник)', () => {
    const free = p({ format: FILL, correctAnswer: '4', statementText: 'x=?' });
    expect(gradeAnswer(free, '4.0').correct).toBe(true);
  });
});

describe('choiceImagesOf — сонголтын зураг', () => {
  it('зураггүй бол null (хуучин payload өөрчлөгдөхгүй)', () => {
    expect(
      choiceImagesOf({ choiceOptions: [{ order: 1, text: '1', isCorrect: true }] }),
    ).toBeNull();
  });

  it('order-оор эрэмбэлж, текстийн дараалалтай таарна', () => {
    const p = {
      choiceOptions: [
        { order: 2, text: '', isCorrect: false, imageKey: 'b.png' },
        { order: 1, text: '', isCorrect: true, imageKey: 'a.png' },
        { order: 3, text: 'x', isCorrect: false, imageKey: null },
      ],
    };
    expect(choiceImagesOf(p)).toEqual(['a.png', 'b.png', null]);
  });

  it('зөвхөн зурагтай (текст хоосон) сонголтыг isCorrect-оор дүгнэнэ', () => {
    const p: GradableProblem = {
      id: 'p',
      format: ProblemFormat.CHOICE,
      choices: null,
      correctAnswer: '',
      choiceOptions: [
        { order: 1, text: '', isCorrect: false, imageKey: 'a.png' },
        { order: 2, text: '', isCorrect: true, imageKey: 'b.png' },
      ],
    };
    expect(gradeAnswer(p, 1).correct).toBe(true);
    expect(gradeAnswer(p, 0).correct).toBe(false);
  });
});
