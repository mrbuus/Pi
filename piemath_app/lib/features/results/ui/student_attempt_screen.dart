import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../teacher/application/teacher_providers.dart' show errorText;
import '../application/results_providers.dart';
import '../data/results_models.dart';
import '../domain/results_logic.dart';
import 'results_widgets.dart';

/// Сурагчийн задаргаа (`/app/tests/:id/results/:studentId`, вэбийн «Дүн» табын сурагчийн мөр,
/// `GET /exams/:testId/students/:studentId`): нийт оноо, хэсгүүд, алдсан бодлого, сэдвээр, бусад шалгалтын явц.
/// Багш — зөвхөн өөрийн ангийн сурагч (сервер шийднэ).
class StudentAttemptScreen extends ConsumerWidget {
  const StudentAttemptScreen({super.key, required this.testId, required this.studentId, this.name});

  final String testId;
  final String studentId;
  final String? name;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final access = ref.watch(resultsAccessProvider);
    return Scaffold(
      appBar: AppBar(title: Text(name?.isNotEmpty ?? false ? name! : 'Сурагчийн дүн')),
      body: access.canView
          ? StudentAttemptView(testId: testId, studentId: studentId)
          : const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden),
    );
  }
}

/// Задаргааны бие (утсанд бүтэн дэлгэц, таблетад баруун тал).
class StudentAttemptView extends ConsumerWidget {
  const StudentAttemptView({super.key, required this.testId, required this.studentId});

  final String testId;
  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = (testId: testId, studentId: studentId);
    return ref
        .watch(studentAttemptProvider(key))
        .when(
          skipLoadingOnRefresh: false,
          loading: () => const LoadingState(cards: 3),
          error: (e, _) => ErrorState(
            message: errorText(e, 'Сурагчийн дүнг ачаалж чадсангүй'),
            onRetry: () => ref.invalidate(studentAttemptProvider(key)),
          ),
          data: (a) => RefreshIndicator(
            onRefresh: () => ref.refresh(studentAttemptProvider(key).future).then((_) {}, onError: (_) {}),
            child: CustomScrollView(physics: const AlwaysScrollableScrollPhysics(), slivers: _slivers(context, a)),
          ),
        );
  }

  List<Widget> _slivers(BuildContext context, StudentAttempt a) {
    final band = bandOf(a.percent);
    return [
      SliverToBoxAdapter(
        child: DetailHeader(
          title: a.name,
          avatar: const DetailAvatar(icon: AppIcons.user),
          chips: [
            if (a.absent)
              const MetaChip(label: 'Ирээгүй', icon: AppIcons.ban, tone: ChipTone.warning)
            else if (!a.hasResult)
              const MetaChip(label: 'Дүн ороогүй', icon: AppIcons.hourglass)
            else
              MetaChip(label: '${a.percent ?? 0}%', icon: AppIcons.exam, tone: toneOfBand(band)),
          ],
        ),
      ),
      if (a.hasResult && !a.absent)
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          sliver: SliverToBoxAdapter(
            child: StatRow(
              tiles: [
                StatTile(label: 'Оноо', value: '${fmtScore(a.total!)}/${fmtScore(a.max!)}'),
                StatTile(label: 'Хувь', value: '${a.percent ?? 0}%', tone: toneOfBand(band)),
                if (a.parts case final p?) ...[
                  StatTile(label: 'I хэсэг', value: '${fmtScore(p.part1)}/${fmtScore(p.part1Max)}'),
                  if (p.part2Max > 0)
                    StatTile(label: 'II хэсэг', value: '${fmtScore(p.part2)}/${fmtScore(p.part2Max)}'),
                ],
              ],
            ),
          ),
        ),
      if (a.hasResult && !a.absent && a.parts == null)
        const _Note(text: 'Зөвхөн нийт оноо орсон тул бодлого бүрийн задаргаа алга'),
      if (a.wrong.isNotEmpty) ...[
        SliverSection(title: 'Алдсан бодлого (${a.wrong.length})'),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          sliver: SliverList.separated(
            itemCount: a.wrong.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final w = a.wrong[i];
              final blank = w.status == ItemStatus.blank;
              return ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 48),
                child: Row(
                  children: [
                    Icon(
                      blank ? AppIcons.circleDashed : AppIcons.failure,
                      size: 18,
                      color: blank ? context.colors.inkDim : context.colors.error,
                    ),
                    const SizedBox(width: AppSpace.md),
                    Expanded(child: Text(w.part == 1 ? '#${w.label}' : w.label, style: context.text.titleSmall)),
                    Text(
                      '${blank ? 'Хоосон' : 'Буруу'}, ${fmtScore(w.points)} оноо',
                      style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
      if (a.topics.isNotEmpty) ...[
        const SliverSection(title: 'Сэдвээр'),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          sliver: SliverList.builder(
            itemCount: a.topics.length,
            itemBuilder: (context, i) => TopicBarRow(topic: a.topics[i]),
          ),
        ),
      ],
      if (a.trend.isNotEmpty) ...[
        const SliverSection(title: 'Шалгалтуудын явц'),
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          sliver: SliverList.separated(
            itemCount: a.trend.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
            itemBuilder: (context, i) {
              final t = a.trend[i];
              final at = parseApiInstant(t.at);
              return AppCard(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
                accent: t.current ? context.colors.brand : null,
                child: Row(
                  children: [
                    Expanded(
                      child: ItemRow(
                        title: t.title,
                        meta: [
                          if (at != null) DateMn.numeric(UbDateTime.fromInstant(at)),
                          if (t.current) 'Энэ шалгалт',
                        ],
                      ),
                    ),
                    PercentText(percent: t.percent),
                  ],
                ),
              );
            },
          ),
        ),
      ],
      const SliverPadding(padding: EdgeInsets.only(bottom: AppSpace.xxl)),
    ];
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => SliverPadding(
    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, 0),
    sliver: SliverToBoxAdapter(
      child: Row(
        children: [
          Icon(AppIcons.info, size: 16, color: context.colors.inkDim),
          const SizedBox(width: AppSpace.sm),
          Expanded(
            child: Text(text, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
          ),
        ],
      ),
    ),
  );
}
