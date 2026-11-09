import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/draft_models.dart';
import '../data/draft_parse.dart';
import '../data/draft_repository.dart';
import 'draft_list_screen.dart';
import 'draft_ui.dart';

/// Нэг ноорог (`/app/internal/:id`, вэбийн `SetEditor`): бодлого нэмэх, засах (зэрэг засварын хамгаалалттай),
/// хуулах, эрэмбэлэх, ChatGPT / Word-оос бөөнөөр оруулах, бодох, бүлэгт нийтлэх, түүх, ноорог устгах (зөөлөн).
class DraftEditorScreen extends ConsumerStatefulWidget {
  const DraftEditorScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<DraftEditorScreen> createState() => _DraftEditorScreenState();
}

class _DraftEditorScreenState extends ConsumerState<DraftEditorScreen> {
  List<DraftBlock>? _order;
  bool _busy = false;

  DraftRepository get _repo => ref.read(draftRepositoryProvider);

  void _reload() {
    setState(() => _order = null);
    ref.invalidate(draftSetProvider(widget.id));
  }

  Future<void> _run(
    Future<void> Function() action, {
    String? success,
    String fallback = 'Амжсангүй. Дахин оролдоно уу',
  }) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await action();
      if (mounted && success != null) draftSnack(context, success);
      if (mounted) _reload();
    } catch (e) {
      if (!mounted) return;
      if (e is ApiError && e.kind == ApiErrorKind.conflict) {
        draftSnack(context, 'Өөр хүн энэ бодлогыг зассан байна. Шинэчилсэн хувилбарыг харуулж байна');
        _reload();
      } else {
        draftSnack(context, draftError(e, fallback));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _edit(DraftBlock b, int n) async {
    final c = await showDraftBlockSheet(context, b.content, title: '$n-р бодлого');
    if (c == null || !mounted) return;
    await _run(() => _repo.updateBlock(b.id, c, expectedVersion: b.version), success: 'Хадгалагдлаа');
  }

  Future<void> _addBlank(List<DraftBlock> blocks) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final b = await _repo.addBlock(widget.id, afterId: blocks.isEmpty ? null : blocks.last.id);
      if (!mounted) return;
      setState(() => _busy = false);
      _reload();
      await _edit(b, blocks.length + 1);
    } catch (e) {
      if (mounted) draftSnack(context, draftError(e, 'Бодлого нэмж чадсангүй'));
    } finally {
      if (mounted && _busy) setState(() => _busy = false);
    }
  }

  Future<void> _move(List<DraftBlock> blocks, int i, int d) async {
    final j = i + d;
    if (_busy || j < 0 || j >= blocks.length) return;
    final next = [...blocks];
    final t = next[i];
    next[i] = next[j];
    next[j] = t;
    setState(() {
      _order = next;
      _busy = true;
    });
    try {
      await _repo.reorder(widget.id, [for (final b in next) b.id]);
    } catch (e) {
      if (mounted) {
        draftSnack(context, draftError(e, 'Дараалал хадгалагдсангүй'));
        _reload();
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _addParsed(List<ParsedDraft> parsed, String source) async {
    if (parsed.isEmpty) {
      draftSnack(context, 'Бичвэрээс бодлого танигдсангүй');
      return;
    }
    final notes = parsed.where((p) => p.notes.isNotEmpty).length;
    final ok = await confirmAction(
      context,
      title: '${parsed.length} бодлого нэмэх үү',
      message: notes == 0 ? null : '$notes бодлогод шалгах зүйл байна (хариу, сонголт). Нэмсний дараа засна уу',
      confirmLabel: 'Нэмэх',
      destructive: false,
    );
    if (!ok || !mounted) return;
    await _run(
      () => _repo.addBlocks(widget.id, [for (final p in parsed) p.content], source: source),
      success: '${parsed.length} бодлого нэмэгдлээ',
      fallback: 'Нэмж чадсангүй',
    );
  }

  Future<void> _paste() async {
    final raw = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => const _PasteSheet(),
    );
    if (raw != null && raw.trim().isNotEmpty && mounted) await _addParsed(parseDraftText(raw), 'PASTE');
  }

  Future<void> _word() async {
    final file = await ref.read(docxPickerProvider).pick();
    if (file == null || !mounted) return;
    if (!file.name.toLowerCase().endsWith('.docx') || file.bytes.length > 10 * 1024 * 1024) {
      draftSnack(context, '10 МБ-аас ихгүй .docx файл сонгоно уу');
      return;
    }
    setState(() => _busy = true);
    try {
      final preview = await _repo.wordPreview(file.bytes, file.name);
      if (!mounted) return;
      setState(() => _busy = false);
      await _addParsed(parseDraftText(preview.plainText), 'WORD');
    } catch (e) {
      if (mounted) draftSnack(context, draftError(e, 'Файлыг уншиж чадсангүй'));
    } finally {
      if (mounted && _busy) setState(() => _busy = false);
    }
  }

  Future<void> _settings(DraftSet s) async {
    final saved = await showFormSheet<bool>(
      context,
      title: 'Ноорогийн мэдээлэл',
      fields: [
        FormTextField(name: 'title', label: 'Нэр', initial: s.title, maxLength: 200),
        FormSelectField<DraftSubject>(
          name: 'subject',
          label: 'Хичээл',
          initial: s.subject,
          required: true,
          options: [for (final x in DraftSubject.values) SelectOption(x, x.label)],
        ),
        FormTextField(name: 'topic', label: 'Сэдэв', initial: s.topic, maxLength: 120),
      ],
      onSubmit: (v) async {
        await _repo.updateSet(s.id, {
          'title': v.text('title'),
          'subject': v.get<DraftSubject>('subject')!.api,
          'topic': v.text('topic').isEmpty ? null : v.text('topic'),
        });
        return true;
      },
    );
    if (saved == true && mounted) _reload();
  }

  Future<void> _publish(DraftSet s) async {
    if (s.blocks.isEmpty) {
      draftSnack(context, 'Нийтлэх бодлого алга');
      return;
    }
    final withIssues = s.blocks.where((b) => b.issues.isNotEmpty).length;
    if (withIssues > 0) {
      draftSnack(context, '$withIssues бодлогод засах зүйл байна. Засаад дахин нийтэлнэ үү');
      return;
    }
    List<DraftChapterRef> chapters;
    try {
      chapters = await _repo.chapters(s.subject);
    } catch (e) {
      if (mounted) draftSnack(context, draftError(e, 'Бүлгийн жагсаалтыг ачаалж чадсангүй'));
      return;
    }
    if (!mounted) return;
    final result = await showFormSheet<DraftPublishResult>(
      context,
      title: 'Нийтлэх',
      subtitle: '${s.blocks.length} бодлого бүлгийн санд орно',
      submitLabel: 'Нийтлэх',
      fields: [
        FormSelectField<String>(
          name: 'chapter',
          label: 'Бүлэг сэдэв',
          required: true,
          initial: s.chapter?.id,
          options: [for (final c in chapters) SelectOption(c.id, c.title, subtitle: c.bookTitle)],
        ),
        const FormTextField(name: 'test', label: 'Тестийн нэр (тест болгох бол)', maxLength: 200),
        FormSelectField<DraftTestType>(
          name: 'type',
          label: 'Тестийн төрөл',
          initial: DraftTestType.custom,
          options: [for (final t in DraftTestType.values) SelectOption(t, t.label)],
        ),
        const FormNumberField(name: 'minutes', label: 'Хугацаа (заавал биш)', min: 1, max: 600, suffixText: 'мин'),
        const FormSwitchField(name: 'draft', label: 'Тестийг ноорог хэвээр үлдээх', initial: true),
      ],
      onSubmit: (v) => _repo.publish(
        s.id,
        chapterId: v.get<String>('chapter')!,
        testTitle: v.text('test'),
        type: v.get<DraftTestType>('type') ?? DraftTestType.custom,
        testIsDraft: v.boolean('draft'),
        timeLimitMin: v.integer('minutes'),
      ),
    );
    if (result != null && mounted) {
      draftSnack(
        context,
        '${result.count} бодлого «${result.chapterTitle}»-д нийтлэгдлээ${result.testId != null ? ', тест үүслээ' : ''}',
      );
      _reload();
    }
  }

  Future<void> _history(DraftSet s) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (ctx) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      builder: (ctx, scroll) => s.events.isEmpty
          ? const EmptyState(icon: AppIcons.history, title: 'Түүх алга')
          : ListView.builder(
              controller: scroll,
              itemCount: s.events.length,
              itemBuilder: (ctx, i) => ListTile(
                minTileHeight: AppSizes.minTap,
                leading: const Icon(AppIcons.historyLog),
                title: Text(s.events[i].summary),
                subtitle: Meta(
                  items: [s.events[i].actorName, if (s.events[i].at != null) DateMn.relative(s.events[i].at!)],
                ),
              ),
            ),
    ),
  );

  Future<void> _delete(DraftSet s) async {
    final ok = await confirmAction(
      context,
      title: 'Ноорог устгах уу',
      message: 'Ноорог жагсаалтаас хасагдана. Аль хэдийн нийтэлсэн бодлого, тест хэвээр үлдэнэ',
    );
    if (!ok || !mounted) return;
    try {
      await _repo.deleteSet(s.id);
      if (!mounted) return;
      draftSnack(context, 'Ноорог устгагдлаа');
      ref.invalidate(draftSetsProvider);
      if (context.canPop()) {
        context.pop();
      } else {
        context.go(DraftListScreen.path);
      }
    } catch (e) {
      if (mounted) draftSnack(context, draftError(e, 'Устгаж чадсангүй'));
    }
  }

  Future<void> _menu(DraftSet s) async {
    final v = await pickOne<String>(context, s.displayTitle, const [
      SelectOption('settings', 'Нэр, хичээл, сэдэв', icon: AppIcons.penLine),
      SelectOption('paste', 'ChatGPT-ээс оруулах', icon: AppIcons.copy),
      SelectOption('word', 'Word файлаас оруулах', icon: AppIcons.document),
      SelectOption('solve', 'Бодож шалгах', icon: AppIcons.checklist),
      SelectOption('publish', 'Нийтлэх', icon: AppIcons.send),
      SelectOption('history', 'Түүх', icon: AppIcons.history),
      SelectOption('delete', 'Ноорог устгах', icon: AppIcons.trash),
    ]);
    if (!mounted) return;
    switch (v) {
      case 'settings':
        await _settings(s);
      case 'paste':
        await _paste();
      case 'word':
        await _word();
      case 'solve':
        await context.push('${DraftListScreen.path}/${Uri.encodeComponent(s.id)}/solve');
      case 'publish':
        await _publish(s);
      case 'history':
        await _history(s);
      case 'delete':
        await _delete(s);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!ref.watch(draftAccessProvider)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ноорог')),
        body: const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden),
      );
    }
    if (!isSafeId(widget.id)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ноорог')),
        body: const EmptyState(icon: AppIcons.fileQuestion, title: AppStrings.notFound),
      );
    }
    final async = ref.watch(draftSetProvider(widget.id));
    final s = async.value;
    return Scaffold(
      appBar: AppBar(
        title: Text(s?.displayTitle ?? 'Ноорог'),
        actions: [
          if (s != null)
            IconButton(
              tooltip: 'Үйлдэл',
              icon: const Icon(AppIcons.overflow),
              onPressed: _busy ? null : () => _menu(s),
            ),
        ],
      ),
      floatingActionButton: s == null
          ? null
          : FloatingActionButton.extended(
              onPressed: _busy ? null : () => _addBlank(_order ?? s.blocks),
              icon: const Icon(AppIcons.add),
              label: const Text('Бодлого'),
            ),
      body: switch (async) {
        AsyncData(:final value) => _body(value),
        AsyncError(:final error) => ErrorState(
          message: error is ApiError ? error.message : AppStrings.genericError,
          onRetry: _reload,
        ),
        _ => const LoadingState(),
      },
    );
  }

  Widget _body(DraftSet s) {
    final blocks = _order ?? s.blocks;
    return RefreshIndicator(
      onRefresh: () async => _reload(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 96),
        children: [
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            children: [
              MetaChip(
                label: s.published ? 'Нийтэлсэн' : 'Ноорог',
                tone: s.published ? ChipTone.success : ChipTone.brand,
              ),
              MetaChip(label: s.subject.label),
              if (s.chapter != null) MetaChip(label: s.chapter!.title, icon: AppIcons.theory),
              if (s.topic != null && s.topic!.isNotEmpty) MetaChip(label: s.topic!),
              if (s.changedSincePublish) const MetaChip(label: 'Нийтэлснээс хойш зассан', tone: ChipTone.warning),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          if (blocks.isEmpty)
            EmptyState(
              icon: AppIcons.draft,
              title: 'Бодлого алга',
              message: 'Шинэ бодлого бичих, ChatGPT эсвэл Word-оос оруулна',
              action: Wrap(
                spacing: AppSpace.sm,
                children: [
                  OutlinedButton(onPressed: _busy ? null : _paste, child: const Text('ChatGPT-ээс')),
                  OutlinedButton(onPressed: _busy ? null : _word, child: const Text('Word')),
                ],
              ),
            ),
          for (var i = 0; i < blocks.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.sm),
              child: AppCard(
                key: ValueKey('block:${blocks[i].id}'),
                onTap: _busy ? null : () => _edit(blocks[i], i + 1),
                padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.xs, AppSpace.md),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Meta(items: ['${i + 1}-р бодлого', if (blocks[i].publishedProblemId != null) 'Нийтэлсэн']),
                          const SizedBox(height: AppSpace.xs),
                          DraftContentView(
                            content: blocks[i].content,
                            issues: blocks[i].issues,
                            hasImage: blocks[i].imageKey != null,
                          ),
                        ],
                      ),
                    ),
                    Column(
                      children: [
                        IconButton(
                          tooltip: 'Дээш',
                          icon: const RotatedBox(quarterTurns: 2, child: Icon(AppIcons.expand, size: 20)),
                          onPressed: _busy || i == 0 ? null : () => _move(blocks, i, -1),
                        ),
                        IconButton(
                          tooltip: 'Доош',
                          icon: const Icon(AppIcons.expand, size: 20),
                          onPressed: _busy || i == blocks.length - 1 ? null : () => _move(blocks, i, 1),
                        ),
                        IconButton(
                          tooltip: 'Хуулах',
                          icon: const Icon(AppIcons.copy, size: 20),
                          onPressed: _busy
                              ? null
                              : () => _run(
                                  () => _repo.duplicate(blocks[i].id),
                                  success: 'Хууллаа',
                                  fallback: 'Хуулж чадсангүй',
                                ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// ChatGPT-ийн бичвэр буулгах доод хуудас — бичвэрийг буцаана.
class _PasteSheet extends StatefulWidget {
  const _PasteSheet();

  @override
  State<_PasteSheet> createState() => _PasteSheetState();
}

class _PasteSheetState extends State<_PasteSheet> {
  final _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpace.gutter,
        0,
        AppSpace.gutter,
        MediaQuery.viewInsetsOf(context).bottom + AppSpace.xl,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('ChatGPT-ээс оруулах', style: context.text.titleMedium),
            const SizedBox(height: AppSpace.xs),
            Text(
              '«1.» дугаар, «A. B. C.» сонголт, «Хариу:», «Бодолт:» мөртэй бичвэрийг буулгана уу',
              style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
            ),
            const SizedBox(height: AppSpace.md),
            TextField(
              controller: _text,
              minLines: 8,
              maxLines: 14,
              decoration: const InputDecoration(labelText: 'Бичвэр', alignLabelWithHint: true),
            ),
            const SizedBox(height: AppSpace.md),
            FilledButton(onPressed: () => Navigator.of(context).pop(_text.text), child: const Text('Задлах')),
          ],
        ),
      ),
    );
  }
}
