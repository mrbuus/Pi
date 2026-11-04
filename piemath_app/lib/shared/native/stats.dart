import 'package:flutter/material.dart';

import '../../core/ui/ui.dart';
import 'detail_header.dart';

/// Нэг гол тоо: шошго, утга (Unbounded — зөвхөн тоо/латин), сонголтоор тайлбар. Дарахад дэлгэрэнгүй.
///
/// [value]-д монгол үсэг бүү оруул (Unbounded-д Ү, Ө байхгүй) — «12», «85%», «1.2 сая₮».
class StatTile extends StatelessWidget {
  const StatTile({
    super.key,
    required this.label,
    required this.value,
    this.hint,
    this.icon,
    this.tone = ChipTone.neutral,
    this.onTap,
  });

  final String label;
  final String value;

  /// Утгын доорх жижиг мөр («өчигдрөөс +3», «12-оос»).
  final String? hint;
  final IconData? icon;

  /// Дүрс, тайлбарын өнгө (утга өөрөө үргэлж `ink`).
  final ChipTone tone;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final toneColor = MetaChip.toneColor(context, tone);
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpace.md),
      semanticLabel: [label, value, ?hint].join(', '),
      child: ExcludeSemantics(
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: AppSizes.minTap),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  if (icon != null) ...[Icon(icon, size: 16, color: toneColor), const SizedBox(width: 6)],
                  Expanded(
                    child: Text(label, style: context.text.labelMedium?.copyWith(color: c.inkDim), maxLines: 2),
                  ),
                  if (onTap != null) Icon(AppIcons.forward, size: 16, color: c.inkDim),
                ],
              ),
              const SizedBox(height: AppSpace.xs),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: AlignmentDirectional.centerStart,
                child: Text(
                  value,
                  maxLines: 1,
                  style: context.text.displaySmall?.copyWith(fontSize: 22, fontFamily: AppTheme.displayFont),
                ),
              ),
              if (hint != null) ...[
                const SizedBox(height: 2),
                Text(
                  hint!,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: context.text.labelSmall?.copyWith(color: tone == ChipTone.neutral ? c.inkDim : toneColor),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// 3–4 гол тоо нэг мөрөнд (NATIVE-PLAN §3.5). Нарийн дэлгэцэд (нэг нь [minTileWidth]-ээс нарийн бол)
/// 2 баганаар хуваагдана. Мөр бүрийн картууд ижил өндөртэй.
class StatRow extends StatelessWidget {
  const StatRow({super.key, required this.tiles, this.minTileWidth = 104, this.spacing = AppSpace.sm});

  final List<Widget> tiles;
  final double minTileWidth;
  final double spacing;

  @override
  Widget build(BuildContext context) {
    if (tiles.isEmpty) return const SizedBox.shrink();
    return LayoutBuilder(
      builder: (context, constraints) {
        final n = tiles.length;
        final fits = (constraints.maxWidth - spacing * (n - 1)) / n >= minTileWidth;
        final perRow = fits ? n : 2;
        final rows = <Widget>[];
        for (var i = 0; i < n; i += perRow) {
          final chunk = tiles.sublist(i, (i + perRow).clamp(0, n));
          rows.add(
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (var j = 0; j < perRow; j++) ...[
                    if (j > 0) SizedBox(width: spacing),
                    Expanded(child: j < chunk.length ? chunk[j] : const SizedBox.shrink()),
                  ],
                ],
              ),
            ),
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < rows.length; i++) ...[if (i > 0) SizedBox(height: spacing), rows[i]],
          ],
        );
      },
    );
  }
}
