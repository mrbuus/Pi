import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/tools/domain/projection.dart';
import 'package:piemath_app/features/tools/domain/shapes.dart';
import 'package:piemath_app/features/tools/domain/solid_net.dart';
import 'package:piemath_app/features/tools/domain/solid_section.dart';
import 'package:piemath_app/features/tools/domain/solids.dart';
import 'package:piemath_app/features/tools/ui/figure_painter.dart';
import 'package:piemath_app/features/tools/ui/solid_painter.dart';

const out = '/private/tmp/claude-501/-Users-mr-buus-Intern/4b7934b8-4e59-40a0-a14e-2469d0a171ad/scratchpad/render';
const pal = FigurePalette(
  ink: Color(0xFF111111),
  brand: Color(0xFF1C5BD8),
  dim: Color(0xFF777777),
  accent: Color(0xFF3B82F6),
  fill: Color(0xFFDDE8FB),
  grid: Color(0xFFDDDDDD),
  bg: Colors.white,
);

Future<void> save(String name, void Function(Canvas, Size) paint) async {
  const size = Size(420, 340);
  final rec = ui.PictureRecorder();
  final c = Canvas(rec);
  c.drawRect(Offset.zero & size, Paint()..color = Colors.white);
  paint(c, size);
  final img = await rec.endRecording().toImage(size.width.toInt() * 2, size.height.toInt() * 2);
  final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
  Directory(out).createSync(recursive: true);
  File('$out/$name.png').writeAsBytesSync(bytes!.buffer.asUint8List());
}

void main() {
  testWidgets('render', (tester) async {
    await tester.runAsync(() async {
      for (final k in SolidKind.values) {
        if (k == SolidKind.sphere) continue;
        final p = {for (final s in solidParams(k)) s.key: s.def};
        final net = buildNet(k, p)!;
        await save('net-${k.name}', (c, s) {
          c.scale(1, 1);
          FigurePainter(prims: net.prims, palette: pal).paint(c, s);
        });
      }
      final cases = <(SolidKind, String, Map<String, double>)>[
        (SolidKind.cube, 'cube-tilt', {'y': 2, 'alpha': 45, 'beta': 0, 's': 0}),
        (SolidKind.pyramid, 'pyr', {'y': 2, 'alpha': 30, 'beta': 30, 's': 0}),
        (SolidKind.cylinder, 'cyl', {'y': 2.5, 'alpha': 30, 'beta': 20, 's': 0}),
        (SolidKind.cone, 'cone', {'y': 1, 'alpha': 40, 'beta': 0, 's': 0}),
        (SolidKind.fcone, 'fcone', {'y': 2, 'alpha': 10, 'beta': 0, 's': 0}),
        (SolidKind.fcone, 'fcone-plain', {'y': 99, 'alpha': 10, 'beta': 0, 's': 0}),
        (SolidKind.frustum, 'frustum', {'y': 2, 'alpha': 20, 'beta': 0, 's': 0}),
        (SolidKind.sphere, 'sphere', {'y': 3, 'alpha': 20, 'beta': 0, 's': 0}),
      ];
      for (final (k, name, sp) in cases) {
        final p = {for (final s in solidParams(k)) s.key: s.def, ...sp};
        final model = buildSolid(k, p);
        final r = sectionOf(k, p);
        await save('sec-$name', (c, s) {
          SolidPainter(model: model, view: ValueNotifier(const View3()), palette: pal, section: r.view).paint(c, s);
        });
      }
      for (final t in [(TriExtras(median: true, bisector: true, incircle: true, circumcircle: true, from: TriVertex.b))]) {
        final b = buildPlane(PlaneShape.triangle, {'a': 6.0, 'b': 5.0, 'c': 4.0}, extras: t);
        await save('tri', (c, s) {
          FigurePainter(prims: b.prims, palette: pal).paint(c, s);
        });
      }
    });
  });
}
