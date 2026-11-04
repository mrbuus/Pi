import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'students_admin_models.dart';

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) => [
  for (final e in (j as List?) ?? const [])
    if (e is Map) f(_map(e)),
];

String _enc(String v) => Uri.encodeComponent(v);

/// Сурагчдын удирдлагын API (вэбийн `StudentsDirectory`, `StudentActions`, импорт). Эрхийг СЕРВЕР шийднэ —
/// апп зөвхөн товч нуух/харуулна (`StudentsPerms`). Устгах үйлдэл байхгүй: архив, хасалт зөөлөн, аудиттай.
class StudentsAdminRepository {
  const StudentsAdminRepository(this._api);

  final ApiClient _api;

  /// Импортын нэг commit-д хамгийн ихдээ (сервер 100-аас олныг хүлээн авахгүй).
  static const importBatch = 100;

  // ───────── Жагсаалт ─────────

  /// Сурагчид. Архив зөвхөн Багш+/Админд (Багшид 403).
  Future<List<AdminStudent>> students({bool archived = false}) => _api.get(
    '/users',
    query: {'role': 'STUDENT', if (archived) 'archived': 'true'},
    // Хамгаалалт: холимог role ирвэл зөвхөн сурагч (вэбтэй ижил).
    parse: (j) => [
      for (final m in _list(j, (m) => m))
        if (m['role'] == null || m['role'] == 'STUDENT') AdminStudent.fromJson(m),
    ],
  );

  /// Тухайн сард (`YYYY-MM`) дутуу төлсөн сурагчид (санхүүгийн эрх).
  Future<List<OutstandingRow>> outstanding(String month) =>
      _api.get('/payments/outstanding', query: {'month': month}, parse: (j) => _list(j, OutstandingRow.fromJson));

  Future<AttentionData> attention() =>
      _api.get('/classrooms/attention-students', parse: (j) => AttentionData.fromJson(_map(j)));

  Future<List<ClassroomRef>> classrooms() async {
    final rows = await _api.get('/classrooms', parse: (j) => _list(j, ClassroomRef.fromJson));
    return rows..sort((a, b) => a.name.compareTo(b.name));
  }

  /// Танхимын сурагчийг гараар бүртгэх (`POST /users/students`). Нэвтрэх нэр, нууц үг = утас (сервер).
  /// Шинэ сурагчийн `id`, «Овог Нэр», кодыг буцаана.
  Future<({String id, String name, String? code})> createStudent(Map<String, Object?> body) => _api.post(
    '/users/students',
    body: body,
    parse: (j) {
      final m = _map(j);
      final name = [m['lastName'], m['firstName']].whereType<String>().join(' ').trim();
      final code = m['studentCode'];
      return (id: (m['id'] as String?) ?? '', name: name, code: code is String && code.isNotEmpty ? code : null);
    },
  );

  // ───────── Нэг сурагч ─────────

  Future<AdminStudentDetail> detail(String id) =>
      _api.get('/users/${_enc(id)}', parse: (j) => AdminStudentDetail.fromJson(_map(j)));

  Future<StudentPaymentHistory> paymentHistory(String id) =>
      _api.get('/payments/student/${_enc(id)}', parse: (j) => StudentPaymentHistory.fromJson(_map(j)));

  /// Өөрчилсөн талбарууд л (`PATCH /users/:id/profile`).
  Future<void> updateProfile(String id, Map<String, Object?> fields) =>
      _api.patch<Object?>('/users/${_enc(id)}/profile', body: fields);

  /// Анги солих: өмнөх бүртгэл хаагдаж шинэ нь нээгдэнэ (түүх хадгалагдана).
  Future<void> enroll(String classroomId, String studentId) =>
      _api.post<Object?>('/classrooms/${_enc(classroomId)}/enroll', body: {'studentId': studentId});

  /// Тооцоогүй архивлах (шалтгаан 3+ тэмдэгт). Зөөлөн, аудиттай.
  Future<void> archive(String id, String reason) =>
      _api.post<Object?>('/users/${_enc(id)}/archive', body: {'reason': reason.trim()});

  /// Сэргээх; [classroomId] өгвөл тэр ангид буцаана.
  Future<void> unarchive(String id, {String? classroomId}) => _api.post<Object?>(
    '/users/${_enc(id)}/unarchive',
    body: {if (classroomId != null && classroomId.isNotEmpty) 'classroomId': classroomId},
  );

  // ───────── Сургалтаас хасах ─────────

  Future<WithdrawalPreview> withdrawalPreview(
    String studentId, {
    required String leftOn,
    String? countFrom,
    List<String> exclude = const [],
  }) => _api.get(
    '/tuition/withdrawal/preview',
    query: {
      'studentId': studentId,
      'leftOn': leftOn,
      if (countFrom != null && countFrom.isNotEmpty) 'countFrom': countFrom,
      if (exclude.isNotEmpty) 'exclude': exclude.join(','),
    },
    parse: (j) => WithdrawalPreview.fromJson(_map(j)),
  );

  /// Хасаж, тооцоог хадгална (сурагч архивлагдана). Буцаах дүнг буцаана.
  Future<int> withdraw(
    String studentId, {
    required String leftOn,
    required String countFrom,
    required List<String> exclude,
    required String reason,
  }) => _api.post(
    '/tuition/withdrawal',
    body: {
      'studentId': studentId,
      'leftOn': leftOn,
      'countFrom': countFrom,
      'exclude': exclude,
      'reason': reason.trim(),
    },
    parse: (j) => (_map(j)['refund'] as num?)?.toInt() ?? 0,
  );

  Future<List<SavedWithdrawal>> withdrawals(String studentId) =>
      _api.get('/tuition/withdrawal/student/${_enc(studentId)}', parse: (j) => _list(j, SavedWithdrawal.fromJson));

  // ───────── Excel импорт (Админ) ─────────

  /// Файлыг шалгана (хадгалахгүй). Урьдчилан харах 15 минут хүчинтэй.
  Future<ImportPreview> importPreview(Uint8List bytes, String fileName) async {
    final form = FormData()
      ..files.add(
        MapEntry(
          'file',
          MultipartFile.fromBytes(
            bytes,
            filename: fileName,
            contentType: DioMediaType.parse('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
          ),
        ),
      );
    try {
      final res = await _api.dio.post<Object?>(
        '/users/students/import/preview',
        data: form,
        options: Options(
          headers: _api.authHeaders(),
          validateStatus: (_) => true,
          sendTimeout: const Duration(seconds: 60),
          receiveTimeout: const Duration(seconds: 60),
        ),
      );
      final status = res.statusCode ?? 0;
      if (status < 200 || status >= 300) throw ApiError.fromStatus(status, res.data);
      return ImportPreview.fromJson(_map(res.data));
    } on DioException catch (e) {
      throw ApiError.fromDio(e);
    }
  }

  Future<int> importCommit(String previewId, List<int> rowNumbers) => _api.post(
    '/users/students/import/commit',
    body: {'previewId': previewId, 'rowNumbers': rowNumbers},
    parse: (j) => (_map(j)['imported'] as num?)?.toInt() ?? 0,
  );

  /// Сонгосон мөрүүдийг 100-аар багцалж дараалуулан хадгална. Хэсэгчлэн амжилтгүй бол
  /// [ImportCommitError] (хэдэн мөр хадгалагдсаныг агуулна) — ижил preview-г дахин оролдоход
  /// сервер амжилттай багцыг давтахгүй.
  Future<int> importCommitAll(String previewId, List<int> rowNumbers) async {
    var done = 0;
    for (var i = 0; i < rowNumbers.length; i += importBatch) {
      final batch = rowNumbers.sublist(i, (i + importBatch).clamp(0, rowNumbers.length));
      try {
        done += await importCommit(previewId, batch);
      } catch (e) {
        throw ImportCommitError(e, imported: done, total: rowNumbers.length);
      }
    }
    return done;
  }
}

/// Импорт дундаас тасарсан.
class ImportCommitError implements Exception {
  const ImportCommitError(this.cause, {required this.imported, required this.total});

  final Object cause;
  final int imported;
  final int total;

  String get message {
    final base = cause is ApiError ? (cause as ApiError).message : 'Импорт амжилтгүй боллоо';
    if (imported == 0) return base;
    return '$base. Энэ оролдлогоор $imported/$total мөр хадгалагдсан. Дахин оролдоход хадгалсан мөр давхардахгүй';
  }
}

final studentsAdminRepositoryProvider = Provider<StudentsAdminRepository>(
  (ref) => StudentsAdminRepository(ref.watch(apiClientProvider)),
);
