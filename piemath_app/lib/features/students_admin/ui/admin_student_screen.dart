import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../../teacher/ui/student_screen.dart';
import '../application/students_admin_providers.dart';
import '../data/students_admin_models.dart';
import '../data/students_admin_repository.dart';
import 'student_actions.dart';
import 'withdrawal_sheet.dart';

String _err(Object e, String fallback) => e is ApiError && e.message.trim().isNotEmpty ? e.message : fallback;

/// `/app/admin/students/:id` — багшийн сурагчийн хуудсыг ([StudentScreen]) удирдлагын төлөв, үйлдэл,
/// «Төлбөр», «Гарсан тооцоо» табаар өргөтгөнө (вэбийн `StudentProgress.tsx`: `/app/admin/students/:id` нь
/// `/app/students/:id` руу шилждэг нэг хуудас). Мөнгө зөвхөн эрхтэй хүнд.
class AdminStudentScreen extends ConsumerWidget {
  const AdminStudentScreen({super.key, required this.studentId, this.name, this.embedded = false});

  final String studentId;
  final String? name;
  final bool embedded;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final perms = ref.watch(studentsPermsProvider);
    final detail = perms.canManage ? ref.watch(adminStudentDetailProvider(studentId)).value : null;
    final archived = detail?.archived ?? false;
    return StudentScreen(
      studentId: studentId,
      name: name ?? detail?.fullName,
      embedded: embedded,
      header: perms.canManage ? StudentManageBar(studentId: studentId) : null,
      extraTabs: [
        if (perms.canSeeMoney) StudentExtraTab('Төлбөр', StudentPaymentsTab(studentId: studentId)),
        if (perms.canSeeMoney && archived) StudentExtraTab('Гарсан тооцоо', WithdrawalHistoryTab(studentId: studentId)),
      ],
    );
  }
}

/// Табын дээрх нягт мөр: анги, архивын төлөв, төлбөрийн төлөв + үйлдлүүд (Багш+, Админ).
class StudentManageBar extends ConsumerWidget {
  const StudentManageBar({super.key, required this.studentId});

  final String studentId;

  Future<void> _run(BuildContext context, WidgetRef ref, StudentAction a, AdminStudentDetail d) async {
    final perms = ref.read(studentsPermsProvider);
    switch (a) {
      case StudentAction.moveClass:
        await changeClass(
          context,
          ref,
          studentId: d.id,
          name: d.fullName,
          currentClassId: d.currentClassroom?.id,
          otherClassIds: [for (final c in d.otherClassrooms) c.id],
        );
      case StudentAction.withdraw:
        if (await withdrawStudent(context, ref, studentId: d.id, name: d.fullName) && context.mounted) {
          // Хассаны дараа «Гарсан тооцоо» табыг нээнэ (вэбтэй ижил) — таб нэмэгдсэний дараа.
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!context.mounted) return;
            final tabs = DefaultTabController.maybeOf(context);
            if (tabs != null && tabs.length >= 2) tabs.animateTo(tabs.length - 2);
          });
        }
      case StudentAction.archive:
        final reason = await askArchiveReason(context, name: d.fullName);
        if (reason == null || !context.mounted) return;
        // «Буцаах» хугацаанд серверт илгээхгүй — дарвал юу ч өөрчлөгдөхгүй.
        final repo = ref.read(studentsAdminRepositoryProvider);
        if (await showUndoSnack(context, message: '${d.fullName} архивлагдана')) return;
        MutationResult<void> r;
        try {
          await repo.archive(d.id, reason);
          r = const MutationResult.ok(null);
        } catch (e) {
          r = MutationResult.failed(e);
        }
        if (!context.mounted) return;
        if (r.isOk) invalidateStudent(ref, d.id);
        showMutationError(context, r, success: '${d.fullName} архивлагдлаа');
      case StudentAction.restore:
        await restoreStudent(context, ref, studentId: d.id, name: d.fullName, lastClassId: d.lastClassroom?.id);
      case StudentAction.editProfile:
        await editBasicProfile(context, ref, studentId: d.id, perms: perms);
      case StudentAction.editRegistration:
        await editRegistration(context, ref, studentId: d.id, perms: perms);
      case StudentAction.open:
        break;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final perms = ref.watch(studentsPermsProvider);
    final async = ref.watch(adminStudentDetailProvider(studentId));
    final c = context.colors;
    final d = async.value;
    if (d == null) {
      if (async.hasError) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
          child: Text(_err(async.error!, 'Сурагчийн төлөв нээгдсэнгүй'), style: context.text.bodySmall),
        );
      }
      return const Padding(
        padding: EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
        child: SkeletonPulse(child: SkeletonCard(lines: 1)),
      );
    }
    final pay = perms.canSeeMoney && !d.archived ? ref.watch(studentPaymentHistoryProvider(studentId)).value : null;
    final actions = availableActions(perms, archived: d.archived);
    final primary = d.archived ? StudentAction.restore : StudentAction.moveClass;
    final archivedAt = ubDay(d.archivedAt);
    return Material(
      color: c.bg,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.xs,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                MetaChip(
                  label: classNames(d.currentClassroom, d.otherClassrooms) ?? 'Ангигүй',
                  icon: AppIcons.classes,
                  tone: d.currentClassroom == null && !d.archived ? ChipTone.warning : ChipTone.neutral,
                ),
                if (d.studentCode != null) MetaChip(label: d.studentCode!),
                if (d.archived)
                  const MetaChip(label: 'Сургалтаас хасагдсан', icon: AppIcons.ban, tone: ChipTone.warning)
                else if (d.leftOn != null)
                  const MetaChip(label: 'Гарсан', tone: ChipTone.warning),
                if (pay != null)
                  pay.outstanding > 0
                      ? MetaChip(
                          label: 'Үлдэгдэл ${formatMnt(pay.outstanding)}',
                          icon: AppIcons.warning,
                          tone: ChipTone.error,
                        )
                      : const MetaChip(label: 'Төлбөр хэвийн', icon: AppIcons.success, tone: ChipTone.success),
              ],
            ),
            if (d.archived) ...[
              const SizedBox(height: AppSpace.xs),
              Meta(
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
                items: [
                  if (archivedAt != null) '${DateMn.numeric(archivedAt)} хасагдсан',
                  if (d.lastClassroom != null) 'Сүүлд ${d.lastClassroom!.name}',
                  d.archiveReason,
                ],
              ),
            ],
            if (actions.isNotEmpty) ...[
              const SizedBox(height: AppSpace.sm),
              Row(
                children: [
                  if (actions.contains(primary))
                    Expanded(
                      child: FilledButton.tonalIcon(
                        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                        onPressed: () => _run(context, ref, primary, d),
                        icon: Icon(primary.icon, size: 18),
                        label: Text(primary.label),
                      ),
                    ),
                  const SizedBox(width: AppSpace.sm),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size(AppSizes.minTap * 2, AppSizes.minTap)),
                    onPressed: () async {
                      final a = await pickStudentAction(
                        context,
                        name: d.fullName,
                        actions: [
                          for (final x in actions)
                            if (x != primary) x,
                        ],
                      );
                      if (a != null && context.mounted) await _run(context, ref, a, d);
                    },
                    icon: const Icon(AppIcons.overflow, size: 18),
                    label: const Text('Үйлдэл'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// «Төлбөр» таб (Админ, санхүүтэй Багш+; вэбийн `PaymentsTab`): багц, төлөх/төлсөн/үлдэгдэл, түүх.
/// Сарын дэлгэрэнгүй ledger нь `payments` feature-ийн дэлгэц (тэнд дүнг зөвхөн Админ харна).
class StudentPaymentsTab extends ConsumerStatefulWidget {
  const StudentPaymentsTab({super.key, required this.studentId});

  final String studentId;

  @override
  ConsumerState<StudentPaymentsTab> createState() => _StudentPaymentsTabState();
}

class _StudentPaymentsTabState extends ConsumerState<StudentPaymentsTab> {
  static const _page = 10;
  bool _all = false;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(studentPaymentHistoryProvider(widget.studentId));
    final c = context.colors;
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const LoadingState(cards: 2),
      error: (e, _) => ErrorState(
        message: _err(e, 'Төлбөрийн мэдээлэл нээгдсэнгүй'),
        onRetry: () => ref.invalidate(studentPaymentHistoryProvider(widget.studentId)),
      ),
      data: (h) {
        final rows = _all ? h.payments : h.payments.take(_page).toList();
        return CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.all(AppSpace.gutter),
              sliver: SliverList.list(
                children: [
                  Meta(
                    style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                    items: [h.tuitionPlan?.label ?? 'Багц тодорхойгүй', h.tuitionNote],
                  ),
                  const SizedBox(height: AppSpace.sm),
                  StatRow(
                    tiles: [
                      StatTile(label: 'Төлөх ёстой', value: formatMnt(h.expected)),
                      StatTile(label: 'Төлсөн', value: formatMnt(h.totalPaid), tone: ChipTone.success),
                      StatTile(
                        label: 'Үлдэгдэл',
                        value: formatMnt(h.outstanding),
                        tone: h.outstanding > 0 ? ChipTone.error : ChipTone.success,
                        icon: h.outstanding > 0 ? AppIcons.warning : AppIcons.success,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.sm),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                    onPressed: () => context.push('/app/payments/student/${Uri.encodeComponent(widget.studentId)}'),
                    icon: const Icon(AppIcons.calendarRange, size: 18),
                    label: const Text('Сар бүрийн төлөв'),
                  ),
                  const SizedBox(height: AppSpace.lg),
                  Text('Төлбөрийн түүх', style: context.text.titleSmall),
                  const SizedBox(height: AppSpace.sm),
                  if (h.payments.isEmpty) const EmptyState(icon: AppIcons.receipt, title: 'Төлбөр бүртгэгдээгүй'),
                ],
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
              sliver: SliverList.separated(
                itemCount: rows.length,
                separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
                itemBuilder: (context, i) {
                  final p = rows[i];
                  final at = ubDay(p.paidAt ?? p.createdAt);
                  return AppCard(
                    child: ItemRow(
                      title: formatMnt(p.amount),
                      meta: [if (at != null) DateMn.numeric(at), p.method, p.forMonth],
                      trailing: MetaChip(
                        label: PaymentLine.statusLabel[p.status] ?? p.status,
                        tone: switch (p.status) {
                          'CONFIRMED' => ChipTone.success,
                          'REJECTED' || 'REVERSED' => ChipTone.error,
                          _ => ChipTone.neutral,
                        },
                      ),
                    ),
                  );
                },
              ),
            ),
            SliverToBoxAdapter(
              child: h.payments.length > _page
                  ? Padding(
                      padding: const EdgeInsets.all(AppSpace.gutter),
                      child: TextButton(
                        style: TextButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                        onPressed: () => setState(() => _all = !_all),
                        child: Text(_all ? 'Хураах' : 'Бүгдийг харах (${h.payments.length})'),
                      ),
                    )
                  : const SizedBox(height: AppSpace.xxl),
            ),
          ],
        );
      },
    );
  }
}

/// «Гарсан тооцоо» (вэбийн `WithdrawalTab`): хасах үед хадгалсан тооцоо (хадгалсан агшнаараа).
class WithdrawalHistoryTab extends ConsumerWidget {
  const WithdrawalHistoryTab({super.key, required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(studentWithdrawalsProvider(studentId));
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const LoadingState(cards: 2),
      error: (e, _) => ErrorState(
        message: _err(e, 'Гарсан тооцоо нээгдсэнгүй'),
        onRetry: () => ref.invalidate(studentWithdrawalsProvider(studentId)),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return const EmptyState(
            icon: AppIcons.receipt,
            title: 'Тооцоо алга',
            message: '«Сургалтаас хасах» үед тооцоо энд хадгалагдана',
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(AppSpace.gutter),
          itemCount: rows.length,
          itemBuilder: (context, i) {
            final w = rows[i];
            final at = ubDay(w.createdAt);
            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Сургалтаас хассан тооцоо', style: context.text.titleSmall),
                  Meta(
                    style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                    items: [
                      'гарсан ${w.leftOn}',
                      w.reason,
                      if (w.createdBy != null) [w.createdBy, if (at != null) DateMn.numericWithTime(at)].join(' '),
                      SavedWithdrawal.refundLabel[w.refundStatus],
                    ],
                  ),
                  const SizedBox(height: AppSpace.sm),
                  WithdrawalSummaryView(data: w.detail),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
