import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/authoring_models.dart';
import '../data/authoring_repository.dart';
import '../domain/builder_logic.dart';
import '../domain/editor_model.dart';
import 'authoring_widgets.dart';

/// Бодлогын сангаас сонгох (вэбийн `ProblemPicker` + `BankDialog`): бүлэг → хайлт, шүүлтүүр →
/// дарж сонгоно, сонгосон дарааллаар буцна. Тестэд байгаа бодлого ([excludeIds]) гарахгүй.
///
/// Сервер бодлогыг бүлгээр (`GET /chapters/:id/problems?take=100`) өгдөг — хайлт тухайн бүлэг дотор.
class BankPickerScreen extends ConsumerStatefulWidget {
  const BankPickerScreen({
    super.key,
    this.subject = '',
    this.initialChapterId = '',
    this.lockChapter = false,
    this.excludeIds = const {},
    this.initialSelected = const [],
    this.title = 'Сангаас бодлого нэмэх',
  });

  final String subject;
  final String initialChapterId;

  /// Тест үүсгэхэд: маягтын бүлгээс л сонгоно.
  final bool lockChapter;
  final Set<String> excludeIds;
  final List<String> initialSelected;
  final String title;

  static Future<List<ServerProblem>?> open(
    BuildContext context, {
    String subject = '',
    String initialChapterId = '',
    bool lockChapter = false,
    Set<String> excludeIds = const {},
    List<String> initialSelected = const [],
    String title = 'Сангаас бодлого нэмэх',
  }) => Navigator.of(context).push<List<ServerProblem>>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => BankPickerScreen(
        subject: subject,
        initialChapterId: initialChapterId,
        lockChapter: lockChapter,
        excludeIds: excludeIds,
        initialSelected: initialSelected,
        title: title,
      ),
    ),
  );

  @override
  ConsumerState<BankPickerScreen> createState() => _BankPickerScreenState();
}

class _BankPickerScreenState extends ConsumerState<BankPickerScreen> {
  List<ChapterOption> _chapters = const [];
  late String _chapterId = widget.initialChapterId;
  List<ServerProblem> _problems = const [];
  bool _loading = false;
  String _error = '';
  late List<String> _selected = [...widget.initialSelected];
  BankFilter _filter = const BankFilter();
  final _search = TextEditingController();
  int _load = 0;

  TestAuthoringRepository get _repo => ref.read(testAuthoringRepositoryProvider);

  @override
  void initState() {
    super.initState();
    if (!widget.lockChapter) unawaited(_loadChapters());
    if (_chapterId.isNotEmpty) unawaited(_loadProblems());
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _loadChapters() async {
    try {
      final rows = await _repo.chapters(subject: widget.subject);
      if (mounted) setState(() => _chapters = rows);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  Future<void> _loadProblems() async {
    final load = ++_load;
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final rows = await _repo.chapterProblems(_chapterId);
      if (!mounted || load != _load) return;
      setState(() => _problems = rows);
    } on ApiError catch (e) {
      if (mounted && load == _load) setState(() => _error = e.message);
    } finally {
      if (mounted && load == _load) setState(() => _loading = false);
    }
  }

  List<ServerProblem> get _visible => [
    for (final p in _problems)
      if (!widget.excludeIds.contains(p.id) && _filter.matches(p)) p,
  ];

  void _toggle(String id) => setState(() {
    if (!_selected.remove(id)) _selected.add(id);
  });

  void _finish() {
    final byId = {for (final p in _problems) p.id: p};
    Navigator.of(context).pop([
      for (final id in _selected)
        if (byId[id] case final ServerProblem p) p,
    ]);
  }

  Future<void> _pickChapter() async {
    final picked = await showSelectSheet<String>(
      context,
      title: 'Бүлэг сэдэв',
      selected: _chapterId,
      searchThreshold: 0,
      options: [
        for (final ch in _chapters)
          SelectOption(
            ch.id,
            ch.label,
            subtitle: [if (ch.grade != null) '${ch.grade}-р анги', '${ch.problemCount} бодлого'].join(', '),
          ),
      ],
    );
    if (picked == null || picked.value == _chapterId) return;
    setState(() {
      _chapterId = picked.value;
      _selected = [];
      _problems = const [];
    });
    await _loadProblems();
  }

  Future<void> _openFilters() async {
    final next = await showFormSheet<BankFilter>(
      context,
      title: 'Шүүлтүүр',
      submitLabel: 'Хэрэглэх',
      fields: [
        FormSelectField<String>(
          name: 'format',
          label: 'Төрөл',
          initial: _filter.format,
          options: const [
            SelectOption('', 'Бүх төрөл'),
            SelectOption(ProblemFormats.choice, 'Сонгох'),
            SelectOption(ProblemFormats.fill, 'Нөхөх'),
            SelectOption(ProblemFormats.open, 'Задгай'),
          ],
        ),
        FormSelectField<String>(
          name: 'difficulty',
          label: 'Түвшин',
          initial: _filter.difficulty?.name ?? '',
          options: [
            const SelectOption('', 'Бүх түвшин'),
            for (final d in Difficulty.values) SelectOption(d.name, d.label),
          ],
        ),
        FormSelectField<AnswerKeyFilter>(
          name: 'answer',
          label: 'Хариу',
          initial: _filter.answerKey,
          options: const [
            SelectOption(AnswerKeyFilter.any, 'Бүгд'),
            SelectOption(AnswerKeyFilter.known, 'Хариутай'),
            SelectOption(AnswerKeyFilter.missing, 'Хариугүй'),
          ],
        ),
        FormSelectField<ImageFilter>(
          name: 'image',
          label: 'Зураг',
          initial: _filter.image,
          options: const [
            SelectOption(ImageFilter.any, 'Бүгд'),
            SelectOption(ImageFilter.yes, 'Зурагтай'),
            SelectOption(ImageFilter.no, 'Зураггүй'),
          ],
        ),
      ],
      onSubmit: (v) async => _filter.copyWith(
        format: v.get<String>('format') ?? '',
        difficulty: () => Difficulty.values.where((d) => d.name == v.get<String>('difficulty')).firstOrNull,
        answerKey: v.get<AnswerKeyFilter>('answer') ?? AnswerKeyFilter.any,
        image: v.get<ImageFilter>('image') ?? ImageFilter.any,
      ),
    );
    if (next != null) setState(() => _filter = next);
  }

  int get _activeFilters =>
      (_filter.format.isEmpty ? 0 : 1) +
      (_filter.difficulty == null ? 0 : 1) +
      (_filter.answerKey == AnswerKeyFilter.any ? 0 : 1) +
      (_filter.image == ImageFilter.any ? 0 : 1);

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final visible = _visible;
    final missing = visible.where((p) => !hasKnownAnswer(p)).length;
    final chapter = _chapters.where((ch) => ch.id == _chapterId).firstOrNull;
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
          child: FilledButton(
            key: const Key('bank-done'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
            onPressed: widget.lockChapter || _selected.isNotEmpty ? _finish : null,
            child: Text(
              widget.lockChapter
                  ? 'Болсон (${_selected.length})'
                  : (_selected.isEmpty ? 'Бодлого сонгоно уу' : '${_selected.length} бодлого нэмэх'),
            ),
          ),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
            sliver: SliverList.list(
              children: [
                if (!widget.lockChapter)
                  PickerRow(
                    label: 'Бүлэг сэдэв',
                    value: chapter?.label ?? (_chapterId.isEmpty ? 'Бүлэг сонгоно уу' : 'Сонгосон бүлэг'),
                    icon: AppIcons.library,
                    onTap: _chapters.isEmpty ? null : () => unawaited(_pickChapter()),
                  ),
                const SizedBox(height: AppSpace.sm),
                TextField(
                  key: const Key('bank-search'),
                  controller: _search,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(AppIcons.search),
                    hintText: 'Код, бодлогын текст, сэдвээр хайх',
                  ),
                  onChanged: (q) => setState(() => _filter = _filter.copyWith(search: q)),
                ),
                const SizedBox(height: AppSpace.sm),
                Wrap(
                  spacing: AppSpace.sm,
                  runSpacing: AppSpace.sm,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => unawaited(_openFilters()),
                      icon: const Icon(AppIcons.slidersHorizontal, size: 18),
                      label: Text(_activeFilters == 0 ? 'Шүүлтүүр' : 'Шүүлтүүр ($_activeFilters)'),
                    ),
                    TextButton(
                      onPressed: visible.isEmpty
                          ? null
                          : () => setState(() => _selected = [for (final p in visible.take(40)) p.id]),
                      child: const Text('Эхний 40'),
                    ),
                    TextButton(
                      onPressed: _selected.isEmpty ? null : () => setState(() => _selected = []),
                      child: const Text('Цэвэрлэх'),
                    ),
                  ],
                ),
                if (_chapterId.isNotEmpty && !_loading && _error.isEmpty) ...[
                  const SizedBox(height: AppSpace.xs),
                  Meta(
                    items: [
                      '${visible.length} бодлого',
                      '${_selected.length} сонгосон',
                      if (missing > 0) '$missing хариугүй',
                    ],
                    style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  ),
                ],
                const SizedBox(height: AppSpace.sm),
              ],
            ),
          ),
          if (_chapterId.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(icon: AppIcons.library, title: 'Бүлэг сэдэв сонгоно уу'),
            )
          else if (_loading)
            const SliverToBoxAdapter(child: LoadingState(cards: 3))
          else if (_error.isNotEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: ErrorState(
                title: 'Бодлого ачаалж чадсангүй',
                message: _error,
                onRetry: () => unawaited(_loadProblems()),
              ),
            )
          else if (visible.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(icon: AppIcons.search, title: 'Бодлого олдсонгүй'),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
              sliver: SliverList.separated(
                itemCount: visible.length,
                separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
                itemBuilder: (context, i) {
                  final p = visible[i];
                  final order = _selected.indexOf(p.id);
                  return _BankTile(
                    problem: p,
                    order: order < 0 ? null : order + 1,
                    onTap: () => _toggle(p.id),
                    onPreview: () => unawaited(showStudentPreview(context, contentOf(p), points: p.points ?? 1)),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _BankTile extends StatelessWidget {
  const _BankTile({required this.problem, required this.order, required this.onTap, required this.onPreview});

  final ServerProblem problem;

  /// Сонгосон дараалал (1-ээс), сонгоогүй бол `null`.
  final int? order;
  final VoidCallback onTap;
  final VoidCallback onPreview;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = problem;
    final known = hasKnownAnswer(p);
    final difficulty = difficultyOf(p);
    final selected = order != null;
    return Semantics(
      selected: selected,
      child: AppCard(
        accent: selected ? c.brandBright : (known ? null : c.error),
        onTap: onTap,
        padding: const EdgeInsets.all(AppSpace.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selected ? c.brandBright : c.surfaceSunken,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: selected
                  ? Text('$order', style: context.text.titleSmall?.copyWith(color: c.onBrand))
                  : Icon(AppIcons.add, size: 18, color: c.inkDim),
            ),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: AppSpace.xs,
                    runSpacing: AppSpace.xs,
                    children: [
                      MetaChip(label: ProblemFormats.label(p.format), tone: ChipTone.brand),
                      MetaChip(label: '${p.points ?? 1} оноо'),
                      if (p.variantLabel != null) MetaChip(label: '${p.variantLabel} хувилбар'),
                      if (difficulty != Difficulty.unknown) MetaChip(label: difficulty.label),
                      if (!known) const MetaChip(label: 'Хариугүй', icon: AppIcons.warning, tone: ChipTone.error),
                      if (p.imageKey != null) const MetaChip(label: 'Зурагтай', icon: AppIcons.images),
                    ],
                  ),
                  const SizedBox(height: AppSpace.sm),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 96),
                    child: ClipRect(
                      child: (p.statementText ?? '').trim().isEmpty
                          ? Text('Зурагтай бодлого', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
                          : MathText(p.statementText!),
                    ),
                  ),
                ],
              ),
            ),
            IconButton(tooltip: 'Сурагчид харагдах', onPressed: onPreview, icon: const Icon(AppIcons.show)),
          ],
        ),
      ),
    );
  }
}
