import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../application/chapter_problems_controller.dart';
import '../data/chapter_problem_models.dart';
import '../data/lesson_repository.dart';
import '../domain/video_source.dart';
import '../learning_icons.dart';
import 'inline_message.dart';

/// `/app/library/:chapterId/problems` — бүлгийн бодлогын жагсаалт. Хариу, шинжилгээ энд ирэхгүй (сервер хасна);
/// бодохдоо дасгалын дэлгэц рүү орно.
class ChapterProblemsScreen extends ConsumerWidget {
  const ChapterProblemsScreen({super.key, required this.chapterId});

  final String chapterId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = chapterProblemsProvider(chapterId);
    final async = ref.watch(provider);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Бүлгийн бодлого')),
      body: async.when(
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          title: 'Бодлого ачаалж чадсангүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(provider),
        ),
        data: (state) {
          if (state.items.isEmpty) {
            return const EmptyState(
              icon: LearningIcons.problems,
              title: 'Энэ бүлэгт нээлттэй бодлого алга',
              message: 'Ангид нээгдсэн тестийн бодлогууд энд гарна',
            );
          }
          final notifier = ref.read(provider.notifier);
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(provider);
              await ref.read(provider.future);
            },
            child: ListView(
              padding: const EdgeInsets.all(AppSpace.gutter),
              children: [
                for (final (i, p) in state.items.indexed) ...[
                  _ProblemCard(problem: p, index: i + 1),
                  const SizedBox(height: AppSpace.md),
                ],
                if (state.hasMore)
                  ValueListenableBuilder<bool>(
                    valueListenable: notifier.moreFailed,
                    builder: (context, failed, _) => Column(
                      children: [
                        if (failed)
                          const Padding(
                            padding: EdgeInsets.only(bottom: AppSpace.sm),
                            child: InlineMessage('Дараагийн бодлогуудыг ачаалж чадсангүй'),
                          ),
                        OutlinedButton(
                          onPressed: notifier.loadMore,
                          child: Text(failed ? AppStrings.retry : 'Цааш үзэх'),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ProblemCard extends ConsumerWidget {
  const _ProblemCard({required this.problem, required this.index});

  final ChapterProblem problem;
  final int index;

  Future<void> _openSolution(BuildContext context, WidgetRef ref, Uri uri) async {
    final messenger = ScaffoldMessenger.of(context);
    final ok = await ref.read(videoLauncherProvider).open(uri);
    if (!ok) messenger.showSnackBar(const SnackBar(content: Text('Бичлэгийг нээж чадсангүй. Дахин оролдоно уу')));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final p = problem;
    final images = ref.watch(fileImageProvider);
    final solution = p.youtubeUrl == null ? null : youtubeEmbedUri(p.youtubeUrl!);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Meta(
            items: ['${p.number ?? index}-р бодлого', ?p.variantLabel],
            style: context.text.labelMedium?.copyWith(color: c.inkDim),
          ),
          const SizedBox(height: AppSpace.sm),
          RepaintBoundary(
            child: ProblemFigure(
              image: p.imageKey == null ? null : images.image(p.imageKey!),
              alt: 'Бодлогын зураг',
              child: MathText(
                p.statementText ?? 'Бодлогын текст алга, зургаас уншина уу',
                style: context.text.bodyLarge,
              ),
            ),
          ),
          if (p.choices.isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            for (final ch in p.choices)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.xs),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(width: 24, child: Text('${ch.label}.', style: context.text.bodyMedium?.copyWith(color: c.inkDim))),
                    Expanded(
                      child: ch.imageKey != null && ch.text.isEmpty
                          ? ProblemFigure(image: images.image(ch.imageKey!), alt: 'Сонголт ${ch.label}')
                          : MathText(ch.text, style: context.text.bodyMedium),
                    ),
                  ],
                ),
              ),
          ],
          const SizedBox(height: AppSpace.md),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.sm,
            children: [
              FilledButton(
                onPressed: () => context.push('/app/practice/${Uri.encodeComponent(p.id)}'),
                child: const Text('Бодох'),
              ),
              if (solution != null)
                OutlinedButton.icon(
                  onPressed: () => _openSolution(context, ref, solution),
                  icon: const Icon(LearningIcons.play, size: 18),
                  label: const Text('Бодолтын бичлэг'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
