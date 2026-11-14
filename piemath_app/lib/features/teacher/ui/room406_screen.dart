import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../application/visits_controller.dart';
import '../data/makeup_visits.dart';
import 'board_guests.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

// 406 нөхөх өрөө (эзэн 2026-11-08) — вэбийн `Room406View`, `AddToRoomSheet`, `TestSheet`, `MakeupTestPicker`.

const _commentMax = 500;

void _snack(BuildContext context, String message) {
  ScaffoldMessenger.maybeOf(context)
    ?..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

String _err(Object e, String fallback) => e is ApiError && e.message.trim().isNotEmpty ? e.message : fallback;

/// `/app/teacher/room406?date=` — хуваарьгүй, ямар ч өдөр. Эхэндээ хоосон; ямар ч багш сурагч нэмж
/// (нэрээр эсвэл ангиар), сурагч бүрт нөхсөн тест/сэдвийг сонгоно (олныг зэрэг эсвэл нэг нэгээр),
/// хүсвэл тайлбар бичнэ.
class Room406Screen extends ConsumerStatefulWidget {
  const Room406Screen({super.key, this.date});

  /// `YYYY-MM-DD` (UB); null бол өнөөдөр.
  final String? date;

  @override
  ConsumerState<Room406Screen> createState() => _Room406ScreenState();
}

class _Room406ScreenState extends ConsumerState<Room406Screen> {
  late UbDateTime? _date = parseDateKey(widget.date);
  final _selected = <String>{};
  final _editing = <String>{};

  @override
  Widget build(BuildContext context) {
    final today = ref.watch(teacherTodayProvider).startOfDay;
    final date = _date ?? today;
    final key = date.dateKey;
    final args = (place: room406, date: key);
    listenVisitErrors(ref, context, args);
    final r = ref.watch(visitsProvider(args));
    final ctl = ref.read(visitsProvider(args).notifier);
    final c = context.colors;
    final future = key.compareTo(today.dateKey) > 0;
    final visits = r.visits ?? const <VisitView>[];
    _selected.removeWhere((id) => !visits.any((v) => v.id == id));
    final sel = visits.where((v) => _selected.contains(v.id)).toList();
    final allOn = visits.isNotEmpty && visits.every((v) => _selected.contains(v.id));

    Future<void> openAdd(AddMode mode) => AddToRoomSheet.open(
      context,
      date: key,
      mode: mode,
      onAdded: (rows) => setState(() => _selected.addAll(rows.map((x) => x.id))),
    );

    Future<void> openTests(List<VisitView> list) async {
      final saved = await TestSheet.open(context, visits: list, date: key);
      if (saved != null && mounted) {
        ctl.replace(saved);
        setState(_selected.clear);
      }
    }

    final children = <Widget>[
      AppCard(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: c.brandBright.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: SizedBox.square(dimension: 44, child: Icon(AppIcons.doorOpen, color: c.brand)),
            ),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('406 нөхөх өрөө', style: context.text.titleMedium),
                  const SizedBox(height: 2),
                  Text(
                    'Хуваарьгүй. Ангидаа хийж чадаагүй хичээлээ ямар ч өдөр ирж нөхнө',
                    style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: AppSpace.sm),
      DayStepper(date: date, today: today, onChanged: (d) => setState(() => _date = d)),
      const SizedBox(height: AppSpace.sm),
      if (future)
        DashedBox(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.xl),
          child: Text(
            'Ирээгүй өдөрт нөхөлт бүртгэхгүй, өнөөдрийг сонгоно уу',
            textAlign: TextAlign.center,
            style: context.text.bodyMedium?.copyWith(color: c.inkDim),
          ),
        )
      else
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                key: const ValueKey('room-add-name'),
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
                onPressed: () => openAdd(AddMode.name),
                icon: const Icon(AppIcons.search, size: 16),
                label: const Text('Нэрээр нэмэх'),
              ),
            ),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              child: OutlinedButton.icon(
                key: const ValueKey('room-add-class'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(teacherTap),
                  foregroundColor: c.brandSoft,
                  side: BorderSide(color: c.brand),
                ),
                onPressed: () => openAdd(AddMode.byClass),
                icon: const Icon(TeacherIcons.users, size: 16),
                label: const Text('Ангиар нэмэх'),
              ),
            ),
          ],
        ),
      const SizedBox(height: AppSpace.md),
      if (r.error != null && r.visits == null)
        SizedBox(
          height: 240,
          child: ErrorState(message: r.error!, onRetry: ctl.reload),
        )
      else if (r.visits == null)
        const LoadingState(cards: 3, padding: EdgeInsets.zero)
      else if (visits.isEmpty)
        if (!future)
          DashedBox(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.xl),
            child: Column(
              children: [
                Text('Энэ өдөр 406-д нөхсөн сурагч алга', style: context.text.titleSmall, textAlign: TextAlign.center),
                const SizedBox(height: AppSpace.xs),
                Text(
                  'Ирсэн сурагчаа дээрх товчоор нэмээд, нөхсөн сэдвийг нь сонгоно',
                  textAlign: TextAlign.center,
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                ),
              ],
            ),
          )
        else
          const SizedBox.shrink()
      else ...[
        Row(
          children: [
            Expanded(
              child: Text.rich(
                TextSpan(
                  text: 'Нөхсөн сурагчид ',
                  style: context.text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  children: [
                    TextSpan(
                      text: '(${visits.length})',
                      style: TextStyle(fontWeight: FontWeight.w400, color: c.inkDim),
                    ),
                  ],
                ),
              ),
            ),
            TextButton.icon(
              key: const ValueKey('room-select-all'),
              style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
              onPressed: () => setState(() {
                if (allOn) {
                  _selected.clear();
                } else {
                  _selected.addAll(visits.map((v) => v.id));
                }
              }),
              icon: const Icon(TeacherIcons.listChecks, size: 16),
              label: Text(allOn ? 'Бүгдийг болих' : 'Бүгдийг сонгох'),
            ),
          ],
        ),
        const SizedBox(height: AppSpace.xs),
        for (final v in visits) ...[
          _RoomRow(
            key: ValueKey('room-${v.id}'),
            visit: v,
            selected: _selected.contains(v.id),
            editing: _editing.contains(v.id),
            onToggle: () => setState(() => _selected.contains(v.id) ? _selected.remove(v.id) : _selected.add(v.id)),
            onTests: () => openTests([v]),
            onEditComment: () => setState(() => _editing.add(v.id)),
            onComment: (t) => ctl.setComment(v.id, t),
            onRemove: () async {
              final ok = await confirmRemove(context, v.student.full);
              if (!ok || !context.mounted) return;
              setState(() => _selected.remove(v.id));
              try {
                await ctl.remove(v.id);
                if (context.mounted) _snack(context, '${v.student.full} хасагдлаа');
              } catch (e) {
                if (context.mounted) _snack(context, _err(e, 'Хасаж чадсангүй'));
              }
            },
          ),
          const SizedBox(height: AppSpace.sm),
        ],
      ],
    ];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('406 нөхөх өрөө'),
            Text(DateMn.longWithWeekday(date), style: context.text.bodySmall?.copyWith(color: c.inkDim)),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: ctl.reload,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 120),
          children: children,
        ),
      ),
      bottomNavigationBar: sel.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, AppSpace.sm),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(color: c.line),
                    boxShadow: [
                      BoxShadow(color: c.ink.withValues(alpha: 0.1), blurRadius: 8, offset: const Offset(0, 2)),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpace.xs),
                    child: Row(
                      children: [
                        IconButton(
                          tooltip: 'Сонголтыг болих',
                          constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
                          icon: const Icon(AppIcons.close),
                          onPressed: () => setState(_selected.clear),
                        ),
                        Expanded(child: Text('${sel.length} сурагч сонгосон', style: context.text.labelLarge)),
                        Flexible(
                          child: FilledButton(
                            key: const ValueKey('room-tests'),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(teacherTap, teacherTap),
                              padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                            ),
                            onPressed: () => openTests(sel),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(TeacherIcons.listChecks, size: 16),
                                SizedBox(width: AppSpace.xs),
                                Flexible(child: Text('Сэдэв сонгох', maxLines: 1, overflow: TextOverflow.ellipsis)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}

class _RoomRow extends StatefulWidget {
  const _RoomRow({
    super.key,
    required this.visit,
    required this.selected,
    required this.editing,
    required this.onToggle,
    required this.onTests,
    required this.onEditComment,
    required this.onComment,
    required this.onRemove,
  });

  final VisitView visit;
  final bool selected;
  final bool editing;
  final VoidCallback onToggle;
  final VoidCallback onTests;
  final VoidCallback onEditComment;
  final ValueChanged<String> onComment;
  final VoidCallback onRemove;

  @override
  State<_RoomRow> createState() => _RoomRowState();
}

class _RoomRowState extends State<_RoomRow> {
  late final _comment = TextEditingController(text: widget.visit.comment ?? '');

  @override
  void didUpdateWidget(_RoomRow old) {
    super.didUpdateWidget(old);
    final server = widget.visit.comment ?? '';
    // Өөр багшийн бичсэнийг авна — бичиж байгаа ижил утгыг дарахгүй.
    if (server.trim() != _comment.text.trim()) _comment.text = server;
  }

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final v = widget.visit;
    final on = widget.selected;
    final showComment = widget.editing || (v.comment ?? '').isNotEmpty;
    final at = parseApiInstant(v.createdAt);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: on ? c.brandBright : c.line, width: on ? 1.5 : 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(
                  checked: on,
                  label: '${v.student.full} сонгох',
                  excludeSemantics: true,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    onTap: widget.onToggle,
                    child: SizedBox.square(
                      dimension: teacherTap,
                      child: Center(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: on ? c.brandBright : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: on ? c.brandBright : c.line),
                          ),
                          child: SizedBox.square(
                            dimension: 24,
                            child: on ? Icon(AppIcons.check, size: 16, color: c.onBrand) : null,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(top: AppSpace.xs),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: AppSpace.sm,
                          runSpacing: 2,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Text(v.student.full, style: context.text.bodyLarge?.copyWith(fontWeight: FontWeight.w700)),
                            ClassTag(v.homeClassroom == null ? 'Ангигүй' : shortClass(v.homeClassroom!.name)),
                          ],
                        ),
                        Meta(
                          style: context.text.bodySmall?.copyWith(color: c.inkDim),
                          items: [
                            if (v.teacherName.isNotEmpty) v.teacherName,
                            if (at != null) DateMn.time(UbDateTime.fromInstant(at)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Хасах',
                  constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
                  icon: Icon(AppIcons.trash, size: 18, color: c.inkDim),
                  onPressed: widget.onRemove,
                ),
              ],
            ),
            const SizedBox(height: AppSpace.xs),
            Semantics(
              button: true,
              label: v.tests.isEmpty
                  ? '${v.student.full}, нөхсөн сэдэв сонгох'
                  : '${v.student.full}, нөхсөн сэдвийг өөрчлөх',
              excludeSemantics: true,
              child: InkWell(
                key: ValueKey('room-row-tests-${v.id}'),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                onTap: widget.onTests,
                child: v.tests.isEmpty
                    ? DashedBox(
                        radius: AppRadius.sm,
                        color: c.brand,
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: teacherTap),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
                            child: Row(
                              children: [
                                Icon(AppIcons.add, size: 16, color: c.brandSoft),
                                const SizedBox(width: AppSpace.xs),
                                Flexible(
                                  child: Text(
                                    'Нөхсөн сэдэв сонгох',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: context.text.labelLarge?.copyWith(
                                      color: c.brandSoft,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                    : DecoratedBox(
                        decoration: BoxDecoration(
                          color: c.surfaceSunken,
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(minHeight: teacherTap, minWidth: double.infinity),
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpace.xs),
                            child: Wrap(
                              spacing: AppSpace.xs,
                              runSpacing: AppSpace.xs,
                              children: [for (final t in v.tests) _TestChip(test: t)],
                            ),
                          ),
                        ),
                      ),
              ),
            ),
            if (showComment) ...[
              const SizedBox(height: AppSpace.xs),
              TextField(
                key: ValueKey('room-comment-${v.id}'),
                controller: _comment,
                autofocus: widget.editing && (v.comment ?? '').isEmpty,
                minLines: 2,
                maxLines: 4,
                maxLength: _commentMax,
                style: const TextStyle(fontSize: 16),
                decoration: InputDecoration(
                  hintText: 'Тайлбар (заавал биш)',
                  labelText: 'Тайлбар, ${v.student.full}',
                  floatingLabelBehavior: FloatingLabelBehavior.never,
                ),
                onChanged: widget.onComment,
              ),
            ] else
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  style: TextButton.styleFrom(
                    minimumSize: const Size(teacherTap, teacherTap),
                    foregroundColor: c.inkDim,
                  ),
                  onPressed: widget.onEditComment,
                  icon: const Icon(AppIcons.stickyNote, size: 16),
                  label: const Text('Тайлбар нэмэх'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TestChip extends StatelessWidget {
  const _TestChip({required this.test});

  final CoveredTest test;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final isTest = test.testId != null;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: isTest ? c.brandBright.withValues(alpha: 0.1) : c.surface,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: isTest ? c.brandBright.withValues(alpha: 0.5) : c.line),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: 2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!isTest) ...[Icon(TeacherIcons.notebookPen, size: 13, color: c.inkDim), const SizedBox(width: 4)],
            Flexible(
              child: Text(
                test.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: context.text.labelMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: isTest ? c.brandSoft : c.ink,
                ),
              ),
            ),
            if (test.result case final r?) ...[
              const SizedBox(width: 4),
              Text(
                '${r.score}/${r.max}',
                style: context.text.labelSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

enum AddMode { name, byClass }

/// 406-д сурагч нэмэх: (1) нэрээр хайж, эсвэл (2) анги сонгоод хэдэн сурагчийг зэрэг сонгож «Нэмэх».
class AddToRoomSheet extends ConsumerStatefulWidget {
  const AddToRoomSheet({super.key, required this.date, required this.initial, required this.onAdded});

  final String date;
  final AddMode initial;
  final ValueChanged<List<VisitView>> onAdded;

  static Future<void> open(
    BuildContext context, {
    required String date,
    required AddMode mode,
    required ValueChanged<List<VisitView>> onAdded,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => FractionallySizedBox(
      heightFactor: 0.88,
      child: AddToRoomSheet(date: date, initial: mode, onAdded: onAdded),
    ),
  );

  @override
  ConsumerState<AddToRoomSheet> createState() => _AddToRoomSheetState();
}

class _AddToRoomSheetState extends ConsumerState<AddToRoomSheet> {
  late AddMode _mode = widget.initial;
  String? _busyId;

  VisitsArgs get _args => (place: room406, date: widget.date);

  Future<CreateVisitsResult> _post(List<String> ids) async {
    final r = await ref.read(makeupVisitsRepositoryProvider).create(date: widget.date, studentIds: ids);
    if (r.created.isNotEmpty) {
      ref.read(visitsProvider(_args).notifier).add(r.created);
      widget.onAdded(r.created);
    }
    return r;
  }

  Future<void> _addOne(SearchHit hit) async {
    setState(() => _busyId = hit.id);
    try {
      final r = await _post([hit.id]);
      if (!mounted) return;
      if (r.created.isNotEmpty) {
        _snack(context, '${hit.full} нэмэгдлээ');
      } else if (r.skipped.isNotEmpty) {
        _snack(context, '${hit.full}: ${skipText(r.skipped.first)}');
      }
    } catch (e) {
      if (mounted) _snack(context, _err(e, 'Нэмж чадсангүй'));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final added = {for (final v in ref.watch(visitsProvider(_args)).visits ?? const <VisitView>[]) v.student.id};
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('406-д сурагч нэмэх', style: context.text.titleMedium),
                const SizedBox(height: AppSpace.sm),
                SegmentedButton<AddMode>(
                  segments: const [
                    ButtonSegment(
                      value: AddMode.name,
                      label: Text('Нэрээр хайх'),
                      icon: Icon(AppIcons.search, size: 16),
                    ),
                    ButtonSegment(
                      value: AddMode.byClass,
                      label: Text('Ангиар'),
                      icon: Icon(TeacherIcons.users, size: 16),
                    ),
                  ],
                  selected: {_mode},
                  showSelectedIcon: false,
                  onSelectionChanged: (s) => setState(() => _mode = s.first),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.sm),
          Expanded(
            child: _mode == AddMode.name
                ? Column(
                    children: [
                      Expanded(
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
                          child: StudentSearchView(added: added, busyId: _busyId, onAdd: _addOne),
                        ),
                      ),
                      SafeArea(
                        top: false,
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(
                            AppSpace.gutter,
                            AppSpace.sm,
                            AppSpace.gutter,
                            AppSpace.sm,
                          ),
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text('Болсон'),
                          ),
                        ),
                      ),
                    ],
                  )
                : _ByClass(added: added, onAdd: _post),
          ),
        ],
      ),
    );
  }
}

class _ByClass extends ConsumerStatefulWidget {
  const _ByClass({required this.added, required this.onAdd});

  final Set<String> added;
  final Future<CreateVisitsResult> Function(List<String>) onAdd;

  @override
  ConsumerState<_ByClass> createState() => _ByClassState();
}

final _visitClassesProvider = FutureProvider.autoDispose<List<VisitClassOption>>(
  (ref) => ref.watch(makeupVisitsRepositoryProvider).classrooms(),
);

final _visitClassStudentsProvider = FutureProvider.autoDispose.family<List<VisitClassStudent>, String>(
  (ref, id) => ref.watch(makeupVisitsRepositoryProvider).classroomStudents(id),
);

class _ByClassState extends ConsumerState<_ByClass> {
  VisitClassOption? _cls;
  final _picked = <String>{};
  bool _busy = false;

  Future<void> _submit() async {
    final ids = _picked.where((id) => !widget.added.contains(id)).toList();
    if (ids.isEmpty) return;
    setState(() => _busy = true);
    try {
      final r = await widget.onAdd(ids);
      if (!mounted) return;
      if (r.created.isNotEmpty) _snack(context, '${r.created.length} сурагч нэмэгдлээ');
      if (r.skipped.isNotEmpty) _snack(context, '${r.skipped.length} сурагч ${skipText(r.skipped.first)}');
      setState(_picked.clear);
    } catch (e) {
      if (mounted) _snack(context, _err(e, 'Нэмж чадсангүй'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final cls = _cls;
    if (cls == null) {
      final async = ref.watch(_visitClassesProvider);
      return async.when(
        loading: () => const LoadingState(cards: 3),
        error: (e, _) =>
            ErrorState(message: _err(e, 'Ангиуд ачаалагдсангүй'), onRetry: () => ref.invalidate(_visitClassesProvider)),
        data: (classes) => ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
          children: [
            Text('Анги сонгоно уу', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
            const SizedBox(height: AppSpace.sm),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final cl in classes)
                  SizedBox(
                    width: 104,
                    child: OutlinedButton(
                      key: ValueKey('room-class-${cl.id}'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(56),
                        padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
                        foregroundColor: c.ink,
                        side: BorderSide(color: c.line),
                      ),
                      onPressed: () => setState(() {
                        _cls = cl;
                        _picked.clear();
                      }),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            shortClass(cl.name),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: context.text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          Text('${cl.studentCount} сурагч', style: context.text.labelSmall?.copyWith(color: c.inkDim)),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      );
    }
    final async = ref.watch(_visitClassStudentsProvider(cls.id));
    final list = async.value;
    final selectable = (list ?? const <VisitClassStudent>[]).where((s) => !widget.added.contains(s.id)).toList();
    final allOn = selectable.isNotEmpty && selectable.every((s) => _picked.contains(s.id));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
          child: Row(
            children: [
              TextButton.icon(
                style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                onPressed: () => setState(() => _cls = null),
                icon: const Icon(TeacherIcons.chevronLeft, size: 16),
                label: const Text('Ангиуд'),
              ),
              Expanded(
                child: Text(
                  shortClass(cls.name),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: context.text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              if (selectable.isNotEmpty)
                TextButton(
                  style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                  onPressed: () => setState(() {
                    if (allOn) {
                      _picked.clear();
                    } else {
                      _picked.addAll(selectable.map((s) => s.id));
                    }
                  }),
                  child: Text(allOn ? 'Бүгдийг болих' : 'Бүгдийг сонгох'),
                ),
            ],
          ),
        ),
        Expanded(
          child: async.when(
            loading: () => const LoadingState(cards: 4),
            error: (e, _) => ErrorState(
              message: _err(e, 'Сурагчид ачаалагдсангүй'),
              onRetry: () => ref.invalidate(_visitClassStudentsProvider(cls.id)),
            ),
            data: (students) => students.isEmpty
                ? Center(
                    child: Text('Энэ ангид сурагч алга', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
                  )
                : ListView(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
                    children: [
                      for (final s in students)
                        Padding(
                          padding: const EdgeInsets.only(bottom: AppSpace.xs),
                          child: CheckboxListTile(
                            key: ValueKey('room-pick-${s.id}'),
                            value: widget.added.contains(s.id) || _picked.contains(s.id),
                            onChanged: widget.added.contains(s.id)
                                ? null
                                : (on) => setState(() => on! ? _picked.add(s.id) : _picked.remove(s.id)),
                            controlAffinity: ListTileControlAffinity.leading,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              side: BorderSide(color: _picked.contains(s.id) ? c.brandBright : c.line),
                            ),
                            title: Text(s.full, maxLines: 1, overflow: TextOverflow.ellipsis),
                            secondary: Text(
                              widget.added.contains(s.id) ? 'Нэмсэн' : shortClass(s.className),
                              style: context.text.bodySmall?.copyWith(color: c.inkDim),
                            ),
                          ),
                        ),
                    ],
                  ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
            child: FilledButton(
              key: const ValueKey('room-class-submit'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
              onPressed: _picked.isEmpty || _busy ? null : _submit,
              child: Text(_picked.isEmpty ? 'Сурагч сонгоно уу' : 'Нэмэх (${_picked.length})'),
            ),
          ),
        ),
      ],
    );
  }
}

String _keyList(VisitView v) =>
    (v.tests.map((t) => PickedTest(testId: t.testId, title: t.title).key).toList()..sort()).join('|');

/// 406: сонгосон нэг эсвэл олон сурагчид ИЖИЛ тест/сэдэв тавих. Нэг сурагч (эсвэл ижил сэдэвтэй олон)
/// бол одоогийн сэдэв нь сонгогдсон байдлаар нээгдэнэ. Хадгалсан мөрүүдийг буцаана.
class TestSheet extends ConsumerStatefulWidget {
  const TestSheet({super.key, required this.visits, required this.date});

  final List<VisitView> visits;
  final String date;

  static Future<List<VisitView>?> open(BuildContext context, {required List<VisitView> visits, required String date}) =>
      showModalBottomSheet<List<VisitView>>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        showDragHandle: true,
        builder: (_) => FractionallySizedBox(
          heightFactor: 0.88,
          child: TestSheet(visits: visits, date: date),
        ),
      );

  @override
  ConsumerState<TestSheet> createState() => _TestSheetState();
}

class _TestSheetState extends ConsumerState<TestSheet> {
  late final bool _same =
      widget.visits.isNotEmpty && widget.visits.every((v) => _keyList(v) == _keyList(widget.visits.first));
  late List<PickedTest> _picked = _same
      ? [for (final t in widget.visits.first.tests) PickedTest(testId: t.testId, title: t.title)]
      : [];
  bool _busy = false;

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      final rows = await ref.read(makeupVisitsRepositoryProvider).setTests([
        for (final v in widget.visits) v.id,
      ], _picked);
      if (!mounted) return;
      _snack(
        context,
        widget.visits.length > 1 ? '${widget.visits.length} сурагчийн сэдэв хадгалагдлаа' : 'Сэдэв хадгалагдлаа',
      );
      Navigator.of(context).pop(rows);
    } catch (e) {
      if (mounted) {
        _snack(context, _err(e, 'Хадгалж чадсангүй'));
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final visits = widget.visits;
    // Замын зураг: эхний ангитай сурагчийн анги (ихэвчлэн нэг ангийнхан хамт ирдэг).
    final home = visits.map((v) => v.homeClassroom).nonNulls.firstOrNull;
    final classes = {for (final v in visits) v.homeClassroom?.id ?? ''};
    final who = visits.length == 1 ? visits.first.student.full : '${visits.length} сурагч';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Нөхсөн сэдэв', style: context.text.titleMedium),
              const SizedBox(height: 2),
              Text(
                '$who${visits.length > 1 && !_same ? ', сурагч бүрийн сэдэв энэ жагсаалтаар солигдоно' : ''}',
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
              if (classes.length > 1 && home != null)
                Text(
                  'Тестүүд ${shortClass(home.name)} ангийн дарааллаар харагдаж байна',
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                ),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        Expanded(
          child: MakeupTestPicker(
            classroomId: home?.id,
            className: home == null ? null : shortClass(home.name),
            date: widget.date,
            selected: _picked,
            onChanged: (l) => setState(() => _picked = l),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(AppStrings.cancel),
                  ),
                ),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    key: const ValueKey('room-tests-save'),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
                    onPressed: _busy ? null : _save,
                    child: Text(_picked.isNotEmpty ? 'Хадгалах (${_picked.length})' : 'Сэдэвгүй хадгалах'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

final _roadmapProvider = FutureProvider.autoDispose.family<List<RoadmapUnit>, ({String classId, String date})>(
  (ref, a) => ref.watch(makeupVisitsRepositoryProvider).roadmap(a.classId, a.date),
);

/// 406-д нөхсөн тест сонгох — өдрийн хуваарийн тест сонголттой ижил ном/сэдвийн дараалал, гэхдээ ангид
/// аль хэдийн ХИЙСЭН тест нуугдахгүй, «Ангид хийсэн» гэж хамгийн шинэ нь эхэнд санал болно. Бодлогын
/// санд байхгүй сэдвийг бичээд нэмж болно.
class MakeupTestPicker extends ConsumerStatefulWidget {
  const MakeupTestPicker({
    super.key,
    required this.classroomId,
    required this.className,
    required this.date,
    required this.selected,
    required this.onChanged,
  });

  final String? classroomId;
  final String? className;
  final String date;
  final List<PickedTest> selected;
  final ValueChanged<List<PickedTest>> onChanged;

  @override
  ConsumerState<MakeupTestPicker> createState() => _MakeupTestPickerState();
}

class _MakeupTestPickerState extends ConsumerState<MakeupTestPicker> {
  final _query = TextEditingController();
  final _open = <String>{};

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  String _shortDay(String d) => d.length >= 10 ? d.substring(5, 10).replaceFirst('-', '.') : d;

  void _toggle(RoadmapUnit u) {
    final item = PickedTest(testId: u.testId, title: u.short);
    final sel = widget.selected;
    widget.onChanged(sel.contains(item) ? sel.where((x) => x != item).toList() : [...sel, item]);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final sel = widget.selected;
    final chosen = {for (final t in sel) t.key};
    final typed = _query.text.replaceAll(RegExp(r'\s+'), ' ').trim();
    final topics = sel.where((t) => t.testId == null).toList();
    final typedExists = topics.any((t) => normTopic(t.title) == normTopic(typed));
    final canAddTopic = typed.isNotEmpty && !typedExists && topics.length < topicMax;
    void addTopic() {
      if (typedExists) _query.clear();
      if (!canAddTopic) {
        setState(() {});
        return;
      }
      widget.onChanged([...sel, PickedTest(title: typed.length > 200 ? typed.substring(0, 200) : typed)]);
      _query.clear();
    }

    final cls = widget.classroomId;
    final async = cls == null ? null : ref.watch(_roadmapProvider((classId: cls, date: widget.date)));
    final units = async?.value ?? const <RoadmapUnit>[];
    final recentDone = [...units.where((u) => u.done && u.doneOn != null)]
      ..sort((a, b) => b.doneOn!.compareTo(a.doneOn!));
    final recent = recentDone.take(8).toList();
    final q = normTopic(_query.text);
    final groups = <({String key, String book, String topic, List<RoadmapUnit> units})>[];
    for (final u in units) {
      if (u.status == 'REMOVED' && !chosen.contains('t:${u.testId}')) continue;
      if (q.isNotEmpty && !normTopic('${u.short} ${u.topic} ${u.bookTitle}').contains(q)) continue;
      final key = '${u.bookCode}|${u.topic}';
      if (groups.isNotEmpty && groups.last.key == key) {
        groups.last.units.add(u);
      } else {
        groups.add((key: key, book: u.bookTitle, topic: u.topic, units: [u]));
      }
    }
    final focusTopic = recent.firstOrNull?.topic;

    Widget pill({required bool on, required Widget child, required VoidCallback onTap, Key? key}) => InkWell(
      key: key,
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: onTap,
      child: Ink(
        decoration: BoxDecoration(
          color: on ? c.brandBright.withValues(alpha: 0.1) : c.surfaceSunken,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: on ? c.brandBright : c.line),
        ),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: teacherTap),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
            child: child,
          ),
        ),
      ),
    );

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
      children: [
        if (sel.isNotEmpty) ...[
          Wrap(
            spacing: AppSpace.xs,
            runSpacing: AppSpace.xs,
            children: [
              for (final t in sel)
                InputChip(
                  key: ValueKey('picked-${t.key}'),
                  label: Text(t.title),
                  avatar: t.testId == null ? Icon(TeacherIcons.notebookPen, size: 14, color: c.inkDim) : null,
                  onDeleted: () => widget.onChanged(sel.where((x) => x != t).toList()),
                  deleteButtonTooltipMessage: '${t.title} хасах',
                  materialTapTargetSize: MaterialTapTargetSize.padded,
                ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
        ],
        if (q.isEmpty && recent.isNotEmpty) ...[
          Row(
            children: [
              Icon(TeacherIcons.history, size: 14, color: c.inkDim),
              const SizedBox(width: AppSpace.xs),
              Text(
                widget.className != null ? '${widget.className} ангид сүүлд хийсэн' : 'Ангид сүүлд хийсэн',
                style: context.text.labelMedium?.copyWith(color: c.inkDim),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          Wrap(
            spacing: AppSpace.xs,
            runSpacing: AppSpace.xs,
            children: [
              for (final u in recent)
                pill(
                  key: ValueKey('recent-${u.testId}'),
                  on: chosen.contains('t:${u.testId}'),
                  onTap: () => _toggle(u),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        chosen.contains('t:${u.testId}') ? AppIcons.check : AppIcons.add,
                        size: 16,
                        color: c.brandSoft,
                      ),
                      const SizedBox(width: AppSpace.xs),
                      Text(u.short, style: context.text.labelLarge),
                      const SizedBox(width: AppSpace.xs),
                      Text(_shortDay(u.doneOn!), style: context.text.labelSmall?.copyWith(color: c.inkDim)),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
        ],
        TextField(
          key: const ValueKey('topic-input'),
          controller: _query,
          maxLength: 200,
          style: const TextStyle(fontSize: 16),
          decoration: const InputDecoration(
            prefixIcon: Icon(AppIcons.search),
            hintText: 'Тест хайх эсвэл сэдэв бичих',
            counterText: '',
          ),
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => addTopic(),
        ),
        if (typed.isNotEmpty) ...[
          const SizedBox(height: AppSpace.xs),
          OutlinedButton.icon(
            key: const ValueKey('topic-add'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(teacherTap),
              alignment: Alignment.centerLeft,
              foregroundColor: c.brandSoft,
              side: BorderSide(color: canAddTopic ? c.brand : c.line),
            ),
            onPressed: canAddTopic ? addTopic : null,
            icon: const Icon(AppIcons.add, size: 16),
            label: Text(
              typedExists
                  ? '«$typed» нэмэгдсэн'
                  : topics.length >= topicMax
                  ? 'Сэдэв 12-оос олон болохгүй'
                  : '«$typed» сэдэв болгож нэмэх',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
        const SizedBox(height: AppSpace.sm),
        if (cls == null)
          DecoratedBox(
            decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.sm)),
            child: Padding(
              padding: const EdgeInsets.all(AppSpace.md),
              child: Text(
                'Сурагч ангигүй тул тестийн жагсаалт алга, сэдвээ бичиж нэмнэ үү',
                style: context.text.bodyMedium?.copyWith(color: c.inkDim),
              ),
            ),
          )
        else if (async!.hasError && async.value == null)
          SizedBox(
            height: 220,
            child: ErrorState(
              message: _err(async.error!, 'Тестүүд ачаалагдсангүй'),
              onRetry: () => ref.invalidate(_roadmapProvider((classId: cls, date: widget.date))),
            ),
          )
        else if (async.value == null)
          const LoadingState(cards: 3, padding: EdgeInsets.zero)
        else if (groups.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
            child: Text(
              'Тохирох тест алга, бичсэнээ сэдэв болгож нэмж болно',
              style: context.text.bodyMedium?.copyWith(color: c.inkDim),
            ),
          )
        else
          for (final g in groups)
            _TopicGroup(
              key: ValueKey('group-${g.key}'),
              topic: g.topic,
              book: g.book,
              open:
                  _open.contains(g.key) ||
                  q.isNotEmpty ||
                  g.topic == focusTopic ||
                  g.units.any((u) => chosen.contains('t:${u.testId}')),
              onToggleOpen: () => setState(() => _open.contains(g.key) ? _open.remove(g.key) : _open.add(g.key)),
              children: [
                for (final u in g.units)
                  CheckboxListTile(
                    key: ValueKey('unit-${u.testId}'),
                    dense: true,
                    value: chosen.contains('t:${u.testId}'),
                    onChanged: (_) => _toggle(u),
                    controlAffinity: ListTileControlAffinity.leading,
                    title: Text(u.short, maxLines: 1, overflow: TextOverflow.ellipsis),
                    secondary: u.done
                        ? Text(
                            'Ангид хийсэн${u.doneOn == null ? '' : ' ${_shortDay(u.doneOn!)}'}',
                            style: context.text.labelSmall?.copyWith(color: c.success),
                          )
                        : null,
                  ),
              ],
            ),
        const SizedBox(height: AppSpace.lg),
      ],
    );
  }
}

class _TopicGroup extends StatelessWidget {
  const _TopicGroup({
    super.key,
    required this.topic,
    required this.book,
    required this.open,
    required this.onToggleOpen,
    required this.children,
  });

  final String topic;
  final String book;
  final bool open;
  final VoidCallback onToggleOpen;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          button: true,
          expanded: open,
          child: InkWell(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            onTap: onToggleOpen,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: teacherTap),
              child: Row(
                children: [
                  AnimatedRotation(
                    turns: open ? 0.5 : 0,
                    duration: AppMotion.of(context, AppMotion.base),
                    child: Icon(TeacherIcons.chevronDown, size: 16, color: c.inkDim),
                  ),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(
                    child: Text(
                      topic,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                  Text(book, style: context.text.labelSmall?.copyWith(color: c.inkDim)),
                ],
              ),
            ),
          ),
        ),
        if (open)
          Padding(
            padding: const EdgeInsets.only(left: AppSpace.md),
            child: Column(children: children),
          ),
      ],
    );
  }
}
