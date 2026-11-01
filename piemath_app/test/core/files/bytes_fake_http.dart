import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// Түүхий байт, redirect, толгойг шалгах боломжтой хуурамч HTTP (core/files тестэд).
/// Түлхүүр: `METHOD бүтэн_URL` (query-гүй).
class BytesFakeHttp implements HttpClientAdapter {
  final _routes = <String, List<BytesResponse Function(RequestOptions, Uint8List body)>>{};
  final requests = <RequestOptions>[];
  final bodies = <Uint8List>[];

  void on(String method, String url, BytesResponse Function(RequestOptions req, Uint8List body) handler) =>
      (_routes['${method.toUpperCase()} $url'] ??= []).add(handler);

  void bytes(String method, String url, List<int> data, {int status = 200}) =>
      on(method, url, (_, _) => BytesResponse(Uint8List.fromList(data), status: status));

  void json(String method, String url, Object? body, {int status = 200}) =>
      on(method, url, (_, _) => BytesResponse.json(body, status: status));

  void redirect(String url, String location, {int status = 302}) =>
      on('GET', url, (_, _) => BytesResponse(Uint8List(0), status: status, headers: {'location': [location]}));

  void network(String method, String url) =>
      on(method, url, (_, _) => BytesResponse.network());

  List<RequestOptions> to(String method, String url) =>
      requests.where((r) => r.method == method.toUpperCase() && r.uri.replace(query: '').toString().replaceAll('?', '') == url).toList();

  Dio dio() => Dio()..httpClientAdapter = this;

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add(options);
    final chunks = <int>[];
    if (requestStream != null) {
      await for (final c in requestStream) {
        chunks.addAll(c);
      }
    }
    final body = Uint8List.fromList(chunks);
    bodies.add(body);
    final url = options.uri.replace(query: '').toString().replaceAll('?', '');
    final handlers = _routes['${options.method} $url'];
    if (handlers == null || handlers.isEmpty) {
      return ResponseBody.fromString(jsonEncode({'statusCode': 404, 'message': 'Not Found'}), 404, headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      });
    }
    final n = requests.where((r) => r.method == options.method && r.uri.replace(query: '').toString().replaceAll('?', '') == url).length;
    final res = handlers[(n - 1).clamp(0, handlers.length - 1)](options, body);
    if (res.status == -1) throw DioException.connectionError(requestOptions: options, reason: 'fake network');
    return ResponseBody.fromBytes(res.body, res.status, headers: res.headers);
  }

  @override
  void close({bool force = false}) {}
}

class BytesResponse {
  const BytesResponse(this.body, {this.status = 200, this.headers = const {}});

  BytesResponse.json(Object? json, {this.status = 200})
      : body = Uint8List.fromList(utf8.encode(jsonEncode(json))),
        headers = {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        };

  BytesResponse.network()
      : body = Uint8List(0),
        status = -1,
        headers = const {};

  final Uint8List body;
  final int status;
  final Map<String, List<String>> headers;
}

/// Жинхэнэ жижиг JPEG (1x1, progressive) — SOF-ийн хэмжээг [width]x[height] болгож засна,
/// [padding] байтыг COM сегментээр нэмнэ (хэмжээний төсвийг шалгахад). pdf сан толгойг уншихад хангалттай.
Uint8List fakeJpeg(int width, int height, {int padding = 0}) {
  final base = base64Decode(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  );
  final b = Uint8List.fromList(base);
  const sof = 89; // FF C2
  b[sof + 5] = height >> 8;
  b[sof + 6] = height & 0xFF;
  b[sof + 7] = width >> 8;
  b[sof + 8] = width & 0xFF;
  final out = BytesBuilder()..add(b.sublist(0, 2));
  var left = padding;
  while (left > 0) {
    final n = left > 65533 ? 65533 : left;
    out
      ..add([0xFF, 0xFE, (n + 2) >> 8, (n + 2) & 0xFF])
      ..add(Uint8List(n));
    left -= n;
  }
  out.add(b.sublist(2));
  return out.toBytes();
}
