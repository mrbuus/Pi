import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../data/tuition_models.dart';
import '../data/tuition_repository.dart';
import 'refund_detail_screen.dart';
import 'refund_widgets.dart';

/// `/app/tuition/refunds` — буцаалтын жагсаалт (вэбийн `RefundList`): төлвөөр шүүх, серверийн хуудаслалт.
class RefundListScreen extends StatelessWidget {
  const RefundListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Буцаалтын жагсаалт')),
      body: TuitionGate(builder: (_, access) => RefundListBody(access: access)),
    );
  }
}

/// Тооцоолуур руу: өмнөх дэлгэц нь тооцоолуур бол буцна, үгүй бол шилжинэ («Буцах» = өмнөх).
void _openCalculator(BuildContext context) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go('/app/tuition');
  }
}

class RefundListBody extends ConsumerStatefulWidget {
  const RefundListBody({super.key, required this.access});

  final TuitionAccess access;

  @override
  ConsumerState<RefundListBody> createState() => _RefundListBodyState();
}

class _RefundListBodyState extends ConsumerState<RefundListBody> {
  final _list = DataListController<RefundRecord>();

  Future<DataPage<RefundRecord>> _load(DataQuery q) async {
    final offset = int.tryParse(q.cursor ?? '') ?? 0;
    final status = q.filter == null ? null : RefundStatus.fromApi(q.filter);
    final page = await ref.read(tuitionRepositoryProvider).list(status: status, offset: offset);
    final next = offset + page.refunds.length;
    return DataPage(
      items: page.refunds,
      nextCursor: page.refunds.isNotEmpty && next < page.total ? '$next' : null,
      total: page.total,
    );
  }

  @override
  Widget build(BuildContext context) {
    return DataListScreen<RefundRecord>(
      controller: _list,
      load: _load,
      itemKey: (r) => r.id,
      filters: [for (final s in RefundStatus.filters) DataFilter(s.api, s.label)],
      countLabel: (n) => '$n буцаалт',
      header: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
        child: Align(
          alignment: AlignmentDirectional.centerStart,
          child: FilledButton.tonalIcon(
            onPressed: () => _openCalculator(context),
            style: FilledButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
            icon: const Icon(AppIcons.add, size: 18),
            label: const Text('Шинэ тооцоо'),
          ),
        ),
      ),
      itemBuilder: (_, r) => RefundListRow(refund: r),
      onTap: (r) => context.push('/app/tuition/refund/${Uri.encodeComponent(r.id)}'),
      detailBuilder: (_, r) =>
          RefundDetailView(key: ValueKey(r.id), refundId: r.id, access: widget.access, onChanged: _list.refresh),
      emptyTitle: 'Буцаалтын бүртгэл алга',
      emptyMessage: 'Тооцоолуураар буцаалтын ноорог үүсгэсний дараа энд харагдана',
      emptyIcon: AppIcons.receipt,
      emptyAction: FilledButton(onPressed: () => _openCalculator(context), child: const Text('Тооцоо үүсгэх')),
    );
  }
}

/// Жагсаалтын мөр: сурагч, анги, гарсан өдөр, төлсөн ба буцаах дүн, төлөв.
class RefundListRow extends StatelessWidget {
  const RefundListRow({super.key, required this.refund});

  final RefundRecord refund;

  @override
  Widget build(BuildContext context) {
    final r = refund;
    final c = r.calculation;
    return ItemRow(
      title: r.student.fullName,
      meta: [r.classroom.name, 'Гарсан ${refundDay(r.leftOnKey)}'],
      subtitle: Meta(
        items: [
          'Төлсөн ${formatMnt(c.totalPaid)}',
          'Буцаах ${formatMnt(c.refundAmount)}',
          if (c.shortfall > 0) 'Дутуу ${formatMnt(c.shortfall)}',
        ],
      ),
      trailing: RefundStatusChip(r.status),
      chevron: true,
    );
  }
}
