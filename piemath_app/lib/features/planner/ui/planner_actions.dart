import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../shared/native/native.dart';
import '../application/planner_controller.dart';
import '../data/planner_models.dart';
import '../domain/planner_logic.dart';
import 'task_detail_sheet.dart';
import 'task_form.dart';

/// Нэвтэрсэн ажилтан (id, эрх) — сессээс (`/auth/me`).
typedef PlannerMe = ({String? userId, UserRole role});

final plannerMeProvider = Provider.autoDispose<PlannerMe>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedIn ? (userId: s.auth.userId, role: s.role) : (userId: null, role: UserRole.unknown);
});

/// Төлөвлөгчийн үйлдлүүд (жагсаалт, дэлгэрэнгүй хоёулаа ашиглана).
class PlannerActions {
  const PlannerActions(this.ref);

  final WidgetRef ref;

  PlannerController get _ctrl => ref.read(plannerControllerProvider.notifier);

  PlannerMe get me => ref.read(plannerMeProvider);

  bool canChange(StaffTask t) => !isPendingTask(t) && canChangeStatus(t, role: me.role, userId: me.userId);

  bool get canEdit => canEditAll(me.role);

  /// Шудрахад «Дууссан» — шууд харагдаж, 5 сек «Буцаах» боломжтой. Сервер татгалзвал буцна.
  Future<void> complete(BuildContext context, StaffTask task) async {
    if (!canChange(task) || task.status == TaskStatus.done) return;
    final previous = task.status;
    unawaited(HapticFeedback.mediumImpact());
    final pending = _ctrl.setStatus(task.id, TaskStatus.done);
    final undo = showUndoSnack(context, message: 'Дууссан гэж тэмдэглэлээ');
    final result = await pending;
    if (!context.mounted) return;
    if (!result.isOk) {
      showMutationError(context, result, onRetry: () => complete(context, task.copyWith(status: previous)));
      return;
    }
    if (await undo) {
      final back = await _ctrl.setStatus(task.id, previous);
      if (context.mounted) showMutationError(context, back);
    }
  }

  /// Төлөв солих (дэлгэрэнгүйгээс).
  Future<void> changeStatus(BuildContext context, StaffTask task, TaskStatus status) async {
    if (!canChange(task) || task.status == status) return;
    unawaited(HapticFeedback.selectionClick());
    final result = await _ctrl.setStatus(task.id, status);
    if (context.mounted) showMutationError(context, result, onRetry: () => changeStatus(context, task, status));
  }

  Future<({List<StaffMember> staff, List<ClassroomRef> classrooms})> _lookups() async {
    final staff = await ref.read(plannerStaffProvider.future);
    final classrooms = await ref.read(plannerClassroomsProvider.future);
    return (staff: staff, classrooms: classrooms);
  }

  /// Шинэ даалгавар (эсвэл [parent]-ийн дэд даалгавар).
  Future<void> create(BuildContext context, {StaffTask? parent}) async {
    if (!canEdit) return;
    final l = await _lookups();
    if (!context.mounted) return;
    final draft = await showTaskForm(context, parent: parent, staff: l.staff, classrooms: l.classrooms);
    if (draft == null || !context.mounted) return;
    await _save(context, () => _ctrl.create(draft, createdById: me.userId, staff: l.staff, classrooms: l.classrooms));
  }

  Future<void> edit(BuildContext context, StaffTask task) async {
    if (!canEdit || isPendingTask(task)) return;
    final l = await _lookups();
    if (!context.mounted) return;
    final draft = await showTaskForm(context, initial: task, staff: l.staff, classrooms: l.classrooms);
    if (draft == null || !context.mounted) return;
    await _save(context, () => _ctrl.edit(task.id, draft, staff: l.staff, classrooms: l.classrooms));
  }

  Future<void> _save(BuildContext context, Future<MutationResult<StaffTask>> Function() run) async {
    final result = await run();
    if (context.mounted) showMutationError(context, result, onRetry: () => _save(context, run));
  }

  /// Дэлгэрэнгүй (доороос гарах хуудас).
  Future<void> openDetail(BuildContext context, String id) => showTaskDetailSheet(context, id: id);
}
