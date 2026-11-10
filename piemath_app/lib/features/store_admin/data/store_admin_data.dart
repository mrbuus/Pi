import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/time/ub_time.dart';
import '../../learning/data/json.dart';

enum ProductKind {
  test('TEST', 'Шалгалт'),
  book('BOOK', 'Ном'),
  pass('PASS', 'Эрх');

  const ProductKind(this.api, this.label);
  final String api;
  final String label;

  static ProductKind parse(String? v) => switch (v) {
    'BOOK' => book,
    'PASS' => pass,
    _ => test,
  };
}

@immutable
class StoreProduct {
  const StoreProduct({
    required this.id,
    required this.kind,
    required this.refId,
    required this.price,
    required this.active,
    this.title,
    this.purchaseCount = 0,
  });

  factory StoreProduct.fromJson(Object? raw) {
    final j = asMap(raw);
    return StoreProduct(
      id: asStr(j['id']) ?? '',
      kind: ProductKind.parse(asStr(j['kind'])),
      refId: asStr(j['refId']) ?? '',
      price: asInt(j['price']) ?? 0,
      active: asBool(j['active']),
      title: asStr(j['title']),
      purchaseCount: asInt(j['purchaseCount']) ?? 0,
    );
  }

  final String id;
  final ProductKind kind;
  final String refId;
  final int price;
  final bool active;
  final String? title;
  final int purchaseCount;

  String get displayTitle => (title ?? '').trim().isEmpty ? 'Нэргүй бүтээгдэхүүн' : title!;
}

/// Худалдан авалтын төлбөрийн төлөв (`PaymentStatus`).
enum StorePaymentStatus {
  pending('Хүлээгдэж буй'),
  confirmed('Баталгаажсан'),
  rejected('Татгалзсан'),
  reversed('Буцаасан'),
  none('Төлбөргүй');

  const StorePaymentStatus(this.label);
  final String label;

  static StorePaymentStatus parse(String? v) => switch (v) {
    'PENDING' => pending,
    'CONFIRMED' => confirmed,
    'REJECTED' => rejected,
    'REVERSED' => reversed,
    _ => none,
  };
}

@immutable
class StorePurchase {
  const StorePurchase({
    required this.id,
    required this.userName,
    required this.productTitle,
    required this.kind,
    required this.price,
    this.userPhone,
    this.createdAt,
    this.grantedAt,
    this.expiresAt,
    this.status = StorePaymentStatus.none,
  });

  factory StorePurchase.fromJson(Object? raw) {
    final j = asMap(raw);
    return StorePurchase(
      id: asStr(j['id']) ?? '',
      userName: asStr(j['userName']) ?? '',
      userPhone: asStr(j['userPhone']),
      productTitle: asStr(j['productTitle']) ?? '',
      kind: ProductKind.parse(asStr(j['productKind'])),
      price: asInt(j['price']) ?? 0,
      createdAt: parseApiInstant(asStr(j['createdAt'])),
      grantedAt: parseApiInstant(asStr(j['grantedAt'])),
      expiresAt: parseApiInstant(asStr(j['expiresAt'])),
      status: StorePaymentStatus.parse(asStr(j['paymentStatus'])),
    );
  }

  final String id;
  final String userName;
  final String? userPhone;
  final String productTitle;
  final ProductKind kind;
  final int price;
  final DateTime? createdAt;
  final DateTime? grantedAt;
  final DateTime? expiresAt;
  final StorePaymentStatus status;
}

@immutable
class StoreRevenue {
  const StoreRevenue({
    this.totalPurchases = 0,
    this.totalRevenue = 0,
    this.confirmedRevenue = 0,
    this.pendingRevenue = 0,
  });

  factory StoreRevenue.fromJson(Object? raw) {
    final j = asMap(raw);
    return StoreRevenue(
      totalPurchases: asInt(j['totalPurchases']) ?? 0,
      totalRevenue: asInt(j['totalRevenue']) ?? 0,
      confirmedRevenue: asInt(j['confirmedRevenue']) ?? 0,
      pendingRevenue: asInt(j['pendingRevenue']) ?? 0,
    );
  }

  final int totalPurchases;
  final int totalRevenue;
  final int confirmedRevenue;
  final int pendingRevenue;
}

/// Дэлгүүрт нэмэх боломжтой тест / ном.
@immutable
class StoreRef {
  const StoreRef(this.id, this.title);
  final String id;
  final String title;
}

/// Дэлгүүрийн удирдлагын API (`api/src/store/store.controller.ts`, `FinanceCapabilityGuard`).
/// Бүтээгдэхүүн нэмэх, идэвхгүй болгох — Админ, Багш+; үнэ, дахин идэвхжүүлэх — Админ.
class StoreAdminRepository {
  const StoreAdminRepository(this._api);

  final ApiClient _api;

  static String _enc(String v) => Uri.encodeComponent(v);

  Future<List<StoreProduct>> products() =>
      _api.get('/store/admin/products', parse: (j) => [for (final e in asList(j)) StoreProduct.fromJson(e)]);

  Future<List<StorePurchase>> purchases() =>
      _api.get('/store/admin/purchases', parse: (j) => [for (final e in asList(j)) StorePurchase.fromJson(e)]);

  Future<StoreRevenue> revenue() => _api.get('/store/admin/revenue', parse: StoreRevenue.fromJson);

  Future<List<StoreRef>> tests() => _api.get(
    '/tests',
    query: {'includeThousand': '1'},
    parse: (j) => [for (final e in asList(j)) StoreRef(asStr(asMap(e)['id']) ?? '', asStr(asMap(e)['title']) ?? '')],
  );

  Future<List<StoreRef>> books() => _api.get(
    '/books',
    parse: (j) => [for (final e in asList(j)) StoreRef(asStr(asMap(e)['id']) ?? '', asStr(asMap(e)['title']) ?? '')],
  );

  Future<void> create({
    required ProductKind kind,
    required String refId,
    required int price,
    bool includesVideo = false,
  }) => _api.post<Object?>(
    '/store/admin/products',
    body: {'kind': kind.api, 'refId': refId, 'price': price, if (includesVideo) 'includesVideo': true},
  );

  /// Идэвхгүй болгох — бүтээгдэхүүн, худалдан авалтын түүх хадгалагдана (устгахгүй).
  Future<void> deactivate(String id) =>
      _api.post<Object?>('/store/admin/products/${_enc(id)}/deactivate', body: const <String, Object?>{});

  Future<void> setActive(String id, bool active) =>
      _api.patch<Object?>('/store/admin/products/${_enc(id)}/status', body: {'active': active});

  Future<void> setPrice(String id, int price) =>
      _api.post<Object?>('/store/admin/products/${_enc(id)}/price', body: {'price': price});
}

final storeAdminRepositoryProvider = Provider<StoreAdminRepository>(
  (ref) => StoreAdminRepository(ref.watch(apiClientProvider)),
);

/// Дэлгүүрийн удирдлагын эрх. Орлогын НИЙТ дүн зөвхөн Админд (Багш+ зөвхөн мөр бүрийн төлөв, эзний дүрэм).
class StoreAdminAccess {
  const StoreAdminAccess(this.role);

  final UserRole? role;

  bool get isAdmin => role == UserRole.admin;
  bool get canOpen => isAdmin || role == UserRole.teacherPlus;
  bool get canCreate => canOpen;
  bool get canDeactivate => canOpen;
  bool get canEditPrice => isAdmin;
  bool get canReactivate => isAdmin;
  bool get canSeeTotals => isAdmin;
}

final storeAdminAccessProvider = Provider<StoreAdminAccess>((ref) {
  final s = ref.watch(sessionProvider);
  return StoreAdminAccess(s is SignedIn ? s.role : null);
});

final storeProductsProvider = FutureProvider.autoDispose<List<StoreProduct>>(
  (ref) => ref.watch(storeAdminRepositoryProvider).products(),
);

final storePurchasesProvider = FutureProvider.autoDispose<List<StorePurchase>>(
  (ref) => ref.watch(storeAdminRepositoryProvider).purchases(),
);

final storeRevenueProvider = FutureProvider.autoDispose<StoreRevenue>(
  (ref) => ref.watch(storeAdminRepositoryProvider).revenue(),
);
