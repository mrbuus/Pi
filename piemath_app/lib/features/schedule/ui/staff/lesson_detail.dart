import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/time/date_mn.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/native/native.dart';
import '../../data/staff_schedule_models.dart';
import '../../data/staff_schedule_repository.dart';
import '../../domain/day_overlay.dart';
import '../../domain/staff_schedule_logic.dart';
import 'staff_actions.dart';

/// Хичээлийн дэлгэрэнгүйг доороос гарах хуудсаар (утас).
Future<void> showLessonSheet(
  BuildContext context, {
  required String date,
  required String scheduleId,
  required StaffPermissions perms,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  backgroundColor: Colors.transparent,
  elevation: 0,
  builder: (sheet) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.7,
    minChildSize: 0.35,
    maxChildSize: 0.95,
    builder: (context, scroll) => Material(
      color: context.colors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg))),
      clipBehavior: Clip.antiAlias,
      child: LessonDetail(date: date, scheduleId: scheduleId, perms: perms, controller: scroll, inSheet: true),
    ),
  ),
);

/// Нэг хичээлийн дэлгэрэнгүй ба үйлдэл (вэбийн `PlanDialog` уншигдах хэсэг + `EntryActionPanel`).
/// Таблетад баруун талын самбарт, утсанд [showLessonSheet]-ээр.
class LessonDetail extends ConsumerWidget {
  const LessonDetail({
    super.key,
    required this.date,
    required this.scheduleId,
    required this.perms,
    this.controller,
    this.inSheet = false,
    this.onClose,
  });

  final String date;
  final String scheduleId;
  final StaffPermissions perms;
  final ScrollController? controller;
  final bool inSheet;

  /// Таблетын самбарыг хаах.
  final VoidCallback? onClose;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(visibleDayPlanProvider(date));
    final plan = async.value;
    DayLesson? lesson;
    for (final l in plan?.lessons ?? const <DayLesson>[]) {
      if (l.scheduleId == scheduleId) lesson = l;
    }
    if (plan == null) {
      return async.hasError
          ? ErrorState(onRetry: () => ref.invalidate(dayPlanProvider(date)))
          : const LoadingState(cards: 2);
    }
    if (lesson == null) {
      return EmptyState(
        icon: AppIcons.calendarOff,
        title: 'Энэ өдөр уг хичээл алга',
        message: 'Зөөгдсөн, цуцлагдсан байж болно',
        action: inSheet || onClose != null
            ? OutlinedButton(onPressed: () => _close(context), child: const Text(AppStrings.close))
            : null,
      );
    }
    return _Body(
      date: date,
      lesson: lesson,
      plan: plan,
      perms: perms,
      controller: controller,
      inSheet: inSheet,
      onClose: inSheet || onClose != null ? () => _close(context) : null,
    );
  }

  void _close(BuildContext context) {
    if (inSheet) {
      Navigator.of(context).maybePop();
    } else {
      onClose?.call();
    }
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.date,
    required this.lesson,
    required this.plan,
    required this.perms,
    required this.controller,
    required this.onClose,
    required this.inSheet,
  });

  final bool inSheet;
  final String date;
  final DayLesson lesson;
  final DayPlan plan;
  final StaffPermissions perms;
  final ScrollController? controller;
  final VoidCallback? onClose;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l = lesson;
    final manage = perms.canManage(l.classroomId);
    final clashes = teacherClashes(plan.lessons);
    final tests = [for (final id in l.planTestIds) ?plan.tests[id]];
    final day = dayOf(date);
    final teacher = lessonTeacherLabel(l);

    // Цуцлах, устгах: баталгаажсаны дараа хуудсыг хааж, «Буцаах»-ыг дэлгэцийн доор (навигаторын context).
    final host = Navigator.of(context).context;

    return ListView(
      controller: controller,
      padding: EdgeInsets.zero,
      children: [
        if (controller != null)
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: AppSpace.sm),
              width: 36,
              height: 4,
              decoration: BoxDecoration(color: c.line, borderRadius: BorderRadius.circular(AppRadius.pill)),
            ),
          ),
        DetailHeader(
          title: shortClass(l.classroomName),
          subtitle: '${DateMn.longWithWeekday(day)}, ${formatMinutes(l.startMinute)}–${formatMinutes(l.endMinute)}',
          chips: [
            if (l.room != null) MetaChip(label: '${l.room} тоот', icon: AppIcons.doorOpen),
            if (l.moved != null)
              MetaChip(label: 'Зөөгдсөн (${l.moved!.originalDate})', icon: AppIcons.upcoming, tone: ChipTone.info),
            if (subjectLabels[l.subject] case final s?) MetaChip(label: s),
            if (l.students > 0) MetaChip(label: '${l.students} сурагч', icon: AppIcons.students),
            if (l.record != null)
              const MetaChip(label: 'Батлагдсан', icon: AppIcons.badgeCheck, tone: ChipTone.success),
            if (dismissLabel(l.dismissMode) case final d?) MetaChip(label: d, tone: ChipTone.info),
          ],
          secondary: [
            if (!inSheet && onClose != null)
              DetailAction(label: AppStrings.close, icon: AppIcons.close, onPressed: onClose!),
          ],
        ),
        if (l.moved?.note != null) _Line(icon: AppIcons.note, text: l.moved!.note!),
        const Divider(height: 1),
        const _Section(title: 'Багш'),
        _Line(icon: AppIcons.user, label: 'Хуваарийн багш', text: teacher ?? 'Багш товлогдоогүй'),
        _StaffRow(
          label: 'Ахлах багш',
          person: l.lead,
          clash: l.lead != null && clashes.contains('${l.scheduleId}|${l.lead!.id}'),
          onTap: perms.canStaff ? () => assignStaff(context, lesson: l, date: date, lead: true, plan: plan) : null,
        ),
        _StaffRow(
          label: 'Туслах багш',
          person: l.assistant,
          clash: l.assistant != null && clashes.contains('${l.scheduleId}|${l.assistant!.id}'),
          onTap: perms.canStaff ? () => assignStaff(context, lesson: l, date: date, lead: false, plan: plan) : null,
        ),
        const _Section(title: 'Төлөвлөгөө'),
        _Line(
          icon: AppIcons.theory,
          label: 'Сэдэв',
          text: l.topic ?? 'Сэдэв бичээгүй',
          trailing: perms.canStaff
              ? Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (l.topic != null)
                      IconButton(
                        tooltip: 'Сэдэв хасах',
                        icon: const Icon(AppIcons.eraser),
                        onPressed: () => clearTopic(context, lesson: l),
                      ),
                    IconButton(
                      tooltip: 'Сэдэв засах',
                      icon: const Icon(AppIcons.pencilLine),
                      onPressed: () => editTopic(context, lesson: l),
                    ),
                  ],
                )
              : null,
        ),
        if (tests.isNotEmpty) _Line(icon: AppIcons.tests, label: 'Тест', text: tests.map((t) => t.short).join(', ')),
        if (l.customTopics.isNotEmpty)
          _Line(icon: AppIcons.note, label: 'Нэмэлт сэдэв', text: l.customTopics.join(', ')),
        if (l.noteBody != null)
          _Line(
            icon: AppIcons.stickyNote,
            label: l.noteBy == null ? 'Тэмдэглэл' : 'Тэмдэглэл, ${l.noteBy}',
            text: l.noteBody!,
          ),
        if (l.record != null)
          _Line(
            icon: AppIcons.checklist,
            label: 'Батлагдсан, ${l.record!.confirmedByName}',
            text: 'Ирсэн ${l.record!.presentCount}, тасалсан ${l.record!.absentCount}',
          ),
        if (manage) ...[
          const _Section(title: 'Зөвхөн энэ өдөр'),
          _ActionTile(
            icon: AppIcons.doorOpen,
            label: 'Танхим солих',
            onTap: () => changeRoom(context, lesson: l, day: plan.lessons),
          ),
          _ActionTile(
            icon: AppIcons.upcoming,
            label: 'Зөөх',
            onTap: () => moveLesson(context, lesson: l, date: date, day: plan.lessons),
          ),
          _ActionTile(
            icon: AppIcons.ban,
            label: 'Цуцлах',
            onTap: () => cancelLesson(context, lesson: l, date: date, afterConfirm: onClose, host: host),
          ),
          const _Section(title: 'Энэ ба цаашдын бүх'),
          _ActionTile(
            icon: AppIcons.calendarRange,
            label: 'Өөрчлөх',
            subtitle: '$date-ээс хойшх бүх 7 хоногт үйлчилнэ',
            onTap: () => splitSeriesForm(
              context,
              scheduleId: l.scheduleId,
              from: l.occurrenceDate,
              weekday: jsWeekdayOf(day),
              startMinute: l.startMinute,
              endMinute: l.endMinute,
              room: l.room,
              teacherId: l.teacherId,
            ),
          ),
          const _Section(title: 'Бүх давтамжид нөлөөлнө'),
          _ActionTile(
            icon: AppIcons.trash,
            label: 'Устгах',
            destructive: true,
            onTap: () => deleteLessonSeries(context, lesson: l, date: date, afterConfirm: onClose, host: host),
          ),
        ],
        const SizedBox(height: AppSpace.xxl),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.lg, AppSpace.gutter, AppSpace.xs),
    child: Semantics(
      header: true,
      child: Text(title, style: context.text.labelLarge?.copyWith(color: context.colors.inkDim)),
    ),
  );
}

class _Line extends StatelessWidget {
  const _Line({required this.icon, required this.text, this.label, this.trailing});

  final IconData icon;
  final String text;
  final String? label;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: AppSizes.minTap),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter, vertical: AppSpace.xs),
        child: Row(
          children: [
            Icon(icon, size: 20, color: c.inkDim),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (label != null) Text(label!, style: context.text.bodySmall),
                  Text(text, style: context.text.bodyMedium),
                ],
              ),
            ),
            ?trailing,
          ],
        ),
      ),
    );
  }
}

class _StaffRow extends StatelessWidget {
  const _StaffRow({required this.label, required this.person, required this.clash, this.onTap});

  final String label;
  final StaffRef? person;
  final bool clash;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ListTile(
      minTileHeight: AppSizes.minTap,
      leading: Icon(AppIcons.user, size: 20, color: c.inkDim),
      title: Text(label, style: context.text.bodySmall),
      subtitle: Text(
        person == null ? 'Оноогоогүй' : staffRefLabel(person!),
        style: context.text.bodyMedium?.copyWith(color: person == null ? c.inkDim : c.ink),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (clash)
            Tooltip(
              message: 'Энэ цагт өөр ангид давхар оноогдсон',
              child: Icon(AppIcons.warning, size: 20, color: c.warning),
            ),
          if (onTap != null) Icon(AppIcons.forward, size: 20, color: c.inkDim),
        ],
      ),
      onTap: onTap,
    );
  }
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.subtitle,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final String? subtitle;
  final bool destructive;
  final Future<Object?> Function() onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final color = destructive ? c.error : c.ink;
    return ListTile(
      minTileHeight: AppSizes.minTap,
      leading: Icon(icon, size: 20, color: destructive ? c.error : c.brand),
      title: Text(label, style: context.text.bodyLarge?.copyWith(color: color)),
      subtitle: subtitle == null ? null : Text(subtitle!),
      onTap: () => unawaited(onTap()),
    );
  }
}
