// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'teacher_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$BoardLesson {

 String get scheduleId; int get startMinute; int get endMinute; String? get room; String? get topic; String? get teacherName; String? get leadTeacher; String? get assistantTeacher; bool get mine;
/// Create a copy of BoardLesson
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BoardLessonCopyWith<BoardLesson> get copyWith => _$BoardLessonCopyWithImpl<BoardLesson>(this as BoardLesson, _$identity);

  /// Serializes this BoardLesson to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as BoardLesson;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BoardLesson&&(identical(other.scheduleId, _this.scheduleId) || other.scheduleId == _this.scheduleId)&&(identical(other.startMinute, _this.startMinute) || other.startMinute == _this.startMinute)&&(identical(other.endMinute, _this.endMinute) || other.endMinute == _this.endMinute)&&(identical(other.room, _this.room) || other.room == _this.room)&&(identical(other.topic, _this.topic) || other.topic == _this.topic)&&(identical(other.teacherName, _this.teacherName) || other.teacherName == _this.teacherName)&&(identical(other.leadTeacher, _this.leadTeacher) || other.leadTeacher == _this.leadTeacher)&&(identical(other.assistantTeacher, _this.assistantTeacher) || other.assistantTeacher == _this.assistantTeacher)&&(identical(other.mine, _this.mine) || other.mine == _this.mine));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as BoardLesson;
  return Object.hash(runtimeType,_this.scheduleId,_this.startMinute,_this.endMinute,_this.room,_this.topic,_this.teacherName,_this.leadTeacher,_this.assistantTeacher,_this.mine);
}

@override
String toString() {
  final _this = this as BoardLesson;
  return 'BoardLesson(scheduleId: ${_this.scheduleId}, startMinute: ${_this.startMinute}, endMinute: ${_this.endMinute}, room: ${_this.room}, topic: ${_this.topic}, teacherName: ${_this.teacherName}, leadTeacher: ${_this.leadTeacher}, assistantTeacher: ${_this.assistantTeacher}, mine: ${_this.mine})';
}


}

/// @nodoc
abstract mixin class $BoardLessonCopyWith<$Res>  {
  factory $BoardLessonCopyWith(BoardLesson value, $Res Function(BoardLesson) _then) = _$BoardLessonCopyWithImpl;
@useResult
$Res call({
 String scheduleId, int startMinute, int endMinute, String? room, String? topic, String? teacherName, String? leadTeacher, String? assistantTeacher, bool mine
});




}
/// @nodoc
class _$BoardLessonCopyWithImpl<$Res>
    implements $BoardLessonCopyWith<$Res> {
  _$BoardLessonCopyWithImpl(this._self, this._then);

  final BoardLesson _self;
  final $Res Function(BoardLesson) _then;

/// Create a copy of BoardLesson
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? scheduleId = null,Object? startMinute = null,Object? endMinute = null,Object? room = freezed,Object? topic = freezed,Object? teacherName = freezed,Object? leadTeacher = freezed,Object? assistantTeacher = freezed,Object? mine = null,}) {
  return _then(BoardLesson(
scheduleId: null == scheduleId ? _self.scheduleId : scheduleId // ignore: cast_nullable_to_non_nullable
as String,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,topic: freezed == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String?,teacherName: freezed == teacherName ? _self.teacherName : teacherName // ignore: cast_nullable_to_non_nullable
as String?,leadTeacher: freezed == leadTeacher ? _self.leadTeacher : leadTeacher // ignore: cast_nullable_to_non_nullable
as String?,assistantTeacher: freezed == assistantTeacher ? _self.assistantTeacher : assistantTeacher // ignore: cast_nullable_to_non_nullable
as String?,mine: null == mine ? _self.mine : mine // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [BoardLesson].
extension BoardLessonPatterns on BoardLesson {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BoardLesson value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BoardLesson() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BoardLesson value)  $default,){
final _that = this;
switch (_that) {
case _BoardLesson():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BoardLesson value)?  $default,){
final _that = this;
switch (_that) {
case _BoardLesson() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String scheduleId,  int startMinute,  int endMinute,  String? room,  String? topic,  String? teacherName,  String? leadTeacher,  String? assistantTeacher,  bool mine)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BoardLesson() when $default != null:
return $default(_that.scheduleId,_that.startMinute,_that.endMinute,_that.room,_that.topic,_that.teacherName,_that.leadTeacher,_that.assistantTeacher,_that.mine);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String scheduleId,  int startMinute,  int endMinute,  String? room,  String? topic,  String? teacherName,  String? leadTeacher,  String? assistantTeacher,  bool mine)  $default,) {final _that = this;
switch (_that) {
case _BoardLesson():
return $default(_that.scheduleId,_that.startMinute,_that.endMinute,_that.room,_that.topic,_that.teacherName,_that.leadTeacher,_that.assistantTeacher,_that.mine);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String scheduleId,  int startMinute,  int endMinute,  String? room,  String? topic,  String? teacherName,  String? leadTeacher,  String? assistantTeacher,  bool mine)?  $default,) {final _that = this;
switch (_that) {
case _BoardLesson() when $default != null:
return $default(_that.scheduleId,_that.startMinute,_that.endMinute,_that.room,_that.topic,_that.teacherName,_that.leadTeacher,_that.assistantTeacher,_that.mine);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BoardLesson implements BoardLesson {
  const _BoardLesson({required this.scheduleId, required this.startMinute, required this.endMinute, this.room, this.topic, this.teacherName, this.leadTeacher, this.assistantTeacher, this.mine = false});
  factory _BoardLesson.fromJson(Map<String, dynamic> json) => _$BoardLessonFromJson(json);

@override final  String scheduleId;
@override final  int startMinute;
@override final  int endMinute;
@override final  String? room;
@override final  String? topic;
@override final  String? teacherName;
@override final  String? leadTeacher;
@override final  String? assistantTeacher;
@override@JsonKey() final  bool mine;

/// Create a copy of BoardLesson
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BoardLessonCopyWith<_BoardLesson> get copyWith => __$BoardLessonCopyWithImpl<_BoardLesson>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BoardLessonToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _BoardLesson&&(identical(other.scheduleId, scheduleId) || other.scheduleId == scheduleId)&&(identical(other.startMinute, startMinute) || other.startMinute == startMinute)&&(identical(other.endMinute, endMinute) || other.endMinute == endMinute)&&(identical(other.room, room) || other.room == room)&&(identical(other.topic, topic) || other.topic == topic)&&(identical(other.teacherName, teacherName) || other.teacherName == teacherName)&&(identical(other.leadTeacher, leadTeacher) || other.leadTeacher == leadTeacher)&&(identical(other.assistantTeacher, assistantTeacher) || other.assistantTeacher == assistantTeacher)&&(identical(other.mine, mine) || other.mine == mine));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,scheduleId,startMinute,endMinute,room,topic,teacherName,leadTeacher,assistantTeacher,mine);
}

@override
String toString() {
    return 'BoardLesson(scheduleId: $scheduleId, startMinute: $startMinute, endMinute: $endMinute, room: $room, topic: $topic, teacherName: $teacherName, leadTeacher: $leadTeacher, assistantTeacher: $assistantTeacher, mine: $mine)';
}


}

/// @nodoc
abstract mixin class _$BoardLessonCopyWith<$Res> implements $BoardLessonCopyWith<$Res> {
  factory _$BoardLessonCopyWith(_BoardLesson value, $Res Function(_BoardLesson) _then) = __$BoardLessonCopyWithImpl;
@override @useResult
$Res call({
 String scheduleId, int startMinute, int endMinute, String? room, String? topic, String? teacherName, String? leadTeacher, String? assistantTeacher, bool mine
});




}
/// @nodoc
class __$BoardLessonCopyWithImpl<$Res>
    implements _$BoardLessonCopyWith<$Res> {
  __$BoardLessonCopyWithImpl(this._self, this._then);

  final _BoardLesson _self;
  final $Res Function(_BoardLesson) _then;

/// Create a copy of BoardLesson
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? scheduleId = null,Object? startMinute = null,Object? endMinute = null,Object? room = freezed,Object? topic = freezed,Object? teacherName = freezed,Object? leadTeacher = freezed,Object? assistantTeacher = freezed,Object? mine = null,}) {
  return _then(_BoardLesson(
scheduleId: null == scheduleId ? _self.scheduleId : scheduleId // ignore: cast_nullable_to_non_nullable
as String,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,topic: freezed == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String?,teacherName: freezed == teacherName ? _self.teacherName : teacherName // ignore: cast_nullable_to_non_nullable
as String?,leadTeacher: freezed == leadTeacher ? _self.leadTeacher : leadTeacher // ignore: cast_nullable_to_non_nullable
as String?,assistantTeacher: freezed == assistantTeacher ? _self.assistantTeacher : assistantTeacher // ignore: cast_nullable_to_non_nullable
as String?,mine: null == mine ? _self.mine : mine // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$DayClass {

 String get id; String get name; String get type; int? get grade; int get studentCount; List<BoardLesson> get lessons;
/// Create a copy of DayClass
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DayClassCopyWith<DayClass> get copyWith => _$DayClassCopyWithImpl<DayClass>(this as DayClass, _$identity);

  /// Serializes this DayClass to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as DayClass;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DayClass&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.type, _this.type) || other.type == _this.type)&&(identical(other.grade, _this.grade) || other.grade == _this.grade)&&(identical(other.studentCount, _this.studentCount) || other.studentCount == _this.studentCount)&&const DeepCollectionEquality().equals(other.lessons, _this.lessons));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as DayClass;
  return Object.hash(runtimeType,_this.id,_this.name,_this.type,_this.grade,_this.studentCount,const DeepCollectionEquality().hash(_this.lessons));
}

@override
String toString() {
  final _this = this as DayClass;
  return 'DayClass(id: ${_this.id}, name: ${_this.name}, type: ${_this.type}, grade: ${_this.grade}, studentCount: ${_this.studentCount}, lessons: ${_this.lessons})';
}


}

/// @nodoc
abstract mixin class $DayClassCopyWith<$Res>  {
  factory $DayClassCopyWith(DayClass value, $Res Function(DayClass) _then) = _$DayClassCopyWithImpl;
@useResult
$Res call({
 String id, String name, String type, int? grade, int studentCount, List<BoardLesson> lessons
});




}
/// @nodoc
class _$DayClassCopyWithImpl<$Res>
    implements $DayClassCopyWith<$Res> {
  _$DayClassCopyWithImpl(this._self, this._then);

  final DayClass _self;
  final $Res Function(DayClass) _then;

/// Create a copy of DayClass
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? type = null,Object? grade = freezed,Object? studentCount = null,Object? lessons = null,}) {
  return _then(DayClass(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,studentCount: null == studentCount ? _self.studentCount : studentCount // ignore: cast_nullable_to_non_nullable
as int,lessons: null == lessons ? _self.lessons : lessons // ignore: cast_nullable_to_non_nullable
as List<BoardLesson>,
  ));
}

}


/// Adds pattern-matching-related methods to [DayClass].
extension DayClassPatterns on DayClass {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DayClass value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DayClass() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DayClass value)  $default,){
final _that = this;
switch (_that) {
case _DayClass():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DayClass value)?  $default,){
final _that = this;
switch (_that) {
case _DayClass() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String type,  int? grade,  int studentCount,  List<BoardLesson> lessons)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DayClass() when $default != null:
return $default(_that.id,_that.name,_that.type,_that.grade,_that.studentCount,_that.lessons);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String type,  int? grade,  int studentCount,  List<BoardLesson> lessons)  $default,) {final _that = this;
switch (_that) {
case _DayClass():
return $default(_that.id,_that.name,_that.type,_that.grade,_that.studentCount,_that.lessons);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String type,  int? grade,  int studentCount,  List<BoardLesson> lessons)?  $default,) {final _that = this;
switch (_that) {
case _DayClass() when $default != null:
return $default(_that.id,_that.name,_that.type,_that.grade,_that.studentCount,_that.lessons);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DayClass extends DayClass {
  const _DayClass({required this.id, required this.name, this.type = 'IN_PERSON', this.grade, this.studentCount = 0,  List<BoardLesson> lessons = const <BoardLesson>[]}): _lessons = lessons,super._();
  factory _DayClass.fromJson(Map<String, dynamic> json) => _$DayClassFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String type;
@override final  int? grade;
@override@JsonKey() final  int studentCount;
 final  List<BoardLesson> _lessons;
@override@JsonKey() List<BoardLesson> get lessons {
  if (_lessons is EqualUnmodifiableListView) return _lessons;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_lessons);
}


/// Create a copy of DayClass
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DayClassCopyWith<_DayClass> get copyWith => __$DayClassCopyWithImpl<_DayClass>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DayClassToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _DayClass&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.type, type) || other.type == type)&&(identical(other.grade, grade) || other.grade == grade)&&(identical(other.studentCount, studentCount) || other.studentCount == studentCount)&&const DeepCollectionEquality().equals(other.lessons, _lessons));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,type,grade,studentCount,const DeepCollectionEquality().hash(_lessons));
}

@override
String toString() {
    return 'DayClass(id: $id, name: $name, type: $type, grade: $grade, studentCount: $studentCount, lessons: $lessons)';
}


}

/// @nodoc
abstract mixin class _$DayClassCopyWith<$Res> implements $DayClassCopyWith<$Res> {
  factory _$DayClassCopyWith(_DayClass value, $Res Function(_DayClass) _then) = __$DayClassCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String type, int? grade, int studentCount, List<BoardLesson> lessons
});




}
/// @nodoc
class __$DayClassCopyWithImpl<$Res>
    implements _$DayClassCopyWith<$Res> {
  __$DayClassCopyWithImpl(this._self, this._then);

  final _DayClass _self;
  final $Res Function(_DayClass) _then;

/// Create a copy of DayClass
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? type = null,Object? grade = freezed,Object? studentCount = null,Object? lessons = null,}) {
  return _then(_DayClass(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,studentCount: null == studentCount ? _self.studentCount : studentCount // ignore: cast_nullable_to_non_nullable
as int,lessons: null == lessons ? _self._lessons : lessons // ignore: cast_nullable_to_non_nullable
as List<BoardLesson>,
  ));
}


}


/// @nodoc
mixin _$DayBoard {

 String get date; List<DayClass> get classes; DayClass? get selected;
/// Create a copy of DayBoard
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DayBoardCopyWith<DayBoard> get copyWith => _$DayBoardCopyWithImpl<DayBoard>(this as DayBoard, _$identity);

  /// Serializes this DayBoard to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as DayBoard;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DayBoard&&(identical(other.date, _this.date) || other.date == _this.date)&&const DeepCollectionEquality().equals(other.classes, _this.classes)&&(identical(other.selected, _this.selected) || other.selected == _this.selected));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as DayBoard;
  return Object.hash(runtimeType,_this.date,const DeepCollectionEquality().hash(_this.classes),_this.selected);
}

@override
String toString() {
  final _this = this as DayBoard;
  return 'DayBoard(date: ${_this.date}, classes: ${_this.classes}, selected: ${_this.selected})';
}


}

/// @nodoc
abstract mixin class $DayBoardCopyWith<$Res>  {
  factory $DayBoardCopyWith(DayBoard value, $Res Function(DayBoard) _then) = _$DayBoardCopyWithImpl;
@useResult
$Res call({
 String date, List<DayClass> classes, DayClass? selected
});


$DayClassCopyWith<$Res>? get selected;

}
/// @nodoc
class _$DayBoardCopyWithImpl<$Res>
    implements $DayBoardCopyWith<$Res> {
  _$DayBoardCopyWithImpl(this._self, this._then);

  final DayBoard _self;
  final $Res Function(DayBoard) _then;

/// Create a copy of DayBoard
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? classes = null,Object? selected = freezed,}) {
  return _then(DayBoard(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,classes: null == classes ? _self.classes : classes // ignore: cast_nullable_to_non_nullable
as List<DayClass>,selected: freezed == selected ? _self.selected : selected // ignore: cast_nullable_to_non_nullable
as DayClass?,
  ));
}
/// Create a copy of DayBoard
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DayClassCopyWith<$Res>? get selected {
    if (_self.selected == null) {
    return null;
  }

  return $DayClassCopyWith<$Res>(_self.selected!, (value) {
    return _then(_self.copyWith(selected: value));
  });
}
}


/// Adds pattern-matching-related methods to [DayBoard].
extension DayBoardPatterns on DayBoard {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DayBoard value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DayBoard() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DayBoard value)  $default,){
final _that = this;
switch (_that) {
case _DayBoard():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DayBoard value)?  $default,){
final _that = this;
switch (_that) {
case _DayBoard() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  List<DayClass> classes,  DayClass? selected)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DayBoard() when $default != null:
return $default(_that.date,_that.classes,_that.selected);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  List<DayClass> classes,  DayClass? selected)  $default,) {final _that = this;
switch (_that) {
case _DayBoard():
return $default(_that.date,_that.classes,_that.selected);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  List<DayClass> classes,  DayClass? selected)?  $default,) {final _that = this;
switch (_that) {
case _DayBoard() when $default != null:
return $default(_that.date,_that.classes,_that.selected);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DayBoard implements DayBoard {
  const _DayBoard({required this.date,  List<DayClass> classes = const <DayClass>[], this.selected}): _classes = classes;
  factory _DayBoard.fromJson(Map<String, dynamic> json) => _$DayBoardFromJson(json);

@override final  String date;
 final  List<DayClass> _classes;
@override@JsonKey() List<DayClass> get classes {
  if (_classes is EqualUnmodifiableListView) return _classes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_classes);
}

@override final  DayClass? selected;

/// Create a copy of DayBoard
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DayBoardCopyWith<_DayBoard> get copyWith => __$DayBoardCopyWithImpl<_DayBoard>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DayBoardToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _DayBoard&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other.classes, _classes)&&(identical(other.selected, selected) || other.selected == selected));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,const DeepCollectionEquality().hash(_classes),selected);
}

@override
String toString() {
    return 'DayBoard(date: $date, classes: $classes, selected: $selected)';
}


}

/// @nodoc
abstract mixin class _$DayBoardCopyWith<$Res> implements $DayBoardCopyWith<$Res> {
  factory _$DayBoardCopyWith(_DayBoard value, $Res Function(_DayBoard) _then) = __$DayBoardCopyWithImpl;
@override @useResult
$Res call({
 String date, List<DayClass> classes, DayClass? selected
});


@override $DayClassCopyWith<$Res>? get selected;

}
/// @nodoc
class __$DayBoardCopyWithImpl<$Res>
    implements _$DayBoardCopyWith<$Res> {
  __$DayBoardCopyWithImpl(this._self, this._then);

  final _DayBoard _self;
  final $Res Function(_DayBoard) _then;

/// Create a copy of DayBoard
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? classes = null,Object? selected = freezed,}) {
  return _then(_DayBoard(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,classes: null == classes ? _self._classes : classes // ignore: cast_nullable_to_non_nullable
as List<DayClass>,selected: freezed == selected ? _self.selected : selected // ignore: cast_nullable_to_non_nullable
as DayClass?,
  ));
}

/// Create a copy of DayBoard
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DayClassCopyWith<$Res>? get selected {
    if (_self.selected == null) {
    return null;
  }

  return $DayClassCopyWith<$Res>(_self.selected!, (value) {
    return _then(_self.copyWith(selected: value));
  });
}
}


/// @nodoc
mixin _$BoardStudent {

 String get id; String get firstName; String? get lastName; String? get code;
/// Create a copy of BoardStudent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BoardStudentCopyWith<BoardStudent> get copyWith => _$BoardStudentCopyWithImpl<BoardStudent>(this as BoardStudent, _$identity);

  /// Serializes this BoardStudent to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as BoardStudent;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BoardStudent&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.firstName, _this.firstName) || other.firstName == _this.firstName)&&(identical(other.lastName, _this.lastName) || other.lastName == _this.lastName)&&(identical(other.code, _this.code) || other.code == _this.code));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as BoardStudent;
  return Object.hash(runtimeType,_this.id,_this.firstName,_this.lastName,_this.code);
}

@override
String toString() {
  final _this = this as BoardStudent;
  return 'BoardStudent(id: ${_this.id}, firstName: ${_this.firstName}, lastName: ${_this.lastName}, code: ${_this.code})';
}


}

/// @nodoc
abstract mixin class $BoardStudentCopyWith<$Res>  {
  factory $BoardStudentCopyWith(BoardStudent value, $Res Function(BoardStudent) _then) = _$BoardStudentCopyWithImpl;
@useResult
$Res call({
 String id, String firstName, String? lastName, String? code
});




}
/// @nodoc
class _$BoardStudentCopyWithImpl<$Res>
    implements $BoardStudentCopyWith<$Res> {
  _$BoardStudentCopyWithImpl(this._self, this._then);

  final BoardStudent _self;
  final $Res Function(BoardStudent) _then;

/// Create a copy of BoardStudent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? firstName = null,Object? lastName = freezed,Object? code = freezed,}) {
  return _then(BoardStudent(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,code: freezed == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [BoardStudent].
extension BoardStudentPatterns on BoardStudent {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BoardStudent value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BoardStudent() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BoardStudent value)  $default,){
final _that = this;
switch (_that) {
case _BoardStudent():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BoardStudent value)?  $default,){
final _that = this;
switch (_that) {
case _BoardStudent() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String firstName,  String? lastName,  String? code)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BoardStudent() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName,_that.code);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String firstName,  String? lastName,  String? code)  $default,) {final _that = this;
switch (_that) {
case _BoardStudent():
return $default(_that.id,_that.firstName,_that.lastName,_that.code);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String firstName,  String? lastName,  String? code)?  $default,) {final _that = this;
switch (_that) {
case _BoardStudent() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName,_that.code);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BoardStudent implements BoardStudent {
  const _BoardStudent({required this.id, this.firstName = '', this.lastName, this.code});
  factory _BoardStudent.fromJson(Map<String, dynamic> json) => _$BoardStudentFromJson(json);

@override final  String id;
@override@JsonKey() final  String firstName;
@override final  String? lastName;
@override final  String? code;

/// Create a copy of BoardStudent
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BoardStudentCopyWith<_BoardStudent> get copyWith => __$BoardStudentCopyWithImpl<_BoardStudent>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BoardStudentToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _BoardStudent&&(identical(other.id, id) || other.id == id)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.code, code) || other.code == code));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,firstName,lastName,code);
}

@override
String toString() {
    return 'BoardStudent(id: $id, firstName: $firstName, lastName: $lastName, code: $code)';
}


}

/// @nodoc
abstract mixin class _$BoardStudentCopyWith<$Res> implements $BoardStudentCopyWith<$Res> {
  factory _$BoardStudentCopyWith(_BoardStudent value, $Res Function(_BoardStudent) _then) = __$BoardStudentCopyWithImpl;
@override @useResult
$Res call({
 String id, String firstName, String? lastName, String? code
});




}
/// @nodoc
class __$BoardStudentCopyWithImpl<$Res>
    implements _$BoardStudentCopyWith<$Res> {
  __$BoardStudentCopyWithImpl(this._self, this._then);

  final _BoardStudent _self;
  final $Res Function(_BoardStudent) _then;

/// Create a copy of BoardStudent
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? firstName = null,Object? lastName = freezed,Object? code = freezed,}) {
  return _then(_BoardStudent(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,code: freezed == code ? _self.code : code // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$AttRow {

 String get studentId;@AttStatusConverter() AttendanceStatus? get status; String? get note;@LateRangeConverter() LateRange? get lateRange; String? get markedBy;
/// Create a copy of AttRow
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AttRowCopyWith<AttRow> get copyWith => _$AttRowCopyWithImpl<AttRow>(this as AttRow, _$identity);

  /// Serializes this AttRow to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as AttRow;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AttRow&&(identical(other.studentId, _this.studentId) || other.studentId == _this.studentId)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.note, _this.note) || other.note == _this.note)&&(identical(other.lateRange, _this.lateRange) || other.lateRange == _this.lateRange)&&(identical(other.markedBy, _this.markedBy) || other.markedBy == _this.markedBy));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as AttRow;
  return Object.hash(runtimeType,_this.studentId,_this.status,_this.note,_this.lateRange,_this.markedBy);
}

@override
String toString() {
  final _this = this as AttRow;
  return 'AttRow(studentId: ${_this.studentId}, status: ${_this.status}, note: ${_this.note}, lateRange: ${_this.lateRange}, markedBy: ${_this.markedBy})';
}


}

/// @nodoc
abstract mixin class $AttRowCopyWith<$Res>  {
  factory $AttRowCopyWith(AttRow value, $Res Function(AttRow) _then) = _$AttRowCopyWithImpl;
@useResult
$Res call({
 String studentId,@AttStatusConverter() AttendanceStatus? status, String? note,@LateRangeConverter() LateRange? lateRange, String? markedBy
});




}
/// @nodoc
class _$AttRowCopyWithImpl<$Res>
    implements $AttRowCopyWith<$Res> {
  _$AttRowCopyWithImpl(this._self, this._then);

  final AttRow _self;
  final $Res Function(AttRow) _then;

/// Create a copy of AttRow
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? studentId = null,Object? status = freezed,Object? note = freezed,Object? lateRange = freezed,Object? markedBy = freezed,}) {
  return _then(AttRow(
studentId: null == studentId ? _self.studentId : studentId // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as AttendanceStatus?,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,lateRange: freezed == lateRange ? _self.lateRange : lateRange // ignore: cast_nullable_to_non_nullable
as LateRange?,markedBy: freezed == markedBy ? _self.markedBy : markedBy // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [AttRow].
extension AttRowPatterns on AttRow {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AttRow value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AttRow() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AttRow value)  $default,){
final _that = this;
switch (_that) {
case _AttRow():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AttRow value)?  $default,){
final _that = this;
switch (_that) {
case _AttRow() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String studentId, @AttStatusConverter()  AttendanceStatus? status,  String? note, @LateRangeConverter()  LateRange? lateRange,  String? markedBy)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AttRow() when $default != null:
return $default(_that.studentId,_that.status,_that.note,_that.lateRange,_that.markedBy);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String studentId, @AttStatusConverter()  AttendanceStatus? status,  String? note, @LateRangeConverter()  LateRange? lateRange,  String? markedBy)  $default,) {final _that = this;
switch (_that) {
case _AttRow():
return $default(_that.studentId,_that.status,_that.note,_that.lateRange,_that.markedBy);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String studentId, @AttStatusConverter()  AttendanceStatus? status,  String? note, @LateRangeConverter()  LateRange? lateRange,  String? markedBy)?  $default,) {final _that = this;
switch (_that) {
case _AttRow() when $default != null:
return $default(_that.studentId,_that.status,_that.note,_that.lateRange,_that.markedBy);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AttRow implements AttRow {
  const _AttRow({required this.studentId, @AttStatusConverter() this.status, this.note, @LateRangeConverter() this.lateRange, this.markedBy});
  factory _AttRow.fromJson(Map<String, dynamic> json) => _$AttRowFromJson(json);

@override final  String studentId;
@override@AttStatusConverter() final  AttendanceStatus? status;
@override final  String? note;
@override@LateRangeConverter() final  LateRange? lateRange;
@override final  String? markedBy;

/// Create a copy of AttRow
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AttRowCopyWith<_AttRow> get copyWith => __$AttRowCopyWithImpl<_AttRow>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AttRowToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _AttRow&&(identical(other.studentId, studentId) || other.studentId == studentId)&&(identical(other.status, status) || other.status == status)&&(identical(other.note, note) || other.note == note)&&(identical(other.lateRange, lateRange) || other.lateRange == lateRange)&&(identical(other.markedBy, markedBy) || other.markedBy == markedBy));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,studentId,status,note,lateRange,markedBy);
}

@override
String toString() {
    return 'AttRow(studentId: $studentId, status: $status, note: $note, lateRange: $lateRange, markedBy: $markedBy)';
}


}

/// @nodoc
abstract mixin class _$AttRowCopyWith<$Res> implements $AttRowCopyWith<$Res> {
  factory _$AttRowCopyWith(_AttRow value, $Res Function(_AttRow) _then) = __$AttRowCopyWithImpl;
@override @useResult
$Res call({
 String studentId,@AttStatusConverter() AttendanceStatus? status, String? note,@LateRangeConverter() LateRange? lateRange, String? markedBy
});




}
/// @nodoc
class __$AttRowCopyWithImpl<$Res>
    implements _$AttRowCopyWith<$Res> {
  __$AttRowCopyWithImpl(this._self, this._then);

  final _AttRow _self;
  final $Res Function(_AttRow) _then;

/// Create a copy of AttRow
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? studentId = null,Object? status = freezed,Object? note = freezed,Object? lateRange = freezed,Object? markedBy = freezed,}) {
  return _then(_AttRow(
studentId: null == studentId ? _self.studentId : studentId // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as AttendanceStatus?,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,lateRange: freezed == lateRange ? _self.lateRange : lateRange // ignore: cast_nullable_to_non_nullable
as LateRange?,markedBy: freezed == markedBy ? _self.markedBy : markedBy // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$HwRow {

 String get studentId;@HwStatusConverter() HomeworkStatus? get status; String? get comment; String? get markedBy; String? get updatedAt;
/// Create a copy of HwRow
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HwRowCopyWith<HwRow> get copyWith => _$HwRowCopyWithImpl<HwRow>(this as HwRow, _$identity);

  /// Serializes this HwRow to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HwRow;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HwRow&&(identical(other.studentId, _this.studentId) || other.studentId == _this.studentId)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.comment, _this.comment) || other.comment == _this.comment)&&(identical(other.markedBy, _this.markedBy) || other.markedBy == _this.markedBy)&&(identical(other.updatedAt, _this.updatedAt) || other.updatedAt == _this.updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HwRow;
  return Object.hash(runtimeType,_this.studentId,_this.status,_this.comment,_this.markedBy,_this.updatedAt);
}

@override
String toString() {
  final _this = this as HwRow;
  return 'HwRow(studentId: ${_this.studentId}, status: ${_this.status}, comment: ${_this.comment}, markedBy: ${_this.markedBy}, updatedAt: ${_this.updatedAt})';
}


}

/// @nodoc
abstract mixin class $HwRowCopyWith<$Res>  {
  factory $HwRowCopyWith(HwRow value, $Res Function(HwRow) _then) = _$HwRowCopyWithImpl;
@useResult
$Res call({
 String studentId,@HwStatusConverter() HomeworkStatus? status, String? comment, String? markedBy, String? updatedAt
});




}
/// @nodoc
class _$HwRowCopyWithImpl<$Res>
    implements $HwRowCopyWith<$Res> {
  _$HwRowCopyWithImpl(this._self, this._then);

  final HwRow _self;
  final $Res Function(HwRow) _then;

/// Create a copy of HwRow
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? studentId = null,Object? status = freezed,Object? comment = freezed,Object? markedBy = freezed,Object? updatedAt = freezed,}) {
  return _then(HwRow(
studentId: null == studentId ? _self.studentId : studentId // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as HomeworkStatus?,comment: freezed == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String?,markedBy: freezed == markedBy ? _self.markedBy : markedBy // ignore: cast_nullable_to_non_nullable
as String?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [HwRow].
extension HwRowPatterns on HwRow {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HwRow value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HwRow() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HwRow value)  $default,){
final _that = this;
switch (_that) {
case _HwRow():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HwRow value)?  $default,){
final _that = this;
switch (_that) {
case _HwRow() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String studentId, @HwStatusConverter()  HomeworkStatus? status,  String? comment,  String? markedBy,  String? updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HwRow() when $default != null:
return $default(_that.studentId,_that.status,_that.comment,_that.markedBy,_that.updatedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String studentId, @HwStatusConverter()  HomeworkStatus? status,  String? comment,  String? markedBy,  String? updatedAt)  $default,) {final _that = this;
switch (_that) {
case _HwRow():
return $default(_that.studentId,_that.status,_that.comment,_that.markedBy,_that.updatedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String studentId, @HwStatusConverter()  HomeworkStatus? status,  String? comment,  String? markedBy,  String? updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _HwRow() when $default != null:
return $default(_that.studentId,_that.status,_that.comment,_that.markedBy,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HwRow implements HwRow {
  const _HwRow({required this.studentId, @HwStatusConverter() this.status, this.comment, this.markedBy, this.updatedAt});
  factory _HwRow.fromJson(Map<String, dynamic> json) => _$HwRowFromJson(json);

@override final  String studentId;
@override@HwStatusConverter() final  HomeworkStatus? status;
@override final  String? comment;
@override final  String? markedBy;
@override final  String? updatedAt;

/// Create a copy of HwRow
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HwRowCopyWith<_HwRow> get copyWith => __$HwRowCopyWithImpl<_HwRow>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HwRowToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HwRow&&(identical(other.studentId, studentId) || other.studentId == studentId)&&(identical(other.status, status) || other.status == status)&&(identical(other.comment, comment) || other.comment == comment)&&(identical(other.markedBy, markedBy) || other.markedBy == markedBy)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,studentId,status,comment,markedBy,updatedAt);
}

@override
String toString() {
    return 'HwRow(studentId: $studentId, status: $status, comment: $comment, markedBy: $markedBy, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$HwRowCopyWith<$Res> implements $HwRowCopyWith<$Res> {
  factory _$HwRowCopyWith(_HwRow value, $Res Function(_HwRow) _then) = __$HwRowCopyWithImpl;
@override @useResult
$Res call({
 String studentId,@HwStatusConverter() HomeworkStatus? status, String? comment, String? markedBy, String? updatedAt
});




}
/// @nodoc
class __$HwRowCopyWithImpl<$Res>
    implements _$HwRowCopyWith<$Res> {
  __$HwRowCopyWithImpl(this._self, this._then);

  final _HwRow _self;
  final $Res Function(_HwRow) _then;

/// Create a copy of HwRow
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? studentId = null,Object? status = freezed,Object? comment = freezed,Object? markedBy = freezed,Object? updatedAt = freezed,}) {
  return _then(_HwRow(
studentId: null == studentId ? _self.studentId : studentId // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as HomeworkStatus?,comment: freezed == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String?,markedBy: freezed == markedBy ? _self.markedBy : markedBy // ignore: cast_nullable_to_non_nullable
as String?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$RiskFlag {

 String get kind; String get label;
/// Create a copy of RiskFlag
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RiskFlagCopyWith<RiskFlag> get copyWith => _$RiskFlagCopyWithImpl<RiskFlag>(this as RiskFlag, _$identity);

  /// Serializes this RiskFlag to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as RiskFlag;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RiskFlag&&(identical(other.kind, _this.kind) || other.kind == _this.kind)&&(identical(other.label, _this.label) || other.label == _this.label));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as RiskFlag;
  return Object.hash(runtimeType,_this.kind,_this.label);
}

@override
String toString() {
  final _this = this as RiskFlag;
  return 'RiskFlag(kind: ${_this.kind}, label: ${_this.label})';
}


}

/// @nodoc
abstract mixin class $RiskFlagCopyWith<$Res>  {
  factory $RiskFlagCopyWith(RiskFlag value, $Res Function(RiskFlag) _then) = _$RiskFlagCopyWithImpl;
@useResult
$Res call({
 String kind, String label
});




}
/// @nodoc
class _$RiskFlagCopyWithImpl<$Res>
    implements $RiskFlagCopyWith<$Res> {
  _$RiskFlagCopyWithImpl(this._self, this._then);

  final RiskFlag _self;
  final $Res Function(RiskFlag) _then;

/// Create a copy of RiskFlag
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? kind = null,Object? label = null,}) {
  return _then(RiskFlag(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [RiskFlag].
extension RiskFlagPatterns on RiskFlag {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RiskFlag value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RiskFlag() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RiskFlag value)  $default,){
final _that = this;
switch (_that) {
case _RiskFlag():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RiskFlag value)?  $default,){
final _that = this;
switch (_that) {
case _RiskFlag() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String kind,  String label)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RiskFlag() when $default != null:
return $default(_that.kind,_that.label);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String kind,  String label)  $default,) {final _that = this;
switch (_that) {
case _RiskFlag():
return $default(_that.kind,_that.label);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String kind,  String label)?  $default,) {final _that = this;
switch (_that) {
case _RiskFlag() when $default != null:
return $default(_that.kind,_that.label);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RiskFlag implements RiskFlag {
  const _RiskFlag({required this.kind, required this.label});
  factory _RiskFlag.fromJson(Map<String, dynamic> json) => _$RiskFlagFromJson(json);

@override final  String kind;
@override final  String label;

/// Create a copy of RiskFlag
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RiskFlagCopyWith<_RiskFlag> get copyWith => __$RiskFlagCopyWithImpl<_RiskFlag>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RiskFlagToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _RiskFlag&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.label, label) || other.label == label));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,kind,label);
}

@override
String toString() {
    return 'RiskFlag(kind: $kind, label: $label)';
}


}

/// @nodoc
abstract mixin class _$RiskFlagCopyWith<$Res> implements $RiskFlagCopyWith<$Res> {
  factory _$RiskFlagCopyWith(_RiskFlag value, $Res Function(_RiskFlag) _then) = __$RiskFlagCopyWithImpl;
@override @useResult
$Res call({
 String kind, String label
});




}
/// @nodoc
class __$RiskFlagCopyWithImpl<$Res>
    implements _$RiskFlagCopyWith<$Res> {
  __$RiskFlagCopyWithImpl(this._self, this._then);

  final _RiskFlag _self;
  final $Res Function(_RiskFlag) _then;

/// Create a copy of RiskFlag
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? kind = null,Object? label = null,}) {
  return _then(_RiskFlag(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$Recorder {

 String get id; String get name; String? get at; int get count;
/// Create a copy of Recorder
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RecorderCopyWith<Recorder> get copyWith => _$RecorderCopyWithImpl<Recorder>(this as Recorder, _$identity);

  /// Serializes this Recorder to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Recorder;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Recorder&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.at, _this.at) || other.at == _this.at)&&(identical(other.count, _this.count) || other.count == _this.count));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Recorder;
  return Object.hash(runtimeType,_this.id,_this.name,_this.at,_this.count);
}

@override
String toString() {
  final _this = this as Recorder;
  return 'Recorder(id: ${_this.id}, name: ${_this.name}, at: ${_this.at}, count: ${_this.count})';
}


}

/// @nodoc
abstract mixin class $RecorderCopyWith<$Res>  {
  factory $RecorderCopyWith(Recorder value, $Res Function(Recorder) _then) = _$RecorderCopyWithImpl;
@useResult
$Res call({
 String id, String name, String? at, int count
});




}
/// @nodoc
class _$RecorderCopyWithImpl<$Res>
    implements $RecorderCopyWith<$Res> {
  _$RecorderCopyWithImpl(this._self, this._then);

  final Recorder _self;
  final $Res Function(Recorder) _then;

/// Create a copy of Recorder
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? at = freezed,Object? count = null,}) {
  return _then(Recorder(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,at: freezed == at ? _self.at : at // ignore: cast_nullable_to_non_nullable
as String?,count: null == count ? _self.count : count // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [Recorder].
extension RecorderPatterns on Recorder {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Recorder value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Recorder() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Recorder value)  $default,){
final _that = this;
switch (_that) {
case _Recorder():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Recorder value)?  $default,){
final _that = this;
switch (_that) {
case _Recorder() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String? at,  int count)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Recorder() when $default != null:
return $default(_that.id,_that.name,_that.at,_that.count);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String? at,  int count)  $default,) {final _that = this;
switch (_that) {
case _Recorder():
return $default(_that.id,_that.name,_that.at,_that.count);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String? at,  int count)?  $default,) {final _that = this;
switch (_that) {
case _Recorder() when $default != null:
return $default(_that.id,_that.name,_that.at,_that.count);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Recorder implements Recorder {
  const _Recorder({required this.id, required this.name, this.at, this.count = 0});
  factory _Recorder.fromJson(Map<String, dynamic> json) => _$RecorderFromJson(json);

@override final  String id;
@override final  String name;
@override final  String? at;
@override@JsonKey() final  int count;

/// Create a copy of Recorder
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RecorderCopyWith<_Recorder> get copyWith => __$RecorderCopyWithImpl<_Recorder>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RecorderToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Recorder&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.at, at) || other.at == at)&&(identical(other.count, count) || other.count == count));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,at,count);
}

@override
String toString() {
    return 'Recorder(id: $id, name: $name, at: $at, count: $count)';
}


}

/// @nodoc
abstract mixin class _$RecorderCopyWith<$Res> implements $RecorderCopyWith<$Res> {
  factory _$RecorderCopyWith(_Recorder value, $Res Function(_Recorder) _then) = __$RecorderCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String? at, int count
});




}
/// @nodoc
class __$RecorderCopyWithImpl<$Res>
    implements _$RecorderCopyWith<$Res> {
  __$RecorderCopyWithImpl(this._self, this._then);

  final _Recorder _self;
  final $Res Function(_Recorder) _then;

/// Create a copy of Recorder
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? at = freezed,Object? count = null,}) {
  return _then(_Recorder(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,at: freezed == at ? _self.at : at // ignore: cast_nullable_to_non_nullable
as String?,count: null == count ? _self.count : count // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$RecordedBy {

 List<Recorder> get attendance; List<Recorder> get homework;
/// Create a copy of RecordedBy
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RecordedByCopyWith<RecordedBy> get copyWith => _$RecordedByCopyWithImpl<RecordedBy>(this as RecordedBy, _$identity);

  /// Serializes this RecordedBy to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as RecordedBy;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RecordedBy&&const DeepCollectionEquality().equals(other.attendance, _this.attendance)&&const DeepCollectionEquality().equals(other.homework, _this.homework));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as RecordedBy;
  return Object.hash(runtimeType,const DeepCollectionEquality().hash(_this.attendance),const DeepCollectionEquality().hash(_this.homework));
}

@override
String toString() {
  final _this = this as RecordedBy;
  return 'RecordedBy(attendance: ${_this.attendance}, homework: ${_this.homework})';
}


}

/// @nodoc
abstract mixin class $RecordedByCopyWith<$Res>  {
  factory $RecordedByCopyWith(RecordedBy value, $Res Function(RecordedBy) _then) = _$RecordedByCopyWithImpl;
@useResult
$Res call({
 List<Recorder> attendance, List<Recorder> homework
});




}
/// @nodoc
class _$RecordedByCopyWithImpl<$Res>
    implements $RecordedByCopyWith<$Res> {
  _$RecordedByCopyWithImpl(this._self, this._then);

  final RecordedBy _self;
  final $Res Function(RecordedBy) _then;

/// Create a copy of RecordedBy
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? attendance = null,Object? homework = null,}) {
  return _then(RecordedBy(
attendance: null == attendance ? _self.attendance : attendance // ignore: cast_nullable_to_non_nullable
as List<Recorder>,homework: null == homework ? _self.homework : homework // ignore: cast_nullable_to_non_nullable
as List<Recorder>,
  ));
}

}


/// Adds pattern-matching-related methods to [RecordedBy].
extension RecordedByPatterns on RecordedBy {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RecordedBy value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RecordedBy() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RecordedBy value)  $default,){
final _that = this;
switch (_that) {
case _RecordedBy():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RecordedBy value)?  $default,){
final _that = this;
switch (_that) {
case _RecordedBy() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<Recorder> attendance,  List<Recorder> homework)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RecordedBy() when $default != null:
return $default(_that.attendance,_that.homework);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<Recorder> attendance,  List<Recorder> homework)  $default,) {final _that = this;
switch (_that) {
case _RecordedBy():
return $default(_that.attendance,_that.homework);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<Recorder> attendance,  List<Recorder> homework)?  $default,) {final _that = this;
switch (_that) {
case _RecordedBy() when $default != null:
return $default(_that.attendance,_that.homework);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RecordedBy implements RecordedBy {
  const _RecordedBy({ List<Recorder> attendance = const <Recorder>[],  List<Recorder> homework = const <Recorder>[]}): _attendance = attendance,_homework = homework;
  factory _RecordedBy.fromJson(Map<String, dynamic> json) => _$RecordedByFromJson(json);

 final  List<Recorder> _attendance;
@override@JsonKey() List<Recorder> get attendance {
  if (_attendance is EqualUnmodifiableListView) return _attendance;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_attendance);
}

 final  List<Recorder> _homework;
@override@JsonKey() List<Recorder> get homework {
  if (_homework is EqualUnmodifiableListView) return _homework;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_homework);
}


/// Create a copy of RecordedBy
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RecordedByCopyWith<_RecordedBy> get copyWith => __$RecordedByCopyWithImpl<_RecordedBy>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RecordedByToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _RecordedBy&&const DeepCollectionEquality().equals(other.attendance, _attendance)&&const DeepCollectionEquality().equals(other.homework, _homework));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,const DeepCollectionEquality().hash(_attendance),const DeepCollectionEquality().hash(_homework));
}

@override
String toString() {
    return 'RecordedBy(attendance: $attendance, homework: $homework)';
}


}

/// @nodoc
abstract mixin class _$RecordedByCopyWith<$Res> implements $RecordedByCopyWith<$Res> {
  factory _$RecordedByCopyWith(_RecordedBy value, $Res Function(_RecordedBy) _then) = __$RecordedByCopyWithImpl;
@override @useResult
$Res call({
 List<Recorder> attendance, List<Recorder> homework
});




}
/// @nodoc
class __$RecordedByCopyWithImpl<$Res>
    implements _$RecordedByCopyWith<$Res> {
  __$RecordedByCopyWithImpl(this._self, this._then);

  final _RecordedBy _self;
  final $Res Function(_RecordedBy) _then;

/// Create a copy of RecordedBy
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? attendance = null,Object? homework = null,}) {
  return _then(_RecordedBy(
attendance: null == attendance ? _self._attendance : attendance // ignore: cast_nullable_to_non_nullable
as List<Recorder>,homework: null == homework ? _self._homework : homework // ignore: cast_nullable_to_non_nullable
as List<Recorder>,
  ));
}


}


/// @nodoc
mixin _$MarksPayload {

 String get date; List<AttRow> get attendance; List<HwRow> get homework; Map<String, List<RiskFlag>> get risk; RecordedBy? get recordedBy;@JsonKey(readValue: readSentStudents) List<String> get sent;
/// Create a copy of MarksPayload
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MarksPayloadCopyWith<MarksPayload> get copyWith => _$MarksPayloadCopyWithImpl<MarksPayload>(this as MarksPayload, _$identity);

  /// Serializes this MarksPayload to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as MarksPayload;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MarksPayload&&(identical(other.date, _this.date) || other.date == _this.date)&&const DeepCollectionEquality().equals(other.attendance, _this.attendance)&&const DeepCollectionEquality().equals(other.homework, _this.homework)&&const DeepCollectionEquality().equals(other.risk, _this.risk)&&(identical(other.recordedBy, _this.recordedBy) || other.recordedBy == _this.recordedBy)&&const DeepCollectionEquality().equals(other.sent, _this.sent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as MarksPayload;
  return Object.hash(runtimeType,_this.date,const DeepCollectionEquality().hash(_this.attendance),const DeepCollectionEquality().hash(_this.homework),const DeepCollectionEquality().hash(_this.risk),_this.recordedBy,const DeepCollectionEquality().hash(_this.sent));
}

@override
String toString() {
  final _this = this as MarksPayload;
  return 'MarksPayload(date: ${_this.date}, attendance: ${_this.attendance}, homework: ${_this.homework}, risk: ${_this.risk}, recordedBy: ${_this.recordedBy}, sent: ${_this.sent})';
}


}

/// @nodoc
abstract mixin class $MarksPayloadCopyWith<$Res>  {
  factory $MarksPayloadCopyWith(MarksPayload value, $Res Function(MarksPayload) _then) = _$MarksPayloadCopyWithImpl;
@useResult
$Res call({
 String date, List<AttRow> attendance, List<HwRow> homework, Map<String, List<RiskFlag>> risk, RecordedBy? recordedBy,@JsonKey(readValue: readSentStudents) List<String> sent
});


$RecordedByCopyWith<$Res>? get recordedBy;

}
/// @nodoc
class _$MarksPayloadCopyWithImpl<$Res>
    implements $MarksPayloadCopyWith<$Res> {
  _$MarksPayloadCopyWithImpl(this._self, this._then);

  final MarksPayload _self;
  final $Res Function(MarksPayload) _then;

/// Create a copy of MarksPayload
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? attendance = null,Object? homework = null,Object? risk = null,Object? recordedBy = freezed,Object? sent = null,}) {
  return _then(MarksPayload(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,attendance: null == attendance ? _self.attendance : attendance // ignore: cast_nullable_to_non_nullable
as List<AttRow>,homework: null == homework ? _self.homework : homework // ignore: cast_nullable_to_non_nullable
as List<HwRow>,risk: null == risk ? _self.risk : risk // ignore: cast_nullable_to_non_nullable
as Map<String, List<RiskFlag>>,recordedBy: freezed == recordedBy ? _self.recordedBy : recordedBy // ignore: cast_nullable_to_non_nullable
as RecordedBy?,sent: null == sent ? _self.sent : sent // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}
/// Create a copy of MarksPayload
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RecordedByCopyWith<$Res>? get recordedBy {
    if (_self.recordedBy == null) {
    return null;
  }

  return $RecordedByCopyWith<$Res>(_self.recordedBy!, (value) {
    return _then(_self.copyWith(recordedBy: value));
  });
}
}


/// Adds pattern-matching-related methods to [MarksPayload].
extension MarksPayloadPatterns on MarksPayload {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MarksPayload value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MarksPayload() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MarksPayload value)  $default,){
final _that = this;
switch (_that) {
case _MarksPayload():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MarksPayload value)?  $default,){
final _that = this;
switch (_that) {
case _MarksPayload() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  List<AttRow> attendance,  List<HwRow> homework,  Map<String, List<RiskFlag>> risk,  RecordedBy? recordedBy, @JsonKey(readValue: readSentStudents)  List<String> sent)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MarksPayload() when $default != null:
return $default(_that.date,_that.attendance,_that.homework,_that.risk,_that.recordedBy,_that.sent);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  List<AttRow> attendance,  List<HwRow> homework,  Map<String, List<RiskFlag>> risk,  RecordedBy? recordedBy, @JsonKey(readValue: readSentStudents)  List<String> sent)  $default,) {final _that = this;
switch (_that) {
case _MarksPayload():
return $default(_that.date,_that.attendance,_that.homework,_that.risk,_that.recordedBy,_that.sent);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  List<AttRow> attendance,  List<HwRow> homework,  Map<String, List<RiskFlag>> risk,  RecordedBy? recordedBy, @JsonKey(readValue: readSentStudents)  List<String> sent)?  $default,) {final _that = this;
switch (_that) {
case _MarksPayload() when $default != null:
return $default(_that.date,_that.attendance,_that.homework,_that.risk,_that.recordedBy,_that.sent);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MarksPayload implements MarksPayload {
  const _MarksPayload({required this.date,  List<AttRow> attendance = const <AttRow>[],  List<HwRow> homework = const <HwRow>[],  Map<String, List<RiskFlag>> risk = const <String, List<RiskFlag>>{}, this.recordedBy, @JsonKey(readValue: readSentStudents)  List<String> sent = const <String>[]}): _attendance = attendance,_homework = homework,_risk = risk,_sent = sent;
  factory _MarksPayload.fromJson(Map<String, dynamic> json) => _$MarksPayloadFromJson(json);

@override final  String date;
 final  List<AttRow> _attendance;
@override@JsonKey() List<AttRow> get attendance {
  if (_attendance is EqualUnmodifiableListView) return _attendance;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_attendance);
}

 final  List<HwRow> _homework;
@override@JsonKey() List<HwRow> get homework {
  if (_homework is EqualUnmodifiableListView) return _homework;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_homework);
}

 final  Map<String, List<RiskFlag>> _risk;
@override@JsonKey() Map<String, List<RiskFlag>> get risk {
  if (_risk is EqualUnmodifiableMapView) return _risk;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_risk);
}

@override final  RecordedBy? recordedBy;
 final  List<String> _sent;
@override@JsonKey(readValue: readSentStudents) List<String> get sent {
  if (_sent is EqualUnmodifiableListView) return _sent;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_sent);
}


/// Create a copy of MarksPayload
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MarksPayloadCopyWith<_MarksPayload> get copyWith => __$MarksPayloadCopyWithImpl<_MarksPayload>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MarksPayloadToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _MarksPayload&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other.attendance, _attendance)&&const DeepCollectionEquality().equals(other.homework, _homework)&&const DeepCollectionEquality().equals(other.risk, _risk)&&(identical(other.recordedBy, recordedBy) || other.recordedBy == recordedBy)&&const DeepCollectionEquality().equals(other.sent, _sent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,const DeepCollectionEquality().hash(_attendance),const DeepCollectionEquality().hash(_homework),const DeepCollectionEquality().hash(_risk),recordedBy,const DeepCollectionEquality().hash(_sent));
}

@override
String toString() {
    return 'MarksPayload(date: $date, attendance: $attendance, homework: $homework, risk: $risk, recordedBy: $recordedBy, sent: $sent)';
}


}

/// @nodoc
abstract mixin class _$MarksPayloadCopyWith<$Res> implements $MarksPayloadCopyWith<$Res> {
  factory _$MarksPayloadCopyWith(_MarksPayload value, $Res Function(_MarksPayload) _then) = __$MarksPayloadCopyWithImpl;
@override @useResult
$Res call({
 String date, List<AttRow> attendance, List<HwRow> homework, Map<String, List<RiskFlag>> risk, RecordedBy? recordedBy,@JsonKey(readValue: readSentStudents) List<String> sent
});


@override $RecordedByCopyWith<$Res>? get recordedBy;

}
/// @nodoc
class __$MarksPayloadCopyWithImpl<$Res>
    implements _$MarksPayloadCopyWith<$Res> {
  __$MarksPayloadCopyWithImpl(this._self, this._then);

  final _MarksPayload _self;
  final $Res Function(_MarksPayload) _then;

/// Create a copy of MarksPayload
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? attendance = null,Object? homework = null,Object? risk = null,Object? recordedBy = freezed,Object? sent = null,}) {
  return _then(_MarksPayload(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,attendance: null == attendance ? _self._attendance : attendance // ignore: cast_nullable_to_non_nullable
as List<AttRow>,homework: null == homework ? _self._homework : homework // ignore: cast_nullable_to_non_nullable
as List<HwRow>,risk: null == risk ? _self._risk : risk // ignore: cast_nullable_to_non_nullable
as Map<String, List<RiskFlag>>,recordedBy: freezed == recordedBy ? _self.recordedBy : recordedBy // ignore: cast_nullable_to_non_nullable
as RecordedBy?,sent: null == sent ? _self._sent : sent // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}

/// Create a copy of MarksPayload
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RecordedByCopyWith<$Res>? get recordedBy {
    if (_self.recordedBy == null) {
    return null;
  }

  return $RecordedByCopyWith<$Res>(_self.recordedBy!, (value) {
    return _then(_self.copyWith(recordedBy: value));
  });
}
}


/// @nodoc
mixin _$BoardClassroom {

 String get id; String get name; String get type; int? get grade;
/// Create a copy of BoardClassroom
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BoardClassroomCopyWith<BoardClassroom> get copyWith => _$BoardClassroomCopyWithImpl<BoardClassroom>(this as BoardClassroom, _$identity);

  /// Serializes this BoardClassroom to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as BoardClassroom;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BoardClassroom&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.type, _this.type) || other.type == _this.type)&&(identical(other.grade, _this.grade) || other.grade == _this.grade));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as BoardClassroom;
  return Object.hash(runtimeType,_this.id,_this.name,_this.type,_this.grade);
}

@override
String toString() {
  final _this = this as BoardClassroom;
  return 'BoardClassroom(id: ${_this.id}, name: ${_this.name}, type: ${_this.type}, grade: ${_this.grade})';
}


}

/// @nodoc
abstract mixin class $BoardClassroomCopyWith<$Res>  {
  factory $BoardClassroomCopyWith(BoardClassroom value, $Res Function(BoardClassroom) _then) = _$BoardClassroomCopyWithImpl;
@useResult
$Res call({
 String id, String name, String type, int? grade
});




}
/// @nodoc
class _$BoardClassroomCopyWithImpl<$Res>
    implements $BoardClassroomCopyWith<$Res> {
  _$BoardClassroomCopyWithImpl(this._self, this._then);

  final BoardClassroom _self;
  final $Res Function(BoardClassroom) _then;

/// Create a copy of BoardClassroom
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? type = null,Object? grade = freezed,}) {
  return _then(BoardClassroom(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [BoardClassroom].
extension BoardClassroomPatterns on BoardClassroom {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BoardClassroom value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BoardClassroom() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BoardClassroom value)  $default,){
final _that = this;
switch (_that) {
case _BoardClassroom():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BoardClassroom value)?  $default,){
final _that = this;
switch (_that) {
case _BoardClassroom() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String type,  int? grade)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BoardClassroom() when $default != null:
return $default(_that.id,_that.name,_that.type,_that.grade);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String type,  int? grade)  $default,) {final _that = this;
switch (_that) {
case _BoardClassroom():
return $default(_that.id,_that.name,_that.type,_that.grade);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String type,  int? grade)?  $default,) {final _that = this;
switch (_that) {
case _BoardClassroom() when $default != null:
return $default(_that.id,_that.name,_that.type,_that.grade);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BoardClassroom implements BoardClassroom {
  const _BoardClassroom({required this.id, required this.name, this.type = 'IN_PERSON', this.grade});
  factory _BoardClassroom.fromJson(Map<String, dynamic> json) => _$BoardClassroomFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String type;
@override final  int? grade;

/// Create a copy of BoardClassroom
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BoardClassroomCopyWith<_BoardClassroom> get copyWith => __$BoardClassroomCopyWithImpl<_BoardClassroom>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BoardClassroomToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _BoardClassroom&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.type, type) || other.type == type)&&(identical(other.grade, grade) || other.grade == grade));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,type,grade);
}

@override
String toString() {
    return 'BoardClassroom(id: $id, name: $name, type: $type, grade: $grade)';
}


}

/// @nodoc
abstract mixin class _$BoardClassroomCopyWith<$Res> implements $BoardClassroomCopyWith<$Res> {
  factory _$BoardClassroomCopyWith(_BoardClassroom value, $Res Function(_BoardClassroom) _then) = __$BoardClassroomCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String type, int? grade
});




}
/// @nodoc
class __$BoardClassroomCopyWithImpl<$Res>
    implements _$BoardClassroomCopyWith<$Res> {
  __$BoardClassroomCopyWithImpl(this._self, this._then);

  final _BoardClassroom _self;
  final $Res Function(_BoardClassroom) _then;

/// Create a copy of BoardClassroom
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? type = null,Object? grade = freezed,}) {
  return _then(_BoardClassroom(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}


/// @nodoc
mixin _$BoardPayload {

 String get date; String get today; BoardClassroom get classroom; String? get holiday; List<BoardLesson> get lessons; List<BoardStudent> get students; List<AttRow> get attendance; List<HwRow> get homework; Map<String, List<RiskFlag>> get risk; RecordedBy? get recordedBy;@JsonKey(readValue: readSentStudents) List<String> get sent; bool get canEditCriteria;
/// Create a copy of BoardPayload
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BoardPayloadCopyWith<BoardPayload> get copyWith => _$BoardPayloadCopyWithImpl<BoardPayload>(this as BoardPayload, _$identity);

  /// Serializes this BoardPayload to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as BoardPayload;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BoardPayload&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.today, _this.today) || other.today == _this.today)&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom)&&(identical(other.holiday, _this.holiday) || other.holiday == _this.holiday)&&const DeepCollectionEquality().equals(other.lessons, _this.lessons)&&const DeepCollectionEquality().equals(other.students, _this.students)&&const DeepCollectionEquality().equals(other.attendance, _this.attendance)&&const DeepCollectionEquality().equals(other.homework, _this.homework)&&const DeepCollectionEquality().equals(other.risk, _this.risk)&&(identical(other.recordedBy, _this.recordedBy) || other.recordedBy == _this.recordedBy)&&const DeepCollectionEquality().equals(other.sent, _this.sent)&&(identical(other.canEditCriteria, _this.canEditCriteria) || other.canEditCriteria == _this.canEditCriteria));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as BoardPayload;
  return Object.hash(runtimeType,_this.date,_this.today,_this.classroom,_this.holiday,const DeepCollectionEquality().hash(_this.lessons),const DeepCollectionEquality().hash(_this.students),const DeepCollectionEquality().hash(_this.attendance),const DeepCollectionEquality().hash(_this.homework),const DeepCollectionEquality().hash(_this.risk),_this.recordedBy,const DeepCollectionEquality().hash(_this.sent),_this.canEditCriteria);
}

@override
String toString() {
  final _this = this as BoardPayload;
  return 'BoardPayload(date: ${_this.date}, today: ${_this.today}, classroom: ${_this.classroom}, holiday: ${_this.holiday}, lessons: ${_this.lessons}, students: ${_this.students}, attendance: ${_this.attendance}, homework: ${_this.homework}, risk: ${_this.risk}, recordedBy: ${_this.recordedBy}, sent: ${_this.sent}, canEditCriteria: ${_this.canEditCriteria})';
}


}

/// @nodoc
abstract mixin class $BoardPayloadCopyWith<$Res>  {
  factory $BoardPayloadCopyWith(BoardPayload value, $Res Function(BoardPayload) _then) = _$BoardPayloadCopyWithImpl;
@useResult
$Res call({
 String date, String today, BoardClassroom classroom, String? holiday, List<BoardLesson> lessons, List<BoardStudent> students, List<AttRow> attendance, List<HwRow> homework, Map<String, List<RiskFlag>> risk, RecordedBy? recordedBy,@JsonKey(readValue: readSentStudents) List<String> sent, bool canEditCriteria
});


$BoardClassroomCopyWith<$Res> get classroom;$RecordedByCopyWith<$Res>? get recordedBy;

}
/// @nodoc
class _$BoardPayloadCopyWithImpl<$Res>
    implements $BoardPayloadCopyWith<$Res> {
  _$BoardPayloadCopyWithImpl(this._self, this._then);

  final BoardPayload _self;
  final $Res Function(BoardPayload) _then;

/// Create a copy of BoardPayload
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? today = null,Object? classroom = null,Object? holiday = freezed,Object? lessons = null,Object? students = null,Object? attendance = null,Object? homework = null,Object? risk = null,Object? recordedBy = freezed,Object? sent = null,Object? canEditCriteria = null,}) {
  return _then(BoardPayload(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as BoardClassroom,holiday: freezed == holiday ? _self.holiday : holiday // ignore: cast_nullable_to_non_nullable
as String?,lessons: null == lessons ? _self.lessons : lessons // ignore: cast_nullable_to_non_nullable
as List<BoardLesson>,students: null == students ? _self.students : students // ignore: cast_nullable_to_non_nullable
as List<BoardStudent>,attendance: null == attendance ? _self.attendance : attendance // ignore: cast_nullable_to_non_nullable
as List<AttRow>,homework: null == homework ? _self.homework : homework // ignore: cast_nullable_to_non_nullable
as List<HwRow>,risk: null == risk ? _self.risk : risk // ignore: cast_nullable_to_non_nullable
as Map<String, List<RiskFlag>>,recordedBy: freezed == recordedBy ? _self.recordedBy : recordedBy // ignore: cast_nullable_to_non_nullable
as RecordedBy?,sent: null == sent ? _self.sent : sent // ignore: cast_nullable_to_non_nullable
as List<String>,canEditCriteria: null == canEditCriteria ? _self.canEditCriteria : canEditCriteria // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}
/// Create a copy of BoardPayload
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$BoardClassroomCopyWith<$Res> get classroom {
  
  return $BoardClassroomCopyWith<$Res>(_self.classroom, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}/// Create a copy of BoardPayload
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RecordedByCopyWith<$Res>? get recordedBy {
    if (_self.recordedBy == null) {
    return null;
  }

  return $RecordedByCopyWith<$Res>(_self.recordedBy!, (value) {
    return _then(_self.copyWith(recordedBy: value));
  });
}
}


/// Adds pattern-matching-related methods to [BoardPayload].
extension BoardPayloadPatterns on BoardPayload {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BoardPayload value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BoardPayload() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BoardPayload value)  $default,){
final _that = this;
switch (_that) {
case _BoardPayload():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BoardPayload value)?  $default,){
final _that = this;
switch (_that) {
case _BoardPayload() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  String today,  BoardClassroom classroom,  String? holiday,  List<BoardLesson> lessons,  List<BoardStudent> students,  List<AttRow> attendance,  List<HwRow> homework,  Map<String, List<RiskFlag>> risk,  RecordedBy? recordedBy, @JsonKey(readValue: readSentStudents)  List<String> sent,  bool canEditCriteria)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BoardPayload() when $default != null:
return $default(_that.date,_that.today,_that.classroom,_that.holiday,_that.lessons,_that.students,_that.attendance,_that.homework,_that.risk,_that.recordedBy,_that.sent,_that.canEditCriteria);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  String today,  BoardClassroom classroom,  String? holiday,  List<BoardLesson> lessons,  List<BoardStudent> students,  List<AttRow> attendance,  List<HwRow> homework,  Map<String, List<RiskFlag>> risk,  RecordedBy? recordedBy, @JsonKey(readValue: readSentStudents)  List<String> sent,  bool canEditCriteria)  $default,) {final _that = this;
switch (_that) {
case _BoardPayload():
return $default(_that.date,_that.today,_that.classroom,_that.holiday,_that.lessons,_that.students,_that.attendance,_that.homework,_that.risk,_that.recordedBy,_that.sent,_that.canEditCriteria);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  String today,  BoardClassroom classroom,  String? holiday,  List<BoardLesson> lessons,  List<BoardStudent> students,  List<AttRow> attendance,  List<HwRow> homework,  Map<String, List<RiskFlag>> risk,  RecordedBy? recordedBy, @JsonKey(readValue: readSentStudents)  List<String> sent,  bool canEditCriteria)?  $default,) {final _that = this;
switch (_that) {
case _BoardPayload() when $default != null:
return $default(_that.date,_that.today,_that.classroom,_that.holiday,_that.lessons,_that.students,_that.attendance,_that.homework,_that.risk,_that.recordedBy,_that.sent,_that.canEditCriteria);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BoardPayload extends BoardPayload {
  const _BoardPayload({required this.date, required this.today, required this.classroom, this.holiday,  List<BoardLesson> lessons = const <BoardLesson>[],  List<BoardStudent> students = const <BoardStudent>[],  List<AttRow> attendance = const <AttRow>[],  List<HwRow> homework = const <HwRow>[],  Map<String, List<RiskFlag>> risk = const <String, List<RiskFlag>>{}, this.recordedBy, @JsonKey(readValue: readSentStudents)  List<String> sent = const <String>[], this.canEditCriteria = false}): _lessons = lessons,_students = students,_attendance = attendance,_homework = homework,_risk = risk,_sent = sent,super._();
  factory _BoardPayload.fromJson(Map<String, dynamic> json) => _$BoardPayloadFromJson(json);

@override final  String date;
@override final  String today;
@override final  BoardClassroom classroom;
@override final  String? holiday;
 final  List<BoardLesson> _lessons;
@override@JsonKey() List<BoardLesson> get lessons {
  if (_lessons is EqualUnmodifiableListView) return _lessons;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_lessons);
}

 final  List<BoardStudent> _students;
@override@JsonKey() List<BoardStudent> get students {
  if (_students is EqualUnmodifiableListView) return _students;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_students);
}

 final  List<AttRow> _attendance;
@override@JsonKey() List<AttRow> get attendance {
  if (_attendance is EqualUnmodifiableListView) return _attendance;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_attendance);
}

 final  List<HwRow> _homework;
@override@JsonKey() List<HwRow> get homework {
  if (_homework is EqualUnmodifiableListView) return _homework;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_homework);
}

 final  Map<String, List<RiskFlag>> _risk;
@override@JsonKey() Map<String, List<RiskFlag>> get risk {
  if (_risk is EqualUnmodifiableMapView) return _risk;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_risk);
}

@override final  RecordedBy? recordedBy;
 final  List<String> _sent;
@override@JsonKey(readValue: readSentStudents) List<String> get sent {
  if (_sent is EqualUnmodifiableListView) return _sent;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_sent);
}

@override@JsonKey() final  bool canEditCriteria;

/// Create a copy of BoardPayload
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BoardPayloadCopyWith<_BoardPayload> get copyWith => __$BoardPayloadCopyWithImpl<_BoardPayload>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BoardPayloadToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _BoardPayload&&(identical(other.date, date) || other.date == date)&&(identical(other.today, today) || other.today == today)&&(identical(other.classroom, classroom) || other.classroom == classroom)&&(identical(other.holiday, holiday) || other.holiday == holiday)&&const DeepCollectionEquality().equals(other.lessons, _lessons)&&const DeepCollectionEquality().equals(other.students, _students)&&const DeepCollectionEquality().equals(other.attendance, _attendance)&&const DeepCollectionEquality().equals(other.homework, _homework)&&const DeepCollectionEquality().equals(other.risk, _risk)&&(identical(other.recordedBy, recordedBy) || other.recordedBy == recordedBy)&&const DeepCollectionEquality().equals(other.sent, _sent)&&(identical(other.canEditCriteria, canEditCriteria) || other.canEditCriteria == canEditCriteria));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,today,classroom,holiday,const DeepCollectionEquality().hash(_lessons),const DeepCollectionEquality().hash(_students),const DeepCollectionEquality().hash(_attendance),const DeepCollectionEquality().hash(_homework),const DeepCollectionEquality().hash(_risk),recordedBy,const DeepCollectionEquality().hash(_sent),canEditCriteria);
}

@override
String toString() {
    return 'BoardPayload(date: $date, today: $today, classroom: $classroom, holiday: $holiday, lessons: $lessons, students: $students, attendance: $attendance, homework: $homework, risk: $risk, recordedBy: $recordedBy, sent: $sent, canEditCriteria: $canEditCriteria)';
}


}

/// @nodoc
abstract mixin class _$BoardPayloadCopyWith<$Res> implements $BoardPayloadCopyWith<$Res> {
  factory _$BoardPayloadCopyWith(_BoardPayload value, $Res Function(_BoardPayload) _then) = __$BoardPayloadCopyWithImpl;
@override @useResult
$Res call({
 String date, String today, BoardClassroom classroom, String? holiday, List<BoardLesson> lessons, List<BoardStudent> students, List<AttRow> attendance, List<HwRow> homework, Map<String, List<RiskFlag>> risk, RecordedBy? recordedBy,@JsonKey(readValue: readSentStudents) List<String> sent, bool canEditCriteria
});


@override $BoardClassroomCopyWith<$Res> get classroom;@override $RecordedByCopyWith<$Res>? get recordedBy;

}
/// @nodoc
class __$BoardPayloadCopyWithImpl<$Res>
    implements _$BoardPayloadCopyWith<$Res> {
  __$BoardPayloadCopyWithImpl(this._self, this._then);

  final _BoardPayload _self;
  final $Res Function(_BoardPayload) _then;

/// Create a copy of BoardPayload
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? today = null,Object? classroom = null,Object? holiday = freezed,Object? lessons = null,Object? students = null,Object? attendance = null,Object? homework = null,Object? risk = null,Object? recordedBy = freezed,Object? sent = null,Object? canEditCriteria = null,}) {
  return _then(_BoardPayload(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,today: null == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as String,classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as BoardClassroom,holiday: freezed == holiday ? _self.holiday : holiday // ignore: cast_nullable_to_non_nullable
as String?,lessons: null == lessons ? _self._lessons : lessons // ignore: cast_nullable_to_non_nullable
as List<BoardLesson>,students: null == students ? _self._students : students // ignore: cast_nullable_to_non_nullable
as List<BoardStudent>,attendance: null == attendance ? _self._attendance : attendance // ignore: cast_nullable_to_non_nullable
as List<AttRow>,homework: null == homework ? _self._homework : homework // ignore: cast_nullable_to_non_nullable
as List<HwRow>,risk: null == risk ? _self._risk : risk // ignore: cast_nullable_to_non_nullable
as Map<String, List<RiskFlag>>,recordedBy: freezed == recordedBy ? _self.recordedBy : recordedBy // ignore: cast_nullable_to_non_nullable
as RecordedBy?,sent: null == sent ? _self._sent : sent // ignore: cast_nullable_to_non_nullable
as List<String>,canEditCriteria: null == canEditCriteria ? _self.canEditCriteria : canEditCriteria // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

/// Create a copy of BoardPayload
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$BoardClassroomCopyWith<$Res> get classroom {
  
  return $BoardClassroomCopyWith<$Res>(_self.classroom, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}/// Create a copy of BoardPayload
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$RecordedByCopyWith<$Res>? get recordedBy {
    if (_self.recordedBy == null) {
    return null;
  }

  return $RecordedByCopyWith<$Res>(_self.recordedBy!, (value) {
    return _then(_self.copyWith(recordedBy: value));
  });
}
}


/// @nodoc
mixin _$AttMarkResponse {

 List<String> get applied; List<String> get skipped; List<AttRow> get rows;
/// Create a copy of AttMarkResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AttMarkResponseCopyWith<AttMarkResponse> get copyWith => _$AttMarkResponseCopyWithImpl<AttMarkResponse>(this as AttMarkResponse, _$identity);

  /// Serializes this AttMarkResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as AttMarkResponse;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AttMarkResponse&&const DeepCollectionEquality().equals(other.applied, _this.applied)&&const DeepCollectionEquality().equals(other.skipped, _this.skipped)&&const DeepCollectionEquality().equals(other.rows, _this.rows));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as AttMarkResponse;
  return Object.hash(runtimeType,const DeepCollectionEquality().hash(_this.applied),const DeepCollectionEquality().hash(_this.skipped),const DeepCollectionEquality().hash(_this.rows));
}

@override
String toString() {
  final _this = this as AttMarkResponse;
  return 'AttMarkResponse(applied: ${_this.applied}, skipped: ${_this.skipped}, rows: ${_this.rows})';
}


}

/// @nodoc
abstract mixin class $AttMarkResponseCopyWith<$Res>  {
  factory $AttMarkResponseCopyWith(AttMarkResponse value, $Res Function(AttMarkResponse) _then) = _$AttMarkResponseCopyWithImpl;
@useResult
$Res call({
 List<String> applied, List<String> skipped, List<AttRow> rows
});




}
/// @nodoc
class _$AttMarkResponseCopyWithImpl<$Res>
    implements $AttMarkResponseCopyWith<$Res> {
  _$AttMarkResponseCopyWithImpl(this._self, this._then);

  final AttMarkResponse _self;
  final $Res Function(AttMarkResponse) _then;

/// Create a copy of AttMarkResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? applied = null,Object? skipped = null,Object? rows = null,}) {
  return _then(AttMarkResponse(
applied: null == applied ? _self.applied : applied // ignore: cast_nullable_to_non_nullable
as List<String>,skipped: null == skipped ? _self.skipped : skipped // ignore: cast_nullable_to_non_nullable
as List<String>,rows: null == rows ? _self.rows : rows // ignore: cast_nullable_to_non_nullable
as List<AttRow>,
  ));
}

}


/// Adds pattern-matching-related methods to [AttMarkResponse].
extension AttMarkResponsePatterns on AttMarkResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AttMarkResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AttMarkResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AttMarkResponse value)  $default,){
final _that = this;
switch (_that) {
case _AttMarkResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AttMarkResponse value)?  $default,){
final _that = this;
switch (_that) {
case _AttMarkResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<String> applied,  List<String> skipped,  List<AttRow> rows)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AttMarkResponse() when $default != null:
return $default(_that.applied,_that.skipped,_that.rows);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<String> applied,  List<String> skipped,  List<AttRow> rows)  $default,) {final _that = this;
switch (_that) {
case _AttMarkResponse():
return $default(_that.applied,_that.skipped,_that.rows);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<String> applied,  List<String> skipped,  List<AttRow> rows)?  $default,) {final _that = this;
switch (_that) {
case _AttMarkResponse() when $default != null:
return $default(_that.applied,_that.skipped,_that.rows);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AttMarkResponse implements AttMarkResponse {
  const _AttMarkResponse({ List<String> applied = const <String>[],  List<String> skipped = const <String>[],  List<AttRow> rows = const <AttRow>[]}): _applied = applied,_skipped = skipped,_rows = rows;
  factory _AttMarkResponse.fromJson(Map<String, dynamic> json) => _$AttMarkResponseFromJson(json);

 final  List<String> _applied;
@override@JsonKey() List<String> get applied {
  if (_applied is EqualUnmodifiableListView) return _applied;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_applied);
}

 final  List<String> _skipped;
@override@JsonKey() List<String> get skipped {
  if (_skipped is EqualUnmodifiableListView) return _skipped;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_skipped);
}

 final  List<AttRow> _rows;
@override@JsonKey() List<AttRow> get rows {
  if (_rows is EqualUnmodifiableListView) return _rows;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_rows);
}


/// Create a copy of AttMarkResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AttMarkResponseCopyWith<_AttMarkResponse> get copyWith => __$AttMarkResponseCopyWithImpl<_AttMarkResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AttMarkResponseToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _AttMarkResponse&&const DeepCollectionEquality().equals(other.applied, _applied)&&const DeepCollectionEquality().equals(other.skipped, _skipped)&&const DeepCollectionEquality().equals(other.rows, _rows));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,const DeepCollectionEquality().hash(_applied),const DeepCollectionEquality().hash(_skipped),const DeepCollectionEquality().hash(_rows));
}

@override
String toString() {
    return 'AttMarkResponse(applied: $applied, skipped: $skipped, rows: $rows)';
}


}

/// @nodoc
abstract mixin class _$AttMarkResponseCopyWith<$Res> implements $AttMarkResponseCopyWith<$Res> {
  factory _$AttMarkResponseCopyWith(_AttMarkResponse value, $Res Function(_AttMarkResponse) _then) = __$AttMarkResponseCopyWithImpl;
@override @useResult
$Res call({
 List<String> applied, List<String> skipped, List<AttRow> rows
});




}
/// @nodoc
class __$AttMarkResponseCopyWithImpl<$Res>
    implements _$AttMarkResponseCopyWith<$Res> {
  __$AttMarkResponseCopyWithImpl(this._self, this._then);

  final _AttMarkResponse _self;
  final $Res Function(_AttMarkResponse) _then;

/// Create a copy of AttMarkResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? applied = null,Object? skipped = null,Object? rows = null,}) {
  return _then(_AttMarkResponse(
applied: null == applied ? _self._applied : applied // ignore: cast_nullable_to_non_nullable
as List<String>,skipped: null == skipped ? _self._skipped : skipped // ignore: cast_nullable_to_non_nullable
as List<String>,rows: null == rows ? _self._rows : rows // ignore: cast_nullable_to_non_nullable
as List<AttRow>,
  ));
}


}


/// @nodoc
mixin _$HwBulkResponse {

 List<String> get applied; List<String> get skipped; List<HwRow> get rows;
/// Create a copy of HwBulkResponse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HwBulkResponseCopyWith<HwBulkResponse> get copyWith => _$HwBulkResponseCopyWithImpl<HwBulkResponse>(this as HwBulkResponse, _$identity);

  /// Serializes this HwBulkResponse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HwBulkResponse;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HwBulkResponse&&const DeepCollectionEquality().equals(other.applied, _this.applied)&&const DeepCollectionEquality().equals(other.skipped, _this.skipped)&&const DeepCollectionEquality().equals(other.rows, _this.rows));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HwBulkResponse;
  return Object.hash(runtimeType,const DeepCollectionEquality().hash(_this.applied),const DeepCollectionEquality().hash(_this.skipped),const DeepCollectionEquality().hash(_this.rows));
}

@override
String toString() {
  final _this = this as HwBulkResponse;
  return 'HwBulkResponse(applied: ${_this.applied}, skipped: ${_this.skipped}, rows: ${_this.rows})';
}


}

/// @nodoc
abstract mixin class $HwBulkResponseCopyWith<$Res>  {
  factory $HwBulkResponseCopyWith(HwBulkResponse value, $Res Function(HwBulkResponse) _then) = _$HwBulkResponseCopyWithImpl;
@useResult
$Res call({
 List<String> applied, List<String> skipped, List<HwRow> rows
});




}
/// @nodoc
class _$HwBulkResponseCopyWithImpl<$Res>
    implements $HwBulkResponseCopyWith<$Res> {
  _$HwBulkResponseCopyWithImpl(this._self, this._then);

  final HwBulkResponse _self;
  final $Res Function(HwBulkResponse) _then;

/// Create a copy of HwBulkResponse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? applied = null,Object? skipped = null,Object? rows = null,}) {
  return _then(HwBulkResponse(
applied: null == applied ? _self.applied : applied // ignore: cast_nullable_to_non_nullable
as List<String>,skipped: null == skipped ? _self.skipped : skipped // ignore: cast_nullable_to_non_nullable
as List<String>,rows: null == rows ? _self.rows : rows // ignore: cast_nullable_to_non_nullable
as List<HwRow>,
  ));
}

}


/// Adds pattern-matching-related methods to [HwBulkResponse].
extension HwBulkResponsePatterns on HwBulkResponse {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HwBulkResponse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HwBulkResponse() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HwBulkResponse value)  $default,){
final _that = this;
switch (_that) {
case _HwBulkResponse():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HwBulkResponse value)?  $default,){
final _that = this;
switch (_that) {
case _HwBulkResponse() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<String> applied,  List<String> skipped,  List<HwRow> rows)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HwBulkResponse() when $default != null:
return $default(_that.applied,_that.skipped,_that.rows);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<String> applied,  List<String> skipped,  List<HwRow> rows)  $default,) {final _that = this;
switch (_that) {
case _HwBulkResponse():
return $default(_that.applied,_that.skipped,_that.rows);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<String> applied,  List<String> skipped,  List<HwRow> rows)?  $default,) {final _that = this;
switch (_that) {
case _HwBulkResponse() when $default != null:
return $default(_that.applied,_that.skipped,_that.rows);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HwBulkResponse implements HwBulkResponse {
  const _HwBulkResponse({ List<String> applied = const <String>[],  List<String> skipped = const <String>[],  List<HwRow> rows = const <HwRow>[]}): _applied = applied,_skipped = skipped,_rows = rows;
  factory _HwBulkResponse.fromJson(Map<String, dynamic> json) => _$HwBulkResponseFromJson(json);

 final  List<String> _applied;
@override@JsonKey() List<String> get applied {
  if (_applied is EqualUnmodifiableListView) return _applied;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_applied);
}

 final  List<String> _skipped;
@override@JsonKey() List<String> get skipped {
  if (_skipped is EqualUnmodifiableListView) return _skipped;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_skipped);
}

 final  List<HwRow> _rows;
@override@JsonKey() List<HwRow> get rows {
  if (_rows is EqualUnmodifiableListView) return _rows;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_rows);
}


/// Create a copy of HwBulkResponse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HwBulkResponseCopyWith<_HwBulkResponse> get copyWith => __$HwBulkResponseCopyWithImpl<_HwBulkResponse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HwBulkResponseToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HwBulkResponse&&const DeepCollectionEquality().equals(other.applied, _applied)&&const DeepCollectionEquality().equals(other.skipped, _skipped)&&const DeepCollectionEquality().equals(other.rows, _rows));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,const DeepCollectionEquality().hash(_applied),const DeepCollectionEquality().hash(_skipped),const DeepCollectionEquality().hash(_rows));
}

@override
String toString() {
    return 'HwBulkResponse(applied: $applied, skipped: $skipped, rows: $rows)';
}


}

/// @nodoc
abstract mixin class _$HwBulkResponseCopyWith<$Res> implements $HwBulkResponseCopyWith<$Res> {
  factory _$HwBulkResponseCopyWith(_HwBulkResponse value, $Res Function(_HwBulkResponse) _then) = __$HwBulkResponseCopyWithImpl;
@override @useResult
$Res call({
 List<String> applied, List<String> skipped, List<HwRow> rows
});




}
/// @nodoc
class __$HwBulkResponseCopyWithImpl<$Res>
    implements _$HwBulkResponseCopyWith<$Res> {
  __$HwBulkResponseCopyWithImpl(this._self, this._then);

  final _HwBulkResponse _self;
  final $Res Function(_HwBulkResponse) _then;

/// Create a copy of HwBulkResponse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? applied = null,Object? skipped = null,Object? rows = null,}) {
  return _then(_HwBulkResponse(
applied: null == applied ? _self._applied : applied // ignore: cast_nullable_to_non_nullable
as List<String>,skipped: null == skipped ? _self._skipped : skipped // ignore: cast_nullable_to_non_nullable
as List<String>,rows: null == rows ? _self._rows : rows // ignore: cast_nullable_to_non_nullable
as List<HwRow>,
  ));
}


}


/// @nodoc
mixin _$StaffRef {

 String get id; String get firstName; String? get lastName; String? get role;
/// Create a copy of StaffRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StaffRefCopyWith<StaffRef> get copyWith => _$StaffRefCopyWithImpl<StaffRef>(this as StaffRef, _$identity);

  /// Serializes this StaffRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as StaffRef;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StaffRef&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.firstName, _this.firstName) || other.firstName == _this.firstName)&&(identical(other.lastName, _this.lastName) || other.lastName == _this.lastName)&&(identical(other.role, _this.role) || other.role == _this.role));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as StaffRef;
  return Object.hash(runtimeType,_this.id,_this.firstName,_this.lastName,_this.role);
}

@override
String toString() {
  final _this = this as StaffRef;
  return 'StaffRef(id: ${_this.id}, firstName: ${_this.firstName}, lastName: ${_this.lastName}, role: ${_this.role})';
}


}

/// @nodoc
abstract mixin class $StaffRefCopyWith<$Res>  {
  factory $StaffRefCopyWith(StaffRef value, $Res Function(StaffRef) _then) = _$StaffRefCopyWithImpl;
@useResult
$Res call({
 String id, String firstName, String? lastName, String? role
});




}
/// @nodoc
class _$StaffRefCopyWithImpl<$Res>
    implements $StaffRefCopyWith<$Res> {
  _$StaffRefCopyWithImpl(this._self, this._then);

  final StaffRef _self;
  final $Res Function(StaffRef) _then;

/// Create a copy of StaffRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? firstName = null,Object? lastName = freezed,Object? role = freezed,}) {
  return _then(StaffRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,role: freezed == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [StaffRef].
extension StaffRefPatterns on StaffRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StaffRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StaffRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StaffRef value)  $default,){
final _that = this;
switch (_that) {
case _StaffRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StaffRef value)?  $default,){
final _that = this;
switch (_that) {
case _StaffRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String firstName,  String? lastName,  String? role)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StaffRef() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName,_that.role);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String firstName,  String? lastName,  String? role)  $default,) {final _that = this;
switch (_that) {
case _StaffRef():
return $default(_that.id,_that.firstName,_that.lastName,_that.role);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String firstName,  String? lastName,  String? role)?  $default,) {final _that = this;
switch (_that) {
case _StaffRef() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName,_that.role);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StaffRef implements StaffRef {
  const _StaffRef({required this.id, this.firstName = '', this.lastName, this.role});
  factory _StaffRef.fromJson(Map<String, dynamic> json) => _$StaffRefFromJson(json);

@override final  String id;
@override@JsonKey() final  String firstName;
@override final  String? lastName;
@override final  String? role;

/// Create a copy of StaffRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StaffRefCopyWith<_StaffRef> get copyWith => __$StaffRefCopyWithImpl<_StaffRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StaffRefToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _StaffRef&&(identical(other.id, id) || other.id == id)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.role, role) || other.role == role));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,firstName,lastName,role);
}

@override
String toString() {
    return 'StaffRef(id: $id, firstName: $firstName, lastName: $lastName, role: $role)';
}


}

/// @nodoc
abstract mixin class _$StaffRefCopyWith<$Res> implements $StaffRefCopyWith<$Res> {
  factory _$StaffRefCopyWith(_StaffRef value, $Res Function(_StaffRef) _then) = __$StaffRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String firstName, String? lastName, String? role
});




}
/// @nodoc
class __$StaffRefCopyWithImpl<$Res>
    implements _$StaffRefCopyWith<$Res> {
  __$StaffRefCopyWithImpl(this._self, this._then);

  final _StaffRef _self;
  final $Res Function(_StaffRef) _then;

/// Create a copy of StaffRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? firstName = null,Object? lastName = freezed,Object? role = freezed,}) {
  return _then(_StaffRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,role: freezed == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ClassroomSummary {

 String get id; String get name; String get type; int? get grade; StaffRef? get teacher; StaffRef? get assistantTeacher;@JsonKey(readValue: readEnrollmentCount) int get studentCount;
/// Create a copy of ClassroomSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ClassroomSummaryCopyWith<ClassroomSummary> get copyWith => _$ClassroomSummaryCopyWithImpl<ClassroomSummary>(this as ClassroomSummary, _$identity);

  /// Serializes this ClassroomSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ClassroomSummary;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ClassroomSummary&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.type, _this.type) || other.type == _this.type)&&(identical(other.grade, _this.grade) || other.grade == _this.grade)&&(identical(other.teacher, _this.teacher) || other.teacher == _this.teacher)&&(identical(other.assistantTeacher, _this.assistantTeacher) || other.assistantTeacher == _this.assistantTeacher)&&(identical(other.studentCount, _this.studentCount) || other.studentCount == _this.studentCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ClassroomSummary;
  return Object.hash(runtimeType,_this.id,_this.name,_this.type,_this.grade,_this.teacher,_this.assistantTeacher,_this.studentCount);
}

@override
String toString() {
  final _this = this as ClassroomSummary;
  return 'ClassroomSummary(id: ${_this.id}, name: ${_this.name}, type: ${_this.type}, grade: ${_this.grade}, teacher: ${_this.teacher}, assistantTeacher: ${_this.assistantTeacher}, studentCount: ${_this.studentCount})';
}


}

/// @nodoc
abstract mixin class $ClassroomSummaryCopyWith<$Res>  {
  factory $ClassroomSummaryCopyWith(ClassroomSummary value, $Res Function(ClassroomSummary) _then) = _$ClassroomSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String name, String type, int? grade, StaffRef? teacher, StaffRef? assistantTeacher,@JsonKey(readValue: readEnrollmentCount) int studentCount
});


$StaffRefCopyWith<$Res>? get teacher;$StaffRefCopyWith<$Res>? get assistantTeacher;

}
/// @nodoc
class _$ClassroomSummaryCopyWithImpl<$Res>
    implements $ClassroomSummaryCopyWith<$Res> {
  _$ClassroomSummaryCopyWithImpl(this._self, this._then);

  final ClassroomSummary _self;
  final $Res Function(ClassroomSummary) _then;

/// Create a copy of ClassroomSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? type = null,Object? grade = freezed,Object? teacher = freezed,Object? assistantTeacher = freezed,Object? studentCount = null,}) {
  return _then(ClassroomSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,teacher: freezed == teacher ? _self.teacher : teacher // ignore: cast_nullable_to_non_nullable
as StaffRef?,assistantTeacher: freezed == assistantTeacher ? _self.assistantTeacher : assistantTeacher // ignore: cast_nullable_to_non_nullable
as StaffRef?,studentCount: null == studentCount ? _self.studentCount : studentCount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}
/// Create a copy of ClassroomSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$StaffRefCopyWith<$Res>? get teacher {
    if (_self.teacher == null) {
    return null;
  }

  return $StaffRefCopyWith<$Res>(_self.teacher!, (value) {
    return _then(_self.copyWith(teacher: value));
  });
}/// Create a copy of ClassroomSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$StaffRefCopyWith<$Res>? get assistantTeacher {
    if (_self.assistantTeacher == null) {
    return null;
  }

  return $StaffRefCopyWith<$Res>(_self.assistantTeacher!, (value) {
    return _then(_self.copyWith(assistantTeacher: value));
  });
}
}


/// Adds pattern-matching-related methods to [ClassroomSummary].
extension ClassroomSummaryPatterns on ClassroomSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ClassroomSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ClassroomSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ClassroomSummary value)  $default,){
final _that = this;
switch (_that) {
case _ClassroomSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ClassroomSummary value)?  $default,){
final _that = this;
switch (_that) {
case _ClassroomSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String type,  int? grade,  StaffRef? teacher,  StaffRef? assistantTeacher, @JsonKey(readValue: readEnrollmentCount)  int studentCount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ClassroomSummary() when $default != null:
return $default(_that.id,_that.name,_that.type,_that.grade,_that.teacher,_that.assistantTeacher,_that.studentCount);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String type,  int? grade,  StaffRef? teacher,  StaffRef? assistantTeacher, @JsonKey(readValue: readEnrollmentCount)  int studentCount)  $default,) {final _that = this;
switch (_that) {
case _ClassroomSummary():
return $default(_that.id,_that.name,_that.type,_that.grade,_that.teacher,_that.assistantTeacher,_that.studentCount);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String type,  int? grade,  StaffRef? teacher,  StaffRef? assistantTeacher, @JsonKey(readValue: readEnrollmentCount)  int studentCount)?  $default,) {final _that = this;
switch (_that) {
case _ClassroomSummary() when $default != null:
return $default(_that.id,_that.name,_that.type,_that.grade,_that.teacher,_that.assistantTeacher,_that.studentCount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ClassroomSummary extends ClassroomSummary {
  const _ClassroomSummary({required this.id, required this.name, this.type = 'IN_PERSON', this.grade, this.teacher, this.assistantTeacher, @JsonKey(readValue: readEnrollmentCount) this.studentCount = 0}): super._();
  factory _ClassroomSummary.fromJson(Map<String, dynamic> json) => _$ClassroomSummaryFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String type;
@override final  int? grade;
@override final  StaffRef? teacher;
@override final  StaffRef? assistantTeacher;
@override@JsonKey(readValue: readEnrollmentCount) final  int studentCount;

/// Create a copy of ClassroomSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ClassroomSummaryCopyWith<_ClassroomSummary> get copyWith => __$ClassroomSummaryCopyWithImpl<_ClassroomSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ClassroomSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ClassroomSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.type, type) || other.type == type)&&(identical(other.grade, grade) || other.grade == grade)&&(identical(other.teacher, teacher) || other.teacher == teacher)&&(identical(other.assistantTeacher, assistantTeacher) || other.assistantTeacher == assistantTeacher)&&(identical(other.studentCount, studentCount) || other.studentCount == studentCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,type,grade,teacher,assistantTeacher,studentCount);
}

@override
String toString() {
    return 'ClassroomSummary(id: $id, name: $name, type: $type, grade: $grade, teacher: $teacher, assistantTeacher: $assistantTeacher, studentCount: $studentCount)';
}


}

/// @nodoc
abstract mixin class _$ClassroomSummaryCopyWith<$Res> implements $ClassroomSummaryCopyWith<$Res> {
  factory _$ClassroomSummaryCopyWith(_ClassroomSummary value, $Res Function(_ClassroomSummary) _then) = __$ClassroomSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String type, int? grade, StaffRef? teacher, StaffRef? assistantTeacher,@JsonKey(readValue: readEnrollmentCount) int studentCount
});


@override $StaffRefCopyWith<$Res>? get teacher;@override $StaffRefCopyWith<$Res>? get assistantTeacher;

}
/// @nodoc
class __$ClassroomSummaryCopyWithImpl<$Res>
    implements _$ClassroomSummaryCopyWith<$Res> {
  __$ClassroomSummaryCopyWithImpl(this._self, this._then);

  final _ClassroomSummary _self;
  final $Res Function(_ClassroomSummary) _then;

/// Create a copy of ClassroomSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? type = null,Object? grade = freezed,Object? teacher = freezed,Object? assistantTeacher = freezed,Object? studentCount = null,}) {
  return _then(_ClassroomSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,teacher: freezed == teacher ? _self.teacher : teacher // ignore: cast_nullable_to_non_nullable
as StaffRef?,assistantTeacher: freezed == assistantTeacher ? _self.assistantTeacher : assistantTeacher // ignore: cast_nullable_to_non_nullable
as StaffRef?,studentCount: null == studentCount ? _self.studentCount : studentCount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

/// Create a copy of ClassroomSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$StaffRefCopyWith<$Res>? get teacher {
    if (_self.teacher == null) {
    return null;
  }

  return $StaffRefCopyWith<$Res>(_self.teacher!, (value) {
    return _then(_self.copyWith(teacher: value));
  });
}/// Create a copy of ClassroomSummary
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$StaffRefCopyWith<$Res>? get assistantTeacher {
    if (_self.assistantTeacher == null) {
    return null;
  }

  return $StaffRefCopyWith<$Res>(_self.assistantTeacher!, (value) {
    return _then(_self.copyWith(assistantTeacher: value));
  });
}
}


/// @nodoc
mixin _$RosterStudent {

 String get id; String get firstName; String? get lastName; String? get studentCode; String? get joinedAt;
/// Create a copy of RosterStudent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RosterStudentCopyWith<RosterStudent> get copyWith => _$RosterStudentCopyWithImpl<RosterStudent>(this as RosterStudent, _$identity);

  /// Serializes this RosterStudent to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as RosterStudent;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RosterStudent&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.firstName, _this.firstName) || other.firstName == _this.firstName)&&(identical(other.lastName, _this.lastName) || other.lastName == _this.lastName)&&(identical(other.studentCode, _this.studentCode) || other.studentCode == _this.studentCode)&&(identical(other.joinedAt, _this.joinedAt) || other.joinedAt == _this.joinedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as RosterStudent;
  return Object.hash(runtimeType,_this.id,_this.firstName,_this.lastName,_this.studentCode,_this.joinedAt);
}

@override
String toString() {
  final _this = this as RosterStudent;
  return 'RosterStudent(id: ${_this.id}, firstName: ${_this.firstName}, lastName: ${_this.lastName}, studentCode: ${_this.studentCode}, joinedAt: ${_this.joinedAt})';
}


}

/// @nodoc
abstract mixin class $RosterStudentCopyWith<$Res>  {
  factory $RosterStudentCopyWith(RosterStudent value, $Res Function(RosterStudent) _then) = _$RosterStudentCopyWithImpl;
@useResult
$Res call({
 String id, String firstName, String? lastName, String? studentCode, String? joinedAt
});




}
/// @nodoc
class _$RosterStudentCopyWithImpl<$Res>
    implements $RosterStudentCopyWith<$Res> {
  _$RosterStudentCopyWithImpl(this._self, this._then);

  final RosterStudent _self;
  final $Res Function(RosterStudent) _then;

/// Create a copy of RosterStudent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? firstName = null,Object? lastName = freezed,Object? studentCode = freezed,Object? joinedAt = freezed,}) {
  return _then(RosterStudent(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,studentCode: freezed == studentCode ? _self.studentCode : studentCode // ignore: cast_nullable_to_non_nullable
as String?,joinedAt: freezed == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [RosterStudent].
extension RosterStudentPatterns on RosterStudent {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RosterStudent value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RosterStudent() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RosterStudent value)  $default,){
final _that = this;
switch (_that) {
case _RosterStudent():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RosterStudent value)?  $default,){
final _that = this;
switch (_that) {
case _RosterStudent() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String firstName,  String? lastName,  String? studentCode,  String? joinedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RosterStudent() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName,_that.studentCode,_that.joinedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String firstName,  String? lastName,  String? studentCode,  String? joinedAt)  $default,) {final _that = this;
switch (_that) {
case _RosterStudent():
return $default(_that.id,_that.firstName,_that.lastName,_that.studentCode,_that.joinedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String firstName,  String? lastName,  String? studentCode,  String? joinedAt)?  $default,) {final _that = this;
switch (_that) {
case _RosterStudent() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName,_that.studentCode,_that.joinedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RosterStudent implements RosterStudent {
  const _RosterStudent({required this.id, this.firstName = '', this.lastName, this.studentCode, this.joinedAt});
  factory _RosterStudent.fromJson(Map<String, dynamic> json) => _$RosterStudentFromJson(json);

@override final  String id;
@override@JsonKey() final  String firstName;
@override final  String? lastName;
@override final  String? studentCode;
@override final  String? joinedAt;

/// Create a copy of RosterStudent
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RosterStudentCopyWith<_RosterStudent> get copyWith => __$RosterStudentCopyWithImpl<_RosterStudent>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RosterStudentToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _RosterStudent&&(identical(other.id, id) || other.id == id)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.studentCode, studentCode) || other.studentCode == studentCode)&&(identical(other.joinedAt, joinedAt) || other.joinedAt == joinedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,firstName,lastName,studentCode,joinedAt);
}

@override
String toString() {
    return 'RosterStudent(id: $id, firstName: $firstName, lastName: $lastName, studentCode: $studentCode, joinedAt: $joinedAt)';
}


}

/// @nodoc
abstract mixin class _$RosterStudentCopyWith<$Res> implements $RosterStudentCopyWith<$Res> {
  factory _$RosterStudentCopyWith(_RosterStudent value, $Res Function(_RosterStudent) _then) = __$RosterStudentCopyWithImpl;
@override @useResult
$Res call({
 String id, String firstName, String? lastName, String? studentCode, String? joinedAt
});




}
/// @nodoc
class __$RosterStudentCopyWithImpl<$Res>
    implements _$RosterStudentCopyWith<$Res> {
  __$RosterStudentCopyWithImpl(this._self, this._then);

  final _RosterStudent _self;
  final $Res Function(_RosterStudent) _then;

/// Create a copy of RosterStudent
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? firstName = null,Object? lastName = freezed,Object? studentCode = freezed,Object? joinedAt = freezed,}) {
  return _then(_RosterStudent(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,studentCode: freezed == studentCode ? _self.studentCode : studentCode // ignore: cast_nullable_to_non_nullable
as String?,joinedAt: freezed == joinedAt ? _self.joinedAt : joinedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ClassroomDetail {

 ClassroomSummary get classroom; List<RosterStudent> get students;
/// Create a copy of ClassroomDetail
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ClassroomDetailCopyWith<ClassroomDetail> get copyWith => _$ClassroomDetailCopyWithImpl<ClassroomDetail>(this as ClassroomDetail, _$identity);

  /// Serializes this ClassroomDetail to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ClassroomDetail;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ClassroomDetail&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom)&&const DeepCollectionEquality().equals(other.students, _this.students));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ClassroomDetail;
  return Object.hash(runtimeType,_this.classroom,const DeepCollectionEquality().hash(_this.students));
}

@override
String toString() {
  final _this = this as ClassroomDetail;
  return 'ClassroomDetail(classroom: ${_this.classroom}, students: ${_this.students})';
}


}

/// @nodoc
abstract mixin class $ClassroomDetailCopyWith<$Res>  {
  factory $ClassroomDetailCopyWith(ClassroomDetail value, $Res Function(ClassroomDetail) _then) = _$ClassroomDetailCopyWithImpl;
@useResult
$Res call({
 ClassroomSummary classroom, List<RosterStudent> students
});


$ClassroomSummaryCopyWith<$Res> get classroom;

}
/// @nodoc
class _$ClassroomDetailCopyWithImpl<$Res>
    implements $ClassroomDetailCopyWith<$Res> {
  _$ClassroomDetailCopyWithImpl(this._self, this._then);

  final ClassroomDetail _self;
  final $Res Function(ClassroomDetail) _then;

/// Create a copy of ClassroomDetail
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? classroom = null,Object? students = null,}) {
  return _then(ClassroomDetail(
classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ClassroomSummary,students: null == students ? _self.students : students // ignore: cast_nullable_to_non_nullable
as List<RosterStudent>,
  ));
}
/// Create a copy of ClassroomDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClassroomSummaryCopyWith<$Res> get classroom {
  
  return $ClassroomSummaryCopyWith<$Res>(_self.classroom, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// Adds pattern-matching-related methods to [ClassroomDetail].
extension ClassroomDetailPatterns on ClassroomDetail {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ClassroomDetail value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ClassroomDetail() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ClassroomDetail value)  $default,){
final _that = this;
switch (_that) {
case _ClassroomDetail():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ClassroomDetail value)?  $default,){
final _that = this;
switch (_that) {
case _ClassroomDetail() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( ClassroomSummary classroom,  List<RosterStudent> students)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ClassroomDetail() when $default != null:
return $default(_that.classroom,_that.students);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( ClassroomSummary classroom,  List<RosterStudent> students)  $default,) {final _that = this;
switch (_that) {
case _ClassroomDetail():
return $default(_that.classroom,_that.students);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( ClassroomSummary classroom,  List<RosterStudent> students)?  $default,) {final _that = this;
switch (_that) {
case _ClassroomDetail() when $default != null:
return $default(_that.classroom,_that.students);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ClassroomDetail implements ClassroomDetail {
  const _ClassroomDetail({required this.classroom,  List<RosterStudent> students = const <RosterStudent>[]}): _students = students;
  factory _ClassroomDetail.fromJson(Map<String, dynamic> json) => _$ClassroomDetailFromJson(json);

@override final  ClassroomSummary classroom;
 final  List<RosterStudent> _students;
@override@JsonKey() List<RosterStudent> get students {
  if (_students is EqualUnmodifiableListView) return _students;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_students);
}


/// Create a copy of ClassroomDetail
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ClassroomDetailCopyWith<_ClassroomDetail> get copyWith => __$ClassroomDetailCopyWithImpl<_ClassroomDetail>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ClassroomDetailToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ClassroomDetail&&(identical(other.classroom, classroom) || other.classroom == classroom)&&const DeepCollectionEquality().equals(other.students, _students));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,classroom,const DeepCollectionEquality().hash(_students));
}

@override
String toString() {
    return 'ClassroomDetail(classroom: $classroom, students: $students)';
}


}

/// @nodoc
abstract mixin class _$ClassroomDetailCopyWith<$Res> implements $ClassroomDetailCopyWith<$Res> {
  factory _$ClassroomDetailCopyWith(_ClassroomDetail value, $Res Function(_ClassroomDetail) _then) = __$ClassroomDetailCopyWithImpl;
@override @useResult
$Res call({
 ClassroomSummary classroom, List<RosterStudent> students
});


@override $ClassroomSummaryCopyWith<$Res> get classroom;

}
/// @nodoc
class __$ClassroomDetailCopyWithImpl<$Res>
    implements _$ClassroomDetailCopyWith<$Res> {
  __$ClassroomDetailCopyWithImpl(this._self, this._then);

  final _ClassroomDetail _self;
  final $Res Function(_ClassroomDetail) _then;

/// Create a copy of ClassroomDetail
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? classroom = null,Object? students = null,}) {
  return _then(_ClassroomDetail(
classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ClassroomSummary,students: null == students ? _self._students : students // ignore: cast_nullable_to_non_nullable
as List<RosterStudent>,
  ));
}

/// Create a copy of ClassroomDetail
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClassroomSummaryCopyWith<$Res> get classroom {
  
  return $ClassroomSummaryCopyWith<$Res>(_self.classroom, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// @nodoc
mixin _$NamedRef {

 String get id; String get name;
/// Create a copy of NamedRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$NamedRefCopyWith<NamedRef> get copyWith => _$NamedRefCopyWithImpl<NamedRef>(this as NamedRef, _$identity);

  /// Serializes this NamedRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as NamedRef;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is NamedRef&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as NamedRef;
  return Object.hash(runtimeType,_this.id,_this.name);
}

@override
String toString() {
  final _this = this as NamedRef;
  return 'NamedRef(id: ${_this.id}, name: ${_this.name})';
}


}

/// @nodoc
abstract mixin class $NamedRefCopyWith<$Res>  {
  factory $NamedRefCopyWith(NamedRef value, $Res Function(NamedRef) _then) = _$NamedRefCopyWithImpl;
@useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class _$NamedRefCopyWithImpl<$Res>
    implements $NamedRefCopyWith<$Res> {
  _$NamedRefCopyWithImpl(this._self, this._then);

  final NamedRef _self;
  final $Res Function(NamedRef) _then;

/// Create a copy of NamedRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,}) {
  return _then(NamedRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [NamedRef].
extension NamedRefPatterns on NamedRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _NamedRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _NamedRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _NamedRef value)  $default,){
final _that = this;
switch (_that) {
case _NamedRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _NamedRef value)?  $default,){
final _that = this;
switch (_that) {
case _NamedRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _NamedRef() when $default != null:
return $default(_that.id,_that.name);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name)  $default,) {final _that = this;
switch (_that) {
case _NamedRef():
return $default(_that.id,_that.name);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name)?  $default,) {final _that = this;
switch (_that) {
case _NamedRef() when $default != null:
return $default(_that.id,_that.name);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _NamedRef implements NamedRef {
  const _NamedRef({required this.id, this.name = ''});
  factory _NamedRef.fromJson(Map<String, dynamic> json) => _$NamedRefFromJson(json);

@override final  String id;
@override@JsonKey() final  String name;

/// Create a copy of NamedRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$NamedRefCopyWith<_NamedRef> get copyWith => __$NamedRefCopyWithImpl<_NamedRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$NamedRefToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _NamedRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name);
}

@override
String toString() {
    return 'NamedRef(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class _$NamedRefCopyWith<$Res> implements $NamedRefCopyWith<$Res> {
  factory _$NamedRefCopyWith(_NamedRef value, $Res Function(_NamedRef) _then) = __$NamedRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class __$NamedRefCopyWithImpl<$Res>
    implements _$NamedRefCopyWith<$Res> {
  __$NamedRefCopyWithImpl(this._self, this._then);

  final _NamedRef _self;
  final $Res Function(_NamedRef) _then;

/// Create a copy of NamedRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,}) {
  return _then(_NamedRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$StudentAttendanceRow {

 String get date;@AttStatusConverter() AttendanceStatus? get status; String? get note;@LateRangeConverter() LateRange? get lateRange; NamedRef? get classroom;
/// Create a copy of StudentAttendanceRow
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StudentAttendanceRowCopyWith<StudentAttendanceRow> get copyWith => _$StudentAttendanceRowCopyWithImpl<StudentAttendanceRow>(this as StudentAttendanceRow, _$identity);

  /// Serializes this StudentAttendanceRow to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as StudentAttendanceRow;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StudentAttendanceRow&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.note, _this.note) || other.note == _this.note)&&(identical(other.lateRange, _this.lateRange) || other.lateRange == _this.lateRange)&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as StudentAttendanceRow;
  return Object.hash(runtimeType,_this.date,_this.status,_this.note,_this.lateRange,_this.classroom);
}

@override
String toString() {
  final _this = this as StudentAttendanceRow;
  return 'StudentAttendanceRow(date: ${_this.date}, status: ${_this.status}, note: ${_this.note}, lateRange: ${_this.lateRange}, classroom: ${_this.classroom})';
}


}

/// @nodoc
abstract mixin class $StudentAttendanceRowCopyWith<$Res>  {
  factory $StudentAttendanceRowCopyWith(StudentAttendanceRow value, $Res Function(StudentAttendanceRow) _then) = _$StudentAttendanceRowCopyWithImpl;
@useResult
$Res call({
 String date,@AttStatusConverter() AttendanceStatus? status, String? note,@LateRangeConverter() LateRange? lateRange, NamedRef? classroom
});


$NamedRefCopyWith<$Res>? get classroom;

}
/// @nodoc
class _$StudentAttendanceRowCopyWithImpl<$Res>
    implements $StudentAttendanceRowCopyWith<$Res> {
  _$StudentAttendanceRowCopyWithImpl(this._self, this._then);

  final StudentAttendanceRow _self;
  final $Res Function(StudentAttendanceRow) _then;

/// Create a copy of StudentAttendanceRow
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? status = freezed,Object? note = freezed,Object? lateRange = freezed,Object? classroom = freezed,}) {
  return _then(StudentAttendanceRow(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as AttendanceStatus?,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,lateRange: freezed == lateRange ? _self.lateRange : lateRange // ignore: cast_nullable_to_non_nullable
as LateRange?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as NamedRef?,
  ));
}
/// Create a copy of StudentAttendanceRow
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$NamedRefCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $NamedRefCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// Adds pattern-matching-related methods to [StudentAttendanceRow].
extension StudentAttendanceRowPatterns on StudentAttendanceRow {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StudentAttendanceRow value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StudentAttendanceRow() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StudentAttendanceRow value)  $default,){
final _that = this;
switch (_that) {
case _StudentAttendanceRow():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StudentAttendanceRow value)?  $default,){
final _that = this;
switch (_that) {
case _StudentAttendanceRow() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date, @AttStatusConverter()  AttendanceStatus? status,  String? note, @LateRangeConverter()  LateRange? lateRange,  NamedRef? classroom)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StudentAttendanceRow() when $default != null:
return $default(_that.date,_that.status,_that.note,_that.lateRange,_that.classroom);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date, @AttStatusConverter()  AttendanceStatus? status,  String? note, @LateRangeConverter()  LateRange? lateRange,  NamedRef? classroom)  $default,) {final _that = this;
switch (_that) {
case _StudentAttendanceRow():
return $default(_that.date,_that.status,_that.note,_that.lateRange,_that.classroom);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date, @AttStatusConverter()  AttendanceStatus? status,  String? note, @LateRangeConverter()  LateRange? lateRange,  NamedRef? classroom)?  $default,) {final _that = this;
switch (_that) {
case _StudentAttendanceRow() when $default != null:
return $default(_that.date,_that.status,_that.note,_that.lateRange,_that.classroom);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StudentAttendanceRow implements StudentAttendanceRow {
  const _StudentAttendanceRow({required this.date, @AttStatusConverter() this.status, this.note, @LateRangeConverter() this.lateRange, this.classroom});
  factory _StudentAttendanceRow.fromJson(Map<String, dynamic> json) => _$StudentAttendanceRowFromJson(json);

@override final  String date;
@override@AttStatusConverter() final  AttendanceStatus? status;
@override final  String? note;
@override@LateRangeConverter() final  LateRange? lateRange;
@override final  NamedRef? classroom;

/// Create a copy of StudentAttendanceRow
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StudentAttendanceRowCopyWith<_StudentAttendanceRow> get copyWith => __$StudentAttendanceRowCopyWithImpl<_StudentAttendanceRow>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StudentAttendanceRowToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _StudentAttendanceRow&&(identical(other.date, date) || other.date == date)&&(identical(other.status, status) || other.status == status)&&(identical(other.note, note) || other.note == note)&&(identical(other.lateRange, lateRange) || other.lateRange == lateRange)&&(identical(other.classroom, classroom) || other.classroom == classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,status,note,lateRange,classroom);
}

@override
String toString() {
    return 'StudentAttendanceRow(date: $date, status: $status, note: $note, lateRange: $lateRange, classroom: $classroom)';
}


}

/// @nodoc
abstract mixin class _$StudentAttendanceRowCopyWith<$Res> implements $StudentAttendanceRowCopyWith<$Res> {
  factory _$StudentAttendanceRowCopyWith(_StudentAttendanceRow value, $Res Function(_StudentAttendanceRow) _then) = __$StudentAttendanceRowCopyWithImpl;
@override @useResult
$Res call({
 String date,@AttStatusConverter() AttendanceStatus? status, String? note,@LateRangeConverter() LateRange? lateRange, NamedRef? classroom
});


@override $NamedRefCopyWith<$Res>? get classroom;

}
/// @nodoc
class __$StudentAttendanceRowCopyWithImpl<$Res>
    implements _$StudentAttendanceRowCopyWith<$Res> {
  __$StudentAttendanceRowCopyWithImpl(this._self, this._then);

  final _StudentAttendanceRow _self;
  final $Res Function(_StudentAttendanceRow) _then;

/// Create a copy of StudentAttendanceRow
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? status = freezed,Object? note = freezed,Object? lateRange = freezed,Object? classroom = freezed,}) {
  return _then(_StudentAttendanceRow(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as AttendanceStatus?,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,lateRange: freezed == lateRange ? _self.lateRange : lateRange // ignore: cast_nullable_to_non_nullable
as LateRange?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as NamedRef?,
  ));
}

/// Create a copy of StudentAttendanceRow
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$NamedRefCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $NamedRefCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// @nodoc
mixin _$StudentHomeworkRow {

 String get date;@HwStatusConverter() HomeworkStatus? get status; String? get comment; NamedRef? get classroom;
/// Create a copy of StudentHomeworkRow
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StudentHomeworkRowCopyWith<StudentHomeworkRow> get copyWith => _$StudentHomeworkRowCopyWithImpl<StudentHomeworkRow>(this as StudentHomeworkRow, _$identity);

  /// Serializes this StudentHomeworkRow to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as StudentHomeworkRow;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StudentHomeworkRow&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.comment, _this.comment) || other.comment == _this.comment)&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as StudentHomeworkRow;
  return Object.hash(runtimeType,_this.date,_this.status,_this.comment,_this.classroom);
}

@override
String toString() {
  final _this = this as StudentHomeworkRow;
  return 'StudentHomeworkRow(date: ${_this.date}, status: ${_this.status}, comment: ${_this.comment}, classroom: ${_this.classroom})';
}


}

/// @nodoc
abstract mixin class $StudentHomeworkRowCopyWith<$Res>  {
  factory $StudentHomeworkRowCopyWith(StudentHomeworkRow value, $Res Function(StudentHomeworkRow) _then) = _$StudentHomeworkRowCopyWithImpl;
@useResult
$Res call({
 String date,@HwStatusConverter() HomeworkStatus? status, String? comment, NamedRef? classroom
});


$NamedRefCopyWith<$Res>? get classroom;

}
/// @nodoc
class _$StudentHomeworkRowCopyWithImpl<$Res>
    implements $StudentHomeworkRowCopyWith<$Res> {
  _$StudentHomeworkRowCopyWithImpl(this._self, this._then);

  final StudentHomeworkRow _self;
  final $Res Function(StudentHomeworkRow) _then;

/// Create a copy of StudentHomeworkRow
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? status = freezed,Object? comment = freezed,Object? classroom = freezed,}) {
  return _then(StudentHomeworkRow(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as HomeworkStatus?,comment: freezed == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as NamedRef?,
  ));
}
/// Create a copy of StudentHomeworkRow
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$NamedRefCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $NamedRefCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// Adds pattern-matching-related methods to [StudentHomeworkRow].
extension StudentHomeworkRowPatterns on StudentHomeworkRow {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StudentHomeworkRow value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StudentHomeworkRow() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StudentHomeworkRow value)  $default,){
final _that = this;
switch (_that) {
case _StudentHomeworkRow():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StudentHomeworkRow value)?  $default,){
final _that = this;
switch (_that) {
case _StudentHomeworkRow() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date, @HwStatusConverter()  HomeworkStatus? status,  String? comment,  NamedRef? classroom)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StudentHomeworkRow() when $default != null:
return $default(_that.date,_that.status,_that.comment,_that.classroom);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date, @HwStatusConverter()  HomeworkStatus? status,  String? comment,  NamedRef? classroom)  $default,) {final _that = this;
switch (_that) {
case _StudentHomeworkRow():
return $default(_that.date,_that.status,_that.comment,_that.classroom);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date, @HwStatusConverter()  HomeworkStatus? status,  String? comment,  NamedRef? classroom)?  $default,) {final _that = this;
switch (_that) {
case _StudentHomeworkRow() when $default != null:
return $default(_that.date,_that.status,_that.comment,_that.classroom);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StudentHomeworkRow implements StudentHomeworkRow {
  const _StudentHomeworkRow({required this.date, @HwStatusConverter() this.status, this.comment, this.classroom});
  factory _StudentHomeworkRow.fromJson(Map<String, dynamic> json) => _$StudentHomeworkRowFromJson(json);

@override final  String date;
@override@HwStatusConverter() final  HomeworkStatus? status;
@override final  String? comment;
@override final  NamedRef? classroom;

/// Create a copy of StudentHomeworkRow
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StudentHomeworkRowCopyWith<_StudentHomeworkRow> get copyWith => __$StudentHomeworkRowCopyWithImpl<_StudentHomeworkRow>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StudentHomeworkRowToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _StudentHomeworkRow&&(identical(other.date, date) || other.date == date)&&(identical(other.status, status) || other.status == status)&&(identical(other.comment, comment) || other.comment == comment)&&(identical(other.classroom, classroom) || other.classroom == classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,status,comment,classroom);
}

@override
String toString() {
    return 'StudentHomeworkRow(date: $date, status: $status, comment: $comment, classroom: $classroom)';
}


}

/// @nodoc
abstract mixin class _$StudentHomeworkRowCopyWith<$Res> implements $StudentHomeworkRowCopyWith<$Res> {
  factory _$StudentHomeworkRowCopyWith(_StudentHomeworkRow value, $Res Function(_StudentHomeworkRow) _then) = __$StudentHomeworkRowCopyWithImpl;
@override @useResult
$Res call({
 String date,@HwStatusConverter() HomeworkStatus? status, String? comment, NamedRef? classroom
});


@override $NamedRefCopyWith<$Res>? get classroom;

}
/// @nodoc
class __$StudentHomeworkRowCopyWithImpl<$Res>
    implements _$StudentHomeworkRowCopyWith<$Res> {
  __$StudentHomeworkRowCopyWithImpl(this._self, this._then);

  final _StudentHomeworkRow _self;
  final $Res Function(_StudentHomeworkRow) _then;

/// Create a copy of StudentHomeworkRow
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? status = freezed,Object? comment = freezed,Object? classroom = freezed,}) {
  return _then(_StudentHomeworkRow(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as HomeworkStatus?,comment: freezed == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as NamedRef?,
  ));
}

/// Create a copy of StudentHomeworkRow
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$NamedRefCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $NamedRefCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// @nodoc
mixin _$TestRef {

 String get id; String get title; String? get type;
/// Create a copy of TestRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TestRefCopyWith<TestRef> get copyWith => _$TestRefCopyWithImpl<TestRef>(this as TestRef, _$identity);

  /// Serializes this TestRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as TestRef;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TestRef&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.type, _this.type) || other.type == _this.type));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as TestRef;
  return Object.hash(runtimeType,_this.id,_this.title,_this.type);
}

@override
String toString() {
  final _this = this as TestRef;
  return 'TestRef(id: ${_this.id}, title: ${_this.title}, type: ${_this.type})';
}


}

/// @nodoc
abstract mixin class $TestRefCopyWith<$Res>  {
  factory $TestRefCopyWith(TestRef value, $Res Function(TestRef) _then) = _$TestRefCopyWithImpl;
@useResult
$Res call({
 String id, String title, String? type
});




}
/// @nodoc
class _$TestRefCopyWithImpl<$Res>
    implements $TestRefCopyWith<$Res> {
  _$TestRefCopyWithImpl(this._self, this._then);

  final TestRef _self;
  final $Res Function(TestRef) _then;

/// Create a copy of TestRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? type = freezed,}) {
  return _then(TestRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,type: freezed == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [TestRef].
extension TestRefPatterns on TestRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TestRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TestRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TestRef value)  $default,){
final _that = this;
switch (_that) {
case _TestRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TestRef value)?  $default,){
final _that = this;
switch (_that) {
case _TestRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title,  String? type)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TestRef() when $default != null:
return $default(_that.id,_that.title,_that.type);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title,  String? type)  $default,) {final _that = this;
switch (_that) {
case _TestRef():
return $default(_that.id,_that.title,_that.type);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title,  String? type)?  $default,) {final _that = this;
switch (_that) {
case _TestRef() when $default != null:
return $default(_that.id,_that.title,_that.type);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TestRef implements TestRef {
  const _TestRef({required this.id, this.title = '', this.type});
  factory _TestRef.fromJson(Map<String, dynamic> json) => _$TestRefFromJson(json);

@override final  String id;
@override@JsonKey() final  String title;
@override final  String? type;

/// Create a copy of TestRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TestRefCopyWith<_TestRef> get copyWith => __$TestRefCopyWithImpl<_TestRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TestRefToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _TestRef&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.type, type) || other.type == type));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,title,type);
}

@override
String toString() {
    return 'TestRef(id: $id, title: $title, type: $type)';
}


}

/// @nodoc
abstract mixin class _$TestRefCopyWith<$Res> implements $TestRefCopyWith<$Res> {
  factory _$TestRefCopyWith(_TestRef value, $Res Function(_TestRef) _then) = __$TestRefCopyWithImpl;
@override @useResult
$Res call({
 String id, String title, String? type
});




}
/// @nodoc
class __$TestRefCopyWithImpl<$Res>
    implements _$TestRefCopyWith<$Res> {
  __$TestRefCopyWithImpl(this._self, this._then);

  final _TestRef _self;
  final $Res Function(_TestRef) _then;

/// Create a copy of TestRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? type = freezed,}) {
  return _then(_TestRef(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,type: freezed == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$StudentTestResult {

 String get id; double get totalScore; double get maxScore; String? get createdAt; TestRef? get test;
/// Create a copy of StudentTestResult
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StudentTestResultCopyWith<StudentTestResult> get copyWith => _$StudentTestResultCopyWithImpl<StudentTestResult>(this as StudentTestResult, _$identity);

  /// Serializes this StudentTestResult to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as StudentTestResult;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StudentTestResult&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.totalScore, _this.totalScore) || other.totalScore == _this.totalScore)&&(identical(other.maxScore, _this.maxScore) || other.maxScore == _this.maxScore)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt)&&(identical(other.test, _this.test) || other.test == _this.test));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as StudentTestResult;
  return Object.hash(runtimeType,_this.id,_this.totalScore,_this.maxScore,_this.createdAt,_this.test);
}

@override
String toString() {
  final _this = this as StudentTestResult;
  return 'StudentTestResult(id: ${_this.id}, totalScore: ${_this.totalScore}, maxScore: ${_this.maxScore}, createdAt: ${_this.createdAt}, test: ${_this.test})';
}


}

/// @nodoc
abstract mixin class $StudentTestResultCopyWith<$Res>  {
  factory $StudentTestResultCopyWith(StudentTestResult value, $Res Function(StudentTestResult) _then) = _$StudentTestResultCopyWithImpl;
@useResult
$Res call({
 String id, double totalScore, double maxScore, String? createdAt, TestRef? test
});


$TestRefCopyWith<$Res>? get test;

}
/// @nodoc
class _$StudentTestResultCopyWithImpl<$Res>
    implements $StudentTestResultCopyWith<$Res> {
  _$StudentTestResultCopyWithImpl(this._self, this._then);

  final StudentTestResult _self;
  final $Res Function(StudentTestResult) _then;

/// Create a copy of StudentTestResult
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? totalScore = null,Object? maxScore = null,Object? createdAt = freezed,Object? test = freezed,}) {
  return _then(StudentTestResult(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,totalScore: null == totalScore ? _self.totalScore : totalScore // ignore: cast_nullable_to_non_nullable
as double,maxScore: null == maxScore ? _self.maxScore : maxScore // ignore: cast_nullable_to_non_nullable
as double,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,test: freezed == test ? _self.test : test // ignore: cast_nullable_to_non_nullable
as TestRef?,
  ));
}
/// Create a copy of StudentTestResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TestRefCopyWith<$Res>? get test {
    if (_self.test == null) {
    return null;
  }

  return $TestRefCopyWith<$Res>(_self.test!, (value) {
    return _then(_self.copyWith(test: value));
  });
}
}


/// Adds pattern-matching-related methods to [StudentTestResult].
extension StudentTestResultPatterns on StudentTestResult {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StudentTestResult value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StudentTestResult() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StudentTestResult value)  $default,){
final _that = this;
switch (_that) {
case _StudentTestResult():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StudentTestResult value)?  $default,){
final _that = this;
switch (_that) {
case _StudentTestResult() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  double totalScore,  double maxScore,  String? createdAt,  TestRef? test)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StudentTestResult() when $default != null:
return $default(_that.id,_that.totalScore,_that.maxScore,_that.createdAt,_that.test);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  double totalScore,  double maxScore,  String? createdAt,  TestRef? test)  $default,) {final _that = this;
switch (_that) {
case _StudentTestResult():
return $default(_that.id,_that.totalScore,_that.maxScore,_that.createdAt,_that.test);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  double totalScore,  double maxScore,  String? createdAt,  TestRef? test)?  $default,) {final _that = this;
switch (_that) {
case _StudentTestResult() when $default != null:
return $default(_that.id,_that.totalScore,_that.maxScore,_that.createdAt,_that.test);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StudentTestResult implements StudentTestResult {
  const _StudentTestResult({required this.id, required this.totalScore, required this.maxScore, this.createdAt, this.test});
  factory _StudentTestResult.fromJson(Map<String, dynamic> json) => _$StudentTestResultFromJson(json);

@override final  String id;
@override final  double totalScore;
@override final  double maxScore;
@override final  String? createdAt;
@override final  TestRef? test;

/// Create a copy of StudentTestResult
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StudentTestResultCopyWith<_StudentTestResult> get copyWith => __$StudentTestResultCopyWithImpl<_StudentTestResult>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StudentTestResultToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _StudentTestResult&&(identical(other.id, id) || other.id == id)&&(identical(other.totalScore, totalScore) || other.totalScore == totalScore)&&(identical(other.maxScore, maxScore) || other.maxScore == maxScore)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.test, test) || other.test == test));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,totalScore,maxScore,createdAt,test);
}

@override
String toString() {
    return 'StudentTestResult(id: $id, totalScore: $totalScore, maxScore: $maxScore, createdAt: $createdAt, test: $test)';
}


}

/// @nodoc
abstract mixin class _$StudentTestResultCopyWith<$Res> implements $StudentTestResultCopyWith<$Res> {
  factory _$StudentTestResultCopyWith(_StudentTestResult value, $Res Function(_StudentTestResult) _then) = __$StudentTestResultCopyWithImpl;
@override @useResult
$Res call({
 String id, double totalScore, double maxScore, String? createdAt, TestRef? test
});


@override $TestRefCopyWith<$Res>? get test;

}
/// @nodoc
class __$StudentTestResultCopyWithImpl<$Res>
    implements _$StudentTestResultCopyWith<$Res> {
  __$StudentTestResultCopyWithImpl(this._self, this._then);

  final _StudentTestResult _self;
  final $Res Function(_StudentTestResult) _then;

/// Create a copy of StudentTestResult
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? totalScore = null,Object? maxScore = null,Object? createdAt = freezed,Object? test = freezed,}) {
  return _then(_StudentTestResult(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,totalScore: null == totalScore ? _self.totalScore : totalScore // ignore: cast_nullable_to_non_nullable
as double,maxScore: null == maxScore ? _self.maxScore : maxScore // ignore: cast_nullable_to_non_nullable
as double,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,test: freezed == test ? _self.test : test // ignore: cast_nullable_to_non_nullable
as TestRef?,
  ));
}

/// Create a copy of StudentTestResult
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TestRefCopyWith<$Res>? get test {
    if (_self.test == null) {
    return null;
  }

  return $TestRefCopyWith<$Res>(_self.test!, (value) {
    return _then(_self.copyWith(test: value));
  });
}
}


/// @nodoc
mixin _$StudentNote {

 String get id; String get type; String get body; String? get authorName; bool get canEdit; String? get createdAt; String? get updatedAt; String? get promisedOn; String? get resolvedAt;
/// Create a copy of StudentNote
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$StudentNoteCopyWith<StudentNote> get copyWith => _$StudentNoteCopyWithImpl<StudentNote>(this as StudentNote, _$identity);

  /// Serializes this StudentNote to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as StudentNote;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is StudentNote&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.type, _this.type) || other.type == _this.type)&&(identical(other.body, _this.body) || other.body == _this.body)&&(identical(other.authorName, _this.authorName) || other.authorName == _this.authorName)&&(identical(other.canEdit, _this.canEdit) || other.canEdit == _this.canEdit)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt)&&(identical(other.updatedAt, _this.updatedAt) || other.updatedAt == _this.updatedAt)&&(identical(other.promisedOn, _this.promisedOn) || other.promisedOn == _this.promisedOn)&&(identical(other.resolvedAt, _this.resolvedAt) || other.resolvedAt == _this.resolvedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as StudentNote;
  return Object.hash(runtimeType,_this.id,_this.type,_this.body,_this.authorName,_this.canEdit,_this.createdAt,_this.updatedAt,_this.promisedOn,_this.resolvedAt);
}

@override
String toString() {
  final _this = this as StudentNote;
  return 'StudentNote(id: ${_this.id}, type: ${_this.type}, body: ${_this.body}, authorName: ${_this.authorName}, canEdit: ${_this.canEdit}, createdAt: ${_this.createdAt}, updatedAt: ${_this.updatedAt}, promisedOn: ${_this.promisedOn}, resolvedAt: ${_this.resolvedAt})';
}


}

/// @nodoc
abstract mixin class $StudentNoteCopyWith<$Res>  {
  factory $StudentNoteCopyWith(StudentNote value, $Res Function(StudentNote) _then) = _$StudentNoteCopyWithImpl;
@useResult
$Res call({
 String id, String type, String body, String? authorName, bool canEdit, String? createdAt, String? updatedAt, String? promisedOn, String? resolvedAt
});




}
/// @nodoc
class _$StudentNoteCopyWithImpl<$Res>
    implements $StudentNoteCopyWith<$Res> {
  _$StudentNoteCopyWithImpl(this._self, this._then);

  final StudentNote _self;
  final $Res Function(StudentNote) _then;

/// Create a copy of StudentNote
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? type = null,Object? body = null,Object? authorName = freezed,Object? canEdit = null,Object? createdAt = freezed,Object? updatedAt = freezed,Object? promisedOn = freezed,Object? resolvedAt = freezed,}) {
  return _then(StudentNote(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,body: null == body ? _self.body : body // ignore: cast_nullable_to_non_nullable
as String,authorName: freezed == authorName ? _self.authorName : authorName // ignore: cast_nullable_to_non_nullable
as String?,canEdit: null == canEdit ? _self.canEdit : canEdit // ignore: cast_nullable_to_non_nullable
as bool,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,promisedOn: freezed == promisedOn ? _self.promisedOn : promisedOn // ignore: cast_nullable_to_non_nullable
as String?,resolvedAt: freezed == resolvedAt ? _self.resolvedAt : resolvedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [StudentNote].
extension StudentNotePatterns on StudentNote {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _StudentNote value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _StudentNote() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _StudentNote value)  $default,){
final _that = this;
switch (_that) {
case _StudentNote():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _StudentNote value)?  $default,){
final _that = this;
switch (_that) {
case _StudentNote() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String type,  String body,  String? authorName,  bool canEdit,  String? createdAt,  String? updatedAt,  String? promisedOn,  String? resolvedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _StudentNote() when $default != null:
return $default(_that.id,_that.type,_that.body,_that.authorName,_that.canEdit,_that.createdAt,_that.updatedAt,_that.promisedOn,_that.resolvedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String type,  String body,  String? authorName,  bool canEdit,  String? createdAt,  String? updatedAt,  String? promisedOn,  String? resolvedAt)  $default,) {final _that = this;
switch (_that) {
case _StudentNote():
return $default(_that.id,_that.type,_that.body,_that.authorName,_that.canEdit,_that.createdAt,_that.updatedAt,_that.promisedOn,_that.resolvedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String type,  String body,  String? authorName,  bool canEdit,  String? createdAt,  String? updatedAt,  String? promisedOn,  String? resolvedAt)?  $default,) {final _that = this;
switch (_that) {
case _StudentNote() when $default != null:
return $default(_that.id,_that.type,_that.body,_that.authorName,_that.canEdit,_that.createdAt,_that.updatedAt,_that.promisedOn,_that.resolvedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _StudentNote implements StudentNote {
  const _StudentNote({required this.id, this.type = 'GENERAL', this.body = '', this.authorName, this.canEdit = false, this.createdAt, this.updatedAt, this.promisedOn, this.resolvedAt});
  factory _StudentNote.fromJson(Map<String, dynamic> json) => _$StudentNoteFromJson(json);

@override final  String id;
@override@JsonKey() final  String type;
@override@JsonKey() final  String body;
@override final  String? authorName;
@override@JsonKey() final  bool canEdit;
@override final  String? createdAt;
@override final  String? updatedAt;
@override final  String? promisedOn;
@override final  String? resolvedAt;

/// Create a copy of StudentNote
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$StudentNoteCopyWith<_StudentNote> get copyWith => __$StudentNoteCopyWithImpl<_StudentNote>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$StudentNoteToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _StudentNote&&(identical(other.id, id) || other.id == id)&&(identical(other.type, type) || other.type == type)&&(identical(other.body, body) || other.body == body)&&(identical(other.authorName, authorName) || other.authorName == authorName)&&(identical(other.canEdit, canEdit) || other.canEdit == canEdit)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.promisedOn, promisedOn) || other.promisedOn == promisedOn)&&(identical(other.resolvedAt, resolvedAt) || other.resolvedAt == resolvedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,type,body,authorName,canEdit,createdAt,updatedAt,promisedOn,resolvedAt);
}

@override
String toString() {
    return 'StudentNote(id: $id, type: $type, body: $body, authorName: $authorName, canEdit: $canEdit, createdAt: $createdAt, updatedAt: $updatedAt, promisedOn: $promisedOn, resolvedAt: $resolvedAt)';
}


}

/// @nodoc
abstract mixin class _$StudentNoteCopyWith<$Res> implements $StudentNoteCopyWith<$Res> {
  factory _$StudentNoteCopyWith(_StudentNote value, $Res Function(_StudentNote) _then) = __$StudentNoteCopyWithImpl;
@override @useResult
$Res call({
 String id, String type, String body, String? authorName, bool canEdit, String? createdAt, String? updatedAt, String? promisedOn, String? resolvedAt
});




}
/// @nodoc
class __$StudentNoteCopyWithImpl<$Res>
    implements _$StudentNoteCopyWith<$Res> {
  __$StudentNoteCopyWithImpl(this._self, this._then);

  final _StudentNote _self;
  final $Res Function(_StudentNote) _then;

/// Create a copy of StudentNote
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? type = null,Object? body = null,Object? authorName = freezed,Object? canEdit = null,Object? createdAt = freezed,Object? updatedAt = freezed,Object? promisedOn = freezed,Object? resolvedAt = freezed,}) {
  return _then(_StudentNote(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,body: null == body ? _self.body : body // ignore: cast_nullable_to_non_nullable
as String,authorName: freezed == authorName ? _self.authorName : authorName // ignore: cast_nullable_to_non_nullable
as String?,canEdit: null == canEdit ? _self.canEdit : canEdit // ignore: cast_nullable_to_non_nullable
as bool,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,updatedAt: freezed == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as String?,promisedOn: freezed == promisedOn ? _self.promisedOn : promisedOn // ignore: cast_nullable_to_non_nullable
as String?,resolvedAt: freezed == resolvedAt ? _self.resolvedAt : resolvedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$HoursSession {

 String get date; String get classroomName; int get startMinute; int get endMinute;
/// Create a copy of HoursSession
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HoursSessionCopyWith<HoursSession> get copyWith => _$HoursSessionCopyWithImpl<HoursSession>(this as HoursSession, _$identity);

  /// Serializes this HoursSession to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HoursSession;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HoursSession&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.classroomName, _this.classroomName) || other.classroomName == _this.classroomName)&&(identical(other.startMinute, _this.startMinute) || other.startMinute == _this.startMinute)&&(identical(other.endMinute, _this.endMinute) || other.endMinute == _this.endMinute));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HoursSession;
  return Object.hash(runtimeType,_this.date,_this.classroomName,_this.startMinute,_this.endMinute);
}

@override
String toString() {
  final _this = this as HoursSession;
  return 'HoursSession(date: ${_this.date}, classroomName: ${_this.classroomName}, startMinute: ${_this.startMinute}, endMinute: ${_this.endMinute})';
}


}

/// @nodoc
abstract mixin class $HoursSessionCopyWith<$Res>  {
  factory $HoursSessionCopyWith(HoursSession value, $Res Function(HoursSession) _then) = _$HoursSessionCopyWithImpl;
@useResult
$Res call({
 String date, String classroomName, int startMinute, int endMinute
});




}
/// @nodoc
class _$HoursSessionCopyWithImpl<$Res>
    implements $HoursSessionCopyWith<$Res> {
  _$HoursSessionCopyWithImpl(this._self, this._then);

  final HoursSession _self;
  final $Res Function(HoursSession) _then;

/// Create a copy of HoursSession
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? classroomName = null,Object? startMinute = null,Object? endMinute = null,}) {
  return _then(HoursSession(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [HoursSession].
extension HoursSessionPatterns on HoursSession {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HoursSession value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HoursSession() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HoursSession value)  $default,){
final _that = this;
switch (_that) {
case _HoursSession():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HoursSession value)?  $default,){
final _that = this;
switch (_that) {
case _HoursSession() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  String classroomName,  int startMinute,  int endMinute)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HoursSession() when $default != null:
return $default(_that.date,_that.classroomName,_that.startMinute,_that.endMinute);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  String classroomName,  int startMinute,  int endMinute)  $default,) {final _that = this;
switch (_that) {
case _HoursSession():
return $default(_that.date,_that.classroomName,_that.startMinute,_that.endMinute);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  String classroomName,  int startMinute,  int endMinute)?  $default,) {final _that = this;
switch (_that) {
case _HoursSession() when $default != null:
return $default(_that.date,_that.classroomName,_that.startMinute,_that.endMinute);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HoursSession implements HoursSession {
  const _HoursSession({required this.date, this.classroomName = '', required this.startMinute, required this.endMinute});
  factory _HoursSession.fromJson(Map<String, dynamic> json) => _$HoursSessionFromJson(json);

@override final  String date;
@override@JsonKey() final  String classroomName;
@override final  int startMinute;
@override final  int endMinute;

/// Create a copy of HoursSession
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HoursSessionCopyWith<_HoursSession> get copyWith => __$HoursSessionCopyWithImpl<_HoursSession>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HoursSessionToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HoursSession&&(identical(other.date, date) || other.date == date)&&(identical(other.classroomName, classroomName) || other.classroomName == classroomName)&&(identical(other.startMinute, startMinute) || other.startMinute == startMinute)&&(identical(other.endMinute, endMinute) || other.endMinute == endMinute));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,classroomName,startMinute,endMinute);
}

@override
String toString() {
    return 'HoursSession(date: $date, classroomName: $classroomName, startMinute: $startMinute, endMinute: $endMinute)';
}


}

/// @nodoc
abstract mixin class _$HoursSessionCopyWith<$Res> implements $HoursSessionCopyWith<$Res> {
  factory _$HoursSessionCopyWith(_HoursSession value, $Res Function(_HoursSession) _then) = __$HoursSessionCopyWithImpl;
@override @useResult
$Res call({
 String date, String classroomName, int startMinute, int endMinute
});




}
/// @nodoc
class __$HoursSessionCopyWithImpl<$Res>
    implements _$HoursSessionCopyWith<$Res> {
  __$HoursSessionCopyWithImpl(this._self, this._then);

  final _HoursSession _self;
  final $Res Function(_HoursSession) _then;

/// Create a copy of HoursSession
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? classroomName = null,Object? startMinute = null,Object? endMinute = null,}) {
  return _then(_HoursSession(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$TeacherHoursRow {

 String get teacherId; String get teacherName; int get lessons; int get minutes; List<HoursSession> get sessions;
/// Create a copy of TeacherHoursRow
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TeacherHoursRowCopyWith<TeacherHoursRow> get copyWith => _$TeacherHoursRowCopyWithImpl<TeacherHoursRow>(this as TeacherHoursRow, _$identity);

  /// Serializes this TeacherHoursRow to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as TeacherHoursRow;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TeacherHoursRow&&(identical(other.teacherId, _this.teacherId) || other.teacherId == _this.teacherId)&&(identical(other.teacherName, _this.teacherName) || other.teacherName == _this.teacherName)&&(identical(other.lessons, _this.lessons) || other.lessons == _this.lessons)&&(identical(other.minutes, _this.minutes) || other.minutes == _this.minutes)&&const DeepCollectionEquality().equals(other.sessions, _this.sessions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as TeacherHoursRow;
  return Object.hash(runtimeType,_this.teacherId,_this.teacherName,_this.lessons,_this.minutes,const DeepCollectionEquality().hash(_this.sessions));
}

@override
String toString() {
  final _this = this as TeacherHoursRow;
  return 'TeacherHoursRow(teacherId: ${_this.teacherId}, teacherName: ${_this.teacherName}, lessons: ${_this.lessons}, minutes: ${_this.minutes}, sessions: ${_this.sessions})';
}


}

/// @nodoc
abstract mixin class $TeacherHoursRowCopyWith<$Res>  {
  factory $TeacherHoursRowCopyWith(TeacherHoursRow value, $Res Function(TeacherHoursRow) _then) = _$TeacherHoursRowCopyWithImpl;
@useResult
$Res call({
 String teacherId, String teacherName, int lessons, int minutes, List<HoursSession> sessions
});




}
/// @nodoc
class _$TeacherHoursRowCopyWithImpl<$Res>
    implements $TeacherHoursRowCopyWith<$Res> {
  _$TeacherHoursRowCopyWithImpl(this._self, this._then);

  final TeacherHoursRow _self;
  final $Res Function(TeacherHoursRow) _then;

/// Create a copy of TeacherHoursRow
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? teacherId = null,Object? teacherName = null,Object? lessons = null,Object? minutes = null,Object? sessions = null,}) {
  return _then(TeacherHoursRow(
teacherId: null == teacherId ? _self.teacherId : teacherId // ignore: cast_nullable_to_non_nullable
as String,teacherName: null == teacherName ? _self.teacherName : teacherName // ignore: cast_nullable_to_non_nullable
as String,lessons: null == lessons ? _self.lessons : lessons // ignore: cast_nullable_to_non_nullable
as int,minutes: null == minutes ? _self.minutes : minutes // ignore: cast_nullable_to_non_nullable
as int,sessions: null == sessions ? _self.sessions : sessions // ignore: cast_nullable_to_non_nullable
as List<HoursSession>,
  ));
}

}


/// Adds pattern-matching-related methods to [TeacherHoursRow].
extension TeacherHoursRowPatterns on TeacherHoursRow {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TeacherHoursRow value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TeacherHoursRow() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TeacherHoursRow value)  $default,){
final _that = this;
switch (_that) {
case _TeacherHoursRow():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TeacherHoursRow value)?  $default,){
final _that = this;
switch (_that) {
case _TeacherHoursRow() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String teacherId,  String teacherName,  int lessons,  int minutes,  List<HoursSession> sessions)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TeacherHoursRow() when $default != null:
return $default(_that.teacherId,_that.teacherName,_that.lessons,_that.minutes,_that.sessions);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String teacherId,  String teacherName,  int lessons,  int minutes,  List<HoursSession> sessions)  $default,) {final _that = this;
switch (_that) {
case _TeacherHoursRow():
return $default(_that.teacherId,_that.teacherName,_that.lessons,_that.minutes,_that.sessions);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String teacherId,  String teacherName,  int lessons,  int minutes,  List<HoursSession> sessions)?  $default,) {final _that = this;
switch (_that) {
case _TeacherHoursRow() when $default != null:
return $default(_that.teacherId,_that.teacherName,_that.lessons,_that.minutes,_that.sessions);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TeacherHoursRow implements TeacherHoursRow {
  const _TeacherHoursRow({required this.teacherId, this.teacherName = '', this.lessons = 0, this.minutes = 0,  List<HoursSession> sessions = const <HoursSession>[]}): _sessions = sessions;
  factory _TeacherHoursRow.fromJson(Map<String, dynamic> json) => _$TeacherHoursRowFromJson(json);

@override final  String teacherId;
@override@JsonKey() final  String teacherName;
@override@JsonKey() final  int lessons;
@override@JsonKey() final  int minutes;
 final  List<HoursSession> _sessions;
@override@JsonKey() List<HoursSession> get sessions {
  if (_sessions is EqualUnmodifiableListView) return _sessions;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_sessions);
}


/// Create a copy of TeacherHoursRow
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TeacherHoursRowCopyWith<_TeacherHoursRow> get copyWith => __$TeacherHoursRowCopyWithImpl<_TeacherHoursRow>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TeacherHoursRowToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _TeacherHoursRow&&(identical(other.teacherId, teacherId) || other.teacherId == teacherId)&&(identical(other.teacherName, teacherName) || other.teacherName == teacherName)&&(identical(other.lessons, lessons) || other.lessons == lessons)&&(identical(other.minutes, minutes) || other.minutes == minutes)&&const DeepCollectionEquality().equals(other.sessions, _sessions));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,teacherId,teacherName,lessons,minutes,const DeepCollectionEquality().hash(_sessions));
}

@override
String toString() {
    return 'TeacherHoursRow(teacherId: $teacherId, teacherName: $teacherName, lessons: $lessons, minutes: $minutes, sessions: $sessions)';
}


}

/// @nodoc
abstract mixin class _$TeacherHoursRowCopyWith<$Res> implements $TeacherHoursRowCopyWith<$Res> {
  factory _$TeacherHoursRowCopyWith(_TeacherHoursRow value, $Res Function(_TeacherHoursRow) _then) = __$TeacherHoursRowCopyWithImpl;
@override @useResult
$Res call({
 String teacherId, String teacherName, int lessons, int minutes, List<HoursSession> sessions
});




}
/// @nodoc
class __$TeacherHoursRowCopyWithImpl<$Res>
    implements _$TeacherHoursRowCopyWith<$Res> {
  __$TeacherHoursRowCopyWithImpl(this._self, this._then);

  final _TeacherHoursRow _self;
  final $Res Function(_TeacherHoursRow) _then;

/// Create a copy of TeacherHoursRow
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? teacherId = null,Object? teacherName = null,Object? lessons = null,Object? minutes = null,Object? sessions = null,}) {
  return _then(_TeacherHoursRow(
teacherId: null == teacherId ? _self.teacherId : teacherId // ignore: cast_nullable_to_non_nullable
as String,teacherName: null == teacherName ? _self.teacherName : teacherName // ignore: cast_nullable_to_non_nullable
as String,lessons: null == lessons ? _self.lessons : lessons // ignore: cast_nullable_to_non_nullable
as int,minutes: null == minutes ? _self.minutes : minutes // ignore: cast_nullable_to_non_nullable
as int,sessions: null == sessions ? _self._sessions : sessions // ignore: cast_nullable_to_non_nullable
as List<HoursSession>,
  ));
}


}


/// @nodoc
mixin _$TeacherHours {

 String get month; List<TeacherHoursRow> get teachers;
/// Create a copy of TeacherHours
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TeacherHoursCopyWith<TeacherHours> get copyWith => _$TeacherHoursCopyWithImpl<TeacherHours>(this as TeacherHours, _$identity);

  /// Serializes this TeacherHours to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as TeacherHours;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TeacherHours&&(identical(other.month, _this.month) || other.month == _this.month)&&const DeepCollectionEquality().equals(other.teachers, _this.teachers));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as TeacherHours;
  return Object.hash(runtimeType,_this.month,const DeepCollectionEquality().hash(_this.teachers));
}

@override
String toString() {
  final _this = this as TeacherHours;
  return 'TeacherHours(month: ${_this.month}, teachers: ${_this.teachers})';
}


}

/// @nodoc
abstract mixin class $TeacherHoursCopyWith<$Res>  {
  factory $TeacherHoursCopyWith(TeacherHours value, $Res Function(TeacherHours) _then) = _$TeacherHoursCopyWithImpl;
@useResult
$Res call({
 String month, List<TeacherHoursRow> teachers
});




}
/// @nodoc
class _$TeacherHoursCopyWithImpl<$Res>
    implements $TeacherHoursCopyWith<$Res> {
  _$TeacherHoursCopyWithImpl(this._self, this._then);

  final TeacherHours _self;
  final $Res Function(TeacherHours) _then;

/// Create a copy of TeacherHours
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? month = null,Object? teachers = null,}) {
  return _then(TeacherHours(
month: null == month ? _self.month : month // ignore: cast_nullable_to_non_nullable
as String,teachers: null == teachers ? _self.teachers : teachers // ignore: cast_nullable_to_non_nullable
as List<TeacherHoursRow>,
  ));
}

}


/// Adds pattern-matching-related methods to [TeacherHours].
extension TeacherHoursPatterns on TeacherHours {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TeacherHours value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TeacherHours() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TeacherHours value)  $default,){
final _that = this;
switch (_that) {
case _TeacherHours():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TeacherHours value)?  $default,){
final _that = this;
switch (_that) {
case _TeacherHours() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String month,  List<TeacherHoursRow> teachers)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TeacherHours() when $default != null:
return $default(_that.month,_that.teachers);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String month,  List<TeacherHoursRow> teachers)  $default,) {final _that = this;
switch (_that) {
case _TeacherHours():
return $default(_that.month,_that.teachers);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String month,  List<TeacherHoursRow> teachers)?  $default,) {final _that = this;
switch (_that) {
case _TeacherHours() when $default != null:
return $default(_that.month,_that.teachers);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TeacherHours implements TeacherHours {
  const _TeacherHours({required this.month,  List<TeacherHoursRow> teachers = const <TeacherHoursRow>[]}): _teachers = teachers;
  factory _TeacherHours.fromJson(Map<String, dynamic> json) => _$TeacherHoursFromJson(json);

@override final  String month;
 final  List<TeacherHoursRow> _teachers;
@override@JsonKey() List<TeacherHoursRow> get teachers {
  if (_teachers is EqualUnmodifiableListView) return _teachers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_teachers);
}


/// Create a copy of TeacherHours
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TeacherHoursCopyWith<_TeacherHours> get copyWith => __$TeacherHoursCopyWithImpl<_TeacherHours>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TeacherHoursToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _TeacherHours&&(identical(other.month, month) || other.month == month)&&const DeepCollectionEquality().equals(other.teachers, _teachers));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,month,const DeepCollectionEquality().hash(_teachers));
}

@override
String toString() {
    return 'TeacherHours(month: $month, teachers: $teachers)';
}


}

/// @nodoc
abstract mixin class _$TeacherHoursCopyWith<$Res> implements $TeacherHoursCopyWith<$Res> {
  factory _$TeacherHoursCopyWith(_TeacherHours value, $Res Function(_TeacherHours) _then) = __$TeacherHoursCopyWithImpl;
@override @useResult
$Res call({
 String month, List<TeacherHoursRow> teachers
});




}
/// @nodoc
class __$TeacherHoursCopyWithImpl<$Res>
    implements _$TeacherHoursCopyWith<$Res> {
  __$TeacherHoursCopyWithImpl(this._self, this._then);

  final _TeacherHours _self;
  final $Res Function(_TeacherHours) _then;

/// Create a copy of TeacherHours
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? month = null,Object? teachers = null,}) {
  return _then(_TeacherHours(
month: null == month ? _self.month : month // ignore: cast_nullable_to_non_nullable
as String,teachers: null == teachers ? _self._teachers : teachers // ignore: cast_nullable_to_non_nullable
as List<TeacherHoursRow>,
  ));
}


}


/// @nodoc
mixin _$Dismissal {

 String get approximateAt; String? get lastLeftAt; String? get note;
/// Create a copy of Dismissal
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DismissalCopyWith<Dismissal> get copyWith => _$DismissalCopyWithImpl<Dismissal>(this as Dismissal, _$identity);

  /// Serializes this Dismissal to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Dismissal;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Dismissal&&(identical(other.approximateAt, _this.approximateAt) || other.approximateAt == _this.approximateAt)&&(identical(other.lastLeftAt, _this.lastLeftAt) || other.lastLeftAt == _this.lastLeftAt)&&(identical(other.note, _this.note) || other.note == _this.note));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Dismissal;
  return Object.hash(runtimeType,_this.approximateAt,_this.lastLeftAt,_this.note);
}

@override
String toString() {
  final _this = this as Dismissal;
  return 'Dismissal(approximateAt: ${_this.approximateAt}, lastLeftAt: ${_this.lastLeftAt}, note: ${_this.note})';
}


}

/// @nodoc
abstract mixin class $DismissalCopyWith<$Res>  {
  factory $DismissalCopyWith(Dismissal value, $Res Function(Dismissal) _then) = _$DismissalCopyWithImpl;
@useResult
$Res call({
 String approximateAt, String? lastLeftAt, String? note
});




}
/// @nodoc
class _$DismissalCopyWithImpl<$Res>
    implements $DismissalCopyWith<$Res> {
  _$DismissalCopyWithImpl(this._self, this._then);

  final Dismissal _self;
  final $Res Function(Dismissal) _then;

/// Create a copy of Dismissal
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? approximateAt = null,Object? lastLeftAt = freezed,Object? note = freezed,}) {
  return _then(Dismissal(
approximateAt: null == approximateAt ? _self.approximateAt : approximateAt // ignore: cast_nullable_to_non_nullable
as String,lastLeftAt: freezed == lastLeftAt ? _self.lastLeftAt : lastLeftAt // ignore: cast_nullable_to_non_nullable
as String?,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [Dismissal].
extension DismissalPatterns on Dismissal {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Dismissal value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Dismissal() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Dismissal value)  $default,){
final _that = this;
switch (_that) {
case _Dismissal():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Dismissal value)?  $default,){
final _that = this;
switch (_that) {
case _Dismissal() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String approximateAt,  String? lastLeftAt,  String? note)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Dismissal() when $default != null:
return $default(_that.approximateAt,_that.lastLeftAt,_that.note);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String approximateAt,  String? lastLeftAt,  String? note)  $default,) {final _that = this;
switch (_that) {
case _Dismissal():
return $default(_that.approximateAt,_that.lastLeftAt,_that.note);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String approximateAt,  String? lastLeftAt,  String? note)?  $default,) {final _that = this;
switch (_that) {
case _Dismissal() when $default != null:
return $default(_that.approximateAt,_that.lastLeftAt,_that.note);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Dismissal implements Dismissal {
  const _Dismissal({required this.approximateAt, this.lastLeftAt, this.note});
  factory _Dismissal.fromJson(Map<String, dynamic> json) => _$DismissalFromJson(json);

@override final  String approximateAt;
@override final  String? lastLeftAt;
@override final  String? note;

/// Create a copy of Dismissal
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DismissalCopyWith<_Dismissal> get copyWith => __$DismissalCopyWithImpl<_Dismissal>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DismissalToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Dismissal&&(identical(other.approximateAt, approximateAt) || other.approximateAt == approximateAt)&&(identical(other.lastLeftAt, lastLeftAt) || other.lastLeftAt == lastLeftAt)&&(identical(other.note, note) || other.note == note));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,approximateAt,lastLeftAt,note);
}

@override
String toString() {
    return 'Dismissal(approximateAt: $approximateAt, lastLeftAt: $lastLeftAt, note: $note)';
}


}

/// @nodoc
abstract mixin class _$DismissalCopyWith<$Res> implements $DismissalCopyWith<$Res> {
  factory _$DismissalCopyWith(_Dismissal value, $Res Function(_Dismissal) _then) = __$DismissalCopyWithImpl;
@override @useResult
$Res call({
 String approximateAt, String? lastLeftAt, String? note
});




}
/// @nodoc
class __$DismissalCopyWithImpl<$Res>
    implements _$DismissalCopyWith<$Res> {
  __$DismissalCopyWithImpl(this._self, this._then);

  final _Dismissal _self;
  final $Res Function(_Dismissal) _then;

/// Create a copy of Dismissal
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? approximateAt = null,Object? lastLeftAt = freezed,Object? note = freezed,}) {
  return _then(_Dismissal(
approximateAt: null == approximateAt ? _self.approximateAt : approximateAt // ignore: cast_nullable_to_non_nullable
as String,lastLeftAt: freezed == lastLeftAt ? _self.lastLeftAt : lastLeftAt // ignore: cast_nullable_to_non_nullable
as String?,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$AssignmentSummary {

 String get id; String get title; String? get description; String? get type; String? get dueDate; String? get lessonDate; String? get createdAt;@JsonKey(readValue: readPendingCount) int get pending;
/// Create a copy of AssignmentSummary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AssignmentSummaryCopyWith<AssignmentSummary> get copyWith => _$AssignmentSummaryCopyWithImpl<AssignmentSummary>(this as AssignmentSummary, _$identity);

  /// Serializes this AssignmentSummary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as AssignmentSummary;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AssignmentSummary&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.type, _this.type) || other.type == _this.type)&&(identical(other.dueDate, _this.dueDate) || other.dueDate == _this.dueDate)&&(identical(other.lessonDate, _this.lessonDate) || other.lessonDate == _this.lessonDate)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt)&&(identical(other.pending, _this.pending) || other.pending == _this.pending));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as AssignmentSummary;
  return Object.hash(runtimeType,_this.id,_this.title,_this.description,_this.type,_this.dueDate,_this.lessonDate,_this.createdAt,_this.pending);
}

@override
String toString() {
  final _this = this as AssignmentSummary;
  return 'AssignmentSummary(id: ${_this.id}, title: ${_this.title}, description: ${_this.description}, type: ${_this.type}, dueDate: ${_this.dueDate}, lessonDate: ${_this.lessonDate}, createdAt: ${_this.createdAt}, pending: ${_this.pending})';
}


}

/// @nodoc
abstract mixin class $AssignmentSummaryCopyWith<$Res>  {
  factory $AssignmentSummaryCopyWith(AssignmentSummary value, $Res Function(AssignmentSummary) _then) = _$AssignmentSummaryCopyWithImpl;
@useResult
$Res call({
 String id, String title, String? description, String? type, String? dueDate, String? lessonDate, String? createdAt,@JsonKey(readValue: readPendingCount) int pending
});




}
/// @nodoc
class _$AssignmentSummaryCopyWithImpl<$Res>
    implements $AssignmentSummaryCopyWith<$Res> {
  _$AssignmentSummaryCopyWithImpl(this._self, this._then);

  final AssignmentSummary _self;
  final $Res Function(AssignmentSummary) _then;

/// Create a copy of AssignmentSummary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? description = freezed,Object? type = freezed,Object? dueDate = freezed,Object? lessonDate = freezed,Object? createdAt = freezed,Object? pending = null,}) {
  return _then(AssignmentSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,type: freezed == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String?,dueDate: freezed == dueDate ? _self.dueDate : dueDate // ignore: cast_nullable_to_non_nullable
as String?,lessonDate: freezed == lessonDate ? _self.lessonDate : lessonDate // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,pending: null == pending ? _self.pending : pending // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [AssignmentSummary].
extension AssignmentSummaryPatterns on AssignmentSummary {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AssignmentSummary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AssignmentSummary() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AssignmentSummary value)  $default,){
final _that = this;
switch (_that) {
case _AssignmentSummary():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AssignmentSummary value)?  $default,){
final _that = this;
switch (_that) {
case _AssignmentSummary() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title,  String? description,  String? type,  String? dueDate,  String? lessonDate,  String? createdAt, @JsonKey(readValue: readPendingCount)  int pending)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AssignmentSummary() when $default != null:
return $default(_that.id,_that.title,_that.description,_that.type,_that.dueDate,_that.lessonDate,_that.createdAt,_that.pending);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title,  String? description,  String? type,  String? dueDate,  String? lessonDate,  String? createdAt, @JsonKey(readValue: readPendingCount)  int pending)  $default,) {final _that = this;
switch (_that) {
case _AssignmentSummary():
return $default(_that.id,_that.title,_that.description,_that.type,_that.dueDate,_that.lessonDate,_that.createdAt,_that.pending);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title,  String? description,  String? type,  String? dueDate,  String? lessonDate,  String? createdAt, @JsonKey(readValue: readPendingCount)  int pending)?  $default,) {final _that = this;
switch (_that) {
case _AssignmentSummary() when $default != null:
return $default(_that.id,_that.title,_that.description,_that.type,_that.dueDate,_that.lessonDate,_that.createdAt,_that.pending);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AssignmentSummary implements AssignmentSummary {
  const _AssignmentSummary({required this.id, this.title = '', this.description, this.type, this.dueDate, this.lessonDate, this.createdAt, @JsonKey(readValue: readPendingCount) this.pending = 0});
  factory _AssignmentSummary.fromJson(Map<String, dynamic> json) => _$AssignmentSummaryFromJson(json);

@override final  String id;
@override@JsonKey() final  String title;
@override final  String? description;
@override final  String? type;
@override final  String? dueDate;
@override final  String? lessonDate;
@override final  String? createdAt;
@override@JsonKey(readValue: readPendingCount) final  int pending;

/// Create a copy of AssignmentSummary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AssignmentSummaryCopyWith<_AssignmentSummary> get copyWith => __$AssignmentSummaryCopyWithImpl<_AssignmentSummary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AssignmentSummaryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _AssignmentSummary&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.description, description) || other.description == description)&&(identical(other.type, type) || other.type == type)&&(identical(other.dueDate, dueDate) || other.dueDate == dueDate)&&(identical(other.lessonDate, lessonDate) || other.lessonDate == lessonDate)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.pending, pending) || other.pending == pending));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,title,description,type,dueDate,lessonDate,createdAt,pending);
}

@override
String toString() {
    return 'AssignmentSummary(id: $id, title: $title, description: $description, type: $type, dueDate: $dueDate, lessonDate: $lessonDate, createdAt: $createdAt, pending: $pending)';
}


}

/// @nodoc
abstract mixin class _$AssignmentSummaryCopyWith<$Res> implements $AssignmentSummaryCopyWith<$Res> {
  factory _$AssignmentSummaryCopyWith(_AssignmentSummary value, $Res Function(_AssignmentSummary) _then) = __$AssignmentSummaryCopyWithImpl;
@override @useResult
$Res call({
 String id, String title, String? description, String? type, String? dueDate, String? lessonDate, String? createdAt,@JsonKey(readValue: readPendingCount) int pending
});




}
/// @nodoc
class __$AssignmentSummaryCopyWithImpl<$Res>
    implements _$AssignmentSummaryCopyWith<$Res> {
  __$AssignmentSummaryCopyWithImpl(this._self, this._then);

  final _AssignmentSummary _self;
  final $Res Function(_AssignmentSummary) _then;

/// Create a copy of AssignmentSummary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? description = freezed,Object? type = freezed,Object? dueDate = freezed,Object? lessonDate = freezed,Object? createdAt = freezed,Object? pending = null,}) {
  return _then(_AssignmentSummary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,type: freezed == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String?,dueDate: freezed == dueDate ? _self.dueDate : dueDate // ignore: cast_nullable_to_non_nullable
as String?,lessonDate: freezed == lessonDate ? _self.lessonDate : lessonDate // ignore: cast_nullable_to_non_nullable
as String?,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,pending: null == pending ? _self.pending : pending // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$SubmissionStudent {

 String get id; String get firstName; String? get lastName;
/// Create a copy of SubmissionStudent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SubmissionStudentCopyWith<SubmissionStudent> get copyWith => _$SubmissionStudentCopyWithImpl<SubmissionStudent>(this as SubmissionStudent, _$identity);

  /// Serializes this SubmissionStudent to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as SubmissionStudent;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SubmissionStudent&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.firstName, _this.firstName) || other.firstName == _this.firstName)&&(identical(other.lastName, _this.lastName) || other.lastName == _this.lastName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as SubmissionStudent;
  return Object.hash(runtimeType,_this.id,_this.firstName,_this.lastName);
}

@override
String toString() {
  final _this = this as SubmissionStudent;
  return 'SubmissionStudent(id: ${_this.id}, firstName: ${_this.firstName}, lastName: ${_this.lastName})';
}


}

/// @nodoc
abstract mixin class $SubmissionStudentCopyWith<$Res>  {
  factory $SubmissionStudentCopyWith(SubmissionStudent value, $Res Function(SubmissionStudent) _then) = _$SubmissionStudentCopyWithImpl;
@useResult
$Res call({
 String id, String firstName, String? lastName
});




}
/// @nodoc
class _$SubmissionStudentCopyWithImpl<$Res>
    implements $SubmissionStudentCopyWith<$Res> {
  _$SubmissionStudentCopyWithImpl(this._self, this._then);

  final SubmissionStudent _self;
  final $Res Function(SubmissionStudent) _then;

/// Create a copy of SubmissionStudent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? firstName = null,Object? lastName = freezed,}) {
  return _then(SubmissionStudent(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [SubmissionStudent].
extension SubmissionStudentPatterns on SubmissionStudent {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SubmissionStudent value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SubmissionStudent() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SubmissionStudent value)  $default,){
final _that = this;
switch (_that) {
case _SubmissionStudent():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SubmissionStudent value)?  $default,){
final _that = this;
switch (_that) {
case _SubmissionStudent() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String firstName,  String? lastName)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SubmissionStudent() when $default != null:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String firstName,  String? lastName)  $default,) {final _that = this;
switch (_that) {
case _SubmissionStudent():
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String firstName,  String? lastName)?  $default,) {final _that = this;
switch (_that) {
case _SubmissionStudent() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SubmissionStudent implements SubmissionStudent {
  const _SubmissionStudent({required this.id, this.firstName = '', this.lastName});
  factory _SubmissionStudent.fromJson(Map<String, dynamic> json) => _$SubmissionStudentFromJson(json);

@override final  String id;
@override@JsonKey() final  String firstName;
@override final  String? lastName;

/// Create a copy of SubmissionStudent
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SubmissionStudentCopyWith<_SubmissionStudent> get copyWith => __$SubmissionStudentCopyWithImpl<_SubmissionStudent>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SubmissionStudentToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _SubmissionStudent&&(identical(other.id, id) || other.id == id)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,firstName,lastName);
}

@override
String toString() {
    return 'SubmissionStudent(id: $id, firstName: $firstName, lastName: $lastName)';
}


}

/// @nodoc
abstract mixin class _$SubmissionStudentCopyWith<$Res> implements $SubmissionStudentCopyWith<$Res> {
  factory _$SubmissionStudentCopyWith(_SubmissionStudent value, $Res Function(_SubmissionStudent) _then) = __$SubmissionStudentCopyWithImpl;
@override @useResult
$Res call({
 String id, String firstName, String? lastName
});




}
/// @nodoc
class __$SubmissionStudentCopyWithImpl<$Res>
    implements _$SubmissionStudentCopyWith<$Res> {
  __$SubmissionStudentCopyWithImpl(this._self, this._then);

  final _SubmissionStudent _self;
  final $Res Function(_SubmissionStudent) _then;

/// Create a copy of SubmissionStudent
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? firstName = null,Object? lastName = freezed,}) {
  return _then(_SubmissionStudent(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$Submission {

 SubmissionStudent get student; String get state; List<String> get imageKeys; String? get note; String? get studentNote; String? get reviewNote; String? get submittedAt; String? get checkedAt;
/// Create a copy of Submission
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SubmissionCopyWith<Submission> get copyWith => _$SubmissionCopyWithImpl<Submission>(this as Submission, _$identity);

  /// Serializes this Submission to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Submission;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Submission&&(identical(other.student, _this.student) || other.student == _this.student)&&(identical(other.state, _this.state) || other.state == _this.state)&&const DeepCollectionEquality().equals(other.imageKeys, _this.imageKeys)&&(identical(other.note, _this.note) || other.note == _this.note)&&(identical(other.studentNote, _this.studentNote) || other.studentNote == _this.studentNote)&&(identical(other.reviewNote, _this.reviewNote) || other.reviewNote == _this.reviewNote)&&(identical(other.submittedAt, _this.submittedAt) || other.submittedAt == _this.submittedAt)&&(identical(other.checkedAt, _this.checkedAt) || other.checkedAt == _this.checkedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Submission;
  return Object.hash(runtimeType,_this.student,_this.state,const DeepCollectionEquality().hash(_this.imageKeys),_this.note,_this.studentNote,_this.reviewNote,_this.submittedAt,_this.checkedAt);
}

@override
String toString() {
  final _this = this as Submission;
  return 'Submission(student: ${_this.student}, state: ${_this.state}, imageKeys: ${_this.imageKeys}, note: ${_this.note}, studentNote: ${_this.studentNote}, reviewNote: ${_this.reviewNote}, submittedAt: ${_this.submittedAt}, checkedAt: ${_this.checkedAt})';
}


}

/// @nodoc
abstract mixin class $SubmissionCopyWith<$Res>  {
  factory $SubmissionCopyWith(Submission value, $Res Function(Submission) _then) = _$SubmissionCopyWithImpl;
@useResult
$Res call({
 SubmissionStudent student, String state, List<String> imageKeys, String? note, String? studentNote, String? reviewNote, String? submittedAt, String? checkedAt
});


$SubmissionStudentCopyWith<$Res> get student;

}
/// @nodoc
class _$SubmissionCopyWithImpl<$Res>
    implements $SubmissionCopyWith<$Res> {
  _$SubmissionCopyWithImpl(this._self, this._then);

  final Submission _self;
  final $Res Function(Submission) _then;

/// Create a copy of Submission
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? student = null,Object? state = null,Object? imageKeys = null,Object? note = freezed,Object? studentNote = freezed,Object? reviewNote = freezed,Object? submittedAt = freezed,Object? checkedAt = freezed,}) {
  return _then(Submission(
student: null == student ? _self.student : student // ignore: cast_nullable_to_non_nullable
as SubmissionStudent,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as String,imageKeys: null == imageKeys ? _self.imageKeys : imageKeys // ignore: cast_nullable_to_non_nullable
as List<String>,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,studentNote: freezed == studentNote ? _self.studentNote : studentNote // ignore: cast_nullable_to_non_nullable
as String?,reviewNote: freezed == reviewNote ? _self.reviewNote : reviewNote // ignore: cast_nullable_to_non_nullable
as String?,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as String?,checkedAt: freezed == checkedAt ? _self.checkedAt : checkedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}
/// Create a copy of Submission
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SubmissionStudentCopyWith<$Res> get student {
  
  return $SubmissionStudentCopyWith<$Res>(_self.student, (value) {
    return _then(_self.copyWith(student: value));
  });
}
}


/// Adds pattern-matching-related methods to [Submission].
extension SubmissionPatterns on Submission {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Submission value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Submission() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Submission value)  $default,){
final _that = this;
switch (_that) {
case _Submission():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Submission value)?  $default,){
final _that = this;
switch (_that) {
case _Submission() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( SubmissionStudent student,  String state,  List<String> imageKeys,  String? note,  String? studentNote,  String? reviewNote,  String? submittedAt,  String? checkedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Submission() when $default != null:
return $default(_that.student,_that.state,_that.imageKeys,_that.note,_that.studentNote,_that.reviewNote,_that.submittedAt,_that.checkedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( SubmissionStudent student,  String state,  List<String> imageKeys,  String? note,  String? studentNote,  String? reviewNote,  String? submittedAt,  String? checkedAt)  $default,) {final _that = this;
switch (_that) {
case _Submission():
return $default(_that.student,_that.state,_that.imageKeys,_that.note,_that.studentNote,_that.reviewNote,_that.submittedAt,_that.checkedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( SubmissionStudent student,  String state,  List<String> imageKeys,  String? note,  String? studentNote,  String? reviewNote,  String? submittedAt,  String? checkedAt)?  $default,) {final _that = this;
switch (_that) {
case _Submission() when $default != null:
return $default(_that.student,_that.state,_that.imageKeys,_that.note,_that.studentNote,_that.reviewNote,_that.submittedAt,_that.checkedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Submission implements Submission {
  const _Submission({required this.student, this.state = 'NOT_SUBMITTED',  List<String> imageKeys = const <String>[], this.note, this.studentNote, this.reviewNote, this.submittedAt, this.checkedAt}): _imageKeys = imageKeys;
  factory _Submission.fromJson(Map<String, dynamic> json) => _$SubmissionFromJson(json);

@override final  SubmissionStudent student;
@override@JsonKey() final  String state;
 final  List<String> _imageKeys;
@override@JsonKey() List<String> get imageKeys {
  if (_imageKeys is EqualUnmodifiableListView) return _imageKeys;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_imageKeys);
}

@override final  String? note;
@override final  String? studentNote;
@override final  String? reviewNote;
@override final  String? submittedAt;
@override final  String? checkedAt;

/// Create a copy of Submission
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SubmissionCopyWith<_Submission> get copyWith => __$SubmissionCopyWithImpl<_Submission>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SubmissionToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Submission&&(identical(other.student, student) || other.student == student)&&(identical(other.state, state) || other.state == state)&&const DeepCollectionEquality().equals(other.imageKeys, _imageKeys)&&(identical(other.note, note) || other.note == note)&&(identical(other.studentNote, studentNote) || other.studentNote == studentNote)&&(identical(other.reviewNote, reviewNote) || other.reviewNote == reviewNote)&&(identical(other.submittedAt, submittedAt) || other.submittedAt == submittedAt)&&(identical(other.checkedAt, checkedAt) || other.checkedAt == checkedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,student,state,const DeepCollectionEquality().hash(_imageKeys),note,studentNote,reviewNote,submittedAt,checkedAt);
}

@override
String toString() {
    return 'Submission(student: $student, state: $state, imageKeys: $imageKeys, note: $note, studentNote: $studentNote, reviewNote: $reviewNote, submittedAt: $submittedAt, checkedAt: $checkedAt)';
}


}

/// @nodoc
abstract mixin class _$SubmissionCopyWith<$Res> implements $SubmissionCopyWith<$Res> {
  factory _$SubmissionCopyWith(_Submission value, $Res Function(_Submission) _then) = __$SubmissionCopyWithImpl;
@override @useResult
$Res call({
 SubmissionStudent student, String state, List<String> imageKeys, String? note, String? studentNote, String? reviewNote, String? submittedAt, String? checkedAt
});


@override $SubmissionStudentCopyWith<$Res> get student;

}
/// @nodoc
class __$SubmissionCopyWithImpl<$Res>
    implements _$SubmissionCopyWith<$Res> {
  __$SubmissionCopyWithImpl(this._self, this._then);

  final _Submission _self;
  final $Res Function(_Submission) _then;

/// Create a copy of Submission
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? student = null,Object? state = null,Object? imageKeys = null,Object? note = freezed,Object? studentNote = freezed,Object? reviewNote = freezed,Object? submittedAt = freezed,Object? checkedAt = freezed,}) {
  return _then(_Submission(
student: null == student ? _self.student : student // ignore: cast_nullable_to_non_nullable
as SubmissionStudent,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as String,imageKeys: null == imageKeys ? _self._imageKeys : imageKeys // ignore: cast_nullable_to_non_nullable
as List<String>,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,studentNote: freezed == studentNote ? _self.studentNote : studentNote // ignore: cast_nullable_to_non_nullable
as String?,reviewNote: freezed == reviewNote ? _self.reviewNote : reviewNote // ignore: cast_nullable_to_non_nullable
as String?,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as String?,checkedAt: freezed == checkedAt ? _self.checkedAt : checkedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

/// Create a copy of Submission
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SubmissionStudentCopyWith<$Res> get student {
  
  return $SubmissionStudentCopyWith<$Res>(_self.student, (value) {
    return _then(_self.copyWith(student: value));
  });
}
}

// dart format on
