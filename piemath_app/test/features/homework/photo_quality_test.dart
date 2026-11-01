import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/files/files.dart';
import 'package:piemath_app/features/homework/data/photo_processor.dart';
import 'package:piemath_app/features/homework/domain/photo_quality.dart';

Uint8List _checker(int n, {required bool sharp}) {
  final g = Uint8List(n * n);
  for (var y = 0; y < n; y++) {
    for (var x = 0; x < n; x++) {
      g[y * n + x] = sharp ? (((x ~/ 2) + (y ~/ 2)).isEven ? 0 : 255) : 128 + ((x + y) % 3);
    }
  }
  return g;
}

/// Тест дотор бодит PNG үүсгэнэ (dart:ui) — өнгө бүхий хоёр хэсэг.
Future<Uint8List> _png(int w, int h, {bool checker = false}) async {
  final rec = ui.PictureRecorder();
  final canvas = ui.Canvas(rec);
  if (checker) {
    for (var y = 0; y < h; y += 2) {
      for (var x = 0; x < w; x += 2) {
        canvas.drawRect(
          ui.Rect.fromLTWH(x.toDouble(), y.toDouble(), 2, 2),
          ui.Paint()..color = ((x ~/ 2) + (y ~/ 2)).isEven ? const ui.Color(0xFF000000) : const ui.Color(0xFFFFFFFF),
        );
      }
    }
  } else {
    canvas.drawRect(ui.Rect.fromLTWH(0, 0, w / 2, h.toDouble()), ui.Paint()..color = const ui.Color(0xFFFF0000));
    canvas.drawRect(ui.Rect.fromLTWH(w / 2, 0, w / 2, h.toDouble()), ui.Paint()..color = const ui.Color(0xFF0000FF));
  }
  final image = await rec.endRecording().toImage(w, h);
  final data = await image.toByteData(format: ui.ImageByteFormat.png);
  return data!.buffer.asUint8List();
}

/// (r, g, b) — [x],[y] пиксел.
Future<(int, int, int)> _pixel(Uint8List png, int x, int y) async {
  final codec = await ui.instantiateImageCodec(png);
  final image = (await codec.getNextFrame()).image;
  final data = (await image.toByteData())!;
  final i = (y * image.width + x) * 4;
  return (data.getUint8(i), data.getUint8(i + 1), data.getUint8(i + 2));
}

void main() {
  group('CropRect', () {
    test('булан зөөхөд эсрэг булан хөдлөхгүй, хил давахгүй', () {
      final r = CropRect.full.drag(CropHandle.topLeft, 0.2, 0.3);
      expect((r.left, r.top, r.right, r.bottom), (0.2, 0.3, 1.0, 1.0));
      final out = CropRect.full.drag(CropHandle.bottomRight, 0.5, 0.5);
      expect(out, CropRect.full);
      final neg = CropRect.full.drag(CropHandle.topLeft, -0.5, -0.5);
      expect(neg, CropRect.full);
    });

    test('хэт жижиг болгохгүй (хамгийн бага тал)', () {
      final r = CropRect.full.drag(CropHandle.left, 5, 0).drag(CropHandle.top, 0, 5);
      expect(r.width, closeTo(CropRect.minSide, 1e-9));
      expect(r.height, closeTo(CropRect.minSide, 1e-9));
    });

    test('бүхэлд нь зөөхөд хэмжээ хэвээр, хүрээнээс гарахгүй', () {
      const r = CropRect(0.1, 0.1, 0.6, 0.7);
      final m = r.drag(CropHandle.move, 2, 2);
      expect(m.width, closeTo(0.5, 1e-9));
      expect(m.height, closeTo(0.6, 1e-9));
      expect(m.right, 1.0);
      expect(m.bottom, 1.0);
      expect(r.drag(CropHandle.move, -2, -2).left, 0.0);
    });

    test('isFull', () {
      expect(CropRect.full.isFull, isTrue);
      expect(CropRect.full.drag(CropHandle.right, -0.1, 0).isFull, isFalse);
    });
  });

  group('тод байдал', () {
    test('Лапласын дисперс: тод зураг ≫ бүдэг', () {
      final sharp = laplacianVariance(_checker(64, sharp: true), 64, 64);
      final flat = laplacianVariance(_checker(64, sharp: false), 64, 64);
      expect(sharp, greaterThan(blurVarianceThreshold * 10));
      expect(flat, lessThan(blurVarianceThreshold));
      expect(isBlurry(flat), isTrue);
      expect(isBlurry(sharp), isFalse);
      expect(isBlurry(null), isFalse, reason: 'шалгаж чадаагүйг бүдэг гэж үздэггүй');
    });

    test('хэт жижиг эсвэл дутуу өгөгдөл → 0', () {
      expect(laplacianVariance(Uint8List(4), 2, 2), 0);
      expect(laplacianVariance(Uint8List(3), 10, 10), 0);
    });

    test('rgbaToGray', () {
      final g = rgbaToGray(Uint8List.fromList([255, 255, 255, 255, 0, 0, 0, 255]), 2, 1);
      expect(g[0], 255);
      expect(g[1], 0);
    });
  });

  group('UiPhotoProcessor (dart:ui)', () {
    const processor = UiPhotoProcessor();

    testWidgets('sharpness: хээтэй зураг тод, нэг өнгөтэй зураг бүдэг', (tester) async {
      await tester.runAsync(() async {
        final sharp = await processor.sharpness(await _png(160, 160, checker: true));
        final flat = await processor.sharpness(await _png(160, 160));
        expect(sharp, isNotNull);
        expect(isBlurry(sharp), isFalse);
        expect(isBlurry(flat), isTrue);
      });
    });

    testWidgets('sharpness: эвдэрсэн байт → null (унахгүй)', (tester) async {
      await tester.runAsync(() async {
        expect(await processor.sharpness(Uint8List.fromList([1, 2, 3])), isNull);
      });
    });

    testWidgets('crop: зүүн хагас = улаан, баруун хагас = цэнхэр; хэмжээ зөв', (tester) async {
      await tester.runAsync(() async {
        final page = PhotoPage(await _png(100, 60), name: 'a.jpg');
        final left = await processor.crop(page, const CropRect(0, 0, 0.5, 1));
        final size = await processor.sizeOf(left.bytes);
        expect(size, (50, 60));
        expect(left.rotation, 0);
        final right = await processor.crop(page, const CropRect(0.5, 0.25, 1, 0.75));
        expect(await processor.sizeOf(right.bytes), (50, 30));
      });
    });

    testWidgets('crop: цагийн зүүний 90 градус — улаан (зүүн) дээд тал руу очно', (tester) async {
      await tester.runAsync(() async {
        final page = PhotoPage(await _png(100, 60), rotation: 90, name: 'r.jpg');
        final out = await processor.crop(page, CropRect.full);
        final top = await _pixel(out.bytes, 30, 5);
        final bottom = await _pixel(out.bytes, 30, 95);
        expect(top.$1, greaterThan(200), reason: 'дээд тал улаан');
        expect(bottom.$3, greaterThan(200), reason: 'доод тал цэнхэр');
      });
    });

    testWidgets('crop: 180 ба 270 градус', (tester) async {
      await tester.runAsync(() async {
        final base = await _png(100, 60);
        final r180 = await processor.crop(PhotoPage(base, rotation: 180), CropRect.full);
        expect((await _pixel(r180.bytes, 5, 30)).$3, greaterThan(200), reason: '180: цэнхэр зүүн талд');
        final r270 = await processor.crop(PhotoPage(base, rotation: 270), CropRect.full);
        expect((await _pixel(r270.bytes, 30, 5)).$3, greaterThan(200), reason: '270: цэнхэр дээд талд');
      });
    });

    testWidgets('crop: 90 градус эргүүлсэн зураг — харагдах чиглэлээр тайрна', (tester) async {
      await tester.runAsync(() async {
        final page = PhotoPage(await _png(100, 60), rotation: 90, name: 'r.jpg');
        // Харагдах хэмжээ 60x100; дээд талын хагас.
        final top = await processor.crop(page, const CropRect(0, 0, 1, 0.5));
        expect(await processor.sizeOf(top.bytes), (60, 50));
      });
    });
  });
}
