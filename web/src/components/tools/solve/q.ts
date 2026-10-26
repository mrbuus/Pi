/* ============================================================================
 * Рационал тоо (бутархай) — Бодогчийн бүх ЯГ тооцооны суурь.
 *
 * Тоо, хуваарь нь JS-ийн аюулгүй бүхэл (2^53) дотор байна. Хэтэрвэл ExactFail
 * шиддэг — дээд түвшин нь «ойролцоо» руу шилжинэ, хэзээ ч буруу тоо гаргахгүй.
 * ========================================================================== */

export class ExactFail extends Error {}

export interface Q {
  n: number;
  d: number;
}

export function igcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function ilcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return smul(Math.abs(a) / igcd(a, b), Math.abs(b));
}

/** Аюулгүй үржвэр: хэтэрвэл ExactFail */
export function smul(a: number, b: number): number {
  const r = a * b;
  if (!Number.isSafeInteger(r)) throw new ExactFail("overflow");
  return r;
}
function sadd(a: number, b: number): number {
  const r = a + b;
  if (!Number.isSafeInteger(r)) throw new ExactFail("overflow");
  return r;
}

export function q(n: number, d = 1): Q {
  if (!Number.isInteger(n) || !Number.isInteger(d)) {
    // аравтын бутархайг яг бутархай болгоно (0.25 → 1/4)
    const fn = decToQ(n), fd = decToQ(d);
    return div(fn, fd);
  }
  if (d === 0) throw new ExactFail("zero division");
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) throw new ExactFail("overflow");
  if (d < 0) { n = -n; d = -d; }
  const g = igcd(n, d) || 1;
  return { n: n / g, d: d / g };
}

/** Аравтын тоог (оролтоос ирсэн 0.125 г.м.) яг бутархай болгоно */
export function decToQ(x: number): Q {
  if (!Number.isFinite(x)) throw new ExactFail("inf");
  if (Number.isInteger(x)) return q(x, 1);
  const s = String(x);
  if (/e/i.test(s)) throw new ExactFail("exp notation");
  const [ip, fp = ""] = s.replace("-", "").split(".");
  if (fp.length > 12) throw new ExactFail("long decimal");
  const den = 10 ** fp.length;
  const num = Number(ip) * den + Number(fp || "0");
  return q(x < 0 ? -num : num, den);
}

export const ZERO: Q = { n: 0, d: 1 };
export const ONE: Q = { n: 1, d: 1 };

export const isZ = (a: Q) => a.n === 0;
export const isOne = (a: Q) => a.n === 1 && a.d === 1;
export const isInt = (a: Q) => a.d === 1;
export const val = (a: Q) => a.n / a.d;
export const neg = (a: Q): Q => ({ n: -a.n, d: a.d });
export const eq = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
export const sign = (a: Q) => Math.sign(a.n);

export function add(a: Q, b: Q): Q {
  if (a.d === b.d) return q(sadd(a.n, b.n), a.d);
  const l = ilcm(a.d, b.d);
  return q(sadd(smul(a.n, l / a.d), smul(b.n, l / b.d)), l);
}
export const sub = (a: Q, b: Q): Q => add(a, neg(b));
export function mul(a: Q, b: Q): Q {
  if (a.n === 0 || b.n === 0) return ZERO;
  const g1 = igcd(a.n, b.d), g2 = igcd(b.n, a.d);
  return q(smul(a.n / g1, b.n / g2), smul(a.d / g2, b.d / g1));
}
export function inv(a: Q): Q {
  if (a.n === 0) throw new ExactFail("zero division");
  return q(a.d, a.n);
}
export const div = (a: Q, b: Q): Q => mul(a, inv(b));
export function cmp(a: Q, b: Q): number {
  return sign(sub(a, b));
}
export function powQ(a: Q, k: number): Q {
  if (!Number.isInteger(k)) throw new ExactFail("non-integer power");
  if (k < 0) return powQ(inv(a), -k);
  let r = ONE, b = a;
  while (k > 0) {
    if (k & 1) r = mul(r, b);
    k >>= 1;
    if (k) b = mul(b, b);
  }
  return r;
}
export const absQ = (a: Q): Q => (a.n < 0 ? neg(a) : a);

/** LaTeX: 3, -\frac{1}{2} */
export function qTex(a: Q): string {
  if (a.d === 1) return String(a.n);
  return `${a.n < 0 ? "-" : ""}\\frac{${Math.abs(a.n)}}{${a.d}}`;
}
/** Энгийн бичвэр (ASCII): 3, -1/2 */
export function qAscii(a: Q): string {
  return a.d === 1 ? String(a.n) : `${a.n}/${a.d}`;
}

/* ---------- Бүхэл тооны туслахууд ---------- */

/** Анхны үржвэрт задлах: 360 → [[2,3],[3,2],[5,1]] */
export function factorInt(n: number): [number, number][] {
  n = Math.abs(Math.round(n));
  if (n > 1e15) throw new ExactFail("too big to factor");
  const out: [number, number][] = [];
  for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
    if (n % p === 0) {
      let e = 0;
      while (n % p === 0) { n /= p; e++; }
      out.push([p, e]);
    }
  }
  if (n > 1) out.push([n, 1]);
  return out;
}

/** Бүх эерэг хуваагч (өсөхөөр) */
export function divisors(n: number): number[] {
  n = Math.abs(n);
  if (n === 0) return [];
  let ds = [1];
  for (const [p, e] of factorInt(n)) {
    const next: number[] = [];
    for (const d of ds) {
      let pk = 1;
      for (let i = 0; i <= e; i++) { next.push(d * pk); pk *= p; }
    }
    ds = next;
  }
  return ds.sort((a, b) => a - b);
}

/** Бүхэл k-р язгуур яг байвал буцаана, үгүй бол null */
export function iroot(n: number, k: number): number | null {
  if (n < 0) {
    if (k % 2 === 0) return null;
    const r = iroot(-n, k);
    return r === null ? null : -r;
  }
  const r = Math.round(Math.pow(n, 1 / k));
  for (const c of [r - 1, r, r + 1]) if (c >= 0 && Math.pow(c, k) === n) return c;
  return null;
}

/** Рационал тооны k-р язгуур яг байвал */
export function qroot(a: Q, k: number): Q | null {
  const n = iroot(a.n, k), d = iroot(a.d, k);
  return n === null || d === null ? null : q(n, d);
}
