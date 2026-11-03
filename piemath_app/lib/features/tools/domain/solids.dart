// Огторгуйн биет: хэмжээ → цэгүүд, талсууд, хэмжээсийн шошго + тооцоо.
// Хөнгөн ортографик проекц (3D хөдөлгүүргүй) — нуугдсан ирмэг тасархай.
// Бүх биетийн суурь y = 0 хавтгайд, тэнхлэг нь y. Нэр сурах бичгийн дагуу:
// суурь A B C …, дээд суурь A_1 B_1 …, орой S, суурийн төв O.
import 'dart:math' as math;

import '../../../shared/math_keyboard/math_input_controller.dart';
import 'figure.dart';
import 'fmt.dart';
import 'shapes.dart' show ParamSpec;

enum SolidKind {
  cube('Куб'),
  cuboid('Тэгш өнцөгт параллелепипед'),
  prism('Зөв призм'),
  pyramid('Зөв пирамид'),
  frustum('Тайрсан пирамид'),
  cylinder('Цилиндр'),
  cone('Конус'),
  fcone('Тайрсан конус'),
  sphere('Бөмбөрцөг');

  const SolidKind(this.label);
  final String label;

  bool get curved => this == cylinder || this == cone || this == fcone || this == sphere;
}

const _n = ParamSpec('n', 'n', 'Суурийн өнцгийн тоо', 4, kind: MathInputKind.integer);

List<ParamSpec> solidParams(SolidKind k) => switch (k) {
  SolidKind.cube => const [ParamSpec('a', 'a', 'Ирмэг', 4)],
  SolidKind.cuboid => const [
    ParamSpec('a', 'a', 'Урт', 5),
    ParamSpec('b', 'b', 'Өргөн', 3),
    ParamSpec('c', 'c', 'Өндөр', 4),
  ],
  SolidKind.prism => const [
    ParamSpec('n', 'n', 'Суурийн өнцгийн тоо', 3, kind: MathInputKind.integer),
    ParamSpec('a', 'a', 'Суурийн тал', 4),
    ParamSpec('h', 'h', 'Өндөр', 6),
  ],
  SolidKind.pyramid => const [_n, ParamSpec('a', 'a', 'Суурийн тал', 4), ParamSpec('h', 'h', 'Өндөр', 5)],
  SolidKind.frustum => const [
    _n,
    ParamSpec('a', 'a', 'Доод суурийн тал', 5),
    ParamSpec('b', 'b', 'Дээд суурийн тал', 2),
    ParamSpec('h', 'h', 'Өндөр', 4),
  ],
  SolidKind.cylinder => const [ParamSpec('r', 'r', 'Радиус', 3), ParamSpec('h', 'h', 'Өндөр', 5)],
  SolidKind.cone => const [ParamSpec('r', 'r', 'Радиус', 3), ParamSpec('h', 'h', 'Өндөр', 4)],
  SolidKind.fcone => const [
    ParamSpec('R', 'R', 'Доод радиус', 4),
    ParamSpec('r', 'r', 'Дээд радиус', 2),
    ParamSpec('h', 'h', 'Өндөр', 4),
  ],
  SolidKind.sphere => const [ParamSpec('R', 'R', 'Радиус', 4)],
};

class Vec3 {
  const Vec3(this.x, this.y, this.z);
  final double x, y, z;
  Vec3 operator +(Vec3 o) => Vec3(x + o.x, y + o.y, z + o.z);
  Vec3 operator -(Vec3 o) => Vec3(x - o.x, y - o.y, z - o.z);
  Vec3 operator *(double k) => Vec3(x * k, y * k, z * k);
  double dot(Vec3 o) => x * o.x + y * o.y + z * o.z;
  Vec3 cross(Vec3 o) => Vec3(y * o.z - z * o.y, z * o.x - x * o.z, x * o.y - y * o.x);
}

/// Хэмжээсийн шошго: a-b хэрчмийн дунд (эсвэл [inner] бол биетийн дотор) үсэг.
class SolidDim {
  const SolidDim(this.a, this.b, this.letter, {this.inner = false});
  final String a, b;
  final String letter;
  final bool inner;
}

/// Зурахад бэлэн загвар. Олон талст: [faces] (гадагш чиглэлтэй эсэхийг зурагч засна).
/// Муруй биет: [curved] + [r], [h].
class SolidModel {
  const SolidModel({
    required this.kind,
    this.pts = const {},
    this.faces = const [],
    this.inner = const [],
    this.dims = const [],
    this.r = 0,
    this.r2 = 0,
    this.h = 0,
    required this.size,
  });

  final SolidKind kind;
  final Map<String, Vec3> pts;
  final List<List<String>> faces;

  /// Биетийн доторх шугам (өндөр SO) — үргэлж тасархай.
  final List<(String, String)> inner;
  final List<SolidDim> dims;
  final double r, r2, h;

  /// Хүрээний хэмжээ (масштаб тооцоход).
  final double size;

  Vec3 get center {
    if (kind == SolidKind.sphere) return const Vec3(0, 0, 0);
    if (kind.curved) return Vec3(0, h / 2, 0);
    var x = 0.0, y = 0.0, z = 0.0;
    for (final p in pts.values) {
      x += p.x;
      y += p.y;
      z += p.z;
    }
    final n = pts.length;
    return Vec3(x / n, y / n, z / n);
  }

  /// Ирмэгүүд (талсуудаас, давхардалгүй) ба тэдгээрт хамаарах талсын индексүүд.
  Map<(String, String), List<int>> get edges {
    final out = <(String, String), List<int>>{};
    for (var f = 0; f < faces.length; f++) {
      final face = faces[f];
      for (var i = 0; i < face.length; i++) {
        final a = face[i], b = face[(i + 1) % face.length];
        final key = a.compareTo(b) < 0 ? (a, b) : (b, a);
        (out[key] ??= []).add(f);
      }
    }
    return out;
  }
}

const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/// Зөв n өнцөгт y түвшинд, AB нь урд (z > 0) хэвтээ ирмэг, A зүүн талд.
List<Vec3> regularRing(int n, double side, double y) {
  final bigR = side / (2 * math.sin(math.pi / n));
  return [
    for (var i = 0; i < n; i++)
      Vec3(
        bigR * math.cos(math.pi / 2 + math.pi / n - 2 * math.pi * i / n),
        y,
        bigR * math.sin(math.pi / 2 + math.pi / n - 2 * math.pi * i / n),
      ),
  ];
}

/// Параметр буруу бол монгол тайлбар, зөв бол null.
String? solidError(SolidKind k, Map<String, double> p) {
  for (final s in solidParams(k)) {
    final v = p[s.key];
    if (v == null || !v.isFinite) return '${s.name}: утгаа бичнэ үү';
    if (s.kind == MathInputKind.integer) {
      if (v != v.roundToDouble() || v < 3 || v > 8) return 'Суурийн өнцгийн тоо 3-аас 8 хүртэлх бүхэл тоо байна';
    } else if (v <= 0) {
      return '${s.name} эерэг тоо байх ёстой';
    } else if (v > 1000) {
      return '${s.name} хэт их байна';
    }
  }
  if (k == SolidKind.frustum && p['b']! >= p['a']!) return 'Дээд суурийн тал доод суурийнхаас бага байх ёстой';
  if (k == SolidKind.fcone && p['r']! >= p['R']!) return 'Дээд радиус доод радиусаас бага байх ёстой';
  return null;
}

SolidModel buildSolid(SolidKind k, Map<String, double> p) {
  switch (k) {
    case SolidKind.cube:
    case SolidKind.cuboid:
      final a = p['a']!, b = k == SolidKind.cube ? a : p['b']!, c = k == SolidKind.cube ? a : p['c']!;
      final base = [Vec3(-a / 2, 0, b / 2), Vec3(a / 2, 0, b / 2), Vec3(a / 2, 0, -b / 2), Vec3(-a / 2, 0, -b / 2)];
      return _prismModel(
        k,
        base,
        c,
        k == SolidKind.cube
            ? const [SolidDim('A', 'B', 'a')]
            : const [SolidDim('A', 'B', 'a'), SolidDim('B', 'C', 'b'), SolidDim('B', 'B_1', 'c')],
      );
    case SolidKind.prism:
      final n = p['n']!.round(), h = p['h']!;
      return _prismModel(k, regularRing(n, p['a']!, 0), h, const [SolidDim('A', 'B', 'a'), SolidDim('B', 'B_1', 'h')]);
    case SolidKind.pyramid:
      final n = p['n']!.round(), h = p['h']!;
      final base = regularRing(n, p['a']!, 0);
      final pts = <String, Vec3>{
        for (var i = 0; i < n; i++) letters[i]: base[i],
        'S': Vec3(0, h, 0),
        'O': const Vec3(0, 0, 0),
      };
      final faces = <List<String>>[
        [for (var i = n - 1; i >= 0; i--) letters[i]],
        for (var i = 0; i < n; i++) [letters[i], letters[(i + 1) % n], 'S'],
      ];
      return SolidModel(
        kind: k,
        pts: pts,
        faces: faces,
        inner: const [('S', 'O')],
        dims: const [SolidDim('A', 'B', 'a'), SolidDim('S', 'O', 'h', inner: true)],
        size: math.max(h, p['a']! * 1.2),
      );
    case SolidKind.frustum:
      final n = p['n']!.round(), h = p['h']!;
      return _loftModel(
        k,
        regularRing(n, p['a']!, 0),
        regularRing(n, p['b']!, h),
        const [SolidDim('A', 'B', 'a'), SolidDim('A_1', 'B_1', 'b'), SolidDim('O', 'O_1', 'h', inner: true)],
        extra: {'O': const Vec3(0, 0, 0), 'O_1': Vec3(0, h, 0)},
        inner: const [('O', 'O_1')],
      );
    case SolidKind.fcone:
      return SolidModel(
        kind: k,
        r: p['R']!,
        r2: p['r']!,
        h: p['h']!,
        size: math.max(p['h']!, 2 * p['R']!),
      );
    case SolidKind.cylinder:
      return SolidModel(kind: k, r: p['r']!, h: p['h']!, size: math.max(p['h']!, 2 * p['r']!));
    case SolidKind.cone:
      return SolidModel(kind: k, r: p['r']!, h: p['h']!, size: math.max(p['h']!, 2 * p['r']!));
    case SolidKind.sphere:
      return SolidModel(kind: k, r: p['R']!, size: 2 * p['R']!);
  }
}

SolidModel _prismModel(SolidKind k, List<Vec3> base, double h, List<SolidDim> dims) =>
    _loftModel(k, base, [for (final q in base) q + Vec3(0, h, 0)], dims);

/// Доод ба дээд ижил тооны оройтой олон өнцөгт: призм, тайрсан пирамид.
SolidModel _loftModel(
  SolidKind k,
  List<Vec3> base,
  List<Vec3> top,
  List<SolidDim> dims, {
  Map<String, Vec3> extra = const {},
  List<(String, String)> inner = const [],
}) {
  final n = base.length;
  final pts = <String, Vec3>{
    for (var i = 0; i < n; i++) letters[i]: base[i],
    for (var i = 0; i < n; i++) '${letters[i]}_1': top[i],
    ...extra,
  };
  final faces = <List<String>>[
    [for (var i = n - 1; i >= 0; i--) letters[i]],
    [for (var i = 0; i < n; i++) '${letters[i]}_1'],
    for (var i = 0; i < n; i++) [letters[i], letters[(i + 1) % n], '${letters[(i + 1) % n]}_1', '${letters[i]}_1'],
  ];
  var w = 0.0, h = 0.0;
  for (final p in base) {
    w = math.max(w, math.sqrt(p.x * p.x + p.z * p.z) * 2);
  }
  for (final p in top) {
    h = math.max(h, p.y);
  }
  return SolidModel(kind: k, pts: pts, faces: faces, inner: inner, dims: dims, size: math.max(h, w));
}

/* ---------------- Тооцоо ---------------- */

/// Суурийн талбайн томьёо (зөв n өнцөгт).
(String, double) _baseArea(int n, double a, [String v = 'a']) {
  final s = n * a * a / (4 * math.tan(math.pi / n));
  final na = num(a);
  final f = switch (n) {
    3 => '\\frac{\\sqrt{3}}{4}$v^2=\\frac{\\sqrt{3}}{4}\\cdot $na^2',
    4 => '$v^2=$na^2',
    6 => '\\frac{3\\sqrt{3}}{2}$v^2=\\frac{3\\sqrt{3}}{2}\\cdot $na^2',
    _ =>
      '\\frac{n$v^2}{4\\operatorname{tg}\\frac{180^\\circ}{n}}=\\frac{$n\\cdot $na^2}{4\\operatorname{tg}${degTex(180.0 / n)}}',
  };
  return (f, s);
}

List<Metric> solidMetrics(SolidKind k, Map<String, double> p) {
  Metric m(String name, ResultRow r, {bool key = false}) => Metric(name, rows: [r], key: key);
  switch (k) {
    case SolidKind.cube:
      final a = p['a']!, na = num(a);
      return [
        m('Эзлэхүүн', lenRow('V', 'a^3=$na^3', a * a * a), key: true),
        m('Бүтэн гадаргуун талбай', lenRow('S', '6a^2=6\\cdot $na^2', 6 * a * a), key: true),
        m('Биеийн диагональ', lenRow('d', 'a\\sqrt{3}=$na\\sqrt{3}', a * math.sqrt(3)), key: true),
        m('Талсын диагональ', lenRow('d_1', 'a\\sqrt{2}=$na\\sqrt{2}', a * math.sqrt2)),
        m('Багтаасан бөмбөрцгийн радиус', lenRow('R', '\\frac{a\\sqrt{3}}{2}', a * math.sqrt(3) / 2)),
        m('Багтсан бөмбөрцгийн радиус', lenRow('r', '\\frac{a}{2}', a / 2)),
      ];
    case SolidKind.cuboid:
      final a = p['a']!, b = p['b']!, c = p['c']!;
      final na = num(a), nb = num(b), nc = num(c);
      return [
        m('Эзлэхүүн', lenRow('V', 'abc=$na\\cdot $nb\\cdot $nc', a * b * c), key: true),
        m(
          'Бүтэн гадаргуун талбай',
          lenRow('S', '2(ab+bc+ac)=2($na\\cdot $nb+$nb\\cdot $nc+$na\\cdot $nc)', 2 * (a * b + b * c + a * c)),
          key: true,
        ),
        m(
          'Биеийн диагональ',
          lenRow('d', '\\sqrt{a^2+b^2+c^2}=\\sqrt{$na^2+$nb^2+$nc^2}', math.sqrt(a * a + b * b + c * c)),
          key: true,
        ),
        m('Хажуу гадаргуун талбай', lenRow('S_{\\text{хажуу}}', '2(a+b)c=2($na+$nb)\\cdot $nc', 2 * (a + b) * c)),
        m('Суурийн диагональ', lenRow('AC', '\\sqrt{a^2+b^2}', math.sqrt(a * a + b * b))),
      ];
    case SolidKind.prism:
      final n = p['n']!.round(), a = p['a']!, h = p['h']!;
      final (f, sb) = _baseArea(n, a);
      final side = n * a * h;
      return [
        m('Эзлэхүүн', lenRow('V', 'S_{\\text{суурь}}h=${num(sb)}\\cdot ${num(h)}', sb * h), key: true),
        m(
          'Бүтэн гадаргуун талбай',
          lenRow('S', '2S_{\\text{суурь}}+S_{\\text{хажуу}}=2\\cdot ${num(sb)}+${num(side)}', 2 * sb + side),
          key: true,
        ),
        m(
          'Хажуу гадаргуун талбай',
          lenRow('S_{\\text{хажуу}}', 'nah=$n\\cdot ${num(a)}\\cdot ${num(h)}', side),
          key: true,
        ),
        m('Суурийн талбай', lenRow('S_{\\text{суурь}}', f, sb)),
        if (n == 4) m('Биеийн диагональ', lenRow('d', '\\sqrt{2a^2+h^2}', math.sqrt(2 * a * a + h * h))),
      ];
    case SolidKind.pyramid:
      final n = p['n']!.round(), a = p['a']!, h = p['h']!;
      final (f, sb) = _baseArea(n, a);
      final r = a / (2 * math.tan(math.pi / n));
      final bigR = a / (2 * math.sin(math.pi / n));
      final l = math.sqrt(h * h + r * r);
      final side = n * a * l / 2;
      return [
        m(
          'Эзлэхүүн',
          lenRow('V', '\\frac{1}{3}S_{\\text{суурь}}h=\\frac{1}{3}\\cdot ${num(sb)}\\cdot ${num(h)}', sb * h / 3),
          key: true,
        ),
        m('Бүтэн гадаргуун талбай', lenRow('S', 'S_{\\text{суурь}}+S_{\\text{хажуу}}', sb + side), key: true),
        m(
          'Хажуу гадаргуун талбай',
          lenRow('S_{\\text{хажуу}}', '\\frac{1}{2}nal=\\frac{1}{2}\\cdot $n\\cdot ${num(a)}\\cdot ${num(l)}', side),
          key: true,
        ),
        m('Апофем', lenRow('l', '\\sqrt{h^2+r^2}=\\sqrt{${num(h)}^2+${num(r)}^2}', l)),
        m(
          'Хажуу ирмэг',
          lenRow('SA', '\\sqrt{h^2+R^2}=\\sqrt{${num(h)}^2+${num(bigR)}^2}', math.sqrt(h * h + bigR * bigR)),
        ),
        m('Суурийн талбай', lenRow('S_{\\text{суурь}}', f, sb)),
        m('Суурийн багтсан тойргийн радиус', lenRow('r', '\\frac{a}{2\\operatorname{tg}\\frac{180^\\circ}{n}}', r)),
      ];
    case SolidKind.frustum:
      final n = p['n']!.round(), a = p['a']!, b = p['b']!, h = p['h']!;
      final (f1, s1) = _baseArea(n, a);
      final (f2, s2) = _baseArea(n, b, 'b');
      final tg = math.tan(math.pi / n), sn = math.sin(math.pi / n);
      final r1 = a / (2 * tg), r2 = b / (2 * tg);
      final bigR1 = a / (2 * sn), bigR2 = b / (2 * sn);
      final ap = math.sqrt(h * h + (r1 - r2) * (r1 - r2));
      final side = n * (a + b) / 2 * ap;
      final v = h / 3 * (s1 + math.sqrt(s1 * s2) + s2);
      return [
        m(
          'Эзлэхүүн',
          lenRow(
            'V',
            '\\frac{h}{3}(S_1+\\sqrt{S_1S_2}+S_2)=\\frac{${num(h)}}{3}(${num(s1)}+\\sqrt{${num(s1)}\\cdot ${num(s2)}}+${num(s2)})',
            v,
          ),
          key: true,
        ),
        m(
          'Бүтэн гадаргуун талбай',
          lenRow('S', 'S_1+S_2+S_{\\text{хажуу}}=${num(s1)}+${num(s2)}+${num(side)}', s1 + s2 + side),
          key: true,
        ),
        m(
          'Хажуу гадаргуун талбай',
          lenRow(
            'S_{\\text{хажуу}}',
            '\\frac{n(a+b)}{2}m=\\frac{$n(${num(a)}+${num(b)})}{2}\\cdot ${num(ap)}',
            side,
          ),
          key: true,
        ),
        m(
          'Апофем',
          lenRow('m', '\\sqrt{h^2+(r_1-r_2)^2}=\\sqrt{${num(h)}^2+(${num(r1)}-${num(r2)})^2}', ap),
        ),
        m(
          'Хажуу ирмэг',
          lenRow(
            'AA_1',
            '\\sqrt{h^2+(R_1-R_2)^2}=\\sqrt{${num(h)}^2+(${num(bigR1)}-${num(bigR2)})^2}',
            math.sqrt(h * h + (bigR1 - bigR2) * (bigR1 - bigR2)),
          ),
        ),
        m('Доод суурийн талбай', lenRow('S_1', f1, s1)),
        m('Дээд суурийн талбай', lenRow('S_2', f2, s2)),
      ];
    case SolidKind.fcone:
      final bigR = p['R']!, r = p['r']!, h = p['h']!;
      final nR = num(bigR), nr = num(r), nh = num(h);
      final l = math.sqrt(h * h + (bigR - r) * (bigR - r));
      final nl = num(l);
      return [
        m(
          'Эзлэхүүн',
          piRow(
            'V',
            '\\frac{\\pi h}{3}(R^2+Rr+r^2)=\\frac{\\pi\\cdot $nh}{3}($nR^2+$nR\\cdot $nr+$nr^2)',
            h * (bigR * bigR + bigR * r + r * r) / 3,
          ),
          key: true,
        ),
        m('Байгуулагч', lenRow('l', '\\sqrt{h^2+(R-r)^2}=\\sqrt{$nh^2+($nR-$nr)^2}', l), key: true),
        m(
          'Бүтэн гадаргуун талбай',
          piRow(
            'S',
            '\\pi(R^2+r^2+(R+r)l)=\\pi($nR^2+$nr^2+($nR+$nr)\\cdot $nl)',
            bigR * bigR + r * r + (bigR + r) * l,
          ),
          key: true,
        ),
        m(
          'Хажуу гадаргуун талбай',
          piRow('S_{\\text{хажуу}}', '\\pi(R+r)l=\\pi($nR+$nr)\\cdot $nl', (bigR + r) * l),
        ),
        m('Доод суурийн талбай', piRow('S_1', '\\pi R^2', bigR * bigR)),
        m('Дээд суурийн талбай', piRow('S_2', '\\pi r^2', r * r)),
      ];
    case SolidKind.cylinder:
      final r = p['r']!, h = p['h']!, nr = num(r), nh = num(h);
      return [
        m('Эзлэхүүн', piRow('V', '\\pi r^2h=\\pi\\cdot $nr^2\\cdot $nh', r * r * h), key: true),
        m('Бүтэн гадаргуун талбай', piRow('S', '2\\pi r(r+h)=2\\pi\\cdot $nr($nr+$nh)', 2 * r * (r + h)), key: true),
        m(
          'Хажуу гадаргуун талбай',
          piRow('S_{\\text{хажуу}}', '2\\pi rh=2\\pi\\cdot $nr\\cdot $nh', 2 * r * h),
          key: true,
        ),
        m('Суурийн талбай', piRow('S_{\\text{суурь}}', '\\pi r^2', r * r)),
        m('Тэнхлэг огтлолын диагональ', lenRow('d', '\\sqrt{4r^2+h^2}', math.sqrt(4 * r * r + h * h))),
      ];
    case SolidKind.cone:
      final r = p['r']!, h = p['h']!, nr = num(r), nh = num(h);
      final l = math.sqrt(r * r + h * h);
      return [
        m(
          'Эзлэхүүн',
          piRow('V', '\\frac{1}{3}\\pi r^2h=\\frac{1}{3}\\pi\\cdot $nr^2\\cdot $nh', r * r * h / 3),
          key: true,
        ),
        m('Байгуулагч', lenRow('l', '\\sqrt{r^2+h^2}=\\sqrt{$nr^2+$nh^2}', l), key: true),
        m('Бүтэн гадаргуун талбай', piRow('S', '\\pi r(r+l)=\\pi\\cdot $nr($nr+${num(l)})', r * (r + l)), key: true),
        m('Хажуу гадаргуун талбай', piRow('S_{\\text{хажуу}}', '\\pi rl=\\pi\\cdot $nr\\cdot ${num(l)}', r * l)),
        m('Суурийн талбай', piRow('S_{\\text{суурь}}', '\\pi r^2', r * r)),
      ];
    case SolidKind.sphere:
      final r = p['R']!, nr = num(r);
      return [
        m('Эзлэхүүн', piRow('V', '\\frac{4}{3}\\pi R^3=\\frac{4}{3}\\pi\\cdot $nr^3', 4 * r * r * r / 3), key: true),
        m('Гадаргуун талбай', piRow('S', '4\\pi R^2=4\\pi\\cdot $nr^2', 4 * r * r), key: true),
        m('Диаметр', lenRow('d', '2R=2\\cdot $nr', 2 * r)),
        m('Их тойргийн талбай', piRow('S_{0}', '\\pi R^2', r * r)),
      ];
  }
}
