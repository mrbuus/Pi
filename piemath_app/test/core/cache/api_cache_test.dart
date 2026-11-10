import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/cache/response_cache.dart';
import 'package:piemath_app/core/cache/swr.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/core/network/api_error.dart';

import '../../helpers/cache_fake_http.dart';

Object? _id(Object? j) => j;

void main() {
  late CacheFakeHttp http;
  late TokenHolder tokens;
  late ResponseCache cache;
  late List<bool> reach;
  late ApiClient client;
  String? scope;

  ApiClient makeClient(ResponseCache c) => ApiClient(
        baseUrl: 'https://api.test/api',
        tokens: tokens,
        dio: http.dio(),
        cache: c,
        cacheScope: () => scope,
        onReachability: reach.add,
        random: math.Random(1),
        retryBaseDelay: Duration.zero,
      );

  setUp(() {
    http = CacheFakeHttp();
    tokens = TokenHolder()..set('tok');
    reach = [];
    scope = 'u1';
    cache = ResponseCache();
    client = makeClient(cache);
  });

  group('сүлжээ эхэлж, офлайн бол кэш (өгөгдмөл)', () {
    test('сүлжээгүй үед сүүлд мэдэгдсэн хариу, тууз асна', () async {
      var online = true;
      http.on('GET', '/announcements', (_) => online ? const HeaderResponse(['a']) : const HeaderResponse.network());
      expect(await client.get('/announcements', parse: _id), ['a']);
      online = false;
      expect(await client.get('/announcements', parse: _id), ['a']);
      expect(reach.last, isFalse);
      // Кэштэй үед 60с-ийн давталтыг хүлээлгэхгүй — нэг л оролдлого.
      expect(http.count('GET', '/announcements'), 2);
    });

    test('кэшгүй бол алдаа хэвээр (хуучин зан төлөв)', () async {
      http.on('GET', '/announcements', (_) => const HeaderResponse.network());
      await expectLater(client.get('/announcements', parse: _id), throwsA(isA<ApiError>()));
      expect(http.count('GET', '/announcements'), 2); // сэрээх давталт
    });

    test('503 (сервер сэрж байна) үед ч кэш', () async {
      var down = false;
      http.on('GET', '/x', (_) => down ? const HeaderResponse({'statusCode': 503}, status: 503) : const HeaderResponse({'v': 1}));
      await client.get('/x', parse: _id);
      down = true;
      expect(await client.get('/x', parse: _id), {'v': 1});
    });

    test('403/404 бол кэш харуулахгүй — эрх хаагдсан', () async {
      var forbidden = false;
      http.on('GET', '/x', (_) => forbidden ? const HeaderResponse({'statusCode': 403}, status: 403) : const HeaderResponse({'v': 1}));
      await client.get('/x', parse: _id);
      forbidden = true;
      await expectLater(client.get('/x', parse: _id), throwsA(isA<ApiError>().having((e) => e.kind, 'kind', ApiErrorKind.forbidden)));
    });

    test('/auth/* хэзээ ч кэшлэгдэхгүй', () async {
      var online = true;
      http.on('GET', '/auth/me', (_) => online ? const HeaderResponse({'id': 'u1'}) : const HeaderResponse.network());
      await client.get('/auth/me', parse: _id);
      online = false;
      await expectLater(client.get('/auth/me', parse: _id), throwsA(isA<ApiError>()));
      expect(cache.memoryEntries, 0);
    });

    test('нэвтрээгүй (scope null) бол кэшгүй', () async {
      scope = null;
      http.on('GET', '/x', (_) => const HeaderResponse({'v': 1}));
      await client.get('/x', parse: _id);
      expect(cache.memoryEntries, 0);
    });

    test('`cache: false` — opt-out', () async {
      http.on('GET', '/x', (_) => const HeaderResponse({'v': 1}));
      await client.get('/x', parse: _id, cache: false);
      expect(cache.memoryEntries, 0);
    });
  });

  test('ETag: дараагийн хүсэлт If-None-Match илгээж, 304-ийг кэшээр хариулна', () async {
    http.on('GET', '/student-hub/overview', (_) => const HeaderResponse({'name': 'Тест'}, etag: 'W/"1a-abc"'));
    expect(await client.get('/student-hub/overview', parse: _id), {'name': 'Тест'});
    expect(await client.get('/student-hub/overview', parse: _id), {'name': 'Тест'});
    expect(http.requests.last.headers['If-None-Match'], 'W/"1a-abc"');
    expect(http.notModified, 1);
  });

  test('ижил GET зэрэг — нэг хүсэлт', () async {
    http.on('GET', '/x', (_) => const HeaderResponse({'v': 1}, delay: Duration(milliseconds: 20)));
    final r = await Future.wait([client.get('/x', parse: _id), client.get('/x', parse: _id)]);
    expect(r, [
      {'v': 1},
      {'v': 1},
    ]);
    expect(http.count('GET', '/x'), 1);
  });

  group('mutation', () {
    test('амжилттай POST ижил бүлгийн кэшийг устгана (хуучин төлөв офлайнд ч харагдахгүй)', () async {
      var online = true;
      http
        ..on('GET', '/assignments/my-classrooms', (_) => online ? const HeaderResponse(['old']) : const HeaderResponse.network())
        ..on('POST', '/assignments/a1/submit', (_) => const HeaderResponse({'ok': true}));
      await client.get('/assignments/my-classrooms', parse: _id);
      await client.post<Object?>('/assignments/a1/submit', body: {});
      online = false;
      await expectLater(client.get('/assignments/my-classrooms', parse: _id), throwsA(isA<ApiError>()));
    });

    test('POST кэшлэгдэхгүй, сүлжээний алдаанд давтагдахгүй', () async {
      http.on('POST', '/tests/t1/submit', (_) => const HeaderResponse.network());
      await expectLater(client.post<Object?>('/tests/t1/submit', body: {}), throwsA(isA<ApiError>()));
      expect(http.count('POST', '/tests/t1/submit'), 1);
      expect(cache.memoryEntries, 0);
    });

    test('өөр бүлгийн кэшийг гараар устгах', () async {
      http.on('GET', '/student-hub/tests', (_) => const HeaderResponse([1]));
      await client.get('/student-hub/tests', parse: _id);
      client.invalidateCache('/student-hub');
      expect(cache.peek('/student-hub/tests'), isNull);
    });
  });

  test('хэрэглэгч солигдвол өмнөх хүний кэш харагдахгүй', () async {
    var online = true;
    http.on('GET', '/x', (_) => online ? const HeaderResponse({'who': 'u1'}) : const HeaderResponse.network());
    await client.get('/x', parse: _id);
    scope = 'u2';
    online = false;
    await expectLater(client.get('/x', parse: _id), throwsA(isA<ApiError>()));
  });

  group('SWR', () {
    test('кэштэй бол шууд буцааж, арын шинэчлэл өөр бол onFresh', () async {
      var version = 1;
      http.on('GET', '/student-hub/overview', (_) => HeaderResponse({'v': version}, delay: const Duration(milliseconds: 30)));
      await client.get('/student-hub/overview', parse: _id);
      version = 2;
      final fresh = Completer<void>();
      final scopeObj = SwrScope(onFresh: fresh.complete);
      final sw = Stopwatch()..start();
      final first = await scopeObj.run(() => client.get('/student-hub/overview', parse: _id));
      sw.stop();
      expect(first, {'v': 1}); // хуучныг хүлээлгүйгээр
      expect(sw.elapsedMilliseconds, lessThan(30));
      await fresh.future.timeout(const Duration(seconds: 2));
      // Провайдерын өөрийн дахин бүтээлт (isRefresh) сүлжээ рүү дахин явахгүй.
      final before = http.count('GET', '/student-hub/overview');
      final again = await SwrScope(onFresh: () {}, preferNetwork: true).run(() => client.get('/student-hub/overview', parse: _id));
      expect(again, {'v': 2});
      expect(http.count('GET', '/student-hub/overview'), before);
    });

    test('өөрчлөгдөөгүй бол onFresh дуудагдахгүй', () async {
      http.on('GET', '/x', (_) => const HeaderResponse({'v': 1}, etag: 'W/"e1"'));
      await client.get('/x', parse: _id);
      var calls = 0;
      await SwrScope(onFresh: () => calls++).run(() => client.get('/x', parse: _id));
      await Future<void>.delayed(const Duration(milliseconds: 50));
      expect(calls, 0);
      expect(http.notModified, 1);
    });

    test('pull-to-refresh (preferNetwork) — эхлээд сүлжээ', () async {
      var version = 1;
      http.on('GET', '/x', (_) => HeaderResponse({'v': version}));
      await client.get('/x', parse: _id);
      version = 2;
      final r = await SwrScope(onFresh: () {}, preferNetwork: true).run(() => client.get('/x', parse: _id));
      expect(r, {'v': 2});
    });

    test('арын шинэчлэл 403 бол кэш устаж onFresh — дэлгэц алдаагаа харуулна', () async {
      var forbidden = false;
      http.on('GET', '/x', (_) => forbidden ? const HeaderResponse({'statusCode': 403}, status: 403) : const HeaderResponse({'v': 1}));
      await client.get('/x', parse: _id);
      forbidden = true;
      final fresh = Completer<void>();
      expect(await SwrScope(onFresh: fresh.complete).run(() => client.get('/x', parse: _id)), {'v': 1});
      await fresh.future.timeout(const Duration(seconds: 2));
      expect(cache.peek('/x'), isNull);
    });

    test('mutation-ий дараа pendingSwr хүчингүй — сүлжээнээс', () async {
      var version = 1;
      http
        ..on('GET', '/x', (_) => HeaderResponse({'v': version}))
        ..on('POST', '/y', (_) => const HeaderResponse({'ok': true}));
      await client.get('/x', parse: _id);
      version = 2;
      final fresh = Completer<void>();
      await SwrScope(onFresh: fresh.complete).run(() => client.get('/x', parse: _id));
      await fresh.future;
      await client.post<Object?>('/y', body: {});
      version = 3;
      final r = await SwrScope(onFresh: () {}, preferNetwork: true).run(() => client.get('/x', parse: _id));
      expect(r, {'v': 3});
    });
  });

  test('апп дахин асахад дискнээс шууд (сүлжээ удаан ч хүлээхгүй)', () async {
    final dir = await Directory.systemTemp.createTemp('pm_api_test');
    addTearDown(() async {
      await Future<void>.delayed(const Duration(milliseconds: 400)); // арын шинэчлэл дуустал
      if (dir.existsSync()) await dir.delete(recursive: true);
    });
    final disk1 = ResponseCache(directory: () async => dir);
    final c1 = makeClient(disk1);
    http.on('GET', '/student-hub/overview', (_) => const HeaderResponse({'name': 'Тест', 'n': 3}, delay: Duration(milliseconds: 300)));
    await c1.get('/student-hub/overview', parse: _id);
    // Дискэнд арын төлөвт бичигдэнэ.
    for (var i = 0; i < 50 && dir.listSync(recursive: true).whereType<File>().isEmpty; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 20));
    }

    // «Шинэ процесс»: шинэ кэш, санах ой хоосон.
    final disk2 = ResponseCache(directory: () async => dir);
    final c2 = makeClient(disk2);
    final sw = Stopwatch()..start();
    final r = await SwrScope(onFresh: () {}).run(() => c2.get('/student-hub/overview', parse: _id));
    sw.stop();
    expect(r, {'name': 'Тест', 'n': 3});
    expect(sw.elapsedMilliseconds, lessThan(300));
    // ignore: avoid_print
    print('PERF дискнээс сэргээх: ${sw.elapsedMicroseconds / 1000}ms (сүлжээ 300ms)');
  });
}
