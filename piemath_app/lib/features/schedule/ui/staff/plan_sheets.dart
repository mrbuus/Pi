import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_error.dart';
import '../../../../core/time/date_mn.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/native/native.dart';
import '../../data/lesson_plan_models.dart';
import '../../data/staff_schedule_models.dart';
import '../../data/staff_schedule_repository.dart';
import '../../domain/staff_schedule_logic.dart';
import 'staff_actions.dart';
import 'test_picker.dart';

// Хичээлийн төлөвлөгөө засах (вэбийн `day/PlanDialog.tsx` — Editor) ба хичээлийн дараа батлах
// (`day/ConfirmDialog.tsx`). Хоёулаа доороос гарах өндөр хуудас, хадгалаагүй өөрчлөлттэй хаах гэвэл асууна.

Future<T?> _sheet<T>(BuildContext context, Widget Function(ScrollController scroll) child) => showModalBottomSheet<T>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  // Чирж хаахыг унтраана — хадгалаагүй өөрчлөлтийг PopScope асууна.
  enableDrag: false,
  backgroundColor: Colors.transparent,
  elevation: 0,
  builder: (_) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.92,
    minChildSize: 0.5,
    maxChildSize: 0.95,
    builder: (context, scroll) => Material(
      color: context.colors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg))),
      clipBehavior: Clip.antiAlias,
      child: child(scroll),
    ),
  ),
);

void _snack(ScaffoldMessengerState? m, String text) => m
  ?..hideCurrentSnackBar()
  ..showSnackBar(SnackBar(content: Text(text)));

/// Төлөвлөгөө засах (Багш+, Админ). Хадгалбал `true`.
Future<bool> showPlanEditor(BuildContext context, {required DayLesson lesson, required String date}) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  final saved = await _sheet<bool>(context, (scroll) => PlanEditor(lesson: lesson, date: date, controller: scroll));
  if (saved == true) _snack(messenger, 'Төлөвлөгөө хадгалагдлаа');
  return saved == true;
}

/// Хичээлийн дараа батлах (бүх багш, өнгөрсөн ба өнөөдрийн хичээл). Хадгалбал `true`.
Future<bool> showConfirmSheet(
  BuildContext context, {
  required DayLesson lesson,
  required String date,
  required Map<String, PlanTest> tests,
  bool canRemoveTests = false,
}) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  final result = await _sheet<String>(
    context,
    (scroll) =>
        ConfirmSheet(lesson: lesson, date: date, tests: tests, canRemoveTests: canRemoveTests, controller: scroll),
  );
  if (result != null) _snack(messenger, result);
  return result != null;
}

/// Хуудасны толгой, бие, доод товчнууд.
class _SheetFrame extends StatelessWidget {
  const _SheetFrame({
    required this.title,
    required this.subtitle,
    required this.controller,
    required this.children,
    required this.footer,
    required this.dirty,
    this.error,
  });

  final String title;
  final String subtitle;
  final ScrollController controller;
  final List<Widget> children;
  final List<Widget> footer;
  final bool dirty;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return PopScope(
      canPop: !dirty,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final nav = Navigator.of(context);
        if (await confirmAction(
          context,
          title: 'Хадгалаагүй өөрчлөлт байна',
          message: 'Хаавал өөрчлөлт алдагдана',
          confirmLabel: 'Хаах',
          cancelLabel: 'Үргэлжлүүлэх',
        )) {
          nav.pop();
        }
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: ListView(
              controller: controller,
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
              children: [
                Center(
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: AppSpace.sm),
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(color: c.line, borderRadius: BorderRadius.circular(AppRadius.pill)),
                  ),
                ),
                Semantics(header: true, child: Text(title, style: context.text.titleLarge)),
                const SizedBox(height: AppSpace.xs),
                Text(subtitle, style: context.text.bodySmall),
                ...children,
              ],
            ),
          ),
          const Divider(height: 1),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.sm),
                      child: Text(error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
                    ),
                  Wrap(alignment: WrapAlignment.end, spacing: AppSpace.sm, runSpacing: AppSpace.sm, children: footer),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section(this.title);

  final String title;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: AppSpace.xl, bottom: AppSpace.sm),
    child: Semantics(
      header: true,
      child: Text(title, style: context.text.labelLarge?.copyWith(color: context.colors.inkDim)),
    ),
  );
}

String _when(DayLesson l, String date) =>
    '${DateMn.longWithWeekday(dayOf(date))}, ${formatMinutes(l.startMinute)}–${formatMinutes(l.endMinute)}';

String _errorText(Object e) => e is ApiError ? e.message : MutationResult.saveFailedMessage;

// ---------------------------------------------------------------------------------------------------------------
// Төлөвлөгөө

/// Төлөвлөгөө засах цонхны бие: орох тест (номын дарааллаар), нэмэлт сэдэв, хичээлийн дараа тарах/үлдэх,
/// онолын зураг илгээх сурагч, тэмдэглэл (ирцийн самбарынхтай нэг бичлэг).
class PlanEditor extends ConsumerStatefulWidget {
  const PlanEditor({super.key, required this.lesson, required this.date, required this.controller});

  final DayLesson lesson;
  final String date;
  final ScrollController controller;

  @override
  ConsumerState<PlanEditor> createState() => _PlanEditorState();
}

class _PlanEditorState extends ConsumerState<PlanEditor> {
  PlanContext? _initial;
  List<String> _tests = const [];
  List<String> _topics = const [];
  String? _dismiss;
  String? _photo;
  late final _note = TextEditingController(text: widget.lesson.noteBody ?? '');
  bool _busy = false;
  String? _error;

  ({String scheduleId, String date}) get _key => (scheduleId: widget.lesson.scheduleId, date: widget.date);

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  void _init(PlanContext ctx) {
    _initial = ctx;
    _tests = [...ctx.testIds];
    _topics = [...ctx.customTopics];
    _dismiss = ctx.dismissMode;
    _photo = ctx.photoStudentId;
  }

  bool get _planChanged {
    final i = _initial;
    if (i == null) return false;
    return _tests.join(',') != i.testIds.join(',') ||
        _topics.join('\n') != i.customTopics.join('\n') ||
        _dismiss != i.dismissMode ||
        _photo != i.photoStudentId;
  }

  bool get _noteChanged => _note.text.trim() != (widget.lesson.noteBody ?? '').trim();

  Future<void> _pickPhoto(PlanContext ctx) async {
    final picked = await showSelectSheet<String>(
      context,
      title: 'Онолын зураг илгээх сурагч',
      selected: _photo ?? '',
      options: [
        const SelectOption('', 'Сонгоогүй'),
        for (final r in ctx.roster)
          SelectOption(r.id, r.name, subtitle: r.id == ctx.photoSuggestion ? 'Ээлжийн санал' : null),
      ],
    );
    if (picked == null || !mounted) return;
    setState(() => _photo = picked.value.isEmpty ? null : picked.value);
  }

  Future<void> _save() async {
    final repo = ref.read(staffScheduleRepositoryProvider);
    final container = ProviderScope.containerOf(context, listen: false);
    final nav = Navigator.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_planChanged) {
        await repo.putPlan(
          widget.lesson.scheduleId,
          date: widget.date,
          testIds: _tests,
          customTopics: _topics,
          dismissMode: _dismiss,
          photoStudentId: _photo,
        );
        // Дахин хадгалахад өөрчлөлтгүй гэж үзнэ.
        _initial = PlanContext(
          testIds: _tests,
          customTopics: _topics,
          dismissMode: _dismiss,
          photoStudentId: _photo,
          roster: _initial!.roster,
          photoSuggestion: _initial!.photoSuggestion,
        );
      }
      if (_noteChanged) await repo.putNote(widget.lesson.scheduleId, date: widget.date, body: _note.text.trim());
      refreshSchedule(container);
      container.invalidate(planContextProvider(_key));
      nav.pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = _errorText(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = widget.lesson;
    final async = ref.watch(planContextProvider(_key));
    final ctx = async.value;
    if (ctx != null && _initial == null) _init(ctx);
    final dirty = _planChanged || _noteChanged;
    final title = '${shortClass(l.classroomName)}, төлөвлөгөө';
    if (ctx == null) {
      return _SheetFrame(
        title: title,
        subtitle: _when(l, widget.date),
        controller: widget.controller,
        dirty: false,
        footer: [
          OutlinedButton(onPressed: () => Navigator.of(context).maybePop(), child: const Text(AppStrings.close)),
        ],
        children: [
          const SizedBox(height: AppSpace.lg),
          if (async.hasError)
            ErrorState(message: _errorText(async.error!), onRetry: () => ref.invalidate(planContextProvider(_key)))
          else
            const LoadingState(cards: 3, padding: EdgeInsets.zero),
        ],
      );
    }
    final suggestion = ctx.photoSuggestion;
    return _SheetFrame(
      title: title,
      subtitle: _when(l, widget.date),
      controller: widget.controller,
      dirty: dirty && !_busy,
      error: _error,
      footer: [
        OutlinedButton(
          onPressed: _busy ? null : () => Navigator.of(context).maybePop(),
          child: const Text(AppStrings.cancel),
        ),
        FilledButton(
          onPressed: _busy || !dirty ? null : () => unawaited(_save()),
          child: Text(_busy ? 'Хадгалж байна' : AppStrings.save),
        ),
      ],
      children: [
        const _Section('Орох тест'),
        TestPicker(
          classroomId: l.classroomId,
          date: widget.date,
          selected: _tests,
          onChanged: (ids) => setState(() => _tests = ids),
          customTopics: _topics,
          onCustomTopicsChange: (t) => setState(() => _topics = t),
          canRemove: true,
        ),
        const _Section('Хичээлийн дараа'),
        SegmentedButton<String>(
          key: const ValueKey('plan:dismiss'),
          showSelectedIcon: false,
          style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(0, AppSizes.minTap))),
          segments: const [
            ButtonSegment(value: '', label: Text('Сонгоогүй')),
            ButtonSegment(value: 'DISMISS', label: Text('Тарах'), icon: Icon(AppIcons.doorOpen, size: 18)),
            ButtonSegment(value: 'STAY', label: Text('Үлдэнэ'), icon: Icon(AppIcons.hourglass, size: 18)),
          ],
          selected: {_dismiss ?? ''},
          onSelectionChanged: (s) => setState(() => _dismiss = s.first.isEmpty ? null : s.first),
        ),
        const _Section('Онолын зураг илгээх сурагч'),
        AppCard(
          padding: EdgeInsets.zero,
          child: ListTile(
            key: const ValueKey('plan:photo'),
            minTileHeight: AppSizes.minTap,
            leading: const Icon(AppIcons.camera),
            title: Text(ctx.nameOf(_photo) ?? 'Сонгоогүй'),
            trailing: const Icon(AppIcons.expand),
            onTap: () => unawaited(_pickPhoto(ctx)),
          ),
        ),
        if (suggestion != null && suggestion != _photo && ctx.nameOf(suggestion) != null) ...[
          const SizedBox(height: AppSpace.sm),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: ActionChip(
              avatar: Icon(AppIcons.camera, size: 16, color: context.colors.brand),
              label: Text('Ээлж: ${ctx.nameOf(suggestion)}'),
              onPressed: () => setState(() => _photo = suggestion),
            ),
          ),
        ],
        const _Section('Тэмдэглэл'),
        TextField(
          key: const ValueKey('plan:note'),
          controller: _note,
          maxLength: noteMax,
          minLines: 2,
          maxLines: 6,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(hintText: 'Ирцийн самбарын дээд хэсэгт багш нарт харагдана'),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Батлах

/// Батлах цонхны бие: бодитоор хийсэн тест (төлөвлөгөөнөөс урьдчилан бөглөгдөнө) + тест бүрд хассан бодлогын дугаар,
/// сэдэв, бодсон бодлогын дугаар, тайлбар. Батламж цуцлах нь серверт зөөлөн (`cancelledAt`).
class ConfirmSheet extends ConsumerStatefulWidget {
  const ConfirmSheet({
    super.key,
    required this.lesson,
    required this.date,
    required this.tests,
    required this.controller,
    this.canRemoveTests = false,
  });

  final DayLesson lesson;
  final String date;
  final Map<String, PlanTest> tests;
  final ScrollController controller;
  final bool canRemoveTests;

  @override
  ConsumerState<ConfirmSheet> createState() => _ConfirmSheetState();
}

class _ConfirmSheetState extends ConsumerState<ConfirmSheet> {
  late List<({String testId, List<String> excluded})> _rows;
  late final List<({String testId, List<String> excluded})> _initialRows;
  late List<String> _topics;
  late final List<String> _initialTopics;
  late final _description = TextEditingController(text: widget.lesson.record?.description ?? '');
  late final _numbers = TextEditingController(text: widget.lesson.record?.problemNumbersText ?? '');
  final _extra = <String, PlanTest>{};
  String? _open;
  bool _adding = false;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final l = widget.lesson;
    final done = [
      for (final d in l.done)
        if (d.testId != null) (testId: d.testId!, excluded: [...d.excludedProblemIds]),
    ];
    _rows = done.isNotEmpty ? done : [for (final id in l.planTestIds) (testId: id, excluded: <String>[])];
    _initialRows = [..._rows];
    final record = l.record;
    _topics = record != null
        ? (record.topic != null && record.topic != l.topic ? [record.topic!] : <String>[])
        : [...l.customTopics];
    _initialTopics = [..._topics];
    unawaited(_loadMissing());
  }

  @override
  void dispose() {
    _description.dispose();
    _numbers.dispose();
    super.dispose();
  }

  PlanTest? _info(String id) => widget.tests[id] ?? _extra[id];

  /// Нэмсэн тестийн нэр, бодлогын дараалал (хассан дугаар тэмдэглэхэд).
  Future<void> _loadMissing() async {
    final missing = [
      for (final r in _rows)
        if (_info(r.testId) == null) r.testId,
    ];
    if (missing.isEmpty) return;
    try {
      final list = await ref.read(staffScheduleRepositoryProvider).planTests(missing);
      if (mounted) setState(() => _extra.addAll({for (final t in list) t.id: t}));
    } catch (_) {
      // Нэргүй ч батлах боломжтой.
    }
  }

  bool get _dirty {
    String rows(List<({String testId, List<String> excluded})> r) =>
        [for (final x in r) '${x.testId}:${(x.excluded.toList()..sort()).join('+')}'].join(',');
    final record = widget.lesson.record;
    return rows(_rows) != rows(_initialRows) ||
        _topics.join('\n') != _initialTopics.join('\n') ||
        _description.text.trim() != (record?.description ?? '').trim() ||
        _numbers.text.trim() != (record?.problemNumbersText ?? '').trim();
  }

  void _toggleNumber(String testId, String problemId) => setState(() {
    _rows = [
      for (final r in _rows)
        r.testId != testId
            ? r
            : (
                testId: r.testId,
                excluded: r.excluded.contains(problemId)
                    ? ([...r.excluded]..remove(problemId))
                    : [...r.excluded, problemId],
              ),
    ];
  });

  Future<void> _run(Future<void> Function() call, String done) async {
    final container = ProviderScope.containerOf(context, listen: false);
    final nav = Navigator.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await call();
      refreshSchedule(container);
      nav.pop(done);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = _errorText(e);
        });
      }
    }
  }

  Future<void> _confirm() {
    final repo = ref.read(staffScheduleRepositoryProvider);
    final topic = _topics.join(', ');
    return _run(
      () => repo.confirmLesson(
        widget.lesson.scheduleId,
        date: widget.date,
        tests: _rows,
        topic: topic.isEmpty ? null : (topic.length > 200 ? topic.substring(0, 200) : topic),
        description: _description.text.trim().isEmpty ? null : _description.text.trim(),
        problemNumbers: _numbers.text.trim().isEmpty ? null : _numbers.text.trim(),
      ),
      'Батлагдлаа',
    );
  }

  Future<void> _unconfirm() async {
    if (!await confirmAction(
      context,
      title: 'Батламжийг цуцлах уу',
      message: 'Ирц, тэмдэглэл хадгалагдана, дахин батлах боломжтой',
      confirmLabel: 'Цуцлах',
    )) {
      return;
    }
    if (!mounted) return;
    final repo = ref.read(staffScheduleRepositoryProvider);
    await _run(() => repo.unconfirmLesson(widget.lesson.scheduleId, date: widget.date), 'Батламж цуцлагдлаа');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = widget.lesson;
    final record = l.record;
    final manual = [
      for (final d in l.done)
        if (d.testId == null && d.manualTitle != null) d.manualTitle!,
    ];
    final numbers = _numbers.text.trim();
    final parsed = parseProblemNumbers(numbers);
    return _SheetFrame(
      title: '${shortClass(l.classroomName)}, батлах',
      subtitle: [_when(l, widget.date), if (record != null) '${record.confirmedByName} баталсан'].join(', '),
      controller: widget.controller,
      dirty: _dirty && !_busy,
      error: _error,
      footer: [
        if (record != null)
          TextButton(
            onPressed: _busy ? null : () => unawaited(_unconfirm()),
            style: TextButton.styleFrom(foregroundColor: c.error),
            child: const Text('Батламж цуцлах'),
          ),
        OutlinedButton(
          onPressed: _busy ? null : () => Navigator.of(context).maybePop(),
          child: const Text(AppStrings.cancel),
        ),
        FilledButton.icon(
          onPressed: _busy ? null : () => unawaited(_confirm()),
          icon: const Icon(AppIcons.badgeCheck, size: 18),
          label: Text(_busy ? 'Хадгалж байна' : 'Батлах'),
        ),
      ],
      children: [
        const _Section('Хийсэн тест'),
        if (_rows.isEmpty)
          Text('Тест сонгоогүй, ирц ба багшийг л батална', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
        for (final r in _rows) ...[
          _DoneRow(
            key: ValueKey('done:${r.testId}'),
            test: _info(r.testId),
            excluded: r.excluded,
            open: _open == r.testId,
            onToggleOpen: () => setState(() => _open = _open == r.testId ? null : r.testId),
            onToggleNumber: (p) => _toggleNumber(r.testId, p),
            onRemove: () => setState(() => _rows = [..._rows]..removeWhere((x) => x.testId == r.testId)),
          ),
          const SizedBox(height: AppSpace.sm),
        ],
        if (manual.isNotEmpty) Text('Гараар бүртгэсэн: ${manual.join(', ')}', style: context.text.bodySmall),
        const SizedBox(height: AppSpace.sm),
        if (_adding)
          AppCard(
            child: TestPicker(
              classroomId: l.classroomId,
              date: widget.date,
              selected: [for (final r in _rows) r.testId],
              keepIds: [for (final r in _rows) r.testId],
              onChanged: (ids) {
                setState(() {
                  _rows = [
                    for (final id in ids)
                      _rows.firstWhere((r) => r.testId == id, orElse: () => (testId: id, excluded: <String>[])),
                  ];
                });
                unawaited(_loadMissing());
              },
              customTopics: _topics,
              onCustomTopicsChange: (t) => setState(() => _topics = t),
              hideChips: true,
              canRemove: widget.canRemoveTests,
            ),
          )
        else ...[
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: OutlinedButton.icon(
              key: const ValueKey('confirm:add'),
              onPressed: () => setState(() => _adding = true),
              icon: const Icon(AppIcons.add, size: 18),
              label: const Text('Тест, сэдэв нэмэх'),
            ),
          ),
          if (_topics.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Text('Сэдэв: ${_topics.join(', ')}', style: context.text.bodyMedium),
          ],
        ],
        const _Section('Бодсон бодлогын дугаар'),
        TextField(
          key: const ValueKey('confirm:numbers'),
          controller: _numbers,
          maxLength: 200,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            hintText: 'Жишээ нь 1-12, 15, 20',
            counterText: '',
            helperText: numbers.isEmpty
                ? 'Заавал биш, муж, таслалаар бичнэ'
                : parsed != null
                ? '${parsed.length} бодлого'
                : 'Тоогоор задлах боломжгүй, бичсэнээр нь хадгална',
          ),
        ),
        const _Section('Тайлбар'),
        TextField(
          key: const ValueKey('confirm:description'),
          controller: _description,
          maxLength: descriptionMax,
          minLines: 2,
          maxLines: 6,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(hintText: 'Хичээлд юу хийснийг товч бичнэ'),
        ),
      ],
    );
  }
}

/// Хийсэн тестийн мөр: нэр, хассан дугаар, дарахад бодлогын дугаарын тор (ангид хийгээгүйг тэмдэглэх).
class _DoneRow extends StatelessWidget {
  const _DoneRow({
    super.key,
    required this.test,
    required this.excluded,
    required this.open,
    required this.onToggleOpen,
    required this.onToggleNumber,
    required this.onRemove,
  });

  final PlanTest? test;
  final List<String> excluded;
  final bool open;
  final VoidCallback onToggleOpen;
  final ValueChanged<String> onToggleNumber;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final t = test;
    final name = t?.short ?? 'Тест';
    final numbers = [
      if (t != null)
        for (var i = 0; i < t.problemIds.length; i++)
          if (excluded.contains(t.problemIds[i])) i + 1,
    ];
    return AppCard(
      padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.xs, AppSpace.xs, AppSpace.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: context.text.titleSmall),
                    if (numbers.isNotEmpty)
                      Text(
                        'Хассан: ${numbers.join(', ')}',
                        style: context.text.bodySmall?.copyWith(color: c.error, fontWeight: FontWeight.w600),
                      ),
                  ],
                ),
              ),
              TextButton.icon(
                onPressed: t == null || t.problemIds.isEmpty ? null : onToggleOpen,
                icon: Icon(open ? AppIcons.expand : AppIcons.forward, size: 18),
                label: const Text('Хассан бодлого'),
              ),
              IconButton(tooltip: '$name хасах', icon: const Icon(AppIcons.close), onPressed: onRemove),
            ],
          ),
          if (open && t != null) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(0, AppSpace.sm, AppSpace.sm, AppSpace.sm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Ангид хийгээгүй бодлогын дугаарыг дар', style: context.text.bodySmall),
                  const SizedBox(height: AppSpace.sm),
                  Wrap(
                    spacing: AppSpace.xs,
                    runSpacing: AppSpace.xs,
                    children: [
                      for (var i = 0; i < t.problemIds.length; i++)
                        _NumberToggle(
                          key: ValueKey('num:${t.id}:${i + 1}'),
                          number: i + 1,
                          on: excluded.contains(t.problemIds[i]),
                          onTap: () => onToggleNumber(t.problemIds[i]),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _NumberToggle extends StatelessWidget {
  const _NumberToggle({super.key, required this.number, required this.on, required this.onTap});

  final int number;
  final bool on;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      toggled: on,
      label: on ? '$number-р бодлого хассан' : '$number-р бодлого',
      excludeSemantics: true,
      child: Material(
        color: on ? c.surfaceSunken : c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          side: BorderSide(color: on ? c.error : c.line),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadius.sm),
          child: SizedBox.square(
            dimension: AppSizes.minTap,
            child: Center(
              child: Text(
                '$number',
                style: context.text.labelLarge?.copyWith(
                  color: on ? c.error : c.ink,
                  decoration: on ? TextDecoration.lineThrough : null,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
