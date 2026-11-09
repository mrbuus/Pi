import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../../core/auth/user_role.dart';
import '../data/sms_models.dart';

/// SMS-ийн эрх — сервер (`sms.controller.ts`), вэб (`nav-data.ts`, `getRole() === "ADMIN"`)-тэй ИЖИЛ.
///
/// | Үйлдэл | Админ | Багш+ | Бусад |
/// |---|---|---|---|
/// | Төлөв, түүх, загвар харах | тийм | тийм | үгүй |
/// | Илгээх (нэг, бөөн), дахин илгээх, загвар нэмэх, засах | тийм | үгүй | үгүй |
class SmsAccess {
  const SmsAccess(this.role);

  final UserRole? role;

  bool get canView => role == UserRole.admin || role == UserRole.teacherPlus;

  /// Мөнгө зарцуулах, буцаах боломжгүй үйлдэл.
  bool get canSend => role == UserRole.admin;

  bool get canManageTemplates => role == UserRole.admin;

  bool get canRetry => role == UserRole.admin;
}

/// SMS-ийн кодчлол, хэсгийн тоо (вэбийн `components/sms/segments.ts`, серверийн `sms-segments.ts`).
@immutable
class SmsSegmentPreview {
  const SmsSegmentPreview({required this.gsm, required this.units, required this.segments});

  /// GSM-7 (латин) эсвэл UCS-2 (кирилл — 2 дахин үнэтэй).
  final bool gsm;
  final int units;
  final int segments;

  String get encoding => gsm ? 'GSM-7' : 'UCS-2';

  int get singleLimit => gsm ? 160 : 70;

  /// Олон хэсэгтэй үед нэг хэсэгт багтах нэгж.
  int get multipartLimit => gsm ? 153 : 67;
}

const _gsmBasic =
    '@£\$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡'
    'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const _gsmExtended = '^{}\\[~]|€';

final _gsmBasicSet = _gsmBasic.runes.toSet();
final _gsmExtendedSet = _gsmExtended.runes.toSet();

SmsSegmentPreview previewSmsSegments(String text) {
  final runes = text.runes.toList();
  final gsm = runes.every((r) => _gsmBasicSet.contains(r) || _gsmExtendedSet.contains(r));
  if (!gsm) {
    // UCS-2: UTF-16 нэгж (Dart `length` мөн UTF-16).
    final units = text.length;
    return SmsSegmentPreview(gsm: false, units: units, segments: units == 0 ? 0 : (units <= 70 ? 1 : (units / 67).ceil()));
  }
  final units = runes.fold<int>(0, (s, r) => s + (_gsmExtendedSet.contains(r) ? 2 : 1));
  return SmsSegmentPreview(gsm: true, units: units, segments: units == 0 ? 0 : (units <= 160 ? 1 : (units / 153).ceil()));
}

/// Хүлээн авагчийн бичвэрийг дугаар болгоно: зай, таслал, цэгтэй таслал, мөрөөр тусгаарлана (вэбтэй ижил).
/// Давхардлыг энд хасахгүй — сервер тооцоонд хасна, оруулсан тоог хэвээр харуулна.
List<String> parsePhones(String raw) =>
    raw.split(RegExp(r'[\s,;]+')).map((p) => p.trim()).where((p) => p.isNotEmpty).toList();

/// Тооцоо одоогийн дугаар, бичвэрт хамаарах эсэхийг шалгах түлхүүр (вэбийн `JSON.stringify(body)`).
String smsRequestKey(List<String> phones, String text) => jsonEncode({'phones': phones, 'text': text});

/// Ангиас хүлээн авагч бүрдүүлэх сонголт.
enum SmsAudience {
  student('Сурагчийн утас'),
  father('Аавын утас'),
  mother('Ээжийн утас');

  const SmsAudience(this.label);

  final String label;
}

/// Тухайн ангийн сурагчдаас сонгосон утаснууд — давхардалгүй, дарааллаа хадгална.
List<String> classPhones(List<SmsStudentContact> students, String classroomId, Set<SmsAudience> audience) {
  final out = <String>[];
  final seen = <String>{};
  void add(String? p) {
    final v = p?.replaceAll(RegExp(r'\s+'), '');
    if (v == null || v.isEmpty || !seen.add(v)) return;
    out.add(v);
  }

  for (final s in students.where((s) => s.classroomId == classroomId)) {
    if (audience.contains(SmsAudience.student)) add(s.phone);
    if (audience.contains(SmsAudience.father)) add(s.fatherPhone);
    if (audience.contains(SmsAudience.mother)) add(s.motherPhone);
  }
  return out;
}

/// Өмнөх бичвэрт шинэ дугааруудыг нэмнэ (аль хэдийн байгааг давтахгүй).
String appendPhones(String raw, List<String> phones) {
  final existing = parsePhones(raw);
  final have = existing.toSet();
  final added = [for (final p in phones) if (have.add(p)) p];
  return [...existing, ...added].join(', ');
}

/// Нууц үг сэргээх бодит кодыг загварт хадгалахгүй (вэбийн шалгалт).
String? templateBodyError(String body) {
  if (RegExp(r'нууц\s*үг.{0,24}(код|code)\s*[:=]\s*\d{4,}', caseSensitive: false, unicode: true).hasMatch(body)) {
    return 'Нууц үг сэргээх бодит кодыг загварт хадгалах боломжгүй';
  }
  return null;
}
