import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../auth/token_holder.dart';
import '../cache/json_bytes.dart';
import '../cache/response_cache.dart';
import '../cache/swr.dart';
import 'api_error.dart';

/// JSON-оос загвар үүсгэгч.
typedef JsonParser<T> = T Function(Object? json);

/// Хэзээ ч кэшлэхгүй замын эхлэл: нэвтрэлт/токен, файл (тусдаа кэштэй), төхөөрөмж, шууд төлөв,
/// бүртгэл устгах хүсэлт, ICS текст.
const kNoCachePrefixes = <String>[
  '/auth',
  '/files',
  '/devices',
  '/presence',
  '/me/deletion-request',
  '/schedule/me/ics',
];

/// Кэшлэж болох GET зам эсэх.
bool isCacheablePath(String path) {
  for (final p in kNoCachePrefixes) {
    if (path == p || path.startsWith('$p/') || path.startsWith('$p?')) return false;
  }
  return true;
}

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
///
/// GET кэш ([cache], `docs/PERF-OFFLINE.md`) — feature код өөрчлөхгүйгээр:
/// - Хариу бүр санах ой + дискэнд (хэрэглэгч тус бүр). Дараагийн хүсэлтэд `If-None-Match`
///   (Express-ийн ETag) → өөрчлөгдөөгүй бол 304, бие татахгүй (3G-д хэмнэлт).
/// - Сүлжээгүй/timeout/502–504 → сүүлд мэдэгдсэн хариу (офлайн тууз харагдана). Кэштэй бол
///   60с-ийн «сэрээх» давталтыг хүлээлгэхгүй — шууд кэш.
/// - Mutation амжилттай болсны дараа ижил замын бүлгийн кэш устна (`/assignments/...`).
/// - [swr] zone дотор: кэшээс ШУУД, арын төлөвт шинэчлээд өөр бол провайдерыг дахин бүтээнэ.
class ApiClient {
  ApiClient({
    required String baseUrl,
    required this.tokens,
    Dio? dio,
    this.onUnauthorized,
    this.onReachability,
    this.cache,
    this.cacheScope,
    math.Random? random,
    this.firstTryTimeout = const Duration(seconds: 12),
    this.wakeTryTimeout = const Duration(seconds: 60),
    this.retryBaseDelay = const Duration(milliseconds: 500),
    DateTime Function()? now,
  })  : _random = random ?? math.Random(),
        _now = now ?? DateTime.now,
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

  /// GET хариуны кэш. null бол кэшгүй (хуучин зан төлөв).
  final ResponseCache? cache;

  /// Одоогийн хэрэглэгч (userId) — кэшийн хүрээ. null буцаавал (нэвтрээгүй) кэшгүй.
  /// Өгөөгүй бол [ResponseCache.scope]-ийг шууд хэрэглэнэ.
  final String? Function()? cacheScope;

  /// 401 ирэхэд (серверийн монгол шалтгаантай) — Session гаргана.
  final void Function(String message)? onUnauthorized;

  /// Сервертэй холбогдож чадсан/чадаагүй — офлайн туузанд.
  final void Function(bool reachable)? onReachability;

  final Duration firstTryTimeout;
  final Duration wakeTryTimeout;
  final Duration retryBaseDelay;

  final math.Random _random;
  final DateTime Function() _now;
  final _inflight = <String, Future<Object?>>{};

  Future<T> get<T>(
    String path, {
    Map<String, Object?>? query,
    required JsonParser<T> parse,
    bool auth = true,
    bool cache = true,
  }) {
    final c = this.cache;
    if (c != null && cacheScope != null) c.setScope(cacheScope!());
    if (!cache || c == null || c.scope == null || !isCacheablePath(path)) {
      return _send('GET', path, query: query, parse: parse, auth: auth, retry: true);
    }
    return _cachedGet(c, path, query: query, parse: parse, auth: auth);
  }

  Future<T> post<T>(String path, {Object? body, JsonParser<T>? parse, bool auth = true, bool retry = false}) =>
      _send('POST', path, body: body, parse: parse, auth: auth, retry: retry);

  Future<T> patch<T>(String path, {Object? body, JsonParser<T>? parse, bool auth = true, bool retry = false}) =>
      _send('PATCH', path, body: body, parse: parse, auth: auth, retry: retry);

  Future<T> put<T>(String path, {Object? body, JsonParser<T>? parse, bool auth = true, bool retry = false}) =>
      _send('PUT', path, body: body, parse: parse, auth: auth, retry: retry);

  Future<T> delete<T>(String path, {Object? body, JsonParser<T>? parse, bool auth = true, bool retry = false}) =>
      _send('DELETE', path, body: body, parse: parse, auth: auth, retry: retry);

  /// Feature-ийн mutation өөр бүлгийн замд нөлөөлдөг бол (жишээ: `/tests/:id/submit` →
  /// `/student-hub/tests`) тэр кэшийг гараар устгана. Mutation-ий өөрийн бүлэг автоматаар устдаг.
  void invalidateCache(String pathPrefix) => cache?.invalidatePrefix(pathPrefix);

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
    final version = tokens.version;
    final key = method == 'GET' ? '${ResponseCache.keyOf(path, query)}#$version#$auth' : null;

    Future<Object?> run() async {
      final res = await _fetch(method, path, query: query, body: body, auth: auth, retry: retry);
      if (method != 'GET') _afterMutation(path);
      return res.json;
    }

    final json = await (key == null ? run() : _dedupe(key, run));
    return _parse(json, parse);
  }

  /// Ижил түлхүүртэй зэрэг хүсэлтийг нэгтгэнэ.
  Future<Object?> _dedupe(String key, Future<Object?> Function() run) {
    final existing = _inflight[key];
    if (existing != null) return existing;
    final data = run();
    _inflight[key] = data;
    unawaited(data.then((_) => null, onError: (_) => null).whenComplete(() {
      if (identical(_inflight[key], data)) _inflight.remove(key);
    }));
    return data;
  }

  static T _parse<T>(Object? json, JsonParser<T>? parse) {
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

  void _afterMutation(String path) {
    final c = cache;
    if (c == null) return;
    c.invalidatePrefix(ResponseCache.groupOf(path));
  }

  // ---------------------------------------------------------------- кэштэй GET

  Future<T> _cachedGet<T>(
    ResponseCache c,
    String path, {
    Map<String, Object?>? query,
    required JsonParser<T> parse,
    required bool auth,
  }) async {
    final key = ResponseCache.keyOf(path, query);
    final swr = SwrScope.current;
    final entry = c.peek(key) ?? (c.hasDisk ? await c.read(key) : null);

    if (entry != null) {
      // SWR-ийн арын шинэчлэл саяхан авчирсан хариу — провайдерын өөрийн дахин бүтээлтэд
      // дахин асуухгүй (нэг удаа хэрэглэгдэнэ; mutation болсон бол хүчингүй).
      final fresh = swr != null && entry.pendingSwr && entry.epoch == c.epoch;
      if (fresh) entry.pendingSwr = false;
      if (swr != null && (fresh || !swr.preferNetwork)) {
        final T value;
        try {
          value = parse(entry.data);
        } catch (_) {
          c.remove(key); // Хуучин бүтэцтэй кэш — сүлжээнээс авна.
          return await _cachedGetNetwork(c, key, path, query, parse, auth, null);
        }
        if (!fresh) unawaited(_revalidate(c, key, path, query, auth, entry, swr));
        return value;
      }
    }
    return _cachedGetNetwork(c, key, path, query, parse, auth, entry);
  }

  Future<T> _cachedGetNetwork<T>(
    ResponseCache c,
    String key,
    String path,
    Map<String, Object?>? query,
    JsonParser<T> parse,
    bool auth,
    CachedResponse? fallback,
  ) async {
    try {
      // Кэштэй бол 60с-ийн давталтыг хүлээлгэхгүй — бүтэлгүйтвэл шууд кэш.
      final json = await _networkGet(c, key, path, query, auth, entry: fallback, retry: fallback == null);
      // ignore: unawaited_return_in_try_block — T нь Future биш (JSON загвар).
      return _parse(json, parse);
    } on ApiError catch (e) {
      if (fallback != null && _canFallback(e)) {
        try {
          return parse(fallback.data);
        } catch (_) {
          c.remove(key);
        }
      }
      rethrow;
    }
  }

  /// Офлайн, timeout, серверийн түр алдаа (сэрж байна, deploy) — сүүлд мэдэгдсэн хариу.
  static bool _canFallback(ApiError e) =>
      e.isNetwork || e.status == 502 || e.status == 503 || e.status == 504;

  /// Сүлжээнээс авч кэшид хадгална (ETag → 304). Ижил түлхүүрийг зэрэг асуувал нэг хүсэлт.
  Future<Object?> _networkGet(
    ResponseCache c,
    String key,
    String path,
    Map<String, Object?>? query,
    bool auth, {
    required CachedResponse? entry,
    required bool retry,
  }) {
    final version = tokens.version;
    final scope = c.scope;
    return _dedupe('c:$key#$version#$auth', () async {
      final res = await _fetch(
        'GET',
        path,
        query: query,
        auth: auth,
        retry: retry,
        ifNoneMatch: entry?.etag,
        keep304: entry != null,
      );
      if (c.scope != scope) return res.json; // явцад хэрэглэгч солигдсон — хадгалахгүй
      if (res.status == 304 && entry != null) {
        c.touch(key, entry);
        return entry.data;
      }
      final bytes = res.bytes;
      if (bytes != null && res.isJson) {
        c.put(
          key,
          CachedResponse(data: res.json, fetchedAt: _now(), bytes: bytes.length, hash: fnv1a32(bytes), etag: res.etag),
          bytes,
        );
      }
      return res.json;
    });
  }

  /// SWR: арын төлөвт шинэчилж, өөр бол (эсвэл эрх хаагдсан бол) провайдерт мэдэгдэнэ.
  Future<void> _revalidate(
    ResponseCache c,
    String key,
    String path,
    Map<String, Object?>? query,
    bool auth,
    CachedResponse old,
    SwrScope swr,
  ) async {
    try {
      await _networkGet(c, key, path, query, auth, entry: old, retry: true);
      final now = c.peek(key);
      if (now != null && !identical(now, old) && (now.hash != old.hash || now.bytes != old.bytes)) {
        now.pendingSwr = true;
        swr.onFresh();
      }
    } on ApiError catch (e) {
      if (_canFallback(e) || e.kind == ApiErrorKind.unauthorized) return;
      // 403/404 г.м. — эрх хаагдсан/устгагдсан: хуучныг харуулахгүй, дэлгэц алдаагаа харуулна.
      c.remove(key);
      swr.onFresh();
    } catch (_) {}
  }

  // ---------------------------------------------------------------- доод түвшин

  Future<_Fetched> _fetch(
    String method,
    String path, {
    Map<String, Object?>? query,
    Object? body,
    required bool auth,
    required bool retry,
    String? ifNoneMatch,
    bool keep304 = false,
  }) async {
    final token = auth ? tokens.token : null;
    final version = tokens.version;
    final res = await _withWakeRetry(
      (timeout) => dio.request<List<int>>(
        path,
        data: body,
        queryParameters: query == null ? null : {for (final e in query.entries) if (e.value != null) e.key: e.value},
        options: Options(
          method: method,
          responseType: ResponseType.bytes,
          headers: {
            if (token != null) 'Authorization': 'Bearer $token',
            'If-None-Match': ?ifNoneMatch,
          },
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
    final raw = res.data;
    final bytes = raw == null ? null : (raw is Uint8List ? raw : Uint8List.fromList(raw));
    final contentType = res.headers.value(Headers.contentTypeHeader);
    final isJson = isJsonContentType(contentType);
    if (status == 304 && keep304) {
      return _Fetched(status, null, null, isJson: false, etag: res.headers.value('etag'));
    }
    final Object? json;
    if (bytes == null || bytes.isEmpty) {
      json = isJson || contentType == null ? null : '';
    } else if (isJson) {
      try {
        json = await decodeJsonBytes(bytes);
      } catch (_) {
        if (status >= 200 && status < 300) {
          throw const ApiError(ApiErrorKind.unknown, 'Мэдээллийг уншиж чадсангүй. Аппаа шинэчилнэ үү.');
        }
        throw ApiError.fromStatus(status, null);
      }
    } else {
      json = utf8.decode(bytes, allowMalformed: true);
    }
    if (status >= 200 && status < 300) {
      return _Fetched(status, json, bytes, isJson: isJson, etag: res.headers.value('etag'));
    }
    final error = ApiError.fromStatus(status, json);
    if (status == 401 && auth && token != null) onUnauthorized?.call(error.message);
    throw error;
  }

  Future<Response<List<int>>> _withWakeRetry(
    Future<Response<List<int>>> Function(Duration timeout) request, {
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
}

class _Fetched {
  const _Fetched(this.status, this.json, this.bytes, {required this.isJson, this.etag});

  final int status;
  final Object? json;
  final Uint8List? bytes;
  final bool isJson;
  final String? etag;
}
