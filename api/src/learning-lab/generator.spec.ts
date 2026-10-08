import {
  generate,
  gradeGenerated,
  parseRational,
  fromId,
  verify,
} from './generator';
describe('verified local templates', () => {
  for (const family of ['linear', 'quadratic', 'fractions'] as const)
    it(`${family}: 2000 seeds and uint32 extremes`, () => {
      for (const seed of [
        ...Array.from({ length: 2000 }, (_, i) => i),
        2147483647,
        2147483648,
        4294967295,
      ]) {
        const p = generate(family, seed);
        expect(generate(family, seed)).toEqual(p);
        expect(fromId(p.id)).toEqual(p);
        expect(gradeGenerated(p, p.answers.join(','))).toBe(true);
        for (const a of p.answers)
          expect(verify(family, p.coefficients, parseRational(a)!)).toBe(true);
        expect(gradeGenerated(p, '999999999999')).toBe(false);
      }
    });
  it('exact rational equivalence; no expression execution', () => {
    expect(parseRational('-2/-4')).toEqual({ n: 1n, d: 2n });
    expect(parseRational('-0.125')).toEqual({ n: -1n, d: 8n });
    for (const bad of [
      '1/0',
      'NaN',
      'Infinity',
      '1e3',
      'Math.random()',
      '2+2',
      '9'.repeat(100),
    ])
      expect(parseRational(bad)).toBeNull();
  });
  it('rejects seed aliases, boundaries and unversioned ids', () => {
    for (const seed of [-1, NaN, 1.5, 4294967296])
      expect(() => generate('linear', seed)).toThrow();
    for (const id of [
      'lab-v1:linear:01',
      'lab-v2:linear:1',
      'original-bank:1',
      'lab-v1:quadratic:4294967296',
    ])
      expect(() => fromId(id)).toThrow();
  });
  it('covers double roots, zero roots and negative coefficients', () => {
    let double = false,
      zero = false,
      negative = false;
    for (let seed = 0; seed < 5000; seed++) {
      const p = generate('quadratic', seed);
      double ||= p.answers.length === 1;
      zero ||= p.answers.includes('0');
      negative ||= p.coefficients[1] < 0;
    }
    expect([double, zero, negative]).toEqual([true, true, true]);
  });
});
