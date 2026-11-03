import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'json.dart';

/// Сурагчийн 7 хоногийн зорилго (`GET/PUT /study/weekly-goal`). null = зорилгогүй.
class WeeklyGoalRepository {
  const WeeklyGoalRepository(this._api);

  final ApiClient _api;

  Future<int?> get() => _api.get('/study/weekly-goal', parse: _days);

  /// Давтахад аюулгүй (ижил утга) тул сүлжээний алдаанд дахин оролдоно.
  Future<int?> put(int? days) => _api.put('/study/weekly-goal', body: {'daysPerWeek': days}, parse: _days, retry: true);

  static int? _days(Object? raw) {
    final v = asInt(asMap(raw)['daysPerWeek']);
    return v == null || v < 1 || v > 7 ? null : v;
  }
}

final weeklyGoalRepositoryProvider = Provider<WeeklyGoalRepository>(
  (ref) => WeeklyGoalRepository(ref.watch(apiClientProvider)),
);
