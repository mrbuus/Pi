import 'package:flutter/foundation.dart';

import '../../../core/auth/user_role.dart';
import '../../../core/format/person_name.dart';
import '../../../core/time/ub_time.dart';
import '../../../shared/payment_status/money.dart';

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const {};

String _str(Object? v) => v is String ? v : '';

int _int(Object? v) => v is num ? v.toInt() : 0;

List<String> _ids(Object? v) => v is List
    ? [
        for (final e in v)
          if (e is String && e.trim().isNotEmpty) e.trim(),
      ]
    : const [];

UbDateTime? _date(Object? v) {
  final i = parseApiInstant(v is String ? v : null);
  return i == null ? null : UbDateTime.fromInstant(i);
}

/// Эрхийн хамрах хүрээ (`Pass.scope`, серверийн `access.ts`): бүх агуулга эсвэл бүлэг, ном, тестийн ID.
@immutable
class PassScope {
  const PassScope({this.all = false, this.chapterIds = const [], this.bookIds = const [], this.testIds = const []});

  factory PassScope.fromJson(Object? json) {
    final m = _map(json);
    return PassScope(
      all: m['all'] == true,
      chapterIds: _ids(m['chapterIds']),
      bookIds: _ids(m['bookIds']),
      testIds: _ids(m['testIds']),
    );
  }

  /// Маягтын бичвэрээс (вэбийн `scopeFrom`): «Бүх агуулга» сонгосон бол ID-уудыг тоохгүй.
  factory PassScope.fromInput({required bool all, String chapterIds = '', String bookIds = '', String testIds = ''}) =>
      all
      ? const PassScope(all: true)
      : PassScope(chapterIds: parseIds(chapterIds), bookIds: parseIds(bookIds), testIds: parseIds(testIds));

  final bool all;
  final List<String> chapterIds;
  final List<String> bookIds;
  final List<String> testIds;

  /// Юу ч хамрахгүй (сервер хадгалах ч эрх юу ч нээхгүй) — маягт илгээхгүй.
  bool get isEmpty => !all && chapterIds.isEmpty && bookIds.isEmpty && testIds.isEmpty;

  /// Сервер рүү илгээх бүтэц — зөвхөн зөвшөөрөгдсөн түлхүүрүүд (`NoUnknownScopeKeys`).
  Map<String, Object?> toJson() => all
      ? const {'all': true}
      : {
          if (chapterIds.isNotEmpty) 'chapterIds': chapterIds,
          if (bookIds.isNotEmpty) 'bookIds': bookIds,
          if (testIds.isNotEmpty) 'testIds': testIds,
        };

  /// «Бүх агуулга», «2 бүлэг, 1 тест» (вэбийн `scopeSummary`).
  String get summary {
    if (all) return 'Бүх агуулга';
    final parts = [
      if (chapterIds.isNotEmpty) '${chapterIds.length} бүлэг',
      if (bookIds.isNotEmpty) '${bookIds.length} ном',
      if (testIds.isNotEmpty) '${testIds.length} тест',
    ];
    return parts.isEmpty ? 'Хамрах хүрээ тохируулаагүй' : parts.join(', ');
  }

  /// Таслал эсвэл шинэ мөрөөр тусгаарласан ID-ууд — хоосныг хасаж, давхардлыг арилгана, дараалал хэвээр.
  static List<String> parseIds(String text) {
    final seen = <String>{};
    return [
      for (final raw in text.split(RegExp(r'[\n,]')))
        if (raw.trim().isNotEmpty && seen.add(raw.trim())) raw.trim(),
    ];
  }
}

/// Эрхийн тодорхойлолт (`GET /passes` мөр).
@immutable
class PassDef {
  const PassDef({
    required this.id,
    required this.name,
    required this.durationDays,
    required this.scope,
    required this.active,
    this.price,
    this.holdersCount = 0,
  });

  factory PassDef.fromJson(Object? json) {
    final m = _map(json);
    final price = m['price'];
    return PassDef(
      id: _str(m['id']),
      name: _str(m['name']),
      durationDays: _int(m['durationDays']),
      scope: PassScope.fromJson(m['scope']),
      price: price is num ? price.toInt() : null,
      active: m['active'] == true,
      holdersCount: _int(m['holdersCount']),
    );
  }

  final String id;
  final String name;
  final int durationDays;
  final PassScope scope;

  /// Серверийн үнэ (төгрөг). `null` бол дурын дүн.
  final int? price;
  final bool active;

  /// Өмнө олгосон тоо (идэвхгүй болсныг оролцуулна).
  final int holdersCount;

  String get durationLabel => '$durationDays өдөр';

  String get priceLabel => price == null ? 'Дурын дүн' : formatMnt(price!);

  /// PATCH-ийн хариунд `holdersCount` байхгүй — хуучныг хадгална.
  PassDef withHolders(int count) => PassDef(
    id: id,
    name: name,
    durationDays: durationDays,
    scope: scope,
    price: price,
    active: active,
    holdersCount: count,
  );
}

/// Шинэ эрх, засварын утга.
@immutable
class PassDraft {
  const PassDraft({required this.name, required this.durationDays, required this.scope, this.price});

  final String name;
  final int durationDays;
  final int? price;
  final PassScope scope;

  /// Вэбтэй ижил: үнэ хоосон бол илгээхгүй (засварт хуучин үнэ хэвээр үлдэнэ).
  Map<String, Object?> toJson() => {
    'name': name.trim(),
    'durationDays': durationDays,
    'price': ?price,
    'scope': scope.toJson(),
  };
}

/// Эрх эзэмшигч (`GET /passes/:id/holders`).
@immutable
class PassHolder {
  const PassHolder({
    required this.id,
    required this.userId,
    required this.firstName,
    required this.lastName,
    required this.active,
    this.studentCode,
    this.startsAt,
    this.expiresAt,
  });

  factory PassHolder.fromJson(Object? json) {
    final m = _map(json);
    final u = _map(m['user']);
    final code = u['studentCode'];
    return PassHolder(
      id: _str(m['id']),
      userId: _str(u['id']),
      firstName: _str(u['firstName']),
      lastName: _str(u['lastName']),
      studentCode: code is String && code.isNotEmpty ? code : null,
      startsAt: _date(m['startsAt']),
      expiresAt: _date(m['expiresAt']),
      active: m['active'] == true,
    );
  }

  final String id;
  final String userId;
  final String firstName;
  final String lastName;
  final String? studentCode;
  final UbDateTime? startsAt;
  final UbDateTime? expiresAt;

  /// Серверийн тооцоо: эхэлсэн, дуусаагүй.
  final bool active;

  String get name => shortName(firstName, lastName);
}

/// `GET /users/search` мөр (сурагч).
@immutable
class PassStudentHit {
  const PassStudentHit({required this.id, required this.firstName, required this.lastName, this.studentCode});

  factory PassStudentHit.fromJson(Object? json) {
    final m = _map(json);
    final code = m['studentCode'];
    return PassStudentHit(
      id: _str(m['id']),
      firstName: _str(m['firstName']),
      lastName: _str(m['lastName']),
      studentCode: code is String && code.isNotEmpty ? code : null,
    );
  }

  final String id;
  final String firstName;
  final String lastName;
  final String? studentCode;

  String get name => shortName(firstName, lastName);
}

/// Эрхийн удирдлагын эрх — вэбийн `admin/passes/layout.tsx` (`RequireRole ADMIN`), сервер `GET /passes` ADMIN.
///
/// Сервер `grant`-ыг Багш+-д ч зөвшөөрдөг ч эрхийн жагсаалт (`/passes`) зөвхөн админд нээлттэй — вэбийн
/// адил энэ дэлгэц зөвхөн админд.
@immutable
class PassesAccess {
  const PassesAccess(this.role);

  final UserRole? role;

  bool get canView => role == UserRole.admin;

  /// Нэр, хугацаа, үнэ, хамрах хүрээ, идэвх (`PATCH /passes/:id`, ADMIN).
  bool get canEdit => role == UserRole.admin;

  /// Сурагчид олгох (`POST /passes/:id/grant`, ADMIN эсвэл Багш+ + `finance.manage`).
  bool get canGrant => role == UserRole.admin || role == UserRole.teacherPlus;
}
