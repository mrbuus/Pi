import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/learning/ui/formula_detail_screen.dart';
import 'package:piemath_app/features/learning/ui/formulas_screen.dart';
import 'package:piemath_app/features/learning/ui/practice_screens.dart';

import '../../helpers/fake_http.dart';
import 'learning_test_app.dart';

void main() {
  group('дасгал', () {
    final recs = [
      {'problemId': 'p1', 'topicId': 't', 'score': 1, 'reason': 'WEAK_TOPIC', 'explanation': 'Энэ сэдвээр алдсан'},
      {'problemId': 'p2', 'topicId': 't', 'score': 1, 'reason': 'NEW_TOPIC', 'explanation': 'english only'},
    ];

    testWidgets('жагсаалт: шалтгаан монголоор, англи тайлбарыг нуух', (tester) async {
      final http = FakeHttp()..json('GET', '/recommend/next', recs);
      await pumpLearning(tester, http, location: '/app/practice');
      expect(find.byType(PracticeScreen), findsOneWidget);
      expect(find.text('Бататгах сэдэв'), findsOneWidget);
      expect(find.text('Энэ сэдвээр алдсан'), findsOneWidget);
      expect(find.text('english only'), findsNothing);
      expect(http.requests.first.queryParameters['limit'], 10);
    });

    testWidgets('хоосон ба алдаа', (tester) async {
      final http = FakeHttp()..json('GET', '/recommend/next', <Object?>[]);
      await pumpLearning(tester, http, location: '/app/practice');
      expect(find.text('Одоогоор санал болгох бодлого алга'), findsOneWidget);
    });

    testWidgets('алдаа: дахин оролдох товч', (tester) async {
      final http = FakeHttp()..error('GET', '/recommend/next', 500);
      await pumpLearning(tester, http, location: '/app/practice');
      expect(find.text('Дасгал ачаалж чадсангүй'), findsOneWidget);
      expect(find.text('Дахин оролдох'), findsOneWidget);
    });

    testWidgets('бодлого бодох: autoCorrect илгээхгүй, сервер зөрүүтэй гэвэл дэвтэр рүү заана', (tester) async {
      Map<String, Object?>? body;
      final http = FakeHttp()
        ..json('GET', '/recommend/next', recs)
        ..json('GET', '/problems/p1', {
          'id': 'p1',
          'format': 'CHOICE',
          'statementText': r'$1+1$',
          'imageKey': null,
          'choices': [
            {'label': 'A', 'text': r'$1$'},
            {'label': 'B', 'text': r'$2$'},
          ],
        })
        ..on('POST', '/recommend/attempt', (req) {
          body = (req.data as Map).cast<String, Object?>();
          return const FakeResponse({'attemptId': 'a1', 'correct': false});
        });
      await pumpLearning(tester, http, location: '/app/practice/p1');
      expect(find.byType(PracticeProblemScreen), findsOneWidget);
      final send = find.widgetWithText(FilledButton, 'Хариуг илгээх');
      expect(tester.widget<FilledButton>(send).onPressed, isNull);
      await tester.tap(find.bySemanticsLabel(RegExp(r'^B')));
      await settle(tester, 2);
      await tester.tap(send);
      await settle(tester);
      expect(body, {'problemId': 'p1', 'givenAnswer': 'B'});
      expect(body!.containsKey('autoCorrect'), isFalse);
      expect(find.textContaining('алдааны дэвтэрт хадгалагдлаа'), findsOneWidget);
      expect(find.text('Алдааны дэвтэр нээх'), findsOneWidget);
      expect(find.text('Дараагийн бодлого'), findsOneWidget);
    });

    testWidgets('нөхөх бодлого: тоон гараар бичиж, түлхүүр тодорхойгүй бол хадгалагдлаа', (tester) async {
      Map<String, Object?>? body;
      final http = FakeHttp()
        ..json('GET', '/recommend/next', recs)
        ..json('GET', '/problems/p2', {'id': 'p2', 'format': 'FILL_NUMBER', 'statementText': r'$3\cdot 4$ нь ?', 'choices': null})
        ..on('POST', '/recommend/attempt', (req) {
          body = (req.data as Map).cast<String, Object?>();
          return const FakeResponse({'attemptId': 'a2', 'correct': null});
        });
      await pumpLearning(tester, http, location: '/app/practice/p2');
      await tester.tap(find.widgetWithText(OutlinedButton, '1'));
      await tester.pump();
      await tester.tap(find.widgetWithText(OutlinedButton, '2'));
      await tester.pump();
      await tester.tap(find.widgetWithText(FilledButton, 'Хариуг илгээх'));
      await settle(tester);
      expect(body!['givenAnswer'], '12');
      expect(find.text('Хариу хадгалагдлаа'), findsOneWidget);
    });

    testWidgets('бодлого нээгдэхгүй (403): монгол мессеж', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/recommend/next', recs)
        ..error('GET', '/problems/p1', 403, 'Энэ бүлгийн эрх шаардлагатай');
      await pumpLearning(tester, http, location: '/app/practice/p1');
      expect(find.text('Бодлого нээгдсэнгүй'), findsOneWidget);
    });
  });

  group('томьёоны сан', () {
    Map<String, Object?> f(String slug, String title, String section, {String level = 'CORE'}) => {
      'slug': slug,
      'title': title,
      'section': section,
      'level': level,
      'order': 1,
      'latex': r'a^2+b^2=c^2',
    };

    testWidgets('жагсаалт: хэсгээр бүлэглэж, хайлт/түвшнээр шүүнэ', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/formulas/sections', [
          {'slug': 'alg', 'title': 'Алгебр', 'order': 1, 'count': 2},
          {'slug': 'geo', 'title': 'Геометр', 'order': 2, 'count': 1},
        ])
        ..json('GET', '/formulas', [
          f('sq', 'Квадратын томьёо', 'alg'),
          f('cube', 'Кубын томьёо', 'alg', level: 'EXTRA'),
          f('pyth', 'Пифагор', 'geo'),
        ])
        ..json('GET', '/formulas/my', {'totalFormulas': 3, 'seenFormulas': 0, 'items': <Object?>[]});
      await pumpLearning(tester, http, location: '/app/formulas');
      expect(find.byType(FormulasScreen), findsOneWidget);
      expect(find.text('Квадратын томьёо'), findsOneWidget);
      expect(find.text('Пифагор'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'пиф');
      await tester.pump();
      expect(find.text('Квадратын томьёо'), findsNothing);
      expect(find.text('Пифагор'), findsOneWidget);

      await tester.enterText(find.byType(TextField), '');
      await tester.pump();
      await tester.tap(find.widgetWithText(ChoiceChip, 'Нэмэлт'));
      await tester.pump();
      expect(find.text('Кубын томьёо'), findsOneWidget);
      expect(find.text('Пифагор'), findsNothing);

      await tester.tap(find.text('Миний томьёо'));
      await settle(tester);
      expect(find.text('Тестэд тулгарсан томьёо алга'), findsOneWidget);
    });

    testWidgets('дэлгэрэнгүй: тайлбар, жишээ, холбоотой томьёо', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/formulas/sq', {
          'slug': 'sq',
          'title': 'Квадратын томьёо',
          'section': {'slug': 'alg', 'title': 'Алгебр'},
          'latex': r'(a+b)^2=a^2+2ab+b^2',
          'explanation': 'Энгийнээр тайлбарлавал',
          'derivation': ['Эхний алхам', 'Хоёр дахь алхам'],
          'mnemonic': 'Цээжлэх арга',
          'examples': [
            {'problem': r'$(1+2)^2$', 'steps': ['Нэмнэ'], 'answer': r'$9$'},
          ],
          'commonMistakes': ['Дунд гишүүнийг мартах'],
          'related': [
            {'slug': 'cube', 'title': 'Кубын томьёо', 'latex': null},
          ],
        });
      await pumpLearning(tester, http, location: '/app/formulas/sq');
      expect(find.byType(FormulaDetailScreen), findsOneWidget);
      expect(find.text('Квадратын томьёо'), findsOneWidget);
      expect(find.text('Алгебр'), findsOneWidget);
      expect(find.text('Энгийнээр'), findsOneWidget);
      expect(find.text('Жишээ 1', skipOffstage: false), findsOneWidget);
      expect(find.text('Түгээмэл алдаа', skipOffstage: false), findsOneWidget);
      expect(find.text('Кубын томьёо', skipOffstage: false), findsOneWidget);
    });

    testWidgets('олдсонгүй: дахин оролдох', (tester) async {
      final http = FakeHttp()..error('GET', '/formulas/zz', 404, 'Томьёо олдсонгүй');
      await pumpLearning(tester, http, location: '/app/formulas/zz');
      expect(find.text('Томьёо нээгдсэнгүй'), findsOneWidget);
      expect(find.text('Томьёо олдсонгүй'), findsOneWidget);
    });
  });
}
