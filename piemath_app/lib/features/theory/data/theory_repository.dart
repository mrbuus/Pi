import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'theory_models.dart';

class TheoryRepository {
  TheoryRepository(this._api);

  final ApiClient _api;

  /// Хичээлийн өдрүүд (огноогоор буурах). [q] — сэдэв эсвэл тестийн нэр.
  Future<List<TheoryRow>> list({String? q}) => _api.get(
        '/student-hub/theory',
        query: {if (q != null && q.trim().isNotEmpty) 'q': q.trim()},
        parse: (j) => [for (final r in (j as List? ?? const [])) TheoryRow.fromJson(r)],
      );

  Future<TheoryDay> day(String classroomId, String date) => _api.get(
        '/lesson-day/${Uri.encodeComponent(classroomId)}/${Uri.encodeComponent(date)}/photos',
        parse: TheoryDay.fromJson,
      );

  /// Миний багцыг БҮТНээр нь орлуулна (хоосон = устгах).
  Future<TheoryDay> savePhotos(String classroomId, String date, List<String> imageKeys) => _api.post(
        '/lesson-day/${Uri.encodeComponent(classroomId)}/${Uri.encodeComponent(date)}/photos',
        body: {'imageKeys': imageKeys},
        parse: TheoryDay.fromJson,
      );
}

final theoryRepositoryProvider = Provider<TheoryRepository>((ref) => TheoryRepository(ref.watch(apiClientProvider)));

final theoryListProvider = FutureProvider.autoDispose.family<List<TheoryRow>, String>(
  (ref, q) => ref.watch(theoryRepositoryProvider).list(q: q),
);

final theoryDayProvider = FutureProvider.autoDispose.family<TheoryDay, (String, String)>(
  (ref, key) => ref.watch(theoryRepositoryProvider).day(key.$1, key.$2),
);
