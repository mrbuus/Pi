import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/time/ub_time.dart';
import 'auth_models.dart';

/// `POST /auth/google/native`, `POST /auth/apple` — `docs/api-contract/mobile-server.md` §3.
sealed class NativeLoginResult {
  const NativeLoginResult();

  factory NativeLoginResult.fromJson(Object? json) {
    final m = (json! as Map).cast<String, Object?>();
    return switch (m['status']) {
      'ok' => NativeLoginOk(TokenResult.fromJson(m)),
      'signup' => NativeLoginSignup(ticket: m['ticket'] as String?),
      'not_linked' => const NativeLoginNotLinked(),
      _ => throw const FormatException('Тодорхойгүй хариу'),
    };
  }
}

final class NativeLoginOk extends NativeLoginResult {
  const NativeLoginOk(this.token);

  final TokenResult token;
}

/// Зөвхөн Google: бүртгэлгүй Gmail. [ticket]-ээр апп доторх `/register` Gmail-ийг урьдчилж бөглөнө.
final class NativeLoginSignup extends NativeLoginResult {
  const NativeLoginSignup({this.ticket});

  final String? ticket;
}

/// Бүртгэл байгаа ч холбогдоогүй — утсаараа нэвтэрч профайлаас холбоно (имэйлээр автоматаар холбохгүй).
final class NativeLoginNotLinked extends NativeLoginResult {
  const NativeLoginNotLinked();
}

/// `.../link` — `taken` = өөр хэрэглэгчид холбогдсон.
enum LinkResult { linked, taken }

/// `GET /auth/google/status`.
class GoogleLinkStatus {
  const GoogleLinkStatus({required this.linked, this.email});

  factory GoogleLinkStatus.fromJson(Object? json) {
    final m = (json! as Map).cast<String, Object?>();
    final identity = (m['identity'] as Map?)?.cast<String, Object?>();
    return GoogleLinkStatus(linked: m['linked'] == true, email: identity?['email'] as String?);
  }

  final bool linked;
  final String? email;
}

enum DeletionStatus {
  pending,
  inReview,
  resolved,
  rejected;

  static DeletionStatus fromApi(String? v) => switch (v) {
        'IN_REVIEW' => inReview,
        'RESOLVED' => resolved,
        'REJECTED' => rejected,
        _ => pending,
      };

  /// Админ шийдвэрлээгүй — дахин илгээх шаардлагагүй.
  bool get isOpen => this == pending || this == inReview;

  String get labelMn => switch (this) {
        pending => 'Хүлээн авсан',
        inReview => 'Шалгаж байна',
        resolved => 'Шийдвэрлэсэн',
        rejected => 'Татгалзсан',
      };
}

/// `GET/POST /me/deletion-request` — §4.
class DeletionRequest {
  const DeletionRequest({
    required this.id,
    required this.status,
    this.reason,
    this.createdAt,
    this.reviewedAt,
    this.reviewNote,
  });

  factory DeletionRequest.fromJson(Map<String, Object?> m) => DeletionRequest(
        id: m['id']! as String,
        status: DeletionStatus.fromApi(m['status'] as String?),
        reason: m['reason'] as String?,
        createdAt: parseApiInstant(m['createdAt'] as String?),
        reviewedAt: parseApiInstant(m['reviewedAt'] as String?),
        reviewNote: m['reviewNote'] as String?,
      );

  final String id;
  final DeletionStatus status;
  final String? reason;
  final DateTime? createdAt;
  final DateTime? reviewedAt;
  final String? reviewNote;
}

/// `POST /me/deletion-request` — нээлттэй хүсэлт байвал `created: false` (давхар үүсэхгүй).
class DeletionSubmitResult {
  const DeletionSubmitResult({required this.created, required this.request});

  final bool created;
  final DeletionRequest request;
}

/// Google/Apple нэвтрэлт, холболт, бүртгэл устгах хүсэлтийн API.
class AccountRepository {
  const AccountRepository(this._api);

  final ApiClient _api;

  Future<NativeLoginResult> googleLogin({required String idToken, required bool remember}) => _api.post(
        '/auth/google/native',
        body: {'idToken': idToken, 'remember': remember},
        parse: NativeLoginResult.fromJson,
        auth: false,
      );

  /// [rawNonce] нь Apple-д өгсөн SHA-256-ийн ТҮҮХИЙ утга (заавал).
  Future<NativeLoginResult> appleLogin({
    required String identityToken,
    required String rawNonce,
    required bool remember,
  }) =>
      _api.post(
        '/auth/apple',
        body: {'identityToken': identityToken, 'nonce': rawNonce, 'remember': remember},
        parse: NativeLoginResult.fromJson,
        auth: false,
      );

  Future<LinkResult> googleLink(String idToken) =>
      _api.post('/auth/google/native/link', body: {'idToken': idToken}, parse: _parseLink);

  Future<LinkResult> appleLink({required String identityToken, required String rawNonce}) => _api.post(
        '/auth/apple/link',
        body: {'identityToken': identityToken, 'nonce': rawNonce},
        parse: _parseLink,
      );

  Future<GoogleLinkStatus> googleStatus() => _api.get('/auth/google/status', parse: GoogleLinkStatus.fromJson);

  Future<void> googleUnlink() => _api.delete<Object?>('/auth/google/link');

  Future<DeletionRequest?> deletionRequest() => _api.get('/me/deletion-request', parse: (j) {
        final r = ((j as Map?)?['request'] as Map?)?.cast<String, Object?>();
        return r == null ? null : DeletionRequest.fromJson(r);
      });

  Future<DeletionSubmitResult> submitDeletionRequest(String? reason) {
    final trimmed = reason?.trim() ?? '';
    return _api.post(
      '/me/deletion-request',
      body: {if (trimmed.isNotEmpty) 'reason': trimmed},
      parse: (j) {
        final m = (j! as Map).cast<String, Object?>();
        return DeletionSubmitResult(
          created: m['created'] == true,
          request: DeletionRequest.fromJson((m['request']! as Map).cast<String, Object?>()),
        );
      },
    );
  }

  /// `POST /auth/me/avatar` `{key}` — [key] нь `POST /uploads`-аар авсан файлын түлхүүр. Шинэ `avatarUrl` (файлын түлхүүр) буцаана.
  Future<String?> setAvatar(String key) => _api.post(
        '/auth/me/avatar',
        body: {'key': key},
        parse: (j) => (j is Map ? j['avatarUrl'] : null) as String?,
      );

  static LinkResult _parseLink(Object? json) =>
      (json as Map?)?['result'] == 'taken' ? LinkResult.taken : LinkResult.linked;
}

final accountRepositoryProvider =
    Provider<AccountRepository>((ref) => AccountRepository(ref.watch(apiClientProvider)));
