import 'package:flutter_test/flutter_test.dart';

import '../student_harness.dart';
import 'student_home_screen_test.dart' show homeHttp;

List<Map<String, Object?>> todoJson() => [
      {
        'sessionId': 's1',
        'date': '2026-11-09T00:00:00.000Z',
        'windowDays': 3,
        'daysLeft': 2,
        'markingClosesOn': '2026-11-12T00:00:00.000Z',
        'test': {'id': 't1', 'title': 'Логарифм 2'},
        'problems': [
          {'index': 1, 'problemId': 'p1', 'statementText': r'$\log_2 8$ утгыг ол', 'myState': 'SOLVED_CLEAN'},
          {'index': 2, 'problemId': 'p2', 'myState': null},
        ],
      },
    ];

void main() {
  testWidgets('тэмдэглэх тест байхгүй бол карт харагдахгүй', (tester) async {
    await pumpStudentRoute(tester, http: homeHttp(), location: '/app/student');
    await settle(tester);
    expect(find.text('Ангийн тестээ тэмдэглэх'), findsNothing);
  });

  testWidgets('хураалттай тест → нээх → товч дармагц POST /attempts/evening', (tester) async {
    final http = homeHttp(todo: todoJson())
      ..json('POST', '/attempts/evening', {'ok': true});
    await pumpStudentRoute(tester, http: http, location: '/app/student');
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Логарифм 2'), 300);
    expect(find.text('Ангийн тестээ тэмдэглэх'), findsOneWidget);
    expect(find.text('1/2'), findsOneWidget);
    expect(find.text('Бодлого 2'), findsNothing, reason: 'хураалттай');
    await tester.ensureVisible(find.text('Логарифм 2'));
    await settle(tester);
    await tester.tap(find.text('Логарифм 2'));
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Бодлого 2'), 200);
    expect(find.text('Буудсан'), findsNWidgets(2));
    await tester.tap(find.text('Алдсан').last);
    await settle(tester);
    final post = http.requests.firstWhere((r) => r.method == 'POST');
    expect(post.data, {
      'date': '2026-11-09T00:00:00.000Z',
      'entries': [
        {'problemId': 'p2', 'selfState': 'FAILED'},
      ],
    });
    expect(find.text('2/2'), findsOneWidget);
  });

  testWidgets('хадгалах алдаа: тэмдэглэгээ буцаж, мессеж харагдана', (tester) async {
    final http = homeHttp(todo: todoJson())
      ..error('POST', '/attempts/evening', 400, 'Тэмдэглэх хугацаа дууссан');
    await pumpStudentRoute(tester, http: http, location: '/app/student');
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Логарифм 2'), 300);
    await tester.ensureVisible(find.text('Логарифм 2'));
    await settle(tester);
    await tester.tap(find.text('Логарифм 2'));
    await settle(tester);
    await tester.scrollUntilVisible(find.text('Бодлого 2'), 200);
    await tester.tap(find.text('Зассан').last);
    await settle(tester);
    expect(find.text('Тэмдэглэх хугацаа дууссан'), findsOneWidget);
    expect(find.text('1/2'), findsOneWidget);
  });
}
