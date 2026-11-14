import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/weekday.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../data/hub_models.dart';
import '../data/my_class_repository.dart';
import '../domain/hub_logic.dart';
import 'common.dart';
import 'day_row.dart';

/// «Ирц» таб: бүх хугацааны нийт (сервер тооцсон хувь) + сар бүрийн хуанли (Даваагаас).
/// Тайлбар (legend) ХАМГИЙН ДООР. `/attendance/my` — бүх түүх нэг дуудлагаар.
class AttendanceTab extends ConsumerStatefulWidget {
  const AttendanceTab({super.key, this.today});

  final String? today;

  @override
  ConsumerState<AttendanceTab> createState() => _AttendanceTabState();
}

class _AttendanceTabState extends ConsumerState<AttendanceTab> {
  static const _step = 3;
  int _shown = _step;

  @override
  Widget build(BuildContext context) {
    final overview = ref.watch(hubOverviewProvider);
    final rows = ref.watch(myAttendanceProvider);
    final today = widget.today ?? todayKey();
    return RefreshIndicator(
      onRefresh: () => refreshProviders(ref, [hubOverviewProvider, myAttendanceProvider]),
      child: ListView(
        padding: const EdgeInsets.all(AppSpace.gutter),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Бүх хугацааны ирц', style: context.text.labelMedium?.copyWith(color: context.colors.inkDim)),
                const SizedBox(height: AppSpace.sm),
                AsyncBody(
                  value: overview,
                  compactError: true,
                  onRetry: () => ref.invalidate(hubOverviewProvider),
                  loading: const SkeletonPulse(child: SkeletonRows(rows: 2)),
                  builder: (o) => AttendanceTotalsView(totals: o.attendance),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.lg),
          AsyncBody(
            value: rows,
            onRetry: () => ref.invalidate(myAttendanceProvider),
            loading: const SkeletonPulse(child: SkeletonCard(lines: 6)),
            builder: (list) {
              final months = attendanceByMonth(list);
              if (months.isEmpty) {
                return const EmptyState(
                  icon: AppIcons.calendar,
                  title: 'Ирцийн түүх алга',
                  message: 'Багш ирц тэмдэглэхэд энд хуанлиар харагдана',
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final (month, days) in months.take(_shown)) ...[
                    AttendanceMonthGrid(month: month, days: days, today: today),
                    const SizedBox(height: AppSpace.md),
                  ],
                  if (months.length > _shown)
                    OutlinedButton.icon(
                      icon: const Icon(AppIcons.expand, size: 18),
                      label: const Text('Өмнөх сарууд'),
                      onPressed: () => setState(() => _shown += _step),
                    ),
                  const SizedBox(height: AppSpace.lg),
                  MarkLegend(
                    title: 'Ирцийн тайлбар',
                    items: [for (final s in attendanceOrder) attendanceMeta(s)],
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

/// Нийт хувь + төлөв бүрийн тоо.
class AttendanceTotalsView extends StatelessWidget {
  const AttendanceTotalsView({super.key, required this.totals});

  final AttendanceTotals totals;

  @override
  Widget build(BuildContext context) {
    if (totals.total == 0) return Text('Ирц хараахан тэмдэглэгдээгүй', style: context.text.bodyMedium);
    return Wrap(
      spacing: AppSpace.xl,
      runSpacing: AppSpace.sm,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        Semantics(
          label: 'Ирц ${totals.rate} хувь, ${totals.total} хичээлээс',
          excludeSemantics: true,
          child: Text.rich(
            TextSpan(
              children: [
                TextSpan(text: '${totals.rate}', style: context.text.displayMedium),
                TextSpan(text: '%', style: context.text.titleLarge?.copyWith(color: context.colors.inkDim)),
                TextSpan(text: '  ${totals.total} хичээлээс', style: context.text.bodySmall),
              ],
            ),
          ),
        ),
        Wrap(
          spacing: AppSpace.lg,
          runSpacing: AppSpace.xs,
          children: [
            for (final s in attendanceOrder)
              Semantics(
                label: '${attendanceMeta(s).label} ${totals.count(s)}',
                excludeSemantics: true,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    MarkIcon(attendanceMeta(s).glyph, color: attendanceMeta(s).tone.color(context.colors), size: 16),
                    const SizedBox(width: 4),
                    Text(attendanceMeta(s).label, style: context.text.bodySmall),
                    const SizedBox(width: 4),
                    Text('${totals.count(s)}', style: context.text.titleSmall),
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// Нэг сарын ирцийн хуанли (Да … Ня багана).
class AttendanceMonthGrid extends StatelessWidget {
  const AttendanceMonthGrid({super.key, required this.month, required this.days, required this.today});

  final String month;
  final Map<String, AttendanceRow> days;
  final String today;

  @override
  Widget build(BuildContext context) {
    final cells = monthCells(month);
    final c = context.colors;
    return AppCard(
      padding: const EdgeInsets.all(AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Semantics(header: true, child: Text(monthTitle(month), style: context.text.titleSmall)),
              ),
              Text('${days.length} хичээл', style: context.text.bodySmall),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          ExcludeSemantics(
            child: Row(
              children: [
                for (var d = 1; d <= 7; d++)
                  Expanded(
                    child: Text(
                      weekdayShortMn(d),
                      textAlign: TextAlign.center,
                      style: context.text.labelSmall?.copyWith(color: c.inkDim, fontWeight: FontWeight.w700),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.xs),
          for (var row = 0; row * 7 < cells.length; row++)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  for (var col = 0; col < 7; col++)
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: _Cell(
                          dayKey: row * 7 + col < cells.length ? cells[row * 7 + col] : null,
                          row: row * 7 + col < cells.length && cells[row * 7 + col] != null
                              ? days[cells[row * 7 + col]]
                              : null,
                          today: today,
                        ),
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

class _Cell extends StatelessWidget {
  const _Cell({required this.dayKey, required this.row, required this.today});

  final String? dayKey;
  final AttendanceRow? row;
  final String today;

  @override
  Widget build(BuildContext context) {
    final key = dayKey;
    if (key == null) return const SizedBox(height: 44);
    final c = context.colors;
    final isToday = key == today;
    final num = dayNumberOf(key);
    final status = row?.status;
    if (row == null || status == null) {
      return ExcludeSemantics(
        child: Container(
          height: 44,
          alignment: Alignment.topCenter,
          padding: const EdgeInsets.only(top: 6),
          decoration: isToday
              ? BoxDecoration(border: Border.all(color: c.brandBright), borderRadius: BorderRadius.circular(AppRadius.sm))
              : null,
          child: Text('$num', style: context.text.labelSmall?.copyWith(color: c.inkDim.withValues(alpha: 0.6))),
        ),
      );
    }
    final meta = attendanceMeta(status);
    final tone = meta.tone.color(c);
    final label = '${dayTitle(key)}, ${meta.label}';
    final classroom = row!.classroom;
    final cell = Container(
      height: 44,
      decoration: BoxDecoration(
        // Маш зөөлөн дэвсгэр (STATUS §6.4: 12–18%) + хүрээ + дүрс — өнгө дангаараа биш.
        color: tone.withValues(alpha: 0.12),
        border: Border.all(color: isToday ? c.brandBright : tone, width: isToday ? 2 : 1),
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('$num', style: context.text.labelSmall?.copyWith(fontWeight: FontWeight.w700)),
          MarkIcon(meta.glyph, color: tone, size: 14),
        ],
      ),
    );
    return Semantics(
      label: label,
      button: classroom != null,
      excludeSemantics: true,
      child: Tooltip(
        message: label,
        excludeFromSemantics: true,
        child: classroom == null
            ? cell
            : InkWell(
                borderRadius: BorderRadius.circular(AppRadius.sm),
                onTap: () => context.push(dayPath(key, classroom.id)),
                child: cell,
              ),
      ),
    );
  }
}
