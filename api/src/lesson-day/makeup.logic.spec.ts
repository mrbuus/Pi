import {
  decodeDecisionNote,
  encodeDecisionNote,
  makeupStatus,
  normalizeVariant,
  requiredTests,
  type StatusInput,
} from './makeup.logic';

const A = { id: 'a', groupKey: 'g', variantLabel: 'A' };
const B = { id: 'b', groupKey: 'g', variantLabel: 'B' };
const C = { id: 'c', groupKey: 'g', variantLabel: 'C' };

describe('нөхөх тестийн үүрэг', () => {
  it('тасалсан/чөлөөтэй: ангид хийсэн A-гийн A ба B хоёулаа', () => {
    for (const reason of ['ABSENT', 'EXCUSED'] as const)
      expect(requiredTests(reason, [A], [A, B, C])).toEqual([
        { testId: 'a', variant: 'A', inClass: false },
        { testId: 'b', variant: 'B', inClass: false },
      ]);
  });
  it('хоцорсон: ангид хийсэн A тооцогдоно → B л', () => {
    const r = requiredTests('LATE', [A], [A, B]);
    expect(r).toEqual([
      { testId: 'a', variant: 'A', inClass: true },
      { testId: 'b', variant: 'B', inClass: false },
    ]);
    expect(
      makeupStatus({ ...base, required: r, doneTestIds: new Set(['b']), imageKeys: ['k'], submittedAt: new Date() }),
    ).toBe('DONE');
  });
  it('ангид B хийсэн бол хоцорсон сурагчид A үлдэнэ', () => {
    expect(requiredTests('LATE', [B], [A, B]).filter((t) => !t.inClass).map((t) => t.testId)).toEqual(['a']);
  });
  it('кирилл «А»/«В» хувилбарыг латинтай адил', () => {
    expect(normalizeVariant('А')).toBe('A');
    expect(normalizeVariant(' b ')).toBe('B');
    const cyr = { id: 'x', groupKey: 'h', variantLabel: 'А' };
    const lat = { id: 'y', groupKey: 'h', variantLabel: 'B' };
    expect(requiredTests('ABSENT', [cyr], [cyr, lat]).map((t) => t.testId)).toEqual(['x', 'y']);
  });
  it('хувилбаргүй тест бол өөрөө; B-гүй бүлэгт A л', () => {
    const solo = { id: 's', groupKey: null, variantLabel: null };
    expect(requiredTests('ABSENT', [solo], [])).toEqual([{ testId: 's', variant: null, inClass: false }]);
    expect(requiredTests('ABSENT', [A], [A]).map((t) => t.testId)).toEqual(['a']);
  });
  it('ижил бүлгийн хоёр тест ангид хийгдсэн ч давхардуулахгүй', () => {
    expect(requiredTests('ABSENT', [A, B], [A, B]).map((t) => t.testId)).toEqual(['a', 'b']);
    expect(requiredTests('LATE', [A, B], [A, B]).every((t) => t.inClass)).toBe(true);
  });
  it('тестгүй өдөр — зөвхөн зураг', () => {
    expect(requiredTests('ABSENT', [], [])).toEqual([]);
  });
});

const base: StatusInput = {
  required: requiredTests('ABSENT', [A], [A, B]),
  doneTestIds: new Set(),
  imageKeys: [],
  submittedAt: null,
  decision: null,
  decidedAt: null,
};

describe('нөхөх хичээлийн төлөв', () => {
  it('юу ч хийгээгүй → PENDING; хэсэгчлэн → PARTIAL; бүгд → DONE', () => {
    expect(makeupStatus(base)).toBe('PENDING');
    expect(makeupStatus({ ...base, doneTestIds: new Set(['a']) })).toBe('PARTIAL');
    expect(makeupStatus({ ...base, imageKeys: ['k'], submittedAt: new Date() })).toBe('PARTIAL');
    expect(
      makeupStatus({ ...base, imageKeys: ['k'], submittedAt: new Date(), doneTestIds: new Set(['a', 'b']) }),
    ).toBe('DONE');
  });
  it('ажилтны шийдвэр давамгайлна', () => {
    expect(makeupStatus({ ...base, decision: 'CONFIRMED' })).toBe('DONE');
    expect(makeupStatus({ ...base, decision: 'WAIVED' })).toBe('WAIVED');
  });
  it('REOPEN-оос өмнө илгээсэн зураг тооцогдохгүй', () => {
    const t0 = new Date('2026-10-10T10:00:00Z');
    const t1 = new Date('2026-10-11T10:00:00Z');
    const done = { ...base, imageKeys: ['k'], doneTestIds: new Set(['a', 'b']) };
    expect(makeupStatus({ ...done, submittedAt: t0, decision: 'REOPENED', decidedAt: t1 })).toBe('PARTIAL');
    expect(makeupStatus({ ...done, submittedAt: new Date('2026-10-12T00:00:00Z'), decision: 'REOPENED', decidedAt: t1 })).toBe('DONE');
  });
  it('шийдвэрийн тэмдэглэл кодлох/задлах', () => {
    expect(decodeDecisionNote(encodeDecisionNote('WAIVED', ' Өвчтэй '))).toEqual({ decision: 'WAIVED', text: 'Өвчтэй' });
    expect(decodeDecisionNote(encodeDecisionNote('CONFIRMED'))).toEqual({ decision: 'CONFIRMED', text: null });
    expect(decodeDecisionNote('чөлөөт бичвэр')).toEqual({ decision: null, text: 'чөлөөт бичвэр' });
    expect(decodeDecisionNote(null)).toEqual({ decision: null, text: null });
  });
});
