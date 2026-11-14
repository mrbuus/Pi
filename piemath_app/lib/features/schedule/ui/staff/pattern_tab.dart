import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/time/ub_time.dart';
import '../../../../core/time/weekday.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/native/native.dart';
import '../../data/staff_schedule_models.dart';
import '../../data/staff_schedule_repository.dart';
import '../../domain/staff_schedule_logic.dart';
import 'schedule_rows.dart';
import 'staff_actions.dart';

/// «Ерөнхий хуваарь» (вэбийн `PatternOverview`): 7 хоног бүр давтагддаг тогтмол хуваарь — гарагаар.
/// Өнөөдөр мөрдөгдөж буй мөрүүд, доор нь ирээдүйд эхлэх өөрчлөлт. `schedule.manage` эрхтэй бол
/// мөр дээр дарж «Энэ ба цаашдын бүх» эсвэл устгана, «Шинэ цаг нэмэх». Дээр гарагийн мөр (үргэлж
/// харагдана), доор нь цагаар бүлэглэсэн картууд ([LessonGroupCard]).
class StaffPatternTab extends ConsumerStatefulWidget {
  const StaffPatternTab({super.key, required this.filter, required this.perms, this.userId, this.today});

  final ScheduleFilter filter;
  final StaffPermissions perms;
  final String? userId;
  final UbDateTime? today;

  @override
  ConsumerState<StaffPatternTab> createState() => _StaffPatternTabState();
}

class _StaffPatternTabState extends ConsumerState<StaffPatternTab> {
  late final UbDateTime _today = (widget.today ?? UbDateTime.now()).startOfDay;
  late int _weekday = jsWeekdayOf(_today);
  final _hidden = <String>{};

  bool _visible(PatternSlot s) =>
      s.weekday == _weekday && !_hidden.contains(s.id) && widget.filter.matchesSlot(s, userId: widget.userId);

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(patternSlotsProvider);
    final slots = async.value;
    if (slots == null) {
      return async.hasError
          ? ErrorState(onRetry: () => ref.invalidate(patternSlotsProvider))
          : const LoadingState(key: ValueKey('staff-pattern-skeleton'), cards: 5);
    }
    final todayKey = _today.dateKey;
    final current = slots.where((s) => isEffectiveOn(s, todayKey)).toList();
    final perDay = <int, int>{};
    for (final s in current) {
      if (widget.filter.matchesSlot(s, userId: widget.userId) && !_hidden.contains(s.id)) {
        perDay[s.weekday] = (perDay[s.weekday] ?? 0) + 1;
      }
    }
    int order(PatternSlot a, PatternSlot b) {
      final t = a.startMinute.compareTo(b.startMinute);
      return t != 0 ? t : roomOrderOf(a.room).compareTo(roomOrderOf(b.room));
    }

    final shown = current.where(_visible).toList()..sort(order);
    final upcoming = slots.where((s) => s.from.compareTo(todayKey) > 0 && _visible(s)).toList()
      ..sort((a, b) => a.from.compareTo(b.from));

    // Нэг цагт эхлэх хичээлүүд нэг бүлэг (карт); ирээдүйн өөрчлөлт тусдаа бүлэгт.
    final groups = <({String title, List<PatternSlot> slots})>[];
    for (final s in shown) {
      final title = formatMinutes(s.startMinute);
      if (groups.isEmpty || groups.last.title != title) groups.add((title: title, slots: []));
      groups.last.slots.add(s);
    }
    if (upcoming.isNotEmpty) groups.add((title: 'Төлөвлөсөн өөрчлөлт', slots: upcoming));

    final canAdd = widget.perms.canManageAny;
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: canAdd
          ? FloatingActionButton.extended(
              heroTag: 'pattern-add',
              onPressed: () => unawaited(addSlot(context, perms: widget.perms, weekday: _weekday)),
              icon: const Icon(AppIcons.add),
              label: const Text('Шинэ цаг нэмэх'),
            )
          : null,
      body: Column(
        children: [
          // Гарагийн мөр гүйлгэхэд алга болохгүй — аль гарагийг харж байгаа нь үргэлж тодорхой.
          _WeekdayBar(
            selected: _weekday,
            today: jsWeekdayOf(_today),
            perDay: perDay,
            onSelected: (js) => setState(() => _weekday = js),
          ),
          const Divider(height: 1),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(patternSlotsProvider.future),
              child: CustomScrollView(
                key: const ValueKey('staff-pattern-list'),
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  if (shown.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: EmptyState(
                        icon: AppIcons.calendarEmpty,
                        title: current.isEmpty ? 'Мөрдөгдөж буй хуваарь алга' : 'Энэ гарагт хичээл алга',
                        message: current.isEmpty ? 'Хуваарь оруулсны дараа энд харагдана' : null,
                      ),
                    ),
                  SliverPadding(
                    // «Шинэ цаг нэмэх» товч сүүлийн мөрийг халхлахгүй
                    padding: EdgeInsets.only(bottom: canAdd ? 96 : AppSpace.xxl),
                    sliver: SliverList.builder(
                      itemCount: groups.length,
                      itemBuilder: (context, i) => _group(context, groups[i], todayKey),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _group(BuildContext context, ({String title, List<PatternSlot> slots}) g, String todayKey) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      TimeGroupHeader(title: g.title, count: g.slots.length),
      LessonGroupCard(children: [for (final s in g.slots) _row(context, s, todayKey)]),
    ],
  );

  Widget _row(BuildContext context, PatternSlot s, String todayKey) {
    final manage = widget.perms.canManage(s.classroomId);
    final future = s.from.compareTo(todayKey) > 0;
    return LessonRow(
      room: s.room,
      title: shortClass(s.classroomName),
      meta: [
        if (future) '${s.from}-аас ${formatMinutes(s.startMinute)}',
        slotTeacherLabel(s),
        if (s.to != null) '${s.to} хүртэл',
      ],
      trailing: SeatCount(students: s.students, room: s.room),
      onTap: manage ? () => unawaited(_openSlot(context, s)) : null,
    );
  }

  Future<void> _openSlot(BuildContext context, PatternSlot s) async {
    final action = await showSelectSheet<String>(
      context,
      title:
          '${shortClass(s.classroomName)}, ${weekdayNameMn(mnWeekdayFromJs(s.weekday))} ${formatMinutes(s.startMinute)}',
      options: const [
        SelectOption(
          'split',
          'Энэ ба цаашдын бүх',
          subtitle: 'Сонгосон өдрөөс гараг, цаг, танхим, багш солих',
          icon: AppIcons.calendarRange,
        ),
        SelectOption('delete', 'Устгах', subtitle: 'Бүх давтамжид нөлөөлнө', icon: AppIcons.trash),
      ],
    );
    if (action == null || !context.mounted) return;
    if (action.value == 'split') {
      final from = nextOnOrAfter(s.weekday, s.from.compareTo(_today.dateKey) > 0 ? dayOf(s.from) : _today);
      await splitSeriesForm(
        context,
        scheduleId: s.id,
        from: from.dateKey,
        weekday: s.weekday,
        startMinute: s.startMinute,
        endMinute: s.endMinute,
        room: s.room,
        teacherId: s.teacherId,
        askFrom: true,
      );
    } else {
      await deletePatternSlot(
        context,
        slot: s,
        onHide: () => setState(() => _hidden.add(s.id)),
        onUnhide: () {
          if (mounted) setState(() => _hidden.remove(s.id));
        },
      );
    }
  }
}

/// Гарагийн мөр: 7 тэнцүү нүд — гарагийн товч нэр, доор нь хичээлийн тоо. «Өдөр»-ийн [WeekStrip]-тэй
/// ижил харагдац (сонгосон = дүүрэн дугуй, өнөөдрийн гараг = хүрээ).
class _WeekdayBar extends StatelessWidget {
  const _WeekdayBar({required this.selected, required this.today, required this.perDay, required this.onSelected});

  /// JS гараг (0 = Ням).
  final int selected;
  final int today;
  final Map<int, int> perDay;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.sm, AppSpace.sm, AppSpace.sm, AppSpace.sm),
      child: Row(
        children: [
          for (var mn = 1; mn <= 7; mn++)
            Expanded(
              child: Builder(
                builder: (context) {
                  final js = jsWeekdayFromMn(mn);
                  final on = js == selected;
                  final isToday = js == today;
                  final n = perDay[js] ?? 0;
                  return Semantics(
                    button: true,
                    selected: on,
                    label: [weekdayNameMn(mn), if (isToday) 'өнөөдөр', '$n хичээл'].join(', '),
                    excludeSemantics: true,
                    child: InkWell(
                      key: ValueKey('pattern-weekday:$mn'),
                      onTap: () => onSelected(js),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              weekdayShortMn(mn),
                              style: context.text.labelSmall?.copyWith(color: isToday ? c.brand : c.inkDim),
                            ),
                            const SizedBox(height: AppSpace.xs),
                            Container(
                              width: 36,
                              height: 36,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: on ? c.brand : null,
                                border: isToday && !on ? Border.all(color: c.brand, width: 1.5) : null,
                              ),
                              child: Text(
                                '$n',
                                style: context.text.titleSmall?.copyWith(
                                  color: on ? c.onBrand : (n == 0 ? c.inkDim : c.ink),
                                  fontWeight: on || isToday ? FontWeight.w700 : FontWeight.w500,
                                  fontFeatures: const [FontFeature.tabularFigures()],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
