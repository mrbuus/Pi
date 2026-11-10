import 'package:flutter/material.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/enrollment_models.dart';

/// ISO огноо → «2026 оны 10-р сарын 8» (UB). Буруу бол хоосон.
String enrollmentDate(String? iso) {
  final at = parseApiInstant(iso);
  return at == null ? '' : DateMn.long(UbDateTime.fromInstant(at), withYear: true);
}

/// 8 оронтой утас «9911 2233».
String spacedPhone(String? p) => p == null || p.length != 8 ? (p ?? '') : '${p.substring(0, 4)} ${p.substring(4)}';

ChipTone statusTone(EnrollmentStatus s) => switch (s) {
  EnrollmentStatus.open => ChipTone.success,
  EnrollmentStatus.comingSoon => ChipTone.warning,
  EnrollmentStatus.closed => ChipTone.error,
};

IconData statusIcon(EnrollmentStatus s) => switch (s) {
  EnrollmentStatus.open => AppIcons.check,
  EnrollmentStatus.comingSoon => AppIcons.hourglass,
  EnrollmentStatus.closed => AppIcons.close,
};

/// Төлвийн чип — өнгө ганцаараа мэдээлэл дамжуулахгүй, дүрс + бичвэр хамт (вэбтэй ижил).
class EnrollmentStatusChip extends StatelessWidget {
  const EnrollmentStatusChip(this.status, {super.key});

  final EnrollmentStatus status;

  @override
  Widget build(BuildContext context) =>
      MetaChip(label: status.label, icon: statusIcon(status), tone: statusTone(status));
}

/// Жижиг саарал гарчиг (талбарын шошго).
class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpace.xs),
    child: Text(text, style: context.text.labelMedium?.copyWith(color: context.colors.inkDim)),
  );
}

/// Сонголтын чип — 48dp-ийн товшилтын талбайтай.
class PickChip extends StatelessWidget {
  const PickChip({super.key, required this.label, required this.selected, required this.onSelected});

  final String label;
  final bool selected;
  final VoidCallback? onSelected;

  @override
  Widget build(BuildContext context) => ChoiceChip(
    label: Text(label),
    selected: selected,
    showCheckmark: false,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    onSelected: onSelected == null ? null : (_) => onSelected!(),
  );
}

/// Алдааны мөр (дүрс + бичвэр), дэлгэц уншигчид шууд мэдэгдэнэ.
class InlineError extends StatelessWidget {
  const InlineError(this.message, {super.key, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      liveRegion: true,
      child: Row(
        children: [
          Icon(AppIcons.error, size: 18, color: c.error),
          const SizedBox(width: AppSpace.sm),
          Expanded(
            child: Text(message, style: context.text.bodySmall?.copyWith(color: c.error)),
          ),
          if (onRetry != null)
            TextButton(
              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: onRetry,
              child: const Text(AppStrings.retry),
            ),
        ],
      ),
    );
  }
}

/// Таб доторх гүйлгэдэг хуудас: доош татаж шинэчлэх + slivers + хажуугийн зай.
class TabScroll extends StatelessWidget {
  const TabScroll({super.key, required this.onRefresh, required this.slivers});

  final Future<void> Function() onRefresh;
  final List<Widget> slivers;

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: onRefresh,
    child: CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        for (final s in slivers)
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            sliver: s,
          ),
        const SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl)),
      ],
    ),
  );
}

/// Төлөвийн хуудас (ачаалах, алдаа, хоосон) sliver дотор.
class SliverState extends StatelessWidget {
  const SliverState({super.key, required this.child, this.height = 280});

  final Widget child;
  final double height;

  @override
  Widget build(BuildContext context) => SliverToBoxAdapter(
    child: SizedBox(height: height, child: child),
  );
}
