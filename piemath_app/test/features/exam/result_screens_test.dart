import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/exam/ui/ranking_screen.dart';
import 'package:piemath_app/features/exam/ui/result_screens.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';

Map<String, Object?> _result({
  bool absent = false,
  bool open = false,
  String? opensAt,
  List<Object?>? wrong,
  Object? practice,
}) => {
  'test': {'id': 't1', 'title': 'ЭЕШ жишиг 3', 'type': 'EESH_MOCK'},
  'absent': absent,
  'result': absent ? null : {'totalScore': 31, 'maxScore': 40, 'percent': 78},
  'parts': absent ? null : {'part1': 24, 'part1Max': 28, 'part2': 7, 'part2Max': 12},
  'review': absent ? null : {'level': 'FULL', 'opensAt': opensAt, 'open': open, 'fullReview': false},
  'topics': absent
      ? <Object?>[]
      : [
          {'name': 'Интеграл', 'percent': 60, 'earned': 6, 'max': 10},
          {'name': 'Тригонометр', 'percent': 90, 'earned': 9, 'max': 10},
        ],
  'wrong': wrong,
  'practice': practice,
};

void main() {
  group('Шалгалтын дүн', () {
    testWidgets('оноо, хэсгүүд, сэдэв тус бүрийн задаргаа; ангийн байр өгөгдмөлөөр харагдахгүй', (tester) async {
      final handle = tester.ensureSemantics();
      final http = FakeHttp()..json('GET', '/exam-results/my/t1', _result());
      await pumpM7(tester, const ExamResultScreen(testId: 't1'), http: http);
      expect(find.text('31 / 40'), findsOneWidget);
      expect(find.text('78 хувь'), findsOneWidget);
      expect(find.text('I хэсэг 24/28'), findsOneWidget);
      expect(find.text('II хэсэг 7/12'), findsOneWidget);
      expect(find.text('Сэдвийн эзэмшил'), findsOneWidget);
      expect(find.bySemanticsLabel('Интеграл: 60 хувь'), findsOneWidget);
      expect(find.bySemanticsLabel('Тригонометр: 90 хувь'), findsOneWidget);
      // Байрны мэдээллийг автоматаар татахгүй.
      expect(http.count('GET', '/test-rankings/t1'), 0);
      expect(find.text('Миний байрыг харах'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('бодолт нээгдээгүй: нээгдэх огноо тодорхой бичигдэнэ', (tester) async {
      final http = FakeHttp()..json('GET', '/exam-results/my/t1', _result(opensAt: '2026-11-08T02:00:00.000Z'));
      await pumpM7(tester, const ExamResultScreen(testId: 't1'), http: http);
      expect(find.text('Буруу бодлого, бодолт хараахан нээгдээгүй'), findsOneWidget);
      // UB цаг (UTC+8): 10:00.
      expect(find.textContaining('2026.11.08 10:00-нд автоматаар нээгдэнэ'), findsOneWidget);
    });

    testWidgets('нээгдэх огноогүй бол багшийн нээлтийг хүлээнэ', (tester) async {
      final http = FakeHttp()..json('GET', '/exam-results/my/t1', _result());
      await pumpM7(tester, const ExamResultScreen(testId: 't1'), http: http);
      expect(find.text('Багш нээсний дараа харагдана.'), findsOneWidget);
    });

    testWidgets('нээгдсэн, бүгд зөв', (tester) async {
      final http = FakeHttp()..json('GET', '/exam-results/my/t1', _result(open: true, wrong: <Object?>[]));
      await pumpM7(tester, const ExamResultScreen(testId: 't1'), http: http);
      expect(find.text('Алдсан бодлого'), findsOneWidget);
      expect(find.text('Бүх бодлогыг зөв бодсон байна.'), findsOneWidget);
    });

    testWidgets('буруу бодлого: нөхцөл, алдсан алхам; сул сэдвээ давтах', (tester) async {
      final http = FakeHttp()
        ..json(
          'GET',
          '/exam-results/my/t1',
          _result(
            open: true,
            wrong: [
              {
                'n': 12,
                'part': 2,
                'items': [
                  {'label': 'a', 'status': 'WRONG', 'points': 1},
                  {'label': 'bc', 'status': 'BLANK', 'points': 1},
                ],
                'lost': 2,
                'problem': {
                  'format': 'FILL_NUMBER',
                  'statementText': 'Нөхцөл бичвэр',
                  'imageKey': null,
                  'myAnswer': {'a': '3'},
                },
              },
            ],
            practice: {
              'topic': 'Интеграл',
              'chapterIds': ['ch1'],
            },
          ),
        );
      await pumpM7(tester, const ExamResultScreen(testId: 't1'), http: http);
      expect(find.text('Сул сэдвээ давтах'), findsOneWidget);
      expect(find.text('Алдсан алхам: a, bc'), findsOneWidget);
    });

    testWidgets('ирээгүй гэж тэмдэглэгдсэн', (tester) async {
      final http = FakeHttp()..json('GET', '/exam-results/my/t1', _result(absent: true));
      await pumpM7(tester, const ExamResultScreen(testId: 't1'), http: http);
      expect(find.text('Та энэ шалгалтад ирээгүй гэж тэмдэглэгдсэн.'), findsOneWidget);
      expect(find.text('Миний байрыг харах'), findsNothing);
    });

    testWidgets('дүн гараагүй (404) → монгол мессеж, дахин оролдох', (tester) async {
      final http = FakeHttp()..error('GET', '/exam-results/my/t1', 404, 'Энэ шалгалтын дүн хараахан гараагүй байна');
      await pumpM7(tester, const ExamResultScreen(testId: 't1'), http: http);
      expect(find.text('Дүнг ачаалж чадсангүй'), findsOneWidget);
      expect(find.text(AppStrings.retry), findsOneWidget);
      http.json('GET', '/exam-results/my/t1', _result());
      await tester.tap(find.text(AppStrings.retry));
      await settle(tester);
      expect(find.text('31 / 40'), findsOneWidget);
    });

    testWidgets('«Миний байрыг харах» → ranking зам', (tester) async {
      final http = FakeHttp()..json('GET', '/exam-results/my/t1', _result());
      await pumpM7(tester, const ExamResultScreen(testId: 't1'), http: http);
      await scrollTo(tester, find.text('Миний байрыг харах'));
      await tester.tap(find.text('Миний байрыг харах'));
      await settle(tester);
      expect(find.text('ROUTE:/app/tests/t1/ranking'), findsOneWidget);
    });
  });

  group('Байр (/test-rankings/:id)', () {
    testWidgets('анги, сургууль, нийт — нэргүй', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/test-rankings/t1', {
          'test': {'id': 't1', 'title': 'ЭЕШ жишиг 3'},
          'totalScore': 31,
          'maxScore': 40,
          'classes': [
            {'id': 'c1', 'label': '12Б', 'rank': 3, 'participants': 24, 'tied': 1},
          ],
          'school': {'label': 'Жишээ сургууль', 'rank': 10, 'participants': 80, 'tied': 0},
          'exam': {'rank': 41, 'participants': 520, 'tied': 3},
          'rankingMethod': 'COMPETITION_PERCENTAGE',
          'identityVisibility': 'PRIVATE',
        });
      await pumpM7(tester, const TestRankingScreen(testId: 't1'), http: http);
      expect(find.text('Таны оноо 31 / 40'), findsOneWidget);
      expect(find.text('12Б'), findsOneWidget);
      expect(find.text('3-р байр'), findsOneWidget);
      expect(find.text('24 оролцогчоос, ижил оноотой 1 хүн'), findsOneWidget);
      expect(find.text('Жишээ сургууль'), findsOneWidget);
      expect(find.text('41-р байр'), findsOneWidget);
      expect(find.text('Нийт шалгалт'), findsOneWidget);
      expect(find.text('Бусад оролцогчийн нэр харагдахгүй'), findsOneWidget);
    });

    testWidgets('сервер зөвшөөрөөгүй (404) → тайван тайлбар, алдаа биш', (tester) async {
      final http = FakeHttp()..error('GET', '/test-rankings/t1', 404, 'Дууссан шалгалтын дүн олдсонгүй');
      await pumpM7(tester, const TestRankingScreen(testId: 't1'), http: http);
      expect(find.text('Байр одоогоор харагдахгүй байна'), findsOneWidget);
      expect(find.text(AppStrings.retry), findsNothing);
    });

    testWidgets('байр тооцогдоогүй (rank null)', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/test-rankings/t1', {
          'test': {'id': 't1', 'title': 'ЭЕШ'},
          'totalScore': 5,
          'maxScore': 40,
          'classes': <Object?>[],
          'school': null,
          'exam': {'rank': null, 'participants': 0, 'tied': 0},
        });
      await pumpM7(tester, const TestRankingScreen(testId: 't1'), http: http);
      expect(find.text('Байр хараахан тооцогдоогүй байна'), findsOneWidget);
    });

    testWidgets('сүлжээний алдаа → дахин оролдох', (tester) async {
      final http = FakeHttp()..on('GET', '/test-rankings/t1', (_) => const FakeResponse.network());
      await pumpM7(tester, const TestRankingScreen(testId: 't1'), http: http);
      // ApiClient GET-ийг нэг удаа давтана (0-1с jitter).
      await tester.pump(const Duration(seconds: 2));
      await settle(tester);
      expect(find.text('Байрыг ачаалж чадсангүй'), findsOneWidget);
      expect(find.text(AppStrings.retry), findsOneWidget);
    });
  });
}
