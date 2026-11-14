import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'readiness_models.dart';

class ReadinessRepository {
  const ReadinessRepository(this._api);

  final ApiClient _api;

  Future<Readiness> mine() => _api.get('/readiness/my', parse: Readiness.fromJson);
}

final readinessRepositoryProvider = Provider<ReadinessRepository>((ref) => ReadinessRepository(ref.watch(apiClientProvider)));

final readinessProvider = FutureProvider.autoDispose<Readiness>((ref) => ref.watch(readinessRepositoryProvider).mine());
