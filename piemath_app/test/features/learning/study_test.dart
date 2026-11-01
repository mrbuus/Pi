import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/learning/ui/review_history_screen.dart';
import 'package:piemath_app/features/learning/ui/review_screen.dart';
import 'package:piemath_app/features/learning/ui/study_hub_screen.dart';

import '../../helpers/fake_http.dart';
import 'learning_test_app.dart';

Map<String, Object?> runJson({
  String status = 'OPEN',
  Object? first,
  List<Object?> responses = const [],
  Object? answerKey,
  String? solution,
}) => {
  'id': 'r1',
  'budgetMinutes': 10,
  'deadlineAt': DateTime.now().toUtc().add(const Duration(minutes: 9)).toIso8601String(),
  'serverNow': DateTime.now().toUtc().toIso8601String(),
  'status': status,
  'items': [
    {
      'id': 'i1',
      'problemId': 'p1',
      'source': {
        'statement': r'$2+2$ хэд вэ',
        'imageKey': null,
        'format': 'CHOICE',
        'choiceMode': 'TEXT',
        'choices': [r'$3$', r'$4$'],
      },
      'first': first,
      'responses': responses,
      'solution': ?solution,
      'answerKey': ?answerKey,
    },
  ],
  'evidence': {'assigned': 1, 'answered': first == null ? 0 : 1, 'firstCorrect': 1, 'independentFirstCorrect': 1, 'unknown': 0},
  'caution': 'Хувийн давтлага, албан дүн биш',
};

void main() {
  testWidgets('давтлага: сэдэв сонгох → эхлүүлэх (idempotency id) → хариу → хаах → тайлбар', (tester) async {
    final bodies = <Map<Object?, Object?>>[];
    final http = FakeHttp()
      ..json('GET', '/study-review/options', {
        'resumeRunId': null,
        'chapters': [
          {'id': 'c1', 'title': 'Тэгшитгэл', 'freshCount': 6},
          {'id': 'c2', 'title': 'Хоосон сэдэв', 'freshCount': 0},
        ],
      })
      ..on('POST', '/study-review', (req) {
        bodies.add((req.data as Map).cast());
        return FakeResponse(runJson());
      })
      ..on('POST', '/study-review/r1/items/i1/response', (req) {
        bodies.add((req.data as Map).cast());
        return FakeResponse(runJson(first: {'answer': 'choice:1', 'flags': <String>[], 'correct': true}));
      })
      ..on('POST', '/study-review/r1/submit', (req) => FakeResponse(runJson(
            status: 'SUBMITTED',
            first: {'answer': 'choice:1', 'flags': <String>[], 'correct': true},
            answerKey: r'$4$',
            solution: r'$2+2=4$',
          )));
    await pumpLearning(tester, http, location: '/app/study/review');

    expect(find.byType(ReviewScreen), findsOneWidget);
    expect(find.text('Хоосон сэдэв'), findsNothing, reason: 'шинэ бодлогогүй сэдвийг харуулахгүй');
    final start = find.widgetWithText(FilledButton, 'Давтлага эхлэх');
    expect(tester.widget<FilledButton>(start).onPressed, isNull);

    await tester.tap(find.text('Тэгшитгэл'));
    await tester.pump();
    await tester.tap(find.text('30 мин'));
    await tester.pump();
    await tester.tap(start);
    await settle(tester);
    expect(bodies.first['budgetMinutes'], 30);
    expect(bodies.first['chapterIds'], ['c1']);
    expect(bodies.first['clientRequestId'], matches(RegExp(r'^[0-9a-f-]{36}$')));

    expect(find.text('1 / 1'), findsOneWidget);
    expect(find.textContaining('9:'), findsWidgets, reason: 'үлдсэн хугацаа');
    final save = find.widgetWithText(FilledButton, 'Эхний хариу хадгалах');
    expect(tester.widget<FilledButton>(save).onPressed, isNull);

    await tester.tap(find.bySemanticsLabel(RegExp(r'^2 хариулт')));
    await settle(tester, 2);
    await tester.ensureVisible(save);
    await tester.tap(save);
    await settle(tester);
    expect(bodies.last['answer'], 'choice:1');
    expect(bodies.last['kind'], 'FIRST');
    expect(find.text('Зөв'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Дахин бодсон хариу хадгалах'), findsOneWidget);

    final close = find.widgetWithText(FilledButton, 'Давтлагыг хааж, тайлбар үзэх');
    await tester.ensureVisible(close);
    await tester.tap(close);
    await settle(tester);
    expect(find.textContaining('Давтлага хаагдсан'), findsOneWidget);
    expect(find.text('Хариу, тайлбар нээх'), findsOneWidget);
    expect(find.text('Хувийн давтлага, албан дүн биш', skipOffstage: false), findsOneWidget);
    expect(find.text('Өөр давтлага сонгох', skipOffstage: false), findsOneWidget);

    // Таймер цэвэрлэгдэнэ.
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('сүлжээ тасрахад ижил clientRequestId-аар дахин илгээнэ (idempotent)', (tester) async {
    final ids = <Object?>[];
    var calls = 0;
    final http = FakeHttp()
      ..json('GET', '/study-review/options', {
        'chapters': [
          {'id': 'c1', 'title': 'Тэгшитгэл', 'freshCount': 6},
        ],
      })
      ..on('POST', '/study-review', (req) {
        ids.add((req.data as Map)['clientRequestId']);
        calls++;
        // Эхний хоёр оролдлого тасарна (ApiClient нэг удаа давтана), гурав дахь нь амжилттай.
        return calls <= 2 ? const FakeResponse.network() : FakeResponse(runJson());
      });
    await pumpLearning(tester, http, location: '/app/study/review');
    await tester.tap(find.text('Тэгшитгэл'));
    await tester.pump();
    final start = find.widgetWithText(FilledButton, 'Давтлага эхлэх');
    await tester.tap(start);
    await tester.pump(const Duration(seconds: 2));
    await settle(tester);
    expect(find.textContaining('Интернэт'), findsWidgets);

    await tester.tap(start);
    await tester.pump(const Duration(seconds: 2));
    await settle(tester);
    expect(ids.length, 3);
    expect(ids.toSet().length, 1, reason: 'ижил хүсэлтэд ижил id');
    expect(find.text('1 / 1'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('нээгдсэн давтлагыг resumeRunId-аар үргэлжлүүлнэ; хугацаа дууссан бол тайлбар', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/study-review/options', {'resumeRunId': 'r1', 'chapters': <Object?>[]})
      ..json('GET', '/study-review/r1', runJson(status: 'EXPIRED', first: {'answer': 'choice:0', 'flags': ['guessed'], 'correct': false}));
    await pumpLearning(tester, http, location: '/app/study/review');
    expect(find.text('Хугацаа дууссан'), findsOneWidget);
    expect(find.text('Буруу'), findsOneWidget);
    expect(find.text('Таасан'), findsWidgets);
    expect(find.text('Хариу, тайлбар нээх', skipOffstage: false), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('алдаа: монгол мессеж + дахин оролдох', (tester) async {
    final http = FakeHttp()..error('GET', '/study-review/options', 403, 'Forbidden');
    await pumpLearning(tester, http, location: '/app/study/review');
    expect(find.text('Давтлага нээгдсэнгүй'), findsOneWidget);
    expect(find.text('Дахин оролдох'), findsOneWidget);
  });

  testWidgets('түүх: жилээр, дараагийн хуудас, давтлага нээх холбоос', (tester) async {
    final http = FakeHttp()
      ..on('GET', '/study-review/history', (req) {
        final cursor = req.queryParameters['cursor'];
        Map<String, Object?> item(String id) => {
          'id': id,
          'budgetMinutes': 10,
          'state': 'SUBMITTED',
          'startedAt': '2026-10-30T02:00:00.000Z',
          'deadlineAt': '2026-10-30T02:10:00.000Z',
          'submittedAt': '2026-10-30T02:08:00.000Z',
          'evidence': {'assigned': 5, 'answered': 4, 'firstCorrect': 3, 'independentFirstCorrect': 2},
        };
        return FakeResponse({
          'year': int.parse('${req.queryParameters['year']}'),
          'items': [item(cursor == null ? 'h1' : 'h2')],
          'nextCursor': cursor == null ? 'c1' : null,
          'caution': 'Чадварын үнэлгээ биш',
        });
      })
      ..json('GET', '/study-review/options', {'chapters': <Object?>[]});
    await pumpLearning(tester, http, location: '/app/study/history');
    expect(find.byType(ReviewHistoryScreen), findsOneWidget);
    expect(find.text('2026.10.30 10:00'), findsOneWidget);
    expect(find.text('Эхний хариу 4/5, эхний зөв 3, тусламжгүй эхний зөв 2'), findsOneWidget);

    await tester.tap(find.text('Өмнөх бүртгэлүүд'));
    await settle(tester);
    expect(find.text('2026.10.30 10:00'), findsNWidgets(2));

    await tester.tap(find.byTooltip('Өмнөх жил'));
    await settle(tester);
    expect(http.requests.where((r) => r.path == '/study-review/history').last.queryParameters['year'], 2025);
  });

  testWidgets('нүүр: холбоосууд ба өнөөдрийн алдааны тоо', (tester) async {
    final http = FakeHttp()..json('GET', '/mistakes/today', [mistakeJson(), mistakeJson(id: 'm2')]);
    await pumpLearning(tester, http, location: '/app/study');
    expect(find.byType(StudyHubScreen), findsOneWidget);
    expect(find.text('Өнөөдөр 2 бодлого давтахаар байна'), findsOneWidget);
    expect(find.text('Томьёоны сан'), findsOneWidget);
    for (final t in ['Зорилго', 'Бэлэн байдал', 'Идэвх']) {
      await tester.scrollUntilVisible(find.text(t), 200, scrollable: find.byType(Scrollable).first);
      expect(find.text(t), findsOneWidget);
    }
    expect(find.textContaining('streak', findRichText: true), findsNothing);
  });
}
