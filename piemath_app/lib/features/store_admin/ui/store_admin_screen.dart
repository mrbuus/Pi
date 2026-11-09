import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../data/store_admin_data.dart';

String _err(Object e, [String fallback = 'Хадгалж чадсангүй. Дахин оролдоно уу']) =>
    e is ApiError && e.kind != ApiErrorKind.unknown && e.message.trim().isNotEmpty ? e.message : fallback;

void _snack(BuildContext context, String m) => ScaffoldMessenger.maybeOf(context)
  ?..hideCurrentSnackBar()
  ..showSnackBar(SnackBar(content: Text(m)));

/// Дэлгүүрийн удирдлага (`/app/admin/store`, вэбийн `StoreAdminClient`; `/app/store/admin` ч энд) — Админ, Багш+.
/// Бүтээгдэхүүн (нэмэх, үнэ, идэвхгүй болгох), худалдан авалт (мөр бүрийн төлөв), орлогын нийт (зөвхөн Админ).
class StoreAdminScreen extends ConsumerWidget {
  const StoreAdminScreen({super.key});

  static const path = '/app/admin/store';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final access = ref.watch(storeAdminAccessProvider);
    if (!access.canOpen) {
      return Scaffold(
        appBar: AppBar(title: const Text('Дэлгүүрийн удирдлага')),
        body: const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden),
      );
    }
    final tabs = [
      const Tab(text: 'Бүтээгдэхүүн'),
      const Tab(text: 'Худалдан авалт'),
      if (access.canSeeTotals) const Tab(text: 'Орлого'),
    ];
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Дэлгүүрийн удирдлага'),
          actions: [
            if (access.canCreate)
              IconButton(
                tooltip: 'Бүтээгдэхүүн нэмэх',
                icon: const Icon(AppIcons.add),
                onPressed: () => _create(context, ref),
              ),
          ],
          bottom: TabBar(tabs: tabs),
        ),
        body: TabBarView(children: [const _Products(), const _Purchases(), if (access.canSeeTotals) const _Revenue()]),
      ),
    );
  }

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final repo = ref.read(storeAdminRepositoryProvider);
    List<StoreRef> tests;
    List<StoreRef> books;
    List<StoreProduct> existing;
    try {
      (tests, books, existing) = await (repo.tests(), repo.books(), ref.read(storeProductsProvider.future)).wait;
    } catch (_) {
      if (context.mounted) _snack(context, 'Тест, номын жагсаалтыг ачаалж чадсангүй');
      return;
    }
    if (!context.mounted) return;
    final used = {for (final p in existing) p.refId};
    final options = [
      for (final t in tests)
        if (!used.contains(t.id)) SelectOption('TEST:${t.id}', t.title, subtitle: ProductKind.test.label),
      for (final b in books)
        if (!used.contains(b.id)) SelectOption('BOOK:${b.id}', b.title, subtitle: ProductKind.book.label),
    ];
    if (options.isEmpty) {
      _snack(context, 'Нэмэх тест, ном алга (бүгд дэлгүүрт байна)');
      return;
    }
    final ok = await showFormSheet<bool>(
      context,
      title: 'Бүтээгдэхүүн нэмэх',
      submitLabel: 'Нэмэх',
      fields: [
        FormSelectField<String>(name: 'ref', label: 'Тест эсвэл ном', options: options, required: true),
        const FormMoneyField(name: 'price', label: 'Үнэ', required: true),
        const FormSwitchField(name: 'video', label: 'Видео хичээлтэй'),
      ],
      onSubmit: (v) async {
        final ref0 = v.get<String>('ref')!;
        final i = ref0.indexOf(':');
        await repo.create(
          kind: ProductKind.parse(ref0.substring(0, i)),
          refId: ref0.substring(i + 1),
          price: v.integer('price') ?? 0,
          includesVideo: v.boolean('video'),
        );
        return true;
      },
    );
    if (ok == true && context.mounted) {
      _snack(context, 'Бүтээгдэхүүн нэмэгдлээ');
      ref.invalidate(storeProductsProvider);
    }
  }
}

class _Products extends ConsumerStatefulWidget {
  const _Products();

  @override
  ConsumerState<_Products> createState() => _ProductsState();
}

class _ProductsState extends ConsumerState<_Products> {
  final _list = DataListController<StoreProduct>();
  DataQuery? _last;

  static const _filters = [
    DataFilter('active', 'Идэвхтэй'),
    DataFilter('inactive', 'Идэвхгүй'),
    DataFilter('TEST', 'Шалгалт'),
    DataFilter('BOOK', 'Ном'),
  ];

  static bool _in(StoreProduct p, String f) => switch (f) {
    'active' => p.active,
    'inactive' => !p.active,
    _ => p.kind.api == f,
  };

  Future<DataPage<StoreProduct>> _load(DataQuery q) async {
    if (q.isFirstPage && q == _last) ref.invalidate(storeProductsProvider);
    if (q.isFirstPage) _last = q;
    final all = [...await ref.read(storeProductsProvider.future)]
      ..sort((a, b) => (a.active == b.active ? 0 : (a.active ? -1 : 1)));
    return DataPage.local(
      all,
      q,
      matches: (p, t) => p.displayTitle.toLowerCase().contains(t),
      inFilter: _in,
      filters: _filters,
    );
  }

  Future<void> _refresh() async {
    _last = null;
    ref.invalidate(storeProductsProvider);
    await _list.refresh();
  }

  Future<void> _menu(StoreProduct p) async {
    final access = ref.read(storeAdminAccessProvider);
    final picked = await showSelectSheet<String>(
      context,
      title: p.displayTitle,
      options: [
        if (access.canEditPrice) const SelectOption('price', 'Үнэ солих', icon: AppIcons.receipt),
        if (p.active && access.canDeactivate)
          const SelectOption(
            'off',
            'Идэвхгүй болгох',
            subtitle: 'Худалдан авалтын түүх хадгалагдана',
            icon: AppIcons.ban,
          ),
        if (!p.active && access.canReactivate) const SelectOption('on', 'Дахин идэвхжүүлэх', icon: AppIcons.check),
      ],
    );
    if (!mounted || picked == null) return;
    final repo = ref.read(storeAdminRepositoryProvider);
    try {
      switch (picked.value) {
        case 'price':
          final ok = await showFormSheet<bool>(
            context,
            title: 'Үнэ солих',
            subtitle: p.displayTitle,
            fields: [FormMoneyField(name: 'price', label: 'Шинэ үнэ', initial: p.price, required: true)],
            onSubmit: (v) async {
              await repo.setPrice(p.id, v.integer('price') ?? 0);
              return true;
            },
          );
          if (ok != true) return;
        case 'off':
          final ok = await confirmAction(
            context,
            title: 'Идэвхгүй болгох уу',
            message: '«${p.displayTitle}» дэлгүүрт харагдахаа болино. Өмнө авсан хүмүүсийн эрх хэвээр',
            confirmLabel: 'Идэвхгүй болгох',
          );
          if (!ok) return;
          await repo.deactivate(p.id);
        case 'on':
          await repo.setActive(p.id, true);
      }
      if (mounted) _snack(context, 'Хадгаллаа');
      await _refresh();
    } catch (e) {
      if (mounted) _snack(context, _err(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return DataListScreen<StoreProduct>(
      controller: _list,
      load: _load,
      itemKey: (p) => p.id,
      searchHint: 'Бүтээгдэхүүн хайх',
      filters: _filters,
      countLabel: (n) => '$n бүтээгдэхүүн',
      emptyTitle: 'Бүтээгдэхүүн алга',
      emptyIcon: AppIcons.store,
      onTap: _menu,
      itemBuilder: (context, p) => ItemRow(
        title: p.displayTitle,
        meta: [p.kind.label, formatMnt(p.price), '${p.purchaseCount} худалдан авалт'],
        trailing: p.active ? null : const MetaChip(label: 'Идэвхгүй', tone: ChipTone.warning),
      ),
    );
  }
}

class _Purchases extends ConsumerStatefulWidget {
  const _Purchases();

  @override
  ConsumerState<_Purchases> createState() => _PurchasesState();
}

class _PurchasesState extends ConsumerState<_Purchases> {
  DataQuery? _last;

  static final _filters = [
    for (final s in StorePaymentStatus.values.where((s) => s != StorePaymentStatus.none)) DataFilter(s.name, s.label),
  ];

  Future<DataPage<StorePurchase>> _load(DataQuery q) async {
    if (q.isFirstPage && q == _last) ref.invalidate(storePurchasesProvider);
    if (q.isFirstPage) _last = q;
    return DataPage.local(
      await ref.read(storePurchasesProvider.future),
      q,
      matches: (p, t) =>
          p.userName.toLowerCase().contains(t) ||
          (p.userPhone ?? '').contains(t) ||
          p.productTitle.toLowerCase().contains(t),
      inFilter: (p, f) => p.status.name == f,
      filters: _filters,
    );
  }

  @override
  Widget build(BuildContext context) {
    return DataListScreen<StorePurchase>(
      load: _load,
      itemKey: (p) => p.id,
      searchHint: 'Нэр, утас, бүтээгдэхүүнээр хайх',
      filters: _filters,
      countLabel: (n) => '$n худалдан авалт',
      emptyTitle: 'Худалдан авалт алга',
      emptyIcon: AppIcons.receipt,
      itemBuilder: (context, p) => ItemRow(
        title: p.userName,
        meta: [p.productTitle, formatMnt(p.price)],
        subtitle: Meta(
          items: [
            p.userPhone,
            if (p.createdAt != null) DateMn.numeric(UbDateTime.fromInstant(p.createdAt!)),
            if (p.expiresAt != null) 'Дуусах: ${DateMn.numeric(UbDateTime.fromInstant(p.expiresAt!))}',
          ],
        ),
        trailing: MetaChip(
          label: p.status.label,
          tone: switch (p.status) {
            StorePaymentStatus.confirmed => ChipTone.success,
            StorePaymentStatus.pending => ChipTone.warning,
            StorePaymentStatus.rejected || StorePaymentStatus.reversed => ChipTone.error,
            StorePaymentStatus.none => ChipTone.neutral,
          },
        ),
      ),
    );
  }
}

/// Орлогын нийт — зөвхөн Админ.
class _Revenue extends ConsumerWidget {
  const _Revenue();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(storeRevenueProvider);
    return switch (async) {
      AsyncData(:final value) => RefreshIndicator(
        onRefresh: () async => ref.invalidate(storeRevenueProvider),
        child: ListView(
          padding: const EdgeInsets.all(AppSpace.gutter),
          children: [
            StatRow(
              tiles: [
                StatTile(label: 'Худалдан авалт', value: '${value.totalPurchases}', icon: AppIcons.receipt),
                StatTile(label: 'Нийт', value: formatMnt(value.totalRevenue), icon: AppIcons.chart),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            StatRow(
              tiles: [
                StatTile(
                  label: 'Баталгаажсан',
                  value: formatMnt(value.confirmedRevenue),
                  tone: ChipTone.success,
                  icon: AppIcons.success,
                ),
                StatTile(
                  label: 'Хүлээгдэж буй',
                  value: formatMnt(value.pendingRevenue),
                  tone: ChipTone.warning,
                  icon: AppIcons.hourglass,
                ),
              ],
            ),
          ],
        ),
      ),
      AsyncError() => ErrorState(onRetry: () => ref.invalidate(storeRevenueProvider)),
      _ => const LoadingState(),
    };
  }
}
