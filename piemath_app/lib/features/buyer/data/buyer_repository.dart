import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import '../../learning/data/json.dart';
import 'buyer_models.dart';

/// Худалдан авагчийн нүүр: ЗӨВХӨН УНШИХ (худалдан авалт апп дотор хийгдэхгүй — Apple-ийн дүрэм, вэбээр).
class BuyerRepository {
  const BuyerRepository(this._api);

  final ApiClient _api;

  Future<List<BuyerPass>> passes() =>
      _api.get('/me/passes', parse: (j) => [for (final p in asList(j)) BuyerPass.fromJson(p)]);

  Future<List<StoreProduct>> products() =>
      _api.get('/store/products', parse: (j) => [for (final p in asList(j)) StoreProduct.fromJson(p)]);

  Future<List<BuyerPurchase>> purchases() =>
      _api.get('/store/my-purchases', parse: (j) => [for (final p in asList(j)) BuyerPurchase.fromJson(p)]);
}

final buyerRepositoryProvider = Provider<BuyerRepository>((ref) => BuyerRepository(ref.watch(apiClientProvider)));

BuyerRepository _repo(Ref ref) {
  // Хэрэглэгч солигдвол кэш шинэчлэгдэнэ.
  ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
  return ref.watch(buyerRepositoryProvider);
}

final buyerPassesProvider = FutureProvider.autoDispose<List<BuyerPass>>((ref) => _repo(ref).passes());

final buyerPurchasesProvider = FutureProvider.autoDispose<List<BuyerPurchase>>((ref) => _repo(ref).purchases());

final storeProductsProvider = FutureProvider.autoDispose<List<StoreProduct>>((ref) => _repo(ref).products());
