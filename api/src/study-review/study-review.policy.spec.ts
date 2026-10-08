import {
  normalizeStart,
  normalizeResponse,
  requestHash,
  REVIEW_CAPS,
  selectReviewItems,
  reviewEligible,
  gradeReviewNumber,
  validReviewChoice,
} from './study-review.policy';
const uuid = '2a06aa63-8f84-4ca1-8539-e425eb48c30b';
describe('persisted review input contract', () => {
  it('canonicalizes topic order and duplicates for replay, while retaining changed-budget conflicts', () => {
    const a = normalizeStart({
      clientRequestId: uuid,
      budgetMinutes: 10,
      chapterIds: ['b', 'a', 'a'],
    });
    const b = normalizeStart({
      clientRequestId: uuid,
      budgetMinutes: 10,
      chapterIds: ['a', 'b'],
    });
    expect(a).toEqual(b);
    expect(requestHash(a)).not.toBe(requestHash({ ...a, budgetMinutes: 30 }));
    expect(REVIEW_CAPS).toEqual({ 10: 5, 30: 10, 60: 20 });
  });
  it.each([0, 9, 11, Infinity, NaN, '10'])(
    'rejects invalid minute budget %s',
    (budgetMinutes) => {
      expect(() =>
        normalizeStart({
          clientRequestId: uuid,
          budgetMinutes,
          chapterIds: ['a'],
        }),
      ).toThrow();
    },
  );
  it('rejects malformed UUID, excess topics, object IDs and empty requests', () => {
    for (const body of [
      { clientRequestId: 'same', budgetMinutes: 10, chapterIds: ['a'] },
      { clientRequestId: uuid, budgetMinutes: 10, chapterIds: [] },
      {
        clientRequestId: uuid,
        budgetMinutes: 10,
        chapterIds: ['a', 'b', 'c', 'd', 'e', 'f'],
      },
      { clientRequestId: uuid, budgetMinutes: 10, chapterIds: [{}] },
    ])
      expect(() => normalizeStart(body)).toThrow();
  });
  it('allows explicit could-not, canonicalizes flags, and denies client grading/invalid answer types', () => {
    expect(
      normalizeResponse({
        clientRequestId: uuid,
        answer: '',
        flags: ['could-not'],
        kind: 'FIRST',
      }).flags,
    ).toEqual(['could-not']);
    expect(() =>
      normalizeResponse({
        clientRequestId: uuid,
        answer: { correct: true },
        kind: 'FIRST',
      }),
    ).toThrow();
    expect(() =>
      normalizeResponse({ clientRequestId: uuid, answer: '', kind: 'FIRST' }),
    ).toThrow();
    expect(() =>
      normalizeResponse({
        clientRequestId: uuid,
        answer: '1',
        flags: ['unknown'],
        kind: 'FIRST',
      }),
    ).toThrow();
    expect(() =>
      normalizeResponse({
        clientRequestId: uuid,
        answer: '1',
        kind: 'CORRECT',
      }),
    ).toThrow();
  });
  it('separates correction payload and first payload hashes', () =>
    expect(requestHash({ kind: 'FIRST', answer: '0', flags: [] })).not.toBe(
      requestHash({ kind: 'CORRECTION', answer: '0', flags: [] }),
    ));
});

describe('review topic selection', () => {
  it('interleaves each selected nonempty topic and never duplicates or exceeds the cap', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: String(i),
      chapterId: i < 8 ? 'a' : 'b',
    }));
    const picked = selectReviewItems(items, ['a', 'b', 'empty'], 123, 5);
    expect(picked.map((p) => p.chapterId)).toEqual(['a', 'b', 'a', 'b', 'a']);
    expect(new Set(picked.map((p) => p.id)).size).toBe(5);
    expect(selectReviewItems(items, ['a', 'b', 'empty'], 123, 5)).toEqual(
      picked,
    );
    expect(selectReviewItems(items, ['a', 'b'], 0, 20)).toHaveLength(12);
  });
});

describe('strict reviewed key eligibility', () => {
  const base = {
    format: 'FILL_NUMBER',
    correctAnswer: '2',
    choices: null,
    choiceOptions: [],
  };
  it('rejects missing, malformed object/array, nonfinite, text and zero-denominator numeric keys', () => {
    for (const key of [null, [], {}, true, 'x', '2/0', '', Infinity, NaN])
      expect(reviewEligible({ ...base, correctAnswer: key })).toBe(false);
    for (const key of ['0', '-2.25', '2/3', 0])
      expect(reviewEligible({ ...base, correctAnswer: key })).toBe(true);
  });
  it('permits exactly one reviewed structured choice and denies raw metadata choices', () => {
    const choice = {
      ...base,
      format: 'CHOICE',
      choices: ['one', 'two'],
      correctAnswer: 'A',
    };
    expect(reviewEligible(choice)).toBe(true);
    expect(reviewEligible({ ...choice, correctAnswer: 'Z' })).toBe(false);
    expect(
      reviewEligible({
        ...choice,
        choices: [{ text: 'one', isCorrect: true }, 'two'],
      }),
    ).toBe(false);
    const opts = [
      { order: 0, text: 'one', isCorrect: true },
      { order: 1, text: 'two', isCorrect: false },
    ];
    expect(reviewEligible({ ...choice, choiceOptions: opts })).toBe(true);
    expect(
      reviewEligible({
        ...choice,
        choiceOptions: opts.map((o) => ({ ...o, isCorrect: true })),
      }),
    ).toBe(false);
  });
});

describe('exact bounded review numeric grading', () => {
  it('accepts rational equivalents without floating approximation', () => {
    expect(gradeReviewNumber('2/3', '4/6')).toBe(true);
    expect(gradeReviewNumber('-0.125', '-1/8')).toBe(true);
    expect(gradeReviewNumber('999999999999.99999999', '1000000000000')).toBe(
      false,
    );
    expect(gradeReviewNumber('0.33333333', '1/3')).toBe(false);
    expect(gradeReviewNumber('2', '2.00000000')).toBe(true);
    expect(gradeReviewNumber('2', '2+0')).toBe(false);
  });
  it('excludes duplicate text choices and unsupported precision keys', () => {
    expect(
      reviewEligible({
        format: 'CHOICE',
        correctAnswer: 'A',
        choices: ['same', 'same'],
        choiceOptions: [],
      }),
    ).toBe(false);
    expect(
      reviewEligible({
        format: 'FILL_NUMBER',
        correctAnswer: '0.123456789',
        choices: null,
        choiceOptions: [],
      }),
    ).toBe(false);
  });
});

describe('new review choice input boundary', () => {
  it('rejects absent/malformed/outside choices before immutable evidence', () => {
    for (const answer of ['choice:9', 'choice:10', 'abc', 'A', 'choice:-1'])
      expect(validReviewChoice('TEXT', 3, answer)).toBe(false);
    expect(validReviewChoice('TEXT', 3, 'choice:2')).toBe(true);
    expect(validReviewChoice('LETTER', 3, ' c ')).toBe(true);
    for (const answer of ['D', 'choice:0', 'AA', 'abc'])
      expect(validReviewChoice('LETTER', 3, answer)).toBe(false);
  });
});
