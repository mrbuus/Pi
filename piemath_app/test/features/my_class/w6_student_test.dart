import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/my_class/data/hub_models.dart';
import 'package:piemath_app/shared/quiz_score/quiz_score.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../student_fixtures.dart';
import '../student_harness.dart';

// Давалгаа 6 (вэб 2026-11-08…11-10): сурагчид шалгалтын оноо, А хувилбарын тестийн хариу хэзээ ч үгүй.

FakeHttp _http({Map<String, Object?>? days}) => FakeHttp()
  ..json('GET', '/student-hub/overview', overviewJson())
  ..json('GET', '/student-hub/days', days ?? daysJson())
  ..json('GET', '/student-hub/tests', testsJson())
  ..json('GET', '/attendance/my', attendanceJson())
  ..json('GET', '/makeup/me', makeupJson())
  ..json('GET', '/lesson-day/c1/2026-10-30/photos', theoryDayJson())
  ..json('GET', '/schedule/me', scheduleMeJson())
  ..json('GET', '/schedule/week', weekJson('2026-11-02'));

Map<String, Object?> _quizDay() => {
  ...dayJson(homework: null),
  'homework': {
    'status': null,
    'comment': null,
    'checkedOn': '2026-11-01',
    'quiz': {'score': 7.5, 'problemCount': 10},
  },
};

void main() {
  setUpAll(loadAppFonts);

  test('загвар: homework.quiz, todayOther, answersHidden', () {
    final d = HubDay.fromJson(_quizDay());
    expect(d.homework.quiz, const HubQuiz(score: 7.5, problemCount: 10));
    expect(HubDay.fromJson(dayJson()).homework.quiz, isNull);
    final o = HubOverview.fromJson({
      ...overviewJson(),
      'todayOther': [
        {
          'classroomId': 'c2',
          'classroomName': 'НИЙГЭМ (Зүүн 4)',
          'date': '2026-11-02',
          'startMinute': 1080,
          'endMinute': 1200,
          'room': '402',
          'topic': null,
        },
      ],
    });
    expect(o.todayOther.single.classroomId, 'c2');
    expect(HubOverview.fromJson(overviewJson()).todayOther, isEmpty);
    expect(HubTestDetail.fromJson({...testDetailJson(), 'answersHidden': true}).answersHidden, isTrue);
    expect(HubTestDetail.fromJson(testDetailJson()).answersHidden, isFalse);
  });

  testWidgets('өдрийн дэлгэц: шалгалтаар шалгасан бол «Шалгаагүй» биш оноо', (tester) async {
    await pumpStudentRoute(
      tester,
      http: _http(
        days: daysJson(month: '2026-10', days: [_quizDay()]),
      ),
      location: '/app/my-class/day/2026-10-30/c1',
    );
    await settle(tester);
    expect(find.text('Шалгалт'), findsOneWidget);
    expect(find.byType(QuizScoreChip), findsOneWidget);
    expect(find.text('75%'), findsOneWidget);
    expect(find.text('Шалгаагүй'), findsNothing);
    expect(find.text('11-р сарын 1 шалгасан'), findsOneWidget);
  });

  testWidgets('А хувилбарын тест: «Бүх хариу», «Хариу харах» товчгүй, тайлбартай', (tester) async {
    final detail = {
      ...testDetailJson(),
      'variant': 'A',
      'answersHidden': true,
      'problems': [
        for (final p in (testDetailJson()['problems']! as List).cast<Map<String, Object?>>())
          {...p, 'correctAnswer': null},
      ],
    };
    final http = _http()..json('GET', '/student-hub/tests/t1', detail);
    await pumpStudentRoute(tester, http: http, location: '/app/my-class/tests/t1');
    await settle(tester);
    expect(find.text('А хувилбарын тестийн хариу харагдахгүй'), findsOneWidget);
    expect(find.text('Бүх хариу'), findsNothing);
    expect(find.text('Хариу харах'), findsNothing);
  });

  testWidgets('B хувилбар: хариу товч хэвээр', (tester) async {
    final http = _http()..json('GET', '/student-hub/tests/t1', testDetailJson());
    await pumpStudentRoute(tester, http: http, location: '/app/my-class/tests/t1');
    await settle(tester);
    expect(find.text('Бүх хариу'), findsOneWidget);
    expect(find.text('Хариу харах'), findsWidgets);
    expect(find.text('А хувилбарын тестийн хариу харагдахгүй'), findsNothing);
  });
}
