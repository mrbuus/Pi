import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';

// «Ажилласан цаг» хүснэгт (эзэн 2026-11-08) — API: `api/src/teacher-hours/work-sheet.controller.ts`,
// `work-sheet.service.ts`. Хуучин «Хуваариас тооцоолсон» (`/teacher-hours`, `/teacher-hours/me`) нь
// `teacher_repository.dart`-д хэвээр.
//
// Эрх СЕРВЕРТ: хүснэгт, данс — бүх ажилтан харна; нүд бөглөх — `teacher-hours.edit` (`viewer.canEdit`);
// данс засах — өөрийнхөө (хүн бүр), бусдынх (`teacher-hours.edit`, `canEdit`); цагийн хөлс — зөвхөн сервер
// зөвшөөрсөн нэг хүн (`viewer.seesPay`, бусдад 403). Апп зөвхөн товчийг нууна.

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

List<Object?> _list(Object? j) => j is List ? j : const <Object?>[];

String? _str(Object? v) => v is String && v.isNotEmpty ? v : null;

int _int(Object? v, [int fallback = 0]) => v is num ? v.toInt() : fallback;

int? _intOrNull(Object? v) => v is num ? v.toInt() : null;

/// Хагас сар: «2026-11-1» (1–15) эсвэл «2026-11-2» (16–сарын сүүл).
class HoursPeriod {
  const HoursPeriod({
    required this.id,
    required this.start,
    required this.end,
    required this.days,
    required this.prev,
    required this.current,
    this.next,
  });

  factory HoursPeriod.fromJson(Map<String, Object?> j) => HoursPeriod(
    id: _str(j['id']) ?? '',
    start: _str(j['start']) ?? '',
    end: _str(j['end']) ?? '',
    days: [for (final d in _list(j['days'])) ?_str(d)],
    prev: _str(j['prev']) ?? '',
    next: _str(j['next']),
    current: _str(j['current']) ?? '',
  );

  final String id;
  final String start;
  final String end;
  final List<String> days;
  final String prev;

  /// Одоогийн үеэс цааш шилжихгүй (null).
  final String? next;
  final String current;
}

/// Тухайн өдөр өдрийн хуваарьт (ахлах/туслах) орсон хичээл.
class StaffedDay {
  const StaffedDay({required this.minutes, required this.lessons});

  final int minutes;
  final int lessons;
}

/// Хүснэгтийн нэг мөр (багш).
class HoursSheetRow {
  const HoursSheetRow({
    required this.teacherId,
    required this.name,
    this.role,
    this.inRoster = false,
    this.archived = false,
    this.hasAccount = false,
    this.cells = const {},
    this.totalHundredths = 0,
    this.staffed = const {},
  });

  factory HoursSheetRow.fromJson(Map<String, Object?> j) => HoursSheetRow(
    teacherId: _str(j['teacherId']) ?? '',
    name: _str(j['name']) ?? '',
    role: _str(j['role']),
    inRoster: j['inRoster'] == true,
    archived: j['archived'] == true,
    hasAccount: j['hasAccount'] == true,
    cells: {
      for (final MapEntry(:key, :value) in _map(j['cells']).entries)
        if (value is num) key: value.toInt(),
    },
    totalHundredths: _int(j['totalHundredths']),
    staffed: {
      for (final MapEntry(:key, :value) in _map(j['staffed']).entries)
        key: StaffedDay(minutes: _int(_map(value)['minutes']), lessons: _int(_map(value)['lessons'])),
    },
  );

  final String teacherId;

  /// Сервер бэлдсэн нэр («Дуламсүрэн», ижил нэртэй бол «Б. Марал-Эрдэнэ», Багш+ бол «+»).
  final String name;
  final String? role;
  final bool inRoster;
  final bool archived;
  final bool hasAccount;

  /// Огноо → цагийг 100-аар үржүүлсэн.
  final Map<String, int> cells;
  final int totalHundredths;

  /// Огноо → тэр өдөр өдрийн хуваарьт орсон хичээл.
  final Map<String, StaffedDay> staffed;
}

/// `GET /teacher-hours/sheet?period=`.
class HoursSheet {
  const HoursSheet({
    required this.period,
    required this.today,
    required this.viewerId,
    this.canEdit = false,
    this.seesPay = false,
    this.rows = const [],
    this.totalHundredths = 0,
  });

  factory HoursSheet.fromJson(Map<String, Object?> j) {
    final viewer = _map(j['viewer']);
    return HoursSheet(
      period: HoursPeriod.fromJson(_map(j['period'])),
      today: _str(j['today']) ?? '',
      viewerId: _str(viewer['userId']) ?? '',
      canEdit: viewer['canEdit'] == true,
      seesPay: viewer['seesPay'] == true,
      rows: [for (final r in _list(j['rows'])) HoursSheetRow.fromJson(_map(r))],
      totalHundredths: _int(j['totalHundredths']),
    );
  }

  final HoursPeriod period;
  final String today;
  final String viewerId;

  /// Нүд бөглөх эрх (`teacher-hours.edit`).
  final bool canEdit;

  /// Хөлсний багана харах эсэх — хөлсний УТГА энд хэзээ ч ирэхгүй.
  final bool seesPay;
  final List<HoursSheetRow> rows;
  final int totalHundredths;
}

/// Нэг багшийн хөлс (`GET /teacher-hours/pay`).
class HoursPayRow {
  const HoursPayRow({required this.teacherId, this.ratePerHour, this.rateFrom, this.setThisPeriod = false});

  factory HoursPayRow.fromJson(Map<String, Object?> j) => HoursPayRow(
    teacherId: _str(j['teacherId']) ?? '',
    ratePerHour: _intOrNull(j['ratePerHour']),
    rateFrom: _str(j['rateFrom']),
    setThisPeriod: j['setThisPeriod'] == true,
  );

  final String teacherId;
  final int? ratePerHour;
  final String? rateFrom;

  /// Энэ үед тавьсан (false бол өмнөх үеэс өвлөгдсөн).
  final bool setThisPeriod;
}

class HoursPay {
  const HoursPay({required this.period, this.rows = const []});

  factory HoursPay.fromJson(Map<String, Object?> j) => HoursPay(
    period: _str(j['period']) ?? '',
    rows: [for (final r in _list(j['rows'])) HoursPayRow.fromJson(_map(r))],
  );

  final String period;
  final List<HoursPayRow> rows;

  HoursPayRow? of(String teacherId) {
    for (final r in rows) {
      if (r.teacherId == teacherId) return r;
    }
    return null;
  }
}

/// Цалингийн данс (`GET /teacher-hours/accounts/:teacherId`).
class TeacherAccount {
  const TeacherAccount({
    required this.teacherId,
    required this.fullName,
    this.canEdit = false,
    this.isSelf = false,
    this.bankName,
    this.accountNumber,
    this.holderName,
    this.updatedBy,
  });

  factory TeacherAccount.fromJson(Map<String, Object?> j) {
    final a = j['account'] is Map ? _map(j['account']) : null;
    return TeacherAccount(
      teacherId: _str(j['teacherId']) ?? '',
      fullName: _str(j['fullName']) ?? '',
      canEdit: j['canEdit'] == true,
      isSelf: j['isSelf'] == true,
      bankName: _str(a?['bankName']),
      accountNumber: _str(a?['accountNumber']),
      holderName: _str(a?['holderName']),
      updatedBy: _str(a?['updatedBy']),
    );
  }

  final String teacherId;
  final String fullName;

  /// Засах эрх (өөрийнх, эсвэл `teacher-hours.edit`).
  final bool canEdit;
  final bool isSelf;
  final String? bankName;
  final String? accountNumber;
  final String? holderName;
  final String? updatedBy;

  bool get hasAccount => accountNumber != null;
}

class TeacherHoursSheetRepository {
  const TeacherHoursSheetRepository(this._api);

  final ApiClient _api;

  /// [period] null бол одоогийн үе.
  Future<HoursSheet> sheet([String? period]) =>
      _api.get('/teacher-hours/sheet', query: {'period': ?period}, parse: (j) => HoursSheet.fromJson(_map(j)));

  /// Нэг нүд: «7,5» / «7.5» / «» (арилгах). Серверийн хадгалсан утгыг буцаана (null = хоосон).
  Future<int?> setCell({required String teacherId, required String date, required String value}) => _api.put(
    '/teacher-hours/sheet/cell',
    body: {'teacherId': teacherId, 'date': date, 'value': value},
    parse: (j) => _intOrNull(_map(j)['hundredths']),
  );

  Future<TeacherAccount> account(String teacherId) => _api.get(
    '/teacher-hours/accounts/${Uri.encodeComponent(teacherId)}',
    parse: (j) => TeacherAccount.fromJson(_map(j)),
  );

  Future<void> setAccount(
    String teacherId, {
    required String bankName,
    required String accountNumber,
    required String holderName,
  }) => _api.put<void>(
    '/teacher-hours/accounts/${Uri.encodeComponent(teacherId)}',
    body: {'bankName': bankName, 'accountNumber': accountNumber, 'holderName': holderName},
  );

  /// Зөвхөн `viewer.seesPay` хүнд (бусдад 403).
  Future<HoursPay> pay(String period) =>
      _api.get('/teacher-hours/pay', query: {'period': period}, parse: (j) => HoursPay.fromJson(_map(j)));

  /// Хөлсийг [period]-ээс эхлэн тавина; null = энэ үед тавьсныг цуцалж өмнөхийг өвлүүлэх (сервер зөөлөн).
  Future<void> setRate({required String teacherId, required String period, required int? ratePerHour}) =>
      _api.put<void>(
        '/teacher-hours/pay/rate',
        body: {'teacherId': teacherId, 'period': period, 'ratePerHour': ratePerHour},
      );
}

final teacherHoursSheetRepositoryProvider = Provider<TeacherHoursSheetRepository>(
  (ref) => TeacherHoursSheetRepository(ref.watch(apiClientProvider)),
);

TeacherHoursSheetRepository _repo(Ref ref) {
  ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
  return ref.watch(teacherHoursSheetRepositoryProvider);
}

/// Түлхүүр = үе (null = одоогийн).
final teacherHoursSheetProvider = FutureProvider.autoDispose.family<HoursSheet, String?>(
  (ref, period) => _repo(ref).sheet(period),
);

/// Түлхүүр = үе.
final teacherHoursPayProvider = FutureProvider.autoDispose.family<HoursPay, String>(
  (ref, period) => _repo(ref).pay(period),
);

/// Түлхүүр = багшийн id.
final teacherAccountProvider = FutureProvider.autoDispose.family<TeacherAccount, String>(
  (ref, id) => _repo(ref).account(id),
);

/// CSV-ийн түр хавтас (тестэд солино).
final teacherHoursTempDirProvider = Provider<Future<Directory> Function()>((ref) => getTemporaryDirectory);
