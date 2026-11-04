// Гадны багшийн ангийн бүлэг (вэбийн `/app/groups`, `components/groups/*`) — API-ийн хариуны загвар.
// Гэрээ: `api/src/teacher-groups/teacher-groups.service.ts`.

import '../../../core/format/person_name.dart';
import '../../../core/time/ub_time.dart';

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};

List<Object?> _list(Object? j) => j is List ? j : const <Object?>[];

String? _str(Object? v) => v is String && v.isNotEmpty ? v : null;

num _num(Object? v) => v is num ? v : 0;

UbDateTime? _when(Object? v) {
  final t = parseApiInstant(_str(v));
  return t == null ? null : UbDateTime.fromInstant(t);
}

/// `GET /teacher-groups/my-groups` — багшийн бүлэг (архивлаагүй).
class TeacherGroup {
  const TeacherGroup({
    required this.id,
    required this.name,
    required this.joinCode,
    this.memberCount = 0,
    this.createdAt,
  });

  factory TeacherGroup.fromJson(Map<String, Object?> j) => TeacherGroup(
    id: _str(j['id']) ?? '',
    name: _str(j['name']) ?? '',
    joinCode: _str(j['joinCode']) ?? '',
    memberCount: _num(j['memberCount']).toInt(),
    createdAt: _when(j['createdAt']),
  );

  final String id;
  final String name;

  /// Сурагчид энэ кодоор нэгдэнэ (6–8 тэмдэгт).
  final String joinCode;
  final int memberCount;
  final UbDateTime? createdAt;
}

/// Сурагчийн шалгалтын дүн (бүлэгт нэгдсэнээс хойш, сүүлийн 10).
class GroupResult {
  const GroupResult({
    required this.id,
    required this.testTitle,
    this.totalScore = 0,
    this.maxScore = 0,
    this.percentage,
    this.createdAt,
  });

  factory GroupResult.fromJson(Map<String, Object?> j) => GroupResult(
    id: _str(j['id']) ?? '',
    testTitle: _str(j['testTitle']) ?? 'Тест',
    totalScore: _num(j['totalScore']),
    maxScore: _num(j['maxScore']),
    percentage: j['percentage'] is num ? (j['percentage']! as num).toDouble() : null,
    createdAt: _when(j['createdAt']),
  );

  final String id;
  final String testTitle;
  final num totalScore;
  final num maxScore;
  final double? percentage;
  final UbDateTime? createdAt;

  /// «18/20, 90%».
  String get scoreText {
    String n(num v) => v == v.roundToDouble() ? v.round().toString() : v.toStringAsFixed(1);
    final pct = percentage == null ? '' : ', ${percentage!.round()}%';
    return '${n(totalScore)}/${n(maxScore)}$pct';
  }
}

/// Бүлгийн гишүүн.
class GroupMember {
  const GroupMember({
    required this.id,
    required this.studentId,
    this.firstName,
    this.lastName,
    this.joinedAt,
    this.results = const [],
  });

  factory GroupMember.fromJson(Map<String, Object?> j) {
    final s = _map(j['student']);
    return GroupMember(
      id: _str(j['id']) ?? '',
      studentId: _str(s['id']) ?? '',
      firstName: _str(s['firstName']),
      lastName: _str(s['lastName']),
      joinedAt: _when(j['joinedAt']),
      results: [for (final r in _list(j['testResults'])) GroupResult.fromJson(_map(r))],
    );
  }

  final String id;
  final String studentId;
  final String? firstName;
  final String? lastName;
  final UbDateTime? joinedAt;
  final List<GroupResult> results;

  String get name {
    final n = shortName(firstName, lastName);
    return n.isEmpty ? 'Сурагч' : n;
  }
}

/// `GET /teacher-groups/:id`.
class GroupDetails {
  const GroupDetails({
    required this.id,
    required this.name,
    required this.joinCode,
    this.ownerName = '',
    this.members = const [],
    this.createdAt,
  });

  factory GroupDetails.fromJson(Map<String, Object?> j) {
    final o = _map(j['owner']);
    return GroupDetails(
      id: _str(j['id']) ?? '',
      name: _str(j['name']) ?? '',
      joinCode: _str(j['joinCode']) ?? '',
      ownerName: shortName(_str(o['firstName']), _str(o['lastName'])),
      members: [for (final m in _list(j['members'])) GroupMember.fromJson(_map(m))],
      createdAt: _when(j['createdAt']),
    );
  }

  final String id;
  final String name;
  final String joinCode;
  final String ownerName;
  final List<GroupMember> members;
  final UbDateTime? createdAt;
}

/// Нэгдэх кодыг цэвэрлэнэ: зай хасаж, том үсгээр (API `Length(6, 8)`).
String normalizeJoinCode(String raw) => raw.replaceAll(RegExp(r'\s+'), '').toUpperCase();

/// Кодын шалгалт — алдаа бол монгол бичвэр, зөв бол null.
String? joinCodeError(String raw) {
  final code = normalizeJoinCode(raw);
  if (code.isEmpty) return 'Кодоо оруулна уу';
  if (code.length < 6 || code.length > 8) return 'Код 6–8 тэмдэгттэй';
  if (!RegExp(r'^[A-Z0-9]+$').hasMatch(code)) return 'Зөвхөн латин үсэг, тоо';
  return null;
}
