import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/payment_status/payment_status.dart';
import '../../../shared/quiz_score/quiz_score.dart';
import '../../payments/domain/org_info.dart';
import '../../payments/domain/payment_history.dart';
import '../../payments/ui/pay_info_card.dart';
import '../data/parent_models.dart';
import '../data/parent_repository.dart';
import '../domain/parent_labels.dart';
import 'acknowledge_sheet.dart';
import 'exam_result_card.dart';
import 'mark_chip.dart';
import 'parent_list_card.dart';

/// Нэг хүүхдийн самбар (вэбийн `ChildPanel`): дүн, ирц, даалгавар, төлбөр.
/// Бүх тооцоо (оноо, төлбөрийн хугацаа) — сервер; энд зөвхөн харуулна.
class ChildPanel extends ConsumerWidget {
  const ChildPanel({super.key, required this.link});

  final ParentLink link;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final child = link.student;
    if (!link.verified) {
      return AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(child.fullName, style: context.text.titleMedium),
            const SizedBox(height: AppSpace.sm),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(AppIcons.time, size: 18, color: context.colors.info),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Text(
                    'Холболтын баталгаажуулалт хүлээж байна. Төвийн ажилтан баталгаажуулсны дараа хүүхдийн мэдээлэл харагдана.',
                    style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    final results = child.testResults;
    Future<void> acknowledge(TestResultEntry r) async {
      final ok = await showAcknowledgeSheet(context, testResultId: r.id, title: r.test.title);
      if (!ok) return;
      ref
        ..invalidate(examResultCardProvider(r.id))
        ..invalidate(parentChildrenProvider);
    }

    final grade = child.studentProfile?.grade;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InitialsAvatar(initials: _initials(child.firstName, child.lastName), size: 48),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(header: true, child: Text(child.fullName, style: context.text.titleLarge)),
                    const SizedBox(height: 2),
                    Meta(
                      items: [if (grade != null) '$grade-р анги', child.classroom?.name, child.studentProfile?.school],
                    ),
                    const SizedBox(height: AppSpace.sm),
                    const TonePill(icon: AppIcons.shield, hue: AppHue.success, label: 'Холболт баталгаажсан'),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.md),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: ActionCard(
                  icon: AppIcons.chart,
                  hue: AppHue.violet,
                  title: 'Долоо хоногийн тайлан',
                  chevron: false,
                  stacked: true,
                  onTap: () => context.push('/app/parent/weekly?studentId=${Uri.encodeComponent(child.id)}'),
                ),
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: ActionCard(
                  icon: AppIcons.historyLog,
                  hue: AppHue.teal,
                  title: 'Жилийн түүх',
                  chevron: false,
                  stacked: true,
                  onTap: () => context.push('/app/parent/history?studentId=${Uri.encodeComponent(child.id)}'),
                ),
              ),
            ],
          ),
        ),
        if (results.isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          ExamResultCard(result: results.first, onAcknowledge: () => acknowledge(results.first)),
        ],
        const SizedBox(height: AppSpace.md),
        ParentListCard(
          title: 'Сүүлийн ирц',
          icon: AppIcons.calendarCheck,
          empty: 'Ирцийн бүртгэл хараахан алга',
          children: [
            for (final a in child.attendances)
              ParentDatedRow(
                date: dayLabel(a.date),
                subtitle: a.classroom.name,
                trailing: MarkLabel.attendance(context, AttendanceMark.fromApi(a.status)),
              ),
          ],
        ),
        const SizedBox(height: AppSpace.md),
        _HomeworkCard(child: child),
        const SizedBox(height: AppSpace.md),
        ParentListCard(
          title: 'Шалгалтын дүн',
          icon: AppIcons.exam,
          hue: AppHue.violet,
          empty: 'Дүн хараахан бүртгээгүй',
          children: [
            for (final r in results)
              _ResultRow(
                result: r,
                canAcknowledge: child.studentProfile?.type == 'CLASSROOM',
                onAcknowledge: () => acknowledge(r),
              ),
          ],
        ),
        const SectionHeader(title: 'Төлбөр'),
        PaidUntilCard(studentId: child.id, compact: true, studentName: child.firstName),
        const SizedBox(height: AppSpace.md),
        ParentListCard(
          empty: 'Төлбөрийн бүртгэл хараахан алга',
          children: [
            for (final p in child.payments)
              PaymentRow(
                status: PaymentStatus.fromApi(p.status),
                amount: p.amount,
                dateLabel: isoDateLabel(p.createdAt),
              ),
          ],
        ),
        const SizedBox(height: AppSpace.md),
        PayInfoCard(
          note: transferNote(firstName: child.firstName, lastName: child.lastName, phone: child.phone),
        ),
      ],
    );
  }
}

class _HomeworkCard extends StatelessWidget {
  const _HomeworkCard({required this.child});

  final ChildStudent child;

  @override
  Widget build(BuildContext context) {
    // Танхим: багшийн тэмдэглэгээ; онлайн: илгээлт. Тэмдэглэгээ байвал түүнийг (STATUS §7.11).
    final quizzes = child.homeworkQuizzes;
    final useMarks = child.dailyHomeworkMarks.isNotEmpty || quizzes.isNotEmpty || !child.isOnline;
    return ParentListCard(
      title: 'Даалгавар',
      icon: AppIcons.homework,
      hue: AppHue.violet,
      empty: 'Даалгаврын бүртгэл хараахан алга',
      children: useMarks
          ? [
              for (final m in child.dailyHomeworkMarks)
                ParentDatedRow(
                  date: dayLabel(m.date),
                  subtitle: m.comment == null || m.comment!.isEmpty
                      ? m.classroom.name
                      : '${m.classroom.name}: ${m.comment}',
                  trailing: MarkLabel.homework(context, HomeworkMark.fromApi(m.status)),
                ),
              // Шалгалтаар даалгавар шалгасан оноо (эзэн 2026-11-08 19:08)
              for (final q in quizzes)
                ParentDatedRow(
                  date: dayLabel(q.date),
                  subtitle: q.classroom,
                  trailing: QuizScoreChip(score: q.score, problemCount: q.problemCount),
                ),
            ]
          : [
              for (final s in child.submissions)
                ParentDatedRow(
                  date: dayLabel(s.submittedAt ?? s.assignment.dueDate),
                  subtitle: s.assignment.title,
                  trailing: MarkLabel.homework(context, HomeworkMark.fromApi(s.state)),
                ),
            ],
    );
  }
}

class _ResultRow extends StatelessWidget {
  const _ResultRow({required this.result, required this.canAcknowledge, required this.onAcknowledge});

  final TestResultEntry result;
  final bool canAcknowledge;
  final VoidCallback onAcknowledge;

  @override
  Widget build(BuildContext context) {
    final score = result.totalScore != null && result.maxScore != null
        ? '${result.totalScore!.round()}/${result.maxScore!.round()} оноо'
        : 'Дүн бүртгэгдээгүй';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MetaTitle(result.test.title, style: context.text.titleSmall),
          Meta(items: [score, dayLabel(result.createdAt)]),
          const SizedBox(height: AppSpace.xs),
          if (result.acknowledgedAt != null)
            Row(
              children: [
                Icon(AppIcons.success, size: 16, color: context.colors.success),
                const SizedBox(width: AppSpace.xs),
                Text('Танилцсан, ${dayLabel(result.acknowledgedAt)}', style: context.text.labelMedium),
              ],
            )
          else if (canAcknowledge)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton(onPressed: onAcknowledge, child: const Text('Дүнтэй танилцлаа')),
            )
          else
            Text('Онлайн дүнгийн мэдээлэл', style: context.text.bodySmall),
        ],
      ),
    );
  }
}

String _initials(String? first, String? last) => [
  first?.trim() ?? '',
  last?.trim() ?? '',
].where((s) => s.isNotEmpty).map((s) => s.substring(0, 1).toUpperCase()).join();
