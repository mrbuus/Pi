import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../teacher/application/teacher_providers.dart' show errorText;
import '../application/results_providers.dart';
import '../data/results_models.dart';
import '../domain/results_logic.dart';
import 'results_widgets.dart';
import 'student_search_sheet.dart';

/// «Оруулах» таб — вэбийн `BulkScoreEntry` + «Ангийн жагсаалтад байхгүй сурагч нэмэх».
///
/// Анги сонгоод сурагч бүрийн оноог дараалан бичнэ («Дараах» товч дараагийн мөр рүү). Дүнтэй сурагч
/// түгжээтэй — «Дахин оруулах» дарж л засна. Онлайнаар өгсөн дүнг зөвхөн Багш+/Админ шалтгаантай засна
/// (сервертэй ижил), Багшид товч харагдахгүй.
class ScoreEntryTab extends ConsumerStatefulWidget {
  const ScoreEntryTab({super.key, required this.testId, required this.onSaved, this.preferredClassId});

  final String testId;
  final String? preferredClassId;
  final VoidCallback onSaved;

  @override
  ConsumerState<ScoreEntryTab> createState() => _ScoreEntryTabState();
}

class _ScoreEntryTabState extends ConsumerState<ScoreEntryTab> with AutomaticKeepAliveClientMixin {
  String? _classId;
  final _max = TextEditingController(text: '100');
  final _controllers = <String, TextEditingController>{};
  final _focus = <String, FocusNode>{};
  Map<String, EntryState> _entries = const {};
  List<RosterStudent>? _roster;
  bool _saving = false;
  ({bool ok, String text})? _banner;

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _max.dispose();
    _disposeRows();
    super.dispose();
  }

  void _disposeRows() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    for (final f in _focus.values) {
      f.dispose();
    }
    _controllers.clear();
    _focus.clear();
  }

  num get _maxInitial {
    final m = _maxScore;
    if (m == null) return 100;
    return m == m.roundToDouble() ? m.toInt() : m;
  }

  double? get _maxScore {
    final v = parseScore(_max.text);
    return v != null && v > 0 ? v : null;
  }

  /// Бүртгэл солигдоход (анги солих, анх ачаалах) мөрүүдийг шинээр эхлүүлнэ.
  void _initRows(List<RosterStudent> roster, List<ResultRow> results) {
    _disposeRows();
    final existing = {for (final r in results) r.studentId: r};
    _entries = initialEntries(roster, existing);
    for (final s in roster) {
      _controllers[s.id] = TextEditingController(text: _entries[s.id]!.value);
      _focus[s.id] = FocusNode();
    }
    _roster = roster;
    _banner = null;
  }

  void _setValue(String id, String v) =>
      setState(() => _entries = {..._entries, id: _entries[id]!.copyWith(value: v, save: SaveState.idle)});

  Future<void> _reenter(RosterStudent s, ResultRow existing) async {
    final access = ref.read(resultsAccessProvider);
    String? reason;
    if (access.needsReason(existing)) {
      reason = await showFormSheet<String>(
        context,
        title: 'Онлайн дүнг засах',
        subtitle: '${s.name}, одоо ${existing.scoreText}',
        submitLabel: 'Үргэлжлүүлэх',
        fields: [
          FormTextField(
            name: 'reason',
            label: 'Шалтгаан',
            hint: 'Жишээ нь: хариуны түлхүүр зассан',
            required: true,
            maxLines: 2,
            validator: (v) => v.trim().length < minReasonLength ? 'Шалтгаанаа бичнэ үү' : null,
          ),
        ],
        onSubmit: (v) async => v.text('reason'),
      );
      if (reason == null) return;
    }
    setState(() => _entries = {..._entries, s.id: _entries[s.id]!.copyWith(locked: false, reason: reason)});
    WidgetsBinding.instance.addPostFrameCallback((_) => _focus[s.id]?.requestFocus());
  }

  void _next(int index) {
    final roster = _roster ?? const <RosterStudent>[];
    for (var i = index + 1; i < roster.length; i++) {
      final e = _entries[roster[i].id];
      if (e != null && !e.locked) {
        _focus[roster[i].id]?.requestFocus();
        return;
      }
    }
    FocusScope.of(context).unfocus();
  }

  Future<void> _saveAll() async {
    final roster = _roster;
    if (roster == null || _saving) return;
    final max = _maxScore;
    if (max == null) {
      setState(() => _banner = (ok: false, text: 'Нийт оноог 0-ээс их тоогоор бичнэ үү'));
      return;
    }
    final candidates = saveCandidates(roster, _entries, max);
    if (candidates.isEmpty) {
      setState(() => _banner = (ok: false, text: 'Хадгалах шинэ дүн алга байна'));
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _saving = true;
      _banner = null;
      _entries = {..._entries, for (final s in candidates) s.id: _entries[s.id]!.copyWith(save: SaveState.saving)};
    });
    final repo = ref.read(resultsRepositoryProvider);
    final outcomes = await Future.wait([
      for (final s in candidates)
        repo
            .enterResult(
              widget.testId,
              studentId: s.id,
              totalScore: parseScore(_entries[s.id]!.value)!,
              maxScore: max,
              reason: _entries[s.id]!.reason,
            )
            .then<(String, String?)>(
              (_) => (s.id, null),
              onError: (Object e) => (s.id, errorText(e, 'Хадгалагдсангүй')),
            ),
    ]);
    if (!mounted) return;
    final failed = outcomes.where((o) => o.$2 != null).length;
    setState(() {
      _saving = false;
      _entries = {
        ..._entries,
        for (final (id, err) in outcomes)
          id: err == null
              ? _entries[id]!.copyWith(save: SaveState.saved, locked: true)
              : _entries[id]!.copyWith(save: SaveState.error, error: err),
      };
      _banner = failed > 0
          ? (ok: false, text: '$failed мөр хадгалагдсангүй. Утга нь хэвээр, дахин «Бүгдийг хадгалах» дарна уу')
          : (ok: true, text: '${outcomes.length} сурагчийн дүн хадгалагдлаа');
    });
    widget.onSaved();
  }

  Future<void> _addOutsider() async {
    final hit = await showStudentSearchSheet(context);
    if (hit == null || !mounted) return;
    final access = ref.read(resultsAccessProvider);
    final results = ref.read(testResultsProvider(widget.testId)).value ?? const <ResultRow>[];
    ResultRow? existing;
    for (final r in results) {
      if (r.studentId == hit.id) existing = r;
    }
    if (existing != null && existing.isOnline && !access.canOverrideOnline) {
      _snack('Онлайнаар өгсөн дүнг зөвхөн Багш+ эсвэл админ засна');
      return;
    }
    final needReason = existing?.isOnline ?? false;
    final saved = await showFormSheet<String>(
      context,
      title: 'Дүн оруулах',
      subtitle: [
        hit.name,
        hit.studentCode,
        if (existing != null) 'одоо ${existing.scoreText}',
      ].whereType<String>().join(', '),
      submitLabel: 'Оруулах',
      fields: [
        const FormNumberField(name: 'total', label: 'Авсан оноо', required: true, decimal: true, min: 0),
        FormNumberField(name: 'max', label: 'Нийт оноо', required: true, decimal: true, min: 1, initial: _maxInitial),
        if (needReason)
          FormTextField(
            name: 'reason',
            label: 'Засах шалтгаан',
            required: true,
            maxLines: 2,
            validator: (v) => v.trim().length < minReasonLength ? 'Шалтгаанаа бичнэ үү' : null,
          ),
      ],
      onSubmit: (v) async {
        final total = v.number('total')!.toDouble();
        final max = v.number('max')!.toDouble();
        if (total > max) throw const ApiError(ApiErrorKind.badRequest, 'Авсан оноо нийт онооноос их байж болохгүй');
        await ref
            .read(resultsRepositoryProvider)
            .enterResult(
              widget.testId,
              studentId: hit.id,
              totalScore: total,
              maxScore: max,
              reason: needReason ? v.text('reason') : null,
            );
        return hit.name;
      },
    );
    if (saved == null || !mounted) return;
    _snack('$saved, дүн орлоо');
    widget.onSaved();
  }

  void _snack(String text) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final access = ref.watch(resultsAccessProvider);
    final optionsAsync = ref.watch(resultClassOptionsProvider(widget.testId));
    final options = optionsAsync.value ?? const <ClassOption>[];
    final classId = _classId ?? _defaultClass(options);
    final resultsAsync = ref.watch(testResultsProvider(widget.testId));
    final results = resultsAsync.value;
    final rosterAsync = classId == null ? null : ref.watch(classRosterProvider(classId));
    final roster = rosterAsync?.value;
    if (roster != null && results != null && !identical(roster, _roster)) _initRows(roster, results);
    final existing = {for (final r in results ?? const <ResultRow>[]) r.studentId: r};
    final max = _maxScore;

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: ClassChips(
            options: options,
            selected: classId,
            allowAll: false,
            onSelected: (id) => setState(() => _classId = id),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
          sliver: SliverToBoxAdapter(
            child: Row(
              children: [
                SizedBox(
                  width: 120,
                  child: TextField(
                    key: const ValueKey('entry:max'),
                    controller: _max,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                    decoration: InputDecoration(labelText: 'Нийт оноо', errorText: max == null ? 'Буруу' : null),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
                const SizedBox(width: AppSpace.lg),
                if (roster != null)
                  Expanded(
                    child: Text(
                      '${filledCount(roster, _entries)} / ${roster.length} оруулсан',
                      style: context.text.titleSmall,
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (resultsAsync.hasError && results == null)
          SliverToBoxAdapter(
            child: ErrorState(
              message: errorText(resultsAsync.error!, 'Одоогийн дүнг ачаалж чадсангүй'),
              onRetry: () => ref.invalidate(testResultsProvider(widget.testId)),
            ),
          )
        else
          ..._rosterSlivers(context, optionsAsync, rosterAsync, results == null ? null : roster, existing, max, access),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.lg, AppSpace.gutter, AppSpace.xxl),
          sliver: SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_banner != null) ...[
                  Text(
                    _banner!.text,
                    style: context.text.bodyMedium?.copyWith(
                      color: _banner!.ok ? context.colors.success : context.colors.error,
                    ),
                  ),
                  const SizedBox(height: AppSpace.sm),
                ],
                if (roster != null && roster.isNotEmpty)
                  FilledButton(
                    key: const ValueKey('entry:save'),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                    onPressed: _saving ? null : _saveAll,
                    child: Text(_saving ? 'Хадгалж байна' : 'Бүгдийг хадгалах'),
                  ),
                const SizedBox(height: AppSpace.md),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                  icon: const Icon(AppIcons.add),
                  label: const Text('Ангид байхгүй сурагч нэмэх'),
                  onPressed: _addOutsider,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String? _defaultClass(List<ClassOption> options) {
    if (options.isEmpty) return null;
    final pref = widget.preferredClassId;
    if (pref != null && options.any((c) => c.id == pref)) return pref;
    return options.first.id;
  }

  List<Widget> _rosterSlivers(
    BuildContext context,
    AsyncValue<List<ClassOption>> optionsAsync,
    AsyncValue<List<RosterStudent>>? rosterAsync,
    List<RosterStudent>? roster,
    Map<String, ResultRow> existing,
    double? max,
    ResultsAccess access,
  ) {
    Widget box(Widget child) => SliverToBoxAdapter(child: child);
    if (optionsAsync.isLoading && !optionsAsync.hasValue) return [box(const LoadingState(cards: 2))];
    if ((optionsAsync.value ?? const []).isEmpty) {
      return [
        box(
          const EmptyState(
            icon: AppIcons.myClass,
            title: 'Анги олдсонгүй',
            message: 'Сурагчийг доорх товчоор нэг нэгээр нь нэмнэ үү',
          ),
        ),
      ];
    }
    if (rosterAsync == null) return const [];
    if (rosterAsync.hasError && roster == null) {
      return [
        box(
          ErrorState(
            message: errorText(rosterAsync.error!, 'Ангийн жагсаалт ачаалж чадсангүй'),
            onRetry: () => ref.invalidate(classRosterProvider(_classId ?? _defaultClass(optionsAsync.value!)!)),
          ),
        ),
      ];
    }
    if (roster == null) return [box(const LoadingState(cards: 3))];
    if (roster.isEmpty) {
      return [box(const EmptyState(icon: AppIcons.students, title: 'Энэ ангид идэвхтэй сурагч алга'))];
    }
    return [
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
        sliver: SliverList.separated(
          itemCount: roster.length,
          separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
          itemBuilder: (context, i) {
            final s = roster[i];
            return _EntryRow(
              index: i,
              student: s,
              entry: _entries[s.id] ?? const EntryState(),
              existing: existing[s.id],
              controller: _controllers[s.id]!,
              focus: _focus[s.id]!,
              max: max,
              canReenter: existing[s.id] != null && access.canReenter(existing[s.id]!),
              onChanged: (v) => _setValue(s.id, v),
              onNext: () => _next(i),
              onReenter: () => _reenter(s, existing[s.id]!),
            );
          },
        ),
      ),
    ];
  }
}

class _EntryRow extends StatelessWidget {
  const _EntryRow({
    required this.index,
    required this.student,
    required this.entry,
    required this.existing,
    required this.controller,
    required this.focus,
    required this.max,
    required this.canReenter,
    required this.onChanged,
    required this.onNext,
    required this.onReenter,
  });

  final int index;
  final RosterStudent student;
  final EntryState entry;
  final ResultRow? existing;
  final TextEditingController controller;
  final FocusNode focus;
  final double? max;
  final bool canReenter;
  final ValueChanged<String> onChanged;
  final VoidCallback onNext;
  final VoidCallback onReenter;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final error = entry.locked ? null : scoreRangeError(entry.value, max ?? 0);
    final suspicious = !entry.locked && error == null && isSuspiciousZero(entry.value, existing);
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    return AppCard(
      padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.sm, AppSpace.sm, AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(width: 28, child: Text('${index + 1}.', style: dim)),
              Expanded(child: Text(student.name, style: context.text.titleSmall)),
              if (entry.locked && existing != null) ...[
                Text(existing!.scoreText, style: context.text.titleSmall),
                const SizedBox(width: AppSpace.xs),
                if (canReenter)
                  TextButton(
                    key: ValueKey('reenter:${student.id}'),
                    style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                    onPressed: onReenter,
                    child: const Text('Дахин оруулах'),
                  )
                else
                  Tooltip(
                    message: 'Онлайнаар өгсөн дүнг зөвхөн Багш+ эсвэл админ засна',
                    child: SizedBox(width: 48, height: 48, child: Icon(AppIcons.secure, size: 18, color: c.inkDim)),
                  ),
              ] else if (entry.locked && entry.save == SaveState.saved) ...[
                Icon(AppIcons.success, size: 18, color: c.success),
                const SizedBox(width: AppSpace.xs),
                Text(entry.value, style: context.text.titleSmall),
                const SizedBox(width: AppSpace.md),
              ] else ...[
                SizedBox(
                  width: 88,
                  child: TextField(
                    key: ValueKey('score:${student.id}'),
                    controller: controller,
                    focusNode: focus,
                    textAlign: TextAlign.right,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    textInputAction: TextInputAction.next,
                    inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                    decoration: InputDecoration(
                      hintText: 'Оноо',
                      isDense: true,
                      constraints: const BoxConstraints(minHeight: 48),
                      error: error == null ? null : const SizedBox.shrink(),
                    ),
                    onChanged: onChanged,
                    onSubmitted: (_) => onNext(),
                  ),
                ),
                SizedBox(width: 48, child: Text(' / ${max == null ? '—' : fmtScore(max!)}', style: dim)),
              ],
            ],
          ),
          if (entry.locked && existing != null)
            Padding(
              padding: const EdgeInsets.only(left: 28),
              child: Text(ResultSource.label(existing!.source), style: dim),
            ),
          if (error != null) _line(context, AppIcons.warning, error, c.error),
          if (suspicious)
            _line(context, AppIcons.warning, 'Өмнө нь ${existing!.scoreText} дүнтэй байсан, шалгана уу', c.warning),
          if (!entry.locked && existing != null && entry.reason != null)
            _line(context, AppIcons.info, 'Онлайн дүнг засаж байна: ${entry.reason}', c.inkDim),
          if (entry.save == SaveState.saving) _line(context, AppIcons.loaderCircle, 'Хадгалж байна', c.inkDim),
          if (entry.save == SaveState.error)
            _line(context, AppIcons.failure, entry.error ?? 'Хадгалагдсангүй', c.error),
        ],
      ),
    );
  }

  Widget _line(BuildContext context, IconData icon, String text, Color color) => Padding(
    padding: const EdgeInsets.only(left: 28, top: AppSpace.xs),
    child: Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: AppSpace.xs),
        Expanded(
          child: Text(text, style: context.text.bodySmall?.copyWith(color: color)),
        ),
      ],
    ),
  );
}
