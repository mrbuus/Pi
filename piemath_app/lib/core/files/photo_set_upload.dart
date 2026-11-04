import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'file_uploader.dart';
import 'photo_document.dart';

/// Илгээлтийн явцын үе шат (UI-д монгол бичвэр).
enum PhotoUploadPhase {
  preparing('Зургийг бэлдэж байна'),
  uploading('Илгээж байна'),
  saving('Хадгалж байна');

  const PhotoUploadPhase(this.label);
  final String label;
}

typedef PhotoUploadProgress = void Function(PhotoUploadPhase phase, double progress);

/// Сонгосон зургуудыг нэг баримт болгоод байршуулна (гэрийн даалгавар, онол, онлайн даалгавар).
class PhotoSetUploader {
  PhotoSetUploader(this._builder, this._uploader);

  final PhotoDocumentBuilder _builder;
  final FileUploader _uploader;

  /// Буцаах: байршуулсан файл ба хуудасны тоо.
  Future<(UploadedFile, int)> upload(
    List<PhotoPage> pages, {
    required UploadPurpose purpose,
    required int maxPages,
    required String fileName,
    PhotoUploadProgress? onProgress,
    CancelToken? cancel,
  }) async {
    onProgress?.call(PhotoUploadPhase.preparing, 0);
    final doc = await _builder.build(
      pages,
      maxPages: maxPages,
      onProgress: (done, total) => onProgress?.call(PhotoUploadPhase.preparing, done / total),
    );
    final file = await _uploader.upload(
      bytes: doc.bytes,
      name: fileName,
      mime: PhotoDocument.mime,
      purpose: purpose,
      pages: doc.pages,
      cancel: cancel,
      onProgress: (p) => onProgress?.call(PhotoUploadPhase.uploading, p),
    );
    return (file, doc.pages);
  }
}

final photoSetUploaderProvider = Provider<PhotoSetUploader>(
  (ref) => PhotoSetUploader(ref.watch(photoDocumentBuilderProvider), ref.watch(fileUploaderProvider)),
);
