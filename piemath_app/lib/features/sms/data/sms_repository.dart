import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'sms_models.dart';

/// SMS-ийн дуудлагууд (вэбийн `components/sms/*`-тэй ижил зам, бие).
///
/// Эрх СЕРВЕРТ (`sms.controller.ts`): унших (`status`, `messages`, `templates`) нь Админ, Багш+;
/// илгээх, дахин илгээх, загвар засах нь ЗӨВХӨН Админ. `SMS_ENABLED`-гүй үед бичих бүх хүсэлт 503.
class SmsRepository {
  const SmsRepository(this._api);

  final ApiClient _api;

  static List<Object?> _list(Object? j) => j is List ? j : const [];

  Future<SmsStatus> status() => _api.get('/sms/status', parse: (j) => SmsStatus.fromJson(asMap(j)));

  /// Түүх. Сервер `skip`/`take` хүлээж авна (`page` биш), `take` 200-аас ихгүй.
  Future<SmsMessagePage> messages({SmsMessageStatus? status, String? phone, int skip = 0, int take = 20}) => _api.get(
    '/sms/messages',
    query: {
      'skip': '$skip',
      'take': '$take',
      if (status != null && status != SmsMessageStatus.unknown) 'status': status.apiValue,
      if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
    },
    parse: (j) {
      final m = asMap(j);
      final rows = [for (final r in _list(m['messages'])) SmsMessage.fromJson(asMap(r))];
      final total = m['total'];
      return SmsMessagePage(rows, total is num ? total.toInt() : rows.length);
    },
  );

  Future<List<SmsTemplate>> templates() =>
      _api.get('/sms/templates', parse: (j) => [for (final r in _list(j)) SmsTemplate.fromJson(asMap(r))]);

  /// Нэг дугаар руу. ДАВТАХГҮЙ (`retry: false`) — давхар SMS мөнгө.
  Future<({String messageId, int segments})> send({required String phone, required String text}) => _api.post(
    '/sms/send',
    body: {'phone': phone, 'text': text},
    parse: (j) {
      final m = asMap(j);
      final seg = m['segments'];
      return (messageId: '${m['messageId'] ?? ''}', segments: seg is num ? seg.toInt() : 1);
    },
  );

  /// Бөөн илгээлтийн тооцоо — юу ч илгээхгүй, давтахад аюулгүй.
  Future<SmsEstimate> estimate({required List<String> phones, required String text}) => _api.post(
    '/sms/bulk/estimate',
    body: {'phones': phones, 'text': text},
    retry: true,
    parse: (j) => SmsEstimate.fromJson(asMap(j)),
  );

  /// Ноорог үүсгэнэ (илгээхгүй). Буцаах нь `batchId`.
  Future<String> createBulk({required List<String> phones, required String text}) => _api.post(
    '/sms/bulk',
    body: {'phones': phones, 'text': text},
    parse: (j) => '${asMap(j)['batchId'] ?? ''}',
  );

  /// Ноорогийг илгээж эхлүүлнэ. ДАВТАХГҮЙ.
  Future<SmsBatchStarted> startBulk(String batchId) =>
      _api.post('/sms/bulk/${Uri.encodeComponent(batchId)}/start', parse: (j) => SmsBatchStarted.fromJson(asMap(j)));

  /// Амжилтгүй мессежийг дахин илгээнэ (зөвхөн `FAILED`).
  Future<void> retry(String messageId) =>
      _api.post<Object?>('/sms/messages/${Uri.encodeComponent(messageId)}/retry');

  Future<SmsTemplate> createTemplate({required String name, required String body, required SmsKind kind}) => _api.post(
    '/sms/templates',
    body: {'name': name, 'body': body, 'kind': kind.apiValue},
    parse: (j) => SmsTemplate.fromJson(asMap(j)),
  );

  Future<SmsTemplate> updateTemplate(String id, {required String name, required String body}) => _api.patch(
    '/sms/templates/${Uri.encodeComponent(id)}',
    body: {'name': name, 'body': body},
    parse: (j) => SmsTemplate.fromJson(asMap(j)),
  );

  // Загвар устгах (`DELETE /sms/templates/:id`) нь серверт ХАТУУ устгал — апп-д санаатайгаар байхгүй.

  /// Хүлээн авагч бүрдүүлэх: ангиуд.
  Future<List<SmsClassroom>> classrooms() async {
    final rows = await _api.get('/classrooms', parse: (j) => [for (final r in _list(j)) SmsClassroom.fromJson(asMap(r))]);
    return rows..sort((a, b) => a.name.compareTo(b.name));
  }

  /// Хүлээн авагч бүрдүүлэх: архивлаагүй сурагчдын утас.
  Future<List<SmsStudentContact>> students() => _api.get(
    '/users',
    query: {'role': 'STUDENT'},
    parse: (j) => [
      for (final r in _list(j))
        if (asMap(r)['role'] == null || asMap(r)['role'] == 'STUDENT') SmsStudentContact.fromJson(asMap(r)),
    ],
  );
}

final smsRepositoryProvider = Provider<SmsRepository>((ref) => SmsRepository(ref.watch(apiClientProvider)));

SmsRepository _repo(Ref ref) {
  ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
  return ref.watch(smsRepositoryProvider);
}

final smsStatusProvider = FutureProvider.autoDispose<SmsStatus>((ref) => _repo(ref).status());

final smsTemplatesProvider = FutureProvider.autoDispose<List<SmsTemplate>>((ref) => _repo(ref).templates());
