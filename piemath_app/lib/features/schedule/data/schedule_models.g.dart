// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'schedule_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ScheduleMe _$ScheduleMeFromJson(Map<String, dynamic> json) => _ScheduleMe(
  classroomId: json['classroomId'] as String?,
  entries:
      (json['entries'] as List<dynamic>?)
          ?.map((e) => ScheduleEntry.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <ScheduleEntry>[],
);

Map<String, dynamic> _$ScheduleMeToJson(_ScheduleMe instance) =>
    <String, dynamic>{
      'classroomId': instance.classroomId,
      'entries': instance.entries,
    };

_ScheduleEntry _$ScheduleEntryFromJson(Map<String, dynamic> json) =>
    _ScheduleEntry(
      id: json['id'] as String,
      classroomId: json['classroomId'] as String,
      weekday: (json['weekday'] as num).toInt(),
      startMinute: (json['startMinute'] as num).toInt(),
      endMinute: (json['endMinute'] as num).toInt(),
      room: json['room'] as String?,
      subject: json['subject'] as String?,
      classroom: json['classroom'] == null
          ? null
          : ScheduleClassroom.fromJson(
              json['classroom'] as Map<String, dynamic>,
            ),
      teacher: json['teacher'] == null
          ? null
          : SchedulePerson.fromJson(json['teacher'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$ScheduleEntryToJson(_ScheduleEntry instance) =>
    <String, dynamic>{
      'id': instance.id,
      'classroomId': instance.classroomId,
      'weekday': instance.weekday,
      'startMinute': instance.startMinute,
      'endMinute': instance.endMinute,
      'room': instance.room,
      'subject': instance.subject,
      'classroom': instance.classroom,
      'teacher': instance.teacher,
    };

_ScheduleClassroom _$ScheduleClassroomFromJson(Map<String, dynamic> json) =>
    _ScheduleClassroom(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
    );

Map<String, dynamic> _$ScheduleClassroomToJson(_ScheduleClassroom instance) =>
    <String, dynamic>{'id': instance.id, 'name': instance.name};

_SchedulePerson _$SchedulePersonFromJson(Map<String, dynamic> json) =>
    _SchedulePerson(
      id: json['id'] as String?,
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String?,
      role: json['role'] as String?,
    );

Map<String, dynamic> _$SchedulePersonToJson(_SchedulePerson instance) =>
    <String, dynamic>{
      'id': instance.id,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'role': instance.role,
    };

_ScheduleWeek _$ScheduleWeekFromJson(Map<String, dynamic> json) =>
    _ScheduleWeek(
      start: json['start'] as String,
      days:
          (json['days'] as List<dynamic>?)
              ?.map((e) => WeekDay.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <WeekDay>[],
    );

Map<String, dynamic> _$ScheduleWeekToJson(_ScheduleWeek instance) =>
    <String, dynamic>{'start': instance.start, 'days': instance.days};

_WeekDay _$WeekDayFromJson(Map<String, dynamic> json) => _WeekDay(
  date: json['date'] as String,
  weekday: (json['weekday'] as num).toInt(),
  isHoliday: json['isHoliday'] as bool? ?? false,
  holiday: json['holiday'] == null
      ? null
      : CalendarMark.fromJson(json['holiday'] as Map<String, dynamic>),
  restingClasses:
      (json['restingClasses'] as List<dynamic>?)
          ?.map((e) => RestingClass.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <RestingClass>[],
  entries:
      (json['entries'] as List<dynamic>?)
          ?.map((e) => WeekEntry.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <WeekEntry>[],
);

Map<String, dynamic> _$WeekDayToJson(_WeekDay instance) => <String, dynamic>{
  'date': instance.date,
  'weekday': instance.weekday,
  'isHoliday': instance.isHoliday,
  'holiday': instance.holiday,
  'restingClasses': instance.restingClasses,
  'entries': instance.entries,
};

_CalendarMark _$CalendarMarkFromJson(Map<String, dynamic> json) =>
    _CalendarMark(
      type: json['type'] as String? ?? 'HOLIDAY',
      title: json['title'] as String? ?? '',
      note: json['note'] as String?,
    );

Map<String, dynamic> _$CalendarMarkToJson(_CalendarMark instance) =>
    <String, dynamic>{
      'type': instance.type,
      'title': instance.title,
      'note': instance.note,
    };

_RestingClass _$RestingClassFromJson(Map<String, dynamic> json) =>
    _RestingClass(
      classroomId: json['classroomId'] as String,
      classroomName: json['classroomName'] as String? ?? '',
      type: json['type'] as String? ?? 'HOLIDAY',
      title: json['title'] as String? ?? '',
    );

Map<String, dynamic> _$RestingClassToJson(_RestingClass instance) =>
    <String, dynamic>{
      'classroomId': instance.classroomId,
      'classroomName': instance.classroomName,
      'type': instance.type,
      'title': instance.title,
    };

_WeekEntry _$WeekEntryFromJson(Map<String, dynamic> json) => _WeekEntry(
  scheduleId: json['scheduleId'] as String,
  classroomId: json['classroomId'] as String,
  classroomName: json['classroomName'] as String? ?? '',
  teacherName: json['teacherName'] as String?,
  teacherRole: json['teacherRole'] as String?,
  startMinute: (json['startMinute'] as num).toInt(),
  endMinute: (json['endMinute'] as num).toInt(),
  room: json['room'] as String?,
  subject: json['subject'] as String?,
  topic: json['topic'] as String?,
  exception: json['exception'] == null
      ? null
      : WeekException.fromJson(json['exception'] as Map<String, dynamic>),
);

Map<String, dynamic> _$WeekEntryToJson(_WeekEntry instance) =>
    <String, dynamic>{
      'scheduleId': instance.scheduleId,
      'classroomId': instance.classroomId,
      'classroomName': instance.classroomName,
      'teacherName': instance.teacherName,
      'teacherRole': instance.teacherRole,
      'startMinute': instance.startMinute,
      'endMinute': instance.endMinute,
      'room': instance.room,
      'subject': instance.subject,
      'topic': instance.topic,
      'exception': instance.exception,
    };

_WeekException _$WeekExceptionFromJson(Map<String, dynamic> json) =>
    _WeekException(
      kind: json['kind'] as String? ?? 'MOVED',
      note: json['note'] as String?,
      originalDate: json['originalDate'] as String?,
    );

Map<String, dynamic> _$WeekExceptionToJson(_WeekException instance) =>
    <String, dynamic>{
      'kind': instance.kind,
      'note': instance.note,
      'originalDate': instance.originalDate,
    };
