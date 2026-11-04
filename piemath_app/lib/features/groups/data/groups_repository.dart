import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'groups_models.dart';

/// Гадны багшийн ангийн бүлгийн дуудлагууд (вэбийн `components/groups/*`-тэй ижил зам).
/// Эрх СЕРВЕРТ: бүлэг үүсгэх, харах нь баталгаажсан гадны багш; нэгдэх нь сурагч, худалдан авагч.
/// Хасах, архивлах нь ЗӨӨЛӨН (`leftAt`, `archived`) — түүх хадгалагдана.
class GroupsRepository {
  const GroupsRepository(this._api);

  final ApiClient _api;

  static Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const {};

  Future<List<TeacherGroup>> myGroups() => _api.get(
    '/teacher-groups/my-groups',
    parse: (j) => j is List ? [for (final e in j) TeacherGroup.fromJson(_map(e))] : <TeacherGroup>[],
  );

  Future<TeacherGroup> create(String name) =>
      _api.post('/teacher-groups/create', body: {'name': name}, parse: (j) => TeacherGroup.fromJson(_map(j)));

  /// Кодоор нэгдэнэ. Буцаах нь бүлгийн id.
  Future<String> join(String code) => _api.post(
    '/teacher-groups/join',
    body: {'joinCode': normalizeJoinCode(code)},
    parse: (j) => (_map(j)['groupId'] as String?) ?? '',
  );

  Future<GroupDetails> details(String id) =>
      _api.get('/teacher-groups/$id', parse: (j) => GroupDetails.fromJson(_map(j)));

  /// Бүлгийг архивлана (устгахгүй).
  Future<void> archive(String id) => _api.put<void>('/teacher-groups/$id/archive');

  /// Сурагчийг бүлгээс хасна — сервер `leftAt` бөглөнө, дүн, түүх хадгалагдана.
  Future<void> removeStudent(String groupId, String studentId) =>
      _api.delete<void>('/teacher-groups/$groupId/students/$studentId');
}

final groupsRepositoryProvider = Provider<GroupsRepository>((ref) => GroupsRepository(ref.watch(apiClientProvider)));

GroupsRepository _repo(Ref ref) {
  ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
  return ref.watch(groupsRepositoryProvider);
}

final myGroupsProvider = FutureProvider<List<TeacherGroup>>((ref) => _repo(ref).myGroups());

final groupDetailsProvider = FutureProvider.family<GroupDetails, String>((ref, id) => _repo(ref).details(id));
