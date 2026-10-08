import { generateAdvanced, verifyAdvanced } from './advanced-templates';
/** Versioned, bounded templates. Exact arithmetic; deliberately not a universal solver. */
export type Family =
  | 'linear'
  | 'quadratic'
  | 'fractions'
  | 'vector-dot'
  | 'derivative-value'
  | 'integral-definite';
export type Rational = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint =>
  b ? gcd(b, a % b) : a < 0n ? -a : a;
export function rational(n: bigint, d = 1n): Rational {
  if (!d) throw new Error('zero denominator');
  const g = gcd(n, d);
  return { n: (n / g) * (d < 0n ? -1n : 1n), d: (d < 0n ? -d : d) / g };
}
export function parseRational(input: string): Rational | null {
  if (input.length > 64) return null;
  const s = input.trim();
  if (/^[+-]?\d{1,12}\/[+-]?\d{1,12}$/.test(s)) {
    const [n, d] = s.split('/').map(BigInt);
    return d ? rational(n, d) : null;
  }
  if (!/^[+-]?\d{1,12}(\.\d{1,8})?$/.test(s)) return null;
  const [whole, fraction = ''] = s.replace(/^[+-]/, '').split('.');
  const den = 10n ** BigInt(fraction.length);
  return rational(
    (BigInt(whole) * den + BigInt(fraction || '0')) *
      (s.startsWith('-') ? -1n : 1n),
    den,
  );
}
const format = (r: Rational) => (r.d === 1n ? String(r.n) : `${r.n}/${r.d}`);
export function generate(family: Family, seed: number) {
  if (
    ![
      'linear',
      'quadratic',
      'fractions',
      'vector-dot',
      'derivative-value',
      'integral-definite',
    ].includes(family) ||
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  )
    throw new Error('invalid family or seed');
  let state = seed >>> 0;
  const draw = (min: number, max: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + (state % (max - min + 1));
  };
  const id = `lab-v1:${family}:${seed}`;
  let statement: string, solution: string, answers: Rational[];
  let coefficients: number[];
  if (family === 'linear') {
    const a = draw(1, 12) * (draw(0, 1) ? 1 : -1),
      b = draw(-20, 20),
      c = draw(-30, 30);
    answers = [rational(BigInt(c - b), BigInt(a))];
    coefficients = [a, b, c];
    statement = `$${a}x ${b < 0 ? '-' : '+'} ${Math.abs(b)} = ${c}$ тэгшитгэлийг бод.`;
    solution = `$${a}x = ${c - b}$ тул $x = ${format(answers[0])}$.`;
  } else if (family === 'quadratic') {
    const r = draw(-12, 12),
      s = draw(-12, 12),
      a = draw(1, 5),
      b = -a * (r + s),
      c = a * r * s;
    answers = [...new Set([r, s])].map((n) => rational(BigInt(n)));
    coefficients = [a, b, c];
    statement = `$${a}x^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}x ${c < 0 ? '-' : '+'} ${Math.abs(c)} = 0$ тэгшитгэлийн бүх ялгаатай язгуурыг таслалаар бич.`;
    solution = `$${a}(x-(${r}))(x-(${s}))=0$ тул язгуур нь $${answers.map(format).join(', ')}$.`;
  } else if (family === 'fractions') {
    const a = draw(-20, 20),
      b = draw(1, 12),
      c = draw(-20, 20),
      d = draw(1, 12);
    answers = [rational(BigInt(a * d + c * b), BigInt(b * d))];
    coefficients = [a, b, c, d];
    statement = `$\\frac{${a}}{${b}} + \\frac{${c}}{${d}}$ нийлбэрийг ол.`;
    solution = `$\\frac{${a * d}+(${c * b})}{${b * d}} = ${format(answers[0])}$.`;
  } else {
    const advanced = generateAdvanced(family, draw);
    ({ statement, solution, coefficients, answers } = advanced);
  }
  // Verify against the equation, independently of rendered text.
  if (!answers.every((r) => verify(family, coefficients, r)))
    throw new Error('template verification failed');
  return {
    id,
    family,
    seed,
    statement,
    solution,
    coefficients,
    answers: answers.map(format),
    verification: 'exact-template-v1',
  };
}
export function verify(family: Family, c: number[], r: Rational): boolean {
  const v = c.map(BigInt),
    { n, d } = r;
  if (family === 'linear') return v[0] * n + (v[1] - v[2]) * d === 0n;
  if (family === 'quadratic')
    return v[0] * n * n + v[1] * n * d + v[2] * d * d === 0n;
  if (family === 'fractions')
    return n * v[1] * v[3] === (v[0] * v[3] + v[2] * v[1]) * d;
  return verifyAdvanced(family, c, r);
}
export function gradeGenerated(
  problem: ReturnType<typeof generate>,
  input: string,
): boolean {
  const parts = input.split(',').map(parseRational);
  if (parts.some((r) => !r))
    throw new Error(
      'Хариултаа бүхэл тоо, аравтын бутархай эсвэл a/b хэлбэрээр бичнэ үү.',
    );
  const unique = [...new Set(parts.map((r) => format(r!)))].sort();
  return JSON.stringify(unique) === JSON.stringify([...problem.answers].sort());
}
export function fromId(id: string) {
  const match =
    /^lab-v1:(linear|quadratic|fractions|vector-dot|derivative-value|integral-definite):(0|[1-9]\d{0,9})$/.exec(
      id,
    );
  if (!match) throw new Error('invalid generated id');
  return generate(match[1] as Family, Number(match[2]));
}
