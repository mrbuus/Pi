import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/format/person_name.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/time/ub_time.dart';
import '../../learning/data/json.dart';

export '../../learning/data/json.dart' show Json, asMap, asStr;

const roleLabels = {
  'ADMIN': 'Админ',
  'TEACHER_PLUS': 'Багш+',
  'TEACHER': 'Багш',
  'STUDENT': 'Сурагч',
  'PARENT': 'Эцэг эх',
  'BUYER': 'Худалдан авагч',
};

String roleLabel(String r) => roleLabels[r] ?? r;

// ---------------- Аудит (`GET /audit`) ----------------

@immutable
class AuditRow {
  const AuditRow({
    required this.id,
    required this.actorId,
    required this.actorRole,
    required this.action,
    required this.entity,
    required this.entityId,
    this.before,
    this.after,
    this.reason,
    this.at,
  });

  factory AuditRow.fromJson(Object? raw) {
    final j = asMap(raw);
    return AuditRow(
      id: asStr(j['id']) ?? '',
      actorId: asStr(j['actorId']) ?? '',
      actorRole: asStr(j['actorRole']) ?? '',
      action: asStr(j['action']) ?? '',
      entity: asStr(j['entity']) ?? '',
      entityId: asStr(j['entityId']) ?? '',
      before: j['before'] is Map ? asMap(j['before']) : null,
      after: j['after'] is Map ? asMap(j['after']) : null,
      reason: asStr(j['reason']),
      at: parseApiInstant(asStr(j['at'])),
    );
  }

  final String id;
  final String actorId;
  final String actorRole;
  final String action;
  final String entity;
  final String entityId;
  final Json? before;
  final Json? after;
  final String? reason;
  final DateTime? at;

  /// Мөнгөтэй холбоотой бичлэг (вэбийн `MONEY_ENTITY`).
  bool get isMoney => RegExp('payment', caseSensitive: false).hasMatch(entity);
  bool get isGrade => RegExp('testresult|attempt', caseSensitive: false).hasMatch(entity);

  /// Өөрчлөгдсөн талбарууд: (талбар, өмнө, дараа).
  List<({String key, Object? before, Object? after})> get diff {
    final keys = {...?before?.keys, ...?after?.keys};
    return [
      for (final k in keys)
        if ('${before?[k]}' != '${after?[k]}') (key: k, before: before?[k], after: after?[k]),
    ];
  }
}

const auditEntities = [
  'Payment',
  'StudentProfile',
  'TestResult',
  'UserPass',
  'Classroom',
  'Problem',
  'Test',
  'Pass',
  'User',
  'Enrollment',
  'Attendance',
];
const auditActions = ['CREATE', 'UPDATE', 'CONFIRM', 'REJECT', 'REVERSE', 'REVOKE', 'DELETE', 'ARCHIVE', 'GRANT'];

const _auditActionLabel = {
  'CREATE': 'Үүсгэсэн',
  'UPDATE': 'Зассан',
  'CONFIRM': 'Баталсан',
  'REJECT': 'Татгалзсан',
  'REVERSE': 'Буцаасан',
  'REVOKE': 'Цуцалсан',
  'DELETE': 'Устгасан',
  'ARCHIVE': 'Архивласан',
  'GRANT': 'Олгосон',
};

String auditActionLabel(String a) => _auditActionLabel[a] ?? a;

const _fieldLabels = {
  'amount': 'Дүн',
  'method': 'Арга',
  'status': 'Төлөв',
  'paidAt': 'Төлсөн огноо',
  'forMonth': 'Аль сар',
  'description': 'Тайлбар',
  'grade': 'Анги',
  'score': 'Оноо',
  'reason': 'Шалтгаан',
  'tuitionAmount': 'Сургалтын төлбөр',
  'tuitionPlan': 'Төлбөрийн багц',
  'firstName': 'Нэр',
  'lastName': 'Овог',
  'phone': 'Утас',
  'role': 'Эрх (role)',
  'archived': 'Архивласан',
  'title': 'Гарчиг',
  'name': 'Нэр',
};

String auditFieldLabel(String k) => _fieldLabels[k] ?? k;

@immutable
class AuditPage {
  const AuditPage({required this.items, required this.total, required this.page, required this.pageSize});

  factory AuditPage.fromJson(Object? raw) {
    final j = asMap(raw);
    return AuditPage(
      items: [for (final e in asList(j['items'])) AuditRow.fromJson(e)],
      total: asInt(j['total']) ?? 0,
      page: asInt(j['page']) ?? 1,
      pageSize: asInt(j['pageSize']) ?? 30,
    );
  }

  final List<AuditRow> items;
  final int total;
  final int page;
  final int pageSize;
}

@immutable
class StaffName {
  const StaffName(this.id, this.name);
  final String id;
  final String name;
}

// ---------------- Бүртгэл устгах хүсэлт ----------------

enum DeletionStatus {
  pending('PENDING', 'Шинэ'),
  inReview('IN_REVIEW', 'Хянаж байна'),
  resolved('RESOLVED', 'Шийдвэрлэсэн'),
  rejected('REJECTED', 'Татгалзсан');

  const DeletionStatus(this.api, this.label);
  final String api;
  final String label;

  static DeletionStatus parse(String? v) => values.firstWhere((s) => s.api == v, orElse: () => pending);
}

@immutable
class DeletionRequest {
  const DeletionRequest({
    required this.id,
    required this.status,
    required this.userName,
    required this.userRole,
    this.phone,
    this.reason,
    this.createdAt,
    this.reviewNote,
    this.archived = false,
  });

  factory DeletionRequest.fromJson(Object? raw) {
    final j = asMap(raw);
    final u = asMap(j['user']);
    return DeletionRequest(
      id: asStr(j['id']) ?? '',
      status: DeletionStatus.parse(asStr(j['status'])),
      userName: '${asStr(u['lastName']) ?? ''} ${asStr(u['firstName']) ?? ''}'.trim(),
      userRole: asStr(u['role']) ?? '',
      phone: asStr(u['phone']),
      reason: asStr(j['reason']),
      createdAt: parseApiInstant(asStr(j['createdAt'])),
      reviewNote: asStr(j['reviewNote']),
      archived: asStr(u['archivedAt']) != null,
    );
  }

  final String id;
  final DeletionStatus status;
  final String userName;
  final String userRole;
  final String? phone;
  final String? reason;
  final DateTime? createdAt;
  final String? reviewNote;
  final bool archived;
}

// ---------------- Аналитик (`/analytics/*`) ----------------

@immutable
class AnalyticsOverview {
  const AnalyticsOverview({
    this.dau = 0,
    this.wau = 0,
    this.mau = 0,
    this.avgSessionMs = 0,
    this.activeStudents = 0,
    this.problemsAttempted = 0,
    this.lowConfidence = false,
  });

  factory AnalyticsOverview.fromJson(Object? raw) {
    final j = asMap(raw);
    return AnalyticsOverview(
      dau: asInt(j['dau']) ?? 0,
      wau: asInt(j['wau']) ?? 0,
      mau: asInt(j['mau']) ?? 0,
      avgSessionMs: asInt(j['avgSessionMs']) ?? 0,
      activeStudents: asInt(j['totalActiveStudents']) ?? 0,
      problemsAttempted: asInt(j['totalProblemsAttempted']) ?? 0,
      lowConfidence: asBool(j['lowConfidence']),
    );
  }

  final int dau;
  final int wau;
  final int mau;
  final int avgSessionMs;
  final int activeStudents;
  final int problemsAttempted;
  final bool lowConfidence;
}

@immutable
class ClassroomActivity {
  const ClassroomActivity({
    required this.name,
    this.enrolled = 0,
    this.active = 0,
    this.participation = 0,
    this.avgProblems = 0,
  });

  factory ClassroomActivity.fromJson(Object? raw) {
    final j = asMap(raw);
    return ClassroomActivity(
      name: asStr(j['classroomName']) ?? '',
      enrolled: asInt(j['enrolled']) ?? 0,
      active: asInt(j['active']) ?? 0,
      participation: asNum(j['participationRate']) ?? 0,
      avgProblems: asNum(j['avgProblemsPerActiveStudent']) ?? 0,
    );
  }

  final String name;
  final int enrolled;
  final int active;
  final double participation;
  final double avgProblems;
}

@immutable
class TopicActivity {
  const TopicActivity({required this.title, this.book, this.attempts = 0, this.success = 0, this.lowSample = false});

  factory TopicActivity.fromJson(Object? raw) {
    final j = asMap(raw);
    return TopicActivity(
      title: asStr(j['chapterTitle']) ?? '',
      book: asStr(j['bookTitle']),
      attempts: asInt(j['totalAttempts']) ?? 0,
      success: asNum(j['successRate']) ?? 0,
      lowSample: asBool(j['lowSample']),
    );
  }

  final String title;
  final String? book;
  final int attempts;
  final double success;
  final bool lowSample;
}

@immutable
class AtRiskStudent {
  const AtRiskStudent({
    required this.studentId,
    required this.name,
    required this.classroomName,
    this.lastActiveAt,
    this.recent,
    this.prior,
    this.reasons = const [],
  });

  factory AtRiskStudent.fromJson(Object? raw) {
    final j = asMap(raw);
    return AtRiskStudent(
      studentId: asStr(j['studentId']) ?? '',
      name: asStr(j['name']) ?? '',
      classroomName: asStr(j['classroomName']) ?? '',
      lastActiveAt: parseApiInstant(asStr(j['lastActiveAt'])),
      recent: asNum(j['recentSuccessRate']),
      prior: asNum(j['priorSuccessRate']),
      reasons: [for (final r in asList(j['reasons'])) ?asStr(r)],
    );
  }

  final String studentId;
  final String name;
  final String classroomName;
  final DateTime? lastActiveAt;
  final double? recent;
  final double? prior;
  final List<String> reasons;
}

String pct(double v) => '${(v * 100).round()}%';

// ---------------- Хэрэглээ (`/usage/summary`) ----------------

@immutable
class RoleUsage {
  const RoleUsage({
    required this.role,
    this.users = 0,
    this.events = 0,
    this.devices = const {},
    this.pages = const [],
    this.clicks = const [],
  });

  factory RoleUsage.fromJson(Object? raw) {
    final j = asMap(raw);
    return RoleUsage(
      role: asStr(j['role']) ?? '',
      users: asInt(j['users']) ?? 0,
      events: asInt(j['events']) ?? 0,
      devices: {for (final e in asMap(j['devices']).entries) e.key: asInt(e.value) ?? 0},
      pages: [
        for (final p in asList(j['pages']))
          (
            path: asStr(asMap(p)['path']) ?? '',
            views: asInt(asMap(p)['views']) ?? 0,
            users: asInt(asMap(p)['users']) ?? 0,
          ),
      ],
      clicks: [
        for (final p in asList(j['clicks']))
          (
            target: asStr(asMap(p)['target']) ?? '',
            path: asStr(asMap(p)['path']) ?? '',
            clicks: asInt(asMap(p)['clicks']) ?? 0,
          ),
      ],
    );
  }

  final String role;
  final int users;
  final int events;
  final Map<String, int> devices;
  final List<({String path, int views, int users})> pages;
  final List<({String target, String path, int clicks})> clicks;
}

// ---------------- Repository ----------------

class OversightRepository {
  const OversightRepository(this._api);

  final ApiClient _api;

  Future<AuditPage> audit({String? entity, String? action, String? actorId, int page = 1, int pageSize = 30}) =>
      _api.get(
        '/audit',
        query: {'entity': ?entity, 'action': ?action, 'actorId': ?actorId, 'page': '$page', 'pageSize': '$pageSize'},
        parse: AuditPage.fromJson,
      );

  Future<List<StaffName>> staff() => _api.get(
    '/users',
    parse: (j) => [
      for (final e in asList(j))
        if (const ['ADMIN', 'TEACHER_PLUS', 'TEACHER'].contains(asStr(asMap(e)['role'])))
          StaffName(
            asStr(asMap(e)['id']) ?? '',
            staffName(
              firstName: asStr(asMap(e)['firstName']),
              lastName: asStr(asMap(e)['lastName']),
              role: asStr(asMap(e)['role']),
            ),
          ),
    ],
  );

  Future<List<DeletionRequest>> deletionRequests({String? status}) => _api.get(
    '/admin/deletion-requests',
    query: {'status': ?status},
    parse: (j) => [for (final e in asList(j)) DeletionRequest.fromJson(e)],
  );

  /// Төлөв солих (хянах, зөвшөөрөх, татгалзах). Сервер өгөгдөл устгахгүй — зөвхөн хүсэлтийн төлөв.
  Future<void> reviewDeletion(String id, DeletionStatus status, String? note) => _api.patch<Object?>(
    '/admin/deletion-requests/${Uri.encodeComponent(id)}',
    body: {'status': status.api, if (note != null && note.isNotEmpty) 'note': note},
  );

  Map<String, Object?> _range(UbDateTime from, UbDateTime to) => {'from': from.dateKey, 'to': to.dateKey};

  Future<AnalyticsOverview> overview(UbDateTime from, UbDateTime to) =>
      _api.get('/analytics/overview', query: _range(from, to), parse: AnalyticsOverview.fromJson);

  Future<List<ClassroomActivity>> classrooms(UbDateTime from, UbDateTime to) => _api.get(
    '/analytics/classrooms',
    query: _range(from, to),
    parse: (j) => [for (final e in asList(asMap(j)['classrooms'])) ClassroomActivity.fromJson(e)],
  );

  Future<List<TopicActivity>> topics(UbDateTime from, UbDateTime to) => _api.get(
    '/analytics/topics',
    query: _range(from, to),
    parse: (j) => [for (final e in asList(asMap(j)['topics'])) TopicActivity.fromJson(e)],
  );

  Future<List<AtRiskStudent>> atRisk(int days) => _api.get(
    '/analytics/at-risk',
    query: {'days': '$days'},
    parse: (j) => [for (final e in asList(asMap(j)['students'])) AtRiskStudent.fromJson(e)],
  );

  Future<List<RoleUsage>> usage(int days) => _api.get(
    '/usage/summary',
    query: {'days': '$days'},
    parse: (j) => [for (final e in asList(asMap(j)['roles'])) RoleUsage.fromJson(e)],
  );
}

final oversightRepositoryProvider = Provider<OversightRepository>(
  (ref) => OversightRepository(ref.watch(apiClientProvider)),
);

final oversightRoleProvider = Provider<UserRole?>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedIn ? s.role : null;
});

/// «Өнөөдөр» (UB) — аналитикийн хугацаа. Тестэд тогтмол.
final oversightTodayProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

final auditStaffProvider = FutureProvider.autoDispose<List<StaffName>>(
  (ref) => ref.watch(oversightRepositoryProvider).staff(),
);
