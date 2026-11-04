import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import 'photo_document.dart';

/// Зураг авах эх үүсвэр — камер эсвэл галерей. Тестэд хуурамчаар солино.
///
/// Зөвшөөрлийг (камер, зургийн сан) ЗӨВХӨН хэрэглэгч товч дарах үед систем асууна
/// (iOS `Info.plist`-ийн монгол тайлбартай). Android 13+ системийн зураг сонгогч зөвшөөрөл шаарддаггүй.
abstract class PhotoSource {
  /// Камераар нэг зураг. Хэрэглэгч болих эсвэл зөвшөөрөөгүй бол null.
  Future<PhotoPage?> takePhoto();

  /// Галерейгаас [limit] хүртэл зураг.
  Future<List<PhotoPage>> pickFromGallery({required int limit});
}

/// image_picker — натив талд урт талыг 1600px болгож шахна (сул утсанд санах ой хэмнэнэ).
/// Picker-ийн түр хуулбарыг байтыг уншмагц устгана (SECURITY §3).
class DevicePhotoSource implements PhotoSource {
  DevicePhotoSource([ImagePicker? picker]) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  static const _side = 1600.0;
  static const _quality = 88;

  @override
  Future<PhotoPage?> takePhoto() async {
    final x = await _picker.pickImage(
      source: ImageSource.camera,
      maxWidth: _side,
      maxHeight: _side,
      imageQuality: _quality,
      requestFullMetadata: false,
    );
    return x == null ? null : _read(x);
  }

  @override
  Future<List<PhotoPage>> pickFromGallery({required int limit}) async {
    if (limit <= 0) return const [];
    final List<XFile> files = limit == 1
        ? [?await _picker.pickImage(source: ImageSource.gallery, maxWidth: _side, maxHeight: _side, imageQuality: _quality, requestFullMetadata: false)]
        : await _picker.pickMultiImage(maxWidth: _side, maxHeight: _side, imageQuality: _quality, limit: limit, requestFullMetadata: false);
    final out = <PhotoPage>[];
    for (final x in files.take(limit)) {
      out.add(await _read(x));
    }
    return out;
  }

  Future<PhotoPage> _read(XFile x) async {
    final Uint8List bytes = await x.readAsBytes();
    try {
      final f = File(x.path);
      if (f.existsSync()) await f.delete();
    } catch (_) {
      // Устгаж чадаагүй ч OS түр хавтсыг өөрөө цэвэрлэнэ.
    }
    return PhotoPage(bytes, name: x.name);
  }
}

final photoSourceProvider = Provider<PhotoSource>((ref) => DevicePhotoSource());
