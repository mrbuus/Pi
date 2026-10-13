import { ProblemFormat, TagType } from '../generated/prisma/enums';
import {
  blockIssues,
  changedFields,
  checkBlock,
  editSummary,
  fieldsFromSummary,
  latexError,
  normalizeNumeric,
  problemInput,
  problemToken,
  shortPersonName,
  toGradable,
  unicodeMathGlyphs,
  type DraftBlockLike,
} from './draft-model';

const choice = (over: Partial<DraftBlockLike> = {}): DraftBlockLike => ({
  id: 'b1',
  kind: 'CHOICE',
  statement: '$x^{2}-5x+6=0$ тэгшитгэлийн шийдүүдийн нийлбэрийг ол',
  choices: ['$5$', '$-5$', '$6$', '$-6$', '$1$'],
  answer: 'A',
  solution: 'Виетийн теоремоор $x_{1}+x_{2}=5$',
  imageKey: null,
  tag: 'Квадрат тэгшитгэл',
  points: 1,
  ...over,
});
const numeric = (over: Partial<DraftBlockLike> = {}): DraftBlockLike => ({
  ...choice(),
  kind: 'NUMERIC',
  statement: '$\\sqrt{49}+\\frac{1}{2}\\cdot 6$ илэрхийллийн утгыг ол',
  choices: [],
  answer: '10',
  ...over,
});

describe('blockIssues — нийтлэхэд бэлэн эсэх', () => {
  it('бүрэн сонголттой ба тоон блок бэлэн', () => {
    expect(blockIssues(choice())).toEqual([]);
    expect(blockIssues(numeric())).toEqual([]);
  });

  it('хоосон өгүүлбэр, хариугүй, хосгүй сонголтыг барина', () => {
    const codes = blockIssues(
      choice({ statement: ' ', answer: null, choices: ['$1$', '', '$3$'] }),
    ).map((i) => i.code);
    expect(codes).toEqual(
      expect.arrayContaining(['EMPTY_STATEMENT', 'NO_ANSWER', 'MIXED_CHOICES']),
    );
  });

  it('хариу сонголтын тооноос гадуур бол BAD_ANSWER', () => {
    const codes = blockIssues(
      choice({ choices: ['$1$', '$2$', '$3$'], answer: 'E' }),
    ).map((i) => i.code);
    expect(codes).toContain('BAD_ANSWER');
  });

  it('сонголт зурагт (бүгд хоосон) — зурагтай бол болно, зураггүй бол үгүй', () => {
    const empty = ['', '', '', '', ''];
    expect(
      blockIssues(choice({ choices: empty, imageKey: 'a.png' })).map((i) => i.code),
    ).toEqual([]);
    expect(blockIssues(choice({ choices: empty })).map((i) => i.code)).toContain(
      'EMPTY_CHOICES',
    );
  });

  it('тоон хариу тоо биш бол BAD_ANSWER', () => {
    expect(blockIssues(numeric({ answer: '\\frac{9}{2}' }))[0].code).toBe(
      'BAD_ANSWER',
    );
  });

  it('юникод математик тэмдэгт (π, ², ·) хориотой', () => {
    const issues = blockIssues(choice({ statement: 'Тойргийн талбай πr² · 2' }));
    expect(issues.find((i) => i.code === 'UNICODE')?.message).toContain('π');
    expect(unicodeMathGlyphs('x² + 3·y')).toEqual(['²', '·']);
    expect(unicodeMathGlyphs('Монгол бичвэр $x^{2}$')).toEqual([]);
  });

  it('алдаатай LaTeX болон хосгүй $-ийг барина', () => {
    expect(latexError('$\\frac{1}{2$')).toBeTruthy();
    expect(latexError('Үнэ нь $5')).toBe('$ тэмдэгт хосгүй байна');
    expect(latexError('$\\sqrt{2}$ ба $$\\int_0^1 x\\,dx$$')).toBeNull();
    expect(blockIssues(choice({ solution: '$\\fra{1}{2}$' })).map((i) => i.code)).toContain(
      'LATEX',
    );
  });

  it('[Зураг] орлуулгыг үлдээвэл нийтлэхгүй', () => {
    expect(
      blockIssues(choice({ statement: 'Зурагт үзүүлсэн [Зураг] гурвалжин' }))
        .map((i) => i.code),
    ).toContain('PLACEHOLDER');
  });
});

describe('normalizeNumeric', () => {
  it.each([
    ['12', '12'],
    [' $4,5$ ', '4.5'],
    ['x = -3', '-3'],
    ['+7', '7'],
    ['0812', '0812'],
    ['abc', null],
    ['', null],
  ])('%p → %p', (raw, want) => expect(normalizeNumeric(raw)).toBe(want));
});

describe('checkBlock — сурагчийн дүгнэлттэй ижил (gradeAnswer)', () => {
  it('сонголттой: үсгээр тулгана', () => {
    expect(checkBlock(choice(), 'A').correct).toBe(true);
    expect(checkBlock(choice(), 'b').correct).toBe(false);
    expect(checkBlock(choice(), '').correct).toBe(false);
    expect(checkBlock(choice(), 'A').key).toBe('A');
  });

  it('сонголт зурагт (LETTER горим)', () => {
    const b = choice({ choices: ['', '', '', ''], answer: 'C', imageKey: 'k.png' });
    expect(toGradable(b).choices).toEqual(['A', 'B', 'C', 'D']);
    expect(checkBlock(b, 'C').correct).toBe(true);
    expect(checkBlock(b, 'D').correct).toBe(false);
  });

  it('тоон: «10» = «10.0», «9» буруу', () => {
    expect(checkBlock(numeric(), '10.0').correct).toBe(true);
    expect(checkBlock(numeric(), '9').correct).toBe(false);
  });

  it('нүдтэй ([a][bc]) тоон хариу — цифр бүрээр', () => {
    const b = numeric({ statement: 'Хариу [a], [bc]', answer: '312' });
    expect(checkBlock(b, '312').correct).toBe(true);
    expect(checkBlock(b, '12').correct).toBe(false);
  });

  it('түлхүүргүй блок дүгнэгдэхгүй (null)', () => {
    expect(checkBlock(choice({ answer: null }), 'A').correct).toBeNull();
  });
});

describe('problemInput — нийтлэх Problem', () => {
  it('сонголттой → choiceOptions + яг нэг зөв', () => {
    const input = problemInput(choice({ answer: 'B' }), 'ch1', 'ND-X-1-01');
    expect(input.format).toBe(ProblemFormat.CHOICE);
    expect(input).toMatchObject({ chapterId: 'ch1', token: 'ND-X-1-01' });
    const opts = (input as { choiceOptions: { isCorrect: boolean }[] })
      .choiceOptions;
    expect(opts.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(opts[1].isCorrect).toBe(true);
    expect(input.tags).toEqual([
      { type: TagType.SUBTOPIC, name: 'Квадрат тэгшитгэл' },
    ]);
  });

  it('сонголт зурагт → placeholder үсэг + үсгэн түлхүүр', () => {
    const input = problemInput(
      choice({ choices: ['', '', '', ''], answer: 'D', imageKey: 'k.png' }),
      'ch1',
      't',
    );
    expect(input).toMatchObject({
      choices: ['A', 'B', 'C', 'D'],
      correctAnswer: 'D',
      imageKey: 'k.png',
    });
  });

  it('тоон → FILL_NUMBER, канон утга', () => {
    const input = problemInput(numeric({ answer: '4,5' }), 'ch1', 't');
    expect(input).toMatchObject({
      format: ProblemFormat.FILL_NUMBER,
      correctAnswer: '4.5',
    });
  });

  it('token давтан нийтлэлтэд давхцахгүй', () => {
    expect(problemToken('cmabcdef123456', 1, 2)).toBe('ND-123456-1-03');
    expect(problemToken('cmabcdef123456', 2, 2)).not.toBe(
      problemToken('cmabcdef123456', 1, 2),
    );
  });
});

describe('түүхийн товч бичвэр', () => {
  it('өөрчлөгдсөн талбар ба нэгтгэл', () => {
    const fields = changedFields(choice(), { answer: 'B', statement: choice().statement });
    expect(fields).toEqual(['answer']);
    const summary = editSummary(3, ['statement', 'answer']);
    expect(summary).toBe('3-р бодлогын өгүүлбэр, хариу зассан');
    expect(fieldsFromSummary(summary)).toEqual(['statement', 'answer']);
    expect(editSummary(2, [...fieldsFromSummary(summary), 'imageKey'])).toBe(
      '2-р бодлогын өгүүлбэр, хариу, зураг зассан',
    );
  });

  it('нэр: овгийн үсэг + нэр', () => {
    expect(shortPersonName('Баасанжав', 'О.')).toBe('О. Баасанжав');
    expect(shortPersonName('Өсөхбаяр', 'Батболд')).toBe('Б. Өсөхбаяр');
  });
});
