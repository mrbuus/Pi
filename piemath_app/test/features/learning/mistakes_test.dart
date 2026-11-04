import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/learning/ui/mistake_detail.dart';
import 'package:piemath_app/features/learning/ui/mistakes_screen.dart';
import 'package:piemath_app/features/learning/ui/mistakes_today_screen.dart';

import '../../helpers/fake_http.dart';
import 'learning_test_app.dart';

Map<String, Object?> notebook({List<Map<String, Object?>>? items, String? next}) => {
  'counts': {'NEW': 2, 'RETRYING': 1, 'MASTERED': 4},
  'byTopic': [
    {'topic': 'Тэгшитгэл', 'count': 2},
    {'topic': 'Функц', 'count': 1},
  ],
  'items': items ?? [mistakeJson(), mistakeJson(id: 'm2', status: 'RETRYING', reason: 'CALC')],
  'nextCursor': next,
};

void main() {
  testWidgets('жагсаалт: тоо, сэдэв, шүүлтүүр шинэ хүсэлт илгээнэ', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/mistakes/my', notebook())
      ..json('GET', '/mistakes/today', [mistakeJson()]);
    await pumpLearning(tester, http, location: '/app/mistakes');

    expect(find.byType(MistakesScreen), findsOneWidget);
    expect(find.text('Алдааны дэвтэр'), findsWidgets);
    expect(find.text('4'), findsOneWidget);
    expect(find.text('Эзэмшсэн'), findsWidgets);
    expect(find.text('Өнөөдөр 1 бодлого давтахаар байна'), findsOneWidget);
    expect(find.text('Тэгшитгэл (2)'), findsOneWidget);

    await tester.tap(find.text('Тэгшитгэл (2)'));
    await settle(tester);
    expect(http.requests.where((r) => r.path == '/mistakes/my').last.queryParameters['topic'], 'Тэгшитгэл');

    await tester.tap(find.widgetWithText(ChoiceChip, 'Шинэ'));
    await settle(tester);
    final last = http.requests.where((r) => r.path == '/mistakes/my').last.queryParameters;
    expect(last['status'], 'NEW');
    expect(last['topic'], 'Тэгшитгэл');
  });

  testWidgets('хоосон дэвтэр: тайлбар', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/mistakes/my', notebook(items: []))
      ..json('GET', '/mistakes/today', <Object?>[]);
    await pumpLearning(tester, http, location: '/app/mistakes');
    expect(find.text('Дэвтэр хоосон байна'), findsOneWidget);
    expect(find.text('Өнөөдөр товлосон бодлого алга'), findsOneWidget);
  });

  testWidgets('алдаа: монгол мессеж + дахин оролдох', (tester) async {
    final http = FakeHttp()
      ..error('GET', '/mistakes/my', 500)
      ..json('GET', '/mistakes/today', <Object?>[]);
    await pumpLearning(tester, http, location: '/app/mistakes');
    expect(find.text('Алдааны дэвтэр ачаалж чадсангүй'), findsOneWidget);
    expect(find.text('Дахин оролдох'), findsOneWidget);
  });

  testWidgets('дараагийн хуудас cursor-оор ачаалагдаж давхардлыг хасна', (tester) async {
    final http = FakeHttp()
      ..on('GET', '/mistakes/my', (req) {
        if (req.queryParameters['cursor'] == 'c1') {
          return FakeResponse(notebook(items: [mistakeJson(id: 'm2'), mistakeJson(id: 'm3', statement: 'Гурав')]));
        }
        return FakeResponse(notebook(items: [mistakeJson(), mistakeJson(id: 'm2')], next: 'c1'));
      })
      ..json('GET', '/mistakes/today', <Object?>[]);
    await pumpLearning(tester, http, location: '/app/mistakes');
    await tester.scrollUntilVisible(find.text('Цааш үзэх'), 300, scrollable: find.byType(Scrollable).first);
    await tester.tap(find.text('Цааш үзэх'));
    await settle(tester);
    expect(find.text('Гурав', skipOffstage: false), findsOneWidget);
    expect(find.text('Цааш үзэх', skipOffstage: false), findsNothing);
  });

  testWidgets('дахин бодох: зөв хариуг сервер өгөхөөс өмнө харуулахгүй, дараа нь харуулна', (tester) async {
    Object? sent;
    final http = FakeHttp()
      ..json('GET', '/mistakes/my', notebook(items: [mistakeJson()]))
      ..json('GET', '/mistakes/today', <Object?>[])
      ..on('POST', '/mistakes/m1/retry', (req) {
        sent = (req.data as Map)['answer'];
        return const FakeResponse({
          'correct': false,
          'correctAnswer': r'$2$',
          'status': 'RETRYING',
          'retryCount': 1,
          'nextRetryAt': '2026-11-05T00:00:00.000Z',
          'solutionOutline': r'$x=\pm 2$',
        });
      });
    await pumpLearning(tester, http, location: '/app/mistakes');
    await tester.tap(find.textContaining('Тест 1').first);
    await settle(tester);
    expect(find.byType(MistakeDetail), findsOneWidget);
    expect(find.text('Зөв хариу: '), findsNothing);

    // Шалгах товч сонголтгүй үед идэвхгүй.
    final check = find.widgetWithText(FilledButton, 'Хариуг шалгах');
    expect(tester.widget<FilledButton>(check).onPressed, isNull);

    await tester.tap(find.bySemanticsLabel(RegExp(r'^2 хариулт')));
    await settle(tester, 2);
    await tester.ensureVisible(check);
    await tester.tap(check);
    await settle(tester);

    expect(sent, 1);
    expect(find.text('Одоохондоо зөрүүтэй байна'), findsOneWidget);
    expect(find.text('Зөв хариу: '), findsOneWidget);
    expect(find.textContaining('Дараагийн давтлага: 2026.11.05'), findsOneWidget);
  });

  testWidgets('шалтгаан сонгоход PATCH илгээнэ', (tester) async {
    Map<String, Object?>? body;
    final http = FakeHttp()
      ..json('GET', '/mistakes/my', notebook(items: [mistakeJson()]))
      ..json('GET', '/mistakes/today', <Object?>[])
      ..on('PATCH', '/mistakes/m1', (req) {
        body = (req.data as Map).cast<String, Object?>();
        return const FakeResponse({'id': 'm1', 'reason': 'FORMULA', 'note': null});
      });
    await pumpLearning(tester, http, location: '/app/mistakes');
    await tester.tap(find.textContaining('Тест 1').first);
    await settle(tester);
    await tester.tap(find.widgetWithText(ChoiceChip, 'Томьёо мартсан'));
    await settle(tester);
    expect(body, {'reason': 'FORMULA'});
    expect(tester.widget<ChoiceChip>(find.widgetWithText(ChoiceChip, 'Томьёо мартсан')).selected, isTrue);
  });

  testWidgets('өнөөдрийн давтлага: нэг нэгээр, дүн', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/mistakes/my', notebook())
      ..json('GET', '/mistakes/today', [mistakeJson(id: 't1')])
      ..json('POST', '/mistakes/t1/retry', {'correct': true, 'correctAnswer': r'$2$', 'status': 'MASTERED', 'retryCount': 3});
    await pumpLearning(tester, http, location: '/app/mistakes/today');
    expect(find.byType(MistakesTodayScreen), findsOneWidget);
    expect(find.text('1 / 1'), findsOneWidget);
    final next = find.widgetWithText(FilledButton, 'Дүнгээ харах');
    expect(tester.widget<FilledButton>(next).onPressed, isNull);

    await tester.ensureVisible(find.bySemanticsLabel(RegExp(r'^2 хариулт')));
    await tester.tap(find.bySemanticsLabel(RegExp(r'^2 хариулт')));
    await settle(tester, 2);
    final check = find.widgetWithText(FilledButton, 'Хариуг шалгах');
    await tester.ensureVisible(check);
    await tester.tap(check);
    await settle(tester);
    expect(find.text('Зөв'), findsOneWidget);
    expect(tester.widget<FilledButton>(next).onPressed, isNotNull);

    await tester.tap(next);
    await settle(tester);
    expect(find.text('1 бодлогоос 1-ийг зөв бодлоо'), findsOneWidget);
  });

  testWidgets('нүдтэй тоо нөхөх: хариуг түлхүүрээр объект болгож илгээнэ', (tester) async {
    Object? sent;
    final http = FakeHttp()
      ..json('GET', '/mistakes/my', notebook(items: []))
      ..json('GET', '/mistakes/today', [
        mistakeJson(id: 'f1', choices: null, format: 'FILL_NUMBER', answerFields: ['a', 'bc'], statement: 'Нөхөх'),
      ])
      ..on('POST', '/mistakes/f1/retry', (req) {
        sent = (req.data as Map)['answer'];
        return const FakeResponse({'correct': true, 'correctAnswer': {'a': '3', 'bc': '54'}, 'status': 'RETRYING'});
      });
    await pumpLearning(tester, http, location: '/app/mistakes/today');
    for (final d in ['3', '5', '4']) {
      final key = find.widgetWithText(OutlinedButton, d);
      await tester.ensureVisible(key);
      await tester.tap(key);
      await tester.pump();
    }
    final check = find.widgetWithText(FilledButton, 'Хариуг шалгах');
    await tester.ensureVisible(check);
    await tester.tap(check);
    await settle(tester);
    expect(sent, {'a': '3', 'bc': '54'});
    expect(find.text('Зөв хариу: '), findsOneWidget);
  });
}
