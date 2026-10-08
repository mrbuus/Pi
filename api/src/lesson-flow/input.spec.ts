import { packetInput, receiptInput, turnInput } from './input';
describe('bounded lesson packet input', () => {
  it('rejects private fields, wrong types and oversized body components', () => {
    expect(() =>
      packetInput({ chapterId: 'c', privateNote: 'secret' }),
    ).toThrow();
    expect(() => packetInput({ chapterId: 'c', testId: 0 })).toThrow();
    expect(() =>
      packetInput({
        chapterId: 'c',
        homework: { title: 'HW', description: 'x'.repeat(10001) },
      }),
    ).toThrow();
  });
  it('keeps explicit empty theory selection and null makeup removal', () => {
    expect(
      packetInput({ chapterId: 'c', theoryBlockIds: [], makeupTestId: null }),
    ).toEqual({ chapterId: 'c', theoryBlockIds: [], makeupTestId: null });
  });
  it('requires bounded owned-file receipt shape and stable client request', () => {
    expect(() =>
      receiptInput({
        kind: 'THEORY',
        imageKeys: Array(11).fill('file'),
        clientRequestId: 'stable-id',
      }),
    ).toThrow();
    expect(() =>
      receiptInput({
        kind: 'THEORY',
        imageKeys: ['file'],
        clientRequestId: 'x',
      }),
    ).toThrow();
    expect(() =>
      receiptInput({
        kind: 'INTERNAL',
        imageKeys: ['file'],
        clientRequestId: 'stable-id',
      }),
    ).toThrow();
  });
  it('teacher override cannot omit the visible reason', () => {
    expect(() => turnInput({ studentId: 'pupil' })).toThrow();
    expect(
      turnInput({ studentId: 'pupil', reason: 'Teacher chose volunteer' }),
    ).toEqual({ studentId: 'pupil', reason: 'Teacher chose volunteer' });
    expect(turnInput({})).toEqual({ studentId: undefined, reason: undefined });
  });
});
