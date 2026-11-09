import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/anim/animation_slot.dart';
import '../data/homework_models.dart';
import '../domain/homework_logic.dart';
import 'homework_badges.dart';
import 'homework_photo_panel.dart';
import 'homework_providers.dart';

/// Танхимын загвар (`/homework/my`): хичээлийн өдөр бүрийн дэвтрийн зураг, багшийн тэмдэглэгээ,
/// ангид хийсэн тестийн B хувилбар (вэбийн `homework-practice/HomeworkList`).
class ClassroomHomeworkView extends ConsumerWidget {
  const ClassroomHomeworkView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final days = ref.watch(homeworkDaysProvider);
    final today = ref.watch(todayKeyProvider);
    return days.when(
      skipLoadingOnRefresh: true,
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(
        message: e is ApiError ? e.message : AppStrings.genericError,
        onRetry: () => ref.invalidate(homeworkDaysProvider),
      ),
      data: (list) {
        if (list.isEmpty) {
          return const EmptyState(
            icon: AppIcons.homework,
            title: 'Сүүлийн 14 хоногт хичээл алга',
            message: 'Хичээлд суусан өдөр бүр энд гарч, дэвтрийнхээ зургийг илгээнэ',
            art: AnimArt.emptyHomework,
          );
        }
        return _DayList(days: list, today: today);
      },
    );
  }
}

class _DayList extends StatefulWidget {
  const _DayList({required this.days, required this.today});

  final List<HwDay> days;
  final String today;

  @override
  State<_DayList> createState() => _DayListState();
}

class _DayListState extends State<_DayList> {
  final _keys = <String, GlobalKey>{};

  GlobalKey _keyFor(String id) => _keys.putIfAbsent(id, GlobalKey.new);

  void _jumpTo(String date) {
    final first = widget.days.firstWhere((d) => d.date == date);
    final ctx = _keyFor(first.id).currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(ctx, duration: AppMotion.of(context, AppMotion.enter), alignment: 0.02);
    }
  }

  @override
  Widget build(BuildContext context) {
    final sections = homeworkSections(widget.days, widget.today);
    // Урт жагсаалт — зөвхөн харагдаж буйг зурна (PERFORMANCE §1). Хэсэг бүрийн гарчиг + картууд.
    final rows = <Widget Function()>[];
    for (final s in sections) {
      // Өмнөх өдрүүдээс зураг нь илгээгдээгүй, одоо ч илгээж болох — гарчигт сануулна (вэбийн улаан тэмдэг)
      final missed = missedPhotoDays(s, widget.today);
      rows.add(
        () => SectionHeader(
          title: s.title,
          trailing: missed > 0 ? _MissedBadge(count: missed) : null,
          padding: const EdgeInsets.only(top: AppSpace.lg, bottom: AppSpace.sm),
        ),
      );
      for (final d in s.days) {
        rows.add(
          () => Padding(
            key: _keyFor(d.id),
            padding: const EdgeInsets.only(bottom: AppSpace.md),
            child: _DayCard(day: d, today: d.date == widget.today, canSend: canSendPhoto(d, widget.today)),
          ),
        );
      }
    }
    return RefreshIndicator(
      onRefresh: () async => ProviderScope.containerOf(context).invalidate(homeworkDaysProvider),
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: _DayStrip(days: widget.days, today: widget.today, onTap: _jumpTo),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
            sliver: SliverList.builder(itemCount: rows.length, itemBuilder: (_, i) => rows[i]()),
          ),
        ],
      ),
    );
  }
}

class _MissedBadge extends StatelessWidget {
  const _MissedBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: '$count өдөр илгээгээгүй',
      child: ExcludeSemantics(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: 2),
          decoration: BoxDecoration(color: c.error, borderRadius: BorderRadius.circular(AppRadius.pill)),
          child: Text('$count илгээгээгүй', style: context.text.labelSmall?.copyWith(color: c.onStatus)),
        ),
      ),
    );
  }
}

/// Өдрийн зурвас — эрт нь ЗҮҮН, хожуу нь БАРУУН (эзэн 2026-10-31); нээхэд өнөөдөр харагдана.
class _DayStrip extends StatefulWidget {
  const _DayStrip({required this.days, required this.today, required this.onTap});

  final List<HwDay> days;
  final String today;
  final ValueChanged<String> onTap;

  @override
  State<_DayStrip> createState() => _DayStripState();
}

class _DayStripState extends State<_DayStrip> {
  static const _chip = 52.0;
  late final List<String> _dates = (widget.days.map((d) => d.date).toSet().toList()..sort());
  late final _controller = ScrollController(initialScrollOffset: _initialOffset());

  double _initialOffset() {
    final focus = _dates.lastIndexWhere((k) => k.compareTo(widget.today) <= 0);
    return ((focus < 0 ? 0 : focus) * (_chip + 4) - 120).clamp(0, double.infinity).toDouble();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_dates.length < 2) return const SizedBox(height: AppSpace.sm);
    final c = context.colors;
    return SizedBox(
      height: 72,
      child: ListView.separated(
        controller: _controller,
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter, vertical: AppSpace.sm),
        itemCount: _dates.length,
        separatorBuilder: (_, _) => const SizedBox(width: 4),
        itemBuilder: (context, i) {
          final key = _dates[i];
          final d = parseDateKey(key)!;
          final isToday = key == widget.today;
          final ahead = key.compareTo(widget.today) > 0;
          final done = widget.days.where((x) => x.date == key).every(dayDone);
          final fg = isToday ? c.onBrand : c.ink;
          return Semantics(
            button: true,
            selected: isToday,
            label:
                '${dayLabel(key)}${done ? ', илгээсэн' : ''}${isToday ? ', өнөөдөр' : ''}${ahead ? ', урьдчилан' : ''}',
            child: ExcludeSemantics(
              child: Material(
                color: isToday ? c.brand : c.surface,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  side: BorderSide(color: isToday ? c.brand : c.line),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  onTap: () => widget.onTap(key),
                  child: SizedBox(
                    width: _chip,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(weekdayShortMn(d.weekday), style: context.text.labelSmall?.copyWith(color: fg)),
                        Text('${d.day}', style: context.text.titleMedium?.copyWith(color: fg)),
                        if (done)
                          Icon(AppIcons.success, size: 12, color: isToday ? c.onBrand : c.success)
                        else
                          const SizedBox(height: 12),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _DayCard extends StatelessWidget {
  const _DayCard({required this.day, required this.today, required this.canSend});

  final HwDay day;
  final bool today;
  final bool canSend;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final comment = day.markComment?.trim();
    return AppCard(
      accent: today ? c.brandBright : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(dayLabel(day.date), style: context.text.titleMedium)),
              if (day.upcoming)
                StatusPill(icon: AppIcons.upcoming, label: 'Урьдчилан', color: c.brand, dashed: true)
              else
                HomeworkMarkBadge(mark: day.mark),
            ],
          ),
          if (day.topic != null && day.topic!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpace.xs),
            Text(day.topic!, style: context.text.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
          ],
          const SizedBox(height: AppSpace.xs),
          Meta(items: [day.classroomName, if (day.deadlineAt != null) '${_deadline(day.deadlineAt!)} хүртэл']),
          if (comment != null && comment.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpace.md),
              decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.md)),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(AppIcons.messageSquareText, size: 16, color: c.inkDim, semanticLabel: 'Багшийн тайлбар'),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(child: Text(comment, style: context.text.bodyMedium)),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpace.md),
          HomeworkPhotoPanel(day: day, canSend: canSend),
          if (day.items.isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            Text('Онлайн тест', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
            for (final item in day.items) _ItemRow(day: day, item: item),
          ],
        ],
      ),
    );
  }

  static String _deadline(DateTime instant) {
    final t = UbDateTime.fromInstant(instant);
    return '${t.month.toString().padLeft(2, '0')}.${t.day.toString().padLeft(2, '0')} ${DateMn.time(t)}';
  }
}

class _ItemRow extends StatelessWidget {
  const _ItemRow({required this.day, required this.item});

  final HwDay day;
  final HwItem item;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final title = cleanTitle(item.title, variantLabel: item.variantLabel);
    return InkWell(
      onTap: () => context.push(homeworkSolvePath(item.testId, day.date, day.classroomId)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 56),
        child: Row(
          children: [
            Icon(AppIcons.bookOpenCheck, size: 20, color: item.status == HwItemStatus.submitted ? c.success : c.brand),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: context.text.titleSmall),
                    Meta(
                      items: [
                        '${item.problemCount} бодлого',
                        if (item.timeLimitMin != null) '${item.timeLimitMin} мин',
                        if (item.late) 'Хоцорсон',
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: AppSpace.sm),
            HwItemStatusPill(item: item),
            Icon(AppIcons.forward, size: 18, color: c.inkDim),
          ],
        ),
      ),
    );
  }
}

/// `/app/homework/:testId?date=&classroomId=` (вэбийн `solveHref`).
String homeworkSolvePath(String testId, String date, String classroomId) => Uri(
  path: '/app/homework/${Uri.encodeComponent(testId)}',
  queryParameters: {'date': date, 'classroomId': classroomId},
).toString();
