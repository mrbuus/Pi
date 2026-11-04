import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../../../core/ui/ui.dart';
import '../../my_class/domain/hub_logic.dart';
import '../../my_class/ui/common.dart';
import '../data/schedule_models.dart';
import '../data/schedule_repository.dart';
import '../domain/schedule_logic.dart';

/// Хуваарь: (сурагчид) 7 хоногийн тогтмол хуваарь + тодорхой 7 хоногийн хичээлүүд.
/// «Хичээл» hub-ийн «Хуваарь» таб болон `/app/schedule` дэлгэц хоёулаа энийг хэрэглэнэ.
///
/// 7 хоногийн хэсэг `/schedule/week`-ээр — цуцалсан, зөөсөн хичээл, амралтыг сервер шийдсэн
/// (вэбийн «Ойрын өдрүүд» `/schedule/days` нь цуцлалтыг тооцдоггүй — api-contract ТОДРУУЛАХ).
class ScheduleView extends ConsumerWidget {
  const ScheduleView({super.key, required this.showPattern, this.today});

  /// Сурагч л (`/schedule/me` эцэг эхэд 403).
  final bool showPattern;

  /// Тестэд тогтмол өдөр.
  final UbDateTime? today;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = today ?? UbDateTime.now();
    return RefreshIndicator(
      onRefresh: () => refreshProviders(ref, [
        if (showPattern) scheduleMeProvider,
        scheduleWeekProvider(mondayOf(now).dateKey),
      ]),
      child: ListView(
        padding: const EdgeInsets.all(AppSpace.gutter),
        children: [
          if (showPattern) ...[
            _PatternSection(today: now),
            const SizedBox(height: AppSpace.xl),
          ],
          WeekSection(today: now),
        ],
      ),
    );
  }
}

/// 7 хоногийн тогтмол хуваарь — Даваа (зүүн) … Ням (баруун).
class _PatternSection extends ConsumerWidget {
  const _PatternSection({required this.today});

  final UbDateTime today;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(scheduleMeProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const _Heading('7 хоногийн хуваарь'),
        const SizedBox(height: AppSpace.md),
        AsyncBody(
          value: me,
          onRetry: () => ref.invalidate(scheduleMeProvider),
          loading: const SkeletonPulse(child: SkeletonCard(lines: 3)),
          compactError: true,
          builder: (data) {
            if (data.classroomId == null) {
              return const EmptyState(
                icon: AppIcons.calendar,
                title: 'Идэвхтэй анги алга',
                message: 'Ангид элссэний дараа хуваарь энд харагдана',
              );
            }
            if (data.entries.isEmpty) return const DashedNote('Хичээл товлоогдоогүй');
            return PatternGrid(entries: data.entries, todayWeekday: today.weekday);
          },
        ),
      ],
    );
  }
}

/// Тогтмол хуваарийн тор: 7 багана (Монгол гараг), нүд бүрт цаг + танхим.
class PatternGrid extends StatelessWidget {
  const PatternGrid({super.key, required this.entries, required this.todayWeekday});

  final List<ScheduleEntry> entries;

  /// Монгол 1=Даваа … 7=Ням.
  final int todayWeekday;

  @override
  Widget build(BuildContext context) {
    final byDay = patternByWeekday(entries);
    final c = context.colors;
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs, vertical: AppSpace.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var d = 1; d <= 7; d++)
            Expanded(
              child: Semantics(
                container: true,
                label: '${weekdayNameMn(d)}${d == todayWeekday ? ', өнөөдөр' : ''}',
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: d == todayWeekday ? c.brandBright : c.line, width: d == todayWeekday ? 2 : 1),
                        ),
                      ),
                      child: Center(
                        child: Text(
                          weekdayShortMn(d),
                          style: context.text.labelMedium?.copyWith(
                            color: d == todayWeekday ? c.brandSoft : c.inkDim,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpace.sm),
                    if (byDay[d]!.isEmpty)
                      Text('–', style: context.text.bodySmall)
                    else
                      for (final e in byDay[d]!) _PatternCell(entry: e),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _PatternCell extends StatelessWidget {
  const _PatternCell({required this.entry});

  final ScheduleEntry entry;

  @override
  Widget build(BuildContext context) {
    final teacher = patternTeacherName(entry.teacher);
    final label = [
      timeRange(entry.startMinute, entry.endMinute),
      if (entry.room != null) 'Танхим ${entry.room}',
      entry.classroom?.name,
      teacher,
    ].whereType<String>().join(', ');
    return Semantics(
      label: label,
      excludeSemantics: true,
      child: Tooltip(
        message: label,
        child: Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.sm),
          child: Column(
            children: [
              Text(
                hm(entry.startMinute),
                style: context.text.labelMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              if (entry.room != null)
                Text(entry.room!, style: context.text.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ),
    );
  }
}

/// Тодорхой 7 хоногийн хичээлүүд — сумаар өмнөх/дараагийн 7 хоног.
class WeekSection extends ConsumerStatefulWidget {
  const WeekSection({super.key, required this.today});

  final UbDateTime today;

  @override
  ConsumerState<WeekSection> createState() => _WeekSectionState();
}

class _WeekSectionState extends ConsumerState<WeekSection> {
  late UbDateTime _monday = mondayOf(widget.today);

  @override
  Widget build(BuildContext context) {
    final key = _monday.dateKey;
    final week = ref.watch(scheduleWeekProvider(key));
    final sunday = _monday.addDays(6);
    final isThisWeek = _monday == mondayOf(widget.today);
    final title = '${DateMn.long(_monday)} – ${DateMn.long(sunday)}';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _Heading(isThisWeek ? 'Энэ 7 хоног' : '7 хоногийн хичээл'),
        const SizedBox(height: AppSpace.sm),
        AppCard(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
          child: Row(
            children: [
              IconButton(
                tooltip: 'Өмнөх 7 хоног',
                icon: const Icon(AppIcons.back),
                onPressed: () => setState(() => _monday = _monday.addDays(-7)),
              ),
              Expanded(
                child: Text(title, textAlign: TextAlign.center, style: context.text.titleSmall),
              ),
              IconButton(
                tooltip: 'Дараагийн 7 хоног',
                icon: const Icon(AppIcons.forward),
                onPressed: () => setState(() => _monday = _monday.addDays(7)),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.md),
        AsyncBody(
          value: week,
          onRetry: () => ref.invalidate(scheduleWeekProvider(key)),
          loading: const SkeletonPulse(
            child: Column(children: [SkeletonCard(), SizedBox(height: AppSpace.md), SkeletonCard()]),
          ),
          compactError: true,
          builder: (data) {
            final todayKey = widget.today.dateKey;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final d in data.days) ...[
                  WeekDayCard(day: d, isToday: d.date == todayKey),
                  const SizedBox(height: AppSpace.sm),
                ],
              ],
            );
          },
        ),
      ],
    );
  }
}

/// Нэг өдрийн хичээлүүд (амралт, зөөгдсөн хичээлийн тэмдэглэгээтэй).
class WeekDayCard extends StatelessWidget {
  const WeekDayCard({super.key, required this.day, this.isToday = false});

  final WeekDay day;
  final bool isToday;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final date = parseDateKey(day.date);
    final title = date == null ? day.date : '${weekdayNameMn(mnWeekdayOfDay(day))}, ${DateMn.long(date)}';
    return AppCard(
      accent: isToday ? c.brandBright : null,
      padding: const EdgeInsets.all(AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: context.text.titleSmall)),
              if (isToday) const InfoPill(label: 'Өнөөдөр'),
            ],
          ),
          if (day.holiday != null) ...[
            const SizedBox(height: AppSpace.sm),
            _HolidayLine(type: day.holiday!.type, title: day.holiday!.title, note: day.holiday!.note),
          ],
          for (final r in day.restingClasses) ...[
            const SizedBox(height: AppSpace.xs),
            _HolidayLine(type: r.type, title: '${r.classroomName}: ${r.title}'),
          ],
          if (!day.isHoliday && day.entries.isEmpty) ...[
            const SizedBox(height: AppSpace.xs),
            Text('Хичээлгүй', style: context.text.bodySmall),
          ],
          for (final e in day.entries) _WeekEntryRow(entry: e),
        ],
      ),
    );
  }
}

class _HolidayLine extends StatelessWidget {
  const _HolidayLine({required this.type, required this.title, this.note});

  final String type;
  final String title;
  final String? note;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(AppIcons.info, size: 16, color: context.colors.info),
        const SizedBox(width: AppSpace.sm),
        Expanded(
          child: Meta(
            items: [calendarTypeLabel(type), title, note, 'хичээл явагдахгүй'],
            style: context.text.bodySmall?.copyWith(color: context.colors.ink),
          ),
        ),
      ],
    );
  }
}

class _WeekEntryRow extends StatelessWidget {
  const _WeekEntryRow({required this.entry});

  final WeekEntry entry;

  @override
  Widget build(BuildContext context) {
    final moved = entry.exception?.kind == 'MOVED';
    final original = entry.exception?.originalDate;
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RoomBadge(room: entry.room, size: 36),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  timeRange(entry.startMinute, entry.endMinute) ?? '',
                  style: context.text.titleSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
                ),
                Meta(items: [entry.classroomName, weekTeacherName(entry), subjectLabel(entry.subject)]),
                if (entry.topic != null && entry.topic!.trim().isNotEmpty)
                  Text(entry.topic!, style: context.text.bodyMedium),
                if (moved)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Row(
                      children: [
                        Icon(AppIcons.time, size: 14, color: context.colors.info),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            original == null ? 'Зөөгдсөн хичээл' : 'Зөөгдсөн хичээл (анх ${dayShort(original)})',
                            style: context.text.bodySmall?.copyWith(color: context.colors.ink),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Semantics(
        header: true,
        child: Text(
          text,
          style: context.text.titleMedium?.copyWith(color: context.colors.brandSoft, fontWeight: FontWeight.w700),
        ),
      );
}
