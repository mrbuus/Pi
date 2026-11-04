import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/format/person_name.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../application/tuition_providers.dart';
import '../data/tuition_models.dart';
import '../data/tuition_repository.dart';
import 'refund_widgets.dart';

/// `/app/tuition/refund/:id` — буцаалтын дэлгэрэнгүй (вэбийн `RefundDetail`).
class RefundDetailScreen extends StatelessWidget {
  const RefundDetailScreen({super.key, required this.refundId});

  final String refundId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Буцаалт')),
      body: TuitionGate(
        builder: (_, access) => RefundDetailView(refundId: refundId, access: access),
      ),
    );
  }
}

enum _RefundAction { submit, approve, pay, cancel }

/// Дэлгэрэнгүйн бие (утсанд бүтэн дэлгэц, таблетад жагсаалтын баруун талд).
///
/// Үйлдлийн эрх вэбтэй ЯГ ижил: Админ ба санхүүгийн эрхтэй Багш+ — зөвшөөрөлд илгээх, цуцлах;
/// зөвшөөрөх, олгосон гэж тэмдэглэх — зөвхөн Админ. Үйлдэл бүр дүнг бичсэн баталгаажуулалттай.
class RefundDetailView extends ConsumerStatefulWidget {
  const RefundDetailView({super.key, required this.refundId, required this.access, this.onChanged});

  final String refundId;
  final TuitionAccess access;

  /// Төлөв солигдсоны дараа (таблетын жагсаалтыг шинэчлэх).
  final VoidCallback? onChanged;

  @override
  ConsumerState<RefundDetailView> createState() => _RefundDetailViewState();
}

class _RefundDetailViewState extends ConsumerState<RefundDetailView> {
  /// Давхар дарахаас хамгаалалт.
  bool _busy = false;

  TuitionRepository get _repo => ref.read(tuitionRepositoryProvider);

  String _impact(RefundRecord r) =>
      'Та ${r.student.fullName} сурагчийн ${formatMnt(r.calculation.refundAmount)} дүнтэй буцаалтын төлөвийг өөрчлөх гэж байна';

  Future<void> _run(RefundRecord r, _RefundAction action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final done = switch (action) {
        _RefundAction.submit => _confirmThen(
          r,
          title: 'Зөвшөөрөлд илгээх үү',
          confirmLabel: 'Илгээх',
          run: () => _repo.submitForApproval(r.id),
        ),
        _RefundAction.approve => _confirmThen(
          r,
          title: 'Буцаалтыг зөвшөөрөх үү',
          confirmLabel: 'Зөвшөөрөх',
          run: () => _repo.approve(r.id),
        ),
        _RefundAction.pay => _pay(r),
        _RefundAction.cancel => _cancel(r),
      };
      if (!await done || !mounted) return;
      ref.invalidate(refundDetailProvider(r.id));
      widget.onChanged?.call();
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(const SnackBar(content: Text('Төлөв шинэчлэгдлээ')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Олгосон арга сонгох хуудас (дүн нь дэд гарчигт). Серверийн алдаа хуудас дотор гарна.
  Future<bool> _pay(RefundRecord r) async {
    final ok = await showFormSheet<bool>(
      context,
      title: 'Олгосон гэж тэмдэглэх',
      subtitle: _impact(r),
      submitLabel: 'Олгосон гэж тэмдэглэх',
      fields: [
        FormSelectField<String>(
          name: 'method',
          label: 'Олгосон арга',
          required: true,
          initial: 'BANK_TRANSFER',
          options: [
            for (final m in const ['CASH', 'BANK_TRANSFER']) SelectOption(m, refundPaymentMethods[m]!),
          ],
        ),
      ],
      onSubmit: (v) async {
        await _repo.markPaid(r.id, v.get<String>('method')!);
        return true;
      },
    );
    return ok == true;
  }

  /// Цуцлах шалтгаантай хуудас (шалтгаан заавал).
  Future<bool> _cancel(RefundRecord r) async {
    final ok = await showFormSheet<bool>(
      context,
      title: 'Буцаалт цуцлах',
      subtitle: _impact(r),
      submitLabel: 'Цуцлах',
      fields: const [
        FormTextField(name: 'reason', label: 'Цуцлах шалтгаан', required: true, maxLines: 3, maxLength: 1000),
      ],
      onSubmit: (v) async {
        await _repo.cancel(r.id, v.text('reason'));
        return true;
      },
    );
    return ok == true;
  }

  /// Дүнг бичсэн баталгаажуулалт → хүсэлт. Алдааг snackbar-аар (серверийн монгол мессеж).
  Future<bool> _confirmThen(
    RefundRecord r, {
    required String title,
    required String confirmLabel,
    required Future<void> Function() run,
  }) async {
    final ok = await confirmAction(
      context,
      title: title,
      message: _impact(r),
      confirmLabel: confirmLabel,
      destructive: false,
    );
    if (!ok || !mounted) return false;
    try {
      await run();
      return true;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          SnackBar(
            content: Text(
              e is ApiError ? e.message : 'Өөрчлөлт хадгалж чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу',
            ),
          ),
        );
      }
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = refundDetailProvider(widget.refundId);
    return ref
        .watch(provider)
        .when(
          skipLoadingOnRefresh: true,
          loading: () => const LoadingState(cards: 3),
          error: (e, _) => refundErrorView(e, () => ref.invalidate(provider)),
          data: (r) => RefreshIndicator(
            onRefresh: () => ref.refresh(provider.future).then((_) {}, onError: (_) {}),
            child: _body(context, r),
          ),
        );
  }

  Widget _body(BuildContext context, RefundRecord r) {
    final isAdmin = widget.access == TuitionAccess.admin;
    final canManage = widget.access.allowed;
    final s = r.status;
    final open = s == RefundStatus.draft || s == RefundStatus.pendingApproval;
    final actions = <DetailAction>[
      if (canManage && s == RefundStatus.draft)
        DetailAction(
          label: 'Зөвшөөрөлд илгээх',
          icon: AppIcons.send,
          onPressed: _busy ? null : () => _run(r, _RefundAction.submit),
        ),
      if (isAdmin && open)
        DetailAction(
          label: 'Зөвшөөрөх',
          icon: AppIcons.check,
          onPressed: _busy ? null : () => _run(r, _RefundAction.approve),
        ),
      if (isAdmin && s == RefundStatus.approved)
        DetailAction(
          label: 'Олгосон гэж тэмдэглэх',
          icon: AppIcons.payments,
          onPressed: _busy ? null : () => _run(r, _RefundAction.pay),
        ),
      if (canManage && (open || s == RefundStatus.approved))
        DetailAction(
          label: 'Цуцлах',
          icon: AppIcons.failure,
          destructive: true,
          onPressed: _busy ? null : () => _run(r, _RefundAction.cancel),
        ),
    ];
    final c = r.calculation;
    final settledEven = c.refundAmount <= 0 && c.shortfall <= 0;
    return ListView(
      padding: const EdgeInsets.only(bottom: AppSpace.xxl),
      children: [
        DetailHeader(
          title: r.student.fullName,
          subtitle: [r.classroom.name, 'Гарсан ${refundDay(r.leftOnKey)}'],
          avatar: DetailAvatar(initials: DetailAvatar.initialsOf(r.student.fullName)),
          chips: [RefundStatusChip(r.status)],
          primary: actions.isEmpty || actions.first.destructive ? null : actions.first,
          secondary: actions.isEmpty || actions.first.destructive ? actions : actions.sublist(1),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              RefundFacts(
                facts: [
                  fact(
                    'Буцаах дүн',
                    formatMnt(c.refundAmount),
                    c.refundAmount > 0 ? ChipTone.success : ChipTone.neutral,
                  ),
                  fact('Төлсөн', formatMnt(c.totalPaid)),
                  fact('Ногдох төлбөр', formatMnt(c.owed)),
                  fact('Нэг хичээлийн үнэ', formatMnt(c.dailyRate)),
                  fact('Гарсан сарын хичээл', '${c.totalLessonDays}'),
                  fact('Тоологдсон хичээл', '${c.attendedLessonDays}'),
                  if (c.shortfall > 0) fact('Дутуу төлбөр', formatMnt(c.shortfall), ChipTone.error),
                  if (r.paymentMethod != null)
                    fact('Олгосон арга', refundPaymentMethods[r.paymentMethod] ?? r.paymentMethod!),
                ],
              ),
              if (settledEven) ...[
                const SizedBox(height: AppSpace.sm),
                Text(
                  'Тооцоо тэнцсэн. Буцаах болон нэхэх дүн байхгүй',
                  style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                ),
              ],
              if (c.warnings.isNotEmpty) ...[
                const SectionHeader(title: 'Тооцоонд анхаарах зүйл'),
                RefundWarnings(codes: c.warnings),
              ],
              if (r.note != null) ...[const SectionHeader(title: 'Тайлбар'), _TextCard(r.note!)],
              if (r.cancelReason != null) ...[
                const SectionHeader(title: 'Цуцалсан шалтгаан'),
                _TextCard(r.cancelReason!, accent: context.colors.error),
              ],
              const SectionHeader(title: 'Төлөвийн түүх'),
              AppCard(
                child: Column(
                  children: [
                    _AuditRow(label: 'Ноорог үүсгэсэн', person: r.createdBy, at: r.createdAt),
                    if (r.approvedAt != null) _AuditRow(label: 'Зөвшөөрсөн', person: r.approvedBy, at: r.approvedAt),
                    if (r.paidAt != null) _AuditRow(label: 'Олгосон гэж тэмдэглэсэн', person: r.paidBy, at: r.paidAt),
                    if (r.cancelledAt != null) _AuditRow(label: 'Цуцалсан', person: r.cancelledBy, at: r.cancelledAt),
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

class _TextCard extends StatelessWidget {
  const _TextCard(this.text, {this.accent});

  final String text;
  final Color? accent;

  @override
  Widget build(BuildContext context) => AppCard(
    accent: accent,
    child: Text(text, style: context.text.bodyMedium),
  );
}

class _AuditRow extends StatelessWidget {
  const _AuditRow({required this.label, required this.person, required this.at});

  final String label;
  final RefundPerson? person;
  final String? at;

  @override
  Widget build(BuildContext context) {
    final who = person == null ? null : withPlus(person!.fullName, person!.role);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(label, style: context.text.titleSmall)),
          const SizedBox(width: AppSpace.sm),
          Flexible(
            child: Meta(
              items: [who, refundMoment(at)],
              style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
            ),
          ),
        ],
      ),
    );
  }
}
