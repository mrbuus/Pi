import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

/// Google-ийн OAuth client ID-ууд `--dart-define`-ээр (нууц биш, гэхдээ эзэн Google Cloud-д үүсгэнэ).
///
/// - `GOOGLE_SERVER_CLIENT_ID` — ВЭБ client ID (серверийн `GOOGLE_CLIENT_ID`); Android, iOS хоёуланд
///   idToken-ийн `aud` болно.
/// - `GOOGLE_IOS_CLIENT_ID` — iOS client ID. iOS-д мөн `Info.plist`-д `CFBundleURLTypes`-д түүний
///   «reversed client ID»-г нэмэх шаардлагатай (эзний ажил) — эс бөгөөс Google SDK апп-ыг унагана.
/// Утга хоосон бол Google товч харагдахгүй.
abstract final class NativeSignInConfig {
  static const googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
  static const googleIosClientId = String.fromEnvironment('GOOGLE_IOS_CLIENT_ID');
}

/// Apple-ээс ирсэн токен ба серверт илгээх ТҮҮХИЙ nonce (Apple-д SHA-256-ийг нь өгсөн).
class AppleCredential {
  const AppleCredential({required this.identityToken, required this.rawNonce});

  final String identityToken;
  final String rawNonce;
}

/// Хэрэглэгчид харуулж болох монгол алдаа (цуцалсан бол алдаа биш — `null` буцаана).
class NativeSignInException implements Exception {
  const NativeSignInException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Google / Apple-ийн нативаар нэвтрэх давхарга (тестэд хуурамчаар солино).
abstract class NativeSignIn {
  /// Google-ийн client ID тохируулсан эсэх (тохиргоогүй бол товч нуугдана).
  bool get googleConfigured;

  /// Зөвхөн iOS (13+) — Android-д Apple товч харуулахгүй.
  Future<bool> appleAvailable();

  /// Google-ийн idToken. Хэрэглэгч цуцалбал `null`.
  Future<String?> googleIdToken();

  /// Apple-ийн токен + түүхий nonce. Цуцалбал `null`.
  Future<AppleCredential?> apple();
}

/// Санамсаргүй түүхий nonce (32 байт, base64url) — нэг удаагийн.
String generateRawNonce([Random? random]) {
  final r = random ?? Random.secure();
  final bytes = List<int>.generate(32, (_) => r.nextInt(256));
  return base64UrlEncode(bytes).replaceAll('=', '');
}

/// Apple-д өгөх утга: түүхий nonce-ийн SHA-256 hex.
String sha256OfNonce(String raw) => sha256.convert(utf8.encode(raw)).toString();

final nativeSignInProvider = Provider<NativeSignIn>((ref) => PluginNativeSignIn(defaultTargetPlatform));

class PluginNativeSignIn implements NativeSignIn {
  PluginNativeSignIn(this._platform);

  final TargetPlatform _platform;
  Future<void>? _googleInit;

  bool get _isIos => !kIsWeb && _platform == TargetPlatform.iOS;
  bool get _isAndroid => !kIsWeb && _platform == TargetPlatform.android;

  @override
  bool get googleConfigured {
    if (NativeSignInConfig.googleServerClientId.isEmpty) return false;
    if (_isAndroid) return true;
    return _isIos && NativeSignInConfig.googleIosClientId.isNotEmpty;
  }

  @override
  Future<bool> appleAvailable() async {
    if (!_isIos) return false;
    try {
      return await SignInWithApple.isAvailable();
    } on Object {
      return false;
    }
  }

  @override
  Future<String?> googleIdToken() async {
    if (!googleConfigured) throw const NativeSignInException(_googleFailed);
    final google = GoogleSignIn.instance;
    _googleInit ??= google.initialize(
      clientId: _isIos ? NativeSignInConfig.googleIosClientId : null,
      serverClientId: NativeSignInConfig.googleServerClientId,
    );
    try {
      await _googleInit;
      final account = await google.authenticate();
      final idToken = account.authentication.idToken;
      // Дараагийн удаа данс сонгох цонх дахин гарна (өөр хүүхэд ижил утсаар нэвтэрч болно).
      unawaited(google.signOut());
      if (idToken == null || idToken.isEmpty) throw const NativeSignInException(_googleFailed);
      return idToken;
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled || e.code == GoogleSignInExceptionCode.interrupted) {
        return null;
      }
      debugPrint('google: ${e.code}');
      throw const NativeSignInException(_googleFailed);
    }
  }

  @override
  Future<AppleCredential?> apple() async {
    final raw = generateRawNonce();
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        // Нэр, имэйл хэрэггүй — сервер бүртгэл үүсгэдэггүй.
        scopes: const [],
        nonce: sha256OfNonce(raw),
      );
      final token = credential.identityToken;
      if (token == null || token.isEmpty) throw const NativeSignInException(_appleFailed);
      return AppleCredential(identityToken: token, rawNonce: raw);
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) return null;
      debugPrint('apple: ${e.code}');
      throw const NativeSignInException(_appleFailed);
    } on SignInWithAppleException {
      throw const NativeSignInException(_appleFailed);
    }
  }
}

const _googleFailed = 'Google-ээр нэвтэрч чадсангүй. Түр хүлээгээд дахин оролдоно уу';
const _appleFailed = 'Apple-ээр нэвтэрч чадсангүй. Түр хүлээгээд дахин оролдоно уу';
