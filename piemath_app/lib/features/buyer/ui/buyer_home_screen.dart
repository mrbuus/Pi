import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/payment_status/payment_status.dart';
import '../../payments/data/payment_record.dart';
import '../../payments/data/payments_repository.dart';
import '../../payments/domain/payment_history.dart';
import '../data/buyer_models.dart';
import '../data/buyer_repository.dart';

String _date(DateTime? t) => t == null ? '' : DateMn.numeric(UbDateTime.fromInstant(t));

String _message(Object e) => e is ApiError ? e.message : AppStrings.genericError;

/// Худалдан авагчийн нүүр `/app/buyer` — «Миний эрхүүд» (вэбийн `/app/buyer`-ийн унших хэсэг):
/// идэвхтэй эрх, худалдан авалтын төлөв, төлбөрийн түүх. Худалдан авалт, багц сонгох нь апп дотор БАЙХГҮЙ — вэбээр.
class BuyerHomeScreen extends ConsumerWidget {
  const BuyerHomeScreen({super.key, this.now});

  /// Тестэд тогтмол цаг.
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final at = now ?? DateTime.now();
    return Scaffold(
      appBar: AppBar(title: const Text('Миний эрхүүд')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref
            ..invalidate(buyerPassesProvider)
            ..invalidate(buyerPurchasesProvider)
            ..invalidate(myPaymentsProvider);
          await Future.wait([
            ref.read(buyerPassesProvider.future).then<Object?>((v) => v, onError: (Object _) => null),
            ref.read(buyerPurchasesProvider.future).then<Object?>((v) => v, onError: (Object _) => null),
            ref.read(myPaymentsProvider.future).then<Object?>((v) => v, onError: (Object _) => null),
          ]);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
          children: [
            Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: AppSizes.readableWidth),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _Section<List<BuyerPass>>(
                      title: 'Идэвхтэй эрх',
                      value: ref.watch(buyerPassesProvider),
                      onRetry: () => ref.invalidate(buyerPassesProvider),
                      emptyTitle: 'Эрх байхгүй',
                      emptyMessage: 'Одоогоор идэвхтэй эрх алга. Эрхээ вэб хуудсаар нээнэ',
                      isEmpty: (l) => l.isEmpty,
                      builder: (l) => [for (final p in l) _PassRow(pass: p, now: at)],
                    ),
                    _Section<List<BuyerPurchase>>(
                      title: 'Худалдан авалтын төлөв',
                      value: ref.watch(buyerPurchasesProvider),
                      onRetry: () => ref.invalidate(buyerPurchasesProvider),
                      emptyTitle: 'Худалдан авалт байхгүй',
                      emptyMessage: 'Таны худалдан авалт хараахан бүртгэгдээгүй байна',
                      isEmpty: (l) => l.isEmpty,
                      builder: (l) => [for (final p in l) _PurchaseRow(purchase: p, now: at)],
                    ),
                    _Section<List<PaymentRecord>>(
                      title: 'Төлбөрийн түүх',
                      value: ref.watch(myPaymentsProvider),
                      onRetry: () => ref.invalidate(myPaymentsProvider),
                      emptyTitle: 'Төлбөр бүртгэгдээгүй байна',
                      emptyMessage: 'Төлбөр баталгаажмагц энд харагдана',
                      isEmpty: (l) => l.isEmpty,
                      builder: (l) => [
                        for (final p in l)
                          PaymentRow(
                            status: PaymentStatus.fromApi(p.status),
                            amount: p.amount,
                            dateLabel: isoDateLabel(p.paidAt ?? p.createdAt),
                            meta: [paymentMethodLabel(p.method)],
                            note: p.description,
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpace.xl),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Нэг ачаалалтын хэсэг: гарчиг + ачаалж байна / алдаа (дахин оролдох) / хоосон / мөрүүд.
class _Section<T> extends StatelessWidget {
  const _Section({
    required this.title,
    required this.value,
    required this.onRetry,
    required this.emptyTitle,
    required this.emptyMessage,
    required this.isEmpty,
    required this.builder,
  });

  final String title;
  final AsyncValue<T> value;
  final VoidCallback onRetry;
  final String emptyTitle;
  final String emptyMessage;
  final bool Function(T) isEmpty;
  final List<Widget> Function(T) builder;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: title),
        value.when(
          skipLoadingOnRefresh: false,
          loading: () => const SkeletonPulse(child: SkeletonCard(lines: 3)),
          error: (e, _) => AppCard(
            child: Row(
              children: [
                const Icon(AppIcons.error, size: 20),
                const SizedBox(width: AppSpace.sm),
                Expanded(child: Text(_message(e), style: context.text.bodyMedium)),
                TextButton(
                  style: TextButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                  onPressed: onRetry,
                  child: const Text(AppStrings.retry),
                ),
              ],
            ),
          ),
          data: (d) {
            if (isEmpty(d)) {
              return AppCard(
                child: SizedBox(
                  height: 200,
                  child: EmptyState(icon: AppIcons.empty, title: emptyTitle, message: emptyMessage),
                ),
              );
            }
            final rows = builder(d);
            return AppCard(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.xs),
              child: Column(
                children: [
                  for (var i = 0; i < rows.length; i++) ...[
                    if (i > 0) Divider(height: 1, color: context.colors.line),
                    rows[i],
                  ],
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}

class _PassRow extends StatelessWidget {
  const _PassRow({required this.pass, required this.now});

  final BuyerPass pass;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final active = pass.isActive(now);
    return Semantics(
      container: true,
      label: '${pass.name}, ${active ? 'хүчинтэй' : 'дууссан'}, ${_date(pass.expiresAt)}',
      child: ExcludeSemantics(
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: AppSizes.minTap + 8),
          child: Row(
            children: [
              Icon(active ? AppIcons.success : AppIcons.time, size: 20, color: active ? c.success : c.inkDim),
              const SizedBox(width: AppSpace.md),
              Expanded(child: Text(pass.name, style: context.text.titleSmall)),
              Meta(
                items: [active ? 'Хүчинтэй' : 'Дууссан', _date(pass.expiresAt)],
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PurchaseRow extends StatelessWidget {
  const _PurchaseRow({required this.purchase, required this.now});

  final BuyerPurchase purchase;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final state = purchase.state(now);
    final icon = switch (state) {
      PurchaseState.granted => AppIcons.success,
      PurchaseState.waiting => AppIcons.time,
      PurchaseState.expired => AppIcons.calendarExpired,
    };
    final tone = switch (state) {
      PurchaseState.granted => c.success,
      PurchaseState.waiting => c.info,
      PurchaseState.expired => c.inkDim,
    };
    return Semantics(
      container: true,
      label: '${purchase.title}, ${purchase.kind.label}, ${formatMnt(purchase.price)}, ${state.label}',
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 20, color: tone),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(purchase.title, style: context.text.titleSmall),
                    Meta(
                      items: [purchase.kind.label, formatMnt(purchase.price)],
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                    ),
                    Text(state.label, style: context.text.bodySmall),
                    if (purchase.expiresAt != null && state == PurchaseState.granted)
                      Text(
                        'Дуусах огноо ${_date(purchase.expiresAt)}',
                        style: context.text.bodySmall?.copyWith(color: c.inkDim),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              Text(_date(purchase.createdAt), style: context.text.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

