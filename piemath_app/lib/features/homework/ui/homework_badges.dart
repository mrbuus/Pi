import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';
import '../data/homework_models.dart';
import 'homework_icons.dart';

/// Жижиг төлөвийн «pill»: дүрс + бичвэр (өнгө дангаараа утга илэрхийлэхгүй), хүрээтэй, дэвсгэргүй.
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.icon, required this.label, required this.color, this.dashed = false});

  final IconData icon;
  final String label;
  final Color color;
  final bool dashed;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: dashed ? context.colors.line : color.withValues(alpha: 0.6)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(label, style: context.text.labelSmall?.copyWith(color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Багшийн тэмдэглэгээ: Хийсэн / Дутуу / Хийгээгүй / Шалгаагүй.
/// (Түр — `lib/shared/marks/` бэлэн болмогц түүнийг ашиглана.)
class HomeworkMarkBadge extends StatelessWidget {
  const HomeworkMarkBadge({super.key, required this.mark});

  final HomeworkMark? mark;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (icon, label, color) = switch (mark) {
      HomeworkMark.done => (HomeworkIcons.markDone, 'Хийсэн', c.success),
      HomeworkMark.partial => (HomeworkIcons.markPartial, 'Дутуу', c.warning),
      HomeworkMark.notDone => (HomeworkIcons.markMissing, 'Хийгээгүй', c.error),
      null => (HomeworkIcons.unchecked, 'Шалгаагүй', c.inkDim),
    };
    return Semantics(
      label: 'Багшийн тэмдэглэгээ: $label',
      child: ExcludeSemantics(child: StatusPill(icon: icon, label: label, color: color, dashed: mark == null)),
    );
  }
}

/// Онлайн тестийн (B хувилбар) төлөв.
class HwItemStatusPill extends StatelessWidget {
  const HwItemStatusPill({super.key, required this.item});

  final HwItem item;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return switch (item.status) {
      HwItemStatus.submitted => StatusPill(
          icon: HomeworkIcons.submitted,
          label: item.score == null ? 'Илгээсэн' : 'Илгээсэн ${item.score!.correct}/${item.score!.total}',
          color: c.success,
        ),
      HwItemStatus.inProgress => StatusPill(icon: HomeworkIcons.resume, label: 'Үргэлжлүүлэх', color: c.brand),
      HwItemStatus.notStarted => StatusPill(icon: HomeworkIcons.start, label: 'Эхлээгүй', color: c.inkDim, dashed: true),
    };
  }
}

/// Онлайн даалгаврын илгээлтийн төлөв.
class AssignmentStatusPill extends StatelessWidget {
  const AssignmentStatusPill({super.key, required this.status});

  final AssignmentStatus status;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (icon, color) = switch (status) {
      AssignmentStatus.notDone => (HomeworkIcons.unchecked, c.inkDim),
      AssignmentStatus.submitted => (HomeworkIcons.photoSent, c.info),
      AssignmentStatus.doneOnline || AssignmentStatus.doneInClass => (HomeworkIcons.approved, c.success),
      AssignmentStatus.returned => (HomeworkIcons.returned, c.warning),
    };
    return StatusPill(icon: icon, label: status.label, color: color, dashed: status == AssignmentStatus.notDone);
  }
}
