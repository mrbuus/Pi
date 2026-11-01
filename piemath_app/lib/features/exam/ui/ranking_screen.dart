import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/exam_models.dart';
import '../data/exam_repository.dart';
import '../data/ranking_models.dart';
import 'exam_icons.dart';

final testRankingProvider = FutureProvider.autoDispose.family<TestRanking, String>(
  (ref, id) => ref.watch(examRepositoryProvider).ranking(id),
);

/// `/app/tests/:id/ranking` — өөрийн байр (анги, сургууль, нийт). Бусдын нэр ИРЭХГҮЙ.
/// Анхдагчаар харуулахгүй: дүнгийн хуудаснаас хэрэглэгч өөрөө товшиж нээнэ; сервер зөвшөөрөөгүй
/// (404/403) бол тайван тайлбар.
class TestRankingScreen extends ConsumerWidget {
  const TestRankingScreen({super.key, required this.testId});

  final String testId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(testRankingProvider(testId));
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Байр')),
      body: async.when(
        loading: () => const LoadingState(),
        error: (e, _) {
          if (e is ApiError && (e.kind == ApiErrorKind.notFound || e.kind == ApiErrorKind.forbidden)) {
            return const EmptyState(
              icon: ExamIcons.locked,
              title: 'Байр одоогоор харагдахгүй байна',
              message: 'Дүн гарсан, байр тооцогдсон үед энд харагдана.',
            );
          }
          return ErrorState(
            title: 'Байрыг ачаалж чадсангүй',
            message: e is ApiError ? e.message : AppStrings.genericError,
            onRetry: () => ref.invalidate(testRankingProvider(testId)),
          );
        },
        data: (r) => _Body(ranking: r),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.ranking});

  final TestRanking ranking;

  @override
  Widget build(BuildContext context) {
    final r = ranking;
    final entries = r.all;
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        if (r.title.isNotEmpty) MetaTitle(r.title, style: context.text.headlineSmall),
        const SizedBox(height: AppSpace.xs),
        Text(
          'Таны оноо ${formatScore(r.totalScore.toDouble())} / ${formatScore(r.maxScore.toDouble())}',
          style: context.text.bodyMedium,
        ),
        const SizedBox(height: AppSpace.lg),
        if (entries.isEmpty || !r.hasAnyRank)
          const EmptyState(
            icon: ExamIcons.locked,
            title: 'Байр хараахан тооцогдоогүй байна',
            message: 'Оролцогч хангалттай болсон үед энд харагдана.',
          )
        else
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.xs),
            child: Column(
              children: [
                for (var i = 0; i < entries.length; i++) ...[
                  if (i > 0) Divider(height: 1, color: context.colors.line),
                  _RankRow(entry: entries[i]),
                ],
              ],
            ),
          ),
        const SizedBox(height: AppSpace.md),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(AppIcons.secure, size: 16, color: context.colors.inkDim),
            const SizedBox(width: AppSpace.sm),
            Expanded(child: Text('Бусад оролцогчийн нэр харагдахгүй', style: context.text.bodySmall)),
          ],
        ),
      ],
    );
  }
}

class _RankRow extends StatelessWidget {
  const _RankRow({required this.entry});

  final RankEntry entry;

  @override
  Widget build(BuildContext context) {
    final e = entry;
    final rank = e.rank;
    final value = rank == null ? 'Тооцогдоогүй' : '$rank-р байр';
    final detail = [
      if (rank != null && e.participants > 0) '${e.participants} оролцогчоос',
      if (e.tied > 0) 'ижил оноотой ${e.tied} хүн',
    ].join(', ');
    return Semantics(
      label: '${e.label}: $value${detail.isEmpty ? '' : ', $detail'}',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(e.label, style: context.text.titleSmall),
                  if (detail.isNotEmpty) Text(detail, style: context.text.bodySmall),
                ],
              ),
            ),
            Text(value, style: context.text.titleMedium),
          ],
        ),
      ),
    );
  }
}
