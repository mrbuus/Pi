import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format/person_name.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/staff_providers.dart';
import '../application/teacher_providers.dart';
import '../data/class_dashboard_models.dart';
import '../data/staff_models.dart';
import 'staff_widgets.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

Map<String, String> _names(DashDetail d) => rosterNames([
  for (final s in d.students) (id: s.id, firstName: s.firstName, lastName: s.lastName, role: null),
]);

Widget _riskPills(BuildContext context, DashStudent s) {
  final c = context.colors;
  return Wrap(
    spacing: AppSpace.xs,
    runSpacing: AppSpace.xs,
    children: [
      for (final r in s.risk) Pill(icon: AppIcons.warning, label: dashRiskLabel(r), color: c.error),
      for (final f in s.flags)
        Pill(
          icon: dashFlagMeta(f.kind).concern ? AppIcons.flag : TeacherIcons.trendingUp,
          label: dashFlagMeta(f.kind).label,
          color: dashFlagMeta(f.kind).concern ? c.warning : c.success,
        ),
    ],
  );
}

/// «Тойм»: сүүлийн хоногуудын тоо, төлбөрийн төлөв (эрхтэй бол), анхаарах сурагчид.
class ClassOverviewTab extends StatelessWidget {
  const ClassOverviewTab({
    super.key,
    required this.detail,
    required this.today,
    required this.onRefresh,
    this.onOpenPayments,
  });

  final DashDetail detail;
  final String today;
  final Future<void> Function() onRefresh;

  /// «Төлбөр» таб руу (Админ, Багш+) — вэбийн «Сар бүрээр».
  final VoidCallback? onOpenPayments;

  @override
  Widget build(BuildContext context) {
    final d = detail;
    final c = context.colors;
    final names = _names(d);
    final flagged = d.students.where((s) => s.needsAttention).toList();
    final teachers = [d.classTeacher, d.assistantTeacher == null ? null : 'Туслах: ${d.assistantTeacher}'];
    final pay = d.payment;
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
        children: [
          Meta(
            items: [
              classTypeLabel(d.type),
              if (d.grade != null) '${d.grade}-р анги',
              '${d.summary.students} сурагч',
            ],
          ),
          if (teachers.any((t) => t != null)) ...[
            const SizedBox(height: AppSpace.xs),
            Meta(style: context.text.bodySmall?.copyWith(color: c.inkDim), items: teachers),
          ],
          const SizedBox(height: AppSpace.md),
          FilledButton.icon(
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
            onPressed: () => context.push('/app/teacher/board/${Uri.encodeComponent(d.id)}?date=$today'),
            icon: const Icon(AppIcons.exam),
            label: const Text('Өнөөдрийн ирц, даалгавар'),
          ),
          if (d.isOnline) ...[
            const SizedBox(height: AppSpace.sm),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
              onPressed: () => context.push('/app/classes/${Uri.encodeComponent(d.id)}/assignments'),
              icon: const Icon(AppIcons.laptop),
              label: const Text('Онлайн даалгавар шалгах'),
            ),
          ],
          const SizedBox(height: AppSpace.lg),
          SectionHeader(title: 'Сүүлийн ${d.windowDays} хоног', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpace.sm),
          AppCard(
            child: Wrap(
              spacing: AppSpace.xl,
              runSpacing: AppSpace.md,
              children: [
                StatTile(label: 'Ирц', value: pct(d.summary.attendanceRate)),
                StatTile(label: 'Даалгавар', value: pct(d.summary.homeworkRate)),
                StatTile(
                  label: 'Шалгалт',
                  value: d.summary.examAvg == null ? (d.summary.exams > 0 ? 'Дүн алга' : '-') : '${d.summary.examAvg}%',
                ),
                StatTile(
                  label: 'Анхаарах',
                  value: '${d.summary.riskCount}',
                  icon: d.summary.riskCount > 0 ? AppIcons.warning : null,
                  color: c.error,
                ),
                StatTile(label: 'Сайжирсан', value: '${d.summary.improvedCount}'),
                StatTile(label: 'Нөхөх хэрэгтэй', value: '${d.summary.makeupStudents}'),
              ],
            ),
          ),
          if (pay != null && pay.values.any((n) => n > 0)) ...[
            const SizedBox(height: AppSpace.lg),
            SectionHeader(
              title: 'Энэ сарын төлбөр',
              padding: EdgeInsets.zero,
              trailing: onOpenPayments == null
                  ? null
                  : TextButton(
                      key: const ValueKey('overview-payments'),
                      style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                      onPressed: onOpenPayments,
                      child: const Text('Сар бүрээр'),
                    ),
            ),
            const SizedBox(height: AppSpace.sm),
            AppCard(
              child: Wrap(
                spacing: AppSpace.md,
                runSpacing: AppSpace.sm,
                children: [
                  for (final s in PayState.values)
                    if ((pay[s] ?? 0) > 0) _CountPill(state: s, count: pay[s]!),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpace.lg),
          SectionHeader(title: 'Анхаарах сурагчид (${flagged.length})', padding: EdgeInsets.zero),
          const SizedBox(height: AppSpace.sm),
          if (flagged.isEmpty)
            const AppCard(
              child: EmptyState(icon: AppIcons.success, title: 'Одоогоор онцгой анхаарах сурагч алга'),
            )
          else
            AppCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  for (final (i, s) in flagged.indexed) ...[
                    if (i > 0) Divider(height: 1, color: c.line),
                    _StudentTile(student: s, name: names[s.id] ?? s.firstName, showMetrics: false),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _CountPill extends StatelessWidget {
  const _CountPill({required this.state, required this.count});

  final PayState state;
  final int count;

  @override
  Widget build(BuildContext context) {
    final pill = payPill(context, state);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [pill, const SizedBox(width: AppSpace.xs), Text('$count', style: context.text.titleSmall)],
    );
  }
}

class _StudentTile extends StatelessWidget {
  const _StudentTile({required this.student, required this.name, required this.showMetrics});

  final DashStudent student;
  final String name;
  final bool showMetrics;

  @override
  Widget build(BuildContext context) {
    final s = student;
    final c = context.colors;
    final metrics = <Object?>[
      'Ирц ${pct(s.attendanceRate)}',
      'Даалгавар ${pct(s.homeworkRate)}',
      'Шалгалт ${pct(s.examAvg)}',
      if ((s.makeup ?? 0) > 0) 'Нөхөх ${s.makeup}',
    ];
    return InkWell(
      onTap: () => context.push('/app/students/${Uri.encodeComponent(s.id)}', extra: name),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: teacherTap),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: context.text.titleSmall),
                    if (showMetrics) ...[
                      const SizedBox(height: AppSpace.xs),
                      Meta(style: context.text.bodySmall?.copyWith(color: c.inkDim), items: metrics),
                    ],
                    if (s.risk.isNotEmpty || s.flags.isNotEmpty || s.payment != null) ...[
                      const SizedBox(height: AppSpace.xs),
                      Wrap(
                        spacing: AppSpace.xs,
                        runSpacing: AppSpace.xs,
                        children: [
                          _riskPills(context, s),
                          if (showMetrics && s.payment != null) payPill(context, s.payment!),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              Icon(AppIcons.forward, color: c.inkDim),
            ],
          ),
        ),
      ),
    );
  }
}

/// «Сурагчид»: сурагч бүрийн ирц, даалгавар, дүн, анхаарах шалтгаан, төлбөрийн төлөв (мөнгөгүй).
class ClassStudentsTab extends StatefulWidget {
  const ClassStudentsTab({super.key, required this.detail, required this.onRefresh});

  final DashDetail detail;
  final Future<void> Function() onRefresh;

  @override
  State<ClassStudentsTab> createState() => _ClassStudentsTabState();
}

class _ClassStudentsTabState extends State<ClassStudentsTab> {
  bool _flaggedOnly = false;

  @override
  Widget build(BuildContext context) {
    final d = widget.detail;
    final names = _names(d);
    final sorted = [...d.students]..sort((a, b) => (names[a.id] ?? '').compareTo(names[b.id] ?? ''));
    final shown = _flaggedOnly ? sorted.where((s) => s.needsAttention).toList() : sorted;
    final c = context.colors;
    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
        children: [
          SegmentedButton<bool>(
            segments: [
              ButtonSegment(value: false, label: Text('Бүгд (${sorted.length})')),
              ButtonSegment(value: true, label: Text('Анхаарах (${sorted.where((s) => s.needsAttention).length})')),
            ],
            selected: {_flaggedOnly},
            showSelectedIcon: false,
            onSelectionChanged: (s) => setState(() => _flaggedOnly = s.first),
          ),
          const SizedBox(height: AppSpace.md),
          if (shown.isEmpty)
            const AppCard(
              child: EmptyState(icon: AppIcons.students, title: 'Сурагч алга'),
            )
          else
            AppCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  for (final (i, s) in shown.indexed) ...[
                    if (i > 0) Divider(height: 1, color: c.line),
                    _StudentTile(student: s, name: names[s.id] ?? s.firstName, showMetrics: true),
                  ],
                ],
              ),
            ),
          const SizedBox(height: AppSpace.md),
          Text(
            'Ирц, даалгавар нь сүүлийн ${d.windowDays} хоногийнх',
            style: context.text.bodySmall?.copyWith(color: c.inkDim),
          ),
        ],
      ),
    );
  }
}

/// «Нөхөх»: сүүлийн 60 хоногийн нөхөх хичээл (нөхөөгүй нь эхэнд, нөхсөнийг сонговол).
class ClassMakeupTab extends ConsumerStatefulWidget {
  const ClassMakeupTab({super.key, required this.classId, required this.today});

  final String classId;
  final String today;

  @override
  ConsumerState<ClassMakeupTab> createState() => _ClassMakeupTabState();
}

class _ClassMakeupTabState extends ConsumerState<ClassMakeupTab> {
  bool _showDone = false;

  @override
  Widget build(BuildContext context) {
    final args = (classId: widget.classId, today: widget.today);
    final async = ref.watch(classMakeupProvider(args));
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const LoadingState(cards: 2),
      error: (e, _) => ErrorState(
        message: errorText(e, 'Нөхөх хичээл нээгдсэнгүй'),
        onRetry: () => ref.invalidate(classMakeupProvider(args)),
      ),
      data: (rows) {
        final open = rows.where((r) => r.status.isOpen).toList();
        final closed = rows.length - open.length;
        final shown = [...(_showDone ? rows : open)]..sort((a, b) => b.date.compareTo(a.date));
        final c = context.colors;
        return RefreshIndicator(
          onRefresh: () => ref.refresh(classMakeupProvider(args).future).then((_) {}, onError: (_) {}),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
            children: [
              Row(
                children: [
                  Expanded(child: Text('Нөхөөгүй: ${open.length}', style: context.text.titleSmall)),
                  if (closed > 0)
                    TextButton(
                      style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                      onPressed: () => setState(() => _showDone = !_showDone),
                      child: Text(_showDone ? 'Нөхөөгүйг л' : 'Нөхсөн ч ($closed)'),
                    ),
                ],
              ),
              if (shown.isEmpty)
                const SizedBox(
                  height: 240,
                  child: EmptyState(icon: AppIcons.success, title: 'Нөхөөгүй хичээл алга'),
                )
              else
                AppCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (final (i, r) in shown.indexed) ...[
                        if (i > 0) Divider(height: 1, color: c.line),
                        _MakeupTile(row: r),
                      ],
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

String _reasonLabel(String? r) => switch (r) {
  'ABSENT' => 'Тасалсан',
  'EXCUSED' => 'Чөлөөтэй',
  'LATE' => 'Хоцорсон',
  _ => '',
};

class _MakeupTile extends StatelessWidget {
  const _MakeupTile({required this.row});

  final MakeupRow row;

  @override
  Widget build(BuildContext context) {
    final day = parseDateKey(row.date);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.studentName, style: context.text.titleSmall),
                Meta(
                  style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                  items: [day == null ? row.date : DateMn.longWithWeekday(day, shortWeekday: true), _reasonLabel(row.reason)],
                ),
              ],
            ),
          ),
          makeupPill(context, row.status, compact: true),
        ],
      ),
    );
  }
}
