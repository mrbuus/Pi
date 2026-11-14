import 'package:flutter/material.dart';

import '../../../../core/ui/ui.dart';
import '../../../my_class/ui/common.dart';
import '../../domain/staff_schedule_logic.dart';

/// Хуваарийн жагсаалтын нийтлэг хэсгүүд («Өдөр»-ийн жагсаалт ба «7 хоног»): нэг цагт эхлэх хичээлүүд
/// нэг картад, мөр бүр зүүн талдаа танхимын тэмдэгтэй. Хоёр харагдац ижил харагдана.

/// Цагийн бүлгийн гарчиг: «15:00» + «7 анги».
class TimeGroupHeader extends StatelessWidget {
  const TimeGroupHeader({super.key, required this.title, this.count});

  final String title;

  /// Бүлэг дэх ангийн тоо (өгвөл «N анги»).
  final int? count;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.lg, AppSpace.gutter, AppSpace.sm),
    child: Semantics(
      header: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text(title, style: context.text.titleMedium?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
          if (count != null) ...[
            const SizedBox(width: AppSpace.sm),
            Text('$count анги', style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
          ],
        ],
      ),
    ),
  );
}

/// Нэг бүлгийн мөрүүд — нэг карт, мөр хооронд нарийн зураас.
class LessonGroupCard extends StatelessWidget {
  const LessonGroupCard({super.key, required this.children, this.showRoom = true});

  final List<Widget> children;

  /// Мөрүүд танхимын тэмдэгтэй эсэх ([LessonRow.showRoom]-тэй ижил) — зураасны эхлэл.
  final bool showRoom;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
    child: AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, child) in children.indexed) ...[
            // Зураас танхимын тэмдгийн ард эхэлнэ (тэмдгүүд нэг багана болж харагдана)
            if (i > 0)
              Divider(
                height: 1,
                indent: showRoom ? AppSpace.lg + 40 + AppSpace.md : AppSpace.lg,
                color: context.colors.line,
              ),
            child,
          ],
        ],
      ),
    ),
  );
}

/// Хичээлийн нэг мөр: танхим | анги + багш, тэмдэглэл | баруун талын тоо/төлөв | «>».
class LessonRow extends StatelessWidget {
  const LessonRow({
    super.key,
    required this.room,
    required this.title,
    this.meta = const [],
    this.trailing,
    this.selected = false,
    this.onTap,
    this.showRoom = true,
  });

  final String? room;
  final String title;

  /// Танхимын тэмдэг. «Өдөр»-ийн хуваарьт танхим ХАРАГДАХГҮЙ (эзэн 2026-11-08), «7 хоног»-т харагдана.
  final bool showRoom;

  /// [Meta]-ийн зүйлс, хоосныг алгасна.
  final List<Object?> meta;
  final Widget? trailing;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Material(
      color: selected ? c.brandTint : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 60),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.sm, AppSpace.md, AppSpace.sm),
            child: Row(
              children: [
                if (showRoom) ...[RoomBadge(room: room), const SizedBox(width: AppSpace.md)],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(title, style: context.text.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                      if (Meta.visible(meta).isNotEmpty) ...[const SizedBox(height: 2), Meta(items: meta)],
                    ],
                  ),
                ),
                if (trailing != null) ...[const SizedBox(width: AppSpace.sm), trailing!],
                if (onTap != null) ...[
                  const SizedBox(width: AppSpace.xs),
                  Icon(AppIcons.forward, size: 18, color: c.inkDim),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Суудлын дүүргэлт: «28/32». Багтаамж хэтэрвэл анхааруулгын өнгө + дүрс.
class SeatCount extends StatelessWidget {
  const SeatCount({super.key, required this.students, required this.room});

  final int? students;
  final String? room;

  @override
  Widget build(BuildContext context) {
    final n = students;
    if (n == null) return const SizedBox.shrink();
    final c = context.colors;
    final cap = roomCapacityOf(room);
    final over = cap != null && n > cap;
    final text = Text(
      cap != null ? '$n/$cap' : '$n',
      style: context.text.labelMedium?.copyWith(
        color: over ? c.warning : c.inkDim,
        fontFeatures: const [FontFeature.tabularFigures()],
      ),
    );
    return Semantics(
      label: cap != null ? '$n сурагч, $cap суудал${over ? ', суудал дутсан' : ''}' : '$n сурагч',
      excludeSemantics: true,
      child: over
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(AppIcons.warning, size: 16, color: c.warning),
                const SizedBox(width: AppSpace.xs),
                text,
              ],
            )
          : text,
    );
  }
}
