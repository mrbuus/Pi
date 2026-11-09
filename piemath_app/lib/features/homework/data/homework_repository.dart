import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import '../domain/homework_history_logic.dart';
import 'homework_models.dart';

/// Гэрийн даалгаврын API (`docs/api-contract/homework.md`). Бизнесийн дүрэм серверт.
class HomeworkRepository {
  HomeworkRepository(this._api);

  final ApiClient _api;

  /// Танхимын загвар: сүүлийн [days] хоног + ирэх 7 хоногийн хичээлийн өдрүүд.
  Future<List<HwDay>> myDays({int days = 14}) => _api.get(
        '/homework/my',
        query: {'days': days},
        parse: (j) => [for (final d in ((j! as Map)['days'] as List? ?? const [])) HwDay.fromJson(d)],
      );

  /// Тухайн өдрийн дэвтрийн зураг (өмнөхийг сервер зөөлөн устгана).
  Future<HwPhoto> sendPhoto({required String classroomId, required String date, required String fileKey, required int pages}) =>
      _api.post(
        '/homework/photos',
        body: {'classroomId': classroomId, 'date': date, 'fileKey': fileKey, 'pages': pages},
        parse: (j) => HwPhoto.parse(j)!,
      );

  Future<void> deletePhoto(String id) => _api.delete<Object?>('/homework/photos/${Uri.encodeComponent(id)}');

  /// Тухайн жилийн багшийн тэмдэглэгээ (огноогоор буурах; тэмдэглээгүй өдөр орохгүй).
  Future<List<HwMarkEntry>> myMarks(int year) => _api.get(
        '/homework-marks/my',
        query: {'year': year},
        parse: (j) => [for (final e in (j as List? ?? const [])) HwMarkEntry.fromJson(e)],
      );

  /// Онлайн загвар: миний даалгаврууд.
  Future<List<Assignment>> myAssignments() => _api.get(
        '/assignments/my',
        parse: (j) => [for (final a in (j as List? ?? const [])) Assignment.fromJson(a)],
      );

  /// Илгээх / дахин илгээх (ижил endpoint — өмнөхийг орлуулна).
  Future<void> submitAssignment(String id, {required List<String> imageKeys, String? note}) => _api.post<Object?>(
        '/assignments/${Uri.encodeComponent(id)}/submit',
        body: {'imageKeys': imageKeys, if (note != null && note.isNotEmpty) 'note': note},
      );

  // ---- B хувилбарын бодолт ----

  Future<HwAttempt> startAttempt({required String testId, required String date}) => _api.post(
        '/homework/attempts',
        body: {'testId': testId, 'date': date},
        parse: HwAttempt.fromJson,
      );

  /// Автомат хадгалалт — зөвхөн өөрчлөгдсөн хариу (+ идэвхийн тоолуур). Давтахад аюулгүй (idempotent):
  /// сервер тоолуурыг зөвхөн өсгөнө. 409 = өөр төхөөрөмжөөс илгээгдсэн / хугацаа дууссан.
  Future<void> saveAnswers(String attemptId, Map<String, Object?> answers, {HwActivity? activity}) =>
      _api.patch<Object?>(
        '/homework/attempts/${Uri.encodeComponent(attemptId)}',
        body: {'answers': answers, if (activity != null) 'activity': activity.toJson()},
        retry: true,
      );

  Future<CheckOutcome> check(String attemptId, Map<String, Object?> answers, {HwActivity? activity}) => _api.post(
        '/homework/attempts/${Uri.encodeComponent(attemptId)}/check',
        body: {'answers': answers, if (activity != null) 'activity': activity.toJson()},
        parse: CheckOutcome.fromJson,
      );

  /// Илгээх — сервер идемпотент (давтан дуудвал анхны илгээлт).
  Future<CheckOutcome> submit(String attemptId, Map<String, Object?> answers, {HwActivity? activity}) => _api.post(
        '/homework/attempts/${Uri.encodeComponent(attemptId)}/submit',
        body: {'answers': answers, if (activity != null) 'activity': activity.toJson()},
        parse: CheckOutcome.fromJson,
        retry: true,
      );
}

final homeworkRepositoryProvider = Provider<HomeworkRepository>((ref) => HomeworkRepository(ref.watch(apiClientProvider)));
