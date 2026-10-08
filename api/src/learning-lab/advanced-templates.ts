import type { Rational } from './generator';
export type AdvancedFamily =
  | 'vector-dot'
  | 'derivative-value'
  | 'integral-definite';
const fraction = (n: bigint, d = 1n): Rational => {
  const gcd = (a: bigint, b: bigint): bigint =>
    b ? gcd(b, a % b) : a < 0n ? -a : a;
  const divisor = gcd(n, d);
  return { n: n / divisor, d: d / divisor };
};
const add = (a: Rational, b: Rational) =>
  fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const multiply = (a: Rational, n: bigint) => fraction(a.n * n, a.d);
const text = (r: Rational) => (r.d === 1n ? String(r.n) : `${r.n}/${r.d}`);
const tex = (r: Rational) =>
  r.d === 1n ? String(r.n) : `\\frac{${r.n}}{${r.d}}`;
function polynomial(coefficients: number[]): string {
  const terms = coefficients
    .map((coefficient, degree) => ({ coefficient, degree }))
    .reverse()
    .filter((t) => t.coefficient !== 0);
  if (!terms.length) return '0';
  return terms
    .map(
      ({ coefficient, degree }, i) =>
        `${coefficient < 0 ? '-' : i ? '+' : ''}${Math.abs(coefficient) === 1 && degree ? '' : Math.abs(coefficient)}${degree === 0 ? '' : degree === 1 ? 'x' : `x^{${degree}}`}`,
    )
    .join('');
}
function derivativeAt(coefficients: number[], x: number): bigint {
  let value = 0n;
  for (let degree = coefficients.length - 1; degree >= 1; degree--)
    value = value * BigInt(x) + BigInt(degree * coefficients[degree]);
  return value;
}
function primitiveAt(coefficients: number[], x: number): Rational {
  let result = fraction(0n);
  for (let degree = coefficients.length - 1; degree >= 0; degree--)
    result = add(
      multiply(result, BigInt(x)),
      fraction(BigInt(coefficients[degree]), BigInt(degree + 1)),
    );
  return multiply(result, BigInt(x));
}
export function generateAdvanced(
  family: AdvancedFamily,
  draw: (min: number, max: number) => number,
) {
  let coefficients: number[],
    statement: string,
    solution: string,
    answer: Rational;
  if (family === 'vector-dot') {
    coefficients = Array.from({ length: 6 }, () => draw(-8, 8));
    const a = coefficients.slice(0, 3),
      b = coefficients.slice(3);
    answer = fraction(
      a.reduce((sum, value, i) => sum + BigInt(value) * BigInt(b[i]), 0n),
    );
    statement = `$\\vec a=(${a.join(',')}),\\;\\vec b=(${b.join(',')})$ үед $\\vec a\\cdot\\vec b$ скаляр үржвэрийг ол.`;
    solution = `Харгалзах координатуудыг үржүүлээд нэмнэ: $\\vec a\\cdot\\vec b=${a.map((value, i) => `(${value})\\cdot(${b[i]})`).join('+')}=${tex(answer)}$.`;
  } else if (family === 'derivative-value') {
    const degree = draw(0, 4),
      c = Array.from({ length: degree + 1 }, () => draw(-9, 9)),
      x = draw(-3, 3);
    coefficients = [x, ...c];
    answer = fraction(derivativeAt(c, x));
    const derivative = c.slice(1).map((value, i) => value * (i + 1));
    statement = `$f(x)=${polynomial(c)}$ бол $f'(${x})$ утгыг ол. Олон гишүүнтийн уламжлалын илэрхийлэл биш, өгсөн цэг дэх тоон утгыг бич.`;
    solution = `Зэрэг бүрд $(x^k)'=kx^{k-1}$ дүрмийг хэрэглэнэ. $f'(x)=${polynomial(derivative)}$. $x=${x}$-ийг орлуулбал $f'(${x})=${tex(answer)}$.`;
  } else {
    const degree = draw(0, 3),
      c = Array.from({ length: degree + 1 }, () => draw(-9, 9)),
      lower = draw(-4, 4),
      upper = draw(-4, 4);
    coefficients = [lower, upper, ...c];
    const hi = primitiveAt(c, upper),
      lo = primitiveAt(c, lower);
    answer = add(hi, { n: -lo.n, d: lo.d });
    const primitive =
      c
        .flatMap((value, i) =>
          value
            ? [`${tex(fraction(BigInt(value), BigInt(i + 1)))}x^{${i + 1}}`]
            : [],
        )
        .map((term, i) => (i && !term.startsWith('-') ? `+${term}` : term))
        .join('') || '0';
    statement = `$\\int_{${lower}}^{${upper}}\\left(${polynomial(c)}\\right)\\,dx$ тодорхой интегралыг ол. Бүхэл тоо эсвэл хураасан $a/b$ хэлбэрээр хариул.`;
    solution = `$\\int x^k\\,dx=\\frac{x^{k+1}}{k+1}+C$ дүрмээр $F(x)=${primitive}$. $F(${upper})-F(${lower})=${tex(hi)}-\\left(${tex(lo)}\\right)=${tex(answer)}$.`;
  }
  return {
    coefficients,
    statement,
    solution,
    answers: [answer],
    answerText: text(answer),
  };
}
/** Verification uses power sums independently of generation's Horner evaluation. */
export function verifyAdvanced(
  family: AdvancedFamily,
  c: number[],
  r: Rational,
): boolean {
  if (family === 'vector-dot')
    return (
      r.n ===
      (BigInt(c[0]) * BigInt(c[3]) +
        BigInt(c[1]) * BigInt(c[4]) +
        BigInt(c[2]) * BigInt(c[5])) *
        r.d
    );
  if (family === 'derivative-value') {
    const x = BigInt(c[0]);
    let sum = 0n;
    for (let degree = 1; degree < c.length - 1; degree++)
      sum += BigInt(degree) * BigInt(c[degree + 1]) * x ** BigInt(degree - 1);
    return r.n === sum * r.d;
  }
  const lower = BigInt(c[0]),
    upper = BigInt(c[1]);
  let sum = fraction(0n);
  for (let degree = 0; degree < c.length - 2; degree++)
    sum = add(
      sum,
      fraction(
        BigInt(c[degree + 2]) *
          (upper ** BigInt(degree + 1) - lower ** BigInt(degree + 1)),
        BigInt(degree + 1),
      ),
    );
  return r.n * sum.d === sum.n * r.d;
}
