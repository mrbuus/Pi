import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';
import '../domain/parent_labels.dart';
import 'parent_icons.dart';

// Ирц/даалгаврын тэмдэгийн түр харагдац. `lib/shared/marks/` (өөр agent) бэлэн болмогц түүгээр солино.

/// Дүрс + шошго (өнгө дангаараа утга илэрхийлэхгүй).
class MarkLabel extends StatelessWidget {
  const MarkLabel({super.key, required this.icon, required this.label, required this.color});

  factory MarkLabel.attendance(BuildContext context, AttendanceMark m) {
    final c = context.colors;
    final (icon, color) = switch (m) {
      AttendanceMark.present => (ParentIcons.ok, c.success),
      AttendanceMark.late => (ParentIcons.waiting, c.warning),
      AttendanceMark.absent => (ParentIcons.bad, c.error),
      AttendanceMark.excused => (ParentIcons.excused, c.info),
      AttendanceMark.unknown => (ParentIcons.unknown, c.inkDim),
    };
    return MarkLabel(icon: icon, label: m.label, color: color);
  }

  factory MarkLabel.homework(BuildContext context, HomeworkMark m) {
    final c = context.colors;
    final (icon, color) = switch (m) {
      HomeworkMark.done || HomeworkMark.doneOnline || HomeworkMark.doneInClass => (ParentIcons.ok, c.success),
      HomeworkMark.partial => (ParentIcons.partial, c.warning),
      HomeworkMark.notDone => (ParentIcons.bad, c.error),
      HomeworkMark.submitted => (ParentIcons.waiting, c.info),
      HomeworkMark.returned => (ParentIcons.returned, c.warning),
      HomeworkMark.unknown => (ParentIcons.unknown, c.inkDim),
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
