import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/files/files.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/homework/data/photo_processor.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../homework/composer_fakes.dart';
import '../student_fixtures.dart';
import '../student_harness.dart';

List<Map<String, Object?>> theoryList() => [
      {
        'classroomId': 'c1',
        'classroomName': '12-р анги',
        'date': '2026-10-30',
        'topic': 'Илтгэгч функц',
        'tests': <Object?>[],
        'count': 2,
        'uploaders': ['Т. Ану'],
        'canUpload': true,
      },
      {
        'classroomId': 'c1',
        'classroomName': '12-р анги',
        'date': '2026-10-28',
        'topic': null,
        'tests': ['Логарифм 1'],
        'count': 0,
        'uploaders': <Object?>[],
        'canUpload': true,
      },
    ];

Future<void> _wait(WidgetTester tester, {int frames = 16}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

Map<String, Object?> dayWithMine() {
  final d = theoryDayJson();
  final set = Map<String, Object?>.of((d['photos']! as List).first as Map<String, Object?>)
    ..['id'] = 's2'
    ..['isMine'] = true
    ..['uploaderName'] = 'Тест Сурагч'
    ..['isAssigned'] = false
    ..['imageKeys'] = ['mine1.pdf'];
  return {...d, 'photos': [set]};
}

void main() {
  setUpAll(loadAppFonts);

  group('Онолын зургийн жагсаалт', () {
    testWidgets('өдрүүд, сэдэв/тест, зургийн тоо, «Зураггүй»', (tester) async {
      final http = FakeHttp()..json('GET', '/student-hub/theory', theoryList());
      await pumpStudentRoute(tester, http: http, location: '/app/theory');
      await settle(tester);
      expect(find.text('Илтгэгч функц'), findsOneWidget);
      expect(find.text('Логарифм 1'), findsOneWidget, reason: 'сэдэвгүй бол тестийн нэр');
      expect(find.text('2'), findsOneWidget);
      expect(find.text('Зураггүй'), findsOneWidget);
    });

    testWidgets('өдөр дарахад өдрийн дэлгэц', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/student-hub/theory', theoryList())
        ..json('GET', '/lesson-day/c1/2026-10-30/photos', theoryDayJson());
      final router = await pumpStudentRoute(tester, http: http, location: '/app/theory');
      await settle(tester);
      await tester.tap(find.text('Илтгэгч функц'));
      await settle(tester);
      expect(router.state.uri.path, '/app/theory/c1/2026-10-30');
      expect(find.text('Т. Ану'), findsWidgets);
    });

    testWidgets('хайлт: 400мс debounce, q параметртэй хүсэлт', (tester) async {
      final http = FakeHttp()..json('GET', '/student-hub/theory', theoryList());
      await pumpStudentRoute(tester, http: http, location: '/app/theory');
      await settle(tester);
      await tester.enterText(find.byType(TextField), 'лог');
      await tester.pump(const Duration(milliseconds: 200));
      expect(http.count('GET', '/student-hub/theory'), 1);
      await tester.pump(const Duration(milliseconds: 300));
      await settle(tester);
      expect(http.requests.last.queryParameters['q'], 'лог');
    });

    testWidgets('хоосон жагсаалт ба хайлтын «Олдсонгүй»', (tester) async {
      final http = FakeHttp()
        ..on('GET', '/student-hub/theory', (_) => const FakeResponse(<Object?>[]))
        ..on('GET', '/student-hub/theory', (_) => const FakeResponse(<Object?>[]));
      await pumpStudentRoute(tester, http: http, location: '/app/theory');
      await settle(tester);
      expect(find.text('Хичээлийн өдөр алга'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'xyz');
      await tester.pump(const Duration(milliseconds: 500));
      await settle(tester);
      expect(find.text('Олдсонгүй'), findsOneWidget);
    });

    testWidgets('алдаа: дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..on('GET', '/student-hub/theory', (_) => const FakeResponse(<String, Object?>{'message': 'Алдаа'}, status: 500))
        ..on('GET', '/student-hub/theory', (_) => FakeResponse(theoryList()));
      await pumpStudentRoute(tester, http: http, location: '/app/theory');
      await settle(tester);
      expect(find.byType(ErrorState), findsOneWidget);
      await tester.tap(find.text(AppStrings.retry));
      await settle(tester);
      expect(find.text('Илтгэгч функц'), findsOneWidget);
    });

    testWidgets('?date=&c= холбоос шууд өдрийн дэлгэц рүү', (tester) async {
      final http = FakeHttp()..json('GET', '/lesson-day/c1/2026-10-30/photos', theoryDayJson());
      await pumpStudentRoute(tester, http: http, location: '/app/theory?date=2026-10-30&c=c1');
      await settle(tester);
      expect(find.text('Онолын зураг илгээх'), findsOneWidget);
    });
  });

  group('Өдрийн онолын зураг', () {
    testWidgets('ангийнхны багц: «Томилогдсон», хуудасны тоо; баримт «хуудас» гэж харагдана', (tester) async {
      final http = FakeHttp()..json('GET', '/lesson-day/c1/2026-10-30/photos', theoryDayJson());
      await pumpStudentRoute(tester, http: http, location: '/app/theory/c1/2026-10-30');
      await settle(tester);
      expect(find.text('Илтгэгч функц'), findsOneWidget);
      expect(find.text('Т. Ану'), findsOneWidget);
      expect(find.text('Томилогдсон'), findsOneWidget);
      expect(find.text('3 хуудас'), findsWidgets);
      expect(find.textContaining('PDF'), findsNothing);
    });

    testWidgets('зураггүй өдөр: тайлбартай хоосон төлөв', (tester) async {
      final http = FakeHttp()..json('GET', '/lesson-day/c1/2026-10-30/photos', theoryDayJson(photos: false));
      await pumpStudentRoute(tester, http: http, location: '/app/theory/c1/2026-10-30');
      await settle(tester);
      expect(find.text('Онолын зураг алга'), findsOneWidget);
    });

    testWidgets('илгээх: камер → тайрах → POST, дараа нь өдөр ба жагсаалт шинэчлэгдэнэ', (tester) async {
      final uploader = FakePhotoSetUploader();
      final http = FakeHttp()
        ..json('GET', '/student-hub/theory', theoryList())
        ..json('GET', '/lesson-day/c1/2026-10-30/photos', theoryDayJson())
        ..json('POST', '/lesson-day/c1/2026-10-30/photos', dayWithMine());
      final router = await pumpStudentRoute(
        tester,
        http: http,
        location: '/app/theory',
        overrides: [
          photoSourceProvider.overrideWithValue(FakePhotoSource(camera: ['a'])),
          photoProcessorProvider.overrideWithValue(FakePhotoProcessor()),
          photoSetUploaderProvider.overrideWithValue(uploader),
        ],
      );
      await settle(tester);
      await tester.tap(find.text('Илтгэгч функц'));
      await settle(tester);
      await tester.tap(find.text('Онолын зураг илгээх'));
      await _wait(tester);
      expect(find.text('0/10'), findsOneWidget);
      await tester.tap(find.text('Камер'));
      await _wait(tester);
      await tester.tap(find.text('Болсон'));
      await _wait(tester);
      await tester.tap(find.text('Илгээх (1 хуудас)'));
      await _wait(tester, frames: 20);
      final post = http.requests.firstWhere((r) => r.method == 'POST');
      expect(post.data, {'imageKeys': ['k-theory-1.pdf']});
      expect(http.count('GET', '/lesson-day/c1/2026-10-30/photos'), 2, reason: 'өдөр шинэчлэгдсэн');
      // Жагсаалт доор түр зогссон (Riverpod 3) — буцаж ирэхэд хуучин тоогоор үлдэлгүй дахин ачаална.
      router.pop();
      await _wait(tester);
      expect(http.count('GET', '/student-hub/theory'), 2, reason: 'жагсаалтын зургийн тоо хуучирч үлдэхгүй');
    });

    testWidgets('өөрийн зураг: «Зургаа солих», устгахад баталгаажуулалт → хоосон багц илгээнэ', (tester) async {
      final http = FakeHttp()
        ..json('GET', '/lesson-day/c1/2026-10-30/photos', dayWithMine())
        ..json('POST', '/lesson-day/c1/2026-10-30/photos', theoryDayJson(photos: false));
      await pumpStudentRoute(tester, http: http, location: '/app/theory/c1/2026-10-30');
      await settle(tester);
      expect(find.text('Зургаа солих'), findsOneWidget);
      expect(find.text('Таны зураг'), findsOneWidget);
      await tester.tap(find.text('Устгах'));
      await settle(tester);
      expect(find.text('Зургаа устгах уу?'), findsOneWidget);
      await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Устгах')));
      await settle(tester);
      final post = http.requests.firstWhere((r) => r.method == 'POST');
      expect(post.data, {'imageKeys': <Object?>[]});
    });

    testWidgets('илгээх эрхгүй (canUpload=false): товч байхгүй', (tester) async {
      final d = {...theoryDayJson(), 'canUpload': false};
      final http = FakeHttp()..json('GET', '/lesson-day/c1/2026-10-30/photos', d);
      await pumpStudentRoute(tester, http: http, location: '/app/theory/c1/2026-10-30');
      await settle(tester);
      expect(find.text('Онолын зураг илгээх'), findsNothing);
      expect(find.byType(FilledButton), findsNothing);
    });

    testWidgets('403: тайлбартай алдаа, дахин оролдох товчгүй', (tester) async {
      final http = FakeHttp()..error('GET', '/lesson-day/c1/2026-10-30/photos', 403, 'Танай анги биш');
      await pumpStudentRoute(tester, http: http, location: '/app/theory/c1/2026-10-30');
      await settle(tester);
      expect(find.text('Танай анги биш'), findsOneWidget);
      expect(find.text(AppStrings.retry), findsNothing);
    });

    testWidgets('илгээх товчны хүрэх талбай ≥ 44dp', (tester) async {
      final http = FakeHttp()..json('GET', '/lesson-day/c1/2026-10-30/photos', theoryDayJson());
      await pumpStudentRoute(tester, http: http, location: '/app/theory/c1/2026-10-30');
      await settle(tester);
      final size = tester.getSize(find.byType(FilledButton));
      expect(size.height, greaterThanOrEqualTo(44));
    });
  });
}
