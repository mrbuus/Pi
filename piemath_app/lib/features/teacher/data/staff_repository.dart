import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'class_dashboard_models.dart';
import 'staff_models.dart';

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();

List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) => [
  for (final e in (j as List?) ?? const []) if (e is Map) f(_map(e)),
];

String _enc(String v) => Uri.encodeComponent(v);

/// Багш, Багш+, Админы нэмэлт API: ангийн самбар (`/class-dashboard*`), самбарын нэмэлт,
/// хүлээгдэж буй үйлдэл, зар, эрх. Эрхийг сервер шийднэ (`docs/api-contract/teacher.md`).
/// Мөнгөн дүн энд ЗОРИУД унших/харуулахгүй — зөвхөн төлбөрийн төлөв.
class StaffRepository {
  const StaffRepository(this._api);

  final ApiClient _api;

  // ───────── Ангийн самбар (вэбтэй ижил endpoint) ─────────

  Future<DashList> classDashboard() => _api.get('/class-dashboard', parse: (j) => DashList.fromJson(_map(j)));

  Future<DashDetail> classDashboardDetail(String id) =>
      _api.get('/class-dashboard/classes/${_enc(id)}', parse: (j) => DashDetail.fromJson(_map(j)));

  // ───────── Самбарын нэмэлт ─────────

  Future<ClassAttention> attention(String classId, String date) => _api.get(
    '/classrooms/${_enc(classId)}/attention',
    query: {'date': date},
    parse: (j) => ClassAttention.fromJson(_map(j)),
  );

  Future<DailySummary> dailySummary(String classId, String date) => _api.get(
    '/classrooms/${_enc(classId)}/daily-summary',
    query: {'date': date},
    parse: (j) => DailySummary.fromJson(_map(j)),
  );

  Future<List<MakeupRow>> makeupBoard(String classId, String date) =>
      _api.get('/makeup/classrooms/${_enc(classId)}', query: {'date': date}, parse: (j) => _list(j, MakeupRow.fromJson));

  /// Хугацааны цонхоор (ангийн «Нөхөх» таб).
  Future<List<MakeupRow>> makeupRange(String classId, {required String from, required String to}) => _api.get(
    '/makeup/classrooms/${_enc(classId)}',
    query: {'from': from, 'to': to},
    parse: (j) => _list(j, MakeupRow.fromJson),
  );

  Future<OnlineMarks> onlineMarks(String classId, String date) => _api.get(
    '/classrooms/${_enc(classId)}/homework-marks/online',
    query: {'date': date},
    parse: (j) => OnlineMarks.fromJson(_map(j)),
  );

  // ───────── Багш+, Админ ─────────

  Future<List<ParentLinkRequest>> pendingParentLinks() =>
      _api.get('/parent/links/pending', parse: (j) => _list(j, ParentLinkRequest.fromJson));

  Future<void> verifyParentLink(String id) => _api.post<Object?>('/parent/links/${_enc(id)}/verify');

  Future<void> rejectParentLink(String id) => _api.post<Object?>('/parent/links/${_enc(id)}/reject');

  Future<AttentionStudents> attentionStudents() =>
      _api.get('/classrooms/attention-students', parse: (j) => AttentionStudents.fromJson(_map(j)));

  Future<List<PendingStudent>> pendingStudents() =>
      _api.get('/users/students/pending-approval', parse: (j) => _list(j, PendingStudent.fromJson));

  Future<void> approveStudent(String id) => _api.post<Object?>('/users/students/${_enc(id)}/approve');

  Future<List<PendingPayment>> pendingPayments() =>
      _api.get('/payments', query: {'status': 'PENDING'}, parse: (j) => _list(j, PendingPayment.fromJson));

  /// Эрх олгохгүйгээр баталгаажуулна (вэбийн «Эрх олгохгүй» анхдагч). Эрх олгох нь вэбээр.
  Future<void> confirmPayment(String id) => _api.post<Object?>('/payments/${_enc(id)}/confirm', body: const {});

  Future<List<Lead>> leads() => _api.get('/leads', parse: (j) => _list(j, Lead.fromJson));

  Future<void> setLeadStatus(String id, LeadStatus status) =>
      _api.patch<Object?>('/leads/${_enc(id)}/status', body: {'status': status.api});

  // ───────── Эрх, цаг ─────────

  Future<StaffCaps> myCapabilities() =>
      _api.get('/staff-capabilities/me', parse: (j) => StaffCaps.fromJson(_map(j)));

  // ───────── Зар ─────────

  Future<List<AnnouncementItem>> announcements() =>
      _api.get('/announcements/manage', parse: (j) => _list(j, AnnouncementItem.fromJson));

  Future<void> postAnnouncement({
    required String title,
    required String body,
    required AnnouncementAudience audience,
    required bool pinned,
    List<String> classroomIds = const [],
  }) => _api.post<Object?>(
    '/announcements',
    body: {
      'title': title.trim(),
      'body': body.trim(),
      'audience': audience.api,
      'pinned': pinned,
      if (audience == AnnouncementAudience.selected) 'classroomIds': classroomIds,
    },
  );
}

final staffRepositoryProvider = Provider<StaffRepository>((ref) => StaffRepository(ref.watch(apiClientProvider)));
