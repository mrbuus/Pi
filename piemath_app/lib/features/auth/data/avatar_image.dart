import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/painting.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Профайл зургийг утсан дээр нь 512px дөрвөлжин JPEG болгоно (вэбийн `lib/avatarImage.ts`, 2026-11-12).
/// Утасны камерын зураг том, зарим нь HEIC — аватар хуудас бүрийн толгойд харагддаг тул нэг хэвийн жижиг
/// JPEG болгосноор аль ч төхөөрөмж дээр адилхан, хурдан ачаалагдана.
const avatarMaxSide = 512;

/// Төвөөс тайрах дөрвөлжин: эх зургаас (left, top, side) хэсгийг [out] x [out] болгоно (томруулахгүй).
({double left, double top, double side, int out}) avatarCrop(int width, int height) {
  final side = width < height ? width : height;
  final out = side < avatarMaxSide ? side : avatarMaxSide;
  return (left: (width - side) / 2, top: (height - side) / 2, side: side.toDouble(), out: out);
}

/// Зургийн толгойгоор (JPEG, PNG, HEIC/HEIF, WebP, GIF, BMP) зураг мөн эсэх — уншиж чадахгүй байтыг
/// шахагч руу илгээхгүй.
bool looksLikeImage(Uint8List b) {
  if (b.length < 12) return false;
  if (b[0] == 0xFF && b[1] == 0xD8) return true; // JPEG
  if (b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) return true; // PNG
  if (b[0] == 0x47 && b[1] == 0x49 && b[2] == 0x46) return true; // GIF
  if (b[0] == 0x42 && b[1] == 0x4D) return true; // BMP
  if (b[0] == 0x52 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x46) return true; // RIFF (WebP)
  return b[4] == 0x66 && b[5] == 0x74 && b[6] == 0x79 && b[7] == 0x70; // ftyp (HEIC/HEIF)
}

/// Аватар бэлдэгч. Тестэд хуурамчаар солино.
abstract class AvatarProcessor {
  /// 512px дөрвөлжин JPEG. Уншиж чадахгүй бол эх байтыг хэвээр буцаана (сервер шалгана).
  Future<Uint8List> prepare(Uint8List bytes);
}

class NativeAvatarProcessor implements AvatarProcessor {
  const NativeAvatarProcessor();

  @override
  Future<Uint8List> prepare(Uint8List bytes) async {
    if (!looksLikeImage(bytes)) return bytes;
    try {
      // 1) HEIC → JPEG, EXIF эргэлтийг хэрэгжүүлж мета өгөгдлийг хасна (байршил серверт очихгүй)
      final upright = await FlutterImageCompress.compressWithList(
        bytes,
        minWidth: 1024,
        minHeight: 1024,
        quality: 92,
        keepExif: false,
        autoCorrectionAngle: true,
        format: CompressFormat.jpeg,
      );
      // 2) Төвөөс дөрвөлжин тайрч 512px; тунгалаг PNG-ийн ард цагаан (зургийн дэвсгэр, UI өнгө биш)
      final codec = await ui.instantiateImageCodec(upright);
      final frame = await codec.getNextFrame();
      final src = frame.image;
      final crop = avatarCrop(src.width, src.height);
      final recorder = ui.PictureRecorder();
      final canvas = ui.Canvas(recorder);
      final dst = Rect.fromLTWH(0, 0, crop.out.toDouble(), crop.out.toDouble());
      canvas
        ..drawRect(dst, ui.Paint()..color = const ui.Color.fromARGB(255, 255, 255, 255))
        ..drawImageRect(
          src,
          Rect.fromLTWH(crop.left, crop.top, crop.side, crop.side),
          dst,
          ui.Paint()..filterQuality = ui.FilterQuality.high,
        );
      final image = await recorder.endRecording().toImage(crop.out, crop.out);
      final png = await image.toByteData(format: ui.ImageByteFormat.png);
      src.dispose();
      image.dispose();
      codec.dispose();
      if (png == null) return upright;
      // 3) PNG → JPEG 0.85 (вэбтэй ижил чанар)
      return await FlutterImageCompress.compressWithList(
        png.buffer.asUint8List(),
        minWidth: crop.out,
        minHeight: crop.out,
        quality: 85,
        format: CompressFormat.jpeg,
      );
    } catch (_) {
      return bytes;
    }
  }
}

final avatarProcessorProvider = Provider<AvatarProcessor>((ref) => const NativeAvatarProcessor());
