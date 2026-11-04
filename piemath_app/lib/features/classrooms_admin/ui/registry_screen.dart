import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/classrooms_admin_providers.dart';
import '../data/classrooms_admin_models.dart';
import 'classroom_sheets.dart';

/// Бүртгэл (`/app/admin/registry`, вэбийн `EnrollmentRegistry`) — Админ, Багш+. Ангиар шүүх, хайх, шилжүүлэх
/// эсвэл анги заах, ангийн түүх, CSV хуваалцах. Зөөхөд өмнөх ангийн бичилт түүхэнд хадгалагдана.
class RegistryScreen extends ConsumerStatefulWidget {
  const RegistryScreen({super.key});

  @override
  ConsumerState<RegistryScreen> createState() => _RegistryScreenState();
}

class _RegistryScreenState extends ConsumerState<RegistryScreen> {
  final _list = DataListController<RegistryRow>();
  DataQuery? _lastQuery;
  bool _sharing = false;

  static bool _inFilter(RegistryRow r, String id) =>
      id == RegistryData.unassignedFilter ? r.unassigned : r.classroomId == id;

  static List<DataFilter> _filtersOf(RegistryData? data) => [
    const DataFilter(RegistryData.unassignedFilter, 'Хуваарилагдаагүй'),
    for (final c in data?.classrooms ?? const <AdminClassroom>[]) DataFilter(c.id, c.name),
  ];

  static DataPage<RegistryRow> _page(RegistryData data, DataQuery q, {int pageSize = 30}) => DataPage.local(
    data.rows,
    q,
    matches: (r, text) => r.matches(text),
    inFilter: _inFilter,
    filters: _filtersOf(data),
    pageSize: pageSize,
  );

  Future<DataPage<RegistryRow>> _load(DataQuery q) async {
    if (q.isFirstPage && q == _lastQuery) ref.invalidate(registryProvider);
    if (q.isFirstPage) _lastQuery = q;
    return _page(await ref.read(registryProvider.future), q);
  }

  Future<void> _rowMenu(RegistryData data, RegistryRow row) async {
    final access = ref.read(classroomsAccessProvider);
    final history = data.histories[row.student.id] ?? const <RegistryEntry>[];
    final picked = await showSelectSheet<String>(
      context,
      title: row.student.fullName,
      options: [
        if (access.canTransferInRegistry)
          SelectOption('move', row.unassigned ? 'Анги заах' : 'Шилжүүлэх', icon: AppIcons.repeat),
        if (data.hasHistory && history.isNotEmpty)
          SelectOption('history', 'Ангийн түүх', subtitle: '${history.length} удаа', icon: AppIcons.history),
        if (!row.unassigned) const SelectOption('class', 'Ангийг нээх', icon: AppIcons.myClass),
        const SelectOption('student', 'Сурагчийн хуудас', icon: AppIcons.user),
      ],
    );
    if (!mounted) return;
    switch (picked?.value) {
      case 'move':
        await _move(data, row);
      case 'history':
        await _showHistory(row, history);
      case 'class':
        await context.push('/app/admin/classrooms/${Uri.encodeComponent(row.classroomId!)}');
      case 'student':
        await context.push('/app/students/${Uri.encodeComponent(row.student.id)}', extra: row.student.fullName);
    }
  }

  /// Шилжүүлэх / анги заах: шууд харагдаж, 5 секундын «Буцаах»-ын дараа серверт.
  Future<void> _move(RegistryData data, RegistryRow row) async {
    final repo = ref.read(classroomsAdminRepositoryProvider);
    final container = ProviderScope.containerOf(context, listen: false);
    final messenger = ScaffoldMessenger.of(context);
    final target = await pickTargetClass(
      context,
      data.classrooms,
      excludeId: row.classroomId,
      title: row.unassigned ? 'Анги заах' : 'Шилжүүлэх анги',
    );
    if (target == null || !mounted) return;
    final moved = RegistryRow(
      student: row.student,
      classroomId: target.id,
      classroomName: target.name,
      since: DateTime.now().toUtc(),
      historyCount: row.historyCount + 1,
    );
    bool same(RegistryRow r) => r.student.id == row.student.id;
    _list.updateWhere(same, (_) => moved);
    final undone = await showUndoSnack(context, message: '${row.student.fullName} ${target.name} руу шилжлээ');
    if (undone) {
      _list.updateWhere(same, (_) => row);
      return;
    }
    try {
      await repo.enroll(target.id, row.student.id);
    } catch (e) {
      _list.updateWhere(same, (_) => row);
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(errorMessage(e, MutationResult.saveFailedMessage))));
      return;
    }
    container
      ..invalidate(registryProvider)
      ..invalidate(adminClassroomsProvider)
      ..invalidate(adminClassroomDetailProvider);
    _lastQuery = null;
    if (mounted) await _list.refresh();
  }

  Future<void> _showHistory(RegistryRow row, List<RegistryEntry> history) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.5,
      maxChildSize: 0.9,
      builder: (context, scroll) => CustomScrollView(
        controller: scroll,
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.md),
            sliver: SliverToBoxAdapter(
              child: Text('${row.student.fullName}, ангийн түүх', style: context.text.titleMedium),
            ),
          ),
          SliverList.builder(
            itemCount: history.length,
            itemBuilder: (context, i) {
              final e = history[i];
              return ListTile(
                minTileHeight: AppSizes.minTap,
                leading: Icon(e.active ? AppIcons.circleDot : AppIcons.circle, color: context.colors.brand),
                title: Text(e.classroomName),
                subtitle: Meta(
                  items: [
                    'Орсон: ${ubDay(e.joinedAt) ?? '-'}',
                    if (e.leftAt != null) 'Гарсан: ${ubDay(e.leftAt)}' else 'Одоо энэ ангид байна',
                  ],
                ),
              );
            },
          ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpace.xl)),
        ],
      ),
    ),
  );

  /// Дэлгэц дээрх (шүүсэн, хайсан) бүх мөрийг CSV болгож хуваалцана.
  Future<void> _share(RegistryData data) async {
    if (_sharing) return;
    final rows = _page(data, _list.query.withCursor(null), pageSize: 1 << 30).items;
    if (rows.isEmpty) {
      showSnack(context, 'Хуваалцах мөр алга');
      return;
    }
    setState(() => _sharing = true);
    try {
      final dir = await ref.read(registryTempDirProvider)();
      final name = FileShare.safeFileName('piemath-burtgel-${ref.read(classroomsTodayProvider).dateKey}.csv');
      final file = File('${dir.path}${Platform.pathSeparator}$name');
      await file.writeAsString(registryCsv(rows), flush: true);
      final ok = await ref.read(shareLauncherProvider).shareFile(file, mimeType: 'text/csv', subject: 'Бүртгэл');
      if (!ok && mounted) showSnack(context, 'Энэ төхөөрөмж дээр хуваалцах боломжгүй байна');
    } catch (_) {
      if (mounted) showSnack(context, 'Файл бэлдэж чадсангүй. Дахин оролдоно уу');
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(classroomsAccessProvider);
    final data = access.canManage ? ref.watch(registryProvider).value : null;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Бүртгэл'),
        actions: [
          if (data != null)
            IconButton(
              tooltip: 'CSV хуваалцах',
              icon: const Icon(AppIcons.share),
              onPressed: _sharing ? null : () => _share(data),
            ),
        ],
      ),
      body: !access.canManage
          ? const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden)
          : DataListScreen<RegistryRow>(
              controller: _list,
              load: _load,
              itemKey: (r) => r.student.id,
              header: data == null ? null : _RegistryStats(data: data),
              searchHint: 'Нэр, код, сургууль эсвэл ангиар хайх',
              filters: _filtersOf(data),
              allFilterLabel: 'Бүх анги',
              countLabel: (n) => '$n сурагч',
              emptyTitle: 'Энд сурагч алга байна',
              emptyMessage: 'Хайлтын үгээ өөрчлөх эсвэл өөр анги сонгоно уу',
              emptyIcon: AppIcons.students,
              itemPadding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.xs, AppSpace.md),
              onTap: data == null ? null : (r) => _rowMenu(data, r),
              itemBuilder: (context, r) => ItemRow(
                title: r.student.fullName,
                meta: [
                  r.student.studentCode,
                  r.student.school,
                  if (r.student.grade != null) '${r.student.grade}-р анги',
                ],
                subtitle: Meta(
                  items: [
                    r.classroomName ?? 'Хуваарилагдаагүй',
                    if (ubDay(r.since) != null) '${r.unassigned ? 'Хүлээж буй' : 'Элссэн'}: ${ubDay(r.since)}',
                    if (data != null && data.hasHistory && r.historyCount > 1) '${r.historyCount} удаа',
                  ],
                ),
                trailing: data != null && access.canTransferInRegistry
                    ? IconButton(
                        tooltip: r.unassigned ? 'Анги заах' : 'Шилжүүлэх',
                        icon: const Icon(AppIcons.repeat),
                        onPressed: () => _move(data, r),
                      )
                    : null,
              ),
            ),
    );
  }
}

class _RegistryStats extends StatelessWidget {
  const _RegistryStats({required this.data});

  final RegistryData data;

  @override
  Widget build(BuildContext context) => StatRow(
    tiles: [
      StatTile(label: 'Идэвхтэй анги', value: '${data.classrooms.length}', icon: AppIcons.myClass),
      StatTile(label: 'Идэвхтэй бүртгэл', value: '${data.active.length}', icon: AppIcons.students),
      StatTile(
        label: 'Ангигүй сурагч',
        value: '${data.unassigned.length}',
        icon: AppIcons.hourglass,
        tone: data.unassigned.isEmpty ? ChipTone.neutral : ChipTone.brand,
      ),
    ],
  );
}
