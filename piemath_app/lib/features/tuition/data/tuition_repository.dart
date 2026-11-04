import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'tuition_models.dart';

/// Сургалтын төлбөрийн буцаалт (`/tuition/*`). Эрх: ADMIN, TEACHER_PLUS + `finance.manage` (серверт).
class TuitionRepository {
  TuitionRepository(this._api);

  final ApiClient _api;

  static const pageSize = 20;

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

  /// Сурагч хайх (нэр, код) — 2-оос дээш тэмдэгт.
  Future<List<StudentHit>> searchStudents(String q) => _api.get(
    '/users/search',
    query: {'q': q.trim()},
    parse: (j) => [
      for (final s in (j as List?) ?? const [])
        if (s is Map) StudentHit.fromJson(s),
    ],
  );

  /// Сурагчийн идэвхтэй анги.
  Future<StudentClassInfo> studentClass(String studentId) =>
      _api.get('/users/${Uri.encodeComponent(studentId)}', parse: StudentClassInfo.fromJson);

  /// Буцаалтын тооцоо (хадгалахгүй).
  Future<RefundPreview> preview({required String studentId, required String classroomId, required String leftOn}) =>
      _api.get(
        '/tuition/refund/preview',
        query: {'studentId': studentId, 'classroomId': classroomId, 'leftOn': leftOn},
        parse: RefundPreview.fromJson,
      );

  /// Буцаалтын ноорог үүсгэнэ. Хүсэлт ХЭЗЭЭ Ч автоматаар давтагдахгүй.
  ///
  /// Idempotent: сервер давхар буцаалтыг татгалзвал (эсвэл хариу ирэхээс өмнө холболт тасарвал)
  /// энэ сурагч, ангийн одоо байгаа буцаалтыг хайж олоод түүнийг буцаана — шинээр үүсгэхгүй.
  Future<RefundCreated> create({required String studentId, required String classroomId, required String leftOn}) async {
    try {
      final id = await _api.post(
        '/tuition/refund',
        body: {'studentId': studentId, 'classroomId': classroomId, 'leftOn': leftOn},
        parse: (j) {
          final id = j is Map ? j['id'] : null;
          if (id is! String || id.isEmpty) throw const FormatException('id');
          return id;
        },
      );
      return RefundCreated(id);
    } on ApiError catch (e) {
      final duplicate = e.kind == ApiErrorKind.badRequest || e.kind == ApiErrorKind.conflict;
      if (!duplicate && !e.isNetwork) rethrow;
      final existing = await _findExisting(studentId, classroomId, leftOn, anyDraft: duplicate).catchError((_) => null);
      if (existing == null) rethrow;
      return RefundCreated(existing, existed: true);
    }
  }

  /// Серверийн давхардлын дүрэм: ижил сурагч + анги дээр ноорог, эсвэл ижил өдрийн цуцлаагүй буцаалт.
  Future<String?> _findExisting(String studentId, String classroomId, String leftOn, {required bool anyDraft}) async {
    final page = await list(studentId: studentId, classroomId: classroomId, limit: 50);
    for (final r in page.refunds) {
      if (r.status == RefundStatus.cancelled) continue;
      if (r.leftOnKey == leftOn || (anyDraft && r.status == RefundStatus.draft)) return r.id;
    }
    return null;
  }

  /// Буцаалтын жагсаалт (шинэ нь эхэнд).
  Future<RefundListPage> list({
    RefundStatus? status,
    String? studentId,
    String? classroomId,
    int offset = 0,
    int limit = pageSize,
  }) => _api.get(
    '/tuition/refunds',
    query: {
      'limit': '$limit',
      'offset': '$offset',
      if (status != null && status != RefundStatus.unknown) 'status': status.api,
      'studentId': ?studentId,
      'classroomId': ?classroomId,
    },
    parse: RefundListPage.fromJson,
  );

  Future<RefundRecord> get(String id) =>
      _api.get('/tuition/refund/${Uri.encodeComponent(id)}', parse: RefundRecord.fromJson);

  /// Ноорог → зөвшөөрөл хүлээж буй.
  Future<void> submitForApproval(String id) => _action(id, 'pending');

  /// Зөвшөөрөх (вэбд зөвхөн Админ).
  Future<void> approve(String id) => _action(id, 'approve');

  /// Олгосон гэж тэмдэглэх (вэбд зөвхөн Админ).
  Future<void> markPaid(String id, String paymentMethod) => _action(id, 'paid', body: {'paymentMethod': paymentMethod});

  /// Цуцлах (шалтгаантай).
  Future<void> cancel(String id, String reason) => _action(id, 'cancel', body: {'cancelReason': reason.trim()});

  Future<void> _action(String id, String path, {Map<String, Object?>? body}) =>
      _api.post<Object?>('/tuition/refund/${Uri.encodeComponent(id)}/$path', body: body);
}

final tuitionRepositoryProvider = Provider<TuitionRepository>((ref) => TuitionRepository(ref.watch(apiClientProvider)));
