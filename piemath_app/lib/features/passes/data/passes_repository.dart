import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'passes_models.dart';

List<T> _list<T>(Object? j, T Function(Object? e) parse) => j is List ? [for (final e in j) parse(e)] : <T>[];

/// Эрхийн удирдлагын дуудлагууд (вэбийн `PassesAdminClient.tsx`-тэй ижил зам). Эрх СЕРВЕРТ.
///
/// Санаатайгаар БАЙХГҮЙ:
/// - `POST /passes/grants/:id/revoke` (`DELETE /me/passes/:id`) — сервер `userPass`-ыг бүрмөсөн устгадаг
///   (hard delete), прод өгөгдлийн дүрмээр апп-д гаргахгүй.
/// - `DELETE /passes/:id` — тодорхойлолтыг бүрмөсөн устгадаг. Оронд нь «Идэвхгүй болгох».
class PassesRepository {
  const PassesRepository(this._api);

  final ApiClient _api;

  static String _seg(String id) => Uri.encodeComponent(id);

  /// Бүх эрх (идэвхгүйг оролцуулж), эзэмшигчийн тоотой.
  Future<List<PassDef>> list() => _api.get('/passes', parse: (j) => _list(j, PassDef.fromJson));

  Future<List<PassHolder>> holders(String passId) =>
      _api.get('/passes/${_seg(passId)}/holders', parse: (j) => _list(j, PassHolder.fromJson));

  /// Шинэ эрх — үргэлж идэвхтэй үүснэ (вэбтэй ижил).
  Future<PassDef> create(PassDraft draft) =>
      _api.post('/passes', body: {...draft.toJson(), 'active': true}, parse: PassDef.fromJson);

  Future<PassDef> update(String id, PassDraft draft) =>
      _api.patch('/passes/${_seg(id)}', body: draft.toJson(), parse: PassDef.fromJson);

  /// Шинэ олголтыг зогсоох/сэргээх. Өмнө олгосон эрх хэвээр.
  Future<PassDef> setActive(String id, {required bool active}) =>
      _api.patch('/passes/${_seg(id)}', body: {'active': active}, parse: PassDef.fromJson);

  /// Сурагчид гараар олгоно. Хүсэлт автоматаар ДАВТАГДАХГҮЙ (давхар олголтоос сэргийлнэ).
  Future<void> grant(String passId, String userId, {String? note}) {
    final n = note?.trim() ?? '';
    return _api.post<void>('/passes/${_seg(passId)}/grant', body: {'userId': userId, if (n.isNotEmpty) 'note': n});
  }

  /// Сурагч хайх — нэр, кодоор, 2-оос дээш тэмдэгт (сервер шалгана).
  Future<List<PassStudentHit>> searchStudents(String q) =>
      _api.get('/users/search', query: {'q': q.trim()}, parse: (j) => _list(j, PassStudentHit.fromJson));
}

final passesRepositoryProvider = Provider<PassesRepository>((ref) => PassesRepository(ref.watch(apiClientProvider)));

PassesRepository _repo(Ref ref) {
  ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
  return ref.watch(passesRepositoryProvider);
}

/// Нэвтэрсэн хүний эрхийн удирдлагын эрх.
final passesAccessProvider = Provider<PassesAccess>((ref) {
  final s = ref.watch(sessionProvider);
  return PassesAccess(s is SignedIn ? s.role : null);
});

final passesListProvider = FutureProvider<List<PassDef>>((ref) => _repo(ref).list());

final passHoldersProvider = FutureProvider.autoDispose.family<List<PassHolder>, String>(
  (ref, id) => _repo(ref).holders(id),
);
