import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'activity_models.dart';

/// Сурагчийн идэвх (`api/src/activity`). Дараалал (streak)-г апп авчихгүй: дарамт үүсгэнэ (UX-RESEARCH §10).
class ActivityRepository {
  const ActivityRepository(this._api);

  final ApiClient _api;

  Future<ActivityYear> year(int year) => _api.get('/activity/me', query: {'year': year}, parse: ActivityYear.fromJson);
}

final activityRepositoryProvider = Provider<ActivityRepository>((ref) => ActivityRepository(ref.watch(apiClientProvider)));

final activityYearProvider = FutureProvider.autoDispose.family<ActivityYear, int>(
  (ref, year) => ref.watch(activityRepositoryProvider).year(year),
);
