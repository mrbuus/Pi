import '../../../core/auth/user_role.dart';

/// `POST /auth/login`, `POST /auth/change-password` — `docs/api-contract/auth.md`.
class TokenResult {
  const TokenResult({required this.accessToken, required this.userId, required this.role});

  factory TokenResult.fromJson(Object? json) {
    final m = (json! as Map).cast<String, Object?>();
    return TokenResult(
      accessToken: m['accessToken']! as String,
      userId: m['userId']! as String,
      role: UserRole.fromApi(m['role'] as String?),
    );
  }

  final String accessToken;
  final String userId;
  final UserRole role;
}

/// `POST /auth/forgot-password` — бүртгэл байгаа эсэхийг илчлэхгүй, хариу үргэлж ижил.
class ForgotResult {
  const ForgotResult({
    required this.maskedTo,
    required this.expiresInSeconds,
    required this.linkExpiresInSeconds,
    required this.sms,
    required this.email,
  });

  factory ForgotResult.fromJson(Object? json) {
    final m = (json! as Map).cast<String, Object?>();
    final channels = (m['channels'] as Map?)?.cast<String, Object?>();
    return ForgotResult(
      maskedTo: (m['maskedTo'] as String?) ?? '****',
      expiresInSeconds: (m['expiresInSeconds'] as num?)?.toInt() ?? 600,
      linkExpiresInSeconds: (m['linkExpiresInSeconds'] as num?)?.toInt() ?? 1800,
      // Хуучин сервер `channels` илгээдэггүй байсан — вэбийн адил SMS гэж үзнэ.
      sms: channels == null || channels['sms'] == true,
      email: channels?['email'] == true,
    );
  }

  final String maskedTo;
  final int expiresInSeconds;
  final int linkExpiresInSeconds;

  /// СИСТЕМИЙН тохиргоо (хэрэглэгчийнх биш).
  final bool sms;
  final bool email;
}

/// `GET/POST /consent/my`.
class ConsentStatus {
  const ConsentStatus({
    required this.needsConsent,
    required this.currentVersion,
    this.privacyVersion,
    this.termsAcceptedAt,
    this.guardianConsentAt,
  });

  factory ConsentStatus.fromJson(Object? json) {
    final m = (json! as Map).cast<String, Object?>();
    return ConsentStatus(
      needsConsent: m['needsConsent'] == true,
      currentVersion: (m['currentVersion'] as String?) ?? '',
      privacyVersion: m['privacyVersion'] as String?,
      termsAcceptedAt: m['termsAcceptedAt'] as String?,
      guardianConsentAt: m['guardianConsentAt'] as String?,
    );
  }

  final bool needsConsent;
  final String currentVersion;
  final String? privacyVersion;
  final String? termsAcceptedAt;
  final String? guardianConsentAt;
}
