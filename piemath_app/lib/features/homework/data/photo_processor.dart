import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/files/files.dart';
import '../domain/photo_quality.dart';

/// Зураг тайрах, тод эсэхийг шалгах. Тестэд хуурамчаар солино (`photoProcessorProvider`).
abstract class PhotoProcessor {
  /// Эх зургийн хэмжээ (эргүүлэхээс өмнө). Уншиж чадахгүй бол null.
  Future<(int, int)?> sizeOf(Uint8List bytes);

  /// Лапласын дисперс (бага = бүдэг). Шалгаж чадахгүй бол null — зургийг буцаахгүй.
  Future<double?> sharpness(Uint8List bytes);

  /// [page]-ийн эргүүлэлтийг хэрэглээд [rect]-ээр тайрсан шинэ зураг (эргүүлэлт 0).
  Future<PhotoPage> crop(PhotoPage page, CropRect rect);
}

/// `dart:ui` дээр суурилсан — нэмэлт сан, натив код үгүй. Тайрсан зураг PNG; дараа нь
/// [PhotoDocumentBuilder] JPEG болгон шахна.
class UiPhotoProcessor implements PhotoProcessor {
  const UiPhotoProcessor();

  static const _probeWidth = 480;

  @override
  Future<(int, int)?> sizeOf(Uint8List bytes) async {
    try {
      final jpeg = jpegDimensions(bytes);
      if (jpeg != null) return jpeg;
      final buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
      final d = await ui.ImageDescriptor.encoded(buffer);
      final size = (d.width, d.height);
      d.dispose();
      buffer.dispose();
      return size;
    } catch (_) {
      return null;
    }
  }

  @override
  Future<double?> sharpness(Uint8List bytes) async {
    ui.Codec? codec;
    ui.Image? image;
    try {
      codec = await ui.instantiateImageCodec(bytes, targetWidth: _probeWidth);
      image = (await codec.getNextFrame()).image;
      final data = await image.toByteData();
      if (data == null) return null;
      final gray = rgbaToGray(data.buffer.asUint8List(), image.width, image.height);
      return laplacianVariance(gray, image.width, image.height);
    } catch (_) {
      return null;
    } finally {
      image?.dispose();
      codec?.dispose();
    }
  }

  @override
  Future<PhotoPage> crop(PhotoPage page, CropRect rect) async {
    final codec = await ui.instantiateImageCodec(page.bytes);
    final image = (await codec.getNextFrame()).image;
    try {
      final turns = (page.rotation ~/ 90) % 4;
      final sideways = turns.isOdd;
      final dispW = (sideways ? image.height : image.width).toDouble();
      final dispH = (sideways ? image.width : image.height).toDouble();
      final x = rect.left * dispW, y = rect.top * dispH;
      final w = math.max(1.0, rect.width * dispW).roundToDouble();
      final h = math.max(1.0, rect.height * dispH).roundToDouble();

      final recorder = ui.PictureRecorder();
      final canvas = ui.Canvas(recorder, ui.Rect.fromLTWH(0, 0, w, h));
      canvas.translate(-x, -y);
      switch (turns) {
        case 1:
          canvas.translate(dispW, 0);
          canvas.rotate(math.pi / 2);
        case 2:
          canvas.translate(dispW, dispH);
          canvas.rotate(math.pi);
        case 3:
          canvas.translate(0, dispH);
          canvas.rotate(-math.pi / 2);
      }
      canvas.drawImage(image, ui.Offset.zero, ui.Paint()..filterQuality = ui.FilterQuality.high);
      final picture = recorder.endRecording();
      final out = await picture.toImage(w.toInt(), h.toInt());
      picture.dispose();
      final png = await out.toByteData(format: ui.ImageByteFormat.png);
      out.dispose();
      if (png == null) return page;
      return PhotoPage(png.buffer.asUint8List(), name: page.name);
    } finally {
      image.dispose();
      codec.dispose();
    }
  }
}

final photoProcessorProvider = Provider<PhotoProcessor>((ref) => const UiPhotoProcessor());
