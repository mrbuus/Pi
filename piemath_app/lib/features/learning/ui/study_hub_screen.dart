import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../application/mistakes_controller.dart';
import '../learning_icons.dart';

/// `/app/study` — бие даан суралцах хэсгүүдийн нүүр. Дараалал, оноо, дарамт үгүй: зөвхөн нээх товч.
class StudyHubScreen extends ConsumerWidget {
  const StudyHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final today = ref.watch(todayMistakesProvider);
    final todayText = today.when(
      data: (l) => l.isEmpty ? 'Өнөөдөр давтах алдаа алга' : 'Өнөөдөр ${l.length} бодлого давтахаар байна',
      loading: () => 'Ачаалж байна',
      error: (_, _) => 'Алдааны дэвтрээ нээж үзнэ үү',
    );
    final tiles = <_Tile>[
      _Tile('Алдааны дэвтэр', todayText, LearningIcons.mistakes, '/app/mistakes'),
      const _Tile('Давтлага', 'Сэдвээ сонгоод хугацаатай давтана', LearningIcons.review, '/app/study/review'),
      const _Tile('Давтлагын түүх', 'Өмнөх давтлагууд', AppIcons.history, '/app/study/history'),
      const _Tile('Дасгал', 'Танд тохирсон бодлогууд', LearningIcons.practice, '/app/practice'),
      const _Tile('Хичээл үзэх', 'Онол, бичлэг, сэдвийн тест', LearningIcons.lesson, '/app/learn'),
      const _Tile('Томьёоны сан', 'Хайх, дэлгэрэнгүй үзэх', LearningIcons.formula, '/app/formulas'),
      const _Tile('Онлайн хичээл', 'Сэдвээр бичлэг үзэх', AppIcons.video, '/app/videos'),
      const _Tile('Зорилго', 'Өөрийн зорилго, хугацаа', AppIcons.goal, '/app/goals'),
      const _Tile('Бэлэн байдал', 'Сэдэв бүрийн баримжаа', LearningIcons.readiness, '/app/readiness'),
      const _Tile('Идэвх', 'Өдөр бүр бодсон бодлого', LearningIcons.activity, '/app/activity'),
    ];
    return Scaffold(
      appBar: AppBar(title: const Text('Суралцах')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpace.gutter),
        children: [
          for (final t in tiles) ...[
            AppCard(
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
            ),
            const SizedBox(height: AppSpace.md),
          ],
        ],
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
