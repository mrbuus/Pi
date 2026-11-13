import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/quiz_score/quiz_score.dart';
import '../data/parent_models.dart';
import '../data/parent_repository.dart';
import '../data/weekly_report.dart';
import '../domain/parent_labels.dart';

/// Өнөөдөр (UB) — тестэд override.
final parentTodayProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

/// 7 хоногийн тайлан (`/app/parent/weekly?studentId=&week=`, вэбийн `WeeklyReportClient`).
class WeeklyReportScreen extends ConsumerStatefulWidget {
  const WeeklyReportScreen({super.key, this.initialStudentId, this.initialWeek});

  final String? initialStudentId;

  /// Даваа гарагийн `YYYY-MM-DD`.
  final String? initialWeek;

  @override
  ConsumerState<WeeklyReportScreen> createState() => _WeeklyReportScreenState();
}

class _WeeklyReportScreenState extends ConsumerState<WeeklyReportScreen> {
  String? _studentId;
  String? _week;

  @override
  void initState() {
    super.initState();
    _studentId = widget.initialStudentId;
    final w = widget.initialWeek;
    // Даваа биш огноо ирвэл тухайн долоо хоногийн Даваа руу (сервер 400 өгөхөөс сэргийлнэ).
    final d = parseDateKey(w);
    _week = d == null ? null : mondayKey(d);
  }

  @override
  Widget build(BuildContext context) {
    final childrenAsync = ref.watch(parentChildrenProvider);
    final weeks = weekOptions(ref.watch(parentTodayProvider));
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Долоо хоногийн тайлан')),
      body: childrenAsync.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: e is ApiError ? e.message : 'Хүүхдийн жагсаалтыг ачаалж чадсангүй.',
          onRetry: () => ref.invalidate(parentChildrenProvider),
        ),
        data: (links) {
          final verified = [
            for (final l in links)
              if (l.verified) l.student,
          ];
          if (verified.isEmpty) {
            return const EmptyState(
              icon: AppIcons.children,
              title: 'Баталгаажсан хүүхэд алга',
              message: 'Баталгаажсан хүүхдийн долоо хоногийн тайлан энд харагдана.',
            );
          }
          final student = verified.where((s) => s.id == _studentId).firstOrNull ?? verified.first;
          final week = _week != null && weeks.contains(_week) ? _week! : (_week ?? weeks.first);
          return ListView(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
            children: [
              _Pickers(
                children: verified,
                studentId: student.id,
                weeks: weeks.contains(week) ? weeks : [week, ...weeks],
                week: week,
                onStudent: (id) => setState(() => _studentId = id),
                onWeek: (w) => setState(() => _week = w),
              ),
              const SizedBox(height: AppSpace.lg),
              _ReportBody(args: (studentId: student.id, week: week)),
            ],
          );
        },
      ),
    );
  }
}

class _Pickers extends StatelessWidget {
  const _Pickers({
    required this.children,
    required this.studentId,
    required this.weeks,
    required this.week,
    required this.onStudent,
    required this.onWeek,
  });

  final List<ChildStudent> children;
  final String studentId;
  final List<String> weeks;
  final String week;
  final ValueChanged<String> onStudent;
  final ValueChanged<String> onWeek;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (children.length > 1) ...[
            DropdownButtonFormField<String>(
              initialValue: studentId,
              decoration: const InputDecoration(labelText: 'Хүүхэд'),
              items: [for (final c in children) DropdownMenuItem(value: c.id, child: Text(c.fullName))],
              onChanged: (v) => v == null ? null : onStudent(v),
            ),
            const SizedBox(height: AppSpace.md),
          ],
          DropdownButtonFormField<String>(
            initialValue: week,
            decoration: const InputDecoration(labelText: 'Долоо хоног (Даваа гараг)'),
            items: [for (final w in weeks) DropdownMenuItem(value: w, child: Text(weekLabel(w)))],
            onChanged: (v) => v == null ? null : onWeek(v),
          ),
        ],
      ),
    );
  }
}

class _ReportBody extends ConsumerWidget {
  const _ReportBody({required this.args});

  final ({String studentId, String week}) args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(weeklyReportProvider(args));
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const SkeletonPulse(
        child: Column(
          children: [
            SkeletonCard(),
            SizedBox(height: AppSpace.md),
            SkeletonCard(lines: 3),
          ],
        ),
      ),
      error: (e, _) => SizedBox(
        height: 300,
        child: ErrorState(
          message: e is ApiError ? e.message : 'Тайлан ачаалж чадсангүй. Дахин оролдоно уу.',
          onRetry: () => ref.invalidate(weeklyReportProvider(args)),
        ),
      ),
      data: (r) => WeeklyReportView(report: r),
    );
  }
}

/// Тайлангийн агуулга (тоо бүгд серверийнх).
class WeeklyReportView extends StatelessWidget {
  const WeeklyReportView({super.key, required this.report});

  final WeeklyReport report;

  @override
  Widget build(BuildContext context) {
    final r = report;
    final snapshot = parseApiInstant(r.snapshotAt);
    final dim = context.text.bodySmall;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Meta(items: ['${r.student.firstName} ${r.student.lastName}'.trim(), '${r.week.start} – ${r.week.end}']),
        if (snapshot != null)
          Text('Мэдээлэл ${DateMn.numericWithTime(UbDateTime.fromInstant(snapshot))} цагийн байдлаар', style: dim),
        const SizedBox(height: AppSpace.md),
        _Stat(
          title: 'Ирц',
          value: '${r.attendance.present} ирсэн',
          meta: ['${r.attendance.absent} тасалсан', '${r.attendance.excused} чөлөөтэй'],
        ),
        _Stat(title: 'Тест ба дасгал', value: '${r.tests.length} тест', meta: ['${r.practiceCount} дасгал']),
        _Stat(
          title: 'Даалгаврын явц',
          value: 'Даалгавар: ${r.homework.assignments.done} хийсэн',
          meta: [
            '${r.homework.assignments.notDone} хийгээгүй',
            'Ангийн тэмдэглэгээ: ${r.homework.dailyMarks.done} хийсэн',
            '${r.homework.dailyMarks.partial} дутуу',
            '${r.homework.dailyMarks.notDone} хийгээгүй',
          ],
          extra: [
            for (final q in r.homework.quizzes)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.xs),
                child: Row(
                  children: [
                    SizedBox(
                      width: 48,
                      child: Text(
                        q.date.length >= 10 ? q.date.substring(5, 10) : q.date,
                        style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                      ),
                    ),
                    Flexible(
                      child: QuizScoreChip(score: q.score, problemCount: q.problemCount),
                    ),
                  ],
                ),
              ),
          ],
        ),
        _Stat(
          title: 'Сэдвийн ахиц',
          value: 'Сайн: ${r.topics.best?.topic ?? 'мэдээлэл алга'}',
          meta: [
            'Давтах: ${r.topics.weakest?.topic ?? 'мэдээлэл алга'}',
            if (!r.topics.complete && r.topics.sampleLimit != null)
              'Эхний ${r.topics.sampleLimit} оролдлогод тулгуурлав',
          ],
        ),
        const SectionHeader(title: 'Тест ба дүн'),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (!r.testResultsComplete && r.testResultLimit != null)
                Text('Эхний ${r.testResultLimit} бичлэгийг харуулж байна', style: dim),
              if (r.tests.isEmpty)
                Text('Энэ долоо хоногт тест бүртгэгдээгүй', style: dim)
              else
                for (var i = 0; i < r.tests.length; i++) ...[
                  if (i > 0) Divider(height: 1, color: context.colors.line),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
                    child: Row(
                      children: [
                        Expanded(child: MetaTitle(r.tests[i].title, style: context.text.bodyMedium)),
                        const SizedBox(width: AppSpace.sm),
                        Text(
                          r.tests[i].score == null || r.tests[i].maxScore == null
                              ? 'Дүн бүртгэгдээгүй'
                              : '${r.tests[i].score!.round()}/${r.tests[i].maxScore!.round()}',
                          style: context.text.titleSmall,
                        ),
                      ],
                    ),
                  ),
                ],
            ],
          ),
        ),
        const SectionHeader(title: 'Дараа долоо хоногийн хуваарь'),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (r.nextWeekSchedule.isEmpty)
                Text('Дараа долоо хоногийн хуваарь бүртгэгдээгүй', style: dim)
              else
                for (var i = 0; i < r.nextWeekSchedule.length; i++) ...[
                  if (i > 0) Divider(height: 1, color: context.colors.line),
                  _LessonRow(lesson: r.nextWeekSchedule[i]),
                ],
            ],
          ),
        ),
      ],
    );
  }
}

class _LessonRow extends StatelessWidget {
  const _LessonRow({required this.lesson});

  final ReportLesson lesson;

  @override
  Widget build(BuildContext context) {
    final d = parseDateKey(lesson.date);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${d == null ? lesson.date : DateMn.longWithWeekday(d, shortWeekday: true)}, '
            '${minuteLabel(lesson.startMinute)}–${minuteLabel(lesson.endMinute)}',
            style: context.text.titleSmall,
          ),
          Meta(items: [lesson.classroom, lesson.room]),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.title, required this.value, this.meta = const [], this.extra = const []});

  final String title;
  final String value;
  final List<String?> meta;

  /// Доорх нэмэлт мөрүүд (шалгалтын оноо).
  final List<Widget> extra;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: context.text.bodySmall),
            const SizedBox(height: AppSpace.xs),
            Text(value, style: context.text.titleLarge),
            Meta(items: meta),
            ...extra,
          ],
        ),
      ),
    );
  }
}
