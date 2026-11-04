import 'package:flutter/material.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/planner_models.dart';
import '../domain/planner_logic.dart';

/// Төлөв бүрийн дүрс, өнгө — ХЭЗЭЭ Ч зөвхөн өнгөөр ялгахгүй, дүрс + нэр хамт (вэбийн `STATUS_META`).
IconData statusIcon(TaskStatus s) => switch (s) {
  TaskStatus.planned => AppIcons.pencilLine,
  TaskStatus.inProgress => AppIcons.play,
  TaskStatus.blocked => AppIcons.ban,
  TaskStatus.done => AppIcons.check,
  TaskStatus.cancelled => AppIcons.close,
};

ChipTone statusTone(TaskStatus s) => switch (s) {
  TaskStatus.planned => ChipTone.info,
  TaskStatus.inProgress => ChipTone.brand,
  TaskStatus.blocked => ChipTone.error,
  TaskStatus.done => ChipTone.success,
  TaskStatus.cancelled => ChipTone.neutral,
};

/// Чухал зэргийн чип — зөвхөн Өндөр, Яаралтайд (Энгийн, Бага бол чимээгүй).
Widget? priorityChip(TaskPriority p) => switch (p) {
  TaskPriority.urgent => MetaChip(label: priorityLabel(p), icon: AppIcons.flame, tone: ChipTone.error),
  TaskPriority.high => MetaChip(label: priorityLabel(p), icon: AppIcons.flag, tone: ChipTone.warning),
  _ => null,
};

/// «11-р сарын 4» / «11-р сарын 4, 14:00» (өөр онд бол оноор).
String formatTaskDate(DateTime instant, UbDateTime now) {
  final ub = UbDateTime.fromInstant(instant);
  final day = DateMn.long(ub, withYear: ub.year != now.year);
  return hasTime(instant) ? '$day, ${DateMn.time(ub)}' : day;
}

/// Картын хугацааны бичвэр: «Өнөөдөр 14:00», «Маргааш», «11-р сарын 8».
String dueLabel(DateTime due, UbDateTime now) {
  final ub = UbDateTime.fromInstant(due);
  final diff = ub.dayIndex - now.dayIndex;
  final time = hasTime(due) ? ' ${DateMn.time(ub)}' : '';
  if (diff == 0) return 'Өнөөдөр$time';
  if (diff == 1) return 'Маргааш$time';
  if (diff == -1) return 'Өчигдөр$time';
  return formatTaskDate(due, now);
}

/// Төлөвийн дугуй дүрс (48dp хүрэх талбайгүй — зөвхөн харагдах).
class StatusGlyph extends StatelessWidget {
  const StatusGlyph(this.status, {super.key, this.size = 20});

  final TaskStatus status;
  final double size;

  @override
  Widget build(BuildContext context) {
    final color = MetaChip.toneColor(context, statusTone(status));
    return Semantics(
      label: statusLabel(status),
      child: Icon(statusIcon(status), size: size, color: color),
    );
  }
}

/// Хариуцагчдын эхний үсгүүд (дугуй).
class AssigneeInitials extends StatelessWidget {
  const AssigneeInitials(this.people, {super.key, this.max = 4});

  final List<StaffMember> people;
  final int max;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final shown = people.take(max).toList();
    final extra = people.length - shown.length;
    return Semantics(
      label: people.map(memberName).join(', '),
      excludeSemantics: true,
      child: Wrap(
        spacing: 4,
        children: [
          for (final p in shown)
            CircleAvatar(
              radius: 12,
              backgroundColor: c.brandTint,
              child: Text(
                '${p.lastName.isEmpty ? '' : p.lastName.substring(0, 1)}'
                        '${p.firstName.isEmpty ? '' : p.firstName.substring(0, 1)}'
                    .toUpperCase(),
                style: context.text.labelSmall?.copyWith(color: c.brand, fontWeight: FontWeight.w700),
              ),
            ),
          if (extra > 0)
            CircleAvatar(
              radius: 12,
              backgroundColor: c.surfaceSunken,
              child: Text('+$extra', style: context.text.labelSmall?.copyWith(color: c.inkDim)),
            ),
        ],
      ),
    );
  }
}
