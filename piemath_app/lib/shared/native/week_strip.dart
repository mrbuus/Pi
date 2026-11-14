import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/time/date_mn.dart';
import '../../core/time/ub_time.dart';
import '../../core/time/weekday.dart';
import '../../core/ui/ui.dart';

/// 7 хоногийн тууз (Улаанбаатарын цагаар, Даваа гарагаас): өдөр бүрийн цэг/тоо, өнөөдөр тэмдэглэгдсэн.
/// Хуруугаар хажуу тийш шудрахад 7 хоног солигдож, сонгосон гараг хэвээр (+/-7 хоног) үлдэнэ.
///
/// ```dart
/// WeekStrip(
///   selected: day,
///   counts: {'2026-11-04': 3},           // UbDateTime.dateKey → хичээлийн тоо
///   onSelected: (d) => setState(() => day = d),
///   onWeekChanged: (monday) => ref.read(weekProvider.notifier).load(monday),
/// )
/// ```
class WeekStrip extends StatefulWidget {
  const WeekStrip({
    super.key,
    required this.selected,
    required this.onSelected,
    this.counts = const {},
    this.onWeekChanged,
    this.today,
    this.showHeader = true,
  });

  /// Сонгосон өдөр (цаг нь хамаагүй).
  final UbDateTime selected;
  final ValueChanged<UbDateTime> onSelected;

  /// `UbDateTime.dateKey` → тоо. 1–3 бол цэг, түүнээс олон бол тоо. 0/байхгүй бол юу ч үгүй.
  final Map<String, int> counts;

  /// Харагдах 7 хоног солигдоход (Даваа гарагийн 00:00) — тэр 7 хоногийн өгөгдөл ачаалахад.
  final ValueChanged<UbDateTime>? onWeekChanged;

  /// Өнөөдөр (тест). Өгөөгүй бол [UbDateTime.now].
  final UbDateTime? today;

  /// Сар, өмнөх/дараагийн товч, «Өнөөдөр» мөр.
  final bool showHeader;

  static const stripHeight = 76.0;

  /// [day]-ийн 7 хоногийн Даваа гараг (00:00).
  static UbDateTime weekStartOf(UbDateTime day) => day.startOfDay.addDays(1 - day.weekday);

  @override
  State<WeekStrip> createState() => _WeekStripState();
}

class _WeekStripState extends State<WeekStrip> {
  static const _origin = 10000;
  late final UbDateTime _anchor = WeekStrip.weekStartOf(widget.selected);
  late final PageController _pages = PageController(initialPage: _origin);
  bool _programmatic = false;
  late UbDateTime _shownWeek = _anchor;

  UbDateTime get _today => (widget.today ?? UbDateTime.now()).startOfDay;

  UbDateTime _weekOfPage(int page) => _anchor.addDays((page - _origin) * 7);

  int _pageOfWeek(UbDateTime monday) => _origin + ((monday.dayIndex - _anchor.dayIndex) / 7).round();

  @override
  void didUpdateWidget(WeekStrip old) {
    super.didUpdateWidget(old);
    final week = WeekStrip.weekStartOf(widget.selected);
    if (week.dayIndex != _shownWeek.dayIndex) unawaited(_goToWeek(week));
  }

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  Future<void> _goToWeek(UbDateTime monday) async {
    if (!_pages.hasClients) return;
    final page = _pageOfWeek(monday);
    _programmatic = true;
    _shownWeek = monday;
    try {
      if (decorativeMotionOff(context) || ((_pages.page ?? page.toDouble()) - page).abs() > 1.5) {
        _pages.jumpToPage(page);
      } else {
        await _pages.animateToPage(page, duration: AppMotion.enter, curve: AppEasing.decelerate);
      }
    } finally {
      _programmatic = false;
    }
    if (mounted) setState(() {});
    widget.onWeekChanged?.call(monday);
  }

  void _onPageChanged(int page) {
    if (_programmatic) return;
    final monday = _weekOfPage(page);
    _shownWeek = monday;
    unawaited(HapticFeedback.selectionClick());
    widget.onWeekChanged?.call(monday);
    widget.onSelected(monday.addDays(widget.selected.weekday - 1));
  }

  void _shift(int weeks) {
    final target = widget.selected.startOfDay.addDays(7 * weeks);
    widget.onSelected(target);
  }

  @override
  Widget build(BuildContext context) {
    final today = _today;
    final selected = widget.selected.startOfDay;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.showHeader) _header(context, today, selected),
        SizedBox(
          height: WeekStrip.stripHeight,
          child: PageView.builder(
            controller: _pages,
            onPageChanged: _onPageChanged,
            itemBuilder: (context, page) {
              final monday = _weekOfPage(page);
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
                child: Row(
                  children: [
                    for (var i = 0; i < 7; i++)
                      Expanded(
                        child: _DayCell(
                          day: monday.addDays(i),
                          selected: monday.addDays(i).dayIndex == selected.dayIndex,
                          today: monday.addDays(i).dayIndex == today.dayIndex,
                          count: widget.counts[monday.addDays(i).dateKey] ?? 0,
                          onTap: () {
                            unawaited(HapticFeedback.selectionClick());
                            widget.onSelected(monday.addDays(i));
                          },
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _header(BuildContext context, UbDateTime today, UbDateTime selected) {
    final showToday = selected.dayIndex != today.dayIndex;
    return Padding(
      padding: const EdgeInsets.only(left: AppSpace.gutter, right: AppSpace.xs),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text(
                DateMn.month(selected, withYear: selected.year != today.year),
                style: context.text.titleMedium,
              ),
            ),
          ),
          if (showToday)
            TextButton(
              onPressed: () {
                unawaited(HapticFeedback.selectionClick());
                widget.onSelected(today);
              },
              child: const Text('Өнөөдөр'),
            ),
          IconButton(tooltip: 'Өмнөх 7 хоног', icon: const Icon(AppIcons.back), onPressed: () => _shift(-1)),
          IconButton(tooltip: 'Дараагийн 7 хоног', icon: const Icon(AppIcons.forward), onPressed: () => _shift(1)),
        ],
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.selected,
    required this.today,
    required this.count,
    required this.onTap,
  });

  final UbDateTime day;
  final bool selected;
  final bool today;
  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final numberColor = selected ? c.onBrand : (today ? c.brand : c.ink);
    final label = [DateMn.longWithWeekday(day), if (today) 'өнөөдөр', if (count > 0) '$count'].join(', ');
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              weekdayShortMn(day.weekday),
              style: context.text.labelSmall?.copyWith(color: today ? c.brand : c.inkDim),
            ),
            const SizedBox(height: AppSpace.xs),
            Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? c.brand : null,
                border: today && !selected ? Border.all(color: c.brand, width: 1.5) : null,
              ),
              child: Text(
                '${day.day}',
                style: context.text.titleSmall?.copyWith(
                  color: numberColor,
                  fontWeight: selected || today ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(height: 3),
            SizedBox(height: 12, child: _marks(context)),
          ],
        ),
      ),
    );
  }

  Widget _marks(BuildContext context) {
    final c = context.colors;
    if (count <= 0) return const SizedBox.shrink();
    if (count > 3) {
      return Text('$count', style: context.text.labelSmall?.copyWith(color: c.brand, fontSize: 10, height: 1.2));
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < count; i++)
          Container(
            key: ValueKey('week-dot:${day.dateKey}:$i'),
            width: 4,
            height: 4,
            margin: const EdgeInsets.symmetric(horizontal: 1.5),
            decoration: BoxDecoration(color: c.brand, shape: BoxShape.circle),
          ),
      ],
    );
  }
}
