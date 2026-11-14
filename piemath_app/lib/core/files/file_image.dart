import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../auth/session.dart';
import '../network/api_error.dart';
import '../network/network_providers.dart';
import '../perf/perf_tier.dart';
import 'file_cache.dart';
import 'file_fetcher.dart';

/// `/files/:key`-ийн байтыг кэштэйгээр авах (зураг, баримт хоёуланд).
class FileRepository {
  FileRepository({required this.fetcher, required this.cache});

  final FileFetcher fetcher;
  final FileBytesCache cache;
  final _inflight = <String, Future<Uint8List>>{};

  /// Кэшээс, эсвэл серверээс. Ижил түлхүүрийг зэрэг хүсвэл нэг л татна.
  /// 403 → [ApiError] `forbidden` (хэвийн «эрхгүй» хариу), 404 → `notFound` (хадгалах хугацаа дууссан).
  Future<Uint8List> bytes(String key) {
    final mem = cache.peek(key);
    if (mem != null) return SynchronousFuture(mem);
    return _inflight[key] ??= () async {
      try {
        final cached = await cache.read(key);
        if (cached != null) return cached;
        final fresh = await fetcher.fetch(key);
        await cache.write(key, fresh);
        return fresh;
      } finally {
        // `remove` нь Future буцаадаг — callback-аас буцаавал алдааг дахин гаргана, тиймээс блок.
        scheduleMicrotask(() {
          _inflight.remove(key);
        });
      }
    }();
  }
}

/// `/files/:key` зургийн [ImageProvider]. Алдааг `ProblemFigure`-ийн өгөгдмөл шалгагч
/// танихаар [NetworkImageLoadException] (403 = эрх хараахан нээгдээгүй) болгож шиднэ.
/// Decode-ийн хэмжээг `ResizeImage(AuthFileImage(...), width: px)`-ээр хязгаарла (cacheWidth).
@immutable
class AuthFileImage extends ImageProvider<AuthFileImage> {
  const AuthFileImage(this.fileKey, this._repository, this._fileUri);

  final String fileKey;
  final FileRepository _repository;
  final Uri _fileUri;

  @override
  Future<AuthFileImage> obtainKey(ImageConfiguration configuration) => SynchronousFuture(this);

  @override
  ImageStreamCompleter loadImage(AuthFileImage key, ImageDecoderCallback decode) {
    return MultiFrameImageStreamCompleter(
      codec: _load(decode),
      scale: 1,
      debugLabel: 'files/$fileKey',
      informationCollector: () => [DiagnosticsProperty<String>('Файлын түлхүүр', fileKey)],
    );
  }

  Future<ui.Codec> _load(ImageDecoderCallback decode) async {
    try {
      final bytes = await _repository.bytes(fileKey);
      return await decode(await ui.ImmutableBuffer.fromUint8List(bytes));
    } on ApiError catch (e) {
      // Кэшэд алдаатай зураг үлдвэл «Дахин оролдох» ажиллахгүй — устгана.
      scheduleMicrotask(() => PaintingBinding.instance.imageCache.evict(this));
      throw NetworkImageLoadException(statusCode: e.status ?? 0, uri: _fileUri);
    } catch (_) {
      scheduleMicrotask(() => PaintingBinding.instance.imageCache.evict(this));
      rethrow;
    }
  }

  @override
  bool operator ==(Object other) =>
      other is AuthFileImage && other.fileKey == fileKey && identical(other._repository, _repository);

  @override
  int get hashCode => Object.hash(fileKey, identityHashCode(_repository));

  @override
  String toString() => 'AuthFileImage($fileKey)';
}

/// `/files/:key` зургийг (бодлого, хариулт, онол, даалгавар) ачаалах ImageProvider үүсгэгч.
///
/// ГЭРЭЭ (бүх feature үүнийг л ашиглана, гарын үсэг өөрчлөгдөхгүй):
/// `ref.watch(fileImageProvider).image(key)` → [ImageProvider]. 403 нь «эрхгүй» гэсэн хэвийн
/// хариу — `ProblemFigure` тайлбар харуулна (`docs/api-contract/files-uploads.md`).
///
/// Хэрэгжүүлэлт: Authorization толгойтой татаж, S3 302 redirect-ийг толгойгүй дагана,
/// санах ой + дискийн кэш (сервер no-store өгдөг), гарахад кэш устна.
class FileImageFactory {
  const FileImageFactory(this._repository, this._uriFor);

  final FileRepository _repository;
  final Uri Function(String key) _uriFor;

  ImageProvider image(String key) => AuthFileImage(key, _repository, _uriFor(key));
}

/// Дискийн кэшийн хавтас. Тестэд `() async => null` (зөвхөн санах ой) эсвэл түр хавтас.
final fileCacheDirectoryProvider = Provider<Future<Directory?> Function()>(
  (ref) => () async {
    try {
      return await getApplicationCacheDirectory();
    } catch (_) {
      return null;
    }
  },
);

final fileBytesCacheProvider = Provider<FileBytesCache>((ref) {
  // 2 GB утсанд санах ойг бага барина (decode хийсэн зураг imageCache-д тусдаа зай эзэлдэг).
  final low = ref.watch(perfTierProvider).isLow;
  final cache = FileBytesCache(
    directory: ref.watch(fileCacheDirectoryProvider),
    memoryBudget: (low ? 10 : 24) * 1024 * 1024,
    diskBudget: (low ? 80 : 120) * 1024 * 1024,
  );
  // Гарахад кэшийг бүрэн устгана (SECURITY §3).
  ref.listen<SessionState>(sessionProvider, (_, next) {
    if (next is SignedOut) unawaited(cache.clear());
  });
  return cache;
});

final fileRepositoryProvider = Provider<FileRepository>(
  (ref) => FileRepository(
    fetcher: FileFetcher(ref.watch(apiClientProvider)),
    cache: ref.watch(fileBytesCacheProvider),
  ),
);

final fileImageProvider = Provider<FileImageFactory>((ref) {
  final client = ref.watch(apiClientProvider);
  return FileImageFactory(ref.watch(fileRepositoryProvider), client.fileUri);
});
