import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart';
import 'package:piemath_app/features/exam/domain/test_list_logic.dart';
import 'package:piemath_app/features/exam/ui/tests_list_screen.dart';

import '../../helpers/fake_http.dart';
import 'exam_test_app.dart';

Map<String, Object?> _exam(
  String id,
  String title, {
  String type = 'EESH_MOCK',
  Map<String, Object?> extra = const {},
}) => {
  'id': id,
  'title': title,
  'type': type,
  '_count': {'problems': 10},
  'results': <Object?>[],
  ...extra,
};

Map<String, Object?> _res(
  String id,
  String testId,
  String title,
  num total,
  num max,
  String at, {
  String type = 'DAILY',
}) => {
  'id': id,
  'testId': testId,
  'totalScore': total,
  'maxScore': max,
  'createdAt': at,
  'source': 'ONLINE_TEST',
  'enteredById': null,
  'test': {'id': testId, 'title': title, 'type': type},
};

void main() {
  group('логик (вэбийн StudentExamsHub)', () {
    test('upcoming: сервер өгөөгүй бол assignedAt > одоо', () {
      final now = DateTime.utc(2026, 11, 3);
      final future = TestRow.fromJson(
        const {'id': 'a', 'assignedAt': '2026-11-05T00:00:00Z'},
        deriveUpcoming: true,
        now: now,
      );
      final past = TestRow.fromJson(const {'id': 'b', 'assignedAt': '2026-11-01T00:00:00Z'}, deriveUpcoming: true, now: now);
      final explicit = TestRow.fromJson(
        const {'id': 'c', 'upcoming': false, 'assignedAt': '2026-11-05T00:00:00Z'},
        deriveUpcoming: true,
        now: now,
      );
      final plain = TestRow.fromJson(const {'id': 'd', 'assignedAt': '2026-11-05T00:00:00Z'}, now: now);
      expect([future.upcoming, past.upcoming, explicit.upcoming, plain.upcoming], [true, false, false, false]);
    });

    test('«Өгөх» эрэмбэ: эхэлсэн → эхлээгүй (upcoming) сүүлд → оноосон нь шинэ нь дээр', () {
      TestRow r(String id, {bool up = false, bool prog = false, String? at}) => TestRow(
        id: id,
        title: id,
        type: 'EESH_MOCK',
        upcoming: up,
        sessionStatus: prog ? SessionStatus.inProgress : SessionStatus.none,
        assignedAt: at == null ? null : DateTime.parse(at),
      );
      final sorted = sortExamsToTake([
        r('old', at: '2026-10-01T00:00:00Z'),
        r('soon', up: true, at: '2026-11-09T00:00:00Z'),
        r('new', at: '2026-10-20T00:00:00Z'),
        r('prog', prog: true, at: '2026-09-01T00:00:00Z'),
        r('none'),
      ]);
      expect(sorted.map((e) => e.id), ['prog', 'new', 'old', 'none', 'soon']);
    });

    test('Өгсөн: шалгалт + my-results (шалгалтад байгааг давхарлахгүй), шинэ нь дээр', () {
      final taken = TestRow(
        id: 'e1',
        title: '1000 бодлого · Сорил 3-A',
        type: 'THOUSAND',
        results: const [ScorePair(30, 40)],
        takenAt: DateTime.utc(2026, 10, 29),
      );
      final absent = TestRow(
        id: 'e2',
        title: 'ЭЕШ',
        type: 'EESH_MOCK',
        absent: true,
        takenAt: DateTime.utc(2026, 10, 30),
      );
      const pending = TestRow(
        id: 'e3',
        title: 'Хүлээгдэж буй',
        type: 'EESH_MOCK',
        sessionStatus: SessionStatus.submitted,
      );
      final results = [
        MyResult(
          id: 'x',
          testId: 'e1',
          title: 'ДАВХАР',
          type: 'THOUSAND',
          score: const ScorePair(30, 40),
          createdAt: DateTime.utc(2026, 10, 29),
        ),
        MyResult(
          id: 'y',
          testId: 't9',
          title: 'Илтгэгч 1',
          type: 'DAILY',
          score: const ScorePair(7, 8),
          createdAt: DateTime.utc(2026, 11, 1),
        ),
      ];
      final rows = buildDoneRows(takenExams: [taken, absent], allExams: [taken, absent, pending], results: results);
      expect(rows.map((r) => r.id), ['t9', 'e2', 'e1']);
      expect(rows.last.title, 'Сорил 3-A');
      expect(rows.first.path, '/app/tests/t9/review');
      expect(rows.last.path, '/app/tests/e1/result');
      expect(rows[1].absent, isTrue);
      expect(rows.first.score!.percent, 88);
    });

    test('tied нь өөрийгөө оруулсан тоо: зөвхөн >1 үед харуулна', () {
      expect(tiedLabel(0), isNull);
      expect(tiedLabel(1), isNull);
      expect(tiedLabel(3), '3 ижил дүн');
    });
  });

  group('жагсаалтын дэлгэц', () {
    FakeHttp http0() => FakeHttp()
      ..json('GET', '/tests', <Object?>[])
      ..json('GET', '/exam-results/my', {
        'exams': [
          _exam(
            'e1',
            'ЭЕШ жишиг 1',
            extra: {
              'results': [
                {'totalScore': 20, 'maxScore': 40},
              ],
              'sessionStatus': 'SUBMITTED',
              'takenAt': '2026-10-30T03:00:00.000Z',
            },
          ),
        ],
      })
      ..json('GET', '/tests/my-results', [
        _res('r2', 'd1', 'Логарифм 3', 9, 10, '2026-11-01T03:00:00.000Z'),
        _res('r1', 'e1', 'ЭЕШ жишиг 1', 20, 40, '2026-10-30T03:00:00.000Z', type: 'EESH_MOCK'),
      ])
      ..json('GET', '/test-rankings/d1', {
        'test': {'id': 'd1', 'title': 'Логарифм 3'},
        'totalScore': 9,
        'maxScore': 10,
        'classes': [
          {'id': 'c1', 'label': '12Б', 'rank': 2, 'participants': 24, 'tied': 3},
        ],
        'school': null,
        'exam': {'rank': null, 'participants': 5, 'tied': 0},
      });

    testWidgets('«Өгсөн, дүн»: шалгалт + дасгалын дүн /tests/my-results-оос нэг жагсаалтад', (tester) async {
      final http = http0();
      final app = ExamTestApp(http);
      await app.pump(tester, location: '/app/tests');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Өгсөн, дүн'));
      await tester.pumpAndSettle();
      expect(find.text('Логарифм 3'), findsOneWidget);
      expect(find.text('90%'), findsOneWidget);
      expect(find.text('ЭЕШ жишиг 1'), findsOneWidget); // давхардаагүй
      expect(find.text('50%'), findsOneWidget);
      await app.close(tester);
    });

    testWidgets('«Эрэмбэ» таб: байрыг товшиж нээх хүртэл татахгүй', (tester) async {
      final http = http0();
      final app = ExamTestApp(http);
      await app.pump(tester, location: '/app/tests');
      await tester.pumpAndSettle();
      await tester.tap(find.text('Эрэмбэ'));
      await tester.pumpAndSettle();
      expect(find.text('Логарифм 3'), findsOneWidget);
      expect(find.text('Миний эрэмбэ'), findsNWidgets(2));
      expect(http.count('GET', '/test-rankings/d1'), 0);
      expect(find.text('12Б'), findsNothing);

      await tester.tap(find.text('Миний эрэмбэ').first);
      await tester.pumpAndSettle();
      expect(http.count('GET', '/test-rankings/d1'), 1);
      expect(http.count('GET', '/test-rankings/e1'), 0);
      expect(find.text('12Б'), findsOneWidget);
      expect(find.text('2 / 24, 3 ижил дүн'), findsOneWidget);
      expect(find.text('Энэ шалгалт'), findsOneWidget);
      expect(find.text('Эрэмбэ тооцохгүй'), findsOneWidget);
      await app.close(tester);
    });

    testWidgets('/app/results-ranking → /app/tests?tab=rank', (tester) async {
      final http = http0();
      final app = ExamTestApp(http);
      await app.pump(tester, location: '/app/results-ranking');
      await tester.pumpAndSettle();
      expect(find.byType(TestsListScreen), findsOneWidget);
      expect(find.text('Миний эрэмбэ'), findsNWidgets(2));
      expect(http.count('GET', '/test-rankings/d1'), 0);
      await app.close(tester);
    });

    testWidgets('«Эрэмбэ»: дүн алга → тайван хоосон төлөв', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/tests', <Object?>[])
        ..json('GET', '/exam-results/my', {'exams': <Object?>[]})
        ..json('GET', '/tests/my-results', <Object?>[]);
      final app = ExamTestApp(http);
      await app.pump(tester, location: '/app/tests?tab=rank');
      await tester.pumpAndSettle();
      expect(find.text('Эрэмбэ хараахан алга'), findsOneWidget);
      await app.close(tester);
    });

    testWidgets('/tests/my-results алдаа → дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/tests', <Object?>[])
        ..json('GET', '/exam-results/my', {'exams': <Object?>[]})
        ..error('GET', '/tests/my-results', 500, 'Алдаа');
      final app = ExamTestApp(http);
      await app.pump(tester, location: '/app/tests');
      await tester.pumpAndSettle();
      expect(find.text('Тестийн жагсаалт ачаалж чадсангүй'), findsOneWidget);
      await app.close(tester);
    });
  });
}
