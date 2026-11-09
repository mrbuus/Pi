import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/buyer_models.dart';
import '../data/buyer_repository.dart';
import 'buyer_home_screen.dart' show PurchaseRow;

/// `/app/store` — «Дэлгүүр» (вэбийн `app/store`): «Бүтээгдэхүүнүүд» ба «Миний авсан».
///
/// Бүх бүтээгдэхүүн ДИЖИТАЛ (тест, номын эрх, хугацаат багц — физик бараа байхгүй). Тиймээс апп дотор
/// худалдахгүй, гадны худалдан авалт руу хөтлөхгүй (Apple 3.1.1, Google Play Payments; COMPLIANCE §1.9):
/// үнэ, «Худалдаж авах» товч, вэб холбоос БАЙХГҮЙ — зөвхөн каталог ба өөрийн эрхийн төлөв.
class StoreScreen extends ConsumerWidget {
  const StoreScreen({super.key, this.now});

  /// Тестэд тогтмол цаг.
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final at = now ?? DateTime.now();
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Дэлгүүр'),
          bottom: const TabBar(tabs: [Tab(text: 'Бүтээгдэхүүнүүд'), Tab(text: 'Миний авсан')]),
        ),
        body: TabBarView(children: [_ProductsTab(now: at), _PurchasesTab(now: at)]),
      ),
    );
  }
}

String _errorText(Object e) => e is ApiError ? e.message : AppStrings.genericError;

class _ProductsTab extends ConsumerWidget {
  const _ProductsTab({required this.now});

  final DateTime now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(storeProductsProvider);
    // Эрхийн төлөв — авсан эсэх (алдаа гарвал каталог хэвээр харагдана)
    final mine = <String, BuyerPurchase>{
      for (final p in ref.watch(buyerPurchasesProvider).value ?? const <BuyerPurchase>[])
        if (p.productItemId != null) p.productItemId!: p,
    };
    return products.when(
      skipLoadingOnRefresh: true,
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(message: _errorText(e), onRetry: () => ref.invalidate(storeProductsProvider)),
      data: (list) {
        if (list.isEmpty) {
          return const EmptyState(
            icon: AppIcons.store,
            title: 'Бүтээгдэхүүн олдсонгүй',
            message: 'Одоогоор дэлгүүрт бүтээгдэхүүн алга',
          );
        }
        final rows = <Widget>[const _AccessNote()];
        for (final kind in PurchaseKind.values) {
          final group = list.where((p) => p.kind == kind).toList();
          if (group.isEmpty) continue;
          rows.add(SectionHeader(title: kind.groupTitle, padding: const EdgeInsets.only(top: AppSpace.lg, bottom: AppSpace.sm)));
          for (final p in group) {
            rows.add(
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: _ProductCard(product: p, purchase: mine[p.id], now: now),
              ),
            );
          }
        }
        return RefreshIndicator(
          onRefresh: () async {
            ref
              ..invalidate(storeProductsProvider)
              ..invalidate(buyerPurchasesProvider);
            await ref.read(storeProductsProvider.future).then<Object?>((v) => v, onError: (Object _) => null);
          },
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xxl),
            itemCount: rows.length,
            itemBuilder: (_, i) => rows[i],
          ),
        );
      },
    );
  }
}

/// Эрхийн тухай — худалдах товч, үнэ, гадны холбоосгүй.
class _AccessNote extends StatelessWidget {
  const _AccessNote();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(AppIcons.info, size: 20, color: c.brand),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Text(
              'Шалгалт, ном, багцын эрхийг сургалтын төв олгоно. Олгогдсон эрх энд болон «Миний авсан» хэсэгт харагдана',
              style: context.text.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product, required this.purchase, required this.now});

  final StoreProduct product;
  final BuyerPurchase? purchase;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final state = purchase?.state(now);
    final (IconData? icon, Color tone) = switch (state) {
      PurchaseState.granted => (AppIcons.success, c.success),
      PurchaseState.waiting => (AppIcons.time, c.info),
      PurchaseState.expired => (AppIcons.calendarExpired, c.inkDim),
      null => (null, c.inkDim),
    };
    final kindIcon = switch (product.kind) {
      PurchaseKind.test => AppIcons.exam,
      PurchaseKind.book => AppIcons.library,
      PurchaseKind.pass => AppIcons.card,
    };
    return AppCard(
      semanticLabel: [product.title, product.kind.label, ?state?.label].join(', '),
      child: Row(
        children: [
          Icon(kindIcon, size: 22, color: c.brand),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(product.title, style: context.text.titleSmall),
                Meta(items: [product.kind.label, if (product.includesVideo) 'Видео тайлбартай']),
                if (state != null) ...[
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Icon(icon, size: 14, color: tone),
                      const SizedBox(width: 4),
                      Flexible(child: Text(state.label, style: context.text.bodySmall?.copyWith(color: tone))),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PurchasesTab extends ConsumerWidget {
  const _PurchasesTab({required this.now});

  final DateTime now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final purchases = ref.watch(buyerPurchasesProvider);
    return purchases.when(
      skipLoadingOnRefresh: true,
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(message: _errorText(e), onRetry: () => ref.invalidate(buyerPurchasesProvider)),
      data: (list) => list.isEmpty
          ? const EmptyState(
              icon: AppIcons.store,
              title: 'Худалдан авалт байхгүй',
              message: 'Таны худалдан авалт хараахан бүртгэгдээгүй байна',
            )
          : RefreshIndicator(
              onRefresh: () async => ref.invalidate(buyerPurchasesProvider),
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xxl),
                itemCount: list.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (_, i) => PurchaseRow(purchase: list[i], now: now),
              ),
            ),
    );
  }
}
