import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/time/ub_time.dart';
import 'goal_models.dart';
import 'json.dart';

/// Сурагчийн өөрийн зорилго (`api/src/goals`). Сервер зөвхөн JWT-ийн эзний зорилгыг л өгнө.
///
/// Устгах (`DELETE`) нь серверт ХАТУУ устгал тул апп хэрэглэхгүй — оронд нь «Цуцалсан» төлөв (RULES §6).
class GoalsRepository {
  const GoalsRepository(this._api);

  final ApiClient _api;

  Future<List<Goal>> list() => _api.get('/goals', parse: (j) => [for (final g in asList(j)) Goal.fromJson(g)]);

  Future<Goal> create({
    required String title,
    String? description,
    UbDateTime? targetDate,
    GoalStatus? status,
    GoalSubject? subject,
  }) => _api.post(
    '/goals',
    body: {
      'title': title,
      if (description != null && description.trim().isNotEmpty) 'description': description.trim(),
      if (targetDate != null) 'targetDate': targetDate.toInstant().toIso8601String(),
      if (status != null) 'status': status.wire,
      if (subject != null) 'subject': subject.wire,
    },
    parse: Goal.fromJson,
  );

  /// Бүх талбар нэг дор: `targetDate: null` бол огноог арилгана.
  Future<Goal> update(
    String id, {
    required String title,
    required String description,
    required UbDateTime? targetDate,
    required GoalStatus status,
    required GoalSubject? subject,
  }) {
    if (!isSafeId(id)) throw const ApiError(ApiErrorKind.notFound, 'Зорилго олдсонгүй.');
    return _api.patch(
      '/goals/$id',
      body: {
        'title': title,
        'description': description.trim(),
        'targetDate': targetDate?.toInstant().toIso8601String(),
        'status': status.wire,
        if (subject != null) 'subject': subject.wire,
      },
      parse: Goal.fromJson,
    );
  }

  Future<Goal> setStatus(String id, GoalStatus status) {
    if (!isSafeId(id)) throw const ApiError(ApiErrorKind.notFound, 'Зорилго олдсонгүй.');
    return _api.patch('/goals/$id', body: {'status': status.wire}, parse: Goal.fromJson);
  }
}

final goalsRepositoryProvider = Provider<GoalsRepository>((ref) => GoalsRepository(ref.watch(apiClientProvider)));

final goalsProvider = FutureProvider.autoDispose<List<Goal>>((ref) => ref.watch(goalsRepositoryProvider).list());
