import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/tools/domain/figure.dart';
import 'package:piemath_app/features/tools/domain/fmt.dart';
import 'package:piemath_app/features/tools/domain/geom.dart';
import 'package:piemath_app/features/tools/domain/projection.dart';
import 'package:piemath_app/features/tools/domain/shapes.dart';
import 'package:piemath_app/features/tools/domain/solid_net.dart';
import 'package:piemath_app/features/tools/domain/solid_section.dart';
import 'package:piemath_app/features/tools/domain/solids.dart';

/// Тоон утга (2 оронтой аравтын бичлэгээс).
extension on Val {
  double get value => double.parse(RegExp(r'-?[0-9.]+').firstMatch(this.dec)!.group(0)!);
}

String tex(List<Metric> m, String name) => m.firstWhere((x) => x.name == name).tex;
String? text(List<Metric> m, String name) => m.firstWhere((x) => x.name == name).text;

Map<String, double> defaults(SolidKind k) => {for (final s in solidParams(k)) s.key: s.def};

/// Хавтгайн утга: y, alpha, beta, s.
Map<String, double> sec(SolidKind k, {double y = 0, double alpha = 0, double beta = 0, double s = 0, Map<String, double>? p}) => {
  ...(p ?? defaults(k)),
  'y': y,
  'alpha': alpha,
  'beta': beta,
  's': s,
};

double areaOf(SectionResult r) => r.metrics.firstWhere((m) => m.name == 'Огтлолын талбай').rows.first.v!.value;

void main() {
  group('тайрсан пирамид', () {
    test('n=4, a=4, b=2, h=3: V=28, S=20+12√10', () {
      final p = {'n': 4.0, 'a': 4.0, 'b': 2.0, 'h': 3.0};
      final m = solidMetrics(SolidKind.frustum, p);
      expect(tex(m, 'Эзлэхүүн'), endsWith('=28'));
      expect(tex(m, 'Апофем'), contains(r'\sqrt{10}'));
      final side = m.firstWhere((x) => x.name == 'Хажуу гадаргуун талбай').rows.first.v!.value;
      expect(side, closeTo(12 * math.sqrt(10), 0.01));
      final total = m.firstWhere((x) => x.name == 'Бүтэн гадаргуун талбай').rows.first.v!.value;
      expect(total, closeTo(20 + 12 * math.sqrt(10), 0.01));
    });

    test('суурь, дээд суурь ба бүх талсын тоо', () {
      final m = buildSolid(SolidKind.frustum, defaults(SolidKind.frustum));
      expect(m.faces.length, 6);
      expect(m.pts.keys, containsAll(['A', 'D', 'A_1', 'D_1', 'O', 'O_1']));
      expect(m.inner, [('O', 'O_1')]);
      // Дээд суурь 2/5 хэмжээтэй
      expect((m.pts['B_1']! - m.pts['A_1']!).x.abs(), closeTo(2, 0.01));
      expect(m.pts['A_1']!.y, 4);
      // 12 ирмэг, анхдагч өнцгөөс 3 нуугдсан
      final e = edgeVisibility(m, const View3());
      expect(e.length, 12);
      expect(e.values.where((x) => !x).length, 3);
    });

    test('дээд суурь доод суурьтай ижил/том бол тайлбартай алдаа', () {
      expect(solidError(SolidKind.frustum, {'n': 4, 'a': 3, 'b': 3, 'h': 2}), contains('бага'));
      expect(solidError(SolidKind.frustum, {'n': 4, 'a': 3, 'b': 5, 'h': 2}), isNotNull);
      expect(solidError(SolidKind.frustum, {'n': 4, 'a': 5, 'b': 3, 'h': 2}), isNull);
      expect(solidError(SolidKind.fcone, {'R': 2, 'r': 2, 'h': 2}), contains('бага'));
      expect(solidError(SolidKind.fcone, {'R': 3, 'r': 2, 'h': 2}), isNull);
    });
  });

  group('тайрсан конус', () {
    test('R=4, r=2, h=4: l=2√5, V=112π/3', () {
      final p = {'R': 4.0, 'r': 2.0, 'h': 4.0};
      final m = solidMetrics(SolidKind.fcone, p);
      expect(tex(m, 'Байгуулагч'), contains(r'2\sqrt{5}'));
      final v = m.firstWhere((x) => x.name == 'Эзлэхүүн').rows.first.v!.value;
      expect(v, closeTo(112 * math.pi / 3, 0.01));
      final s = m.firstWhere((x) => x.name == 'Бүтэн гадаргуун талбай').rows.first.v!.value;
      expect(s, closeTo(math.pi * (16 + 4 + 6 * math.sqrt(20)), 0.01));
      final side = m.firstWhere((x) => x.name == 'Хажуу гадаргуун талбай').rows.first.v!.value;
      expect(side, closeTo(math.pi * 6 * math.sqrt(20), 0.01));
    });

    test('R=3, r=1, h=... V-ийн томьёо: хоёр суурь ба хажуугийн нийлбэр', () {
      final p = {'R': 5.0, 'r': 2.0, 'h': 4.0};
      final m = solidMetrics(SolidKind.fcone, p);
      double g(String n) => m.firstWhere((x) => x.name == n).rows.first.v!.value;
      expect(g('Бүтэн гадаргуун талбай'), closeTo(g('Хажуу гадаргуун талбай') + g('Доод суурийн талбай') + g('Дээд суурийн талбай'), 0.01));
      expect(g('Байгуулагч'), 5);
    });

    test('загвар: model нь r2-той, size хүрээтэй', () {
      final m = buildSolid(SolidKind.fcone, {'R': 4, 'r': 2, 'h': 4});
      expect(m.kind.curved, isTrue);
      expect((m.r, m.r2, m.h), (4.0, 2.0, 4.0));
      expect(m.center.y, 2);
    });
  });

  group('дэлгэмэл', () {
    double surfaceOf(SolidKind k, Map<String, double> p) {
      final m = solidMetrics(k, p);
      final t = m.firstWhere((x) => x.name == 'Бүтэн гадаргуун талбай');
      return t.rows.first.v!.value;
    }

    double netArea(NetModel net) {
      var s = 0.0;
      for (final p in net.prims) {
        if (p is PolyPrim && p.width == 0) s += polygonArea(p.pts);
        if (p is CirclePrim && p.fill) s += math.pi * p.r * p.r;
      }
      return s;
    }

    test('бүх биетэд дэлгэмэл байна (бөмбөрцөг л үгүй), нийт талбай = гадаргуун талбай', () {
      for (final k in SolidKind.values) {
        final p = defaults(k);
        final net = buildNet(k, p);
        if (k == SolidKind.sphere) {
          expect(net, isNull);
          expect(hasNet(k), isFalse);
          continue;
        }
        expect(net, isNotNull, reason: k.name);
        expect(hasNet(k), isTrue);
        // Муруй биетэд сектор нь олон өнцөгтөөр ойролцоологдсон.
        expect(netArea(net!), closeTo(surfaceOf(k, p), surfaceOf(k, p) * 2e-3), reason: k.name);
      }
    });

    test('куб a=2: 6 нүүр, нугалах ирмэг тасархай', () {
      final net = buildNet(SolidKind.cube, {'a': 2})!;
      expect(net.faces, 6);
      final fills = net.prims.whereType<PolyPrim>().where((p) => p.width == 0).toList();
      expect(fills.length, 6);
      for (final f in fills) {
        expect(polygonArea(f.pts), closeTo(4, 0.01));
      }
      // Нугалах ирмэг: суурь 4 + дээд 1 (дамжлагатай хажуугийн ирмэг тус бүр хоёр талаасаа) = тасархай хэрчмүүд
      final dashed = net.prims.whereType<SegPrim>().where((s) => s.dash).length;
      expect(dashed, 4 * 2 + 2);
    });

    test('цилиндр r=3, h=5: тэгш өнцөгт 2πr x h, хоёр тойрог', () {
      final net = buildNet(SolidKind.cylinder, {'r': 3, 'h': 5})!;
      final rect = net.prims.whereType<PolyPrim>().first;
      final xs = rect.pts.map((p) => p.x);
      expect(xs.reduce(math.max) - xs.reduce(math.min), closeTo(6 * math.pi, 0.01));
      expect(net.prims.whereType<CirclePrim>().length, 2);
      final m = netMetrics(SolidKind.cylinder, {'r': 3, 'h': 5});
      expect(tex(m, 'Хажуугийн тэгш өнцөгт'), contains(r'6\pi'));
    });

    test('конус r=3, h=4: сектор 216°, радиус 5', () {
      final m = netMetrics(SolidKind.cone, {'r': 3, 'h': 4});
      expect(tex(m, 'Секторын өнцөг'), contains('216'));
      expect(tex(m, 'Секторын радиус (байгуулагч)'), endsWith('=5'));
      final net = buildNet(SolidKind.cone, {'r': 3, 'h': 4})!;
      // Секторын нум байгуулагчаас 5 зайд
      final sector = net.prims.whereType<PolyPrim>().first;
      for (final q in sector.pts.skip(1)) {
        expect(len(q), closeTo(5, 0.01));
      }
    });

    test('тайрсан конус R=4, r=2, h=4: θ=360(R-r)/l, том ба жижиг нум', () {
      final p = {'R': 4.0, 'r': 2.0, 'h': 4.0};
      final m = netMetrics(SolidKind.fcone, p);
      final l = math.sqrt(20);
      final th = m.firstWhere((x) => x.name == 'Секторын өнцөг').rows.first.v!.value;
      expect(th, closeTo(360 * 2 / l, 0.01));
      expect(m.firstWhere((x) => x.name == 'Том нумын радиус').rows.first.v!.value, closeTo(2 * l, 0.006));
      expect(m.firstWhere((x) => x.name == 'Жижиг нумын радиус').rows.first.v!.value, closeTo(l, 0.006));
    });

    test('пирамид/тайрсан пирамид: нүүрийн тоо, дэлгэмэлийн нийт талбай key', () {
      final m = netMetrics(SolidKind.pyramid, {'n': 5, 'a': 2, 'h': 3});
      expect(text(m, 'Нүүрийн тоо'), '6');
      expect(m.first.name, 'Дэлгэмэлийн нийт талбай');
      expect(m.first.key, isTrue);
      expect(text(netMetrics(SolidKind.frustum, defaults(SolidKind.frustum)), 'Нүүрийн тоо'), '6');
    });
  });

  group('огтлол', () {
    test('хавтгайн утгын шалгалт', () {
      expect(sectionError({'y': 1, 'alpha': 30, 'beta': 0, 's': 0}), isNull);
      expect(sectionError({'y': 1, 'alpha': 120, 'beta': 0, 's': 0}), contains('0°'));
      expect(sectionError({'y': -1, 'alpha': 30, 'beta': 0, 's': 0}), contains('сөрөг'));
      expect(sectionError({'y': double.nan, 'alpha': 30, 'beta': 0, 's': 0}), contains('бичнэ'));
      final sp = sectionParams(SolidKind.cube);
      expect(sp.map((s) => s.key), ['y', 'alpha', 'beta', 's']);
      expect(sp.first.def, 2); // куб a=4 => y = h/2
    });

    test('куб: хэвтээ огтлол - квадрат 16', () {
      final r = sectionOf(SolidKind.cube, sec(SolidKind.cube, y: 2, p: {'a': 4}));
      expect(r.name, 'Квадрат');
      expect(areaOf(r), closeTo(16, 0.006));
      expect(r.view!.pts.length, 4);
      expect(r.view!.labels, ['K', 'L', 'M', 'N']);
    });

    test('куб: 45° налуу огтлол - тэгш өнцөгт 4 x 4√2', () {
      final r = sectionOf(SolidKind.cube, sec(SolidKind.cube, y: 2, alpha: 45, p: {'a': 4}));
      expect(r.name, 'Тэгш өнцөгт');
      expect(areaOf(r), closeTo(16 * math.sqrt2, 0.006));
      expect(tex(r.metrics, 'Огтлолын талбай'), contains(r'\sqrt{2}'));
    });

    test('пирамид n=4, a=4, h=4: y=2 дээр квадрат 2x2', () {
      final p = {'n': 4.0, 'a': 4.0, 'h': 4.0};
      final r = sectionOf(SolidKind.pyramid, sec(SolidKind.pyramid, y: 2, p: p));
      expect(r.name, 'Квадрат');
      expect(areaOf(r), closeTo(4, 0.006));
    });

    test('тайрсан пирамид a=6, b=2, h=4: дунд хэвтээ огтлол 4x4', () {
      final p = {'n': 4.0, 'a': 6.0, 'b': 2.0, 'h': 4.0};
      final r = sectionOf(SolidKind.frustum, sec(SolidKind.frustum, y: 2, p: p));
      expect(r.name, 'Квадрат');
      expect(areaOf(r), closeTo(16, 0.006));
    });

    test('цилиндр: хэвтээ - тойрог 9π; 30° налуу - эллипс 9π/cos30°; босоо - тэгш өнцөгт', () {
      final p = {'r': 3.0, 'h': 5.0};
      final h = sectionOf(SolidKind.cylinder, sec(SolidKind.cylinder, y: 2, p: p));
      expect(h.name, 'Тойрог');
      expect(tex(h.metrics, 'Огтлолын талбай'), contains(r'9\pi'));
      final e = sectionOf(SolidKind.cylinder, sec(SolidKind.cylinder, y: 2.5, alpha: 30, p: p));
      expect(e.name, 'Эллипс');
      expect(areaOf(e), closeTo(9 * math.pi / math.cos(math.pi / 6), 0.006));
      // Тэнхлэгээс 1 зайд босоо хавтгай: 2*sqrt(9-1)*5
      final v = sectionOf(SolidKind.cylinder, sec(SolidKind.cylinder, y: 2, alpha: 90, s: 1, p: p));
      expect(v.name, 'Тэгш өнцөгт');
      expect(areaOf(v), closeTo(10 * math.sqrt(8), 0.006));
    });

    test('цилиндр: суурь руу гарсан налуу огтлол - эллипсийн хэсэг', () {
      final r = sectionOf(SolidKind.cylinder, sec(SolidKind.cylinder, y: 1, alpha: 60, p: {'r': 3, 'h': 5}));
      expect(r.name, 'Эллипсийн хэсэг');
      expect(areaOf(r), greaterThan(0));
    });

    test('конус r=3, h=4: y=1 хэвтээ тойрог ρ=2.25; тэнхлэгээр босоо огтлол = гурвалжин 12', () {
      final p = {'r': 3.0, 'h': 4.0};
      final c = sectionOf(SolidKind.cone, sec(SolidKind.cone, y: 1, p: p));
      expect(c.name, 'Тойрог');
      expect(areaOf(c), closeTo(math.pi * 2.25 * 2.25, 0.006));
      final t = sectionOf(SolidKind.cone, sec(SolidKind.cone, y: 1, alpha: 90, p: p));
      expect(t.name, 'Адил хажуут гурвалжин');
      expect(areaOf(t), closeTo(12, 0.006));
    });

    test('конус: налуугаас хамаарч эллипс, парабол, гипербол', () {
      final p = {'r': 3.0, 'h': 4.0}; // beta = atan(4/3) = 53.13°
      expect(sectionOf(SolidKind.cone, sec(SolidKind.cone, y: 2, alpha: 20, p: p)).name, 'Эллипс');
      expect(sectionOf(SolidKind.cone, sec(SolidKind.cone, y: 1, alpha: 53.13010235, s: 1, p: p)).name, 'Параболын хэсэг');
      expect(sectionOf(SolidKind.cone, sec(SolidKind.cone, y: 1, alpha: 80, s: 1, p: p)).name, 'Гиперболын хэсэг');
    });

    test('тайрсан конус R=4, r=2, h=4: хэвтээ ρ; тэнхлэгээр босоо огтлол = адил хажуут трапец', () {
      final p = {'R': 4.0, 'r': 2.0, 'h': 4.0};
      final c = sectionOf(SolidKind.fcone, sec(SolidKind.fcone, y: 2, p: p));
      expect(c.name, 'Тойрог');
      expect(areaOf(c), closeTo(9 * math.pi, 0.006));
      final t = sectionOf(SolidKind.fcone, sec(SolidKind.fcone, y: 2, alpha: 90, p: p));
      expect(t.name, 'Адил хажуут трапец');
      expect(areaOf(t), closeTo((8 + 4) / 2 * 4, 0.01));
    });

    test('бөмбөрцөг R=5: y=8 (төвөөс 3) дээр тойрог 16π; хүрэхгүй бол огтлол байхгүй', () {
      final p = {'R': 5.0};
      final r = sectionOf(SolidKind.sphere, sec(SolidKind.sphere, y: 8, p: p));
      expect(r.name, 'Тойрог');
      expect(areaOf(r), closeTo(16 * math.pi, 0.006));
      expect(tex(r.metrics, 'Огтлолын талбай'), contains(r'16\pi'));
      // Зурагт: төв (0,0,0) — цэгүүд төвөөс 5 зайд биш, ρ=4 зайд, y=3
      expect(r.view!.pts.every((q) => (q.y - 3).abs() < 0.01), isTrue);
      final miss = sectionOf(SolidKind.sphere, sec(SolidKind.sphere, y: 10, p: p));
      expect(miss.view, isNull);
    });

    test('хавтгай биетийг огтлохгүй', () {
      final r = sectionOf(SolidKind.cube, sec(SolidKind.cube, y: 10, p: {'a': 4}));
      expect(r.view, isNull);
      expect(r.name, 'Огтлол байхгүй');
      expect(text(r.metrics, 'Огтлол'), contains('огтлохгүй'));
    });

    test('огтлолын талууд ба периметр (куб, 45°)', () {
      final r = sectionOf(SolidKind.cube, sec(SolidKind.cube, y: 2, alpha: 45, p: {'a': 4}));
      final sides = r.metrics.firstWhere((m) => m.name == 'Огтлолын талууд').rows;
      expect(sides.length, 4);
      final per = r.metrics.firstWhere((m) => m.name == 'Огтлолын периметр').rows.first.v!.value;
      expect(per, closeTo(2 * (4 + 4 * math.sqrt2), 0.006));
    });

    test('харагдах талын нормаль: хавтгай бүр нүүр дээр байна', () {
      final r = sectionOf(SolidKind.cube, sec(SolidKind.cube, y: 2, p: {'a': 4}));
      // хэвтээ огтлолын хажуу бүр нэг талс дээр
      expect(r.view!.normals.every((n) => n.length == 1), isTrue);
    });

    test('огтлолыг нэрлэх: адил хажуут тэгш өнцөгт гурвалжин, ромб, трапец', () {
      expect(polygonName([const Vec3(0, 0, 0), const Vec3(2, 0, 0), const Vec3(0, 2, 0)]), 'Адил хажуут тэгш өнцөгт гурвалжин');
      expect(polygonName([const Vec3(0, 0, 0), const Vec3(3, 0, 0), const Vec3(0, 4, 0)]), 'Тэгш өнцөгт гурвалжин');
      expect(
        polygonName([const Vec3(0, 0, 0), const Vec3(4, 0, 0), const Vec3(3, 2, 0), const Vec3(1, 2, 0)]),
        'Адил хажуут трапец',
      );
      expect(
        polygonName([const Vec3(0, 0, 0), const Vec3(2, 0, 0), const Vec3(3, 1, 0), const Vec3(1, 1, 0)]),
        'Параллелограмм',
      );
    });
  });

  group('гурвалжны нэмэлт шугам', () {
    final p = {'a': 5.0, 'b': 4.0, 'c': 3.0};

    Built build(TriExtras e) => buildPlane(PlaneShape.triangle, p, extras: e);

    test('анхдагч: A-ын өндөр л, нэмэлтгүй', () {
      final b = build(const TriExtras());
      expect(b.prims.whereType<CirclePrim>(), isEmpty);
      expect(b.prims.whereType<SegPrim>().where((s) => s.tone == Tone.brand).length, 1);
    });

    test('медиан A-аас: уртыг 2.5 (гипотенузын медиан), хоёр хагаст зураас', () {
      final b = build(const TriExtras(median: true));
      final med = b.prims.whereType<SegPrim>().where((s) => s.tone == Tone.brand && !s.dash).single;
      expect(dist(med.a, med.b), closeTo(medianTo(5, 4, 3), 0.01));
      expect(dist(med.a, med.b), closeTo(2.5, 0.01));
      expect(b.prims.whereType<TicksPrim>().where((t) => t.n == 1).length, greaterThanOrEqualTo(2));
    });

    test('биссектрис: урт = l_a, хоёр тэнцүү өнцгийн нум', () {
      final b = build(const TriExtras(bisector: true, from: TriVertex.b));
      final seg = b.prims.whereType<SegPrim>().where((s) => s.tone == Tone.brand && !s.dash && dist(s.a, s.b) > 0).toList();
      expect(seg.map((s) => dist(s.a, s.b)).any((d) => (d - bisectorTo(4, 3, 5)).abs() < 0.01), isTrue);
    });

    test('өндөр бүх оройгоос: 3 өндөр (тэгш өнцөгт гурвалжинд 2 нь катет), H_1..H_3 шошго', () {
      final b = build(const TriExtras(height: true, from: TriVertex.all));
      final labels = b.prims.whereType<LabelPrim>().where((l) => l.text == 'H').map((l) => l.sub).toSet();
      expect(labels, {'1', '2', '3'});
      final heights = b.prims.whereType<SegPrim>().where((s) => s.tone == Tone.brand).map((s) => dist(s.a, s.b)).toList()..sort();
      expect(heights[0], closeTo(2.4, 0.01)); // C-ээс гипотенуз руу 12/5
      expect(heights[1], closeTo(3, 0.01));
      expect(heights[2], closeTo(4, 0.01));
    });

    test('багтсан тойрог r=1, багтаасан тойрог R=2.5', () {
      final b = build(const TriExtras(incircle: true, circumcircle: true));
      final cs = b.prims.whereType<CirclePrim>().toList();
      expect(cs.length, 2);
      expect(cs[0].r, closeTo(1, 0.01));
      expect(cs[1].r, closeTo(2.5, 0.01));
      expect(b.prims.whereType<LabelPrim>().map((l) => l.text), containsAll(['I', 'O']));
      // Тэгш өнцөгт гурвалжны багтаасан тойргийн төв нь гипотенузын дунд (B=(0,0), C=(5,0)).
      expect(dist(cs[1].c, const Pt(2.5, 0)), lessThan(1e-9));
      expect(dist(cs[0].c, const Pt(1, 1)) < 1.5, isTrue);
    });

    test('тэгш өнцөгт гурвалжинд ч ажиллана, usesVertex', () {
      final b = buildPlane(PlaneShape.right, {'a': 3.0, 'b': 4.0}, extras: const TriExtras(median: true, incircle: true));
      expect(b.ok, isTrue);
      expect(b.prims.whereType<CirclePrim>().length, 1);
      expect(const TriExtras().usesVertex, isFalse);
      expect(const TriExtras(bisector: true).usesVertex, isTrue);
      expect(const TriExtras(incircle: true).usesVertex, isFalse);
    });
  });
}
