// Вэбийн `graph/graphMath.test.mjs`, `labels.test.mjs`-ийн порт.
import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/tools/graph/domain/graph_math.dart';
import 'package:piemath_app/features/tools/graph/domain/labels.dart';
import 'package:piemath_app/shared/math_keyboard/expr.dart';

const view = GView(cx: 0, cy: 0, sx: 50, sy: 50, w: 600, h: 400);

void near(double a, double b, [double e = 1e-6]) => expect((a - b).abs() < e, isTrue, reason: '$a ≈ $b');

Fn fOf(String s) => analyzeGraph(s).f!;

void main() {
  test('ангилал', () {
    expect(analyzeGraph('x^2').kind, ItemKind.fn);
    expect(analyzeGraph('y=x^2').kind, ItemKind.fn);
    expect(analyzeGraph('f(x)=2x+1').kind, ItemKind.fn);
    expect(analyzeGraph('x=3').kind, ItemKind.vline);
    expect(analyzeGraph('x^2+y^2=25').kind, ItemKind.implicit);
    expect(analyzeGraph('y>x^2').kind, ItemKind.ineq);
    expect(analyzeGraph('(2;3)').kind, ItemKind.point);
    expect(analyzeGraph('(1,5; -2)').kind, ItemKind.point);
    expect(analyzeGraph('').kind, ItemKind.empty);
    expect(analyzeGraph('x+').kind, ItemKind.error);
    expect(analyzeGraph('a x^2 + b').params, ['a', 'b']);
    expect(analyzeGraph('(x)+(2)').kind, ItemKind.fn);
  });

  test('тэг, экстремум', () {
    final roots = findRoots(fOf('x^2-4x+3'), {}, -10, 10);
    expect(roots.length, 2);
    near(roots[0], 1);
    near(roots[1], 3);
    final ex = findExtrema(fOf('x^2-4x+3'), {}, -10, 10);
    expect(ex.length, 1);
    near(ex[0].x, 2, 1e-5);
    near(ex[0].y, -1);
    expect(ex[0].max, isFalse);
    final dr = findRoots(fOf('(x-1)^2'), {}, -5, 5);
    expect(dr.length, 1);
    near(dr[0], 1, 1e-4);
    expect(findRoots(fOf('1/x'), {}, -5, 5), isEmpty);
    expect(findExtrema(fOf('tan(x)'), {}, -5, 5), isEmpty);
    expect(findRoots(fOf('sin(x)'), {}, -7, 7).length, 5);
  });

  test('огтлолцол ба онцгой цэг', () {
    final pts = specialPoints([FnLine(0, fOf('x^2'), {}), FnLine(1, fOf('x+2'), {})], -10, 10);
    final cross = pts.where((p) => p.kind == SpecialKind.cross).map((p) => p.x).toList()..sort();
    expect(cross.length, 2);
    near(cross[0], -1);
    near(cross[1], 2);
    expect(pts.any((p) => p.kind == SpecialKind.yint && p.line == 1 && (p.y - 2).abs() < 1e-9), isTrue);
  });

  test('муруйн зам асимптотыг таслана, шулуун нэг хэсэг', () {
    expect(fnPolylines(fOf('1/x'), {}, view).length, greaterThanOrEqualTo(2));
    expect(fnPolylines(fOf('x'), {}, view).length, 1);
    expect(fnPolylines(fOf('tan(x)'), {}, view).length, greaterThanOrEqualTo(4));
  });

  test('дасан зохицох дээжлэлт: огцом хэсэгт цэг нэмнэ', () {
    final line = fnPolylines(fOf('x'), {}, view).single.length ~/ 2;
    final steep = fnPolylines(fOf('x^10'), {}, view).fold(0, (s, p) => s + p.length ~/ 2);
    expect(steep, greaterThan(line));
  });

  test('контур ба муж', () {
    final g = sampleGrid(fOf('x^2+y^2=25'), {}, view);
    expect(contourSegments(g).length, greaterThan(200));
    final gi = sampleGrid(analyzeGraph('x^2+y^2<25').f!, {}, view);
    expect(regionRects(gi, RelOp.lt).length, greaterThan(20));
    final empty = sampleGrid(analyzeGraph('x^2+y^2<-1').f!, {}, view);
    expect(regionRects(empty, RelOp.lt), isEmpty);
  });

  test('шошго, масштаб', () {
    expect(niceStep(50, 70), 2);
    expect(niceStep(100, 70), 1);
    near(piStep(100, 70), math.pi / 4, 1e-9);
    expect(piLabelTex(math.pi / 2), r'\frac{\pi}{2}');
    expect(piLabelTex(3 * math.pi / 2), r'\frac{3\pi}{2}');
    expect(piLabelTex(-math.pi), r'-\pi');
    expect(piLabelTex(2 * math.pi), r'2\pi');
    expect(piLabelParts(-math.pi / 2), ('−', '', '2'));
    expect(tickValues(-1, 3, 1), [-1, 0, 1, 2, 3]);
    expect(numLabel(0.5, 0.1), '0.5');
    expect(numLabel(-2, 1), '−2');
    final z = view.zoomAbout(450, 100, 2);
    near(z.xOf(450), view.xOf(450), 1e-9);
    near(z.pxOf(view.xOf(450)), 450, 1e-9);
    final p = view.panBy(50, 0);
    near(p.cx, -1, 1e-12);
  });

  test('утгын хүснэгт ба параметр', () {
    final t = valueTable(fOf('a x^2'), {'a': 3}, -1, 1, 3);
    expect(t.map((r) => r.y).toList(), [3, 0, 3]);
  });

  test('шүргэгч, интеграл', () {
    near(derivAt(fOf('x^2'), {}, 3), 6);
    near(simpson(fOf('x^2'), {}, 0, 1), 1 / 3, 1e-9);
    near(simpson(fOf('sin(x)'), {}, 0, math.pi), 2, 1e-9);
    expect(simpson(fOf('1/x'), {}, -1, 1).isNaN, isTrue);
  });

  group('шошго', () {
    bool overlap(LBox a, LBox b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

    test('ойрхон цэгүүдийн шошго давхцахгүй', () {
      final reqs = [for (var i = 0; i < 6; i++) LabelReq(100.0 + i * 4, 100, 50, 14)];
      final ok = placeLabels(reqs, 400, 300).whereType<LBox>().toList();
      expect(ok.length, greaterThanOrEqualTo(4));
      for (var i = 0; i < ok.length; i++) {
        for (var j = i + 1; j < ok.length; j++) {
          expect(overlap(ok[i], ok[j]), isFalse);
        }
      }
    });

    test('хүрээнээс гарахгүй, хориглосон хэсэгт орохгүй', () {
      final a = placeLabels([const LabelReq(395, 5, 60, 14)], 400, 300).single!;
      expect(a.x >= 2 && a.x + a.w <= 398 && a.y >= 2, isTrue);
      final blocked = [const LBox(0, 0, 400, 300)];
      expect(placeLabels([const LabelReq(50, 50, 20, 10)], 400, 300, blocked: blocked).single, isNull);
    });

    test('тоо хэт олон оронгүй', () {
      expect(shortNum(2.0000001), '2');
      expect(shortNum(-1), '−1');
      expect(shortNum(3.60555), '3.61');
      expect(shortNum(0.5), '0.5');
      expect(textWidth('(2; −1)', 12), greaterThan(20));
    });
  });
}
