import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'json.dart';

/// Сурагчийн үйл явдлын лог (`POST /events`, batch) — вэбийн `components/lesson/api.ts` `logChapterOpened`-той ИЖИЛ бие.
/// Аналитик тул алдаа гарвал чимээгүй өнгөрнө: сурагчийн урсгалыг хэзээ ч блоклохгүй.
class EventsRepository {
  const EventsRepository(this._api);

  final ApiClient _api;

  /// Бүлэг нээсэн (`CHAPTER_OPENED`). Вэбтэй адил: хичээл амжилттай ачаалагдсаны дараа нэг удаа.
  Future<void> chapterOpened(String chapterId, {DateTime? at}) async {
    if (!isSafeId(chapterId)) return;
    try {
      await _api.post<Object?>(
        '/events',
        body: {
          'events': [
            {
              'type': 'CHAPTER_OPENED',
              'occurredAt': (at ?? DateTime.now()).toUtc().toIso8601String(),
              'chapterId': chapterId,
            },
          ],
        },
      );
    } catch (_) {
      // аналитик лог — сурагчийн урсгалыг блоклохгүй
    }
  }
}

final eventsRepositoryProvider = Provider<EventsRepository>((ref) => EventsRepository(ref.watch(apiClientProvider)));
