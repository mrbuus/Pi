import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/painting.dart' show Rect;
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/shared/native/native.dart';

/// Байт, толгой буцаадаг хуурамч adapter (сервер рүү холбогдохгүй).
class _BytesHttp implements HttpClientAdapter {
  _BytesHttp(this.handler);

  final ResponseBody Function(RequestOptions o) handler;
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? body, Future<void>? cancel) async {
    requests.add(o);
    return handler(o);
  }

  @override
  void close({bool force = false}) {}
}

class _FakeLauncher implements ShareLauncher {
  final shared = <(String, String, String?)>[];

  @override
  Future<bool> shareFile(File file, {required String mimeType, String? subject, Rect? origin}) async {
    shared.add((file.path, mimeType, subject));
    return true;
  }
}

ResponseBody _bytes(List<int> data, {int status = 200, Map<String, List<String>> headers = const {}}) =>
    ResponseBody.fromBytes(data, status, headers: headers);

void main() {
  late Directory tmp;
  setUp(() async => tmp = await Directory.systemTemp.createTemp('piemath_share_test'));
  tearDown(() async => tmp.delete(recursive: true));

  FileShare make(_BytesHttp http, _FakeLauncher launcher) {
    final tokens = TokenHolder()..set('tkn');
    final client = ApiClient(baseUrl: 'https://api.test/api', tokens: tokens, dio: Dio()..httpClientAdapter = http);
    return FileShare(client, launcher: launcher, tempDir: () async => tmp);
  }

  test('эрхтэй татаж, Content-Disposition-ийн нэрээр хадгална, хуваалцана', () async {
    final http = _BytesHttp(
      (o) => _bytes(
        [1, 2, 3, 4],
        headers: {
          'content-disposition': ["attachment; filename*=UTF-8''%D1%82%D3%A9%D0%BB%D0%B1%D3%A9%D1%80.xlsx"],
        },
      ),
    );
    final launcher = _FakeLauncher();
    final share = make(http, launcher);
    final ok = await share.share('/tuition/export', query: {'month': '2026-11', 'x': null}, subject: 'Төлбөр');
    expect(ok, isTrue);
    expect(http.requests.single.headers['Authorization'], 'Bearer tkn');
    expect(http.requests.single.queryParameters, {'month': '2026-11'});
    final (path, mime, subject) = launcher.shared.single;
    expect(path.endsWith('/piemath_share/төлбөр.xlsx'), isTrue, reason: path);
    expect(mime, FileShare.mimeTypeOf('a.xlsx'));
    expect(subject, 'Төлбөр');
    expect(File(path).readAsBytesSync(), [1, 2, 3, 4]);
  });

  test('redirect (S3) — толгойгүй дагана', () async {
    final http = _BytesHttp((o) {
      if (o.uri.host == 's3.test') return _bytes(utf8.encode('%PDF'));
      return _bytes(
        const [],
        status: 302,
        headers: {
          'location': ['https://s3.test/doc.pdf?sig=1'],
        },
      );
    });
    final file = await make(http, _FakeLauncher()).download('/tests/1/pdf', fileName: 'test.pdf');
    expect(http.requests, hasLength(2));
    expect(http.requests.last.headers.containsKey('Authorization'), isFalse);
    expect(file.readAsStringSync(), '%PDF');
  });

  test('серверийн алдаа → монгол мессежтэй ApiError', () async {
    final http = _BytesHttp(
      (o) => _bytes(utf8.encode(jsonEncode({'statusCode': 403, 'message': 'Танд эрх алга'})), status: 403),
    );
    await expectLater(
      make(http, _FakeLauncher()).download('/finance/export'),
      throwsA(isA<ApiError>().having((e) => e.message, 'message', 'Танд эрх алга')),
    );
  });

  test('файлын нэр, mime', () {
    expect(FileShare.fileNameFromDisposition('attachment; filename="tolbor.xlsx"'), 'tolbor.xlsx');
    expect(FileShare.fileNameFromDisposition(null), isNull);
    expect(FileShare.safeFileName('../a/b:c.pdf'), '.._a_b_c.pdf');
    expect(FileShare.safeFileName('  '), 'file');
    expect(FileShare.mimeTypeOf('X.PDF'), 'application/pdf');
    expect(FileShare.mimeTypeOf('a.bin'), 'application/octet-stream');
  });
}
