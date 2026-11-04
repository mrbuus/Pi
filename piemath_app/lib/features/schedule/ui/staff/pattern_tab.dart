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
import 'staff_actions.dart';

/// «Ерөнхий хуваарь» (вэбийн `PatternOverview`): 7 хоног бүр давтагддаг тогтмол хуваарь — гарагаар.
/// Өнөөдөр мөрдөгдөж буй мөрүүд, доор нь ирээдүйд эхлэх өөрчлөлт. `schedule.manage` эрхтэй бол
/// мөр дээр дарж «Энэ ба цаашдын бүх» эсвэл устгана, «Шинэ цаг нэмэх».
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

    final rows = <Object>[];
    int? last;
    for (final s in shown) {
      if (s.startMinute != last) {
        rows.add(s.startMinute);
        last = s.startMinute;
      }
      rows.add(s);
    }
    if (upcoming.isNotEmpty) {
      rows
        ..add('Төлөвлөсөн өөрчлөлт')
        ..addAll(upcoming);
    }

    return RefreshIndicator(
      onRefresh: () => ref.refresh(patternSlotsProvider.future),
      child: CustomScrollView(
        key: const ValueKey('staff-pattern-list'),
        slivers: [
          SliverToBoxAdapter(child: _weekdayChips(context, perDay)),
          if (widget.perms.canManageAny)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: FilledButton.icon(
                    icon: const Icon(AppIcons.add, size: 18),
                    label: const Text('Шинэ цаг нэмэх'),
                    onPressed: () => unawaited(addSlot(context, perms: widget.perms, weekday: _weekday)),
                  ),
                ),
              ),
            ),
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
            padding: const EdgeInsets.only(bottom: AppSpace.xxl),
            sliver: SliverList.builder(
              itemCount: rows.length,
              itemBuilder: (context, i) => _row(context, rows[i], todayKey),
            ),
          ),
        ],
      ),
    );
  }

  Widget _weekdayChips(BuildContext context, Map<int, int> perDay) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, 0),
    child: Row(
      children: [
        for (var mn = 1; mn <= 7; mn++)
          Padding(
            padding: const EdgeInsets.only(right: AppSpace.sm),
            child: ChoiceChip(
              label: Text('${weekdayShortMn(mn)} ${perDay[jsWeekdayFromMn(mn)] ?? 0}'),
              tooltip: weekdayNameMn(mn),
              selected: _weekday == jsWeekdayFromMn(mn),
              onSelected: (_) => setState(() => _weekday = jsWeekdayFromMn(mn)),
            ),
          ),
      ],
    ),
  );

  Widget _row(BuildContext context, Object row, String todayKey) {
    final c = context.colors;
    if (row is int || row is String) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.lg, AppSpace.gutter, AppSpace.xs),
        child: Semantics(
          header: true,
          child: Text(row is int ? formatMinutes(row) : row as String, style: context.text.titleMedium),
        ),
      );
    }
    final s = row as PatternSlot;
    final cap = roomCapacityOf(s.room);
    final over = cap != null && s.students != null && s.students! > cap;
    final manage = widget.perms.canManage(s.classroomId);
    final future = s.from.compareTo(todayKey) > 0;
    return InkWell(
      onTap: manage ? () => unawaited(_openSlot(context, s)) : null,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: AppSizes.minTap),
        child: ItemRow(
          title: shortClass(s.classroomName),
          meta: [
            if (future) '${s.from}-аас ${formatMinutes(s.startMinute)}',
            s.room,
            slotTeacherLabel(s),
            if (s.students != null) cap != null ? '${s.students}/$cap' : '${s.students} сурагч',
            if (s.to != null) '${s.to} хүртэл',
          ],
          trailing: over
              ? Tooltip(
                  message: 'Суудал дутсан',
                  child: Icon(AppIcons.warning, size: 20, color: c.warning),
                )
              : null,
          chevron: manage,
        ),
      ),
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
