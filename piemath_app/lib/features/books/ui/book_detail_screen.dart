import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/auth/session.dart';
import '../../../core/ui/ui.dart';
import '../data/books_models.dart';
import '../data/books_repository.dart';
import '../domain/book_meta.dart';
import 'books_common.dart';

/// Нэг ном: сэдвүүд (`/books/:code`). Сэдэв дарахад тестүүд.
class BookDetailScreen extends ConsumerWidget {
  const BookDetailScreen({super.key, required this.code});

  final String code;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(bookDetailProvider(code));
    final name = async.whenOrNull(data: (d) => bookDisplayName(d.code, d.title, d.displayName)) ??
        bookMeta[code]?.name ??
        'Ном';
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: BookName(name, maxLines: 1)),
      body: async.when(
        loading: () => const LoadingState(),
        error: (e, _) => publicError(e, onRetry: () => ref.invalidate(bookDetailProvider(code))),
        data: (d) => ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
          children: [
            if (bookMeta[code]?.blurb != null) ...[
              Text(bookMeta[code]!.blurb!, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
              const SizedBox(height: AppSpace.sm),
            ],
            Meta(
              items: [
                '${d.topics.length} сэдэв',
                '${d.topics.fold<int>(0, (s, t) => s + t.tests)} тест',
                if (d.freeTests > 0) '${d.freeTests} үнэгүй',
              ],
            ),
            const SectionHeader(title: 'Сэдвүүд'),
            if (d.topics.isEmpty)
              const EmptyState(title: 'Энэ номын тестүүд удахгүй нэмэгдэнэ')
            else
              AppCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    for (var i = 0; i < d.topics.length; i++) ...[
                      if (i > 0) Divider(color: context.colors.line, indent: AppSpace.lg),
                      ListTile(
                        title: Text(d.topics[i].name, style: context.text.titleSmall),
                        subtitle: Text(
                          d.topics[i].freeTests > 0
                              ? '${d.topics[i].tests} тест, ${d.topics[i].freeTests} үнэгүй'
                              : '${d.topics[i].tests} тест',
                          style: context.text.bodySmall,
                        ),
                        trailing: Icon(AppIcons.forward, size: 18, color: context.colors.inkDim),
                        onTap: () => context.push('/books/${Uri.encodeComponent(code)}/topic/$i'),
                      ),
                    ],
                  ],
                ),
              ),
            const SizedBox(height: AppSpace.xl),
            AccessNoteCard(webPath: '/books/${Uri.encodeComponent(code)}'),
          ],
        ),
      ),
    );
  }
}

/// Сэдвийн тестүүд (`/books/:code/topic/:index`) — бүлэг бүр карт, A/B хувилбар сонгоно.
class BookTopicScreen extends ConsumerWidget {
  const BookTopicScreen({super.key, required this.code, required this.index});

  final String code;
  final int index;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(bookDetailProvider(code));
    final topic = async.whenOrNull(data: (d) => index >= 0 && index < d.topics.length ? d.topics[index] : null);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: Text(topic?.name ?? 'Тестүүд')),
      body: async.when(
        loading: () => const LoadingState(),
        error: (e, _) => publicError(e, onRetry: () => ref.invalidate(bookDetailProvider(code))),
        data: (d) => topic == null
            ? const EmptyState(title: 'Сэдэв олдсонгүй')
            : ListView(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
                children: [
                  Text(
                    topic.freeTests > 0
                        ? '${topic.chapters.length} тест, ${topic.problems} бодлого, ${topic.freeTests} нь үнэгүй'
                        : '${topic.chapters.length} тест, ${topic.problems} бодлого',
                    style: context.text.bodySmall,
                  ),
                  const SizedBox(height: AppSpace.md),
                  for (var i = 0; i < topic.chapters.length; i++) ...[
                    ChapterCard(code: code, chapter: topic.chapters[i], first: i == 0),
                    const SizedBox(height: AppSpace.md),
                  ],
                  AccessNoteCard(webPath: '/books/${Uri.encodeComponent(code)}'),
                ],
              ),
      ),
    );
  }
}

/// Нэг бүлэг (тест) — хувилбар сонгох, «Бодож үзэх» / «Эрхтэй бол нээх» / «Эрх нээх».
class ChapterCard extends ConsumerStatefulWidget {
  const ChapterCard({super.key, required this.code, required this.chapter, this.first = false});

  final String code;
  final BookChapter chapter;
  final bool first;

  @override
  ConsumerState<ChapterCard> createState() => _ChapterCardState();
}

class _ChapterCardState extends ConsumerState<ChapterCard> {
  String? _variant;

  @override
  Widget build(BuildContext context) {
    final ch = widget.chapter;
    final labels = ch.variantLabels;
    final selected = labels.isEmpty ? null : (labels.contains(_variant) ? _variant : labels.first);
    final rows = selected == null ? ch.tests : ch.tests.where((t) => t.variantLabel == selected).toList();
    final signedIn = ref.watch(sessionProvider) is SignedIn;
    final c = context.colors;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text(ch.label, style: context.text.titleSmall)),
              if (ch.anyFree) ...[
                Icon(BooksIcons.free, size: 16, color: c.brand),
                const SizedBox(width: AppSpace.xs),
                Text('Үнэгүй', style: context.text.labelMedium?.copyWith(color: c.brand)),
              ],
            ],
          ),
          if (labels.length > 1) ...[
            const SizedBox(height: AppSpace.sm),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: SegmentedButton<String>(
                showSelectedIcon: false,
                segments: [for (final l in labels) ButtonSegment(value: l, label: Text('$l хувилбар'))],
                selected: {selected!},
                onSelectionChanged: (s) => setState(() => _variant = s.first),
              ),
            ),
          ],
          for (final t in rows) ...[
            const SizedBox(height: AppSpace.md),
            _TestRow(
              code: widget.code,
              test: t,
              showTitle: labels.isEmpty && ch.tests.length > 1,
              signedIn: signedIn,
            ),
          ],
          if (widget.first && ch.anyFree) ...[
            const SizedBox(height: AppSpace.sm),
            Text('Эхний тестийг нэвтрэлтгүй, шууд бодож болно', style: context.text.bodySmall),
          ],
        ],
      ),
    );
  }
}

class _TestRow extends StatelessWidget {
  const _TestRow({required this.code, required this.test, required this.showTitle, required this.signedIn});

  final String code;
  final BookTestItem test;
  final bool showTitle;
  final bool signedIn;

  @override
  Widget build(BuildContext context) {
    final Widget action;
    if (!test.solvable) {
      action = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(BooksIcons.inClass, size: 16, color: context.colors.inkDim),
          const SizedBox(width: AppSpace.xs),
          Flexible(child: Text('Танхимд, удахгүй онлайнаар', style: context.text.bodySmall)),
        ],
      );
    } else if (test.free) {
      action = FilledButton.icon(
        icon: const Icon(BooksIcons.play, size: 18),
        label: const Text('Бодож үзэх'),
        onPressed: () => context.push('/books/${Uri.encodeComponent(code)}/try/${Uri.encodeComponent(test.id)}'),
      );
    } else if (signedIn) {
      // Эрхийг сервер шийднэ — эрхгүй бол шалгалтын дэлгэц тайлбар харуулна.
      action = OutlinedButton.icon(
        icon: const Icon(BooksIcons.open, size: 18),
        label: const Text('Эрхтэй бол нээх'),
        onPressed: () => context.push('/app/tests/${Uri.encodeComponent(test.id)}'),
      );
    } else {
      action = OutlinedButton.icon(
        icon: const Icon(BooksIcons.lock, size: 18),
        label: const Text('Эрх нээх'),
        onPressed: () => showAccessSheet(context, webPath: '/books/${Uri.encodeComponent(code)}'),
      );
    }
    return Wrap(
      spacing: AppSpace.md,
      runSpacing: AppSpace.sm,
      crossAxisAlignment: WrapCrossAlignment.center,
      alignment: WrapAlignment.spaceBetween,
      children: [
        Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (showTitle) Text(test.title, style: context.text.bodyMedium),
            Meta(
              items: [
                '${test.problemCount} бодлого',
                if (test.timeLimitMin != null && test.timeLimitMin! > 0) '${test.timeLimitMin} мин',
              ],
            ),
          ],
        ),
        action,
      ],
    );
  }
}
