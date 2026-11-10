import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../application/finance_providers.dart';
import '../data/reconcile_models.dart';
import '../data/reconcile_repository.dart';
import 'finance_widgets.dart';
import 'reconcile_sheets.dart';

/// `/app/admin/reconcile` — банкны тулгалт (вэбийн `ReconcilePageClient`): төлөв бүрийн тоо, хуулга оруулах,
/// гүйлгээний жагсаалт (төлвөөр шүүх, хуудаслах), гараар сурагчтай холбох, «Төлбөр биш» гэж тэмдэглэх.
///
/// Эрх: Админ, санхүүгийн эрхтэй Багш+ ([ReconcileGate]). Дүн, автомат тулгалт, төлбөр үүсгэх бүгд серверт —
/// апп нийт мөнгө тооцохгүй, зөвхөн гүйлгээ тус бүрийн дүнг харуулна.
class ReconcileScreen extends StatelessWidget {
  const ReconcileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Банкны тулгалт')),
      body: ReconcileGate(builder: (_, _) => const ReconcileBody()),
    );
  }
}

class ReconcileBody extends ConsumerStatefulWidget {
  const ReconcileBody({super.key});

  @override
  ConsumerState<ReconcileBody> createState() => _ReconcileBodyState();
}

class _ReconcileBodyState extends ConsumerState<ReconcileBody> {
  final _list = DataListController<BankTransaction>();

  static final _filters = [for (final s in BankMatchStatus.filters) DataFilter(s.api, s.label)];

  Future<DataPage<BankTransaction>> _load(DataQuery q) async {
    final offset = int.tryParse(q.cursor ?? '') ?? 0;
    final status = q.filter == null ? null : BankMatchStatus.fromApi(q.filter);
    final page = await ref.read(reconcileRepositoryProvider).transactions(status: status, offset: offset);
    final next = offset + page.items.length;
    var counts = const <String, int>{};
    if (q.isFirstPage) {
      ref.invalidate(reconcileSummaryProvider);
      try {
        final s = await ref.read(reconcileSummaryProvider.future);
        counts = {DataFilter.allId: s.total, ...s.filterCounts};
      } on Object {
        // Тоо ачаалагдаагүй ч жагсаалт харагдана — дээд талын хэсэг өөрөө «Дахин оролдох»-той.
      }
    }
    return DataPage(
      items: page.items,
      nextCursor: page.items.isNotEmpty && next < page.total ? '$next' : null,
      total: page.total,
      filterCounts: counts,
    );
  }

  /// Гүйлгээ өөрчлөгдсөн: тухайн шүүлтүүрт орохгүй болсон бол жагсаалтаас хасна, үгүй бол мөрийг солино.
  void _changed(BankTransaction t) {
    final filter = _list.query.filter;
    if (filter != null && filter != t.status.api) {
      _list.removeWhere((x) => x.id == t.id);
    } else {
      _list.updateWhere((x) => x.id == t.id, (_) => t);
    }
    ref.invalidate(reconcileSummaryProvider);
  }

  Future<void> _open(BankTransaction t) async {
    final updated = await showTransactionSheet(context, t);
    if (updated != null && mounted) _changed(updated);
  }

  @override
  Widget build(BuildContext context) {
    return DataListScreen<BankTransaction>(
      controller: _list,
      load: _load,
      itemKey: (t) => t.id,
      filters: _filters,
      initialFilter: BankMatchStatus.unmatched.api,
      countLabel: (n) => '$n гүйлгээ',
      header: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const ReconcileSummaryView(),
            const SizedBox(height: AppSpace.md),
            StatementImportCard(onImported: () => unawaited(_list.refresh())),
          ],
        ),
      ),
      itemBuilder: (_, t) => TransactionRow(transaction: t),
      onTap: (t) => unawaited(_open(t)),
      detailBuilder: (_, t) => SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpace.gutter),
        child: TransactionDetail(key: ValueKey(t.id), transaction: t, onChanged: _changed),
      ),
      emptyTitle: 'Банкны гүйлгээ алга',
      emptyMessage: 'Банкны хуулга оруулсны дараа гүйлгээ энд харагдана',
      emptyIcon: AppIcons.bank,
      detailPlaceholder: 'Гүйлгээг жагсаалтаас сонгоно уу',
    );
  }
}

/// Дээд талын тоонууд (гүйлгээний ТОО — мөнгөн дүн биш). Серверийн `total`-оор.
class ReconcileSummaryView extends ConsumerWidget {
  const ReconcileSummaryView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref
        .watch(reconcileSummaryProvider)
        .when(
          skipLoadingOnRefresh: true,
          skipLoadingOnReload: true,
          loading: () => const SkeletonPulse(child: SkeletonCard()),
          error: (e, _) => ErrorState(
            message: e is ApiError ? e.message : AppStrings.genericError,
            onRetry: () => ref.invalidate(reconcileSummaryProvider),
          ),
          data: (s) => StatRow(
            key: const Key('reconcile-summary'),
            tiles: [
              StatTile(label: 'Нийт', value: '${s.total}', icon: AppIcons.bank),
              StatTile(label: 'Тулгаагүй', value: '${s.unmatched}', icon: AppIcons.hourglass, tone: ChipTone.warning),
              StatTile(label: 'Автоматаар', value: '${s.autoMatched}', icon: AppIcons.success, tone: ChipTone.success),
              StatTile(label: 'Гараар', value: '${s.manualMatched}', icon: AppIcons.badgeCheck, tone: ChipTone.info),
            ],
          ),
        );
  }
}

/// Жагсаалтын мөр: дүн, огноо, банкны дугаар, гүйлгээний утга, төлөв.
class TransactionRow extends StatelessWidget {
  const TransactionRow({super.key, required this.transaction});

  final BankTransaction transaction;

  @override
  Widget build(BuildContext context) {
    final t = transaction;
    return ItemRow(
      key: ValueKey('tx:${t.id}'),
      title: formatMnt(t.amount),
      meta: [momentLabel(t.bookedAt), t.bankRef, t.matchedUser?.fullName],
      subtitle: t.description.isEmpty ? null : Text(t.description, maxLines: 2, overflow: TextOverflow.ellipsis),
      trailing: BankStatusChip(t.status, compact: true),
      chevron: true,
    );
  }
}
