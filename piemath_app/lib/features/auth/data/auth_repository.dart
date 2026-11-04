import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'auth_models.dart';

/// Нэвтрэлт, нууц үг, зөвшөөрлийн API (`docs/api-contract/auth.md`).
class AuthRepository {
  const AuthRepository(this._api);

  final ApiClient _api;

  /// Нэвтрэх. [identifier] нь зөвхөн `trim()` (имэйл case-sensitive — өөрчлөхгүй).
  Future<TokenResult> login({required String identifier, required String password, required bool remember}) =>
      _api.post(
        '/auth/login',
        body: {'identifier': identifier.trim(), 'password': password, 'remember': remember},
        parse: TokenResult.fromJson,
        auth: false,
      );

  /// Нэвтрэх хуудасны зарлал (хоосон байж болно).
  Future<String> loginText() => _api.get(
        '/auth/login-text',
        parse: (j) => ((j as Map?)?['body'] as String?)?.trim() ?? '',
        auth: false,
      );

  Future<ForgotResult> forgotPassword(String identifier) => _api.post(
        '/auth/forgot-password',
        body: {'identifier': identifier.trim()},
        parse: ForgotResult.fromJson,
        auth: false,
      );

  Future<void> resetPassword({required String identifier, required String code, required String newPassword}) =>
      _api.post<Object?>(
        '/auth/reset-password',
        body: {'identifier': identifier.trim(), 'code': code, 'newPassword': newPassword},
        auth: false,
      );

  Future<void> resetPasswordWithLink({required String token, required String newPassword}) => _api.post<Object?>(
        '/auth/reset-password/link',
        body: {'token': token, 'newPassword': newPassword},
        auth: false,
      );

  /// Амжилттай бол ШИНЭ токен (хуучин нь хүчингүй болсон) — `SessionController.replaceToken`.
  Future<TokenResult> changePassword({required String currentPassword, required String newPassword}) => _api.post(
        '/auth/change-password',
        body: {'currentPassword': currentPassword, 'newPassword': newPassword},
        parse: TokenResult.fromJson,
      );

  Future<ConsentStatus> consentStatus() => _api.get('/consent/my', parse: ConsentStatus.fromJson);

  Future<ConsentStatus> saveConsent({
    required String privacyVersion,
    required bool isMinor,
    required bool guardianConsent,
  }) =>
      _api.post(
        '/consent/my',
        body: {
          'acceptTerms': true,
          'privacyVersion': privacyVersion,
          'isMinor': isMinor,
          if (isMinor) 'guardianConsent': guardianConsent,
        },
        parse: ConsentStatus.fromJson,
      );
}

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository(ref.watch(apiClientProvider)));
