import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';

/// SMS-ийн загварууд (`api/src/notifications/sms.controller.ts`, вэбийн `components/sms/*`).

Map<String, Object?> asMap(Object? j) => j is Map ? j.cast<String, Object?>() : const {};

int _int(Object? v) => v is num ? v.toInt() : int.tryParse('$v') ?? 0;

String? _str(Object? v) => v is String && v.trim().isNotEmpty ? v : null;

/// `GET /sms/status`.
@immutable
class SmsStatus {
  const SmsStatus({
    required this.configured,
    this.provider,
    this.thisMonthCount = 0,
    this.thisMonthSegments = 0,
  });

  factory SmsStatus.fromJson(Map<String, Object?> j) => SmsStatus(
    configured: j['configured'] == true,
    provider: _str(j['provider']),
    thisMonthCount: _int(j['thisMonthCount']),
    thisMonthSegments: _int(j['thisMonthSegments']),
  );

  final bool configured;
  final String? provider;
  final int thisMonthCount;
  final int thisMonthSegments;
}

/// Мессежийн төлөв (`SmsStatus` enum серверт).
enum SmsMessageStatus {
  queued('QUEUED', 'Хүлээгдэж байна'),
  sent('SENT', 'Явсан'),
  failed('FAILED', 'Амжилтгүй'),
  cancelled('CANCELLED', 'Цуцалсан'),
  unknown('', 'Тодорхойгүй');

  const SmsMessageStatus(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static SmsMessageStatus fromApi(Object? v) =>
      values.firstWhere((s) => s.apiValue == v && s != unknown, orElse: () => unknown);
}

/// Мессежийн төрөл (`SmsKind`). Загвар үүсгэхэд «Нууц үг сэргээх» сонгогдохгүй (вэбтэй ижил).
enum SmsKind {
  manual('MANUAL', 'Гараар илгээх'),
  announcement('ANNOUNCEMENT', 'Мэдэгдэл'),
  paymentReminder('PAYMENT_REMINDER', 'Төлбөрийн сануулга'),
  attendance('ATTENDANCE', 'Ирц'),
  exam('EXAM', 'Шалгалт'),
  other('OTHER', 'Бусад'),
  passwordReset('PASSWORD_RESET', 'Нууц үг сэргээх');

  const SmsKind(this.apiValue, this.label);

  final String apiValue;
  final String label;

  static SmsKind? fromApi(Object? v) {
    for (final k in values) {
      if (k.apiValue == v) return k;
    }
    return null;
  }

  /// Загвар үүсгэх маягтын сонголт.
  static const creatable = [manual, announcement, paymentReminder, attendance, exam, other];
}

/// `GET /sms/messages` мөр.
@immutable
class SmsMessage {
  const SmsMessage({
    required this.id,
    required this.toPhone,
    required this.body,
    required this.status,
    this.createdAt,
    this.error,
    this.segments = 1,
  });

  factory SmsMessage.fromJson(Map<String, Object?> j) => SmsMessage(
    id: '${j['id'] ?? ''}',
    toPhone: '${j['toPhone'] ?? ''}',
    body: '${j['body'] ?? ''}',
    status: SmsMessageStatus.fromApi(j['status']),
    createdAt: parseApiInstant(j['createdAt'] as String?),
    error: _str(j['error']),
    segments: _int(j['segments']),
  );

  final String id;
  final String toPhone;
  final String body;
  final SmsMessageStatus status;
  final DateTime? createdAt;
  final String? error;
  final int segments;

  SmsMessage copyWith({SmsMessageStatus? status, String? error}) => SmsMessage(
    id: id,
    toPhone: toPhone,
    body: body,
    status: status ?? this.status,
    createdAt: createdAt,
    error: error,
    segments: segments,
  );
}

@immutable
class SmsMessagePage {
  const SmsMessagePage(this.messages, this.total);

  final List<SmsMessage> messages;
  final int total;
}

/// `GET /sms/templates` мөр.
@immutable
class SmsTemplate {
  const SmsTemplate({required this.id, required this.name, required this.body, this.kind, this.kindRaw = ''});

  factory SmsTemplate.fromJson(Map<String, Object?> j) => SmsTemplate(
    id: '${j['id'] ?? ''}',
    name: '${j['name'] ?? ''}',
    body: '${j['body'] ?? ''}',
    kind: SmsKind.fromApi(j['kind']),
    kindRaw: '${j['kind'] ?? ''}',
  );

  final String id;
  final String name;
  final String body;
  final SmsKind? kind;
  final String kindRaw;

  String get kindLabel => kind?.label ?? kindRaw;

  /// Нууц үг сэргээх кодын загварыг энд засахгүй (вэбтэй ижил).
  bool get locked => kind == SmsKind.passwordReset;
}

/// `POST /sms/bulk/estimate`.
@immutable
class SmsEstimate {
  const SmsEstimate({
    required this.recipientCount,
    required this.deduplicatedCount,
    this.excludedArchivedCount,
    required this.estimatedSegments,
    required this.estimatedCost,
  });

  factory SmsEstimate.fromJson(Map<String, Object?> j) => SmsEstimate(
    recipientCount: _int(j['recipientCount']),
    deduplicatedCount: _int(j['deduplicatedCount']),
    excludedArchivedCount: j['excludedArchivedCount'] == null ? null : _int(j['excludedArchivedCount']),
    estimatedSegments: _int(j['estimatedSegments']),
    estimatedCost: _int(j['estimatedCost']),
  );

  final int recipientCount;
  final int deduplicatedCount;
  final int? excludedArchivedCount;
  final int estimatedSegments;
  final int estimatedCost;

  /// Нэг дугаарт ногдох хэсэг.
  num? get segmentsPerRecipient => deduplicatedCount > 0 ? estimatedSegments / deduplicatedCount : null;
}

/// `POST /sms/bulk/:id/start`.
@immutable
class SmsBatchStarted {
  const SmsBatchStarted({required this.batchId, required this.status, required this.queued});

  factory SmsBatchStarted.fromJson(Map<String, Object?> j) =>
      SmsBatchStarted(batchId: '${j['batchId'] ?? ''}', status: '${j['status'] ?? ''}', queued: _int(j['queued']));

  final String batchId;
  final String status;
  final int queued;
}

/// Ангиас хүлээн авагч сонгох — `GET /classrooms` мөр.
@immutable
class SmsClassroom {
  const SmsClassroom({required this.id, required this.name});

  factory SmsClassroom.fromJson(Map<String, Object?> j) => SmsClassroom(id: '${j['id'] ?? ''}', name: '${j['name'] ?? ''}');

  final String id;
  final String name;
}

/// `GET /users?role=STUDENT` — зөвхөн хүлээн авагч бүрдүүлэхэд хэрэгтэй талбар.
@immutable
class SmsStudentContact {
  const SmsStudentContact({
    required this.id,
    this.classroomId,
    this.phone,
    this.fatherPhone,
    this.motherPhone,
  });

  factory SmsStudentContact.fromJson(Map<String, Object?> j) {
    final p = asMap(j['studentProfile']);
    final c = asMap(j['currentClassroom']);
    return SmsStudentContact(
      id: '${j['id'] ?? ''}',
      classroomId: _str(c['id']),
      phone: _str(j['phone']),
      fatherPhone: _str(p['fatherPhone']),
      motherPhone: _str(p['motherPhone']),
    );
  }

  final String id;
  final String? classroomId;
  final String? phone;
  final String? fatherPhone;
  final String? motherPhone;
}
