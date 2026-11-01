import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/payment_status/payment_status.dart';
import '../../payments/domain/org_info.dart';
import '../../payments/domain/payment_history.dart';
import '../../payments/ui/pay_info_card.dart';
import '../data/parent_models.dart';
import '../data/parent_repository.dart';
import '../domain/parent_labels.dart';
import 'acknowledge_sheet.dart';
import 'exam_result_card.dart';
import 'mark_chip.dart';
import 'parent_icons.dart';

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
                Icon(ParentIcons.pending, size: 18, color: context.colors.info),
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(header: true, child: Text(child.fullName, style: context.text.titleLarge)),
              const SizedBox(height: AppSpace.xs),
              Meta(items: [
                if (grade != null) '$grade-р анги',
                child.classroom?.name,
                child.studentProfile?.school,
              ]),
              const SizedBox(height: AppSpace.sm),
              Row(
                children: [
                  Icon(ParentIcons.verified, size: 16, color: context.colors.success),
                  const SizedBox(width: AppSpace.xs),
                  Text('Холболт баталгаажсан', style: context.text.labelMedium),
                ],
              ),
              const SizedBox(height: AppSpace.sm),
              OutlinedButton.icon(
                onPressed: () => context.push('/app/parent/weekly?studentId=${Uri.encodeComponent(child.id)}'),
                icon: const Icon(ParentIcons.weekly, size: 18),
                label: const Text('Долоо хоногийн тайлан'),
              ),
            ],
          ),
        ),
        if (results.isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          ExamResultCard(result: results.first, onAcknowledge: () => acknowledge(results.first)),
        ],
        const SectionHeader(title: 'Сүүлийн ирц'),
        _ListCard(
          empty: 'Ирцийн бүртгэл хараахан алга',
          children: [
            for (final a in child.attendances)
              _DatedRow(
                date: dayLabel(a.date),
                subtitle: a.classroom.name,
                trailing: MarkLabel.attendance(context, AttendanceMark.fromApi(a.status)),
              ),
          ],
        ),
        const SectionHeader(title: 'Даалгавар'),
        _HomeworkCard(child: child),
        const SectionHeader(title: 'Шалгалтын дүн'),
        _ListCard(
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
        _ListCard(
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
          tier: tierForGrade(grade),
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
    final useMarks = child.dailyHomeworkMarks.isNotEmpty || !child.isOnline;
    return _ListCard(
      empty: 'Даалгаврын бүртгэл хараахан алга',
      children: useMarks
          ? [
              for (final m in child.dailyHomeworkMarks)
                _DatedRow(
                  date: dayLabel(m.date),
                  subtitle: m.comment == null || m.comment!.isEmpty ? m.classroom.name : '${m.classroom.name}: ${m.comment}',
                  trailing: MarkLabel.homework(context, HomeworkMark.fromApi(m.status)),
                ),
            ]
          : [
              for (final s in child.submissions)
                _DatedRow(
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
                Icon(ParentIcons.ok, size: 16, color: context.colors.success),
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

class _DatedRow extends StatelessWidget {
  const _DatedRow({required this.date, required this.subtitle, required this.trailing});

  final String date;
  final String subtitle;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(date, style: context.text.titleSmall),
                if (subtitle.isNotEmpty) Text(subtitle, style: context.text.bodySmall),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          Flexible(child: trailing),
        ],
      ),
    );
  }
}

/// Мөрүүдтэй карт; хоосон бол тайлбар.
class _ListCard extends StatelessWidget {
  const _ListCard({required this.children, required this.empty});

  final List<Widget> children;
  final String empty;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
      child: children.isEmpty
          ? Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
              child: Text(empty, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
            )
          : Column(
              children: [
                for (var i = 0; i < children.length; i++) ...[
                  if (i > 0) Divider(height: 1, color: context.colors.line),
                  children[i],
                ],
              ],
            ),
    );
  }
}
