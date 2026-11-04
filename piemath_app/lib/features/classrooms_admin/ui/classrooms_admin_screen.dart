import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/classrooms_admin_providers.dart';
import '../data/classrooms_admin_models.dart';
import 'classroom_detail_screen.dart';
import 'classroom_sheets.dart';

/// Шүүлтүүрийн id.
abstract final class ClassroomFilters {
  static const inPerson = 'in-person';
  static const online = 'online';
  static const noTeacher = 'no-teacher';

  static bool test(AdminClassroom c, String id) => switch (id) {
    inPerson => c.kind == ClassroomKind.inPerson,
    online => c.kind == ClassroomKind.online,
    noTeacher => c.teacher == null,
    _ => true,
  };
}

/// Ангиуд (`/app/admin/classrooms`, вэбийн `ClassroomsClient`) — Админ, Багш+. Хайлт, шүүлтүүр, анги бүрийн
/// «Удирдах», «Анги тараах»; шинэ анги. Таблетад баруун талд дэлгэрэнгүй.
class ClassroomsAdminScreen extends ConsumerStatefulWidget {
  const ClassroomsAdminScreen({super.key});

  @override
  ConsumerState<ClassroomsAdminScreen> createState() => _ClassroomsAdminScreenState();
}

class _ClassroomsAdminScreenState extends ConsumerState<ClassroomsAdminScreen> {
  final _list = DataListController<AdminClassroom>();
  DataQuery? _lastQuery;

  static const _filters = [
    DataFilter(ClassroomFilters.inPerson, 'Танхим'),
    DataFilter(ClassroomFilters.online, 'Онлайн'),
    DataFilter(ClassroomFilters.noTeacher, 'Багшгүй'),
  ];

  /// Хайлт, шүүлтүүр солиход кэшээс; ижил асуулга дахин ирвэл (доош татах) серверээс шинээр.
  Future<DataPage<AdminClassroom>> _load(DataQuery q) async {
    if (q.isFirstPage && q == _lastQuery) ref.invalidate(adminClassroomsProvider);
    if (q.isFirstPage) _lastQuery = q;
    final all = await ref.read(adminClassroomsProvider.future);
    return DataPage.local(
      all,
      q,
      matches: (c, text) => c.matches(text),
      inFilter: ClassroomFilters.test,
      filters: _filters,
    );
  }

  Future<void> _reload() async {
    ref.invalidate(adminClassroomsProvider);
    _lastQuery = null;
    await _list.refresh();
  }

  void _open(AdminClassroom c) => context.push('/app/admin/classrooms/${Uri.encodeComponent(c.id)}');

  Future<void> _menu(AdminClassroom c) async {
    final access = ref.read(classroomsAccessProvider);
    final picked = await showSelectSheet<String>(
      context,
      title: c.name,
      options: [
        const SelectOption('open', 'Удирдах', icon: AppIcons.settings),
        const SelectOption('board', 'Ангийн самбар', icon: AppIcons.chart),
        if (access.canDisband) const SelectOption('disband', 'Анги тараах', icon: AppIcons.doorOpen),
      ],
    );
    if (!mounted) return;
    switch (picked?.value) {
      case 'open':
        _open(c);
      case 'board':
        await context.push('/app/classes/${Uri.encodeComponent(c.id)}');
      case 'disband':
        await _disband(c);
    }
  }

  Future<void> _disband(AdminClassroom c) async {
    final n = await showDisbandSheet(context, ref, c);
    if (n == null || !mounted) return;
    _list.updateWhere((r) => r.id == c.id, (r) => r.copyWith(studentCount: 0));
    ref
      ..invalidate(adminClassroomsProvider)
      ..invalidate(adminClassroomDetailProvider(c.id))
      ..invalidate(registryProvider);
    _lastQuery = null;
    showSnack(context, '$n сурагчийг ангиас гаргалаа. Түүх хадгалагдсан');
  }

  Future<void> _create() async {
    final created = await showCreateClassroomSheet(context, ref);
    if (created == null || !mounted) return;
    showSnack(context, '«${created.name}» анги үүслээ');
    await _reload();
  }

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(classroomsAccessProvider);
    // autoDispose кэшийг дэлгэц нээлттэй үед амьд байлгана (дахин зурахгүй).
    if (access.canManage) ref.listen(adminClassroomsProvider, (_, _) {});
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ангиуд'),
        actions: [
          if (access.canManage)
            IconButton(
              tooltip: 'Бүртгэл',
              icon: const Icon(AppIcons.idCard),
              onPressed: () => context.push('/app/admin/registry'),
            ),
        ],
      ),
      floatingActionButton: access.canCreate
          ? FloatingActionButton.extended(
              onPressed: _create,
              icon: const Icon(AppIcons.add),
              label: const Text('Шинэ анги'),
            )
          : null,
      body: !access.canManage
          ? const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden)
          : DataListScreen<AdminClassroom>(
              controller: _list,
              load: _load,
              itemKey: (c) => c.id,
              searchHint: 'Анги, багш хайх',
              filters: _filters,
              countLabel: (n) => '$n анги',
              emptyTitle: 'Идэвхтэй анги алга',
              emptyIcon: AppIcons.myClass,
              itemPadding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.xs, AppSpace.md),
              onTap: _open,
              detailBuilder: (_, c) => ClassroomDetailView(key: ValueKey(c.id), classId: c.id, onArchived: _reload),
              itemBuilder: (context, c) => ItemRow(
                title: c.name,
                meta: c.meta(),
                trailing: IconButton(
                  tooltip: '${c.name}, үйлдэл',
                  icon: const Icon(AppIcons.overflow),
                  onPressed: () => _menu(c),
                ),
              ),
            ),
    );
  }
}
