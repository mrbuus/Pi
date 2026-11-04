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

const _path = '/app/makeup/photos/c1/2026-10-28';

List<Map<String, Object?>> _openWithPhotos() {
  final item = Map<String, Object?>.of(makeupJson().first)
    ..['imageKeys'] = ['n1.pdf']
    ..['photos'] = 4
    ..['resubmit'] = false
    ..['status'] = 'PARTIAL';
  return [item];
}

Future<void> _wait(WidgetTester tester, {int frames = 16}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

void main() {
  setUpAll(loadAppFonts);

  Future<(FakePhotoSetUploader, FakeHttp)> pump(
    WidgetTester tester, {
    Object? makeup,
    FakeHttp? http,
  }) async {
    final uploader = FakePhotoSetUploader();
    final h = http ?? (FakeHttp()..json('GET', '/makeup/me', makeup ?? makeupJson()));
    await pumpStudentRoute(
      tester,
      http: h,
      location: _path,
      overrides: [
        photoSourceProvider.overrideWithValue(FakePhotoSource(camera: ['a'])),
        photoProcessorProvider.overrideWithValue(FakePhotoProcessor()),
        photoSetUploaderProvider.overrideWithValue(uploader),
      ],
    );
    await settle(tester);
    return (uploader, h);
  }

  testWidgets('шинэ зураг: гарчиг, сануулга, зураг илгээгээгүй, дахин илгээх хүсэлт', (tester) async {
    await pump(tester);
    expect(find.text('Дэвтрийн зураг'), findsOneWidget);
    expect(find.textContaining('хичээлээ нөхөх'), findsOneWidget);
    expect(find.text('Зураг хараахан илгээгээгүй'), findsOneWidget);
    expect(find.text('Багш зургаа дахин илгээхийг хүссэн'), findsOneWidget);
    expect(find.text('Дэвтрийн зураг илгээх'), findsOneWidget);
    expect(find.textContaining('PDF'), findsNothing);
  });

  testWidgets('камер → тайрах → илгээх: POST /makeup/me/:c/:d/photos, дараа нь шинэчлэгдэнэ', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/makeup/me', makeupJson())
      ..json('POST', '/makeup/me/c1/2026-10-28/photos', _openWithPhotos().first);
    final (uploader, _) = await pump(tester, http: http);
    await tester.tap(find.text('Дэвтрийн зураг илгээх'));
    await _wait(tester);
    expect(find.text('0/10'), findsOneWidget, reason: 'нөхөх зураг 10 хүртэл хуудас');
    await tester.tap(find.text('Камер'));
    await _wait(tester);
    await tester.tap(find.text('Болсон'));
    await _wait(tester);
    await tester.tap(find.text('Илгээх (1 хуудас)'));
    await _wait(tester, frames: 20);
    final post = http.requests.firstWhere((r) => r.method == 'POST');
    expect(post.data, {'imageKeys': ['k-general-1.pdf']});
    expect(uploader.uploads.single, ['a']);
    expect(find.text('Зураг илгээгдлээ'), findsOneWidget);
    expect(http.count('GET', '/makeup/me'), 2, reason: 'жагсаалт шинэчлэгдсэн');
  });

  testWidgets('илгээсэн зурагтай нээлттэй өдөр: «Зургаа солих», хуудасны тоо', (tester) async {
    await pump(tester, makeup: _openWithPhotos());
    expect(find.text('Илгээсэн 4 хуудас'), findsOneWidget);
    expect(find.text('Зургаа солих'), findsOneWidget);
    expect(find.text('Шинэ зураг илгээвэл өмнөх зургийг орлоно'), findsOneWidget);
    expect(find.text('Хуудас'), findsOneWidget, reason: 'баримт нь «хуудас» гэж харагдана');
  });

  testWidgets('хаагдсан (нөхсөн) өдөр: товч идэвхгүй, тайлбартай', (tester) async {
    final http = FakeHttp()..json('GET', '/makeup/me', makeupJson());
    final uploader = FakePhotoSetUploader();
    await pumpStudentRoute(
      tester,
      http: http,
      location: '/app/makeup/photos/c1/2026-10-10',
      overrides: [photoSetUploaderProvider.overrideWithValue(uploader)],
    );
    await settle(tester);
    expect(find.text('Энэ нөхөх хичээл хаагдсан'), findsOneWidget);
    expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNull);
  });

  testWidgets('нөхөх хичээл олдохгүй: хоосон төлөв', (tester) async {
    await pump(tester, makeup: <Object?>[]);
    expect(find.text('Энэ өдрийн нөхөх хичээл олдсонгүй'), findsOneWidget);
  });

  testWidgets('алдаа: дахин оролдох', (tester) async {
    final http = FakeHttp()
      ..on('GET', '/makeup/me', (_) => const FakeResponse(<String, Object?>{'message': 'Алдаа'}, status: 500))
      ..on('GET', '/makeup/me', (_) => FakeResponse(makeupJson()));
    await pump(tester, http: http);
    expect(find.byType(ErrorState), findsOneWidget);
    await tester.tap(find.text(AppStrings.retry));
    await settle(tester);
    expect(find.text('Дэвтрийн зураг илгээх'), findsOneWidget);
  });

  testWidgets('409: багш шийдвэрлэсэн — серверийн мессеж, зураг хэвээр', (tester) async {
    final http = FakeHttp()
      ..json('GET', '/makeup/me', makeupJson())
      ..error('POST', '/makeup/me/c1/2026-10-28/photos', 409, 'Багш энэ хичээлийг аль хэдийн шийдвэрлэсэн.');
    await pump(tester, http: http);
    await tester.tap(find.text('Дэвтрийн зураг илгээх'));
    await _wait(tester);
    await tester.tap(find.text('Камер'));
    await _wait(tester);
    await tester.tap(find.text('Болсон'));
    await _wait(tester);
    await tester.tap(find.text('Илгээх (1 хуудас)'));
    await _wait(tester, frames: 20);
    expect(find.text('Багш энэ хичээлийг аль хэдийн шийдвэрлэсэн.'), findsOneWidget);
    expect(find.text('1/10'), findsOneWidget);
  });
}
