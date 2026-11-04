import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../domain/planner_logic.dart';
import 'planner_visuals.dart';

/// Бүлгийн гарчиг («Өнөөдөр 3»).
class PlannerGroupHeader extends StatelessWidget {
  const PlannerGroupHeader({super.key, required this.group, required this.count});

  final PlannerGroup group;
  final int count;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.md, bottom: AppSpace.xs),
      child: Semantics(
        header: true,
        child: Row(
          children: [
            Text(
              group.label,
              style: context.text.titleSmall?.copyWith(color: group == PlannerGroup.overdue ? c.error : c.ink),
            ),
            const SizedBox(width: AppSpace.sm),
            Text('$count', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
          ],
        ),
      ),
    );
  }
}

/// Даалгаврын карт: шудрахад «Дууссан» ([onComplete] байвал), дарахад дэлгэрэнгүй.
class TaskTile extends StatelessWidget {
  const TaskTile({
    super.key,
    required this.item,
    required this.now,
    required this.onTap,
    this.onComplete,
    this.pending = false,
  });

  final PlannerItem item;
  final UbDateTime now;
  final VoidCallback onTap;

  /// `null` бол шудрах боломжгүй (эрхгүй, аль хэдийн хаагдсан).
  final VoidCallback? onComplete;

  /// Серверт хадгалагдаж байгаа шинэ мөр.
  final bool pending;

  static const swipeLabel = 'Дууссан гэж тэмдэглэх';

  @override
  Widget build(BuildContext context) {
    final t = item.task;
    final c = context.colors;
    final overdue = isOverdue(t, now);
    final closed = t.status.isClosed;
    final meta = <Object?>[
      if (t.dueDate != null)
        Text(dueLabel(t.dueDate!, now), style: context.text.bodySmall?.copyWith(color: overdue ? c.error : null)),
      if (t.classroom != null && t.classroom!.name.isNotEmpty) t.classroom!.name,
      if (t.subject != null) subjectLabel(t.subject!),
      if (t.estimateHours != null) '${t.estimateHours} цаг',
      if (item.task.subtasks.isNotEmpty) '${item.task.subtasks.length} дэд',
    ];
    final card = AppCard(
      onTap: onTap,
      accent: overdue ? c.error : null,
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: AppSizes.minTap - AppSpace.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(padding: const EdgeInsets.only(top: 2), child: StatusGlyph(t.status)),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (item.parent != null)
                    Text(
                      item.parent!.title,
                      style: context.text.labelSmall?.copyWith(color: c.inkDim),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  Text(
                    t.title,
                    style: context.text.titleSmall?.copyWith(
                      color: closed ? c.inkDim : null,
                      decoration: closed ? TextDecoration.lineThrough : null,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (Meta.visible(meta).isNotEmpty) ...[const SizedBox(height: 2), Meta(items: meta)],
                  if (t.assignees.isNotEmpty) ...[const SizedBox(height: AppSpace.sm), AssigneeInitials(t.assignees)],
                ],
              ),
            ),
            if (pending)
              const Padding(
                padding: EdgeInsets.only(left: AppSpace.sm),
                child: SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)),
              )
            else if (priorityChip(t.priority) case final chip?)
              Padding(
                padding: const EdgeInsets.only(left: AppSpace.sm),
                child: chip,
              ),
          ],
        ),
      ),
    );
    final complete = onComplete;
    if (complete == null) return card;
    return Semantics(
      customSemanticsActions: {const CustomSemanticsAction(label: swipeLabel): complete},
      child: Dismissible(
        key: ValueKey('swipe:${t.id}'),
        direction: DismissDirection.startToEnd,
        // Мөр жагсаалтаас алга болохгүй — төлөв нь солигдоод «Дууссан» бүлэг рүү шилжинэ.
        confirmDismiss: (_) async {
          complete();
          return false;
        },
        background: const _SwipeBackground(label: swipeLabel),
        child: card,
      ),
    );
  }
}

class _SwipeBackground extends StatelessWidget {
  const _SwipeBackground({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DecoratedBox(
      decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.lg)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
        child: Row(
          children: [
            Icon(AppIcons.check, color: c.success),
            const SizedBox(width: AppSpace.sm),
            Flexible(
              child: Text(
                label,
                style: context.text.labelLarge?.copyWith(color: c.success),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
