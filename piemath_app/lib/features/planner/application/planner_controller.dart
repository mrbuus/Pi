import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/ub_time.dart';
import '../../../shared/native/native.dart';
import '../data/planner_models.dart';
import '../data/planner_repository.dart';
import '../domain/planner_logic.dart';

/// Одоогийн агшин (тестэд тогтмол).
final plannerClockProvider = Provider<UbDateTime Function()>((ref) => UbDateTime.now);

/// Даалгавар оноох сонголт. Алдаа бол хоосон (вэбтэй ижил чимээгүй).
final plannerStaffProvider = FutureProvider.autoDispose<List<StaffMember>>((ref) async {
  try {
    return await ref.watch(plannerRepositoryProvider).staffDirectory();
  } on ApiError {
    return const [];
  }
});

/// Ангиудын сонголт. Алдаа бол хоосон.
final plannerClassroomsProvider = FutureProvider.autoDispose<List<ClassroomRef>>((ref) async {
  try {
    return await ref.watch(plannerRepositoryProvider).classrooms();
  } on ApiError {
    return const [];
  }
});

/// Ажилтан бүрийн ачаалал, оноор.
final plannerWorkloadProvider = FutureProvider.autoDispose.family<List<WorkloadRow>, int>(
  (ref, year) => ref.watch(plannerRepositoryProvider).workload(year),
);

/// Үүсгэж байгаа (серверт хадгалагдаагүй) даалгаврын түр id-ийн угтвар.
const pendingTaskPrefix = 'local-';

bool isPendingTask(StaffTask t) => t.id.startsWith(pendingTaskPrefix);

/// Төлөвлөгчийн даалгаврууд (дээд түвшний, дэд даалгавартайгаа). Бүх өөрчлөлт optimistic:
/// дэлгэц шууд шинэчлэгдэж, сервер татгалзвал тухайн даалгавар л буцна.
class PlannerController extends Notifier<List<StaffTask>> with OptimisticNotifier<List<StaffTask>> {
  int _seq = 0;

  PlannerRepository get _repo => ref.read(plannerRepositoryProvider);

  @override
  List<StaffTask> build() => const [];

  /// Серверээс дахин ачаална.
  Future<void> load([TaskServerFilter filter = noTaskServerFilter]) async {
    state = await _repo.list(filter);
  }

  /// Төлөв солих (шудрах «Дууссан», дэлгэрэнгүйн төлөв, «Буцаах»).
  Future<MutationResult<StaffTask>> setStatus(String id, TaskStatus status) {
    final previous = findTask(state, id)?.status;
    return mutate(
      apply: (l) => replaceTask(l, id, (t) => t.copyWith(status: status)),
      commit: () => _repo.setStatus(id, status),
      revert: (l) => previous == null ? l : replaceTask(l, id, (t) => t.copyWith(status: previous)),
      confirm: (l, saved) => replaceTask(l, id, (t) => _merge(t, saved)),
    );
  }

  /// Бүх талбар засах (Админ, Багш+).
  Future<MutationResult<StaffTask>> edit(
    String id,
    TaskDraft draft, {
    List<StaffMember> staff = const [],
    List<ClassroomRef> classrooms = const [],
  }) {
    final before = findTask(state, id);
    return mutate(
      apply: (l) => replaceTask(l, id, (t) => _applyDraft(t, draft, staff, classrooms)),
      commit: () => _repo.update(id, draft),
      revert: (l) => before == null ? l : replaceTask(l, id, (_) => before),
      confirm: (l, saved) => replaceTask(l, id, (t) => _merge(t, saved)),
    );
  }

  /// Шинэ даалгавар (эсвэл [TaskDraft.parentTaskId]-тай бол дэд). Түр мөр шууд гарч, хадгалагдмагц
  /// серверийнхээр солигдоно; алдаа бол алга болно.
  Future<MutationResult<StaffTask>> create(
    TaskDraft draft, {
    String? createdById,
    List<StaffMember> staff = const [],
    List<ClassroomRef> classrooms = const [],
  }) {
    final tempId = '$pendingTaskPrefix${++_seq}';
    final temp = _applyDraft(
      StaffTask(id: tempId, title: draft.title, parentTaskId: draft.parentTaskId, createdById: createdById),
      draft,
      staff,
      classrooms,
    );
    return mutate(
      apply: (l) => insertTask(l, temp),
      commit: () => _repo.create(draft),
      revert: (l) => removeTask(l, tempId),
      confirm: (l, saved) => replaceTask(l, tempId, (_) => saved),
    );
  }

  /// Серверийн хариу дэд даалгаврын жагсаалтыг (дэд даалгаврын PATCH-д) хоосон буцааж болзошгүй —
  /// одоо байгааг хадгална.
  static StaffTask _merge(StaffTask current, StaffTask saved) =>
      saved.subtasks.isEmpty && current.subtasks.isNotEmpty ? saved.copyWith(subtasks: current.subtasks) : saved;

  static StaffTask _applyDraft(StaffTask t, TaskDraft d, List<StaffMember> staff, List<ClassroomRef> classrooms) {
    ClassroomRef? classroom;
    if (d.classroomId != null) {
      classroom =
          classrooms.where((c) => c.id == d.classroomId).firstOrNull ?? ClassroomRef(id: d.classroomId!, name: '');
    }
    final byId = {
      for (final s in [...staff, ...t.assignees]) s.id: s,
    };
    return t.copyWith(
      title: d.title.trim(),
      description: d.description.trim().isEmpty ? null : d.description.trim(),
      status: d.status,
      priority: d.priority,
      startDate: d.startDate,
      dueDate: d.dueDate,
      classroom: classroom,
      subject: d.subject,
      estimateHours: d.estimateHours,
      assignees: [
        for (final id in d.assigneeIds)
          if (byId[id] != null) byId[id]!,
      ],
    );
  }
}

final plannerControllerProvider = NotifierProvider.autoDispose<PlannerController, List<StaffTask>>(
  PlannerController.new,
);
