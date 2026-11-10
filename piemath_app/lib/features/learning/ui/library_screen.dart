import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../data/library_models.dart';
import '../data/library_repository.dart';
import 'inline_message.dart' show errorText;

/// `/app/library` — бодлогын сан (вэбийн `app/library/page.tsx`): хичээл (Математик / Нийгмийн ухаан) →
/// номын таб («N тест») → сэдэв (өмнөх/дараах сум, нэг товшилтоор сонгох) → тест → бодлого.
/// Танхимын сурагчид API зөвхөн ангид нээгдсэн сэдвийг өгнө.
class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  LibrarySubject _subject = LibrarySubject.math;
  String? _bookId;
  String? _topic;

  void _selectSubject(LibrarySubject s) {
    if (s == _subject) return;
    setState(() {
      _subject = s;
      _bookId = null;
      _topic = null;
    });
  }

  void _selectBook(String id) => setState(() {
        _bookId = id;
        _topic = null;
      });

  @override
  Widget build(BuildContext context) {
    final books = ref.watch(libraryBooksProvider(_subject));
    return Scaffold(
      appBar: AppBar(title: const Text('Ном')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(libraryBooksProvider(_subject));
          if (_bookId != null) ref.invalidate(libraryChaptersProvider(_bookId!));
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
          children: [
            _ChipRow(
              children: [
                for (final s in LibrarySubject.values)
                  ChoiceChip(
                    label: Text(s.label),
                    selected: s == _subject,
                    showCheckmark: false,
                    onSelected: (_) => _selectSubject(s),
                  ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            ...books.when(
              skipLoadingOnRefresh: true,
              loading: () => [const SkeletonRows(rows: 4)],
              error: (e, _) => [
                ErrorState(
                  title: 'Ном ачаалж чадсангүй',
                  message: errorText(e),
                  onRetry: () => ref.invalidate(libraryBooksProvider(_subject)),
                ),
              ],
              data: (list) => list.isEmpty
                  ? [
                      const EmptyState(
                        icon: AppIcons.libraryBig,
                        title: 'Ном алга',
                        message: 'Энэ хичээлээр ном хараахан нэмэгдээгүй байна',
                      ),
                    ]
                  : _bookContent(context, list),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _bookContent(BuildContext context, List<LibraryBook> books) {
    final current = books.where((b) => b.id == _bookId).firstOrNull ?? defaultBook(books)!;
    final chapters = ref.watch(libraryChaptersProvider(current.id));
    return [
      if (books.length > 1)
        _ChipRow(
          children: [
            for (final b in books)
              ChoiceChip(
                label: Text('${b.label}  ${b.testCount} тест'),
                selected: b.id == current.id,
                showCheckmark: false,
                onSelected: (_) => _selectBook(b.id),
              ),
          ],
        ),
      ...chapters.when(
        skipLoadingOnRefresh: true,
        loading: () => [const SizedBox(height: AppSpace.md), const SkeletonRows(rows: 4)],
        error: (e, _) => [
          ErrorState(
            title: 'Бүлэг сэдэв ачаалж чадсангүй',
            message: errorText(e),
            onRetry: () => ref.invalidate(libraryChaptersProvider(current.id)),
          ),
        ],
        data: (list) => _topics(context, current, list),
      ),
    ];
  }

  List<Widget> _topics(BuildContext context, LibraryBook book, List<LibraryChapter> chapters) {
    final groups = groupChapters(chapters);
    final total = groups.fold(0, (s, g) => s + g.problems);
    final header = Padding(
      padding: const EdgeInsets.only(top: AppSpace.md, bottom: AppSpace.sm),
      child: Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: AppSpace.sm,
        children: [
          Text(book.label, style: context.text.titleLarge),
          Meta(items: ['${groups.length} сэдэв', '$total бодлого']),
        ],
      ),
    );
    if (groups.isEmpty) {
      return [
        header,
        const EmptyState(
          icon: AppIcons.libraryBig,
          title: 'Ангидаа үзсэн сэдвүүд энд харагдана',
          message: 'Ангидаа тест хийсний маргааш бодлого нь энд нээгдэнэ',
        ),
      ];
    }
    final i = groups.indexWhere((g) => g.topic == _topic);
    final index = i < 0 ? 0 : i;
    final active = groups[index];
    return [
      header,
      _TopicNavigator(
        groups: groups,
        index: index,
        onSelect: (g) => setState(() => _topic = g.topic),
      ),
      const SizedBox(height: AppSpace.md),
      for (final (n, ch) in active.chapters.indexed)
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.sm),
          child: _ChapterCard(chapter: ch, number: n + 1, topicName: active.name),
        ),
    ];
  }
}

class _ChipRow extends StatelessWidget {
  const _ChipRow({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (final c in children) Padding(padding: const EdgeInsets.only(right: AppSpace.xs), child: c),
          ],
        ),
      );
}

/// Сэдвийн толгой: өмнөх / дараах сум, дарахад бүх сэдвээс нэг товшилтоор сонгоно.
class _TopicNavigator extends StatelessWidget {
  const _TopicNavigator({required this.groups, required this.index, required this.onSelect});

  final List<TopicGroup> groups;
  final int index;
  final ValueChanged<TopicGroup> onSelect;

  Future<void> _pick(BuildContext context) async {
    final picked = await showModalBottomSheet<TopicGroup>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        builder: (ctx, controller) => ListView.builder(
          controller: controller,
          itemCount: groups.length,
          itemBuilder: (ctx, i) {
            final g = groups[i];
            return ListTile(
              selected: i == index,
              title: Text(g.name),
              subtitle: Meta(items: ['${g.problems} бодлого', if (g.free > 0) '${g.free} үнэгүй']),
              onTap: () => Navigator.pop(ctx, g),
            );
          },
        ),
      ),
    );
    if (picked != null) onSelect(picked);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final g = groups[index];
    final prev = index > 0 ? groups[index - 1] : null;
    final next = index < groups.length - 1 ? groups[index + 1] : null;
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs, vertical: AppSpace.xs),
      child: Row(
        children: [
          IconButton(
            tooltip: prev == null ? 'Өмнөх' : 'Өмнөх: ${prev.name}',
            onPressed: prev == null ? null : () => onSelect(prev),
            icon: const Icon(AppIcons.back),
          ),
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadius.sm),
              onTap: () => _pick(context),
              child: Semantics(
                button: true,
                label: 'Сэдэв сонгох, одоо ${g.name}',
                child: ExcludeSemantics(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpace.xs, horizontal: AppSpace.xs),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(g.name, style: context.text.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                              Meta(items: ['${g.problems} бодлого', if (g.free > 0) '${g.free} үнэгүй']),
                            ],
                          ),
                        ),
                        Icon(AppIcons.expand, size: 18, color: c.inkDim),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          IconButton(
            tooltip: next == null ? 'Дараах' : 'Дараах: ${next.name}',
            onPressed: next == null ? null : () => onSelect(next),
            icon: const Icon(AppIcons.forward),
          ),
        ],
      ),
    );
  }
}

class _ChapterCard extends StatelessWidget {
  const _ChapterCard({required this.chapter, required this.number, required this.topicName});

  final LibraryChapter chapter;
  final int number;
  final String topicName;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final ch = chapter;
    final label = ch.parts.label;
    return AppCard(
      onTap: () => context.push(
        Uri(
          path: '/app/library/${Uri.encodeComponent(ch.id)}/problems',
          queryParameters: {'title': label == ch.title ? label : '$topicName, $label', 'access': ?ch.access},
        ).toString(),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: ch.freePreview ? c.success.withValues(alpha: 0.14) : c.brandTint,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Text(
              '$number',
              style: context.text.titleMedium?.copyWith(color: ch.freePreview ? c.success : c.brand),
            ),
          ),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: AppSpace.xs,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    MathText(label, style: context.text.titleSmall),
                    if (ch.freePreview)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(AppIcons.success, size: 14, color: c.success),
                          const SizedBox(width: 2),
                          Text('Үнэгүй', style: context.text.labelSmall?.copyWith(color: c.success)),
                        ],
                      ),
                  ],
                ),
                Meta(items: ['${ch.visibleProblems} бодлого', if (ch.theories > 0) '${ch.theories} онол']),
              ],
            ),
          ),
          Icon(AppIcons.forward, size: 18, color: c.inkDim),
        ],
      ),
    );
  }
}
