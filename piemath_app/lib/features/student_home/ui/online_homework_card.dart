import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../homework/data/homework_models.dart';
import '../../homework/ui/homework_badges.dart';
import '../../homework/ui/homework_providers.dart';

/// Онлайн ангийн сурагчийн самбар дээрх даалгавар (вэбийн `HomeworkList hideWhenEmpty`): хийх ёстой
/// (илгээгээгүй, буцаасан) нь эхэнд, хамгийн ихдээ 3. Даалгаваргүй бол харагдахгүй.
class OnlineHomeworkCard extends ConsumerWidget {
  const OnlineHomeworkCard({super.key});

  static const maxShown = 3;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final list = ref.watch(assignmentsProvider);
    final all = list.value;
    if (all == null) {
      return list.isLoading
          ? const Padding(padding: EdgeInsets.only(top: AppSpace.md), child: SkeletonCard())
          : const SizedBox.shrink();
    }
    if (all.isEmpty) return const SizedBox.shrink();
    int rank(Assignment a) => switch (a.status) {
      AssignmentStatus.returned => 0,
      AssignmentStatus.notDone => 1,
      AssignmentStatus.submitted => 2,
      _ => 3,
    };
    final sorted = [...all]..sort((a, b) => rank(a).compareTo(rank(b)));
    final shown = sorted.take(maxShown).toList();
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.md),
      child: AppCard(
        onTap: () => context.go('/app/homework'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CardHeader(
              icon: AppIcons.homework,
              hue: AppHue.violet,
              title: 'Онлайн даалгавар',
              trailing: Icon(AppIcons.forward, size: 18, color: context.colors.inkDim),
            ),
            for (final a in shown) ...[
              const Divider(height: AppSpace.lg),
              Text(a.title, style: context.text.bodyMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 2),
              Wrap(
                spacing: AppSpace.sm,
                runSpacing: AppSpace.xs,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  AssignmentStatusPill(status: a.status),
                  if (a.dueDate != null)
                    Text('${DateMn.long(UbDateTime.fromInstant(a.dueDate!))} хүртэл', style: context.text.bodySmall),
                ],
              ),
            ],
            if (all.length > maxShown) ...[
              const SizedBox(height: AppSpace.sm),
              Text('Бүгд ${all.length} даалгавар', style: context.text.labelMedium?.copyWith(color: context.colors.brand)),
            ],
          ],
        ),
      ),
    );
  }
}
