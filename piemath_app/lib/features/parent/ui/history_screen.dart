import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/parent_history.dart';
import '../data/parent_models.dart';
import '../data/parent_repository.dart';
import '../domain/parent_labels.dart';
import 'mark_chip.dart';
import 'parent_icons.dart';
import 'parent_list_card.dart';
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
          final verified = [for (final l in links) if (l.verified) l.student];
          if (verified.isEmpty) {
            return const EmptyState(
              icon: ParentIcons.children,
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

  ({String studentId, int year, int page}) _key(int page) => (studentId: widget.studentId, year: widget.year, page: page);

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
  const _HistoryContent({required this.history, required this.tail, required this.onMore, required this.onRetryTail});

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
            icon: ParentIcons.attendance,
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
        ParentDatedRow(
          date: dayLabel(s.date),
          subtitle: s.title,
          trailing: MarkLabel.homework(context, HomeworkMark.fromApi(s.state)),
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
                    r.score != null && r.max != null ? '${r.score!.round()}/${r.max!.round()} оноо' : 'Дүн бүртгэгдээгүй',
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
                ParentDatedRow(
                  date: dayLabel(a.at),
                  subtitle: a.chapter,
                  trailing: switch (a.autoCorrect) {
                    true => MarkLabel(icon: ParentIcons.ok, label: 'Зөв', color: c.success),
                    false => MarkLabel(icon: ParentIcons.bad, label: 'Буруу', color: c.error),
                    null => MarkLabel(icon: ParentIcons.unknown, label: 'Өөрөө үнэлсэн', color: c.inkDim),
                  },
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
                ParentDatedRow(
                  date: dayLabel(p.date),
                  subtitle: p.chapter,
                  trailing: Text(p.receipts > 0 ? '${p.receipts} хүлээн авсан' : 'Хүлээн аваагүй', style: context.text.labelMedium),
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
