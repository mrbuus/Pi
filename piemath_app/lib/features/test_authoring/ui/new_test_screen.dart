import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/draft_autosaver.dart';
import '../application/new_test_controller.dart';
import '../data/authoring_models.dart';
import '../data/authoring_repository.dart';
import '../data/authoring_storage.dart';
import '../domain/builder_logic.dart';
import '../domain/editor_model.dart';
import 'authoring_widgets.dart';
import 'bank_picker_screen.dart';

/// `/app/tests/new` — тест үүсгэх (вэбийн `NewTestPage`): 1. Үндсэн мэдээлэл, 2. Бодлого сонгох,
/// 3. Оноо, дараалал (чирж эрэмбэлнэ), 4. Хэн үзэх вэ. Маягт серверт ноорог болж автоматаар хадгалагдана.
class NewTestScreen extends ConsumerWidget {
  const NewTestScreen({super.key, this.subject = ''});

  /// `?subject=SOCIAL_STUDIES` (номын сангаас).
  final String subject;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final perms = ref.watch(authoringPermissionsProvider);
    if (!perms.canAuthor || perms.userId == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Тест үүсгэх')),
        body: const AuthoringDenied(),
      );
    }
    return _NewTestBody(subject: subject, ownerId: perms.userId!);
  }
}

class _NewTestBody extends ConsumerStatefulWidget {
  const _NewTestBody({required this.subject, required this.ownerId});

  final String subject;
  final String ownerId;

  @override
  ConsumerState<_NewTestBody> createState() => _NewTestBodyState();
}

class _NewTestBodyState extends ConsumerState<_NewTestBody> {
  late final _repo = ref.read(testAuthoringRepositoryProvider);
  late final _autosaver = DraftAutosaver(
    repository: _repo,
    store: ref.read(draftPointerStoreProvider),
    ownerId: widget.ownerId,
  );
  late final NewTestController _c = NewTestController(
    repository: _repo,
    autosaver: _autosaver,
    initialSubject: widget.subject,
  );
  final _title = TextEditingController();
  final _time = TextEditingController();
  final _group = TextEditingController();
  final _variant = TextEditingController();
  final _pdf = TextEditingController();
  final _bulk = TextEditingController(text: '1');
  bool _allowPop = false;
  bool _redirected = false;

  @override
  void initState() {
    super.initState();
    unawaited(_c.start());
  }

  @override
  void dispose() {
    _c.dispose();
    _autosaver.dispose();
    for (final t in [_title, _time, _group, _variant, _pdf, _bulk]) {
      t.dispose();
    }
    super.dispose();
  }

  BuilderForm get _f => _c.form;

  void _sync(TextEditingController t, String value) {
    if (t.text != value) {
      t.value = TextEditingValue(
        text: value,
        selection: TextSelection.collapsed(offset: value.length),
      );
    }
  }

  Future<void> _onBlockedPop() async {
    final leave = await confirmAction(
      context,
      title: FormMessages.unsavedTitle,
      message: 'Ноорог серверт хадгалагдсан тул дараа үргэлжлүүлж болно',
      confirmLabel: 'Гарах',
      cancelLabel: FormMessages.keepEditing,
      destructive: false,
    );
    if (leave) _leave();
  }

  void _leave() {
    setState(() => _allowPop = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/app/tests');
      }
    });
  }

  Future<void> _select<T>(String title, List<SelectOption<T>> options, T selected, void Function(T v) apply) async {
    final picked = await showSelectSheet<T>(context, title: title, options: options, selected: selected);
    if (picked != null) apply(picked.value);
  }

  Future<void> _pickProblems() async {
    final picked = await BankPickerScreen.open(
      context,
      subject: _f.subject,
      initialChapterId: _f.chapterId,
      lockChapter: true,
      initialSelected: _f.selectedProblems,
      title: 'Бодлого сонгох',
    );
    if (picked == null || !mounted) return;
    final ids = [for (final p in picked) p.id];
    final keep = {for (final id in ids) id};
    _c.update(
      _f.copyWith(
        selectedProblems: ids,
        pointOverrides: {
          for (final e in _f.pointOverrides.entries)
            if (keep.contains(e.key)) e.key: e.value,
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _c,
      builder: (context, _) {
        final created = _c.created;
        if (created != null && created.writeLater && !_redirected) {
          _redirected = true;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) context.pushReplacement('/app/tests/${Uri.encodeComponent(created.id)}/edit');
          });
        }
        if (created != null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Тест үүсгэх')),
            body: _success(context, created),
          );
        }
        _sync(_title, _f.title);
        _sync(_time, _f.timeLimit);
        _sync(_group, _f.groupKey);
        _sync(_variant, _f.variantLabel);
        _sync(_pdf, _f.pdfKey);
        return PopScope(
          canPop: _allowPop || !_c.hasUnsavedWork,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) unawaited(_onBlockedPop());
          },
          child: Scaffold(
            appBar: AppBar(title: const Text('Тест үүсгэх')),
            body: CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, 0),
                  sliver: SliverList.list(
                    children: [
                      ..._draftBanners(context),
                      if (_c.catalogError.isNotEmpty) ...[
                        NoticeBox(message: _c.catalogError, tone: ChipTone.error),
                        const SizedBox(height: AppSpace.md),
                      ],
                      _summary(context),
                      const SizedBox(height: AppSpace.md),
                      _step1(context),
                      const SizedBox(height: AppSpace.md),
                      _step2(context),
                      const SizedBox(height: AppSpace.md),
                      _step3Header(context),
                    ],
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
                  sliver: SliverReorderableList(
                    itemCount: _c.selected.length,
                    onReorderItem: (a, b) => _c.update(reorderSelected(_f, a, b)),
                    itemBuilder: (context, i) => _selectedTile(context, _c.selected[i], i),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xxl),
                  sliver: SliverList.list(
                    children: [
                      _step4(context),
                      const SizedBox(height: AppSpace.lg),
                      _submit(context),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ---------------- Ноорог ----------------

  List<Widget> _draftBanners(BuildContext context) {
    final d = _autosaver;
    final out = <Widget>[];
    void add(Widget w) => out
      ..add(w)
      ..add(const SizedBox(height: AppSpace.md));
    if (d.restoreError.isNotEmpty) {
      add(
        NoticeBox(
          message: d.restoreError,
          tone: ChipTone.error,
          action: TextButton(onPressed: () => unawaited(d.restore()), child: const Text('Дахин ачаалах')),
        ),
      );
    }
    final candidate = d.candidate;
    if (candidate != null) {
      add(
        NoticeBox(
          key: const Key('draft-candidate'),
          tone: ChipTone.info,
          message: [
            'Серверт хадгалсан ноорог байна',
            if (candidate.title.isNotEmpty) '«${candidate.title}»',
          ].join(': '),
          action: Wrap(
            spacing: AppSpace.sm,
            children: [
              FilledButton(onPressed: _c.continueDraft, child: const Text('Үргэлжлүүлэх')),
              OutlinedButton(onPressed: () => unawaited(_c.startFresh()), child: const Text('Шинээр эхлэх')),
            ],
          ),
        ),
      );
    }
    if (d.conflict != null) {
      add(
        NoticeBox(
          key: const Key('draft-conflict'),
          message:
              'Ноорог өөр төхөөрөмжөөс шинэчлэгдсэн. Автомат хадгалалт түр зогслоо — хадгалсан хувилбарыг нээх эсвэл '
              'энэ төхөөрөмжийн өөрчлөлтийг тусдаа ноорог болгоно',
          action: Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.sm,
            children: [
              FilledButton(onPressed: _c.loadLatestDraft, child: const Text('Хадгалсан хувилбарыг нээх')),
              OutlinedButton(
                onPressed: () => unawaited(_c.saveLocalAsNewDraft()),
                child: const Text('Миний хувилбарыг шинэ ноорог болгох'),
              ),
            ],
          ),
        ),
      );
    }
    if (d.error.isNotEmpty) {
      add(
        NoticeBox(
          message: d.error,
          tone: ChipTone.error,
          action: TextButton(onPressed: () => unawaited(d.retry()), child: const Text('Хадгалалтыг дахин оролдох')),
        ),
      );
    }
    if (d.ready && d.active && d.status.isNotEmpty && d.error.isEmpty) {
      out
        ..add(
          Semantics(
            liveRegion: true,
            child: Row(
              children: [
                Icon(AppIcons.cloudCheck, size: 16, color: context.colors.inkDim),
                const SizedBox(width: AppSpace.xs),
                Expanded(
                  child: Text(
                    d.status,
                    key: const Key('draft-status'),
                    style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                  ),
                ),
              ],
            ),
          ),
        )
        ..add(const SizedBox(height: AppSpace.md));
    }
    return out;
  }

  // ---------------- Хураангуй ----------------

  Widget _summary(BuildContext context) {
    final s = _c.summary;
    final c = context.colors;
    final steps = [
      ('Үндсэн мэдээлэл', _f.title.trim().isNotEmpty),
      ('Бодлого сонгох', _f.selectedProblems.isNotEmpty),
      ('Оноо, дараалал', _f.selectedProblems.isNotEmpty),
      ('Хэн үзэх вэ', _f.selectedClasses.isNotEmpty),
    ];
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Wrap(
            spacing: AppSpace.xs,
            runSpacing: AppSpace.xs,
            children: [
              for (var i = 0; i < steps.length; i++)
                MetaChip(
                  label: '${i + 1}. ${steps[i].$1}',
                  icon: steps[i].$2 ? AppIcons.check : null,
                  tone: steps[i].$2 ? ChipTone.success : ChipTone.neutral,
                ),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          Meta(
            items: [
              '${s.choice} сонголт + ${s.fill} нөхөх${s.open > 0 ? ' + ${s.open} задгай' : ''}',
              'нийт ${s.totalPoints} оноо',
              '${parsePositiveInt(_f.timeLimit) ?? 'хугацаагүй'} минут',
            ],
            style: context.text.titleSmall,
          ),
          if (s.deviations.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            for (final d in s.deviations)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.xs),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(AppIcons.warning, size: 16, color: c.warning),
                    const SizedBox(width: AppSpace.xs),
                    Expanded(child: Text(d, style: context.text.bodySmall)),
                  ],
                ),
              ),
          ],
          if (s.missingAnswers > 0)
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.sm),
              child: Text(
                '${s.missingAnswers} бодлого хариугүй — эдгээр онооны нийлбэрт орохгүй',
                style: context.text.bodySmall?.copyWith(color: c.error, fontWeight: FontWeight.w600),
              ),
            ),
          if (s.reviewNeeded > 0)
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.xs),
              child: Text(
                '${s.reviewNeeded} бодлогын хариу шалгах шаардлагатай гэж тэмдэглэгдсэн',
                style: context.text.bodySmall?.copyWith(color: c.warning),
              ),
            ),
        ],
      ),
    );
  }

  // ---------------- 1. Үндсэн мэдээлэл ----------------

  Widget _step1(BuildContext context) {
    final c = context.colors;
    return StepCard(
      step: 1,
      title: 'Үндсэн мэдээлэл',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: OutlinedButton(
              key: const Key('eesh-template'),
              onPressed: _c.applyTemplate,
              child: const Text('36+4 загвар ашиглах'),
            ),
          ),
          if (_c.templateNotice.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            NoticeBox(message: _c.templateNotice),
          ],
          const SizedBox(height: AppSpace.md),
          TextField(
            key: const Key('test-title'),
            controller: _title,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: 'Тестийн нэр',
              hintText: 'ж: Илтгэгч тэгшитгэл 1',
              errorText: _c.titleMissing ? 'Тестийн нэр оруулна уу' : null,
            ),
            onChanged: (v) => _c.update(_f.copyWith(title: v)),
          ),
          const SizedBox(height: AppSpace.sm),
          PickerRow(
            label: 'Төрөл',
            value: TestTypes.label(_f.type),
            onTap: () => unawaited(
              _select(
                'Төрөл',
                [for (final t in TestTypes.creatable) SelectOption(t, TestTypes.label(t))],
                _f.type,
                (v) => _c.update(_f.copyWith(type: v)),
              ),
            ),
          ),
          PickerRow(
            label: 'Дүгнэх горим',
            value: GradingModes.createLabels[_f.gradingMode] ?? _f.gradingMode,
            onTap: () => unawaited(
              _select(
                'Дүгнэх горим',
                [for (final e in GradingModes.createLabels.entries) SelectOption(e.key, e.value)],
                _f.gradingMode,
                (v) => _c.update(_f.copyWith(gradingMode: v)),
              ),
            ),
          ),
          PickerRow(
            label: 'Хичээл',
            value: Subjects.label(_f.subject),
            onTap: () => unawaited(
              _select(
                'Хичээл',
                [for (final v in Subjects.creatable) SelectOption(v, Subjects.label(v))],
                _f.subject,
                (v) => _c.update(_f.copyWith(subject: v)),
              ),
            ),
          ),
          PickerRow(
            key: const Key('chapter-row'),
            label: 'Бүлэг сэдэв',
            value:
                _c.chapter?.label ??
                (_f.chapterId.isNotEmpty
                    ? 'Сонгосон бүлэг'
                    : (_f.gated ? 'Шинэ бүлэг — тестийн нэрээр' : 'Бүлэг сэдэв сонгохгүй')),
            onTap: () => unawaited(
              _select(
                'Бүлэг сэдэв',
                [
                  SelectOption('', _f.gated ? 'Шинэ бүлэг — тестийн нэрээр' : 'Бүлэг сэдэв сонгохгүй'),
                  for (final ch in _c.chapters)
                    SelectOption(ch.id, ch.label, subtitle: ch.grade == null ? null : '${ch.grade}-р анги'),
                ],
                _f.chapterId,
                (v) => _c.update(_f.copyWith(chapterId: v)),
              ),
            ),
          ),
          const SizedBox(height: AppSpace.sm),
          TextField(
            key: const Key('test-time'),
            controller: _time,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(labelText: 'Хугацаа', suffixText: 'минут', hintText: 'ж: 100'),
            onChanged: (v) => _c.update(_f.copyWith(timeLimit: v)),
          ),
          const SizedBox(height: AppSpace.sm),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _group,
                  decoration: const InputDecoration(labelText: 'Хувилбарын бүлэг', hintText: 'ж: Тест 18'),
                  onChanged: (v) => _c.update(_f.copyWith(groupKey: v)),
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              SizedBox(
                width: 120,
                child: TextField(
                  controller: _variant,
                  decoration: const InputDecoration(labelText: 'Хувилбар', hintText: 'A'),
                  onChanged: (v) => _c.update(_f.copyWith(variantLabel: v)),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          TextField(
            controller: _pdf,
            decoration: const InputDecoration(
              labelText: 'PDF эх сурвалжийн түлхүүр',
              hintText: 'Файл байршуулбал автоматаар бөглөгдөнө',
            ),
            onChanged: (v) => _c.update(_f.copyWith(pdfKey: v)),
          ),
          const SizedBox(height: AppSpace.xs),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              onPressed: _c.uploadingPdf ? null : () => unawaited(_c.uploadPdf(ref.read(authoringUploadsProvider).pdf)),
              icon: _c.uploadingPdf
                  ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : Icon(AppIcons.cloudUpload, size: 18, color: c.brand),
              label: Text(_c.uploadingPdf ? 'Байршуулж байна' : 'PDF файл сонгох'),
            ),
          ),
        ],
      ),
    );
  }

  // ---------------- 2. Бодлого сонгох ----------------

  Widget _step2(BuildContext context) {
    final gatedEmpty =
        _f.gated && (_f.chapterId.isEmpty || (!_c.loadingProblems && _c.problemsError.isEmpty && _c.problems.isEmpty));
    return StepCard(
      step: 2,
      title: 'Бодлого сонгох',
      hint: 'Одоогоор ${_f.selectedProblems.length} бодлого сонгосон',
      child: gatedEmpty
          ? Text(
              '${Subjects.label(_f.subject)} тестийн бодлогыг тест үүссэний дараа нээгдэх засварлагчид шууд бичнэ — '
              'асуулт, сонголт, зөв хариу, оноо',
              style: context.text.bodyMedium,
            )
          : _f.chapterId.isEmpty
          ? Text('Эхлээд бүлэг сэдэв сонгоно уу', style: context.text.bodyMedium)
          : _c.loadingProblems
          ? const LoadingState(cards: 1, padding: EdgeInsets.zero)
          : _c.problemsError.isNotEmpty
          ? NoticeBox(message: _c.problemsError, tone: ChipTone.error)
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Бүлэгт ${_c.problems.length} бодлого байна', style: context.text.bodyMedium),
                const SizedBox(height: AppSpace.sm),
                FilledButton.tonalIcon(
                  key: const Key('pick-problems'),
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                  onPressed: _c.problems.isEmpty ? null : () => unawaited(_pickProblems()),
                  icon: const Icon(AppIcons.library, size: 18),
                  label: const Text('Сангаас бодлого сонгох'),
                ),
              ],
            ),
    );
  }

  // ---------------- 3. Оноо, дараалал ----------------

  Widget _step3Header(BuildContext context) {
    final selected = _c.selected;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text('3. Оноо, дараалал', style: context.text.titleMedium)),
          const SizedBox(height: AppSpace.xs),
          Text(
            selected.isEmpty
                ? 'Одоогоор бодлого сонгоогүй байна'
                : 'Сонгосон дарааллаар тестэд орно — бариулаас чирж солино',
            style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
          ),
          if (selected.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Row(
              children: [
                SizedBox(
                  width: 120,
                  child: TextField(
                    key: const Key('bulk-points'),
                    controller: _bulk,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(labelText: 'Бүгдэд оноо'),
                  ),
                ),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      final n = parsePositiveInt(_bulk.text);
                      if (n != null) _c.update(bulkSetPoints(_f, n));
                    },
                    child: Text('Бүх ${selected.length} бодлогод'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _selectedTile(BuildContext context, ServerProblem p, int i) {
    final c = context.colors;
    final known = hasKnownAnswer(p);
    final points = _f.pointsFor(p);
    final content = contentOf(p);
    return Padding(
      key: ValueKey(p.id),
      padding: const EdgeInsets.only(bottom: AppSpace.sm),
      child: AppCard(
        accent: known ? null : c.error,
        padding: const EdgeInsets.fromLTRB(AppSpace.xs, AppSpace.sm, AppSpace.xs, AppSpace.sm),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ReorderableDragStartListener(
              index: i,
              child: Semantics(
                label: '${i + 1}-р бодлогыг чирж зөөх',
                child: SizedBox.square(
                  dimension: AppSizes.minTap,
                  child: Icon(AppIcons.menu, color: c.inkDim),
                ),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: AppSpace.xs,
                    runSpacing: AppSpace.xs,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text('${i + 1}', style: context.text.titleSmall),
                      MetaChip(label: ProblemFormats.label(p.format), tone: ChipTone.brand),
                      if (!known) const MetaChip(label: 'Хариугүй', icon: AppIcons.warning, tone: ChipTone.error),
                    ],
                  ),
                  const SizedBox(height: AppSpace.xs),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 72),
                    child: ClipRect(
                      child: (p.statementText ?? '').trim().isEmpty
                          ? Text('Зурагтай бодлого', style: context.text.bodySmall?.copyWith(color: c.inkDim))
                          : MathText(p.statementText!),
                    ),
                  ),
                ],
              ),
            ),
            Column(
              children: [
                TextButton(
                  key: Key('points-${p.id}'),
                  onPressed: () async {
                    final n = await askPoints(context, initial: points);
                    if (n != null) _c.update(setPoints(_f, p.id, n));
                  },
                  child: Text('$points оноо'),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      tooltip: 'Сурагчид харагдах',
                      onPressed: () => unawaited(showStudentPreview(context, content, points: points)),
                      icon: const Icon(AppIcons.show),
                    ),
                    PopupMenuButton<int>(
                      tooltip: 'Үйлдэл',
                      icon: const Icon(AppIcons.overflow),
                      onSelected: (a) => switch (a) {
                        0 => _c.update(moveSelected(_f, p.id, -1)),
                        1 => _c.update(moveSelected(_f, p.id, 1)),
                        _ => _c.update(toggleProblem(_f, p.id)),
                      },
                      itemBuilder: (_) => [
                        PopupMenuItem(value: 0, enabled: i > 0, child: const Text('Дээш зөөх')),
                        PopupMenuItem(
                          value: 1,
                          enabled: i < _f.selectedProblems.length - 1,
                          child: const Text('Доош зөөх'),
                        ),
                        const PopupMenuItem(value: 2, child: Text('Хасах')),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ---------------- 4. Хэн үзэх вэ ----------------

  Widget _step4(BuildContext context) {
    final s = _c.summary;
    final mismatched = _c.mismatched;
    return StepCard(
      step: 4,
      title: 'Хэн үзэх вэ',
      hint: 'Тест аль ангид харагдахыг сонгоно',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (s.missingAnswers > 0 && s.selectedCount > 0) ...[
            NoticeBox(
              tone: s.allMissing ? ChipTone.error : ChipTone.warning,
              message: s.allMissing
                  ? 'Сонгосон бүх ${s.missingAnswers} бодлого хариуны түлхүүргүй тул энэ тестийг ангид оноох боломжгүй'
                  : '${s.missingAnswers} бодлого хариуны түлхүүргүй тул дүнд тооцогдохгүй',
            ),
            const SizedBox(height: AppSpace.sm),
          ],
          if (_f.writeLater)
            Text(
              'Бодлогоо бичсэний дараа засварлагчийн «Тохиргоо» хэсэгт анги сонгоно — хоосон тест сурагчид харагдахгүй',
              style: context.text.bodyMedium,
            )
          else ...[
            if (mismatched.isNotEmpty) ...[
              NoticeBox(
                message:
                    '${mismatched.map((c) => c.name).join(', ')} — ${Subjects.label(_f.subject)} анги биш тул сурагчид нь энэ тестийг харахгүй',
              ),
              const SizedBox(height: AppSpace.sm),
            ],
            if (_c.classrooms.isEmpty && _c.catalogError.isEmpty)
              Text('Анги үүсгээгүй байна', style: context.text.bodyMedium),
            for (final cl in _c.classrooms)
              CheckboxListTile(
                key: Key('class-${cl.id}'),
                contentPadding: EdgeInsets.zero,
                value: _f.selectedClasses.contains(cl.id),
                onChanged: (_) => _c.update(toggleClass(_f, cl.id)),
                title: Text(cl.name),
                subtitle: Meta(
                  items: [
                    '${cl.enrollments} сурагч',
                    if (cl.grade != null) '${cl.grade}-р анги',
                    if (cl.subject != null && cl.subject != Subjects.math) Subjects.label(cl.subject!),
                  ],
                ),
              ),
            if (_c.classesMissing)
              Text(
                'Дор хаяж нэг анги сонгоно уу',
                style: context.text.bodyMedium?.copyWith(color: context.colors.error),
              ),
          ],
        ],
      ),
    );
  }

  Widget _submit(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (_c.formError.isNotEmpty) ...[
        NoticeBox(key: const Key('form-error'), message: _c.formError, tone: ChipTone.error),
        const SizedBox(height: AppSpace.md),
      ],
      FilledButton(
        key: const Key('create-test'),
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap + 8)),
        onPressed: _c.submitting ? null : () => unawaited(_c.create()),
        child: Text(_c.submitting ? 'Үүсгэж байна' : (_f.writeLater ? 'Тест үүсгээд бодлого бичих' : 'Тест үүсгэх')),
      ),
    ],
  );

  Widget _success(BuildContext context, CreatedResult created) {
    if (created.writeLater) return const LoadingState(cards: 2);
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        AppCard(
          accent: context.colors.success,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Icon(AppIcons.success, color: context.colors.success),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(child: Text('«${created.title}» тест амжилттай үүслээ', style: context.text.titleMedium)),
                ],
              ),
              if ((created.warning ?? '').isNotEmpty) ...[
                const SizedBox(height: AppSpace.md),
                NoticeBox(message: created.warning!),
              ],
              const SizedBox(height: AppSpace.lg),
              FilledButton(
                onPressed: () => context.pushReplacement('/app/tests/${Uri.encodeComponent(created.id)}/edit'),
                child: const Text('Тестийг засах'),
              ),
              const SizedBox(height: AppSpace.sm),
              OutlinedButton(
                onPressed: () => context.canPop() ? context.pop() : context.go('/app/tests'),
                child: const Text('Тестийн жагсаалт руу очих'),
              ),
              const SizedBox(height: AppSpace.sm),
              OutlinedButton(onPressed: _c.resetAfterCreate, child: const Text('Шинэ тест үүсгэх')),
            ],
          ),
        ),
      ],
    );
  }
}
