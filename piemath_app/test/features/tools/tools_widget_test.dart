import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/features/tools/domain/free.dart';
import 'package:piemath_app/features/tools/ui/plane_free_view.dart';
import 'package:piemath_app/features/tools/ui/plane_screen.dart';
import 'package:piemath_app/features/tools/ui/solid_screen.dart';
import 'package:piemath_app/features/tools/ui/tool_widgets.dart';
import 'package:piemath_app/features/tools/ui/tools_hub_screen.dart';

import '../../core/math/math_test_helpers.dart';
import '../../helpers/pump.dart';

bool hasMath(String needle) =>
    find.byType(MathText).evaluate().any((e) => (e.widget as MathText).source.contains(needle));

/// Хэвтээ сонголтын мөрөөс (lazy ListView) товч олж дарна.
Future<void> pill(WidgetTester t, String k) async {
  final f = find.byKey(ValueKey(k));
  await t.scrollUntilVisible(
    f,
    150,
    scrollable: find.descendant(of: find.byType(PillRow).first, matching: find.byType(Scrollable)),
  );
  await t.ensureVisible(f);
  await t.pumpAndSettle();
  await t.tap(f);
  await t.pumpAndSettle();
}

Future<void> key(WidgetTester t, String name) async {
  await t.tap(find.byKey(ValueKey('math-key-$name')));
  await t.pump();
}

void main() {
  // KaTeX фонтгүй бол \left( … \right) хэмжээ буруу тооцогдоно.
  setUpAll(loadKatexFonts);

  testWidgets('жагсаалт: хоёр хэрэгсэл', (tester) async {
    await pumpThemed(tester, const ToolsHubScreen());
    expect(find.text('Хавтгайн дүрс'), findsOneWidget);
    expect(find.text('Огторгуйн биет'), findsOneWidget);
  });

  testWidgets('загвар: гарнаас тал бичихэд тооцоо шинэчлэгдэнэ (360dp)', (tester) async {
    await pumpThemed(tester, const PlaneScreen(), size: const Size(360, 720));
    await tester.pump();
    // Анхдагч 5-4-3 гурвалжин: талбай 6
    expect(hasMath('S'), isTrue);
    expect(find.byKey(const ValueKey('plane-figure')), findsOneWidget);
    expect(find.byKey(const ValueKey('math-key-d1')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('field-a')));
    await tester.pump();
    expect(find.byKey(const ValueKey('math-key-d1')), findsOneWidget);
    await key(tester, 'clear');
    await key(tester, 'd1');
    await key(tester, 'd0');
    // 10-4-3 гурвалжин байхгүй — тайлбар гарна
    expect(find.textContaining('нийлбэрээс бага'), findsOneWidget);
    await key(tester, 'backspace');
    await key(tester, 'backspace');
    await key(tester, 'd6');
    await key(tester, 'next'); // b
    await key(tester, 'clear');
    await key(tester, 'd8');
    await key(tester, 'next'); // c
    await key(tester, 'clear');
    await key(tester, 'd1');
    await key(tester, 'd0');
    await key(tester, 'next'); // Болсон — гар хаагдана
    expect(find.byKey(const ValueKey('math-key-d1')), findsNothing);
    await tester.pumpAndSettle();
    // 6-8-10: тэгш өнцөгт, S=24
    expect(find.textContaining('тэгш өнцөгт'), findsWidgets);
    expect(hasMath('=24'), isTrue);
  });

  testWidgets('загвар: дүрс солих — тойрог, π-тэй үр дүн', (tester) async {
    await pumpThemed(tester, const PlaneScreen(), size: const Size(390, 844));
    await pill(tester, 'shape-circle');
    expect(find.byKey(const ValueKey('field-r')), findsOneWidget);
    expect(hasMath(r'16\pi'), isTrue);
  });

  testWidgets('чөлөөт: товшиж гурвалжин байгуулах, буцаах/давтах', (tester) async {
    final c = FreeController();
    await pumpThemed(tester, PlaneFreeView(controller: c), size: const Size(390, 844));
    final canvas = find.byKey(const ValueKey('free-canvas'));
    final box = tester.getRect(canvas);
    final s = box.shortestSide / 9;
    Offset at(double x, double y) => box.center + Offset(x * s, -y * s);

    expect(find.byKey(const ValueKey('free-hint')), findsOneWidget);
    for (final p in [at(0, 0), at(4, 0), at(0, 3), at(0, 0)]) {
      await tester.tapAt(p);
      await tester.pump(const Duration(milliseconds: 400));
    }
    expect(c.state.points.length, 3);
    expect(c.state.polys.length, 1);
    expect(hasMath('S=6'), isTrue);
    expect(find.text('Гурвалжин'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('free-undo')));
    await tester.pump();
    expect(c.state.polys, isEmpty);
    await tester.tap(find.byKey(const ValueKey('free-redo')));
    await tester.pump();
    expect(c.state.polys.length, 1);

    // Сонгох горимд цэгийг чирэх
    await tester.tap(find.byKey(const ValueKey('mode-select')));
    await tester.pump();
    expect(c.mode, FreeMode.select);
    final b = at(4, 0);
    final g = await tester.startGesture(b);
    for (var i = 1; i <= 4; i++) {
      await g.moveTo(b + Offset(i * s * 0.5, 0));
      await tester.pump();
    }
    await g.up();
    await tester.pump();
    expect(c.state.points[1].p.x, 6);
    c.dispose();
  });

  testWidgets('биет: анхдагч куб, чирж эргүүлэх, конус руу шилжих', (tester) async {
    await pumpThemed(tester, const SolidScreen(), size: const Size(360, 720));
    await tester.pump();
    expect(hasMath('V=a^3'), isTrue);
    await tester.drag(find.byKey(const ValueKey('solid-figure')), const Offset(80, 30));
    await tester.pump();
    await pill(tester, 'solid-cone');
    expect(hasMath(r'12\pi'), isTrue);
    // Утгыг гараас өөрчлөх
    await tester.tap(find.byKey(const ValueKey('field-h')));
    await tester.pump();
    await key(tester, 'clear');
    expect(find.textContaining('утгаа бичнэ'), findsOneWidget);
    await key(tester, 'd8');
    expect(hasMath('V='), isFalse); // гар нээлттэй үед үр дүн нуугдана
    await key(tester, 'next'); // h сүүлийнх — «Болсон», гар хаагдана
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('math-key-next')), findsNothing);
    expect(hasMath(r'24\pi'), isTrue);
  });

  testWidgets('таблет: зураг зүүн, самбар баруун', (tester) async {
    await pumpThemed(tester, const SolidScreen(), size: const Size(1024, 768));
    await tester.pump();
    final fig = tester.getRect(find.byKey(const ValueKey('solid-figure')));
    final field = tester.getRect(find.byKey(const ValueKey('field-a')));
    expect(field.left, greaterThan(fig.right));
  });
}
