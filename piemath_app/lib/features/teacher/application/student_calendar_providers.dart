import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/cache/keep_alive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import '../data/student_calendar_models.dart';

String _enc(String v) => Uri.encodeComponent(v);

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

/// Сурагчийн хуудасны хуанли, сэдэв хөтөлбөр, нөхөлтийн түүх, буцаах дүн. Эрх, тооцоо — сервер
/// (Багш — өөрийн ангийн сурагч; буцаах дүнгийн мөнгөн задаргааг Багшид сервер өгөхгүй).
class StudentCalendarRepository {
  const StudentCalendarRepository(this._api);

  final ApiClient _api;

  Future<LessonDaysResponse> lessonDays(String studentId, {required String from, required String to}) => _api.get(
    '/students/${_enc(studentId)}/lesson-days',
    query: {'from': from, 'to': to},
    parse: (j) => LessonDaysResponse.fromJson(_map(j)),
  );

  Future<SyllabusResponse> syllabus(String studentId) =>
      _api.get('/students/${_enc(studentId)}/syllabus', parse: (j) => SyllabusResponse.fromJson(_map(j)));

  Future<List<MakeupHistoryItem>> makeupHistory(String studentId) => _api.get(
    '/students/${_enc(studentId)}/makeup-visits',
    parse: (j) => [
      for (final e in (j is List ? j : const []))
        if (e is Map) MakeupHistoryItem.fromJson(_map(e)),
    ],
  );

  Future<List<LessonRecordRow>> lessonRecords(String studentId) => _api.get(
    '/lesson-records/student/${_enc(studentId)}',
    query: {'limit': 120},
    parse: (j) => [
      for (final e in (j is List ? j : const []))
        if (e is Map) LessonRecordRow.fromJson(_map(e)),
    ],
  );

  /// `GET /users/:id`-ийн одоогийн анги (+ зэрэг сууж буй бусад анги): «12-4 (Баруун 4) + НИЙГЭМ (Зүүн 4)».
  /// Ижил GET-ийг [studentDetailProvider]-тэй зэрэг дуудвал ApiClient нэг хүсэлт болгоно.
  Future<String?> classNames(String studentId) => _api.get(
    '/users/${_enc(studentId)}',
    parse: (j) {
      final m = _map(j);
      String? name(Object? c) =>
          c is Map && c['name'] is String && (c['name'] as String).isNotEmpty ? c['name'] as String : null;
      final names = [
        ?name(m['currentClassroom']),
        for (final o in (m['otherClassrooms'] is List ? m['otherClassrooms']! as List : const [])) ?name(o),
      ];
      return names.isEmpty ? null : names.join(' + ');
    },
  );

  Future<RefundEstimate> refundEstimate(String studentId) =>
      _api.get('/tuition/refund-estimate/${_enc(studentId)}', parse: (j) => RefundEstimate.fromJson(_map(j)));
}

final studentCalendarRepositoryProvider = Provider<StudentCalendarRepository>(
  (ref) => StudentCalendarRepository(ref.watch(apiClientProvider)),
);

/// Нэг сарын хичээлийн өдөр (`month` = «2026-11»).
typedef StudentMonth = ({String studentId, String month});

final studentLessonDaysProvider = FutureProvider.autoDispose.family<LessonDaysResponse, StudentMonth>((ref, a) {
  ref.cacheFor(const Duration(minutes: 5));
  final parts = a.month.split('-');
  final y = int.parse(parts[0]);
  final m = int.parse(parts[1]);
  final last = DateTime.utc(y, m + 1, 0).day.toString().padLeft(2, '0');
  return ref
      .watch(studentCalendarRepositoryProvider)
      .lessonDays(a.studentId, from: '${a.month}-01', to: '${a.month}-$last');
});

final studentLessonRecordsProvider = FutureProvider.autoDispose.family<List<LessonRecordRow>, String>((ref, id) {
  ref.cacheFor(const Duration(minutes: 5));
  return ref.watch(studentCalendarRepositoryProvider).lessonRecords(id);
});

final studentSyllabusProvider = FutureProvider.autoDispose.family<SyllabusResponse, String>((ref, id) {
  ref.cacheFor(const Duration(minutes: 5));
  return ref.watch(studentCalendarRepositoryProvider).syllabus(id);
});

/// Нөхөлтийн түүх. Алдаа (эрхгүй, сүлжээ) гарвал хоосон — хэсэг зүгээр л харагдахгүй (вэбтэй ижил).
final studentMakeupHistoryProvider = FutureProvider.autoDispose.family<List<MakeupHistoryItem>, String>((
  ref,
  id,
) async {
  try {
    return await ref.watch(studentCalendarRepositoryProvider).makeupHistory(id);
  } catch (_) {
    return const [];
  }
});

/// Сурагчийн анги(ууд)-ын нэр (хоёр ангид зэрэг суувал «+»-оор). Алдаа гарвал null.
final studentClassNamesProvider = FutureProvider.autoDispose.family<String?, String>((ref, id) async {
  try {
    return await ref.watch(studentCalendarRepositoryProvider).classNames(id);
  } catch (_) {
    return null;
  }
});

/// «Одоо гарвал буцаах дүн». Алдаа гарвал null — мөр харагдахгүй (вэбтэй ижил).
final studentRefundEstimateProvider = FutureProvider.autoDispose.family<RefundEstimate?, String>((ref, id) async {
  try {
    return await ref.watch(studentCalendarRepositoryProvider).refundEstimate(id);
  } catch (_) {
    return null;
  }
});
