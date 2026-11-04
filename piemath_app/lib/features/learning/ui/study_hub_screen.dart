import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../../homework/ui/homework_providers.dart';
import '../../student_home/ui/activity_week_card.dart';
import '../application/mistakes_controller.dart';
import '../application/study_hub_providers.dart';
import '../data/activity_repository.dart';
import '../data/formula_review_repository.dart';
import '../data/problem_review_repository.dart';
import '../data/readiness_repository.dart';
import 'study_hub_parts.dart';

/// `/app/study` — «Бие даан суралцах» төв (`docs/RESEARCH-2026-11.md` §2), дээрээс доош:
/// өнөөдрийн төлөвлөгөө → тань дээр ажиллах (4 түвшин) → давтах → ангитай холбоо → 7 хоногийн идэвх,
/// зорилго → бүх хэсгийн хавтан. Төлөвлөгөөг байгаа endpoint-уудаас апп дээр эрэмбэлнэ; оноо, эрэмбэ,
/// дарамт үгүй.
class StudyHubScreen extends ConsumerWidget {
  const StudyHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = ref.watch(studyNowProvider);
    final today = ref.watch(todayMistakesProvider);
    final todayText = today.when(
      data: (l) => l.isEmpty ? 'Өнөөдөр давтах алдаа алга' : 'Өнөөдөр ${l.length} бодлого давтахаар байна',
      loading: () => 'Ачаалж байна',
      error: (_, _) => 'Алдааны дэвтрээ нээж үзнэ үү',
    );
    final formulaCount = ref.watch(formulaReviewCountProvider);
    final formulaText = formulaCount.maybeWhen(
      data: (n) => n == 0 ? 'Өнөөдрийн давталт дууссан' : 'Өнөөдөр $n томьёо давтах боломжтой',
      orElse: () => 'Томьёогоо санаж давтана',
    );
    final tiles = <_Tile>[
      _Tile('Алдааны дэвтэр', todayText, AppIcons.homework, '/app/mistakes'),
      const _Tile('Давтлага', 'Сэдвээ сонгоод хугацаатай давтана', AppIcons.repeat, '/app/study/review'),
      const _Tile('Давтлагын түүх', 'Өмнөх давтлагууд', AppIcons.history, '/app/study/history'),
      const _Tile('Дасгал', 'Танд тохирсон бодлогууд', AppIcons.practice, '/app/practice'),
      const _Tile('Хичээл үзэх', 'Онол, бичлэг, сэдвийн тест', AppIcons.theory, '/app/learn'),
      _Tile('Томьёо цээжлэх', formulaText, AppIcons.formula, '/app/formulas/review'),
      const _Tile('Томьёоны сан', 'Хайх, дэлгэрэнгүй үзэх', AppIcons.formula, '/app/formulas'),
      const _Tile('Онлайн хичээл', 'Сэдвээр бичлэг үзэх', AppIcons.video, '/app/videos'),
      const _Tile('Зорилго', 'Өөрийн зорилго, хугацаа', AppIcons.goal, '/app/goals'),
      const _Tile('Бэлэн байдал', 'Сэдэв бүрийн баримжаа', AppIcons.gauge, '/app/readiness'),
      const _Tile('Идэвх', 'Өдөр бүр бодсон бодлого', AppIcons.calendarCheck, '/app/activity'),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Суралцах')),
      body: RefreshIndicator(
        onRefresh: () async {
          for (final p in [
            todayMistakesProvider,
            formulaReviewCountProvider,
            readinessProvider,
            homeworkDaysProvider,
            assignmentsProvider,
            myExamsProvider,
            activityStreakProvider,
            dueProblemsProvider,
          ]) {
            ref.invalidate(p);
          }
          ref.invalidate(activityYearProvider(now.year));
          try {
            await ref.read(todayMistakesProvider.future);
          } catch (_) {}
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.gutter, AppSpace.gutter, 0),
              sliver: SliverList.list(
                children: [
                  const TodayPlanCard(),
                  const SectionHeader(title: 'Сэдвүүд'),
                  const WeakTopicsCard(),
                  const SizedBox(height: AppSpace.md),
                  const ReviewCounterCard(),
                  const SizedBox(height: AppSpace.md),
                  const ClassLinkCard(),
                  const SectionHeader(title: 'Энэ 7 хоног'),
                  ActivityWeekCard(today: now),
                  const SizedBox(height: AppSpace.md),
                  const WeeklyGoalCard(),
                  const SectionHeader(title: 'Бүх хэсэг'),
                ],
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
              sliver: SliverList.builder(
                itemCount: tiles.length,
                itemBuilder: (context, i) => Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.md),
                  child: _HubTile(tile: tiles[i]),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Tile {
  const _Tile(this.title, this.subtitle, this.icon, this.path);

  final String title;
  final String subtitle;
  final IconData icon;
  final String path;
}

class _HubTile extends StatelessWidget {
  const _HubTile({required this.tile});

  final _Tile tile;

  @override
  Widget build(BuildContext context) {
    final t = tile;
    return AppCard(
      onTap: () => context.push(t.path),
      child: Row(
        children: [
          Icon(t.icon, color: context.colors.brand),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(t.title, style: context.text.titleSmall),
                Text(t.subtitle, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
              ],
            ),
          ),
          Icon(AppIcons.forward, color: context.colors.inkDim),
        ],
      ),
    );
  }
}
