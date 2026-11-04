import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' show TimeOfDay;

import '../../../core/auth/user_role.dart';
import '../../../core/format/person_name.dart';
import '../../../core/time/ub_time.dart';
import '../data/planner_models.dart';

/// Төлөвлөгчийн цэвэр логик (UI-гүй, тестлэгдэнэ): бүлэглэх, эрх, шүүлтүүр, маягтын шалгалт.

// ───────── Шошго (вэбийн `statusMeta.ts`) ─────────

String statusLabel(TaskStatus s) => switch (s) {
  TaskStatus.planned => 'Төлөвлөсөн',
  TaskStatus.inProgress => 'Хийгдэж байгаа',
  TaskStatus.blocked => 'Хоригдсон',
  TaskStatus.done => 'Дууссан',
  TaskStatus.cancelled => 'Цуцалсан',
};

String priorityLabel(TaskPriority p) => switch (p) {
  TaskPriority.low => 'Бага',
  TaskPriority.normal => 'Энгийн',
  TaskPriority.high => 'Өндөр',
  TaskPriority.urgent => 'Яаралтай',
};

String subjectLabel(TaskSubject s) => switch (s) {
  TaskSubject.math => 'Математик',
  TaskSubject.socialStudies => 'Нийгмийн ухаан',
  TaskSubject.sat => 'SAT',
};

/// Ажилтны нэр: «Б. Нэр», Багш+ бол «+».
String memberName(StaffMember m) => staffName(firstName: m.firstName, lastName: m.lastName, role: m.role);

// ───────── Эрх (сервертэй ижил: `tasks.controller.ts`, `tasks.service.ts` update) ─────────

/// Үүсгэх, бүх талбар засах, дэд даалгавар нэмэх — Админ, Багш+.
bool canEditAll(UserRole role) => role == UserRole.admin || role == UserRole.teacherPlus;

/// Төлөв солих: Админ, Багш+ бүгдийг; Багш зөвхөн өөрт оноогдсоныг.
bool canChangeStatus(StaffTask task, {required UserRole role, required String? userId}) =>
    canEditAll(role) || (role == UserRole.teacher && task.isAssignedTo(userId));

/// Жагсаалтын хүрээ.
enum PlannerScope {
  mine('Миний'),
  created('Миний өгсөн'),
  all('Бүгд');

  const PlannerScope(this.label);

  final String label;
}

/// Хэрэглэгчид харагдах хүрээнүүд: Багш даалгавар өгдөггүй тул «Миний өгсөн» байхгүй.
List<PlannerScope> scopesFor(UserRole role) =>
    canEditAll(role) ? PlannerScope.values : const [PlannerScope.mine, PlannerScope.all];

/// Анх нээгдэх хүрээ: Багшид өөрийнх, удирдлагад бүгд.
PlannerScope defaultScope(UserRole role) => canEditAll(role) ? PlannerScope.all : PlannerScope.mine;

// ───────── Мөр (дэд даалгаврыг хавтгай жагсаалтад) ─────────

/// Жагсаалтын нэг даалгавар — дэд даалгавар бол эцгийнх нь хамт.
@immutable
class PlannerItem {
  const PlannerItem(this.task, [this.parent]);

  final StaffTask task;
  final StaffTask? parent;

  @override
  bool operator ==(Object other) => other is PlannerItem && other.task == task && other.parent == parent;

  @override
  int get hashCode => Object.hash(task, parent);
}

/// Эцэг бүрийн дараа дэд даалгаврууд нь.
List<PlannerItem> flattenTasks(List<StaffTask> tasks) => [
  for (final t in tasks) ...[PlannerItem(t), for (final s in t.subtasks) PlannerItem(s, t)],
];

/// Id-аар (дэд даалгаврын дотор ч) хайх.
StaffTask? findTask(List<StaffTask> tasks, String id) {
  for (final t in tasks) {
    if (t.id == id) return t;
    for (final s in t.subtasks) {
      if (s.id == id) return s;
    }
  }
  return null;
}

/// Id-тай даалгаврыг [f]-ээр солино (дэд даалгаврын дотор ч).
List<StaffTask> replaceTask(List<StaffTask> tasks, String id, StaffTask Function(StaffTask t) f) => [
  for (final t in tasks)
    if (t.id == id)
      f(t)
    else if (t.subtasks.any((s) => s.id == id))
      t.copyWith(subtasks: [for (final s in t.subtasks) s.id == id ? f(s) : s])
    else
      t,
];

/// Id-тай даалгаврыг хасна (эцэг бол дэд даалгавартайгаа).
List<StaffTask> removeTask(List<StaffTask> tasks, String id) => [
  for (final t in tasks)
    if (t.id != id)
      t.subtasks.any((s) => s.id == id) ? t.copyWith(subtasks: [...t.subtasks.where((s) => s.id != id)]) : t,
];

/// Шинэ даалгаврыг нэмнэ: дэд бол эцгийн төгсгөлд, эс бөгөөс жагсаалтын төгсгөлд.
List<StaffTask> insertTask(List<StaffTask> tasks, StaffTask task) {
  final parentId = task.parentTaskId;
  if (parentId == null || !tasks.any((t) => t.id == parentId)) return [...tasks, task];
  return [
    for (final t in tasks) t.id == parentId ? t.copyWith(subtasks: [...t.subtasks, task]) : t,
  ];
}

// ───────── Шүүлтүүр ─────────

bool inScope(PlannerItem item, PlannerScope scope, String? userId) => switch (scope) {
  PlannerScope.mine => item.task.isAssignedTo(userId),
  PlannerScope.created => userId != null && item.task.createdById == userId,
  PlannerScope.all => true,
};

/// Хайлт: гарчиг, тайлбар, эцгийн гарчиг, ажилтны нэр, анги. [search] жижиг үсгээр.
bool matchesSearch(PlannerItem item, String search) {
  if (search.isEmpty) return true;
  final t = item.task;
  final hay = [
    t.title,
    t.description ?? '',
    item.parent?.title ?? '',
    t.classroom?.name ?? '',
    for (final a in t.assignees) '${a.lastName} ${a.firstName}',
  ].join(' ').toLowerCase();
  return hay.contains(search);
}

/// Гаднын шүүлтүүр (ажилтан, анги, хичээл) — мөр бүрт өөрийнх нь талбараар.
bool matchesServerFilter(PlannerItem item, ({String? assigneeId, String? classroomId, TaskSubject? subject}) f) {
  final t = item.task;
  if (f.assigneeId != null && !t.isAssignedTo(f.assigneeId)) return false;
  if (f.classroomId != null && t.classroom?.id != f.classroomId) return false;
  if (f.subject != null && t.subject != f.subject) return false;
  return true;
}

// ───────── Бүлэглэх (Улаанбаатарын цагаар) ─────────

enum PlannerGroup {
  overdue('Хожимдсон'),
  today('Өнөөдөр'),
  thisWeek('Энэ 7 хоног'),
  later('Дараа'),
  done('Дууссан');

  const PlannerGroup(this.label);

  final String label;
}

/// UB-ийн хуанлийн өдрөөр: хаагдсан (дууссан, цуцалсан) → «Дууссан»; хугацаагүй → «Дараа»;
/// өнгөрсөн өдөр → «Хожимдсон»; өнөөдөр → «Өнөөдөр»; энэ 7 хоногийн (Ням гараг хүртэл) → «Энэ 7 хоног».
/// Цаг нь өнгөрсөн ч өнөөдрийн даалгавар «Өнөөдөр»-т үлдэнэ (вэб огноогоор л хадгалдаг).
PlannerGroup groupOf(StaffTask task, UbDateTime now) {
  if (task.status.isClosed) return PlannerGroup.done;
  final due = task.dueDate;
  if (due == null) return PlannerGroup.later;
  final day = UbDateTime.fromInstant(due).dayIndex;
  final today = now.dayIndex;
  if (day < today) return PlannerGroup.overdue;
  if (day == today) return PlannerGroup.today;
  final sunday = today + (7 - now.weekday);
  return day <= sunday ? PlannerGroup.thisWeek : PlannerGroup.later;
}

/// Хугацаа хэтэрсэн эсэх (картын улаан зурвас).
bool isOverdue(StaffTask task, UbDateTime now) => groupOf(task, now) == PlannerGroup.overdue;

/// Жагсаалтын мөр: бүлгийн гарчиг эсвэл даалгавар.
@immutable
sealed class PlannerRow {
  const PlannerRow();

  Object get key;
}

final class PlannerHeaderRow extends PlannerRow {
  const PlannerHeaderRow(this.group, this.count);

  final PlannerGroup group;
  final int count;

  @override
  Object get key => 'group:${group.name}';
}

final class PlannerTaskRow extends PlannerRow {
  const PlannerTaskRow(this.item, this.group);

  final PlannerItem item;
  final PlannerGroup group;

  @override
  Object get key => 'task:${item.task.id}';
}

int _priorityRank(TaskPriority p) => TaskPriority.values.length - p.index;

int _compare(PlannerItem a, PlannerItem b, {required bool latestFirst}) {
  final da = a.task.dueDate;
  final db = b.task.dueDate;
  if (da != db) {
    if (da == null) return 1;
    if (db == null) return -1;
    final c = da.compareTo(db);
    if (c != 0) return latestFirst ? -c : c;
  }
  final p = _priorityRank(a.task.priority).compareTo(_priorityRank(b.task.priority));
  if (p != 0) return p;
  return a.task.orderIndex.compareTo(b.task.orderIndex);
}

/// Бүлэг бүрт гарчиг + эрэмбэлсэн даалгаврууд (хоосон бүлэг алгасагдана). Нээлттэй бүлэгт эрт
/// хугацаатай нь дээр, «Дууссан»-д сүүлийнх нь дээр; ижил бол чухал зэргээр.
List<PlannerRow> buildRows(List<PlannerItem> items, UbDateTime now) {
  final byGroup = {for (final g in PlannerGroup.values) g: <PlannerItem>[]};
  for (final i in items) {
    byGroup[groupOf(i.task, now)]!.add(i);
  }
  return [
    for (final g in PlannerGroup.values)
      if (byGroup[g]!.isNotEmpty) ...[
        PlannerHeaderRow(g, byGroup[g]!.length),
        for (final i in byGroup[g]!..sort((a, b) => _compare(a, b, latestFirst: g == PlannerGroup.done)))
          PlannerTaskRow(i, g),
      ],
  ];
}

/// Өдөр бүрийн нээлттэй даалгаврын тоо (`UbDateTime.dateKey` → тоо) — 7 хоногийн тууз.
Map<String, int> dueCountsByDay(Iterable<PlannerItem> items) {
  final out = <String, int>{};
  for (final i in items) {
    final due = i.task.dueDate;
    if (due == null || i.task.status.isClosed) continue;
    final key = UbDateTime.fromInstant(due).dateKey;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

/// Даалгаврын дуусах огноо [day] өдөр (UB) эсэх.
bool isDueOn(StaffTask task, UbDateTime day) {
  final due = task.dueDate;
  return due != null && UbDateTime.fromInstant(due).isSameDay(day);
}

// ───────── Огноо, цаг ─────────

/// Зөвхөн огноотой (цаггүй) хадгалагдсан эсэх. Вэб огноог `YYYY-MM-DD`-ээр илгээдэг тул сервер UTC
/// шөнө дунд болгож хадгалдаг (UB 08:00) — тийм утгыг цаггүй гэж үзнэ.
bool hasTime(DateTime instant) {
  final u = instant.toUtc();
  return u.hour != 0 || u.minute != 0;
}

/// Маягтын огноо (+ цаг) → серверт илгээх агшин. Цаггүй бол вэбтэй ижил UTC шөнө дунд, цагтай бол
/// Улаанбаатарын тэр цаг.
DateTime? composeInstant(UbDateTime? day, [TimeOfDay? time]) {
  if (day == null) return null;
  if (time == null) return DateTime.utc(day.year, day.month, day.day);
  return UbDateTime(day.year, day.month, day.day, time.hour, time.minute).toInstant();
}

/// Эхлэх огноо (цаггүй). Дуусах нь ижил өдрийн UB 08:00-ээс өмнөх цагтай бол сервер «өмнө байна» гэж
/// татгалзахгүйн тулд эхлэхийг тэр өдрийн UB 00:00 болгоно.
DateTime? composeStart(UbDateTime? startDay, DateTime? due) {
  final start = composeInstant(startDay);
  if (start == null || due == null || !due.isBefore(start)) return start;
  return UbDateTime.fromInstant(due).isSameDay(startDay!) ? startDay.startOfDay.toInstant() : start;
}

/// Агшнаас маягтын огноо, цаг ([hasTime] биш бол цаг `null`).
({UbDateTime? day, TimeOfDay? time}) splitInstant(DateTime? instant) {
  if (instant == null) return (day: null, time: null);
  final ub = UbDateTime.fromInstant(instant);
  return (day: ub.startOfDay, time: hasTime(instant) ? TimeOfDay(hour: ub.hour, minute: ub.minute) : null);
}

// ───────── Маягтын шалгалт (вэбийн `TaskFormModal` + сервер) ─────────

abstract final class PlannerMessages {
  static const titleRequired = 'Даалгаврын нэрийг оруулна уу';
  static const dateOrder = 'Дуусах огноо эхлэх огнооноос өмнө байж болохгүй';
  static const timeWithoutDate = 'Цаг сонгосон бол дуусах огноогоо сонгоно уу';
  static const hoursNegative = 'Цаг 0-ээс багагүй байна';
}

/// Талбар хоорондын шалгалт. Алдаагүй бол `null`.
String? validateTaskForm({
  required String title,
  UbDateTime? startDay,
  UbDateTime? dueDay,
  TimeOfDay? dueTime,
  int? estimateHours,
}) {
  if (title.trim().isEmpty) return PlannerMessages.titleRequired;
  if (dueTime != null && dueDay == null) return PlannerMessages.timeWithoutDate;
  if (estimateHours != null && estimateHours < 0) return PlannerMessages.hoursNegative;
  if (startDay != null && dueDay != null && dueDay.dayIndex < startDay.dayIndex) return PlannerMessages.dateOrder;
  return null;
}
