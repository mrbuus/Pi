import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/files/files.dart';
import 'package:piemath_app/core/math/math.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/core/network/api_error.dart';

import '../../helpers/pump.dart';
import 'bytes_fake_http.dart';

/// Хуурамч шахагч: хүссэн хэмжээтэй «JPEG» буцаана, чанараар байтын хэмжээг тохируулна.
class FakeCompressor implements JpegCompressor {
  FakeCompressor({this.sizeForQuality});

  final int Function(int quality, int width)? sizeForQuality;
  final calls = <(int, int, int, int)>[];

  @override
  Future<(int, int)?> dimensions(Uint8List bytes) async => jpegDimensions(bytes);

  @override
  Future<Uint8List> compress(Uint8List bytes, {required int width, required int height, required int quality, required int rotation}) async {
    calls.add((width, height, quality, rotation));
    final sideways = rotation % 180 != 0;
    final (w, h) = sideways ? (height, width) : (width, height);
    return fakeJpeg(w, h, padding: sizeForQuality?.call(quality, width) ?? 100);
  }
}

void main() {
  group('хэмжээний тооцоо (photosToPdf.ts-тэй ижил)', () {
    test('хуудас: урт тал 842pt, харьцаа хадгална', () {
      final (w, h) = pageSizeFor(1200, 1600);
      expect(h, closeTo(842, 0.001));
      expect(w, closeTo(631.5, 0.001));
      expect(pageSizeFor(1600, 800), (842.0, 421.0));
    });

    test('урт талыг 1600 хүртэл багасгана, томруулахгүй', () {
      expect(fitLongSide(4000, 3000, 1600), (1600, 1200));
      expect(fitLongSide(3000, 4000, 1280), (960, 1280));
      expect(fitLongSide(800, 600, 1600), (800, 600));
    });

    test('JPEG толгойноос хэмжээ уншина', () {
      expect(jpegDimensions(fakeJpeg(1234, 567)), (1234, 567));
      expect(jpegDimensions(Uint8List.fromList([0x89, 0x50, 0x4E, 0x47])), isNull);
    });
  });

  group('PhotoDocumentBuilder', () {
    test('хуудас бүр нэг хуудас, явц мэдээлнэ', () async {
      final builder = PhotoDocumentBuilder(FakeCompressor());
      final progress = <int>[];
      final doc = await builder.build(
        [PhotoPage(fakeJpeg(1600, 1200)), PhotoPage(fakeJpeg(1200, 1600))],
        maxPages: 6,
        onProgress: (d, _) => progress.add(d),
      );
      expect(doc.pages, 2);
      expect(progress, [1, 2]);
      final text = latin1.decode(doc.bytes);
      expect(text.startsWith('%PDF'), isTrue);
      expect(RegExp(r'/Type\s*/Page\b').allMatches(text).length, 2);
    });

    test('төсвөөс том бол чанарыг 72 → 60 → 50 → 42, дараа нь хэмжээг 80%', () async {
      final fake = FakeCompressor(sizeForQuality: (q, w) => w >= 1600 ? 400 * 1024 : 100);
      final (bytes, w, h) = await PhotoDocumentBuilder(fake).compressPage(PhotoPage(fakeJpeg(1600, 1200)));
      expect(fake.calls.map((c) => c.$3).toList(), [72, 60, 50, 42, 72]);
      expect(fake.calls.last.$1, 1280);
      expect((w, h), (1280, 960));
      expect(bytes.length, lessThan(PhotoDocumentLimits.pageBudget));
    });

    test('эргүүлэлт шахагчид дамжиж, хуудасны тэнхлэг солигдоно', () async {
      final fake = FakeCompressor();
      final (_, w, h) = await PhotoDocumentBuilder(fake).compressPage(PhotoPage(fakeJpeg(1600, 1200)).rotated());
      expect(fake.calls.single.$4, 90);
      expect((w, h), (1200, 1600));
    });

    test('хуудасны хязгаар, хоосон, уншигдахгүй зураг', () async {
      final b = PhotoDocumentBuilder(FakeCompressor());
      await expectLater(b.build(const [], maxPages: 6), throwsA(isA<ApiError>()));
      await expectLater(
        b.build(List.filled(7, PhotoPage(fakeJpeg(10, 10))), maxPages: 6),
        throwsA(isA<ApiError>().having((e) => e.message, 'm', contains('6 хүртэл'))),
      );
      await expectLater(b.build([PhotoPage(Uint8List.fromList([1, 2, 3]))], maxPages: 6), throwsA(isA<ApiError>()));
    });

    test('PhotoPage.rotated 360 эргэнэ', () {
      var p = PhotoPage(fakeJpeg(1, 1));
      for (var i = 0; i < 4; i++) {
        p = p.rotated();
      }
      expect(p.rotation, 0);
    });
  });

  testWidgets('AuthFileImage: 403 → ProblemFigure-ийн тайван «хаалттай» тайлбар', (tester) async {
    final http = BytesFakeHttp()..json('GET', 'https://api.test/api/files/p.png', {'message': 'Энэ файлыг үзэх эрхгүй.'}, status: 403);
    final client = ApiClient(baseUrl: 'https://api.test/api', tokens: TokenHolder()..set('t'), dio: http.dio());
    final repo = FileRepository(fetcher: FileFetcher(client), cache: FileBytesCache());
    final image = FileImageFactory(repo, client.fileUri).image('p.png');
    await pumpThemed(tester, Center(child: ProblemFigure(image: image)));
    for (var i = 0; i < 6; i++) {
      await tester.pump(const Duration(milliseconds: 50));
    }
    expect(find.text('Зураг одоохондоо хаалттай'), findsOneWidget);
  });
}
