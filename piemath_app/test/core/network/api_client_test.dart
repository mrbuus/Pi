import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/core/ui/strings.dart';

import '../../helpers/fake_http.dart';

void main() {
  late FakeHttp http;
  late TokenHolder tokens;
  late List<String> unauthorized;
  late List<bool> reach;
  late ApiClient client;

  setUp(() {
    http = FakeHttp();
    tokens = TokenHolder()..set('tok-1');
    unauthorized = [];
    reach = [];
    client = ApiClient(
      baseUrl: 'https://api.test/api',
      tokens: tokens,
      dio: http.dio(),
      onUnauthorized: unauthorized.add,
      onReachability: reach.add,
      random: math.Random(1),
      retryBaseDelay: Duration.zero,
    );
  });

  test('Bearer толгой, JSON задлалт', () async {
    http.json('GET', '/auth/me', {'id': 'u1'});
    final id = await client.get('/auth/me', parse: (j) => (j! as Map)['id']);
    expect(id, 'u1');
    expect(http.requests.single.headers['Authorization'], 'Bearer tok-1');
    expect(http.requests.single.uri.toString(), 'https://api.test/api/auth/me');
    expect(reach, [true]);
  });

  test('auth: false үед толгойгүй', () async {
    http.json('POST', '/auth/login', {'accessToken': 'x'});
    await client.post<Object?>('/auth/login', body: {'identifier': '99112233', 'password': 'p'}, auth: false);
    expect(http.requests.single.headers.containsKey('Authorization'), isFalse);
  });

  test('query-ийн null утгыг илгээхгүй', () async {
    http.json('GET', '/student-hub/days', <Object?>[]);
    await client.get<Object?>('/student-hub/days', query: {'month': '2026-11', 'x': null}, parse: (j) => j);
    expect(http.requests.single.queryParameters, {'month': '2026-11'});
  });

  test('серверийн монгол мессежийг харуулна', () async {
    http.error('POST', '/auth/login', 401, 'Утас эсвэл нууц үг буруу байна');
    final f = client.post<Object?>('/auth/login', body: {}, auth: false);
    await expectLater(
      f,
      throwsA(
        isA<ApiError>()
            .having((e) => e.kind, 'kind', ApiErrorKind.unauthorized)
            .having((e) => e.message, 'message', 'Утас эсвэл нууц үг буруу байна'),
      ),
    );
    // Нэвтрэх хүсэлтийн 401 нь session-ийг дуусгахгүй.
    expect(unauthorized, isEmpty);
  });

  test('англи мессежийг харуулахгүй — монгол ерөнхий бичвэр', () async {
    http.error('GET', '/x', 404, 'Cannot GET /x');
    await expectLater(
      client.get<Object?>('/x', parse: (j) => j),
      throwsA(isA<ApiError>().having((e) => e.message, 'message', AppStrings.notFound)),
    );
  });

  test('5xx-ийн мессеж техникийн байж болох тул ерөнхий бичвэр', () async {
    http.error('GET', '/x', 500, 'Дотоод алдаа: prisma');
    await expectLater(
      client.get<Object?>('/x', parse: (j) => j),
      throwsA(isA<ApiError>().having((e) => e.message, 'message', AppStrings.serverError)),
    );
  });

  test('нэвтэрсэн хүсэлтийн 401 → onUnauthorized (шалтгаантай)', () async {
    http.error('GET', '/auth/me', 401, 'Нууц үг өөрчлөгдсөн тул дахин нэвтэрнэ үү');
    await expectLater(client.get<Object?>('/auth/me', parse: (j) => j), throwsA(isA<ApiError>()));
    expect(unauthorized, ['Нууц үг өөрчлөгдсөн тул дахин нэвтэрнэ үү']);
  });

  test('GET: сүлжээний алдааны дараа нэг удаа дахин оролдоно', () async {
    http
      ..on('GET', '/a', (_) => const FakeResponse.network())
      ..on('GET', '/a', (_) => const FakeResponse({'ok': true}));
    final r = await client.get('/a', parse: (j) => (j! as Map)['ok']);
    expect(r, true);
    expect(http.count('GET', '/a'), 2);
  });

  test('GET: хоёр дахь удаа ч бүтэлгүйтвэл сүлжээний алдаа + офлайн', () async {
    http.on('GET', '/a', (_) => const FakeResponse.timeout());
    await expectLater(
      client.get<Object?>('/a', parse: (j) => j),
      throwsA(isA<ApiError>().having((e) => e.kind, 'kind', ApiErrorKind.timeout)),
    );
    expect(http.count('GET', '/a'), 2);
    expect(reach.last, isFalse);
  });

  test('POST-ийг автоматаар ДАВТАХГҮЙ (давхар илгээлтээс сэргийлнэ)', () async {
    http.on('POST', '/tests/1/submit', (_) => const FakeResponse.network());
    await expectLater(
      client.post<Object?>('/tests/1/submit', body: {}),
      throwsA(isA<ApiError>().having((e) => e.kind, 'kind', ApiErrorKind.network)),
    );
    expect(http.count('POST', '/tests/1/submit'), 1);
  });

  test('POST retry: true бол давтана (idempotent autosave)', () async {
    http
      ..on('PATCH', '/tests/1/session', (_) => const FakeResponse.network())
      ..on('PATCH', '/tests/1/session', (_) => const FakeResponse({'saved': true}));
    await client.patch<Object?>('/tests/1/session', body: {'answers': <Object?>[]}, retry: true);
    expect(http.count('PATCH', '/tests/1/session'), 2);
  });

  test('429 дээр давтахгүй', () async {
    http.error('GET', '/scan/ABCD2345', 429);
    await expectLater(
      client.get<Object?>('/scan/ABCD2345', parse: (j) => j),
      throwsA(isA<ApiError>().having((e) => e.kind, 'kind', ApiErrorKind.tooManyRequests)),
    );
    expect(http.count('GET', '/scan/ABCD2345'), 1);
  });

  test('ижил GET зэрэг — нэг хүсэлт', () async {
    http.on('GET', '/overview', (_) => const FakeResponse({'n': 1}, delay: Duration(milliseconds: 20)));
    final results = await Future.wait([
      client.get('/overview', parse: (j) => (j! as Map)['n']),
      client.get('/overview', parse: (j) => (j! as Map)['n']),
    ]);
    expect(results, [1, 1]);
    expect(http.count('GET', '/overview'), 1);
  });

  test('хүсэлтийн явцад токен солигдвол хариуг хаяна', () async {
    http.on('GET', '/me-data', (_) => const FakeResponse({'secret': 1}, delay: Duration(milliseconds: 20)));
    final f = client.get<Object?>('/me-data', parse: (j) => j);
    tokens.set('other-user');
    await expectLater(f, throwsA(isA<ApiError>().having((e) => e.kind, 'kind', ApiErrorKind.unauthorized)));
  });

  test('хариуны бүтэц буруу бол техникийн бус алдаа', () async {
    http.json('GET', '/a', {'x': 1});
    await expectLater(
      client.get<int>('/a', parse: (j) => (j! as Map)['missing'] as int),
      throwsA(isA<ApiError>().having((e) => e.kind, 'kind', ApiErrorKind.unknown)),
    );
  });

  test('файлын хаяг ба толгой — токен query-д орохгүй', () {
    expect(client.fileUri('abc.jpg').toString(), 'https://api.test/api/files/abc.jpg');
    expect(client.fileUri('abc.jpg').query, isEmpty);
    expect(client.authHeaders(), {'Authorization': 'Bearer tok-1'});
  });
}
