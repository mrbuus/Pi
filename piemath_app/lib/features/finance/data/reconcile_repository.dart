import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'reconcile_models.dart';

/// Банкны тулгалт (`/reconcile/*`). Эрх: ADMIN, TEACHER_PLUS + `finance.manage` (серверт).
class ReconcileRepository {
  ReconcileRepository(this._api);

  final ApiClient _api;

  static const pageSize = 50;

  /// Багш+-ын санхүүгийн эрх (`GET /staff-capabilities/me`) — бүх ангид олгогдсон `finance.manage`.
  Future<bool> hasFinanceCapability() => _api.get(
    '/staff-capabilities/me',
    parse: (j) {
      final m = j is Map ? j : const <String, Object?>{};
      if (m['administrator'] == true) return true;
      return [
        for (final g in (m['grants'] as List?) ?? const [])
          if (g is Map) g,
      ].any((g) => g['capability'] == 'finance.manage' && (g['scopeKey'] == null || g['scopeKey'] == ''));
    },
  );

  /// Гүйлгээний жагсаалт (шинэ нь эхэнд).
  Future<TransactionPage> transactions({BankMatchStatus? status, int offset = 0, int limit = pageSize}) => _api.get(
    '/reconcile/transactions',
    query: {
      if (status != null && status != BankMatchStatus.unknown) 'status': status.api,
      'limit': '$limit',
      'offset': '$offset',
    },
    parse: TransactionPage.fromJson,
  );

  /// Дээд талын тоонууд — төлөв бүрийн `total`-ыг серверээс (вэбтэй ижил `limit=1`).
  Future<ReconcileSummary> summary() async {
    Future<int> count(BankMatchStatus? s) async => (await transactions(status: s, limit: 1)).total;
    final r = await Future.wait([
      count(null),
      count(BankMatchStatus.unmatched),
      count(BankMatchStatus.autoMatched),
      count(BankMatchStatus.manualMatched),
      count(BankMatchStatus.ignored),
    ]);
    return ReconcileSummary(total: r[0], unmatched: r[1], autoMatched: r[2], manualMatched: r[3], ignored: r[4]);
  }

  /// Сурагч хайх (нэр, сурагчийн код, нэвтрэх нэр) — 2-оос дээш тэмдэгт. Сервер массив буцаана.
  Future<List<StudentHit>> searchStudents(String q) async {
    final query = q.trim();
    final hits = await _api.get(
      '/users/search',
      query: {'q': query},
      parse: (j) {
        final list = j is List ? j : (j is Map && j['items'] is List ? j['items'] as List : const <Object?>[]);
        return [
          for (final s in list)
            if (s is Map) StudentHit.fromJson(s),
        ];
      },
    );
    return rankStudentHits(query, hits);
  }

  /// Гараар холбох — сервер ХҮЛЭЭГДЭЖ БУЙ төлбөр үүсгэнэ. Хүсэлт ХЭЗЭЭ Ч автоматаар давтагдахгүй.
  Future<BankTransaction> match(String transactionId, String userId) => _api.post(
    '/reconcile/${Uri.encodeComponent(transactionId)}/match',
    body: {'userId': userId},
    parse: BankTransaction.fromJson,
  );

  /// Төлбөр биш гэж тэмдэглэх (`IGNORED`, 204).
  Future<void> ignore(String transactionId) =>
      _api.post<Object?>('/reconcile/${Uri.encodeComponent(transactionId)}/ignore');

  /// Банкны хуулга оруулах (multipart `file`). Сервер Хаан банкны толгойг өөрөө таньдаг тул
  /// баганын зураглал (`config`) илгээхгүй — сервер түүнийг ашигладаггүй.
  Future<ImportResult> importStatement(Uint8List bytes, StatementPreview file) async {
    final form = FormData()
      ..files.add(
        MapEntry(
          'file',
          MultipartFile.fromBytes(bytes, filename: file.name, contentType: DioMediaType.parse(file.mimeType)),
        ),
      );
    try {
      final res = await _api.dio.post<Object?>(
        '/reconcile/import',
        data: form,
        options: Options(
          headers: _api.authHeaders(),
          validateStatus: (_) => true,
          sendTimeout: const Duration(seconds: 90),
          receiveTimeout: const Duration(seconds: 90),
        ),
      );
      final status = res.statusCode ?? 0;
      if (status < 200 || status >= 300) throw ApiError.fromStatus(status, res.data);
      return ImportResult.fromJson(res.data);
    } on DioException catch (e) {
      throw ApiError.fromDio(e);
    }
  }
}

final reconcileRepositoryProvider = Provider<ReconcileRepository>(
  (ref) => ReconcileRepository(ref.watch(apiClientProvider)),
);
