import 'package:dio/dio.dart';

import '../ui/strings.dart';

/// Алдааны ангилал — дэлгэц аль төлөвийг харуулахаа үүгээр шийднэ.
enum ApiErrorKind {
  /// Интернэтгүй, холболт тасарсан.
  network,

  /// Хүлээх хугацаа хэтэрсэн.
  timeout,

  /// 400/422 — оролт буруу (серверийн монгол мессежийг харуул).
  badRequest,

  /// 401 — нэвтрэлт дууссан эсвэл буруу нэр/нууц үг.
  unauthorized,

  /// 403 — эрхгүй. Ихэнхдээ хэвийн хариу (жишээ: тест эхлээгүй үед зураг) — эвдрэл биш.
  forbidden,

  /// 404
  notFound,

  /// 409 — зэрэг засвар, давхар үйлдэл.
  conflict,

  /// 429 — хэт олон оролдлого.
  tooManyRequests,

  /// 5xx
  server,

  /// Бусад (хариу задлах алдаа гэх мэт).
  unknown,
}

/// Апп-ын бүх сүлжээний алдаа. [message] нь ҮРГЭЛЖ хэрэглэгчид харуулж болох монгол
/// бичвэр — англи техникийн мессеж, «error 500» гэх мэт хэзээ ч орохгүй (RULES §2).
class ApiError implements Exception {
  const ApiError(this.kind, this.message, {this.status, this.body});

  final ApiErrorKind kind;
  final String message;
  final int? status;

  /// Серверийн задалсан хариу (жишээ: 409-ийн `currentVersion`).
  final Object? body;

  bool get isNetwork => kind == ApiErrorKind.network || kind == ApiErrorKind.timeout;

  /// Дахин оролдох нь утгатай эсэх («Дахин оролдох» товч харуулах).
  bool get isRetryable =>
      isNetwork || kind == ApiErrorKind.server || kind == ApiErrorKind.tooManyRequests || kind == ApiErrorKind.unknown;

  /// Монгол кирилл үсэг агуулсан эсэх — серверийн мессежийг шууд харуулах шалгуур
  /// (вэбийн `formatErrorMessage`-тэй ижил).
  static bool isMongolian(String s) => RegExp('[Ѐ-ӿ]').hasMatch(s);

  /// Серверийн хариунаас (`{ message: string | string[] }`) монгол мессеж гаргах.
  static String? serverMessage(Object? body) {
    if (body is Map) {
      final m = body['message'];
      if (m is String) return m;
      if (m is List) return m.whereType<String>().join(', ');
    }
    return null;
  }

  factory ApiError.fromStatus(int status, Object? body) {
    final kind = switch (status) {
      400 || 422 => ApiErrorKind.badRequest,
      401 => ApiErrorKind.unauthorized,
      403 => ApiErrorKind.forbidden,
      404 => ApiErrorKind.notFound,
      409 => ApiErrorKind.conflict,
      429 => ApiErrorKind.tooManyRequests,
      >= 500 => ApiErrorKind.server,
      _ => ApiErrorKind.unknown,
    };
    final server = serverMessage(body);
    // Сервер монголоор хэлсэн бол түүнийг (жишээ: «Утас эсвэл нууц үг буруу»).
    // 5xx-ийн мессеж техникийн байж болзошгүй тул ерөнхий бичвэр.
    if (server != null && server.trim().isNotEmpty && isMongolian(server) && kind != ApiErrorKind.server) {
      return ApiError(kind, server.trim(), status: status, body: body);
    }
    final fallback = switch (kind) {
      ApiErrorKind.unauthorized => AppStrings.sessionExpired,
      ApiErrorKind.forbidden => AppStrings.forbidden,
      ApiErrorKind.notFound => AppStrings.notFound,
      ApiErrorKind.tooManyRequests => AppStrings.tooManyRequests,
      ApiErrorKind.server => status == 503 ? AppStrings.timeoutError : AppStrings.serverError,
      _ => AppStrings.genericError,
    };
    return ApiError(kind, fallback, status: status, body: body);
  }

  factory ApiError.fromDio(DioException e) {
    if (e.error is ApiError) return e.error! as ApiError;
    final res = e.response;
    if (res != null && res.statusCode != null) return ApiError.fromStatus(res.statusCode!, res.data);
    return switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout ||
      DioExceptionType.transformTimeout =>
        const ApiError(ApiErrorKind.timeout, AppStrings.timeoutError),
      DioExceptionType.connectionError => const ApiError(ApiErrorKind.network, AppStrings.networkError),
      DioExceptionType.badCertificate => const ApiError(ApiErrorKind.network, AppStrings.networkError),
      DioExceptionType.cancel => const ApiError(ApiErrorKind.unknown, AppStrings.genericError),
      DioExceptionType.unknown => e.error is FormatException
          ? const ApiError(ApiErrorKind.unknown, AppStrings.genericError)
          : const ApiError(ApiErrorKind.network, AppStrings.networkError),
      DioExceptionType.badResponse => const ApiError(ApiErrorKind.unknown, AppStrings.genericError),
    };
  }

  @override
  String toString() => 'ApiError($kind, $status)';
}
