import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/shared/math_keyboard/math_keyboard_lib.dart';

import '../../helpers/pump.dart';

void main() {
  testWidgets('гараас бичиж, Дараах-аар дараагийн талбар руу, системийн гар гарахгүй', (tester) async {
    final textInputCalls = <MethodCall>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.textInput, (call) async {
      textInputCalls.add(call);
      return null;
    });
    final a = MathInputController(), b = MathInputController(kind: MathInputKind.angle);
    final group = MathFieldGroup()..setFields([a, b]);
    final haptics = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == 'HapticFeedback.vibrate') haptics.add(call.arguments as String);
      return null;
    });

    await pumpThemed(
      tester,
      Column(
        children: [
          MathField(key: const ValueKey('fa'), controller: a, group: group, labelTex: 'a'),
          MathField(key: const ValueKey('fb'), controller: b, group: group, labelTex: r'\alpha'),
          const Spacer(),
          MathKeyboard(group: group),
        ],
      ),
      size: const Size(360, 740),
    );

    await tester.tap(find.byKey(const ValueKey('fa')));
    await tester.pump();
    expect(group.active, a);

    for (final k in ['d2', 'sqrt', 'd3']) {
      await tester.tap(find.byKey(ValueKey('math-key-$k')));
      await tester.pump();
    }
    expect(a.displayTex, r'2 \sqrt{3}');
    expect(a.value, closeTo(3.4641, 1e-4));
    expect(haptics, isNotEmpty);

    // Хэмийн товч уртын талбарт идэвхгүй
    await tester.tap(find.byKey(const ValueKey('math-key-degree')));
    await tester.pump();
    expect(a.tokens.contains('°'), isFalse);

    await tester.tap(find.byKey(const ValueKey('math-key-next')));
    await tester.pump();
    expect(group.active, b);
    expect(find.text('Болсон'), findsOneWidget);

    for (final k in ['d4', 'd5', 'degree']) {
      await tester.tap(find.byKey(ValueKey('math-key-$k')));
      await tester.pump();
    }
    expect(b.value, 45);

    await tester.tap(find.byKey(const ValueKey('math-key-next')));
    await tester.pump();
    expect(group.isOpen, isFalse);

    // TextField/EditableText огт байхгүй — системийн гар нээгдэх боломжгүй.
    expect(find.byType(EditableText), findsNothing);
    expect(textInputCalls.where((c) => c.method == 'TextInput.show'), isEmpty);
  });

  testWidgets('товчнууд 48dp-ээс багагүй', (tester) async {
    final a = MathInputController();
    final group = MathFieldGroup()..setFields([a]);
    group.focus(a);
    await pumpThemed(
      tester,
      Align(
        alignment: Alignment.bottomCenter,
        child: MathKeyboard(group: group),
      ),
      size: const Size(360, 740),
    );
    for (final k in MathKey.values) {
      final size = tester.getSize(find.byKey(ValueKey('math-key-${k.name}')));
      expect(size.height, greaterThanOrEqualTo(48), reason: k.name);
      expect(size.width, greaterThanOrEqualTo(48), reason: k.name);
    }
  });
}
