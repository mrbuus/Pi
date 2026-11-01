// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'weekly_report.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$WeeklyReport {

 ReportStudent get student; ReportWeek get week; ReportAttendance get attendance; List<ReportTest> get tests; bool get testResultsComplete; int? get testResultLimit; String? get snapshotAt; int get practiceCount; ReportHomework get homework; ReportTopics get topics; List<ReportLesson> get nextWeekSchedule;
/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WeeklyReportCopyWith<WeeklyReport> get copyWith => _$WeeklyReportCopyWithImpl<WeeklyReport>(this as WeeklyReport, _$identity);

  /// Serializes this WeeklyReport to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as WeeklyReport;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is WeeklyReport&&(identical(other.student, _this.student) || other.student == _this.student)&&(identical(other.week, _this.week) || other.week == _this.week)&&(identical(other.attendance, _this.attendance) || other.attendance == _this.attendance)&&const DeepCollectionEquality().equals(other.tests, _this.tests)&&(identical(other.testResultsComplete, _this.testResultsComplete) || other.testResultsComplete == _this.testResultsComplete)&&(identical(other.testResultLimit, _this.testResultLimit) || other.testResultLimit == _this.testResultLimit)&&(identical(other.snapshotAt, _this.snapshotAt) || other.snapshotAt == _this.snapshotAt)&&(identical(other.practiceCount, _this.practiceCount) || other.practiceCount == _this.practiceCount)&&(identical(other.homework, _this.homework) || other.homework == _this.homework)&&(identical(other.topics, _this.topics) || other.topics == _this.topics)&&const DeepCollectionEquality().equals(other.nextWeekSchedule, _this.nextWeekSchedule));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as WeeklyReport;
  return Object.hash(runtimeType,_this.student,_this.week,_this.attendance,const DeepCollectionEquality().hash(_this.tests),_this.testResultsComplete,_this.testResultLimit,_this.snapshotAt,_this.practiceCount,_this.homework,_this.topics,const DeepCollectionEquality().hash(_this.nextWeekSchedule));
}

@override
String toString() {
  final _this = this as WeeklyReport;
  return 'WeeklyReport(student: ${_this.student}, week: ${_this.week}, attendance: ${_this.attendance}, tests: ${_this.tests}, testResultsComplete: ${_this.testResultsComplete}, testResultLimit: ${_this.testResultLimit}, snapshotAt: ${_this.snapshotAt}, practiceCount: ${_this.practiceCount}, homework: ${_this.homework}, topics: ${_this.topics}, nextWeekSchedule: ${_this.nextWeekSchedule})';
}


}

/// @nodoc
abstract mixin class $WeeklyReportCopyWith<$Res>  {
  factory $WeeklyReportCopyWith(WeeklyReport value, $Res Function(WeeklyReport) _then) = _$WeeklyReportCopyWithImpl;
@useResult
$Res call({
 ReportStudent student, ReportWeek week, ReportAttendance attendance, List<ReportTest> tests, bool testResultsComplete, int? testResultLimit, String? snapshotAt, int practiceCount, ReportHomework homework, ReportTopics topics, List<ReportLesson> nextWeekSchedule
});


$ReportStudentCopyWith<$Res> get student;$ReportWeekCopyWith<$Res> get week;$ReportAttendanceCopyWith<$Res> get attendance;$ReportHomeworkCopyWith<$Res> get homework;$ReportTopicsCopyWith<$Res> get topics;

}
/// @nodoc
class _$WeeklyReportCopyWithImpl<$Res>
    implements $WeeklyReportCopyWith<$Res> {
  _$WeeklyReportCopyWithImpl(this._self, this._then);

  final WeeklyReport _self;
  final $Res Function(WeeklyReport) _then;

/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? student = null,Object? week = null,Object? attendance = null,Object? tests = null,Object? testResultsComplete = null,Object? testResultLimit = freezed,Object? snapshotAt = freezed,Object? practiceCount = null,Object? homework = null,Object? topics = null,Object? nextWeekSchedule = null,}) {
  return _then(WeeklyReport(
student: null == student ? _self.student : student // ignore: cast_nullable_to_non_nullable
as ReportStudent,week: null == week ? _self.week : week // ignore: cast_nullable_to_non_nullable
as ReportWeek,attendance: null == attendance ? _self.attendance : attendance // ignore: cast_nullable_to_non_nullable
as ReportAttendance,tests: null == tests ? _self.tests : tests // ignore: cast_nullable_to_non_nullable
as List<ReportTest>,testResultsComplete: null == testResultsComplete ? _self.testResultsComplete : testResultsComplete // ignore: cast_nullable_to_non_nullable
as bool,testResultLimit: freezed == testResultLimit ? _self.testResultLimit : testResultLimit // ignore: cast_nullable_to_non_nullable
as int?,snapshotAt: freezed == snapshotAt ? _self.snapshotAt : snapshotAt // ignore: cast_nullable_to_non_nullable
as String?,practiceCount: null == practiceCount ? _self.practiceCount : practiceCount // ignore: cast_nullable_to_non_nullable
as int,homework: null == homework ? _self.homework : homework // ignore: cast_nullable_to_non_nullable
as ReportHomework,topics: null == topics ? _self.topics : topics // ignore: cast_nullable_to_non_nullable
as ReportTopics,nextWeekSchedule: null == nextWeekSchedule ? _self.nextWeekSchedule : nextWeekSchedule // ignore: cast_nullable_to_non_nullable
as List<ReportLesson>,
  ));
}
/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportStudentCopyWith<$Res> get student {
  
  return $ReportStudentCopyWith<$Res>(_self.student, (value) {
    return _then(_self.copyWith(student: value));
  });
}/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportWeekCopyWith<$Res> get week {
  
  return $ReportWeekCopyWith<$Res>(_self.week, (value) {
    return _then(_self.copyWith(week: value));
  });
}/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportAttendanceCopyWith<$Res> get attendance {
  
  return $ReportAttendanceCopyWith<$Res>(_self.attendance, (value) {
    return _then(_self.copyWith(attendance: value));
  });
}/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportHomeworkCopyWith<$Res> get homework {
  
  return $ReportHomeworkCopyWith<$Res>(_self.homework, (value) {
    return _then(_self.copyWith(homework: value));
  });
}/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportTopicsCopyWith<$Res> get topics {
  
  return $ReportTopicsCopyWith<$Res>(_self.topics, (value) {
    return _then(_self.copyWith(topics: value));
  });
}
}


/// Adds pattern-matching-related methods to [WeeklyReport].
extension WeeklyReportPatterns on WeeklyReport {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _WeeklyReport value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _WeeklyReport() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _WeeklyReport value)  $default,){
final _that = this;
switch (_that) {
case _WeeklyReport():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _WeeklyReport value)?  $default,){
final _that = this;
switch (_that) {
case _WeeklyReport() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( ReportStudent student,  ReportWeek week,  ReportAttendance attendance,  List<ReportTest> tests,  bool testResultsComplete,  int? testResultLimit,  String? snapshotAt,  int practiceCount,  ReportHomework homework,  ReportTopics topics,  List<ReportLesson> nextWeekSchedule)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _WeeklyReport() when $default != null:
return $default(_that.student,_that.week,_that.attendance,_that.tests,_that.testResultsComplete,_that.testResultLimit,_that.snapshotAt,_that.practiceCount,_that.homework,_that.topics,_that.nextWeekSchedule);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( ReportStudent student,  ReportWeek week,  ReportAttendance attendance,  List<ReportTest> tests,  bool testResultsComplete,  int? testResultLimit,  String? snapshotAt,  int practiceCount,  ReportHomework homework,  ReportTopics topics,  List<ReportLesson> nextWeekSchedule)  $default,) {final _that = this;
switch (_that) {
case _WeeklyReport():
return $default(_that.student,_that.week,_that.attendance,_that.tests,_that.testResultsComplete,_that.testResultLimit,_that.snapshotAt,_that.practiceCount,_that.homework,_that.topics,_that.nextWeekSchedule);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( ReportStudent student,  ReportWeek week,  ReportAttendance attendance,  List<ReportTest> tests,  bool testResultsComplete,  int? testResultLimit,  String? snapshotAt,  int practiceCount,  ReportHomework homework,  ReportTopics topics,  List<ReportLesson> nextWeekSchedule)?  $default,) {final _that = this;
switch (_that) {
case _WeeklyReport() when $default != null:
return $default(_that.student,_that.week,_that.attendance,_that.tests,_that.testResultsComplete,_that.testResultLimit,_that.snapshotAt,_that.practiceCount,_that.homework,_that.topics,_that.nextWeekSchedule);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _WeeklyReport implements WeeklyReport {
  const _WeeklyReport({this.student = const ReportStudent(), required this.week, this.attendance = const ReportAttendance(),  List<ReportTest> tests = const <ReportTest>[], this.testResultsComplete = true, this.testResultLimit, this.snapshotAt, this.practiceCount = 0, this.homework = const ReportHomework(), this.topics = const ReportTopics(),  List<ReportLesson> nextWeekSchedule = const <ReportLesson>[]}): _tests = tests,_nextWeekSchedule = nextWeekSchedule;
  factory _WeeklyReport.fromJson(Map<String, dynamic> json) => _$WeeklyReportFromJson(json);

@override@JsonKey() final  ReportStudent student;
@override final  ReportWeek week;
@override@JsonKey() final  ReportAttendance attendance;
 final  List<ReportTest> _tests;
@override@JsonKey() List<ReportTest> get tests {
  if (_tests is EqualUnmodifiableListView) return _tests;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tests);
}

@override@JsonKey() final  bool testResultsComplete;
@override final  int? testResultLimit;
@override final  String? snapshotAt;
@override@JsonKey() final  int practiceCount;
@override@JsonKey() final  ReportHomework homework;
@override@JsonKey() final  ReportTopics topics;
 final  List<ReportLesson> _nextWeekSchedule;
@override@JsonKey() List<ReportLesson> get nextWeekSchedule {
  if (_nextWeekSchedule is EqualUnmodifiableListView) return _nextWeekSchedule;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_nextWeekSchedule);
}


/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WeeklyReportCopyWith<_WeeklyReport> get copyWith => __$WeeklyReportCopyWithImpl<_WeeklyReport>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$WeeklyReportToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _WeeklyReport&&(identical(other.student, student) || other.student == student)&&(identical(other.week, week) || other.week == week)&&(identical(other.attendance, attendance) || other.attendance == attendance)&&const DeepCollectionEquality().equals(other.tests, _tests)&&(identical(other.testResultsComplete, testResultsComplete) || other.testResultsComplete == testResultsComplete)&&(identical(other.testResultLimit, testResultLimit) || other.testResultLimit == testResultLimit)&&(identical(other.snapshotAt, snapshotAt) || other.snapshotAt == snapshotAt)&&(identical(other.practiceCount, practiceCount) || other.practiceCount == practiceCount)&&(identical(other.homework, homework) || other.homework == homework)&&(identical(other.topics, topics) || other.topics == topics)&&const DeepCollectionEquality().equals(other.nextWeekSchedule, _nextWeekSchedule));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,student,week,attendance,const DeepCollectionEquality().hash(_tests),testResultsComplete,testResultLimit,snapshotAt,practiceCount,homework,topics,const DeepCollectionEquality().hash(_nextWeekSchedule));
}

@override
String toString() {
    return 'WeeklyReport(student: $student, week: $week, attendance: $attendance, tests: $tests, testResultsComplete: $testResultsComplete, testResultLimit: $testResultLimit, snapshotAt: $snapshotAt, practiceCount: $practiceCount, homework: $homework, topics: $topics, nextWeekSchedule: $nextWeekSchedule)';
}


}

/// @nodoc
abstract mixin class _$WeeklyReportCopyWith<$Res> implements $WeeklyReportCopyWith<$Res> {
  factory _$WeeklyReportCopyWith(_WeeklyReport value, $Res Function(_WeeklyReport) _then) = __$WeeklyReportCopyWithImpl;
@override @useResult
$Res call({
 ReportStudent student, ReportWeek week, ReportAttendance attendance, List<ReportTest> tests, bool testResultsComplete, int? testResultLimit, String? snapshotAt, int practiceCount, ReportHomework homework, ReportTopics topics, List<ReportLesson> nextWeekSchedule
});


@override $ReportStudentCopyWith<$Res> get student;@override $ReportWeekCopyWith<$Res> get week;@override $ReportAttendanceCopyWith<$Res> get attendance;@override $ReportHomeworkCopyWith<$Res> get homework;@override $ReportTopicsCopyWith<$Res> get topics;

}
/// @nodoc
class __$WeeklyReportCopyWithImpl<$Res>
    implements _$WeeklyReportCopyWith<$Res> {
  __$WeeklyReportCopyWithImpl(this._self, this._then);

  final _WeeklyReport _self;
  final $Res Function(_WeeklyReport) _then;

/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? student = null,Object? week = null,Object? attendance = null,Object? tests = null,Object? testResultsComplete = null,Object? testResultLimit = freezed,Object? snapshotAt = freezed,Object? practiceCount = null,Object? homework = null,Object? topics = null,Object? nextWeekSchedule = null,}) {
  return _then(_WeeklyReport(
student: null == student ? _self.student : student // ignore: cast_nullable_to_non_nullable
as ReportStudent,week: null == week ? _self.week : week // ignore: cast_nullable_to_non_nullable
as ReportWeek,attendance: null == attendance ? _self.attendance : attendance // ignore: cast_nullable_to_non_nullable
as ReportAttendance,tests: null == tests ? _self._tests : tests // ignore: cast_nullable_to_non_nullable
as List<ReportTest>,testResultsComplete: null == testResultsComplete ? _self.testResultsComplete : testResultsComplete // ignore: cast_nullable_to_non_nullable
as bool,testResultLimit: freezed == testResultLimit ? _self.testResultLimit : testResultLimit // ignore: cast_nullable_to_non_nullable
as int?,snapshotAt: freezed == snapshotAt ? _self.snapshotAt : snapshotAt // ignore: cast_nullable_to_non_nullable
as String?,practiceCount: null == practiceCount ? _self.practiceCount : practiceCount // ignore: cast_nullable_to_non_nullable
as int,homework: null == homework ? _self.homework : homework // ignore: cast_nullable_to_non_nullable
as ReportHomework,topics: null == topics ? _self.topics : topics // ignore: cast_nullable_to_non_nullable
as ReportTopics,nextWeekSchedule: null == nextWeekSchedule ? _self._nextWeekSchedule : nextWeekSchedule // ignore: cast_nullable_to_non_nullable
as List<ReportLesson>,
  ));
}

/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportStudentCopyWith<$Res> get student {
  
  return $ReportStudentCopyWith<$Res>(_self.student, (value) {
    return _then(_self.copyWith(student: value));
  });
}/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportWeekCopyWith<$Res> get week {
  
  return $ReportWeekCopyWith<$Res>(_self.week, (value) {
    return _then(_self.copyWith(week: value));
  });
}/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportAttendanceCopyWith<$Res> get attendance {
  
  return $ReportAttendanceCopyWith<$Res>(_self.attendance, (value) {
    return _then(_self.copyWith(attendance: value));
  });
}/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportHomeworkCopyWith<$Res> get homework {
  
  return $ReportHomeworkCopyWith<$Res>(_self.homework, (value) {
    return _then(_self.copyWith(homework: value));
  });
}/// Create a copy of WeeklyReport
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportTopicsCopyWith<$Res> get topics {
  
  return $ReportTopicsCopyWith<$Res>(_self.topics, (value) {
    return _then(_self.copyWith(topics: value));
  });
}
}


/// @nodoc
mixin _$ReportStudent {

 String? get id; String get firstName; String get lastName;
/// Create a copy of ReportStudent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportStudentCopyWith<ReportStudent> get copyWith => _$ReportStudentCopyWithImpl<ReportStudent>(this as ReportStudent, _$identity);

  /// Serializes this ReportStudent to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ReportStudent;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportStudent&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.firstName, _this.firstName) || other.firstName == _this.firstName)&&(identical(other.lastName, _this.lastName) || other.lastName == _this.lastName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ReportStudent;
  return Object.hash(runtimeType,_this.id,_this.firstName,_this.lastName);
}

@override
String toString() {
  final _this = this as ReportStudent;
  return 'ReportStudent(id: ${_this.id}, firstName: ${_this.firstName}, lastName: ${_this.lastName})';
}


}

/// @nodoc
abstract mixin class $ReportStudentCopyWith<$Res>  {
  factory $ReportStudentCopyWith(ReportStudent value, $Res Function(ReportStudent) _then) = _$ReportStudentCopyWithImpl;
@useResult
$Res call({
 String? id, String firstName, String lastName
});




}
/// @nodoc
class _$ReportStudentCopyWithImpl<$Res>
    implements $ReportStudentCopyWith<$Res> {
  _$ReportStudentCopyWithImpl(this._self, this._then);

  final ReportStudent _self;
  final $Res Function(ReportStudent) _then;

/// Create a copy of ReportStudent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = freezed,Object? firstName = null,Object? lastName = null,}) {
  return _then(ReportStudent(
id: freezed == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String?,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: null == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ReportStudent].
extension ReportStudentPatterns on ReportStudent {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportStudent value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportStudent() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportStudent value)  $default,){
final _that = this;
switch (_that) {
case _ReportStudent():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportStudent value)?  $default,){
final _that = this;
switch (_that) {
case _ReportStudent() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? id,  String firstName,  String lastName)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportStudent() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? id,  String firstName,  String lastName)  $default,) {final _that = this;
switch (_that) {
case _ReportStudent():
return $default(_that.id,_that.firstName,_that.lastName);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? id,  String firstName,  String lastName)?  $default,) {final _that = this;
switch (_that) {
case _ReportStudent() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReportStudent implements ReportStudent {
  const _ReportStudent({this.id, this.firstName = '', this.lastName = ''});
  factory _ReportStudent.fromJson(Map<String, dynamic> json) => _$ReportStudentFromJson(json);

@override final  String? id;
@override@JsonKey() final  String firstName;
@override@JsonKey() final  String lastName;

/// Create a copy of ReportStudent
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportStudentCopyWith<_ReportStudent> get copyWith => __$ReportStudentCopyWithImpl<_ReportStudent>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReportStudentToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportStudent&&(identical(other.id, id) || other.id == id)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,firstName,lastName);
}

@override
String toString() {
    return 'ReportStudent(id: $id, firstName: $firstName, lastName: $lastName)';
}


}

/// @nodoc
abstract mixin class _$ReportStudentCopyWith<$Res> implements $ReportStudentCopyWith<$Res> {
  factory _$ReportStudentCopyWith(_ReportStudent value, $Res Function(_ReportStudent) _then) = __$ReportStudentCopyWithImpl;
@override @useResult
$Res call({
 String? id, String firstName, String lastName
});




}
/// @nodoc
class __$ReportStudentCopyWithImpl<$Res>
    implements _$ReportStudentCopyWith<$Res> {
  __$ReportStudentCopyWithImpl(this._self, this._then);

  final _ReportStudent _self;
  final $Res Function(_ReportStudent) _then;

/// Create a copy of ReportStudent
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = freezed,Object? firstName = null,Object? lastName = null,}) {
  return _then(_ReportStudent(
id: freezed == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String?,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: null == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$ReportWeek {

 String get start; String get end;
/// Create a copy of ReportWeek
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportWeekCopyWith<ReportWeek> get copyWith => _$ReportWeekCopyWithImpl<ReportWeek>(this as ReportWeek, _$identity);

  /// Serializes this ReportWeek to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ReportWeek;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportWeek&&(identical(other.start, _this.start) || other.start == _this.start)&&(identical(other.end, _this.end) || other.end == _this.end));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ReportWeek;
  return Object.hash(runtimeType,_this.start,_this.end);
}

@override
String toString() {
  final _this = this as ReportWeek;
  return 'ReportWeek(start: ${_this.start}, end: ${_this.end})';
}


}

/// @nodoc
abstract mixin class $ReportWeekCopyWith<$Res>  {
  factory $ReportWeekCopyWith(ReportWeek value, $Res Function(ReportWeek) _then) = _$ReportWeekCopyWithImpl;
@useResult
$Res call({
 String start, String end
});




}
/// @nodoc
class _$ReportWeekCopyWithImpl<$Res>
    implements $ReportWeekCopyWith<$Res> {
  _$ReportWeekCopyWithImpl(this._self, this._then);

  final ReportWeek _self;
  final $Res Function(ReportWeek) _then;

/// Create a copy of ReportWeek
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? start = null,Object? end = null,}) {
  return _then(ReportWeek(
start: null == start ? _self.start : start // ignore: cast_nullable_to_non_nullable
as String,end: null == end ? _self.end : end // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ReportWeek].
extension ReportWeekPatterns on ReportWeek {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportWeek value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportWeek() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportWeek value)  $default,){
final _that = this;
switch (_that) {
case _ReportWeek():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportWeek value)?  $default,){
final _that = this;
switch (_that) {
case _ReportWeek() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String start,  String end)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportWeek() when $default != null:
return $default(_that.start,_that.end);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String start,  String end)  $default,) {final _that = this;
switch (_that) {
case _ReportWeek():
return $default(_that.start,_that.end);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String start,  String end)?  $default,) {final _that = this;
switch (_that) {
case _ReportWeek() when $default != null:
return $default(_that.start,_that.end);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReportWeek implements ReportWeek {
  const _ReportWeek({required this.start, required this.end});
  factory _ReportWeek.fromJson(Map<String, dynamic> json) => _$ReportWeekFromJson(json);

@override final  String start;
@override final  String end;

/// Create a copy of ReportWeek
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportWeekCopyWith<_ReportWeek> get copyWith => __$ReportWeekCopyWithImpl<_ReportWeek>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReportWeekToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportWeek&&(identical(other.start, start) || other.start == start)&&(identical(other.end, end) || other.end == end));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,start,end);
}

@override
String toString() {
    return 'ReportWeek(start: $start, end: $end)';
}


}

/// @nodoc
abstract mixin class _$ReportWeekCopyWith<$Res> implements $ReportWeekCopyWith<$Res> {
  factory _$ReportWeekCopyWith(_ReportWeek value, $Res Function(_ReportWeek) _then) = __$ReportWeekCopyWithImpl;
@override @useResult
$Res call({
 String start, String end
});




}
/// @nodoc
class __$ReportWeekCopyWithImpl<$Res>
    implements _$ReportWeekCopyWith<$Res> {
  __$ReportWeekCopyWithImpl(this._self, this._then);

  final _ReportWeek _self;
  final $Res Function(_ReportWeek) _then;

/// Create a copy of ReportWeek
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? start = null,Object? end = null,}) {
  return _then(_ReportWeek(
start: null == start ? _self.start : start // ignore: cast_nullable_to_non_nullable
as String,end: null == end ? _self.end : end // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$ReportAttendance {

 int get present; int get absent; int get excused;
/// Create a copy of ReportAttendance
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportAttendanceCopyWith<ReportAttendance> get copyWith => _$ReportAttendanceCopyWithImpl<ReportAttendance>(this as ReportAttendance, _$identity);

  /// Serializes this ReportAttendance to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ReportAttendance;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportAttendance&&(identical(other.present, _this.present) || other.present == _this.present)&&(identical(other.absent, _this.absent) || other.absent == _this.absent)&&(identical(other.excused, _this.excused) || other.excused == _this.excused));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ReportAttendance;
  return Object.hash(runtimeType,_this.present,_this.absent,_this.excused);
}

@override
String toString() {
  final _this = this as ReportAttendance;
  return 'ReportAttendance(present: ${_this.present}, absent: ${_this.absent}, excused: ${_this.excused})';
}


}

/// @nodoc
abstract mixin class $ReportAttendanceCopyWith<$Res>  {
  factory $ReportAttendanceCopyWith(ReportAttendance value, $Res Function(ReportAttendance) _then) = _$ReportAttendanceCopyWithImpl;
@useResult
$Res call({
 int present, int absent, int excused
});




}
/// @nodoc
class _$ReportAttendanceCopyWithImpl<$Res>
    implements $ReportAttendanceCopyWith<$Res> {
  _$ReportAttendanceCopyWithImpl(this._self, this._then);

  final ReportAttendance _self;
  final $Res Function(ReportAttendance) _then;

/// Create a copy of ReportAttendance
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? present = null,Object? absent = null,Object? excused = null,}) {
  return _then(ReportAttendance(
present: null == present ? _self.present : present // ignore: cast_nullable_to_non_nullable
as int,absent: null == absent ? _self.absent : absent // ignore: cast_nullable_to_non_nullable
as int,excused: null == excused ? _self.excused : excused // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ReportAttendance].
extension ReportAttendancePatterns on ReportAttendance {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportAttendance value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportAttendance() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportAttendance value)  $default,){
final _that = this;
switch (_that) {
case _ReportAttendance():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportAttendance value)?  $default,){
final _that = this;
switch (_that) {
case _ReportAttendance() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int present,  int absent,  int excused)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportAttendance() when $default != null:
return $default(_that.present,_that.absent,_that.excused);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int present,  int absent,  int excused)  $default,) {final _that = this;
switch (_that) {
case _ReportAttendance():
return $default(_that.present,_that.absent,_that.excused);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int present,  int absent,  int excused)?  $default,) {final _that = this;
switch (_that) {
case _ReportAttendance() when $default != null:
return $default(_that.present,_that.absent,_that.excused);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReportAttendance implements ReportAttendance {
  const _ReportAttendance({this.present = 0, this.absent = 0, this.excused = 0});
  factory _ReportAttendance.fromJson(Map<String, dynamic> json) => _$ReportAttendanceFromJson(json);

@override@JsonKey() final  int present;
@override@JsonKey() final  int absent;
@override@JsonKey() final  int excused;

/// Create a copy of ReportAttendance
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportAttendanceCopyWith<_ReportAttendance> get copyWith => __$ReportAttendanceCopyWithImpl<_ReportAttendance>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReportAttendanceToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportAttendance&&(identical(other.present, present) || other.present == present)&&(identical(other.absent, absent) || other.absent == absent)&&(identical(other.excused, excused) || other.excused == excused));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,present,absent,excused);
}

@override
String toString() {
    return 'ReportAttendance(present: $present, absent: $absent, excused: $excused)';
}


}

/// @nodoc
abstract mixin class _$ReportAttendanceCopyWith<$Res> implements $ReportAttendanceCopyWith<$Res> {
  factory _$ReportAttendanceCopyWith(_ReportAttendance value, $Res Function(_ReportAttendance) _then) = __$ReportAttendanceCopyWithImpl;
@override @useResult
$Res call({
 int present, int absent, int excused
});




}
/// @nodoc
class __$ReportAttendanceCopyWithImpl<$Res>
    implements _$ReportAttendanceCopyWith<$Res> {
  __$ReportAttendanceCopyWithImpl(this._self, this._then);

  final _ReportAttendance _self;
  final $Res Function(_ReportAttendance) _then;

/// Create a copy of ReportAttendance
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? present = null,Object? absent = null,Object? excused = null,}) {
  return _then(_ReportAttendance(
present: null == present ? _self.present : present // ignore: cast_nullable_to_non_nullable
as int,absent: null == absent ? _self.absent : absent // ignore: cast_nullable_to_non_nullable
as int,excused: null == excused ? _self.excused : excused // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$ReportTest {

 String get title; num? get score; num? get maxScore; String? get createdAt;
/// Create a copy of ReportTest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportTestCopyWith<ReportTest> get copyWith => _$ReportTestCopyWithImpl<ReportTest>(this as ReportTest, _$identity);

  /// Serializes this ReportTest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ReportTest;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportTest&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.score, _this.score) || other.score == _this.score)&&(identical(other.maxScore, _this.maxScore) || other.maxScore == _this.maxScore)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ReportTest;
  return Object.hash(runtimeType,_this.title,_this.score,_this.maxScore,_this.createdAt);
}

@override
String toString() {
  final _this = this as ReportTest;
  return 'ReportTest(title: ${_this.title}, score: ${_this.score}, maxScore: ${_this.maxScore}, createdAt: ${_this.createdAt})';
}


}

/// @nodoc
abstract mixin class $ReportTestCopyWith<$Res>  {
  factory $ReportTestCopyWith(ReportTest value, $Res Function(ReportTest) _then) = _$ReportTestCopyWithImpl;
@useResult
$Res call({
 String title, num? score, num? maxScore, String? createdAt
});




}
/// @nodoc
class _$ReportTestCopyWithImpl<$Res>
    implements $ReportTestCopyWith<$Res> {
  _$ReportTestCopyWithImpl(this._self, this._then);

  final ReportTest _self;
  final $Res Function(ReportTest) _then;

/// Create a copy of ReportTest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? title = null,Object? score = freezed,Object? maxScore = freezed,Object? createdAt = freezed,}) {
  return _then(ReportTest(
title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,score: freezed == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as num?,maxScore: freezed == maxScore ? _self.maxScore : maxScore // ignore: cast_nullable_to_non_nullable
as num?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ReportTest].
extension ReportTestPatterns on ReportTest {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportTest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportTest() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportTest value)  $default,){
final _that = this;
switch (_that) {
case _ReportTest():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportTest value)?  $default,){
final _that = this;
switch (_that) {
case _ReportTest() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String title,  num? score,  num? maxScore,  String? createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportTest() when $default != null:
return $default(_that.title,_that.score,_that.maxScore,_that.createdAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String title,  num? score,  num? maxScore,  String? createdAt)  $default,) {final _that = this;
switch (_that) {
case _ReportTest():
return $default(_that.title,_that.score,_that.maxScore,_that.createdAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String title,  num? score,  num? maxScore,  String? createdAt)?  $default,) {final _that = this;
switch (_that) {
case _ReportTest() when $default != null:
return $default(_that.title,_that.score,_that.maxScore,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReportTest implements ReportTest {
  const _ReportTest({this.title = '', this.score, this.maxScore, this.createdAt});
  factory _ReportTest.fromJson(Map<String, dynamic> json) => _$ReportTestFromJson(json);

@override@JsonKey() final  String title;
@override final  num? score;
@override final  num? maxScore;
@override final  String? createdAt;

/// Create a copy of ReportTest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportTestCopyWith<_ReportTest> get copyWith => __$ReportTestCopyWithImpl<_ReportTest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReportTestToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportTest&&(identical(other.title, title) || other.title == title)&&(identical(other.score, score) || other.score == score)&&(identical(other.maxScore, maxScore) || other.maxScore == maxScore)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,title,score,maxScore,createdAt);
}

@override
String toString() {
    return 'ReportTest(title: $title, score: $score, maxScore: $maxScore, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$ReportTestCopyWith<$Res> implements $ReportTestCopyWith<$Res> {
  factory _$ReportTestCopyWith(_ReportTest value, $Res Function(_ReportTest) _then) = __$ReportTestCopyWithImpl;
@override @useResult
$Res call({
 String title, num? score, num? maxScore, String? createdAt
});




}
/// @nodoc
class __$ReportTestCopyWithImpl<$Res>
    implements _$ReportTestCopyWith<$Res> {
  __$ReportTestCopyWithImpl(this._self, this._then);

  final _ReportTest _self;
  final $Res Function(_ReportTest) _then;

/// Create a copy of ReportTest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? title = null,Object? score = freezed,Object? maxScore = freezed,Object? createdAt = freezed,}) {
  return _then(_ReportTest(
title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,score: freezed == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as num?,maxScore: freezed == maxScore ? _self.maxScore : maxScore // ignore: cast_nullable_to_non_nullable
as num?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ReportHomework {

 ReportAssignments get assignments; ReportDailyMarks get dailyMarks;
/// Create a copy of ReportHomework
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportHomeworkCopyWith<ReportHomework> get copyWith => _$ReportHomeworkCopyWithImpl<ReportHomework>(this as ReportHomework, _$identity);

  /// Serializes this ReportHomework to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ReportHomework;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportHomework&&(identical(other.assignments, _this.assignments) || other.assignments == _this.assignments)&&(identical(other.dailyMarks, _this.dailyMarks) || other.dailyMarks == _this.dailyMarks));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ReportHomework;
  return Object.hash(runtimeType,_this.assignments,_this.dailyMarks);
}

@override
String toString() {
  final _this = this as ReportHomework;
  return 'ReportHomework(assignments: ${_this.assignments}, dailyMarks: ${_this.dailyMarks})';
}


}

/// @nodoc
abstract mixin class $ReportHomeworkCopyWith<$Res>  {
  factory $ReportHomeworkCopyWith(ReportHomework value, $Res Function(ReportHomework) _then) = _$ReportHomeworkCopyWithImpl;
@useResult
$Res call({
 ReportAssignments assignments, ReportDailyMarks dailyMarks
});


$ReportAssignmentsCopyWith<$Res> get assignments;$ReportDailyMarksCopyWith<$Res> get dailyMarks;

}
/// @nodoc
class _$ReportHomeworkCopyWithImpl<$Res>
    implements $ReportHomeworkCopyWith<$Res> {
  _$ReportHomeworkCopyWithImpl(this._self, this._then);

  final ReportHomework _self;
  final $Res Function(ReportHomework) _then;

/// Create a copy of ReportHomework
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? assignments = null,Object? dailyMarks = null,}) {
  return _then(ReportHomework(
assignments: null == assignments ? _self.assignments : assignments // ignore: cast_nullable_to_non_nullable
as ReportAssignments,dailyMarks: null == dailyMarks ? _self.dailyMarks : dailyMarks // ignore: cast_nullable_to_non_nullable
as ReportDailyMarks,
  ));
}
/// Create a copy of ReportHomework
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportAssignmentsCopyWith<$Res> get assignments {
  
  return $ReportAssignmentsCopyWith<$Res>(_self.assignments, (value) {
    return _then(_self.copyWith(assignments: value));
  });
}/// Create a copy of ReportHomework
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportDailyMarksCopyWith<$Res> get dailyMarks {
  
  return $ReportDailyMarksCopyWith<$Res>(_self.dailyMarks, (value) {
    return _then(_self.copyWith(dailyMarks: value));
  });
}
}


/// Adds pattern-matching-related methods to [ReportHomework].
extension ReportHomeworkPatterns on ReportHomework {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportHomework value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportHomework() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportHomework value)  $default,){
final _that = this;
switch (_that) {
case _ReportHomework():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportHomework value)?  $default,){
final _that = this;
switch (_that) {
case _ReportHomework() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( ReportAssignments assignments,  ReportDailyMarks dailyMarks)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportHomework() when $default != null:
return $default(_that.assignments,_that.dailyMarks);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( ReportAssignments assignments,  ReportDailyMarks dailyMarks)  $default,) {final _that = this;
switch (_that) {
case _ReportHomework():
return $default(_that.assignments,_that.dailyMarks);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( ReportAssignments assignments,  ReportDailyMarks dailyMarks)?  $default,) {final _that = this;
switch (_that) {
case _ReportHomework() when $default != null:
return $default(_that.assignments,_that.dailyMarks);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReportHomework implements ReportHomework {
  const _ReportHomework({this.assignments = const ReportAssignments(), this.dailyMarks = const ReportDailyMarks()});
  factory _ReportHomework.fromJson(Map<String, dynamic> json) => _$ReportHomeworkFromJson(json);

@override@JsonKey() final  ReportAssignments assignments;
@override@JsonKey() final  ReportDailyMarks dailyMarks;

/// Create a copy of ReportHomework
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportHomeworkCopyWith<_ReportHomework> get copyWith => __$ReportHomeworkCopyWithImpl<_ReportHomework>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReportHomeworkToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportHomework&&(identical(other.assignments, assignments) || other.assignments == assignments)&&(identical(other.dailyMarks, dailyMarks) || other.dailyMarks == dailyMarks));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,assignments,dailyMarks);
}

@override
String toString() {
    return 'ReportHomework(assignments: $assignments, dailyMarks: $dailyMarks)';
}


}

/// @nodoc
abstract mixin class _$ReportHomeworkCopyWith<$Res> implements $ReportHomeworkCopyWith<$Res> {
  factory _$ReportHomeworkCopyWith(_ReportHomework value, $Res Function(_ReportHomework) _then) = __$ReportHomeworkCopyWithImpl;
@override @useResult
$Res call({
 ReportAssignments assignments, ReportDailyMarks dailyMarks
});


@override $ReportAssignmentsCopyWith<$Res> get assignments;@override $ReportDailyMarksCopyWith<$Res> get dailyMarks;

}
/// @nodoc
class __$ReportHomeworkCopyWithImpl<$Res>
    implements _$ReportHomeworkCopyWith<$Res> {
  __$ReportHomeworkCopyWithImpl(this._self, this._then);

  final _ReportHomework _self;
  final $Res Function(_ReportHomework) _then;

/// Create a copy of ReportHomework
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? assignments = null,Object? dailyMarks = null,}) {
  return _then(_ReportHomework(
assignments: null == assignments ? _self.assignments : assignments // ignore: cast_nullable_to_non_nullable
as ReportAssignments,dailyMarks: null == dailyMarks ? _self.dailyMarks : dailyMarks // ignore: cast_nullable_to_non_nullable
as ReportDailyMarks,
  ));
}

/// Create a copy of ReportHomework
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportAssignmentsCopyWith<$Res> get assignments {
  
  return $ReportAssignmentsCopyWith<$Res>(_self.assignments, (value) {
    return _then(_self.copyWith(assignments: value));
  });
}/// Create a copy of ReportHomework
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportDailyMarksCopyWith<$Res> get dailyMarks {
  
  return $ReportDailyMarksCopyWith<$Res>(_self.dailyMarks, (value) {
    return _then(_self.copyWith(dailyMarks: value));
  });
}
}


/// @nodoc
mixin _$ReportAssignments {

 int get done; int get notDone; List<ReportAssignmentItem> get items;
/// Create a copy of ReportAssignments
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportAssignmentsCopyWith<ReportAssignments> get copyWith => _$ReportAssignmentsCopyWithImpl<ReportAssignments>(this as ReportAssignments, _$identity);

  /// Serializes this ReportAssignments to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ReportAssignments;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportAssignments&&(identical(other.done, _this.done) || other.done == _this.done)&&(identical(other.notDone, _this.notDone) || other.notDone == _this.notDone)&&const DeepCollectionEquality().equals(other.items, _this.items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ReportAssignments;
  return Object.hash(runtimeType,_this.done,_this.notDone,const DeepCollectionEquality().hash(_this.items));
}

@override
String toString() {
  final _this = this as ReportAssignments;
  return 'ReportAssignments(done: ${_this.done}, notDone: ${_this.notDone}, items: ${_this.items})';
}


}

/// @nodoc
abstract mixin class $ReportAssignmentsCopyWith<$Res>  {
  factory $ReportAssignmentsCopyWith(ReportAssignments value, $Res Function(ReportAssignments) _then) = _$ReportAssignmentsCopyWithImpl;
@useResult
$Res call({
 int done, int notDone, List<ReportAssignmentItem> items
});




}
/// @nodoc
class _$ReportAssignmentsCopyWithImpl<$Res>
    implements $ReportAssignmentsCopyWith<$Res> {
  _$ReportAssignmentsCopyWithImpl(this._self, this._then);

  final ReportAssignments _self;
  final $Res Function(ReportAssignments) _then;

/// Create a copy of ReportAssignments
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? done = null,Object? notDone = null,Object? items = null,}) {
  return _then(ReportAssignments(
done: null == done ? _self.done : done // ignore: cast_nullable_to_non_nullable
as int,notDone: null == notDone ? _self.notDone : notDone // ignore: cast_nullable_to_non_nullable
as int,items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<ReportAssignmentItem>,
  ));
}

}


/// Adds pattern-matching-related methods to [ReportAssignments].
extension ReportAssignmentsPatterns on ReportAssignments {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportAssignments value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportAssignments() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportAssignments value)  $default,){
final _that = this;
switch (_that) {
case _ReportAssignments():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportAssignments value)?  $default,){
final _that = this;
switch (_that) {
case _ReportAssignments() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int done,  int notDone,  List<ReportAssignmentItem> items)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportAssignments() when $default != null:
return $default(_that.done,_that.notDone,_that.items);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int done,  int notDone,  List<ReportAssignmentItem> items)  $default,) {final _that = this;
switch (_that) {
case _ReportAssignments():
return $default(_that.done,_that.notDone,_that.items);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int done,  int notDone,  List<ReportAssignmentItem> items)?  $default,) {final _that = this;
switch (_that) {
case _ReportAssignments() when $default != null:
return $default(_that.done,_that.notDone,_that.items);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReportAssignments implements ReportAssignments {
  const _ReportAssignments({this.done = 0, this.notDone = 0,  List<ReportAssignmentItem> items = const <ReportAssignmentItem>[]}): _items = items;
  factory _ReportAssignments.fromJson(Map<String, dynamic> json) => _$ReportAssignmentsFromJson(json);

@override@JsonKey() final  int done;
@override@JsonKey() final  int notDone;
 final  List<ReportAssignmentItem> _items;
@override@JsonKey() List<ReportAssignmentItem> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}


/// Create a copy of ReportAssignments
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportAssignmentsCopyWith<_ReportAssignments> get copyWith => __$ReportAssignmentsCopyWithImpl<_ReportAssignments>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReportAssignmentsToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportAssignments&&(identical(other.done, done) || other.done == done)&&(identical(other.notDone, notDone) || other.notDone == notDone)&&const DeepCollectionEquality().equals(other.items, _items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,done,notDone,const DeepCollectionEquality().hash(_items));
}

@override
String toString() {
    return 'ReportAssignments(done: $done, notDone: $notDone, items: $items)';
}


}

/// @nodoc
abstract mixin class _$ReportAssignmentsCopyWith<$Res> implements $ReportAssignmentsCopyWith<$Res> {
  factory _$ReportAssignmentsCopyWith(_ReportAssignments value, $Res Function(_ReportAssignments) _then) = __$ReportAssignmentsCopyWithImpl;
@override @useResult
$Res call({
 int done, int notDone, List<ReportAssignmentItem> items
});




}
/// @nodoc
class __$ReportAssignmentsCopyWithImpl<$Res>
    implements _$ReportAssignmentsCopyWith<$Res> {
  __$ReportAssignmentsCopyWithImpl(this._self, this._then);

  final _ReportAssignments _self;
  final $Res Function(_ReportAssignments) _then;

/// Create a copy of ReportAssignments
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? done = null,Object? notDone = null,Object? items = null,}) {
  return _then(_ReportAssignments(
done: null == done ? _self.done : done // ignore: cast_nullable_to_non_nullable
as int,notDone: null == notDone ? _self.notDone : notDone // ignore: cast_nullable_to_non_nullable
as int,items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<ReportAssignmentItem>,
  ));
}


}


/// @nodoc
mixin _$ReportAssignmentItem {

 String get title; String? get dueDate; bool get done;
/// Create a copy of ReportAssignmentItem
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportAssignmentItemCopyWith<ReportAssignmentItem> get copyWith => _$ReportAssignmentItemCopyWithImpl<ReportAssignmentItem>(this as ReportAssignmentItem, _$identity);

  /// Serializes this ReportAssignmentItem to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ReportAssignmentItem;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportAssignmentItem&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.dueDate, _this.dueDate) || other.dueDate == _this.dueDate)&&(identical(other.done, _this.done) || other.done == _this.done));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ReportAssignmentItem;
  return Object.hash(runtimeType,_this.title,_this.dueDate,_this.done);
}

@override
String toString() {
  final _this = this as ReportAssignmentItem;
  return 'ReportAssignmentItem(title: ${_this.title}, dueDate: ${_this.dueDate}, done: ${_this.done})';
}


}

/// @nodoc
abstract mixin class $ReportAssignmentItemCopyWith<$Res>  {
  factory $ReportAssignmentItemCopyWith(ReportAssignmentItem value, $Res Function(ReportAssignmentItem) _then) = _$ReportAssignmentItemCopyWithImpl;
@useResult
$Res call({
 String title, String? dueDate, bool done
});




}
/// @nodoc
class _$ReportAssignmentItemCopyWithImpl<$Res>
    implements $ReportAssignmentItemCopyWith<$Res> {
  _$ReportAssignmentItemCopyWithImpl(this._self, this._then);

  final ReportAssignmentItem _self;
  final $Res Function(ReportAssignmentItem) _then;

/// Create a copy of ReportAssignmentItem
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? title = null,Object? dueDate = freezed,Object? done = null,}) {
  return _then(ReportAssignmentItem(
title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,dueDate: freezed == dueDate ? _self.dueDate : dueDate // ignore: cast_nullable_to_non_nullable
as String?,done: null == done ? _self.done : done // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [ReportAssignmentItem].
extension ReportAssignmentItemPatterns on ReportAssignmentItem {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportAssignmentItem value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportAssignmentItem() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportAssignmentItem value)  $default,){
final _that = this;
switch (_that) {
case _ReportAssignmentItem():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportAssignmentItem value)?  $default,){
final _that = this;
switch (_that) {
case _ReportAssignmentItem() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String title,  String? dueDate,  bool done)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportAssignmentItem() when $default != null:
return $default(_that.title,_that.dueDate,_that.done);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String title,  String? dueDate,  bool done)  $default,) {final _that = this;
switch (_that) {
case _ReportAssignmentItem():
return $default(_that.title,_that.dueDate,_that.done);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String title,  String? dueDate,  bool done)?  $default,) {final _that = this;
switch (_that) {
case _ReportAssignmentItem() when $default != null:
return $default(_that.title,_that.dueDate,_that.done);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReportAssignmentItem implements ReportAssignmentItem {
  const _ReportAssignmentItem({this.title = '', this.dueDate, this.done = false});
  factory _ReportAssignmentItem.fromJson(Map<String, dynamic> json) => _$ReportAssignmentItemFromJson(json);

@override@JsonKey() final  String title;
@override final  String? dueDate;
@override@JsonKey() final  bool done;

/// Create a copy of ReportAssignmentItem
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportAssignmentItemCopyWith<_ReportAssignmentItem> get copyWith => __$ReportAssignmentItemCopyWithImpl<_ReportAssignmentItem>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReportAssignmentItemToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportAssignmentItem&&(identical(other.title, title) || other.title == title)&&(identical(other.dueDate, dueDate) || other.dueDate == dueDate)&&(identical(other.done, done) || other.done == done));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,title,dueDate,done);
}

@override
String toString() {
    return 'ReportAssignmentItem(title: $title, dueDate: $dueDate, done: $done)';
}


}

/// @nodoc
abstract mixin class _$ReportAssignmentItemCopyWith<$Res> implements $ReportAssignmentItemCopyWith<$Res> {
  factory _$ReportAssignmentItemCopyWith(_ReportAssignmentItem value, $Res Function(_ReportAssignmentItem) _then) = __$ReportAssignmentItemCopyWithImpl;
@override @useResult
$Res call({
 String title, String? dueDate, bool done
});




}
/// @nodoc
class __$ReportAssignmentItemCopyWithImpl<$Res>
    implements _$ReportAssignmentItemCopyWith<$Res> {
  __$ReportAssignmentItemCopyWithImpl(this._self, this._then);

  final _ReportAssignmentItem _self;
  final $Res Function(_ReportAssignmentItem) _then;

/// Create a copy of ReportAssignmentItem
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? title = null,Object? dueDate = freezed,Object? done = null,}) {
  return _then(_ReportAssignmentItem(
title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,dueDate: freezed == dueDate ? _self.dueDate : dueDate // ignore: cast_nullable_to_non_nullable
as String?,done: null == done ? _self.done : done // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$ReportDailyMarks {

 int get done; int get partial; int get notDone; int get unmarked;
/// Create a copy of ReportDailyMarks
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportDailyMarksCopyWith<ReportDailyMarks> get copyWith => _$ReportDailyMarksCopyWithImpl<ReportDailyMarks>(this as ReportDailyMarks, _$identity);

  /// Serializes this ReportDailyMarks to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ReportDailyMarks;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportDailyMarks&&(identical(other.done, _this.done) || other.done == _this.done)&&(identical(other.partial, _this.partial) || other.partial == _this.partial)&&(identical(other.notDone, _this.notDone) || other.notDone == _this.notDone)&&(identical(other.unmarked, _this.unmarked) || other.unmarked == _this.unmarked));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ReportDailyMarks;
  return Object.hash(runtimeType,_this.done,_this.partial,_this.notDone,_this.unmarked);
}

@override
String toString() {
  final _this = this as ReportDailyMarks;
  return 'ReportDailyMarks(done: ${_this.done}, partial: ${_this.partial}, notDone: ${_this.notDone}, unmarked: ${_this.unmarked})';
}


}

/// @nodoc
abstract mixin class $ReportDailyMarksCopyWith<$Res>  {
  factory $ReportDailyMarksCopyWith(ReportDailyMarks value, $Res Function(ReportDailyMarks) _then) = _$ReportDailyMarksCopyWithImpl;
@useResult
$Res call({
 int done, int partial, int notDone, int unmarked
});




}
/// @nodoc
class _$ReportDailyMarksCopyWithImpl<$Res>
    implements $ReportDailyMarksCopyWith<$Res> {
  _$ReportDailyMarksCopyWithImpl(this._self, this._then);

  final ReportDailyMarks _self;
  final $Res Function(ReportDailyMarks) _then;

/// Create a copy of ReportDailyMarks
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? done = null,Object? partial = null,Object? notDone = null,Object? unmarked = null,}) {
  return _then(ReportDailyMarks(
done: null == done ? _self.done : done // ignore: cast_nullable_to_non_nullable
as int,partial: null == partial ? _self.partial : partial // ignore: cast_nullable_to_non_nullable
as int,notDone: null == notDone ? _self.notDone : notDone // ignore: cast_nullable_to_non_nullable
as int,unmarked: null == unmarked ? _self.unmarked : unmarked // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ReportDailyMarks].
extension ReportDailyMarksPatterns on ReportDailyMarks {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportDailyMarks value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportDailyMarks() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportDailyMarks value)  $default,){
final _that = this;
switch (_that) {
case _ReportDailyMarks():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportDailyMarks value)?  $default,){
final _that = this;
switch (_that) {
case _ReportDailyMarks() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int done,  int partial,  int notDone,  int unmarked)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportDailyMarks() when $default != null:
return $default(_that.done,_that.partial,_that.notDone,_that.unmarked);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int done,  int partial,  int notDone,  int unmarked)  $default,) {final _that = this;
switch (_that) {
case _ReportDailyMarks():
return $default(_that.done,_that.partial,_that.notDone,_that.unmarked);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int done,  int partial,  int notDone,  int unmarked)?  $default,) {final _that = this;
switch (_that) {
case _ReportDailyMarks() when $default != null:
return $default(_that.done,_that.partial,_that.notDone,_that.unmarked);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReportDailyMarks implements ReportDailyMarks {
  const _ReportDailyMarks({this.done = 0, this.partial = 0, this.notDone = 0, this.unmarked = 0});
  factory _ReportDailyMarks.fromJson(Map<String, dynamic> json) => _$ReportDailyMarksFromJson(json);

@override@JsonKey() final  int done;
@override@JsonKey() final  int partial;
@override@JsonKey() final  int notDone;
@override@JsonKey() final  int unmarked;

/// Create a copy of ReportDailyMarks
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportDailyMarksCopyWith<_ReportDailyMarks> get copyWith => __$ReportDailyMarksCopyWithImpl<_ReportDailyMarks>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReportDailyMarksToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportDailyMarks&&(identical(other.done, done) || other.done == done)&&(identical(other.partial, partial) || other.partial == partial)&&(identical(other.notDone, notDone) || other.notDone == notDone)&&(identical(other.unmarked, unmarked) || other.unmarked == unmarked));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,done,partial,notDone,unmarked);
}

@override
String toString() {
    return 'ReportDailyMarks(done: $done, partial: $partial, notDone: $notDone, unmarked: $unmarked)';
}


}

/// @nodoc
abstract mixin class _$ReportDailyMarksCopyWith<$Res> implements $ReportDailyMarksCopyWith<$Res> {
  factory _$ReportDailyMarksCopyWith(_ReportDailyMarks value, $Res Function(_ReportDailyMarks) _then) = __$ReportDailyMarksCopyWithImpl;
@override @useResult
$Res call({
 int done, int partial, int notDone, int unmarked
});




}
/// @nodoc
class __$ReportDailyMarksCopyWithImpl<$Res>
    implements _$ReportDailyMarksCopyWith<$Res> {
  __$ReportDailyMarksCopyWithImpl(this._self, this._then);

  final _ReportDailyMarks _self;
  final $Res Function(_ReportDailyMarks) _then;

/// Create a copy of ReportDailyMarks
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? done = null,Object? partial = null,Object? notDone = null,Object? unmarked = null,}) {
  return _then(_ReportDailyMarks(
done: null == done ? _self.done : done // ignore: cast_nullable_to_non_nullable
as int,partial: null == partial ? _self.partial : partial // ignore: cast_nullable_to_non_nullable
as int,notDone: null == notDone ? _self.notDone : notDone // ignore: cast_nullable_to_non_nullable
as int,unmarked: null == unmarked ? _self.unmarked : unmarked // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$ReportTopics {

 ReportTopic? get best; ReportTopic? get weakest; bool get complete; int? get sampleLimit;
/// Create a copy of ReportTopics
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportTopicsCopyWith<ReportTopics> get copyWith => _$ReportTopicsCopyWithImpl<ReportTopics>(this as ReportTopics, _$identity);

  /// Serializes this ReportTopics to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ReportTopics;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportTopics&&(identical(other.best, _this.best) || other.best == _this.best)&&(identical(other.weakest, _this.weakest) || other.weakest == _this.weakest)&&(identical(other.complete, _this.complete) || other.complete == _this.complete)&&(identical(other.sampleLimit, _this.sampleLimit) || other.sampleLimit == _this.sampleLimit));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ReportTopics;
  return Object.hash(runtimeType,_this.best,_this.weakest,_this.complete,_this.sampleLimit);
}

@override
String toString() {
  final _this = this as ReportTopics;
  return 'ReportTopics(best: ${_this.best}, weakest: ${_this.weakest}, complete: ${_this.complete}, sampleLimit: ${_this.sampleLimit})';
}


}

/// @nodoc
abstract mixin class $ReportTopicsCopyWith<$Res>  {
  factory $ReportTopicsCopyWith(ReportTopics value, $Res Function(ReportTopics) _then) = _$ReportTopicsCopyWithImpl;
@useResult
$Res call({
 ReportTopic? best, ReportTopic? weakest, bool complete, int? sampleLimit
});


$ReportTopicCopyWith<$Res>? get best;$ReportTopicCopyWith<$Res>? get weakest;

}
/// @nodoc
class _$ReportTopicsCopyWithImpl<$Res>
    implements $ReportTopicsCopyWith<$Res> {
  _$ReportTopicsCopyWithImpl(this._self, this._then);

  final ReportTopics _self;
  final $Res Function(ReportTopics) _then;

/// Create a copy of ReportTopics
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? best = freezed,Object? weakest = freezed,Object? complete = null,Object? sampleLimit = freezed,}) {
  return _then(ReportTopics(
best: freezed == best ? _self.best : best // ignore: cast_nullable_to_non_nullable
as ReportTopic?,weakest: freezed == weakest ? _self.weakest : weakest // ignore: cast_nullable_to_non_nullable
as ReportTopic?,complete: null == complete ? _self.complete : complete // ignore: cast_nullable_to_non_nullable
as bool,sampleLimit: freezed == sampleLimit ? _self.sampleLimit : sampleLimit // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}
/// Create a copy of ReportTopics
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportTopicCopyWith<$Res>? get best {
    if (_self.best == null) {
    return null;
  }

  return $ReportTopicCopyWith<$Res>(_self.best!, (value) {
    return _then(_self.copyWith(best: value));
  });
}/// Create a copy of ReportTopics
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportTopicCopyWith<$Res>? get weakest {
    if (_self.weakest == null) {
    return null;
  }

  return $ReportTopicCopyWith<$Res>(_self.weakest!, (value) {
    return _then(_self.copyWith(weakest: value));
  });
}
}


/// Adds pattern-matching-related methods to [ReportTopics].
extension ReportTopicsPatterns on ReportTopics {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportTopics value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportTopics() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportTopics value)  $default,){
final _that = this;
switch (_that) {
case _ReportTopics():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportTopics value)?  $default,){
final _that = this;
switch (_that) {
case _ReportTopics() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( ReportTopic? best,  ReportTopic? weakest,  bool complete,  int? sampleLimit)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportTopics() when $default != null:
return $default(_that.best,_that.weakest,_that.complete,_that.sampleLimit);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( ReportTopic? best,  ReportTopic? weakest,  bool complete,  int? sampleLimit)  $default,) {final _that = this;
switch (_that) {
case _ReportTopics():
return $default(_that.best,_that.weakest,_that.complete,_that.sampleLimit);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( ReportTopic? best,  ReportTopic? weakest,  bool complete,  int? sampleLimit)?  $default,) {final _that = this;
switch (_that) {
case _ReportTopics() when $default != null:
return $default(_that.best,_that.weakest,_that.complete,_that.sampleLimit);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReportTopics implements ReportTopics {
  const _ReportTopics({this.best, this.weakest, this.complete = true, this.sampleLimit});
  factory _ReportTopics.fromJson(Map<String, dynamic> json) => _$ReportTopicsFromJson(json);

@override final  ReportTopic? best;
@override final  ReportTopic? weakest;
@override@JsonKey() final  bool complete;
@override final  int? sampleLimit;

/// Create a copy of ReportTopics
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportTopicsCopyWith<_ReportTopics> get copyWith => __$ReportTopicsCopyWithImpl<_ReportTopics>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReportTopicsToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportTopics&&(identical(other.best, best) || other.best == best)&&(identical(other.weakest, weakest) || other.weakest == weakest)&&(identical(other.complete, complete) || other.complete == complete)&&(identical(other.sampleLimit, sampleLimit) || other.sampleLimit == sampleLimit));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,best,weakest,complete,sampleLimit);
}

@override
String toString() {
    return 'ReportTopics(best: $best, weakest: $weakest, complete: $complete, sampleLimit: $sampleLimit)';
}


}

/// @nodoc
abstract mixin class _$ReportTopicsCopyWith<$Res> implements $ReportTopicsCopyWith<$Res> {
  factory _$ReportTopicsCopyWith(_ReportTopics value, $Res Function(_ReportTopics) _then) = __$ReportTopicsCopyWithImpl;
@override @useResult
$Res call({
 ReportTopic? best, ReportTopic? weakest, bool complete, int? sampleLimit
});


@override $ReportTopicCopyWith<$Res>? get best;@override $ReportTopicCopyWith<$Res>? get weakest;

}
/// @nodoc
class __$ReportTopicsCopyWithImpl<$Res>
    implements _$ReportTopicsCopyWith<$Res> {
  __$ReportTopicsCopyWithImpl(this._self, this._then);

  final _ReportTopics _self;
  final $Res Function(_ReportTopics) _then;

/// Create a copy of ReportTopics
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? best = freezed,Object? weakest = freezed,Object? complete = null,Object? sampleLimit = freezed,}) {
  return _then(_ReportTopics(
best: freezed == best ? _self.best : best // ignore: cast_nullable_to_non_nullable
as ReportTopic?,weakest: freezed == weakest ? _self.weakest : weakest // ignore: cast_nullable_to_non_nullable
as ReportTopic?,complete: null == complete ? _self.complete : complete // ignore: cast_nullable_to_non_nullable
as bool,sampleLimit: freezed == sampleLimit ? _self.sampleLimit : sampleLimit // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

/// Create a copy of ReportTopics
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportTopicCopyWith<$Res>? get best {
    if (_self.best == null) {
    return null;
  }

  return $ReportTopicCopyWith<$Res>(_self.best!, (value) {
    return _then(_self.copyWith(best: value));
  });
}/// Create a copy of ReportTopics
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ReportTopicCopyWith<$Res>? get weakest {
    if (_self.weakest == null) {
    return null;
  }

  return $ReportTopicCopyWith<$Res>(_self.weakest!, (value) {
    return _then(_self.copyWith(weakest: value));
  });
}
}


/// @nodoc
mixin _$ReportTopic {

 String get topic; num get rate;
/// Create a copy of ReportTopic
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportTopicCopyWith<ReportTopic> get copyWith => _$ReportTopicCopyWithImpl<ReportTopic>(this as ReportTopic, _$identity);

  /// Serializes this ReportTopic to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ReportTopic;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportTopic&&(identical(other.topic, _this.topic) || other.topic == _this.topic)&&(identical(other.rate, _this.rate) || other.rate == _this.rate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ReportTopic;
  return Object.hash(runtimeType,_this.topic,_this.rate);
}

@override
String toString() {
  final _this = this as ReportTopic;
  return 'ReportTopic(topic: ${_this.topic}, rate: ${_this.rate})';
}


}

/// @nodoc
abstract mixin class $ReportTopicCopyWith<$Res>  {
  factory $ReportTopicCopyWith(ReportTopic value, $Res Function(ReportTopic) _then) = _$ReportTopicCopyWithImpl;
@useResult
$Res call({
 String topic, num rate
});




}
/// @nodoc
class _$ReportTopicCopyWithImpl<$Res>
    implements $ReportTopicCopyWith<$Res> {
  _$ReportTopicCopyWithImpl(this._self, this._then);

  final ReportTopic _self;
  final $Res Function(ReportTopic) _then;

/// Create a copy of ReportTopic
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? topic = null,Object? rate = null,}) {
  return _then(ReportTopic(
topic: null == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String,rate: null == rate ? _self.rate : rate // ignore: cast_nullable_to_non_nullable
as num,
  ));
}

}


/// Adds pattern-matching-related methods to [ReportTopic].
extension ReportTopicPatterns on ReportTopic {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportTopic value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportTopic() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportTopic value)  $default,){
final _that = this;
switch (_that) {
case _ReportTopic():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportTopic value)?  $default,){
final _that = this;
switch (_that) {
case _ReportTopic() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String topic,  num rate)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportTopic() when $default != null:
return $default(_that.topic,_that.rate);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String topic,  num rate)  $default,) {final _that = this;
switch (_that) {
case _ReportTopic():
return $default(_that.topic,_that.rate);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String topic,  num rate)?  $default,) {final _that = this;
switch (_that) {
case _ReportTopic() when $default != null:
return $default(_that.topic,_that.rate);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReportTopic implements ReportTopic {
  const _ReportTopic({required this.topic, this.rate = 0});
  factory _ReportTopic.fromJson(Map<String, dynamic> json) => _$ReportTopicFromJson(json);

@override final  String topic;
@override@JsonKey() final  num rate;

/// Create a copy of ReportTopic
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportTopicCopyWith<_ReportTopic> get copyWith => __$ReportTopicCopyWithImpl<_ReportTopic>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReportTopicToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportTopic&&(identical(other.topic, topic) || other.topic == topic)&&(identical(other.rate, rate) || other.rate == rate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,topic,rate);
}

@override
String toString() {
    return 'ReportTopic(topic: $topic, rate: $rate)';
}


}

/// @nodoc
abstract mixin class _$ReportTopicCopyWith<$Res> implements $ReportTopicCopyWith<$Res> {
  factory _$ReportTopicCopyWith(_ReportTopic value, $Res Function(_ReportTopic) _then) = __$ReportTopicCopyWithImpl;
@override @useResult
$Res call({
 String topic, num rate
});




}
/// @nodoc
class __$ReportTopicCopyWithImpl<$Res>
    implements _$ReportTopicCopyWith<$Res> {
  __$ReportTopicCopyWithImpl(this._self, this._then);

  final _ReportTopic _self;
  final $Res Function(_ReportTopic) _then;

/// Create a copy of ReportTopic
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? topic = null,Object? rate = null,}) {
  return _then(_ReportTopic(
topic: null == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String,rate: null == rate ? _self.rate : rate // ignore: cast_nullable_to_non_nullable
as num,
  ));
}


}


/// @nodoc
mixin _$ReportLesson {

 String get date; int get startMinute; int get endMinute; String? get room; String get classroom;
/// Create a copy of ReportLesson
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ReportLessonCopyWith<ReportLesson> get copyWith => _$ReportLessonCopyWithImpl<ReportLesson>(this as ReportLesson, _$identity);

  /// Serializes this ReportLesson to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ReportLesson;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ReportLesson&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.startMinute, _this.startMinute) || other.startMinute == _this.startMinute)&&(identical(other.endMinute, _this.endMinute) || other.endMinute == _this.endMinute)&&(identical(other.room, _this.room) || other.room == _this.room)&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ReportLesson;
  return Object.hash(runtimeType,_this.date,_this.startMinute,_this.endMinute,_this.room,_this.classroom);
}

@override
String toString() {
  final _this = this as ReportLesson;
  return 'ReportLesson(date: ${_this.date}, startMinute: ${_this.startMinute}, endMinute: ${_this.endMinute}, room: ${_this.room}, classroom: ${_this.classroom})';
}


}

/// @nodoc
abstract mixin class $ReportLessonCopyWith<$Res>  {
  factory $ReportLessonCopyWith(ReportLesson value, $Res Function(ReportLesson) _then) = _$ReportLessonCopyWithImpl;
@useResult
$Res call({
 String date, int startMinute, int endMinute, String? room, String classroom
});




}
/// @nodoc
class _$ReportLessonCopyWithImpl<$Res>
    implements $ReportLessonCopyWith<$Res> {
  _$ReportLessonCopyWithImpl(this._self, this._then);

  final ReportLesson _self;
  final $Res Function(ReportLesson) _then;

/// Create a copy of ReportLesson
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? startMinute = null,Object? endMinute = null,Object? room = freezed,Object? classroom = null,}) {
  return _then(ReportLesson(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ReportLesson].
extension ReportLessonPatterns on ReportLesson {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ReportLesson value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ReportLesson() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ReportLesson value)  $default,){
final _that = this;
switch (_that) {
case _ReportLesson():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ReportLesson value)?  $default,){
final _that = this;
switch (_that) {
case _ReportLesson() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  int startMinute,  int endMinute,  String? room,  String classroom)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ReportLesson() when $default != null:
return $default(_that.date,_that.startMinute,_that.endMinute,_that.room,_that.classroom);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  int startMinute,  int endMinute,  String? room,  String classroom)  $default,) {final _that = this;
switch (_that) {
case _ReportLesson():
return $default(_that.date,_that.startMinute,_that.endMinute,_that.room,_that.classroom);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  int startMinute,  int endMinute,  String? room,  String classroom)?  $default,) {final _that = this;
switch (_that) {
case _ReportLesson() when $default != null:
return $default(_that.date,_that.startMinute,_that.endMinute,_that.room,_that.classroom);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ReportLesson implements ReportLesson {
  const _ReportLesson({required this.date, this.startMinute = 0, this.endMinute = 0, this.room, this.classroom = ''});
  factory _ReportLesson.fromJson(Map<String, dynamic> json) => _$ReportLessonFromJson(json);

@override final  String date;
@override@JsonKey() final  int startMinute;
@override@JsonKey() final  int endMinute;
@override final  String? room;
@override@JsonKey() final  String classroom;

/// Create a copy of ReportLesson
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ReportLessonCopyWith<_ReportLesson> get copyWith => __$ReportLessonCopyWithImpl<_ReportLesson>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ReportLessonToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ReportLesson&&(identical(other.date, date) || other.date == date)&&(identical(other.startMinute, startMinute) || other.startMinute == startMinute)&&(identical(other.endMinute, endMinute) || other.endMinute == endMinute)&&(identical(other.room, room) || other.room == room)&&(identical(other.classroom, classroom) || other.classroom == classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,startMinute,endMinute,room,classroom);
}

@override
String toString() {
    return 'ReportLesson(date: $date, startMinute: $startMinute, endMinute: $endMinute, room: $room, classroom: $classroom)';
}


}

/// @nodoc
abstract mixin class _$ReportLessonCopyWith<$Res> implements $ReportLessonCopyWith<$Res> {
  factory _$ReportLessonCopyWith(_ReportLesson value, $Res Function(_ReportLesson) _then) = __$ReportLessonCopyWithImpl;
@override @useResult
$Res call({
 String date, int startMinute, int endMinute, String? room, String classroom
});




}
/// @nodoc
class __$ReportLessonCopyWithImpl<$Res>
    implements _$ReportLessonCopyWith<$Res> {
  __$ReportLessonCopyWithImpl(this._self, this._then);

  final _ReportLesson _self;
  final $Res Function(_ReportLesson) _then;

/// Create a copy of ReportLesson
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? startMinute = null,Object? endMinute = null,Object? room = freezed,Object? classroom = null,}) {
  return _then(_ReportLesson(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
