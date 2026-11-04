import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/my_class/domain/hub_logic.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../student_fixtures.dart';
import '../student_harness.dart';

extension on FakeHttp {
  FakeHttp add(bool when, void Function(FakeHttp h) f) {
    if (when) f(this);
    return this;
  }
}

FakeHttp classHttp({
  bool withMakeup = true,
  Map<String, Object?>? days,
  Object? tests,
  bool registerDays = true,
  Object? makeup,
}) =>
    FakeHttp()
      ..json('GET', '/student-hub/overview', overviewJson())
      ..add(registerDays, (h) => h.json('GET', '/student-hub/days', days ?? daysJson(month: currentMonthKey())))
      ..json('GET', '/student-hub/tests', tests ?? testsJson())
      ..json('GET', '/attendance/my', attendanceJson())
      ..json('GET', '/makeup/me', makeup ?? makeupJson(withPending: withMakeup))
      ..json('GET', '/lesson-day/c1/2026-10-30/photos', theoryDayJson())
      ..json('GET', '/schedule/me', scheduleMeJson())
      ..json('GET', '/schedule/week', weekJson('2026-11-02'));

void main() {
  // Бодит фонт — Ahem-ийн өргөн бичвэрээр хуурамч overflow гарахгүй.
  setUpAll(loadAppFonts);

  group('Хичээл: табууд', () {
    testWidgets('таб бүр харагдана, нөхөх зүйл байвал «Нөхөх» таб тоотой', (tester) async {
      final semantics = tester.ensureSemantics();
      await pumpStudentRoute(tester, http: classHttp(), location: '/app/my-class');
      await settle(tester);
      for (final t in ['Хичээлүүд', 'Ирц', 'Тестүүд', 'Нөхөх', 'Хуваарь']) {
        expect(find.text(t), findsOneWidget, reason: t);
      }
      // Нөхөөгүй 1 өдөр → шошго дээр «1».
      expect(find.bySemanticsLabel(RegExp('1 үлдсэн')), findsOneWidget);
      semantics.dispose();
    });

    testWidgets('нөхөх зүйл алга бол «Нөхөх» таб нуугдана', (tester) async {
      await pumpStudentRoute(tester, http: classHttp(makeup: <Object?>[]), location: '/app/my-class');
      await settle(tester);
      expect(find.text('Нөхөх'), findsNothing);
      expect(find.text('Хуваарь'), findsOneWidget);
    });

    testWidgets('?tab=attendance шууд ирцийн таб руу', (tester) async {
      await pumpStudentRoute(tester, http: classHttp(), location: '/app/my-class?tab=attendance');
      await settle(tester);
      expect(find.text('Бүх хугацааны ирц'), findsOneWidget);
    });

    testWidgets('таб дарахад солигдоно', (tester) async {
      await pumpStudentRoute(tester, http: classHttp(), location: '/app/my-class');
      await settle(tester);
      await tester.tap(find.text('Тестүүд'));
      await settle(tester, frames: 20);
      expect(find.text('Тестийн нэрээр хайх'), findsOneWidget);
    });
  });

  group('Хичээлүүд таб', () {
    testWidgets('сарын өдрүүд: сэдэв, ирц, даалгавар; өдөр дарахад өдрийн дэлгэц', (tester) async {
      final router = await pumpStudentRoute(tester, http: classHttp(), location: '/app/my-class');
      await settle(tester);
      expect(find.text('Илтгэгч функц'), findsWidgets);
      await tester.tap(find.text('Илтгэгч функц').first);
      await settle(tester);
      expect(router.state.uri.path, startsWith('/app/my-class/day/'));
    });

    testWidgets('сард хичээл алга: хоосон төлөв', (tester) async {
      await pumpStudentRoute(
        tester,
        http: classHttp(days: daysJson(month: currentMonthKey(), days: [], prev: null)),
        location: '/app/my-class',
      );
      await settle(tester);
      expect(find.text('Энэ сард хичээл алга'), findsOneWidget);
    });

    testWidgets('алдаа: дахин оролдох товчоор сэргэнэ', (tester) async {
      final http = classHttp(registerDays: false)
        ..on('GET', '/student-hub/days', (_) => const FakeResponse(<String, Object?>{'message': 'Алдаа'}, status: 500))
        ..on('GET', '/student-hub/days', (_) => FakeResponse(daysJson(month: currentMonthKey())));
      await pumpStudentRoute(tester, http: http, location: '/app/my-class');
      await settle(tester);
      expect(find.byType(ErrorState), findsOneWidget);
      await tester.tap(find.text(AppStrings.retry));
      await settle(tester);
      expect(find.byType(ErrorState), findsNothing);
      expect(find.text('Илтгэгч функц'), findsWidgets);
    });

    testWidgets('өмнөх сар руу шилжинэ', (tester) async {
      final http = classHttp();
      await pumpStudentRoute(tester, http: http, location: '/app/my-class');
      await settle(tester);
      await tester.tap(find.byTooltip('Өмнөх сар'));
      await settle(tester);
      expect(http.requests.where((r) => r.path == '/student-hub/days').length, greaterThanOrEqualTo(2));
    });
  });

  group('Ирц таб', () {
    testWidgets('нийт хувь, төлвийн тоо, түүх', (tester) async {
      final semantics = tester.ensureSemantics();
      await pumpStudentRoute(tester, http: classHttp(), location: '/app/my-class?tab=attendance');
      await settle(tester);
      expect(find.bySemanticsLabel(RegExp('Ирц 85 хувь, 20 хичээлээс')), findsOneWidget);
      semantics.dispose();
    });

    testWidgets('ирцийн түүх хоосон', (tester) async {
      final http = classHttp()..json('GET', '/attendance/my', <Object?>[]);
      // Хамгийн сүүлд бүртгэсэн нь давтагдана.
      await pumpStudentRoute(tester, http: http, location: '/app/my-class?tab=attendance');
      await settle(tester);
      expect(find.byType(ErrorState), findsNothing);
    });
  });

  group('Тестүүд таб', () {
    testWidgets('жагсаалт: нээлттэй, маргааш нээгдэнэ, хайлт', (tester) async {
      await pumpStudentRoute(tester, http: classHttp(), location: '/app/my-class?tab=tests');
      await settle(tester);
      expect(find.text('Маргааш нээгдэнэ'), findsOneWidget);
      expect(find.textContaining('Логарифм 1'), findsOneWidget);
    });

    testWidgets('хоосон жагсаалт', (tester) async {
      await pumpStudentRoute(tester, http: classHttp(tests: <Object?>[]), location: '/app/my-class?tab=tests');
      await settle(tester);
      expect(find.text('Анги хийсэн тест алга'), findsOneWidget);
    });

    testWidgets('нээлттэй тест дарахад тестийн дэлгэр', (tester) async {
      final router = await pumpStudentRoute(tester, http: classHttp(), location: '/app/my-class?tab=tests');
      await settle(tester);
      await tester.tap(find.textContaining('Илтгэгч 2').first);
      await settle(tester);
      expect(router.state.uri.path, '/app/my-class/tests/t1');
    });
  });

  group('Нөхөх таб', () {
    testWidgets('карт: алхам, төлөв, зургийн товч', (tester) async {
      await pumpStudentRoute(tester, http: classHttp(), location: '/app/my-class?tab=makeup');
      await settle(tester);
      expect(find.text('Нөхөөгүй'), findsOneWidget);
      expect(find.text('1/4'), findsOneWidget);
      expect(find.text('Дүнг багш оруулна'), findsOneWidget);
      expect(find.text('Багш зургаа дахин илгээхийг хүссэн'), findsOneWidget);
      expect(find.text('Дэвтрийн зураг илгээх'), findsOneWidget);
    });

    testWidgets('«Дэвтрийн зураг илгээх» нөхөх зургийн дэлгэц рүү', (tester) async {
      final router = await pumpStudentRoute(tester, http: classHttp(), location: '/app/makeup');
      await settle(tester);
      await tester.scrollUntilVisible(find.text('Дэвтрийн зураг илгээх'), 200);
      await tester.tap(find.text('Дэвтрийн зураг илгээх'));
      await settle(tester);
      expect(router.state.uri.path, '/app/makeup/photos/c1/2026-10-28');
    });

    testWidgets('«Эхлэх»: нээгээд шалгалтын дэлгэц рүү', (tester) async {
      final http = classHttp()..json('POST', '/makeup/me/c1/2026-10-28/tests/m1/open', {'testId': 'm1', 'href': '/app/tests/m1'});
      final router = await pumpStudentRoute(tester, http: http, location: '/app/makeup');
      await settle(tester);
      await tester.tap(find.text('Эхлэх').first);
      await settle(tester);
      expect(http.count('POST', '/makeup/me/c1/2026-10-28/tests/m1/open'), 1);
      expect(router.state.uri.path, '/app/tests/m1');
    });

    testWidgets('«Эхлэх» 409: серверийн мессеж харагдана', (tester) async {
      final http = classHttp()..error('POST', '/makeup/me/c1/2026-10-28/tests/m1/open', 409, 'Энэ нөхөх хичээл хаагдсан.');
      await pumpStudentRoute(tester, http: http, location: '/app/makeup');
      await settle(tester);
      await tester.tap(find.text('Эхлэх').first);
      await settle(tester);
      expect(find.text('Энэ нөхөх хичээл хаагдсан.'), findsOneWidget);
    });
  });

  group('Өдрийн дэлгэц', () {
    testWidgets('сэдэв, ирц, даалгавар, тест, онол', (tester) async {
      await pumpStudentRoute(
        tester,
        http: classHttp(days: daysJson(month: '2026-10', days: [dayJson()])),
        location: '/app/my-class/day/2026-10-30/c1',
      );
      await settle(tester);
      expect(find.text('Илтгэгч функц'), findsOneWidget);
      expect(find.text('Бодлого 12; 14; 15'), findsOneWidget);
      expect(find.text('Миний ирц, даалгавар'), findsOneWidget);
      expect(find.text('Тестүүд'), findsOneWidget);
      expect(find.text('Онолын зураг'), findsOneWidget);
      expect(find.text('Маргааш нээгдэнэ'), findsOneWidget);
    });

    testWidgets('олдохгүй өдөр: хоосон төлөв', (tester) async {
      await pumpStudentRoute(
        tester,
        http: classHttp(days: daysJson(month: '2026-10', days: [dayJson()])),
        location: '/app/my-class/day/2026-10-15/c1',
      );
      await settle(tester);
      expect(find.text('Энэ өдөр хичээл олдсонгүй'), findsOneWidget);
    });

    testWidgets('буруу огноо: нүүр рүү хөтөлнө', (tester) async {
      await pumpStudentRoute(tester, http: classHttp(), location: '/app/my-class/day/oo/c1');
      await settle(tester);
      expect(find.text('Вэбээр нээх'), findsOneWidget); // түр дэлгэц, өдрийн дэлгэц биш
    });
  });

  group('Ангийн тест', () {
    testWidgets('бодлого, дарааллаар, зөв хариу', (tester) async {
      final http = classHttp()..json('GET', '/student-hub/tests/t1', testDetailJson());
      await pumpStudentRoute(tester, http: http, location: '/app/my-class/tests/t1');
      await settle(tester);
      expect(find.text('Илтгэгч 2'), findsOneWidget);
      final one = tester.getTopLeft(find.text('1').first).dy;
      final two = tester.getTopLeft(find.text('2').first).dy;
      expect(one, lessThan(two), reason: '1-р бодлого 2-р бодлогоос дээр');
    });

    testWidgets('403: ангид хийгээгүй тест', (tester) async {
      final http = classHttp()..json('GET', '/student-hub/tests/t9', {'statusCode': 403, 'message': 'x', 'code': 'NOT_IN_CLASS'}, status: 403);
      await pumpStudentRoute(tester, http: http, location: '/app/my-class/tests/t9');
      await settle(tester);
      expect(find.byType(ErrorState), findsNothing);
      expect(find.byType(EmptyState), findsOneWidget);
    });

    testWidgets('404: тест олдсонгүй', (tester) async {
      final http = classHttp()..error('GET', '/student-hub/tests/t8', 404, 'Not Found');
      await pumpStudentRoute(tester, http: http, location: '/app/my-class/tests/t8');
      await settle(tester);
      expect(find.text('Тест олдсонгүй'), findsOneWidget);
    });
  });
}
