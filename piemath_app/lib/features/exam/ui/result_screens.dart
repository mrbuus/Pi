import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/files/file_image.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/exam_models.dart';
import '../data/exam_repository.dart';
import 'widgets/review_parts.dart';

final examResultProvider = FutureProvider.autoDispose.family<ExamResultPage, String>(
  (ref, id) => ref.watch(examRepositoryProvider).examResult(id),
);

/// Дасгал тестийн эргэн харалт, эсвэл 1000 бодлогын (сервер талын хаалттай) эргэн харалт.
sealed class ReviewData {
  const ReviewData();
}

final class PracticeReviewData extends ReviewData {
  const PracticeReviewData(this.review);

  final PracticeReview review;
}

final class ThousandReviewData extends ReviewData {
  const ThousandReviewData(this.review);

  final ThousandReview review;
}

final reviewProvider = FutureProvider.autoDispose.family<ReviewData, String>((ref, id) async {
  final repo = ref.watch(examRepositoryProvider);
  final r = await repo.review(id);
  if (r.gatedReview) return ThousandReviewData(await repo.thousandReview(id));
  return PracticeReviewData(r);
});

String _errorText(Object e) => e is ApiError ? e.message : AppStrings.genericError;

void _toList(BuildContext context) => context.go('/app/tests');

String _opensText(DateTime? opensAt) => opensAt == null
    ? 'Багш нээсний дараа харагдана.'
    : '${DateMn.numericWithTime(UbDateTime.fromInstant(opensAt))}-нд автоматаар нээгдэнэ. Багш эрт нээж болно.';

/// `/app/tests/:id/result` — шалгалтын (CHAPTER_EXAM, EESH_MOCK, THOUSAND) дүн.
class ExamResultScreen extends ConsumerWidget {
  const ExamResultScreen({super.key, required this.testId});

  final String testId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(examResultProvider(testId));
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Шалгалтын дүн')),
      body: async.when(
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          title: 'Дүнг ачаалж чадсангүй',
          message: _errorText(e),
          onRetry: () => ref.invalidate(examResultProvider(testId)),
        ),
        data: (d) => _ResultBody(data: d),
      ),
    );
  }
}

class _ResultBody extends ConsumerWidget {
  const _ResultBody({required this.data});

  final ExamResultPage data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final d = data;
    final files = ref.watch(fileImageProvider);
    final c = context.colors;
    final wrong = d.wrong;
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        MetaTitle(d.title, style: context.text.headlineSmall),
        const SizedBox(height: AppSpace.lg),
        if (d.absent)
          const AppCard(child: Text('Та энэ шалгалтад ирээгүй гэж тэмдэглэгдсэн.'))
        else if (d.result != null) ...[
          ScoreSummary(
            score: d.result!,
            percent: d.percent,
            subtitle: d.part1Max == null
                ? null
                : Meta(
                    items: [
                      'I хэсэг ${formatScore(d.part1 ?? 0)}/${formatScore(d.part1Max!)}',
                      if (d.part2Max != null && d.part2Max! > 0)
                        'II хэсэг ${formatScore(d.part2 ?? 0)}/${formatScore(d.part2Max!)}',
                    ],
                  ),
          ),
        ],
        if (d.topics.isNotEmpty) ...[
          const SectionHeader(title: 'Сэдвийн эзэмшил'),
          AppCard(
            child: Column(
              children: [
                for (final t in d.topics)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
                    child: _TopicBar(topic: t),
                  ),
              ],
            ),
          ),
        ],
        if (d.practiceChapterIds.isNotEmpty) ...[
          const SizedBox(height: AppSpace.lg),
          _PracticeButton(topic: d.practiceTopic, chapterIds: d.practiceChapterIds),
        ],
        if (!d.absent) ...[
          SectionHeader(title: d.reviewOpen ? 'Алдсан бодлого' : 'Эргэн харалт'),
          if (!d.reviewOpen)
            AppCard(
              child: Row(
                children: [
                  Icon(AppIcons.password, color: c.inkDim),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Буруу бодлого, бодолт хараахан нээгдээгүй', style: context.text.titleSmall),
                        const SizedBox(height: 2),
                        Text(_opensText(d.reviewOpensAt), style: context.text.bodySmall),
                      ],
                    ),
                  ),
                ],
              ),
            )
          else if (wrong != null && wrong.isEmpty)
            const AppCard(child: Text('Бүх бодлогыг зөв бодсон байна.'))
          else if (wrong != null)
            for (final w in wrong) ...[_WrongCard(item: w, files: files), const SizedBox(height: AppSpace.md)],
          if (d.fullReview)
            OutlinedButton.icon(
              icon: const Icon(AppIcons.listTodo, size: 18),
              label: const Text('Бүх бодлогыг харах'),
              onPressed: () => context.push('/app/tests/${d.testId}/review'),
            ),
        ],
        if (!d.absent && d.result != null) ...[
          const SizedBox(height: AppSpace.sm),
          // Анхдагчаар ангийн байр харуулахгүй — хэрэглэгч хүсвэл л нээнэ (UX-RESEARCH §7).
          TextButton.icon(
            icon: const Icon(AppIcons.medal, size: 18),
            label: const Text('Миний байрыг харах'),
            onPressed: () => context.push('/app/tests/${d.testId}/ranking'),
          ),
        ],
        const SizedBox(height: AppSpace.lg),
        TextButton(onPressed: () => _toList(context), child: const Text('Шалгалтын жагсаалт руу')),
      ],
    );
  }
}

class _WrongCard extends StatelessWidget {
  const _WrongCard({required this.item, required this.files});

  final WrongItem item;
  final FileImageFactory files;

  @override
  Widget build(BuildContext context) {
    final status = item.allBlank ? const ReviewStatus.blank() : const ReviewStatus.wrong();
    final steps = item.part == 2 && item.steps.length > 1 ? item.steps.map((s) => s.label).join(', ') : null;
    final problem = item.problem;
    if (problem == null) {
      return AppCard(
        child: Row(
          children: [
            Expanded(child: Text('${item.n}-р бодлого', style: context.text.titleSmall)),
            status,
          ],
        ),
      );
    }
    return ReviewProblemCard(
      number: item.n,
      problem: problem,
      imageFor: files.image,
      status: status,
      trailing: steps == null
          ? null
          : Padding(
              padding: const EdgeInsets.only(top: AppSpace.sm),
              child: Text('Алдсан алхам: $steps', style: context.text.bodySmall),
            ),
    );
  }
}

class _TopicBar extends StatelessWidget {
  const _TopicBar({required this.topic});

  final TopicScore topic;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = topic.percent ?? (topic.max > 0 ? (topic.earned / topic.max * 100).round() : 0);
    return Semantics(
      container: true,
      label: '${topic.name}: $p хувь',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(topic.name, style: context.text.bodyMedium)),
              Text('$p%', style: context.text.labelMedium),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.pill),
            child: LinearProgressIndicator(
              value: math.min(1, math.max(0, p / 100)),
              minHeight: 6,
              backgroundColor: c.line,
              color: c.brandBright,
            ),
          ),
        ],
      ),
    );
  }
}

class _PracticeButton extends ConsumerStatefulWidget {
  const _PracticeButton({required this.topic, required this.chapterIds});

  final String? topic;
  final List<String> chapterIds;

  @override
  ConsumerState<_PracticeButton> createState() => _PracticeButtonState();
}

class _PracticeButtonState extends ConsumerState<_PracticeButton> {
  bool _busy = false;

  Future<void> _start() async {
    setState(() => _busy = true);
    final requestId = '${DateTime.now().microsecondsSinceEpoch}-${math.Random().nextInt(1 << 30)}';
    try {
      final id = await ref.read(examRepositoryProvider).startPractice(widget.chapterIds, requestId);
      if (!mounted) return;
      unawaited(context.push(id == null ? '/app/study/review' : '/app/study/review?run=${Uri.encodeComponent(id)}'));
    } on ApiError catch (e) {
      if (mounted) ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        children: [
          Icon(AppIcons.restart, color: context.colors.brand),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Сул сэдвээ давтах', style: context.text.titleSmall),
                Text([?widget.topic, '10 минутын давтлага, шинэ бодлогоор'].join(': '), style: context.text.bodySmall),
              ],
            ),
          ),
          TextButton(onPressed: _busy ? null : _start, child: const Text('Эхлэх')),
        ],
      ),
    );
  }
}

/// `/app/tests/:id/review` — дасгал тестийн эргэн харалт эсвэл 1000 бодлогын эргэн харалт.
class ReviewScreen extends ConsumerWidget {
  const ReviewScreen({super.key, required this.testId});

  final String testId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(reviewProvider(testId));
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Эргэн харалт')),
      body: async.when(
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          title: 'Эргэн харалтыг ачаалж чадсангүй',
          message: _errorText(e),
          onRetry: () => ref.invalidate(reviewProvider(testId)),
        ),
        data: (d) => switch (d) {
          PracticeReviewData(:final review) => _PracticeReviewBody(review: review),
          ThousandReviewData(:final review) => _ThousandReviewBody(review: review),
        },
      ),
    );
  }
}

class _PracticeReviewBody extends ConsumerWidget {
  const _PracticeReviewBody({required this.review});

  final PracticeReview review;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final files = ref.watch(fileImageProvider);
    final items = review.items;
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpace.gutter),
      itemCount: items.length + 2,
      itemBuilder: (context, i) {
        if (i == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.lg),
            child: review.result == null
                ? const SizedBox.shrink()
                : ScoreSummary(
                    score: review.result!,
                    subtitle: review.leaveCount > 0 ? Text('Аппаас ${review.leaveCount} удаа гарсан') : null,
                  ),
          );
        }
        if (i == items.length + 1) {
          return TextButton(onPressed: () => _toList(context), child: const Text('Шалгалтын жагсаалт руу'));
        }
        final it = items[i - 1];
        final Widget status = it.answerUnknown
            ? const ReviewStatus.unknown()
            : !it.answered
            ? const ReviewStatus.blank()
            : it.correct
            ? const ReviewStatus.correct()
            : const ReviewStatus.wrong();
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.md),
          child: ReviewProblemCard(
            number: it.n,
            imageFor: files.image,
            status: status,
            problem: ReviewProblem(
              format: ProblemFormat.choice,
              statementText: it.statementText,
              imageKey: it.imageKey,
              myAnswer: it.myAnswer,
              solution: it.solution,
            ),
          ),
        );
      },
    );
  }
}

class _ThousandReviewBody extends ConsumerWidget {
  const _ThousandReviewBody({required this.review});

  final ThousandReview review;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final files = ref.watch(fileImageProvider);
    final r = review;
    if (r.level == ReviewLevel.none) {
      return EmptyState(
        icon: AppIcons.password,
        title: 'Эргэн харалт хараахан нээгдээгүй байна',
        message: r.opensAt == null ? 'Багш нээсний дараа бодлого, хариугаа харах боломжтой.' : _opensText(r.opensAt),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpace.gutter),
      itemCount: r.items.length + 1,
      itemBuilder: (context, i) {
        if (i == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                MetaTitle(r.title, style: context.text.titleLarge),
                if (r.result != null) ...[const SizedBox(height: AppSpace.md), ScoreSummary(score: r.result!)],
              ],
            ),
          );
        }
        final it = r.items[i - 1];
        final Widget? status = r.level != ReviewLevel.full
            ? (it.answered ? null : const ReviewStatus.blank())
            : !it.answerKnown
            ? const ReviewStatus.unknown()
            : !it.answered
            ? const ReviewStatus.blank()
            : it.correct == true
            ? const ReviewStatus.correct()
            : const ReviewStatus.wrong();
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.md),
          child: ReviewProblemCard(number: it.n, problem: it.problem, imageFor: files.image, status: status),
        );
      },
    );
  }
}
