import 'package:flutter_test/flutter_test.dart';

import '../../helpers/fake_http.dart';
import '../student_fixtures.dart';
import '../student_harness.dart';

// Давалгаа 6 (вэб 2026-11-12): математик + Нийгэм хоёр ангид зэрэг суудаг сурагчийн өнөөдрийн хоёр хичээл.

void main() {
  testWidgets('«Өнөөдөр» картад хоёр ангийн хичээл цагаар эрэмбэлэгдэнэ', (tester) async {
    final overview = {
      ...overviewJson(),
      'todayOther': [
        {
          'classroomId': 'c2',
          'classroomName': 'НИЙГЭМ (Зүүн 4)',
          'date': '2026-11-02',
          'startMinute': 600,
          'endMinute': 720,
          'room': '402',
          'topic': null,
        },
      ],
    };
    final http = FakeHttp()
      ..json('GET', '/student-hub/overview', overview)
      ..json('GET', '/assignments/my-classrooms', <Object?>[])
      ..json('GET', '/student-hub/days', daysJson())
      ..json('GET', '/activity/me', {'year': 2026, 'totalActiveDays': 0, 'days': <Object?>[]})
      ..json('GET', '/activity/streak', {'currentStreak': 0, 'longestStreak': 0, 'totalActiveDays': 0})
      ..json('GET', '/me/todo-marking', <Object?>[])
      ..json('GET', '/tuition/paid-until/my', {'paidUntil': '2099-01-01T00:00:00.000Z'})
      ..json('GET', '/announcements', <Object?>[]);
    await pumpStudentRoute(tester, http: http, location: '/app/student');
    await settle(tester);
    final social = find.text('10:00–12:00');
    final math = find.text('15:00–17:00');
    expect(social, findsOneWidget);
    expect(math, findsOneWidget);
    expect(tester.getTopLeft(social).dy, lessThan(tester.getTopLeft(math).dy));
    expect(find.text('НИЙГЭМ (Зүүн 4)'), findsOneWidget);
  });
}
