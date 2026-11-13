import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/features/homework/data/photo_error_reporter.dart';
import 'package:piemath_app/features/homework/domain/photo_rules.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';

// Давалгаа 6 (вэб 2026-11-12): онол 20 / даалгавар 15 хуудас, 5 минутын дотор устгах/солих, зургийн алдааны бүртгэл.

void main() {
  test('хуудасны дээд тоо (сервертэй ижил)', () {
    expect(homeworkPhotoMaxPages, 15);
    expect(theoryPhotoMaxPages, 20);
  });

  test('5 минутын цонх: дотор нь засна, хил дээр болон дараа нь үгүй, цаг мэдэгдэхгүй бол үгүй', () {
    final sent = DateTime.utc(2026, 11, 12, 10);
    expect(photoEditDeadline(sent), DateTime.utc(2026, 11, 12, 10, 5));
    expect(photoEditable(sent, sent.add(const Duration(minutes: 4, seconds: 59))), isTrue);
    expect(photoEditable(sent, sent.add(const Duration(minutes: 5))), isFalse);
    expect(photoEditable(sent, sent.add(const Duration(hours: 1))), isFalse);
    expect(photoEditable(null, sent), isFalse);
    expect(photoEditDeadline(null), isNull);
  });

  test('алдааны бүртгэл: шат, платформ, төрөл — нэр, агуулгагүй; 280 тэмдэгтээс урт биш', () async {
    expect(PhotoErrorReporter.describe(const ApiError(ApiErrorKind.server, 'x', status: 502)), 'ApiError server 502');
    expect(
      PhotoErrorReporter.describe(PlatformException(code: 'photo_access_denied')),
      'PlatformException photo_access_denied',
    );
    expect(PhotoErrorReporter.target('upload', 'n 3 ApiError timeout'), startsWith('err:photo/upload app '));
    expect(PhotoErrorReporter.target('build', 'x' * 400).length, 280);

    final http = FakeHttp()..json('POST', '/usage', {'accepted': 1}, status: 202);
    final c = testContainer(http: http);
    c.read(photoErrorReporterProvider).report(path: '/app/homework', stage: 'upload', detail: 'n 2 ApiError timeout');
    await Future<void>.delayed(const Duration(milliseconds: 50));
    final req = http.requests.single;
    expect(req.method, 'POST');
    final body = req.data as Map;
    expect(body['device'], 'mobile');
    final event = (body['events'] as List).single as Map;
    expect(event['kind'], 'error');
    expect(event['path'], '/app/homework');
    expect(event['target'], contains('err:photo/upload app'));
    expect(event['target'], endsWith('n 2 ApiError timeout'));
  });

  test('бүртгэл бүтэлгүйтсэн ч алдаа шидэхгүй', () async {
    final http = FakeHttp()..on('POST', '/usage', (_) => const FakeResponse.network());
    final c = testContainer(http: http);
    c.read(photoErrorReporterProvider).report(path: '/app/theory', stage: 'read', detail: 'n 0 x');
    await Future<void>.delayed(const Duration(milliseconds: 50));
    expect(http.count('POST', '/usage'), greaterThanOrEqualTo(1));
  });
}
