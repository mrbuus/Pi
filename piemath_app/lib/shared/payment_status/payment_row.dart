import 'package:flutter/material.dart';

import '../../core/ui/ui.dart';
import 'money.dart';
import 'payment_labels.dart';

/// Нэг төлбөрийн мөр: төлөвийн дүрс + дүн + мета (төлөв, сар, арга) + огноо.
/// Өнгөт дэвсгэргүй — өнгө зөвхөн дүрсэнд, шошго үргэлж хамт (RULES §3).
class PaymentRow extends StatelessWidget {
  const PaymentRow({
    super.key,
    required this.status,
    required this.amount,
    required this.dateLabel,
    this.meta = const [],
    this.note,
  });

  final PaymentStatus status;
  final num amount;
  final String dateLabel;

  /// Төлөвийн шошгоны дараах мета (сар, арга).
  final List<String?> meta;
  final String? note;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      container: true,
      label: '${formatMnt(amount)}, ${status.label}, $dateLabel',
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: c.surfaceSunken,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Icon(status.icon, size: 20, color: status.tone(c)),
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(formatMnt(amount), style: context.text.titleMedium),
                    Meta(items: [status.label, ...meta]),
                    if (note != null && note!.trim().isNotEmpty) Text(note!, style: context.text.bodySmall),
                  ],
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              Text(dateLabel, style: context.text.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}
