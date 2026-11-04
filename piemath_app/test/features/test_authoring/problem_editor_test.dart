import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/features/exam/ui/widgets/exam_parts.dart';
import 'package:piemath_app/features/test_authoring/domain/editor_model.dart';
import 'package:piemath_app/features/test_authoring/ui/problem_editor_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';
import 'authoring_fixtures.dart';

/// Засварлагчийг нээж, «Болсон»-ы үр дүнг [onResult]-д өгнө.
class _Host extends StatelessWidget {
  const _Host({required this.content, required this.onResult, this.editable = true, this.answerLocked = false});

  final BlockContent content;
  final bool editable;
  final bool answerLocked;
  final ValueChanged<ProblemEditResult?> onResult;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: FilledButton(
        onPressed: () async => onResult(
          await ProblemEditorScreen.open(
            context,
            content: content,
            points: 2,
            number: 3,
            total: 40,
            editable: editable,
            answerLocked: answerLocked,
          ),
        ),
        child: const Text('нээх'),
      ),
    ),
  );
}

Future<void> _open(WidgetTester tester, Widget host) async {
  await pumpAuthoring(tester, host, http: FakeHttp());
  await tester.tap(find.text('нээх'));
  await settle(tester, frames: 20);
}

/// Засварлагчийн жагсаалтыг [f] харагдтал гүйлгэнэ (дээш ч, доош ч).
Future<void> _visible(WidgetTester tester, Finder f) async {
  if (f.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      f,
      -300,
      scrollable: find.descendant(of: find.byKey(const ValueKey('edit-pane')), matching: find.byType(Scrollable)).first,
    );
  }
  await tester.ensureVisible(f);
  await settle(tester);
}

const _choiceContent = BlockContent(
  statement: r'$2\cdot x=6$ бол $x$-ийг ол',
  choices: [
    EditorChoice(text: r'$1$'),
    EditorChoice(text: r'$2$'),
    EditorChoice(text: r'$3$'),
    EditorChoice(text: r'$4$'),
    EditorChoice(text: r'$5$'),
  ],
);

void main() {
  testWidgets('«Засах»: шалгалтын алдаа шууд, зөв хариу сонгоход алга болно, «Болсон» үр дүн буцаана', (tester) async {
    ProblemEditResult? result;
    await _open(tester, _Host(content: _choiceContent, onResult: (r) => result = r));
    expect(find.text('3-р бодлого'), findsOneWidget);
    expect(find.text('Зөв хариуг сонгоно уу'), findsOneWidget);
    await _visible(tester, find.byKey(const Key('correct-2')));
    await tester.tap(find.byKey(const Key('correct-2')));
    await settle(tester);
    expect(find.text('Зөв хариуг сонгоно уу'), findsNothing);
    expect(find.text('C — зөв хариу'), findsOneWidget);

    await _visible(tester, find.byKey(const Key('statement-field')));
    await tester.enterText(find.byKey(const Key('statement-field')), '');
    await settle(tester);
    expect(find.text('Бодлогын текст хоосон байна'), findsOneWidget);
    await _visible(tester, find.byKey(const Key('statement-field')));
    await tester.enterText(find.byKey(const Key('statement-field')), r'$3 \bullet x=9$');
    await settle(tester);
    expect(find.text('Бодлогын текст хоосон байна'), findsNothing);

    await tester.tap(find.text('Болсон'));
    await settle(tester, frames: 20);
    expect(result, isNotNull);
    expect(result!.content.correctIndex, 2);
    expect(result!.content.statement, r'$3 \cdot x=9$', reason: 'үржих тэмдэг \\cdot болно');
    expect(result!.points, 2);
  });

  testWidgets('«Харах»: сурагчийн шалгалтын харагдац — дугаартай сонголт, зөв хариу тэмдэглэгдэхгүй', (tester) async {
    const marked = BlockContent(
      statement: r'$x^2=9$, $x>0$',
      choices: [
        EditorChoice(text: r'$1$'),
        EditorChoice(text: r'$2$'),
        EditorChoice(text: r'$3$', isCorrect: true),
        EditorChoice(text: r'$4$'),
        EditorChoice(text: r'$5$'),
      ],
    );
    await _open(tester, _Host(content: marked, onResult: (_) {}));
    await tester.tap(find.text('Харах'));
    await settle(tester, frames: 12);
    expect(find.byType(QuestionView), findsOneWidget);
    expect(find.text('3-р бодлого'), findsWidgets);
    final grid = tester.widget<ChoiceGrid>(find.byType(ChoiceGrid));
    expect(grid.showCorrect, isFalse);
    expect(grid.choices.map((c) => c.label), ['1', '2', '3', '4', '5']);
    expect(grid.choices.any((c) => c.isCorrect), isFalse, reason: 'хариуны түлхүүр сурагчийн харагдацад орохгүй');
    expect(find.text('Алдаагүй'), findsOneWidget, reason: 'өөрийн тэмдэглэгээ — шалгалттай ижил');
  });

  testWidgets('эрхгүй (Багш, байгаа бодлого): зөвхөн харна', (tester) async {
    await _open(tester, _Host(content: _choiceContent, editable: false, onResult: (_) {}));
    expect(find.text('Бодлогын агуулгыг Багш+ эсвэл админ засна'), findsOneWidget);
    expect(find.byKey(const Key('statement-field')), findsNothing);
    expect(find.byKey(const Key('correct-0')), findsNothing);
  });

  testWidgets('нөхөх: [a], [bc] — 3 нүд; сурагч өгсөн тестэд анхааруулга', (tester) async {
    ProblemEditResult? result;
    await _open(
      tester,
      _Host(
        content: const BlockContent(format: 'FILL_NUMBER', statement: r'$x=[a]$, $y=[bc]$'),
        answerLocked: true,
        onResult: (r) => result = r,
      ),
    );
    expect(find.byKey(const Key('fill-0')), findsOneWidget);
    expect(find.byKey(const Key('fill-2')), findsOneWidget);
    expect(find.byKey(const Key('fill-3')), findsNothing);
    expect(find.text('Сурагч өгсөн тест — хариуг өөрчилбөл өмнөх дүн дахин бодогдохгүй'), findsOneWidget);
    await _visible(tester, find.byKey(const Key('fill-0')));
    await tester.enterText(find.byKey(const Key('fill-0')), '3');
    await settle(tester);
    await _visible(tester, find.byKey(const Key('fill-2')));
    await tester.enterText(find.byKey(const Key('fill-2')), '5');
    await settle(tester);
    expect(find.text('Хариуны 3 нүдийг бүгдийг бөглөнө үү'), findsOneWidget);
    await tester.tap(find.text('Болсон'));
    await settle(tester, frames: 20);
    expect(result!.content.fill, '3_5');
  });

  testWidgets('LaTeX туслах товч курсорт оруулна, харагдац шууд шинэчлэгдэнэ', (tester) async {
    ProblemEditResult? result;
    await _open(
      tester,
      _Host(
        content: const BlockContent(format: 'FILL_NUMBER', statement: 'x='),
        onResult: (r) => result = r,
      ),
    );
    await tester.tap(find.byKey(const Key('statement-field')));
    await settle(tester);
    await tester.tap(find.bySemanticsLabel('Бутархай').first);
    await settle(tester);
    await tester.tap(find.text('Болсон'));
    await settle(tester, frames: 20);
    expect(result!.content.statement, r'x=\frac{}{}');
  });
}
