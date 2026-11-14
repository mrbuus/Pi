// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'hub_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_HubOverview _$HubOverviewFromJson(Map<String, dynamic> json) => _HubOverview(
  classrooms:
      (json['classrooms'] as List<dynamic>?)
          ?.map((e) => HubClassroom.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <HubClassroom>[],
  attendance: AttendanceTotals.fromJson(
    json['attendance'] as Map<String, dynamic>,
  ),
  homework: HomeworkTotals.fromJson(json['homework'] as Map<String, dynamic>),
  today: json['today'] == null
      ? null
      : HubToday.fromJson(json['today'] as Map<String, dynamic>),
  todayOther:
      (json['todayOther'] as List<dynamic>?)
          ?.map((e) => HubToday.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <HubToday>[],
  latestMark: json['latestMark'] == null
      ? null
      : LatestMark.fromJson(json['latestMark'] as Map<String, dynamic>),
);

Map<String, dynamic> _$HubOverviewToJson(_HubOverview instance) =>
    <String, dynamic>{
      'classrooms': instance.classrooms,
      'attendance': instance.attendance,
      'homework': instance.homework,
      'today': instance.today,
      'todayOther': instance.todayOther,
      'latestMark': instance.latestMark,
    };

_HubClassroom _$HubClassroomFromJson(Map<String, dynamic> json) =>
    _HubClassroom(id: json['id'] as String, name: json['name'] as String);

Map<String, dynamic> _$HubClassroomToJson(_HubClassroom instance) =>
    <String, dynamic>{'id': instance.id, 'name': instance.name};

_AttendanceTotals _$AttendanceTotalsFromJson(Map<String, dynamic> json) =>
    _AttendanceTotals(
      total: (json['total'] as num?)?.toInt() ?? 0,
      present: (json['PRESENT'] as num?)?.toInt() ?? 0,
      late: (json['LATE'] as num?)?.toInt() ?? 0,
      absent: (json['ABSENT'] as num?)?.toInt() ?? 0,
      excused: (json['EXCUSED'] as num?)?.toInt() ?? 0,
      rate: (json['rate'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$AttendanceTotalsToJson(_AttendanceTotals instance) =>
    <String, dynamic>{
      'total': instance.total,
      'PRESENT': instance.present,
      'LATE': instance.late,
      'ABSENT': instance.absent,
      'EXCUSED': instance.excused,
      'rate': instance.rate,
    };

_HomeworkTotals _$HomeworkTotalsFromJson(Map<String, dynamic> json) =>
    _HomeworkTotals(
      total: (json['total'] as num?)?.toInt() ?? 0,
      done: (json['DONE'] as num?)?.toInt() ?? 0,
      partial: (json['PARTIAL'] as num?)?.toInt() ?? 0,
      notDone: (json['NOT_DONE'] as num?)?.toInt() ?? 0,
      rate: (json['rate'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$HomeworkTotalsToJson(_HomeworkTotals instance) =>
    <String, dynamic>{
      'total': instance.total,
      'DONE': instance.done,
      'PARTIAL': instance.partial,
      'NOT_DONE': instance.notDone,
      'rate': instance.rate,
    };

_HubToday _$HubTodayFromJson(Map<String, dynamic> json) => _HubToday(
  classroomId: json['classroomId'] as String,
  classroomName: json['classroomName'] as String,
  date: json['date'] as String,
  startMinute: (json['startMinute'] as num).toInt(),
  endMinute: (json['endMinute'] as num).toInt(),
  room: json['room'] as String?,
  topic: json['topic'] as String?,
);

Map<String, dynamic> _$HubTodayToJson(_HubToday instance) => <String, dynamic>{
  'classroomId': instance.classroomId,
  'classroomName': instance.classroomName,
  'date': instance.date,
  'startMinute': instance.startMinute,
  'endMinute': instance.endMinute,
  'room': instance.room,
  'topic': instance.topic,
};

_LatestMark _$LatestMarkFromJson(Map<String, dynamic> json) => _LatestMark(
  date: json['date'] as String,
  status: $enumDecodeNullable(
    _$HomeworkStatusEnumMap,
    json['status'],
    unknownValue: JsonKey.nullForUndefinedEnumValue,
  ),
  comment: json['comment'] as String?,
  classroomId: json['classroomId'] as String?,
  lessonDate: json['lessonDate'] as String?,
);

Map<String, dynamic> _$LatestMarkToJson(_LatestMark instance) =>
    <String, dynamic>{
      'date': instance.date,
      'status': _$HomeworkStatusEnumMap[instance.status],
      'comment': instance.comment,
      'classroomId': instance.classroomId,
      'lessonDate': instance.lessonDate,
    };

const _$HomeworkStatusEnumMap = {
  HomeworkStatus.done: 'DONE',
  HomeworkStatus.partial: 'PARTIAL',
  HomeworkStatus.notDone: 'NOT_DONE',
};

_HubDays _$HubDaysFromJson(Map<String, dynamic> json) => _HubDays(
  month: json['month'] as String,
  prevMonth: json['prevMonth'] as String?,
  nextMonth: json['nextMonth'] as String?,
  days:
      (json['days'] as List<dynamic>?)
          ?.map((e) => HubDay.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <HubDay>[],
);

Map<String, dynamic> _$HubDaysToJson(_HubDays instance) => <String, dynamic>{
  'month': instance.month,
  'prevMonth': instance.prevMonth,
  'nextMonth': instance.nextMonth,
  'days': instance.days,
};

_HubDay _$HubDayFromJson(Map<String, dynamic> json) => _HubDay(
  date: json['date'] as String,
  classroomId: json['classroomId'] as String,
  classroomName: json['classroomName'] as String,
  startMinute: (json['startMinute'] as num?)?.toInt(),
  endMinute: (json['endMinute'] as num?)?.toInt(),
  room: json['room'] as String?,
  topic: json['topic'] as String?,
  teachers:
      (json['teachers'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
  problemNumbers: json['problemNumbers'] as String?,
  tests:
      (json['tests'] as List<dynamic>?)
          ?.map((e) => HubDayTest.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <HubDayTest>[],
  attendance: json['attendance'] == null
      ? null
      : DayAttendance.fromJson(json['attendance'] as Map<String, dynamic>),
  homework: json['homework'] == null
      ? const DayHomework()
      : DayHomework.fromJson(json['homework'] as Map<String, dynamic>),
  theory: json['theory'] == null
      ? const DayTheory()
      : DayTheory.fromJson(json['theory'] as Map<String, dynamic>),
  homeworkPhoto: json['homeworkPhoto'] == null
      ? null
      : HomeworkPhoto.fromJson(json['homeworkPhoto'] as Map<String, dynamic>),
  canSendHomework: json['canSendHomework'] as bool? ?? false,
);

Map<String, dynamic> _$HubDayToJson(_HubDay instance) => <String, dynamic>{
  'date': instance.date,
  'classroomId': instance.classroomId,
  'classroomName': instance.classroomName,
  'startMinute': instance.startMinute,
  'endMinute': instance.endMinute,
  'room': instance.room,
  'topic': instance.topic,
  'teachers': instance.teachers,
  'problemNumbers': instance.problemNumbers,
  'tests': instance.tests,
  'attendance': instance.attendance,
  'homework': instance.homework,
  'theory': instance.theory,
  'homeworkPhoto': instance.homeworkPhoto,
  'canSendHomework': instance.canSendHomework,
};

_HubDayTest _$HubDayTestFromJson(Map<String, dynamic> json) => _HubDayTest(
  testId: json['testId'] as String?,
  title: json['title'] as String,
  variant: json['variant'] as String?,
  open: json['open'] as bool? ?? false,
  closedReason: $enumDecodeNullable(
    _$TestClosedReasonEnumMap,
    json['closedReason'],
    unknownValue: JsonKey.nullForUndefinedEnumValue,
  ),
);

Map<String, dynamic> _$HubDayTestToJson(_HubDayTest instance) =>
    <String, dynamic>{
      'testId': instance.testId,
      'title': instance.title,
      'variant': instance.variant,
      'open': instance.open,
      'closedReason': _$TestClosedReasonEnumMap[instance.closedReason],
    };

const _$TestClosedReasonEnumMap = {
  TestClosedReason.tomorrow: 'TOMORROW',
  TestClosedReason.notAvailable: 'NOT_AVAILABLE',
};

_DayAttendance _$DayAttendanceFromJson(Map<String, dynamic> json) =>
    _DayAttendance(
      status: $enumDecodeNullable(
        _$AttendanceStatusEnumMap,
        json['status'],
        unknownValue: JsonKey.nullForUndefinedEnumValue,
      ),
      lateRange: $enumDecodeNullable(
        _$LateRangeEnumMap,
        json['lateRange'],
        unknownValue: JsonKey.nullForUndefinedEnumValue,
      ),
    );

Map<String, dynamic> _$DayAttendanceToJson(_DayAttendance instance) =>
    <String, dynamic>{
      'status': _$AttendanceStatusEnumMap[instance.status],
      'lateRange': _$LateRangeEnumMap[instance.lateRange],
    };

const _$AttendanceStatusEnumMap = {
  AttendanceStatus.present: 'PRESENT',
  AttendanceStatus.late: 'LATE',
  AttendanceStatus.absent: 'ABSENT',
  AttendanceStatus.excused: 'EXCUSED',
};

const _$LateRangeEnumMap = {
  LateRange.fiveToTen: 'FIVE_TO_TEN',
  LateRange.tenToThirty: 'TEN_TO_THIRTY',
  LateRange.thirtyToSixty: 'THIRTY_TO_SIXTY',
  LateRange.overOneHour: 'OVER_ONE_HOUR',
};

_DayHomework _$DayHomeworkFromJson(Map<String, dynamic> json) => _DayHomework(
  status: $enumDecodeNullable(
    _$HomeworkStatusEnumMap,
    json['status'],
    unknownValue: JsonKey.nullForUndefinedEnumValue,
  ),
  comment: json['comment'] as String?,
  checkedOn: json['checkedOn'] as String?,
  quiz: json['quiz'] == null
      ? null
      : HubQuiz.fromJson(json['quiz'] as Map<String, dynamic>),
);

Map<String, dynamic> _$DayHomeworkToJson(_DayHomework instance) =>
    <String, dynamic>{
      'status': _$HomeworkStatusEnumMap[instance.status],
      'comment': instance.comment,
      'checkedOn': instance.checkedOn,
      'quiz': instance.quiz,
    };

_HubQuiz _$HubQuizFromJson(Map<String, dynamic> json) => _HubQuiz(
  score: (json['score'] as num).toDouble(),
  problemCount: (json['problemCount'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$HubQuizToJson(_HubQuiz instance) => <String, dynamic>{
  'score': instance.score,
  'problemCount': instance.problemCount,
};

_DayTheory _$DayTheoryFromJson(Map<String, dynamic> json) => _DayTheory(
  count: (json['count'] as num?)?.toInt() ?? 0,
  mine: json['mine'] as bool? ?? false,
  canUpload: json['canUpload'] as bool? ?? false,
  assignedToMe: json['assignedToMe'] as bool? ?? false,
);

Map<String, dynamic> _$DayTheoryToJson(_DayTheory instance) =>
    <String, dynamic>{
      'count': instance.count,
      'mine': instance.mine,
      'canUpload': instance.canUpload,
      'assignedToMe': instance.assignedToMe,
    };

_HomeworkPhoto _$HomeworkPhotoFromJson(Map<String, dynamic> json) =>
    _HomeworkPhoto(
      id: json['id'] as String,
      fileKey: json['fileKey'] as String,
      pages: (json['pages'] as num?)?.toInt() ?? 1,
      uploadedAt: json['uploadedAt'] as String,
    );

Map<String, dynamic> _$HomeworkPhotoToJson(_HomeworkPhoto instance) =>
    <String, dynamic>{
      'id': instance.id,
      'fileKey': instance.fileKey,
      'pages': instance.pages,
      'uploadedAt': instance.uploadedAt,
    };

_HubTestRow _$HubTestRowFromJson(Map<String, dynamic> json) => _HubTestRow(
  testId: json['testId'] as String?,
  title: json['title'] as String,
  variant: json['variant'] as String?,
  date: json['date'] as String,
  classroomName: json['classroomName'] as String? ?? '',
  problemCount: (json['problemCount'] as num?)?.toInt() ?? 0,
  open: json['open'] as bool? ?? false,
  closedReason: $enumDecodeNullable(
    _$TestClosedReasonEnumMap,
    json['closedReason'],
    unknownValue: JsonKey.nullForUndefinedEnumValue,
  ),
);

Map<String, dynamic> _$HubTestRowToJson(_HubTestRow instance) =>
    <String, dynamic>{
      'testId': instance.testId,
      'title': instance.title,
      'variant': instance.variant,
      'date': instance.date,
      'classroomName': instance.classroomName,
      'problemCount': instance.problemCount,
      'open': instance.open,
      'closedReason': _$TestClosedReasonEnumMap[instance.closedReason],
    };

_HubTestDetail _$HubTestDetailFromJson(Map<String, dynamic> json) =>
    _HubTestDetail(
      testId: json['testId'] as String,
      title: json['title'] as String,
      variant: json['variant'] as String?,
      date: json['date'] as String,
      answersHidden: json['answersHidden'] as bool? ?? false,
      problems:
          (json['problems'] as List<dynamic>?)
              ?.map((e) => HubProblem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <HubProblem>[],
    );

Map<String, dynamic> _$HubTestDetailToJson(_HubTestDetail instance) =>
    <String, dynamic>{
      'testId': instance.testId,
      'title': instance.title,
      'variant': instance.variant,
      'date': instance.date,
      'answersHidden': instance.answersHidden,
      'problems': instance.problems,
    };

_HubProblem _$HubProblemFromJson(Map<String, dynamic> json) => _HubProblem(
  id: json['id'] as String,
  order: (json['order'] as num?)?.toInt() ?? 0,
  stem: json['stem'] as String?,
  imageKey: json['imageKey'] as String?,
  choices:
      (json['choices'] as List<dynamic>?)
          ?.map((e) => HubChoice.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <HubChoice>[],
  correctAnswer: json['correctAnswer'] as String?,
  hasVideo: json['hasVideo'] as bool? ?? false,
);

Map<String, dynamic> _$HubProblemToJson(_HubProblem instance) =>
    <String, dynamic>{
      'id': instance.id,
      'order': instance.order,
      'stem': instance.stem,
      'imageKey': instance.imageKey,
      'choices': instance.choices,
      'correctAnswer': instance.correctAnswer,
      'hasVideo': instance.hasVideo,
    };

_HubChoice _$HubChoiceFromJson(Map<String, dynamic> json) => _HubChoice(
  label: json['label'] as String,
  text: json['text'] as String? ?? '',
  imageKey: json['imageKey'] as String?,
);

Map<String, dynamic> _$HubChoiceToJson(_HubChoice instance) =>
    <String, dynamic>{
      'label': instance.label,
      'text': instance.text,
      'imageKey': instance.imageKey,
    };

_AttendanceRow _$AttendanceRowFromJson(Map<String, dynamic> json) =>
    _AttendanceRow(
      date: json['date'] as String,
      status: $enumDecodeNullable(
        _$AttendanceStatusEnumMap,
        json['status'],
        unknownValue: JsonKey.nullForUndefinedEnumValue,
      ),
      lateRange: $enumDecodeNullable(
        _$LateRangeEnumMap,
        json['lateRange'],
        unknownValue: JsonKey.nullForUndefinedEnumValue,
      ),
      classroom: json['classroom'] == null
          ? null
          : HubClassroom.fromJson(json['classroom'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$AttendanceRowToJson(_AttendanceRow instance) =>
    <String, dynamic>{
      'date': instance.date,
      'status': _$AttendanceStatusEnumMap[instance.status],
      'lateRange': _$LateRangeEnumMap[instance.lateRange],
      'classroom': instance.classroom,
    };

_MakeupItem _$MakeupItemFromJson(Map<String, dynamic> json) => _MakeupItem(
  classroomId: json['classroomId'] as String,
  classroomName: json['classroomName'] as String? ?? '',
  date: json['date'] as String,
  reason:
      $enumDecodeNullable(
        _$MakeupReasonEnumMap,
        json['reason'],
        unknownValue: MakeupReason.absent,
      ) ??
      MakeupReason.absent,
  status:
      $enumDecodeNullable(
        _$MakeupStatusEnumMap,
        json['status'],
        unknownValue: MakeupStatus.pending,
      ) ??
      MakeupStatus.pending,
  photos: (json['photos'] as num?)?.toInt() ?? 0,
  imageKeys:
      (json['imageKeys'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const <String>[],
  submittedAt: json['submittedAt'] as String?,
  resubmit: json['resubmit'] as bool? ?? false,
  photosAccepted: json['photosAccepted'] as bool? ?? false,
  tests:
      (json['tests'] as List<dynamic>?)
          ?.map((e) => MakeupTest.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <MakeupTest>[],
);

Map<String, dynamic> _$MakeupItemToJson(_MakeupItem instance) =>
    <String, dynamic>{
      'classroomId': instance.classroomId,
      'classroomName': instance.classroomName,
      'date': instance.date,
      'reason': _$MakeupReasonEnumMap[instance.reason]!,
      'status': _$MakeupStatusEnumMap[instance.status]!,
      'photos': instance.photos,
      'imageKeys': instance.imageKeys,
      'submittedAt': instance.submittedAt,
      'resubmit': instance.resubmit,
      'photosAccepted': instance.photosAccepted,
      'tests': instance.tests,
    };

const _$MakeupReasonEnumMap = {
  MakeupReason.absent: 'ABSENT',
  MakeupReason.excused: 'EXCUSED',
  MakeupReason.late: 'LATE',
};

const _$MakeupStatusEnumMap = {
  MakeupStatus.pending: 'PENDING',
  MakeupStatus.partial: 'PARTIAL',
  MakeupStatus.done: 'DONE',
  MakeupStatus.waived: 'WAIVED',
};

_MakeupTest _$MakeupTestFromJson(Map<String, dynamic> json) => _MakeupTest(
  testId: json['testId'] as String,
  title: json['title'] as String,
  variant: json['variant'] as String?,
  done: json['done'] as bool? ?? false,
  inClass: json['inClass'] as bool? ?? false,
  online: json['online'] as bool? ?? true,
  open: json['open'] as bool? ?? false,
);

Map<String, dynamic> _$MakeupTestToJson(_MakeupTest instance) =>
    <String, dynamic>{
      'testId': instance.testId,
      'title': instance.title,
      'variant': instance.variant,
      'done': instance.done,
      'inClass': instance.inClass,
      'online': instance.online,
      'open': instance.open,
    };

_TheoryDay _$TheoryDayFromJson(Map<String, dynamic> json) => _TheoryDay(
  classroomId: json['classroomId'] as String,
  classroomName: json['classroomName'] as String? ?? '',
  date: json['date'] as String,
  upcoming: json['upcoming'] as bool? ?? false,
  topic: json['topic'] as String?,
  uploader: json['uploader'] == null
      ? null
      : TheoryUploader.fromJson(json['uploader'] as Map<String, dynamic>),
  canUpload: json['canUpload'] as bool? ?? false,
  assignedToMe: json['assignedToMe'] as bool? ?? false,
  photos:
      (json['photos'] as List<dynamic>?)
          ?.map((e) => TheoryPhotoSet.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <TheoryPhotoSet>[],
);

Map<String, dynamic> _$TheoryDayToJson(_TheoryDay instance) =>
    <String, dynamic>{
      'classroomId': instance.classroomId,
      'classroomName': instance.classroomName,
      'date': instance.date,
      'upcoming': instance.upcoming,
      'topic': instance.topic,
      'uploader': instance.uploader,
      'canUpload': instance.canUpload,
      'assignedToMe': instance.assignedToMe,
      'photos': instance.photos,
    };

_TheoryUploader _$TheoryUploaderFromJson(Map<String, dynamic> json) =>
    _TheoryUploader(
      name: json['name'] as String? ?? 'Сурагч',
      isMe: json['isMe'] as bool? ?? false,
    );

Map<String, dynamic> _$TheoryUploaderToJson(_TheoryUploader instance) =>
    <String, dynamic>{'name': instance.name, 'isMe': instance.isMe};

_TheoryPhotoSet _$TheoryPhotoSetFromJson(Map<String, dynamic> json) =>
    _TheoryPhotoSet(
      id: json['id'] as String,
      uploaderName: json['uploaderName'] as String? ?? '',
      isMine: json['isMine'] as bool? ?? false,
      isAssigned: json['isAssigned'] as bool? ?? false,
      imageKeys:
          (json['imageKeys'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
      pages: (json['pages'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] as String?,
    );

Map<String, dynamic> _$TheoryPhotoSetToJson(_TheoryPhotoSet instance) =>
    <String, dynamic>{
      'id': instance.id,
      'uploaderName': instance.uploaderName,
      'isMine': instance.isMine,
      'isAssigned': instance.isAssigned,
      'imageKeys': instance.imageKeys,
      'pages': instance.pages,
      'createdAt': instance.createdAt,
    };

_Announcement _$AnnouncementFromJson(Map<String, dynamic> json) =>
    _Announcement(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      pinned: json['pinned'] as bool? ?? false,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$AnnouncementToJson(_Announcement instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'body': instance.body,
      'pinned': instance.pinned,
      'createdAt': instance.createdAt,
    };

_MyClassroom _$MyClassroomFromJson(Map<String, dynamic> json) => _MyClassroom(
  id: json['id'] as String,
  name: json['name'] as String,
  type: json['type'] as String? ?? 'IN_PERSON',
  grade: (json['grade'] as num?)?.toInt(),
);

Map<String, dynamic> _$MyClassroomToJson(_MyClassroom instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'type': instance.type,
      'grade': instance.grade,
    };
