import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../network/api_client.dart';
import '../network/api_error.dart';

/// `/files/:key`-ийн түлхүүрийн хэлбэр (сервер `^[\w][\w.-]*$`, 200 тэмдэгт хүртэл).
final fileKeyPattern = RegExp(r'^[\w][\w.\-]*$');

/// Файл баримт (олон хуудастай) эсэх — гэрийн даалгавар, онолын зураг ийм байж болно.
bool isDocumentKey(String key) => key.toLowerCase().endsWith('.pdf');

/// `/files/:key` татах.
///
/// Сервер S3-д хадгалсан файлд `302` → 5 минутын presigned URL буцаадаг. Тэр URL руу
/// `Authorization` толгойг ДАМЖУУЛАХГҮЙ (S3 татгалздаг, мөн токен гадагш алдагдана) —
/// тиймээс redirect-ийг өөрөө, толгойгүй дагана (`docs/api-contract/files-uploads.md`).
class FileFetcher {
  FileFetcher(this._client);

  final ApiClient _client;

  static const _timeout = Duration(seconds: 60);

  Future<Uint8List> fetch(String key) async {
    if (!fileKeyPattern.hasMatch(key) || key.length > 200) {
      throw const ApiError(ApiErrorKind.notFound, 'Файл олдсонгүй');
    }
    final dio = _client.dio;
    try {
      var res = await dio.getUri<List<int>>(
        _client.fileUri(key),
        options: Options(
          responseType: ResponseType.bytes,
          followRedirects: false,
          validateStatus: (_) => true,
          headers: _client.authHeaders(),
          receiveTimeout: _timeout,
        ),
      );
      var status = res.statusCode ?? 0;
      if (status >= 300 && status < 400) {
        final location = res.headers.value('location');
        if (location == null || location.isEmpty) throw ApiError.fromStatus(502, null);
        final target = _client.fileUri(key).resolve(location);
        // Толгойгүй (Authorization-гүй) — presigned URL өөрөө эрх агуулна.
        res = await dio.getUri<List<int>>(
          target,
          options: Options(
            responseType: ResponseType.bytes,
            followRedirects: true,
            validateStatus: (_) => true,
            receiveTimeout: _timeout,
          ),
        );
        status = res.statusCode ?? 0;
        // S3-ийн 403 (presigned-ийн хугацаа дууссан) нь «эрхгүй» биш — дахин оролдоход засагдана.
        if (status == 403) throw ApiError.fromStatus(503, null);
      }
      if (status >= 200 && status < 300 && res.data != null) {
        final data = res.data!;
        return data is Uint8List ? data : Uint8List.fromList(data);
      }
      throw ApiError.fromStatus(status, null);
    } on DioException catch (e) {
      throw ApiError.fromDio(e);
    }
  }
}
