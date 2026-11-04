import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/results_models.dart';
import '../domain/results_logic.dart';

ChipTone toneOfBand(ScoreBand b) => switch (b) {
  ScoreBand.good => ChipTone.success,
  ScoreBand.mid => ChipTone.warning,
  ScoreBand.low => ChipTone.error,
  ScoreBand.none => ChipTone.neutral,
};

ChipTone toneOfCorrect(CorrectTone t) => switch (t) {
  CorrectTone.good => ChipTone.success,
  CorrectTone.mid => ChipTone.warning,
  CorrectTone.low => ChipTone.error,
  CorrectTone.none => ChipTone.neutral,
};

/// «Бүгд» + ангиуд — хэвтээ гүйдэг чипүүд (48dp өндөр).
class ClassChips extends StatelessWidget {
  const ClassChips({
    super.key,
    required this.options,
    required this.selected,
    required this.onSelected,
    this.allLabel = 'Бүх анги',
    this.allowAll = true,
    this.gutter = AppSpace.gutter,
  });

  final List<ClassOption> options;
  final String? selected;
  final ValueChanged<String?> onSelected;
  final String allLabel;
  final bool allowAll;

  /// Хажуугийн зай (аль хэдийн догол мөртэй толгойд 0).
  final double gutter;

  @override
  Widget build(BuildContext context) {
    final items = <(String?, String)>[if (allowAll) (null, allLabel), for (final c in options) (c.id, c.name)];
    if (items.length <= 1 && allowAll) return const SizedBox.shrink();
    return SizedBox(
      height: 56,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.symmetric(horizontal: gutter, vertical: AppSpace.xs),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(width: AppSpace.sm),
        itemBuilder: (context, i) {
          final (id, label) = items[i];
          return ChoiceChip(
            key: ValueKey('class:${id ?? '*'}'),
            label: Text(label),
            selected: selected == id,
            materialTapTargetSize: MaterialTapTargetSize.padded,
            onSelected: (_) => onSelected(id),
          );
        },
      ),
    );
  }
}

/// Хувийн зурвас: өнгө зөвхөн зурвасанд, тоо үргэлж бичвэрээр.
class PercentBar extends StatelessWidget {
  const PercentBar({super.key, required this.percent, required this.tone, this.height = 8});

  final int? percent;
  final ChipTone tone;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = ((percent ?? 0).clamp(0, 100)) / 100;
    return ClipRRect(
      borderRadius: BorderRadius.circular(height),
      child: SizedBox(
        height: height,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(color: c.line),
            if (percent != null)
              FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: p,
                child: ColoredBox(color: MetaChip.toneColor(context, tone)),
              ),
          ],
        ),
      ),
    );
  }
}

/// «45%» эсвэл «—», өнгөтэй.
class PercentText extends StatelessWidget {
  const PercentText({super.key, required this.percent, this.style});

  final int? percent;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final base = style ?? context.text.titleSmall;
    if (percent == null) return Text('—', style: base?.copyWith(color: context.colors.inkDim));
    return Text('$percent%', style: base?.copyWith(color: MetaChip.toneColor(context, toneOfBand(bandOf(percent)))));
  }
}

/// Хэсгийн гарчиг (sliver дотор).
class SliverSection extends StatelessWidget {
  const SliverSection({super.key, required this.title, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => SliverPadding(
    padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
    sliver: SliverToBoxAdapter(
      child: SectionHeader(title: title, trailing: trailing),
    ),
  );
}

/// Сэдвийн эзэмшлийн мөр: нэр, зурвас, хувь.
class TopicBarRow extends StatelessWidget {
  const TopicBarRow({super.key, required this.topic});

  final TopicMastery topic;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '${topic.name} ${topic.percent}%',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
        child: Row(
          children: [
            Expanded(flex: 5, child: Text(topic.name, style: context.text.bodyMedium, maxLines: 2)),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              flex: 4,
              child: PercentBar(percent: topic.percent, tone: toneOfCorrect(correctTone(topic.percent))),
            ),
            SizedBox(
              width: 48,
              child: Text('${topic.percent}%', textAlign: TextAlign.right, style: context.text.labelLarge),
            ),
          ],
        ),
      ),
    );
  }
}
