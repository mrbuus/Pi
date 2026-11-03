// Самбарын «Онлайн» гэрийн даалгавар: 4-р хайрцаг, тоо, дэлгэрэнгүй sheet (вэбийн `StudentCard`,
// `OnlineDetail`). Зохиомол өгөгдөл.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/teacher/data/staff_models.dart';
import 'package:piemath_app/features/teacher/data/staff_repository.dart';
import 'package:piemath_app/features/teacher/domain/board_logic.dart';
import 'package:piemath_app/features/teacher/ui/board_screen.dart';
import 'package:piemath_app/features/teacher/ui/online_homework_sheet.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

const _screen = BoardScreen(classId: 'c1', date: testDate);
const _detailPath = '/classrooms/c1/homework-marks/online/s2';

Map<String, Object?> _marks({bool tests = true}) => {
  'date': testDate,
  'previousLessonDate': '2026-10-30',
  'tests': [
    if (tests) {'testId': 't1', 'title': 'Интеграл Б', 'variant': 'Б', 'problems': 3, 'fromTestId': 't0'},
  ],
  'students': {
    if (tests) 's2': {'score': 8.5, 'max': 10, 'testId': 't1', 'taken': 1},
  },
};

Map<String, Object?> _attempt() => {
  'id': 'a1',
  'status': 'SUBMITTED',
  'startedAt': '2026-10-31T11:00:00.000Z',
  'submittedAt': '2026-10-31T11:42:10.000Z',
  'durationSec': 2530,
  'activeSec': 4500,
  'awaySec': 40,
  'leaveCount': 5,
  'openCount': 2,
  'checksUsed': 1,
  'late': true,
  'score': 2,
  'total': 3,
  'items': [
    {'n': 1, 'problemId': 'p1', 'mine': 'A', 'correct': 'A', 'result': 'CORRECT'},
    {'n': 2, 'problemId': 'p2', 'mine': 'C', 'correct': 'E', 'result': 'WRONG'},
    {'n': 3, 'problemId': 'p3', 'mine': null, 'correct': 'D', 'result': 'BLANK'},
  ],
};

Map<String, Object?> _detail({bool tests = true, bool photo = true}) => {
  'date': testDate,
  'previousLessonDate': '2026-10-30',
  'student': {'id': 's2', 'firstName': 'Анужин', 'lastName': 'Дорж'},
  'tests': [
    if (tests) ...[
      {'testId': 't1', 'title': 'Интеграл Б', 'variant': 'Б', 'problems': 3, 'attempt': _attempt(), 'exam': null},
      {
        'testId': 't2',
        'title': 'Уламжлал',
        'variant': null,
        'problems': 4,
        'attempt': null,
        'exam': {'score': 7, 'max': 10},
      },
      {'testId': 't3', 'title': 'Функц', 'variant': null, 'problems': 2, 'attempt': null, 'exam': null},
    ],
  ],
  'photo': photo ? {'fileKey': 'hw/s2.pdf', 'pages': 2, 'uploadedAt': '2026-11-01T12:05:00.000Z', 'late': true} : null,
  'redos': [
    if (tests)
      {
        'attemptId': 'r1',
        'testId': 't0',
        'title': 'Давтлага А',
        'variant': 'А',
        'kind': 'CLASS',
        'round': 2,
        'status': 'SUBMITTED',
        'startedAt': '2026-11-01T02:50:00.000Z',
        'submittedAt': '2026-11-01T03:00:00.000Z',
        'activeSec': 600,
        'awaySec': 0,
        'leaveCount': 0,
        'openCount': 1,
        'score': 3,
        'total': 3,
      },
  ],
};

/// s1 даалгавраа илгээсэн, s2 онлайнаар бодсон (8,5/10), дутуу тэмдэглэгээтэй; s3 юу ч үгүй.
FakeHttp _http({bool tests = true, Map<String, Object?>? detail, bool withDetail = true}) {
  final board = boardJson(homework: [hwRow('s2', 'PARTIAL', comment: 'дутуу хийсэн')])
    ..['sent'] = {
      'assignmentIds': ['as1'],
      'students': ['s1'],
    };
  final http = boardHttp(board: board)..json('GET', '/classrooms/c1/homework-marks/online', _marks(tests: tests));
  if (withDetail) http.json('GET', _detailPath, detail ?? _detail());
  return http;
}

Finder _inSheet(Finder f) => find.descendant(of: find.byType(OnlineHomeworkSheet), matching: f);

Future<void> _open(WidgetTester tester, String sid) async {
  final box = find.byKey(ValueKey('online-$sid'));
  await scrollTo(tester, box);
  await tester.ensureVisible(box);
  await tester.pump();
  await tester.tap(box);
  await settle(tester);
}

void main() {
  group('Логик', () {
    test('оноо: аравтын таслал, нэг орон', () {
      expect(scoreText(9, 12), '9/12');
      expect(scoreText(8.5, 12), '8,5/12');
      expect(scoreText(8.25, 10), '8,3/10');
      expect(scoreText(7.0, 10.0), '7/10');
      expect(const OnlineCell(score: 8.5, max: 10, testId: 't').text, '8,5/10');
    });

    test('хугацаа, цаг, өмнөх хичээл', () {
      expect(durationSpan(40), '40с');
      expect(durationSpan(-5), '0с');
      expect(durationSpan(120), '2м');
      expect(durationSpan(125), '2м 5с');
      expect(durationSpan(4500), '1ц 15м');
      expect(durationSpan(7200), '2ц');
      expect(onlineStamp('2026-10-31T11:42:10.000Z'), '10.31 19:42');
      expect(onlineStamp(null), '');
      expect(previousLessonLabel('2026-10-30'), '10.30-ны даалгавар');
      expect(previousLessonLabel(null), isNull);
    });

    test('хайрцгийн төрөл ба дэлгэц уншигчийн шошго (вэбтэй ижил)', () {
      const cell = OnlineCell(score: 9, max: 12, testId: 't1');
      expect(onlineBox(onlineTests: false, sent: false), OnlineBox.placeholder);
      expect(onlineBox(onlineTests: true, sent: false), OnlineBox.idle);
      expect(onlineBox(onlineTests: true, sent: false, cell: cell), OnlineBox.active);
      expect(onlineBox(onlineTests: false, sent: true), OnlineBox.active);
      expect(
        onlineBoxLabel('Бат', onlineTests: true, sent: false, cell: cell),
        'Бат, онлайн гэрийн даалгавар 9/12, дэлгэрэнгүй',
      );
      expect(onlineBoxLabel('Бат', onlineTests: false, sent: true), 'Бат, илгээсэн даалгавар харах');
      expect(onlineBoxLabel('Бат', onlineTests: true, sent: false), 'Бат, онлайнаар бодоогүй, дэлгэрэнгүй');
      expect(onlineBoxLabel('Бат', onlineTests: false, sent: false), 'Онлайн гэрийн даалгавар алга');
    });

    test('дэлгэрэнгүй: хариуны харагдац, анхдагч тест = бодсон эхний тест', () {
      expect(answerText({'a': '3', 'b': ''}), 'a=3 b=_');
      expect(answerText(35), '35');
      expect(answerText(null), isNull);
      final d = OnlineDetail.fromJson({
        ..._detail(),
        'tests': [
          {'testId': 'x', 'title': 'Х', 'attempt': null, 'exam': null},
          ...(_detail()['tests']! as List),
        ],
      });
      expect(d.current(null)!.testId, 't1');
      expect(d.current('t2')!.exam!.score, 7);
      expect(d.current('алга')!.testId, 't1');
      final a = d.current(null)!.attempt!;
      expect(a.submitted, isTrue);
      expect(a.late, isTrue);
      expect(a.items.map((i) => (i.wrong, i.blank)), [(false, false), (true, false), (false, true)]);
      expect(d.photo!.pages, 2);
      expect(d.redos.single.inClass, isTrue);
      expect(const OnlineDetail(date: testDate).current(null), isNull);
    });
  });

  group('Репозитори', () {
    test('онлайн оноо: тестүүд, өмнөх хичээл', () async {
      final http = FakeHttp()..json('GET', '/classrooms/c1/homework-marks/online', _marks());
      final c = testContainer(http: http);
      final m = await c.read(staffRepositoryProvider).onlineMarks('c1', testDate);
      expect(http.requests.single.queryParameters, {'date': testDate});
      expect(m.hasTests, isTrue);
      expect(m.tests.single.title, 'Интеграл Б');
      expect(m.tests.single.fromTestId, 't0');
      expect(m.previousLessonDate, '2026-10-30');
      expect(m.students['s2']!.text, '8,5/10');
    });

    test('нэг сурагчийн дэлгэрэнгүй: зам, огноо, задлалт', () async {
      final http = FakeHttp()..json('GET', _detailPath, _detail());
      final c = testContainer(http: http);
      final d = await c.read(staffRepositoryProvider).onlineDetail('c1', 's2', testDate);
      final r = http.requests.single;
      expect(r.path, _detailPath);
      expect(r.queryParameters, {'date': testDate});
      expect(d.tests.map((t) => t.testId), ['t1', 't2', 't3']);
      expect(d.tests.first.attempt!.items[1].correct, 'E');
      expect(d.tests[1].attempt, isNull);
      expect(d.photo!.fileKey, 'hw/s2.pdf');
    });

    test('алдаа дамжина (дэлгэц «Дахин оролдох» харуулна)', () async {
      final http = FakeHttp()..error('GET', _detailPath, 404, 'Сурагч энэ ангид алга байна');
      final c = testContainer(http: http);
      await expectLater(c.read(staffRepositoryProvider).onlineDetail('c1', 's2', testDate), throwsA(anything));
    });
  });

  group('Самбар', () {
    testWidgets('даалгаврын мөрөнд 4-р «Онлайн» хайрцаг, тоо, шошго', (tester) async {
      final sem = tester.ensureSemantics();
      await pumpTeacher(tester, _screen, http: _http());
      expect(
        find.descendant(of: find.byKey(const ValueKey('online-s2')), matching: find.text('8,5/10')),
        findsOneWidget,
      );
      // Тоймд «Онлайн 1/3» (вэбийн SummaryBar).
      expect(find.bySemanticsLabel('Онлайн 1/3'), findsOneWidget);
      expect(find.bySemanticsLabel('Д. Анужин, онлайн гэрийн даалгавар 8,5/10, дэлгэрэнгүй'), findsOneWidget);
      await scrollTo(tester, find.byKey(const ValueKey('online-s1')));
      expect(find.bySemanticsLabel('Г. Сарнай, онлайнаар бодоогүй, дэлгэрэнгүй'), findsOneWidget);
      expect(find.bySemanticsLabel('Б. Тэмүүжин, илгээсэн даалгавар харах'), findsOneWidget);
      for (final sid in ['s1', 's3']) {
        expect(find.byKey(ValueKey('online-$sid')), findsOneWidget);
        expect(find.descendant(of: find.byKey(ValueKey('online-$sid')), matching: find.byType(Text)), findsNothing);
      }
      // 48-аас багагүй хүрэх талбай
      final size = tester.getSize(find.byKey(const ValueKey('online-s3')));
      expect(size.width, greaterThanOrEqualTo(48));
      expect(size.height, greaterThanOrEqualTo(48));
      sem.dispose();
    });

    testWidgets('онлайн тест алга, илгээгээгүй бол дарахгүй хайрцаг; илгээсэн бол дарна', (tester) async {
      final sem = tester.ensureSemantics();
      final http = _http(tests: false)..json('GET', '/classrooms/c1/homework-marks/online/s1', _detail(tests: false));
      await pumpTeacher(tester, _screen, http: http);
      expect(find.bySemanticsLabel('Онлайн гэрийн даалгавар алга'), findsNWidgets(2));
      expect(find.bySemanticsLabel(RegExp('^Онлайн \\d')), findsNothing);
      await _open(tester, 's3');
      expect(http.requests.where((r) => r.path.startsWith('/classrooms/c1/homework-marks/online/')), isEmpty);
      expect(find.byType(OnlineHomeworkSheet), findsNothing);
      await _open(tester, 's1');
      expect(http.count('GET', '/classrooms/c1/homework-marks/online/s1'), 1);
      expect(_inSheet(find.text('Дэвтрийн зураг')), findsOneWidget);
      expect(_inSheet(find.text('Харах, 2 хуудас')), findsOneWidget);
      sem.dispose();
    });

    testWidgets('дэлгэрэнгүй: тест, оноо, хугацаа, хариу, зураг, дахин бодсон, тэмдэглэл', (tester) async {
      final sem = tester.ensureSemantics();
      final http = _http();
      await pumpTeacher(tester, _screen, http: http);
      await _open(tester, 's2');
      expect(http.requests.lastWhere((r) => r.path == _detailPath).queryParameters, {'date': testDate});
      expect(_inSheet(find.text('Д. Анужин')), findsOneWidget);
      expect(_inSheet(find.text('12Б')), findsOneWidget);
      expect(_inSheet(find.text('10.30-ны даалгавар')), findsOneWidget);
      expect(_inSheet(find.text('Интеграл')), findsOneWidget);
      expect(_inSheet(find.text('Уламжлал')), findsOneWidget);
      for (final t in [
        'Зөв 2/3',
        'Бодсон хугацаа 1ц 15м',
        'Вэбээс гарсан 5 удаа',
        'Эхэлсэн 10.31 19:00',
        'Илгээсэн 10.31 19:42',
        'Нээсэн 2 удаа',
      ]) {
        expect(find.bySemanticsLabel(t), findsOneWidget, reason: t);
      }
      for (final t in [
        'Хоцорч илгээсэн',
        'вэбээс гарсан 40с',
        'эхэлснээс илгээх хүртэл 42м 10с',
        'шалгасан 1 удаа',
        'илгээсэн 11.01 20:05',
        'Хоцорсон',
        'Хариу',
        'A',
        'C',
        'E',
        'D',
        '–',
        'Дахин бодсон',
        'Ангид бодсон тест',
        'илгээсэн 11.01 11:00',
        'бодсон 10м',
        '3/3',
        'Даалгаврын тэмдэглэл',
        'Дутуу',
        'дутуу хийсэн',
      ]) {
        expect(_inSheet(find.text(t)), findsOneWidget, reason: t);
      }
      expect(find.bySemanticsLabel('1, A, Зөв'), findsOneWidget);
      expect(find.bySemanticsLabel('2, C, Буруу, зөв хариу E'), findsOneWidget);
      expect(find.bySemanticsLabel('3, хариугүй, Хариулаагүй, зөв хариу D'), findsOneWidget);
      expect(_inSheet(find.text('Дэвтрийн зураг илгээгээгүй')), findsNothing);
      sem.dispose();
    });

    testWidgets('тест солих: шалгалтын дүн → «Дүн нээх»; бодоогүй тест', (tester) async {
      await pumpTeacher(tester, _screen, http: _http());
      await _open(tester, 's2');
      await tester.tap(_inSheet(find.text('Уламжлал')));
      await settle(tester);
      expect(_inSheet(find.text('Оноо 7/10', findRichText: true)), findsOneWidget);
      expect(_inSheet(find.text('Хариу')), findsNothing);
      await tester.tap(_inSheet(find.text('Функц')));
      await settle(tester);
      expect(_inSheet(find.text('Онлайнаар бодоогүй')), findsOneWidget);
      await tester.tap(_inSheet(find.text('Уламжлал')));
      await settle(tester);
      await tester.tap(_inSheet(find.text('Дүн нээх')));
      await settle(tester);
      expect(find.text('ROUTE:/app/teacher/tests/t2/results'), findsOneWidget);
    });

    testWidgets('хоосон: онлайн даалгавар, зураг хоёулаа алга', (tester) async {
      await pumpTeacher(tester, _screen, http: _http(detail: _detail(tests: false, photo: false)));
      await _open(tester, 's2');
      expect(_inSheet(find.text('Энэ хичээлд онлайн гэрийн даалгавар алга')), findsOneWidget);
      await tester.tap(_inSheet(find.byTooltip('Хаах')));
      await settle(tester);
      expect(find.byType(OnlineHomeworkSheet), findsNothing);
    });

    testWidgets('алдаа → «Дахин оролдох»', (tester) async {
      // Эхний хүсэлт алдаа, дараагийнх амжилттай.
      final http = _http(withDetail: false)
        ..error('GET', _detailPath, 404, 'Сурагч энэ ангид алга байна')
        ..json('GET', _detailPath, _detail());
      await pumpTeacher(tester, _screen, http: http);
      await _open(tester, 's2');
      expect(_inSheet(find.text('Сурагч энэ ангид алга байна')), findsOneWidget);
      await tester.tap(_inSheet(find.text(AppStrings.retry)));
      await settle(tester);
      expect(http.count('GET', _detailPath), 2);
      expect(_inSheet(find.text('Интеграл')), findsOneWidget);
    });
  });
}
