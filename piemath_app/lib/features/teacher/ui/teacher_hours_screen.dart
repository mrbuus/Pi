import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_models.dart';
import '../domain/board_logic.dart';
import 'teacher_hours_sheet_view.dart';
import 'teacher_widgets.dart';

/// `/app/teacher-hours`-ийн харагдац (вэбийн `TeacherHoursTabs`).
enum TeacherHoursTab {
  /// «Ажилласан цаг» — гараар бөглөдөг хагас сарын хүснэгт (эзэн 2026-11-08), анхдагч.
  sheet('Ажилласан цаг', 'Ажилласан цаг'),

  /// «Хуваариас тооцоолсон» — хуучин сарын тооцоо, лавлагаа болгон хэвээр (функц устгахгүй).
  computed('Хуваариас тооцоолсон', 'Хуваариас');

  const TeacherHoursTab(this.label, this.short);

  /// Бүтэн нэр (дэлгэц уншигчид).
  final String label;

  /// Утсанд багтах богино нэр.
  final String short;
}

/// Ажилласан цаг (`/app/teacher-hours`, вэбийн `TeacherHoursTabs`): «Ажилласан цаг» хүснэгт +
/// «Хуваариас тооцоолсон». Хуваарийн хэсэгт ч «Ажлын өдөр»-ийн ард мөн хүснэгт байна.
class TeacherHoursScreen extends StatefulWidget {
  const TeacherHoursScreen({super.key, this.initialTab = TeacherHoursTab.sheet});

  final TeacherHoursTab initialTab;

  @override
  State<TeacherHoursScreen> createState() => _TeacherHoursScreenState();
}

class _TeacherHoursScreenState extends State<TeacherHoursScreen> {
  late TeacherHoursTab _tab = widget.initialTab;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ажилласан цаг')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xs),
            child: SizedBox(
              width: double.infinity,
              child: SegmentedButton<TeacherHoursTab>(
                key: const ValueKey('teacher-hours-tab'),
                showSelectedIcon: false,
                segments: [
                  for (final t in TeacherHoursTab.values)
                    ButtonSegment(
                      value: t,
                      label: Semantics(
                        label: t.label,
                        excludeSemantics: true,
                        child: Text(t.short, maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                    ),
                ],
                selected: {_tab},
                onSelectionChanged: (v) => setState(() => _tab = v.first),
              ),
            ),
          ),
          Expanded(
            child: switch (_tab) {
              TeacherHoursTab.sheet => const TeacherHoursSheetView(),
              TeacherHoursTab.computed => const TeacherHoursComputedView(),
            },
          ),
        ],
      ),
    );
  }
}

/// «Хуваариас тооцоолсон»: сарын орсон хичээл, нийт цаг. Цагийн хөлс хадгалагддаггүй.
class TeacherHoursComputedView extends ConsumerStatefulWidget {
  const TeacherHoursComputedView({super.key});

  @override
  ConsumerState<TeacherHoursComputedView> createState() => _TeacherHoursComputedViewState();
}

class _TeacherHoursComputedViewState extends ConsumerState<TeacherHoursComputedView> {
  String? _month;

  @override
  Widget build(BuildContext context) {
    final today = ref.watch(teacherTodayProvider);
    final current = today.dateKey.substring(0, 7);
    final month = _month ?? current;
    final async = ref.watch(teacherHoursProvider(month));
    final monthDay = parseDateKey('$month-01')!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
      children: [
        Row(
          children: [
            IconButton(
              tooltip: 'Өмнөх сар',
              constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
              icon: const Icon(AppIcons.back),
              onPressed: () => setState(() => _month = shiftMonth(month, -1)),
            ),
            Expanded(
              child: Text(
                DateMn.month(monthDay, withYear: true),
                textAlign: TextAlign.center,
                style: context.text.titleSmall,
              ),
            ),
            IconButton(
              tooltip: 'Дараагийн сар',
              constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
              icon: const Icon(AppIcons.forward),
              onPressed: month.compareTo(current) >= 0 ? null : () => setState(() => _month = shiftMonth(month, 1)),
            ),
          ],
        ),
        const SizedBox(height: AppSpace.sm),
        ...async.when(
          skipLoadingOnRefresh: false,
          loading: () => [const LoadingState(cards: 2, padding: EdgeInsets.zero)],
          error: (e, _) => [
            SizedBox(
              height: 300,
              child: ErrorState(
                message: errorText(e, 'Цагийн бүртгэл нээгдсэнгүй'),
                onRetry: () => ref.invalidate(teacherHoursProvider(month)),
              ),
            ),
          ],
          data: (h) {
            if (ref.watch(hoursAllScopeProvider).value ?? false) return _allRows(context, h);
            final row = h.teachers.firstOrNull;
            if (row == null || row.sessions.isEmpty) {
              return [
                const SizedBox(
                  height: 260,
                  child: EmptyState(icon: AppIcons.timer, title: 'Энэ сард орсон хичээл алга'),
                ),
              ];
            }
            return _rows(context, row);
          },
        ),
      ],
    );
  }

  /// Нийт багшийн цаг (Админ, `time.review` эрхтэй Багш+): нийт дүн, багш бүр дэлгэгддэг.
  List<Widget> _allRows(BuildContext context, TeacherHours h) {
    final c = context.colors;
    final rows = h.teachers.where((r) => r.sessions.isNotEmpty).toList()
      ..sort((a, b) => a.teacherName.compareTo(b.teacherName));
    if (rows.isEmpty) {
      return [
        const SizedBox(
          height: 260,
          child: EmptyState(icon: AppIcons.timer, title: 'Энэ сард орсон хичээл алга'),
        ),
      ];
    }
    final minutes = rows.fold(0, (s, r) => s + r.minutes);
    final lessons = rows.fold(0, (s, r) => s + r.lessons);
    return [
      AppCard(
        child: Row(
          children: [
            Expanded(
              child: _Stat(label: 'Хичээл', value: '$lessons'),
            ),
            Expanded(
              child: _Stat(label: 'Нийт цаг', value: hoursLabel(minutes)),
            ),
          ],
        ),
      ),
      const SizedBox(height: AppSpace.md),
      AppCard(
        padding: EdgeInsets.zero,
        child: Column(
          children: [
            for (final (i, r) in rows.indexed) ...[
              if (i > 0) Divider(height: 1, color: c.line),
              Theme(
                data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  minTileHeight: teacherTap,
                  title: Text(r.teacherName, style: context.text.titleSmall),
                  subtitle: Text('${r.lessons} хичээл, ${hoursLabel(r.minutes)}', style: context.text.bodySmall),
                  children: [
                    for (final s in ([
                      ...r.sessions,
                    ]..sort((a, b) => a.date == b.date ? a.startMinute - b.startMinute : a.date.compareTo(b.date))))
                      ListTile(
                        dense: true,
                        title: Text(switch (parseDateKey(s.date)) {
                          final d? => DateMn.longWithWeekday(d, shortWeekday: true),
                          null => s.date,
                        }),
                        subtitle: Text(s.classroomName),
                        trailing: Text('${hm(s.startMinute)}–${hm(s.endMinute)}'),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    ];
  }

  List<Widget> _rows(BuildContext context, TeacherHoursRow row) {
    final c = context.colors;
    final sessions = [...row.sessions]
      ..sort((a, b) => a.date == b.date ? a.startMinute - b.startMinute : a.date.compareTo(b.date));
    return [
      AppCard(
        child: Row(
          children: [
            Expanded(
              child: _Stat(label: 'Хичээл', value: '${row.lessons}'),
            ),
            Expanded(
              child: _Stat(label: 'Нийт цаг', value: hoursLabel(row.minutes)),
            ),
          ],
        ),
      ),
      const SizedBox(height: AppSpace.md),
      AppCard(
        padding: EdgeInsets.zero,
        child: Column(
          children: [
            for (final (i, s) in sessions.indexed) ...[
              if (i > 0) Divider(height: 1, color: c.line),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(switch (parseDateKey(s.date)) {
                            final d? => DateMn.longWithWeekday(d, shortWeekday: true),
                            null => s.date,
                          }, style: context.text.titleSmall),
                          Text(s.classroomName, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                        ],
                      ),
                    ),
                    Text('${hm(s.startMinute)}–${hm(s.endMinute)}', style: context.text.bodyMedium),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    ];
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
      const SizedBox(height: AppSpace.xs),
      Text(value, style: context.text.headlineSmall),
    ],
  );
}
