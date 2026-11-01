import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'support_models.dart';

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();

/// Нэг хуудсанд харуулах санал хүсэлт (сервер 51 хүртэл буцаана — 51 дэх нь «дахин бий»).
const feedbackPageSize = 50;

class FeedbackPage {
  const FeedbackPage(this.items, this.nextCursor);

  final List<FeedbackTicket> items;
  final String? nextCursor;
}

class SupportRepository {
  const SupportRepository(this._api);

  final ApiClient _api;

  /// Нийтийн (нэвтрэлтгүй).
  Future<List<HelpTopic>> topics() => _api.get(
        '/centre-help/topics',
        auth: false,
        parse: (j) => [for (final e in (_map(j)['topics'] as List?) ?? const <Object?>[]) HelpTopic.fromJson(_map(e))],
      );

  Future<HelpReply> ask(String question) => _api.post(
        '/centre-help/ask',
        auth: false,
        body: {'question': question},
        parse: (j) => HelpReply.fromJson(_map(j)),
      );

  /// Өөрийн хүсэлтүүд, шинэ нь эхэнд. Сервер 51 хүртэл мөр буцаавал 50-ыг харуулж, 50 дахь мөрийн
  /// id-г дараагийн `cursor` болгоно (вэбийн `FeedbackWorkspace`).
  Future<FeedbackPage> myFeedback({String? cursor}) => _api.get(
        '/feedback',
        query: {'cursor': cursor},
        parse: (j) {
          final rows = [for (final e in j! as List) FeedbackTicket.fromJson(_map(e))];
          final more = rows.length > feedbackPageSize;
          final shown = more ? rows.sublist(0, feedbackPageSize) : rows;
          return FeedbackPage(shown, more ? shown.last.id : null);
        },
      );

  /// [clientRequestId] (UUID) — сүлжээний давтан илгээлтийг сервер нэг болгоно. Ижил агуулгыг
  /// дахин илгээхдээ ижил id-г ашигла. `forbidNonWhitelisted` тул DTO-д байхгүй талбар бүү нэм.
  Future<FeedbackTicket> send({
    required String clientRequestId,
    required String kind,
    required String subject,
    required String body,
    String? contextPath,
  }) =>
      _api.post(
        '/feedback',
        body: {
          'clientRequestId': clientRequestId,
          'kind': kind,
          'subject': subject,
          'body': body,
          'contextPath': ?contextPath,
        },
        retry: true,
        parse: (j) => FeedbackTicket.fromJson(_map(j)),
      );
}

final supportRepositoryProvider = Provider<SupportRepository>(
  (ref) => SupportRepository(ref.watch(apiClientProvider)),
);
