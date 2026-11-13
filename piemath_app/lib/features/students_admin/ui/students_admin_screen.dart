import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/students_admin_providers.dart';
import '../data/students_admin_models.dart';
import '../data/students_admin_repository.dart';
import '../domain/student_filters.dart';
import '../domain/students_perms.dart';
import 'admin_student_screen.dart';
import 'student_actions.dart';

/// CSV-г түр хадгалах хавтас (тестэд солино).
final studentsTempDirProvider = Provider<Future<Directory> Function()>((ref) => getTemporaryDirectory);

/// `/app/admin/students` — сурагчдын жагсаалт (вэбийн `StudentsDirectory.tsx`).
///
/// - Хайлт (код, нэр, утас), Идэвхтэй/Архив, анги, жил, салбар, хичээлийн шүүлтүүр; чипээр ангигүй, ирэхгүй,
///   төлбөр дутуу/хэвийн. Нэг ачаалсан жагсаалтаас санах ойд шүүж, 30-аар хуудаслана (700+ сурагч).
/// - Анхаарах сурагчид (Багш+/Админ), мөр бүрийн үйлдэл: анги солих, сургалтаас хасах, архивлах («Буцаах»-тай),
///   сэргээх, засах. Бүртгэлийн Excel, шүүсэн CSV-г утсаар хуваалцах. Excel импорт (Админ).
/// - Мөнгө: төлбөрийн төлөв + дутуу дүн зөвхөн [StudentsPerms.canSeeMoney]; Багш огт харахгүй.
class StudentsAdminScreen extends ConsumerStatefulWidget {
  const StudentsAdminScreen({super.key});

  @override
  ConsumerState<StudentsAdminScreen> createState() => _StudentsAdminScreenState();
}

class _StudentsAdminScreenState extends ConsumerState<StudentsAdminScreen> {
  final _list = DataListController<AdminStudent>();
  StudentFilters _filters = const StudentFilters();
  StudentDirectory? _dir;
  String? _initialChip;
  int _listGen = 0;
  bool _busy = false;

  StudentDirectoryLoader get _loader => ref.read(studentDirectoryLoaderProvider);

  List<DataFilter> _chips(StudentsPerms perms) => [
    if (!_filters.archived && perms.canManage) ...[
      const DataFilter(StudentChip.unassigned, 'Ангигүй'),
      const DataFilter(StudentChip.absent, 'Ирэхгүй'),
    ],
    if (!_filters.archived && perms.canSeeMoney) ...[
      const DataFilter(StudentChip.debt, 'Төлбөр дутуу'),
      const DataFilter(StudentChip.paidOk, 'Төлбөр хэвийн'),
    ],
  ];

  Future<DataPage<AdminStudent>> _load(DataQuery q) async {
    // Багш+-ийн санхүүгийн эрхийг мэдсэний дараа — эрхгүй бол төлбөрийн хүсэлт огт явуулахгүй.
    await ref.read(studentsFinanceCapProvider.future);
    if (!mounted) return const DataPage(items: []);
    final perms = ref.read(studentsPermsProvider);
    // Доош татаж шинэчлэх = мөрүүд харагдаж байхад эхний хуудас дахин → серверээс. Хайлт, шүүлтүүр = санах ойгоос.
    final pull = q.isFirstPage && _list.items.isNotEmpty;
    final dir = await _loader.load(archived: _filters.archived, perms: perms, force: pull);
    if (mounted && !identical(dir, _dir)) setState(() => _dir = dir);
    return DataPage.local(
      dir.filtered(_filters),
      q,
      matches: StudentDirectory.matches,
      inFilter: dir.inChip,
      filters: _chips(perms),
    );
  }

  void _setFilters(StudentFilters next) {
    if (next == _filters) return;
    setState(() {
      if (next.archived != _filters.archived) {
        _dir = _loader.cached(archived: next.archived);
        _initialChip = null;
        _listGen++;
      }
      _filters = next;
    });
  }

  void _showChip(String chip) => setState(() {
    _initialChip = chip;
    _listGen++;
  });

  void _open(AdminStudent s) =>
      unawaited(context.push('/app/admin/students/${Uri.encodeComponent(s.id)}', extra: s.fullName));

  void _snack(String message) => ScaffoldMessenger.maybeOf(context)
    ?..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));

  Future<void> _act(AdminStudent s) async {
    final perms = ref.read(studentsPermsProvider);
    final a = await pickStudentAction(
      context,
      name: s.fullName,
      actions: availableActions(perms, archived: s.archived, includeOpen: true),
    );
    if (a == null || !mounted) return;
    switch (a) {
      case StudentAction.open:
        _open(s);
      case StudentAction.moveClass:
        await changeClass(
          context,
          ref,
          studentId: s.id,
          name: s.fullName,
          currentClassId: s.currentClassroom?.id,
          otherClassIds: [for (final c in s.otherClassrooms) c.id],
        );
      case StudentAction.withdraw:
        await withdrawStudent(context, ref, studentId: s.id, name: s.fullName);
      case StudentAction.archive:
        await _archive(s);
      case StudentAction.restore:
        await restoreStudent(context, ref, studentId: s.id, name: s.fullName, lastClassId: s.lastClassroom?.id);
      case StudentAction.editProfile:
        await editBasicProfile(context, ref, studentId: s.id, perms: perms);
      case StudentAction.editRegistration:
        await editRegistration(context, ref, studentId: s.id, perms: perms);
    }
  }

  /// Тооцоогүй архивлах: мөр шууд алга болно → 5 сек «Буцаах» → дараа нь л серверт. Алдаа бол мөр буцна.
  Future<void> _archive(AdminStudent s) async {
    final reason = await askArchiveReason(context, name: s.fullName);
    if (reason == null || !mounted) return;
    final repo = ref.read(studentsAdminRepositoryProvider);
    final loader = _loader;
    final messenger = ScaffoldMessenger.of(context);
    final removed = _list.removeWhere((x) => x.id == s.id);
    var cacheIndex = -1;
    loader.replaceStudents(false, (l) {
      cacheIndex = l.indexWhere((x) => x.id == s.id);
      return [
        for (final x in l)
          if (x.id != s.id) x,
      ];
    });
    void putBack() {
      if (removed != null) _list.insert(removed.index, removed.item);
      if (cacheIndex >= 0) loader.replaceStudents(false, (l) => [...l]..insert(cacheIndex.clamp(0, l.length), s));
    }

    if (await showUndoSnack(context, message: '${s.fullName} архивлагдлаа')) {
      putBack();
      return;
    }
    try {
      await repo.archive(s.id, reason);
      loader.drop(archived: true);
      if (mounted) invalidateStudent(ref, s.id, list: false);
    } catch (e) {
      putBack();
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(MutationResult<void>.failed(e).message!)));
    }
  }

  Future<void> _exportXlsx() async {
    setState(() => _busy = true);
    try {
      final ok = await ref
          .read(fileShareProvider)
          .share(
            '/students/export.xlsx',
            fileName: 'burtgel-${UbDateTime.now().dateKey}.xlsx',
            subject: 'Сурагчдын бүртгэл',
          );
      if (!ok && mounted) _snack('Энэ утсанд хуваалцах боломжгүй байна');
    } catch (e) {
      if (mounted) _snack(e is ApiError ? e.message : 'Excel татаж чадсангүй');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Дэлгэц дээрх шүүлтүүрт таарсан БҮХ сурагч (хуудаслалтаас үл хамаарна), вэбийн CSV-тэй ижил багана.
  Future<void> _exportCsv(StudentsPerms perms) async {
    final dir = _dir;
    if (dir == null) return;
    setState(() => _busy = true);
    try {
      final rows = dir.filtered(_filters);
      final base = await ref.read(studentsTempDirProvider)();
      final folder = Directory('${base.path}/piemath_share');
      if (!folder.existsSync()) folder.createSync(recursive: true);
      final file = File('${folder.path}/burtgel-${UbDateTime.now().dateKey}.csv');
      await file.writeAsString(studentsCsv(rows, withMoney: perms.canSeeMoney), flush: true);
      final ok = await ref.read(shareLauncherProvider).shareFile(file, mimeType: 'text/csv', subject: 'Сурагчид');
      if (!ok && mounted) _snack('Энэ утсанд хуваалцах боломжгүй байна');
    } catch (_) {
      if (mounted) _snack('CSV бэлтгэж чадсангүй');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _register() async {
    final created = await registerStudent(context, ref);
    if (created != null && mounted) {
      unawaited(context.push('/app/admin/students/${Uri.encodeComponent(created.id)}', extra: created.name));
    }
  }

  @override
  Widget build(BuildContext context) {
    final perms = ref.watch(studentsPermsProvider);
    ref.watch(studentDirectoryLoaderProvider);
    ref.listen(studentsListVersionProvider, (_, _) {
      _loader.invalidate();
      unawaited(_list.refresh());
    });
    final archived = _filters.archived;
    final dir = _dir;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Сурагчид'),
        actions: [
          if (perms.canManage && !archived)
            IconButton(tooltip: 'Шинэ сурагч', icon: const Icon(AppIcons.add), onPressed: _busy ? null : _register),
          if (perms.canExport || perms.canExportCsv || perms.canImport)
            PopupMenuButton<String>(
              tooltip: 'Бусад үйлдэл',
              icon: const Icon(AppIcons.overflow),
              enabled: !_busy,
              onSelected: (v) => switch (v) {
                'xlsx' => _exportXlsx(),
                'csv' => _exportCsv(perms),
                'import' => context.push('/app/admin/students/import'),
                _ => null,
              },
              itemBuilder: (_) => [
                if (perms.canExport && !archived)
                  const PopupMenuItem(value: 'xlsx', child: Text('Бүртгэл Excel татах')),
                if (perms.canExportCsv) const PopupMenuItem(value: 'csv', child: Text('Шүүсэн жагсаалт CSV')),
                if (perms.canImport) const PopupMenuItem(value: 'import', child: Text('Excel импорт')),
              ],
            ),
        ],
        bottom: _busy
            ? const PreferredSize(preferredSize: Size.fromHeight(2), child: LinearProgressIndicator(minHeight: 2))
            : null,
      ),
      body: DataListScreen<AdminStudent>(
        key: ValueKey('students:$archived:$_listGen'),
        controller: _list,
        load: _load,
        reloadKey: _filters,
        itemKey: (s) => s.id,
        searchHint: 'Код, нэр, сурагч эсвэл эцэг эхийн утсаар хайх',
        filters: _chips(perms),
        initialFilter: _initialChip,
        countLabel: (n) => archived ? 'Архивт $n сурагч' : '$n сурагч',
        header: _Header(
          perms: perms,
          filters: _filters,
          dir: dir,
          onFilters: _setFilters,
          onShowChip: _showChip,
          onOpen: (id, name) => unawaited(context.push('/app/admin/students/${Uri.encodeComponent(id)}', extra: name)),
        ),
        itemBuilder: (context, s) => _StudentRow(
          student: s,
          dir: dir,
          perms: perms,
          onActions: perms.canManage || perms.canEditProfile('STUDENT') ? () => _act(s) : null,
        ),
        onTap: _open,
        detailBuilder: (_, s) => AdminStudentScreen(studentId: s.id, name: s.fullName, embedded: true),
        emptyIcon: AppIcons.students,
        emptyTitle: archived ? 'Архивт сурагч алга' : 'Сурагч алга',
      ),
    );
  }
}

class _StudentRow extends StatelessWidget {
  const _StudentRow({required this.student, required this.dir, required this.perms, this.onActions});

  final AdminStudent student;
  final StudentDirectory? dir;
  final StudentsPerms perms;
  final VoidCallback? onActions;

  @override
  Widget build(BuildContext context) {
    final s = student;
    final unassigned = !s.archived && (dir?.unassignedIds.contains(s.id) ?? false);
    final absent = !s.archived && (dir?.absentIds.contains(s.id) ?? false);
    final room = s.shownClassNames;
    final status = perms.canSeeMoney && !s.archived ? paymentStatusOf(s, dir?.outstanding ?? const {}) : null;
    final seen = parseApiInstant(s.lastSeenAt);
    return ItemRow(
      title: s.fullName,
      meta: [
        s.studentCode,
        room ?? (unassigned ? 'Хуваарилаагүй' : (s.grade == null ? null : '${s.grade}-р анги')),
        if (s.archived) s.archiveReason else (seen == null ? 'Ороогүй' : DateMn.relative(seen)),
      ],
      subtitle: unassigned || absent || status != null
          ? Wrap(
              spacing: AppSpace.xs,
              runSpacing: AppSpace.xs,
              children: [
                if (unassigned) const MetaChip(label: 'Хуваарилаагүй', icon: AppIcons.warning, tone: ChipTone.warning),
                if (absent) const MetaChip(label: 'Ирэхгүй', icon: AppIcons.circleMinus, tone: ChipTone.error),
                if (status != null)
                  MetaChip(
                    label: status.text,
                    tone: status.tone == PaymentTone.debt ? ChipTone.error : ChipTone.success,
                  ),
              ],
            )
          : null,
      trailing: onActions == null
          ? null
          : IconButton(
              tooltip: '${s.fullName} үйлдэл',
              constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
              icon: const Icon(AppIcons.overflow),
              onPressed: onActions,
            ),
      chevron: onActions == null,
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({
    required this.perms,
    required this.filters,
    required this.dir,
    required this.onFilters,
    required this.onShowChip,
    required this.onOpen,
  });

  final StudentsPerms perms;
  final StudentFilters filters;
  final StudentDirectory? dir;
  final ValueChanged<StudentFilters> onFilters;
  final ValueChanged<String> onShowChip;
  final void Function(String id, String name) onOpen;

  Future<void> _pick<T>(
    BuildContext context, {
    required String title,
    required String allLabel,
    required List<SelectOption<T?>> options,
    required T? selected,
    required StudentFilters Function(T? value) apply,
  }) async {
    final picked = await showSelectSheet<T?>(
      context,
      title: title,
      options: [SelectOption<T?>(null, allLabel), ...options],
      selected: selected,
    );
    if (picked != null) onFilters(apply(picked.value));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final facets = StudentFacets.of(dir?.students ?? const []);
    final f = filters;
    String? roomName;
    for (final r in facets.classrooms) {
      if (r.id == f.classroomId) roomName = r.name;
    }
    final attention = dir?.attention;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (perms.canSeeArchive) ...[
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: false, label: Text('Идэвхтэй')),
              ButtonSegment(value: true, label: Text('Архив')),
            ],
            selected: {f.archived},
            showSelectedIcon: false,
            style: SegmentedButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
            onSelectionChanged: (v) => onFilters(StudentFilters(archived: v.first)),
          ),
          const SizedBox(height: AppSpace.sm),
        ],
        if (!f.archived && perms.canManage && attention != null && !attention.isEmpty) ...[
          AttentionPanel(data: attention, onShowChip: onShowChip, onOpen: onOpen),
          const SizedBox(height: AppSpace.sm),
        ],
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          children: [
            _FilterButton(
              label: f.archived ? 'Сүүлийн анги' : 'Анги',
              value: roomName,
              onTap: () => _pick<String>(
                context,
                title: 'Ангиар шүүх',
                allLabel: 'Бүх анги',
                options: [for (final r in facets.classrooms) SelectOption<String?>(r.id, r.name)],
                selected: f.classroomId,
                apply: (v) => f.copyWith(classroomId: () => v),
              ),
            ),
            _FilterButton(
              label: 'Жил',
              value: f.grade == null ? null : '${f.grade}-р анги',
              onTap: () => _pick<int>(
                context,
                title: 'Жилээр шүүх',
                allLabel: 'Бүх жил',
                options: [for (final g in facets.grades) SelectOption<int?>(g, '$g-р анги')],
                selected: f.grade,
                apply: (v) => f.copyWith(grade: () => v),
              ),
            ),
            _FilterButton(
              label: 'Салбар',
              value: f.branch,
              onTap: () => _pick<String>(
                context,
                title: 'Салбараар шүүх',
                allLabel: 'Бүх салбар',
                options: [for (final b in facets.branches) SelectOption<String?>(b, b)],
                selected: f.branch,
                apply: (v) => f.copyWith(branch: () => v),
              ),
            ),
            _FilterButton(
              label: 'Хичээл',
              value: subjectLabel[f.subject],
              onTap: () => _pick<String>(
                context,
                title: 'Хичээлээр шүүх',
                allLabel: 'Бүх хичээл',
                options: [for (final e in subjectLabel.entries) SelectOption<String?>(e.key, e.value)],
                selected: f.subject,
                apply: (v) => f.copyWith(subject: () => v),
              ),
            ),
            if (f.narrowed)
              TextButton(
                style: TextButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
                onPressed: () => onFilters(f.cleared()),
                child: const Text('Шүүлтүүр цэвэрлэх'),
              ),
          ],
        ),
      ],
    );
  }
}

class _FilterButton extends StatelessWidget {
  const _FilterButton({required this.label, required this.value, required this.onTap});

  final String label;
  final String? value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final on = value != null;
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(AppSizes.minTap, AppSizes.minTap),
        foregroundColor: on ? c.brand : c.ink,
        backgroundColor: on ? c.brandTint : null,
        side: BorderSide(color: on ? c.brandTint : c.line),
      ),
      onPressed: onTap,
      icon: const Icon(AppIcons.expand, size: 16),
      label: Text(on ? '$label: $value' : label),
    );
  }
}

/// Анхаарах сурагчид (вэбийн `AttentionBanner`): ангигүй, хичээлдээ ирэхгүй. Дарж нээгээд шууд анги оноох.
class AttentionPanel extends ConsumerStatefulWidget {
  const AttentionPanel({super.key, required this.data, required this.onShowChip, required this.onOpen});

  final AttentionData data;
  final ValueChanged<String> onShowChip;
  final void Function(String id, String name) onOpen;

  @override
  ConsumerState<AttentionPanel> createState() => _AttentionPanelState();
}

class _AttentionPanelState extends ConsumerState<AttentionPanel> {
  static const _rows = 6;
  bool _open = false;

  Widget _row({
    required String id,
    required String name,
    required List<Object?> meta,
    required String cta,
    String? classId,
  }) => Padding(
    padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
    child: Row(
      children: [
        Expanded(
          child: InkWell(
            onTap: () => widget.onOpen(id, name),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: AppSizes.minTap),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(name, style: context.text.titleSmall),
                  Meta(
                    items: meta,
                    style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: AppSpace.sm),
        OutlinedButton(
          style: OutlinedButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
          onPressed: () => changeClass(context, ref, studentId: id, name: name, currentClassId: classId),
          child: Text(cta),
        ),
      ],
    ),
  );

  Widget _section(String title, int total, String chip, List<Widget> rows) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const SizedBox(height: AppSpace.sm),
      Text('$title  $total', style: context.text.labelLarge),
      ...rows,
      if (total > rows.length)
        TextButton(
          style: TextButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
          onPressed: () => widget.onShowChip(chip),
          child: Text('Бүгдийг харах ($total)'),
        ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final d = widget.data;
    final nU = d.unassigned.length;
    final nA = d.notAttending.length;
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: _open,
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadius.md),
              onTap: () => setState(() => _open = !_open),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
                  child: Row(
                    children: [
                      Icon(AppIcons.warning, color: c.error),
                      const SizedBox(width: AppSpace.md),
                      Expanded(
                        child: Meta(
                          style: context.text.titleSmall,
                          items: [
                            if (nU > 0) '$nU хүүхэд ангид хуваарилагдаагүй',
                            if (nA > 0) '$nA хүүхэд хичээлдээ ирэхгүй байна',
                          ],
                        ),
                      ),
                      Icon(_open ? AppIcons.expand : AppIcons.forward, color: c.inkDim),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (_open)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.lg, 0, AppSpace.lg, AppSpace.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (nU > 0)
                    _section('Ангид хуваарилагдаагүй', nU, StudentChip.unassigned, [
                      for (final u in d.unassigned.take(_rows))
                        _row(
                          id: u.id,
                          name: u.name,
                          cta: 'Анги оноох',
                          meta: [
                            u.code,
                            if (ubDay(u.waitingSince) case final w?) '${DateMn.numeric(w)}-аас хүлээж байна',
                          ],
                        ),
                    ]),
                  if (nA > 0)
                    _section('Хичээлдээ ирэхгүй байгаа', nA, StudentChip.absent, [
                      for (final a in d.notAttending.take(_rows))
                        _row(
                          id: a.id,
                          name: a.name,
                          cta: 'Анги солих',
                          classId: a.classroomId,
                          meta: [
                            a.classroomName,
                            if (ubDay(a.lastAttended) case final l?)
                              'Сүүлд ${DateMn.numeric(l)}-нд ирсэн'
                            else
                              'Нэг ч удаа ирээгүй',
                            '${a.missedCount} хичээл тасалсан',
                          ],
                        ),
                    ]),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
