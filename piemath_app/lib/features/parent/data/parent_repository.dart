import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/cache/swr.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'parent_history.dart';
import 'parent_models.dart';
import 'weekly_report.dart';

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();

/// Эцэг эхийн API (`docs/api-contract/parent.md`). Эрх, баталгаажуулалт — сервер.
class ParentRepository {
  const ParentRepository(this._api);

  final ApiClient _api;

  Future<List<ParentLink>> children() => _api.get(
        '/parent/children',
        parse: (j) => [for (final e in j! as List) ParentLink.fromJson(_map(e))],
      );

  /// Хүүхэд холбох хүсэлт (`^\d{8}$`). Ажилтан баталгаажуулсны дараа мэдээлэл харагдана.
  Future<void> requestLink(String studentPhone) =>
      _api.post<Object?>('/parent/links', body: {'studentPhone': studentPhone});

  Future<ExamResultCardData> examResultCard(String testResultId) => _api.get(
        '/exam-results/parent/${Uri.encodeComponent(testResultId)}',
        parse: (j) => ExamResultCardData.fromJson(_map(j)),
      );

  /// Танилцах код ХҮҮХДИЙН имэйл рүү очно. Хариу: далдалсан имэйл.
  Future<String?> requestAck(String testResultId) => _api.post(
        '/parent/results/${Uri.encodeComponent(testResultId)}/ack/request',
        parse: (j) => _map(j)['maskedEmail'] as String?,
      );

  Future<void> verifyAck(String testResultId, String code) => _api.post<Object?>(
        '/parent/results/${Uri.encodeComponent(testResultId)}/ack/verify',
        body: {'code': code},
      );

  /// Бүтэн түүх: [year] — UTC жил (сервер 2000..одоо+1), [page] 1..1000, хуудас бүр 50 мөр.
  Future<ParentHistory> history({required String studentId, required int year, int page = 1}) => _api.get(
        '/parent/children/${Uri.encodeComponent(studentId)}/history',
        query: {'year': '$year', 'page': '$page'},
        parse: ParentHistory.fromJson,
      );

  /// Хүүхдийн эрхтэй бүлгийн онол (зураг, LaTeX). 403 «Энэ хичээлийг үзэх эрхгүй.», 404 «Хичээл олдсонгүй.»
  Future<ChildTheory> theory({required String studentId, required String chapterId}) => _api.get(
        '/parent/children/${Uri.encodeComponent(studentId)}/theory/${Uri.encodeComponent(chapterId)}',
        parse: ChildTheory.fromJson,
      );

  /// АНХААР: угтвар `/parents` (олон тоо). [week] — Даваа гарагийн `YYYY-MM-DD` (UB).
  Future<WeeklyReport> weeklyReport({required String studentId, required String week}) => _api.get(
        '/parents/weekly-report',
        query: {'studentId': studentId, 'week': week},
        parse: (j) => WeeklyReport.fromJson(_map(j)),
      );
}

final parentRepositoryProvider = Provider<ParentRepository>(
  (ref) => ParentRepository(ref.watch(apiClientProvider)),
);

final parentChildrenProvider = FutureProvider.autoDispose<List<ParentLink>>(
  (ref) => swr(ref, () => ref.watch(parentRepositoryProvider).children()),
);

final examResultCardProvider = FutureProvider.autoDispose.family<ExamResultCardData, String>(
  (ref, id) => ref.watch(parentRepositoryProvider).examResultCard(id),
);

final weeklyReportProvider =
    FutureProvider.autoDispose.family<WeeklyReport, ({String studentId, String week})>(
  (ref, a) => ref.watch(parentRepositoryProvider).weeklyReport(studentId: a.studentId, week: a.week),
);

final parentHistoryProvider =
    FutureProvider.autoDispose.family<ParentHistory, ({String studentId, int year, int page})>(
  (ref, a) => ref.watch(parentRepositoryProvider).history(studentId: a.studentId, year: a.year, page: a.page),
);

final childTheoryProvider =
    FutureProvider.autoDispose.family<ChildTheory, ({String studentId, String chapterId})>(
  (ref, a) => ref.watch(parentRepositoryProvider).theory(studentId: a.studentId, chapterId: a.chapterId),
);
