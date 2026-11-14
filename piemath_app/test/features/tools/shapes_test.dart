// Вэбийн plane/shapes.test.mjs-ийн порт (загварын тооцоо).
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/tools/domain/figure.dart';
import 'package:piemath_app/features/tools/domain/shapes.dart';

String tex(Built b, String name) => b.metric(name)!.tex;

void main() {
  test('тэнцүү бүлэг', () {
    expect(equalGroups([3, 4, 5]), [0, 0, 0]);
    expect(equalGroups([5, 3, 5]), [1, 0, 1]);
    expect(equalGroups([2, 2, 2]), [1, 1, 1]);
    expect(equalGroups([1, 2, 1, 2]), [1, 2, 1, 2]);
  });

  test('3-4-5 гурвалжин: талбай 6, тэгш өнцгийн тэмдэг', () {
    final b = buildPlane(PlaneShape.triangle, {'a': 5, 'b': 4, 'c': 3});
    expect(b.ok, isTrue);
    expect(tex(b, 'Талбай (Герон)'), endsWith('=6'));
    expect(tex(b, 'Периметр'), endsWith('=12'));
    expect(tex(b, 'Багтсан тойргийн радиус'), endsWith('=1'));
    expect(tex(b, 'Багтаасан тойргийн радиус'), contains(r'\frac{5}{2}'));
    expect(b.prims.any((p) => p is AnglePrim && p.right), isTrue);
    expect(b.metric('Төрөл')!.text, contains('тэгш өнцөгт'));
  });

  test('байхгүй гурвалжин — алдааны тайлбар', () {
    final b = buildPlane(PlaneShape.triangle, {'a': 1, 'b': 2, 'c': 7});
    expect(b.ok, isFalse);
    expect(b.reason!.length, greaterThan(10));
    expect(buildPlane(PlaneShape.triangle, {'a': 10, 'b': 4}, tri: TriMode.iso).ok, isFalse);
    expect(buildPlane(PlaneShape.triangle, {'B': 120, 'a': 3, 'C': 70}, tri: TriMode.asa).ok, isFalse);
    // Дутуу утга
    expect(buildPlane(PlaneShape.triangle, {'a': 5, 'b': 4, 'c': double.nan}).reason, contains('утгаа бичнэ'));
  });

  test('тусгай гурвалжнууд', () {
    final r = buildPlane(PlaneShape.right, {'a': 6, 'b': 8});
    expect(tex(r, 'Гипотенуз (Пифагор)'), endsWith('=10'));
    expect(tex(r, 'Талбай'), endsWith('=24'));
    final e = buildPlane(PlaneShape.triangle, {'a': 2}, tri: TriMode.equi);
    expect(tex(e, 'Талбай'), contains(r'=\sqrt{3}'));
    expect(e.metric('Төрөл')!.text, 'зөв (адил талт), хурц өнцөгт');
    final iso = buildPlane(PlaneShape.triangle, {'a': 6, 'b': 5}, tri: TriMode.iso);
    expect(tex(iso, 'Суурь руу буусан өндөр'), endsWith('=4'));
    expect(iso.prims.whereType<TicksPrim>().length, greaterThanOrEqualTo(2));
    final sas = buildPlane(PlaneShape.triangle, {'b': 4, 'c': 3, 'A': 90}, tri: TriMode.sas);
    expect(tex(sas, 'a тал (косинусын теорем)'), endsWith('=5'));
  });

  test('дөрвөн өнцөгт ба олон өнцөгт', () {
    final rect = buildPlane(PlaneShape.rectangle, {'a': 6, 'b': 8});
    expect(tex(rect, 'Диагональ'), endsWith('=10'));
    expect(tex(rect, 'Талбай'), endsWith('=48'));
    final sq = buildPlane(PlaneShape.square, {'a': 3});
    expect(tex(sq, 'Диагональ'), contains(r'3\sqrt{2}'));
    final par = buildPlane(PlaneShape.parallelogram, {'a': 6, 'b': 4, 'alpha': 30});
    expect(tex(par, 'Талбай'), endsWith('=12'));
    final rh = buildPlane(PlaneShape.rhombus, {'a': 5, 'alpha': 90});
    expect(tex(rh, 'Талбай'), endsWith('=25'));
    final tr = buildPlane(PlaneShape.trapezoid, {'a': 10, 'b': 4, 'h': 4});
    expect(tex(tr, 'Талбай'), endsWith('=28'));
    expect(tex(tr, 'Хажуу тал'), endsWith('=5'));
    final rtr = buildPlane(PlaneShape.trapezoid, {'a': 7, 'b': 4, 'h': 4}, trap: TrapMode.right);
    expect(rtr.metrics.where((m) => m.name == 'Хажуу тал').last.tex, endsWith('=5'));
    final hex = buildPlane(PlaneShape.polygon, {'n': 6, 'a': 2});
    expect(tex(hex, 'Талбай (зургаан өнцөгт)'), contains(r'6\sqrt{3}'));
    expect(tex(hex, 'Дотоод өнцөг'), endsWith(r'=120^\circ'));
    expect(buildPlane(PlaneShape.polygon, {'n': 2.5, 'a': 2}).ok, isFalse);
  });

  test('тойрог', () {
    final c = buildPlane(PlaneShape.circle, {'r': 5, 'theta': 60});
    expect(tex(c, 'Дугуйн талбай'), contains(r'25\pi'));
    expect(tex(c, 'Тойргийн урт'), contains(r'10\pi'));
    expect(tex(c, 'Хөвч'), endsWith('=5'));
    expect(buildPlane(PlaneShape.circle, {'r': 5, 'theta': 400}).ok, isFalse);
  });

  test('гол үр дүн ба мөрүүд: хэт олон оронтой тоогүй', () {
    for (final s in PlaneShape.values) {
      final specs = paramSpecs(s);
      final b = buildPlane(s, {for (final p in specs) p.key: p.def});
      expect(b.ok, isTrue, reason: s.name);
      expect(b.metrics.any((m) => m.key), isTrue, reason: s.name);
      for (final m in b.metrics) {
        expect(RegExp(r'\d\.\d{3,}').hasMatch(m.tex), isFalse, reason: '${s.name}: ${m.tex}');
      }
    }
  });
}
