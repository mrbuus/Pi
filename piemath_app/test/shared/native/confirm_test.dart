import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/pump.dart';

Widget _button(String label, Future<void> Function(BuildContext) onPressed) => Builder(
  builder: (ctx) => Center(
    child: FilledButton(onPressed: () => onPressed(ctx), child: Text(label)),
  ),
);

void main() {
  testWidgets('confirmAction: «Устгах» → true, «Болих» → false', (tester) async {
    final answers = <bool>[];
    await pumpThemed(
      tester,
      _button('Архивлах', (ctx) async {
        answers.add(await confirmAction(ctx, title: 'Сурагчийг архивлах уу', message: 'Жагсаалтаас нуугдана'));
      }),
    );
    await tester.tap(find.text('Архивлах'));
    await tester.pumpAndSettle();
    expect(find.text('Сурагчийг архивлах уу'), findsOneWidget);
    await tester.tap(find.text('Устгах'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Архивлах'));
    await tester.pumpAndSettle();
    await tester.tap(find.text(AppStrings.cancel));
    await tester.pumpAndSettle();
    expect(answers, [true, false]);
  });

  testWidgets('showUndoSnack: «Буцаах» дарвал true + onUndo', (tester) async {
    final results = <bool>[];
    var undone = 0;
    await pumpThemed(
      tester,
      _button('Хасах', (ctx) async {
        results.add(await showUndoSnack(ctx, message: 'Архивлалаа', onUndo: () => undone++));
      }),
    );
    await tester.tap(find.text('Хасах'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.text('Архивлалаа'), findsOneWidget);
    await tester.tap(find.text('Буцаах'));
    await tester.pumpAndSettle();
    expect(results, [true]);
    expect(undone, 1);
  });

  testWidgets('showUndoSnack: хугацаа дуусвал false (серверт илгээх цаг)', (tester) async {
    final results = <bool>[];
    await pumpThemed(
      tester,
      _button('Хасах', (ctx) async {
        results.add(await showUndoSnack(ctx, message: 'Архивлалаа', duration: const Duration(seconds: 2)));
      }),
    );
    await tester.tap(find.text('Хасах'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500)); // гарч ирэх хөдөлгөөн
    expect(results, isEmpty);
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();
    expect(find.text('Архивлалаа'), findsNothing);
    expect(results, [false]);
  });

  testWidgets('шинэ undo snackbar өмнөхийг false-аар хаана', (tester) async {
    final results = <bool>[];
    await pumpThemed(
      tester,
      _button('Хасах', (ctx) async {
        results.add(await showUndoSnack(ctx, message: 'Архивлалаа'));
      }),
    );
    await tester.tap(find.text('Хасах'));
    await tester.pump();
    await tester.tap(find.text('Хасах'));
    await tester.pumpAndSettle();
    expect(results, [false]);
  });
}
