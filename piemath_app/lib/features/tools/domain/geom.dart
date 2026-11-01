// Хавтгайн геометрийн цэвэр функцууд — вэбийн `plane/geom.ts`-ийн порт.
// Координат математикийнх (y дээш). Өнцөг: градус гэж заагаагүй бол радиан.
import 'dart:math' as math;

const double eps = 1e-9;

class Pt {
  const Pt(this.x, this.y);
  final double x;
  final double y;

  Pt operator +(Pt o) => Pt(x + o.x, y + o.y);
  Pt operator -(Pt o) => Pt(x - o.x, y - o.y);
  Pt operator *(double k) => Pt(x * k, y * k);

  @override
  bool operator ==(Object other) => other is Pt && other.x == x && other.y == y;

  @override
  int get hashCode => Object.hash(x, y);

  @override
  String toString() => 'Pt($x, $y)';
}

double dot(Pt a, Pt b) => a.x * b.x + a.y * b.y;
double cross(Pt a, Pt b) => a.x * b.y - a.y * b.x;
double len(Pt a) => math.sqrt(a.x * a.x + a.y * a.y);
double dist(Pt a, Pt b) => len(a - b);
Pt mid(Pt a, Pt b) => Pt((a.x + b.x) / 2, (a.y + b.y) / 2);
Pt lerp(Pt a, Pt b, double t) => Pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
Pt perp(Pt a) => Pt(-a.y, a.x);
Pt norm(Pt a) {
  final l = len(a);
  return l < eps ? const Pt(0, 0) : Pt(a.x / l, a.y / l);
}

Pt polar(Pt c, double r, double rad) => Pt(c.x + r * math.cos(rad), c.y + r * math.sin(rad));
double toRad(double deg) => deg * math.pi / 180;
double toDeg(double rad) => rad * 180 / math.pi;

/// B оройн өнцөг (радиан, [0, pi]).
double angleAt(Pt a, Pt b, Pt c) {
  final u = a - b, v = c - b;
  final lu = len(u), lv = len(v);
  if (lu < eps || lv < eps) return double.nan;
  return math.acos((dot(u, v) / (lu * lv)).clamp(-1.0, 1.0));
}

/// Гауссын томьёо: цагийн зүүний эсрэг дараалал бол эерэг.
double signedArea(List<Pt> pts) {
  var s = 0.0;
  for (var i = 0; i < pts.length; i++) {
    final a = pts[i], b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

double polygonArea(List<Pt> pts) => signedArea(pts).abs();

double perimeter(List<Pt> pts, {bool closed = true}) {
  var s = 0.0;
  final n = closed ? pts.length : pts.length - 1;
  for (var i = 0; i < n; i++) {
    s += dist(pts[i], pts[(i + 1) % pts.length]);
  }
  return s;
}

Pt centroidOf(List<Pt> pts) {
  var x = 0.0, y = 0.0;
  for (final p in pts) {
    x += p.x;
    y += p.y;
  }
  return Pt(x / pts.length, y / pts.length);
}

/* ---------------- Гурвалжин ---------------- */

/// Герон. Гурвалжин үүсэхгүй бол NaN.
double heron(double a, double b, double c) {
  final p = (a + b + c) / 2;
  final q = p * (p - a) * (p - b) * (p - c);
  if (q < -eps) return double.nan;
  return math.sqrt(math.max(0, q));
}

/// Косинусын теорем: b, c ба хоорондох өнцөг (градус) → эсрэг тал.
double cosineSide(double b, double c, double angleDeg) =>
    math.sqrt(math.max(0, b * b + c * c - 2 * b * c * math.cos(toRad(angleDeg))));

/// a талын эсрэг өнцөг (градус).
double cosineAngle(double a, double b, double c) =>
    toDeg(math.acos(((b * b + c * c - a * a) / (2 * b * c)).clamp(-1.0, 1.0)));

/// Шийдсэн гурвалжин: a=BC, b=CA, c=AB; A, B, C — оройн өнцөг (градус).
class Tri {
  const Tri({required this.a, required this.b, required this.c, required this.A, required this.B, required this.C});
  final double a, b, c;
  // ignore: non_constant_identifier_names
  final double A, B, C;
}

/// Гурвалжин шийдсэн үр дүн: [tri] эсвэл монгол [reason].
class TriResult {
  const TriResult.ok(Tri this.tri, {this.alt}) : reason = null, tex = null;
  const TriResult.bad(String this.reason, [this.tex]) : tri = null, alt = null;
  final Tri? tri;
  final Tri? alt;
  final String? reason;
  final String? tex;
  bool get ok => tri != null;
}

bool _pos(List<double> xs) => xs.every((x) => x.isFinite && x > 0);
String _r3(double x) {
  final v = double.parse(x.toStringAsFixed(3));
  return v == v.roundToDouble() ? v.toInt().toString() : v.toString();
}

TriResult solveSSS(double a, double b, double c) {
  if (!_pos([a, b, c])) return const TriResult.bad('Талын урт эерэг тоо байх ёстой');
  final s = [a, b, c]..sort();
  if (s[0] + s[1] <= s[2] * (1 + 1e-12)) {
    return TriResult.bad(
      'Хамгийн урт тал нь нөгөө хоёрын нийлбэрээс бага байх ёстой',
      '${_r3(s[0])}+${_r3(s[1])}${(s[0] + s[1] - s[2]).abs() < 1e-12 ? '=' : '<'}${_r3(s[2])}',
    );
  }
  final aA = cosineAngle(a, b, c), bB = cosineAngle(b, c, a);
  return TriResult.ok(Tri(a: a, b: b, c: c, A: aA, B: bB, C: 180 - aA - bB));
}

/// 2 тал (b, c) ба хоорондох өнцөг A.
TriResult solveSAS(double b, double aA, double c) {
  if (!_pos([b, c])) return const TriResult.bad('Талын урт эерэг тоо байх ёстой');
  if (!(aA > 0 && aA < 180)) {
    return const TriResult.bad('Өнцөг 0-ээс их, 180-аас бага байх ёстой', r'0^\circ<\angle A<180^\circ');
  }
  final a = cosineSide(b, c, aA);
  final bB = cosineAngle(b, c, a);
  return TriResult.ok(Tri(a: a, b: b, c: c, A: aA, B: bB, C: 180 - aA - bB));
}

/// 2 өнцөг (B, C) ба тэдгээрийн хоорондох тал a.
TriResult solveASA(double bB, double a, double cC) {
  if (!_pos([a])) return const TriResult.bad('Талын урт эерэг тоо байх ёстой');
  if (!(bB > 0 && cC > 0)) return const TriResult.bad('Өнцөг эерэг байх ёстой');
  if (bB + cC >= 180) {
    return TriResult.bad(
      'Хоёр өнцгийн нийлбэр 180-аас бага байх ёстой',
      '${_r3(bB)}^\\circ+${_r3(cC)}^\\circ\\ge 180^\\circ',
    );
  }
  final aA = 180 - bB - cC;
  final k = a / math.sin(toRad(aA));
  return TriResult.ok(Tri(a: a, b: k * math.sin(toRad(bB)), c: k * math.sin(toRad(cC)), A: aA, B: bB, C: cC));
}

/// 2 өнцөг (A, B) ба A-гийн эсрэг тал a.
TriResult solveAAS(double aA, double bB, double a) {
  if (!_pos([a])) return const TriResult.bad('Талын урт эерэг тоо байх ёстой');
  if (!(aA > 0 && bB > 0)) return const TriResult.bad('Өнцөг эерэг байх ёстой');
  if (aA + bB >= 180) {
    return TriResult.bad(
      'Хоёр өнцгийн нийлбэр 180-аас бага байх ёстой',
      '${_r3(aA)}^\\circ+${_r3(bB)}^\\circ\\ge 180^\\circ',
    );
  }
  final cC = 180 - aA - bB;
  final k = a / math.sin(toRad(aA));
  return TriResult.ok(Tri(a: a, b: k * math.sin(toRad(bB)), c: k * math.sin(toRad(cC)), A: aA, B: bB, C: cC));
}

/// 2 тал (a, b) ба a-гийн эсрэг өнцөг A — 0, 1 эсвэл 2 шийд ([TriResult.alt]).
TriResult solveSSA(double a, double b, double aA) {
  if (!_pos([a, b])) return const TriResult.bad('Талын урт эерэг тоо байх ёстой');
  if (!(aA > 0 && aA < 180)) return const TriResult.bad('Өнцөг 0-ээс их, 180-аас бага байх ёстой');
  final sinB = b * math.sin(toRad(aA)) / a;
  if (sinB > 1 + 1e-12) {
    return TriResult.bad(
      'Синусын теоремоор sin B нь 1-ээс их гарч байна',
      '\\sin B=\\frac{b\\sin A}{a}=${_r3(sinB)}>1',
    );
  }
  final b1 = (sinB - 1).abs() <= 1e-9 ? 90.0 : toDeg(math.asin(math.min(1, sinB)));
  Tri? make(double bB) {
    final cC = 180 - aA - bB;
    if (cC <= 1e-9) return null;
    final k = a / math.sin(toRad(aA));
    return Tri(a: a, b: b, c: k * math.sin(toRad(cC)), A: aA, B: bB, C: cC);
  }

  final t1 = make(b1);
  final b2 = 180 - b1;
  final t2 = (sinB - 1).abs() > 1e-9 && (b2 - b1).abs() > 1e-9 ? make(b2) : null;
  if (t1 == null && t2 == null) return const TriResult.bad('Өнцгүүдийн нийлбэр 180-аас хэтэрч байна');
  if (t1 != null && t2 != null) return TriResult.ok(t1, alt: t2);
  return TriResult.ok((t1 ?? t2)!);
}

/// Тал → оройн байрлал: B=(0,0), C=(a,0), A дээд талд.
({Pt A, Pt B, Pt C}) placeTriangle(double a, double b, double c) {
  final x = (c * c - b * b + a * a) / (2 * a);
  final y = math.sqrt(math.max(0, c * c - x * x));
  return (A: Pt(x, y), B: const Pt(0, 0), C: Pt(a, 0));
}

Pt centroid(Pt a, Pt b, Pt c) => Pt((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3);

Pt? circumcenter(Pt a, Pt b, Pt c) {
  final d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (d.abs() < eps) return null;
  final a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  return Pt(
    (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d,
    (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d,
  );
}

Pt incenter(Pt pa, Pt pb, Pt pc) {
  final a = dist(pb, pc), b = dist(pc, pa), c = dist(pa, pb), s = a + b + c;
  return Pt((a * pa.x + b * pb.x + c * pc.x) / s, (a * pa.y + b * pb.y + c * pc.y) / s);
}

Pt? orthocenter(Pt a, Pt b, Pt c) {
  final o = circumcenter(a, b, c);
  if (o == null) return null;
  return Pt(a.x + b.x + c.x - 2 * o.x, a.y + b.y + c.y - 2 * o.y);
}

double inradius(double a, double b, double c) => heron(a, b, c) / ((a + b + c) / 2);
double circumradius(double a, double b, double c) => a * b * c / (4 * heron(a, b, c));
double heightTo(double a, double b, double c) => 2 * heron(a, b, c) / a;
double medianTo(double a, double b, double c) => 0.5 * math.sqrt(math.max(0, 2 * b * b + 2 * c * c - a * a));
double bisectorTo(double a, double b, double c) =>
    math.sqrt(math.max(0, b * c * ((b + c) * (b + c) - a * a))) / (b + c);

/// P цэгээс AB шулуун руу буулгасан перпендикулярын суурь.
Pt foot(Pt p, Pt a, Pt b) {
  final d = b - a;
  final l2 = dot(d, d);
  if (l2 < eps) return a;
  return a + d * (dot(p - a, d) / l2);
}

double paramOn(Pt p, Pt a, Pt b) {
  final d = b - a;
  final l2 = dot(d, d);
  return l2 < eps ? 0 : dot(p - a, d) / l2;
}

double distToSegment(Pt p, Pt a, Pt b) => dist(p, lerp(a, b, paramOn(p, a, b).clamp(0.0, 1.0)));

double distToLine(Pt p, Pt p0, Pt d) {
  final l = len(d);
  return l < eps ? dist(p, p0) : cross(d, p - p0).abs() / l;
}

/// Биссектрисийн суурь: BC-г AB:AC харьцаагаар хуваана.
Pt bisectorFoot(Pt a, Pt b, Pt c) {
  final cl = dist(a, b), bl = dist(a, c);
  return lerp(b, c, cl / (bl + cl));
}

/* ---------------- Огтлолцол ---------------- */

({Pt p, double t, double u})? lineLine(Pt p1, Pt d1, Pt p2, Pt d2) {
  final den = cross(d1, d2);
  if (den.abs() < eps * math.max(1, len(d1) * len(d2))) return null;
  final w = p2 - p1;
  final t = cross(w, d2) / den;
  final u = cross(w, d1) / den;
  return (p: p1 + d1 * t, t: t, u: u);
}

List<({Pt p, double t})> lineCircle(Pt p, Pt d, Pt c, double r) {
  final f = p - c;
  final qa = dot(d, d), qb = 2 * dot(f, d), qc = dot(f, f) - r * r;
  if (qa < eps) return const [];
  final disc = qb * qb - 4 * qa * qc;
  final tol = 1e-9 * math.max(1, qb * qb);
  if (disc < -tol) return const [];
  if (disc.abs() <= tol) {
    final t = -qb / (2 * qa);
    return [(p: p + d * t, t: t)];
  }
  final s = math.sqrt(disc);
  final t1 = (-qb - s) / (2 * qa), t2 = (-qb + s) / (2 * qa);
  return [(p: p + d * t1, t: t1), (p: p + d * t2, t: t2)];
}

List<Pt> circleCircle(Pt c1, double r1, Pt c2, double r2) {
  final d = dist(c1, c2);
  if (d < eps) return const [];
  if (d > r1 + r2 + 1e-9 || d < (r1 - r2).abs() - 1e-9) return const [];
  final a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  final h2 = r1 * r1 - a * a;
  final e = norm(c2 - c1);
  final m = c1 + e * a;
  if (h2 <= 1e-12) return [m];
  final h = math.sqrt(h2);
  final n = perp(e);
  return [m + n * h, m - n * h];
}

List<Pt> tangentPoints(Pt p, Pt c, double r) {
  final d = dist(p, c);
  if (d < r - 1e-9) return const [];
  if ((d - r).abs() <= 1e-9) return [p];
  return circleCircle(c, r, mid(c, p), d / 2);
}

double tangentLength(double d, double r) => math.sqrt(math.max(0, d * d - r * r));

/* ---------------- Зөв олон өнцөгт, тойрог ---------------- */

class RegularPolygon {
  const RegularPolygon({
    required this.n,
    required this.a,
    required this.R,
    required this.r,
    required this.P,
    required this.S,
    required this.interior,
    required this.central,
    required this.pts,
  });
  final int n;
  final double a;
  // ignore: non_constant_identifier_names
  final double R;
  final double r;
  // ignore: non_constant_identifier_names
  final double P, S;
  final double interior, central;
  final List<Pt> pts;
}

/// n өнцөгт, тал a: төв (0,0), доод тал хэвтээ.
RegularPolygon regularPolygon(int n, double a) {
  final bigR = a / (2 * math.sin(math.pi / n));
  final r = a / (2 * math.tan(math.pi / n));
  final start = -math.pi / 2 - math.pi / n;
  final pts = [for (var i = 0; i < n; i++) polar(const Pt(0, 0), bigR, start + 2 * math.pi * i / n)];
  return RegularPolygon(
    n: n,
    a: a,
    R: bigR,
    r: r,
    P: n * a,
    S: n * a * a / (4 * math.tan(math.pi / n)),
    interior: 180 * (n - 2) / n,
    central: 360 / n,
    pts: pts,
  );
}

double chordLength(double r, double deg) => 2 * r * math.sin(toRad(deg) / 2);
double arcLength(double r, double deg) => math.pi * r * deg / 180;
double sectorArea(double r, double deg) => math.pi * r * r * deg / 360;
double segmentArea(double r, double deg) => 0.5 * r * r * (toRad(deg) - math.sin(toRad(deg)));

/// Параллелограмм: a=AB, b=AD, alpha=A → A, B, C, D.
List<Pt> parallelogram(double a, double b, double alphaDeg) {
  final d = polar(const Pt(0, 0), b, toRad(alphaDeg));
  return [const Pt(0, 0), Pt(a, 0), Pt(a + d.x, d.y), d];
}

/// Трапецын оройнууд: A(0,0), B(p,h), C(p+b,h), D(a,0).
List<Pt> trapezoidPts(double a, double b, double p, double h) => [const Pt(0, 0), Pt(p, h), Pt(p + b, h), Pt(a, 0)];

/// Хажуу талаар (c = AB, d = CD): B = (p, h). Үүсэхгүй бол null.
({double p, double h})? trapezoidFromLegs(double a, double b, double c, double d) {
  if (!_pos([a, b, c, d]) || (a - b).abs() < 1e-12) return null;
  final e = b - a;
  final p = (d * d - c * c - e * e) / (2 * e);
  final h2 = c * c - p * p;
  if (h2 <= 1e-12) return null;
  return (p: p, h: math.sqrt(h2));
}

/* ---------------- Хүрээ ---------------- */

class Box {
  const Box(this.minX, this.minY, this.maxX, this.maxY);
  static const empty = Box(double.infinity, double.infinity, double.negativeInfinity, double.negativeInfinity);
  final double minX, minY, maxX, maxY;
  Box add(Pt p) => Box(math.min(minX, p.x), math.min(minY, p.y), math.max(maxX, p.x), math.max(maxY, p.y));
}

/// Математик хүрээг w x h пикселд pad зайтай багтаах: дэлгэц = (ox + x*s, oy - y*s).
({double s, double ox, double oy}) fitView(Box b, double w, double h, double pad) {
  if (!b.minX.isFinite) return (s: 40, ox: w / 2, oy: h / 2);
  final bw = math.max(b.maxX - b.minX, 1e-6), bh = math.max(b.maxY - b.minY, 1e-6);
  final s = math.max(1e-6, math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh));
  final cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  return (s: s, ox: w / 2 - cx * s, oy: h / 2 + cy * s);
}
