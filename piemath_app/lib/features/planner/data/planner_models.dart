import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';

/// Ажилтны төлөвлөгчийн загварууд — API `StaffTask` (`api/src/tasks/tasks.service.ts` TASK_INCLUDE),
/// вэбийн `web/src/components/planner/types.ts`-тэй ижил талбартай.

/// Даалгаврын төлөв (API `TaskStatus`).
enum TaskStatus {
  planned('PLANNED'),
  inProgress('IN_PROGRESS'),
  blocked('BLOCKED'),
  done('DONE'),
  cancelled('CANCELLED');

  const TaskStatus(this.api);

  final String api;

  /// Хаагдсан (дууссан эсвэл цуцалсан) — «Дууссан» бүлэгт орно.
  bool get isClosed => this == done || this == cancelled;

  static TaskStatus fromApi(Object? v) =>
      TaskStatus.values.firstWhere((s) => s.api == v, orElse: () => TaskStatus.planned);
}

/// Чухал зэрэг (API `TaskPriority`).
enum TaskPriority {
  low('LOW'),
  normal('NORMAL'),
  high('HIGH'),
  urgent('URGENT');

  const TaskPriority(this.api);

  final String api;

  static TaskPriority fromApi(Object? v) =>
      TaskPriority.values.firstWhere((p) => p.api == v, orElse: () => TaskPriority.normal);
}

/// Хичээл (API `Subject`). Вэбийн маягт зөвхөн Математик, Нийгмийн ухааныг санал болгодог.
enum TaskSubject {
  math('MATH'),
  socialStudies('SOCIAL_STUDIES'),
  sat('SAT');

  const TaskSubject(this.api);

  final String api;

  static TaskSubject? fromApi(Object? v) {
    for (final s in TaskSubject.values) {
      if (s.api == v) return s;
    }
    return null;
  }
}

Map<String, Object?> _map(Object? j) => j is Map ? j.cast<String, Object?>() : const {};

String _str(Object? v) => v is String ? v : '';

String? _strOrNull(Object? v) => v is String && v.isNotEmpty ? v : null;

/// Ажилтан (`/tasks/staff-directory`, даалгаврын `assignees[].user`).
@immutable
class StaffMember {
  const StaffMember({required this.id, required this.firstName, required this.lastName, this.role, this.avatarUrl});

  factory StaffMember.fromJson(Map<String, Object?> j) => StaffMember(
    id: _str(j['id']),
    firstName: _str(j['firstName']),
    lastName: _str(j['lastName']),
    role: _strOrNull(j['role']),
    avatarUrl: _strOrNull(j['avatarUrl']),
  );

  final String id;
  final String firstName;
  final String lastName;
  final String? role;
  final String? avatarUrl;

  @override
  bool operator ==(Object other) => other is StaffMember && other.id == id;

  @override
  int get hashCode => id.hashCode;
}

/// Анги (`/classrooms`, даалгаврын `classroom`).
@immutable
class ClassroomRef {
  const ClassroomRef({required this.id, required this.name});

  factory ClassroomRef.fromJson(Map<String, Object?> j) => ClassroomRef(id: _str(j['id']), name: _str(j['name']));

  final String id;
  final String name;

  @override
  bool operator ==(Object other) => other is ClassroomRef && other.id == id && other.name == name;

  @override
  int get hashCode => Object.hash(id, name);
}

/// Даалгавар (дээд түвшний эсвэл дэд). Дэд даалгаварт [subtasks] хоосон (нэг л түвшин).
@immutable
class StaffTask {
  const StaffTask({
    required this.id,
    required this.title,
    this.description,
    this.status = TaskStatus.planned,
    this.priority = TaskPriority.normal,
    this.startDate,
    this.dueDate,
    this.parentTaskId,
    this.classroom,
    this.subject,
    this.estimateHours,
    this.createdById,
    this.createdBy,
    this.assignees = const [],
    this.subtasks = const [],
    this.orderIndex = 0,
  });

  factory StaffTask.fromJson(Map<String, Object?> j) {
    final classroomJson = j['classroom'];
    final classroomId = _strOrNull(j['classroomId']);
    final createdBy = j['createdBy'];
    return StaffTask(
      id: _str(j['id']),
      title: _str(j['title']),
      description: _strOrNull(j['description']),
      status: TaskStatus.fromApi(j['status']),
      priority: TaskPriority.fromApi(j['priority']),
      startDate: parseApiInstant(_strOrNull(j['startDate'])),
      dueDate: parseApiInstant(_strOrNull(j['dueDate'])),
      parentTaskId: _strOrNull(j['parentTaskId']),
      classroom: classroomJson is Map
          ? ClassroomRef.fromJson(_map(classroomJson))
          : classroomId == null
          ? null
          : ClassroomRef(id: classroomId, name: ''),
      subject: TaskSubject.fromApi(j['subject']),
      estimateHours: (j['estimateHours'] as num?)?.toInt(),
      createdById: _strOrNull(j['createdById']) ?? (createdBy is Map ? _strOrNull(createdBy['id']) : null),
      createdBy: createdBy is Map ? StaffMember.fromJson(_map(createdBy)) : null,
      assignees: [
        for (final a in (j['assignees'] as List?) ?? const [])
          if (a is Map && a['user'] is Map) StaffMember.fromJson(_map(a['user'])),
      ],
      subtasks: [
        for (final s in (j['subtasks'] as List?) ?? const [])
          if (s is Map) StaffTask.fromJson(_map(s)),
      ],
      orderIndex: (j['orderIndex'] as num?)?.toInt() ?? 0,
    );
  }

  final String id;
  final String title;
  final String? description;
  final TaskStatus status;
  final TaskPriority priority;

  /// Агшин (UTC). Харуулахдаа [UbDateTime.fromInstant].
  final DateTime? startDate;
  final DateTime? dueDate;
  final String? parentTaskId;
  final ClassroomRef? classroom;
  final TaskSubject? subject;
  final int? estimateHours;

  /// Үүсгэсэн ажилтан (дэд даалгаварт ч скаляр `createdById` ирдэг).
  final String? createdById;
  final StaffMember? createdBy;
  final List<StaffMember> assignees;
  final List<StaffTask> subtasks;
  final int orderIndex;

  bool get isSubtask => parentTaskId != null;

  bool isAssignedTo(String? userId) => userId != null && assignees.any((a) => a.id == userId);

  static const _unset = Object();

  StaffTask copyWith({
    String? title,
    Object? description = _unset,
    TaskStatus? status,
    TaskPriority? priority,
    Object? startDate = _unset,
    Object? dueDate = _unset,
    Object? classroom = _unset,
    Object? subject = _unset,
    Object? estimateHours = _unset,
    List<StaffMember>? assignees,
    List<StaffTask>? subtasks,
  }) => StaffTask(
    id: id,
    title: title ?? this.title,
    description: identical(description, _unset) ? this.description : description as String?,
    status: status ?? this.status,
    priority: priority ?? this.priority,
    startDate: identical(startDate, _unset) ? this.startDate : startDate as DateTime?,
    dueDate: identical(dueDate, _unset) ? this.dueDate : dueDate as DateTime?,
    parentTaskId: parentTaskId,
    classroom: identical(classroom, _unset) ? this.classroom : classroom as ClassroomRef?,
    subject: identical(subject, _unset) ? this.subject : subject as TaskSubject?,
    estimateHours: identical(estimateHours, _unset) ? this.estimateHours : estimateHours as int?,
    createdById: createdById,
    createdBy: createdBy,
    assignees: assignees ?? this.assignees,
    subtasks: subtasks ?? this.subtasks,
    orderIndex: orderIndex,
  );
}

/// Маягтаас үүссэн даалгаврын утга (үүсгэх, засах) — вэбийн `TaskFormValues`-ийн body.
@immutable
class TaskDraft {
  const TaskDraft({
    required this.title,
    this.description = '',
    this.status = TaskStatus.planned,
    this.priority = TaskPriority.normal,
    this.startDate,
    this.dueDate,
    this.classroomId,
    this.subject,
    this.estimateHours,
    this.assigneeIds = const [],
    this.parentTaskId,
  });

  final String title;
  final String description;
  final TaskStatus status;
  final TaskPriority priority;

  /// Агшин (UTC).
  final DateTime? startDate;
  final DateTime? dueDate;
  final String? classroomId;
  final TaskSubject? subject;
  final int? estimateHours;
  final List<String> assigneeIds;
  final String? parentTaskId;

  /// `POST /tasks` бие — хоосон талбарыг илгээхгүй (вэбтэй ижил).
  Map<String, Object?> toCreateJson() => {
    'title': title.trim(),
    if (description.trim().isNotEmpty) 'description': description.trim(),
    'status': status.api,
    'priority': priority.api,
    if (startDate != null) 'startDate': startDate!.toUtc().toIso8601String(),
    if (dueDate != null) 'dueDate': dueDate!.toUtc().toIso8601String(),
    if (classroomId != null) 'classroomId': classroomId,
    if (subject != null) 'subject': subject!.api,
    if (estimateHours != null) 'estimateHours': estimateHours,
    'assigneeIds': assigneeIds,
    if (parentTaskId != null) 'parentTaskId': parentTaskId,
  };

  /// `PATCH /tasks/:id` бие (Админ, Багш+). Цэвэрлэсэн талбарыг `null`-аар илгээнэ — серверийн
  /// `@IsOptional` null-ийг алгасаад сервис нь утгыг null болгодог (вэбд цэвэрлэх боломжгүй байсан).
  /// `parentTaskId`-г засахад илгээхгүй (эцэг хэвээр).
  Map<String, Object?> toUpdateJson() => {
    'title': title.trim(),
    'description': description.trim().isEmpty ? null : description.trim(),
    'status': status.api,
    'priority': priority.api,
    'startDate': startDate?.toUtc().toIso8601String(),
    'dueDate': dueDate?.toUtc().toIso8601String(),
    'classroomId': classroomId,
    'subject': subject?.api,
    'estimateHours': estimateHours,
    'assigneeIds': assigneeIds,
  };
}

/// Ачааллын мөр (`/tasks/workload`).
@immutable
class WorkloadRow {
  const WorkloadRow({
    required this.user,
    required this.counts,
    required this.totalEstimateHours,
    required this.openCount,
  });

  factory WorkloadRow.fromJson(Map<String, Object?> j) {
    final counts = _map(j['counts']);
    return WorkloadRow(
      user: StaffMember.fromJson(_map(j['user'])),
      counts: {for (final s in TaskStatus.values) s: (counts[s.api] as num?)?.toInt() ?? 0},
      totalEstimateHours: (j['totalEstimateHours'] as num?)?.toInt() ?? 0,
      openCount: (j['openCount'] as num?)?.toInt() ?? 0,
    );
  }

  final StaffMember user;
  final Map<TaskStatus, int> counts;
  final int totalEstimateHours;
  final int openCount;
}
