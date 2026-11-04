import 'dart:typed_data';

import 'package:file_selector/file_selector.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme_mode.dart' show sharedPreferencesProvider;
import '../../../core/files/files.dart';

/// Серверийн тестийн нооргийн заагч — вэбийн `localStorage['pi_test_builder_draft:<userId>']`.
/// Ноорог өөрөө серверт; энд зөвхөн id (хувийн мэдээлэл биш). Хэрэглэгч бүрээр түлхүүрлэнэ.
abstract class DraftPointerStore {
  String? read(String userId);
  Future<void> write(String userId, String draftId);
  Future<void> clear(String userId);
}

class MemoryDraftPointerStore implements DraftPointerStore {
  MemoryDraftPointerStore([Map<String, String> initial = const {}]) : _ids = {...initial};

  final Map<String, String> _ids;

  @override
  String? read(String userId) => _ids[userId];

  @override
  Future<void> write(String userId, String draftId) async => _ids[userId] = draftId;

  @override
  Future<void> clear(String userId) async => _ids.remove(userId);
}

class PrefsDraftPointerStore implements DraftPointerStore {
  PrefsDraftPointerStore(this._read, this._write, this._remove);

  final String? Function(String key) _read;
  final Future<bool> Function(String key, String value) _write;
  final Future<bool> Function(String key) _remove;

  static const keyPrefix = 'test_builder_draft:';

  @override
  String? read(String userId) => _read('$keyPrefix$userId');

  @override
  Future<void> write(String userId, String draftId) => _write('$keyPrefix$userId', draftId);

  @override
  Future<void> clear(String userId) => _remove('$keyPrefix$userId');
}

final draftPointerStoreProvider = Provider<DraftPointerStore>((ref) {
  try {
    final prefs = ref.watch(sharedPreferencesProvider);
    return PrefsDraftPointerStore(prefs.getString, prefs.setString, prefs.remove);
  } on Object {
    // Хадгалалт байхгүй (тест, хуучин bootstrap) — ноорог серверт хэвээр, заагч санах ойд.
    return MemoryDraftPointerStore();
  }
});

/// Сонгосон файл.
class PickedBytes {
  const PickedBytes({required this.name, required this.bytes, required this.mime});

  final String name;
  final Uint8List bytes;
  final String mime;
}

/// PDF сонгогч (`file_selector`). Тестэд хуурамчаар солино.
abstract class PdfPicker {
  const PdfPicker();
  Future<PickedBytes?> pick();
}

class FileSelectorPdfPicker extends PdfPicker {
  const FileSelectorPdfPicker();

  static const _group = XTypeGroup(
    label: 'PDF',
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
    uniformTypeIdentifiers: ['com.adobe.pdf'],
  );

  @override
  Future<PickedBytes?> pick() async {
    final file = await openFile(acceptedTypeGroups: const [_group]);
    if (file == null) return null;
    return PickedBytes(name: file.name, bytes: await file.readAsBytes(), mime: 'application/pdf');
  }
}

final pdfPickerProvider = Provider<PdfPicker>((ref) => const FileSelectorPdfPicker());

/// Бодлого, сонголтын зураг ба эх PDF-ийг байршуулж `key` авна (вэбийн `uploadFile`).
class AuthoringUploads {
  AuthoringUploads(this._photos, this._pdf, this._uploader);

  final PhotoSource _photos;
  final PdfPicker _pdf;
  final FileUploader _uploader;

  /// Галерей эсвэл камераас нэг зураг → `key`. Болих бол `null`.
  Future<String?> image({required bool camera}) async {
    final page = camera ? await _photos.takePhoto() : (await _photos.pickFromGallery(limit: 1)).firstOrNull;
    if (page == null) return null;
    final up = await _uploader.upload(
      bytes: page.bytes,
      name: page.name,
      mime: 'image/jpeg',
      purpose: UploadPurpose.general,
    );
    return up.key;
  }

  /// PDF → `key`. Болих бол `null`.
  Future<String?> pdf() async {
    final file = await _pdf.pick();
    if (file == null) return null;
    final up = await _uploader.upload(
      bytes: file.bytes,
      name: file.name,
      mime: file.mime,
      purpose: UploadPurpose.general,
    );
    return up.key;
  }
}

final authoringUploadsProvider = Provider<AuthoringUploads>(
  (ref) =>
      AuthoringUploads(ref.watch(photoSourceProvider), ref.watch(pdfPickerProvider), ref.watch(fileUploaderProvider)),
);
