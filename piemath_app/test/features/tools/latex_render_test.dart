// Үр дүнгийн БҮХ LaTeX flutter_math_fork-д алдаагүй зурагдана (жишээ нь `\left(` нь
// `\sqrt` дотор assertion өгдөг — ийм томьёо орж ирвэл энэ тест унана).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/features/tools/domain/free.dart';
import 'package:piemath_app/features/tools/domain/geom.dart';
import 'package:piemath_app/features/tools/domain/shapes.dart';
import 'package:piemath_app/features/tools/domain/solids.dart';

import '../../core/math/math_test_helpers.dart';
import '../../helpers/pump.dart';

void main() {
  setUpAll(loadKatexFonts);

  final texs = <String>{};
  for (final s in PlaneShape.values) {
    final modes = s == PlaneShape.triangle ? TriMode.values : [TriMode.sss];
    for (final m in modes) {
      for (final t in TrapMode.values) {
        final specs = paramSpecs(s, tri: m, trap: t);
        final b = buildPlane(s, {for (final p in specs) p.key: p.def}, tri: m, trap: t);
        texs.addAll(b.metrics.expand((x) => x.rows).map((r) => r.tex));
      }
    }
  }
  for (final k in SolidKind.values) {
    for (final n in [3, 4, 5, 6]) {
      final p = {for (final s in solidParams(k)) s.key: s.def, 'n': n.toDouble()};
      texs.addAll(solidMetrics(k, p).expand((x) => x.rows).map((r) => r.tex));
    }
  }
  var st = const FreeState();
  for (final p in const [Pt(0, 0), Pt(-3, 1), Pt(1, 4), Pt(0, 0)]) {
    st = tapSegment(st, p, tol: 0.3, grid: 1);
  }
  texs.addAll(freeMetrics(st).expand((x) => x.rows).map((r) => r.tex));
  texs.addAll(
    freeMetrics(st.copyWith(selected: () => (kind: FreeKind.segment, id: st.segs.first.id)))
        .expand((x) => x.rows)
        .map((r) => r.tex),
  );
  texs.addAll(
    freeMetrics(st.copyWith(selected: () => (kind: FreeKind.point, id: st.points[1].id)))
        .expand((x) => x.rows)
        .map((r) => r.tex),
  );

  testWidgets('${texs.length} томьёо алдаагүй зурагдана', (tester) async {
    final list = texs.toList();
    for (var i = 0; i < list.length; i += 12) {
      final chunk = list.sublist(i, i + 12 > list.length ? list.length : i + 12);
      await pumpThemed(
        tester,
        ListView(children: [for (final t in chunk) MathText('\$$t\$', style: const TextStyle(fontSize: 18))]),
      );
      final e = tester.takeException();
      expect(e, isNull, reason: chunk.join('\n'));
    }
  });
}
