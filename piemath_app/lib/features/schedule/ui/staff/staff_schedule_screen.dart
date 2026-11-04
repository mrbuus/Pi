import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/auth/session.dart';
import '../../../../core/auth/user_role.dart';
import '../../../../core/time/ub_time.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/native/native.dart';
import '../../data/staff_schedule_repository.dart';
import '../../domain/staff_schedule_logic.dart';
import 'day_tab.dart';
import 'pattern_tab.dart';
import 'special_days_sheet.dart';
import 'workdays_tab.dart';

/// Ажилтны хуваарь (Багш, Багш+, Админ) — вэбийн `/app/schedule` (`StaffScheduleBuilder`).
///
/// Энгийн Багш Багш+-тай ИЖИЛ табуудыг харна (эзэн 2026-10-22), зөвхөн засах товч гарахгүй.
/// Засах эрхийг [StaffPermissions] вэб, API-ийн хамгаалалттай ижлээр тооцно.
class StaffScheduleScreen extends ConsumerStatefulWidget {
  const StaffScheduleScreen({super.key, this.today});

  /// Тест: «одоо».
  final UbDateTime? today;

  @override
  ConsumerState<StaffScheduleScreen> createState() => _StaffScheduleScreenState();
}

class _StaffScheduleScreenState extends ConsumerState<StaffScheduleScreen> {
  ScheduleFilter _filter = const ScheduleFilter.all();

  Future<void> _pickTeacher() async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    try {
      final teachers = [...await ref.read(teacherOptionsProvider.future)]
        ..sort((a, b) => teacherLabel(a).compareTo(teacherLabel(b)));
      if (!mounted) return;
      final picked = await showSelectSheet<String>(
        context,
        title: 'Багшаар шүүх',
        selected: _filter.kind == ScheduleFilterKind.teacher ? _filter.id : null,
        options: [for (final t in teachers) SelectOption(t.id, teacherLabel(t))],
      );
      if (picked != null) setState(() => _filter = ScheduleFilter.teacher(picked.value, picked.label));
    } catch (_) {
      messenger?.showSnackBar(const SnackBar(content: Text(AppStrings.genericError)));
    }
  }

  Future<void> _pickClassroom() async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    try {
      final classes = [...await ref.read(classroomOptionsProvider.future)]..sort((a, b) => a.name.compareTo(b.name));
      if (!mounted) return;
      final picked = await showSelectSheet<String>(
        context,
        title: 'Ангиар шүүх',
        selected: _filter.kind == ScheduleFilterKind.classroom ? _filter.id : null,
        options: [for (final x in classes) SelectOption(x.id, shortClass(x.name), subtitle: branchOf(x.name))],
      );
      if (picked != null) setState(() => _filter = ScheduleFilter.classroom(picked.value, picked.label));
    } catch (_) {
      messenger?.showSnackBar(const SnackBar(content: Text(AppStrings.genericError)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final role = session is SignedIn ? session.role : UserRole.unknown;
    final userId = session is SignedIn ? session.auth.userId : null;
    final access = ref.watch(scheduleAccessProvider).value;
    final perms = StaffPermissions.of(role, access);
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Хуваарь'),
          actions: [
            IconButton(
              tooltip: 'Онцгой өдөр',
              icon: const Icon(AppIcons.calendarOff),
              onPressed: () => unawaited(showSpecialDaysSheet(context, canEdit: perms.canManageAny)),
            ),
          ],
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'Өдрийн хуваарь'),
              Tab(text: 'Ерөнхий хуваарь'),
              Tab(text: 'Багшийн ажлын өдөр'),
            ],
          ),
        ),
        // TabBarView биш: хэсгийн (hub) дэд табууд хуруугаар гулсдаг, өдрийн хуваарь ч өдрөө шудардаг тул
        // энд зөвхөн товчоор солино. Идэвхгүй табыг зурахгүй (вэбтэй адил буцаж ирэхэд шинэчлэгдэнэ).
        body: Builder(
          builder: (context) {
            final tabs = DefaultTabController.of(context);
            return AnimatedBuilder(
              animation: tabs,
              builder: (context, _) {
                final filterBar = _FilterBar(
                  filter: _filter,
                  onChanged: (f) => setState(() => _filter = f),
                  onTeacher: _pickTeacher,
                  onClassroom: _pickClassroom,
                );
                return switch (tabs.index) {
                  0 => Column(
                    children: [
                      filterBar,
                      Expanded(
                        child: StaffDayTab(filter: _filter, perms: perms, today: widget.today),
                      ),
                    ],
                  ),
                  1 => Column(
                    children: [
                      filterBar,
                      Expanded(
                        child: StaffPatternTab(filter: _filter, perms: perms, userId: userId, today: widget.today),
                      ),
                    ],
                  ),
                  _ => StaffWorkDaysTab(perms: perms, today: widget.today),
                };
              },
            );
          },
        ),
      ),
    );
  }
}

/// Шүүлтүүрийн чипүүд: Бүгд, Миний (өөрийн хичээл), Багш, Анги.
class _FilterBar extends StatelessWidget {
  const _FilterBar({required this.filter, required this.onChanged, required this.onTeacher, required this.onClassroom});

  final ScheduleFilter filter;
  final ValueChanged<ScheduleFilter> onChanged;
  final Future<void> Function() onTeacher;
  final Future<void> Function() onClassroom;

  @override
  Widget build(BuildContext context) {
    final teacher = filter.kind == ScheduleFilterKind.teacher;
    final classroom = filter.kind == ScheduleFilterKind.classroom;
    // Wrap: утсанд чип нуугдахгүй (хажуу тийш гүйлгэх шаардлагагүй), багтахгүй бол 2 мөр.
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
      child: Wrap(
        spacing: AppSpace.sm,
        children: [
          ChoiceChip(
            label: const Text('Бүгд'),
            selected: filter.isAll,
            onSelected: (_) => onChanged(const ScheduleFilter.all()),
          ),
          ChoiceChip(
            label: const Text('Миний'),
            selected: filter.kind == ScheduleFilterKind.mine,
            onSelected: (_) => onChanged(const ScheduleFilter.mine()),
          ),
          FilterChip(
            label: Text(teacher ? filter.label! : 'Багш'),
            selected: teacher,
            showCheckmark: false,
            onSelected: (_) => unawaited(onTeacher()),
            onDeleted: teacher ? () => onChanged(const ScheduleFilter.all()) : null,
            deleteButtonTooltipMessage: 'Шүүлтүүр арилгах',
          ),
          FilterChip(
            label: Text(classroom ? filter.label! : 'Анги'),
            selected: classroom,
            showCheckmark: false,
            onSelected: (_) => unawaited(onClassroom()),
            onDeleted: classroom ? () => onChanged(const ScheduleFilter.all()) : null,
            deleteButtonTooltipMessage: 'Шүүлтүүр арилгах',
          ),
        ],
      ),
    );
  }
}
