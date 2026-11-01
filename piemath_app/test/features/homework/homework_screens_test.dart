import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/files/files.dart';
import 'package:piemath_app/core/ui/ui.dart';
import 'package:piemath_app/features/homework/data/photo_processor.dart';
import 'package:piemath_app/features/homework/domain/homework_logic.dart' show dayLabel;
import 'package:piemath_app/features/homework/ui/homework_providers.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/fonts.dart';
import '../student_harness.dart';
import 'composer_fakes.dart';
import 'hw_fixtures.dart';

const _today = '2026-11-02';

class _Photos {
  _Photos({List<String> camera = const ['a']}) : source = FakePhotoSource(camera: camera);
  final FakePhotoSource source;
  final processor = FakePhotoProcessor();
  final uploader = FakePhotoSetUploader();

  List<Override> get overrides => [
        todayKeyProvider.overrideWithValue(_today),
        photoSourceProvider.overrideWithValue(source),
        photoProcessorProvider.overrideWithValue(processor),
        photoSetUploaderProvider.overrideWithValue(uploader),
      ];
}

FakeHttp classroomHttp({List<Map<String, Object?>>? days}) =>
    FakeHttp()..json('GET', '/homework/my', {'days': days ?? fixtureDays()});

/// Босоо гүйлгэгчээр (өдрийн зурвасын хэвтээ жагсаалтаас ялгаж) хүртэл гүйлгэнэ.
Future<void> scrollTo(WidgetTester tester, Finder target, {double delta = 300}) => tester.scrollUntilVisible(
      target,
      delta,
      scrollable: find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).first,
    );

/// Маршрутын шилжилт (~450мс) дуустал хүлээнэ.
Future<void> _wait(WidgetTester tester, {int frames = 16}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

Future<void> _addPhotoAndSend(WidgetTester tester, String sendLabel) async {
  await tester.tap(find.text('Камер'));
  await _wait(tester);
  await tester.tap(find.text('Болсон'));
  await _wait(tester);
  await tester.tap(find.text(sendLabel));
  await _wait(tester, frames: 20);
}

void main() {
  setUpAll(loadAppFonts);

  group('Танхимын загвар', () {
    testWidgets('хэсгүүд: өнөөдөр, урьдчилан, өмнөх; тэмдэглэгээ, тайлбар', (tester) async {
      final photos = _Photos();
      await pumpStudentRoute(tester, http: classroomHttp(), location: '/app/homework', overrides: photos.overrides);
      await settle(tester);
      expect(find.text('Өнөөдөр'), findsWidgets);
      expect(find.text('Логарифмын тэгшитгэл'), findsOneWidget);
      expect(find.text('Урьдчилан илгээх'), findsOneWidget);
      await scrollTo(tester, find.text('Өмнөх хичээлүүд'), delta: 400);
      expect(find.text('Хийсэн'), findsWidgets);
      await scrollTo(tester, find.text('Сайн байна'), delta: 300);
      expect(find.text('Сайн байна'), findsOneWidget);
    });

    testWidgets('өдрийн зурвас: эрт өдөр ЗҮҮН талд, хожуу нь баруун талд', (tester) async {
      final semantics = tester.ensureSemantics();
      await pumpStudentRoute(tester, http: classroomHttp(), location: '/app/homework', overrides: _Photos().overrides);
      await settle(tester);
      // Өдрийн зурвасын нүд (мод дахь эхнийх); доорх картууд ижил өдрийн нэртэй.
      Finder chip(String label) => find.bySemanticsLabel(RegExp('^$label')).first;
      final oct30 = tester.getCenter(chip('10-р сарын 30')).dx;
      final today = tester.getCenter(chip('11-р сарын 2')).dx;
      final nov6 = tester.getCenter(chip('11-р сарын 6')).dx;
      expect(oct30, lessThan(today));
      expect(today, lessThan(nov6));
      semantics.dispose();
    });

    testWidgets('зураг илгээх: камер → тайрах → илгээх, POST /homework/photos', (tester) async {
      final photos = _Photos();
      final http = classroomHttp()
        ..json('POST', '/homework/photos', {'id': 'ph9', 'fileKey': 'k-homework-1.pdf', 'pages': 1, 'uploadedAt': '2026-11-02T04:00:00.000Z'});
      await pumpStudentRoute(tester, http: http, location: '/app/homework', overrides: photos.overrides);
      await settle(tester);
      await tester.tap(find.text('Дэвтрийн зураг илгээх').first);
      await _wait(tester);
      expect(find.text('0/6'), findsOneWidget);
      await _addPhotoAndSend(tester, 'Илгээх (1 хуудас)');
      final post = http.requests.firstWhere((r) => r.method == 'POST' && r.path == '/homework/photos');
      expect(post.data, {'classroomId': 'c1', 'date': _today, 'fileKey': 'k-homework-1.pdf', 'pages': 1});
      expect(photos.uploader.uploads.single, ['a']);
      expect(find.text('Зураг илгээгдлээ'), findsOneWidget);
      expect(http.count('GET', '/homework/my'), 2, reason: 'илгээсний дараа жагсаалт шинэчлэгдэнэ');
    });

    testWidgets('илгээсэн зураг: харах, дахин илгээх, устгах (баталгаажуулалттай)', (tester) async {
      final http = classroomHttp()..json('DELETE', '/homework/photos/ph1', <String, Object?>{});
      await pumpStudentRoute(tester, http: http, location: '/app/homework', overrides: _Photos().overrides);
      await settle(tester);
      await scrollTo(tester, find.text('Зураг илгээсэн, 3 хуудас'), delta: 400);
      await tester.ensureVisible(find.text('Устгах'));
      await tester.pump();
      expect(find.text('Харах'), findsOneWidget);
      expect(find.text('Дахин илгээх'), findsOneWidget);
      await tester.tap(find.text('Устгах'));
      await settle(tester);
      expect(find.text('Зургийг устгах уу?'), findsOneWidget);
      await tester.tap(find.text(AppStrings.cancel));
      await settle(tester);
      expect(http.count('DELETE', '/homework/photos/ph1'), 0);
      await tester.tap(find.text('Устгах'));
      await settle(tester);
      await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Устгах')));
      await settle(tester);
      expect(http.count('DELETE', '/homework/photos/ph1'), 1);
    });

    testWidgets('14 хоногоос хуучин өдөр: илгээх боломжгүй, «PDF» үг харагдахгүй', (tester) async {
      await pumpStudentRoute(tester, http: classroomHttp(), location: '/app/homework', overrides: _Photos().overrides);
      await settle(tester);
      await scrollTo(tester, find.text('Илгээх хугацаа дууссан'), delta: 600);
      expect(find.text('Илгээх хугацаа дууссан'), findsOneWidget);
      expect(find.textContaining('PDF'), findsNothing);
      expect(find.textContaining('pdf'), findsNothing);
    });

    testWidgets('онлайн тест (B хувилбар): нэр цэвэрлэгдэнэ, дарахад бодох дэлгэц', (tester) async {
      final http = classroomHttp()..json('POST', '/homework/attempts', fixtureAttempt());
      final router = await pumpStudentRoute(tester, http: http, location: '/app/homework', overrides: _Photos().overrides);
      await settle(tester);
      expect(find.text('Логарифм 3'), findsWidgets);
      expect(find.text('Эхлээгүй'), findsOneWidget);
      await tester.tap(find.text('Логарифм 3').first);
      await settle(tester);
      expect(router.state.uri.path, '/app/homework/t1');
      expect(router.state.uri.queryParameters, {'date': _today, 'classroomId': 'c1'});
    });

    testWidgets('14 хоногт хичээл алга: хоосон төлөв', (tester) async {
      await pumpStudentRoute(tester, http: classroomHttp(days: []), location: '/app/homework', overrides: _Photos().overrides);
      await settle(tester);
      expect(find.text('Сүүлийн 14 хоногт хичээл алга'), findsOneWidget);
    });

    testWidgets('алдаа: дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..on('GET', '/homework/my', (_) => const FakeResponse(<String, Object?>{'message': 'Алдаа'}, status: 500))
        ..on('GET', '/homework/my', (_) => FakeResponse({'days': fixtureDays()}));
      await pumpStudentRoute(tester, http: http, location: '/app/homework', overrides: _Photos().overrides);
      await settle(tester);
      expect(find.byType(ErrorState), findsOneWidget);
      await tester.tap(find.text(AppStrings.retry));
      await settle(tester);
      expect(find.text('Логарифмын тэгшитгэл'), findsOneWidget);
    });

    testWidgets('«Жилийн түүх» товч → түүхийн дэлгэц', (tester) async {
      final router = await pumpStudentRoute(tester, http: classroomHttp(), location: '/app/homework', overrides: _Photos().overrides);
      await settle(tester);
      await tester.tap(find.byTooltip('Жилийн түүх'));
      await settle(tester);
      expect(router.state.uri.path, '/app/homework/history');
    });
  });

  group('Онлайн загвар', () {
    List<Override> online(_Photos p) => [...p.overrides, isOnlineStudentProvider.overrideWithValue(true)];

    testWidgets('даалгавар, төлөв, багшийн тайлбар; түүхийн товч байхгүй', (tester) async {
      final p = _Photos();
      final http = FakeHttp()..json('GET', '/assignments/my', fixtureAssignments());
      await pumpStudentRoute(tester, http: http, location: '/app/homework', overrides: online(p));
      await settle(tester);
      expect(find.text('Логарифмын даалгавар'), findsOneWidget);
      expect(find.text('Буцаасан — дахин илгээнэ'), findsOneWidget);
      expect(find.text('Зураг бүдэг байна'), findsOneWidget);
      expect(find.text('Нэмэлт даалгавар'), findsOneWidget);
      expect(find.byTooltip('Жилийн түүх'), findsNothing);
    });

    testWidgets('дахин илгээх: зураг + тэмдэглэл → POST /assignments/:id/submit', (tester) async {
      final p = _Photos();
      final http = FakeHttp()
        ..json('GET', '/assignments/my', fixtureAssignments())
        ..json('POST', '/assignments/a1/submit', <String, Object?>{});
      await pumpStudentRoute(tester, http: http, location: '/app/homework', overrides: online(p));
      await settle(tester);
      await tester.tap(find.text('Дахин илгээх').first);
      await _wait(tester);
      expect(find.text('Багшид тэмдэглэл (заавал биш)'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Дахин бичлээ');
      await _addPhotoAndSend(tester, 'Илгээх (1 хуудас)');
      final post = http.requests.firstWhere((r) => r.path == '/assignments/a1/submit');
      expect(post.data, {'imageKeys': ['k-homework-1.pdf'], 'note': 'Дахин бичлээ'});
      expect(find.text('Даалгавар илгээгдлээ'), findsOneWidget);
    });

    testWidgets('даалгавар алга: хоосон төлөв', (tester) async {
      final http = FakeHttp()..json('GET', '/assignments/my', <Object?>[]);
      await pumpStudentRoute(tester, http: http, location: '/app/homework', overrides: online(_Photos()));
      await settle(tester);
      expect(find.text('Даалгавар алга'), findsOneWidget);
    });

    testWidgets('алдаа: дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..on('GET', '/assignments/my', (_) => const FakeResponse(<String, Object?>{'message': 'Алдаа'}, status: 500))
        ..on('GET', '/assignments/my', (_) => FakeResponse(fixtureAssignments()));
      await pumpStudentRoute(tester, http: http, location: '/app/homework', overrides: online(_Photos()));
      await settle(tester);
      await tester.tap(find.text(AppStrings.retry));
      await settle(tester);
      expect(find.text('Логарифмын даалгавар'), findsOneWidget);
    });
  });

  group('Жилийн түүх (homework-marks/my)', () {
    List<Map<String, Object?>> marks() => [
          {'date': '2026-10-27T00:00:00.000Z', 'status': 'DONE', 'comment': 'Сайн хийжээ', 'classroom': {'id': 'c1', 'name': '12-р анги'}},
          {'date': '2026-10-29T00:00:00.000Z', 'status': 'PARTIAL', 'comment': null, 'classroom': {'id': 'c1', 'name': '12-р анги'}},
          {'date': '2026-09-15T00:00:00.000Z', 'status': 'NOT_DONE', 'comment': ' ', 'classroom': {'id': 'c1', 'name': '12-р анги'}},
        ];

    testWidgets('нийлбэр, сараар бүлэглэсэн, шинэ нь эхэнд', (tester) async {
      final http = FakeHttp()..json('GET', '/homework-marks/my', marks());
      await pumpStudentRoute(tester, http: http, location: '/app/homework/history', overrides: _Photos().overrides);
      await settle(tester);
      expect(http.requests.firstWhere((r) => r.path == '/homework-marks/my').queryParameters['year'], 2026);
      expect(find.text('2026 он'), findsOneWidget);
      expect(find.text('10-р сар'), findsOneWidget);
      expect(find.text('9-р сар'), findsOneWidget);
      expect(find.text('Сайн хийжээ'), findsOneWidget);
      final oct29 = tester.getTopLeft(find.text(dayLabel('2026-10-29'))).dy;
      final oct27 = tester.getTopLeft(find.text(dayLabel('2026-10-27'))).dy;
      expect(oct29, lessThan(oct27), reason: 'шинэ өдөр дээр');
    });

    testWidgets('өмнөх он руу шилжиж, дараагийн он нь одоогийн оноос хэтрэхгүй', (tester) async {
      final http = FakeHttp()..json('GET', '/homework-marks/my', marks());
      await pumpStudentRoute(tester, http: http, location: '/app/homework/history', overrides: _Photos().overrides);
      await settle(tester);
      expect(tester.widget<IconButton>(find.widgetWithIcon(IconButton, AppIcons.forward)).onPressed, isNull);
      await tester.tap(find.byTooltip('Өмнөх он'));
      await settle(tester);
      expect(find.text('2025 он'), findsOneWidget);
      final years = http.requests.where((r) => r.path == '/homework-marks/my').map((r) => r.queryParameters['year']).toList();
      expect(years, [2026, 2025]);
      expect(tester.widget<IconButton>(find.widgetWithIcon(IconButton, AppIcons.forward)).onPressed, isNotNull);
    });

    testWidgets('хоосон жил', (tester) async {
      final http = FakeHttp()..json('GET', '/homework-marks/my', <Object?>[]);
      await pumpStudentRoute(tester, http: http, location: '/app/homework/history', overrides: _Photos().overrides);
      await settle(tester);
      expect(find.text('2026 онд тэмдэглэгээ алга'), findsOneWidget);
    });

    testWidgets('алдаа: дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..on('GET', '/homework-marks/my', (_) => const FakeResponse(<String, Object?>{'message': 'Алдаа'}, status: 500))
        ..on('GET', '/homework-marks/my', (_) => FakeResponse(marks()));
      await pumpStudentRoute(tester, http: http, location: '/app/homework/history', overrides: _Photos().overrides);
      await settle(tester);
      await tester.tap(find.text(AppStrings.retry));
      await settle(tester);
      expect(find.text('Сайн хийжээ'), findsOneWidget);
    });
  });

  group('B хувилбар бодох', () {
    const path = '/app/homework/t1?date=$_today&classroomId=c1';

    testWidgets('бодлого дарааллаар, хадгалсан хариу, шалгах эрх', (tester) async {
      final http = FakeHttp()..json('POST', '/homework/attempts', fixtureAttempt());
      await pumpStudentRoute(tester, http: http, location: path, overrides: _Photos().overrides);
      await settle(tester);
      expect(find.text('Шалгах (2)'), findsOneWidget);
      expect(find.text('35'), findsOneWidget, reason: 'өмнө хадгалсан хариу');
      final one = tester.getTopLeft(find.text('1-р бодлого')).dy;
      final two = tester.getTopLeft(find.text('2-р бодлого')).dy;
      expect(one, lessThan(two));
      expect(find.text('Хариулт'), findsWidgets);
    });

    testWidgets('хариу бичихэд ~1.2с-ийн дараа өөрчлөгдсөнийг л хадгална', (tester) async {
      final http = FakeHttp()
        ..json('POST', '/homework/attempts', fixtureAttempt())
        ..json('PATCH', '/homework/attempts/at1', <String, Object?>{});
      await pumpStudentRoute(tester, http: http, location: path, overrides: _Photos().overrides);
      await settle(tester);
      await tester.enterText(find.widgetWithText(TextField, 'Хариулт').first, '36');
      await tester.pump(const Duration(milliseconds: 600));
      expect(http.count('PATCH', '/homework/attempts/at1'), 0, reason: 'debounce');
      await tester.pump(const Duration(milliseconds: 800));
      await settle(tester, frames: 4);
      final patch = http.requests.firstWhere((r) => r.method == 'PATCH');
      expect(patch.data, {'answers': {'p1': '36'}});
    });

    testWidgets('шалгах: зөв/буруу тэмдэг, эрх хасагдана', (tester) async {
      final http = FakeHttp()
        ..json('POST', '/homework/attempts', fixtureAttempt())
        ..json('POST', '/homework/attempts/at1/check', {
          'results': {'p1': 'CORRECT', 'p2': 'WRONG', 'p3': 'BLANK'},
          'score': {'correct': 1, 'total': 3},
          'checksUsed': 1,
        });
      await pumpStudentRoute(tester, http: http, location: path, overrides: _Photos().overrides);
      await settle(tester);
      await tester.tap(find.text('Шалгах (2)'));
      await settle(tester);
      expect(find.text('Зөв'), findsOneWidget);
      expect(find.text('Буруу'), findsOneWidget);
      expect(find.text('Шалгах (1)'), findsOneWidget);
    });

    testWidgets('илгээх: баталгаажуулалт → дүн, үйлдлийн мөр алга болно', (tester) async {
      final http = FakeHttp()
        ..json('POST', '/homework/attempts', fixtureAttempt())
        ..json('POST', '/homework/attempts/at1/submit', {
          'score': {'correct': 2, 'total': 3},
          'results': {'p1': 'CORRECT', 'p2': 'CORRECT', 'p3': 'WRONG'},
          'submittedAt': '2026-11-02T04:00:00.000Z',
        });
      await pumpStudentRoute(tester, http: http, location: path, overrides: _Photos().overrides);
      await settle(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Илгээх'));
      await settle(tester);
      expect(find.text('Илгээх үү?'), findsOneWidget);
      await tester.tap(find.descendant(of: find.byType(AlertDialog), matching: find.text('Илгээх')));
      await settle(tester);
      expect(find.text('Илгээсэн'), findsOneWidget);
      expect(find.text('3 бодлогоос 2 зөв'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, 'Илгээх'), findsNothing);
    });

    testWidgets('аль хэдийн илгээсэн оролдлого: зөвхөн дүн', (tester) async {
      final http = FakeHttp()..json('POST', '/homework/attempts', fixtureAttempt(status: 'SUBMITTED'));
      await pumpStudentRoute(tester, http: http, location: path, overrides: _Photos().overrides);
      await settle(tester);
      expect(find.text('Илгээсэн'), findsOneWidget);
      expect(find.text('2/3'), findsOneWidget);
      expect(find.text('Шалгах (2)'), findsNothing);
    });

    testWidgets('нээгдээгүй (403): тайлбартай алдааны төлөв', (tester) async {
      final http = FakeHttp()..error('POST', '/homework/attempts', 403, 'Энэ даалгавар одоохондоо нээгдээгүй');
      await pumpStudentRoute(tester, http: http, location: path, overrides: _Photos().overrides);
      await settle(tester);
      expect(find.text('Нээгдээгүй байна'), findsOneWidget);
      expect(find.text('Энэ даалгавар одоохондоо нээгдээгүй'), findsOneWidget);
    });
  });
}
