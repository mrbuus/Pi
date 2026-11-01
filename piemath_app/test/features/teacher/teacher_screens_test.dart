import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/strings.dart';
import 'package:piemath_app/features/teacher/ui/assignments_screen.dart';
import 'package:piemath_app/features/teacher/ui/classes_screen.dart';
import 'package:piemath_app/features/teacher/ui/student_screen.dart';
import 'package:piemath_app/features/teacher/ui/teacher_home_screen.dart';
import 'package:piemath_app/features/teacher/ui/teacher_hours_screen.dart';

import '../../helpers/fake_http.dart';
import 'teacher_fixtures.dart';
import 'teacher_harness.dart';

Map<String, Object?> _dayClass(String id, String name, {bool mine = false, String type = 'IN_PERSON'}) => {
  'id': id,
  'name': name,
  'type': type,
  'grade': 12,
  'studentCount': 20,
  'lessons': [
    {'scheduleId': 'sch-$id', 'startMinute': 900, 'endMinute': 1020, 'room': '501', 'topic': 'Интеграл', 'mine': mine},
  ],
};

Map<String, Object?> _staff(String id, String first, String last, String role) => {
  'id': id,
  'firstName': first,
  'lastName': last,
  'role': role,
};

void main() {
  group('Багшийн самбар', () {
    testWidgets('өнөөдрийн ангиуд → самбар руу', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/attendance/board', {
          'date': testDate,
          'classes': [_dayClass('c1', '12Б', mine: true), _dayClass('c2', '11А')],
          'selected': null,
        });
      await pumpTeacher(tester, const TeacherHomeScreen(), http: http);
      expect(find.textContaining('Өнөөдөр, 11-р сарын 2, Даваа'), findsOneWidget);
      expect(find.text('12Б'), findsOneWidget);
      expect(find.text('11А'), findsOneWidget);
      expect(http.requests.first.queryParameters['date'], testDate);
      await tester.tap(find.text('12Б'));
      await settle(tester);
      expect(find.text('ROUTE:/app/teacher/board/c1?date=$testDate'), findsOneWidget);
    });

    testWidgets('хичээлгүй өдөр; дараагийн өдөр рүү', (tester) async {
      final http = FakeHttp()..json('GET', '/attendance/board', {'date': testDate, 'classes': <Object?>[]});
      await pumpTeacher(tester, const TeacherHomeScreen(), http: http);
      expect(find.text('Энэ өдөр хичээлтэй анги алга'), findsOneWidget);
      await tester.tap(find.byTooltip('Дараагийн өдөр'));
      await settle(tester);
      expect(http.requests.last.queryParameters['date'], '2026-11-03');
      expect(find.text('Өнөөдөр'), findsOneWidget);
    });

    testWidgets('алдаа → дахин оролдох', (tester) async {
      final http = FakeHttp()..on('GET', '/attendance/board', (_) => const FakeResponse(null, status: 500));
      await pumpTeacher(tester, const TeacherHomeScreen(), http: http);
      await settle(tester, frames: 40);
      expect(find.text(AppStrings.retry), findsOneWidget);
    });
  });

  group('Ангиуд', () {
    final classes = [
      {
        'id': 'c1',
        'name': '12Б',
        'type': 'IN_PERSON',
        'grade': 12,
        'teacher': _staff('u1', 'Нараа', 'Багш', 'TEACHER'),
        'assistantTeacher': null,
        '_count': {'enrollments': 24},
      },
      {
        'id': 'c2',
        'name': '11А',
        'type': 'ONLINE',
        'grade': 11,
        'teacher': _staff('u9', 'Болор', 'Цэрэн', 'TEACHER_PLUS'),
        'assistantTeacher': null,
        '_count': {'enrollments': 18},
      },
    ];

    testWidgets('«Миний анги» шүүлт, Багш+ нэрийн ард «+»', (tester) async {
      final http = FakeHttp()..json('GET', '/classrooms', classes);
      await pumpTeacher(tester, const ClassesScreen(), http: http);
      expect(find.text('12Б'), findsOneWidget);
      expect(find.text('11А'), findsNothing);
      await tester.tap(find.text('Бүгд (2)'));
      await settle(tester);
      expect(find.text('11А'), findsOneWidget);
      expect(find.textContaining('Ц. Болор+', findRichText: true), findsOneWidget);
    });

    testWidgets('ангийн самбар: сурагч руу, өнөөдрийн ирц руу', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/classrooms/c1', {
          'classroom': classes.first,
          'students': [
            {'id': 's1', 'firstName': 'Тэмүүжин', 'lastName': 'Бат', 'studentCode': 'B27120001'},
          ],
          'permissions': {'canManageStudents': false},
        });
      await pumpTeacher(tester, const ClassDetailScreen(classId: 'c1'), http: http);
      expect(find.text('Б. Тэмүүжин'), findsOneWidget);
      await tester.tap(find.text('Өнөөдрийн ирц, даалгавар'));
      await settle(tester);
      expect(find.text('ROUTE:/app/teacher/board/c1?date=$testDate'), findsOneWidget);
    });
  });

  group('Сурагчийн хуудас', () {
    FakeHttp http0() => FakeHttp()
      ..json('GET', '/tuition/paid-until/s1', {'paidUntil': '2026-11-30T00:00:00.000Z'})
      ..json('GET', '/students/s1/attendance', [
        {'date': '2026-10-30T00:00:00.000Z', 'status': 'LATE', 'lateRange': 'FIVE_TO_TEN', 'note': null},
      ])
      ..json('GET', '/students/s1/homework-marks', [
        {'date': '2026-10-30T00:00:00.000Z', 'status': 'PARTIAL', 'comment': 'ойлгоогүй'},
      ])
      ..json('GET', '/students/s1/test-results', [
        {
          'id': 'r1',
          'totalScore': 18,
          'maxScore': 20,
          'createdAt': '2026-10-20T03:00:00.000Z',
          'test': {'id': 't1', 'title': 'Сорил 3'},
        },
      ])
      ..json('GET', '/students/s1/notes', [
        {
          'id': 'n1',
          'type': 'GENERAL',
          'body': 'Ээж нь уулзахыг хүссэн',
          'authorName': 'Н. Багш',
          'canEdit': true,
          'createdAt': '2026-10-31T03:00:00.000Z',
        },
      ]);

    testWidgets('ангийн явц: төлбөрийн төлөв (дүнгүй), өдрийн бүртгэл', (tester) async {
      await pumpTeacher(
        tester,
        const StudentScreen(studentId: 's1', name: 'Б. Тэмүүжин'),
        http: http0(),
      );
      expect(find.text('Б. Тэмүүжин'), findsOneWidget);
      expect(find.text('10-р сарын 30, Ба'), findsOneWidget);
      expect(find.textContaining('₮'), findsNothing);
      expect(find.textContaining('ойлгоогүй', findRichText: true), findsOneWidget);
    });

    testWidgets('шалгалт ба тэмдэглэл: нэмэх, устгахыг баталгаажуулна', (tester) async {
      final http = http0()
        ..json('POST', '/students/s1/notes', {
          'id': 'n2',
          'type': 'GENERAL',
          'body': 'Шинэ',
          'authorName': 'Н. Багш',
          'canEdit': true,
        })
        ..json('DELETE', '/notes/n1', {'deleted': true});
      await pumpTeacher(tester, const StudentScreen(studentId: 's1'), http: http);
      await tester.tap(find.text('Шалгалт'));
      await settle(tester, frames: 20);
      expect(find.text('Сорил 3'), findsOneWidget);
      expect(find.text('18/20'), findsOneWidget);

      await tester.tap(find.text('Тэмдэглэл'));
      await settle(tester, frames: 20);
      expect(find.text('Ээж нь уулзахыг хүссэн'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Шинэ');
      await tester.tap(find.text('Нэмэх'));
      await settle(tester);
      expect(http.count('POST', '/students/s1/notes'), 1);
      expect(find.text('Шинэ'), findsWidgets);

      await tester.tap(find.byTooltip('Устгах').last);
      await settle(tester);
      expect(find.text('Тэмдэглэл устгах уу?'), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Устгах'));
      await settle(tester);
      expect(http.count('DELETE', '/notes/n1'), 1);
      expect(find.text('Ээж нь уулзахыг хүссэн'), findsNothing);
    });
  });

  testWidgets('цагийн бүртгэл: нийт ба хичээл бүр', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/teacher-hours/me', {
        'month': '2026-11',
        'teachers': [
          {
            'teacherId': 'u1',
            'teacherName': 'Н. Багш',
            'lessons': 2,
            'minutes': 240,
            'sessions': [
              {'date': '2026-11-02', 'classroomName': '12Б', 'startMinute': 900, 'endMinute': 1020},
              {'date': '2026-11-01', 'classroomName': '11А', 'startMinute': 600, 'endMinute': 720},
            ],
          },
        ],
      });
    await pumpTeacher(tester, const TeacherHoursScreen(), http: http);
    expect(find.text('2026 оны 11-р сар'), findsOneWidget);
    expect(find.text('4 цаг'), findsOneWidget);
    expect(find.text('10:00–12:00'), findsOneWidget);
    expect(http.requests.first.queryParameters['month'], '2026-11');
  });

  testWidgets('онлайн даалгавар: зураг харах товч, зөвшөөрөх', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/assignments/a1/submissions', [
        {
          'student': {'id': 's1', 'firstName': 'Тэмүүжин', 'lastName': 'Бат'},
          'state': 'SUBMITTED',
          'imageKeys': ['hw/a.jpg', 'hw/b.pdf'],
          'studentNote': '2-р бодлого',
        },
        {
          'student': {'id': 's2', 'firstName': 'Анужин', 'lastName': 'Дорж'},
          'state': 'NOT_SUBMITTED',
          'imageKeys': <String>[],
        },
      ])
      ..json('POST', '/assignments/a1/review', {'ok': true});
    await pumpTeacher(
      tester,
      const SubmissionsScreen(assignmentId: 'a1', title: 'Интеграл 1'),
      http: http,
    );
    expect(find.text('Шалгах'), findsOneWidget);
    expect(find.text('Илгээгээгүй'), findsOneWidget);
    expect(find.text('Зураг харах (2)'), findsOneWidget);
    await tester.tap(find.text('Зөвшөөрөх'));
    await settle(tester);
    final body = (http.requests.firstWhere((r) => r.method == 'POST').data as Map).cast<String, Object?>();
    expect(body, {'studentId': 's1', 'action': 'APPROVE'});
    expect(http.count('GET', '/assignments/a1/submissions'), 2);
  });
}
