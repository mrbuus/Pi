import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/session.dart';
import '../../core/auth/token_holder.dart';
import '../../core/network/api_client.dart';
import '../../core/network/network_providers.dart';
import 'push_messaging.dart';

/// Push-ийн платформын давхарга. Тестэд `FakePushMessaging`-ээр override хийнэ.
final pushMessagingProvider = Provider<PushMessaging>((ref) {
  final config = PushConfig.fromEnvironment();
  final platform = defaultTargetPlatform;
  if (config.appIdFor(platform) == null) return const DisabledPushMessaging();
  return FirebasePushMessaging(config, platform);
});

/// Шалгалтын үеийн «чимээгүй» горим. Шалгалтын дэлгэц (exam feature) нээгдэхэд `true`, хаагдахад
/// `false` болгоно. Апп нээлттэй үед OS мэдэгдэл аль хэдийн харуулдаггүй; энэ туг нь дараа нэмэгдэх
/// апп доторх мэдэгдлийн (баннер) урсгалыг хаана. Сервер ч идэвхтэй шалгалттай сурагч руу push
/// илгээхгүй байх ёстой (`DevicesService.sendToUsers` — серверийн ажил ҮЛДСЭН).
final pushQuietProvider = NotifierProvider<PushQuietController, bool>(PushQuietController.new);

class PushQuietController extends Notifier<bool> {
  @override
  bool build() => false;

  void set({required bool quiet}) => state = quiet;
}

final pushServiceProvider = Provider<PushService>((ref) {
  final service = PushService(
    api: ref.watch(apiClientProvider),
    messaging: ref.watch(pushMessagingProvider),
    tokens: ref.watch(tokenHolderProvider),
    platform: defaultTargetPlatform,
    isQuiet: () => ref.read(pushQuietProvider),
  );
  ref.onDispose(service.dispose);
  return service;
});

/// Нэвтэрсэн үед токеныг `POST /devices`-ээр бүртгэж, гарахад энэ утасны токеныг устгана.
///
/// Апп асахад нэг удаа уншина (`container.read(pushSyncProvider)` — `app/bootstrap.dart`-ийн ажил).
/// Түүнээс өмнө нэвтрэх дэлгэц өөрөө уншдаг тул шинээр нэвтэрсэн хэрэглэгч бүртгэгдэнэ.
final pushSyncProvider = Provider<void>((ref) {
  final service = ref.watch(pushServiceProvider);
  ref.listen<SessionState>(sessionProvider, (prev, next) {
    if (next is SignedIn && prev is! SignedIn) {
      unawaited(service.register());
    } else if (next is SignedOut && prev is SignedIn) {
      // Токен аль хэдийн цэвэрлэгдсэн тул сервер рүү биш — зөвхөн утсан дээрх токеныг хүчингүй болгоно.
      unawaited(service.forgetDevice());
    }
  }, fireImmediately: true);
});

/// Push бүртгэл. Firebase тохируулаагүй бол бүх үйлдэл чимээгүй алгасна.
class PushService {
  PushService({
    required this._api,
    required this._messaging,
    required this._tokens,
    required this._platform,
    required this._isQuiet,
  });

  final ApiClient _api;
  final PushMessaging _messaging;
  final TokenHolder _tokens;
  final TargetPlatform _platform;
  final bool Function() _isQuiet;

  String? _registered;
  StreamSubscription<String>? _refreshSub;

  /// Серверт бүртгэгдсэн токен (тестэд).
  String? get registeredToken => _registered;

  String get _platformName => _platform == TargetPlatform.iOS ? 'ios' : 'android';

  /// Апп нээлттэй үед ирсэн мэдэгдэл — шалгалтын үед ([pushQuietProvider]) шүүгдэнэ.
  Stream<PushMessage> get foregroundMessages => _messaging.onForegroundMessage.where((_) => !_isQuiet());

  /// Нэвтэрсний дараа. Амжилттай бүртгэгдвэл `true`. Алдаа нэвтрэлтэд саад болохгүй.
  Future<bool> register() async {
    if (!_messaging.enabled) return false;
    try {
      if (!await _messaging.init()) return false;
      await _messaging.requestPermission();
      final token = await _messaging.getToken();
      if (token == null || token.isEmpty) return false;
      await _post(token);
      _refreshSub ??= _messaging.onTokenRefresh.listen((t) => unawaited(_safePost(t)));
      return true;
    } on Object catch (e) {
      debugPrint('push: бүртгэж чадсангүй ($e)');
      return false;
    }
  }

  Future<void> _post(String token) async {
    await _api.post<Object?>('/devices', body: {'token': token, 'platform': _platformName});
    _registered = token;
  }

  Future<void> _safePost(String token) async {
    if (_tokens.token == null) return;
    try {
      await _post(token);
    } on Object catch (e) {
      debugPrint('push: шинэ токеныг бүртгэж чадсангүй ($e)');
    }
  }

  /// Гарахын ӨМНӨ дуудна (нэвтрэх токен хүчинтэй үед): серверээс `DELETE /devices/:token`, дараа нь
  /// утсан дээрх токеныг хүчингүй болгоно. Алдааг залгина — гаралт заавал дуусна.
  Future<void> unregisterPush() async {
    final token = _registered;
    if (token != null && _tokens.token != null) {
      try {
        await _api.delete<Object?>('/devices/${Uri.encodeComponent(token)}');
      } on Object catch (e) {
        debugPrint('push: серверээс устгаж чадсангүй ($e)');
      }
    }
    await forgetDevice();
  }

  /// Зөвхөн утсан дээр: шинэчлэлтийн сонсогчийг зогсоож, FCM токеныг устгана.
  Future<void> forgetDevice() async {
    await _refreshSub?.cancel();
    _refreshSub = null;
    final had = _registered != null;
    _registered = null;
    if (!had || !_messaging.enabled) return;
    try {
      await _messaging.deleteToken();
    } on Object catch (e) {
      debugPrint('push: токен устгаж чадсангүй ($e)');
    }
  }

  void dispose() {
    unawaited(_refreshSub?.cancel());
  }
}
