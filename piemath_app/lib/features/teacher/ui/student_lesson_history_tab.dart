import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../../../shared/quiz_score/quiz_score.dart';
import '../application/student_calendar_providers.dart';
import '../application/teacher_providers.dart' show errorText, teacherTodayProvider;
import '../data/student_calendar_models.dart';
import '../domain/student_calendar_logic.dart';
import 'student_day_sheet.dart';

/// Сурагчийн хуудасны «Хичээлийн түүх» (вэб 2026-11-08): анхдагч нь сарын хуанли (хичээлийн өдөр бүр нэг
/// хайрцаг: ирц, даалгавар, шалгалтын хувь; нөхөлт өөр хүрээтэй), хайрцаг дарахад тэр өдрийн жижиг цонх.
/// «Жагсаалт» — батлагдсан хичээлийн өмнөх жагсаалт. Зөвхөн ажилтан (сервер шийднэ).
class StudentLessonHistoryTab extends StatefulWidget {
  const StudentLessonHistoryTab({super.key, required this.studentId});

  final String studentId;

  @override
  State<StudentLessonHistoryTab> createState() => _StudentLessonHistoryTabState();
}

class _StudentLessonHistoryTabState extends State<StudentLessonHistoryTab> {
  bool _list = false;

  @override
  Widget build(BuildContext context) {
    Widget toggle(bool list, String label, IconData icon) {
      final on = _list == list;
      final c = context.colors;
      return Semantics(
        selected: on,
        button: true,
        child: TextButton.icon(
          style: TextButton.styleFrom(
            minimumSize: const Size(0, AppSizes.minTap),
            foregroundColor: on ? c.brand : c.inkDim,
            backgroundColor: on ? c.brandTint : null,
          ),
          onPressed: () => setState(() => _list = list),
          icon: Icon(icon, size: 16),
          label: Text(label),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        Wrap(
          alignment: WrapAlignment.end,
          spacing: AppSpace.xs,
          children: [toggle(false, 'Хуанли', AppIcons.schedule), toggle(true, 'Жагсаалт', LucideIcons.listOrdered)],
        ),
        const SizedBox(height: AppSpace.sm),
        if (_list) _LessonList(studentId: widget.studentId) else StudentLessonCalendar(studentId: widget.studentId),
      ],
    );
  }
}

/// Сарын хуанли. Сарын навигаци: хамгийн эрт бичлэгээс өнөөдрийн сар хүртэл.
class StudentLessonCalendar extends ConsumerStatefulWidget {
  const StudentLessonCalendar({super.key, required this.studentId});

  final String studentId;

  @override
  ConsumerState<StudentLessonCalendar> createState() => _StudentLessonCalendarState();
}

class _StudentLessonCalendarState extends ConsumerState<StudentLessonCalendar> {
  String? _month;
  String? _first;
  String? _openKey;

  Future<void> _open(CalendarCell cell, List<MakeupHistoryItem> makeups) async {
    setState(() => _openKey = cell.key);
    await showStudentDaySheet(context, cell: cell, makeups: makeups, studentId: widget.studentId);
    if (mounted) setState(() => _openKey = null);
  }

  @override
  Widget build(BuildContext context) {
    final today = ref.watch(teacherTodayProvider).startOfDay.dateKey;
    final maxMonth = today.substring(0, 7);
    final month = _month ?? maxMonth;
    final arg = (studentId: widget.studentId, month: month);
    final async = ref.watch(studentLessonDaysProvider(arg));
    final data = async.value;
    if (data?.firstDate != null && data!.firstDate != _first) _first = data.firstDate;
    final minMonth = (_first ?? today).substring(0, 7);
    final canPrev = month.compareTo(minMonth) > 0;
    final canNext = month.compareTo(maxMonth) < 0;
    final c = context.colors;

    Widget nav(int dir) => IconButton(
      tooltip: dir < 0 ? 'Өмнөх сар' : 'Дараагийн сар',
      constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
      onPressed: (dir < 0 ? canPrev : canNext) ? () => setState(() => _month = addMonths(month, dir)) : null,
      icon: Icon(dir < 0 ? AppIcons.back : AppIcons.forward),
    );

    final body = async.when(
      skipLoadingOnRefresh: false,
      loading: () => const SkeletonPulse(child: SkeletonCard(lines: 3)),
      error: (e, _) => SizedBox(
        height: 240,
        child: ErrorState(
          message: errorText(e, 'Хичээлийн түүх нээгдсэнгүй'),
          onRetry: () => ref.invalidate(studentLessonDaysProvider(arg)),
        ),
      ),
      data: (d) {
        final cells = calendarCells(d);
        if (cells.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpace.lg),
            child: Text(
              'Энэ сард хичээл, нөхөлт алга',
              textAlign: TextAlign.center,
              style: context.text.bodyMedium?.copyWith(color: c.inkDim),
            ),
          );
        }
        final hasQuiz = d.days.any((x) => x.quiz != null);
        final counts = monthCounts(d.days);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: AppSpace.xs,
              runSpacing: AppSpace.xs,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                for (final cell in cells) ...[
                  if (cell.classLabel != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
                      child: Text(
                        cell.classLabel!,
                        style: context.text.labelSmall?.copyWith(color: c.brandSoft, fontWeight: FontWeight.w700),
                      ),
                    ),
                  StudentDayBox(
                    cell: cell,
                    quizRow: hasQuiz,
                    selected: _openKey != null ? _openKey == cell.key : cell.date == today && !cell.isMakeup,
                    onTap: () => _open(cell, d.makeups),
                  ),
                ],
              ],
            ),
            const SizedBox(height: AppSpace.md),
            _CountLine(
              label: 'Ирц',
              items: [
                for (final (i, s) in AttendanceStatus.values.indexed)
                  if (i == 0 || counts.attendance[s]! > 0) (meta: attendanceMeta(s), n: counts.attendance[s]!),
                if (counts.attendanceUnmarked > 0) (meta: _unmarked, n: counts.attendanceUnmarked),
              ],
            ),
            const SizedBox(height: AppSpace.xs),
            _CountLine(
              label: 'Даалгавар',
              items: [
                for (final (i, s) in HomeworkStatus.values.indexed)
                  if (i == 0 || counts.homework[s]! > 0) (meta: homeworkMeta(s), n: counts.homework[s]!),
                if (counts.homeworkUnmarked > 0) (meta: _unmarked, n: counts.homeworkUnmarked),
              ],
            ),
          ],
        );
      },
    );

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              nav(-1),
              Expanded(
                child: Text(monthKeyLabel(month), textAlign: TextAlign.center, style: context.text.titleSmall),
              ),
              nav(1),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          body,
          const SizedBox(height: AppSpace.md),
          Divider(height: 1, color: c.line),
          const SizedBox(height: AppSpace.sm),
          const _CalendarLegend(),
        ],
      ),
    );
  }
}

const _unmarked = MarkMeta('Тэмдэглээгүй', MarkGlyph.none, MarkTone.neutral);

class _CountLine extends StatelessWidget {
  const _CountLine({required this.label, required this.items});

  final String label;
  final List<({MarkMeta meta, int n})> items;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 84,
          child: Text(label, style: context.text.labelMedium?.copyWith(color: c.inkDim)),
        ),
        Expanded(
          child: Wrap(
            spacing: AppSpace.md,
            runSpacing: AppSpace.xs,
            children: [
              for (final i in items)
                Semantics(
                  label: '${i.meta.label} ${i.n}',
                  excludeSemantics: true,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      MarkIcon(i.meta.glyph, color: i.meta.tone.color(c), size: 16),
                      const SizedBox(width: 2),
                      Text('${i.n}', style: context.text.labelLarge),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Тэмдэгийн тайлбар — хамгийн доор (эзний дүрэм).
class _CalendarLegend extends StatelessWidget {
  const _CalendarLegend();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    Widget box({required Color border, Color? fill, bool dashed = false}) => SizedBox(
      width: 14,
      height: 14,
      child: CustomPaint(
        painter: _BoxPainter(border: border, fill: fill, dashed: dashed, radius: 3),
      ),
    );
    Widget item(Widget icon, String text) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        icon,
        const SizedBox(width: AppSpace.xs),
        Flexible(child: Text(text, style: context.text.bodySmall)),
      ],
    );
    return Semantics(
      container: true,
      label: 'Тэмдэгийн тайлбар',
      child: Wrap(
        spacing: AppSpace.lg,
        runSpacing: AppSpace.sm,
        children: [
          for (final s in AttendanceStatus.values)
            item(
              MarkIcon(attendanceMeta(s).glyph, color: attendanceMeta(s).tone.color(c), size: 14),
              attendanceMeta(s).label,
            ),
          for (final s in HomeworkStatus.values)
            item(
              MarkIcon(homeworkMeta(s).glyph, color: homeworkMeta(s).tone.color(c), size: 14),
              'Даалгавар ${homeworkMeta(s).label.toLowerCase()}',
            ),
          item(box(border: c.brandBright, fill: c.brandTint), 'Нөхөлт (406, өөр анги)'),
          item(box(border: c.info), 'Өөр ангид тэмдэглэсэн'),
          item(box(border: c.line, dashed: true), 'Болоогүй'),
        ],
      ),
    );
  }
}

/// Хуанлийн НЭГ хичээлийн хайрцаг (вэбийн `DayBox`): өдөр, ирцийн дүрс, даалгаврын дүрс, шалгалтын хувь.
/// Тэмдэглээгүй бол зураас, ирээдүйн өдөр тасархай хүрээтэй, нөхөлт цэнхэр дэвсгэртэй. Дарахад ҮРГЭЛЖ дэлгэрэнгүй.
class StudentDayBox extends StatelessWidget {
  const StudentDayBox({
    super.key,
    required this.cell,
    required this.quizRow,
    required this.onTap,
    this.selected = false,
  });

  final CalendarCell cell;

  /// Сард шалгалт байгаа — бүх хайрцаг ижил өндөр.
  final bool quizRow;
  final bool selected;
  final VoidCallback onTap;

  /// Дэлгэц уншигчид: «11-р сарын 3, Даваа, 12-6, Ирсэн, даалгавар хийсэн, …».
  static String label(CalendarCell cell) {
    final d = cell.day;
    final dayText = lessonDayTitle(cell.date);
    final v = cell.makeup;
    if (v != null) {
      return [
        dayText,
        v.label,
        if (v.attendance != null) attendanceMeta(v.attendance!).label.toLowerCase(),
        if (v.tests.isNotEmpty) v.tests.map((t) => t.title).join(', '),
      ].join(', ');
    }
    final a = d!.attendance;
    final h = d.homework?.status;
    return [
      dayText,
      d.classroomName,
      if (a != null)
        '${attendanceMeta(a.status).label}${a.lateRange != null ? ' ${lateRangeShort(a.lateRange!)}' : ''}'
      else
        d.future ? 'хараахан болоогүй' : 'ирц тэмдэглээгүй',
      if (h != null) 'даалгавар ${homeworkMeta(h).label.toLowerCase()}',
      if (d.quiz != null) quizDayText(d.quiz!.score, d.quiz!.problemCount),
      ?d.testsText,
    ].join(', ');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final d = cell.day;
    final v = cell.makeup;
    final att = d?.attendance?.status ?? v?.attendance;
    final hw = d?.homework?.status ?? v?.homework;
    final quiz = d?.quiz;
    final makeup = v != null;
    final muted = d != null && att == null && hw == null && quiz == null && d.future;
    final otherClass = d != null && !d.own;
    final border = makeup
        ? c.brandBright
        : otherClass
        ? c.info
        : c.line;
    final dim = c.inkDim.withValues(alpha: 0.6);

    Widget attIcon() {
      if (att != null) return MarkIcon(attendanceMeta(att).glyph, color: attendanceMeta(att).tone.color(c), size: 14);
      if (makeup) return Icon(v.place.room406 ? AppIcons.doorOpen : AppIcons.repeat, size: 14, color: c.brand);
      if (muted) return const SizedBox(height: 14);
      return MarkIcon(MarkGlyph.none, color: dim, size: 14);
    }

    Widget hwIcon() {
      if (hw != null) return MarkIcon(homeworkMeta(hw).glyph, color: homeworkMeta(hw).tone.color(c), size: 14);
      // Шалгалтын оноотой бол «тэмдэглээгүй» зураас тавихгүй
      if (muted || quiz != null || makeup) return const SizedBox(height: 14);
      return MarkIcon(MarkGlyph.none, color: dim, size: 14);
    }

    Widget quizCell() {
      if (quiz == null) return const SizedBox(height: 16);
      final tone = quizTone(quiz.score, quiz.problemCount);
      final pct = quizPercent(quiz.score, quiz.problemCount);
      if (tone == null || pct == null) return const SizedBox(height: 16);
      return QuizPercentBadge(percent: pct, tone: tone, small: true);
    }

    return Semantics(
      button: true,
      selected: selected,
      label: label(cell),
      excludeSemantics: true,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadius.sm),
          child: CustomPaint(
            painter: _BoxPainter(
              border: border,
              fill: makeup ? c.brandTint : (muted ? null : c.surface),
              dashed: muted,
              radius: AppRadius.sm,
              ring: selected ? c.brandBright : null,
            ),
            child: SizedBox(
              width: 44,
              height: quizRow ? 78 : 60,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '${cell.dayOfMonth}',
                    style: context.text.labelSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: muted ? dim : c.ink,
                      height: 1,
                    ),
                  ),
                  const SizedBox(height: 3),
                  attIcon(),
                  const SizedBox(height: 2),
                  hwIcon(),
                  if (quizRow) ...[const SizedBox(height: 3), quizCell()],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Хайрцгийн хүрээ: бүтэн эсвэл тасархай, сонгосон бол гадна цэнхэр цагираг.
class _BoxPainter extends CustomPainter {
  const _BoxPainter({required this.border, required this.radius, this.fill, this.dashed = false, this.ring});

  final Color border;
  final Color? fill;
  final bool dashed;
  final double radius;
  final Color? ring;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius));
    if (fill != null) canvas.drawRRect(rect, Paint()..color = fill!);
    final stroke = Paint()
      ..color = border
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final inner = rect.deflate(0.5);
    if (!dashed) {
      canvas.drawRRect(inner, stroke);
    } else {
      final path = Path()..addRRect(inner);
      for (final m in path.computeMetrics()) {
        var d = 0.0;
        while (d < m.length) {
          canvas.drawPath(m.extractPath(d, d + 3), stroke);
          d += 6;
        }
      }
    }
    if (ring != null) {
      canvas.drawRRect(
        rect.inflate(2.5),
        Paint()
          ..color = ring!
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2,
      );
    }
  }

  @override
  bool shouldRepaint(_BoxPainter old) =>
      old.border != border || old.fill != fill || old.dashed != dashed || old.ring != ring || old.radius != radius;
}

/// Батлагдсан хичээлийн жагсаалт (вэбийн `LessonList`).
class _LessonList extends ConsumerWidget {
  const _LessonList({required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(studentLessonRecordsProvider(studentId));
    final c = context.colors;
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const LoadingState(cards: 2, padding: EdgeInsets.zero),
      error: (e, _) => SizedBox(
        height: 240,
        child: ErrorState(
          message: errorText(e, 'Хичээлийн түүх нээгдсэнгүй'),
          onRetry: () => ref.invalidate(studentLessonRecordsProvider(studentId)),
        ),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const SizedBox(
            height: 240,
            child: EmptyState(
              icon: AppIcons.bookOpenCheck,
              title: 'Батлагдсан хичээл алга',
              message: 'Багш хичээлээ хуваарь дээрээс баталгаажуулахад энд гарна',
            ),
          );
        }
        final attended = rows
            .where((r) => r.attendance == AttendanceStatus.present || r.attendance == AttendanceStatus.late)
            .length;
        return AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.lg, AppSpace.sm),
                child: Wrap(
                  spacing: AppSpace.md,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text('Хичээлийн түүх', style: context.text.titleSmall),
                    Meta(
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                      items: ['${rows.length} хичээл', '$attended ирсэн'],
                    ),
                  ],
                ),
              ),
              for (final r in rows) ...[Divider(height: 1, color: c.line), _LessonRecordTile(row: r)],
            ],
          ),
        );
      },
    );
  }
}

class _LessonRecordTile extends StatelessWidget {
  const _LessonRecordTile({required this.row});

  final LessonRecordRow row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final topic = row.topic == null ? null : regroupTopicText(row.topic);
    final p = row.date.split('-');
    final md = p.length == 3 ? '${p[1]}.${p[2]}' : row.date;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 56,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(md, style: context.text.labelLarge),
                Text(hm(row.startMinute), style: context.text.bodySmall?.copyWith(color: c.inkDim)),
              ],
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  (topic?.isNotEmpty ?? false) ? topic! : row.classroomName,
                  style: context.text.titleSmall,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                Meta(
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  items: [
                    if (topic != null) row.classroomName,
                    row.leadTeacherName,
                    row.room,
                    if (row.testCount > 0) '${row.testCount} тест',
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          AttendanceMarkView(status: row.attendance, compact: false),
        ],
      ),
    );
  }
}
