import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../network/api_error.dart';

/// Зургууд → НЭГ баримт (вэбийн `lib/photosToPdf.ts`-тэй ижил үр дүн, эзэн 2026-10-18 D13):
/// 1) зураг бүрийг JPEG болгон шахна (урт тал 1600px хүртэл, чанар 0.72), эргүүлэлтийг хэрэгжүүлнэ;
///    хуудас [pageBudget]-ээс том бол чанарыг 0.6 → 0.5 → 0.42, тэгсэн ч том бол урт талыг 80% болгоно
/// 2) зураг бүрийг өөрийн харьцаатай нэг хуудас болгоно (урт тал 842pt — A4)
/// 3) нийт [maxBytes]-аас хэтэрвэл алдаа.
/// Хүүхдэд «PDF» гэдэг үг харуулахгүй — «зураг», «хуудас».
abstract final class PhotoDocumentLimits {
  /// Гэрийн даалгаврын дэвтэр (API `homework-practice.service.ts` `MAX_PAGES`, эзэн 2026-11-12).
  static const homeworkMaxPages = 15;

  /// Онолын зураг (API `lesson-day.service.ts` `THEORY_MAX_PAGES`, эзэн 2026-11-12).
  static const theoryMaxPages = 20;

  /// Нөхөх тэмдэглэлийн зураг (API `lesson-day.service.ts` `MAX_PAGES`).
  static const makeupMaxPages = 10;
  static const longSide = 1600;
  static const quality = 72;
  static const fallbackQualities = [60, 50, 42];
  static const pageBudget = 350 * 1024;
  static const maxBytes = 12 * 1024 * 1024;
  static const pagePoints = 842.0;
}

/// Сонгосон нэг зураг (камер эсвэл галерей), хэрэглэгчийн эргүүлэлттэй.
class PhotoPage {
  const PhotoPage(this.bytes, {this.rotation = 0, this.name = 'zurag.jpg'});

  final Uint8List bytes;

  /// 0, 90, 180, 270 (цагийн зүүний дагуу).
  final int rotation;
  final String name;

  PhotoPage rotated() => PhotoPage(bytes, rotation: (rotation + 90) % 360, name: name);
}

/// Угсарсан баримт.
class PhotoDocument {
  const PhotoDocument(this.bytes, this.pages);

  final Uint8List bytes;
  final int pages;

  static const mime = 'application/pdf';
}

/// Хуудасны хэмжээ (pt): зургийн харьцаатай, урт тал 842pt.
(double, double) pageSizeFor(int width, int height) {
  final long = width > height ? width : height;
  if (long <= 0) return (PhotoDocumentLimits.pagePoints, PhotoDocumentLimits.pagePoints);
  final k = PhotoDocumentLimits.pagePoints / long;
  return (width * k, height * k);
}

/// Урт талыг [longSide] хүртэл багасгасан хэмжээ (томруулахгүй).
(int, int) fitLongSide(int width, int height, int longSide) {
  final long = width > height ? width : height;
  if (long <= longSide || long <= 0) return (width, height);
  final k = longSide / long;
  return ((width * k).round().clamp(1, longSide), (height * k).round().clamp(1, longSide));
}

/// JPEG-ийн толгойноос өргөн, өндрийг уншина (бүтэн decode хийхгүй). JPEG биш бол null.
(int, int)? jpegDimensions(Uint8List b) {
  if (b.length < 4 || b[0] != 0xFF || b[1] != 0xD8) return null;
  var i = 2;
  while (i + 9 < b.length) {
    if (b[i] != 0xFF) {
      i++;
      continue;
    }
    final marker = b[i + 1];
    if (marker == 0xFF) {
      i++;
      continue;
    }
    if (marker == 0xD8 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      i += 2;
      continue;
    }
    final len = (b[i + 2] << 8) | b[i + 3];
    final isSof = marker >= 0xC0 && marker <= 0xCF && marker != 0xC4 && marker != 0xC8 && marker != 0xCC;
    if (isSof) {
      final h = (b[i + 5] << 8) | b[i + 6];
      final w = (b[i + 7] << 8) | b[i + 8];
      return (w, h);
    }
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

/// Зургийг JPEG болгон шахах (эргүүлэлт, хэмжээ, чанар). Тестэд хуурамчаар солино.
abstract class JpegCompressor {
  /// Эх зургийн хэмжээ (эргүүлэхээс өмнө). Уншиж чадахгүй бол null.
  Future<(int, int)?> dimensions(Uint8List bytes);

  /// [width] өргөн, [height] өндөр хэмжээтэй (эргүүлэхээс өмнөх тэнхлэгээр), [quality] чанартай,
  /// [rotation] градус эргүүлсэн JPEG.
  Future<Uint8List> compress(
    Uint8List bytes, {
    required int width,
    required int height,
    required int quality,
    required int rotation,
  });
}

/// Натив шахагч (flutter_image_compress) — EXIF чиглэлийг хэрэгжүүлж, мета өгөгдлийг хасна
/// (байршил г.м. хүүхдийн хувийн мэдээлэл серверт очихгүй).
class NativeJpegCompressor implements JpegCompressor {
  const NativeJpegCompressor();

  @override
  Future<(int, int)?> dimensions(Uint8List bytes) async {
    final jpeg = jpegDimensions(bytes);
    if (jpeg != null) return jpeg;
    try {
      final buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
      final descriptor = await ui.ImageDescriptor.encoded(buffer);
      final size = (descriptor.width, descriptor.height);
      descriptor.dispose();
      buffer.dispose();
      return size;
    } catch (_) {
      return null;
    }
  }

  @override
  Future<Uint8List> compress(
    Uint8List bytes, {
    required int width,
    required int height,
    required int quality,
    required int rotation,
  }) {
    return FlutterImageCompress.compressWithList(
      bytes,
      minWidth: width,
      minHeight: height,
      quality: quality,
      rotate: rotation,
      keepExif: false,
      autoCorrectionAngle: true,
      format: CompressFormat.jpeg,
    );
  }
}

final jpegCompressorProvider = Provider<JpegCompressor>((ref) => const NativeJpegCompressor());

final photoDocumentBuilderProvider = Provider<PhotoDocumentBuilder>(
  (ref) => PhotoDocumentBuilder(ref.watch(jpegCompressorProvider)),
);

class PhotoDocumentBuilder {
  const PhotoDocumentBuilder(this._compressor);

  final JpegCompressor _compressor;

  /// Нэг хуудсыг төсөвт багтаан шахна. Буцаах: (байт, өргөн, өндөр) — эргүүлсний дараах.
  Future<(Uint8List, int, int)> compressPage(PhotoPage page) async {
    final dims = await _compressor.dimensions(page.bytes);
    if (dims == null) {
      throw const ApiError(ApiErrorKind.badRequest, 'Зургийг уншиж чадсангүй. Өөр зураг сонгоно уу.');
    }
    final qualities = [PhotoDocumentLimits.quality, ...PhotoDocumentLimits.fallbackQualities];
    Uint8List? best;
    var bestW = 0, bestH = 0;
    for (final side in [PhotoDocumentLimits.longSide, (PhotoDocumentLimits.longSide * 0.8).round()]) {
      final (w, h) = fitLongSide(dims.$1, dims.$2, side);
      for (final q in qualities) {
        final out = await _compressor.compress(page.bytes, width: w, height: h, quality: q, rotation: page.rotation);
        if (best == null || out.length < best.length) {
          best = out;
          final sideways = page.rotation % 180 != 0;
          final real = jpegDimensions(out);
          (bestW, bestH) = real ?? (sideways ? (h, w) : (w, h));
        }
        if (out.length <= PhotoDocumentLimits.pageBudget) break;
      }
      if (best != null && best.length <= PhotoDocumentLimits.pageBudget) break;
    }
    return (best!, bestW, bestH);
  }

  /// Зургуудыг дарааллаар нь нэг баримт болгоно.
  Future<PhotoDocument> build(
    List<PhotoPage> pages, {
    required int maxPages,
    void Function(int done, int total)? onProgress,
  }) async {
    if (pages.isEmpty) throw const ApiError(ApiErrorKind.badRequest, 'Зураг сонгоогүй байна.');
    if (pages.length > maxPages) throw ApiError(ApiErrorKind.badRequest, '$maxPages хүртэл зураг сонгоно уу.');
    final doc = pw.Document(compress: true);
    var done = 0;
    for (final page in pages) {
      final (jpeg, w, h) = await compressPage(page);
      final (pwPt, phPt) = pageSizeFor(w, h);
      final image = pw.MemoryImage(jpeg);
      doc.addPage(
        pw.Page(
          pageFormat: PdfPageFormat(pwPt, phPt),
          margin: pw.EdgeInsets.zero,
          build: (_) => pw.Image(image, fit: pw.BoxFit.fill, width: pwPt, height: phPt),
        ),
      );
      onProgress?.call(++done, pages.length);
      // Сул утсан дээр дэлгэц хөлдөхгүй — явцыг зурах боломж өгнө.
      await Future<void>.delayed(Duration.zero);
    }
    final bytes = await doc.save();
    if (bytes.length > PhotoDocumentLimits.maxBytes) {
      throw const ApiError(ApiErrorKind.badRequest, 'Зураг хэт том болчихлоо. Зургийн тоог цөөлөөд дахин оролдоно уу.');
    }
    return PhotoDocument(bytes, pages.length);
  }
}
