import 'package:flutter/material.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../data/teacher_models.dart';
import '../domain/board_logic.dart';
import 'teacher_icons.dart';

/// Багшийн дэлгэцийн хүрэх талбай — 48dp (утсанд хуруугаар хурдан тэмдэглэнэ).
const double teacherTap = 48;

/// Хичээлийн мета: «15:00–17:00», өрөө, сэдэв (Dot-оор тусгаарласан).
class LessonMeta extends StatelessWidget {
  const LessonMeta({super.key, required this.lessons, this.extra = const []});

  final List<BoardLesson> lessons;
  final List<Object?> extra;

  @override
  Widget build(BuildContext context) {
    final l = lessons.firstOrNull;
    return Meta(
      items: [
        if (l != null) '${hm(l.startMinute)}–${hm(l.endMinute)}',
        if (l?.room != null && l!.room!.trim().isNotEmpty) '${l.room} тоот',
        if (l?.topic != null && l!.topic!.trim().isNotEmpty) l.topic,
        ...extra,
      ],
    );
  }
}

/// Өдөр сонгогч: ‹ огноо › + «Өнөөдөр».
class DayStepper extends StatelessWidget {
  const DayStepper({super.key, required this.date, required this.today, required this.onChanged});

  final UbDateTime date;
  final UbDateTime today;
  final ValueChanged<UbDateTime> onChanged;

  @override
  Widget build(BuildContext context) {
    final isToday = date.isSameDay(today);
    return Row(
      children: [
        IconButton(
          tooltip: 'Өмнөх өдөр',
          constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
          icon: const Icon(TeacherIcons.prevDay),
          onPressed: () => onChanged(date.addDays(-1)),
        ),
        Expanded(
          child: Text(
            isToday ? 'Өнөөдөр, ${DateMn.longWithWeekday(date)}' : DateMn.longWithWeekday(date),
            textAlign: TextAlign.center,
            style: context.text.titleSmall,
          ),
        ),
        IconButton(
          tooltip: 'Дараагийн өдөр',
          constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
          icon: const Icon(TeacherIcons.nextDay),
          onPressed: () => onChanged(date.addDays(1)),
        ),
        if (!isToday)
          TextButton(
            style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
            onPressed: () => onChanged(today),
            child: const Text('Өнөөдөр'),
          ),
      ],
    );
  }
}

/// Нэг тэмдэглэгээний товч (утсан дээр зөвхөн дүрс; дэлгэц уншигч, tooltip-д үг).
class MarkButton extends StatelessWidget {
  const MarkButton({super.key, required this.meta, required this.selected, required this.onTap, this.label});

  final MarkMeta meta;
  final bool selected;
  final VoidCallback onTap;

  /// Дэлгэц уншигчийн бүтэн шошго («Бат, Ирсэн»).
  final String? label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final tone = meta.tone.color(c);
    return Semantics(
      button: true,
      selected: selected,
      label: label ?? meta.label,
      excludeSemantics: true,
      child: Tooltip(
        message: meta.label,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadius.md),
          child: AnimatedContainer(
            duration: AppMotion.micro,
            width: teacherTap,
            height: teacherTap,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: selected ? tone.withValues(alpha: 0.12) : null,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: selected ? tone : c.line, width: selected ? 1.5 : 1),
            ),
            child: MarkIcon(meta.glyph, color: selected ? tone : c.inkDim, size: 22),
          ),
        ),
      ),
    );
  }
}

/// Хадгалалтын төлөв: «Хадгалж байна», «Хадгалсан 15:32», «Хадгалагдсангүй».
class SaveStatus extends StatelessWidget {
  const SaveStatus({super.key, required this.pending, this.savedAt, this.error});

  final int pending;
  final String? savedAt;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (IconData icon, Color color, String text) = error != null
        ? (AppIcons.error, c.error, 'Хадгалагдсангүй')
        : pending > 0
        ? (TeacherIcons.saving, c.inkDim, 'Хадгалж байна')
        : savedAt != null
        ? (TeacherIcons.saved, c.success, 'Хадгалсан $savedAt')
        : (TeacherIcons.saved, c.inkDim, 'Товшмогц хадгалагдана');
    return Semantics(
      liveRegion: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: AppSpace.xs),
          Flexible(
            child: Text(
              text,
              overflow: TextOverflow.ellipsis,
              style: context.text.labelMedium?.copyWith(color: color),
            ),
          ),
        ],
      ),
    );
  }
}

/// Онлайн даалгаврын илгээлтийн төлөвийн шошго.
String submissionStateLabel(String state) => switch (state) {
  'SUBMITTED' => 'Шалгах',
  'DONE_ONLINE' => 'Зөвшөөрсөн',
  'RETURNED' => 'Буцаасан',
  'DONE_IN_CLASS' => 'Ангид шалгасан',
  _ => 'Илгээгээгүй',
};

/// Ангийн төрөл.
String classTypeLabel(String type) => type == 'ONLINE' ? 'Онлайн' : 'Танхим';
