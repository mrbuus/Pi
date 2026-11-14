import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/parent_history.dart';
import '../data/parent_models.dart';
import '../data/parent_repository.dart';
import '../domain/parent_labels.dart';
import 'mark_chip.dart';
import 'parent_list_card.dart';
import 'theory_screen.dart' show PhotoStrip;
import 'weekly_report_screen.dart' show parentTodayProvider;

/// Хэдэн жилийн түүх сонгож болох вэ (одоогийн жил + өмнөх жилүүд).
const historyYearCount = 4;

/// Жилийн түүх (`/app/parent/history?studentId=&year=`, вэбийн `ChildHistory`): ирц, даалгавар,
/// шалгалтын дүн, бодсон бодлого, ангийн тарах цаг. Сервер 50 мөр/хуудас — «Дараагийн хуудас».
class ParentHistoryScreen extends ConsumerStatefulWidget {
  const ParentHistoryScreen({super.key, this.initialStudentId, this.initialYear});

  final String? initialStudentId;
  final int? initialYear;

  @override
  ConsumerState<ParentHistoryScreen> createState() => _ParentHistoryScreenState();
}

class _ParentHistoryScreenState extends ConsumerState<ParentHistoryScreen> {
  String? _studentId;
  int? _year;

  @override
  void initState() {
    super.initState();
    _studentId = widget.initialStudentId;
    _year = widget.initialYear;
  }

  @override
  Widget build(BuildContext context) {
    final childrenAsync = ref.watch(parentChildrenProvider);
    final thisYear = ref.watch(parentTodayProvider).year;
    final years = [for (var i = 0; i < historyYearCount; i++) thisYear - i];
    final year = years.contains(_year) ? _year! : years.first;
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Жилийн түүх')),
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
              message: 'Баталгаажсан хүүхдийн жилийн түүх энд харагдана.',
            );
          }
          final student = verified.where((s) => s.id == _studentId).firstOrNull ?? verified.first;
          return ListView(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
            children: [
              _Pickers(
                children: verified,
                studentId: student.id,
                years: years,
                year: year,
                onStudent: (id) => setState(() => _studentId = id),
                onYear: (y) => setState(() => _year = y),
              ),
              const SizedBox(height: AppSpace.lg),
              HistoryBody(key: ValueKey('${student.id}:$year'), studentId: student.id, year: year),
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
    required this.years,
    required this.year,
    required this.onStudent,
    required this.onYear,
  });

  final List<ChildStudent> children;
  final String studentId;
  final List<int> years;
  final int year;
  final ValueChanged<String> onStudent;
  final ValueChanged<int> onYear;

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
          ] else
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.md),
              child: Semantics(header: true, child: Text(children.first.fullName, style: context.text.titleMedium)),
            ),
          Semantics(
            label: 'Жил сонгох',
            container: true,
            child: Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final y in years)
                  ChoiceChip(label: Text('$y он'), selected: y == year, onSelected: (_) => onYear(y)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Нэг хүүхдийн нэг жилийн түүх; хуудсуудыг нэгтгэн харуулна.
class HistoryBody extends ConsumerStatefulWidget {
  const HistoryBody({super.key, required this.studentId, required this.year});

  final String studentId;
  final int year;

  @override
  ConsumerState<HistoryBody> createState() => _HistoryBodyState();
}

class _HistoryBodyState extends ConsumerState<HistoryBody> {
  int _pages = 1;

  ({String studentId, int year, int page}) _key(int page) =>
      (studentId: widget.studentId, year: widget.year, page: page);

  @override
  Widget build(BuildContext context) {
    final first = ref.watch(parentHistoryProvider(_key(1)));
    return first.when(
      skipLoadingOnRefresh: false,
      loading: () => const SizedBox(height: 260, child: LoadingState()),
      error: (e, _) => SizedBox(
        height: 320,
        child: ErrorState(
          message: e is ApiError ? e.message : 'Түүхийг ачаалж чадсангүй. Холболтоо шалгаад дахин оролдоно уу.',
          onRetry: () => ref.invalidate(parentHistoryProvider(_key(1))),
        ),
      ),
      data: (page1) {
        var merged = page1;
        AsyncValue<ParentHistory>? tail;
        for (var p = 2; p <= _pages; p++) {
          final a = ref.watch(parentHistoryProvider(_key(p)));
          final d = a.value;
          if (d != null) {
            merged = merged.append(d);
          } else {
            tail = a;
            break;
          }
        }
        return _HistoryContent(
          studentId: widget.studentId,
          history: merged,
          tail: tail,
          onMore: () => setState(() => _pages++),
          onRetryTail: () => ref.invalidate(parentHistoryProvider(_key(_pages))),
        );
      },
    );
  }
}

class _HistoryContent extends StatelessWidget {
  const _HistoryContent({
    required this.studentId,
    required this.history,
    required this.tail,
    required this.onMore,
    required this.onRetryTail,
  });

  final String studentId;
  final ParentHistory history;
  final AsyncValue<ParentHistory>? tail;
  final VoidCallback onMore;
  final VoidCallback onRetryTail;

  @override
  Widget build(BuildContext context) {
    final h = history;
    if (h.isEmpty && tail == null) {
      return const AppCard(
        child: SizedBox(
          height: 240,
          child: EmptyState(
            icon: AppIcons.schedule,
            title: 'Энэ жилд бүртгэл алга',
            message: 'Ирц, даалгавар, дүн бүртгэгдэхэд энд харагдана.',
          ),
        ),
      );
    }
    final c = context.colors;
    final homeworkRows = <Widget>[
      for (final m in h.homework.rows)
        ParentDatedRow(
          date: dayLabel(m.date),
          subtitle: m.comment == null || m.comment!.isEmpty ? m.classroom : '${m.classroom}: ${m.comment}',
          trailing: MarkLabel.homework(context, HomeworkMark.fromApi(m.status)),
        ),
      for (final s in h.submissions.rows)
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ParentDatedRow(
              date: dayLabel(s.date),
              subtitle: s.title,
              trailing: MarkLabel.homework(context, HomeworkMark.fromApi(s.state)),
            ),
            _SubmissionDetail(submission: s),
          ],
        ),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _SummaryCard(summary: h.summary),
        if (h.attendance.rows.isNotEmpty) ...[
          const SectionHeader(title: 'Ирц'),
          ParentListCard(
            empty: '',
            children: [
              for (final a in h.attendance.rows)
                ParentDatedRow(
                  date: dayLabel(a.date),
                  subtitle: a.classroom,
                  trailing: MarkLabel.attendance(context, AttendanceMark.fromApi(a.status)),
                ),
            ],
          ),
        ],
        if (homeworkRows.isNotEmpty) ...[
          const SectionHeader(title: 'Даалгавар'),
          ParentListCard(empty: '', children: homeworkRows),
        ],
        if (h.results.rows.isNotEmpty) ...[
          const SectionHeader(title: 'Шалгалтын дүн'),
          ParentListCard(
            empty: '',
            children: [
              for (final r in h.results.rows)
                ParentDatedRow(
                  date: dayLabel(r.createdAt),
                  subtitle: r.title,
                  trailing: Text(
                    r.score != null && r.max != null
                        ? '${r.score!.round()}/${r.max!.round()} оноо'
                        : 'Дүн бүртгэгдээгүй',
                    style: context.text.labelMedium,
                  ),
                ),
            ],
          ),
        ],
        if (h.attempts.rows.isNotEmpty) ...[
          const SectionHeader(title: 'Бодсон бодлого'),
          ParentListCard(
            empty: '',
            children: [
              for (final a in h.attempts.rows)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ParentDatedRow(
                      date: dayLabel(a.at),
                      subtitle: a.chapter,
                      trailing: switch (a.autoCorrect) {
                        true => MarkLabel(icon: AppIcons.success, label: 'Зөв', color: c.success),
                        false => MarkLabel(icon: AppIcons.failure, label: 'Буруу', color: c.error),
                        null => MarkLabel(icon: AppIcons.circleDot, label: 'Өөрөө үнэлсэн', color: c.inkDim),
                      },
                    ),
                    if (a.chapterId != null)
                      TextButton.icon(
                        onPressed: () => context.push(
                          '/app/parent/theory?studentId=${Uri.encodeComponent(studentId)}'
                          '&chapterId=${Uri.encodeComponent(a.chapterId!)}',
                        ),
                        icon: const Icon(AppIcons.theory, size: 18),
                        label: Text('${a.chapter.isEmpty ? 'Бүлгийн' : a.chapter} онол'),
                      ),
                  ],
                ),
            ],
          ),
        ],
        if (h.learning.rows.isNotEmpty) ...[
          const SectionHeader(title: 'Анхны хариулт, давталт, засвар'),
          ParentListCard(
            empty: '',
            children: [
              for (final l in h.learning.rows)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ParentDatedRow(
                        date: dayLabel(l.at),
                        subtitle: l.kindLabel,
                        trailing: switch (l.correct) {
                          true => MarkLabel(icon: AppIcons.success, label: 'Зөв', color: c.success),
                          false => MarkLabel(icon: AppIcons.failure, label: 'Дахин бодох', color: c.error),
                          null => MarkLabel(icon: AppIcons.circleDot, label: 'Үнэлгээгүй', color: c.inkDim),
                        },
                      ),
                      if (l.answer != null && l.answer!.trim().isNotEmpty)
                        MathText('\$${l.answer}\$', style: context.text.bodyMedium),
                      Text(l.resultLabel, style: context.text.bodySmall),
                      if (l.flagged)
                        Text(
                          'Сурагч эргэлзсэн, таасан эсвэл тусламжийн тэмдэглэгээ нэмсэн',
                          style: context.text.bodySmall?.copyWith(color: c.inkDim),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ],
        if (h.dismissals.rows.isNotEmpty) ...[
          const SectionHeader(title: 'Анги тарсан цаг'),
          ParentListCard(
            empty: '',
            children: [
              for (final d in h.dismissals.rows)
                ParentDatedRow(
                  date: dayLabel(d.date),
                  subtitle: d.classroom,
                  trailing: Text(_dismissalText(d), style: context.text.labelMedium),
                ),
            ],
          ),
        ],
        if (h.packets.rows.isNotEmpty) ...[
          const SectionHeader(title: 'Хичээлийн материал'),
          ParentListCard(
            empty: '',
            children: [
              for (final p in h.packets.rows)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ParentDatedRow(
                      date: dayLabel(p.date),
                      subtitle: p.chapter,
                      trailing: Text(
                        p.receipts > 0 ? '${p.receipts} хүлээн авсан' : 'Хүлээн аваагүй',
                        style: context.text.labelMedium,
                      ),
                    ),
                    if (p.imageKeys.isNotEmpty) ...[
                      PhotoStrip(fileKeys: p.imageKeys, title: p.chapter.isEmpty ? 'Хүүхдийн хавсралт' : p.chapter),
                      const SizedBox(height: AppSpace.sm),
                    ],
                  ],
                ),
            ],
          ),
        ],
        const SizedBox(height: AppSpace.lg),
        _MoreFooter(history: h, tail: tail, onMore: onMore, onRetry: onRetryTail),
      ],
    );
  }
}

/// Илгээлтийн дэлгэрэнгүй: энэ жилийн эхний илгээлт (сурагчийн тайлбар), багшийн сүүлийн хариу,
/// илгээсэн зураг (вэбийн `ChildHistory` «Даалгаврын илгээлт ба шалгалтын түүх»).
class _SubmissionDetail extends StatelessWidget {
  const _SubmissionDetail({required this.submission});

  final HistorySubmission submission;

  @override
  Widget build(BuildContext context) {
    final s = submission;
    final first = s.firstSubmit;
    final review = s.lastReview;
    final c = context.colors;
    final small = context.text.bodySmall;
    Widget box(String title, List<String> lines) => Container(
          width: double.infinity,
          margin: const EdgeInsets.only(bottom: AppSpace.xs),
          padding: const EdgeInsets.all(AppSpace.sm),
          decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.sm)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: context.text.labelMedium),
              for (final l in lines) Text(l, style: small),
            ],
          ),
        );
    final children = <Widget>[
      if (first != null) ...[
        box('Энэ жилийн эхний илгээлт', [dayLabel(first.at), first.studentNote ?? 'Сурагч тайлбар бичээгүй']),
        box(
          'Энэ жилийн багшийн сүүлийн хариу',
          review == null
              ? ['Энэ жилд багшийн хариу бүртгээгүй']
              : [dayLabel(review.at), review.reviewNote ?? 'Тайлбар нэмээгүй', submissionStateLabel(review.state)],
        ),
      ],
      if (first == null && s.studentNote != null && s.studentNote!.isNotEmpty)
        Text('Сурагчийн тайлбар: ${s.studentNote}', style: small),
      if (first == null && s.reviewNote != null && s.reviewNote!.isNotEmpty)
        Text('Багшийн хариу: ${s.reviewNote}', style: small),
      if (s.imageKeys.isNotEmpty) PhotoStrip(fileKeys: s.imageKeys, title: s.title.isEmpty ? 'Илгээсэн зураг' : s.title),
    ];
    if (children.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.sm),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
    );
  }
}

/// Илгээлтийн төлөв (вэбийн `STATUS`).
String submissionStateLabel(String state) => switch (state) {
      'SUBMITTED' => 'Шалгуулахаар илгээсэн',
      'RETURNED' => 'Дахин илгээх',
      'DONE_ONLINE' => 'Багш шалгасан',
      'DONE_IN_CLASS' => 'Ангид шалгасан',
      'NOT_DONE' => 'Илгээгээгүй',
      _ => 'Шалгасан',
    };

String _dismissalText(HistoryDismissal d) {
  String? hhmm(String? iso) {
    final t = parseApiInstant(iso);
    return t == null ? null : DateMn.time(UbDateTime.fromInstant(t));
  }

  final at = hhmm(d.approximateAt);
  final last = hhmm(d.lastLeftAt);
  return [?at, if (last != null) 'сүүлд $last'].join(', ');
}

class _MoreFooter extends StatelessWidget {
  const _MoreFooter({required this.history, required this.tail, required this.onMore, required this.onRetry});

  final ParentHistory history;
  final AsyncValue<ParentHistory>? tail;
  final VoidCallback onMore;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final t = tail;
    if (t != null && t.hasError) {
      return Column(
        children: [
          Text(
            t.error is ApiError ? (t.error! as ApiError).message : 'Дараагийн хуудсыг ачаалж чадсангүй.',
            style: context.text.bodyMedium?.copyWith(color: context.colors.error),
          ),
          TextButton(onPressed: onRetry, child: const Text(AppStrings.retry)),
        ],
      );
    }
    if (t != null) {
      return const Center(child: SizedBox.square(dimension: 24, child: CircularProgressIndicator(strokeWidth: 2)));
    }
    if (!history.hasMore) return const SizedBox.shrink();
    return OutlinedButton(onPressed: onMore, child: const Text('Дараагийн хуудас'));
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.summary});

  final HistorySummary summary;

  @override
  Widget build(BuildContext context) {
    Widget fact(String value, String label) => Expanded(
      child: Semantics(
        container: true,
        label: '$label: $value',
        excludeSemantics: true,
        child: Column(
          children: [
            Text(value, style: context.text.headlineSmall),
            const SizedBox(height: 2),
            Text(label, style: context.text.bodySmall, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
    return AppCard(
      child: Row(
        children: [
          fact('${summary.activeDays}', 'Идэвхтэй өдөр'),
          fact('${summary.attemptCount}', 'Бодсон бодлого'),
          fact('${summary.learningEventCount}', 'Давтлага'),
        ],
      ),
    );
  }
}
