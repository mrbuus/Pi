import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../application/chapter_problems_controller.dart';
import '../data/chapter_problem_models.dart';
import '../data/lesson_repository.dart';
import '../domain/video_source.dart';
import 'inline_message.dart';
import 'problem_video_disclosure.dart';

/// `/app/library/:chapterId/problems?title=&access=` — бүлгийн (тестийн) бодлогын жагсаалт. Хариу, шинжилгээ
/// энд ирэхгүй (сервер хасна); бодохдоо дасгалын дэлгэц рүү орно. A ба B хувилбарыг НЭГТГЭХГҮЙ (эзэн
/// 2026-10-08): хоёр хувилбартай бол нэг дор нэгийг нь таваар сонгоно.
class ChapterProblemsScreen extends ConsumerStatefulWidget {
  const ChapterProblemsScreen({super.key, required this.chapterId, this.title, this.classroomAccess = false});

  final String chapterId;

  /// Сангаас ирсэн бол тестийн нэр.
  final String? title;

  /// Танхимын сурагч (`access` ирсэн) — 403 бол «ангидаа үзсэний дараа нээгдэнэ».
  final bool classroomAccess;

  @override
  ConsumerState<ChapterProblemsScreen> createState() => _ChapterProblemsScreenState();
}

/// «A» → «Хувилбар A»; «A хувилбар» хэвээр.
String variantTabLabel(String v) => v.toLowerCase().contains('хувилбар') ? v : 'Хувилбар $v';

class _ChapterProblemsScreenState extends ConsumerState<ChapterProblemsScreen> {
  String? _variant;

  String get chapterId => widget.chapterId;

  @override
  Widget build(BuildContext context) {
    final provider = chapterProblemsProvider(chapterId);
    final async = ref.watch(provider);
    final title = widget.title;
    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: title == null || title.isEmpty
            ? const Text('Бүлгийн бодлого')
            : MathText(title, style: context.text.titleLarge, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: async.when(
        loading: () => const LoadingState(),
        error: (e, _) => e is ApiError && e.kind == ApiErrorKind.forbidden
            ? (widget.classroomAccess
                  ? const EmptyState(
                      icon: AppIcons.password,
                      title: 'Энэ сэдэв ангидаа үзсэний дараа нээгдэнэ',
                      message: 'Ангидаа тест хийсний маргааш бодлого нь энд нээгдэнэ',
                    )
                  : const EmptyState(
                      icon: AppIcons.password,
                      title: 'Энэ бүлгийг үзэх эрх хэрэгтэй байна',
                      message: 'Эрхийг сургалтын төв олгоно',
                    ))
            : ErrorState(
                title: 'Бодлого ачаалж чадсангүй',
                message: errorText(e),
                onRetry: () => ref.invalidate(provider),
              ),
        data: (state) {
          if (state.items.isEmpty) {
            return const EmptyState(
              icon: AppIcons.checklist,
              title: 'Энэ бүлэгт нээлттэй бодлого алга',
              message: 'Ангид нээгдсэн тестийн бодлогууд энд гарна',
            );
          }
          final notifier = ref.read(provider.notifier);
          final variants = {for (final p in state.items) ?p.variantLabel}.toList()..sort();
          final current = variants.length < 2 ? null : (variants.contains(_variant) ? _variant! : variants.first);
          final shown = current == null ? state.items : state.items.where((p) => p.variantLabel == current).toList();
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(provider);
              await ref.read(provider.future);
            },
            child: ListView(
              padding: const EdgeInsets.all(AppSpace.gutter),
              children: [
                if (current != null) ...[
                  Wrap(
                    spacing: AppSpace.xs,
                    children: [
                      for (final v in variants)
                        ChoiceChip(
                          label: Text('${variantTabLabel(v)}  ${state.items.where((p) => p.variantLabel == v).length}'),
                          selected: v == current,
                          showCheckmark: false,
                          onSelected: (_) => setState(() => _variant = v),
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.md),
                ],
                for (final (i, p) in shown.indexed) ...[
                  _ProblemCard(problem: p, index: i + 1, showVariant: current == null),
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
  const _ProblemCard({required this.problem, required this.index, this.showVariant = true});

  final ChapterProblem problem;
  final int index;
  final bool showVariant;

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
            items: ['${p.number ?? index}-р бодлого', if (showVariant) p.variantLabel],
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
            // A–E нэг мөрөнд эсвэл 3+2 (эзний дүрэм) — зөвхөн харах, хариу сонгохгүй
            ChoiceGrid(
              variant: ChoiceGridVariant.compact,
              groupLabel: 'Сонголтууд',
              choices: [
                for (final ch in p.choices)
                  ChoiceItem(
                    label: ch.label,
                    text: ch.text,
                    image: ch.imageKey == null ? null : images.image(ch.imageKey!),
                  ),
              ],
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
                  icon: const Icon(AppIcons.play, size: 18),
                  label: const Text('Бодолтын бичлэг'),
                ),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          ProblemVideoDisclosure(problemId: p.id),
        ],
      ),
    );
  }
}
