import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../../../shared/payment_status/paid_until_card.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_models.dart';
import 'independent_tab.dart';
import 'student_info_tab.dart';
import 'student_lesson_history_tab.dart';
import 'student_progress_extras.dart';
import 'student_syllabus_tab.dart';
import 'teacher_widgets.dart';

/// Сурагчийн хуудас (`/app/students/:id`): Ангийн явц, Шалгалт, Хичээлийн түүх (хуанли), Сэдэв хөтөлбөр,
/// Тэмдэглэл, Бие даасан явц, Мэдээлэл (ангийн түүх, засах). Төлбөрөөс зөвхөн «хэдий хүртэл төлсөн» төлөв ба
/// «Одоо гарвал буцаах дүн» (энгийн багш бусад мөнгөн дүн харахгүй — сервер өгөхгүй).
///
/// Шинэ таб нэмэх: [_baseTabs]-д нэг мөр (бүх ажилтанд), эсвэл эрхээс хамаарах бол дуудагч [extraTabs]-аар
/// («Мэдээлэл»-ийн өмнө). Удирдлагын «Гарсан тооцоо» нь сүүлээсээ 2 дахь таб гэж тооцогддог.
///
/// Удирдлагын хувилбар (`features/students_admin`, Багш+/Админ) энэ хуудсыг ДАВХАРДУУЛАХГҮЙ — [header]
/// (төлөв, үйлдэл), [extraTabs] (Төлбөр, Гарсан тооцоо)-оор өргөтгөнө. [embedded] = таблетын баруун тал.
class StudentScreen extends StatelessWidget {
  const StudentScreen({
    super.key,
    required this.studentId,
    this.name,
    this.header,
    this.extraTabs = const [],
    this.embedded = false,
  });

  final String studentId;
  final String? name;

  /// Табын дээрх хэсэг (удирдлагын төлөв, товч).
  final Widget? header;

  /// «Мэдээлэл»-ийн өмнө нэмэгдэх табууд.
  final List<StudentExtraTab> extraTabs;

  /// Жагсаалтын хажууд (таблет) — AppBar-т буцах сум харуулахгүй.
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final tabs = <(String, Widget)>[
      ..._baseTabs(studentId),
      for (final t in extraTabs) (t.label, t.child),
      ('Мэдээлэл', StudentInfoTab(studentId: studentId)),
    ];
    final view = TabBarView(children: [for (final t in tabs) t.$2]);
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: !embedded,
          title: Text(name ?? 'Сурагч'),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [for (final t in tabs) Tab(text: t.$1)],
          ),
        ),
        body: header == null
            ? view
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  header!,
                  Expanded(child: view),
                ],
              ),
      ),
    );
  }
}

/// Бүх ажилтанд харагдах табууд (вэбийн `StudentProgress.tsx`-ийн дараалал).
List<(String, Widget)> _baseTabs(String studentId) => [
  ('Ангийн явц', _ProgressTab(studentId: studentId)),
  ('Шалгалт', _ExamsTab(studentId: studentId)),
  ('Хичээлийн түүх', StudentLessonHistoryTab(studentId: studentId)),
  ('Сэдэв хөтөлбөр', StudentSyllabusTab(studentId: studentId)),
  ('Тэмдэглэл', StudentNotesTab(studentId: studentId)),
  ('Бие даасан явц', IndependentTab(studentId: studentId)),
];

/// [StudentScreen]-ийн нэмэлт таб.
class StudentExtraTab {
  const StudentExtraTab(this.label, this.child);

  final String label;
  final Widget child;
}

/// Сүүлийн 30 хоногийн ирц ба даалгавар (өдрөөр, шинэ нь дээр).
class _ProgressTab extends ConsumerWidget {
  const _ProgressTab({required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final today = ref.watch(teacherTodayProvider).startOfDay;
    final range = (studentId: studentId, from: today.addDays(-30).dateKey, to: today.dateKey);
    final async = ref.watch(studentProgressProvider(range));
    final c = context.colors;
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        PaidUntilCard(studentId: studentId, compact: true),
        StudentRefundEstimateRow(studentId: studentId),
        const SizedBox(height: AppSpace.lg),
        StudentMakeupHistory(studentId: studentId),
        Text('Сүүлийн 30 хоног', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        ...async.when(
          skipLoadingOnRefresh: false,
          loading: () => [const LoadingState(cards: 2, padding: EdgeInsets.zero)],
          error: (e, _) => [
            SizedBox(
              height: 260,
              child: ErrorState(
                message: errorText(e, 'Ирцийн түүх нээгдсэнгүй'),
                onRetry: () => ref.invalidate(studentProgressProvider(range)),
              ),
            ),
          ],
          data: (d) {
            final days = <String>{
              for (final a in d.attendance) a.date.substring(0, 10),
              for (final h in d.homework) h.date.substring(0, 10),
            }.toList()..sort((a, b) => b.compareTo(a));
            if (days.isEmpty) {
              return [const SizedBox(height: 220, child: EmptyState(title: 'Энэ хугацаанд бүртгэл алга'))];
            }
            final att = {for (final a in d.attendance) a.date.substring(0, 10): a};
            final hw = {for (final h in d.homework) h.date.substring(0, 10): h};
            final counts = {
              for (final s in AttendanceStatus.values) s: d.attendance.where((a) => a.status == s).length,
            };
            final hwCounts = {for (final s in HomeworkStatus.values) s: d.homework.where((h) => h.status == s).length};
            return [
              Wrap(
                spacing: AppSpace.lg,
                runSpacing: AppSpace.sm,
                children: [
                  for (final s in AttendanceStatus.values) _CountChip(meta: attendanceMeta(s), n: counts[s]!),
                  for (final s in HomeworkStatus.values) _CountChip(meta: homeworkMeta(s), n: hwCounts[s]!),
                ],
              ),
              const SizedBox(height: AppSpace.md),
              AppCard(
                padding: EdgeInsets.zero,
                // stretch: мөр бүр картын бүтэн өргөнийг авч зүүн тийш тэгширнэ (өмнө нь голлодог байв)
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final (i, day) in days.indexed) ...[
                      if (i > 0) Divider(height: 1, color: c.line),
                      _DayRow(dateKey: day, att: att[day], hw: hw[day]),
                    ],
                  ],
                ),
              ),
            ];
          },
        ),
      ],
    );
  }
}

class _CountChip extends StatelessWidget {
  const _CountChip({required this.meta, required this.n});

  final MarkMeta meta;
  final int n;

  @override
  Widget build(BuildContext context) => Semantics(
    label: '${meta.label} $n',
    excludeSemantics: true,
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        MarkIcon(meta.glyph, color: meta.tone.color(context.colors), size: 16),
        const SizedBox(width: AppSpace.xs),
        Text('$n', style: context.text.labelLarge),
      ],
    ),
  );
}

class _DayRow extends StatelessWidget {
  const _DayRow({required this.dateKey, this.att, this.hw});

  final String dateKey;
  final StudentAttendanceRow? att;
  final StudentHomeworkRow? hw;

  @override
  Widget build(BuildContext context) {
    final day = parseDateKey(dateKey);
    final notes = [
      if (att?.note?.trim().isNotEmpty ?? false) att!.note!.trim(),
      if (hw?.comment?.trim().isNotEmpty ?? false) hw!.comment!.trim(),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(day == null ? dateKey : DateMn.longWithWeekday(day, shortWeekday: true), style: context.text.titleSmall),
          const SizedBox(height: AppSpace.xs),
          Wrap(
            spacing: AppSpace.lg,
            runSpacing: AppSpace.xs,
            children: [
              AttendanceMarkView(status: att?.status, lateRange: att?.lateRange),
              if (hw != null) HomeworkMarkView(status: hw!.status),
            ],
          ),
          if (notes.isNotEmpty) ...[
            const SizedBox(height: AppSpace.xs),
            Meta(
              items: notes,
              style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
            ),
          ],
        ],
      ),
    );
  }
}

class _ExamsTab extends ConsumerWidget {
  const _ExamsTab({required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(testResultsProvider(studentId));
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(
        message: errorText(e, 'Шалгалтын дүн нээгдсэнгүй'),
        onRetry: () => ref.invalidate(testResultsProvider(studentId)),
      ),
      data: (list) {
        if (list.isEmpty) return const EmptyState(icon: AppIcons.exam, title: 'Шалгалтын дүн алга');
        final sorted = [...list]..sort((a, b) => (b.createdAt ?? '').compareTo(a.createdAt ?? ''));
        return ListView.separated(
          padding: const EdgeInsets.all(AppSpace.gutter),
          itemCount: sorted.length,
          separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
          itemBuilder: (context, i) {
            final r = sorted[i];
            final at = parseApiInstant(r.createdAt);
            final testId = r.test?.id;
            return AppCard(
              onTap: testId == null || testId.isEmpty
                  ? null
                  : () => context.push('/app/tests/${Uri.encodeComponent(testId)}/results', extra: r.test?.title),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r.test?.title ?? 'Шалгалт', style: context.text.titleSmall),
                        if (at != null)
                          Text(
                            DateMn.long(UbDateTime.fromInstant(at), withYear: true),
                            style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                          ),
                      ],
                    ),
                  ),
                  Text('${_num(r.totalScore)}/${_num(r.maxScore)}', style: context.text.titleMedium),
                ],
              ),
            );
          },
        );
      },
    );
  }

  static String _num(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);
}

/// Сурагчийн тэмдэглэл: бичих, өөрийнхөө тэмдэглэлийг засах/устгах (устгал баталгаажуулалттай).
class StudentNotesTab extends ConsumerStatefulWidget {
  const StudentNotesTab({super.key, required this.studentId});

  final String studentId;

  @override
  ConsumerState<StudentNotesTab> createState() => _StudentNotesTabState();
}

class _StudentNotesTabState extends ConsumerState<StudentNotesTab> {
  final _input = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  StudentNotesController get _ctl => ref.read(studentNotesProvider(widget.studentId).notifier);

  Future<void> _add() async {
    final text = _input.text.trim();
    if (text.isEmpty || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final err = await _ctl.add(text);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = err;
      if (err == null) _input.clear();
    });
  }

  Future<void> _edit(StudentNote n) async {
    final field = TextEditingController(text: n.body);
    final next = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Тэмдэглэл засах'),
        content: TextField(controller: field, autofocus: true, minLines: 2, maxLines: 6, maxLength: 4000),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text(AppStrings.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, field.text), child: const Text(AppStrings.save)),
        ],
      ),
    );
    field.dispose();
    if (next == null || next.trim().isEmpty || next.trim() == n.body) return;
    final err = await _ctl.edit(n.id, next);
    if (mounted && err != null) setState(() => _error = err);
  }

  Future<void> _delete(StudentNote n) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Тэмдэглэл устгах уу?'),
        content: const Text('Устгасан тэмдэглэл сэргээгдэхгүй.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text(AppStrings.cancel)),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: context.colors.error,
              foregroundColor: context.colors.onStatus,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Устгах'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final err = await _ctl.remove(n.id);
    if (mounted && err != null) setState(() => _error = err);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(studentNotesProvider(widget.studentId));
    final c = context.colors;
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        TextField(
          controller: _input,
          minLines: 2,
          maxLines: 5,
          maxLength: 4000,
          decoration: const InputDecoration(labelText: 'Шинэ тэмдэглэл'),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.icon(
            style: FilledButton.styleFrom(minimumSize: const Size(140, teacherTap)),
            onPressed: _busy ? null : _add,
            icon: const Icon(AppIcons.add),
            label: const Text('Нэмэх'),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: AppSpace.sm),
          Text(_error!, style: context.text.bodySmall?.copyWith(color: c.error)),
        ],
        const SizedBox(height: AppSpace.lg),
        ...async.when(
          skipLoadingOnRefresh: false,
          loading: () => [const LoadingState(cards: 2, padding: EdgeInsets.zero)],
          error: (e, _) => [
            SizedBox(
              height: 240,
              child: ErrorState(
                message: errorText(e, 'Тэмдэглэл нээгдсэнгүй'),
                onRetry: () => ref.invalidate(studentNotesProvider(widget.studentId)),
              ),
            ),
          ],
          data: (notes) => notes.isEmpty
              ? [
                  const SizedBox(
                    height: 200,
                    child: EmptyState(icon: AppIcons.stickyNote, title: 'Тэмдэглэл алга'),
                  ),
                ]
              : [
                  for (final n in notes) ...[
                    AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Meta(
                                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                                  items: [
                                    n.authorName,
                                    if (parseApiInstant(n.createdAt) case final at?) DateMn.relative(at),
                                  ],
                                ),
                              ),
                              if (n.canEdit) ...[
                                IconButton(
                                  tooltip: 'Засах',
                                  constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
                                  icon: Icon(AppIcons.draft, size: 18, color: c.inkDim),
                                  onPressed: () => _edit(n),
                                ),
                                IconButton(
                                  tooltip: 'Устгах',
                                  constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
                                  icon: Icon(AppIcons.trash, size: 18, color: c.inkDim),
                                  onPressed: () => _delete(n),
                                ),
                              ],
                            ],
                          ),
                          Text(n.body, style: context.text.bodyMedium),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpace.sm),
                  ],
                ],
        ),
      ],
    );
  }
}
