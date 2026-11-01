import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_models.dart';
import '../domain/board_logic.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

/// Цагийн бүртгэл (`/app/teacher-hours`): сарын орсон хичээл, нийт цаг. Цагийн хөлс хадгалагддаггүй.
class TeacherHoursScreen extends ConsumerStatefulWidget {
  const TeacherHoursScreen({super.key});

  @override
  ConsumerState<TeacherHoursScreen> createState() => _TeacherHoursScreenState();
}

class _TeacherHoursScreenState extends ConsumerState<TeacherHoursScreen> {
  String? _month;

  @override
  Widget build(BuildContext context) {
    final today = ref.watch(teacherTodayProvider);
    final current = today.dateKey.substring(0, 7);
    final month = _month ?? current;
    final async = ref.watch(teacherHoursProvider(month));
    final monthDay = parseDateKey('$month-01')!;
    return Scaffold(
      appBar: AppBar(title: const Text('Цагийн бүртгэл')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Өмнөх сар',
                constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
                icon: const Icon(TeacherIcons.prevDay),
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
                icon: const Icon(TeacherIcons.nextDay),
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
              final row = h.teachers.firstOrNull;
              if (row == null || row.sessions.isEmpty) {
                return [
                  const SizedBox(
                    height: 260,
                    child: EmptyState(icon: TeacherIcons.hours, title: 'Энэ сард орсон хичээл алга'),
                  ),
                ];
              }
              return _rows(context, row);
            },
          ),
        ],
      ),
    );
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
