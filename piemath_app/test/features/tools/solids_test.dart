import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/tools/domain/figure.dart';
import 'package:piemath_app/features/tools/domain/projection.dart';
import 'package:piemath_app/features/tools/domain/solids.dart';

String tex(List<Metric> m, String name) => m.firstWhere((x) => x.name == name).tex;

void main() {
  test('куб a=2: V=8, S=24, d=2√3', () {
    final m = solidMetrics(SolidKind.cube, {'a': 2});
    expect(tex(m, 'Эзлэхүүн'), endsWith('=8'));
    expect(tex(m, 'Бүтэн гадаргуун талбай'), endsWith('=24'));
    expect(tex(m, 'Биеийн диагональ'), contains(r'2\sqrt{3}'));
  });

  test('параллелепипед 3x4x12: d=13', () {
    final m = solidMetrics(SolidKind.cuboid, {'a': 3, 'b': 4, 'c': 12});
    expect(tex(m, 'Эзлэхүүн'), endsWith('=144'));
    expect(tex(m, 'Биеийн диагональ'), endsWith('=13'));
    expect(tex(m, 'Бүтэн гадаргуун талбай'), endsWith('=192'));
  });

  test('конус r=3, h=4: l=5, V=12π, S=24π', () {
    final m = solidMetrics(SolidKind.cone, {'r': 3, 'h': 4});
    expect(tex(m, 'Байгуулагч'), endsWith('=5'));
    expect(tex(m, 'Эзлэхүүн'), contains(r'=12\pi'));
    expect(tex(m, 'Бүтэн гадаргуун талбай'), contains(r'=24\pi'));
    expect(tex(m, 'Хажуу гадаргуун талбай'), contains(r'=15\pi'));
  });

  test('цилиндр, бөмбөрцөг, призм, пирамид', () {
    final cyl = solidMetrics(SolidKind.cylinder, {'r': 2, 'h': 5});
    expect(tex(cyl, 'Эзлэхүүн'), contains(r'=20\pi'));
    expect(tex(cyl, 'Бүтэн гадаргуун талбай'), contains(r'=28\pi'));
    final sp = solidMetrics(SolidKind.sphere, {'R': 3});
    expect(tex(sp, 'Эзлэхүүн'), contains(r'=36\pi'));
    expect(tex(sp, 'Гадаргуун талбай'), contains(r'=36\pi'));
    final pr = solidMetrics(SolidKind.prism, {'n': 4, 'a': 3, 'h': 5});
    expect(tex(pr, 'Эзлэхүүн'), endsWith('=45'));
    expect(tex(pr, 'Бүтэн гадаргуун талбай'), endsWith('=78'));
    final tri = solidMetrics(SolidKind.prism, {'n': 3, 'a': 2, 'h': 1});
    expect(tex(tri, 'Эзлэхүүн'), contains(r'\sqrt{3}'));
    final py = solidMetrics(SolidKind.pyramid, {'n': 4, 'a': 6, 'h': 4});
    expect(tex(py, 'Эзлэхүүн'), endsWith('=48'));
    expect(tex(py, 'Апофем'), endsWith('=5'));
    expect(tex(py, 'Хажуу гадаргуун талбай'), endsWith('=60'));
    expect(tex(py, 'Бүтэн гадаргуун талбай'), endsWith('=96'));
  });

  test('параметрийн шалгалт', () {
    expect(solidError(SolidKind.cube, {'a': 2}), isNull);
    expect(solidError(SolidKind.cube, {'a': -1}), contains('эерэг'));
    expect(solidError(SolidKind.prism, {'n': 9, 'a': 1, 'h': 1}), contains('3-аас 8'));
    expect(solidError(SolidKind.prism, {'n': 3, 'a': double.nan, 'h': 1}), contains('утгаа бичнэ'));
  });

  test('куб: анхдагч өнцгөөс 3 талс, 3 нуугдсан ирмэг', () {
    final m = buildSolid(SolidKind.cube, {'a': 2});
    const v = View3();
    expect(faceVisibility(m, v).where((x) => x).length, 3);
    final edges = edgeVisibility(m, v);
    expect(edges.length, 12);
    expect(edges.values.where((x) => !x).length, 3);
    // Нуугдсан ирмэгүүд бүгд нэг оройд (ар доод) нийлнэ
    final hidden = edges.entries.where((e) => !e.value).map((e) => {e.key.$1, e.key.$2}).toList();
    final common = hidden.reduce((a, b) => a.intersection(b));
    expect(common.length, 1);
  });

  test('пирамид: суурь нуугдана, өндөр доторх шугам', () {
    final m = buildSolid(SolidKind.pyramid, {'n': 4, 'a': 4, 'h': 5});
    expect(faceVisibility(m, const View3()).first, isFalse);
    expect(m.inner, [('S', 'O')]);
    expect(m.edges.length, 8);
  });

  test('цилиндр: урд нум камер руу харсан, конусын шүргэгч', () {
    const v = View3();
    final (t1, t2) = frontArc(v);
    expect(t2 - t1, closeTo(math.pi, 1e-9));
    final mid = (t1 + t2) / 2;
    final cam = v.camDir;
    expect(math.cos(mid) * cam.x + math.sin(mid) * cam.z, greaterThan(0));
    final tg = coneTangents(v, 3, 4);
    expect(tg, isNotNull);
    final (a, b) = tg!;
    final m2 = (a + b) / 2;
    expect(math.cos(m2) * cam.x + math.sin(m2) * cam.z, greaterThan(0));
    // Дээрээс босоо харахад орой эллипс дотор — шүргэгчгүй
    expect(coneTangents(const View3(pitch: 1.2), 3, 0.5), isNull);
  });

  test('эргүүлэхэд pitch хязгаарлагдана', () {
    final v = const View3().rotate(0.3, 10);
    expect(v.pitch, View3.maxPitch);
    expect(const View3().rotate(0, -10).pitch, View3.minPitch);
  });
}
