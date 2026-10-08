import {
  generate,
  fromId,
  gradeGenerated,
  parseRational,
  verify,
} from './generator';
import { verifyAdvanced } from './advanced-templates';
describe('bounded vector and polynomial exact templates — independent oracles', () => {
  for (const family of [
    'vector-dot',
    'derivative-value',
    'integral-definite',
  ] as const)
    it(`${family}: 4000 seeds and uint32 extremes`, () => {
      for (const seed of [
        ...Array.from({ length: 4000 }, (_, i) => i),
        2147483647,
        2147483648,
        4294967295,
      ]) {
        const problem = generate(family, seed),
          c = problem.coefficients,
          answer = parseRational(problem.answers[0])!;
        expect(generate(family, seed)).toEqual(problem);
        expect(fromId(problem.id)).toEqual(problem);
        expect(gradeGenerated(problem, problem.answers[0])).toBe(true);
        expect(
          gradeGenerated(problem, `${answer.n * 2n}/${answer.d * 2n}`),
        ).toBe(true);
        expect(gradeGenerated(problem, '999999999999')).toBe(false);
        if (family === 'vector-dot') {
          let dot = 0n;
          for (let coordinate = 0; coordinate < 3; coordinate++)
            dot += BigInt(c[coordinate]) * BigInt(c[coordinate + 3]);
          expect(answer.n).toBe(dot * answer.d);
          expect(c.every((x) => Number.isInteger(x) && x >= -8 && x <= 8)).toBe(
            true,
          );
        } else if (family === 'derivative-value') {
          // Differentiate each coefficient, evaluate by repeated multiplication.
          let total = 0n;
          for (let power = 1; power < c.length - 1; power++) {
            let term = BigInt(c[power + 1] * power);
            for (let i = 0; i < power - 1; i++) term *= BigInt(c[0]);
            total += term;
          }
          expect(answer.n).toBe(total * answer.d);
          expect(c.length).toBeLessThanOrEqual(6);
          expect(Math.abs(c[0])).toBeLessThanOrEqual(3);
        } else {
          // Fixed common denominator 12 covers powers 1..4; no production fraction/Horner code.
          let numerator = 0n;
          for (let power = 1; power <= c.length - 2; power++) {
            let high = 1n,
              low = 1n;
            for (let i = 0; i < power; i++) {
              high *= BigInt(c[1]);
              low *= BigInt(c[0]);
            }
            numerator +=
              BigInt(c[power + 1]) * (high - low) * (12n / BigInt(power));
          }
          expect(answer.n * 12n).toBe(numerator * answer.d);
          expect(c.length).toBeLessThanOrEqual(6);
          expect(Math.abs(c[0])).toBeLessThanOrEqual(4);
          expect(Math.abs(c[1])).toBeLessThanOrEqual(4);
        }
        expect(verify(family, c, answer)).toBe(true);
      }
    });
  it('constant/zero derivative, rational integral, reversed/equal bounds and zero dot product', () => {
    expect(verifyAdvanced('derivative-value', [-3, 9], { n: 0n, d: 1n })).toBe(
      true,
    );
    expect(
      verifyAdvanced('derivative-value', [3, 0, 0, 0, 0, 9], {
        n: 972n,
        d: 1n,
      }),
    ).toBe(true);
    expect(
      verifyAdvanced('integral-definite', [-4, 4, 0, 0, 1, 0], {
        n: 128n,
        d: 3n,
      }),
    ).toBe(true);
    expect(
      verifyAdvanced('integral-definite', [4, -4, 0, 0, 1, 0], {
        n: -128n,
        d: 3n,
      }),
    ).toBe(true);
    expect(
      verifyAdvanced('integral-definite', [4, 4, -9, 9, 9, 9], {
        n: 0n,
        d: 1n,
      }),
    ).toBe(true);
    expect(
      verifyAdvanced('vector-dot', [8, -8, 0, 8, 8, 0], { n: 0n, d: 1n }),
    ).toBe(true);
  });
  it('rejects unsupported advanced answers and ID aliases', () => {
    const p = generate('integral-definite', 1);
    for (const input of ['sqrt(2)', '1e-3', 'x^2', '\\frac{1}{2}', '1/0'])
      expect(() => gradeGenerated(p, input)).toThrow();
    for (const id of [
      'lab-v1:derivative:1',
      'lab-v1:vector-dot:-1',
      'lab-v1:integral-definite:4294967296',
      'lab-v1:derivative-value:01',
    ])
      expect(() => fromId(id)).toThrow();
  });
});
