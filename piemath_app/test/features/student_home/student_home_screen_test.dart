import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/student_home/ui/student_home_screen.dart';

import '../../helpers/fake_http.dart';
import '../student_fixtures.dart';
import '../student_harness.dart';

FakeHttp homeHttp({Map<String, Object?>? overview, List<Map<String, Object?>> classrooms = const []}) => FakeHttp()
  ..json('GET', '/student-hub/overview', overview ?? overviewJson())
  ..json('GET', '/assignments/my-classrooms', classrooms)
  ..json('GET', '/student-hub/days', daysJson())
  ..json('GET', '/tuition/paid-until/my', {'paidUntil': '2099-01-01T00:00:00.000Z'})
  ..json('GET', '/announcements', [
    {'id': 'a1', 'title': 'Амралтын мэдэгдэл', 'body': '11-р сарын 26-нд хичээл орохгүй', 'pinned': true, 'createdAt': '2026-11-01T02:00:00.000Z'},
  ]);

void main() {
  testWidgets('ачаалж байхад skeleton (хоосон цагаан биш)', (tester) async {
    final http = FakeHttp()
      ..on('GET', '/student-hub/overview', (_) => const FakeResponse(<String, Object?>{}, delay: Duration(seconds: 5)));
    await pumpStudentRoute(tester, http: http, location: '/app/student');
    await tester.pump();
    expect(find.byType(SkeletonPulse), findsWidgets);
    expect(find.text('Миний самбар'), findsOneWidget);
    await tester.pump(const Duration(seconds: 6));
  });

  testWidgets('өгөгдөлтэй: өнөөдөр, хувь, тэмдэглэгээ, сүүлийн хичээл, төлбөр, мэдэгдэл', (tester) async {
    await pumpStudentRoute(tester, http: homeHttp(), location: '/app/student');
    await settle(tester);
    expect(find.text('Сайн байна уу'), findsOneWidget);
    expect(find.text('Тест'), findsOneWidget); // нэр (fakeMe)
    expect(find.text('15:00–17:00'), findsOneWidget);
    expect(find.text('Онол илгээх'), findsOneWidget);
    expect(find.byType(RateTile), findsNWidgets(2));
    expect(find.text('Багшийн тэмдэглэгээ'), findsOneWidget);
    expect(find.text('Сүүлийн 3 бодлогоо дуусгаарай'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Сүүлийн хичээлүүд'), 300);
    expect(find.text('Илтгэгч функц'), findsWidgets);
    await tester.scrollUntilVisible(find.text('Хэдий хүртэл төлсөн'), 300);
    expect(find.text('2099.01.01'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Амралтын мэдэгдэл'), 300);
    expect(find.text('Төвийн мэдэгдэл'), findsOneWidget);
  });

  testWidgets('ангид элсээгүй: тайлбартай хоосон төлөв', (tester) async {
    await pumpStudentRoute(tester, http: homeHttp(overview: overviewJson(inClass: false)), location: '/app/student');
    await settle(tester);
    expect(find.text('Танхимын ангид элсээгүй байна'), findsOneWidget);
    expect(find.byType(RateTile), findsNothing);
  });

  testWidgets('онлайн сурагч: онлайн даалгаврын холбоос', (tester) async {
    await pumpStudentRoute(
      tester,
      http: homeHttp(
        overview: overviewJson(inClass: false),
        classrooms: [
          {'id': 'o1', 'name': 'Онлайн 12', 'type': 'ONLINE', 'grade': 12},
        ],
      ),
      location: '/app/student',
    );
    await settle(tester);
    expect(find.text('Онлайн даалгавар'), findsOneWidget);
    expect(find.text('Танхимын ангид элсээгүй байна'), findsNothing);
  });

  testWidgets('өнөөдөр хичээлгүй + QR холбоос шилжинэ', (tester) async {
    await pumpStudentRoute(tester, http: homeHttp(overview: overviewJson(withToday: false)), location: '/app/student');
    await settle(tester);
    expect(find.text('Өнөөдөр хичээлгүй'), findsOneWidget);
    expect(find.text('Онолын зураг'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('QR уншуулах'), 300);
    await tester.tap(find.text('QR уншуулах'));
    await settle(tester);
    expect(find.text('PENDING:/app/scan'), findsOneWidget);
  });

  testWidgets('ирцийн хувь дарахад ирцийн таб', (tester) async {
    await pumpStudentRoute(tester, http: homeHttp()..json('GET', '/student-hub/overview', overviewJson()), location: '/app/student');
    await settle(tester);
    expect(find.bySemanticsLabel(RegExp('Ирц 85 хувь')), findsOneWidget);
    await tester.tap(find.byType(RateTile).first);
    await settle(tester);
    expect(find.text('Бүх хугацааны ирц'), findsOneWidget);
    await tester.pump(const Duration(seconds: 1));
    expect(tester.takeException(), isNull);
  });

  testWidgets('хүрэх талбай, контраст', (tester) async {
    final handle = tester.ensureSemantics();
    await pumpStudentRoute(tester, http: homeHttp(), location: '/app/student');
    await settle(tester);
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(textContrastGuideline));
    handle.dispose();
  });

}
