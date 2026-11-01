import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// Firebase-ийн тохиргоо `--dart-define`-ээр (репо PUBLIC тул `google-services.json`,
/// `GoogleService-Info.plist` commit хийхгүй, нативаар ч шаардахгүй — SECURITY §1).
///
/// Жишээ: `lib/features/push/firebase_defines.example.json` →
/// `flutter run --dart-define-from-file=firebase_defines.json` (файлыг gitignore-д).
/// Утга дутуу бол push бүхэлдээ УНТРААЛТТАЙ — апп Firebase-гүйгээр бүрэн ажиллана.
class PushConfig {
  const PushConfig({
    required this.apiKey,
    required this.projectId,
    required this.senderId,
    required this.androidAppId,
    required this.iosAppId,
    this.iosBundleId = '',
  });

  /// Build-ийн үеийн `--dart-define` утгууд.
  factory PushConfig.fromEnvironment() => const PushConfig(
        apiKey: String.fromEnvironment('FIREBASE_API_KEY'),
        projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
        senderId: String.fromEnvironment('FIREBASE_SENDER_ID'),
        androidAppId: String.fromEnvironment('FIREBASE_ANDROID_APP_ID'),
        iosAppId: String.fromEnvironment('FIREBASE_IOS_APP_ID'),
        iosBundleId: String.fromEnvironment('FIREBASE_IOS_BUNDLE_ID'),
      );

  final String apiKey;
  final String projectId;
  final String senderId;
  final String androidAppId;
  final String iosAppId;
  final String iosBundleId;

  /// Тухайн платформын appId-тай бол л Firebase-ийг эхлүүлнэ.
  String? appIdFor(TargetPlatform platform) {
    if (kIsWeb || apiKey.isEmpty || projectId.isEmpty || senderId.isEmpty) return null;
    final id = switch (platform) {
      TargetPlatform.android => androidAppId,
      TargetPlatform.iOS => iosAppId,
      _ => '',
    };
    return id.isEmpty ? null : id;
  }
}

/// Push-ийн платформын давхарга (тестэд хуурамчаар солино).
abstract class PushMessaging {
  /// Тохиргоо байгаа эсэх. `false` бол бусад дуудлага юу ч хийхгүй.
  bool get enabled;

  /// Firebase эхлүүлэх. Бүтэлгүйтвэл `false` (апп эвдрэхгүй).
  Future<bool> init();

  /// Мэдэгдлийн зөвшөөрөл (iOS, Android 13+). Татгалзвал `false`.
  Future<bool> requestPermission();

  Future<String?> getToken();

  Stream<String> get onTokenRefresh;

  /// Апп нээлттэй үед ирсэн мэдэгдэл (гарчиг, бичвэр).
  Stream<PushMessage> get onForegroundMessage;

  /// Төхөөрөмжийн токеныг хүчингүй болгоно — гарсны дараа энэ утсанд push ирэхгүй.
  Future<void> deleteToken();
}

class PushMessage {
  const PushMessage({this.title, this.body, this.data = const {}});

  final String? title;
  final String? body;
  final Map<String, Object?> data;
}

/// Firebase тохируулаагүй үеийн хэрэгжүүлэлт — юу ч хийхгүй.
class DisabledPushMessaging implements PushMessaging {
  const DisabledPushMessaging();

  @override
  bool get enabled => false;

  @override
  Future<bool> init() async => false;

  @override
  Future<bool> requestPermission() async => false;

  @override
  Future<String?> getToken() async => null;

  @override
  Stream<String> get onTokenRefresh => const Stream.empty();

  @override
  Stream<PushMessage> get onForegroundMessage => const Stream.empty();

  @override
  Future<void> deleteToken() async {}
}

/// `firebase_messaging` дээрх хэрэгжүүлэлт.
///
/// FCM бүртгэлийн ТОКЕН ашиглана (`getToken`/`onTokenRefresh`/`deleteToken` — 17.x-д deprecated):
/// сервер FCM HTTP v1 `message.token`-оор илгээдэг (`api/src/devices/push-sender.ts`). Шинэ
/// `register()`/`onRegistered` нь FID өгдөг — серверийг direct-send-д шилжүүлэх үед хамт солино.
///
/// Апп нээлттэй үед мэдэгдэл OS-оор ХАРУУЛАХГҮЙ (iOS foreground presentation асаагаагүй, Android
/// FCM өөрөө харуулдаггүй) — шалгалтын үеэр хүүхдийн анхаарал сарниулахгүй (`pushQuietProvider`).
class FirebasePushMessaging implements PushMessaging {
  FirebasePushMessaging(this._config, this._platform);

  final PushConfig _config;
  final TargetPlatform _platform;
  bool _ready = false;

  @override
  bool get enabled => _config.appIdFor(_platform) != null;

  @override
  Future<bool> init() async {
    if (_ready) return true;
    final appId = _config.appIdFor(_platform);
    if (appId == null) return false;
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: FirebaseOptions(
            apiKey: _config.apiKey,
            appId: appId,
            messagingSenderId: _config.senderId,
            projectId: _config.projectId,
            iosBundleId: _config.iosBundleId.isEmpty ? null : _config.iosBundleId,
          ),
        );
      }
      await FirebaseMessaging.instance.setAutoInitEnabled(true);
      _ready = true;
    } on Object catch (e) {
      debugPrint('push: Firebase эхлүүлж чадсангүй ($e)');
    }
    return _ready;
  }

  @override
  Future<bool> requestPermission() async {
    if (!_ready) return false;
    final s = await FirebaseMessaging.instance.requestPermission();
    return s.authorizationStatus == AuthorizationStatus.authorized ||
        s.authorizationStatus == AuthorizationStatus.provisional;
  }

  @override
  Future<String?> getToken() async {
    if (!_ready) return null;
    final m = FirebaseMessaging.instance;
    // iOS: APNs токен ирээгүй бол FCM токен авах боломжгүй (симулятор, зөвшөөрөлгүй).
    if (_platform == TargetPlatform.iOS && await m.getAPNSToken() == null) return null;
    // ignore: deprecated_member_use
    return m.getToken();
  }

  @override
  Stream<String> get onTokenRefresh =>
      // ignore: deprecated_member_use
      _ready ? FirebaseMessaging.instance.onTokenRefresh : const Stream.empty();

  @override
  Stream<PushMessage> get onForegroundMessage => _ready
      ? FirebaseMessaging.onMessage.map(
          (m) => PushMessage(title: m.notification?.title, body: m.notification?.body, data: m.data),
        )
      : const Stream.empty();

  @override
  Future<void> deleteToken() async {
    // ignore: deprecated_member_use
    if (_ready) await FirebaseMessaging.instance.deleteToken();
  }
}
