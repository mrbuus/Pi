import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';
import '../data/class_dashboard_models.dart';
import '../data/staff_models.dart';
import 'teacher_icons.dart';

/// Нарийн хүрээтэй шошго: өнгө зөвхөн дүрс, текстэнд (өнгөт дэвсгэр хориотой).
class Pill extends StatelessWidget {
  const Pill({super.key, required this.icon, required this.label, this.color});

  final IconData icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: label,
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: 2),
        decoration: BoxDecoration(
          border: Border.all(color: c.line),
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color ?? c.inkDim),
            const SizedBox(width: AppSpace.xs),
            Flexible(child: Text(label, style: context.text.labelSmall, overflow: TextOverflow.ellipsis)),
          ],
        ),
      ),
    );
  }
}

/// «72%» эсвэл «нэмэгдээгүй» (мэдээлэл алга).
String pct(int? v) => v == null ? '-' : '$v%';

/// Нэг үзүүлэлт: жижиг нэр, том утга.
class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.label, required this.value, this.icon, this.color});

  final String label;
  final String value;
  final IconData? icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: '$label $value',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
          const SizedBox(height: AppSpace.xs),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[Icon(icon, size: 18, color: color ?? c.ink), const SizedBox(width: AppSpace.xs)],
              Text(value, style: context.text.titleLarge),
            ],
          ),
        ],
      ),
    );
  }
}

/// Төлбөрийн төлөвийн дүрс (мөнгөгүй).
Pill payPill(BuildContext context, PayState s) {
  final c = context.colors;
  return switch (s) {
    PayState.paid => Pill(icon: TeacherIcons.circleCheck, label: s.label, color: c.success),
    PayState.partial => Pill(icon: AppIcons.warning, label: s.label, color: c.error),
    PayState.pending => Pill(icon: TeacherIcons.circleDot, label: s.label, color: c.info),
    PayState.none => Pill(icon: TeacherIcons.circleDashed, label: s.label),
  };
}

/// Нөхөх хичээлийн төлөвийн шошго.
Pill makeupPill(BuildContext context, MakeupStatus s, {bool compact = false}) {
  final c = context.colors;
  final (icon, color) = switch (s) {
    MakeupStatus.pending => (TeacherIcons.circleDashed, c.warning),
    MakeupStatus.partial => (TeacherIcons.circleDot, c.info),
    MakeupStatus.done => (TeacherIcons.circleCheck, c.success),
    MakeupStatus.waived => (TeacherIcons.circleMinus, c.inkDim),
  };
  return Pill(icon: icon, label: compact ? s.label : 'Нөхөх хичээл: ${s.label}', color: color);
}

/// Нэг мөрт алдааны тайлбар (карт дотор) + дахин оролдох.
class InlineError extends StatelessWidget {
  const InlineError({super.key, required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Icon(AppIcons.error, size: 18, color: context.colors.error),
      const SizedBox(width: AppSpace.sm),
      Expanded(child: Text(message, style: context.text.bodyMedium)),
      TextButton(
        style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
        onPressed: onRetry,
        child: const Text(AppStrings.retry),
      ),
    ],
  );
}
