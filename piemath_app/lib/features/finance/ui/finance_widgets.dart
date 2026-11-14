import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/payment_status/money.dart';
import '../application/finance_providers.dart';
import '../data/finance_models.dart';

/// Эрхгүй хэрэглэгчид — төвийг сахисан, айлгахгүй бичвэр.
class FinanceDenied extends StatelessWidget {
  const FinanceDenied({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) =>
      EmptyState(icon: AppIcons.shield, title: 'Энэ хэсэг танд нээгдээгүй', message: message);
}

/// Банкны хуулгын эрхийн хаалга: шалгаж байхад skeleton, эрхгүй бол [FinanceDenied], алдаа бол «Дахин оролдох».
/// Эрхгүй хэрэглэгчид [builder] огт зурагдахгүй — гүйлгээний API ч дуудагдахгүй.
class ReconcileGate extends ConsumerWidget {
  const ReconcileGate({super.key, required this.builder});

  final Widget Function(BuildContext context, ReconcileAccess access) builder;

  static const deniedMessage = 'Банкны хуулгыг Админ болон санхүүгийн эрхтэй Багш+ хариуцна';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref
        .watch(reconcileAccessProvider)
        .when(
          loading: () => const LoadingState(cards: 2),
          error: (e, _) => ErrorState(
            message: e is ApiError ? e.message : AppStrings.genericError,
            onRetry: () => ref.invalidate(reconcileAccessProvider),
          ),
          data: (access) =>
              access == ReconcileAccess.denied ? const FinanceDenied(message: deniedMessage) : builder(context, access),
        );
  }
}

/// «2026.11.04»
String dayLabel(UbDateTime? d) => d == null ? '' : DateMn.numeric(d);

/// «2026.11.04 14:20» (UB)
String momentLabel(UbDateTime? d) => d == null ? '' : DateMn.numericWithTime(d);

/// Шошго + серверийн дүн нэг мөрөнд.
class MoneyRow extends StatelessWidget {
  const MoneyRow({super.key, required this.label, required this.amount, this.strong = false});

  final String label;
  final int amount;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final style = strong ? context.text.titleSmall : context.text.bodyMedium;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: strong ? style : style?.copyWith(color: context.colors.inkDim)),
          ),
          Text(formatMnt(amount), style: style?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
        ],
      ),
    );
  }
}

/// Задаргааны хэвтээ зурвас + доор нь тайлбар (legend доор — RULES §3).
///
/// Зурвасын өргөн нь серверийн дүнгийн харьцаа — шинэ дүн тооцохгүй, зөвхөн зурна.
class BreakdownBar extends StatelessWidget {
  const BreakdownBar({super.key, required this.lines});

  final List<MoneyLine> lines;

  static List<Color> palette(BuildContext context) {
    final c = context.colors;
    return [c.brand, c.brandBright, c.info, c.success, c.brandSoft, c.error, c.inkDim];
  }

  @override
  Widget build(BuildContext context) {
    final colors = palette(context);
    final parts = [
      for (var i = 0; i < lines.length; i++)
        if (lines[i].amount > 0) (line: lines[i], color: colors[i % colors.length]),
    ];
    if (parts.isEmpty) return const SizedBox.shrink();
    return ExcludeSemantics(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            child: SizedBox(
              height: 12,
              child: Row(
                children: [
                  for (var i = 0; i < parts.length; i++) ...[
                    if (i > 0) const SizedBox(width: 2),
                    Expanded(
                      flex: parts[i].line.amount,
                      child: ColoredBox(color: parts[i].color),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpace.sm),
          Wrap(
            spacing: AppSpace.md,
            runSpacing: AppSpace.xs,
            children: [
              for (final p in parts)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DecoratedBox(
                      decoration: BoxDecoration(color: p.color, borderRadius: BorderRadius.circular(2)),
                      child: const SizedBox(width: 10, height: 10),
                    ),
                    const SizedBox(width: AppSpace.xs),
                    Text(p.line.label, style: context.text.labelSmall),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Шошго + утга (дэлгэрэнгүйн баримт).
class FactRow extends StatelessWidget {
  const FactRow({super.key, required this.label, required this.value, this.selectable = false});

  final String label;
  final String value;
  final bool selectable;

  @override
  Widget build(BuildContext context) {
    final style = context.text.bodyMedium;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: context.text.labelMedium?.copyWith(color: context.colors.inkDim)),
          const SizedBox(height: 2),
          if (selectable) SelectableText(value, style: style) else Text(value, style: style),
        ],
      ),
    );
  }
}
