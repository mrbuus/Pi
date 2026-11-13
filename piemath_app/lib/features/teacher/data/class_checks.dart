import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format/person_name.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';

// «Чек» (эзэн 2026-10-22) — ангийн нэртэй шалгах жагсаалт: «Номны мөнгө 25,000₮».
// `api/src/class-checks` — бүх багш (ADMIN/TEACHER_PLUS/TEACHER) өөрийн харах ангидаа.

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};
String _s(Object? v) => v is String ? v : '';
String _enc(String v) => Uri.encodeComponent(v);
List<T> _list<T>(Object? j, T Function(Map<String, Object?>) f) => [
  for (final e in (j as List?) ?? const [])
    if (e is Map) f(e.cast<String, Object?>()),
];

/// API-ийн `CHECK_AMOUNT_MAX` (100 сая ₮).
const checkAmountMax = 100000000;

/// API-ийн `CHECK_TITLE_MAX`.
const checkTitleMax = 80;

@immutable
class CheckPerson {
  const CheckPerson({required this.id, required this.firstName, required this.lastName, this.role});

  factory CheckPerson.fromJson(Map<String, Object?> j) => CheckPerson(
    id: _s(j['id']),
    firstName: _s(j['firstName']),
    lastName: _s(j['lastName']),
    role: j['role'] as String?,
  );

  static CheckPerson? maybe(Object? j) => j is Map ? CheckPerson.fromJson(_map(j)) : null;

  final String id;
  final String firstName;
  final String lastName;

  /// Ажилтан бол — Багш+ нэрийн ард «+».
  final String? role;

  String get staff => staffName(firstName: firstName, lastName: lastName, role: role);
}

/// Нэг сурагчийн тэмдэглэгээ. Номын чекийн нэмэлт талбартай (`skipped`, `collectedBy`, `amount`, `elsewhere`).
@immutable
class CheckMark {
  const CheckMark({
    required this.studentId,
    required this.checked,
    this.updatedAt,
    this.updatedBy,
    this.skipped = false,
    this.collectedBy,
    this.amount,
    this.note,
    this.elsewhere,
  });

  factory CheckMark.fromJson(Map<String, Object?> j) {
    final e = j['elsewhere'];
    return CheckMark(
      studentId: _s(j['studentId']),
      checked: j['checked'] == true,
      updatedAt: j['updatedAt'] as String?,
      updatedBy: CheckPerson.maybe(j['updatedBy']),
      skipped: j['skipped'] == true,
      collectedBy: CheckPerson.maybe(j['collectedBy']),
      amount: (j['amount'] as num?)?.toInt(),
      note: j['note'] as String?,
      elsewhere: e is Map ? (name: e['name'] as String?) : null,
    );
  }

  final String studentId;
  final bool checked;
  final String? updatedAt;
  final CheckPerson? updatedBy;

  /// Номын чек: «Авахгүй».
  final bool skipped;
  final CheckPerson? collectedBy;
  final int? amount;
  final String? note;

  /// Өөр ангид байхдаа төлсөн — энэ ангийн мөнгөнд орохгүй, эндээс засахгүй.
  final ({String? name})? elsewhere;
}

@immutable
class ClassCheck {
  const ClassCheck({
    required this.id,
    required this.title,
    this.amount,
    this.bookKey,
    this.createdAt = '',
    this.createdBy,
    this.archivedAt,
    this.archivedBy,
    this.marks = const [],
  });

  factory ClassCheck.fromJson(Map<String, Object?> j) => ClassCheck(
    id: _s(j['id']),
    title: _s(j['title']),
    amount: (j['amount'] as num?)?.toInt(),
    bookKey: j['bookKey'] as String?,
    createdAt: _s(j['createdAt']),
    createdBy: CheckPerson.maybe(j['createdBy']),
    archivedAt: j['archivedAt'] as String?,
    archivedBy: CheckPerson.maybe(j['archivedBy']),
    marks: _list(j['marks'], CheckMark.fromJson),
  );

  final String id;
  final String title;
  final int? amount;

  /// Номын чек бол номын түлхүүр (E2 …), энгийн чек бол null.
  final String? bookKey;
  final String createdAt;
  final CheckPerson? createdBy;
  final String? archivedAt;
  final CheckPerson? archivedBy;
  final List<CheckMark> marks;

  bool get isBook => bookKey != null;
  bool get archived => archivedAt != null;

  CheckMark? markOf(String studentId) => marks.where((m) => m.studentId == studentId).firstOrNull;

  /// [studentId]-ийн тэмдэглэгээг солино (null = хасна).
  ClassCheck withMark(String studentId, CheckMark? mark) => ClassCheck(
    id: id,
    title: title,
    amount: amount,
    bookKey: bookKey,
    createdAt: createdAt,
    createdBy: createdBy,
    archivedAt: archivedAt,
    archivedBy: archivedBy,
    marks: [...marks.where((m) => m.studentId != studentId), ?mark],
  );
}

@immutable
class ClassChecksData {
  const ClassChecksData({
    this.students = const [],
    this.former = const [],
    this.checks = const [],
    this.archived = const [],
  });

  factory ClassChecksData.fromJson(Object? json) {
    final j = _map(json);
    return ClassChecksData(
      students: _list(j['students'], CheckPerson.fromJson),
      former: _list(j['former'], CheckPerson.fromJson),
      checks: _list(j['checks'], ClassCheck.fromJson),
      archived: _list(j['archived'], ClassCheck.fromJson),
    );
  }

  /// Одоогийн сурагчид (нэрээр).
  final List<CheckPerson> students;

  /// Ангиас гарсан ч аль нэг чект тэмдэглэгдсэн сурагчид.
  final List<CheckPerson> former;
  final List<ClassCheck> checks;
  final List<ClassCheck> archived;

  ClassChecksData copyWith({List<ClassCheck>? checks, List<ClassCheck>? archived}) => ClassChecksData(
    students: students,
    former: former,
    checks: checks ?? this.checks,
    archived: archived ?? this.archived,
  );
}

/// Сурагчийн товч мэдээлэл (нэр дарахад) — төлбөргүй, Багш ч харна.
@immutable
class CheckContact {
  const CheckContact({required this.kind, required this.phone, this.name, this.appLinked = false});

  factory CheckContact.fromJson(Map<String, Object?> j) => CheckContact(
    kind: _s(j['kind']),
    phone: _s(j['phone']),
    name: j['name'] as String?,
    appLinked: j['appLinked'] == true,
  );

  /// `student` / `father` / `mother` / `parent`.
  final String kind;
  final String phone;
  final String? name;
  final bool appLinked;

  String get label => switch (kind) {
    'student' => 'Сурагч',
    'father' => 'Аав',
    'mother' => 'Ээж',
    _ => 'Эцэг эх',
  };

  /// «Аавын дугаар» гэх мэт (хуулах товчны шошго).
  String get ofLabel => switch (kind) {
    'student' => 'Сурагчийн',
    'father' => 'Аавын',
    'mother' => 'Ээжийн',
    _ => 'Эцэг эхийн',
  };

  /// `tel:` холбоост зөвхөн цифр ба «+».
  String get telHref => 'tel:${phone.replaceAll(RegExp(r'[^\d+]'), '')}';
}

@immutable
class CheckStudentInfo {
  const CheckStudentInfo({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.studentCode,
    this.classroomName = '',
    this.inClass = true,
    this.guardianNote,
    this.contacts = const [],
  });

  factory CheckStudentInfo.fromJson(Object? json) {
    final j = _map(json);
    return CheckStudentInfo(
      id: _s(j['id']),
      firstName: _s(j['firstName']),
      lastName: _s(j['lastName']),
      studentCode: j['studentCode'] as String?,
      classroomName: _s(j['classroomName']),
      inClass: j['inClass'] != false,
      guardianNote: j['guardianNote'] as String?,
      contacts: _list(j['contacts'], CheckContact.fromJson),
    );
  }

  final String id;
  final String firstName;
  final String lastName;
  final String? studentCode;
  final String classroomName;
  final bool inClass;
  final String? guardianNote;
  final List<CheckContact> contacts;
}

/// Номын чекийн төрлүүд (API-ийн `BOOKS` + хариултын хуудас) — нэрийг сервер өөрөө тавина.
const checkBookKinds = [
  (key: 'E1', title: 'E-1'),
  (key: 'E2', title: 'E-2'),
  (key: 'E3', title: 'E-3'),
  (key: 'HAVTGAI1', title: 'Хавтгай-1'),
  (key: 'HAVTGAI2', title: 'Хавтгай-2'),
  (key: 'OGTORGUI', title: 'Огторгуй'),
  (key: 'PITEST', title: 'Pi test'),
  (key: 'SHEET', title: 'Нэгдсэн шалгалт'),
  (key: 'CSHEET', title: 'Ангийн шалгалт'),
];

/// Хариултын хуудасны төрөл (үнийн жишээ бага).
bool isSheetKind(String key) => key == 'SHEET' || key == 'CSHEET';

class ClassChecksRepository {
  const ClassChecksRepository(this._api);

  final ApiClient _api;

  String _base(String classId) => '/classrooms/${_enc(classId)}/checks';

  Future<ClassChecksData> list(String classId) =>
      _api.get(_base(classId), parse: ClassChecksData.fromJson, cache: false);

  Future<CheckStudentInfo> studentInfo(String classId, String studentId) =>
      _api.get('${_base(classId)}/students/${_enc(studentId)}', parse: CheckStudentInfo.fromJson);

  /// Шинэ чек: энгийн ([title]) эсвэл номын ([bookKey], үнэ заавал).
  Future<ClassCheck> create(String classId, {String? title, int? amount, String? bookKey}) => _api.post(
    _base(classId),
    body: bookKey != null ? {'bookKey': bookKey, 'amount': amount} : {'title': title, 'amount': amount},
    parse: (j) => ClassCheck.fromJson(_map(j)),
  );

  /// Нэр/дүн засах, нуух (`archived: true`), буцааж гаргах (`archived: false`).
  Future<ClassCheck> update(String classId, String checkId, Map<String, Object?> body) =>
      _api.patch('${_base(classId)}/${_enc(checkId)}', body: body, parse: (j) => ClassCheck.fromJson(_map(j)));

  /// Устгах — сервер дээр зөөлөн (deletedAt).
  Future<void> remove(String classId, String checkId) => _api.delete<Object?>('${_base(classId)}/${_enc(checkId)}');

  /// Нэг сурагчийн тэмдэглэгээ — toggle биш, тодорхой утга.
  Future<CheckMark> setMark(String classId, String checkId, String studentId, Map<String, Object?> body) => _api.put(
    '${_base(classId)}/${_enc(checkId)}/students/${_enc(studentId)}',
    body: body,
    parse: (j) => CheckMark.fromJson(_map(j)),
  );
}

final classChecksRepositoryProvider = Provider<ClassChecksRepository>(
  (ref) => ClassChecksRepository(ref.watch(apiClientProvider)),
);

/// Чекийн тоо ба цугларсан мөнгө (вэбийн `summary`). N/M одоогийн сурагчаар; гарсан ч тэмдэглэгдсэний
/// мөнгө орно. Номын чек: «авахгүй» хүүхэд M-д орохгүй; өөр ангид төлсөн нь N-д орно, мөнгө нь энд биш.
@immutable
class CheckSummary {
  const CheckSummary({
    required this.done,
    required this.total,
    required this.former,
    required this.skipped,
    required this.collected,
  });

  final int done;
  final int total;
  final int former;
  final int skipped;

  /// null = дүнгүй чек.
  final int? collected;

  int get left => total - done;
}

CheckSummary checkSummary(ClassCheck c, Set<String> rosterIds) {
  var done = 0;
  var former = 0;
  var skipped = 0;
  var bookSum = 0;
  for (final m in c.marks) {
    final inRoster = rosterIds.contains(m.studentId);
    if (m.skipped) {
      if (inRoster) skipped++;
      continue;
    }
    if (!m.checked) continue;
    if (inRoster) {
      done++;
    } else {
      former++;
    }
    if (m.elsewhere == null) bookSum += m.amount ?? 0;
  }
  final collected = c.isBook ? bookSum : (c.amount == null ? null : (done + former) * c.amount!);
  return CheckSummary(
    done: done,
    total: rosterIds.length - skipped,
    former: former,
    skipped: skipped,
    collected: collected,
  );
}
