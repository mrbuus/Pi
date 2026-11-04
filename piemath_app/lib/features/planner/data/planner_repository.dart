import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'planner_models.dart';

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const {};

List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) => [
  for (final e in (j as List?) ?? const [])
    if (e is Map) f(_map(e)),
];

String _enc(String v) => Uri.encodeComponent(v);

/// Серверийн шүүлтүүр (`GET /tasks` query) — вэбийн «Ажилтнаар / Ангиар / Хичээлээр шүүх».
typedef TaskServerFilter = ({String? assigneeId, String? classroomId, TaskSubject? subject});

const TaskServerFilter noTaskServerFilter = (assigneeId: null, classroomId: null, subject: null);

/// Ажилтны төлөвлөгчийн API (`api/src/tasks/tasks.controller.ts`). Эрхийг сервер шийднэ:
/// үүсгэх, бүтэн засах — Админ, Багш+; Багш зөвхөн өөрт оноогдсон даалгаврын төлөвийг.
///
/// `DELETE /tasks/:id` нь БҮРМӨСӨН устгадаг тул апп ЗОРИУД дуудахгүй (прод өгөгдлийн дүрэм).
class PlannerRepository {
  const PlannerRepository(this._api);

  final ApiClient _api;

  /// Дээд түвшний даалгаврууд, дэд даалгавартайгаа.
  Future<List<StaffTask>> list([TaskServerFilter filter = noTaskServerFilter]) => _api.get(
    '/tasks',
    query: {
      if (filter.assigneeId != null) 'assigneeId': filter.assigneeId,
      if (filter.classroomId != null) 'classroomId': filter.classroomId,
      if (filter.subject != null) 'subject': filter.subject!.api,
    },
    parse: (j) => _list(j, StaffTask.fromJson),
  );

  Future<StaffTask> get(String id) => _api.get('/tasks/${_enc(id)}', parse: (j) => StaffTask.fromJson(_map(j)));

  Future<StaffTask> create(TaskDraft draft) =>
      _api.post('/tasks', body: draft.toCreateJson(), parse: (j) => StaffTask.fromJson(_map(j)));

  Future<StaffTask> update(String id, TaskDraft draft) =>
      _api.patch('/tasks/${_enc(id)}', body: draft.toUpdateJson(), parse: (j) => StaffTask.fromJson(_map(j)));

  /// Зөвхөн төлөв — Багшид зөвшөөрөгдсөн цорын ганц өөрчлөлт. Давтахад аюулгүй (idempotent).
  Future<StaffTask> setStatus(String id, TaskStatus status) => _api.patch(
    '/tasks/${_enc(id)}',
    body: {'status': status.api},
    parse: (j) => StaffTask.fromJson(_map(j)),
    retry: true,
  );

  /// Даалгавар оноох сонголт (16 ажилтан).
  Future<List<StaffMember>> staffDirectory() =>
      _api.get('/tasks/staff-directory', parse: (j) => _list(j, StaffMember.fromJson));

  Future<List<ClassroomRef>> classrooms() => _api.get('/classrooms', parse: (j) => _list(j, ClassroomRef.fromJson));

  /// Ажилтан бүрийн ачаалал [year] онд (вэбийн «Ачаалал»).
  Future<List<WorkloadRow>> workload(int year) => _api.get(
    '/tasks/workload',
    query: {'from': '$year-01-01', 'to': '$year-12-31'},
    parse: (j) => _list(j, WorkloadRow.fromJson),
  );
}

final plannerRepositoryProvider = Provider<PlannerRepository>((ref) => PlannerRepository(ref.watch(apiClientProvider)));
