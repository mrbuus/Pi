import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../data/hub_models.dart';
import '../domain/hub_logic.dart';

/// Хичээлийн өдрийн дэлгэрэнгүйн зам (линкээр хуваалцаж болно).
String dayPath(String date, String classroomId) =>
    '/app/my-class/day/${dayKeyOf(date)}/${Uri.encodeComponent(classroomId)}';

/// Нэг хичээлийн өдрийн мөр (вэбийн `LessonDays.DayRow`): огноо, сэдэв, тест/зургийн тоо,
/// миний ирц, даалгаврын тэмдэг. Дарахад өдрийн дэлгэрэнгүй.
class DayRow extends StatelessWidget {
  const DayRow({super.key, required this.day, required this.today, required this.onOpen, this.showClass = false});

  final HubDay day;
  final String today;
  final bool showClass;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final key = dayKeyOf(day.date);
    final isToday = key == today;
    final topic = day.topic?.trim();
    return Semantics(
      button: true,
      label: '${dayTitle(key)}${isToday ? ', өнөөдөр' : ''}',
      child: InkWell(
        onTap: onOpen,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 64),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
            child: Row(
              children: [
                ExcludeSemantics(
                  child: Container(
                    width: 44,
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      border: isToday ? Border.all(color: c.brandBright, width: 1.5) : null,
                    ),
                    child: Column(
                      children: [
                        Text(
                          '${dayNumberOf(key)}',
                          style: context.text.displaySmall?.copyWith(
                            fontSize: 18,
                            color: isToday ? c.brandSoft : c.ink,
                          ),
                        ),
                        Text(
                          weekdayShortOf(key),
                          style: context.text.labelSmall?.copyWith(color: isToday ? c.brandSoft : c.inkDim),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: AppSpace.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        topic == null || topic.isEmpty ? 'Сэдэв оруулаагүй' : topic,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: context.text.titleSmall?.copyWith(
                          color: topic == null || topic.isEmpty ? c.inkDim : c.ink,
                        ),
                      ),
                      Meta(
                        items: [
                          if (showClass) day.classroomName,
                          if (day.tests.isNotEmpty) _IconCount(icon: AppIcons.exam, text: '${day.tests.length} тест'),
                          if (day.theory.count > 0)
                            _IconCount(icon: AppIcons.theoryPhoto, text: '${day.theory.count} зураг'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpace.sm),
                AttendanceMarkView(
                  status: day.attendance?.status,
                  lateRange: day.attendance?.lateRange,
                  compact: true,
                ),
                const SizedBox(width: AppSpace.md),
                HomeworkMarkView(status: day.homework.status, compact: true),
                const SizedBox(width: AppSpace.xs),
                Icon(AppIcons.forward, size: 16, color: c.inkDim),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _IconCount extends StatelessWidget {
  const _IconCount({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: context.colors.inkDim),
        const SizedBox(width: 3),
        Text(text, style: context.text.bodySmall),
      ],
    );
  }
}

/// Мөрүүдийг хуваагчтай нэг картанд.
class DividedCard extends StatelessWidget {
  const DividedCard({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) Divider(height: 1, color: context.colors.line),
            children[i],
          ],
        ],
      ),
    );
  }
}
