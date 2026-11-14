import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/teacher/data/makeup_visits.dart';
import 'package:piemath_app/features/teacher/ui/board_screen.dart';
import 'package:piemath_app/features/teacher/ui/room406_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

// Нөхөлт (эзэн 2026-11-08): өөр ангиас нөхөж суусан сурагч, 406 өрөө. Зохиомол нэр.

Map<String, Object?> _visit(
  String id,
  String sid, {
  String first = 'Мишээл',
  String last = 'Бат',
  Map<String, Object?>? home = const {'id': 'c4', 'name': '12-4 (Баруун 4)'},
  String? att,
  String? attNote,
  String? hw,
  List<Map<String, Object?>> tests = const [],
  String? comment,
}) => {
  'id': id,
  'date': testDate,
  'place': {'kind': 'CLASS', 'classroomId': 'c1', 'name': '12Б'},
  'label': '12Б ангид нөхөж суусан',
  'homeClassroom': home,
  'tests': tests,
  'comment': comment,
  'attendance': {'status': att, 'lateRange': null, 'note': attNote},
  'homework': {'status': hw, 'note': null},
  'teacher': {'id': 't1', 'name': 'Б. Болд'},
  'createdAt': '2026-11-02T07:00:00.000Z',
  'updatedAt': '2026-11-02T07:00:00.000Z',
  'student': {'id': sid, 'firstName': first, 'lastName': last, 'code': null},
  'updatedBy': null,
};

Map<String, Object?> _body(FakeHttp http, String method, String path) =>
    (http.requests.lastWhere((r) => r.method == method && r.path == path).data as Map).cast();

void main() {
  group('өгөгдөл', () {
    test('нэг өдөр хоёр газарт нөхсөн бол хоёуланг нь', () {
      final notes = visitNotesOf(const [
        HomeBadge(studentId: 's1', hostName: '12-6', label: '12-6 ангид нөхөж суусан'),
        HomeBadge(studentId: 's1', hostName: '406', label: '406-д нөхөж хийсэн'),
        HomeBadge(studentId: 's2', hostName: '406', label: '406-д нөхөж хийсэн'),
      ]);
      expect(
        notes['s1'],
        const VisitNote(short: '12-6-д нөхсөн, 406-д', full: '12-6 ангид нөхөж суусан, 406-д нөхөж хийсэн'),
      );
      expect(notes['s2']!.short, '406-д нөхсөн');
    });

    test('ангийн богино нэр, замын зураг (A хувилбар, номын дарааллаар)', () {
      expect(shortClass('12-6 (Баруун 4)'), '12-6');
      expect(shortClass('12Б'), '12Б');
      final units = roadmapUnits({
        'books': [
          {
            'code': 'H1',
            'title': 'Хавтгай-1',
            'topics': [
              {
                'name': 'Интеграл',
                'chapters': [
                  {
                    'chapterId': 'ch1',
                    'order': 1,
                    'title': 'Тест 1',
                    'tests': [
                      {'testId': 'tB', 'title': 'Тест 1', 'short': 'Т1 B', 'variant': 'B', 'status': 'DONE'},
                      {
                        'testId': 'tA',
                        'title': 'Тест 1',
                        'short': 'Т1',
                        'variant': 'A',
                        'status': 'DONE',
                        'doneOn': '2026-10-30',
                      },
                    ],
                  },
                  {'chapterId': 'ch2', 'order': 2, 'title': 'Хоосон', 'tests': <Object?>[]},
                ],
              },
            ],
          },
        ],
        'next': <Object?>[],
      });
      expect(units.single.testId, 'tA');
      expect(units.single.done, isTrue);
      expect(units.single.doneOn, '2026-10-30');
    });

    test('гараар бичсэн сэдэв жижиг үсгээр давхардахгүй', () {
      expect(const PickedTest(title: 'Интеграл  ') == const PickedTest(title: 'интеграл'), isTrue);
      expect(const PickedTest(testId: 't1', title: 'x') == const PickedTest(title: 'x'), isFalse);
    });
  });

  group('самбар: өөр ангиас нөхөж суусан', () {
    testWidgets('нэрийн доор «12-6-д нөхсөн» шошго; зочин картын ирц PATCH', (tester) async {
      final http =
          boardHttp(
            homeBadges: [
              {
                'visitId': 'v9',
                'studentId': 's2',
                'hostClassroomId': 'c6',
                'hostName': '12-6',
                'label': '12-6 ангид нөхөж суусан',
              },
            ],
            visits: [_visit('v1', 'g1')],
          )..on(
            'PATCH',
            '/makeup-visits/v1',
            (req) => FakeResponse(_visit('v1', 'g1', att: (req.data as Map)['attStatus'] as String?)),
          );
      await pumpTeacher(
        tester,
        const BoardScreen(classId: 'c1', date: testDate),
        http: http,
      );
      expect(find.text('12-6-д нөхсөн'), findsOneWidget);
      expect(find.byTooltip('12-6 ангид нөхөж суусан'), findsOneWidget);
      await scrollTo(tester, find.text('12-4 ангиас'));
      expect(http.requests.firstWhere((r) => r.path == '/makeup-visits').queryParameters, {
        'date': testDate,
        'place': 'c1',
      });
      expect(find.text('Өөр ангиас нөхөж суусан'), findsOneWidget);
      expect(find.text('Бат Мишээл'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('gatt-v1-present')));
      await settle(tester);
      expect(_body(http, 'PATCH', '/makeup-visits/v1'), {'attStatus': 'PRESENT'});
    });

    testWidgets('нэмэх: нэрээр хайж, энэ ангийн сурагчийг нэмүүлэхгүй', (tester) async {
      final http = boardHttp()
        ..json('GET', '/makeup-visits/students/search', [
          {
            'id': 'g1',
            'firstName': 'Мишээл',
            'lastName': 'Бат',
            'code': null,
            'classes': [
              {'id': 'c4', 'name': '12-4 (Баруун 4)'},
            ],
          },
          {
            'id': 'g2',
            'firstName': 'Мишээл',
            'lastName': 'Дорж',
            'code': null,
            'classes': [
              {'id': 'c1', 'name': '12Б'},
            ],
          },
        ])
        ..json('POST', '/makeup-visits', {
          'created': [_visit('v1', 'g1')],
          'skipped': <Object?>[],
        });
      await pumpTeacher(
        tester,
        const BoardScreen(classId: 'c1', date: testDate),
        http: http,
      );
      await scrollTo(tester, find.byKey(const ValueKey('guest-add')));
      await tester.tap(find.byKey(const ValueKey('guest-add')));
      await settle(tester);
      await tester.enterText(find.byKey(const ValueKey('student-search')), 'Ми');
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      expect(find.text('12Б ангийн сурагч'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('add-g1')));
      await settle(tester);
      expect(_body(http, 'POST', '/makeup-visits'), {
        'date': testDate,
        'hostClassroomId': 'c1',
        'studentIds': ['g1'],
      });
      expect(find.text('Нэмсэн'), findsOneWidget);
    });

    testWidgets('ирээдүйн өдөр нэмэх товчгүй', (tester) async {
      await pumpTeacher(
        tester,
        const BoardScreen(classId: 'c1', date: '2026-11-05'),
        http: boardHttp(),
      );
      await scrollTo(tester, find.text('Өөр ангиас нөхөж суусан сурагчийг хичээлийн өдөр нэмнэ'));
      expect(find.byKey(const ValueKey('guest-add')), findsNothing);
    });
  });

  group('406 нөхөх өрөө', () {
    FakeHttp room({List<Map<String, Object?>>? visits}) => FakeHttp()
      ..json(
        'GET',
        '/makeup-visits',
        visits ?? [_visit('v1', 'g1'), _visit('v2', 'g2', first: 'Сарнай', last: 'Ганаа')],
      )
      ..json('GET', '/makeup-visits/roadmap', {
        'books': [
          {
            'code': 'H1',
            'title': 'Хавтгай-1',
            'topics': [
              {
                'name': 'Интеграл',
                'chapters': [
                  {
                    'chapterId': 'ch1',
                    'order': 1,
                    'title': 'Т1',
                    'tests': [
                      {
                        'testId': 'tA',
                        'title': 'Тест 1',
                        'short': 'Т1',
                        'variant': 'A',
                        'status': 'DONE',
                        'doneOn': '2026-10-30',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        'next': <Object?>[],
      })
      ..on('PUT', '/makeup-visits/tests', (req) {
        final b = (req.data as Map).cast<String, Object?>();
        final tests = [
          for (final t in b['tests']! as List)
            {...(t as Map).cast<String, Object?>(), 'id': 'mt', 'source': 'RECORDED', 'result': null, 'variant': null},
        ];
        return FakeResponse([
          for (final id in b['visitIds']! as List) _visit(id as String, id == 'v1' ? 'g1' : 'g2', tests: tests),
        ]);
      });

    testWidgets('бүгдийг сонгоод нэг дор сэдэв: сүүлд хийсэн тест + гараар бичсэн сэдэв', (tester) async {
      final http = room();
      await pumpTeacher(tester, const Room406Screen(date: testDate), http: http);
      expect(http.requests.first.queryParameters, {'date': testDate, 'place': '406'});
      expect(find.text('Бат Мишээл'), findsOneWidget);
      expect(find.text('Ганаа Сарнай'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('room-select-all')));
      await settle(tester);
      expect(find.text('2 сурагч сонгосон'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('room-tests')));
      await settle(tester, frames: 20);
      expect(find.text('2 сурагч'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('recent-tA')));
      await settle(tester);
      await tester.enterText(find.byKey(const ValueKey('topic-input')), 'Логарифм');
      await settle(tester);
      await tester.tap(find.byKey(const ValueKey('topic-add')));
      await settle(tester);
      expect(find.text('Хадгалах (2)'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('room-tests-save')));
      await settle(tester, frames: 20);
      expect(_body(http, 'PUT', '/makeup-visits/tests'), {
        'visitIds': ['v1', 'v2'],
        'tests': [
          {'testId': 'tA', 'title': 'Т1'},
          {'testId': null, 'title': 'Логарифм'},
        ],
      });
      expect(find.text('2 сурагч сонгосон'), findsNothing);
      expect(find.text('Логарифм'), findsNWidgets(2));
    });

    testWidgets('320dp утсан дээр 406 халихгүй', (tester) async {
      await pumpTeacher(
        tester,
        const Room406Screen(date: testDate),
        http: room(),
        size: const Size(320, 640),
      );
      expect(tester.takeException(), isNull);
      await tester.tap(find.byKey(const ValueKey('room-select-all')));
      await settle(tester);
      expect(tester.takeException(), isNull);
    });

    testWidgets('хоосон өдөр — нэмэх товчууд; ирээдүйд бүртгэхгүй', (tester) async {
      await pumpTeacher(
        tester,
        const Room406Screen(date: testDate),
        http: room(visits: const []),
      );
      expect(find.text('Энэ өдөр 406-д нөхсөн сурагч алга'), findsOneWidget);
      expect(find.byKey(const ValueKey('room-add-name')), findsOneWidget);
      expect(find.byKey(const ValueKey('room-add-class')), findsOneWidget);
      await tester.tap(find.byTooltip('Дараагийн өдөр'));
      await settle(tester);
      expect(find.text('Ирээгүй өдөрт нөхөлт бүртгэхгүй, өнөөдрийг сонгоно уу'), findsOneWidget);
      expect(find.byKey(const ValueKey('room-add-name')), findsNothing);
    });

    testWidgets('ангиар нэмэх: анги сонгоод олныг зэрэг', (tester) async {
      final http = room(visits: const [])
        ..json('GET', '/makeup-visits/classrooms', [
          {'id': 'c4', 'name': '12-4 (Баруун 4)', 'studentCount': 2},
        ])
        ..json('GET', '/makeup-visits/classrooms/c4/students', [
          {
            'id': 'g1',
            'firstName': 'Мишээл',
            'lastName': 'Бат',
            'classroom': {'id': 'c4', 'name': '12-4 (Баруун 4)'},
          },
          {
            'id': 'g2',
            'firstName': 'Сарнай',
            'lastName': 'Ганаа',
            'classroom': {'id': 'c4', 'name': '12-4 (Баруун 4)'},
          },
        ])
        ..json('POST', '/makeup-visits', {
          'created': [_visit('v1', 'g1'), _visit('v2', 'g2', first: 'Сарнай', last: 'Ганаа')],
          'skipped': <Object?>[],
        });
      await pumpTeacher(tester, const Room406Screen(date: testDate), http: http);
      await tester.tap(find.byKey(const ValueKey('room-add-class')));
      await settle(tester, frames: 20);
      await tester.tap(find.byKey(const ValueKey('room-class-c4')));
      await settle(tester, frames: 20);
      await tester.tap(find.byKey(const ValueKey('room-pick-g1')));
      await tester.tap(find.byKey(const ValueKey('room-pick-g2')));
      await tester.pump();
      expect(find.text('Нэмэх (2)'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('room-class-submit')));
      await settle(tester, frames: 20);
      expect(_body(http, 'POST', '/makeup-visits'), {
        'date': testDate,
        'hostClassroomId': null,
        'studentIds': ['g1', 'g2'],
      });
    });
  });
}
