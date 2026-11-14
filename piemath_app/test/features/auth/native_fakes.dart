import 'package:piemath_app/features/auth/data/native_sign_in.dart';

/// Google/Apple плагины хуурамч хувилбар — жинхэнэ SDK дуудахгүй.
class FakeNativeSignIn implements NativeSignIn {
  FakeNativeSignIn({this.google = true, this.appleOn = true, this.googleToken = 'g-id', this.appleToken = 'a-id'});

  bool google;
  bool appleOn;

  /// `null` = хэрэглэгч цуцалсан.
  String? googleToken;
  String? appleToken;
  Object? throwOnGoogle;

  int googleCalls = 0;
  int appleCalls = 0;
  String? lastRawNonce;

  @override
  bool get googleConfigured => google;

  @override
  Future<bool> appleAvailable() async => appleOn;

  @override
  Future<String?> googleIdToken() async {
    googleCalls++;
    final t = throwOnGoogle;
    if (t != null) throw t;
    return googleToken;
  }

  @override
  Future<AppleCredential?> apple() async {
    appleCalls++;
    final token = appleToken;
    if (token == null) return null;
    lastRawNonce = generateRawNonce();
    return AppleCredential(identityToken: token, rawNonce: lastRawNonce!);
  }
}
