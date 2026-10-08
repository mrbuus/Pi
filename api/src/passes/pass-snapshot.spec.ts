import { validatePassSnapshot } from './pass-snapshot';
describe('frozen pass terms validation', () => {
  it('copies canonical bounded scope without mutable input sharing', () => {
    const input = { version: 1, durationDays: 7, scope: { testIds: ['a', 'a'] } };
    const result = validatePassSnapshot(input);
    input.scope.testIds.push('b');
    expect(result).toEqual({ version: 1, durationDays: 7, scope: { testIds: ['a'] } });
  });
  it.each([
    { version: 2, durationDays: 7, scope: {} },
    { version: 1, durationDays: 0, scope: {} },
    { version: 1, durationDays: 7, scope: { all: 'true' } },
    { version: 1, durationDays: 7, scope: { testIds: [{}] } },
    { version: 1, durationDays: 7, scope: { userId: 'other' } },
  ])('rejects malformed stored terms', terms => expect(() => validatePassSnapshot(terms)).toThrow());
});
