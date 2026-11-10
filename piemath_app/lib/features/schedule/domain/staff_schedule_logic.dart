import 'package:flutter/material.dart' show TimeOfDay;

import '../../../core/auth/user_role.dart';
import '../../../core/format/person_name.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../data/staff_schedule_models.dart';

// Ажилтны хуваарийн цэвэр логик (вэбийн `components/schedule/types.ts`, `pattern/model.ts`, `roster/parity.ts`).
// Гарагийн хөрвүүлэлт ЗӨВХӨН `core/time/weekday.dart`-аар.

/// Танхим (эзний тогтмол жагсаалт, вэбийн `ROOMS`) — эрэмбэ нь UI-д харагдах эрэмбэ.
class Room {
  const Room(this.value, this.branch, [this.capacity]);

  final String value;
  final String branch;
  final int? capacity;
}

const rooms = <Room>[
  Room('501', 'Баруун 4', 42),
  Room('502', 'Баруун 4', 32),
  Room('503', 'Баруун 4', 32),
  Room('504', 'Баруун 4', 24),
  Room('403', 'Баруун 4', 32),
  Room('404', 'Баруун 4', 24),
  Room('405', 'Баруун 4', 12),
  Room('301', 'Зүүн 4', 28),
  Room('302', 'Зүүн 4', 32),
  Room('Онлайн', 'Зайнаас'),
];

/// Танхимын тогтмол эрэмбэ (жагсаалтад байхгүй бол сүүлд).
int roomOrderOf(String? room) {
  if (room == null) return rooms.length + 1;
  final i = rooms.indexWhere((r) => r.value == room);
  return i == -1 ? rooms.length : i;
}

int? roomCapacityOf(String? room) {
  for (final r in rooms) {
    if (r.value == room) return r.capacity;
  }
  return null;
}

/// «12-1 (Баруун 4)» → «12-1».
String shortClass(String name) => name.replaceFirst(RegExp(r'\s*\([^)]*\)$'), '');

/// Ангийн нэрээс салбар.
String branchOf(String classroomName) => classroomName.contains('Зүүн')
    ? 'Зүүн 4'
    : classroomName.contains('Баруун')
    ? 'Баруун 4'
    : 'Бусад';

/// 540 → «09:00».
String formatMinutes(int total) =>
    '${(total ~/ 60).toString().padLeft(2, '0')}:${(total % 60).toString().padLeft(2, '0')}';

int minutesOf(TimeOfDay t) => t.hour * 60 + t.minute;

TimeOfDay timeOfMinutes(int m) => TimeOfDay(hour: (m ~/ 60) % 24, minute: m % 60);

/// Дуусах цагийг гараар оруулахгүй (эзэн 2026-10-31): эхлэх цаг + үргэлжлэх хугацаа, 23:59-д хавчина.
int endAfter(int startMinute, int durationMinutes) =>
    (startMinute + (durationMinutes < 1 ? 1 : durationMinutes)).clamp(1, 24 * 60 - 1);

/// Хичээл бүр 120 минут (STATUS §7.1).
const lessonMinutes = 120;

/// Хичээлийн чиглэл.
const subjectLabels = {'MATH': 'Математик', 'SOCIAL_STUDIES': 'Нийгмийн ухаан'};

/// Онцгой өдрийн төрөл.
const calendarTypes = {
  'HOLIDAY': 'Амралтын өдөр',
  'BREAK': 'Завсарлага',
  'EXAM_DAY': 'Шалгалтын өдөр',
  'SPECIAL': 'Тусгай өдөр',
  'NO_CLASS': 'Хичээлгүй өдөр',
};

/// «DISMISS» = тарах, «STAY» = үлдэнэ.
String? dismissLabel(String? mode) => switch (mode) {
  'DISMISS' => 'Тарах',
  'STAY' => 'Үлдэнэ',
  _ => null,
};

/// Багшийн нэр, Багш+ бол «+».
String teacherLabel(TeacherOption t) =>
    t.displayName != null ? withPlus(t.displayName!, t.role) : staffName(firstName: t.firstName, role: t.role);

String staffRefLabel(StaffRef r) => withPlus(r.name, r.role);

/// Хуваарийн (давтагддаг) багш: сервер бүтэн нэр өгнө.
String? lessonTeacherLabel(DayLesson l) {
  final n = l.teacherName?.trim();
  if (n == null || n.isEmpty) return null;
  return withPlus(n, l.teacherRole);
}

String? slotTeacherLabel(PatternSlot s) => s.teacherFirstName == null
    ? null
    : staffName(firstName: s.teacherFirstName, lastName: s.teacherLastName, role: s.teacherRole);

// ---------- Огноо ----------

UbDateTime dayOf(String key) => parseDateKey(key)!;

/// Үдээс хойш маргаашийн хуваарь хамгийн их хэрэгтэй (Багш+ өмнөх орой төлөвлөдөг) — анхдагч нь маргааш.
UbDateTime defaultScheduleDay(UbDateTime now) => now.hour >= 12 ? now.startOfDay.addDays(1) : now.startOfDay;

/// [day]-ийн 7 хоногийн Даваа.
UbDateTime mondayOfDay(UbDateTime day) => day.startOfDay.addDays(1 - day.weekday);

/// JS гараг (0=Ням).
int jsWeekdayOf(UbDateTime day) => jsWeekdayFromMn(day.weekday);

/// 1-р (сондгой) 7 хоног = Даваа 2026-08-31 (api `week-resolver.ts`-тэй ИЖИЛ).
final parityAnchor = UbDateTime(2026, 8, 31);

/// 1 = сондгой, 2 = тэгш 7 хоног.
int weekParityOf(UbDateTime day) {
  final week = ((day.dayIndex - parityAnchor.dayIndex) / 7).floor();
  return week % 2 == 0 ? 1 : 2;
}

const parityLabels = {0: 'Тогтмол', 1: 'Сондгой', 2: 'Тэгш'};

/// Тогтмол хуваарийн мөр тухайн огноонд хүчинтэй эсэх (effectiveTo оролцуулсан).
bool isEffectiveOn(PatternSlot s, String dateKey) =>
    s.from.compareTo(dateKey) <= 0 && (s.to == null || s.to!.compareTo(dateKey) >= 0);

/// [fromKey]-оос хойш (оролцуулан) JS [weekday]-ийн анхны огноо.
UbDateTime nextOnOrAfter(int weekday, UbDateTime from) {
  var d = from.startOfDay;
  for (var i = 0; i < 7; i++) {
    if (jsWeekdayOf(d) == weekday) return d;
    d = d.addDays(1);
  }
  return from.startOfDay;
}

// ---------- Эрх ----------

/// Хэн юу засахыг вэб, API-ийн хамгаалалттай ИЖИЛ тооцно:
/// - Багш: бүгдийг ХАРНА, юу ч засахгүй.
/// - Багш+ / Админ ([canPlan]): өдрийн багш оноох, сэдэв, нийтлэх, ажлын өдрийн хүснэгт.
/// - Танхим, цаг, зөөх, цуцлах, устгах, шинэ цаг: `schedule.manage` ([access]) — Админ бүх анги,
///   Багш+ олгогдсон ангид.
class StaffPermissions {
  const StaffPermissions({required this.role, this.access = ScheduleAccess.none, this.canPlan = false});

  factory StaffPermissions.of(UserRole role, ScheduleAccess? access) => StaffPermissions(
    role: role,
    access: role == UserRole.teacher ? ScheduleAccess.none : (access ?? ScheduleAccess.none),
    canPlan: role == UserRole.admin || role == UserRole.teacherPlus,
  );

  final UserRole role;
  final ScheduleAccess access;
  final bool canPlan;

  /// Ахлах/туслах багш, сэдэв (`PLANNERS`).
  bool get canStaff => canPlan;

  /// Тухайн ангийн хичээлийг зөөх, цуцлах, танхим солих, «Энэ ба цаашдын бүх», устгах.
  bool canManage(String classroomId) => canPlan && access.canManage(classroomId);

  /// «Шинэ цаг нэмэх», онцгой өдөр бүртгэх.
  bool get canManageAny => canPlan && access.any;

  /// Багшийн ажлын өдрийн хүснэгт — Багш+ `schedule.manage`-гүйгээр засна (эзэн 2026-10-11).
  bool get canEditRoster => canPlan;

  /// Өдрийн хуваарь нийтлэх.
  bool get canPublish => canPlan;
}

// ---------- Шүүлтүүр ----------

enum ScheduleFilterKind { all, mine, teacher, classroom }

/// Хуваарийг багш эсвэл ангиар шүүх.
class ScheduleFilter {
  const ScheduleFilter._(this.kind, [this.id, this.label]);

  const ScheduleFilter.all() : this._(ScheduleFilterKind.all);

  const ScheduleFilter.mine() : this._(ScheduleFilterKind.mine);

  const ScheduleFilter.teacher(String id, String label) : this._(ScheduleFilterKind.teacher, id, label);

  const ScheduleFilter.classroom(String id, String label) : this._(ScheduleFilterKind.classroom, id, label);

  final ScheduleFilterKind kind;
  final String? id;
  final String? label;

  bool get isAll => kind == ScheduleFilterKind.all;

  /// Өдрийн хичээл: багшаар бол хуваарийн, ахлах, туслах багшийн аль нэг нь.
  bool matchesLesson(DayLesson l) => switch (kind) {
    ScheduleFilterKind.all => true,
    ScheduleFilterKind.mine => l.mine,
    ScheduleFilterKind.teacher => l.teacherId == id || l.lead?.id == id || l.assistant?.id == id,
    ScheduleFilterKind.classroom => l.classroomId == id,
  };

  /// Тогтмол хуваарийн мөр. «Миний» үед [userId]-аар.
  bool matchesSlot(PatternSlot s, {String? userId}) => switch (kind) {
    ScheduleFilterKind.all => true,
    ScheduleFilterKind.mine => userId != null && s.teacherId == userId,
    ScheduleFilterKind.teacher => s.teacherId == id,
    ScheduleFilterKind.classroom => s.classroomId == id,
  };

  @override
  bool operator ==(Object other) => other is ScheduleFilter && other.kind == kind && other.id == id;

  @override
  int get hashCode => Object.hash(kind, id);
}

// ---------- Өдрийн хуваарь ----------

/// Цаг → салбар → танхимын эрэмбээр.
List<DayLesson> sortLessons(Iterable<DayLesson> lessons) => [...lessons]
  ..sort((a, b) {
    final t = a.startMinute.compareTo(b.startMinute);
    if (t != 0) return t;
    final r = roomOrderOf(a.room).compareTo(roomOrderOf(b.room));
    return r != 0 ? r : a.classroomName.compareTo(b.classroomName);
  });

/// Цагийн хүснэгтэд багтахгүй «нягт» өдөр: нэг цагт [limit]-ээс олон анги зэрэг эхэлдэг. Утасны дэлгэцэд
/// 4-өөс олон багана болоход ангийн нэр, цаг тасардаг тул тэр үед жагсаалтаар харуулна.
bool crowdedDay(Iterable<DayLesson> lessons, {int limit = 4}) {
  final perStart = <int, int>{};
  for (final l in lessons) {
    final n = perStart[l.startMinute] = (perStart[l.startMinute] ?? 0) + 1;
    if (n > limit) return true;
  }
  return false;
}

/// Нэг багш ДАВХАР цагт хоёр ангид оноогдсон эсэх — `scheduleId|teacherId` түлхүүрүүд.
Set<String> teacherClashes(List<DayLesson> lessons) {
  final rows = [
    for (final l in lessons)
      for (final id in [l.lead?.id, l.assistant?.id])
        if (id != null) (id: id, sid: l.scheduleId, start: l.startMinute, end: l.endMinute),
  ];
  final out = <String>{};
  for (final a in rows) {
    for (final b in rows) {
      if (a.id == b.id && a.sid != b.sid && a.start < b.end && b.start < a.end) out.add('${a.sid}|${a.id}');
    }
  }
  return out;
}

/// Энэ хичээлтэй ЦАГ ДАВХЦАЖ буй бусад ангиуд — танхим сонгоход эзэлсэн танхимыг харуулна.
List<DayLesson> sameTime(DayLesson lesson, List<DayLesson> all) => [
  for (final l in all)
    if (l.scheduleId != lesson.scheduleId && l.startMinute < lesson.endMinute && lesson.startMinute < l.endMinute) l,
];

/// Өдрийн тоолол: төлөвлөсөн, батлагдсан.
({int total, int planned, int confirmed}) dayCounts(List<DayLesson> lessons) => (
  total: lessons.length,
  planned: lessons.where((l) => l.planned).length,
  confirmed: lessons.where((l) => l.record != null).length,
);
