import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../../../core/ui/ui.dart';
import '../data/activity_models.dart';
import '../data/activity_repository.dart';
import 'inline_message.dart';

/// `/app/activity` — сар бүрийн хуанли дээр бодсон бодлогын тоо. Дараалал, амжилтын оноо, зэмлэл үгүй:
/// зөвхөн «аль өдөр хэд бодсон»-ыг харуулна, өдөр алгассан нь алдаа биш.
class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key, this.today});

  /// Тестэд тогтмол өдөр өгнө.
  final UbDateTime? today;

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  late final UbDateTime _today = (widget.today ?? UbDateTime.now()).startOfDay;
  late int _year = _today.year;
  late int _month = _today.month;

  void _shift(int delta) {
    var m = _month + delta;
    var y = _year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setState(() {
      _year = y;
      _month = m;
    });
  }

  bool get _canGoNext => _year < _today.year || (_year == _today.year && _month < _today.month);

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(activityYearProvider(_year));
    return Scaffold(
      appBar: AppBar(title: const Text('Идэвх')),
      body: async.when(
        loading: () => const LoadingState(cards: 2),
        error: (e, _) => ErrorState(
          title: 'Идэвх ачаалж чадсангүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(activityYearProvider(_year)),
        ),
        data: (data) => ListView(
          padding: const EdgeInsets.all(AppSpace.gutter),
          children: [
            _Header(year: _year, month: _month, canNext: _canGoNext, onPrev: () => _shift(-1), onNext: () => _shift(1)),
            const SizedBox(height: AppSpace.md),
            AppCard(
              child: _MonthGrid(year: _year, month: _month, data: data, today: _today),
            ),
            const SizedBox(height: AppSpace.md),
            _MonthSummary(data: data, year: _year, month: _month),
            const SizedBox(height: AppSpace.lg),
            const _Legend(),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.year,
    required this.month,
    required this.canNext,
    required this.onPrev,
    required this.onNext,
  });

  final int year;
  final int month;
  final bool canNext;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          tooltip: 'Өмнөх сар',
          constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
          onPressed: onPrev,
          icon: const Icon(AppIcons.back),
        ),
        Expanded(
          child: Text(
            DateMn.month(UbDateTime(year, month), withYear: true),
            textAlign: TextAlign.center,
            style: context.text.titleMedium,
          ),
        ),
        IconButton(
          tooltip: 'Дараагийн сар',
          constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
          onPressed: canNext ? onNext : null,
          icon: const Icon(AppIcons.forward),
        ),
      ],
    );
  }
}

Color _levelFill(AppColors c, int level) => switch (level) {
  1 => c.brand.withValues(alpha: 0.18),
  2 => c.brand.withValues(alpha: 0.38),
  3 => c.brand.withValues(alpha: 0.65),
  4 => c.brand,
  _ => Colors.transparent,
};

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({required this.year, required this.month, required this.data, required this.today});

  final int year;
  final int month;
  final ActivityYear data;
  final UbDateTime today;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final first = UbDateTime(year, month);
    final daysInMonth = DateTime.utc(year, month + 1, 0).day;
    final lead = first.weekday - 1;
    final cells = <Widget>[
      for (var w = 1; w <= 7; w++)
        Center(
          child: Text(weekdayShortMn(w), style: context.text.labelSmall?.copyWith(color: c.inkDim)),
        ),
      for (var i = 0; i < lead; i++) const SizedBox.shrink(),
      for (var d = 1; d <= daysInMonth; d++) _cell(context, UbDateTime(year, month, d)),
    ];
    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 4,
      crossAxisSpacing: 4,
      childAspectRatio: 1,
      children: cells,
    );
  }

  Widget _cell(BuildContext context, UbDateTime date) {
    final c = context.colors;
    final day = data.byKey[date.dateKey];
    final count = day?.count ?? 0;
    final level = day?.level ?? 0;
    final isFuture = date.compareTo(today) > 0;
    final isToday = date.isSameDay(today);
    final onFill = level >= 3;
    return Semantics(
      label:
          '${DateMn.longWithWeekday(date)}: ${isFuture
              ? 'ирээдүй'
              : count > 0
              ? '$count бодлого'
              : 'бодлого бодоогүй'}',
      excludeSemantics: true,
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: _levelFill(c, level),
          borderRadius: BorderRadius.circular(AppRadius.sm),
          border: Border.all(color: isToday ? c.brand : c.line, width: isToday ? 2 : 1),
        ),
        child: Text(
          '${date.day}',
          style: context.text.bodyMedium?.copyWith(
            color: isFuture ? c.inkDim.withValues(alpha: 0.5) : (onFill ? c.onBrand : c.ink),
            fontWeight: count > 0 ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
      ),
    );
  }
}

class _MonthSummary extends StatelessWidget {
  const _MonthSummary({required this.data, required this.year, required this.month});

  final ActivityYear data;
  final int year;
  final int month;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final total = data.monthTotal(month);
    final active = data.days.where((d) => d.date.month == month && d.count > 0).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(AppIcons.calendarCheck, size: 20, color: c.brand),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              child: Text(
                total == 0
                    ? 'Энэ сард бодлого бодсон тэмдэглэл алга'
                    : 'Энэ сард ${active.length} өдөр, нийт $total бодлого бодсон',
                style: context.text.bodyMedium,
              ),
            ),
          ],
        ),
        if (active.isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          AppCard(
            child: Column(
              children: [
                for (final (i, d) in active.reversed.indexed) ...[
                  if (i > 0) Divider(height: AppSpace.lg, color: c.line),
                  Row(
                    children: [
                      Expanded(child: Text(DateMn.longWithWeekday(d.date), style: context.text.bodyMedium)),
                      Text('${d.count} бодлого', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// Тайлбар жагсаалтын доор (RULES §3). Босго нь серверийнхтэй ижил.
class _Legend extends StatelessWidget {
  const _Legend();

  static const _items = [(1, '1-3'), (2, '4-7'), (3, '8-14'), (4, '15 ба түүнээс дээш')];

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Wrap(
      spacing: AppSpace.lg,
      runSpacing: AppSpace.sm,
      children: [
        for (final (level, text) in _items)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 16,
                height: 16,
                decoration: BoxDecoration(
                  color: _levelFill(c, level),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: c.line),
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              Flexible(
                child: Text('$text бодлого', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
              ),
            ],
          ),
      ],
    );
  }
}
