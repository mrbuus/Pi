import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/classrooms_admin_providers.dart';
import '../data/classrooms_admin_models.dart';
import 'classroom_sheets.dart';

/// Ангийн удирдлага (`/app/admin/classrooms/:id`, вэбийн `ClassroomDetailClient`): бүрэлдэхүүн, сурагч нэмэх
/// (ангигүй сурагчдаас), шилжүүлэх, хасах, ангийн багш оноох, мэдээлэл засах, архивлах.
class ClassroomDetailScreen extends ConsumerWidget {
  const ClassroomDetailScreen({super.key, required this.classId});

  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final canManage = ref.watch(classroomsAccessProvider.select((a) => a.canManage));
    final name = canManage
        ? ref.watch(adminClassroomDetailProvider(classId).select((a) => a.value?.classroom.name))
        : null;
    return Scaffold(
      appBar: AppBar(title: Text(name ?? 'Анги')),
      body: ClassroomDetailView(
        classId: classId,
        onArchived: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go('/app/admin/classrooms');
          }
        },
      ),
    );
  }
}

/// Дэлгэрэнгүйн бие — утсанд тусдаа дэлгэц, таблетад жагсаалтын баруун талд.
///
/// Сурагч нэмэх, хасах, шилжүүлэх нь шууд харагдаж, 5 секундын «Буцаах»-ын дараа серверт илгээгдэнэ
/// (буцаавал хүсэлт огт явахгүй — түүхэнд илүү бичилт үлдэхгүй). Хасах нь зөөлөн (`leftAt`), ирц хадгалагдана.
class ClassroomDetailView extends ConsumerStatefulWidget {
  const ClassroomDetailView({super.key, required this.classId, this.onArchived});

  final String classId;

  /// Архивласны дараа (дэлгэц хаах эсвэл жагсаалт шинэчлэх).
  final VoidCallback? onArchived;

  @override
  ConsumerState<ClassroomDetailView> createState() => _ClassroomDetailViewState();
}

class _ClassroomDetailViewState extends ConsumerState<ClassroomDetailView> {
  /// Хасах/шилжүүлэх хүлээгдэж буй сурагч (харагдахгүй).
  final _hidden = <String>{};

  /// Нэмэх хүлээгдэж буй сурагч (жагсаалтын төгсгөлд).
  final _added = <ClassStudent>[];

  @override
  void didUpdateWidget(ClassroomDetailView old) {
    super.didUpdateWidget(old);
    if (old.classId != widget.classId) {
      _hidden.clear();
      _added.clear();
    }
  }

  List<ClassStudent> _students(ClassroomDetail d) {
    final ids = {for (final s in d.students) s.id};
    return [
      for (final s in d.students)
        if (!_hidden.contains(s.id)) s,
      for (final s in _added)
        if (!ids.contains(s.id) && !_hidden.contains(s.id)) s,
    ];
  }

  /// Шууд харуулж, «Буцаах» дарагдаагүй бол серверт илгээнэ. Алдаа бол буцааж snackbar.
  Future<void> _deferred({
    required String message,
    required VoidCallback apply,
    required VoidCallback revert,
    required Future<void> Function() commit,
  }) async {
    final container = ProviderScope.containerOf(context, listen: false);
    final messenger = ScaffoldMessenger.of(context);
    setState(apply);
    final undone = await showUndoSnack(context, message: message);
    if (undone) {
      if (mounted) setState(revert);
      return;
    }
    try {
      await commit();
    } catch (e) {
      if (mounted) setState(revert);
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(errorMessage(e, MutationResult.saveFailedMessage))));
      return;
    }
    container
      ..invalidate(adminClassroomsProvider)
      ..invalidate(registryProvider)
      ..invalidate(adminClassroomDetailProvider);
    try {
      await container.read(adminClassroomDetailProvider(widget.classId).future);
    } catch (_) {
      // Шинэчлэлт амжилтгүй бол дэлгэц өөрийн алдааны төлөвийг харуулна.
    }
    if (mounted) setState(revert);
  }

  Future<void> _add(ClassroomDetail d) async {
    final repo = ref.read(classroomsAdminRepositoryProvider);
    final picked = await showAddStudentSheet(context, className: d.classroom.name);
    if (picked == null || !mounted) return;
    final student = ClassStudent(
      id: picked.id,
      firstName: picked.firstName,
      lastName: picked.lastName,
      studentCode: picked.studentCode,
      joinedAt: DateTime.now().toUtc(),
    );
    await _deferred(
      message: '${picked.fullName} сурагчийг ангид нэмлээ',
      apply: () => _added.add(student),
      revert: () => _added.removeWhere((s) => s.id == student.id),
      commit: () => repo.enroll(d.classroom.id, student.id),
    );
  }

  Future<void> _remove(ClassroomDetail d, ClassStudent s) async {
    final repo = ref.read(classroomsAdminRepositoryProvider);
    final ok = await confirmAction(
      context,
      title: '${s.fullName} сурагчийг ангиас хасах уу',
      message: 'Сурагч энэ ангиас гарна. Ирцийн түүх хадгалагдах бөгөөд өөр ангид оруулбал шинэ бүртгэл үүснэ',
      confirmLabel: 'Хасах',
    );
    if (!ok || !mounted) return;
    await _deferred(
      message: '${s.fullName} сурагчийг ангиас гаргалаа',
      apply: () => _hidden.add(s.id),
      revert: () => _hidden.remove(s.id),
      commit: () => repo.removeStudent(d.classroom.id, s.id),
    );
  }

  Future<void> _transfer(ClassroomDetail d, ClassStudent s) async {
    final repo = ref.read(classroomsAdminRepositoryProvider);
    List<AdminClassroom> rooms;
    try {
      rooms = await ref.read(adminClassroomsProvider.future);
    } catch (e) {
      if (mounted) showSnack(context, errorMessage(e, 'Ангийн жагсаалтыг ачаалж чадсангүй'));
      return;
    }
    if (!mounted) return;
    final target = await pickTargetClass(context, rooms, excludeId: d.classroom.id);
    if (target == null || !mounted) return;
    await _deferred(
      message: '${s.fullName} сурагчийг ${target.name} руу шилжүүллээ',
      apply: () => _hidden.add(s.id),
      revert: () => _hidden.remove(s.id),
      commit: () => repo.enroll(target.id, s.id),
    );
  }

  Future<void> _studentMenu(ClassroomDetail d, ClassStudent s) async {
    final picked = await showSelectSheet<String>(
      context,
      title: s.fullName,
      options: const [
        SelectOption('open', 'Сурагчийн хуудас', icon: AppIcons.user),
        SelectOption('transfer', 'Өөр ангид шилжүүлэх', icon: AppIcons.repeat),
        SelectOption('remove', 'Ангиас хасах', icon: AppIcons.circleMinus),
      ],
    );
    if (!mounted) return;
    switch (picked?.value) {
      case 'open':
        _openStudent(s);
      case 'transfer':
        await _transfer(d, s);
      case 'remove':
        await _remove(d, s);
    }
  }

  void _openStudent(ClassStudent s) => context.push('/app/students/${Uri.encodeComponent(s.id)}', extra: s.fullName);

  void _afterSave(bool? saved, String message) {
    if (saved == null || !mounted) return;
    ref
      ..invalidate(adminClassroomDetailProvider(widget.classId))
      ..invalidate(adminClassroomsProvider)
      ..invalidate(registryProvider);
    showSnack(context, message);
  }

  Future<void> _teachers(ClassroomDetail d) async =>
      _afterSave(await showTeacherSheet(context, ref, d.classroom), 'Ангийн багшийг хадгаллаа');

  Future<void> _edit(ClassroomDetail d) async {
    var c = d.classroom;
    // Дэлгэрэнгүйд хичээл ирдэггүй — жагсаалтаас авна.
    try {
      final rooms = await ref.read(adminClassroomsProvider.future);
      for (final r in rooms) {
        if (r.id == c.id) c = c.copyWith(subject: r.subject);
      }
    } catch (_) {
      // Хичээл тодорхойгүй бол маягт зөвхөн өөрчилсөн талбарыг илгээнэ.
    }
    if (!mounted) return;
    _afterSave(await showEditClassroomSheet(context, ref, c), 'Ангийн мэдээллийг хадгаллаа');
  }

  Future<void> _archive(ClassroomDetail d) async {
    final ok = await showArchiveSheet(context, ref, d.classroom);
    if (ok != true || !mounted) return;
    ref
      ..invalidate(adminClassroomsProvider)
      ..invalidate(registryProvider);
    showSnack(context, '«${d.classroom.name}» ангийг архивлалаа');
    widget.onArchived?.call();
  }

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(classroomsAccessProvider);
    if (!access.canManage) {
      return const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden);
    }
    final async = ref.watch(adminClassroomDetailProvider(widget.classId));
    // Шилжүүлэх ангийн жагсаалт, хичээл — кэшийг амьд байлгана (дахин зурахгүй).
    ref.listen(adminClassroomsProvider, (_, _) {});
    return async.when(
      skipLoadingOnRefresh: true,
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(
        message: errorMessage(e, 'Ангийн мэдээлэл нээгдсэнгүй'),
        onRetry: () => ref.invalidate(adminClassroomDetailProvider(widget.classId)),
      ),
      data: (d) => _body(context, access, d),
    );
  }

  Widget _body(BuildContext context, ClassroomsAccess access, ClassroomDetail d) {
    final c = context.colors;
    final students = _students(d);
    final manage = access.canManageStudents(d);
    final room = d.classroom;
    return RefreshIndicator(
      onRefresh: () => ref.refresh(adminClassroomDetailProvider(widget.classId).future).then((_) {}, onError: (_) {}),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: DetailHeader(
              title: room.name,
              subtitle: room.copyWith(studentCount: students.length).meta(),
              avatar: DetailAvatar(icon: room.kind == ClassroomKind.online ? AppIcons.laptop : AppIcons.myClass),
              primary: manage
                  ? DetailAction(label: 'Сурагч нэмэх', icon: AppIcons.add, onPressed: () => _add(d))
                  : null,
              secondary: [
                if (access.canAssignTeachers)
                  DetailAction(label: 'Багш оноох', icon: AppIcons.user, onPressed: () => _teachers(d)),
                if (access.canEditInfo)
                  DetailAction(label: 'Засах', icon: AppIcons.pencilLine, onPressed: () => _edit(d)),
                DetailAction(
                  label: 'Ангийн самбар',
                  icon: AppIcons.chart,
                  onPressed: () => context.push('/app/classes/${Uri.encodeComponent(room.id)}'),
                ),
              ],
            ),
          ),
          if (!manage)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.md),
              sliver: SliverToBoxAdapter(
                child: AppCard(
                  child: Row(
                    children: [
                      Icon(AppIcons.info, color: c.info),
                      const SizedBox(width: AppSpace.md),
                      const Expanded(child: Text('Сурагч нэмэх, хасах, шилжүүлэх эрхийг админаар нээлгэнэ үү')),
                    ],
                  ),
                ),
              ),
            ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
            sliver: SliverToBoxAdapter(
              child: Row(
                children: [
                  Expanded(child: Text('Сурагчид', style: context.text.titleMedium)),
                  Text('${students.length} идэвхтэй', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                ],
              ),
            ),
          ),
          if (students.isEmpty)
            SliverToBoxAdapter(
              child: SizedBox(
                height: 220,
                child: EmptyState(
                  icon: AppIcons.students,
                  title: 'Идэвхтэй сурагч алга',
                  message: manage
                      ? 'Ангигүй сурагчдаас сонгож нэмнэ үү'
                      : 'Энэ ангид одоогоор сурагч бүртгэгдээгүй байна',
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
              sliver: SliverList.builder(
                itemCount: students.length,
                itemBuilder: (context, i) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.sm),
                  child: _StudentRow(
                    key: ValueKey('student-${students[i].id}'),
                    student: students[i],
                    onTap: () => _openStudent(students[i]),
                    onMenu: manage ? () => _studentMenu(d, students[i]) : null,
                  ),
                ),
              ),
            ),
          if (access.canArchive)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xl, AppSpace.gutter, 0),
              sliver: SliverToBoxAdapter(child: _DangerZone(onArchive: () => _archive(d))),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl)),
        ],
      ),
    );
  }
}

class _StudentRow extends StatelessWidget {
  const _StudentRow({super.key, required this.student, required this.onTap, this.onMenu});

  final ClassStudent student;
  final VoidCallback onTap;
  final VoidCallback? onMenu;

  @override
  Widget build(BuildContext context) {
    final joined = ubDay(student.joinedAt);
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.xs, AppSpace.sm),
      child: ItemRow(
        title: student.fullName,
        meta: [student.studentCode ?? 'Кодгүй', if (joined != null) '$joined-нд элссэн'],
        trailing: onMenu == null
            ? null
            : IconButton(tooltip: 'Үйлдэл', icon: const Icon(AppIcons.overflow), onPressed: onMenu),
        chevron: onMenu == null,
      ),
    );
  }
}

class _DangerZone extends StatelessWidget {
  const _DangerZone({required this.onArchive});

  final VoidCallback onArchive;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppCard(
      accent: c.error,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Аюултай бүс', style: context.text.titleSmall?.copyWith(color: c.error)),
          const SizedBox(height: AppSpace.xs),
          Text(
            'Ангийг идэвхтэй жагсаалтаас архивлана. Сурагчдын бүртгэл, ирцийн түүх үлдэнэ. Буцаах боломжгүй',
            style: context.text.bodySmall,
          ),
          const SizedBox(height: AppSpace.md),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(foregroundColor: c.error, minimumSize: const Size(0, AppSizes.minTap)),
            onPressed: onArchive,
            icon: const Icon(AppIcons.ban, size: 18),
            label: const Text('Ангийг архивлах'),
          ),
        ],
      ),
    );
  }
}
