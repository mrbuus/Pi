import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/learning/ui/formula_review_screen.dart';

import '../../helpers/fake_http.dart';
import 'learning_test_app.dart';

Map<String, Object?> _card(String slug, String mode, {String? groupId, String token = 't'}) => {
  'slug': slug,
  'title': 'Томьёо $slug',
  'section': 'algebra',
  'latex': r'a^2+b^2',
  'general': null,
  'box': 1,
  'dueAt': '2026-11-03T00:00:00.000Z',
  'exercise': {
    'mode': mode,
    'token': '$token-$slug',
    'groupId': ?groupId,
    'prompt': mode == 'flashcard' ? null : r'x^2',
    'options': mode == 'truefalse'
        ? [
            {'id': 'true', 'text': 'Үнэн'},
            {'id': 'false', 'text': 'Худал'},
          ]
        : mode == 'flashcard'
        ? <Object?>[]
        : [
            {'id': 'o1', 'text': 'A1'},
            {'id': 'o2', 'text': 'B2'},
          ],
  },
};

Map<String, Object?> _receipt(String slug, {Map<String, Object?>? feedback, String result = 'GOOD'}) => {
  'slug': slug,
  'box': 2,
  'dueAt': '2026-11-05T02:00:00.000Z',
  'streak': 1,
  'result': result,
  'source': feedback == null ? 'SELF_ASSESSMENT' : 'SERVER_GRADED',
  'feedback': feedback,
};

FakeHttp _http(List<Map<String, Object?>> cards) => FakeHttp()
  ..json('GET', '/formulas/review/due', {'dueCount': cards.length, 'newCount': 1, 'cards': cards})
  ..json('GET', '/formulas/review/stats', {
    'mastered': 3,
    'learning': 4,
    'new': 5,
    'reviewedToday': 2,
    'streakDays': 6,
  });

final _buttons = find.byWidgetPredicate((w) => w is OutlinedButton);

void main() {
  testWidgets('нүүр: тоо, статистик, limit=10; эхлэх товч', (tester) async {
    final http = _http([_card('f1', 'flashcard')]);
    await pumpLearning(tester, http, location: '/app/formulas/review');
    expect(find.byType(FormulaReviewScreen), findsOneWidget);
    expect(find.text('2'), findsWidgets);
    expect(find.text('Эзэмшсэн'), findsOneWidget);
    expect(find.text('Эхлэх (1 карт)'), findsOneWidget);
    expect(find.textContaining('6 өдөр дараалан'), findsOneWidget);
    expect(http.requests.firstWhere((r) => r.path == '/formulas/review/due').queryParameters, {'limit': 10});
  });

  testWidgets('карт байхгүй: тайван «дууслаа» төлөв', (tester) async {
    await pumpLearning(tester, _http([]), location: '/app/formulas/review');
    expect(find.text('Өнөөдрийн давталт дууслаа'), findsOneWidget);
    expect(find.textContaining('Эхлэх'), findsNothing);
  });

  testWidgets('ачаалахад алдаа: монгол мессеж, дахин оролдох', (tester) async {
    final http = FakeHttp()
      ..error('GET', '/formulas/review/due', 500)
      ..error('GET', '/formulas/review/stats', 500);
    await pumpLearning(tester, http, location: '/app/formulas/review');
    expect(find.text('Давталт ачаалж чадсангүй'), findsOneWidget);
    expect(find.text('Дахин оролдох'), findsOneWidget);
  });

  testWidgets('флэш карт: эргүүлж, өөрийн үнэлгээ илгээнэ; хадгалагдсаны дараа л дараагийн карт', (tester) async {
    Map<String, Object?>? body;
    final http = _http([_card('f1', 'flashcard')])
      ..on('POST', '/formulas/review/f1', (req) {
        body = (req.data as Map).cast<String, Object?>();
        return FakeResponse(_receipt('f1'));
      });
    await pumpLearning(tester, http, location: '/app/formulas/review');
    await tester.tap(find.text('Эхлэх (1 карт)'));
    await settle(tester, 3);
    expect(find.text('Эргүүлж шалгах'), findsOneWidget);
    // үнэлгээ эргүүлэхээс өмнө харагдахгүй
    expect(find.text('Амархан'), findsNothing);
    await tester.tap(find.text('Эргүүлж шалгах'));
    await settle(tester, 6);
    await tester.tap(find.text('Амархан'));
    await settle(tester);
    expect(body, {'exerciseToken': 't-f1', 'result': 'EASY'});
    expect(find.text('Өөрийн үнэлгээ хадгалагдлаа'), findsOneWidget);
    expect(find.textContaining('Дараагийн давталт: 2026.11.05'), findsOneWidget);
    await tester.tap(find.text('Дүнгээ харах'));
    await settle(tester);
    expect(find.text('1/1 давтлаа'), findsOneWidget);
  });

  testWidgets('нөхөх: сервер шалгана, зөв хариултыг харуулна (түлхүүр өмнө нь харагдахгүй)', (tester) async {
    Map<String, Object?>? body;
    final http = _http([_card('f2', 'blank')])
      ..on('POST', '/formulas/review/f2', (req) {
        body = (req.data as Map).cast<String, Object?>();
        return FakeResponse(
          _receipt(
            'f2',
            result: 'AGAIN',
            feedback: {'correct': false, 'answer': 'B2', 'why': null, 'latex': null, 'general': null},
          ),
        );
      });
    await pumpLearning(tester, http, location: '/app/formulas/review');
    await tester.tap(find.text('Эхлэх (1 карт)'));
    await settle(tester, 3);
    expect(find.text('Зөв хариулт'), findsNothing);
    await tester.tap(_buttons.first);
    await settle(tester);
    expect(body, {'exerciseToken': 't-f2', 'answer': 'o1'});
    expect(find.text('Дахин санаарай'), findsOneWidget);
    expect(find.text('Зөв хариулт'), findsOneWidget);
    // дараагийн дарах боломжгүй: сонголтууд түгжигдсэн
    final buttons = tester.widgetList<OutlinedButton>(_buttons);
    expect(buttons.every((b) => b.onPressed == null), isTrue);
  });

  testWidgets('үнэн/худал: «true» хариуг «Үнэн» гэж харуулна', (tester) async {
    final http = _http([_card('f3', 'truefalse')])
      ..json(
        'POST',
        '/formulas/review/f3',
        _receipt('f3', feedback: {'correct': true, 'answer': 'true', 'why': null, 'latex': null, 'general': null}),
      );
    await pumpLearning(tester, http, location: '/app/formulas/review');
    await tester.tap(find.text('Эхлэх (1 карт)'));
    await settle(tester, 3);
    await tester.tap(find.widgetWithText(OutlinedButton, 'Үнэн'));
    await settle(tester);
    expect(find.text('Зөв хариуллаа'), findsOneWidget);
    expect(find.text('Үнэн'), findsWidgets);
  });

  testWidgets('хадгалах алдаа: дахин оролдоход ЯГ ИЖИЛ токен; хадгалагдаагүй гэж тайлбарлана', (tester) async {
    final bodies = <Map<String, Object?>>[];
    var calls = 0;
    final http = _http([_card('f1', 'flashcard')])
      ..on('POST', '/formulas/review/f1', (req) {
        bodies.add((req.data as Map).cast<String, Object?>());
        return ++calls == 1 ? const FakeResponse.network() : FakeResponse(_receipt('f1'));
      });
    await pumpLearning(tester, http, location: '/app/formulas/review');
    await tester.tap(find.text('Эхлэх (1 карт)'));
    await settle(tester, 3);
    await tester.tap(find.text('Эргүүлж шалгах'));
    await settle(tester, 6);
    await tester.tap(find.text('Зөв'));
    await settle(tester);
    expect(find.textContaining('хадгалагдаагүй байна'), findsOneWidget);
    await tester.tap(find.text('Дахин оролдох'));
    await settle(tester);
    expect(bodies.length, 2);
    expect(bodies[0], bodies[1]);
    expect(find.text('Өөрийн үнэлгээ хадгалагдлаа'), findsOneWidget);
  });

  testWidgets('409: дасгал шинэчлэгдсэн, шинээр ачаалах', (tester) async {
    final http = _http([_card('f1', 'flashcard')])
      ..error('POST', '/formulas/review/f1', 409, 'Дасгалын хугацаа дууссан');
    await pumpLearning(tester, http, location: '/app/formulas/review');
    await tester.tap(find.text('Эхлэх (1 карт)'));
    await settle(tester, 3);
    await tester.tap(find.text('Эргүүлж шалгах'));
    await settle(tester, 6);
    await tester.tap(find.text('Зөв'));
    await settle(tester);
    expect(find.text('Давталтыг шинээр ачаалах'), findsOneWidget);
    expect(find.text('Дахин оролдох'), findsNothing);
  });

  testWidgets('хос тааруулах: гарчиг сонгож томьёо дарна; ашигласан сонголт идэвхгүй', (tester) async {
    final bodies = <String>[];
    final http = _http([_card('m1', 'match', groupId: 'g'), _card('m2', 'match', groupId: 'g')])
      ..on('POST', '/formulas/review/m1', (req) {
        bodies.add('m1:${(req.data as Map)['answer']}');
        return FakeResponse(
          _receipt('m1', feedback: {'correct': true, 'answer': 'A1', 'why': null, 'latex': null, 'general': null}),
        );
      });
    await pumpLearning(tester, http, location: '/app/formulas/review');
    await tester.tap(find.text('Эхлэх (2 карт)'));
    await settle(tester, 3);
    expect(find.text('Томьёо m1'), findsOneWidget);
    // 0, 1 — гарчгууд; 2, 3 — томьёоны сонголтууд
    await tester.tap(_buttons.at(2));
    await settle(tester);
    expect(bodies, ['m1:o1']);
    expect(tester.widget<OutlinedButton>(_buttons.at(3)).onPressed, isNull); // хадгалж дуустал түгжигдсэн
    await tester.tap(find.text('Дараагийн карт'));
    await settle(tester);
    // ашигласан «A1» идэвхгүй, «B2» идэвхтэй
    expect(tester.widget<OutlinedButton>(_buttons.at(2)).onPressed, isNull);
    expect(tester.widget<OutlinedButton>(_buttons.at(3)).onPressed, isNotNull);
  });
}
