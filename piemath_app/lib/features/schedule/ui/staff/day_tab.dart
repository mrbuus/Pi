import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/time/date_mn.dart';
import '../../../../core/time/ub_time.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/native/native.dart';
import '../../data/schedule_repository.dart';
import '../../data/staff_schedule_models.dart';
import '../../data/staff_schedule_repository.dart';
import '../../domain/agenda_scroll.dart';
import '../../domain/day_overlay.dart';
import '../../domain/staff_schedule_logic.dart';
import 'lesson_detail.dart';
import 'schedule_rows.dart';
import 'staff_actions.dart';

/// «Өдрийн хуваарь» (вэбийн `WeekBuilder`): дээр 7 хоногийн тууз, доор өдрийн хуваарь.
/// Туузыг хуруугаар шудрахад 7 хоног солигдоно (гараг хэвээр), өдөр дээр дарж сонгоно. Хуваарийн хэсэг
/// (hub) өөрөө дэд табаа хуруугаар солидог тул доорх өдрийн хуваарь хажуу тийш шудрагдахгүй — хоёр
/// хэвтээ шудралт зөрчилдөнө. Хичээл дээр дарахад дэлгэрэнгүй (таблетад баруун талд). «Онцгой өдөр»
/// AppBar-т ([StaffScheduleActions]).
class StaffDayTab extends ConsumerStatefulWidget {
  const StaffDayTab({super.key, required this.filter, required this.perms, this.today});

  final ScheduleFilter filter;
  final StaffPermissions perms;

  /// Тест: «одоо». Өгөөгүй бол [UbDateTime.now].
  final UbDateTime? today;

  @override
  ConsumerState<StaffDayTab> createState() => _StaffDayTabState();
}

class _StaffDayTabState extends ConsumerState<StaffDayTab> {
  late UbDateTime _day = defaultScheduleDay(widget.today ?? UbDateTime.now());

  /// null = автомат: нэг цагт олон анги давхцвал жагсаалт, цөөн бол цагийн хүснэгт ([_DayPage]).
  bool? _listMode;
  String? _selected;

  void _select(UbDateTime d) {
    final day = d.startOfDay;
    if (day.dayIndex == _day.dayIndex) return;
    setState(() {
      _day = day;
      _selected = null;
    });
  }

  void _open(DayLesson l, {required bool wide}) {
    if (wide) {
      setState(() => _selected = l.scheduleId);
    } else {
      unawaited(showLessonSheet(context, date: _day.dateKey, scheduleId: l.scheduleId, perms: widget.perms));
    }
  }

  Map<String, int> _counts() {
    final week = ref.watch(scheduleWeekProvider(mondayOfDay(_day).dateKey)).value;
    if (week == null) return const {};
    final f = widget.filter;
    return {
      for (final d in week.days)
        d.date: f.kind == ScheduleFilterKind.classroom
            ? d.entries.where((e) => e.classroomId == f.id).length
            : d.entries.length,
    };
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, box) {
        final wide = box.maxWidth >= AppSizes.tabletBreakpoint;
        final main = Column(
          children: [
            WeekStrip(selected: _day, today: widget.today, counts: _counts(), onSelected: _select),
            const Divider(height: 1),
            Expanded(
              child: _DayPage(
                key: ValueKey('staff-day:${_day.dateKey}'),
                date: _day,
                now: widget.today ?? UbDateTime.now(),
                filter: widget.filter,
                perms: widget.perms,
                listMode: _listMode,
                onSetListMode: (v) => setState(() => _listMode = v),
                onOpen: (l) => _open(l, wide: wide),
                onGoTo: _select,
                selectedId: wide ? _selected : null,
              ),
            ),
          ],
        );
        if (!wide) return main;
        return Row(
          children: [
            Expanded(child: main),
            const VerticalDivider(width: 1),
            SizedBox(
              width: 400,
              child: _selected == null
                  ? const EmptyState(icon: AppIcons.schedule, title: 'Хичээл сонгоно уу')
                  : LessonDetail(
                      key: ValueKey('detail:${_day.dateKey}:$_selected'),
                      date: _day.dateKey,
                      scheduleId: _selected!,
                      perms: widget.perms,
                      onClose: () => setState(() => _selected = null),
                    ),
            ),
          ],
        );
      },
    );
  }
}

class _DayPage extends ConsumerWidget {
  const _DayPage({
    super.key,
    required this.date,
    required this.now,
    required this.filter,
    required this.perms,
    required this.listMode,
    required this.onSetListMode,
    required this.onOpen,
    required this.onGoTo,
    required this.selectedId,
  });

  final UbDateTime date;

  /// Нээх үеийн «одоо» — хуваарийг явж буй хичээл эсвэл эхний хичээл рүү гүйлгэнэ.
  final UbDateTime now;
  final ScheduleFilter filter;
  final StaffPermissions perms;

  /// Хэрэглэгчийн сонголт; null бол [crowdedDay]-ээр автомат.
  final bool? listMode;
  final ValueChanged<bool> onSetListMode;
  final ValueChanged<DayLesson> onOpen;
  final ValueChanged<UbDateTime> onGoTo;
  final String? selectedId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = date.dateKey;
    final async = ref.watch(visibleDayPlanProvider(key));
    final plan = async.value;
    if (plan == null) {
      if (async.hasError) return ErrorState(onRetry: () => ref.invalidate(dayPlanProvider(key)));
      return const LoadingState(key: ValueKey('staff-day-skeleton'), cards: 5);
    }
    final lessons = sortLessons(plan.lessons.where(filter.matchesLesson));
    final counts = dayCounts(plan.lessons);
    final today = dayOf(plan.today);
    // Нэг цагт 4-өөс олон анги давхцвал цагийн хүснэгтийн багана хэт нарийсаж нэр тасардаг
    // (утсан дээр 7–11 багана) — тэр үед жагсаалтаар нээнэ. Товчоор хүссэн үедээ солино.
    final list = listMode ?? crowdedDay(lessons);
    final header = _DayHeader(
      plan: plan,
      counts: counts,
      perms: perms,
      listMode: list,
      onToggleMode: () => onSetListMode(!list),
    );
    Widget body;
    if (counts.total == 0 || lessons.isEmpty) {
      final tomorrow = today.addDays(1);
      body = EmptyState(
        icon: AppIcons.calendarOff,
        title: counts.total == 0 ? 'Энэ өдөр хичээл алга' : 'Шүүлтүүрт тохирох хичээл алга',
        message: counts.total == 0 ? 'Өөр өдөр сонгоно уу' : null,
        action: counts.total == 0 && !date.isSameDay(tomorrow)
            ? OutlinedButton(onPressed: () => onGoTo(tomorrow), child: const Text('Маргааш руу очих'))
            : null,
      );
    } else if (list) {
      body = _LessonList(lessons: lessons, onOpen: onOpen, selectedId: selectedId);
    } else {
      body = _AutoScrollAgenda(
        key: ValueKey('agenda:$key'),
        initialOffset: agendaScrollOffset(
          day: date,
          now: now,
          lessons: [for (final l in lessons) (start: l.startMinute, end: l.endMinute)],
        ),
        day: date,
        events: [
          for (final l in lessons)
            AgendaEvent(
              id: l.scheduleId,
              start: UbDateTime(date.year, date.month, date.day, l.startMinute ~/ 60, l.startMinute % 60),
              end: UbDateTime(date.year, date.month, date.day, l.endMinute ~/ 60, l.endMinute % 60),
              title: [?l.room, shortClass(l.classroomName)].join(' '),
              subtitle: l.lead != null ? staffRefLabel(l.lead!) : lessonTeacherLabel(l),
              color: l.moved != null ? context.colors.info : null,
              data: l,
            ),
        ],
        onEventTap: (e) => onOpen(e.data! as DayLesson),
        onSlotTap: perms.canManageAny
            ? (t) => unawaited(addSlot(context, perms: perms, weekday: jsWeekdayOf(date), start: t))
            : null,
      );
    }
    return RefreshIndicator(
      onRefresh: () => ref.refresh(dayPlanProvider(key).future),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          header,
          Expanded(child: body),
        ],
      ),
    );
  }
}

/// [DayAgenda]-г нээхэд явж буй хичээл («одоо») эсвэл өдрийн эхний хичээл рүү гүйлгэнэ
/// ([agendaScrollOffset]). Өдөр бүр шинэ түлхүүртэй тул өдөр солиход дахин тооцогдоно; шүүлтүүр солиход,
/// доош татаж шинэчлэхэд хэрэглэгчийн гүйлгэсэн байрлал хэвээр.
class _AutoScrollAgenda extends StatefulWidget {
  const _AutoScrollAgenda({
    super.key,
    required this.initialOffset,
    required this.day,
    required this.events,
    this.onEventTap,
    this.onSlotTap,
  });

  final double initialOffset;
  final UbDateTime day;
  final List<AgendaEvent> events;
  final ValueChanged<AgendaEvent>? onEventTap;
  final ValueChanged<UbDateTime>? onSlotTap;

  @override
  State<_AutoScrollAgenda> createState() => _AutoScrollAgendaState();
}

class _AutoScrollAgendaState extends State<_AutoScrollAgenda> {
  late final _scroll = ScrollController(initialScrollOffset: widget.initialOffset);

  @override
  void initState() {
    super.initState();
    // Өдрийн төгсгөлийн хичээл: зорилтот зай нь гүйлгэх хязгаараас хэтэрч болно — хязгаарт хавчина.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scroll.hasClients) return;
      final max = _scroll.position.maxScrollExtent;
      if (_scroll.offset > max) _scroll.jumpTo(max);
    });
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => DayAgenda(
    day: widget.day,
    events: widget.events,
    controller: _scroll,
    onEventTap: widget.onEventTap,
    onSlotTap: widget.onSlotTap,
  );
}

class _DayHeader extends ConsumerWidget {
  const _DayHeader({
    required this.plan,
    required this.counts,
    required this.perms,
    required this.listMode,
    required this.onToggleMode,
  });

  final DayPlan plan;
  final ({int total, int planned, int confirmed}) counts;
  final StaffPermissions perms;
  final bool listMode;
  final VoidCallback onToggleMode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final past = plan.date.compareTo(plan.today) <= 0;
    final canPublish = perms.canPublish && plan.date.compareTo(plan.today) >= 0 && !plan.isHoliday && counts.total > 0;
    final pub = canPublish ? ref.watch(publicationProvider(plan.date)).value : null;
    final publishedAt = parseApiInstant(pub?.publishedAt);
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.xs, AppSpace.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: AppSpace.sm,
                  runSpacing: AppSpace.xs,
                  children: [
                    if (counts.total > 0)
                      MetaChip(
                        label: 'Төлөвлөсөн ${counts.planned}/${counts.total}',
                        tone: counts.planned == counts.total ? ChipTone.success : ChipTone.neutral,
                      ),
                    if (counts.total > 0 && past)
                      MetaChip(
                        label: 'Батлагдсан ${counts.confirmed}/${counts.total}',
                        tone: counts.confirmed == counts.total ? ChipTone.success : ChipTone.neutral,
                      ),
                    if (publishedAt != null)
                      MetaChip(
                        label: 'Нийтэлсэн ${DateMn.time(UbDateTime.fromInstant(publishedAt))}, ${pub!.recipients} хүнд',
                        icon: AppIcons.check,
                        tone: ChipTone.success,
                      ),
                  ],
                ),
              ),
              if (canPublish)
                IconButton(
                  tooltip: publishedAt != null ? 'Өөрчлөлт илгээх' : 'Нийтлэх',
                  icon: const Icon(AppIcons.bellRing),
                  onPressed: () => unawaited(publishDay(context, date: plan.date, again: publishedAt != null)),
                ),
              IconButton(
                tooltip: listMode ? 'Цагаар харах' : 'Жагсаалтаар харах',
                icon: Icon(listMode ? AppIcons.schedule : AppIcons.listTodo),
                onPressed: onToggleMode,
              ),
            ],
          ),
          if (plan.isHoliday)
            _Banner(icon: AppIcons.calendarOff, text: plan.holidayTitle ?? 'Амралтын өдөр', color: c.warning),
          if (plan.restingClasses.isNotEmpty)
            _Banner(
              icon: AppIcons.calendarOff,
              text: 'Амарна: ${{for (final n in plan.restingClasses) shortClass(n)}.join(', ')}',
              color: c.warning,
            ),
        ],
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.icon, required this.text, required this.color});

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(top: AppSpace.xs, right: AppSpace.md),
    padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
    decoration: BoxDecoration(color: context.colors.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.sm)),
    child: Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: AppSpace.sm),
        Expanded(child: Text(text, style: context.text.bodyMedium)),
      ],
    ),
  );
}

/// Жагсаалтаар: ижил цагт эхлэх хичээлүүд нэг карт (вэбийн «блок»), танхимын эрэмбээр.
class _LessonList extends StatelessWidget {
  const _LessonList({required this.lessons, required this.onOpen, required this.selectedId});

  final List<DayLesson> lessons;
  final ValueChanged<DayLesson> onOpen;
  final String? selectedId;

  @override
  Widget build(BuildContext context) {
    final groups = <({int start, List<DayLesson> lessons})>[];
    for (final l in lessons) {
      if (groups.isEmpty || groups.last.start != l.startMinute) groups.add((start: l.startMinute, lessons: []));
      groups.last.lessons.add(l);
    }
    final c = context.colors;
    return ListView.builder(
      key: const ValueKey('staff-day-list'),
      padding: const EdgeInsets.only(bottom: AppSpace.xxl),
      itemCount: groups.length,
      itemBuilder: (context, i) {
        final g = groups[i];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TimeGroupHeader(title: formatMinutes(g.start), count: g.lessons.length),
            LessonGroupCard(
              children: [
                for (final l in g.lessons)
                  LessonRow(
                    room: l.room,
                    title: shortClass(l.classroomName),
                    meta: [
                      [
                        if (l.lead != null) staffRefLabel(l.lead!) else ?lessonTeacherLabel(l),
                        if (l.assistant != null) staffRefLabel(l.assistant!),
                      ].join(', '),
                      if (l.moved != null) 'Зөөгдсөн',
                      if (l.planned && l.record == null) 'Төлөвлөсөн',
                    ],
                    trailing: l.record != null
                        ? Tooltip(
                            message: 'Батлагдсан',
                            child: Icon(AppIcons.badgeCheck, size: 20, color: c.success),
                          )
                        : null,
                    selected: l.scheduleId == selectedId,
                    onTap: () => onOpen(l),
                  ),
              ],
            ),
          ],
        );
      },
    );
  }
}
