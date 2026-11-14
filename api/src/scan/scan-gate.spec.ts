import { decideScanAccess, ScanGateInput } from './scan-gate';

const opensAt = new Date('2026-11-08T00:00:00Z');
const base: ScanGateInput = { staff: false, hasSolution: true, solutionVerified: true, tests: [] };

describe('decideScanAccess', () => {
  it('ажилтан үргэлж FULL', () => {
    expect(decideScanAccess({ ...base, staff: true, hasSolution: false })).toEqual({ kind: 'FULL' });
  });

  it('1000: илгээсэн + FULL түвшин → FULL', () => {
    const r = decideScanAccess({
      ...base,
      tests: [{ kind: 'THOUSAND', submitted: true, review: { level: 'FULL', opensAt: null, covered: true } }],
    });
    expect(r).toEqual({ kind: 'FULL' });
  });

  it('1000: илгээсэн, PROBLEMS түвшин → хүлээж байна (бодолт задрахгүй)', () => {
    const r = decideScanAccess({
      ...base,
      tests: [{ kind: 'THOUSAND', submitted: true, review: { level: 'PROBLEMS', opensAt: null, covered: true } }],
    });
    expect(r).toEqual({ kind: 'LOCKED', reason: 'WAITING', opensAt: null });
  });

  it('1000: илгээсэн, нээгдээгүй → хамгийн эртний нээгдэх огноо', () => {
    const later = new Date('2026-11-20T00:00:00Z');
    const r = decideScanAccess({
      ...base,
      tests: [
        { kind: 'THOUSAND', submitted: true, review: { level: 'NONE', opensAt: later, covered: true } },
        { kind: 'THOUSAND', submitted: true, review: { level: 'NONE', opensAt, covered: true } },
      ],
    });
    expect(r).toEqual({ kind: 'LOCKED', reason: 'WAITING', opensAt });
  });

  it('1000: ангид оноогдоогүй (covered=false) → өгөөгүйтэй адил', () => {
    const r = decideScanAccess({
      ...base,
      tests: [{ kind: 'THOUSAND', submitted: true, review: { level: 'NONE', opensAt: null, covered: false } }],
    });
    expect(r).toEqual({ kind: 'LOCKED', reason: 'NOT_TAKEN', opensAt: null });
  });

  it('1000: өгөөгүй → NOT_TAKEN', () => {
    const r = decideScanAccess({ ...base, tests: [{ kind: 'THOUSAND', submitted: false, review: null }] });
    expect(r).toEqual({ kind: 'LOCKED', reason: 'NOT_TAKEN', opensAt: null });
  });

  it('бусад тест: илгээсэн + VERIFIED → зөвхөн бодолт', () => {
    const r = decideScanAccess({ ...base, tests: [{ kind: 'OTHER', submitted: true }] });
    expect(r).toEqual({ kind: 'SOLUTION' });
  });

  it('бусад тест: бодолт VERIFIED биш → нээхгүй', () => {
    const r = decideScanAccess({
      ...base,
      solutionVerified: false,
      tests: [{ kind: 'OTHER', submitted: true }],
    });
    expect(r).toEqual({ kind: 'LOCKED', reason: 'NOT_TAKEN', opensAt: null });
  });

  it('бусад тест: өгөөгүй → NOT_TAKEN', () => {
    const r = decideScanAccess({ ...base, tests: [{ kind: 'OTHER', submitted: false }] });
    expect(r).toEqual({ kind: 'LOCKED', reason: 'NOT_TAKEN', opensAt: null });
  });

  it('бодолтгүй бодлого → NO_SOLUTION', () => {
    const r = decideScanAccess({ ...base, hasSolution: false, tests: [{ kind: 'OTHER', submitted: true }] });
    expect(r).toEqual({ kind: 'LOCKED', reason: 'NO_SOLUTION', opensAt: null });
  });

  it('ямар ч тестэд ороогүй → NOT_IN_TEST (QR шинэ эрх олгохгүй)', () => {
    expect(decideScanAccess(base)).toEqual({ kind: 'LOCKED', reason: 'NOT_IN_TEST', opensAt: null });
  });
});
