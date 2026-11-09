import '../../helpers/fake_http.dart';

/// SMS-ийн зохиомол өгөгдөл (жинхэнэ сурагчийн утас биш).
const smsStatusJson = {'configured': true, 'provider': 'TestNet', 'thisMonthCount': 12, 'thisMonthSegments': 30};

Map<String, Object?> smsMessageJson(String id, {String status = 'SENT', String phone = '99000001', String? error}) => {
  'id': id,
  'toPhone': phone,
  'body': 'Сайн байна уу',
  'status': status,
  'createdAt': '2026-11-09T02:00:00.000Z',
  'error': error,
  'segments': 1,
};

const smsTemplatesJson = [
  {'id': 't1', 'name': 'Төлбөр', 'body': 'Төлбөрөө төлнө үү', 'kind': 'PAYMENT_REMINDER'},
  {'id': 't2', 'name': 'Код', 'body': 'Таны код', 'kind': 'PASSWORD_RESET'},
];

const smsEstimateJson = {
  'recipientCount': 3,
  'deduplicatedCount': 2,
  'excludedArchivedCount': 0,
  'estimatedSegments': 4,
  'estimatedCost': 160,
};

/// Унших бүх замтай FakeHttp.
FakeHttp smsHttp() => FakeHttp()
  ..json('GET', '/sms/status', smsStatusJson)
  ..json('GET', '/sms/templates', smsTemplatesJson)
  ..json('GET', '/sms/messages', {
    'messages': [smsMessageJson('m1'), smsMessageJson('m2', status: 'FAILED', phone: '88000002', error: 'Холбогдсонгүй')],
    'total': 2,
  })
  ..json('POST', '/sms/bulk/estimate', smsEstimateJson)
  ..json('POST', '/sms/bulk', {'batchId': 'b1'})
  ..json('POST', '/sms/bulk/b1/start', {'batchId': 'b1', 'status': 'SENDING', 'queued': 2})
  ..json('POST', '/sms/send', {'messageId': 'm9', 'segments': 1})
  ..json('POST', '/sms/messages/m2/retry', {'status': 'SENT'})
  ..json('POST', '/sms/templates', {'id': 't3', 'name': 'n', 'body': 'b', 'kind': 'EXAM'});
