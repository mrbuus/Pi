import 'dart:async';
import 'dart:math' as math;

import 'package:dio/dio.dart';

import '../auth/token_holder.dart';
import 'api_error.dart';

/// JSON-оос загвар үүсгэгч.
typedef JsonParser<T> = T Function(Object? json);

/// Апп-ын цорын ганц HTTP клиент (вэбийн `lib/api.ts` `api()`-тэй ижил үүрэг).
///
/// - Суурь хаяг, `Authorization: Bearer` толгой (токен ЗӨВХӨН толгойд — query-д хэзээ ч биш).
/// - «Сэрээх» retry: эхний оролдлого 12с, сүлжээний алдаа/timeout бол full-jitter
///   саатлын дараа 60с-ээр НЭГ удаа дахин (2000 хэрэглэгч зэрэг цохихоос сэргийлнэ).
///   Зөвхөн GET/HEAD, эсвэл дуудагч `retry: true` гэж зөвшөөрсөн (idempotent) хүсэлтэд —
///   илгээх (submit) зэрэг давхардаж болох хүсэлтийг ХЭЗЭЭ Ч автоматаар давтахгүй.
/// - Ижил GET зэрэг дуудагдвал нэг л хүсэлт (in-flight dedupe).
/// - 401 → [onUnauthorized] (нэвтрэлт дууссан, нууц үг солигдсон). Нэвтрэх хүсэлтийн
///   401 (буруу нууц үг) үүнд хамаарахгүй — `auth: false`.
/// - Хүсэлтийн явцад токен солигдвол (гарсан/өөр хүн нэвтэрсэн) хариуг хаяна.
class ApiClient {
  ApiClient({
    required String baseUrl,
    required this.tokens,
    Dio? dio,
    this.onUnauthorized,
    this.onReachability,
    math.Random? random,
    this.firstTryTimeout = const Duration(seconds: 12),
    this.wakeTryTimeout = const Duration(seconds: 60),
    this.retryBaseDelay = const Duration(milliseconds: 500),
  }) : _random = random ?? math.Random(),
       dio = dio ?? Dio() {
    this.dio.options
      ..baseUrl = baseUrl
      ..connectTimeout = firstTryTimeout
      ..responseType = ResponseType.json
      ..validateStatus = ((_) => true)
      ..headers = {'Accept': 'application/json'};
  }

  final Dio dio;
  final TokenHolder tokens;

  /// 401 ирэхэд (серверийн монгол шалтгаантай) — Session гаргана.
  final void Function(String message)? onUnauthorized;

  /// Сервертэй холбогдож чадсан/чадаагүй — офлайн туузанд.
  final void Function(bool reachable)? onReachability;

  final Duration firstTryTimeout;
  final Duration wakeTryTimeout;
  final Duration retryBaseDelay;
  final math.Random _random;
  final _inflight = <String, Future<Object?>>{};

  Future<T> get<T>(String path, {Map<String, Object?>? query, required JsonParser<T> parse, bool auth = true}) =>
      _send('GET', path, query: query, parse: parse, auth: auth, retry: true);

  Future<T> post<T>(String path, {Object? body, JsonParser<T>? parse, bool auth = true, bool retry = false}) =>
      _send('POST', path, body: body, parse: parse, auth: auth, retry: retry);

  Future<T> patch<T>(String path, {Object? body, JsonParser<T>? parse, bool auth = true, bool retry = false}) =>
      _send('PATCH', path, body: body, parse: parse, auth: auth, retry: retry);

  Future<T> put<T>(String path, {Object? body, JsonParser<T>? parse, bool auth = true, bool retry = false}) =>
      _send('PUT', path, body: body, parse: parse, auth: auth, retry: retry);

  Future<T> delete<T>(String path, {Object? body, JsonParser<T>? parse, bool auth = true, bool retry = false}) =>
      _send('DELETE', path, body: body, parse: parse, auth: auth, retry: retry);

  /// Файлын бүтэн хаяг (`/files/:key`). Зургийг [authHeaders]-тэй хамт ачаална.
  Uri fileUri(String key) => Uri.parse('${dio.options.baseUrl}/files/${Uri.encodeComponent(key)}');

  /// Зураг, файл ачаалахад хэрэглэх толгой (токен query-д ОРОХГҮЙ — log-д үлдэнэ).
  Map<String, String> authHeaders() {
    final t = tokens.token;
    return t == null ? const {} : {'Authorization': 'Bearer $t'};
  }

  Future<T> _send<T>(
    String method,
    String path, {
    Map<String, Object?>? query,
    Object? body,
    JsonParser<T>? parse,
    required bool auth,
    required bool retry,
  }) async {
    final token = auth ? tokens.token : null;
    final version = tokens.version;
    final key = method == 'GET' ? '$path?${_queryKey(query)}#$version#$auth' : null;

    Future<Object?> run() async {
      final res = await _withWakeRetry(
        (timeout) => dio.request<Object?>(
          path,
          data: body,
          queryParameters: query == null
              ? null
              : {
                  for (final e in query.entries)
                    if (e.value != null) e.key: e.value,
                },
          options: Options(
            method: method,
            headers: {if (token != null) 'Authorization': 'Bearer $token'},
            contentType: body == null ? null : Headers.jsonContentType,
            receiveTimeout: timeout,
            sendTimeout: body == null ? null : timeout,
          ),
        ),
        retry: retry,
      );
      onReachability?.call(true);
      if (auth && (tokens.version != version)) {
        throw const ApiError(ApiErrorKind.unauthorized, 'Нэвтрэх төлөв өөрчлөгдсөн. Дахин оролдоно уу.', status: 401);
      }
      final status = res.statusCode ?? 0;
      if (status >= 200 && status < 300) return res.data;
      final error = ApiError.fromStatus(status, res.data);
      if (status == 401 && auth && token != null) onUnauthorized?.call(error.message);
      throw error;
    }

    Future<Object?> data;
    if (key != null && _inflight.containsKey(key)) {
      data = _inflight[key]!;
    } else {
      data = run();
      if (key != null) {
        _inflight[key] = data;
        unawaited(
          data.then((_) => null, onError: (_) => null).whenComplete(() {
            if (identical(_inflight[key], data)) _inflight.remove(key);
          }),
        );
      }
    }
    final json = await data;
    if (parse == null) return json as T;
    try {
      return parse(json);
    } on ApiError {
      rethrow;
    } catch (_) {
      // Хариуны бүтэц хүлээснээс өөр — техникийн мессеж хэрэглэгчид харуулахгүй.
      throw const ApiError(ApiErrorKind.unknown, 'Мэдээллийг уншиж чадсангүй. Аппаа шинэчилнэ үү.');
    }
  }

  Future<Response<Object?>> _withWakeRetry(
    Future<Response<Object?>> Function(Duration timeout) request, {
    required bool retry,
  }) async {
    try {
      return await request(firstTryTimeout);
    } on DioException catch (e) {
      final error = ApiError.fromDio(e);
      if (!retry || !error.isNetwork) {
        if (error.isNetwork) onReachability?.call(false);
        throw error;
      }
      // Full jitter: random(0, base * 2) — эхний retry 0–1с.
      final maxMs = retryBaseDelay.inMilliseconds * 2;
      await Future<void>.delayed(Duration(milliseconds: maxMs == 0 ? 0 : _random.nextInt(maxMs)));
      try {
        return await request(wakeTryTimeout);
      } on DioException catch (e2) {
        final error2 = ApiError.fromDio(e2);
        if (error2.isNetwork) onReachability?.call(false);
        throw error2;
      }
    }
  }

  static String _queryKey(Map<String, Object?>? q) {
    if (q == null || q.isEmpty) return '';
    final keys = q.keys.toList()..sort();
    return keys.map((k) => '$k=${q[k]}').join('&');
  }
}
