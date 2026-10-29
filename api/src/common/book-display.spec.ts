import {
  BOOK_DISPLAY_ORDER,
  bookDisplayName,
  compareBookDisplay,
  studentBookWhere,
} from './book-display';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const script = require('../../prisma/set-book-display.cjs') as {
  planBookDisplay: (
    books: {
      id: string;
      code: string;
      title: string;
      subject?: string;
      displayName?: string | null;
      displayOrder?: number | null;
      studentHidden?: boolean;
    }[],
  ) => {
    code: string;
    changed: boolean;
    data: Record<string, unknown>;
    target: { displayName: string | null; displayOrder: number | null; studentHidden: boolean };
  }[];
};

describe('book-display', () => {
  it('displayName давуу, хоосон бол title', () => {
    expect(bookDisplayName({ title: '100x100', displayName: 'Е-1' })).toBe('Е-1');
    expect(bookDisplayName({ title: '100x100', displayName: '  ' })).toBe('100x100');
    expect(bookDisplayName({ title: '100x100', displayName: null })).toBe('100x100');
    expect(bookDisplayName({ title: '100x100' })).toBe('100x100');
  });

  it('ажилтан бүгдийг, бусад нь studentHidden:false', () => {
    expect(studentBookWhere(true)).toEqual({});
    expect(studentBookWhere(false)).toEqual({ studentHidden: false });
  });

  it('дараалал: displayOrder (null сүүлд), дараа нь code', () => {
    expect(BOOK_DISPLAY_ORDER).toEqual([
      { displayOrder: { sort: 'asc', nulls: 'last' } },
      { code: 'asc' },
    ]);
    const books = [
      { code: 'ZZZ', displayOrder: null },
      { code: '300', displayOrder: 3 },
      { code: 'AAA', displayOrder: null },
      { code: '100V3', displayOrder: 1 },
    ];
    expect([...books].sort(compareBookDisplay).map((b) => b.code)).toEqual([
      '100V3',
      '300',
      'AAA',
      'ZZZ',
    ]);
  });
});

describe('set-book-display.cjs төлөвлөгөө', () => {
  const book = (code: string, extra = {}) => ({
    id: code,
    code,
    title: code,
    subject: 'MATH',
    displayName: null,
    displayOrder: null,
    studentHidden: false,
    ...extra,
  });

  it('Е-1..Е-3 нь Кирилл Е, V2/LAB/HAV/жагсаалтгүй ном нуугдана', () => {
    const plan = script.planBookDisplay(
      ['100V3', '200V3', '300', '1000', 'HG1', 'OGT', '100', '200', '100-legacy', 'HAV', '100-V3-LAB', 'X-TEST', 'PI'].map((c) => book(c)),
    );
    const by = Object.fromEntries(plan.map((p) => [p.code, p.target]));
    expect(by['100V3']).toMatchObject({ displayName: 'Е-1', displayOrder: 1, studentHidden: false });
    expect(by['200V3'].displayName).toBe('Е-2');
    expect(by['300'].displayName).toBe('Е-3');
    expect(by['1000']).toMatchObject({ displayName: '1000 бодлого', displayOrder: 4 });
    expect(by.HG1.displayOrder).toBe(5);
    expect(by.OGT.displayOrder).toBe(6);
    for (const c of ['100', '200', '100-legacy', 'HAV', '100-V3-LAB', 'X-TEST', 'PI'])
      expect(by[c].studentHidden).toBe(true);
  });

  it('идемпотент: аль хэдийн тохируулсан бол өөрчлөлтгүй', () => {
    const plan = script.planBookDisplay([
      book('100V3', { displayName: 'Е-1', displayOrder: 1 }),
      book('100', { studentHidden: true }),
    ]);
    expect(plan.every((p) => !p.changed)).toBe(true);
  });

  it('MATH биш ном нуугдахгүй (ангиар хаалттай)', () => {
    const [p] = script.planBookDisplay([book('SOCIAL', { subject: 'SOCIAL_STUDIES' })]);
    expect(p.target.studentHidden).toBe(false);
    expect(p.changed).toBe(false);
  });
});
