import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';
import '../domain/parent_labels.dart';

// Ирц/даалгаврын тэмдэгийн түр харагдац. `lib/shared/marks/` (өөр agent) бэлэн болмогц түүгээр солино.

/// Дүрс + шошго (өнгө дангаараа утга илэрхийлэхгүй).
class MarkLabel extends StatelessWidget {
  const MarkLabel({super.key, required this.icon, required this.label, required this.color});

  factory MarkLabel.attendance(BuildContext context, AttendanceMark m) {
    final c = context.colors;
    final (icon, color) = switch (m) {
      AttendanceMark.present => (AppIcons.success, c.success),
      AttendanceMark.late => (AppIcons.time, c.warning),
      AttendanceMark.absent => (AppIcons.failure, c.error),
      AttendanceMark.excused => (AppIcons.circleMinus, c.info),
      AttendanceMark.unknown => (AppIcons.circleDot, c.inkDim),
    };
    return MarkLabel(icon: icon, label: m.label, color: color);
  }

  factory MarkLabel.homework(BuildContext context, HomeworkMark m) {
    final c = context.colors;
    final (icon, color) = switch (m) {
      HomeworkMark.done || HomeworkMark.doneOnline || HomeworkMark.doneInClass => (AppIcons.success, c.success),
      HomeworkMark.partial => (AppIcons.circleDashed, c.warning),
      HomeworkMark.notDone => (AppIcons.failure, c.error),
      HomeworkMark.submitted => (AppIcons.time, c.info),
      HomeworkMark.returned => (AppIcons.undo, c.warning),
      HomeworkMark.unknown => (AppIcons.circleDot, c.inkDim),
    };
    return MarkLabel(icon: icon, label: m.label, color: color);
  }

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: AppSpace.xs),
        Flexible(child: Text(label, style: context.text.labelMedium)),
      ],
    );
  }
}
