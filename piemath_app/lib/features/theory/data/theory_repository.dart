import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'theory_models.dart';

class TheoryRepository {
  TheoryRepository(this._api);

  final ApiClient _api;

  /// Хичээлийн өдрүүд (огноогоор буурах). [q] — сэдэв эсвэл тестийн нэр, [date] — тэр өдрөөр шүүх.
  Future<List<TheoryRow>> list({String? q, String? date}) => _api.get(
    '/student-hub/theory',
    query: {
      if (q != null && q.trim().isNotEmpty) 'q': q.trim(),
      if (date != null && date.isNotEmpty) ...{'from': date, 'to': date},
    },
    parse: (j) => [for (final r in (j as List? ?? const [])) TheoryRow.fromJson(r)],
  );

  Future<TheoryDay> day(String classroomId, String date) => _api.get(
    '/lesson-day/${Uri.encodeComponent(classroomId)}/${Uri.encodeComponent(date)}/photos',
    parse: TheoryDay.fromJson,
  );

  /// Буруу илгээсэн зургаа буцааж устгана (илгээснээс 5 минутын дотор, эзэн 2026-11-12). Сервер мөрийг
  /// үлдээж зөвхөн зургийн жагсаалтыг хоослоно, аудитад бичнэ — «өгөгдөл устгахгүй» дүрэм.
  Future<TheoryDay> removePhotos(String classroomId, String date) => _api.delete(
    '/lesson-day/${Uri.encodeComponent(classroomId)}/${Uri.encodeComponent(date)}/photos',
    parse: TheoryDay.fromJson,
  );

  /// Миний багцыг БҮТНээр нь орлуулна (хоосон жагсаалтаар устгахгүй — [removePhotos]).
  Future<TheoryDay> savePhotos(String classroomId, String date, List<String> imageKeys) => _api.post(
    '/lesson-day/${Uri.encodeComponent(classroomId)}/${Uri.encodeComponent(date)}/photos',
    body: {'imageKeys': imageKeys},
    parse: TheoryDay.fromJson,
  );
}

final theoryRepositoryProvider = Provider<TheoryRepository>((ref) => TheoryRepository(ref.watch(apiClientProvider)));

/// Жагсаалтын шүүлтүүр: хайлт ба огноо (хоосон = бүгд).
typedef TheoryFilter = ({String q, String date});

final theoryListProvider = FutureProvider.autoDispose.family<List<TheoryRow>, TheoryFilter>(
  (ref, f) => ref.watch(theoryRepositoryProvider).list(q: f.q, date: f.date),
);

final theoryDayProvider = FutureProvider.autoDispose.family<TheoryDay, (String, String)>(
  (ref, key) => ref.watch(theoryRepositoryProvider).day(key.$1, key.$2),
);
