import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:piemath_app/core/files/files.dart';
import 'package:piemath_app/features/homework/data/photo_processor.dart';
import 'package:piemath_app/features/homework/domain/photo_quality.dart';

/// 1x1 PNG — `Image.memory` задалж чадах жижиг зураг.
final Uint8List tinyPng = base64Decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
);

PhotoPage fakePage(String name) => PhotoPage(tinyPng, name: name);

/// Камер/галерейг дарааллаар хуурамчаар өгнө.
class FakePhotoSource implements PhotoSource {
  FakePhotoSource({List<String> camera = const [], List<List<String>> gallery = const []})
      : _camera = [...camera],
        _gallery = [...gallery];

  final List<String> _camera;
  final List<List<String>> _gallery;
  int cameraCalls = 0;
  int galleryCalls = 0;

  @override
  Future<PhotoPage?> takePhoto() async {
    cameraCalls++;
    return _camera.isEmpty ? null : fakePage(_camera.removeAt(0));
  }

  @override
  Future<List<PhotoPage>> pickFromGallery({required int limit}) async {
    galleryCalls++;
    final next = _gallery.isEmpty ? <String>[] : _gallery.removeAt(0);
    return [for (final n in next.take(limit)) fakePage(n)];
  }
}

/// Тод байдлыг дарааллаар өгнө (дууссан бол 200 = тод; 5 = бүдэг). Тайралтыг тэмдэглэнэ.
class FakePhotoProcessor implements PhotoProcessor {
  final sharpQueue = <double>[];
  final crops = <(String, CropRect)>[];
  (int, int)? size = (1000, 1400);
  bool failCrop = false;

  @override
  Future<(int, int)?> sizeOf(Uint8List bytes) async => size;

  @override
  Future<double?> sharpness(Uint8List bytes) async => sharpQueue.isEmpty ? 200 : sharpQueue.removeAt(0);

  @override
  Future<PhotoPage> crop(PhotoPage page, CropRect rect) async {
    if (failCrop) throw StateError('crop');
    crops.add((page.name, rect));
    return PhotoPage(tinyPng, name: '${page.name}-crop');
  }
}

/// Байршуулалтыг хуурамчаар — үүссэн зургийн дарааллыг тэмдэглэнэ.
class FakePhotoSetUploader extends PhotoSetUploader {
  FakePhotoSetUploader() : super(_NoBuilder(), _NoUploader());

  final uploads = <List<String>>[];
  Object? failWith;

  @override
  Future<(UploadedFile, int)> upload(
    List<PhotoPage> pages, {
    required UploadPurpose purpose,
    required int maxPages,
    required String fileName,
    PhotoUploadProgress? onProgress,
    CancelToken? cancel,
  }) async {
    if (failWith != null) throw failWith!;
    uploads.add([for (final p in pages) p.name]);
    onProgress?.call(PhotoUploadPhase.uploading, 1);
    return (UploadedFile(key: 'k-${purpose.apiValue}-${uploads.length}.pdf', size: 10, mime: 'application/pdf'), pages.length);
  }
}

class _NoBuilder implements PhotoDocumentBuilder {
  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

class _NoUploader implements FileUploader {
  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}
