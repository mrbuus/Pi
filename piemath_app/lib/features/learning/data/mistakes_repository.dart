import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'json.dart';
import 'mistake_models.dart';

/// Алдааны дэвтрийн API (`docs/api-contract/learning.md` §1). Хариуг СЕРВЕР шалгана.
class MistakesRepository {
  const MistakesRepository(this._api);

  final ApiClient _api;

  Future<Notebook> notebook({MistakeStatus? status, String? topic, MistakeSource? source, String? cursor}) => _api.get(
    '/mistakes/my',
    query: {
      'status': status?.wire,
      'topic': (topic == null || topic.isEmpty) ? null : topic,
      'source': source?.wire,
      'cursor': cursor,
    },
    parse: Notebook.fromJson,
  );

  /// Өнөөдөр давтах (дээд тал нь 5).
  Future<List<Mistake>> today() =>
      _api.get('/mistakes/today', parse: (j) => [for (final i in asList(j)) Mistake.fromJson(i)]);

  /// Дахин оролдлого. Илгээх хүсэлт ХЭЗЭЭ Ч давтагдахгүй (сервер retryCount нэмдэг).
  /// [answer]: TEXT сонголт → эх индекс (int), LETTER → үсэг, FILL_NUMBER → мөр эсвэл `{нүд: утга}`, OPEN → мөр.
  Future<RetryResult> retry(String id, Object answer) =>
      _api.post('/mistakes/${_id(id)}/retry', body: {'answer': answer}, parse: RetryResult.fromJson);

  /// Шалтгаан эсвэл тэмдэглэл хадгалах.
  Future<void> patch(String id, {MistakeReason? reason, String? note}) => _api.patch<void>(
    '/mistakes/${_id(id)}',
    body: {if (reason != null) 'reason': reason.wire, 'note': ?note},
    retry: true,
  );

  static String _id(String id) {
    if (!isSafeId(id)) throw const ApiError(ApiErrorKind.notFound, 'Алдаа олдсонгүй.');
    return id;
  }
}

final mistakesRepositoryProvider = Provider<MistakesRepository>((ref) => MistakesRepository(ref.watch(apiClientProvider)));
