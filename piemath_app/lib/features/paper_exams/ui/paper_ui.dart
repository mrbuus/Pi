import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/paper_exam_models.dart';
import '../domain/paper_exam_logic.dart';

String paperError(Object e, [String fallback = 'Ачаалж чадсангүй. Дахин оролдоно уу']) =>
    e is ApiError && e.kind != ApiErrorKind.unknown && e.message.trim().isNotEmpty ? e.message : fallback;

void paperSnack(BuildContext context, String m) => ScaffoldMessenger.maybeOf(context)
  ?..hideCurrentSnackBar()
  ..showSnackBar(SnackBar(content: Text(m)));

/// Хувийн түвшний өнгө: бичвэр + жижиг хавтангийн дэвсгэр (зөвхөн токеноос).
({Color fg, Color bg}) toneColors(BuildContext context, PctTone tone) {
  final c = context.colors;
  return switch (tone) {
    PctTone.success => (fg: c.success, bg: c.successTint),
    PctTone.warning => (fg: c.warning, bg: c.warningTint),
    PctTone.danger => (fg: c.error, bg: c.errorTint),
    PctTone.neutral => (fg: c.inkDim, bg: c.surfaceSunken),
  };
}

/// Бодлогын төлөвийн өнгө (вэбийн `STATUS_CELL`).
({Color fg, Color bg}) statusColors(BuildContext context, ItemStatus s) {
  final c = context.colors;
  return switch (s) {
    ItemStatus.correct => (fg: c.success, bg: c.successTint),
    ItemStatus.wrong => (fg: c.error, bg: c.errorTint),
    ItemStatus.blank => (fg: c.inkDim, bg: c.errorTint.withValues(alpha: 0.5)),
    ItemStatus.multi => (fg: c.warning, bg: c.warningTint),
    ItemStatus.ungraded => (fg: c.inkDim, bg: c.surfaceSunken),
  };
}

/// «72%» жижиг шошго.
class PctBadge extends StatelessWidget {
  const PctBadge({super.key, required this.pct, this.prefix});

  final int? pct;
  final String? prefix;

  @override
  Widget build(BuildContext context) {
    if (pct == null) return const SizedBox.shrink();
    final t = toneColors(context, toneOf(pct));
    return DecoratedBox(
      decoration: BoxDecoration(color: t.bg, borderRadius: BorderRadius.circular(AppRadius.pill)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        child: Text(
          '${prefix == null ? '' : '$prefix '}$pct%',
          style: context.text.labelMedium?.copyWith(color: t.fg, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}

/// «Агуулгын төрлөөр, гүйцэтгэл %»: мөр бүр нэр, зурвас, хувь (+ төвийн хувь).
class AreaBars extends StatelessWidget {
  const AreaBars({super.key, required this.areas, this.compare, this.compareLabel});

  final List<AreaScore> areas;
  final Map<String, int?>? compare;
  final String? compareLabel;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (areas.isEmpty) {
      return Text('Бодлогуудад агуулга оноогоогүй байна', style: context.text.bodyMedium?.copyWith(color: c.inkDim));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < areas.length; i++) ...[
          if (i > 0) const SizedBox(height: AppSpace.md),
          Row(
            children: [
              Expanded(
                child: Text(areas[i].area, style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
              ),
              Text(areas[i].pct == null ? '' : '${areas[i].pct}%', style: context.text.titleSmall),
              if (compare?[areas[i].area] != null) ...[
                const SizedBox(width: AppSpace.sm),
                Text(
                  '${compareLabel ?? ''} ${compare![areas[i].area]}%'.trim(),
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                ),
              ],
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.pill),
            child: LinearProgressIndicator(
              value: (areas[i].pct ?? 0) / 100,
              minHeight: 8,
              color: toneColors(context, toneOf(areas[i].pct)).fg,
              backgroundColor: c.surfaceSunken,
              semanticsLabel: '${areas[i].area} ${areas[i].pct ?? 0}%',
            ),
          ),
        ],
      ],
    );
  }
}

/// Нэг томьёо: нэр + LaTeX. [link] бол Томьёоны сангийн дэлгэрэнгүй рүү (`/app/formulas/:slug`).
class FormulaLine extends StatelessWidget {
  const FormulaLine({super.key, required this.formula, this.link = false, this.compact = false});

  final FormulaRef formula;
  final bool link;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = compact ? context.text.bodySmall : context.text.bodyMedium;
    final body = Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(formula.title, style: style?.copyWith(fontWeight: FontWeight.w600)),
          if (formula.latex != null && formula.latex!.trim().isNotEmpty)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: MathText('\$${formula.latex}\$', style: style),
            ),
        ],
      ),
    );
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.md),
      side: BorderSide(color: c.line),
    );
    return Material(
      color: c.surfaceSunken,
      shape: shape,
      clipBehavior: Clip.antiAlias,
      child: link
          ? InkWell(
              onTap: () => context.push('/app/formulas/${Uri.encodeComponent(formula.slug)}'),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                child: body,
              ),
            )
          : body,
    );
  }
}

/// Бодлогын жижиг нүд: дугаар, үсэг, доор нь төлөв эсвэл «зөв: B».
class ItemCell extends StatelessWidget {
  const ItemCell({super.key, required this.number, required this.status, this.letter, this.answerKey});

  final int number;
  final ItemStatus status;
  final String? letter;
  final String? answerKey;

  @override
  Widget build(BuildContext context) {
    final t = statusColors(context, status);
    final small = context.text.labelSmall?.copyWith(color: t.fg);
    final shown = letter ?? (status == ItemStatus.multi ? '*' : '');
    return Semantics(
      label: '$number-р бодлого, ${status.label}${letter != null ? ', $letter' : ''}',
      excludeSemantics: true,
      child: DecoratedBox(
        decoration: BoxDecoration(color: t.bg, borderRadius: BorderRadius.circular(AppRadius.sm)),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Text('$number', style: small?.copyWith(fontWeight: FontWeight.w800)),
                  const Spacer(),
                  Text(shown, style: small?.copyWith(fontWeight: FontWeight.w800)),
                ],
              ),
              Text(
                status == ItemStatus.wrong && answerKey != null && letter != null ? 'зөв: $answerKey' : status.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: small?.copyWith(fontSize: 10),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Нүднүүдийн тор (утсанд 4–6 багана).
class ItemGrid extends StatelessWidget {
  const ItemGrid({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, box) {
        final cols = (box.maxWidth / 68).floor().clamp(3, 12);
        const gap = 6.0;
        final w = (box.maxWidth - gap * (cols - 1)) / cols;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [for (final ch in children) SizedBox(width: w, child: ch)],
        );
      },
    );
  }
}

/// Тайлбар (хүснэгтийн доор): 1 зөв, B буруу, хоосон, * давхар.
class StatusLegend extends StatelessWidget {
  const StatusLegend({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      (ItemStatus.correct, '1', 'зөв'),
      (ItemStatus.wrong, 'B', 'буруу (сонгосон хариу)'),
      (ItemStatus.blank, '', 'хариулаагүй'),
      (ItemStatus.multi, '*', 'давхар будсан'),
    ];
    final dim = context.text.bodySmall?.copyWith(color: context.colors.inkDim);
    return Wrap(
      spacing: AppSpace.lg,
      runSpacing: AppSpace.xs,
      children: [
        for (final (st, text, label) in items)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 20,
                height: 20,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: statusColors(context, st).bg, borderRadius: BorderRadius.circular(4)),
                child: Text(
                  text,
                  style: context.text.labelSmall?.copyWith(
                    color: statusColors(context, st).fg,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text(label, style: dim),
            ],
          ),
      ],
    );
  }
}

/// «12/48» маягийн оноо: том тоо + жижиг хуваарь.
class ScoreText extends StatelessWidget {
  const ScoreText({super.key, required this.score, required this.max, this.large = false});

  final num score;
  final num max;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final big = large ? context.text.headlineSmall : context.text.titleMedium;
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: scoreText(score),
            style: big?.copyWith(fontWeight: FontWeight.w800),
          ),
          TextSpan(
            text: '/${scoreText(max)}',
            style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
          ),
        ],
      ),
    );
  }
}
