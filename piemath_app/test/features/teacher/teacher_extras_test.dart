import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/teacher/data/teacher_extras.dart';
import 'package:piemath_app/features/teacher/ui/board_screen.dart';
import 'package:piemath_app/features/teacher/ui/independent_tab.dart';
import 'package:piemath_app/features/teacher/ui/lesson_extras.dart';
import 'package:piemath_app/features/teacher/ui/student_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

const _board = BoardScreen(classId: 'c1', date: testDate);

/// 2026 оны бүх өдөр; [active] дахь өдрүүд идэвхтэй.
Map<String, Object?> _year(int year, Set<String> active) {
  final days = <Map<String, Object?>>[];
  for (var d = DateTime.utc(year); d.year == year; d = d.add(const Duration(days: 1))) {
    final key = d.toIso8601String().substring(0, 10);
    final on = active.contains(key);
    days.add({'date': key, 'count': on ? 5 : 0, 'level': on ? 2 : 0, 'isHoliday': false, 'isClassDay': true});
  }
  return {'year': year, 'totalActiveDays': active.length, 'days': days};
}

Map<String, Object?> _lessonDay({String? body}) => {
  'date': testDate,
  'records': <Object?>[],
  'notes': [
    if (body != null) {'scheduleId': 'sch1', 'body': body, 'updatedByName': 'Н. Багш+', 'updatedAt': '2026-11-02T06:00:00.000Z'},
  ],
  'dismissals': <Object?>[],
};

Map<String, Object?> _body(FakeHttp http, String method, String path) =>
    (http.requests.lastWhere((r) => r.method == method && r.path == path).data as Map).cast();

void main() {
  group('Загвар', () {
    test('идэвхийн дараалал: амралт таслахгүй, ирээдүйг тоохгүй', () {
      final y = ActivityYear.fromJson({
        'year': 2026,
        'totalActiveDays': 4,
        'days': [
          {'date': '2026-10-28', 'count': 3, 'level': 1, 'isHoliday': false},
          {'date': '2026-10-29', 'count': 0, 'level': 0, 'isHoliday': true},
          {'date': '2026-10-30', 'count': 2, 'level': 1, 'isHoliday': false},
          {'date': '2026-10-31', 'count': 0, 'level': 0, 'isHoliday': false},
          {'date': '2026-11-01', 'count': 4, 'level': 2, 'isHoliday': false},
          {'date': '2026-11-02', 'count': 4, 'level': 2, 'isHoliday': false},
          {'date': '2026-11-03', 'count': 9, 'level': 4, 'isHoliday': false},
        ],
      });
      final s = y.streak('2026-11-02');
      expect(s.current, 2);
      expect(s.longest, 2);
    });

    test('тарах цаг UB «HH:mm» болно; presence өөр түлхүүрийг тоохгүй', () {
      final d = DismissalInfo.fromJson({'approximateAt': '2026-11-02T09:10:00.000Z', 'lastLeftAt': null, 'note': 'x'});
      expect(d?.approximate, '17:10');
      expect(d?.lastLeft, isNull);
      expect(DismissalInfo.fromJson(null), isNull);
      final p = parsePresence({
        'editors': {
          'attendance:c1:$testDate': [
            {'name': 'Б. Болд', 'since': '2026-11-02T07:00:00.000Z'},
          ],
          'attendance:c2:$testDate': [
            {'name': 'Х'},
          ],
        },
      }, 'attendance:c1:$testDate');
      expect(p.map((e) => e.name), ['Б. Болд']);
    });
  });

  group('Бие даасан явц', () {
    FakeHttp http0() => FakeHttp()
      ..on('GET', '/activity/student/s1', (r) {
        final y = int.parse('${r.queryParameters['year']}');
        return FakeResponse(
          _year(y, y == 2026 ? {'2026-10-31', '2026-11-01', '2026-11-02'} : {'2025-03-03'}),
        );
      })
      ..json('GET', '/students/s1/test-results', [
        {'id': 'r1', 'totalScore': 18, 'maxScore': 20, 'createdAt': '2026-10-20T03:00:00.000Z', 'test': {'id': 't1', 'title': 'A'}},
        {'id': 'r2', 'totalScore': 5, 'maxScore': 10, 'createdAt': '2026-10-22T03:00:00.000Z', 'test': {'id': 't2', 'title': 'B'}},
      ]);

    Future<void> open(WidgetTester tester, FakeHttp http) async {
      await pumpTeacher(tester, const StudentScreen(studentId: 's1', name: 'Б. Тэмүүжин'), http: http);
      await tester.ensureVisible(find.text('Бие даасан явц'));
      await tester.pump();
      await tester.tap(find.text('Бие даасан явц'));
      await settle(tester, frames: 20);
    }

    testWidgets('дулааны зураг, дараалал, шалгалтын хураангуй', (tester) async {
      final http = http0();
      await open(tester, http);
      expect(find.text('Энэ жил 3 өдөр идэвхтэй байлаа'), findsOneWidget);
      expect(find.text('Дараалсан өдөр 3'), findsOneWidget);
      expect(find.text('Хамгийн урт 3'), findsOneWidget);
      expect(find.byType(ActivityHeatmap), findsOneWidget);
      expect(find.text('Бага'), findsOneWidget);
      await scrollTo(tester, find.text('Хамгийн сайн'));
      final sem = tester.ensureSemantics();
      expect(find.bySemanticsLabel('Өгсөн тест 2'), findsOneWidget);
      expect(find.bySemanticsLabel('Дундаж 70%'), findsOneWidget);
      expect(find.bySemanticsLabel('Хамгийн сайн 90%'), findsOneWidget);
      sem.dispose();
    });

    testWidgets('өмнөх жил рүү; ирээдүй рүү болохгүй', (tester) async {
      final http = http0();
      await open(tester, http);
      final next = tester.widget<IconButton>(find.byWidgetPredicate((w) => w is IconButton && w.tooltip == 'Дараагийн жил'));
      expect(next.onPressed, isNull);
      await tester.tap(find.byTooltip('Өмнөх жил'));
      await settle(tester, frames: 20);
      expect(http.requests.where((r) => r.path == '/activity/student/s1').last.queryParameters['year'], 2025);
      expect(find.text('2025 онд 1 өдөр идэвхтэй байлаа'), findsOneWidget);
      expect(find.text('Дараалсан өдөр 1'), findsNothing);
    });

    testWidgets('алдаа → дахин оролдох', (tester) async {
      final failing = FakeHttp()
        ..error('GET', '/activity/student/s1', 403, 'Энэ сурагчийг харах эрхгүй')
        ..json('GET', '/students/s1/test-results', <Object?>[]);
      await open(tester, failing);
      expect(find.text('Энэ сурагчийг харах эрхгүй'), findsOneWidget);
      expect(find.text(AppStrings.retry), findsOneWidget);
      expect(find.text('Шалгалтын дүн алга'), findsOneWidget);
    });
  });

  group('Хичээлийн тэмдэглэл', () {
    testWidgets('бичих → PUT, дараа нь дахин татна', (tester) async {
      final http = boardHttp()
        ..on('GET', '/lesson-records/day', (_) => FakeResponse(_lessonDay()))
        ..json('PUT', '/lesson-records/sch1/note', {'scheduleId': 'sch1', 'date': testDate, 'note': null});
      await pumpTeacher(tester, _board, http: http);
      await scrollTo(tester, find.text('Өнөөдрийн хичээлийн тэмдэглэл бичих'));
      await tester.tap(find.text('Өнөөдрийн хичээлийн тэмдэглэл бичих'));
      await settle(tester);
      await tester.enterText(find.byType(TextField), '  Интеграл дууссан  ');
      await tester.tap(find.text(AppStrings.save));
      await settle(tester);
      expect(_body(http, 'PUT', '/lesson-records/sch1/note'), {'date': testDate, 'body': 'Интеграл дууссан'});
      expect(http.count('GET', '/lesson-records/day'), 2);
    });

    testWidgets('байгаа тэмдэглэл: зохиогч харагдана; «Цэвэрлэх» → body null', (tester) async {
      final http = boardHttp()
        ..on('GET', '/lesson-records/day', (_) => FakeResponse(_lessonDay(body: 'Даалгавар өгсөн')))
        ..json('PUT', '/lesson-records/sch1/note', {'scheduleId': 'sch1', 'date': testDate, 'note': null});
      await pumpTeacher(tester, _board, http: http);
      await scrollTo(tester, find.text('Даалгавар өгсөн'));
      expect(find.textContaining('Н. Багш+'), findsOneWidget);
      await tester.tap(find.text('Даалгавар өгсөн'));
      await settle(tester);
      await tester.tap(find.text('Цэвэрлэх'));
      await settle(tester);
      expect(_body(http, 'PUT', '/lesson-records/sch1/note'), {'date': testDate, 'body': null});
    });

    testWidgets('алдаа → дахин оролдох', (tester) async {
      final http = boardHttp()..error('GET', '/lesson-records/day', 403, 'Хичээлийн бүртгэл харах эрхгүй');
      await pumpTeacher(tester, _board, http: http);
      await settle(tester, frames: 20);
      await scrollTo(tester, find.text(AppStrings.retry));
      await settle(tester);
      expect(find.text('Хичээлийн бүртгэл харах эрхгүй'), findsOneWidget);
      expect(find.text(AppStrings.retry), findsOneWidget);
    });
  });

  group('Тарах цаг', () {
    Map<String, Object?> record() => {
      'classroomId': 'c1',
      'approximateAt': '2026-11-02T09:10:00.000Z',
      'lastLeftAt': '2026-11-02T09:40:00.000Z',
      'note': 'Хоцорсон',
    };

    testWidgets('байгаа цаг UB-ээр харагдана; тайлбар засаад хадгална', (tester) async {
      final http = boardHttp()
        ..json('GET', '/lesson-records/day', _lessonDay())
        ..json('GET', '/learning-lab/classrooms/c1/dismissal', record())
        ..on('PUT', '/learning-lab/classrooms/c1/dismissal?date=$testDate', (_) => FakeResponse(record()));
      await pumpTeacher(tester, _board, http: http);
      await scrollTo(tester, find.text('Тарах цаг'));
      expect(find.textContaining('Ойролцоо 17:10'), findsOneWidget);
      expect(find.textContaining('Сүүлийн сурагч 17:40'), findsOneWidget);
      await tester.tap(find.text('Тарах цаг'));
      await settle(tester);
      await tester.enterText(find.byType(TextField), 'Хөдөлгөөн ихтэй');
      await tester.tap(find.text(AppStrings.save));
      await settle(tester);
      expect(_body(http, 'PUT', '/learning-lab/classrooms/c1/dismissal?date=$testDate'), {
        'approximateTime': '17:10',
        'lastLeftTime': '17:40',
        'note': 'Хөдөлгөөн ихтэй',
      });
      expect(http.count('GET', '/learning-lab/classrooms/c1/dismissal'), greaterThan(1));
    });

    testWidgets('тэмдэглээгүй үед цаг заавал; сүүлийн цаг өмнө байж болохгүй', (tester) async {
      final http = boardHttp()
        ..json('GET', '/lesson-records/day', _lessonDay())
        ..on('GET', '/learning-lab/classrooms/c1/dismissal', (_) => const FakeResponse(null));
      await pumpTeacher(tester, _board, http: http);
      // Самбарын тоймд ч «Тэмдэглээгүй» байгаа тул тарах цагийн картаас л.
      final unset = find.descendant(of: find.byType(DismissalCard), matching: find.text('Тэмдэглээгүй'));
      await scrollTo(tester, unset);
      await tester.tap(unset);
      await settle(tester);
      await tester.tap(find.text(AppStrings.save));
      await settle(tester);
      expect(find.text('Тарах ойролцоо цагаа сонгоно уу'), findsOneWidget);
      expect(http.requests.where((r) => r.method == 'PUT'), isEmpty);
    });

    testWidgets('эрхгүй анги (403) → карт харагдахгүй', (tester) async {
      final http = boardHttp()
        ..json('GET', '/lesson-records/day', _lessonDay())
        ..error('GET', '/learning-lab/classrooms/c1/dismissal', 403, 'Зөвхөн өөрийн ангийн цагийг тэмдэглэнэ.');
      await pumpTeacher(tester, _board, http: http);
      await settle(tester, frames: 20);
      expect(find.text('Тарах цаг'), findsNothing);
      expect(find.text(AppStrings.retry), findsNothing);
    });
  });

  group('Эрсдэлийн шалгуур', () {
    Map<String, Object?> payload(int absences) => {
      'criteria': {
        'windowDays': 30,
        'minAttendance': 80,
        'maxAbsences': absences,
        'maxLates': 4,
        'minHomework': 60,
        'missingStreak': 2,
      },
      'isDefault': absences == 3,
      'defaults': {
        'windowDays': 30,
        'minAttendance': 80,
        'maxAbsences': 3,
        'maxLates': 4,
        'minHomework': 60,
        'missingStreak': 2,
      },
    };

    testWidgets('Багш+: засаад хадгална, эрсдэл дахин татагдана', (tester) async {
      final http = boardHttp(board: {...boardJson(), 'canEditCriteria': true})
        ..json('GET', '/lesson-records/day', _lessonDay())
        ..json('GET', '/attendance/classrooms/c1/criteria', payload(3))
        ..json('PUT', '/attendance/classrooms/c1/criteria', payload(4));
      await pumpTeacher(tester, _board, http: http, session: teacherSession(role: 'TEACHER_PLUS'));
      final marksBefore = http.count('GET', '/attendance/classrooms/c1/marks');
      await tester.tap(find.byTooltip('Эрсдэлийн шалгуур'));
      await settle(tester);
      expect(find.text('Анхдагч болгох'), findsNothing);
      await tester.tap(find.byTooltip('Тасалсан дээд тоо, нэмэгдүүлэх'));
      await tester.pump();
      expect(find.text('Анхдагч болгох'), findsOneWidget);
      await tester.tap(find.text(AppStrings.save));
      await settle(tester);
      expect(_body(http, 'PUT', '/attendance/classrooms/c1/criteria'), {
        'windowDays': 30,
        'minAttendance': 80,
        'maxAbsences': 4,
        'maxLates': 4,
        'minHomework': 60,
        'missingStreak': 2,
      });
      expect(http.count('GET', '/attendance/classrooms/c1/marks'), greaterThan(marksBefore));
    });

    testWidgets('Багш: товч харагдахгүй', (tester) async {
      await pumpTeacher(tester, _board, http: boardHttp());
      expect(find.byTooltip('Эрсдэлийн шалгуур'), findsNothing);
    });

    testWidgets('хадгалах алдаа серверийн мессежтэй', (tester) async {
      final http = boardHttp(board: {...boardJson(), 'canEditCriteria': true})
        ..json('GET', '/lesson-records/day', _lessonDay())
        ..json('GET', '/attendance/classrooms/c1/criteria', payload(3))
        ..error('PUT', '/attendance/classrooms/c1/criteria', 403, 'Багш+ эрх шаардлагатай');
      await pumpTeacher(tester, _board, http: http, session: teacherSession(role: 'TEACHER_PLUS'));
      await tester.tap(find.byTooltip('Эрсдэлийн шалгуур'));
      await settle(tester);
      await tester.tap(find.byTooltip('Хоцорсон дээд тоо, багасгах'));
      await tester.pump();
      await tester.tap(find.text(AppStrings.save));
      await settle(tester);
      expect(find.text('Багш+ эрх шаардлагатай'), findsOneWidget);
    });
  });

  group('Presence', () {
    testWidgets('бусдыг харуулна, 45 сек тутам цохино, гарахдаа leave', (tester) async {
      final http = boardHttp()
        ..json('GET', '/lesson-records/day', _lessonDay())
        ..json('POST', '/presence', {
          'editors': {
            'attendance:c1:$testDate': [
              {'name': 'Б. Болд', 'since': '2026-11-02T07:00:00.000Z'},
            ],
          },
        });
      await pumpTeacher(tester, _board, http: http, presence: true);
      expect(find.text('Б. Болд мөн энэ ангийг тэмдэглэж байна'), findsOneWidget);
      expect(_body(http, 'POST', '/presence'), {
        'keys': ['attendance:c1:$testDate'],
      });
      await tester.pump(const Duration(seconds: 46));
      expect(http.count('POST', '/presence'), 2);
      await tester.pumpWidget(const SizedBox());
      await settle(tester);
      expect(_body(http, 'POST', '/presence')['leave'], true);
    });

    testWidgets('алдаа гарвал самбар хэвийн', (tester) async {
      final http = boardHttp()
        ..json('GET', '/lesson-records/day', _lessonDay())
        ..error('POST', '/presence', 403, 'Төвийн багшийн эрх шаардлагатай');
      await pumpTeacher(tester, _board, http: http, presence: true);
      expect(find.text('Д. Анужин'), findsOneWidget);
      expect(find.textContaining('мөн энэ ангийг'), findsNothing);
      await tester.pumpWidget(const SizedBox());
      await settle(tester);
    });
  });
}
