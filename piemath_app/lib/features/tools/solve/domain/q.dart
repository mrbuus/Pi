// Рационал тоо (бутархай) — Бодогчийн бүх ЯГ тооцооны суурь (вэбийн `solve/q.ts`).
//
// Тоо, хуваарь нь JS-ийн аюулгүй бүхэл (2^53) дотор байна. Хэтэрвэл ExactFail
// шиддэг — дээд түвшин нь «ойролцоо» руу шилжинэ, хэзээ ч буруу тоо гаргахгүй.
import 'dart:math' as math;

import 'expr_ext.dart';

class ExactFail implements Exception {
  ExactFail([this.message = '']);
  final String message;
  @override
  String toString() => message;
}

class Q {
  const Q(this.n, this.d);
  final int n;
  final int d;
  @override
  String toString() => '$n/$d';
}

int igcd(int a, int b) {
  a = a.abs();
  b = b.abs();
  while (b != 0) {
    final t = a % b;
    a = b;
    b = t;
  }
  return a;
}

int ilcm(int a, int b) {
  if (a == 0 || b == 0) return 0;
  return smul(a.abs() ~/ igcd(a, b), b.abs());
}

/// Аюулгүй үржвэр: хэтэрвэл ExactFail.
int smul(int a, int b) {
  if (a == 0 || b == 0) return 0;
  if (a.abs() > maxSafeInt || b.abs() > maxSafeInt || a.abs() > maxSafeInt ~/ b.abs()) {
    throw ExactFail('overflow');
  }
  return a * b;
}

int _sadd(int a, int b) {
  final r = a + b;
  if (r.abs() > maxSafeInt) throw ExactFail('overflow');
  return r;
}

/// Бутархай үүсгэнэ; аравтын бутархайг яг бутархай болгоно (0.25 → 1/4).
Q q(num n, [num d = 1]) {
  if (!isInteger(n) || !isInteger(d)) {
    return qdiv(decToQ(n.toDouble()), decToQ(d.toDouble()));
  }
  if (d == 0) throw ExactFail('zero division');
  if (!isSafeInteger(n) || !isSafeInteger(d)) throw ExactFail('overflow');
  var ni = n.toInt(), di = d.toInt();
  if (di < 0) {
    ni = -ni;
    di = -di;
  }
  var g = igcd(ni, di);
  if (g == 0) g = 1;
  return Q(ni ~/ g, di ~/ g);
}

/// Аравтын тоог (оролтоос ирсэн 0.125 г.м.) яг бутархай болгоно.
Q decToQ(double x) {
  if (!x.isFinite) throw ExactFail('inf');
  if (isInteger(x)) return q(x, 1);
  final s = jsStr(x);
  if (s.toLowerCase().contains('e')) throw ExactFail('exp notation');
  final parts = s.replaceFirst('-', '').split('.');
  final ip = parts[0], fp = parts.length > 1 ? parts[1] : '';
  if (fp.length > 12) throw ExactFail('long decimal');
  final den = math.pow(10, fp.length).toDouble();
  final num0 = jsNumber(ip) * den + jsNumber(fp.isEmpty ? '0' : fp);
  return q(x < 0 ? -num0 : num0, den);
}

const Q qZero = Q(0, 1);
const Q qOne = Q(1, 1);

bool isZ(Q a) => a.n == 0;
bool isOne(Q a) => a.n == 1 && a.d == 1;
bool isIntQ(Q a) => a.d == 1;
double qval(Q a) => a.n / a.d;
Q qneg(Q a) => Q(-a.n, a.d);
bool qeq(Q a, Q b) => a.n == b.n && a.d == b.d;
int qsign(Q a) => a.n.sign;

Q qadd(Q a, Q b) {
  if (a.d == b.d) return q(_sadd(a.n, b.n), a.d);
  final l = ilcm(a.d, b.d);
  return q(_sadd(smul(a.n, l ~/ a.d), smul(b.n, l ~/ b.d)), l);
}

Q qsub(Q a, Q b) => qadd(a, qneg(b));

Q qmul(Q a, Q b) {
  if (a.n == 0 || b.n == 0) return qZero;
  final g1 = igcd(a.n, b.d), g2 = igcd(b.n, a.d);
  return q(smul(a.n ~/ g1, b.n ~/ g2), smul(a.d ~/ g2, b.d ~/ g1));
}

Q qinv(Q a) {
  if (a.n == 0) throw ExactFail('zero division');
  return q(a.d, a.n);
}

Q qdiv(Q a, Q b) => qmul(a, qinv(b));
int qcmp(Q a, Q b) => qsign(qsub(a, b));

Q powQ(Q a, int k) {
  if (k < 0) return powQ(qinv(a), -k);
  var r = qOne, b = a;
  while (k > 0) {
    if (k & 1 == 1) r = qmul(r, b);
    k >>= 1;
    if (k != 0) b = qmul(b, b);
  }
  return r;
}

Q absQ(Q a) => a.n < 0 ? qneg(a) : a;

/// LaTeX: 3, -\frac{1}{2}.
String qTex(Q a) {
  if (a.d == 1) return '${a.n}';
  return '${a.n < 0 ? '-' : ''}\\frac{${a.n.abs()}}{${a.d}}';
}

/// Энгийн бичвэр (ASCII): 3, -1/2.
String qAscii(Q a) => a.d == 1 ? '${a.n}' : '${a.n}/${a.d}';

/* ---------- Бүхэл тооны туслахууд ---------- */

/// Анхны үржвэрт задлах: 360 → [(2,3),(3,2),(5,1)].
List<(int, int)> factorInt(num n0) {
  final nd = jsRound(n0.toDouble().abs());
  if (nd > 1e15) throw ExactFail('too big to factor');
  var n = nd.toInt();
  final out = <(int, int)>[];
  for (var p = 2; p * p <= n; p += p == 2 ? 1 : 2) {
    if (n % p == 0) {
      var e = 0;
      while (n % p == 0) {
        n ~/= p;
        e++;
      }
      out.add((p, e));
    }
  }
  if (n > 1) out.add((n, 1));
  return out;
}

/// Бүх эерэг хуваагч (өсөхөөр).
List<int> divisors(int n) {
  n = n.abs();
  if (n == 0) return [];
  var ds = [1];
  for (final (p, e) in factorInt(n)) {
    final next = <int>[];
    for (final d in ds) {
      var pk = 1;
      for (var i = 0; i <= e; i++) {
        next.add(d * pk);
        pk *= p;
      }
    }
    ds = next;
  }
  ds.sort();
  return ds;
}

/// Бүхэл k-р язгуур яг байвал буцаана, үгүй бол null.
int? iroot(int n, int k) {
  if (n < 0) {
    if (k % 2 == 0) return null;
    final r = iroot(-n, k);
    return r == null ? null : -r;
  }
  final r = jsRound(math.pow(n.toDouble(), 1 / k).toDouble()).toInt();
  for (final c in [r - 1, r, r + 1]) {
    if (c >= 0 && math.pow(c.toDouble(), k) == n.toDouble()) return c;
  }
  return null;
}

/// Рационал тооны k-р язгуур яг байвал.
Q? qroot(Q a, int k) {
  final n = iroot(a.n, k), d = iroot(a.d, k);
  return n == null || d == null ? null : q(n, d);
}

/// Олон гишүүнтийн индексээр (хэтэрвэл тэг).
Q qAt(List<Q> p, int i) => i >= 0 && i < p.length ? p[i] : qZero;
