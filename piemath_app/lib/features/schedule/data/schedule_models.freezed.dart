// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'schedule_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ScheduleMe {

/// ЭХНИЙ идэвхтэй элсэлт. null = идэвхтэй анги алга.
 String? get classroomId; List<ScheduleEntry> get entries;
/// Create a copy of ScheduleMe
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScheduleMeCopyWith<ScheduleMe> get copyWith => _$ScheduleMeCopyWithImpl<ScheduleMe>(this as ScheduleMe, _$identity);

  /// Serializes this ScheduleMe to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ScheduleMe;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScheduleMe&&(identical(other.classroomId, _this.classroomId) || other.classroomId == _this.classroomId)&&const DeepCollectionEquality().equals(other.entries, _this.entries));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ScheduleMe;
  return Object.hash(runtimeType,_this.classroomId,const DeepCollectionEquality().hash(_this.entries));
}

@override
String toString() {
  final _this = this as ScheduleMe;
  return 'ScheduleMe(classroomId: ${_this.classroomId}, entries: ${_this.entries})';
}


}

/// @nodoc
abstract mixin class $ScheduleMeCopyWith<$Res>  {
  factory $ScheduleMeCopyWith(ScheduleMe value, $Res Function(ScheduleMe) _then) = _$ScheduleMeCopyWithImpl;
@useResult
$Res call({
 String? classroomId, List<ScheduleEntry> entries
});




}
/// @nodoc
class _$ScheduleMeCopyWithImpl<$Res>
    implements $ScheduleMeCopyWith<$Res> {
  _$ScheduleMeCopyWithImpl(this._self, this._then);

  final ScheduleMe _self;
  final $Res Function(ScheduleMe) _then;

/// Create a copy of ScheduleMe
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? classroomId = freezed,Object? entries = null,}) {
  return _then(ScheduleMe(
classroomId: freezed == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String?,entries: null == entries ? _self.entries : entries // ignore: cast_nullable_to_non_nullable
as List<ScheduleEntry>,
  ));
}

}


/// Adds pattern-matching-related methods to [ScheduleMe].
extension ScheduleMePatterns on ScheduleMe {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScheduleMe value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScheduleMe() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScheduleMe value)  $default,){
final _that = this;
switch (_that) {
case _ScheduleMe():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScheduleMe value)?  $default,){
final _that = this;
switch (_that) {
case _ScheduleMe() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? classroomId,  List<ScheduleEntry> entries)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ScheduleMe() when $default != null:
return $default(_that.classroomId,_that.entries);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? classroomId,  List<ScheduleEntry> entries)  $default,) {final _that = this;
switch (_that) {
case _ScheduleMe():
return $default(_that.classroomId,_that.entries);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? classroomId,  List<ScheduleEntry> entries)?  $default,) {final _that = this;
switch (_that) {
case _ScheduleMe() when $default != null:
return $default(_that.classroomId,_that.entries);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScheduleMe implements ScheduleMe {
  const _ScheduleMe({this.classroomId,  List<ScheduleEntry> entries = const <ScheduleEntry>[]}): _entries = entries;
  factory _ScheduleMe.fromJson(Map<String, dynamic> json) => _$ScheduleMeFromJson(json);

/// ЭХНИЙ идэвхтэй элсэлт. null = идэвхтэй анги алга.
@override final  String? classroomId;
 final  List<ScheduleEntry> _entries;
@override@JsonKey() List<ScheduleEntry> get entries {
  if (_entries is EqualUnmodifiableListView) return _entries;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_entries);
}


/// Create a copy of ScheduleMe
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScheduleMeCopyWith<_ScheduleMe> get copyWith => __$ScheduleMeCopyWithImpl<_ScheduleMe>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScheduleMeToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScheduleMe&&(identical(other.classroomId, classroomId) || other.classroomId == classroomId)&&const DeepCollectionEquality().equals(other.entries, _entries));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,classroomId,const DeepCollectionEquality().hash(_entries));
}

@override
String toString() {
    return 'ScheduleMe(classroomId: $classroomId, entries: $entries)';
}


}

/// @nodoc
abstract mixin class _$ScheduleMeCopyWith<$Res> implements $ScheduleMeCopyWith<$Res> {
  factory _$ScheduleMeCopyWith(_ScheduleMe value, $Res Function(_ScheduleMe) _then) = __$ScheduleMeCopyWithImpl;
@override @useResult
$Res call({
 String? classroomId, List<ScheduleEntry> entries
});




}
/// @nodoc
class __$ScheduleMeCopyWithImpl<$Res>
    implements _$ScheduleMeCopyWith<$Res> {
  __$ScheduleMeCopyWithImpl(this._self, this._then);

  final _ScheduleMe _self;
  final $Res Function(_ScheduleMe) _then;

/// Create a copy of ScheduleMe
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? classroomId = freezed,Object? entries = null,}) {
  return _then(_ScheduleMe(
classroomId: freezed == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String?,entries: null == entries ? _self._entries : entries // ignore: cast_nullable_to_non_nullable
as List<ScheduleEntry>,
  ));
}


}


/// @nodoc
mixin _$ScheduleEntry {

 String get id; String get classroomId;/// JS 0=Ням.
 int get weekday; int get startMinute; int get endMinute; String? get room; String? get subject; ScheduleClassroom? get classroom; SchedulePerson? get teacher;
/// Create a copy of ScheduleEntry
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScheduleEntryCopyWith<ScheduleEntry> get copyWith => _$ScheduleEntryCopyWithImpl<ScheduleEntry>(this as ScheduleEntry, _$identity);

  /// Serializes this ScheduleEntry to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ScheduleEntry;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScheduleEntry&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.classroomId, _this.classroomId) || other.classroomId == _this.classroomId)&&(identical(other.weekday, _this.weekday) || other.weekday == _this.weekday)&&(identical(other.startMinute, _this.startMinute) || other.startMinute == _this.startMinute)&&(identical(other.endMinute, _this.endMinute) || other.endMinute == _this.endMinute)&&(identical(other.room, _this.room) || other.room == _this.room)&&(identical(other.subject, _this.subject) || other.subject == _this.subject)&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom)&&(identical(other.teacher, _this.teacher) || other.teacher == _this.teacher));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ScheduleEntry;
  return Object.hash(runtimeType,_this.id,_this.classroomId,_this.weekday,_this.startMinute,_this.endMinute,_this.room,_this.subject,_this.classroom,_this.teacher);
}

@override
String toString() {
  final _this = this as ScheduleEntry;
  return 'ScheduleEntry(id: ${_this.id}, classroomId: ${_this.classroomId}, weekday: ${_this.weekday}, startMinute: ${_this.startMinute}, endMinute: ${_this.endMinute}, room: ${_this.room}, subject: ${_this.subject}, classroom: ${_this.classroom}, teacher: ${_this.teacher})';
}


}

/// @nodoc
abstract mixin class $ScheduleEntryCopyWith<$Res>  {
  factory $ScheduleEntryCopyWith(ScheduleEntry value, $Res Function(ScheduleEntry) _then) = _$ScheduleEntryCopyWithImpl;
@useResult
$Res call({
 String id, String classroomId, int weekday, int startMinute, int endMinute, String? room, String? subject, ScheduleClassroom? classroom, SchedulePerson? teacher
});


$ScheduleClassroomCopyWith<$Res>? get classroom;$SchedulePersonCopyWith<$Res>? get teacher;

}
/// @nodoc
class _$ScheduleEntryCopyWithImpl<$Res>
    implements $ScheduleEntryCopyWith<$Res> {
  _$ScheduleEntryCopyWithImpl(this._self, this._then);

  final ScheduleEntry _self;
  final $Res Function(ScheduleEntry) _then;

/// Create a copy of ScheduleEntry
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? classroomId = null,Object? weekday = null,Object? startMinute = null,Object? endMinute = null,Object? room = freezed,Object? subject = freezed,Object? classroom = freezed,Object? teacher = freezed,}) {
  return _then(ScheduleEntry(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,weekday: null == weekday ? _self.weekday : weekday // ignore: cast_nullable_to_non_nullable
as int,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,subject: freezed == subject ? _self.subject : subject // ignore: cast_nullable_to_non_nullable
as String?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ScheduleClassroom?,teacher: freezed == teacher ? _self.teacher : teacher // ignore: cast_nullable_to_non_nullable
as SchedulePerson?,
  ));
}
/// Create a copy of ScheduleEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ScheduleClassroomCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $ScheduleClassroomCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}/// Create a copy of ScheduleEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SchedulePersonCopyWith<$Res>? get teacher {
    if (_self.teacher == null) {
    return null;
  }

  return $SchedulePersonCopyWith<$Res>(_self.teacher!, (value) {
    return _then(_self.copyWith(teacher: value));
  });
}
}


/// Adds pattern-matching-related methods to [ScheduleEntry].
extension ScheduleEntryPatterns on ScheduleEntry {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScheduleEntry value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScheduleEntry() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScheduleEntry value)  $default,){
final _that = this;
switch (_that) {
case _ScheduleEntry():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScheduleEntry value)?  $default,){
final _that = this;
switch (_that) {
case _ScheduleEntry() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String classroomId,  int weekday,  int startMinute,  int endMinute,  String? room,  String? subject,  ScheduleClassroom? classroom,  SchedulePerson? teacher)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ScheduleEntry() when $default != null:
return $default(_that.id,_that.classroomId,_that.weekday,_that.startMinute,_that.endMinute,_that.room,_that.subject,_that.classroom,_that.teacher);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String classroomId,  int weekday,  int startMinute,  int endMinute,  String? room,  String? subject,  ScheduleClassroom? classroom,  SchedulePerson? teacher)  $default,) {final _that = this;
switch (_that) {
case _ScheduleEntry():
return $default(_that.id,_that.classroomId,_that.weekday,_that.startMinute,_that.endMinute,_that.room,_that.subject,_that.classroom,_that.teacher);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String classroomId,  int weekday,  int startMinute,  int endMinute,  String? room,  String? subject,  ScheduleClassroom? classroom,  SchedulePerson? teacher)?  $default,) {final _that = this;
switch (_that) {
case _ScheduleEntry() when $default != null:
return $default(_that.id,_that.classroomId,_that.weekday,_that.startMinute,_that.endMinute,_that.room,_that.subject,_that.classroom,_that.teacher);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScheduleEntry implements ScheduleEntry {
  const _ScheduleEntry({required this.id, required this.classroomId, required this.weekday, required this.startMinute, required this.endMinute, this.room, this.subject, this.classroom, this.teacher});
  factory _ScheduleEntry.fromJson(Map<String, dynamic> json) => _$ScheduleEntryFromJson(json);

@override final  String id;
@override final  String classroomId;
/// JS 0=Ням.
@override final  int weekday;
@override final  int startMinute;
@override final  int endMinute;
@override final  String? room;
@override final  String? subject;
@override final  ScheduleClassroom? classroom;
@override final  SchedulePerson? teacher;

/// Create a copy of ScheduleEntry
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScheduleEntryCopyWith<_ScheduleEntry> get copyWith => __$ScheduleEntryCopyWithImpl<_ScheduleEntry>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScheduleEntryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScheduleEntry&&(identical(other.id, id) || other.id == id)&&(identical(other.classroomId, classroomId) || other.classroomId == classroomId)&&(identical(other.weekday, weekday) || other.weekday == weekday)&&(identical(other.startMinute, startMinute) || other.startMinute == startMinute)&&(identical(other.endMinute, endMinute) || other.endMinute == endMinute)&&(identical(other.room, room) || other.room == room)&&(identical(other.subject, subject) || other.subject == subject)&&(identical(other.classroom, classroom) || other.classroom == classroom)&&(identical(other.teacher, teacher) || other.teacher == teacher));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,classroomId,weekday,startMinute,endMinute,room,subject,classroom,teacher);
}

@override
String toString() {
    return 'ScheduleEntry(id: $id, classroomId: $classroomId, weekday: $weekday, startMinute: $startMinute, endMinute: $endMinute, room: $room, subject: $subject, classroom: $classroom, teacher: $teacher)';
}


}

/// @nodoc
abstract mixin class _$ScheduleEntryCopyWith<$Res> implements $ScheduleEntryCopyWith<$Res> {
  factory _$ScheduleEntryCopyWith(_ScheduleEntry value, $Res Function(_ScheduleEntry) _then) = __$ScheduleEntryCopyWithImpl;
@override @useResult
$Res call({
 String id, String classroomId, int weekday, int startMinute, int endMinute, String? room, String? subject, ScheduleClassroom? classroom, SchedulePerson? teacher
});


@override $ScheduleClassroomCopyWith<$Res>? get classroom;@override $SchedulePersonCopyWith<$Res>? get teacher;

}
/// @nodoc
class __$ScheduleEntryCopyWithImpl<$Res>
    implements _$ScheduleEntryCopyWith<$Res> {
  __$ScheduleEntryCopyWithImpl(this._self, this._then);

  final _ScheduleEntry _self;
  final $Res Function(_ScheduleEntry) _then;

/// Create a copy of ScheduleEntry
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? classroomId = null,Object? weekday = null,Object? startMinute = null,Object? endMinute = null,Object? room = freezed,Object? subject = freezed,Object? classroom = freezed,Object? teacher = freezed,}) {
  return _then(_ScheduleEntry(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,weekday: null == weekday ? _self.weekday : weekday // ignore: cast_nullable_to_non_nullable
as int,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,subject: freezed == subject ? _self.subject : subject // ignore: cast_nullable_to_non_nullable
as String?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ScheduleClassroom?,teacher: freezed == teacher ? _self.teacher : teacher // ignore: cast_nullable_to_non_nullable
as SchedulePerson?,
  ));
}

/// Create a copy of ScheduleEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ScheduleClassroomCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $ScheduleClassroomCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}/// Create a copy of ScheduleEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$SchedulePersonCopyWith<$Res>? get teacher {
    if (_self.teacher == null) {
    return null;
  }

  return $SchedulePersonCopyWith<$Res>(_self.teacher!, (value) {
    return _then(_self.copyWith(teacher: value));
  });
}
}


/// @nodoc
mixin _$ScheduleClassroom {

 String get id; String get name;
/// Create a copy of ScheduleClassroom
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScheduleClassroomCopyWith<ScheduleClassroom> get copyWith => _$ScheduleClassroomCopyWithImpl<ScheduleClassroom>(this as ScheduleClassroom, _$identity);

  /// Serializes this ScheduleClassroom to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ScheduleClassroom;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScheduleClassroom&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ScheduleClassroom;
  return Object.hash(runtimeType,_this.id,_this.name);
}

@override
String toString() {
  final _this = this as ScheduleClassroom;
  return 'ScheduleClassroom(id: ${_this.id}, name: ${_this.name})';
}


}

/// @nodoc
abstract mixin class $ScheduleClassroomCopyWith<$Res>  {
  factory $ScheduleClassroomCopyWith(ScheduleClassroom value, $Res Function(ScheduleClassroom) _then) = _$ScheduleClassroomCopyWithImpl;
@useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class _$ScheduleClassroomCopyWithImpl<$Res>
    implements $ScheduleClassroomCopyWith<$Res> {
  _$ScheduleClassroomCopyWithImpl(this._self, this._then);

  final ScheduleClassroom _self;
  final $Res Function(ScheduleClassroom) _then;

/// Create a copy of ScheduleClassroom
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,}) {
  return _then(ScheduleClassroom(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ScheduleClassroom].
extension ScheduleClassroomPatterns on ScheduleClassroom {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScheduleClassroom value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScheduleClassroom() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScheduleClassroom value)  $default,){
final _that = this;
switch (_that) {
case _ScheduleClassroom():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScheduleClassroom value)?  $default,){
final _that = this;
switch (_that) {
case _ScheduleClassroom() when $default != null:
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
case _ScheduleClassroom() when $default != null:
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
case _ScheduleClassroom():
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
case _ScheduleClassroom() when $default != null:
return $default(_that.id,_that.name);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScheduleClassroom implements ScheduleClassroom {
  const _ScheduleClassroom({required this.id, this.name = ''});
  factory _ScheduleClassroom.fromJson(Map<String, dynamic> json) => _$ScheduleClassroomFromJson(json);

@override final  String id;
@override@JsonKey() final  String name;

/// Create a copy of ScheduleClassroom
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScheduleClassroomCopyWith<_ScheduleClassroom> get copyWith => __$ScheduleClassroomCopyWithImpl<_ScheduleClassroom>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScheduleClassroomToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScheduleClassroom&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name);
}

@override
String toString() {
    return 'ScheduleClassroom(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class _$ScheduleClassroomCopyWith<$Res> implements $ScheduleClassroomCopyWith<$Res> {
  factory _$ScheduleClassroomCopyWith(_ScheduleClassroom value, $Res Function(_ScheduleClassroom) _then) = __$ScheduleClassroomCopyWithImpl;
@override @useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class __$ScheduleClassroomCopyWithImpl<$Res>
    implements _$ScheduleClassroomCopyWith<$Res> {
  __$ScheduleClassroomCopyWithImpl(this._self, this._then);

  final _ScheduleClassroom _self;
  final $Res Function(_ScheduleClassroom) _then;

/// Create a copy of ScheduleClassroom
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,}) {
  return _then(_ScheduleClassroom(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$SchedulePerson {

 String? get id; String get firstName; String? get lastName; String? get role;
/// Create a copy of SchedulePerson
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SchedulePersonCopyWith<SchedulePerson> get copyWith => _$SchedulePersonCopyWithImpl<SchedulePerson>(this as SchedulePerson, _$identity);

  /// Serializes this SchedulePerson to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as SchedulePerson;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SchedulePerson&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.firstName, _this.firstName) || other.firstName == _this.firstName)&&(identical(other.lastName, _this.lastName) || other.lastName == _this.lastName)&&(identical(other.role, _this.role) || other.role == _this.role));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as SchedulePerson;
  return Object.hash(runtimeType,_this.id,_this.firstName,_this.lastName,_this.role);
}

@override
String toString() {
  final _this = this as SchedulePerson;
  return 'SchedulePerson(id: ${_this.id}, firstName: ${_this.firstName}, lastName: ${_this.lastName}, role: ${_this.role})';
}


}

/// @nodoc
abstract mixin class $SchedulePersonCopyWith<$Res>  {
  factory $SchedulePersonCopyWith(SchedulePerson value, $Res Function(SchedulePerson) _then) = _$SchedulePersonCopyWithImpl;
@useResult
$Res call({
 String? id, String firstName, String? lastName, String? role
});




}
/// @nodoc
class _$SchedulePersonCopyWithImpl<$Res>
    implements $SchedulePersonCopyWith<$Res> {
  _$SchedulePersonCopyWithImpl(this._self, this._then);

  final SchedulePerson _self;
  final $Res Function(SchedulePerson) _then;

/// Create a copy of SchedulePerson
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = freezed,Object? firstName = null,Object? lastName = freezed,Object? role = freezed,}) {
  return _then(SchedulePerson(
id: freezed == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String?,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,role: freezed == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [SchedulePerson].
extension SchedulePersonPatterns on SchedulePerson {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SchedulePerson value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SchedulePerson() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SchedulePerson value)  $default,){
final _that = this;
switch (_that) {
case _SchedulePerson():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SchedulePerson value)?  $default,){
final _that = this;
switch (_that) {
case _SchedulePerson() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? id,  String firstName,  String? lastName,  String? role)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SchedulePerson() when $default != null:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? id,  String firstName,  String? lastName,  String? role)  $default,) {final _that = this;
switch (_that) {
case _SchedulePerson():
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? id,  String firstName,  String? lastName,  String? role)?  $default,) {final _that = this;
switch (_that) {
case _SchedulePerson() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName,_that.role);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SchedulePerson implements SchedulePerson {
  const _SchedulePerson({this.id, this.firstName = '', this.lastName, this.role});
  factory _SchedulePerson.fromJson(Map<String, dynamic> json) => _$SchedulePersonFromJson(json);

@override final  String? id;
@override@JsonKey() final  String firstName;
@override final  String? lastName;
@override final  String? role;

/// Create a copy of SchedulePerson
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SchedulePersonCopyWith<_SchedulePerson> get copyWith => __$SchedulePersonCopyWithImpl<_SchedulePerson>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SchedulePersonToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _SchedulePerson&&(identical(other.id, id) || other.id == id)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.role, role) || other.role == role));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,firstName,lastName,role);
}

@override
String toString() {
    return 'SchedulePerson(id: $id, firstName: $firstName, lastName: $lastName, role: $role)';
}


}

/// @nodoc
abstract mixin class _$SchedulePersonCopyWith<$Res> implements $SchedulePersonCopyWith<$Res> {
  factory _$SchedulePersonCopyWith(_SchedulePerson value, $Res Function(_SchedulePerson) _then) = __$SchedulePersonCopyWithImpl;
@override @useResult
$Res call({
 String? id, String firstName, String? lastName, String? role
});




}
/// @nodoc
class __$SchedulePersonCopyWithImpl<$Res>
    implements _$SchedulePersonCopyWith<$Res> {
  __$SchedulePersonCopyWithImpl(this._self, this._then);

  final _SchedulePerson _self;
  final $Res Function(_SchedulePerson) _then;

/// Create a copy of SchedulePerson
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = freezed,Object? firstName = null,Object? lastName = freezed,Object? role = freezed,}) {
  return _then(_SchedulePerson(
id: freezed == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String?,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,role: freezed == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ScheduleWeek {

 String get start; List<WeekDay> get days;
/// Create a copy of ScheduleWeek
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ScheduleWeekCopyWith<ScheduleWeek> get copyWith => _$ScheduleWeekCopyWithImpl<ScheduleWeek>(this as ScheduleWeek, _$identity);

  /// Serializes this ScheduleWeek to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ScheduleWeek;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ScheduleWeek&&(identical(other.start, _this.start) || other.start == _this.start)&&const DeepCollectionEquality().equals(other.days, _this.days));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ScheduleWeek;
  return Object.hash(runtimeType,_this.start,const DeepCollectionEquality().hash(_this.days));
}

@override
String toString() {
  final _this = this as ScheduleWeek;
  return 'ScheduleWeek(start: ${_this.start}, days: ${_this.days})';
}


}

/// @nodoc
abstract mixin class $ScheduleWeekCopyWith<$Res>  {
  factory $ScheduleWeekCopyWith(ScheduleWeek value, $Res Function(ScheduleWeek) _then) = _$ScheduleWeekCopyWithImpl;
@useResult
$Res call({
 String start, List<WeekDay> days
});




}
/// @nodoc
class _$ScheduleWeekCopyWithImpl<$Res>
    implements $ScheduleWeekCopyWith<$Res> {
  _$ScheduleWeekCopyWithImpl(this._self, this._then);

  final ScheduleWeek _self;
  final $Res Function(ScheduleWeek) _then;

/// Create a copy of ScheduleWeek
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? start = null,Object? days = null,}) {
  return _then(ScheduleWeek(
start: null == start ? _self.start : start // ignore: cast_nullable_to_non_nullable
as String,days: null == days ? _self.days : days // ignore: cast_nullable_to_non_nullable
as List<WeekDay>,
  ));
}

}


/// Adds pattern-matching-related methods to [ScheduleWeek].
extension ScheduleWeekPatterns on ScheduleWeek {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ScheduleWeek value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ScheduleWeek() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ScheduleWeek value)  $default,){
final _that = this;
switch (_that) {
case _ScheduleWeek():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ScheduleWeek value)?  $default,){
final _that = this;
switch (_that) {
case _ScheduleWeek() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String start,  List<WeekDay> days)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ScheduleWeek() when $default != null:
return $default(_that.start,_that.days);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String start,  List<WeekDay> days)  $default,) {final _that = this;
switch (_that) {
case _ScheduleWeek():
return $default(_that.start,_that.days);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String start,  List<WeekDay> days)?  $default,) {final _that = this;
switch (_that) {
case _ScheduleWeek() when $default != null:
return $default(_that.start,_that.days);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ScheduleWeek implements ScheduleWeek {
  const _ScheduleWeek({required this.start,  List<WeekDay> days = const <WeekDay>[]}): _days = days;
  factory _ScheduleWeek.fromJson(Map<String, dynamic> json) => _$ScheduleWeekFromJson(json);

@override final  String start;
 final  List<WeekDay> _days;
@override@JsonKey() List<WeekDay> get days {
  if (_days is EqualUnmodifiableListView) return _days;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_days);
}


/// Create a copy of ScheduleWeek
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ScheduleWeekCopyWith<_ScheduleWeek> get copyWith => __$ScheduleWeekCopyWithImpl<_ScheduleWeek>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ScheduleWeekToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ScheduleWeek&&(identical(other.start, start) || other.start == start)&&const DeepCollectionEquality().equals(other.days, _days));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,start,const DeepCollectionEquality().hash(_days));
}

@override
String toString() {
    return 'ScheduleWeek(start: $start, days: $days)';
}


}

/// @nodoc
abstract mixin class _$ScheduleWeekCopyWith<$Res> implements $ScheduleWeekCopyWith<$Res> {
  factory _$ScheduleWeekCopyWith(_ScheduleWeek value, $Res Function(_ScheduleWeek) _then) = __$ScheduleWeekCopyWithImpl;
@override @useResult
$Res call({
 String start, List<WeekDay> days
});




}
/// @nodoc
class __$ScheduleWeekCopyWithImpl<$Res>
    implements _$ScheduleWeekCopyWith<$Res> {
  __$ScheduleWeekCopyWithImpl(this._self, this._then);

  final _ScheduleWeek _self;
  final $Res Function(_ScheduleWeek) _then;

/// Create a copy of ScheduleWeek
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? start = null,Object? days = null,}) {
  return _then(_ScheduleWeek(
start: null == start ? _self.start : start // ignore: cast_nullable_to_non_nullable
as String,days: null == days ? _self._days : days // ignore: cast_nullable_to_non_nullable
as List<WeekDay>,
  ));
}


}


/// @nodoc
mixin _$WeekDay {

 String get date;/// JS 0=Ням.
 int get weekday; bool get isHoliday; CalendarMark? get holiday; List<RestingClass> get restingClasses; List<WeekEntry> get entries;
/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WeekDayCopyWith<WeekDay> get copyWith => _$WeekDayCopyWithImpl<WeekDay>(this as WeekDay, _$identity);

  /// Serializes this WeekDay to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as WeekDay;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is WeekDay&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.weekday, _this.weekday) || other.weekday == _this.weekday)&&(identical(other.isHoliday, _this.isHoliday) || other.isHoliday == _this.isHoliday)&&(identical(other.holiday, _this.holiday) || other.holiday == _this.holiday)&&const DeepCollectionEquality().equals(other.restingClasses, _this.restingClasses)&&const DeepCollectionEquality().equals(other.entries, _this.entries));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as WeekDay;
  return Object.hash(runtimeType,_this.date,_this.weekday,_this.isHoliday,_this.holiday,const DeepCollectionEquality().hash(_this.restingClasses),const DeepCollectionEquality().hash(_this.entries));
}

@override
String toString() {
  final _this = this as WeekDay;
  return 'WeekDay(date: ${_this.date}, weekday: ${_this.weekday}, isHoliday: ${_this.isHoliday}, holiday: ${_this.holiday}, restingClasses: ${_this.restingClasses}, entries: ${_this.entries})';
}


}

/// @nodoc
abstract mixin class $WeekDayCopyWith<$Res>  {
  factory $WeekDayCopyWith(WeekDay value, $Res Function(WeekDay) _then) = _$WeekDayCopyWithImpl;
@useResult
$Res call({
 String date, int weekday, bool isHoliday, CalendarMark? holiday, List<RestingClass> restingClasses, List<WeekEntry> entries
});


$CalendarMarkCopyWith<$Res>? get holiday;

}
/// @nodoc
class _$WeekDayCopyWithImpl<$Res>
    implements $WeekDayCopyWith<$Res> {
  _$WeekDayCopyWithImpl(this._self, this._then);

  final WeekDay _self;
  final $Res Function(WeekDay) _then;

/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? weekday = null,Object? isHoliday = null,Object? holiday = freezed,Object? restingClasses = null,Object? entries = null,}) {
  return _then(WeekDay(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,weekday: null == weekday ? _self.weekday : weekday // ignore: cast_nullable_to_non_nullable
as int,isHoliday: null == isHoliday ? _self.isHoliday : isHoliday // ignore: cast_nullable_to_non_nullable
as bool,holiday: freezed == holiday ? _self.holiday : holiday // ignore: cast_nullable_to_non_nullable
as CalendarMark?,restingClasses: null == restingClasses ? _self.restingClasses : restingClasses // ignore: cast_nullable_to_non_nullable
as List<RestingClass>,entries: null == entries ? _self.entries : entries // ignore: cast_nullable_to_non_nullable
as List<WeekEntry>,
  ));
}
/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CalendarMarkCopyWith<$Res>? get holiday {
    if (_self.holiday == null) {
    return null;
  }

  return $CalendarMarkCopyWith<$Res>(_self.holiday!, (value) {
    return _then(_self.copyWith(holiday: value));
  });
}
}


/// Adds pattern-matching-related methods to [WeekDay].
extension WeekDayPatterns on WeekDay {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _WeekDay value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _WeekDay() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _WeekDay value)  $default,){
final _that = this;
switch (_that) {
case _WeekDay():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _WeekDay value)?  $default,){
final _that = this;
switch (_that) {
case _WeekDay() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  int weekday,  bool isHoliday,  CalendarMark? holiday,  List<RestingClass> restingClasses,  List<WeekEntry> entries)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _WeekDay() when $default != null:
return $default(_that.date,_that.weekday,_that.isHoliday,_that.holiday,_that.restingClasses,_that.entries);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  int weekday,  bool isHoliday,  CalendarMark? holiday,  List<RestingClass> restingClasses,  List<WeekEntry> entries)  $default,) {final _that = this;
switch (_that) {
case _WeekDay():
return $default(_that.date,_that.weekday,_that.isHoliday,_that.holiday,_that.restingClasses,_that.entries);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  int weekday,  bool isHoliday,  CalendarMark? holiday,  List<RestingClass> restingClasses,  List<WeekEntry> entries)?  $default,) {final _that = this;
switch (_that) {
case _WeekDay() when $default != null:
return $default(_that.date,_that.weekday,_that.isHoliday,_that.holiday,_that.restingClasses,_that.entries);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _WeekDay implements WeekDay {
  const _WeekDay({required this.date, required this.weekday, this.isHoliday = false, this.holiday,  List<RestingClass> restingClasses = const <RestingClass>[],  List<WeekEntry> entries = const <WeekEntry>[]}): _restingClasses = restingClasses,_entries = entries;
  factory _WeekDay.fromJson(Map<String, dynamic> json) => _$WeekDayFromJson(json);

@override final  String date;
/// JS 0=Ням.
@override final  int weekday;
@override@JsonKey() final  bool isHoliday;
@override final  CalendarMark? holiday;
 final  List<RestingClass> _restingClasses;
@override@JsonKey() List<RestingClass> get restingClasses {
  if (_restingClasses is EqualUnmodifiableListView) return _restingClasses;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_restingClasses);
}

 final  List<WeekEntry> _entries;
@override@JsonKey() List<WeekEntry> get entries {
  if (_entries is EqualUnmodifiableListView) return _entries;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_entries);
}


/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WeekDayCopyWith<_WeekDay> get copyWith => __$WeekDayCopyWithImpl<_WeekDay>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$WeekDayToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _WeekDay&&(identical(other.date, date) || other.date == date)&&(identical(other.weekday, weekday) || other.weekday == weekday)&&(identical(other.isHoliday, isHoliday) || other.isHoliday == isHoliday)&&(identical(other.holiday, holiday) || other.holiday == holiday)&&const DeepCollectionEquality().equals(other.restingClasses, _restingClasses)&&const DeepCollectionEquality().equals(other.entries, _entries));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,weekday,isHoliday,holiday,const DeepCollectionEquality().hash(_restingClasses),const DeepCollectionEquality().hash(_entries));
}

@override
String toString() {
    return 'WeekDay(date: $date, weekday: $weekday, isHoliday: $isHoliday, holiday: $holiday, restingClasses: $restingClasses, entries: $entries)';
}


}

/// @nodoc
abstract mixin class _$WeekDayCopyWith<$Res> implements $WeekDayCopyWith<$Res> {
  factory _$WeekDayCopyWith(_WeekDay value, $Res Function(_WeekDay) _then) = __$WeekDayCopyWithImpl;
@override @useResult
$Res call({
 String date, int weekday, bool isHoliday, CalendarMark? holiday, List<RestingClass> restingClasses, List<WeekEntry> entries
});


@override $CalendarMarkCopyWith<$Res>? get holiday;

}
/// @nodoc
class __$WeekDayCopyWithImpl<$Res>
    implements _$WeekDayCopyWith<$Res> {
  __$WeekDayCopyWithImpl(this._self, this._then);

  final _WeekDay _self;
  final $Res Function(_WeekDay) _then;

/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? weekday = null,Object? isHoliday = null,Object? holiday = freezed,Object? restingClasses = null,Object? entries = null,}) {
  return _then(_WeekDay(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,weekday: null == weekday ? _self.weekday : weekday // ignore: cast_nullable_to_non_nullable
as int,isHoliday: null == isHoliday ? _self.isHoliday : isHoliday // ignore: cast_nullable_to_non_nullable
as bool,holiday: freezed == holiday ? _self.holiday : holiday // ignore: cast_nullable_to_non_nullable
as CalendarMark?,restingClasses: null == restingClasses ? _self._restingClasses : restingClasses // ignore: cast_nullable_to_non_nullable
as List<RestingClass>,entries: null == entries ? _self._entries : entries // ignore: cast_nullable_to_non_nullable
as List<WeekEntry>,
  ));
}

/// Create a copy of WeekDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$CalendarMarkCopyWith<$Res>? get holiday {
    if (_self.holiday == null) {
    return null;
  }

  return $CalendarMarkCopyWith<$Res>(_self.holiday!, (value) {
    return _then(_self.copyWith(holiday: value));
  });
}
}


/// @nodoc
mixin _$CalendarMark {

 String get type; String get title; String? get note;
/// Create a copy of CalendarMark
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CalendarMarkCopyWith<CalendarMark> get copyWith => _$CalendarMarkCopyWithImpl<CalendarMark>(this as CalendarMark, _$identity);

  /// Serializes this CalendarMark to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as CalendarMark;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CalendarMark&&(identical(other.type, _this.type) || other.type == _this.type)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.note, _this.note) || other.note == _this.note));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as CalendarMark;
  return Object.hash(runtimeType,_this.type,_this.title,_this.note);
}

@override
String toString() {
  final _this = this as CalendarMark;
  return 'CalendarMark(type: ${_this.type}, title: ${_this.title}, note: ${_this.note})';
}


}

/// @nodoc
abstract mixin class $CalendarMarkCopyWith<$Res>  {
  factory $CalendarMarkCopyWith(CalendarMark value, $Res Function(CalendarMark) _then) = _$CalendarMarkCopyWithImpl;
@useResult
$Res call({
 String type, String title, String? note
});




}
/// @nodoc
class _$CalendarMarkCopyWithImpl<$Res>
    implements $CalendarMarkCopyWith<$Res> {
  _$CalendarMarkCopyWithImpl(this._self, this._then);

  final CalendarMark _self;
  final $Res Function(CalendarMark) _then;

/// Create a copy of CalendarMark
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? type = null,Object? title = null,Object? note = freezed,}) {
  return _then(CalendarMark(
type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [CalendarMark].
extension CalendarMarkPatterns on CalendarMark {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CalendarMark value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CalendarMark() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CalendarMark value)  $default,){
final _that = this;
switch (_that) {
case _CalendarMark():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CalendarMark value)?  $default,){
final _that = this;
switch (_that) {
case _CalendarMark() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String type,  String title,  String? note)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CalendarMark() when $default != null:
return $default(_that.type,_that.title,_that.note);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String type,  String title,  String? note)  $default,) {final _that = this;
switch (_that) {
case _CalendarMark():
return $default(_that.type,_that.title,_that.note);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String type,  String title,  String? note)?  $default,) {final _that = this;
switch (_that) {
case _CalendarMark() when $default != null:
return $default(_that.type,_that.title,_that.note);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CalendarMark implements CalendarMark {
  const _CalendarMark({this.type = 'HOLIDAY', this.title = '', this.note});
  factory _CalendarMark.fromJson(Map<String, dynamic> json) => _$CalendarMarkFromJson(json);

@override@JsonKey() final  String type;
@override@JsonKey() final  String title;
@override final  String? note;

/// Create a copy of CalendarMark
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CalendarMarkCopyWith<_CalendarMark> get copyWith => __$CalendarMarkCopyWithImpl<_CalendarMark>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CalendarMarkToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _CalendarMark&&(identical(other.type, type) || other.type == type)&&(identical(other.title, title) || other.title == title)&&(identical(other.note, note) || other.note == note));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,type,title,note);
}

@override
String toString() {
    return 'CalendarMark(type: $type, title: $title, note: $note)';
}


}

/// @nodoc
abstract mixin class _$CalendarMarkCopyWith<$Res> implements $CalendarMarkCopyWith<$Res> {
  factory _$CalendarMarkCopyWith(_CalendarMark value, $Res Function(_CalendarMark) _then) = __$CalendarMarkCopyWithImpl;
@override @useResult
$Res call({
 String type, String title, String? note
});




}
/// @nodoc
class __$CalendarMarkCopyWithImpl<$Res>
    implements _$CalendarMarkCopyWith<$Res> {
  __$CalendarMarkCopyWithImpl(this._self, this._then);

  final _CalendarMark _self;
  final $Res Function(_CalendarMark) _then;

/// Create a copy of CalendarMark
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? type = null,Object? title = null,Object? note = freezed,}) {
  return _then(_CalendarMark(
type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$RestingClass {

 String get classroomId; String get classroomName; String get type; String get title;
/// Create a copy of RestingClass
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$RestingClassCopyWith<RestingClass> get copyWith => _$RestingClassCopyWithImpl<RestingClass>(this as RestingClass, _$identity);

  /// Serializes this RestingClass to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as RestingClass;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is RestingClass&&(identical(other.classroomId, _this.classroomId) || other.classroomId == _this.classroomId)&&(identical(other.classroomName, _this.classroomName) || other.classroomName == _this.classroomName)&&(identical(other.type, _this.type) || other.type == _this.type)&&(identical(other.title, _this.title) || other.title == _this.title));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as RestingClass;
  return Object.hash(runtimeType,_this.classroomId,_this.classroomName,_this.type,_this.title);
}

@override
String toString() {
  final _this = this as RestingClass;
  return 'RestingClass(classroomId: ${_this.classroomId}, classroomName: ${_this.classroomName}, type: ${_this.type}, title: ${_this.title})';
}


}

/// @nodoc
abstract mixin class $RestingClassCopyWith<$Res>  {
  factory $RestingClassCopyWith(RestingClass value, $Res Function(RestingClass) _then) = _$RestingClassCopyWithImpl;
@useResult
$Res call({
 String classroomId, String classroomName, String type, String title
});




}
/// @nodoc
class _$RestingClassCopyWithImpl<$Res>
    implements $RestingClassCopyWith<$Res> {
  _$RestingClassCopyWithImpl(this._self, this._then);

  final RestingClass _self;
  final $Res Function(RestingClass) _then;

/// Create a copy of RestingClass
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? classroomId = null,Object? classroomName = null,Object? type = null,Object? title = null,}) {
  return _then(RestingClass(
classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [RestingClass].
extension RestingClassPatterns on RestingClass {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _RestingClass value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _RestingClass() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _RestingClass value)  $default,){
final _that = this;
switch (_that) {
case _RestingClass():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _RestingClass value)?  $default,){
final _that = this;
switch (_that) {
case _RestingClass() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String classroomId,  String classroomName,  String type,  String title)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _RestingClass() when $default != null:
return $default(_that.classroomId,_that.classroomName,_that.type,_that.title);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String classroomId,  String classroomName,  String type,  String title)  $default,) {final _that = this;
switch (_that) {
case _RestingClass():
return $default(_that.classroomId,_that.classroomName,_that.type,_that.title);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String classroomId,  String classroomName,  String type,  String title)?  $default,) {final _that = this;
switch (_that) {
case _RestingClass() when $default != null:
return $default(_that.classroomId,_that.classroomName,_that.type,_that.title);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _RestingClass implements RestingClass {
  const _RestingClass({required this.classroomId, this.classroomName = '', this.type = 'HOLIDAY', this.title = ''});
  factory _RestingClass.fromJson(Map<String, dynamic> json) => _$RestingClassFromJson(json);

@override final  String classroomId;
@override@JsonKey() final  String classroomName;
@override@JsonKey() final  String type;
@override@JsonKey() final  String title;

/// Create a copy of RestingClass
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$RestingClassCopyWith<_RestingClass> get copyWith => __$RestingClassCopyWithImpl<_RestingClass>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$RestingClassToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _RestingClass&&(identical(other.classroomId, classroomId) || other.classroomId == classroomId)&&(identical(other.classroomName, classroomName) || other.classroomName == classroomName)&&(identical(other.type, type) || other.type == type)&&(identical(other.title, title) || other.title == title));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,classroomId,classroomName,type,title);
}

@override
String toString() {
    return 'RestingClass(classroomId: $classroomId, classroomName: $classroomName, type: $type, title: $title)';
}


}

/// @nodoc
abstract mixin class _$RestingClassCopyWith<$Res> implements $RestingClassCopyWith<$Res> {
  factory _$RestingClassCopyWith(_RestingClass value, $Res Function(_RestingClass) _then) = __$RestingClassCopyWithImpl;
@override @useResult
$Res call({
 String classroomId, String classroomName, String type, String title
});




}
/// @nodoc
class __$RestingClassCopyWithImpl<$Res>
    implements _$RestingClassCopyWith<$Res> {
  __$RestingClassCopyWithImpl(this._self, this._then);

  final _RestingClass _self;
  final $Res Function(_RestingClass) _then;

/// Create a copy of RestingClass
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? classroomId = null,Object? classroomName = null,Object? type = null,Object? title = null,}) {
  return _then(_RestingClass(
classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$WeekEntry {

 String get scheduleId; String get classroomId; String get classroomName;/// «Овог Нэр» (бүтэн).
 String? get teacherName; String? get teacherRole; int get startMinute; int get endMinute; String? get room; String? get subject; String? get topic; WeekException? get exception;
/// Create a copy of WeekEntry
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WeekEntryCopyWith<WeekEntry> get copyWith => _$WeekEntryCopyWithImpl<WeekEntry>(this as WeekEntry, _$identity);

  /// Serializes this WeekEntry to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as WeekEntry;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is WeekEntry&&(identical(other.scheduleId, _this.scheduleId) || other.scheduleId == _this.scheduleId)&&(identical(other.classroomId, _this.classroomId) || other.classroomId == _this.classroomId)&&(identical(other.classroomName, _this.classroomName) || other.classroomName == _this.classroomName)&&(identical(other.teacherName, _this.teacherName) || other.teacherName == _this.teacherName)&&(identical(other.teacherRole, _this.teacherRole) || other.teacherRole == _this.teacherRole)&&(identical(other.startMinute, _this.startMinute) || other.startMinute == _this.startMinute)&&(identical(other.endMinute, _this.endMinute) || other.endMinute == _this.endMinute)&&(identical(other.room, _this.room) || other.room == _this.room)&&(identical(other.subject, _this.subject) || other.subject == _this.subject)&&(identical(other.topic, _this.topic) || other.topic == _this.topic)&&(identical(other.exception, _this.exception) || other.exception == _this.exception));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as WeekEntry;
  return Object.hash(runtimeType,_this.scheduleId,_this.classroomId,_this.classroomName,_this.teacherName,_this.teacherRole,_this.startMinute,_this.endMinute,_this.room,_this.subject,_this.topic,_this.exception);
}

@override
String toString() {
  final _this = this as WeekEntry;
  return 'WeekEntry(scheduleId: ${_this.scheduleId}, classroomId: ${_this.classroomId}, classroomName: ${_this.classroomName}, teacherName: ${_this.teacherName}, teacherRole: ${_this.teacherRole}, startMinute: ${_this.startMinute}, endMinute: ${_this.endMinute}, room: ${_this.room}, subject: ${_this.subject}, topic: ${_this.topic}, exception: ${_this.exception})';
}


}

/// @nodoc
abstract mixin class $WeekEntryCopyWith<$Res>  {
  factory $WeekEntryCopyWith(WeekEntry value, $Res Function(WeekEntry) _then) = _$WeekEntryCopyWithImpl;
@useResult
$Res call({
 String scheduleId, String classroomId, String classroomName, String? teacherName, String? teacherRole, int startMinute, int endMinute, String? room, String? subject, String? topic, WeekException? exception
});


$WeekExceptionCopyWith<$Res>? get exception;

}
/// @nodoc
class _$WeekEntryCopyWithImpl<$Res>
    implements $WeekEntryCopyWith<$Res> {
  _$WeekEntryCopyWithImpl(this._self, this._then);

  final WeekEntry _self;
  final $Res Function(WeekEntry) _then;

/// Create a copy of WeekEntry
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? scheduleId = null,Object? classroomId = null,Object? classroomName = null,Object? teacherName = freezed,Object? teacherRole = freezed,Object? startMinute = null,Object? endMinute = null,Object? room = freezed,Object? subject = freezed,Object? topic = freezed,Object? exception = freezed,}) {
  return _then(WeekEntry(
scheduleId: null == scheduleId ? _self.scheduleId : scheduleId // ignore: cast_nullable_to_non_nullable
as String,classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,teacherName: freezed == teacherName ? _self.teacherName : teacherName // ignore: cast_nullable_to_non_nullable
as String?,teacherRole: freezed == teacherRole ? _self.teacherRole : teacherRole // ignore: cast_nullable_to_non_nullable
as String?,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,subject: freezed == subject ? _self.subject : subject // ignore: cast_nullable_to_non_nullable
as String?,topic: freezed == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String?,exception: freezed == exception ? _self.exception : exception // ignore: cast_nullable_to_non_nullable
as WeekException?,
  ));
}
/// Create a copy of WeekEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$WeekExceptionCopyWith<$Res>? get exception {
    if (_self.exception == null) {
    return null;
  }

  return $WeekExceptionCopyWith<$Res>(_self.exception!, (value) {
    return _then(_self.copyWith(exception: value));
  });
}
}


/// Adds pattern-matching-related methods to [WeekEntry].
extension WeekEntryPatterns on WeekEntry {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _WeekEntry value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _WeekEntry() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _WeekEntry value)  $default,){
final _that = this;
switch (_that) {
case _WeekEntry():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _WeekEntry value)?  $default,){
final _that = this;
switch (_that) {
case _WeekEntry() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String scheduleId,  String classroomId,  String classroomName,  String? teacherName,  String? teacherRole,  int startMinute,  int endMinute,  String? room,  String? subject,  String? topic,  WeekException? exception)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _WeekEntry() when $default != null:
return $default(_that.scheduleId,_that.classroomId,_that.classroomName,_that.teacherName,_that.teacherRole,_that.startMinute,_that.endMinute,_that.room,_that.subject,_that.topic,_that.exception);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String scheduleId,  String classroomId,  String classroomName,  String? teacherName,  String? teacherRole,  int startMinute,  int endMinute,  String? room,  String? subject,  String? topic,  WeekException? exception)  $default,) {final _that = this;
switch (_that) {
case _WeekEntry():
return $default(_that.scheduleId,_that.classroomId,_that.classroomName,_that.teacherName,_that.teacherRole,_that.startMinute,_that.endMinute,_that.room,_that.subject,_that.topic,_that.exception);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String scheduleId,  String classroomId,  String classroomName,  String? teacherName,  String? teacherRole,  int startMinute,  int endMinute,  String? room,  String? subject,  String? topic,  WeekException? exception)?  $default,) {final _that = this;
switch (_that) {
case _WeekEntry() when $default != null:
return $default(_that.scheduleId,_that.classroomId,_that.classroomName,_that.teacherName,_that.teacherRole,_that.startMinute,_that.endMinute,_that.room,_that.subject,_that.topic,_that.exception);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _WeekEntry implements WeekEntry {
  const _WeekEntry({required this.scheduleId, required this.classroomId, this.classroomName = '', this.teacherName, this.teacherRole, required this.startMinute, required this.endMinute, this.room, this.subject, this.topic, this.exception});
  factory _WeekEntry.fromJson(Map<String, dynamic> json) => _$WeekEntryFromJson(json);

@override final  String scheduleId;
@override final  String classroomId;
@override@JsonKey() final  String classroomName;
/// «Овог Нэр» (бүтэн).
@override final  String? teacherName;
@override final  String? teacherRole;
@override final  int startMinute;
@override final  int endMinute;
@override final  String? room;
@override final  String? subject;
@override final  String? topic;
@override final  WeekException? exception;

/// Create a copy of WeekEntry
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WeekEntryCopyWith<_WeekEntry> get copyWith => __$WeekEntryCopyWithImpl<_WeekEntry>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$WeekEntryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _WeekEntry&&(identical(other.scheduleId, scheduleId) || other.scheduleId == scheduleId)&&(identical(other.classroomId, classroomId) || other.classroomId == classroomId)&&(identical(other.classroomName, classroomName) || other.classroomName == classroomName)&&(identical(other.teacherName, teacherName) || other.teacherName == teacherName)&&(identical(other.teacherRole, teacherRole) || other.teacherRole == teacherRole)&&(identical(other.startMinute, startMinute) || other.startMinute == startMinute)&&(identical(other.endMinute, endMinute) || other.endMinute == endMinute)&&(identical(other.room, room) || other.room == room)&&(identical(other.subject, subject) || other.subject == subject)&&(identical(other.topic, topic) || other.topic == topic)&&(identical(other.exception, exception) || other.exception == exception));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,scheduleId,classroomId,classroomName,teacherName,teacherRole,startMinute,endMinute,room,subject,topic,exception);
}

@override
String toString() {
    return 'WeekEntry(scheduleId: $scheduleId, classroomId: $classroomId, classroomName: $classroomName, teacherName: $teacherName, teacherRole: $teacherRole, startMinute: $startMinute, endMinute: $endMinute, room: $room, subject: $subject, topic: $topic, exception: $exception)';
}


}

/// @nodoc
abstract mixin class _$WeekEntryCopyWith<$Res> implements $WeekEntryCopyWith<$Res> {
  factory _$WeekEntryCopyWith(_WeekEntry value, $Res Function(_WeekEntry) _then) = __$WeekEntryCopyWithImpl;
@override @useResult
$Res call({
 String scheduleId, String classroomId, String classroomName, String? teacherName, String? teacherRole, int startMinute, int endMinute, String? room, String? subject, String? topic, WeekException? exception
});


@override $WeekExceptionCopyWith<$Res>? get exception;

}
/// @nodoc
class __$WeekEntryCopyWithImpl<$Res>
    implements _$WeekEntryCopyWith<$Res> {
  __$WeekEntryCopyWithImpl(this._self, this._then);

  final _WeekEntry _self;
  final $Res Function(_WeekEntry) _then;

/// Create a copy of WeekEntry
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? scheduleId = null,Object? classroomId = null,Object? classroomName = null,Object? teacherName = freezed,Object? teacherRole = freezed,Object? startMinute = null,Object? endMinute = null,Object? room = freezed,Object? subject = freezed,Object? topic = freezed,Object? exception = freezed,}) {
  return _then(_WeekEntry(
scheduleId: null == scheduleId ? _self.scheduleId : scheduleId // ignore: cast_nullable_to_non_nullable
as String,classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,teacherName: freezed == teacherName ? _self.teacherName : teacherName // ignore: cast_nullable_to_non_nullable
as String?,teacherRole: freezed == teacherRole ? _self.teacherRole : teacherRole // ignore: cast_nullable_to_non_nullable
as String?,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,subject: freezed == subject ? _self.subject : subject // ignore: cast_nullable_to_non_nullable
as String?,topic: freezed == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String?,exception: freezed == exception ? _self.exception : exception // ignore: cast_nullable_to_non_nullable
as WeekException?,
  ));
}

/// Create a copy of WeekEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$WeekExceptionCopyWith<$Res>? get exception {
    if (_self.exception == null) {
    return null;
  }

  return $WeekExceptionCopyWith<$Res>(_self.exception!, (value) {
    return _then(_self.copyWith(exception: value));
  });
}
}


/// @nodoc
mixin _$WeekException {

 String get kind; String? get note; String? get originalDate;
/// Create a copy of WeekException
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WeekExceptionCopyWith<WeekException> get copyWith => _$WeekExceptionCopyWithImpl<WeekException>(this as WeekException, _$identity);

  /// Serializes this WeekException to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as WeekException;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is WeekException&&(identical(other.kind, _this.kind) || other.kind == _this.kind)&&(identical(other.note, _this.note) || other.note == _this.note)&&(identical(other.originalDate, _this.originalDate) || other.originalDate == _this.originalDate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as WeekException;
  return Object.hash(runtimeType,_this.kind,_this.note,_this.originalDate);
}

@override
String toString() {
  final _this = this as WeekException;
  return 'WeekException(kind: ${_this.kind}, note: ${_this.note}, originalDate: ${_this.originalDate})';
}


}

/// @nodoc
abstract mixin class $WeekExceptionCopyWith<$Res>  {
  factory $WeekExceptionCopyWith(WeekException value, $Res Function(WeekException) _then) = _$WeekExceptionCopyWithImpl;
@useResult
$Res call({
 String kind, String? note, String? originalDate
});




}
/// @nodoc
class _$WeekExceptionCopyWithImpl<$Res>
    implements $WeekExceptionCopyWith<$Res> {
  _$WeekExceptionCopyWithImpl(this._self, this._then);

  final WeekException _self;
  final $Res Function(WeekException) _then;

/// Create a copy of WeekException
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? kind = null,Object? note = freezed,Object? originalDate = freezed,}) {
  return _then(WeekException(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,originalDate: freezed == originalDate ? _self.originalDate : originalDate // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [WeekException].
extension WeekExceptionPatterns on WeekException {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _WeekException value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _WeekException() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _WeekException value)  $default,){
final _that = this;
switch (_that) {
case _WeekException():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _WeekException value)?  $default,){
final _that = this;
switch (_that) {
case _WeekException() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String kind,  String? note,  String? originalDate)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _WeekException() when $default != null:
return $default(_that.kind,_that.note,_that.originalDate);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String kind,  String? note,  String? originalDate)  $default,) {final _that = this;
switch (_that) {
case _WeekException():
return $default(_that.kind,_that.note,_that.originalDate);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String kind,  String? note,  String? originalDate)?  $default,) {final _that = this;
switch (_that) {
case _WeekException() when $default != null:
return $default(_that.kind,_that.note,_that.originalDate);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _WeekException implements WeekException {
  const _WeekException({this.kind = 'MOVED', this.note, this.originalDate});
  factory _WeekException.fromJson(Map<String, dynamic> json) => _$WeekExceptionFromJson(json);

@override@JsonKey() final  String kind;
@override final  String? note;
@override final  String? originalDate;

/// Create a copy of WeekException
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WeekExceptionCopyWith<_WeekException> get copyWith => __$WeekExceptionCopyWithImpl<_WeekException>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$WeekExceptionToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _WeekException&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.note, note) || other.note == note)&&(identical(other.originalDate, originalDate) || other.originalDate == originalDate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,kind,note,originalDate);
}

@override
String toString() {
    return 'WeekException(kind: $kind, note: $note, originalDate: $originalDate)';
}


}

/// @nodoc
abstract mixin class _$WeekExceptionCopyWith<$Res> implements $WeekExceptionCopyWith<$Res> {
  factory _$WeekExceptionCopyWith(_WeekException value, $Res Function(_WeekException) _then) = __$WeekExceptionCopyWithImpl;
@override @useResult
$Res call({
 String kind, String? note, String? originalDate
});




}
/// @nodoc
class __$WeekExceptionCopyWithImpl<$Res>
    implements _$WeekExceptionCopyWith<$Res> {
  __$WeekExceptionCopyWithImpl(this._self, this._then);

  final _WeekException _self;
  final $Res Function(_WeekException) _then;

/// Create a copy of WeekException
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? kind = null,Object? note = freezed,Object? originalDate = freezed,}) {
  return _then(_WeekException(
kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,note: freezed == note ? _self.note : note // ignore: cast_nullable_to_non_nullable
as String?,originalDate: freezed == originalDate ? _self.originalDate : originalDate // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
