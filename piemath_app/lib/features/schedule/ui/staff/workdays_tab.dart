import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/format/person_name.dart';
import '../../../../core/time/date_mn.dart';
import '../../../../core/time/ub_time.dart';
import '../../../../core/time/weekday.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/native/native.dart';
import '../../data/staff_schedule_models.dart';
import '../../data/staff_schedule_repository.dart';
import '../../domain/staff_schedule_logic.dart';
import 'staff_actions.dart';

/// Seed-ээр сондгойгоос хуулсан, эзэн шалгаагүй тэгш 7 хоногийн мөр (вэбийн `UNCHECKED_NOTE`).
const _uncheckedNote = 'тэгш долоо хоног — эзэн шалгах';

/// «Багшийн ажлын өдөр» (вэбийн `TeacherWorkDays`): багш, гарагийн хүснэгт, сондгой/тэгш ээлж,
/// хүчинтэй хугацаа, нэг өдрийн онцгой тохиолдол. Багш зөвхөн харна; Багш+, Админ засна.
class StaffWorkDaysTab extends ConsumerStatefulWidget {
  const StaffWorkDaysTab({super.key, required this.perms, this.today});

  final StaffPermissions perms;
  final UbDateTime? today;

  @override
  ConsumerState<StaffWorkDaysTab> createState() => _StaffWorkDaysTabState();
}

class _StaffWorkDaysTabState extends ConsumerState<StaffWorkDaysTab> {
  late final UbDateTime _today = (widget.today ?? UbDateTime.now()).startOfDay;
  late UbDateTime _monday = mondayOfDay(_today);
  late int _tabParity = weekParityOf(_today);

  /// Optimistic нүд: `teacherId|parity` → JS гарагууд.
  Map<String, Set<int>> _patch = const {};

  bool get _edit => widget.perms.canEditRoster;

  Future<void> _toggle(WorkDaysData data, String teacherId, int parity, int weekday) async {
    final key = '$teacherId|$parity';
    final current = _patch[key] ?? _serverDays(data, key);
    final next = {...current};
    if (!next.remove(weekday)) next.add(weekday);
    unawaited(HapticFeedback.selectionClick());
    final repo = ref.read(staffScheduleRepositoryProvider);
    final order = _sortOrder(data, teacherId);
    final result = await optimisticMutation<Map<String, Set<int>>, void>(
      read: () => _patch,
      write: (p) {
        if (mounted) setState(() => _patch = p);
      },
      apply: (p) => {...p, key: next},
      commit: () =>
          repo.putWorkDays(teacherId: teacherId, weekdays: next.toList()..sort(), parity: parity, sortOrder: order),
      revert: (p) => {...p}..remove(key),
    );
    if (!mounted) return;
    if (result.isOk) {
      ref
        ..invalidate(workDaysProvider)
        ..invalidate(dayPlanProvider);
      // Шинэ өгөгдөл ирсний дараа давхаргыг арилгана (хооронд нь дахин дарсан бол үлдээнэ).
      try {
        await ref.read(workDaysProvider(_monday.dateKey).future);
      } catch (_) {}
      if (mounted && identical(_patch[key], next)) setState(() => _patch = {..._patch}..remove(key));
    } else {
      showMutationError(context, result);
    }
  }

  static Set<int> _serverDays(WorkDaysData data, String key) => {
    for (final r in data.rows)
      if ('${r.teacherId}|${r.parity}' == key) r.weekday,
  };

  static int? _sortOrder(WorkDaysData data, String teacherId) {
    int? best;
    for (final r in data.rows) {
      if (r.teacherId == teacherId && (best == null || r.sortOrder < best)) best = r.sortOrder;
    }
    return best;
  }

  /// Хүснэгтийн дараалал, дараа нь хүснэгтэд ороогүй багш нэрээр.
  static List<({String id, String name})> _teachers(WorkDaysData data, List<TeacherOption> options) {
    final names = <String, String>{};
    final order = <String, int>{};
    for (final r in data.rows) {
      names[r.teacherId] = withPlus(r.teacherName, r.teacherRole);
      final o = order[r.teacherId];
      if (o == null || r.sortOrder < o) order[r.teacherId] = r.sortOrder;
    }
    for (final t in options) {
      names[t.id] = teacherLabel(t);
    }
    final ids = {...options.map((t) => t.id), ...order.keys}.toList()
      ..sort((a, b) {
        final o = (order[a] ?? 1 << 30).compareTo(order[b] ?? 1 << 30);
        return o != 0 ? o : (names[a] ?? '').compareTo(names[b] ?? '');
      });
    return [for (final id in ids) (id: id, name: names[id] ?? '')];
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(workDaysProvider(_monday.dateKey));
    final optionsAsync = ref.watch(teacherOptionsProvider);
    final data = async.value;
    final options = optionsAsync.value;
    if (data == null || options == null) {
      return async.hasError || optionsAsync.hasError
          ? ErrorState(
              onRetry: () => ref
                ..invalidate(workDaysProvider)
                ..invalidate(teacherOptionsProvider),
            )
          : const LoadingState(key: ValueKey('staff-roster-skeleton'), cards: 5);
    }
    final parity = data.config.fixed ? 0 : _tabParity;
    final teachers = _teachers(data, options);
    final unchecked = {
      for (final r in data.rows)
        if (r.note == _uncheckedNote && r.parity == parity && !_patch.containsKey('${r.teacherId}|$parity'))
          r.teacherId,
    };
    final todayKey = _today.dateKey;
    final cfg = data.config;
    final outOfRange =
        (cfg.validFrom != null && todayKey.compareTo(cfg.validFrom!) < 0) ||
        (cfg.validTo != null && todayKey.compareTo(cfg.validTo!) > 0);
    final c = context.colors;

    return RefreshIndicator(
      onRefresh: () => ref.refresh(workDaysProvider(_monday.dateKey).future),
      child: CustomScrollView(
        key: const ValueKey('staff-roster-list'),
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Wrap(
                          spacing: AppSpace.sm,
                          runSpacing: AppSpace.xs,
                          children: [
                            MetaChip(label: 'Энэ долоо хоног: ${parityLabels[weekParityOf(_today)]}'),
                            MetaChip(label: cfg.fixed ? 'Тогтмол' : 'Сондгой / Тэгш', icon: AppIcons.repeat),
                            if (cfg.validFrom != null || cfg.validTo != null)
                              MetaChip(label: '${cfg.validFrom ?? ''} – ${cfg.validTo ?? ''}'),
                          ],
                        ),
                      ),
                      if (_edit)
                        IconButton(
                          tooltip: 'Хүснэгтийн тохиргоо',
                          icon: const Icon(AppIcons.settings),
                          onPressed: () => unawaited(editRosterConfig(context, config: cfg)),
                        ),
                    ],
                  ),
                  if (outOfRange && _edit)
                    _Note(
                      icon: AppIcons.warning,
                      color: c.warning,
                      text: 'Хүснэгтийн хүчинтэй хугацаа өнөөдрийг хамрахгүй байна, хугацааг шинэчилнэ үү',
                    ),
                  if (!cfg.fixed)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpace.sm),
                      child: Wrap(
                        spacing: AppSpace.sm,
                        children: [
                          for (final p in const [1, 2])
                            ChoiceChip(
                              label: Text(
                                '${parityLabels[p]} долоо хоног${p == weekParityOf(_today) ? ' (энэ долоо хоног)' : ''}',
                              ),
                              selected: _tabParity == p,
                              onSelected: (_) => setState(() => _tabParity = p),
                            ),
                        ],
                      ),
                    ),
                  if (unchecked.isNotEmpty && _edit)
                    _Note(
                      icon: AppIcons.warning,
                      color: c.warning,
                      text:
                          'Тэгш долоо хоногийг сондгойгоос түр хуулсан (${unchecked.length} багш), эзний хүснэгтээр '
                          'шалгаж засна уу. Багшийн мөрийг засахад тэмдэглэл арилна',
                    ),
                ],
              ),
            ),
          ),
          if (teachers.isEmpty)
            const SliverToBoxAdapter(child: EmptyState(title: 'Багшийн бүртгэл алга'))
          else
            SliverList.builder(
              itemCount: teachers.length,
              itemBuilder: (context, i) {
                final t = teachers[i];
                final key = '${t.id}|$parity';
                final days = _patch[key] ?? _serverDays(data, key);
                return _TeacherRow(
                  name: t.name,
                  days: days,
                  unchecked: unchecked.contains(t.id) && _edit,
                  onToggle: _edit ? (wd) => unawaited(_toggle(data, t.id, parity, wd)) : null,
                );
              },
            ),
          SliverToBoxAdapter(child: _exceptionsHeader(context, teachers)),
          if (data.exceptions.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: AppSpace.gutter, vertical: AppSpace.sm),
                child: Text('Энэ долоо хоногт онцгой өдөр алга'),
              ),
            )
          else
            SliverList.builder(
              itemCount: data.exceptions.length,
              itemBuilder: (context, i) {
                final x = data.exceptions[i];
                return ItemRow(
                  title: staffName(firstName: x.teacherFirstName, lastName: x.teacherLastName, role: x.teacherRole),
                  meta: [
                    if (parseDateKey(x.date) case final d?) DateMn.longWithWeekday(d, shortWeekday: true) else x.date,
                    x.note,
                  ],
                  trailing: MetaChip(
                    label: x.working ? 'Ажиллана' : 'Ажиллахгүй',
                    tone: x.working ? ChipTone.info : ChipTone.warning,
                  ),
                );
              },
            ),
          const SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl)),
        ],
      ),
    );
  }

  Widget _exceptionsHeader(BuildContext context, List<({String id, String name})> teachers) {
    final end = _monday.addDays(6);
    String short(UbDateTime d) => '${d.month.toString().padLeft(2, '0')}.${d.day.toString().padLeft(2, '0')}';
    final thisWeek = mondayOfDay(_today);
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xl, AppSpace.xs, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Semantics(header: true, child: Text('Онцгой өдөр', style: context.text.titleMedium)),
              ),
              IconButton(
                tooltip: 'Өмнөх долоо хоног',
                icon: const Icon(AppIcons.back),
                onPressed: () => setState(() => _monday = _monday.addDays(-7)),
              ),
              TextButton(
                onPressed: _monday.isSameDay(thisWeek) ? null : () => setState(() => _monday = thisWeek),
                child: Text('${short(_monday)} – ${short(end)}'),
              ),
              IconButton(
                tooltip: 'Дараагийн долоо хоног',
                icon: const Icon(AppIcons.forward),
                onPressed: () => setState(() => _monday = _monday.addDays(7)),
              ),
            ],
          ),
          if (_edit)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.sm),
              child: OutlinedButton.icon(
                icon: const Icon(AppIcons.add, size: 18),
                label: const Text('Онцгой өдөр бүртгэх'),
                onPressed: () => unawaited(
                  addWorkException(
                    context,
                    teachers: teachers,
                    initialDate: _monday.isSameDay(thisWeek) ? _today : _monday,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.color, required this.text});

  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(top: AppSpace.sm),
    padding: const EdgeInsets.all(AppSpace.md),
    decoration: BoxDecoration(color: context.colors.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.sm)),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: AppSpace.sm),
        Expanded(child: Text(text, style: context.text.bodyMedium)),
      ],
    ),
  );
}

/// Нэг багшийн мөр: нэр, доор нь Да…Ня 7 нүд (48dp-ээс багагүй).
class _TeacherRow extends StatelessWidget {
  const _TeacherRow({required this.name, required this.days, required this.unchecked, this.onToggle});

  final String name;

  /// JS гарагууд.
  final Set<int> days;
  final bool unchecked;
  final ValueChanged<int>? onToggle;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(name, style: context.text.titleSmall)),
              if (unchecked)
                Tooltip(
                  message: 'Эзний хүснэгтээр шалгах',
                  child: Icon(AppIcons.warning, size: 18, color: c.warning),
                ),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          Row(children: [for (var mn = 1; mn <= 7; mn++) Expanded(child: _cell(context, jsWeekdayFromMn(mn), mn))]),
        ],
      ),
    );
  }

  Widget _cell(BuildContext context, int js, int mn) {
    final c = context.colors;
    final on = days.contains(js);
    return Semantics(
      label: '$name, ${weekdayNameMn(mn)}',
      toggled: on,
      button: onToggle != null,
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2),
        child: Material(
          color: on ? c.brandTint : c.surfaceSunken,
          borderRadius: BorderRadius.circular(AppRadius.sm),
          child: InkWell(
            key: ValueKey('roster:$name:$js'),
            borderRadius: BorderRadius.circular(AppRadius.sm),
            onTap: onToggle == null ? null : () => onToggle!(js),
            child: SizedBox(
              height: AppSizes.minTap,
              child: Center(
                child: Text(
                  weekdayShortMn(mn),
                  style: context.text.labelLarge?.copyWith(
                    color: on ? c.brand : c.inkDim,
                    fontWeight: on ? FontWeight.w700 : FontWeight.w400,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
