import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../teacher/data/staff_models.dart';
import '../../teacher/data/staff_repository.dart';
import '../application/enrollment_providers.dart';
import 'enrollment_actions.dart';
import 'enrollment_widgets.dart';

/// «Зөвшөөрөл» (вэбийн `PendingApprovalList`): онлайнаар танхимд бүртгүүлсэн сурагчид — нэр, утас, анги, бүртгүүлсэн
/// огноо, энэ сарын төлбөр баталгаажсан эсэх. Зөвшөөрмөгц сервер сурагчийн код олгоно. Санхүүгийн эрхтэй бол
/// зөвшөөрсний дараа шууд эрх олгоно (вэбд төлбөрийн хэсгээр).
class ApprovalTab extends ConsumerStatefulWidget {
  const ApprovalTab({super.key});

  @override
  ConsumerState<ApprovalTab> createState() => _ApprovalTabState();
}

class _ApprovalTabState extends ConsumerState<ApprovalTab> {
  final _approved = <String>{};
  String? _busy;
  String? _error;

  Future<void> _approve(PendingStudent s) async {
    if (_busy != null) return;
    final ok = await confirmAction(
      context,
      title: '${s.name}-г зөвшөөрөх үү',
      message: 'Зөвшөөрмөгц сурагчийн код олгогдож, танхимын сурагч болно',
      confirmLabel: 'Зөвшөөрөх',
      destructive: false,
    );
    if (!ok || !mounted) return;
    setState(() {
      _busy = s.id;
      _error = null;
    });
    try {
      await ref.read(staffRepositoryProvider).approveStudent(s.id);
      if (!mounted) return;
      setState(() => _approved.add(s.id));
      enrollmentSnack(context, '${s.name} зөвшөөрөгдлөө');
      ref.invalidate(unassignedStudentsProvider);
      if (ref.read(enrollmentAccessProvider).canGrantPass) {
        final grant = await confirmAction(
          context,
          title: 'Эрх олгох уу',
          message: '${s.name}-д одоо эрх олгож болно. Дараа нь төлбөрийн хэсгээс ч олгож болно',
          confirmLabel: 'Эрх олгох',
          cancelLabel: 'Дараа',
          destructive: false,
        );
        if (grant && mounted) await showGrantPassSheet(context, ref, userId: s.id, userName: s.name);
      }
    } catch (e) {
      if (mounted) setState(() => _error = enrollmentError(e, 'Зөвшөөрч чадсангүй. Дахин оролдоно уу'));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _refresh() async {
    _approved.clear();
    await ref.refresh(pendingApprovalProvider.future).then((_) {}, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(pendingApprovalProvider);
    final rows = [
      for (final s in async.value ?? const <PendingStudent>[])
        if (!_approved.contains(s.id)) s,
    ];
    return TabScroll(
      onRefresh: _refresh,
      slivers: [
        if (async.isLoading && !async.hasValue)
          const SliverState(height: 420, child: LoadingState(padding: EdgeInsets.zero))
        else if (async.hasError && !async.hasValue)
          SliverState(
            child: ErrorState(
              message: enrollmentError(async.error!, 'Сурагчдын жагсаалтыг ачаалж чадсангүй'),
              onRetry: () => ref.invalidate(pendingApprovalProvider),
            ),
          )
        else if (rows.isEmpty)
          const SliverState(
            child: EmptyState(
              icon: AppIcons.badgeCheck,
              title: 'Зөвшөөрөл хүлээгч сурагч алга',
              message: 'Онлайнаар танхимын ангид бүртгүүлсэн сурагчид энд гарна',
            ),
          )
        else ...[
          SliverToBoxAdapter(
            child: SectionHeader(title: 'Зөвшөөрөл хүлээж буй сурагчид (${rows.length})'),
          ),
          if (_error != null)
            SliverToBoxAdapter(
              child: Padding(padding: const EdgeInsets.only(bottom: AppSpace.sm), child: InlineError(_error!)),
            ),
          SliverList.builder(
            itemCount: rows.length,
            itemBuilder: (_, i) => Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.sm),
              child: _PendingCard(student: rows[i], busy: _busy == rows[i].id, onApprove: () => _approve(rows[i])),
            ),
          ),
        ],
      ],
    );
  }
}

class _PendingCard extends StatelessWidget {
  const _PendingCard({required this.student, required this.busy, required this.onApprove});

  final PendingStudent student;
  final bool busy;
  final VoidCallback onApprove;

  @override
  Widget build(BuildContext context) {
    final s = student;
    final paid = s.hasConfirmedPayment;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ItemRow(
            title: s.name,
            meta: [
              if (s.phone == null) 'утас байхгүй' else spacedPhone(s.phone),
              if (s.grade != null) '${s.grade}-р анги',
              if (enrollmentDate(s.registeredAt).isNotEmpty) 'Бүртгүүлсэн: ${enrollmentDate(s.registeredAt)}',
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.sm,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (paid == null)
                const MetaChip(label: 'Төлбөрийн эрх шаардлагатай', icon: AppIcons.secure)
              else if (paid)
                const MetaChip(label: 'Төлбөр баталгаажсан', icon: AppIcons.success, tone: ChipTone.success)
              else
                const MetaChip(label: 'Баталгаажсан төлбөр олдсонгүй', icon: AppIcons.warning, tone: ChipTone.warning),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: busy ? null : onApprove,
              child: Text(busy ? 'Зөвшөөрч байна' : 'Зөвшөөрөх'),
            ),
          ),
        ],
      ),
    );
  }
}
