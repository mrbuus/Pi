import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// Толгойтой (ETag, 304) хуурамч хариу — GET кэшийн тестэд. `fake_http.dart`-ийг өөрчлөхгүйгээр.
class HeaderResponse {
  const HeaderResponse(this.body, {this.status = 200, this.etag, this.delay = Duration.zero});

  const HeaderResponse.network()
      : body = null,
        status = -1,
        etag = null,
        delay = Duration.zero;

  final Object? body;
  final int status;
  final String? etag;
  final Duration delay;
}

typedef HeaderHandler = FutureOr<HeaderResponse> Function(RequestOptions request);

/// Бодит сервер рүү ХЭЗЭЭ Ч холбогдохгүй dio adapter. `If-None-Match` ирвэл ETag тохирох үед
/// өөрөө 304 буцаана (Express-ийн `res.send`-тэй ижил).
class CacheFakeHttp implements HttpClientAdapter {
  final _routes = <String, HeaderHandler>{};
  final requests = <RequestOptions>[];

  /// 304 буцаасан тоо.
  int notModified = 0;

  void on(String method, String path, HeaderHandler handler) => _routes['${method.toUpperCase()} $path'] = handler;

  int count(String method, String path) =>
      requests.where((r) => r.method == method.toUpperCase() && r.path == path).length;

  Dio dio() => Dio()..httpClientAdapter = this;

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add(options);
    final handler = _routes['${options.method} ${options.path}'];
    if (handler == null) return _body({'statusCode': 404, 'message': 'Not Found'}, 404, null);
    final res = await handler(options);
    if (res.delay > Duration.zero) await Future<void>.delayed(res.delay);
    if (res.status == -1) throw DioException.connectionError(requestOptions: options, reason: 'fake network');
    final inm = options.headers['If-None-Match'];
    if (res.status == 200 && res.etag != null && inm == res.etag) {
      notModified++;
      return ResponseBody.fromBytes(const [], 304, headers: {
        'etag': [res.etag!],
      });
    }
    return _body(res.body, res.status, res.etag);
  }

  ResponseBody _body(Object? body, int status, String? etag) => ResponseBody.fromString(
        body == null ? '' : jsonEncode(body),
        status,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
          'etag': ?(etag == null ? null : [etag]),
        },
      );

  @override
  void close({bool force = false}) {}
}
