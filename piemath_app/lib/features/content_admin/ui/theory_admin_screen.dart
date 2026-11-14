import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/content_providers.dart';
import '../data/content_models.dart';
import 'content_widgets.dart';
import 'theory_editor_screen.dart';

/// Онолын агуулга (`/app/admin/theory`, вэбийн `TheoryEditorClient`) — Админ, Багш+, Багш.
/// Хичээл → ном → бүлэг сонгоод онолын блокуудыг нэмэх, засах, эрэмбэлэх, архивлах (Админ, Багш+).
class TheoryAdminScreen extends ConsumerStatefulWidget {
  const TheoryAdminScreen({super.key});

  static const path = '/app/admin/theory';

  @override
  ConsumerState<TheoryAdminScreen> createState() => _TheoryAdminScreenState();
}

class _TheoryAdminScreenState extends ConsumerState<TheoryAdminScreen> {
  ContentSubject _subject = ContentSubject.math;
  String? _bookId;
  String? _chapterId;

  /// Optimistic дараалал / архивласны дараах жагсаалт. `null` = серверийнх.
  List<TheoryItem>? _local;
  bool _busy = false;

  Future<void> _pickBook(List<ContentBook> books) async {
    final picked = await showSelectSheet<String>(
      context,
      title: 'Ном сонгох',
      selected: _bookId,
      options: [for (final b in books) SelectOption(b.id, b.title)],
    );
    if (picked == null || !mounted) return;
    setState(() {
      _bookId = picked.value;
      _chapterId = null;
      _local = null;
    });
  }

  Future<void> _pickChapter(List<ContentChapter> chapters) async {
    final picked = await showSelectSheet<String>(
      context,
      title: 'Бүлэг сэдэв сонгох',
      selected: _chapterId,
      options: [
        for (final c in chapters)
          SelectOption(
            c.id,
            c.title,
            subtitle: [if (c.theoryCount != null) '${c.theoryCount} блок', if (c.freePreview) 'үнэгүй'].join(', '),
          ),
      ],
    );
    if (picked == null || !mounted) return;
    setState(() {
      _chapterId = picked.value;
      _local = null;
    });
  }

  void _reload() {
    final id = _chapterId;
    setState(() => _local = null);
    if (id != null) ref.invalidate(theoryBlocksProvider(id));
  }

  Future<void> _openEditor(String chapterId, TheoryItem? block) async {
    final saved = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => TheoryEditorScreen(chapterId: chapterId, block: block),
      ),
    );
    if (saved == true && mounted) {
      contentSnack(context, 'Хадгалагдлаа');
      _reload();
    }
  }

  Future<void> _move(String chapterId, List<TheoryItem> blocks, int i, int d) async {
    final j = i + d;
    if (_busy || j < 0 || j >= blocks.length) return;
    final next = [...blocks];
    final t = next[i];
    next[i] = next[j];
    next[j] = t;
    setState(() {
      _local = next;
      _busy = true;
    });
    try {
      await ref.read(contentRepositoryProvider).reorderTheory(chapterId, [for (final b in next) b.id]);
    } catch (e) {
      if (mounted) {
        contentSnack(context, contentError(e, 'Дараалал хадгалагдсангүй'));
        _reload();
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _archive(String chapterId, List<TheoryItem> blocks, TheoryItem b) async {
    final ok = await confirmAction(
      context,
      title: 'Онолын блок архивлах уу',
      message: '«${b.title}» сурагчдад харагдахаа болино. Агуулга устахгүй, хадгалагдана',
      confirmLabel: 'Архивлах',
    );
    if (!ok || !mounted) return;
    final repo = ref.read(contentRepositoryProvider);
    final messenger = ScaffoldMessenger.of(context);
    setState(
      () => _local = [
        for (final x in blocks)
          if (x.id != b.id) x,
      ],
    );
    final undone = await showUndoSnack(context, message: 'Архивлалаа');
    if (undone) {
      if (mounted) setState(() => _local = blocks);
      return;
    }
    try {
      await repo.archiveTheory(b.id);
    } catch (e) {
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(contentError(e, 'Архивлаж чадсангүй'))));
      if (mounted) setState(() => _local = blocks);
      return;
    }
    if (mounted) _reload();
  }

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(contentAccessProvider);
    if (!access.canOpen) {
      return Scaffold(
        appBar: AppBar(title: const Text('Онолын агуулга')),
        body: const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden),
      );
    }
    final booksAsync = ref.watch(theoryBooksProvider(_subject));
    final books = booksAsync.value ?? const <ContentBook>[];
    final bookId = _bookId ?? (books.isEmpty ? null : books.first.id);
    final book = books.where((b) => b.id == bookId).firstOrNull;
    final chaptersAsync = bookId == null ? null : ref.watch(theoryChaptersProvider(bookId));
    final chapters = chaptersAsync?.value ?? const <ContentChapter>[];
    final chapterId = _chapterId ?? (chapters.isEmpty ? null : chapters.first.id);
    final chapter = chapters.where((c) => c.id == chapterId).firstOrNull;

    return Scaffold(
      appBar: AppBar(title: const Text('Онолын агуулга')),
      floatingActionButton: chapterId == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _openEditor(chapterId, null),
              icon: const Icon(AppIcons.add),
              label: const Text('Блок нэмэх'),
            ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(theoryBooksProvider(_subject));
          _reload();
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 96),
          children: [
            Wrap(
              spacing: AppSpace.sm,
              children: [
                for (final s in ContentSubject.values)
                  ChoiceChip(
                    label: Text(s.label),
                    selected: s == _subject,
                    onSelected: (_) => setState(() {
                      _subject = s;
                      _bookId = null;
                      _chapterId = null;
                      _local = null;
                    }),
                  ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            AppCard(
              padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
              child: Column(
                children: [
                  PickerTile(
                    label: 'Ном',
                    icon: AppIcons.library,
                    value: switch (booksAsync) {
                      AsyncData() when books.isEmpty => 'Энэ хичээлээр ном алга',
                      AsyncData() => book?.title ?? 'Сонгох',
                      AsyncError() => 'Ачаалж чадсангүй',
                      _ => 'Ачаалж байна',
                    },
                    onTap: books.isEmpty ? null : () => _pickBook(books),
                  ),
                  Divider(height: 1, indent: AppSpace.md, endIndent: AppSpace.md, color: context.colors.line),
                  PickerTile(
                    label: 'Бүлэг сэдэв',
                    icon: AppIcons.theory,
                    value: switch (chaptersAsync) {
                      null => '-',
                      AsyncData() when chapters.isEmpty => 'Бүлэг алга',
                      AsyncData() => chapter?.title ?? 'Сонгох',
                      AsyncError() => 'Ачаалж чадсангүй',
                      _ => 'Ачаалж байна',
                    },
                    onTap: chapters.isEmpty ? null : () => _pickChapter(chapters),
                  ),
                ],
              ),
            ),
            if (booksAsync.hasError || (chaptersAsync?.hasError ?? false))
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.sm),
                child: OutlinedButton.icon(
                  onPressed: () {
                    ref.invalidate(theoryBooksProvider(_subject));
                    if (bookId != null) ref.invalidate(theoryChaptersProvider(bookId));
                  },
                  icon: const Icon(AppIcons.retry, size: 18),
                  label: const Text(AppStrings.retry),
                ),
              ),
            if (chapterId != null) ...[
              const SectionHeader(title: 'Онолын блокууд'),
              _Blocks(
                chapterId: chapterId,
                local: _local,
                busy: _busy,
                access: access,
                onRetry: _reload,
                onOpen: (b) => _openEditor(chapterId, b),
                onMove: (list, i, d) => _move(chapterId, list, i, d),
                onArchive: (list, b) => _archive(chapterId, list, b),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Blocks extends ConsumerWidget {
  const _Blocks({
    required this.chapterId,
    required this.local,
    required this.busy,
    required this.access,
    required this.onRetry,
    required this.onOpen,
    required this.onMove,
    required this.onArchive,
  });

  final String chapterId;
  final List<TheoryItem>? local;
  final bool busy;
  final ContentAccess access;
  final VoidCallback onRetry;
  final void Function(TheoryItem) onOpen;
  final void Function(List<TheoryItem>, int, int) onMove;
  final void Function(List<TheoryItem>, TheoryItem) onArchive;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(theoryBlocksProvider(chapterId));
    return AsyncBody<List<TheoryItem>>(
      value: async,
      onRetry: onRetry,
      data: (server) {
        final blocks = local ?? server;
        if (blocks.isEmpty) {
          return const EmptyState(
            icon: AppIcons.document,
            title: 'Энэ бүлэгт онолын блок алга',
            message: 'Сурагч бүлгийг судлахад унших тайлбар, томьёо, жишээгээ «Блок нэмэх» товчоор нэмнэ үү',
          );
        }
        return Column(
          children: [
            for (var i = 0; i < blocks.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: AppCard(
                  key: ValueKey('theory:${blocks[i].id}'),
                  padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.xs, AppSpace.md),
                  onTap: access.canEditTheory(blocks[i]) ? () => onOpen(blocks[i]) : null,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${i + 1}', style: context.text.labelMedium?.copyWith(color: context.colors.inkDim)),
                            MathText(blocks[i].title, style: context.text.titleSmall),
                            if (blocks[i].preview.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              MathText(
                                blocks[i].preview,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                              ),
                            ],
                            if (blocks[i].imageKeys.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: AppSpace.xs),
                                child: MetaChip(label: '${blocks[i].imageKeys.length} зураг', icon: AppIcons.images),
                              ),
                          ],
                        ),
                      ),
                      Column(
                        children: [
                          IconButton(
                            tooltip: 'Дээш',
                            icon: const RotatedBox(quarterTurns: 2, child: Icon(AppIcons.expand, size: 20)),
                            onPressed: busy || i == 0 ? null : () => onMove(blocks, i, -1),
                          ),
                          IconButton(
                            tooltip: 'Доош',
                            icon: const Icon(AppIcons.expand, size: 20),
                            onPressed: busy || i == blocks.length - 1 ? null : () => onMove(blocks, i, 1),
                          ),
                          if (access.canArchiveTheory)
                            IconButton(
                              tooltip: 'Архивлах',
                              icon: const Icon(AppIcons.trash, size: 20),
                              onPressed: busy ? null : () => onArchive(blocks, blocks[i]),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
