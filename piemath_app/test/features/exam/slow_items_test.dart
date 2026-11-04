import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart';
import 'package:piemath_app/features/exam/domain/review_breakdown.dart';
import 'package:piemath_app/features/exam/domain/timer_format.dart';
import 'package:piemath_app/features/exam/ui/result_screens.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';
import 'exam_test_app.dart';

void main() {
  test('formatSpent: «1м 20с», «45с», «2м», «1ц 5м»', () {
    expect(formatSpent(80), '1м 20с');
    expect(formatSpent(45), '45с');
    expect(formatSpent(120), '2м');
    expect(formatSpent(3900), '1ц 5м');
    expect(formatSpent(3600), '1ц');
    expect(formatSpent(-3), '0с');
  });

  test('slowestItems: хамгийн удаан 3, 0 секундийг алгасна, тэнцвэл дугаараар', () {
    final r = slowestItems(const [
      ItemTime(n: 1, seconds: 30),
      ItemTime(n: 2, seconds: 95),
      ItemTime(n: 3, seconds: 0),
      ItemTime(n: 4, seconds: 95),
      ItemTime(n: 5, seconds: 60),
    ]);
    expect([for (final t in r) t.n], [2, 4, 5]);
    expect(slowestItems(const []), isEmpty);
  });

  test('загвар: itemTimes ба timeSpentSec сонголттой (хуучин серверт хоосон/null)', () {
    final page = ExamResultPage.fromJson(const {
      'test': {'id': 't', 'title': 'Т', 'type': 'EESH_MOCK'},
      'itemTimes': [
        {'n': 1, 'timeSpentSec': 40},
        {'n': 2, 'timeSpentSec': 'x'},
        {'n': 3, 'timeSpentSec': 75.4},
      ],
    });
    expect([for (final t in page.itemTimes) (t.n, t.seconds)], [(1, 40), (3, 75)]);
    expect(ExamResultPage.fromJson(const {'test': <String, Object?>{}}).itemTimes, isEmpty);
    expect(PracticeReviewItem.fromJson(const {'n': 1, 'timeSpentSec': 12}).timeSpentSec, 12);
    expect(PracticeReviewItem.fromJson(const {'n': 1}).timeSpentSec, isNull);
  });

  testWidgets('шалгалтын дүн: «Удаан бодсон» 3 бодлого, хугацаа «1м 20с»', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/exam-results/my/t1', {
        'test': {'id': 't1', 'title': 'ЭЕШ жишиг 3', 'type': 'EESH_MOCK'},
        'absent': false,
        'result': {'totalScore': 31, 'maxScore': 40, 'percent': 78},
        'review': {'level': 'FULL', 'opensAt': null, 'open': true, 'fullReview': false},
        'topics': <Object?>[],
        'wrong': <Object?>[],
        'itemTimes': [
          {'n': 1, 'timeSpentSec': 30},
          {'n': 7, 'timeSpentSec': 80},
          {'n': 9, 'timeSpentSec': 200},
          {'n': 12, 'timeSpentSec': 61},
        ],
      });
    await pumpM7(tester, const ExamResultScreen(testId: 't1'), http: http);
    expect(find.text('Удаан бодсон'), findsOneWidget);
    expect(find.text('9-р бодлого'), findsOneWidget);
    expect(find.text('3м 20с'), findsOneWidget);
    expect(find.text('1м 20с'), findsOneWidget);
    expect(find.text('1м 1с'), findsOneWidget);
    expect(find.text('1-р бодлого'), findsNothing, reason: 'зөвхөн хамгийн удаан 3');
    expect(tester.getTopLeft(find.text('9-р бодлого')).dy, lessThan(tester.getTopLeft(find.text('7-р бодлого')).dy));
  });

  testWidgets('хугацаагүй (цаасан дүн / хуучин сервер) бол «Удаан бодсон» гарахгүй', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/tests/t1/review', {
        'result': {'totalScore': 1, 'maxScore': 2},
        'items': [
          {'n': 1, 'points': 1, 'chapterTitle': 'Ф', 'statementText': 'Б', 'answered': true, 'correct': true},
        ],
        'leaveCount': 0,
      });
    await ExamTestApp(http).pump(tester, location: '/app/tests/t1/review');
    await ExamTestApp.settle(tester);
    expect(find.text('Удаан бодсон'), findsNothing);
  });

  testWidgets('дасгал тестийн эргэн харалт: items[].timeSpentSec-ээс «Удаан бодсон»', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/tests/t1/review', {
        'result': {'totalScore': 1, 'maxScore': 2},
        'items': [
          {
            'n': 1,
            'points': 1,
            'chapterTitle': 'Ф',
            'statementText': 'Б1',
            'answered': true,
            'correct': true,
            'timeSpentSec': 45,
          },
          {
            'n': 2,
            'points': 1,
            'chapterTitle': 'Ф',
            'statementText': 'Б2',
            'answered': true,
            'correct': false,
            'timeSpentSec': 80,
          },
        ],
        'leaveCount': 0,
      });
    await ExamTestApp(http).pump(tester, location: '/app/tests/t1/review');
    await ExamTestApp.settle(tester);
    expect(find.text('Удаан бодсон'), findsOneWidget);
    expect(find.text('1м 20с'), findsOneWidget);
    expect(find.text('45с'), findsOneWidget);
  });
}
