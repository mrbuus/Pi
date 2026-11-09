import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../data/events_repository.dart';
import '../data/lesson_models.dart';
import '../data/lesson_repository.dart';
import 'inline_message.dart';
import 'video_tile.dart';

/// Бүлгийн мөр: гарчиг, ном, явц.
class ChapterRow extends StatelessWidget {
  const ChapterRow({super.key, required this.chapter, this.showBook = true});

  final LessonChapter chapter;
  final bool showBook;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final ch = chapter;
    return AppCard(
      onTap: () => context.push('/app/learn/${Uri.encodeComponent(ch.id)}'),
      child: Row(
        children: [
          Icon(ch.completed ? AppIcons.success : AppIcons.theory, color: ch.completed ? c.success : c.brand),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MathText(ch.title, style: context.text.titleSmall),
                Meta(
                  items: [
                    if (showBook) ch.bookName,
                    if (ch.theoryCount > 0) '${ch.theoryCount} онол',
                    if (ch.videoCount > 0) '${ch.videoCount} бичлэг',
                  ],
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                ),
                if (ch.itemsTotal > 0 && !ch.completed) ...[
                  const SizedBox(height: AppSpace.sm),
                  Semantics(
                    label: 'Явц ${ch.itemsDone} / ${ch.itemsTotal}',
                    child: LinearProgressIndicator(
                      value: ch.progress,
                      minHeight: 4,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ],
              ],
            ),
          ),
          Icon(AppIcons.forward, color: c.inkDim),
        ],
      ),
    );
  }
}

/// `/app/learn` — хичээл үзэх: бүх бүлэг, хайлт, явц.
class LearnScreen extends ConsumerStatefulWidget {
  const LearnScreen({super.key});

  @override
  ConsumerState<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends ConsumerState<LearnScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final list = ref.watch(lessonChaptersProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Хичээл үзэх')),
      body: list.when(
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          title: 'Хичээл ачаалж чадсангүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(lessonChaptersProvider),
        ),
        data: (all) {
          if (all.isEmpty) {
            return const EmptyState(
              icon: AppIcons.theory,
              title: 'Одоогоор нээлттэй хичээл алга',
              message: 'Танд нээгдсэн бүлгийн онол, бичлэг энд гарна',
            );
          }
          final q = _query.trim().toLowerCase();
          final shown = [
            for (final c in all)
              if (q.isEmpty || c.title.toLowerCase().contains(q) || c.bookName.toLowerCase().contains(q)) c,
          ];
          return ListView(
            padding: const EdgeInsets.all(AppSpace.gutter),
            children: [
              TextField(
                decoration: const InputDecoration(
                  hintText: 'Бүлэг, номоор хайх',
                  prefixIcon: Icon(AppIcons.search, size: 20),
                ),
                onChanged: (v) => setState(() => _query = v),
              ),
              const SizedBox(height: AppSpace.lg),
              if (shown.isEmpty)
                const EmptyState(title: 'Олдсонгүй', message: 'Хайлтаа өөрчилж үзнэ үү')
              else
                for (final c in shown) ...[ChapterRow(chapter: c), const SizedBox(height: AppSpace.md)],
            ],
          );
        },
      ),
    );
  }
}

/// `/app/learn/:chapterId` — бүлгийн онол, бичлэг, тест.
class LessonScreen extends ConsumerWidget {
  const LessonScreen({super.key, required this.chapterId});

  final String chapterId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(lessonProvider(chapterId));
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Хичээл')),
      body: async.when(
        loading: () => const LoadingState(cards: 2),
        error: (e, _) => ErrorState(
          title: 'Хичээл нээгдсэнгүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(lessonProvider(chapterId)),
        ),
        data: (l) => _LessonBody(lesson: l),
      ),
    );
  }
}

class _LessonBody extends ConsumerStatefulWidget {
  const _LessonBody({required this.lesson});

  final Lesson lesson;

  @override
  ConsumerState<_LessonBody> createState() => _LessonBodyState();
}

class _LessonBodyState extends ConsumerState<_LessonBody> {
  late final Set<String> _read = {...widget.lesson.theoryRead};
  late final Set<String> _started = {...widget.lesson.videosWatched};

  @override
  void initState() {
    super.initState();
    // Вэбтэй адил: хичээл ачаалагдсаны дараа нэг удаа `CHAPTER_OPENED` (чимээгүй, блоклохгүй).
    ref.read(eventsRepositoryProvider).chapterOpened(widget.lesson.chapterId);
  }

  void _theoryOpened(TheoryBlock t) {
    if (_read.add(t.id)) {
      setState(() {});
      ref.read(lessonRepositoryProvider).progress(widget.lesson.chapterId, 'THEORY_READ', theoryId: t.id);
    }
  }

  void _videoStarted(LessonVideo v) {
    if (_started.add(v.id)) {
      setState(() {});
      ref.read(lessonRepositoryProvider).progress(widget.lesson.chapterId, 'VIDEO_STARTED', videoId: v.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = widget.lesson;
    final images = ref.watch(fileImageProvider);
    final empty = l.theories.isEmpty && l.videos.isEmpty && l.tests.isEmpty && l.problemCount == 0;
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        MathText(l.title, style: context.text.headlineSmall),
        if (l.bookName.isNotEmpty)
          Text(l.bookName, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
        if (empty)
          const Padding(
            padding: EdgeInsets.only(top: AppSpace.xl),
            child: EmptyState(title: 'Энэ бүлэгт материал алга'),
          ),
        if (l.theories.isNotEmpty) ...[
          const SizedBox(height: AppSpace.xl),
          const SectionHeader(
            title: 'Онол',
            padding: EdgeInsets.only(bottom: AppSpace.sm),
          ),
          for (final t in l.theories) ...[
            AppCard(
              padding: EdgeInsets.zero,
              child: Theme(
                data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  tilePadding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
                  childrenPadding: const EdgeInsets.fromLTRB(AppSpace.lg, 0, AppSpace.lg, AppSpace.lg),
                  expandedCrossAxisAlignment: CrossAxisAlignment.start,
                  leading: Icon(
                    _read.contains(t.id) ? AppIcons.success : AppIcons.circle,
                    size: 20,
                    color: _read.contains(t.id) ? context.colors.success : context.colors.inkDim,
                  ),
                  title: Text(t.title.isEmpty ? 'Онол' : t.title, style: context.text.titleSmall),
                  onExpansionChanged: (open) {
                    if (open) _theoryOpened(t);
                  },
                  children: [
                    MathText(t.content),
                    for (final k in t.imageKeys) ...[
                      const SizedBox(height: AppSpace.md),
                      ProblemFigure(image: images.image(k), alt: 'Онолын зураг'),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpace.sm),
          ],
        ],
        if (l.videos.isNotEmpty) ...[
          const SizedBox(height: AppSpace.xl),
          const SectionHeader(
            title: 'Бичлэг',
            padding: EdgeInsets.only(bottom: AppSpace.sm),
          ),
          for (final v in l.videos) ...[
            VideoTile(video: v, watched: _started.contains(v.id), onStarted: () => _videoStarted(v)),
            const SizedBox(height: AppSpace.sm),
          ],
        ],
        if (l.problemCount > 0) ...[
          const SizedBox(height: AppSpace.xl),
          const SectionHeader(
            title: 'Бодлого',
            padding: EdgeInsets.only(bottom: AppSpace.sm),
          ),
          AppCard(
            onTap: () => context.push('/app/library/${Uri.encodeComponent(l.chapterId)}/problems'),
            child: Row(
              children: [
                Icon(AppIcons.checklist, color: context.colors.brand),
                const SizedBox(width: AppSpace.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Бүлгийн бодлогууд', style: context.text.titleSmall),
                      Text(
                        '${l.problemCount} бодлого',
                        style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                      ),
                    ],
                  ),
                ),
                Icon(AppIcons.forward, color: context.colors.inkDim),
              ],
            ),
          ),
        ],
        if (l.tests.isNotEmpty) ...[
          const SizedBox(height: AppSpace.xl),
          const SectionHeader(
            title: 'Сэдвийн тест',
            padding: EdgeInsets.only(bottom: AppSpace.sm),
          ),
          for (final t in l.tests) ...[
            AppCard(
              onTap: () => context.push('/app/tests/${Uri.encodeComponent(t.id)}'),
              child: Row(
                children: [
                  Icon(AppIcons.exam, color: context.colors.brand),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        MathText(t.title, style: context.text.titleSmall),
                        if (t.problemCount != null)
                          Text(
                            '${t.problemCount} бодлого',
                            style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                          ),
                      ],
                    ),
                  ),
                  Icon(AppIcons.forward, color: context.colors.inkDim),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.sm),
          ],
        ],
      ],
    );
  }
}

/// `/app/videos` — бичлэгтэй бүлгүүд.
class VideosScreen extends ConsumerWidget {
  const VideosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final list = ref.watch(videoChaptersProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Онлайн хичээл')),
      body: list.when(
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          title: 'Бичлэгийн жагсаалт ачаалж чадсангүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(videoChaptersProvider),
        ),
        data: (all) {
          if (all.isEmpty) {
            return const EmptyState(
              icon: AppIcons.video,
              title: 'Одоогоор нээлттэй бичлэг алга',
              message: 'Танд нээгдсэн бүлгийн бичлэг энд гарна',
            );
          }
          return ListView(
            padding: const EdgeInsets.all(AppSpace.gutter),
            children: [
              for (final c in all) ...[
                AppCard(
                  onTap: () => context.push('/app/videos/${Uri.encodeComponent(c.id)}'),
                  child: Row(
                    children: [
                      Icon(AppIcons.video, color: context.colors.brand),
                      const SizedBox(width: AppSpace.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            MathText(c.title, style: context.text.titleSmall),
                            Meta(
                              items: [c.bookName, '${c.videoCount} бичлэг'],
                              style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                            ),
                          ],
                        ),
                      ),
                      Icon(AppIcons.forward, color: context.colors.inkDim),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpace.md),
              ],
            ],
          );
        },
      ),
    );
  }
}

/// `/app/videos/:chapterId` — бүлгийн бичлэгүүд.
class ChapterVideosScreen extends ConsumerWidget {
  const ChapterVideosScreen({super.key, required this.chapterId});

  final String chapterId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(chapterVideosProvider(chapterId));
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Бичлэг')),
      body: async.when(
        loading: () => const LoadingState(cards: 2),
        error: (e, _) => ErrorState(
          title: 'Бичлэг нээгдсэнгүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(chapterVideosProvider(chapterId)),
        ),
        data: (videos) => videos.isEmpty
            ? const EmptyState(icon: AppIcons.video, title: 'Энэ бүлэгт бичлэг алга')
            : ListView(
                padding: const EdgeInsets.all(AppSpace.gutter),
                children: [
                  for (final v in videos) ...[VideoTile(video: v), const SizedBox(height: AppSpace.sm)],
                ],
              ),
      ),
    );
  }
}
