import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/auth/session.dart';
import '../../../../core/auth/user_role.dart';
import '../../../../core/time/ub_time.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/native/native.dart';
import '../../../teacher/ui/teacher_hours_sheet_view.dart';
import '../../data/staff_schedule_models.dart';
import '../../data/staff_schedule_repository.dart';
import '../../domain/staff_schedule_logic.dart';
import 'day_tab.dart';
import 'pattern_tab.dart';
import 'schedule_icons.dart';
import 'special_days_sheet.dart';
import 'workdays_tab.dart';

/// Ажилтны хуваарийн харагдац (вэбийн `StaffScheduleBuilder`-ийн табууд).
enum StaffScheduleView {
  /// «Өдрийн хуваарь» (вэбийн `WeekBuilder`) — анхдагч (эзэн 2026-10-22).
  day('Өдөр', 'Өдрийн хуваарь'),

  /// «Ерөнхий хуваарь» (вэбийн `PatternOverview`) — 7 хоног бүр давтагдах тогтмол хуваарь.
  week('7 хоног', 'Ерөнхий хуваарь'),

  /// «Багшийн ажлын өдөр» (вэбийн `TeacherWorkDays`).
  workdays('Ажлын өдөр', 'Багшийн ажлын өдөр');

  const StaffScheduleView(this.label, this.fullLabel);

  final String label;

  /// Дэлгэц уншигчид.
  final String fullLabel;

  /// Шүүлтүүр (багш, анги) хамаарах эсэх.
  bool get filterable => this != workdays;
}

class _ViewController extends Notifier<StaffScheduleView> {
  @override
  StaffScheduleView build() => StaffScheduleView.day;

  void set(StaffScheduleView v) => state = v;
}

/// «Ажлын өдөр» доторх дэд харагдац (вэбийн «Багшийн ажлын өдөр»-ийн ард «Ажилласан цаг» таб, эзэн 2026-11-10).
/// Утсанд 4 дэх сегмент багтахгүй тул «Ажлын өдөр»-ийн дотор хоёр сонголтоор.
enum WorkdaysSubView {
  roster('Хүснэгт'),
  hours('Ажилласан цаг');

  const WorkdaysSubView(this.label);

  final String label;
}

class _SubController extends Notifier<WorkdaysSubView> {
  @override
  WorkdaysSubView build() => WorkdaysSubView.roster;

  void set(WorkdaysSubView v) => state = v;
}

/// «Ажлын өдөр»-ийн дэд харагдац.
final workdaysSubViewProvider = NotifierProvider<_SubController, WorkdaysSubView>(_SubController.new);

class _FilterController extends Notifier<ScheduleFilter> {
  // Вэбтэй адил анхдагчаар бүх хичээл (вэбийн өдрийн хуваарь шүүлтүүргүй, Багш ч бүгдийг харна).
  @override
  ScheduleFilter build() {
    ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
    return const ScheduleFilter.all();
  }

  void set(ScheduleFilter f) => state = f;
}

/// Хуваарийн идэвхтэй харагдац (хэсгийн AppBar-ын үйлдэл ч үүнийг харна).
final staffScheduleViewProvider = NotifierProvider<_ViewController, StaffScheduleView>(_ViewController.new);

/// Хуваарийн шүүлтүүр — Өдөр, 7 хоног хоёрт нийтлэг.
final staffScheduleFilterProvider = NotifierProvider<_FilterController, ScheduleFilter>(_FilterController.new);

StaffPermissions _perms(WidgetRef ref) {
  final session = ref.watch(sessionProvider);
  final role = session is SignedIn ? session.role : UserRole.unknown;
  return StaffPermissions.of(role, ref.watch(scheduleAccessProvider).value);
}

/// Ажилтны хуваарь (Багш, Багш+, Админ) — вэбийн `/app/schedule` (`StaffScheduleBuilder`).
///
/// Нэг л удирдлагын мөр: «Өдөр | 7 хоног | Ажлын өдөр» сегмент («Ажлын өдөр» дотор «Хүснэгт | Ажилласан
/// цаг» дэд сонголт); шүүлтүүр, онцгой өдөр нь AppBar-т
/// ([StaffScheduleActions]). Хэсгийн (hub) дэд табын мөр + энэ мөр + өдрийн тууз — өөр навигацийн мөргүй.
/// Энгийн Багш Багш+-тай ИЖИЛ харагдацтай (эзэн 2026-10-22), зөвхөн засах товч гарахгүй.
/// Засах эрхийг [StaffPermissions] вэб, API-ийн хамгаалалттай ижлээр тооцно.
class StaffScheduleScreen extends ConsumerWidget {
  const StaffScheduleScreen({super.key, this.today});

  /// Тест: «одоо».
  final UbDateTime? today;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final userId = session is SignedIn ? session.auth.userId : null;
    final perms = _perms(ref);
    final view = ref.watch(staffScheduleViewProvider);
    final filter = ref.watch(staffScheduleFilterProvider);
    final sub = ref.watch(workdaysSubViewProvider);
    // Идэвхгүй харагдацыг зурахгүй (вэбтэй адил буцаж ирэхэд шинэчлэгдэнэ). Хуваарийн хэсэг дэд табаа
    // хуруугаар солидог тул энд хэвтээ шудралтгүй — зөвхөн товчоор.
    final Widget body = switch (view) {
      StaffScheduleView.day => StaffDayTab(filter: filter, perms: perms, today: today),
      StaffScheduleView.week => StaffPatternTab(filter: filter, perms: perms, userId: userId, today: today),
      StaffScheduleView.workdays => switch (sub) {
        WorkdaysSubView.roster => StaffWorkDaysTab(perms: perms, today: today),
        WorkdaysSubView.hours => const TeacherHoursSheetView(),
      },
    };
    // Хэсгийн (hub) дотор өөрийн AppBar-ын мөр нуугдана (`toolbarHeight: 0`) — үйлдэл хэсгийн AppBar-т
    // гардаг тул энд давхар (дэлгэц уншигчид хоёр товч) үүсгэхгүй.
    final embedded = AppBarTheme.of(context).toolbarHeight == 0;
    return Scaffold(
      appBar: AppBar(title: const Text('Хуваарь'), actions: [if (!embedded) const StaffScheduleActions()]),
      body: Column(
        children: [
          _ViewSwitch(
            value: view,
            onChanged: (v) {
              unawaited(HapticFeedback.selectionClick());
              ref.read(staffScheduleViewProvider.notifier).set(v);
            },
          ),
          if (view == StaffScheduleView.workdays)
            _SubSwitch(
              value: sub,
              onChanged: (v) {
                unawaited(HapticFeedback.selectionClick());
                ref.read(workdaysSubViewProvider.notifier).set(v);
              },
            ),
          Expanded(child: body),
        ],
      ),
    );
  }
}

/// «Өдөр | 7 хоног | Ажлын өдөр» — тэнцүү өргөнтэй сегмент, бүтэн мөр.
class _ViewSwitch extends StatelessWidget {
  const _ViewSwitch({required this.value, required this.onChanged});

  final StaffScheduleView value;
  final ValueChanged<StaffScheduleView> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xs),
      child: SizedBox(
        width: double.infinity,
        child: SegmentedButton<StaffScheduleView>(
          key: const ValueKey('staff-schedule-view'),
          showSelectedIcon: false,
          style: const ButtonStyle(visualDensity: VisualDensity(vertical: -1)),
          segments: [
            for (final v in StaffScheduleView.values)
              ButtonSegment(
                value: v,
                label: Semantics(
                  label: v.fullLabel,
                  excludeSemantics: true,
                  child: Text(v.label, maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
              ),
          ],
          selected: {value},
          onSelectionChanged: (s) => onChanged(s.first),
        ),
      ),
    );
  }
}

/// «Хүснэгт | Ажилласан цаг» — «Ажлын өдөр»-ийн дэд сонголт (жижиг, зүүн тийш).
class _SubSwitch extends StatelessWidget {
  const _SubSwitch({required this.value, required this.onChanged});

  final WorkdaysSubView value;
  final ValueChanged<WorkdaysSubView> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, AppSpace.xs),
      child: Align(
        alignment: AlignmentDirectional.centerStart,
        child: Wrap(
          spacing: AppSpace.sm,
          children: [
            for (final v in WorkdaysSubView.values)
              ChoiceChip(
                key: ValueKey('workdays-sub:${v.name}'),
                label: Text(v.label),
                selected: value == v,
                showCheckmark: false,
                onSelected: (_) => onChanged(v),
              ),
          ],
        ),
      ),
    );
  }
}

/// Хуваарийн AppBar-ын үйлдэл: шүүлтүүр (одоогийн утгаа харуулна) + онцгой өдөр.
/// Хэсгийн (hub) дотор дэлгэцийн өөрийн AppBar нуугддаг тул хэсгийн AppBar-т ч мөн гарна.
class StaffScheduleActions extends ConsumerWidget {
  const StaffScheduleActions({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    if (session is! SignedIn || !session.role.isStaff) return const SizedBox.shrink();
    final perms = _perms(ref);
    final view = ref.watch(staffScheduleViewProvider);
    final filter = ref.watch(staffScheduleFilterProvider);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (view.filterable) _FilterButton(filter: filter, onTap: () => unawaited(pickScheduleFilter(context, ref))),
        IconButton(
          tooltip: 'Онцгой өдөр',
          icon: const Icon(AppIcons.calendarOff),
          onPressed: () => unawaited(showSpecialDaysSheet(context, canEdit: perms.canManageAny)),
        ),
      ],
    );
  }
}

/// Шүүлтүүрийн нэр: «Бүгд», «Миний», багшийн нэр, анги.
String scheduleFilterLabel(ScheduleFilter f) => switch (f.kind) {
  ScheduleFilterKind.all => 'Бүгд',
  ScheduleFilterKind.mine => 'Миний',
  _ => f.label ?? '',
};

class _FilterButton extends StatelessWidget {
  const _FilterButton({required this.filter, required this.onTap});

  final ScheduleFilter filter;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final on = !filter.isAll;
    final label = scheduleFilterLabel(filter);
    return Semantics(
      button: true,
      label: 'Шүүлтүүр: $label',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
        child: Material(
          color: on ? c.brandTint : Colors.transparent,
          shape: StadiumBorder(side: BorderSide(color: on ? c.brandTint : c.line)),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            key: const ValueKey('staff-schedule-filter'),
            onTap: onTap,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 40, maxWidth: 150),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(ScheduleIcons.filter, size: 18, color: on ? c.brand : c.inkDim),
                    const SizedBox(width: AppSpace.xs),
                    Flexible(
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: context.text.labelLarge?.copyWith(
                          color: on ? c.brand : c.ink,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Нэг цонхонд бүх шүүлтүүр: Бүгд, Миний хичээл, багш бүр, анги бүр (хайлттай). Нэг товшилтоор сонгоно.
Future<void> pickScheduleFilter(BuildContext context, WidgetRef ref) async {
  final messenger = ScaffoldMessenger.maybeOf(context);
  List<TeacherOption> teachers = const [];
  List<ClassroomOption> classes = const [];
  var failed = 0;
  try {
    teachers = [...await ref.read(teacherOptionsProvider.future)]
      ..sort((a, b) => teacherLabel(a).compareTo(teacherLabel(b)));
  } catch (_) {
    failed++;
  }
  try {
    classes = [...await ref.read(classroomOptionsProvider.future)]..sort((a, b) => a.name.compareTo(b.name));
  } catch (_) {
    failed++;
  }
  if (failed == 2) messenger?.showSnackBar(const SnackBar(content: Text(AppStrings.genericError)));
  if (!context.mounted) return;
  final picked = await showSelectSheet<ScheduleFilter>(
    context,
    title: 'Шүүлтүүр',
    selected: ref.read(staffScheduleFilterProvider),
    options: [
      const SelectOption(ScheduleFilter.all(), 'Бүгд', icon: AppIcons.calendar),
      const SelectOption(ScheduleFilter.mine(), 'Миний хичээл', icon: AppIcons.schedule),
      for (final t in teachers)
        SelectOption(
          ScheduleFilter.teacher(t.id, teacherLabel(t)),
          teacherLabel(t),
          subtitle: 'Багш',
          icon: AppIcons.user,
        ),
      for (final x in classes)
        SelectOption(
          ScheduleFilter.classroom(x.id, shortClass(x.name)),
          shortClass(x.name),
          subtitle: 'Анги, ${branchOf(x.name)}',
          icon: AppIcons.myClass,
        ),
    ],
  );
  if (picked != null) ref.read(staffScheduleFilterProvider.notifier).set(picked.value);
}
