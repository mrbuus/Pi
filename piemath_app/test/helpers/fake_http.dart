import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// Хуурамч HTTP хариу.
class FakeResponse {
  const FakeResponse(this.body, {this.status = 200, this.delay = Duration.zero});

  /// Сүлжээний алдаа (холболт тасарсан).
  const FakeResponse.network({this.delay = Duration.zero})
      : body = null,
        status = -1;

  /// Хүлээх хугацаа хэтэрсэн.
  const FakeResponse.timeout({this.delay = Duration.zero})
      : body = null,
        status = -2;

  final Object? body;
  final int status;
  final Duration delay;
}

typedef FakeHandler = FutureOr<FakeResponse> Function(RequestOptions request);

/// Dio-гийн mock adapter — бодит сервер, прод сан руу ХЭЗЭЭ Ч холбогдохгүй тест (RULES §6).
///
/// ```dart
/// final http = FakeHttp()..json('POST', '/auth/login', {'accessToken': 't', 'userId': 'u1', 'role': 'STUDENT'});
/// final client = ApiClient(baseUrl: 'https://api.test/api', tokens: TokenHolder(), dio: http.dio());
/// ```
class FakeHttp implements HttpClientAdapter {
  final _routes = <String, List<FakeHandler>>{};

  /// Ирсэн бүх хүсэлт (дараалал, толгой, бие шалгахад).
  final requests = <RequestOptions>[];

  /// Хариугүй замд 404.
  bool strict = false;

  /// [method] + [path] (`/auth/me`, query-гүй). Олон удаа бүртгэвэл дарааллаар (сүүлийнх нь давтагдана).
  void on(String method, String path, FakeHandler handler) =>
      (_routes['${method.toUpperCase()} $path'] ??= []).add(handler);

  void json(String method, String path, Object? body, {int status = 200}) =>
      on(method, path, (_) => FakeResponse(body, status: status));

  void error(String method, String path, int status, [String? message]) =>
      json(method, path, {'statusCode': status, 'message': ?message}, status: status);

  int count(String method, String path) =>
      requests.where((r) => r.method == method.toUpperCase() && r.path == path).length;

  Dio dio() => Dio()..httpClientAdapter = this;

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add(options);
    final handlers = _routes['${options.method} ${options.path}'];
    if (handlers == null || handlers.isEmpty) {
      return _body({'statusCode': 404, 'message': 'Not Found'}, 404);
    }
    final calls = requests.where((r) => r.method == options.method && r.path == options.path).length;
    final handler = handlers[(calls - 1).clamp(0, handlers.length - 1)];
    final res = await handler(options);
    if (res.delay > Duration.zero) await Future<void>.delayed(res.delay);
    if (res.status == -1) {
      throw DioException.connectionError(requestOptions: options, reason: 'fake network');
    }
    if (res.status == -2) {
      throw DioException.receiveTimeout(timeout: const Duration(seconds: 1), requestOptions: options);
    }
    return _body(res.body, res.status);
  }

  ResponseBody _body(Object? body, int status) => ResponseBody.fromString(
        body == null ? '' : jsonEncode(body),
        status,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

  @override
  void close({bool force = false}) {}
}
