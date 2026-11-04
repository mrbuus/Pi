import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/test_editor_controller.dart';
import '../data/authoring_models.dart';
import '../data/authoring_repository.dart';
import '../data/authoring_storage.dart';
import '../domain/editor_model.dart';
import 'authoring_widgets.dart';
import 'bank_picker_screen.dart';
import 'problem_editor_screen.dart';

/// `/app/tests/:id/edit` — тест засах (вэбийн `EditTestPage`, 40 блок):
/// бодлогууд карт болж, бариулаар чирж эрэмбэлнэ; карт дарвал бүтэн дэлгэцийн засварлагч
/// («Засах» / «Харах»); тохиргоо хураасан карт; нэг «Хадгалах», буцаах/давтах.
class EditTestScreen extends ConsumerWidget {
  const EditTestScreen({super.key, required this.testId});

  final String testId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final perms = ref.watch(authoringPermissionsProvider);
    if (!perms.canAuthor) {
      return Scaffold(
        appBar: AppBar(title: const Text('Тест засах')),
        body: const AuthoringDenied(),
      );
    }
    return _EditTestBody(testId: testId);
  }
}

class _EditTestBody extends ConsumerStatefulWidget {
  const _EditTestBody({required this.testId});

  final String testId;

  @override
  ConsumerState<_EditTestBody> createState() => _EditTestBodyState();
}

class _EditTestBodyState extends ConsumerState<_EditTestBody> {
  late final TestEditorController _c = TestEditorController(
    repository: ref.read(testAuthoringRepositoryProvider),
    permissions: ref.read(authoringPermissionsProvider),
    testId: widget.testId,
  );
  bool _settingsOpen = false;
  bool _allowPop = false;
  bool _uploadingPdf = false;
  bool _duplicating = false;

  @override
  void initState() {
    super.initState();
    unawaited(_c.load());
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  void _snack(String message) {
    if (!mounted || message.isEmpty) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
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

  Future<void> _onBlockedPop() async {
    final discard = await confirmAction(
      context,
      title: FormMessages.unsavedTitle,
      message: 'Хадгалаагүй өөрчлөлт устна',
      confirmLabel: FormMessages.discard,
      cancelLabel: FormMessages.keepEditing,
    );
    if (discard) _leave();
  }

  Future<void> _save({bool overwrite = false}) async {
    final outcome = await _c.save(overwrite: overwrite);
    if (!mounted || outcome.nothing) return;
    if (outcome.conflict != null) {
      await _showConflict(outcome.conflict!);
      return;
    }
    _snack(outcome.message);
  }

  Future<void> _showConflict(VersionConflict conflict) async {
    final choice = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Өөр хүн өөрчилсөн байна'),
        content: Text(
          '${conflict.message}\n\nШинэчлэх — сүүлд хадгалсан хувилбарыг ачаална, таны хадгалаагүй өөрчлөлт устна\n\n'
          'Миний хувилбарыг хадгалах — зөрчилтэй хэсэгт таны утга хадгалагдана, нөгөө хувилбар түүхэнд үлдэнэ',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Шинэчлэх')),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Миний хувилбарыг хадгалах')),
        ],
      ),
    );
    if (!mounted) return;
    if (choice == true) {
      await _save(overwrite: true);
    } else if (choice == false) {
      _c.dismissConflict();
      await _c.load();
    } else {
      _c.dismissConflict();
    }
  }

  Future<void> _duplicate() async {
    if (_c.dirty) {
      final ok = await confirmAction(
        context,
        title: 'Хадгалаагүй өөрчлөлт байна',
        message: 'Хуулбар нь хадгалсан хувилбараас үүснэ',
        confirmLabel: 'Хуулах',
        destructive: false,
      );
      if (!ok) return;
    }
    setState(() => _duplicating = true);
    try {
      final copy = await _c.duplicate();
      if (!mounted) return;
      _snack('«${copy.title}» ноорог болж үүслээ. Анги сонгож хадгалахад нийтлэгдэнэ');
      setState(() => _allowPop = true);
      context.pushReplacement('/app/tests/${Uri.encodeComponent(copy.id)}/edit');
    } on ApiError catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _duplicating = false);
    }
  }

  // ---------------- Бодлого ----------------

  Future<void> _openEditor(BlockItem item, int index) async {
    final result = await ProblemEditorScreen.open(
      context,
      content: _c.contentOfItem(item),
      points: item.points,
      number: index + 1,
      total: _c.value.items.length,
      editable: _c.canEditContentOf(item),
      isNew: item.isNew,
      answerLocked: _c.locks.limited && !item.isNew,
      pointsLocked: _c.locks.structureLocked,
      solution: _c.problemOf(item)?.analysis?.solutionOutline,
    );
    if (result == null || !mounted) return;
    if (_c.canEditContentOf(item)) {
      _c.applyEdit(item.key, result.content, result.points);
    } else if (result.points != item.points) {
      _c.setPoints(item.key, result.points);
    }
  }

  Future<void> _insert(int index) async {
    final kind = await showSelectSheet<String>(
      context,
      title: 'Бодлого нэмэх',
      options: const [
        SelectOption(ProblemFormats.choice, 'Шинэ сонгох бодлого', icon: AppIcons.add),
        SelectOption(ProblemFormats.fill, 'Шинэ нөхөх бодлого', icon: AppIcons.add),
        SelectOption('BANK', 'Сангаас сонгох', icon: AppIcons.library),
      ],
    );
    if (kind == null || !mounted) return;
    await _insertKind(index, kind.value);
  }

  Future<void> _insertKind(int index, String kind) async {
    if (kind == 'BANK') {
      final picked = await BankPickerScreen.open(
        context,
        subject: _c.value.settings.subject,
        initialChapterId: _c.value.settings.chapterId,
        excludeIds: {for (final i in _c.value.items) ?i.problemId},
      );
      if (picked == null || picked.isEmpty || !mounted) return;
      _c.addFromBank(index, picked);
      _snack('${picked.length} бодлого нэмлээ');
      return;
    }
    final key = _c.insertNew(index, kind);
    final at = _c.value.items.indexWhere((i) => i.key == key);
    if (at >= 0) await _openEditor(_c.value.items[at], at);
  }

  Future<void> _remove(BlockItem item) async {
    final removed = _c.remove(item.key);
    if (removed == null) return;
    final undone = await showUndoSnack(context, message: 'Тестээс хаслаа');
    if (undone && mounted) _c.restore(removed);
  }

  Future<void> _cardMenu(BlockItem item, int index, ProblemCardAction action) async {
    switch (action) {
      case ProblemCardAction.edit:
        await _openEditor(item, index);
      case ProblemCardAction.preview:
        await showStudentPreview(context, _c.contentOfItem(item), points: item.points);
      case ProblemCardAction.up:
        _c.move(item.key, index - 1);
      case ProblemCardAction.down:
        _c.move(item.key, index + 1);
      case ProblemCardAction.points:
        final p = await askPoints(context, initial: item.points);
        if (p != null) _c.setPoints(item.key, p);
      case ProblemCardAction.insertAbove:
        await _insert(index);
      case ProblemCardAction.insertBelow:
        await _insert(index + 1);
      case ProblemCardAction.remove:
        await _remove(item);
    }
  }

  // ---------------- Тохиргоо ----------------

  Future<void> _editSettings() async {
    final s = _c.value.settings;
    final limited = _c.locks.limited;
    final thousand = _c.locks.thousand;
    final next = await showFormSheet<TestSettings>(
      context,
      title: 'Тохиргоо',
      fields: [
        FormTextField(name: 'title', label: 'Тестийн нэр', initial: s.title, required: true),
        FormNumberField(
          name: 'time',
          label: 'Хугацаа',
          suffixText: 'минут',
          hint: 'Хугацаагүй',
          initial: int.tryParse(s.timeLimit),
          min: 1,
        ),
        if (!limited) ...[
          FormSelectField<String>(
            name: 'type',
            label: 'Төрөл',
            initial: s.type,
            enabled: !thousand,
            options: [
              for (final t in thousand ? const [TestTypes.thousand] : TestTypes.editable)
                SelectOption(t, TestTypes.label(t)),
            ],
          ),
          FormSelectField<String>(
            name: 'grading',
            label: 'Дүгнэх горим',
            initial: s.gradingMode,
            options: const [
              SelectOption(GradingModes.auto, 'Авто дүн'),
              SelectOption(GradingModes.manual, 'Багшийн дүн'),
            ],
          ),
          FormTextField(name: 'group', label: 'Хувилбарын бүлэг', initial: s.groupKey, hint: 'ж: Тест 18'),
          FormTextField(name: 'variant', label: 'Хувилбар', initial: s.variantLabel, hint: 'A'),
          FormTextField(name: 'pdf', label: 'PDF эх сурвалжийн түлхүүр', initial: s.pdfKey),
          if (_c.permissions.canEditPrice)
            FormMoneyField(name: 'price', label: 'Төлбөр', initial: int.tryParse(s.price)),
        ],
      ],
      onSubmit: (v) async => s.copyWith(
        title: v.text('title'),
        timeLimit: v.integer('time')?.toString() ?? '',
        type: limited ? null : (v.get<String>('type') ?? s.type),
        gradingMode: limited ? null : (v.get<String>('grading') ?? s.gradingMode),
        groupKey: limited ? null : v.text('group'),
        variantLabel: limited ? null : v.text('variant'),
        pdfKey: limited ? null : v.text('pdf'),
        price: limited || !_c.permissions.canEditPrice ? null : (v.integer('price')?.toString() ?? ''),
      ),
    );
    if (next != null) _c.updateSettings(next);
  }

  Future<void> _pickSubject() async {
    final s = _c.value.settings;
    final picked = await showSelectSheet<String>(
      context,
      title: 'Хичээл',
      selected: s.subject,
      options: [for (final v in Subjects.editable) SelectOption(v, Subjects.label(v))],
    );
    if (picked != null && picked.value != s.subject) _c.updateSettings(s.copyWith(subject: picked.value));
  }

  Future<void> _pickChapter() async {
    await _c.loadCatalog();
    if (!mounted) return;
    final s = _c.value.settings;
    final picked = await showSelectSheet<String>(
      context,
      title: 'Бүлэг сэдэв',
      selected: s.chapterId,
      searchThreshold: 0,
      options: [const SelectOption('', 'Бүлэг сонгохгүй'), for (final ch in _c.chapters) SelectOption(ch.id, ch.label)],
    );
    if (picked != null) _c.updateSettings(s.copyWith(chapterId: picked.value));
  }

  Future<void> _pickClasses() async {
    await _c.loadCatalog();
    if (!mounted) return;
    final picked = await showFormSheet<Set<String>>(
      context,
      title: 'Хэн үзэх вэ',
      fields: [
        FormMultiSelectField<String>(
          name: 'classes',
          label: 'Анги',
          initial: _c.value.classes.toSet(),
          options: [for (final cl in _c.classrooms) SelectOption(cl.id, cl.name, subtitle: '${cl.enrollments} сурагч')],
        ),
      ],
      onSubmit: (v) async => v.many<String>('classes'),
    );
    if (picked != null) {
      _c.setClasses([
        for (final cl in _c.classrooms)
          if (picked.contains(cl.id)) cl.id,
      ]);
    }
  }

  Future<void> _uploadPdf() async {
    setState(() => _uploadingPdf = true);
    try {
      final key = await ref.read(authoringUploadsProvider).pdf();
      if (key != null) _c.updateSettings(_c.value.settings.copyWith(pdfKey: key));
    } on ApiError catch (e) {
      _snack(e.message);
    } on Object {
      _snack('Файл байршуулахад алдаа гарлаа');
    } finally {
      if (mounted) setState(() => _uploadingPdf = false);
    }
  }

  // ---------------- Харагдац ----------------

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _c,
      builder: (context, _) {
        if (_c.loading && _c.test == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Тест засах')),
            body: const LoadingState(cards: 4),
          );
        }
        final err = _c.loadError;
        if (err != null || _c.test == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Тест засах')),
            body: ErrorState(
              title: 'Тестийг нээж чадсангүй',
              message: err?.message ?? AppStrings.notFound,
              onRetry: err?.kind == ApiErrorKind.forbidden ? null : () => unawaited(_c.load()),
            ),
          );
        }
        final dirty = _c.dirtyCount;
        return PopScope(
          canPop: _allowPop || dirty == 0,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop) unawaited(_onBlockedPop());
          },
          child: Scaffold(
            appBar: AppBar(
              title: Text(_c.value.settings.title.trim().isEmpty ? 'Нэргүй тест' : _c.value.settings.title),
              actions: [
                IconButton(tooltip: 'Буцаах', onPressed: _c.canUndo ? _c.undo : null, icon: const Icon(AppIcons.undo)),
                IconButton(
                  tooltip: 'Давтах',
                  onPressed: _c.canRedo ? _c.redo : null,
                  icon: const Icon(AppIcons.repeat),
                ),
                PopupMenuButton<String>(
                  tooltip: 'Бусад',
                  icon: const Icon(AppIcons.overflow),
                  onSelected: (v) {
                    if (v == 'duplicate') unawaited(_duplicate());
                  },
                  itemBuilder: (_) => [
                    PopupMenuItem(
                      value: 'duplicate',
                      enabled: !_duplicating,
                      child: const ListTile(leading: Icon(AppIcons.copy), title: Text('Хуулах')),
                    ),
                  ],
                ),
              ],
            ),
            bottomNavigationBar: SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
                child: FilledButton.icon(
                  key: const Key('editor-save'),
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                  onPressed: dirty == 0 || _c.saving ? null : () => unawaited(_save()),
                  icon: _c.saving
                      ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(AppIcons.save),
                  label: Text(_c.saving ? FormMessages.saving : (dirty == 0 ? 'Хадгалсан' : 'Хадгалах ($dirty)')),
                ),
              ),
            ),
            body: _body(context),
          ),
        );
      },
    );
  }

  Widget _body(BuildContext context) {
    final c = context.colors;
    final v = _c.value;
    final items = v.items;
    final locked = _c.locks.structureLocked;
    final stats = _c.stats;
    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.md),
          sliver: SliverList.list(
            children: [
              Meta(
                items: [
                  '${stats.choice} сонгох',
                  if (stats.fill > 0) '${stats.fill} нөхөх',
                  if (stats.open > 0) '${stats.open} задгай',
                  'нийт ${stats.points} оноо',
                  if (v.settings.timeLimit.isNotEmpty) '${v.settings.timeLimit} минут',
                ],
                style: context.text.bodyMedium?.copyWith(color: c.inkDim),
              ),
              if (_c.locks.limited) ...[
                const SizedBox(height: AppSpace.md),
                const NoticeBox(
                  message: 'Сурагч өгсөн тест — дараалал, оноо, нэмэх, хасах түгжээтэй. Нэр, хугацаа, бодлогын агуулгыг засна',
                ),
              ],
              const SizedBox(height: AppSpace.md),
              _settingsCard(context),
              const SizedBox(height: AppSpace.lg),
              Text('Бодлогууд (${items.length})', style: context.text.titleMedium),
              if (items.isEmpty) ...[
                const SizedBox(height: AppSpace.md),
                const EmptyState(icon: AppIcons.empty, title: 'Энэ тестэд бодлого алга', message: 'Доороос нэмнэ үү'),
              ],
            ],
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          sliver: locked
              ? SliverList.builder(itemCount: items.length, itemBuilder: (context, i) => _card(items[i], i, locked))
              : SliverReorderableList(
                  itemCount: items.length,
                  onReorderItem: _c.reorder,
                  itemBuilder: (context, i) => _card(items[i], i, locked),
                ),
        ),
        if (!locked)
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
            sliver: SliverToBoxAdapter(
              child: Wrap(
                spacing: AppSpace.sm,
                runSpacing: AppSpace.sm,
                children: [
                  OutlinedButton.icon(
                    key: const Key('add-choice'),
                    onPressed: () => unawaited(_insertKind(items.length, ProblemFormats.choice)),
                    icon: const Icon(AppIcons.add, size: 18),
                    label: const Text('Шинэ сонгох'),
                  ),
                  OutlinedButton.icon(
                    key: const Key('add-fill'),
                    onPressed: () => unawaited(_insertKind(items.length, ProblemFormats.fill)),
                    icon: const Icon(AppIcons.add, size: 18),
                    label: const Text('Шинэ нөхөх'),
                  ),
                  OutlinedButton.icon(
                    key: const Key('add-bank'),
                    onPressed: () => unawaited(_insertKind(items.length, 'BANK')),
                    icon: const Icon(AppIcons.library, size: 18),
                    label: const Text('Сангаас'),
                  ),
                ],
              ),
            ),
          )
        else
          const SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl)),
      ],
    );
  }

  Widget _card(BlockItem item, int index, bool locked) {
    final content = _c.contentOfItem(item);
    return Padding(
      key: ValueKey(item.key),
      padding: const EdgeInsets.only(bottom: AppSpace.sm),
      child: ProblemCard(
        index: index,
        total: _c.value.items.length,
        content: content,
        points: item.points,
        isNew: item.isNew,
        changed: _c.isChanged(item),
        error: _c.errors[item.key],
        locked: locked,
        onTap: () => unawaited(_openEditor(item, index)),
        onAction: (a) => unawaited(_cardMenu(item, index, a)),
      ),
    );
  }

  Widget _settingsCard(BuildContext context) {
    final c = context.colors;
    final s = _c.value.settings;
    final locks = _c.locks;
    final chapter = _c.chapters.where((ch) => ch.id == s.chapterId).firstOrNull;
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            key: const Key('settings-toggle'),
            onTap: () {
              setState(() => _settingsOpen = !_settingsOpen);
              if (_settingsOpen) unawaited(_c.loadCatalog());
            },
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: AppSizes.minTap + 16),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
                child: Row(
                  children: [
                    Icon(AppIcons.settings, color: c.inkDim),
                    const SizedBox(width: AppSpace.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Тохиргоо', style: context.text.titleSmall),
                          Meta(
                            items: [
                              TestTypes.label(s.type),
                              GradingModes.shortLabel(s.gradingMode),
                              s.timeLimit.isEmpty ? 'Хугацаагүй' : '${s.timeLimit} минут',
                              chapter?.title,
                              if (!locks.thousand) '${_c.value.classes.length} анги',
                            ],
                            style: context.text.bodySmall?.copyWith(color: c.inkDim),
                          ),
                        ],
                      ),
                    ),
                    Icon(_settingsOpen ? AppIcons.close : AppIcons.expand, color: c.inkDim),
                  ],
                ),
              ),
            ),
          ),
          if (_settingsOpen)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.lg, 0, AppSpace.lg, AppSpace.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Divider(height: 1),
                  PickerRow(
                    label: 'Нэр, хугацаа, төрөл',
                    value: [s.title, if (s.timeLimit.isNotEmpty) '${s.timeLimit} минут'].join(', '),
                    icon: AppIcons.penLine,
                    onTap: () => unawaited(_editSettings()),
                  ),
                  if (!locks.limited) ...[
                    PickerRow(
                      label: 'Хичээл',
                      value: Subjects.label(s.subject),
                      icon: AppIcons.libraryBig,
                      onTap: () => unawaited(_pickSubject()),
                    ),
                    PickerRow(
                      label: 'Бүлэг сэдэв',
                      value: s.chapterId.isEmpty ? 'Бүлэг сонгоогүй' : (chapter?.label ?? 'Сонгосон бүлэг'),
                      icon: AppIcons.library,
                      onTap: () => unawaited(_pickChapter()),
                    ),
                    PickerRow(
                      label: 'PDF эх сурвалж',
                      value: _uploadingPdf ? 'Байршуулж байна' : (s.pdfKey.isEmpty ? 'Файлгүй' : 'Файлтай'),
                      icon: AppIcons.document,
                      onTap: _uploadingPdf ? null : () => unawaited(_uploadPdf()),
                    ),
                    if (locks.thousand)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
                        child: Text(
                          '1000 бодлогын шалгалтыг ангид «Шалгалт, Тохиргоо» хэсгээс онооно',
                          style: context.text.bodySmall?.copyWith(color: c.inkDim),
                        ),
                      )
                    else
                      PickerRow(
                        label: 'Хэн үзэх вэ',
                        value: _classesLabel(),
                        icon: AppIcons.classes,
                        onTap: () => unawaited(_pickClasses()),
                      ),
                  ],
                  if (_c.catalogError.isNotEmpty)
                    Text(_c.catalogError, style: context.text.bodySmall?.copyWith(color: c.error)),
                ],
              ),
            ),
        ],
      ),
    );
  }

  String _classesLabel() {
    final ids = _c.value.classes;
    if (ids.isEmpty) return 'Анги сонгоогүй';
    final names = [
      for (final cl in _c.classrooms)
        if (ids.contains(cl.id)) cl.name,
    ];
    return names.isEmpty ? '${ids.length} анги' : names.join(', ');
  }
}

/// Бодлогын картын цэс.
enum ProblemCardAction { edit, preview, up, down, points, insertAbove, insertBelow, remove }

/// Тестийн нэг бодлого — карт. Бариулаар чирж эрэмбэлнэ (чирэхгүйгээр ч «Дээш, Доош зөөх» цэсээр).
class ProblemCard extends StatelessWidget {
  const ProblemCard({
    super.key,
    required this.index,
    required this.total,
    required this.content,
    required this.points,
    required this.onTap,
    required this.onAction,
    this.isNew = false,
    this.changed = false,
    this.error,
    this.locked = false,
  });

  final int index;
  final int total;
  final BlockContent content;
  final int points;
  final bool isNew;
  final bool changed;
  final String? error;

  /// Сурагч өгсөн — бүтэц түгжээтэй (бариул, зөөх, хасахгүй).
  final bool locked;
  final VoidCallback onTap;
  final ValueChanged<ProblemCardAction> onAction;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // AppCard-ийн `onTap` (PressableScale) чирэх үед устсан state-д хүрдэг тул энд InkWell.
    return AppCard(
      accent: error != null ? c.error : null,
      semanticLabel: '${index + 1}-р бодлого',
      padding: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.sm, AppSpace.xs, AppSpace.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  if (!locked)
                    ReorderableDragStartListener(
                      index: index,
                      child: Semantics(
                        label: '${index + 1}-р бодлогыг чирж зөөх',
                        child: SizedBox.square(
                          dimension: AppSizes.minTap,
                          child: Icon(AppIcons.menu, color: c.inkDim),
                        ),
                      ),
                    ),
                  Container(
                    constraints: const BoxConstraints(minWidth: 36),
                    height: 36,
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
                    decoration: BoxDecoration(color: c.brandTint, borderRadius: BorderRadius.circular(AppRadius.sm)),
                    child: Text('${index + 1}', style: context.text.titleSmall?.copyWith(color: c.brand)),
                  ),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(
                    child: BlockChips(content: content, points: points, isNew: isNew, changed: changed),
                  ),
                  PopupMenuButton<ProblemCardAction>(
                    tooltip: 'Үйлдэл',
                    icon: const Icon(AppIcons.overflow),
                    onSelected: onAction,
                    itemBuilder: (_) => [
                      const PopupMenuItem(value: ProblemCardAction.edit, child: Text('Засах')),
                      const PopupMenuItem(value: ProblemCardAction.preview, child: Text('Сурагчид харагдах')),
                      if (!locked) ...[
                        PopupMenuItem(value: ProblemCardAction.up, enabled: index > 0, child: const Text('Дээш зөөх')),
                        PopupMenuItem(
                          value: ProblemCardAction.down,
                          enabled: index < total - 1,
                          child: const Text('Доош зөөх'),
                        ),
                        const PopupMenuItem(value: ProblemCardAction.points, child: Text('Оноо өөрчлөх')),
                        const PopupMenuItem(value: ProblemCardAction.insertAbove, child: Text('Дээр нь нэмэх')),
                        const PopupMenuItem(value: ProblemCardAction.insertBelow, child: Text('Доор нь нэмэх')),
                        const PopupMenuItem(value: ProblemCardAction.remove, child: Text('Тестээс хасах')),
                      ],
                    ],
                  ),
                ],
              ),
              const SizedBox(height: AppSpace.sm),
              Padding(
                padding: const EdgeInsets.only(right: AppSpace.sm),
                child: ProblemReadView(content: content, compact: true),
              ),
              if (error != null) ...[
                const SizedBox(height: AppSpace.sm),
                Row(
                  children: [
                    Icon(AppIcons.warning, size: 16, color: c.error),
                    const SizedBox(width: AppSpace.xs),
                    Expanded(
                      child: Text(error!, style: context.text.bodySmall?.copyWith(color: c.error)),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
