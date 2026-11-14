import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../application/board_controller.dart';
import '../application/staff_providers.dart';
import '../data/staff_models.dart';
import '../data/teacher_models.dart';
import '../domain/board_logic.dart';
import 'board_card.dart';
import 'board_quiz.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

// Самбарын карт бусад хэсэг — вэбийн `SummaryBar`, `parts`, `BoardFilters`, `RecordedBy`, `MarkView`.

// ───────── Тоо (эзэн 2026-10-22): төлөв БҮРИЙН тоо зөв нэртэй ─────────

/// Нэг тоолуур: «Ирсэн 12/15». [keepZero] биш бол тэг үед харагдахгүй.
@immutable
class BoardCount {
  const BoardCount(this.label, this.icon, this.value, {this.total, this.keepZero = false});

  final String label;
  final Widget icon;
  final int value;
  final int? total;
  final bool keepZero;

  String get text => total == null ? '$label $value' : '$label $value/$total';
}

/// Ирцийн тоо: Ирсэн N/M, Хоцорсон, Тасалсан, Чөлөөтэй, Тэмдэглээгүй.
List<BoardCount> attendanceCounts(BuildContext context, StatusCounts k, {required int total}) {
  final c = context.colors;
  return [
    for (final (i, a) in AttendanceStatus.values.indexed)
      BoardCount(
        attendanceMeta(a).label,
        MarkIcon(attendanceMeta(a).glyph, color: attendanceMeta(a).tone.color(c), size: 14),
        k.attendance[a]!,
        total: i == 0 ? total : null,
        keepZero: i == 0,
      ),
    BoardCount('Тэмдэглээгүй', Icon(AppIcons.minus, size: 14, color: c.inkDim), k.attUnmarked),
  ];
}

/// Даалгаврын тоо: Хийсэн N/M, Дутуу, Хийгээгүй, Тэмдэглээгүй (танхимын анги) + Илгээсэн + Онлайн.
List<BoardCount> homeworkCounts(
  BuildContext context,
  StatusCounts? k, {
  required int total,
  required int sent,
  int? online,
}) {
  final c = context.colors;
  return [
    if (k != null) ...[
      for (final (i, h) in HomeworkStatus.values.indexed)
        BoardCount(
          homeworkMeta(h).label,
          MarkIcon(homeworkMeta(h).glyph, color: homeworkMeta(h).tone.color(c), size: 14),
          k.homework[h]!,
          total: i == 0 ? total : null,
          keepZero: i == 0,
        ),
      BoardCount('Тэмдэглээгүй', Icon(AppIcons.minus, size: 14, color: c.inkDim), k.hwUnmarked),
    ],
    BoardCount('Илгээсэн', MarkIcon(MarkGlyph.hwSent, color: c.brand, size: 14), sent, total: total, keepZero: true),
    if (online != null)
      BoardCount('Онлайн', Icon(AppIcons.laptop, size: 14, color: c.brand), online, total: total, keepZero: true),
  ];
}

/// Толгойн доор наалддаг нягт тойм: «Ирц» ба «Даалгавар» мөр, хадгалалтын төлөв.
class BoardSummaryBar extends ConsumerWidget {
  const BoardSummaryBar({super.key, required this.args, required this.wide, this.online});

  final BoardArgs args;
  final bool wide;

  /// Онлайнаар бодсон сурагчийн тоо — онлайн тест байгаа танхимын ангид л.
  final int? online;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(
      boardControllerProvider(args).select(
        (s) => (
          counts: s.counts,
          total: s.studentIds.length,
          homework: s.homework,
          sent: s.studentIds.where(s.sent.contains).length,
        ),
      ),
    );
    final c = context.colors;
    // Тэмдэглээгүй ч шалгалтын оноотой бол «Тэмдэглээгүй»-д тоолохгүй (эзэн 2026-11-08).
    final quiz = s.homework ? ref.watch(quizScoredProvider(args)).ids : const <String>{};
    final covered = quiz.isEmpty
        ? 0
        : ref.watch(boardControllerProvider(args).select((b) => quizCoveredUnmarked(b.studentIds, b.recs, quiz)));
    final k = s.counts;
    final hwCounts = covered == 0
        ? k
        : StatusCounts(
            attendance: k.attendance,
            attUnmarked: k.attUnmarked,
            homework: k.homework,
            hwUnmarked: k.hwUnmarked - covered,
          );
    final rows = [
      ('Ирц', attendanceCounts(context, s.counts, total: s.total)),
      (
        'Даалгавар',
        homeworkCounts(context, s.homework ? hwCounts : null, total: s.total, sent: s.sent, online: online),
      ),
    ];
    final grid = Table(
      columnWidths: const {0: IntrinsicColumnWidth(), 1: FlexColumnWidth()},
      defaultVerticalAlignment: TableCellVerticalAlignment.top,
      children: [
        for (final (label, items) in rows)
          TableRow(
            children: [
              Padding(
                padding: const EdgeInsets.only(right: AppSpace.sm, top: 1),
                child: Text(
                  label,
                  style: context.text.labelSmall?.copyWith(
                    fontSize: wide ? 12 : 11,
                    height: 20 / 12,
                    fontWeight: FontWeight.w600,
                    color: c.inkDim,
                  ),
                ),
              ),
              _CountWrap(items: items, wide: wide),
            ],
          ),
      ],
    );
    final save = BoardSaveStatus(args: args);
    return DecoratedBox(
      key: const ValueKey('board-summary'),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: c.line),
        boxShadow: [BoxShadow(color: c.ink.withValues(alpha: 0.06), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: wide ? AppSpace.md : AppSpace.sm, vertical: 6),
        child: wide
            ? Row(
                children: [
                  Expanded(child: grid),
                  const SizedBox(width: AppSpace.sm),
                  save,
                ],
              )
            : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [grid, const SizedBox(height: 2), save]),
      ),
    );
  }
}

class _CountWrap extends StatelessWidget {
  const _CountWrap({required this.items, required this.wide});

  final List<BoardCount> items;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = context.text.labelSmall?.copyWith(fontSize: wide ? 13 : 12, height: 20 / 12, color: c.inkDim);
    return Wrap(
      spacing: wide ? 14 : 10,
      runSpacing: 2,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        for (final i in items)
          if (i.keepZero || i.value != 0)
            Semantics(
              label: i.text,
              excludeSemantics: true,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  i.icon,
                  const SizedBox(width: AppSpace.xs),
                  Flexible(
                    child: Text(i.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: style),
                  ),
                  const SizedBox(width: AppSpace.xs),
                  Text.rich(
                    TextSpan(
                      text: '${i.value}',
                      style: TextStyle(fontWeight: FontWeight.w700, color: c.ink),
                      children: [
                        if (i.total != null)
                          TextSpan(
                            text: '/${i.total}',
                            style: TextStyle(fontWeight: FontWeight.w500, color: c.inkDim),
                          ),
                      ],
                    ),
                    style: style?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
                  ),
                ],
              ),
            ),
      ],
    );
  }
}

/// Хадгалалтын төлөв (зөвхөн хадгалалт өөрчлөгдөхөд дахин зурагдана).
class BoardSaveStatus extends ConsumerWidget {
  const BoardSaveStatus({super.key, required this.args});

  final BoardArgs args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(
      boardControllerProvider(args).select((s) => (pending: s.pending, savedAt: s.savedAt, error: s.saveError)),
    );
    return SaveStatus(pending: s.pending, savedAt: s.savedAt, error: s.error);
  }
}

// ───────── Хэн тэмдэглэсэн (эзэн 2026-10-22) ─────────

/// «Ирц: Б. Болд 15:32», «Даалгавар: …» — сүүлд тэмдэглэсэн багш эхэнд. Тэмдэглэгээгүй бол юу ч зурахгүй.
class BoardRecordedBy extends ConsumerWidget {
  const BoardRecordedBy({super.key, required this.args});

  final BoardArgs args;

  /// Нэг мөрөнд хэт олон нэр бичихгүй — үлдсэнийг «+2».
  static const maxNames = 3;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(boardControllerProvider(args).select((s) => (by: s.recordedBy, homework: s.homework)));
    final r = s.by;
    if (r == null || (r.attendance.isEmpty && !(s.homework && r.homework.isNotEmpty))) {
      return const SizedBox.shrink();
    }
    return Semantics(
      container: true,
      label: 'Хэн тэмдэглэсэн',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
        child: Wrap(
          spacing: 20,
          runSpacing: AppSpace.xs,
          children: [
            if (r.attendance.isNotEmpty)
              _RecorderGroup(icon: TeacherIcons.userRoundCheck, label: 'Ирц', list: r.attendance),
            if (s.homework && r.homework.isNotEmpty)
              _RecorderGroup(icon: TeacherIcons.bookCheck, label: 'Даалгавар', list: r.homework),
          ],
        ),
      ),
    );
  }
}

class _RecorderGroup extends StatelessWidget {
  const _RecorderGroup({required this.icon, required this.label, required this.list});

  final IconData icon;
  final String label;
  final List<Recorder> list;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    String? at(Recorder x) {
      final t = parseApiInstant(x.at);
      return t == null ? null : DateMn.time(UbDateTime.fromInstant(t));
    }

    final shown = list.take(BoardRecordedBy.maxNames).toList();
    final rest = list.length - shown.length;
    final style = context.text.bodySmall?.copyWith(fontSize: 12, color: c.inkDim);
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 14, color: c.brand),
        ),
        const SizedBox(width: 6),
        Flexible(
          child: Text.rich(
            TextSpan(
              text: '$label: ',
              children: [
                for (final (i, x) in shown.indexed) ...[
                  if (i > 0) const TextSpan(text: ', '),
                  TextSpan(
                    text: x.name,
                    style: TextStyle(fontWeight: FontWeight.w600, color: c.ink),
                  ),
                  if (at(x) != null) TextSpan(text: ' ${at(x)}'),
                ],
                if (rest > 0) TextSpan(text: ', +$rest'),
              ],
            ),
            style: style,
          ),
        ),
      ],
    );
  }
}

// ───────── Хичээлийн мэдээлэл ─────────

/// Тухайн хичээлийн сэдэв ба онлайн гэрийн даалгавар (нэгтгэсэн тоо) — вэбийн `LessonInfo`.
class BoardLessonInfo extends StatelessWidget {
  const BoardLessonInfo({
    super.key,
    required this.topic,
    required this.homework,
    required this.marks,
    required this.studentIds,
  });

  final String? topic;
  final bool homework;
  final OnlineMarks? marks;
  final List<String> studentIds;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasOnline = homework && (marks?.hasTests ?? false);
    final scores = [
      for (final id in studentIds)
        if (marks?.students[id] case final OnlineCell cell) cell,
    ];
    final avg = scores.isEmpty ? null : scores.fold<num>(0, (a, o) => a + o.score) / scores.length;
    final dim = context.text.bodyMedium?.copyWith(color: c.inkDim);
    final strong = context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600, color: c.ink);
    return AppCard(
      padding: const EdgeInsets.all(AppSpace.md),
      semanticLabel: 'Хичээлийн мэдээлэл',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ExcludeSemantics(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: c.brandBright.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: SizedBox.square(dimension: 32, child: Icon(AppIcons.theory, size: 16, color: c.brand)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text.rich(
                      TextSpan(
                        text: 'Хичээлийн сэдэв: ',
                        style: dim,
                        children: [
                          TextSpan(text: topic == null || topic!.trim().isEmpty ? 'Тавиагүй' : topic, style: strong),
                        ],
                      ),
                    ),
                    if (homework) ...[
                      const SizedBox(height: AppSpace.xs),
                      Text.rich(
                        TextSpan(
                          text: 'Онлайн гэрийн даалгавар: ',
                          style: dim,
                          children: hasOnline
                              ? [
                                  for (final (i, t) in marks!.tests.indexed) ...[
                                    if (i > 0) const TextSpan(text: ', '),
                                    TextSpan(
                                      text: t.variant == null ? t.title : '${t.title} ${t.variant}',
                                      style: strong,
                                    ),
                                    TextSpan(text: ' (${t.problems} бодлого)'),
                                  ],
                                ]
                              : const [TextSpan(text: 'алга')],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          // Вэбийн `BoardFilters`: тест бүрийн нэр шалгалтын дүн рүү холбоостой.
          if (hasOnline)
            Wrap(
              spacing: AppSpace.sm,
              children: [
                for (final t in marks!.tests)
                  if (t.testId.isNotEmpty)
                    TextButton.icon(
                      style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                      onPressed: () =>
                          context.push('/app/tests/${Uri.encodeComponent(t.testId)}/results', extra: t.title),
                      icon: const Icon(AppIcons.chart, size: 16),
                      label: Text(t.variant == null ? '${t.title} дүн' : '${t.title} ${t.variant} дүн'),
                    ),
              ],
            ),
          if (hasOnline) ...[
            const SizedBox(height: 10),
            Divider(height: 1, color: c.line),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _Stat(label: 'Онлайнаар бодсон', value: '${scores.length}/${studentIds.length}'),
                ),
                Expanded(
                  child: _Stat(label: 'Дундаж оноо', value: avg == null ? '-' : scoreText(avg, scores.first.max)),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Semantics(
    label: '$label $value',
    excludeSemantics: true,
    child: Column(
      children: [
        Text(
          value,
          style: context.text.titleMedium?.copyWith(
            fontWeight: FontWeight.w700,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        Text(label, style: context.text.labelSmall?.copyWith(fontSize: 11, color: context.colors.inkDim)),
      ],
    ),
  );
}

// ───────── Шүүлтүүр ─────────

/// Шүүлтүүрийн чипийн өгөгдөл.
@immutable
class _Chip {
  const _Chip(this.filter, this.label, this.icon, this.tone);

  final BoardFilter filter;
  final String label;
  final Widget Function(Color) icon;

  /// Сонгогдсон үеийн өнгө; null = саарал (neutral).
  final Color? tone;
}

/// «Шүүлтүүр» товч — дарахад тоотой шүүлтүүрүүд задарна; шүүсэн үед «N/M сурагч» + «Бүгд» үргэлж
/// харагдана (вэбийн `BoardFilters`).
class BoardFilters extends ConsumerStatefulWidget {
  const BoardFilters({
    super.key,
    required this.args,
    required this.filter,
    required this.onFilter,
    required this.online,
    required this.hasOnline,
    required this.wide,
  });

  final BoardArgs args;
  final BoardFilter? filter;
  final ValueChanged<BoardFilter?> onFilter;

  /// Онлайнаар бодсон сурагчид.
  final Set<String> online;
  final bool hasOnline;
  final bool wide;

  @override
  ConsumerState<BoardFilters> createState() => _BoardFiltersState();
}

class _BoardFiltersState extends ConsumerState<BoardFilters> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(boardControllerProvider(widget.args));
    final c = context.colors;
    final quiz = s.homework ? ref.watch(quizScoredProvider(widget.args)).ids : const <String>{};
    final data = BoardFilterData(recs: s.recs, risk: s.risk, sent: s.sent.toSet(), online: widget.online, quiz: quiz);
    final ids = s.studentIds;
    int count(BoardFilter f) => ids.where((id) => data.matches(f, id)).length;
    final filter = widget.filter;
    final shown = filter == null ? ids.length : count(filter);
    final riskN = count(BoardFilter.risk);

    Widget mark(MarkMeta m) => MarkIcon(m.glyph, color: m.tone.color(c), size: 14);
    Widget lucide(IconData i) => Icon(i, size: 14);
    final att = [
      for (final a in AttendanceStatus.values)
        _Chip(
          BoardFilter.att(a),
          attendanceMeta(a).label,
          (_) => mark(attendanceMeta(a)),
          attendanceMeta(a).tone.color(c),
        ),
      _Chip(BoardFilter.attNone, 'Тэмдэглээгүй', (_) => Icon(AppIcons.minus, size: 14, color: c.inkDim), null),
    ];
    final sentChip = _Chip(
      BoardFilter.hwSent,
      'Илгээсэн',
      (_) => MarkIcon(MarkGlyph.hwSent, color: c.brand, size: 14),
      c.brandBright,
    );
    final hw = [
      for (final h in HomeworkStatus.values)
        _Chip(BoardFilter.hw(h), homeworkMeta(h).label, (_) => mark(homeworkMeta(h)), homeworkMeta(h).tone.color(c)),
      _Chip(BoardFilter.hwNone, 'Тэмдэглээгүй', (_) => Icon(AppIcons.minus, size: 14, color: c.inkDim), null),
      sentChip,
    ];
    final onlineChips = [
      _Chip(BoardFilter.onlineYes, 'Бодсон', (_) => Icon(AppIcons.laptop, size: 14, color: c.brand), c.brandBright),
      _Chip(BoardFilter.onlineNo, 'Бодоогүй', (_) => lucide(AppIcons.minus), null),
    ];

    final active = _open || filter != null;
    final label = context.text.labelSmall?.copyWith(fontSize: 12, color: c.inkDim);
    final countView = Semantics(
      liveRegion: true,
      child: filter == null
          ? Text(
              '${ids.length} сурагч',
              textAlign: TextAlign.right,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: label,
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Flexible(
                  child: Text.rich(
                    TextSpan(
                      text: '$shown',
                      style: TextStyle(fontWeight: FontWeight.w700, color: c.ink),
                      children: [TextSpan(text: '/${ids.length} сурагч', style: label)],
                    ),
                    style: label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Flexible(
                  child: TextButton(
                    style: TextButton.styleFrom(
                      minimumSize: const Size(teacherTap, teacherTap),
                      padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
                      foregroundColor: c.brand,
                    ),
                    onPressed: () => widget.onFilter(null),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(AppIcons.close, size: 14),
                        SizedBox(width: AppSpace.xs),
                        Flexible(child: Text('Бүгд', maxLines: 1, overflow: TextOverflow.ellipsis)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
    return Semantics(
      container: true,
      label: 'Шүүлтүүр',
      explicitChildNodes: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _OutlineToggle(
                selected: active,
                expanded: _open,
                onTap: () => setState(() => _open = !_open),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(TeacherIcons.listFilter, size: 16, color: active ? c.brandSoft : c.ink),
                    const SizedBox(width: 6),
                    Text('Шүүлтүүр', style: context.text.labelLarge?.copyWith(color: active ? c.brandSoft : c.ink)),
                    if (filter != null) ...[
                      const SizedBox(width: 6),
                      ExcludeSemantics(
                        child: SizedBox.square(
                          dimension: 8,
                          child: DecoratedBox(
                            decoration: BoxDecoration(color: c.brandBright, shape: BoxShape.circle),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (riskN > 0) ...[
                const SizedBox(width: AppSpace.sm),
                Flexible(
                  flex: 2,
                  child: _FilterChip(
                    key: const ValueKey('filter-risk'),
                    selected: filter == BoardFilter.risk,
                    tone: c.error,
                    icon: const RiskDot(),
                    label: 'Асуудалтай',
                    count: riskN,
                    countColor: c.error,
                    onTap: () => widget.onFilter(filter == BoardFilter.risk ? null : BoardFilter.risk),
                  ),
                ),
              ],
              const SizedBox(width: AppSpace.sm),
              // Утсан дээр шүүсэн үед «N/M сурагч, Бүгд» доод мөрөнд (багтахгүй, давхцахгүй).
              Expanded(child: filter == null || widget.wide ? countView : const SizedBox.shrink()),
            ],
          ),
          if (filter != null && !widget.wide) Align(alignment: Alignment.centerRight, child: countView),
          if (_open) ...[
            const SizedBox(height: 6),
            DecoratedBox(
              decoration: BoxDecoration(
                color: c.surface,
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: c.line),
              ),
              child: Padding(
                padding: const EdgeInsets.all(AppSpace.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _FilterRow(label: 'Ирц', wide: widget.wide, chips: _chips(att, count)),
                    if (s.homework)
                      _FilterRow(label: 'Даалгавар', wide: widget.wide, chips: _chips(hw, count))
                    else if (s.sent.isNotEmpty)
                      _FilterRow(label: 'Даалгавар', wide: widget.wide, chips: _chips([sentChip], count)),
                    if (widget.hasOnline)
                      _FilterRow(label: 'Онлайн', wide: widget.wide, chips: _chips(onlineChips, count)),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// Тэг тоотой чипийг үзүүлэхгүй (идэвхтэй шүүлтүүрийг л үлдээнэ).
  List<Widget> _chips(List<_Chip> defs, int Function(BoardFilter) count) {
    final c = context.colors;
    return [
      for (final d in defs)
        if (count(d.filter) > 0 || widget.filter == d.filter)
          _FilterChip(
            key: ValueKey('filter-${d.filter.name}'),
            selected: widget.filter == d.filter,
            tone: d.tone,
            icon: d.icon(d.tone ?? c.inkDim),
            label: d.label,
            count: count(d.filter),
            onTap: () => widget.onFilter(widget.filter == d.filter ? null : d.filter),
          ),
    ];
  }
}

/// Утсан дээр хажуу тийш гүйдэг нэг мөр (шошго нь наалттай), том дэлгэцэнд ороож багтана.
class _FilterRow extends StatelessWidget {
  const _FilterRow({required this.label, required this.chips, required this.wide});

  final String label;
  final List<Widget> chips;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final title = SizedBox(
      width: wide ? 80 : 76,
      child: Text(
        label,
        style: context.text.labelSmall?.copyWith(fontSize: 12, fontWeight: FontWeight.w600, color: c.inkDim),
      ),
    );
    final spaced = [
      for (final (i, w) in chips.indexed) ...[if (i > 0) const SizedBox(width: 6), w],
    ];
    return Semantics(
      container: true,
      label: label,
      explicitChildNodes: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: wide
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: teacherTap,
                    child: Align(alignment: Alignment.centerLeft, child: title),
                  ),
                  Expanded(child: Wrap(spacing: 6, runSpacing: 6, children: chips)),
                ],
              )
            : Row(
                children: [
                  title,
                  Expanded(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(children: spaced),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

/// Тоотой шүүлтүүрийн чип (дарахад сонгоно, дахин дарвал цэвэрлэнэ).
class _FilterChip extends StatelessWidget {
  const _FilterChip({
    super.key,
    required this.selected,
    required this.icon,
    required this.label,
    required this.count,
    required this.onTap,
    this.tone,
    this.countColor,
  });

  final bool selected;

  /// Сонгогдсон үеийн өнгө; null = саарал.
  final Color? tone;
  final Widget icon;
  final String label;
  final int count;
  final Color? countColor;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final Color border;
    final Color bg;
    final Color fg;
    if (!selected) {
      (border, bg, fg) = (c.line, c.surface, c.inkDim);
    } else if (tone == null) {
      (border, bg, fg) = (c.inkDim, Color.alphaBlend(c.ink.withValues(alpha: 0.1), c.surface), c.ink);
    } else if (tone == c.brandBright) {
      (border, bg, fg) = (
        c.brandBright,
        Color.alphaBlend(c.brandBright.withValues(alpha: 0.1), c.surface),
        c.brandSoft,
      );
    } else {
      (border, bg, fg) = (tone!, Color.alphaBlend(tone!.withValues(alpha: 0.15), c.surface), tone!);
    }
    final radius = BorderRadius.circular(AppRadius.pill);
    final style = context.text.labelMedium?.copyWith(
      fontSize: 13,
      color: fg,
      fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
    );
    return Semantics(
      button: true,
      selected: selected,
      label: '$label $count',
      onTap: onTap,
      excludeSemantics: true,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Ink(
            decoration: BoxDecoration(
              color: bg,
              borderRadius: radius,
              border: Border.all(color: border),
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: teacherTap),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    icon,
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: style),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '$count',
                      style: style?.copyWith(
                        fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                        color: selected ? fg : (countColor ?? c.ink),
                        fontFeatures: const [FontFeature.tabularFigures()],
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

/// «Шүүлтүүр» товч.
class _OutlineToggle extends StatelessWidget {
  const _OutlineToggle({required this.selected, required this.expanded, required this.onTap, required this.child});

  final bool selected;
  final bool expanded;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final radius = BorderRadius.circular(AppRadius.sm);
    return Semantics(
      button: true,
      expanded: expanded,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: Ink(
            decoration: BoxDecoration(
              color: selected ? Color.alphaBlend(c.brandBright.withValues(alpha: 0.1), c.surface) : c.surface,
              borderRadius: radius,
              border: Border.all(color: selected ? c.brandBright : c.line),
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: teacherTap),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                child: Center(widthFactor: 1, child: child),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ───────── Мэдээлэл, бөөнөөр тэмдэглэх, тайлбар ─────────

/// «Хичээл хараахан эхлээгүй» — урьдчилж чөлөө тэмдэглэж болно.
class BoardUpcomingNote extends StatelessWidget {
  const BoardUpcomingNote({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.info.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(AppIcons.info, size: 16, color: c.info),
            ),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              child: Text(
                'Хичээл хараахан эхлээгүй, чөлөө авсныг урьдчилж тэмдэглэж болно',
                style: context.text.bodyMedium?.copyWith(color: c.ink),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// «Үлдсэнийг нэг дор» — жагсаалтын ДООР, гараар тэмдэглэснийг хөндөхгүй.
class BoardBulkActions extends ConsumerWidget {
  const BoardBulkActions({super.key, required this.args, required this.wide});

  final BoardArgs args;
  final bool wide;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final homework = ref.watch(boardControllerProvider(args).select((s) => s.homework));
    final quiz = homework ? ref.watch(quizScoredProvider(args)).ids : const <String>{};
    final s = ref.watch(
      boardControllerProvider(args).select(
        (s) => (
          present: bulkPresentCandidates(s.studentIds, s.recs).length,
          done: bulkDoneCandidates(s.studentIds, s.recs, quizScored: quiz).length,
          skipped: bulkDoneSkipped(s.studentIds, s.recs, quizScored: quiz),
          undoAtt: s.bulkAtt.length,
          undoHw: s.bulkHw.length,
          busy: s.bulkBusy,
          homework: s.homework,
        ),
      ),
    );
    final ctl = ref.read(boardControllerProvider(args).notifier);
    final c = context.colors;
    final buttons = [
      _BulkButton(
        glyph: MarkGlyph.attPresent,
        label: 'Бүгд ирсэн',
        count: s.present,
        undo: s.undoAtt,
        busy: s.busy,
        onApply: ctl.markAllPresent,
        onUndo: ctl.undoAllPresent,
      ),
      if (s.homework)
        _BulkButton(
          glyph: MarkGlyph.hwDone,
          label: 'Бүгд хийсэн',
          count: s.done,
          undo: s.undoHw,
          busy: s.busy,
          onApply: () => ctl.markAllDone(quizScored: quiz),
          onUndo: ctl.undoAllDone,
        ),
    ];
    return AppCard(
      padding: const EdgeInsets.all(AppSpace.md),
      semanticLabel: 'Үлдсэнийг нэг дор тэмдэглэх',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Үлдсэнийг нэг дор', style: context.text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text('Гараар тэмдэглэснийг хөндөхгүй', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
          const SizedBox(height: 10),
          if (wide)
            Row(
              children: [
                for (final (i, b) in buttons.indexed) ...[
                  if (i > 0) const SizedBox(width: AppSpace.sm),
                  Expanded(child: b),
                ],
              ],
            )
          else
            for (final (i, b) in buttons.indexed) ...[if (i > 0) const SizedBox(height: AppSpace.sm), b],
          if (s.homework && s.skipped > 0) ...[
            const SizedBox(height: AppSpace.sm),
            Text(
              'Ирээгүй, ирц тэмдэглээгүй ${s.skipped} сурагчийн даалгаврыг алгасна',
              style: context.text.bodySmall?.copyWith(color: c.inkDim),
            ),
          ],
        ],
      ),
    );
  }
}

class _BulkButton extends StatelessWidget {
  const _BulkButton({
    required this.glyph,
    required this.label,
    required this.count,
    required this.undo,
    required this.busy,
    required this.onApply,
    required this.onUndo,
  });

  final MarkGlyph glyph;
  final String label;
  final int count;

  /// Буцааж болох нүдний тоо (0 бол «Бүгд …» товч харагдана).
  final int undo;
  final bool busy;
  final Future<void> Function() onApply;
  final Future<void> Function() onUndo;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md));
    final text = context.text.labelLarge?.copyWith(fontWeight: FontWeight.w700);
    if (undo > 0) {
      return OutlinedButton.icon(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(teacherTap),
          shape: shape,
          foregroundColor: c.ink,
          side: BorderSide(color: c.line),
          textStyle: text,
        ),
        onPressed: busy ? null : onUndo,
        icon: const Icon(AppIcons.restart, size: 16),
        label: Text('Буцаах ($undo)', semanticsLabel: '$label товчоор тэмдэглэсэн $undo сурагчийг буцаах'),
      );
    }
    final enabled = count > 0 && !busy;
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(teacherTap),
        shape: shape,
        textStyle: text,
        foregroundColor: c.brandSoft,
        backgroundColor: Color.alphaBlend(c.brandBright.withValues(alpha: 0.1), c.surface),
        side: BorderSide(color: c.brandBright.withValues(alpha: 0.4)),
        disabledForegroundColor: c.inkDim,
        disabledBackgroundColor: Colors.transparent,
      ),
      onPressed: enabled ? onApply : null,
      icon: MarkIcon(glyph, color: enabled ? c.brandSoft : c.inkDim, size: 16),
      label: Text('$label ($count)'),
    );
  }
}

/// Тэмдгийн тайлбар — жагсаалтын ДООР (RULES §3). Хайрцаг бүр үгтэй тул зөвхөн нэмэлт тэмдгүүд.
class BoardLegend extends ConsumerWidget {
  const BoardLegend({super.key, required this.args, required this.onlineTests, required this.past});

  final BoardArgs args;
  final bool onlineTests;
  final bool past;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(boardControllerProvider(args).select((s) => (sent: s.sent.isNotEmpty, homework: s.homework)));
    final day = (classId: args.classId, date: args.date);
    final makeup = past ? ref.watch(dayMakeupProvider(day)).value : null;
    final anyMakeup =
        makeup != null &&
        ref.watch(
          boardControllerProvider(args)
              .select((b) => makeup.keys.any((id) => b.recs.containsKey(id) && showsMakeup(b.recs[id]!))),
        );
    final c = context.colors;
    Widget item(Widget icon, String text) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        icon,
        const SizedBox(width: 6),
        Flexible(
          child: Text(text, style: context.text.bodySmall?.copyWith(fontSize: 12, color: c.inkDim)),
        ),
      ],
    );
    return Semantics(
      container: true,
      label: 'Тэмдгийн тайлбар',
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
        child: Wrap(
          spacing: AppSpace.lg,
          runSpacing: 6,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            item(const RiskDot(), 'Шалгуур хангаагүй'),
            if (s.sent) item(MarkIcon(MarkGlyph.hwSent, color: c.brand, size: 14), 'Даалгавраа илгээсэн'),
            if (s.homework && s.sent)
              item(
                SizedBox.square(
                  dimension: 14,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: c.brandBright.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: c.brandBright.withValues(alpha: 0.6)),
                    ),
                  ),
                ),
                'Илгээсэн ч шалгаагүй, тэмдэглэмэгц энгийн болно',
              ),
            if (s.homework && onlineTests)
              item(
                Icon(AppIcons.laptop, size: 14, color: c.brand),
                'Өмнөх хичээлийн онлайн гэрийн даалгаврын оноо, дарж дүнг үзнэ',
              ),
            if (anyMakeup) item(const MakeupChip(status: MakeupStatus.pending), 'Нөхөх хичээлийн төлөв'),
          ],
        ),
      ),
    );
  }
}

/// Онлайн ангийн даалгаврыг апп доторх илгээлтээр шалгана.
class BoardOnlineClassLink extends StatelessWidget {
  const BoardOnlineClassLink({super.key, required this.classId});

  final String classId;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppCard(
      onTap: () => context.push('/app/classes/${Uri.encodeComponent(classId)}/assignments'),
      child: Row(
        children: [
          Icon(AppIcons.laptop, color: c.brand),
          const SizedBox(width: AppSpace.md),
          const Expanded(child: Text('Онлайн даалгавар шалгах')),
          Icon(AppIcons.forward, color: c.inkDim),
        ],
      ),
    );
  }
}
