import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'enrollment_models.dart';

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) => [
  for (final e in (j as List?) ?? const [])
    if (e is Map) f(_map(e)),
];

String _enc(String v) => Uri.encodeComponent(v);

/// Элсэлтийн удирдлагын API (вэбийн `/app/admin/enrollment`-тэй ижил зам). Эрхийг СЕРВЕР шийднэ:
///
/// | Дуудлага | Эрх |
/// |---|---|
/// | `GET /enrollment-windows` | нийтэд нээлттэй |
/// | `PATCH /enrollment-windows/:subject` | Админ, Багш+ |
/// | `GET /classrooms/unassigned-students` | Админ, Багш+ |
/// | `GET /teacher-groups/unverified`, `/verified`, `PUT verify`, `reject`, `reconsider` | Админ, Багш+ |
/// | `PUT /teacher-groups/unverify/:id` | зөвхөн Админ |
/// | `POST /passes/:id/grant` | Админ, Багш+ (`finance.manage`) |
///
/// Устгах үйлдэл байхгүй: татгалзал нь тэмдэглэл, цуцлалт нь огноог арилгана — бүртгэл хэвээр.
class EnrollmentRepository {
  const EnrollmentRepository(this._api);

  final ApiClient _api;

  // ───────── Элсэлтийн цонх ─────────

  Future<List<EnrollmentWindow>> windows() => _api.get(
    '/enrollment-windows',
    parse: (j) => [
      for (final m in _list(j, (m) => m)) ?EnrollmentWindow.tryParse(m),
    ],
  );

  /// Зөвхөн дамжуулсан талбарыг шинэчилнэ (сервер бусдыг хэвээр үлдээнэ).
  Future<EnrollmentWindow> updateWindow(
    EnrollmentSubject subject, {
    EnrollmentStatus? status,
    SubjectAvailability? availability,
    String? note,
  }) => _api.patch(
    '/enrollment-windows/${subject.api}',
    body: {'status': ?status?.api, 'availability': ?availability?.api, 'note': ?note},
    parse: (j) =>
        EnrollmentWindow.tryParse(_map(j)) ??
        EnrollmentWindow(
          subject: subject,
          status: status ?? EnrollmentStatus.closed,
          availability: availability ?? SubjectAvailability.both,
          note: note,
        ),
  );

  /// «Бүгдийг нэг дор»: бүх хичээлийн төлвийг ижил болгоно (вэбтэй ижил — хичээл бүрт нэг PATCH).
  Future<List<EnrollmentWindow>> setAllStatus(List<EnrollmentWindow> current, EnrollmentStatus status) =>
      Future.wait([for (final w in current) updateWindow(w.subject, status: status)]);

  // ───────── Ангид ороогүй сурагчид ─────────

  Future<List<WaitingStudent>> unassignedStudents() =>
      _api.get('/classrooms/unassigned-students', parse: (j) => _list(j, WaitingStudent.fromJson));

  // ───────── Гадны багш ─────────

  Future<ExternalTeachers> externalTeachers() async {
    final r = await Future.wait([
      _api.get('/teacher-groups/unverified', parse: (j) => _list(j, ExternalTeacher.unverified)),
      _api.get('/teacher-groups/verified', parse: (j) => _list(j, ExternalTeacher.verified)),
    ]);
    return ExternalTeachers(unverified: r[0], verified: r[1]);
  }

  /// Баталгаажуулна; хоосон тэмдэглэлийг илгээхгүй (вэбтэй ижил).
  Future<void> verifyTeacher(String id, {String note = ''}) => _api.put<Object?>(
    '/teacher-groups/verify/${_enc(id)}',
    body: {if (note.trim().isNotEmpty) 'note': note.trim()},
  );

  /// Шалтгаантай татгалзана (1–450 тэмдэгт). Бүртгэл устахгүй, «Татгалзсан» жагсаалтад шилжинэ.
  Future<void> rejectTeacher(String id, String reason) =>
      _api.put<Object?>('/teacher-groups/reject/${_enc(id)}', body: {'reason': reason.trim()});

  /// Татгалзсан хүсэлтийг хүлээгдэж буй руу буцаана.
  Future<void> reconsiderTeacher(String id) => _api.put<Object?>('/teacher-groups/reconsider/${_enc(id)}');

  /// Баталгаажуулалтыг цуцлах — зөвхөн Админ. Тэмдэглэл, бүлгүүд хэвээр.
  Future<void> unverifyTeacher(String id) => _api.put<Object?>('/teacher-groups/unverify/${_enc(id)}');

  // ───────── Эрх олгох ─────────

  /// Идэвхтэй эрхүүд (дэлгүүрийн жагсаалт).
  Future<List<PassOption>> passes() async {
    final rows = await _api.get('/catalog/passes', parse: (j) => _list(j, PassOption.fromJson));
    return rows..sort((a, b) => a.name.compareTo(b.name));
  }

  /// Сурагчид эрх гараар олгоно (`finance.manage` шаардана). Тэмдэглэл аудитад хадгалагдана.
  Future<void> grantPass(String passId, String userId, {String note = ''}) => _api.post<Object?>(
    '/passes/${_enc(passId)}/grant',
    body: {'userId': userId, if (note.trim().isNotEmpty) 'note': note.trim()},
  );
}

final enrollmentRepositoryProvider = Provider<EnrollmentRepository>(
  (ref) => EnrollmentRepository(ref.watch(apiClientProvider)),
);
