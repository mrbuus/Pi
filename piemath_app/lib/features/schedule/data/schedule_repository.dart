import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'schedule_models.dart';

class ScheduleRepository {
  const ScheduleRepository(this._api);

  final ApiClient _api;

  static Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();

  /// STUDENT л (эцэг эхэд 403).
  Future<ScheduleMe> me() => _api.get('/schedule/me', parse: (j) => ScheduleMe.fromJson(_map(j)));

  /// `start` = `YYYY-MM-DD` (апп Даваагаас өгнө). Цуцалсан/зөөсөн/амралтыг сервер шийднэ.
  Future<ScheduleWeek> week(String start) =>
      _api.get('/schedule/week', query: {'start': start}, parse: (j) => ScheduleWeek.fromJson(_map(j)));
}

final scheduleRepositoryProvider = Provider<ScheduleRepository>(
  (ref) => ScheduleRepository(ref.watch(apiClientProvider)),
);

ScheduleRepository _repo(Ref ref) {
  // Хэрэглэгч солигдвол кэш шинэчлэгдэнэ.
  ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
  return ref.watch(scheduleRepositoryProvider);
}

final scheduleMeProvider = FutureProvider<ScheduleMe>((ref) => _repo(ref).me());

/// Түлхүүр = 7 хоногийн Даваа гараг (`YYYY-MM-DD`).
final scheduleWeekProvider = FutureProvider.family<ScheduleWeek, String>((ref, start) => _repo(ref).week(start));
