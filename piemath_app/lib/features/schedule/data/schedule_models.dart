import 'package:freezed_annotation/freezed_annotation.dart';

part 'schedule_models.freezed.dart';
part 'schedule_models.g.dart';

// Хуваарь — гэрээ `docs/api-contract/schedule-attendance.md`.
// АНХААР: бүх `weekday` талбар JS дугаарлалт (0=Ням … 6=Бямба) — харуулахдаа ЗААВАЛ
// `core/time/weekday.dart`-ийн `mnWeekdayFromJs`-ээр хөрвүүл.

/// `GET /schedule/me` (STUDENT) — 7 хоногийн тогтмол хэв маяг.
@freezed
abstract class ScheduleMe with _$ScheduleMe {
  const factory ScheduleMe({
    /// ЭХНИЙ идэвхтэй элсэлт. null = идэвхтэй анги алга.
    String? classroomId,
    @Default(<ScheduleEntry>[]) List<ScheduleEntry> entries,
  }) = _ScheduleMe;

  factory ScheduleMe.fromJson(Map<String, Object?> json) => _$ScheduleMeFromJson(json);
}

@freezed
abstract class ScheduleEntry with _$ScheduleEntry {
  const factory ScheduleEntry({
    required String id,
    required String classroomId,

    /// JS 0=Ням.
    required int weekday,
    required int startMinute,
    required int endMinute,
    String? room,
    String? subject,
    ScheduleClassroom? classroom,
    SchedulePerson? teacher,
  }) = _ScheduleEntry;

  factory ScheduleEntry.fromJson(Map<String, Object?> json) => _$ScheduleEntryFromJson(json);
}

@freezed
abstract class ScheduleClassroom with _$ScheduleClassroom {
  const factory ScheduleClassroom({required String id, @Default('') String name}) = _ScheduleClassroom;

  factory ScheduleClassroom.fromJson(Map<String, Object?> json) => _$ScheduleClassroomFromJson(json);
}

@freezed
abstract class SchedulePerson with _$SchedulePerson {
  const factory SchedulePerson({String? id, @Default('') String firstName, String? lastName, String? role}) =
      _SchedulePerson;

  factory SchedulePerson.fromJson(Map<String, Object?> json) => _$SchedulePersonFromJson(json);
}

/// `GET /schedule/week?start=` — тухайн 7 хоног, цуцалсан/зөөсөн/амралтыг шийдсэн.
@freezed
abstract class ScheduleWeek with _$ScheduleWeek {
  const factory ScheduleWeek({required String start, @Default(<WeekDay>[]) List<WeekDay> days}) = _ScheduleWeek;

  factory ScheduleWeek.fromJson(Map<String, Object?> json) => _$ScheduleWeekFromJson(json);
}

@freezed
abstract class WeekDay with _$WeekDay {
  const factory WeekDay({
    required String date,

    /// JS 0=Ням.
    required int weekday,
    @Default(false) bool isHoliday,
    CalendarMark? holiday,
    @Default(<RestingClass>[]) List<RestingClass> restingClasses,
    @Default(<WeekEntry>[]) List<WeekEntry> entries,
  }) = _WeekDay;

  factory WeekDay.fromJson(Map<String, Object?> json) => _$WeekDayFromJson(json);
}

@freezed
abstract class CalendarMark with _$CalendarMark {
  const factory CalendarMark({@Default('HOLIDAY') String type, @Default('') String title, String? note}) =
      _CalendarMark;

  factory CalendarMark.fromJson(Map<String, Object?> json) => _$CalendarMarkFromJson(json);
}

@freezed
abstract class RestingClass with _$RestingClass {
  const factory RestingClass({
    required String classroomId,
    @Default('') String classroomName,
    @Default('HOLIDAY') String type,
    @Default('') String title,
  }) = _RestingClass;

  factory RestingClass.fromJson(Map<String, Object?> json) => _$RestingClassFromJson(json);
}

@freezed
abstract class WeekEntry with _$WeekEntry {
  const factory WeekEntry({
    required String scheduleId,
    required String classroomId,
    @Default('') String classroomName,

    /// «Овог Нэр» (бүтэн).
    String? teacherName,
    String? teacherRole,
    required int startMinute,
    required int endMinute,
    String? room,
    String? subject,
    String? topic,
    WeekException? exception,
  }) = _WeekEntry;

  factory WeekEntry.fromJson(Map<String, Object?> json) => _$WeekEntryFromJson(json);
}

/// Зөөгдсөн хичээл (`kind: MOVED`) — анхны огноотой.
@freezed
abstract class WeekException with _$WeekException {
  const factory WeekException({@Default('MOVED') String kind, String? note, String? originalDate}) =
      _WeekException;

  factory WeekException.fromJson(Map<String, Object?> json) => _$WeekExceptionFromJson(json);
}
