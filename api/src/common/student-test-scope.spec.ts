import {
  scopeGrantsTest,
  StudentTestScope,
  studentTestAccessOr,
} from './access';

const base: StudentTestScope = {
  all: false,
  classroomIds: [],
  testIds: [],
  chapterIds: [],
  bookIds: [],
  releasedChapterIds: null,
};
const NOW = new Date('2026-10-29T04:00:00Z');

describe('studentTestAccessOr — эхлүүлж болох тестийн шүүлт', () => {
  it('scope.all бол шүүлтгүй (null)', () => {
    expect(studentTestAccessOr({ ...base, all: true }, NOW)).toBeNull();
  });

  it('ангид оноосон тест зөвхөн assignedAt <= одоо', () => {
    const or = studentTestAccessOr({ ...base, classroomIds: ['c1'] }, NOW);
    expect(or).toEqual([
      {
        access: {
          some: { classroomId: { in: ['c1'] }, assignedAt: { lte: NOW } },
        },
      },
    ]);
  });

  it('BUYER/онлайн: бүлэг, номын эрх хязгааргүй', () => {
    const or = studentTestAccessOr(
      { ...base, chapterIds: ['ch1'], bookIds: ['b1'], testIds: ['t1'] },
      NOW,
    );
    expect(or).toEqual([
      { id: { in: ['t1'] } },
      { chapterId: { in: ['ch1'] } },
      { chapter: { bookId: { in: ['b1'] } } },
    ]);
  });

  it('танхимын сурагч: бүлэг, номын эрх зөвхөн нээгдсэн бүлэгт', () => {
    const or = studentTestAccessOr(
      {
        ...base,
        chapterIds: ['ch1', 'ch2'],
        bookIds: ['b1'],
        testIds: ['t1'],
        releasedChapterIds: ['ch2', 'ch9'],
      },
      NOW,
    );
    expect(or).toEqual([
      { id: { in: ['t1'] } },
      { chapterId: { in: ['ch2'] } },
      {
        AND: [
          { chapter: { bookId: { in: ['b1'] } } },
          { chapterId: { in: ['ch2', 'ch9'] } },
        ],
      },
    ]);
  });

  it('танхимын сурагч, нээгдсэн бүлэггүй: номын эрх юу ч нээхгүй', () => {
    const or = studentTestAccessOr(
      { ...base, bookIds: ['b1'], releasedChapterIds: [] },
      NOW,
    );
    expect(or).toEqual([]);
  });
});

describe('scopeGrantsTest — нэг тестийн pass/худалдан авалтын эрх', () => {
  const test = { id: 't1', chapterId: 'ch1', bookId: 'b1' };

  it('тест тус бүрийн эрх танхимын сурагчид ч хүчинтэй', () => {
    expect(
      scopeGrantsTest(
        { ...base, testIds: ['t1'], releasedChapterIds: [] },
        test,
      ),
    ).toBe(true);
  });

  it('номын эрх: онлайнд тийм, танхимынханд бүлэг нээгдээгүй бол үгүй', () => {
    expect(scopeGrantsTest({ ...base, bookIds: ['b1'] }, test)).toBe(true);
    expect(
      scopeGrantsTest(
        { ...base, bookIds: ['b1'], releasedChapterIds: [] },
        test,
      ),
    ).toBe(false);
    expect(
      scopeGrantsTest(
        { ...base, bookIds: ['b1'], releasedChapterIds: ['ch1'] },
        test,
      ),
    ).toBe(true);
  });

  it('эрхгүй бол үгүй', () => {
    expect(scopeGrantsTest(base, test)).toBe(false);
  });
});
