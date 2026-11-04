import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'lesson_flow_models.dart';

/// Хичээлийн өдрийн дуудлагууд (вэбийн `/app/lesson-flow`-той ижил зам, бие).
/// Эрхийн шийдвэр СЕРВЕРТ (`lesson-flow.controller.ts`: ADMIN, TEACHER, TEACHER_PLUS).
class LessonFlowRepository {
  const LessonFlowRepository(this._api);

  final ApiClient _api;

  static Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const {};

  static List<T> _list<T>(Object? j, T Function(Map<String, Object?>) parse) =>
      j is List ? [for (final e in j) parse(_map(e))] : <T>[];

  Future<List<FlowClass>> classes() => _api.get('/classrooms', parse: (j) => _list(j, FlowClass.fromJson));

  Future<List<FlowChapter>> chapters() => _api.get('/lessons/chapters', parse: (j) => _list(j, FlowChapter.fromJson));

  Future<FlowPreview> preview({required String classId, required String date, required String chapterId}) => _api.get(
    '/lesson-flow/classrooms/$classId/preview',
    query: {'date': date, 'chapterId': chapterId},
    parse: (j) => FlowPreview.fromJson(_map(j)),
  );

  /// Ангид хийсэн тестийг бүртгэнэ (`ClassTestSession`, давхар бүртгэвэл өөрчлөлтгүй).
  Future<void> recordTest({required String classId, required String testId, required String date}) =>
      _api.post<void>('/classrooms/$classId/did-test', body: {'testId': testId, 'date': date});

  /// Өдрийн багц ба гэрийн даалгавар. Даалгавар байвал шинэчилнэ, үгүй бол үүсгэнэ (устгахгүй).
  Future<FlowPacket> saveDay({
    required String classId,
    required String date,
    required String chapterId,
    String? testId,
    String? makeupTestId,
    required String title,
    required String description,
    List<String> imageKeys = const [],
    String? dueDate,
  }) => _api.put(
    // `ApiClient.put` query авдаггүй тул огноог замд (YYYY-MM-DD — кодлох тэмдэгтгүй).
    '/lesson-flow/classrooms/$classId/day?date=$date',
    body: {
      'chapterId': chapterId,
      'testId': ?testId,
      'makeupTestId': makeupTestId,
      'homework': {'title': title, 'description': description, 'imageKeys': imageKeys, 'dueDate': ?dueDate},
    },
    parse: (j) => FlowPacket.fromJson(_map(j)),
  );

  /// Зураг авах ээлж. [studentId] өгөхгүй бол серверийн автомат дараалал; өгвөл [reason] заавал.
  Future<PhotoTurn> assignTurn(String packetId, {String? studentId, String? reason}) => _api.post(
    '/lesson-flow/days/$packetId/photo-turn',
    body: studentId == null ? const <String, Object?>{} : {'studentId': studentId, 'reason': reason},
    parse: (j) => PhotoTurn.fromJson(_map(j)),
  );
}

final lessonFlowRepositoryProvider = Provider<LessonFlowRepository>(
  (ref) => LessonFlowRepository(ref.watch(apiClientProvider)),
);

LessonFlowRepository _repo(Ref ref) {
  // Хэрэглэгч солигдвол кэш шинэчлэгдэнэ.
  ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
  return ref.watch(lessonFlowRepositoryProvider);
}

final lessonFlowClassesProvider = FutureProvider<List<FlowClass>>((ref) => _repo(ref).classes());

final lessonFlowChaptersProvider = FutureProvider<List<FlowChapter>>((ref) => _repo(ref).chapters());

/// Анги + өдөр + сэдэв.
typedef FlowKey = ({String classId, String date, String chapterId});

final lessonFlowPreviewProvider = FutureProvider.family<FlowPreview, FlowKey>(
  (ref, k) => _repo(ref).preview(classId: k.classId, date: k.date, chapterId: k.chapterId),
);
