import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';
import '../network/api_error.dart';
import '../network/network_providers.dart';

/// Файлын зориулалт — серверт хадгалах хугацаа, хэмжээний хязгаарыг тодорхойлно.
enum UploadPurpose {
  /// Гэрийн даалгавар: 12 МБ, 7 хоног хадгална.
  homework('homework', 12 * 1024 * 1024),

  /// Онолын зураг: 25 МБ, байнга.
  theory('theory', 25 * 1024 * 1024),

  /// Аватар гэх мэт: 25 МБ, байнга.
  general('general', 25 * 1024 * 1024);

  const UploadPurpose(this.apiValue, this.maxBytes);
  final String apiValue;
  final int maxBytes;
}

/// Байршуулсан файл — `key`-г дараагийн endpoint-д (даалгавар илгээх г.м.) өгнө.
class UploadedFile {
  const UploadedFile({required this.key, required this.size, required this.mime});

  factory UploadedFile.fromJson(Object? json) {
    final m = (json! as Map).cast<String, Object?>();
    return UploadedFile(
      key: m['key']! as String,
      size: (m['size'] as num?)?.toInt() ?? 0,
      mime: m['mime'] as String? ?? '',
    );
  }

  final String key;
  final int size;
  final String mime;
}

/// Байршуулалтыг хэрэглэгч цуцалсан.
class UploadCancelled implements Exception {
  const UploadCancelled();
}

/// Файл байршуулах — вэбийн `uploadFile`-тэй ижил дараалал (`docs/api-contract/files-uploads.md`):
/// 1) `POST /uploads/presign` → S3 руу шууд `PUT` (Authorization-гүй) → `POST /uploads/complete`;
/// 2) presign байхгүй (404, `direct:false`) эсвэл сүлжээний алдаа бол хуучин multipart `POST /uploads`.
/// Серверийн шалгалтын алдаа (төрөл, хэмжээ — 400) бол шууд хэрэглэгчид, 2-р зам руу шилжихгүй.
class FileUploader {
  FileUploader(this._client);

  final ApiClient _client;

  static const _putTimeout = Duration(seconds: 120);
  static const _multipartTimeout = Duration(seconds: 60);

  /// [onProgress] 0..1. [cancel] цуцлах. [pages] — апп өөрөө угсарсан баримтын хуудасны тоо.
  Future<UploadedFile> upload({
    required Uint8List bytes,
    required String name,
    required String mime,
    required UploadPurpose purpose,
    int? pages,
    void Function(double progress)? onProgress,
    CancelToken? cancel,
  }) async {
    if (bytes.isEmpty) {
      throw const ApiError(ApiErrorKind.badRequest, 'Файл хоосон байна. Дахин сонгоно уу.');
    }
    if (bytes.length > purpose.maxBytes) {
      throw ApiError(
        ApiErrorKind.badRequest,
        'Зураг хэт том байна (${purpose.maxBytes ~/ (1024 * 1024)} МБ хүртэл). Хуудсын тоог цөөлөөд дахин оролдоно уу.',
      );
    }
    onProgress?.call(0);
    try {
      final direct = await _direct(bytes, name, mime, purpose, pages, onProgress, cancel);
      if (direct != null) return direct;
    } on UploadCancelled {
      rethrow;
    } on ApiError catch (e) {
      // 404 = presign маршрутгүй хуучин сервер, сүлжээ = S3 хүрэхгүй → multipart.
      final fallback = e.isNetwork || e.kind == ApiErrorKind.notFound;
      if (!fallback) rethrow;
    }
    return _multipart(bytes, name, mime, purpose, onProgress, cancel);
  }

  Future<UploadedFile?> _direct(
    Uint8List bytes,
    String name,
    String mime,
    UploadPurpose purpose,
    int? pages,
    void Function(double)? onProgress,
    CancelToken? cancel,
  ) async {
    final plan = await _client.post<Map<String, Object?>>(
      '/uploads/presign',
      body: {'name': name, 'mime': mime, 'size': bytes.length, 'purpose': purpose.apiValue},
      parse: (j) => (j! as Map).cast<String, Object?>(),
    );
    _throwIfCancelled(cancel);
    final url = plan['url'] as String?;
    final ticket = plan['ticket'] as String?;
    if (plan['direct'] != true || url == null || ticket == null) return null;
    final headers = (plan['headers'] as Map?)?.cast<String, Object?>() ?? {'Content-Type': mime};
    onProgress?.call(0.05);
    try {
      final res = await _client.dio.putUri<Object?>(
        Uri.parse(url),
        data: Stream.fromIterable([bytes]),
        cancelToken: cancel,
        onSendProgress: (sent, total) {
          if (total > 0) onProgress?.call(0.05 + 0.85 * (sent / total));
        },
        options: Options(
          // Presigned URL — Authorization ХЭЗЭЭ Ч бүү нэм. Content-Type гарын үсэгт орсон.
          headers: {...headers, Headers.contentLengthHeader: bytes.length},
          contentType: headers['Content-Type'] as String? ?? mime,
          responseType: ResponseType.plain,
          validateStatus: (_) => true,
          sendTimeout: _putTimeout,
          receiveTimeout: _putTimeout,
        ),
      );
      final status = res.statusCode ?? 0;
      if (status < 200 || status >= 300) {
        throw const ApiError(ApiErrorKind.server, 'Файл байршуулахад алдаа гарлаа. Дахин оролдоно уу.');
      }
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) throw const UploadCancelled();
      throw ApiError.fromDio(e);
    }
    _throwIfCancelled(cancel);
    onProgress?.call(0.92);
    final done = await _client.post(
      '/uploads/complete',
      body: {'ticket': ticket, 'pages': ?pages},
      parse: UploadedFile.fromJson,
      // Давтан complete ижил хариу өгдөг (upsert) тул давтаж болно.
      retry: true,
    );
    onProgress?.call(1);
    return done;
  }

  Future<UploadedFile> _multipart(
    Uint8List bytes,
    String name,
    String mime,
    UploadPurpose purpose,
    void Function(double)? onProgress,
    CancelToken? cancel,
  ) async {
    // `purpose`-ийг файлаас ӨМНӨ — multer body-г файлын өмнөх талбараас уншина.
    final form = FormData()
      ..fields.add(MapEntry('purpose', purpose.apiValue))
      ..files.add(
        MapEntry('file', MultipartFile.fromBytes(bytes, filename: name, contentType: DioMediaType.parse(mime))),
      );
    try {
      final res = await _client.dio.post<Object?>(
        '/uploads',
        data: form,
        cancelToken: cancel,
        onSendProgress: (sent, total) {
          if (total > 0) onProgress?.call(0.95 * (sent / total));
        },
        options: Options(
          headers: _client.authHeaders(),
          validateStatus: (_) => true,
          sendTimeout: _multipartTimeout,
          receiveTimeout: _multipartTimeout,
        ),
      );
      final status = res.statusCode ?? 0;
      if (status < 200 || status >= 300) throw ApiError.fromStatus(status, res.data);
      onProgress?.call(1);
      return UploadedFile.fromJson(res.data);
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) throw const UploadCancelled();
      throw ApiError.fromDio(e);
    }
  }

  static void _throwIfCancelled(CancelToken? cancel) {
    if (cancel?.isCancelled ?? false) throw const UploadCancelled();
  }
}

final fileUploaderProvider = Provider<FileUploader>((ref) => FileUploader(ref.watch(apiClientProvider)));
