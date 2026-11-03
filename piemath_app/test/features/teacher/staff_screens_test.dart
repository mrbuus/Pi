import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/teacher/teacher_routes.dart';
import 'package:piemath_app/features/teacher/ui/announcements_screen.dart';
import 'package:piemath_app/features/teacher/ui/board_screen.dart';
import 'package:piemath_app/features/teacher/ui/leads_screen.dart';
import 'package:piemath_app/features/teacher/ui/pending_actions_screen.dart';
import 'package:piemath_app/features/teacher/ui/teacher_home_screen.dart';
import 'package:piemath_app/features/teacher/ui/teacher_hours_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

Map<String, Object?> _hours(String name) => {
  'month': '2026-11',
  'teachers': [
    {
      'teacherId': 'u1',
      'teacherName': name,
      'lessons': 1,
      'minutes': 120,
      'sessions': [
        {'date': '2026-11-02', 'classroomName': '12Б', 'startMinute': 900, 'endMinute': 1020},
      ],
    },
  ],
};

/// Жагсаалтыг гүйлгэж, элементийг бүрэн харагдуулна.
Future<void> reveal(WidgetTester tester, Finder f) async {
  await scrollTo(tester, f);
  await tester.ensureVisible(f);
  await tester.pump();
}

void main() {
  group('Самбарын нэмэлт (#8)', () {
    const past = '2026-10-30';

    FakeHttp http0() =>
        boardHttp(
            board: boardJson(attendance: [attRow('s1', 'ABSENT'), attRow('s2', 'PRESENT')], homework: [hwRow('s2', 'DONE')]),
          )
          ..json('GET', '/makeup/classrooms/c1', [
            {'studentId': 's1', 'studentName': 'Бат', 'date': past, 'reason': 'ABSENT', 'status': 'PENDING'},
            {'studentId': 's2', 'studentName': 'Дорж', 'date': past, 'reason': 'ABSENT', 'status': 'DONE'},
          ])
          ..json('GET', '/classrooms/c1/homework-marks/online', {
            'date': past,
            'previousLessonDate': '2026-10-28',
            'tests': [
              {'testId': 't1', 'title': 'Д1', 'variant': 'A', 'problems': 10},
            ],
            'students': {
              's2': {'score': 8, 'max': 10, 'testId': 't1', 'taken': 1},
            },
          });

    testWidgets('нөхөх хичээлийн төлөв (зөвхөн тасалсан сурагчид), «Онлайн» хайрцагт оноо', (tester) async {
      final http = http0()..json('GET', '/classrooms/c1/homework-marks/online/s2', {'date': past, 'tests': <Object?>[]});
      await pumpTeacher(tester, const BoardScreen(classId: 'c1', date: past), http: http);
      expect(http.requests.any((r) => r.path == '/makeup/classrooms/c1' && r.queryParameters['date'] == past), isTrue);
      await reveal(tester, find.byKey(const ValueKey('card-s1')));
      expect(
        find.descendant(of: find.byKey(const ValueKey('card-s1')), matching: find.byTooltip('Нөхөх хичээл: Нөхөөгүй')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: find.byKey(const ValueKey('card-s1')), matching: find.text('Нөхөөгүй')),
        findsOneWidget,
      );
      // s2 ирсэн тул нөхөх шошго гарахгүй
      expect(find.byTooltip('Нөхөх хичээл: Нөхсөн'), findsNothing);
      expect(find.descendant(of: find.byKey(const ValueKey('online-s2')), matching: find.text('8/10')), findsOneWidget);
      await reveal(tester, find.byKey(const ValueKey('online-s2')));
      await tester.tap(find.byKey(const ValueKey('online-s2')));
      await settle(tester);
      expect(http.count('GET', '/classrooms/c1/homework-marks/online/s2'), 1);
    });

    testWidgets('өнөөдөр нөхөх хичээл татахгүй; онлайн анги онлайн оноо татахгүй', (tester) async {
      final http = boardHttp(board: boardJson(type: 'ONLINE'));
      await pumpTeacher(tester, const BoardScreen(classId: 'c1', date: testDate), http: http);
      expect(http.requests.where((r) => r.path.startsWith('/makeup')), isEmpty);
      expect(http.requests.where((r) => r.path.contains('homework-marks/online')), isEmpty);
    });

    testWidgets('«Ангийн бусад мэдээлэл»: нээх хүртэл юу ч татахгүй; анхаарах сурагч', (tester) async {
      final http = boardHttp()
        ..json('GET', '/classrooms/c1/attention', {
          'date': testDate,
          'windowDays': 3,
          'rows': [
            {
              'student': {'id': 's1', 'firstName': 'Тэмүүжин', 'lastName': 'Бат', 'name': 'Бат Тэмүүжин'},
              'flags': [
                {'type': 'absence', 'severity': 'danger', 'title': 'Ирээгүй', 'detail': '2 удаа дараалан'},
              ],
            },
          ],
          'totals': {'flagged': 1, 'students': 3},
        })
        ..error('GET', '/classrooms/c1/daily-summary', 400, 'Дүгнэлт бодогдоогүй');
      await pumpTeacher(tester, const BoardScreen(classId: 'c1', date: testDate), http: http);
      expect(http.requests.where((r) => r.path.contains('attention')), isEmpty);
      await reveal(tester, find.text('Ангийн бусад мэдээлэл'));
      await tester.tap(find.text('Ангийн бусад мэдээлэл'));
      await settle(tester, frames: 20);
      await reveal(tester, find.text('Бат Тэмүүжин'));
      expect(find.text('Бат Тэмүүжин'), findsOneWidget);
      expect(find.text('Ирээгүй'), findsOneWidget);
      // Багш: эцэг эхийн хүсэлт татахгүй
      expect(http.requests.where((r) => r.path.startsWith('/parent')), isEmpty);
      // өнөөдөр 16:00 → өдрийн дүгнэлт 23:35-аас өмнө алгасна
      expect(http.requests.where((r) => r.path.contains('daily-summary')), isEmpty);
    });

    testWidgets('Багш+: эцэг эхийн хүсэлт батлах', (tester) async {
      final http = boardHttp()
        ..json('GET', '/classrooms/c1/attention', {'date': past, 'windowDays': 3, 'rows': <Object?>[], 'totals': {'flagged': 0, 'students': 3}})
        ..json('GET', '/classrooms/c1/daily-summary', {
          'stats': {'studentsTotal': 3, 'studentsMarked': 2, 'totalAttempts': 14, 'byState': <String, Object?>{}, 'byChapter': <String, Object?>{}},
        })
        ..json('GET', '/parent/links/pending', [
          {
            'id': 'l1',
            'parent': {'firstName': 'Болд', 'lastName': 'Ээж', 'phone': '99112233'},
            'student': {'firstName': 'Тэмүүжин', 'lastName': 'Бат', 'phone': '88112233', 'studentProfile': {'grade': 11}},
          },
        ])
        ..json('POST', '/parent/links/l1/verify', {'ok': true});
      await pumpTeacher(
        tester,
        const BoardScreen(classId: 'c1', date: past),
        http: http,
        session: teacherSession(role: 'TEACHER_PLUS'),
      );
      await reveal(tester, find.text('Ангийн бусад мэдээлэл'));
      await tester.tap(find.text('Ангийн бусад мэдээлэл'));
      await settle(tester, frames: 20);
      await reveal(tester, find.textContaining('Тэмдэглэсэн 2/3 сурагч'));
      expect(find.textContaining('Тэмдэглэсэн 2/3 сурагч'), findsOneWidget);
      await reveal(tester, find.text('Батлах'));
      await tester.tap(find.text('Батлах'));
      await settle(tester);
      expect(http.count('POST', '/parent/links/l1/verify'), 1);
      expect(find.text('Эцэг эхийн холболт баталгаажлаа'), findsOneWidget);
    });
  });

  group('Хүлээгдэж буй (#7)', () {
    FakeHttp http0({bool payments = true}) => FakeHttp()
      ..json('GET', '/parent/links/pending', <Object?>[])
      ..json('GET', '/users/students/pending-approval', [
        {'id': 's9', 'firstName': 'Сараа', 'lastName': 'Гомбо', 'phone': '88001122', 'grade': 10, 'registeredAt': '2026-11-01T02:00:00.000Z', 'hasConfirmedPayment': false},
      ])
      ..on(
        'GET',
        '/payments',
        (_) => payments
            ? const FakeResponse([
                {
                  'id': 'p1',
                  'amount': 350000,
                  'method': 'BANK',
                  'forMonth': '2026-11',
                  'user': {'firstName': 'Тэмүүжин', 'lastName': 'Бат', 'phone': '99112233'},
                },
              ])
            : const FakeResponse(
                {'statusCode': 403, 'message': 'Төлбөрийн эрх танд олгогдоогүй байна'},
                status: 403,
              ),
      );

    testWidgets('шинэ сурагчийг зөвшөөрөх: баталгаажуулалттай', (tester) async {
      final http = http0()..json('POST', '/users/students/s9/approve', {'ok': true});
      await pumpTeacher(tester, const PendingActionsScreen(), http: http, session: teacherSession(role: 'ADMIN'));
      expect(http.requests.firstWhere((r) => r.path == '/payments').queryParameters['status'], 'PENDING');
      await tester.tap(find.widgetWithText(FilledButton, 'Зөвшөөрөх'));
      await settle(tester);
      expect(http.count('POST', '/users/students/s9/approve'), 0);
      await tester.tap(find.widgetWithText(FilledButton, 'Зөвшөөрөх').last);
      await settle(tester);
      expect(http.count('POST', '/users/students/s9/approve'), 1);
      expect(find.text('Гомбо Сараа зөвшөөрөгдлөө'), findsOneWidget);
    });

    testWidgets('төлбөр баталгаажуулах: эрх олгохгүй, хоосон бие', (tester) async {
      final http = http0()..json('POST', '/payments/p1/confirm', {'ok': true});
      await pumpTeacher(tester, const PendingActionsScreen(), http: http, session: teacherSession(role: 'ADMIN'));
      await tester.scrollUntilVisible(find.text('Баталгаажуулах'), 200, scrollable: find.byType(Scrollable).first);
      await tester.tap(find.widgetWithText(FilledButton, 'Баталгаажуулах'));
      await settle(tester);
      expect(find.textContaining('350000₮'), findsWidgets);
      await tester.tap(find.widgetWithText(FilledButton, 'Баталгаажуулах').last);
      await settle(tester);
      final req = http.requests.lastWhere((r) => r.path == '/payments/p1/confirm');
      expect(req.data, <String, Object?>{});
      expect(find.text('Баталгаажлаа'), findsOneWidget);
    });

    testWidgets('финансын эрхгүй (403) → тайван мессеж', (tester) async {
      final http = http0(payments: false);
      await pumpTeacher(tester, const PendingActionsScreen(), http: http, session: teacherSession(role: 'TEACHER_PLUS'), size: const Size(390, 2400));
      await settle(tester, frames: 20);
      expect(find.text('Төлбөрийн эрх танд олгогдоогүй байна', skipOffstage: false), findsOneWidget);
      expect(find.text(AppStrings.retry, skipOffstage: false), findsOneWidget);
      expect(find.textContaining('₮', skipOffstage: false), findsNothing);
    });

    testWidgets('элсэлтийн хүсэлт: төлөв солих PATCH', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/leads', [
          {'id': 'ld1', 'name': 'Оюун', 'phone': '99112233', 'subject': 'MATH', 'grade': 11, 'status': 'NEW', 'createdAt': '2026-11-02T01:00:00.000Z'},
          {'id': 'ld2', 'name': 'Гэрэл', 'phone': '88112233', 'subject': 'BOTH', 'grade': 12, 'status': 'LOST', 'createdAt': '2026-11-01T01:00:00.000Z'},
        ])
        ..json('PATCH', '/leads/ld1/status', {'id': 'ld1', 'status': 'CONTACTED'});
      await pumpTeacher(tester, const LeadsScreen(), http: http, session: teacherSession(role: 'ADMIN'));
      expect(find.text('Оюун'), findsOneWidget);
      expect(find.text('Гэрэл'), findsNothing);
      expect(find.text('9911 2233'), findsOneWidget);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Холбогдсон').last);
      await settle(tester);
      final req = http.requests.lastWhere((r) => r.method == 'PATCH');
      expect(req.data, {'status': 'CONTACTED'});
      // шинэ төлөв рүү шилжсэн тул «Шинэ» жагсаалтаас гарна
      expect(find.text('Оюун'), findsNothing);
    });

    testWidgets('элсэлтийн төлөв хадгалагдахгүй бол буцаана', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/leads', [
          {'id': 'ld1', 'name': 'Оюун', 'phone': '99112233', 'subject': 'MATH', 'grade': 11, 'status': 'NEW', 'createdAt': '2026-11-02T01:00:00.000Z'},
        ])
        ..error('PATCH', '/leads/ld1/status', 403, 'Танд эрх алга');
      await pumpTeacher(tester, const LeadsScreen(), http: http, session: teacherSession(role: 'TEACHER_PLUS'));
      await tester.tap(find.widgetWithText(ChoiceChip, 'Холбогдсон').last);
      await settle(tester);
      expect(find.text('Танд эрх алга'), findsOneWidget);
      expect(find.text('Оюун'), findsOneWidget);
    });
  });

  group('Зар (#12)', () {
    testWidgets('зар тавих: бие зөв, сонгосон анги', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/announcements/manage', <Object?>[])
        ..json('GET', '/classrooms', [
          {'id': 'c1', 'name': '12Б', 'type': 'IN_PERSON', 'grade': 12, '_count': {'enrollments': 20}},
          {'id': 'c2', 'name': '11А', 'type': 'ONLINE', 'grade': 11, '_count': {'enrollments': 10}},
        ])
        ..json('POST', '/announcements', {'id': 'a1'});
      await pumpTeacher(tester, const AnnouncementsScreen(), http: http);
      expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Зарлах')).onPressed, isNull);
      await tester.enterText(find.widgetWithText(TextField, 'Гарчиг'), 'Амралт');
      await tester.enterText(find.widgetWithText(TextField, 'Зарын агуулга'), 'Маргааш хичээл байхгүй');
      await tester.tap(find.text('Сонгосон ангиуд'));
      await settle(tester);
      await tester.tap(find.text('12Б'));
      await settle(tester);
      await tester.scrollUntilVisible(find.text('Зарлах'), 200, scrollable: find.byType(Scrollable).first);
      await tester.tap(find.text('Зарлах'));
      await settle(tester);
      final req = http.requests.lastWhere((r) => r.method == 'POST');
      expect(req.data, {
        'title': 'Амралт',
        'body': 'Маргааш хичээл байхгүй',
        'audience': 'SELECTED_CLASSROOMS',
        'pinned': false,
        'classroomIds': ['c1'],
      });
      expect(find.text('Зар тавигдлаа'), findsOneWidget);
    });

    testWidgets('сервер татгалзвал мессеж харагдана', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/announcements/manage', <Object?>[])
        ..error('POST', '/announcements', 403, 'Танд зар тавих эрх алга');
      await pumpTeacher(tester, const AnnouncementsScreen(), http: http);
      await tester.enterText(find.widgetWithText(TextField, 'Гарчиг'), 'А');
      await tester.enterText(find.widgetWithText(TextField, 'Зарын агуулга'), 'Б');
      await tester.pump();
      await tester.scrollUntilVisible(find.text('Зарлах'), 200, scrollable: find.byType(Scrollable).first);
      await tester.tap(find.text('Зарлах'));
      await settle(tester);
      expect(find.text('Танд зар тавих эрх алга'), findsOneWidget);
    });

    test('мэдэгдлийн ?class=&date= холбоос → самбар', () {
      expect(teacherLinkRedirect(Uri.parse('/app/teacher?class=c1&date=2026-11-02')), '/app/teacher/board/c1?date=2026-11-02');
      expect(teacherLinkRedirect(Uri.parse('/app/teacher?class=c1')), '/app/teacher/board/c1');
      expect(teacherLinkRedirect(Uri.parse('/app/teacher?class=c1&date=bad')), '/app/teacher/board/c1');
      expect(teacherLinkRedirect(Uri.parse('/app/teacher?date=2026-11-02')), isNull);
      expect(teacherLinkRedirect(Uri.parse('/app/teacher?class=../x')), isNull);
      expect(teacherLinkRedirect(Uri.parse('/app/teacher')), isNull);
    });

    testWidgets('router: /app/teacher?class=&date= тэр анги, тэр өдрийг нээнэ; зөвхөн date → тэр өдрийн жагсаалт', (tester) async {
      final router = GoRouter(
        initialLocation: '/app/teacher?class=c1&date=2026-10-30',
        routes: [
          for (final r in teacherRoutes.shell)
            if (r is GoRoute && r.path == '/app/teacher')
              GoRoute(
                path: r.path,
                redirect: r.redirect,
                builder: (_, _) => const Text('HOME'),
                routes: [GoRoute(path: 'board/:classId', builder: (_, s) => Text('BOARD:${s.pathParameters['classId']}:${s.uri.queryParameters['date']}'))],
              ),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();
      expect(find.text('BOARD:c1:2026-10-30'), findsOneWidget);
    });

    testWidgets('нүүр: ?date= дамжина', (tester) async {
      final http = FakeHttp()..json('GET', '/attendance/board', {'date': '2026-10-30', 'classes': <Object?>[]});
      await pumpTeacher(tester, const TeacherHomeScreen(date: '2026-10-30'), http: http);
      expect(http.requests.first.queryParameters['date'], '2026-10-30');
    });
  });

  group('Нүүр: Багш+ / Админ', () {
    testWidgets('анхаарах сурагчид, хүлээгдэж буй холбоос — Багшид харагдахгүй', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/attendance/board', {'date': testDate, 'classes': <Object?>[]})
        ..json('GET', '/classrooms/attention-students', {
          'unassigned': [
            {'id': 's1', 'firstName': 'Сараа', 'lastName': 'Гомбо', 'studentCode': null, 'waitingSince': '2026-10-20'},
          ],
          'notAttending': <Object?>[],
        });
      await pumpTeacher(tester, const TeacherHomeScreen(), http: http, session: teacherSession(role: 'TEACHER_PLUS'));
      expect(find.text('1 хүүхэд ангид хуваарилагдаагүй'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('Хүлээгдэж буй'), 200, scrollable: find.byType(Scrollable).first);
      expect(find.text('Хүлээгдэж буй'), findsOneWidget);
    });

    testWidgets('Багш: нэмэлт хүсэлт явуулахгүй, зар л харагдана', (tester) async {
      final http = FakeHttp()..json('GET', '/attendance/board', {'date': testDate, 'classes': <Object?>[]});
      await pumpTeacher(tester, const TeacherHomeScreen(), http: http);
      expect(http.requests.where((r) => r.path.contains('attention-students')), isEmpty);
      await tester.scrollUntilVisible(find.text('Зар тавих'), 200, scrollable: find.byType(Scrollable).first);
      expect(find.text('Зар тавих'), findsOneWidget);
      expect(find.text('Хүлээгдэж буй'), findsNothing);
    });
  });

  group('Цагийн бүртгэл (#9)', () {
    testWidgets('Багш: /teacher-hours/me', (tester) async {
      final http = FakeHttp()..json('GET', '/teacher-hours/me', _hours('Н. Багш'));
      await pumpTeacher(tester, const TeacherHoursScreen(), http: http);
      expect(http.requests.map((r) => r.path), ['/teacher-hours/me']);
    });

    testWidgets('Багш+ time.review-гүй: өөрийнх', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/staff-capabilities/me', {
          'administrator': false,
          'grants': [
            {'id': 'implicit:finance.manage', 'capability': 'finance.manage', 'scopeKey': ''},
            {'id': 'g2', 'capability': 'time.review', 'scopeKey': 'c1'},
          ],
        })
        ..json('GET', '/teacher-hours/me', _hours('Н. Багш'));
      await pumpTeacher(tester, const TeacherHoursScreen(), http: http, session: teacherSession(role: 'TEACHER_PLUS'));
      expect(http.requests.last.path, '/teacher-hours/me');
    });

    testWidgets('Багш+ time.review-тэй: бүх багш', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/staff-capabilities/me', {
          'administrator': false,
          'grants': [
            {'id': 'g1', 'capability': 'time.review', 'scopeKey': ''},
          ],
        })
        ..json('GET', '/teacher-hours', {
          'month': '2026-11',
          'teachers': [
            ..._hours('Н. Багш')['teachers']! as List,
            {'teacherId': 'u2', 'teacherName': 'Б. Болор+', 'lessons': 3, 'minutes': 360, 'sessions': [
              {'date': '2026-11-01', 'classroomName': '11А', 'startMinute': 600, 'endMinute': 720},
            ]},
          ],
        });
      await pumpTeacher(tester, const TeacherHoursScreen(), http: http, session: teacherSession(role: 'TEACHER_PLUS'));
      expect(http.requests.last.path, '/teacher-hours');
      expect(find.text('Н. Багш'), findsOneWidget);
      expect(find.text('Б. Болор+'), findsOneWidget);
      expect(find.text('4 хичээл'), findsNothing);
      expect(find.text('8 цаг'), findsOneWidget);
      expect(find.textContaining('₮'), findsNothing);
    });

    testWidgets('Админ: бүх багш, эрхийн жагсаалт асуухгүй', (tester) async {
      final http = FakeHttp()..json('GET', '/teacher-hours', _hours('Н. Багш'));
      await pumpTeacher(tester, const TeacherHoursScreen(), http: http, session: teacherSession(role: 'ADMIN'));
      expect(http.requests.map((r) => r.path), ['/teacher-hours']);
    });

    testWidgets('эрхийн жагсаалт нээгдэхгүй бол өөрийнх рүү буцна', (tester) async {
      final http = FakeHttp()
        ..error('GET', '/staff-capabilities/me', 500)
        ..json('GET', '/teacher-hours/me', _hours('Н. Багш'));
      await pumpTeacher(tester, const TeacherHoursScreen(), http: http, session: teacherSession(role: 'TEACHER_PLUS'));
      expect(http.requests.last.path, '/teacher-hours/me');
    });
  });
}
