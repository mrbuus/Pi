import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/files/files.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/core/network/api_error.dart';

import 'bytes_fake_http.dart';

const base = 'https://api.test/api';

void main() {
  late BytesFakeHttp http;
  late ApiClient client;

  setUp(() {
    http = BytesFakeHttp();
    client = ApiClient(
      baseUrl: base,
      tokens: TokenHolder()..set('tok'),
      dio: http.dio(),
      retryBaseDelay: Duration.zero,
    );
  });

  group('FileFetcher', () {
    test('Authorization толгойтой татна', () async {
      http.bytes('GET', '$base/files/a.jpg', [1, 2, 3]);
      final bytes = await FileFetcher(client).fetch('a.jpg');
      expect(bytes, [1, 2, 3]);
      expect(http.requests.single.headers['Authorization'], 'Bearer tok');
    });

    test('S3 302 → presigned URL-г Authorization-ГҮЙ татна', () async {
      http
        ..redirect('$base/files/b.pdf', 'https://s3.test/bucket/b.pdf')
        ..bytes('GET', 'https://s3.test/bucket/b.pdf', [9, 9]);
      final bytes = await FileFetcher(client).fetch('b.pdf');
      expect(bytes, [9, 9]);
      expect(http.requests.first.headers['Authorization'], 'Bearer tok');
      expect(http.requests.last.uri.host, 's3.test');
      expect(http.requests.last.headers.containsKey('Authorization'), isFalse);
    });

    test('403 → forbidden (хэвийн «эрхгүй»)', () async {
      http.json('GET', '$base/files/c.jpg', {'message': 'Энэ файлыг үзэх эрхгүй.'}, status: 403);
      await expectLater(
        FileFetcher(client).fetch('c.jpg'),
        throwsA(isA<ApiError>().having((e) => e.kind, 'kind', ApiErrorKind.forbidden)),
      );
    });

    test('404 → notFound (хадгалах хугацаа дууссан)', () async {
      http.json('GET', '$base/files/d.pdf', {'message': 'Файл олдсонгүй'}, status: 404);
      await expectLater(
        FileFetcher(client).fetch('d.pdf'),
        throwsA(isA<ApiError>().having((e) => e.kind, 'kind', ApiErrorKind.notFound)),
      );
    });

    test('presigned-ийн хугацаа дууссан S3 403 нь «эрхгүй» биш', () async {
      http
        ..redirect('$base/files/e.jpg', 'https://s3.test/e.jpg')
        ..bytes('GET', 'https://s3.test/e.jpg', [], status: 403);
      await expectLater(
        FileFetcher(client).fetch('e.jpg'),
        throwsA(isA<ApiError>().having((e) => e.kind, 'kind', ApiErrorKind.server)),
      );
    });

    test('буруу түлхүүрийг серверт илгээхгүй', () async {
      await expectLater(FileFetcher(client).fetch('../etc/passwd'), throwsA(isA<ApiError>()));
      expect(http.requests, isEmpty);
    });

    test('баримт эсэх', () {
      expect(isDocumentKey('x.PDF'), isTrue);
      expect(isDocumentKey('x.jpg'), isFalse);
    });
  });

  group('FileBytesCache', () {
    test('санах ойн LRU байтаар хязгаартай', () async {
      final cache = FileBytesCache(memoryBudget: 30);
      await cache.write('a', Uint8List(10));
      await cache.write('b', Uint8List(10));
      cache.peek('a'); // a-г сүүлд ашигласан болгоно
      await cache.write('c', Uint8List(10));
      await cache.write('d', Uint8List(10));
      expect(cache.peek('b'), isNull);
      expect(cache.peek('a'), isNotNull);
      expect(cache.memoryBytes, lessThanOrEqualTo(30));
    });

    test('диск: бичээд уншина, clear бүгдийг устгана', () async {
      final dir = Directory.systemTemp.createTempSync('pm_cache_test');
      addTearDown(() {
        if (dir.existsSync()) dir.deleteSync(recursive: true);
      });
      final a = FileBytesCache(directory: () async => dir);
      await a.write('k.jpg', Uint8List.fromList([5, 6]));
      // Шинэ кэш (апп дахин асав) — дискээс уншина.
      final b = FileBytesCache(directory: () async => dir);
      expect(await b.read('k.jpg'), [5, 6]);
      await b.clear();
      final c = FileBytesCache(directory: () async => dir);
      expect(await c.read('k.jpg'), isNull);
    });

    test('дискийн нэрэнд түлхүүр шууд орохгүй', () {
      expect(FileBytesCache.fileName('../x'), isNot(contains('/')));
    });
  });

  group('FileRepository', () {
    test('ижил түлхүүрийг зэрэг хүсвэл нэг л татна, дараа нь кэшээс', () async {
      http.bytes('GET', '$base/files/z.jpg', [7]);
      final repo = FileRepository(fetcher: FileFetcher(client), cache: FileBytesCache());
      final r = await Future.wait([repo.bytes('z.jpg'), repo.bytes('z.jpg')]);
      expect(r, [
        [7],
        [7],
      ]);
      expect(await repo.bytes('z.jpg'), [7]);
      expect(http.requests.length, 1);
    });
  });

  group('FileUploader', () {
    final data = Uint8List.fromList(List.filled(100, 1));

    test('S3 шууд: presign → PUT (Authorization-гүй) → complete', () async {
      http
        ..json('POST', '$base/uploads/presign', {
          'direct': true,
          'key': 'k1.pdf',
          'url': 'https://s3.test/put/k1.pdf',
          'ticket': 'T1',
          'headers': {'Content-Type': 'application/pdf'},
        })
        ..bytes('PUT', 'https://s3.test/put/k1.pdf', [])
        ..json('POST', '$base/uploads/complete', {'key': 'k1.pdf', 'size': 100, 'mime': 'application/pdf'});
      final progress = <double>[];
      final f = await FileUploader(client).upload(
        bytes: data,
        name: 'daalgavar.pdf',
        mime: 'application/pdf',
        purpose: UploadPurpose.homework,
        pages: 3,
        onProgress: progress.add,
      );
      expect(f.key, 'k1.pdf');
      final put = http.requests.firstWhere((r) => r.method == 'PUT');
      expect(put.headers.containsKey('Authorization'), isFalse);
      expect(put.headers['content-type'] ?? put.contentType, 'application/pdf');
      expect(http.bodies[http.requests.indexOf(put)].length, 100);
      final presign = http.requests.first;
      expect(presign.data, containsPair('purpose', 'homework'));
      expect(presign.data, containsPair('size', 100));
      expect(http.requests.last.data, {'ticket': 'T1', 'pages': 3});
      expect(progress.last, 1);
    });

    test('presign байхгүй (404) → multipart, purpose файлаас өмнө', () async {
      http
        ..json('POST', '$base/uploads/presign', {'message': 'Not Found'}, status: 404)
        ..json('POST', '$base/uploads', {'key': 'k2.pdf', 'size': 100, 'mime': 'application/pdf'});
      final f = await FileUploader(client).upload(
        bytes: data,
        name: 'a.pdf',
        mime: 'application/pdf',
        purpose: UploadPurpose.theory,
      );
      expect(f.key, 'k2.pdf');
      final multipart = http.requests.last;
      expect(multipart.headers['Authorization'], 'Bearer tok');
      final form = multipart.data as FormData;
      expect(form.fields.first, isA<MapEntry<String, String>>().having((e) => e.value, 'purpose', 'theory'));
      expect(form.files.single.key, 'file');
    });

    test('direct:false → multipart', () async {
      http
        ..json('POST', '$base/uploads/presign', {'direct': false})
        ..json('POST', '$base/uploads', {'key': 'k3.jpg', 'size': 100, 'mime': 'image/jpeg'});
      final f = await FileUploader(client).upload(bytes: data, name: 'a.jpg', mime: 'image/jpeg', purpose: UploadPurpose.general);
      expect(f.key, 'k3.jpg');
    });

    test('серверийн шалгалтын алдаа (400) шууд, multipart руу шилжихгүй', () async {
      http.json('POST', '$base/uploads/presign', {'message': 'Файл 12 МБ-аас их байна'}, status: 400);
      await expectLater(
        FileUploader(client).upload(bytes: data, name: 'a.pdf', mime: 'application/pdf', purpose: UploadPurpose.homework),
        throwsA(isA<ApiError>().having((e) => e.message, 'message', 'Файл 12 МБ-аас их байна')),
      );
      expect(http.to('POST', '$base/uploads'), isEmpty);
    });

    test('апп талын хэмжээний хязгаар (12 МБ)', () async {
      await expectLater(
        FileUploader(client).upload(
          bytes: Uint8List(12 * 1024 * 1024 + 1),
          name: 'a.pdf',
          mime: 'application/pdf',
          purpose: UploadPurpose.homework,
        ),
        throwsA(isA<ApiError>()),
      );
      expect(http.requests, isEmpty);
    });

    test('цуцалбал UploadCancelled', () async {
      http.json('POST', '$base/uploads/presign', {
        'direct': true,
        'url': 'https://s3.test/put/x',
        'ticket': 'T',
        'headers': {'Content-Type': 'application/pdf'},
      });
      final cancel = CancelToken()..cancel();
      await expectLater(
        FileUploader(client).upload(
          bytes: data,
          name: 'a.pdf',
          mime: 'application/pdf',
          purpose: UploadPurpose.homework,
          cancel: cancel,
        ),
        throwsA(isA<UploadCancelled>()),
      );
    });
  });
}
