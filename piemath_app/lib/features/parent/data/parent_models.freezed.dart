// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'parent_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ClassroomRef {

 String? get id; String get name; int? get grade;
/// Create a copy of ClassroomRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ClassroomRefCopyWith<ClassroomRef> get copyWith => _$ClassroomRefCopyWithImpl<ClassroomRef>(this as ClassroomRef, _$identity);

  /// Serializes this ClassroomRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ClassroomRef;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ClassroomRef&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.grade, _this.grade) || other.grade == _this.grade));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ClassroomRef;
  return Object.hash(runtimeType,_this.id,_this.name,_this.grade);
}

@override
String toString() {
  final _this = this as ClassroomRef;
  return 'ClassroomRef(id: ${_this.id}, name: ${_this.name}, grade: ${_this.grade})';
}


}

/// @nodoc
abstract mixin class $ClassroomRefCopyWith<$Res>  {
  factory $ClassroomRefCopyWith(ClassroomRef value, $Res Function(ClassroomRef) _then) = _$ClassroomRefCopyWithImpl;
@useResult
$Res call({
 String? id, String name, int? grade
});




}
/// @nodoc
class _$ClassroomRefCopyWithImpl<$Res>
    implements $ClassroomRefCopyWith<$Res> {
  _$ClassroomRefCopyWithImpl(this._self, this._then);

  final ClassroomRef _self;
  final $Res Function(ClassroomRef) _then;

/// Create a copy of ClassroomRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = freezed,Object? name = null,Object? grade = freezed,}) {
  return _then(ClassroomRef(
id: freezed == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String?,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [ClassroomRef].
extension ClassroomRefPatterns on ClassroomRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ClassroomRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ClassroomRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ClassroomRef value)  $default,){
final _that = this;
switch (_that) {
case _ClassroomRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ClassroomRef value)?  $default,){
final _that = this;
switch (_that) {
case _ClassroomRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? id,  String name,  int? grade)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ClassroomRef() when $default != null:
return $default(_that.id,_that.name,_that.grade);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? id,  String name,  int? grade)  $default,) {final _that = this;
switch (_that) {
case _ClassroomRef():
return $default(_that.id,_that.name,_that.grade);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? id,  String name,  int? grade)?  $default,) {final _that = this;
switch (_that) {
case _ClassroomRef() when $default != null:
return $default(_that.id,_that.name,_that.grade);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ClassroomRef implements ClassroomRef {
  const _ClassroomRef({this.id, this.name = '', this.grade});
  factory _ClassroomRef.fromJson(Map<String, dynamic> json) => _$ClassroomRefFromJson(json);

@override final  String? id;
@override@JsonKey() final  String name;
@override final  int? grade;

/// Create a copy of ClassroomRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ClassroomRefCopyWith<_ClassroomRef> get copyWith => __$ClassroomRefCopyWithImpl<_ClassroomRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ClassroomRefToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ClassroomRef&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.grade, grade) || other.grade == grade));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,grade);
}

@override
String toString() {
    return 'ClassroomRef(id: $id, name: $name, grade: $grade)';
}


}

/// @nodoc
abstract mixin class _$ClassroomRefCopyWith<$Res> implements $ClassroomRefCopyWith<$Res> {
  factory _$ClassroomRefCopyWith(_ClassroomRef value, $Res Function(_ClassroomRef) _then) = __$ClassroomRefCopyWithImpl;
@override @useResult
$Res call({
 String? id, String name, int? grade
});




}
/// @nodoc
class __$ClassroomRefCopyWithImpl<$Res>
    implements _$ClassroomRefCopyWith<$Res> {
  __$ClassroomRefCopyWithImpl(this._self, this._then);

  final _ClassroomRef _self;
  final $Res Function(_ClassroomRef) _then;

/// Create a copy of ClassroomRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = freezed,Object? name = null,Object? grade = freezed,}) {
  return _then(_ClassroomRef(
id: freezed == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String?,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}


/// @nodoc
mixin _$ChildProfile {

 int? get grade; String? get school;/// `CLASSROOM` (танхим) | `ONLINE` — даалгаврын загвар сонгоход (STATUS §7.11).
 String? get type;
/// Create a copy of ChildProfile
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ChildProfileCopyWith<ChildProfile> get copyWith => _$ChildProfileCopyWithImpl<ChildProfile>(this as ChildProfile, _$identity);

  /// Serializes this ChildProfile to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ChildProfile;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ChildProfile&&(identical(other.grade, _this.grade) || other.grade == _this.grade)&&(identical(other.school, _this.school) || other.school == _this.school)&&(identical(other.type, _this.type) || other.type == _this.type));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ChildProfile;
  return Object.hash(runtimeType,_this.grade,_this.school,_this.type);
}

@override
String toString() {
  final _this = this as ChildProfile;
  return 'ChildProfile(grade: ${_this.grade}, school: ${_this.school}, type: ${_this.type})';
}


}

/// @nodoc
abstract mixin class $ChildProfileCopyWith<$Res>  {
  factory $ChildProfileCopyWith(ChildProfile value, $Res Function(ChildProfile) _then) = _$ChildProfileCopyWithImpl;
@useResult
$Res call({
 int? grade, String? school, String? type
});




}
/// @nodoc
class _$ChildProfileCopyWithImpl<$Res>
    implements $ChildProfileCopyWith<$Res> {
  _$ChildProfileCopyWithImpl(this._self, this._then);

  final ChildProfile _self;
  final $Res Function(ChildProfile) _then;

/// Create a copy of ChildProfile
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? grade = freezed,Object? school = freezed,Object? type = freezed,}) {
  return _then(ChildProfile(
grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,school: freezed == school ? _self.school : school // ignore: cast_nullable_to_non_nullable
as String?,type: freezed == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ChildProfile].
extension ChildProfilePatterns on ChildProfile {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ChildProfile value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ChildProfile() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ChildProfile value)  $default,){
final _that = this;
switch (_that) {
case _ChildProfile():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ChildProfile value)?  $default,){
final _that = this;
switch (_that) {
case _ChildProfile() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int? grade,  String? school,  String? type)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ChildProfile() when $default != null:
return $default(_that.grade,_that.school,_that.type);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int? grade,  String? school,  String? type)  $default,) {final _that = this;
switch (_that) {
case _ChildProfile():
return $default(_that.grade,_that.school,_that.type);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int? grade,  String? school,  String? type)?  $default,) {final _that = this;
switch (_that) {
case _ChildProfile() when $default != null:
return $default(_that.grade,_that.school,_that.type);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ChildProfile implements ChildProfile {
  const _ChildProfile({this.grade, this.school, this.type});
  factory _ChildProfile.fromJson(Map<String, dynamic> json) => _$ChildProfileFromJson(json);

@override final  int? grade;
@override final  String? school;
/// `CLASSROOM` (танхим) | `ONLINE` — даалгаврын загвар сонгоход (STATUS §7.11).
@override final  String? type;

/// Create a copy of ChildProfile
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ChildProfileCopyWith<_ChildProfile> get copyWith => __$ChildProfileCopyWithImpl<_ChildProfile>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ChildProfileToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ChildProfile&&(identical(other.grade, grade) || other.grade == grade)&&(identical(other.school, school) || other.school == school)&&(identical(other.type, type) || other.type == type));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,grade,school,type);
}

@override
String toString() {
    return 'ChildProfile(grade: $grade, school: $school, type: $type)';
}


}

/// @nodoc
abstract mixin class _$ChildProfileCopyWith<$Res> implements $ChildProfileCopyWith<$Res> {
  factory _$ChildProfileCopyWith(_ChildProfile value, $Res Function(_ChildProfile) _then) = __$ChildProfileCopyWithImpl;
@override @useResult
$Res call({
 int? grade, String? school, String? type
});




}
/// @nodoc
class __$ChildProfileCopyWithImpl<$Res>
    implements _$ChildProfileCopyWith<$Res> {
  __$ChildProfileCopyWithImpl(this._self, this._then);

  final _ChildProfile _self;
  final $Res Function(_ChildProfile) _then;

/// Create a copy of ChildProfile
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? grade = freezed,Object? school = freezed,Object? type = freezed,}) {
  return _then(_ChildProfile(
grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,school: freezed == school ? _self.school : school // ignore: cast_nullable_to_non_nullable
as String?,type: freezed == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$AttendanceEntry {

 String get date; String get status; ClassroomRef get classroom;
/// Create a copy of AttendanceEntry
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AttendanceEntryCopyWith<AttendanceEntry> get copyWith => _$AttendanceEntryCopyWithImpl<AttendanceEntry>(this as AttendanceEntry, _$identity);

  /// Serializes this AttendanceEntry to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as AttendanceEntry;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AttendanceEntry&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as AttendanceEntry;
  return Object.hash(runtimeType,_this.date,_this.status,_this.classroom);
}

@override
String toString() {
  final _this = this as AttendanceEntry;
  return 'AttendanceEntry(date: ${_this.date}, status: ${_this.status}, classroom: ${_this.classroom})';
}


}

/// @nodoc
abstract mixin class $AttendanceEntryCopyWith<$Res>  {
  factory $AttendanceEntryCopyWith(AttendanceEntry value, $Res Function(AttendanceEntry) _then) = _$AttendanceEntryCopyWithImpl;
@useResult
$Res call({
 String date, String status, ClassroomRef classroom
});


$ClassroomRefCopyWith<$Res> get classroom;

}
/// @nodoc
class _$AttendanceEntryCopyWithImpl<$Res>
    implements $AttendanceEntryCopyWith<$Res> {
  _$AttendanceEntryCopyWithImpl(this._self, this._then);

  final AttendanceEntry _self;
  final $Res Function(AttendanceEntry) _then;

/// Create a copy of AttendanceEntry
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? status = null,Object? classroom = null,}) {
  return _then(AttendanceEntry(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ClassroomRef,
  ));
}
/// Create a copy of AttendanceEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClassroomRefCopyWith<$Res> get classroom {
  
  return $ClassroomRefCopyWith<$Res>(_self.classroom, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// Adds pattern-matching-related methods to [AttendanceEntry].
extension AttendanceEntryPatterns on AttendanceEntry {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AttendanceEntry value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AttendanceEntry() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AttendanceEntry value)  $default,){
final _that = this;
switch (_that) {
case _AttendanceEntry():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AttendanceEntry value)?  $default,){
final _that = this;
switch (_that) {
case _AttendanceEntry() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  String status,  ClassroomRef classroom)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AttendanceEntry() when $default != null:
return $default(_that.date,_that.status,_that.classroom);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  String status,  ClassroomRef classroom)  $default,) {final _that = this;
switch (_that) {
case _AttendanceEntry():
return $default(_that.date,_that.status,_that.classroom);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  String status,  ClassroomRef classroom)?  $default,) {final _that = this;
switch (_that) {
case _AttendanceEntry() when $default != null:
return $default(_that.date,_that.status,_that.classroom);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AttendanceEntry implements AttendanceEntry {
  const _AttendanceEntry({required this.date, required this.status, this.classroom = const ClassroomRef()});
  factory _AttendanceEntry.fromJson(Map<String, dynamic> json) => _$AttendanceEntryFromJson(json);

@override final  String date;
@override final  String status;
@override@JsonKey() final  ClassroomRef classroom;

/// Create a copy of AttendanceEntry
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AttendanceEntryCopyWith<_AttendanceEntry> get copyWith => __$AttendanceEntryCopyWithImpl<_AttendanceEntry>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AttendanceEntryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _AttendanceEntry&&(identical(other.date, date) || other.date == date)&&(identical(other.status, status) || other.status == status)&&(identical(other.classroom, classroom) || other.classroom == classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,status,classroom);
}

@override
String toString() {
    return 'AttendanceEntry(date: $date, status: $status, classroom: $classroom)';
}


}

/// @nodoc
abstract mixin class _$AttendanceEntryCopyWith<$Res> implements $AttendanceEntryCopyWith<$Res> {
  factory _$AttendanceEntryCopyWith(_AttendanceEntry value, $Res Function(_AttendanceEntry) _then) = __$AttendanceEntryCopyWithImpl;
@override @useResult
$Res call({
 String date, String status, ClassroomRef classroom
});


@override $ClassroomRefCopyWith<$Res> get classroom;

}
/// @nodoc
class __$AttendanceEntryCopyWithImpl<$Res>
    implements _$AttendanceEntryCopyWith<$Res> {
  __$AttendanceEntryCopyWithImpl(this._self, this._then);

  final _AttendanceEntry _self;
  final $Res Function(_AttendanceEntry) _then;

/// Create a copy of AttendanceEntry
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? status = null,Object? classroom = null,}) {
  return _then(_AttendanceEntry(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ClassroomRef,
  ));
}

/// Create a copy of AttendanceEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClassroomRefCopyWith<$Res> get classroom {
  
  return $ClassroomRefCopyWith<$Res>(_self.classroom, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// @nodoc
mixin _$HomeworkMarkEntry {

 String get date; String get status; String? get comment; ClassroomRef get classroom;
/// Create a copy of HomeworkMarkEntry
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HomeworkMarkEntryCopyWith<HomeworkMarkEntry> get copyWith => _$HomeworkMarkEntryCopyWithImpl<HomeworkMarkEntry>(this as HomeworkMarkEntry, _$identity);

  /// Serializes this HomeworkMarkEntry to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HomeworkMarkEntry;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HomeworkMarkEntry&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.comment, _this.comment) || other.comment == _this.comment)&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HomeworkMarkEntry;
  return Object.hash(runtimeType,_this.date,_this.status,_this.comment,_this.classroom);
}

@override
String toString() {
  final _this = this as HomeworkMarkEntry;
  return 'HomeworkMarkEntry(date: ${_this.date}, status: ${_this.status}, comment: ${_this.comment}, classroom: ${_this.classroom})';
}


}

/// @nodoc
abstract mixin class $HomeworkMarkEntryCopyWith<$Res>  {
  factory $HomeworkMarkEntryCopyWith(HomeworkMarkEntry value, $Res Function(HomeworkMarkEntry) _then) = _$HomeworkMarkEntryCopyWithImpl;
@useResult
$Res call({
 String date, String status, String? comment, ClassroomRef classroom
});


$ClassroomRefCopyWith<$Res> get classroom;

}
/// @nodoc
class _$HomeworkMarkEntryCopyWithImpl<$Res>
    implements $HomeworkMarkEntryCopyWith<$Res> {
  _$HomeworkMarkEntryCopyWithImpl(this._self, this._then);

  final HomeworkMarkEntry _self;
  final $Res Function(HomeworkMarkEntry) _then;

/// Create a copy of HomeworkMarkEntry
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? status = null,Object? comment = freezed,Object? classroom = null,}) {
  return _then(HomeworkMarkEntry(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,comment: freezed == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String?,classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ClassroomRef,
  ));
}
/// Create a copy of HomeworkMarkEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClassroomRefCopyWith<$Res> get classroom {
  
  return $ClassroomRefCopyWith<$Res>(_self.classroom, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// Adds pattern-matching-related methods to [HomeworkMarkEntry].
extension HomeworkMarkEntryPatterns on HomeworkMarkEntry {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HomeworkMarkEntry value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HomeworkMarkEntry() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HomeworkMarkEntry value)  $default,){
final _that = this;
switch (_that) {
case _HomeworkMarkEntry():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HomeworkMarkEntry value)?  $default,){
final _that = this;
switch (_that) {
case _HomeworkMarkEntry() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  String status,  String? comment,  ClassroomRef classroom)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HomeworkMarkEntry() when $default != null:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  String status,  String? comment,  ClassroomRef classroom)  $default,) {final _that = this;
switch (_that) {
case _HomeworkMarkEntry():
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  String status,  String? comment,  ClassroomRef classroom)?  $default,) {final _that = this;
switch (_that) {
case _HomeworkMarkEntry() when $default != null:
return $default(_that.date,_that.status,_that.comment,_that.classroom);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HomeworkMarkEntry implements HomeworkMarkEntry {
  const _HomeworkMarkEntry({required this.date, required this.status, this.comment, this.classroom = const ClassroomRef()});
  factory _HomeworkMarkEntry.fromJson(Map<String, dynamic> json) => _$HomeworkMarkEntryFromJson(json);

@override final  String date;
@override final  String status;
@override final  String? comment;
@override@JsonKey() final  ClassroomRef classroom;

/// Create a copy of HomeworkMarkEntry
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HomeworkMarkEntryCopyWith<_HomeworkMarkEntry> get copyWith => __$HomeworkMarkEntryCopyWithImpl<_HomeworkMarkEntry>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HomeworkMarkEntryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HomeworkMarkEntry&&(identical(other.date, date) || other.date == date)&&(identical(other.status, status) || other.status == status)&&(identical(other.comment, comment) || other.comment == comment)&&(identical(other.classroom, classroom) || other.classroom == classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,status,comment,classroom);
}

@override
String toString() {
    return 'HomeworkMarkEntry(date: $date, status: $status, comment: $comment, classroom: $classroom)';
}


}

/// @nodoc
abstract mixin class _$HomeworkMarkEntryCopyWith<$Res> implements $HomeworkMarkEntryCopyWith<$Res> {
  factory _$HomeworkMarkEntryCopyWith(_HomeworkMarkEntry value, $Res Function(_HomeworkMarkEntry) _then) = __$HomeworkMarkEntryCopyWithImpl;
@override @useResult
$Res call({
 String date, String status, String? comment, ClassroomRef classroom
});


@override $ClassroomRefCopyWith<$Res> get classroom;

}
/// @nodoc
class __$HomeworkMarkEntryCopyWithImpl<$Res>
    implements _$HomeworkMarkEntryCopyWith<$Res> {
  __$HomeworkMarkEntryCopyWithImpl(this._self, this._then);

  final _HomeworkMarkEntry _self;
  final $Res Function(_HomeworkMarkEntry) _then;

/// Create a copy of HomeworkMarkEntry
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? status = null,Object? comment = freezed,Object? classroom = null,}) {
  return _then(_HomeworkMarkEntry(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,comment: freezed == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String?,classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ClassroomRef,
  ));
}

/// Create a copy of HomeworkMarkEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClassroomRefCopyWith<$Res> get classroom {
  
  return $ClassroomRefCopyWith<$Res>(_self.classroom, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// @nodoc
mixin _$HomeworkQuizEntry {

 String get date; String get classroom; double get score; int get problemCount;
/// Create a copy of HomeworkQuizEntry
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HomeworkQuizEntryCopyWith<HomeworkQuizEntry> get copyWith => _$HomeworkQuizEntryCopyWithImpl<HomeworkQuizEntry>(this as HomeworkQuizEntry, _$identity);

  /// Serializes this HomeworkQuizEntry to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HomeworkQuizEntry;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HomeworkQuizEntry&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom)&&(identical(other.score, _this.score) || other.score == _this.score)&&(identical(other.problemCount, _this.problemCount) || other.problemCount == _this.problemCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HomeworkQuizEntry;
  return Object.hash(runtimeType,_this.date,_this.classroom,_this.score,_this.problemCount);
}

@override
String toString() {
  final _this = this as HomeworkQuizEntry;
  return 'HomeworkQuizEntry(date: ${_this.date}, classroom: ${_this.classroom}, score: ${_this.score}, problemCount: ${_this.problemCount})';
}


}

/// @nodoc
abstract mixin class $HomeworkQuizEntryCopyWith<$Res>  {
  factory $HomeworkQuizEntryCopyWith(HomeworkQuizEntry value, $Res Function(HomeworkQuizEntry) _then) = _$HomeworkQuizEntryCopyWithImpl;
@useResult
$Res call({
 String date, String classroom, double score, int problemCount
});




}
/// @nodoc
class _$HomeworkQuizEntryCopyWithImpl<$Res>
    implements $HomeworkQuizEntryCopyWith<$Res> {
  _$HomeworkQuizEntryCopyWithImpl(this._self, this._then);

  final HomeworkQuizEntry _self;
  final $Res Function(HomeworkQuizEntry) _then;

/// Create a copy of HomeworkQuizEntry
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? classroom = null,Object? score = null,Object? problemCount = null,}) {
  return _then(HomeworkQuizEntry(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as String,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as double,problemCount: null == problemCount ? _self.problemCount : problemCount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [HomeworkQuizEntry].
extension HomeworkQuizEntryPatterns on HomeworkQuizEntry {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HomeworkQuizEntry value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HomeworkQuizEntry() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HomeworkQuizEntry value)  $default,){
final _that = this;
switch (_that) {
case _HomeworkQuizEntry():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HomeworkQuizEntry value)?  $default,){
final _that = this;
switch (_that) {
case _HomeworkQuizEntry() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  String classroom,  double score,  int problemCount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HomeworkQuizEntry() when $default != null:
return $default(_that.date,_that.classroom,_that.score,_that.problemCount);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  String classroom,  double score,  int problemCount)  $default,) {final _that = this;
switch (_that) {
case _HomeworkQuizEntry():
return $default(_that.date,_that.classroom,_that.score,_that.problemCount);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  String classroom,  double score,  int problemCount)?  $default,) {final _that = this;
switch (_that) {
case _HomeworkQuizEntry() when $default != null:
return $default(_that.date,_that.classroom,_that.score,_that.problemCount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HomeworkQuizEntry implements HomeworkQuizEntry {
  const _HomeworkQuizEntry({required this.date, this.classroom = '', this.score = 0, this.problemCount = 0});
  factory _HomeworkQuizEntry.fromJson(Map<String, dynamic> json) => _$HomeworkQuizEntryFromJson(json);

@override final  String date;
@override@JsonKey() final  String classroom;
@override@JsonKey() final  double score;
@override@JsonKey() final  int problemCount;

/// Create a copy of HomeworkQuizEntry
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HomeworkQuizEntryCopyWith<_HomeworkQuizEntry> get copyWith => __$HomeworkQuizEntryCopyWithImpl<_HomeworkQuizEntry>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HomeworkQuizEntryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HomeworkQuizEntry&&(identical(other.date, date) || other.date == date)&&(identical(other.classroom, classroom) || other.classroom == classroom)&&(identical(other.score, score) || other.score == score)&&(identical(other.problemCount, problemCount) || other.problemCount == problemCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,classroom,score,problemCount);
}

@override
String toString() {
    return 'HomeworkQuizEntry(date: $date, classroom: $classroom, score: $score, problemCount: $problemCount)';
}


}

/// @nodoc
abstract mixin class _$HomeworkQuizEntryCopyWith<$Res> implements $HomeworkQuizEntryCopyWith<$Res> {
  factory _$HomeworkQuizEntryCopyWith(_HomeworkQuizEntry value, $Res Function(_HomeworkQuizEntry) _then) = __$HomeworkQuizEntryCopyWithImpl;
@override @useResult
$Res call({
 String date, String classroom, double score, int problemCount
});




}
/// @nodoc
class __$HomeworkQuizEntryCopyWithImpl<$Res>
    implements _$HomeworkQuizEntryCopyWith<$Res> {
  __$HomeworkQuizEntryCopyWithImpl(this._self, this._then);

  final _HomeworkQuizEntry _self;
  final $Res Function(_HomeworkQuizEntry) _then;

/// Create a copy of HomeworkQuizEntry
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? classroom = null,Object? score = null,Object? problemCount = null,}) {
  return _then(_HomeworkQuizEntry(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,classroom: null == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as String,score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as double,problemCount: null == problemCount ? _self.problemCount : problemCount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$AssignmentRef {

 String get title; String? get dueDate; ClassroomRef? get classroom;
/// Create a copy of AssignmentRef
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AssignmentRefCopyWith<AssignmentRef> get copyWith => _$AssignmentRefCopyWithImpl<AssignmentRef>(this as AssignmentRef, _$identity);

  /// Serializes this AssignmentRef to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as AssignmentRef;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AssignmentRef&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.dueDate, _this.dueDate) || other.dueDate == _this.dueDate)&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as AssignmentRef;
  return Object.hash(runtimeType,_this.title,_this.dueDate,_this.classroom);
}

@override
String toString() {
  final _this = this as AssignmentRef;
  return 'AssignmentRef(title: ${_this.title}, dueDate: ${_this.dueDate}, classroom: ${_this.classroom})';
}


}

/// @nodoc
abstract mixin class $AssignmentRefCopyWith<$Res>  {
  factory $AssignmentRefCopyWith(AssignmentRef value, $Res Function(AssignmentRef) _then) = _$AssignmentRefCopyWithImpl;
@useResult
$Res call({
 String title, String? dueDate, ClassroomRef? classroom
});


$ClassroomRefCopyWith<$Res>? get classroom;

}
/// @nodoc
class _$AssignmentRefCopyWithImpl<$Res>
    implements $AssignmentRefCopyWith<$Res> {
  _$AssignmentRefCopyWithImpl(this._self, this._then);

  final AssignmentRef _self;
  final $Res Function(AssignmentRef) _then;

/// Create a copy of AssignmentRef
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? title = null,Object? dueDate = freezed,Object? classroom = freezed,}) {
  return _then(AssignmentRef(
title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,dueDate: freezed == dueDate ? _self.dueDate : dueDate // ignore: cast_nullable_to_non_nullable
as String?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ClassroomRef?,
  ));
}
/// Create a copy of AssignmentRef
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClassroomRefCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $ClassroomRefCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// Adds pattern-matching-related methods to [AssignmentRef].
extension AssignmentRefPatterns on AssignmentRef {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AssignmentRef value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AssignmentRef() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AssignmentRef value)  $default,){
final _that = this;
switch (_that) {
case _AssignmentRef():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AssignmentRef value)?  $default,){
final _that = this;
switch (_that) {
case _AssignmentRef() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String title,  String? dueDate,  ClassroomRef? classroom)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AssignmentRef() when $default != null:
return $default(_that.title,_that.dueDate,_that.classroom);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String title,  String? dueDate,  ClassroomRef? classroom)  $default,) {final _that = this;
switch (_that) {
case _AssignmentRef():
return $default(_that.title,_that.dueDate,_that.classroom);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String title,  String? dueDate,  ClassroomRef? classroom)?  $default,) {final _that = this;
switch (_that) {
case _AssignmentRef() when $default != null:
return $default(_that.title,_that.dueDate,_that.classroom);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AssignmentRef implements AssignmentRef {
  const _AssignmentRef({this.title = '', this.dueDate, this.classroom});
  factory _AssignmentRef.fromJson(Map<String, dynamic> json) => _$AssignmentRefFromJson(json);

@override@JsonKey() final  String title;
@override final  String? dueDate;
@override final  ClassroomRef? classroom;

/// Create a copy of AssignmentRef
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AssignmentRefCopyWith<_AssignmentRef> get copyWith => __$AssignmentRefCopyWithImpl<_AssignmentRef>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AssignmentRefToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _AssignmentRef&&(identical(other.title, title) || other.title == title)&&(identical(other.dueDate, dueDate) || other.dueDate == dueDate)&&(identical(other.classroom, classroom) || other.classroom == classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,title,dueDate,classroom);
}

@override
String toString() {
    return 'AssignmentRef(title: $title, dueDate: $dueDate, classroom: $classroom)';
}


}

/// @nodoc
abstract mixin class _$AssignmentRefCopyWith<$Res> implements $AssignmentRefCopyWith<$Res> {
  factory _$AssignmentRefCopyWith(_AssignmentRef value, $Res Function(_AssignmentRef) _then) = __$AssignmentRefCopyWithImpl;
@override @useResult
$Res call({
 String title, String? dueDate, ClassroomRef? classroom
});


@override $ClassroomRefCopyWith<$Res>? get classroom;

}
/// @nodoc
class __$AssignmentRefCopyWithImpl<$Res>
    implements _$AssignmentRefCopyWith<$Res> {
  __$AssignmentRefCopyWithImpl(this._self, this._then);

  final _AssignmentRef _self;
  final $Res Function(_AssignmentRef) _then;

/// Create a copy of AssignmentRef
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? title = null,Object? dueDate = freezed,Object? classroom = freezed,}) {
  return _then(_AssignmentRef(
title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,dueDate: freezed == dueDate ? _self.dueDate : dueDate // ignore: cast_nullable_to_non_nullable
as String?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ClassroomRef?,
  ));
}

/// Create a copy of AssignmentRef
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClassroomRefCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $ClassroomRefCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// @nodoc
mixin _$SubmissionEntry {

 String get id; String get state; List<String> get imageKeys; String? get submittedAt; String? get checkedAt; AssignmentRef get assignment;
/// Create a copy of SubmissionEntry
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$SubmissionEntryCopyWith<SubmissionEntry> get copyWith => _$SubmissionEntryCopyWithImpl<SubmissionEntry>(this as SubmissionEntry, _$identity);

  /// Serializes this SubmissionEntry to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as SubmissionEntry;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is SubmissionEntry&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.state, _this.state) || other.state == _this.state)&&const DeepCollectionEquality().equals(other.imageKeys, _this.imageKeys)&&(identical(other.submittedAt, _this.submittedAt) || other.submittedAt == _this.submittedAt)&&(identical(other.checkedAt, _this.checkedAt) || other.checkedAt == _this.checkedAt)&&(identical(other.assignment, _this.assignment) || other.assignment == _this.assignment));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as SubmissionEntry;
  return Object.hash(runtimeType,_this.id,_this.state,const DeepCollectionEquality().hash(_this.imageKeys),_this.submittedAt,_this.checkedAt,_this.assignment);
}

@override
String toString() {
  final _this = this as SubmissionEntry;
  return 'SubmissionEntry(id: ${_this.id}, state: ${_this.state}, imageKeys: ${_this.imageKeys}, submittedAt: ${_this.submittedAt}, checkedAt: ${_this.checkedAt}, assignment: ${_this.assignment})';
}


}

/// @nodoc
abstract mixin class $SubmissionEntryCopyWith<$Res>  {
  factory $SubmissionEntryCopyWith(SubmissionEntry value, $Res Function(SubmissionEntry) _then) = _$SubmissionEntryCopyWithImpl;
@useResult
$Res call({
 String id, String state, List<String> imageKeys, String? submittedAt, String? checkedAt, AssignmentRef assignment
});


$AssignmentRefCopyWith<$Res> get assignment;

}
/// @nodoc
class _$SubmissionEntryCopyWithImpl<$Res>
    implements $SubmissionEntryCopyWith<$Res> {
  _$SubmissionEntryCopyWithImpl(this._self, this._then);

  final SubmissionEntry _self;
  final $Res Function(SubmissionEntry) _then;

/// Create a copy of SubmissionEntry
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? state = null,Object? imageKeys = null,Object? submittedAt = freezed,Object? checkedAt = freezed,Object? assignment = null,}) {
  return _then(SubmissionEntry(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as String,imageKeys: null == imageKeys ? _self.imageKeys : imageKeys // ignore: cast_nullable_to_non_nullable
as List<String>,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as String?,checkedAt: freezed == checkedAt ? _self.checkedAt : checkedAt // ignore: cast_nullable_to_non_nullable
as String?,assignment: null == assignment ? _self.assignment : assignment // ignore: cast_nullable_to_non_nullable
as AssignmentRef,
  ));
}
/// Create a copy of SubmissionEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AssignmentRefCopyWith<$Res> get assignment {
  
  return $AssignmentRefCopyWith<$Res>(_self.assignment, (value) {
    return _then(_self.copyWith(assignment: value));
  });
}
}


/// Adds pattern-matching-related methods to [SubmissionEntry].
extension SubmissionEntryPatterns on SubmissionEntry {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _SubmissionEntry value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _SubmissionEntry() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _SubmissionEntry value)  $default,){
final _that = this;
switch (_that) {
case _SubmissionEntry():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _SubmissionEntry value)?  $default,){
final _that = this;
switch (_that) {
case _SubmissionEntry() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String state,  List<String> imageKeys,  String? submittedAt,  String? checkedAt,  AssignmentRef assignment)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _SubmissionEntry() when $default != null:
return $default(_that.id,_that.state,_that.imageKeys,_that.submittedAt,_that.checkedAt,_that.assignment);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String state,  List<String> imageKeys,  String? submittedAt,  String? checkedAt,  AssignmentRef assignment)  $default,) {final _that = this;
switch (_that) {
case _SubmissionEntry():
return $default(_that.id,_that.state,_that.imageKeys,_that.submittedAt,_that.checkedAt,_that.assignment);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String state,  List<String> imageKeys,  String? submittedAt,  String? checkedAt,  AssignmentRef assignment)?  $default,) {final _that = this;
switch (_that) {
case _SubmissionEntry() when $default != null:
return $default(_that.id,_that.state,_that.imageKeys,_that.submittedAt,_that.checkedAt,_that.assignment);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _SubmissionEntry implements SubmissionEntry {
  const _SubmissionEntry({required this.id, required this.state,  List<String> imageKeys = const <String>[], this.submittedAt, this.checkedAt, this.assignment = const AssignmentRef()}): _imageKeys = imageKeys;
  factory _SubmissionEntry.fromJson(Map<String, dynamic> json) => _$SubmissionEntryFromJson(json);

@override final  String id;
@override final  String state;
 final  List<String> _imageKeys;
@override@JsonKey() List<String> get imageKeys {
  if (_imageKeys is EqualUnmodifiableListView) return _imageKeys;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_imageKeys);
}

@override final  String? submittedAt;
@override final  String? checkedAt;
@override@JsonKey() final  AssignmentRef assignment;

/// Create a copy of SubmissionEntry
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$SubmissionEntryCopyWith<_SubmissionEntry> get copyWith => __$SubmissionEntryCopyWithImpl<_SubmissionEntry>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$SubmissionEntryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _SubmissionEntry&&(identical(other.id, id) || other.id == id)&&(identical(other.state, state) || other.state == state)&&const DeepCollectionEquality().equals(other.imageKeys, _imageKeys)&&(identical(other.submittedAt, submittedAt) || other.submittedAt == submittedAt)&&(identical(other.checkedAt, checkedAt) || other.checkedAt == checkedAt)&&(identical(other.assignment, assignment) || other.assignment == assignment));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,state,const DeepCollectionEquality().hash(_imageKeys),submittedAt,checkedAt,assignment);
}

@override
String toString() {
    return 'SubmissionEntry(id: $id, state: $state, imageKeys: $imageKeys, submittedAt: $submittedAt, checkedAt: $checkedAt, assignment: $assignment)';
}


}

/// @nodoc
abstract mixin class _$SubmissionEntryCopyWith<$Res> implements $SubmissionEntryCopyWith<$Res> {
  factory _$SubmissionEntryCopyWith(_SubmissionEntry value, $Res Function(_SubmissionEntry) _then) = __$SubmissionEntryCopyWithImpl;
@override @useResult
$Res call({
 String id, String state, List<String> imageKeys, String? submittedAt, String? checkedAt, AssignmentRef assignment
});


@override $AssignmentRefCopyWith<$Res> get assignment;

}
/// @nodoc
class __$SubmissionEntryCopyWithImpl<$Res>
    implements _$SubmissionEntryCopyWith<$Res> {
  __$SubmissionEntryCopyWithImpl(this._self, this._then);

  final _SubmissionEntry _self;
  final $Res Function(_SubmissionEntry) _then;

/// Create a copy of SubmissionEntry
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? state = null,Object? imageKeys = null,Object? submittedAt = freezed,Object? checkedAt = freezed,Object? assignment = null,}) {
  return _then(_SubmissionEntry(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as String,imageKeys: null == imageKeys ? _self._imageKeys : imageKeys // ignore: cast_nullable_to_non_nullable
as List<String>,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as String?,checkedAt: freezed == checkedAt ? _self.checkedAt : checkedAt // ignore: cast_nullable_to_non_nullable
as String?,assignment: null == assignment ? _self.assignment : assignment // ignore: cast_nullable_to_non_nullable
as AssignmentRef,
  ));
}

/// Create a copy of SubmissionEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AssignmentRefCopyWith<$Res> get assignment {
  
  return $AssignmentRefCopyWith<$Res>(_self.assignment, (value) {
    return _then(_self.copyWith(assignment: value));
  });
}
}


/// @nodoc
mixin _$TestRef {

 String get title; String? get type;
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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TestRef&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.type, _this.type) || other.type == _this.type));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as TestRef;
  return Object.hash(runtimeType,_this.title,_this.type);
}

@override
String toString() {
  final _this = this as TestRef;
  return 'TestRef(title: ${_this.title}, type: ${_this.type})';
}


}

/// @nodoc
abstract mixin class $TestRefCopyWith<$Res>  {
  factory $TestRefCopyWith(TestRef value, $Res Function(TestRef) _then) = _$TestRefCopyWithImpl;
@useResult
$Res call({
 String title, String? type
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
@pragma('vm:prefer-inline') @override $Res call({Object? title = null,Object? type = freezed,}) {
  return _then(TestRef(
title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String title,  String? type)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TestRef() when $default != null:
return $default(_that.title,_that.type);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String title,  String? type)  $default,) {final _that = this;
switch (_that) {
case _TestRef():
return $default(_that.title,_that.type);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String title,  String? type)?  $default,) {final _that = this;
switch (_that) {
case _TestRef() when $default != null:
return $default(_that.title,_that.type);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TestRef implements TestRef {
  const _TestRef({this.title = '', this.type});
  factory _TestRef.fromJson(Map<String, dynamic> json) => _$TestRefFromJson(json);

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
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _TestRef&&(identical(other.title, title) || other.title == title)&&(identical(other.type, type) || other.type == type));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,title,type);
}

@override
String toString() {
    return 'TestRef(title: $title, type: $type)';
}


}

/// @nodoc
abstract mixin class _$TestRefCopyWith<$Res> implements $TestRefCopyWith<$Res> {
  factory _$TestRefCopyWith(_TestRef value, $Res Function(_TestRef) _then) = __$TestRefCopyWithImpl;
@override @useResult
$Res call({
 String title, String? type
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
@override @pragma('vm:prefer-inline') $Res call({Object? title = null,Object? type = freezed,}) {
  return _then(_TestRef(
title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,type: freezed == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$Acknowledgement {

 String? get verifiedAt;
/// Create a copy of Acknowledgement
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AcknowledgementCopyWith<Acknowledgement> get copyWith => _$AcknowledgementCopyWithImpl<Acknowledgement>(this as Acknowledgement, _$identity);

  /// Serializes this Acknowledgement to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Acknowledgement;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Acknowledgement&&(identical(other.verifiedAt, _this.verifiedAt) || other.verifiedAt == _this.verifiedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Acknowledgement;
  return Object.hash(runtimeType,_this.verifiedAt);
}

@override
String toString() {
  final _this = this as Acknowledgement;
  return 'Acknowledgement(verifiedAt: ${_this.verifiedAt})';
}


}

/// @nodoc
abstract mixin class $AcknowledgementCopyWith<$Res>  {
  factory $AcknowledgementCopyWith(Acknowledgement value, $Res Function(Acknowledgement) _then) = _$AcknowledgementCopyWithImpl;
@useResult
$Res call({
 String? verifiedAt
});




}
/// @nodoc
class _$AcknowledgementCopyWithImpl<$Res>
    implements $AcknowledgementCopyWith<$Res> {
  _$AcknowledgementCopyWithImpl(this._self, this._then);

  final Acknowledgement _self;
  final $Res Function(Acknowledgement) _then;

/// Create a copy of Acknowledgement
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? verifiedAt = freezed,}) {
  return _then(Acknowledgement(
verifiedAt: freezed == verifiedAt ? _self.verifiedAt : verifiedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [Acknowledgement].
extension AcknowledgementPatterns on Acknowledgement {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Acknowledgement value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Acknowledgement() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Acknowledgement value)  $default,){
final _that = this;
switch (_that) {
case _Acknowledgement():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Acknowledgement value)?  $default,){
final _that = this;
switch (_that) {
case _Acknowledgement() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? verifiedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Acknowledgement() when $default != null:
return $default(_that.verifiedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? verifiedAt)  $default,) {final _that = this;
switch (_that) {
case _Acknowledgement():
return $default(_that.verifiedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? verifiedAt)?  $default,) {final _that = this;
switch (_that) {
case _Acknowledgement() when $default != null:
return $default(_that.verifiedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Acknowledgement implements Acknowledgement {
  const _Acknowledgement({this.verifiedAt});
  factory _Acknowledgement.fromJson(Map<String, dynamic> json) => _$AcknowledgementFromJson(json);

@override final  String? verifiedAt;

/// Create a copy of Acknowledgement
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AcknowledgementCopyWith<_Acknowledgement> get copyWith => __$AcknowledgementCopyWithImpl<_Acknowledgement>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AcknowledgementToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Acknowledgement&&(identical(other.verifiedAt, verifiedAt) || other.verifiedAt == verifiedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,verifiedAt);
}

@override
String toString() {
    return 'Acknowledgement(verifiedAt: $verifiedAt)';
}


}

/// @nodoc
abstract mixin class _$AcknowledgementCopyWith<$Res> implements $AcknowledgementCopyWith<$Res> {
  factory _$AcknowledgementCopyWith(_Acknowledgement value, $Res Function(_Acknowledgement) _then) = __$AcknowledgementCopyWithImpl;
@override @useResult
$Res call({
 String? verifiedAt
});




}
/// @nodoc
class __$AcknowledgementCopyWithImpl<$Res>
    implements _$AcknowledgementCopyWith<$Res> {
  __$AcknowledgementCopyWithImpl(this._self, this._then);

  final _Acknowledgement _self;
  final $Res Function(_Acknowledgement) _then;

/// Create a copy of Acknowledgement
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? verifiedAt = freezed,}) {
  return _then(_Acknowledgement(
verifiedAt: freezed == verifiedAt ? _self.verifiedAt : verifiedAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$TestResultEntry {

 String get id; num? get totalScore; num? get maxScore; String? get source; String get createdAt; TestRef get test; List<Acknowledgement> get acknowledgements;
/// Create a copy of TestResultEntry
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TestResultEntryCopyWith<TestResultEntry> get copyWith => _$TestResultEntryCopyWithImpl<TestResultEntry>(this as TestResultEntry, _$identity);

  /// Serializes this TestResultEntry to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as TestResultEntry;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TestResultEntry&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.totalScore, _this.totalScore) || other.totalScore == _this.totalScore)&&(identical(other.maxScore, _this.maxScore) || other.maxScore == _this.maxScore)&&(identical(other.source, _this.source) || other.source == _this.source)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt)&&(identical(other.test, _this.test) || other.test == _this.test)&&const DeepCollectionEquality().equals(other.acknowledgements, _this.acknowledgements));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as TestResultEntry;
  return Object.hash(runtimeType,_this.id,_this.totalScore,_this.maxScore,_this.source,_this.createdAt,_this.test,const DeepCollectionEquality().hash(_this.acknowledgements));
}

@override
String toString() {
  final _this = this as TestResultEntry;
  return 'TestResultEntry(id: ${_this.id}, totalScore: ${_this.totalScore}, maxScore: ${_this.maxScore}, source: ${_this.source}, createdAt: ${_this.createdAt}, test: ${_this.test}, acknowledgements: ${_this.acknowledgements})';
}


}

/// @nodoc
abstract mixin class $TestResultEntryCopyWith<$Res>  {
  factory $TestResultEntryCopyWith(TestResultEntry value, $Res Function(TestResultEntry) _then) = _$TestResultEntryCopyWithImpl;
@useResult
$Res call({
 String id, num? totalScore, num? maxScore, String? source, String createdAt, TestRef test, List<Acknowledgement> acknowledgements
});


$TestRefCopyWith<$Res> get test;

}
/// @nodoc
class _$TestResultEntryCopyWithImpl<$Res>
    implements $TestResultEntryCopyWith<$Res> {
  _$TestResultEntryCopyWithImpl(this._self, this._then);

  final TestResultEntry _self;
  final $Res Function(TestResultEntry) _then;

/// Create a copy of TestResultEntry
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? totalScore = freezed,Object? maxScore = freezed,Object? source = freezed,Object? createdAt = null,Object? test = null,Object? acknowledgements = null,}) {
  return _then(TestResultEntry(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,totalScore: freezed == totalScore ? _self.totalScore : totalScore // ignore: cast_nullable_to_non_nullable
as num?,maxScore: freezed == maxScore ? _self.maxScore : maxScore // ignore: cast_nullable_to_non_nullable
as num?,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,test: null == test ? _self.test : test // ignore: cast_nullable_to_non_nullable
as TestRef,acknowledgements: null == acknowledgements ? _self.acknowledgements : acknowledgements // ignore: cast_nullable_to_non_nullable
as List<Acknowledgement>,
  ));
}
/// Create a copy of TestResultEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TestRefCopyWith<$Res> get test {
  
  return $TestRefCopyWith<$Res>(_self.test, (value) {
    return _then(_self.copyWith(test: value));
  });
}
}


/// Adds pattern-matching-related methods to [TestResultEntry].
extension TestResultEntryPatterns on TestResultEntry {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TestResultEntry value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TestResultEntry() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TestResultEntry value)  $default,){
final _that = this;
switch (_that) {
case _TestResultEntry():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TestResultEntry value)?  $default,){
final _that = this;
switch (_that) {
case _TestResultEntry() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  num? totalScore,  num? maxScore,  String? source,  String createdAt,  TestRef test,  List<Acknowledgement> acknowledgements)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TestResultEntry() when $default != null:
return $default(_that.id,_that.totalScore,_that.maxScore,_that.source,_that.createdAt,_that.test,_that.acknowledgements);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  num? totalScore,  num? maxScore,  String? source,  String createdAt,  TestRef test,  List<Acknowledgement> acknowledgements)  $default,) {final _that = this;
switch (_that) {
case _TestResultEntry():
return $default(_that.id,_that.totalScore,_that.maxScore,_that.source,_that.createdAt,_that.test,_that.acknowledgements);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  num? totalScore,  num? maxScore,  String? source,  String createdAt,  TestRef test,  List<Acknowledgement> acknowledgements)?  $default,) {final _that = this;
switch (_that) {
case _TestResultEntry() when $default != null:
return $default(_that.id,_that.totalScore,_that.maxScore,_that.source,_that.createdAt,_that.test,_that.acknowledgements);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TestResultEntry extends TestResultEntry {
  const _TestResultEntry({required this.id, this.totalScore, this.maxScore, this.source, required this.createdAt, this.test = const TestRef(),  List<Acknowledgement> acknowledgements = const <Acknowledgement>[]}): _acknowledgements = acknowledgements,super._();
  factory _TestResultEntry.fromJson(Map<String, dynamic> json) => _$TestResultEntryFromJson(json);

@override final  String id;
@override final  num? totalScore;
@override final  num? maxScore;
@override final  String? source;
@override final  String createdAt;
@override@JsonKey() final  TestRef test;
 final  List<Acknowledgement> _acknowledgements;
@override@JsonKey() List<Acknowledgement> get acknowledgements {
  if (_acknowledgements is EqualUnmodifiableListView) return _acknowledgements;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_acknowledgements);
}


/// Create a copy of TestResultEntry
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TestResultEntryCopyWith<_TestResultEntry> get copyWith => __$TestResultEntryCopyWithImpl<_TestResultEntry>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TestResultEntryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _TestResultEntry&&(identical(other.id, id) || other.id == id)&&(identical(other.totalScore, totalScore) || other.totalScore == totalScore)&&(identical(other.maxScore, maxScore) || other.maxScore == maxScore)&&(identical(other.source, source) || other.source == source)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.test, test) || other.test == test)&&const DeepCollectionEquality().equals(other.acknowledgements, _acknowledgements));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,totalScore,maxScore,source,createdAt,test,const DeepCollectionEquality().hash(_acknowledgements));
}

@override
String toString() {
    return 'TestResultEntry(id: $id, totalScore: $totalScore, maxScore: $maxScore, source: $source, createdAt: $createdAt, test: $test, acknowledgements: $acknowledgements)';
}


}

/// @nodoc
abstract mixin class _$TestResultEntryCopyWith<$Res> implements $TestResultEntryCopyWith<$Res> {
  factory _$TestResultEntryCopyWith(_TestResultEntry value, $Res Function(_TestResultEntry) _then) = __$TestResultEntryCopyWithImpl;
@override @useResult
$Res call({
 String id, num? totalScore, num? maxScore, String? source, String createdAt, TestRef test, List<Acknowledgement> acknowledgements
});


@override $TestRefCopyWith<$Res> get test;

}
/// @nodoc
class __$TestResultEntryCopyWithImpl<$Res>
    implements _$TestResultEntryCopyWith<$Res> {
  __$TestResultEntryCopyWithImpl(this._self, this._then);

  final _TestResultEntry _self;
  final $Res Function(_TestResultEntry) _then;

/// Create a copy of TestResultEntry
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? totalScore = freezed,Object? maxScore = freezed,Object? source = freezed,Object? createdAt = null,Object? test = null,Object? acknowledgements = null,}) {
  return _then(_TestResultEntry(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,totalScore: freezed == totalScore ? _self.totalScore : totalScore // ignore: cast_nullable_to_non_nullable
as num?,maxScore: freezed == maxScore ? _self.maxScore : maxScore // ignore: cast_nullable_to_non_nullable
as num?,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,test: null == test ? _self.test : test // ignore: cast_nullable_to_non_nullable
as TestRef,acknowledgements: null == acknowledgements ? _self._acknowledgements : acknowledgements // ignore: cast_nullable_to_non_nullable
as List<Acknowledgement>,
  ));
}

/// Create a copy of TestResultEntry
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TestRefCopyWith<$Res> get test {
  
  return $TestRefCopyWith<$Res>(_self.test, (value) {
    return _then(_self.copyWith(test: value));
  });
}
}


/// @nodoc
mixin _$ChildPayment {

 String get id; String get status; num get amount; String get createdAt;
/// Create a copy of ChildPayment
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ChildPaymentCopyWith<ChildPayment> get copyWith => _$ChildPaymentCopyWithImpl<ChildPayment>(this as ChildPayment, _$identity);

  /// Serializes this ChildPayment to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ChildPayment;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ChildPayment&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.amount, _this.amount) || other.amount == _this.amount)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ChildPayment;
  return Object.hash(runtimeType,_this.id,_this.status,_this.amount,_this.createdAt);
}

@override
String toString() {
  final _this = this as ChildPayment;
  return 'ChildPayment(id: ${_this.id}, status: ${_this.status}, amount: ${_this.amount}, createdAt: ${_this.createdAt})';
}


}

/// @nodoc
abstract mixin class $ChildPaymentCopyWith<$Res>  {
  factory $ChildPaymentCopyWith(ChildPayment value, $Res Function(ChildPayment) _then) = _$ChildPaymentCopyWithImpl;
@useResult
$Res call({
 String id, String status, num amount, String createdAt
});




}
/// @nodoc
class _$ChildPaymentCopyWithImpl<$Res>
    implements $ChildPaymentCopyWith<$Res> {
  _$ChildPaymentCopyWithImpl(this._self, this._then);

  final ChildPayment _self;
  final $Res Function(ChildPayment) _then;

/// Create a copy of ChildPayment
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? status = null,Object? amount = null,Object? createdAt = null,}) {
  return _then(ChildPayment(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as num,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [ChildPayment].
extension ChildPaymentPatterns on ChildPayment {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ChildPayment value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ChildPayment() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ChildPayment value)  $default,){
final _that = this;
switch (_that) {
case _ChildPayment():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ChildPayment value)?  $default,){
final _that = this;
switch (_that) {
case _ChildPayment() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String status,  num amount,  String createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ChildPayment() when $default != null:
return $default(_that.id,_that.status,_that.amount,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String status,  num amount,  String createdAt)  $default,) {final _that = this;
switch (_that) {
case _ChildPayment():
return $default(_that.id,_that.status,_that.amount,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String status,  num amount,  String createdAt)?  $default,) {final _that = this;
switch (_that) {
case _ChildPayment() when $default != null:
return $default(_that.id,_that.status,_that.amount,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ChildPayment implements ChildPayment {
  const _ChildPayment({required this.id, required this.status, this.amount = 0, required this.createdAt});
  factory _ChildPayment.fromJson(Map<String, dynamic> json) => _$ChildPaymentFromJson(json);

@override final  String id;
@override final  String status;
@override@JsonKey() final  num amount;
@override final  String createdAt;

/// Create a copy of ChildPayment
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ChildPaymentCopyWith<_ChildPayment> get copyWith => __$ChildPaymentCopyWithImpl<_ChildPayment>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ChildPaymentToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ChildPayment&&(identical(other.id, id) || other.id == id)&&(identical(other.status, status) || other.status == status)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,status,amount,createdAt);
}

@override
String toString() {
    return 'ChildPayment(id: $id, status: $status, amount: $amount, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$ChildPaymentCopyWith<$Res> implements $ChildPaymentCopyWith<$Res> {
  factory _$ChildPaymentCopyWith(_ChildPayment value, $Res Function(_ChildPayment) _then) = __$ChildPaymentCopyWithImpl;
@override @useResult
$Res call({
 String id, String status, num amount, String createdAt
});




}
/// @nodoc
class __$ChildPaymentCopyWithImpl<$Res>
    implements _$ChildPaymentCopyWith<$Res> {
  __$ChildPaymentCopyWithImpl(this._self, this._then);

  final _ChildPayment _self;
  final $Res Function(_ChildPayment) _then;

/// Create a copy of ChildPayment
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? status = null,Object? amount = null,Object? createdAt = null,}) {
  return _then(_ChildPayment(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as num,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$ChildStudent {

 String get id; String get firstName; String get lastName; String? get phone; ChildProfile? get studentProfile; ClassroomRef? get classroom; List<AttendanceEntry> get attendances; List<HomeworkMarkEntry> get dailyHomeworkMarks; List<HomeworkQuizEntry> get homeworkQuizzes; List<SubmissionEntry> get submissions; List<TestResultEntry> get testResults; List<ChildPayment> get payments;
/// Create a copy of ChildStudent
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ChildStudentCopyWith<ChildStudent> get copyWith => _$ChildStudentCopyWithImpl<ChildStudent>(this as ChildStudent, _$identity);

  /// Serializes this ChildStudent to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ChildStudent;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ChildStudent&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.firstName, _this.firstName) || other.firstName == _this.firstName)&&(identical(other.lastName, _this.lastName) || other.lastName == _this.lastName)&&(identical(other.phone, _this.phone) || other.phone == _this.phone)&&(identical(other.studentProfile, _this.studentProfile) || other.studentProfile == _this.studentProfile)&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom)&&const DeepCollectionEquality().equals(other.attendances, _this.attendances)&&const DeepCollectionEquality().equals(other.dailyHomeworkMarks, _this.dailyHomeworkMarks)&&const DeepCollectionEquality().equals(other.homeworkQuizzes, _this.homeworkQuizzes)&&const DeepCollectionEquality().equals(other.submissions, _this.submissions)&&const DeepCollectionEquality().equals(other.testResults, _this.testResults)&&const DeepCollectionEquality().equals(other.payments, _this.payments));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ChildStudent;
  return Object.hash(runtimeType,_this.id,_this.firstName,_this.lastName,_this.phone,_this.studentProfile,_this.classroom,const DeepCollectionEquality().hash(_this.attendances),const DeepCollectionEquality().hash(_this.dailyHomeworkMarks),const DeepCollectionEquality().hash(_this.homeworkQuizzes),const DeepCollectionEquality().hash(_this.submissions),const DeepCollectionEquality().hash(_this.testResults),const DeepCollectionEquality().hash(_this.payments));
}

@override
String toString() {
  final _this = this as ChildStudent;
  return 'ChildStudent(id: ${_this.id}, firstName: ${_this.firstName}, lastName: ${_this.lastName}, phone: ${_this.phone}, studentProfile: ${_this.studentProfile}, classroom: ${_this.classroom}, attendances: ${_this.attendances}, dailyHomeworkMarks: ${_this.dailyHomeworkMarks}, homeworkQuizzes: ${_this.homeworkQuizzes}, submissions: ${_this.submissions}, testResults: ${_this.testResults}, payments: ${_this.payments})';
}


}

/// @nodoc
abstract mixin class $ChildStudentCopyWith<$Res>  {
  factory $ChildStudentCopyWith(ChildStudent value, $Res Function(ChildStudent) _then) = _$ChildStudentCopyWithImpl;
@useResult
$Res call({
 String id, String firstName, String lastName, String? phone, ChildProfile? studentProfile, ClassroomRef? classroom, List<AttendanceEntry> attendances, List<HomeworkMarkEntry> dailyHomeworkMarks, List<HomeworkQuizEntry> homeworkQuizzes, List<SubmissionEntry> submissions, List<TestResultEntry> testResults, List<ChildPayment> payments
});


$ChildProfileCopyWith<$Res>? get studentProfile;$ClassroomRefCopyWith<$Res>? get classroom;

}
/// @nodoc
class _$ChildStudentCopyWithImpl<$Res>
    implements $ChildStudentCopyWith<$Res> {
  _$ChildStudentCopyWithImpl(this._self, this._then);

  final ChildStudent _self;
  final $Res Function(ChildStudent) _then;

/// Create a copy of ChildStudent
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? firstName = null,Object? lastName = null,Object? phone = freezed,Object? studentProfile = freezed,Object? classroom = freezed,Object? attendances = null,Object? dailyHomeworkMarks = null,Object? homeworkQuizzes = null,Object? submissions = null,Object? testResults = null,Object? payments = null,}) {
  return _then(ChildStudent(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: null == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,studentProfile: freezed == studentProfile ? _self.studentProfile : studentProfile // ignore: cast_nullable_to_non_nullable
as ChildProfile?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ClassroomRef?,attendances: null == attendances ? _self.attendances : attendances // ignore: cast_nullable_to_non_nullable
as List<AttendanceEntry>,dailyHomeworkMarks: null == dailyHomeworkMarks ? _self.dailyHomeworkMarks : dailyHomeworkMarks // ignore: cast_nullable_to_non_nullable
as List<HomeworkMarkEntry>,homeworkQuizzes: null == homeworkQuizzes ? _self.homeworkQuizzes : homeworkQuizzes // ignore: cast_nullable_to_non_nullable
as List<HomeworkQuizEntry>,submissions: null == submissions ? _self.submissions : submissions // ignore: cast_nullable_to_non_nullable
as List<SubmissionEntry>,testResults: null == testResults ? _self.testResults : testResults // ignore: cast_nullable_to_non_nullable
as List<TestResultEntry>,payments: null == payments ? _self.payments : payments // ignore: cast_nullable_to_non_nullable
as List<ChildPayment>,
  ));
}
/// Create a copy of ChildStudent
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ChildProfileCopyWith<$Res>? get studentProfile {
    if (_self.studentProfile == null) {
    return null;
  }

  return $ChildProfileCopyWith<$Res>(_self.studentProfile!, (value) {
    return _then(_self.copyWith(studentProfile: value));
  });
}/// Create a copy of ChildStudent
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClassroomRefCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $ClassroomRefCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// Adds pattern-matching-related methods to [ChildStudent].
extension ChildStudentPatterns on ChildStudent {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ChildStudent value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ChildStudent() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ChildStudent value)  $default,){
final _that = this;
switch (_that) {
case _ChildStudent():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ChildStudent value)?  $default,){
final _that = this;
switch (_that) {
case _ChildStudent() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String firstName,  String lastName,  String? phone,  ChildProfile? studentProfile,  ClassroomRef? classroom,  List<AttendanceEntry> attendances,  List<HomeworkMarkEntry> dailyHomeworkMarks,  List<HomeworkQuizEntry> homeworkQuizzes,  List<SubmissionEntry> submissions,  List<TestResultEntry> testResults,  List<ChildPayment> payments)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ChildStudent() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName,_that.phone,_that.studentProfile,_that.classroom,_that.attendances,_that.dailyHomeworkMarks,_that.homeworkQuizzes,_that.submissions,_that.testResults,_that.payments);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String firstName,  String lastName,  String? phone,  ChildProfile? studentProfile,  ClassroomRef? classroom,  List<AttendanceEntry> attendances,  List<HomeworkMarkEntry> dailyHomeworkMarks,  List<HomeworkQuizEntry> homeworkQuizzes,  List<SubmissionEntry> submissions,  List<TestResultEntry> testResults,  List<ChildPayment> payments)  $default,) {final _that = this;
switch (_that) {
case _ChildStudent():
return $default(_that.id,_that.firstName,_that.lastName,_that.phone,_that.studentProfile,_that.classroom,_that.attendances,_that.dailyHomeworkMarks,_that.homeworkQuizzes,_that.submissions,_that.testResults,_that.payments);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String firstName,  String lastName,  String? phone,  ChildProfile? studentProfile,  ClassroomRef? classroom,  List<AttendanceEntry> attendances,  List<HomeworkMarkEntry> dailyHomeworkMarks,  List<HomeworkQuizEntry> homeworkQuizzes,  List<SubmissionEntry> submissions,  List<TestResultEntry> testResults,  List<ChildPayment> payments)?  $default,) {final _that = this;
switch (_that) {
case _ChildStudent() when $default != null:
return $default(_that.id,_that.firstName,_that.lastName,_that.phone,_that.studentProfile,_that.classroom,_that.attendances,_that.dailyHomeworkMarks,_that.homeworkQuizzes,_that.submissions,_that.testResults,_that.payments);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ChildStudent extends ChildStudent {
  const _ChildStudent({required this.id, this.firstName = '', this.lastName = '', this.phone, this.studentProfile, this.classroom,  List<AttendanceEntry> attendances = const <AttendanceEntry>[],  List<HomeworkMarkEntry> dailyHomeworkMarks = const <HomeworkMarkEntry>[],  List<HomeworkQuizEntry> homeworkQuizzes = const <HomeworkQuizEntry>[],  List<SubmissionEntry> submissions = const <SubmissionEntry>[],  List<TestResultEntry> testResults = const <TestResultEntry>[],  List<ChildPayment> payments = const <ChildPayment>[]}): _attendances = attendances,_dailyHomeworkMarks = dailyHomeworkMarks,_homeworkQuizzes = homeworkQuizzes,_submissions = submissions,_testResults = testResults,_payments = payments,super._();
  factory _ChildStudent.fromJson(Map<String, dynamic> json) => _$ChildStudentFromJson(json);

@override final  String id;
@override@JsonKey() final  String firstName;
@override@JsonKey() final  String lastName;
@override final  String? phone;
@override final  ChildProfile? studentProfile;
@override final  ClassroomRef? classroom;
 final  List<AttendanceEntry> _attendances;
@override@JsonKey() List<AttendanceEntry> get attendances {
  if (_attendances is EqualUnmodifiableListView) return _attendances;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_attendances);
}

 final  List<HomeworkMarkEntry> _dailyHomeworkMarks;
@override@JsonKey() List<HomeworkMarkEntry> get dailyHomeworkMarks {
  if (_dailyHomeworkMarks is EqualUnmodifiableListView) return _dailyHomeworkMarks;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_dailyHomeworkMarks);
}

 final  List<HomeworkQuizEntry> _homeworkQuizzes;
@override@JsonKey() List<HomeworkQuizEntry> get homeworkQuizzes {
  if (_homeworkQuizzes is EqualUnmodifiableListView) return _homeworkQuizzes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_homeworkQuizzes);
}

 final  List<SubmissionEntry> _submissions;
@override@JsonKey() List<SubmissionEntry> get submissions {
  if (_submissions is EqualUnmodifiableListView) return _submissions;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_submissions);
}

 final  List<TestResultEntry> _testResults;
@override@JsonKey() List<TestResultEntry> get testResults {
  if (_testResults is EqualUnmodifiableListView) return _testResults;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_testResults);
}

 final  List<ChildPayment> _payments;
@override@JsonKey() List<ChildPayment> get payments {
  if (_payments is EqualUnmodifiableListView) return _payments;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_payments);
}


/// Create a copy of ChildStudent
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ChildStudentCopyWith<_ChildStudent> get copyWith => __$ChildStudentCopyWithImpl<_ChildStudent>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ChildStudentToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ChildStudent&&(identical(other.id, id) || other.id == id)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.studentProfile, studentProfile) || other.studentProfile == studentProfile)&&(identical(other.classroom, classroom) || other.classroom == classroom)&&const DeepCollectionEquality().equals(other.attendances, _attendances)&&const DeepCollectionEquality().equals(other.dailyHomeworkMarks, _dailyHomeworkMarks)&&const DeepCollectionEquality().equals(other.homeworkQuizzes, _homeworkQuizzes)&&const DeepCollectionEquality().equals(other.submissions, _submissions)&&const DeepCollectionEquality().equals(other.testResults, _testResults)&&const DeepCollectionEquality().equals(other.payments, _payments));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,firstName,lastName,phone,studentProfile,classroom,const DeepCollectionEquality().hash(_attendances),const DeepCollectionEquality().hash(_dailyHomeworkMarks),const DeepCollectionEquality().hash(_homeworkQuizzes),const DeepCollectionEquality().hash(_submissions),const DeepCollectionEquality().hash(_testResults),const DeepCollectionEquality().hash(_payments));
}

@override
String toString() {
    return 'ChildStudent(id: $id, firstName: $firstName, lastName: $lastName, phone: $phone, studentProfile: $studentProfile, classroom: $classroom, attendances: $attendances, dailyHomeworkMarks: $dailyHomeworkMarks, homeworkQuizzes: $homeworkQuizzes, submissions: $submissions, testResults: $testResults, payments: $payments)';
}


}

/// @nodoc
abstract mixin class _$ChildStudentCopyWith<$Res> implements $ChildStudentCopyWith<$Res> {
  factory _$ChildStudentCopyWith(_ChildStudent value, $Res Function(_ChildStudent) _then) = __$ChildStudentCopyWithImpl;
@override @useResult
$Res call({
 String id, String firstName, String lastName, String? phone, ChildProfile? studentProfile, ClassroomRef? classroom, List<AttendanceEntry> attendances, List<HomeworkMarkEntry> dailyHomeworkMarks, List<HomeworkQuizEntry> homeworkQuizzes, List<SubmissionEntry> submissions, List<TestResultEntry> testResults, List<ChildPayment> payments
});


@override $ChildProfileCopyWith<$Res>? get studentProfile;@override $ClassroomRefCopyWith<$Res>? get classroom;

}
/// @nodoc
class __$ChildStudentCopyWithImpl<$Res>
    implements _$ChildStudentCopyWith<$Res> {
  __$ChildStudentCopyWithImpl(this._self, this._then);

  final _ChildStudent _self;
  final $Res Function(_ChildStudent) _then;

/// Create a copy of ChildStudent
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? firstName = null,Object? lastName = null,Object? phone = freezed,Object? studentProfile = freezed,Object? classroom = freezed,Object? attendances = null,Object? dailyHomeworkMarks = null,Object? homeworkQuizzes = null,Object? submissions = null,Object? testResults = null,Object? payments = null,}) {
  return _then(_ChildStudent(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: null == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,studentProfile: freezed == studentProfile ? _self.studentProfile : studentProfile // ignore: cast_nullable_to_non_nullable
as ChildProfile?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as ClassroomRef?,attendances: null == attendances ? _self._attendances : attendances // ignore: cast_nullable_to_non_nullable
as List<AttendanceEntry>,dailyHomeworkMarks: null == dailyHomeworkMarks ? _self._dailyHomeworkMarks : dailyHomeworkMarks // ignore: cast_nullable_to_non_nullable
as List<HomeworkMarkEntry>,homeworkQuizzes: null == homeworkQuizzes ? _self._homeworkQuizzes : homeworkQuizzes // ignore: cast_nullable_to_non_nullable
as List<HomeworkQuizEntry>,submissions: null == submissions ? _self._submissions : submissions // ignore: cast_nullable_to_non_nullable
as List<SubmissionEntry>,testResults: null == testResults ? _self._testResults : testResults // ignore: cast_nullable_to_non_nullable
as List<TestResultEntry>,payments: null == payments ? _self._payments : payments // ignore: cast_nullable_to_non_nullable
as List<ChildPayment>,
  ));
}

/// Create a copy of ChildStudent
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ChildProfileCopyWith<$Res>? get studentProfile {
    if (_self.studentProfile == null) {
    return null;
  }

  return $ChildProfileCopyWith<$Res>(_self.studentProfile!, (value) {
    return _then(_self.copyWith(studentProfile: value));
  });
}/// Create a copy of ChildStudent
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ClassroomRefCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $ClassroomRefCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// @nodoc
mixin _$ParentLink {

 String get id; bool get verified; String? get verifiedAt; ChildStudent get student;
/// Create a copy of ParentLink
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ParentLinkCopyWith<ParentLink> get copyWith => _$ParentLinkCopyWithImpl<ParentLink>(this as ParentLink, _$identity);

  /// Serializes this ParentLink to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ParentLink;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ParentLink&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.verified, _this.verified) || other.verified == _this.verified)&&(identical(other.verifiedAt, _this.verifiedAt) || other.verifiedAt == _this.verifiedAt)&&(identical(other.student, _this.student) || other.student == _this.student));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ParentLink;
  return Object.hash(runtimeType,_this.id,_this.verified,_this.verifiedAt,_this.student);
}

@override
String toString() {
  final _this = this as ParentLink;
  return 'ParentLink(id: ${_this.id}, verified: ${_this.verified}, verifiedAt: ${_this.verifiedAt}, student: ${_this.student})';
}


}

/// @nodoc
abstract mixin class $ParentLinkCopyWith<$Res>  {
  factory $ParentLinkCopyWith(ParentLink value, $Res Function(ParentLink) _then) = _$ParentLinkCopyWithImpl;
@useResult
$Res call({
 String id, bool verified, String? verifiedAt, ChildStudent student
});


$ChildStudentCopyWith<$Res> get student;

}
/// @nodoc
class _$ParentLinkCopyWithImpl<$Res>
    implements $ParentLinkCopyWith<$Res> {
  _$ParentLinkCopyWithImpl(this._self, this._then);

  final ParentLink _self;
  final $Res Function(ParentLink) _then;

/// Create a copy of ParentLink
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? verified = null,Object? verifiedAt = freezed,Object? student = null,}) {
  return _then(ParentLink(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,verified: null == verified ? _self.verified : verified // ignore: cast_nullable_to_non_nullable
as bool,verifiedAt: freezed == verifiedAt ? _self.verifiedAt : verifiedAt // ignore: cast_nullable_to_non_nullable
as String?,student: null == student ? _self.student : student // ignore: cast_nullable_to_non_nullable
as ChildStudent,
  ));
}
/// Create a copy of ParentLink
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ChildStudentCopyWith<$Res> get student {
  
  return $ChildStudentCopyWith<$Res>(_self.student, (value) {
    return _then(_self.copyWith(student: value));
  });
}
}


/// Adds pattern-matching-related methods to [ParentLink].
extension ParentLinkPatterns on ParentLink {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ParentLink value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ParentLink() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ParentLink value)  $default,){
final _that = this;
switch (_that) {
case _ParentLink():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ParentLink value)?  $default,){
final _that = this;
switch (_that) {
case _ParentLink() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  bool verified,  String? verifiedAt,  ChildStudent student)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ParentLink() when $default != null:
return $default(_that.id,_that.verified,_that.verifiedAt,_that.student);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  bool verified,  String? verifiedAt,  ChildStudent student)  $default,) {final _that = this;
switch (_that) {
case _ParentLink():
return $default(_that.id,_that.verified,_that.verifiedAt,_that.student);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  bool verified,  String? verifiedAt,  ChildStudent student)?  $default,) {final _that = this;
switch (_that) {
case _ParentLink() when $default != null:
return $default(_that.id,_that.verified,_that.verifiedAt,_that.student);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ParentLink implements ParentLink {
  const _ParentLink({required this.id, this.verified = false, this.verifiedAt, required this.student});
  factory _ParentLink.fromJson(Map<String, dynamic> json) => _$ParentLinkFromJson(json);

@override final  String id;
@override@JsonKey() final  bool verified;
@override final  String? verifiedAt;
@override final  ChildStudent student;

/// Create a copy of ParentLink
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ParentLinkCopyWith<_ParentLink> get copyWith => __$ParentLinkCopyWithImpl<_ParentLink>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ParentLinkToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ParentLink&&(identical(other.id, id) || other.id == id)&&(identical(other.verified, verified) || other.verified == verified)&&(identical(other.verifiedAt, verifiedAt) || other.verifiedAt == verifiedAt)&&(identical(other.student, student) || other.student == student));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,verified,verifiedAt,student);
}

@override
String toString() {
    return 'ParentLink(id: $id, verified: $verified, verifiedAt: $verifiedAt, student: $student)';
}


}

/// @nodoc
abstract mixin class _$ParentLinkCopyWith<$Res> implements $ParentLinkCopyWith<$Res> {
  factory _$ParentLinkCopyWith(_ParentLink value, $Res Function(_ParentLink) _then) = __$ParentLinkCopyWithImpl;
@override @useResult
$Res call({
 String id, bool verified, String? verifiedAt, ChildStudent student
});


@override $ChildStudentCopyWith<$Res> get student;

}
/// @nodoc
class __$ParentLinkCopyWithImpl<$Res>
    implements _$ParentLinkCopyWith<$Res> {
  __$ParentLinkCopyWithImpl(this._self, this._then);

  final _ParentLink _self;
  final $Res Function(_ParentLink) _then;

/// Create a copy of ParentLink
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? verified = null,Object? verifiedAt = freezed,Object? student = null,}) {
  return _then(_ParentLink(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,verified: null == verified ? _self.verified : verified // ignore: cast_nullable_to_non_nullable
as bool,verifiedAt: freezed == verifiedAt ? _self.verifiedAt : verifiedAt // ignore: cast_nullable_to_non_nullable
as String?,student: null == student ? _self.student : student // ignore: cast_nullable_to_non_nullable
as ChildStudent,
  ));
}

/// Create a copy of ParentLink
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ChildStudentCopyWith<$Res> get student {
  
  return $ChildStudentCopyWith<$Res>(_self.student, (value) {
    return _then(_self.copyWith(student: value));
  });
}
}


/// @nodoc
mixin _$ExamResultCardData {

 String get testResultId; TestRef get test; num get totalScore; num get maxScore; num get percent; ExamParts? get parts; List<WeakTopic> get weakTopics; String get takenAt; String? get acknowledgedAt; bool get canAcknowledge;
/// Create a copy of ExamResultCardData
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ExamResultCardDataCopyWith<ExamResultCardData> get copyWith => _$ExamResultCardDataCopyWithImpl<ExamResultCardData>(this as ExamResultCardData, _$identity);

  /// Serializes this ExamResultCardData to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ExamResultCardData;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ExamResultCardData&&(identical(other.testResultId, _this.testResultId) || other.testResultId == _this.testResultId)&&(identical(other.test, _this.test) || other.test == _this.test)&&(identical(other.totalScore, _this.totalScore) || other.totalScore == _this.totalScore)&&(identical(other.maxScore, _this.maxScore) || other.maxScore == _this.maxScore)&&(identical(other.percent, _this.percent) || other.percent == _this.percent)&&(identical(other.parts, _this.parts) || other.parts == _this.parts)&&const DeepCollectionEquality().equals(other.weakTopics, _this.weakTopics)&&(identical(other.takenAt, _this.takenAt) || other.takenAt == _this.takenAt)&&(identical(other.acknowledgedAt, _this.acknowledgedAt) || other.acknowledgedAt == _this.acknowledgedAt)&&(identical(other.canAcknowledge, _this.canAcknowledge) || other.canAcknowledge == _this.canAcknowledge));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ExamResultCardData;
  return Object.hash(runtimeType,_this.testResultId,_this.test,_this.totalScore,_this.maxScore,_this.percent,_this.parts,const DeepCollectionEquality().hash(_this.weakTopics),_this.takenAt,_this.acknowledgedAt,_this.canAcknowledge);
}

@override
String toString() {
  final _this = this as ExamResultCardData;
  return 'ExamResultCardData(testResultId: ${_this.testResultId}, test: ${_this.test}, totalScore: ${_this.totalScore}, maxScore: ${_this.maxScore}, percent: ${_this.percent}, parts: ${_this.parts}, weakTopics: ${_this.weakTopics}, takenAt: ${_this.takenAt}, acknowledgedAt: ${_this.acknowledgedAt}, canAcknowledge: ${_this.canAcknowledge})';
}


}

/// @nodoc
abstract mixin class $ExamResultCardDataCopyWith<$Res>  {
  factory $ExamResultCardDataCopyWith(ExamResultCardData value, $Res Function(ExamResultCardData) _then) = _$ExamResultCardDataCopyWithImpl;
@useResult
$Res call({
 String testResultId, TestRef test, num totalScore, num maxScore, num percent, ExamParts? parts, List<WeakTopic> weakTopics, String takenAt, String? acknowledgedAt, bool canAcknowledge
});


$TestRefCopyWith<$Res> get test;$ExamPartsCopyWith<$Res>? get parts;

}
/// @nodoc
class _$ExamResultCardDataCopyWithImpl<$Res>
    implements $ExamResultCardDataCopyWith<$Res> {
  _$ExamResultCardDataCopyWithImpl(this._self, this._then);

  final ExamResultCardData _self;
  final $Res Function(ExamResultCardData) _then;

/// Create a copy of ExamResultCardData
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? testResultId = null,Object? test = null,Object? totalScore = null,Object? maxScore = null,Object? percent = null,Object? parts = freezed,Object? weakTopics = null,Object? takenAt = null,Object? acknowledgedAt = freezed,Object? canAcknowledge = null,}) {
  return _then(ExamResultCardData(
testResultId: null == testResultId ? _self.testResultId : testResultId // ignore: cast_nullable_to_non_nullable
as String,test: null == test ? _self.test : test // ignore: cast_nullable_to_non_nullable
as TestRef,totalScore: null == totalScore ? _self.totalScore : totalScore // ignore: cast_nullable_to_non_nullable
as num,maxScore: null == maxScore ? _self.maxScore : maxScore // ignore: cast_nullable_to_non_nullable
as num,percent: null == percent ? _self.percent : percent // ignore: cast_nullable_to_non_nullable
as num,parts: freezed == parts ? _self.parts : parts // ignore: cast_nullable_to_non_nullable
as ExamParts?,weakTopics: null == weakTopics ? _self.weakTopics : weakTopics // ignore: cast_nullable_to_non_nullable
as List<WeakTopic>,takenAt: null == takenAt ? _self.takenAt : takenAt // ignore: cast_nullable_to_non_nullable
as String,acknowledgedAt: freezed == acknowledgedAt ? _self.acknowledgedAt : acknowledgedAt // ignore: cast_nullable_to_non_nullable
as String?,canAcknowledge: null == canAcknowledge ? _self.canAcknowledge : canAcknowledge // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}
/// Create a copy of ExamResultCardData
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TestRefCopyWith<$Res> get test {
  
  return $TestRefCopyWith<$Res>(_self.test, (value) {
    return _then(_self.copyWith(test: value));
  });
}/// Create a copy of ExamResultCardData
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ExamPartsCopyWith<$Res>? get parts {
    if (_self.parts == null) {
    return null;
  }

  return $ExamPartsCopyWith<$Res>(_self.parts!, (value) {
    return _then(_self.copyWith(parts: value));
  });
}
}


/// Adds pattern-matching-related methods to [ExamResultCardData].
extension ExamResultCardDataPatterns on ExamResultCardData {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ExamResultCardData value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ExamResultCardData() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ExamResultCardData value)  $default,){
final _that = this;
switch (_that) {
case _ExamResultCardData():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ExamResultCardData value)?  $default,){
final _that = this;
switch (_that) {
case _ExamResultCardData() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String testResultId,  TestRef test,  num totalScore,  num maxScore,  num percent,  ExamParts? parts,  List<WeakTopic> weakTopics,  String takenAt,  String? acknowledgedAt,  bool canAcknowledge)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ExamResultCardData() when $default != null:
return $default(_that.testResultId,_that.test,_that.totalScore,_that.maxScore,_that.percent,_that.parts,_that.weakTopics,_that.takenAt,_that.acknowledgedAt,_that.canAcknowledge);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String testResultId,  TestRef test,  num totalScore,  num maxScore,  num percent,  ExamParts? parts,  List<WeakTopic> weakTopics,  String takenAt,  String? acknowledgedAt,  bool canAcknowledge)  $default,) {final _that = this;
switch (_that) {
case _ExamResultCardData():
return $default(_that.testResultId,_that.test,_that.totalScore,_that.maxScore,_that.percent,_that.parts,_that.weakTopics,_that.takenAt,_that.acknowledgedAt,_that.canAcknowledge);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String testResultId,  TestRef test,  num totalScore,  num maxScore,  num percent,  ExamParts? parts,  List<WeakTopic> weakTopics,  String takenAt,  String? acknowledgedAt,  bool canAcknowledge)?  $default,) {final _that = this;
switch (_that) {
case _ExamResultCardData() when $default != null:
return $default(_that.testResultId,_that.test,_that.totalScore,_that.maxScore,_that.percent,_that.parts,_that.weakTopics,_that.takenAt,_that.acknowledgedAt,_that.canAcknowledge);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ExamResultCardData implements ExamResultCardData {
  const _ExamResultCardData({required this.testResultId, this.test = const TestRef(), this.totalScore = 0, this.maxScore = 0, this.percent = 0, this.parts,  List<WeakTopic> weakTopics = const <WeakTopic>[], required this.takenAt, this.acknowledgedAt, this.canAcknowledge = false}): _weakTopics = weakTopics;
  factory _ExamResultCardData.fromJson(Map<String, dynamic> json) => _$ExamResultCardDataFromJson(json);

@override final  String testResultId;
@override@JsonKey() final  TestRef test;
@override@JsonKey() final  num totalScore;
@override@JsonKey() final  num maxScore;
@override@JsonKey() final  num percent;
@override final  ExamParts? parts;
 final  List<WeakTopic> _weakTopics;
@override@JsonKey() List<WeakTopic> get weakTopics {
  if (_weakTopics is EqualUnmodifiableListView) return _weakTopics;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_weakTopics);
}

@override final  String takenAt;
@override final  String? acknowledgedAt;
@override@JsonKey() final  bool canAcknowledge;

/// Create a copy of ExamResultCardData
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ExamResultCardDataCopyWith<_ExamResultCardData> get copyWith => __$ExamResultCardDataCopyWithImpl<_ExamResultCardData>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ExamResultCardDataToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ExamResultCardData&&(identical(other.testResultId, testResultId) || other.testResultId == testResultId)&&(identical(other.test, test) || other.test == test)&&(identical(other.totalScore, totalScore) || other.totalScore == totalScore)&&(identical(other.maxScore, maxScore) || other.maxScore == maxScore)&&(identical(other.percent, percent) || other.percent == percent)&&(identical(other.parts, parts) || other.parts == parts)&&const DeepCollectionEquality().equals(other.weakTopics, _weakTopics)&&(identical(other.takenAt, takenAt) || other.takenAt == takenAt)&&(identical(other.acknowledgedAt, acknowledgedAt) || other.acknowledgedAt == acknowledgedAt)&&(identical(other.canAcknowledge, canAcknowledge) || other.canAcknowledge == canAcknowledge));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,testResultId,test,totalScore,maxScore,percent,parts,const DeepCollectionEquality().hash(_weakTopics),takenAt,acknowledgedAt,canAcknowledge);
}

@override
String toString() {
    return 'ExamResultCardData(testResultId: $testResultId, test: $test, totalScore: $totalScore, maxScore: $maxScore, percent: $percent, parts: $parts, weakTopics: $weakTopics, takenAt: $takenAt, acknowledgedAt: $acknowledgedAt, canAcknowledge: $canAcknowledge)';
}


}

/// @nodoc
abstract mixin class _$ExamResultCardDataCopyWith<$Res> implements $ExamResultCardDataCopyWith<$Res> {
  factory _$ExamResultCardDataCopyWith(_ExamResultCardData value, $Res Function(_ExamResultCardData) _then) = __$ExamResultCardDataCopyWithImpl;
@override @useResult
$Res call({
 String testResultId, TestRef test, num totalScore, num maxScore, num percent, ExamParts? parts, List<WeakTopic> weakTopics, String takenAt, String? acknowledgedAt, bool canAcknowledge
});


@override $TestRefCopyWith<$Res> get test;@override $ExamPartsCopyWith<$Res>? get parts;

}
/// @nodoc
class __$ExamResultCardDataCopyWithImpl<$Res>
    implements _$ExamResultCardDataCopyWith<$Res> {
  __$ExamResultCardDataCopyWithImpl(this._self, this._then);

  final _ExamResultCardData _self;
  final $Res Function(_ExamResultCardData) _then;

/// Create a copy of ExamResultCardData
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? testResultId = null,Object? test = null,Object? totalScore = null,Object? maxScore = null,Object? percent = null,Object? parts = freezed,Object? weakTopics = null,Object? takenAt = null,Object? acknowledgedAt = freezed,Object? canAcknowledge = null,}) {
  return _then(_ExamResultCardData(
testResultId: null == testResultId ? _self.testResultId : testResultId // ignore: cast_nullable_to_non_nullable
as String,test: null == test ? _self.test : test // ignore: cast_nullable_to_non_nullable
as TestRef,totalScore: null == totalScore ? _self.totalScore : totalScore // ignore: cast_nullable_to_non_nullable
as num,maxScore: null == maxScore ? _self.maxScore : maxScore // ignore: cast_nullable_to_non_nullable
as num,percent: null == percent ? _self.percent : percent // ignore: cast_nullable_to_non_nullable
as num,parts: freezed == parts ? _self.parts : parts // ignore: cast_nullable_to_non_nullable
as ExamParts?,weakTopics: null == weakTopics ? _self._weakTopics : weakTopics // ignore: cast_nullable_to_non_nullable
as List<WeakTopic>,takenAt: null == takenAt ? _self.takenAt : takenAt // ignore: cast_nullable_to_non_nullable
as String,acknowledgedAt: freezed == acknowledgedAt ? _self.acknowledgedAt : acknowledgedAt // ignore: cast_nullable_to_non_nullable
as String?,canAcknowledge: null == canAcknowledge ? _self.canAcknowledge : canAcknowledge // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

/// Create a copy of ExamResultCardData
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TestRefCopyWith<$Res> get test {
  
  return $TestRefCopyWith<$Res>(_self.test, (value) {
    return _then(_self.copyWith(test: value));
  });
}/// Create a copy of ExamResultCardData
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$ExamPartsCopyWith<$Res>? get parts {
    if (_self.parts == null) {
    return null;
  }

  return $ExamPartsCopyWith<$Res>(_self.parts!, (value) {
    return _then(_self.copyWith(parts: value));
  });
}
}


/// @nodoc
mixin _$ExamParts {

 num get part1; num get part1Max; num get part2; num get part2Max;
/// Create a copy of ExamParts
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ExamPartsCopyWith<ExamParts> get copyWith => _$ExamPartsCopyWithImpl<ExamParts>(this as ExamParts, _$identity);

  /// Serializes this ExamParts to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as ExamParts;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ExamParts&&(identical(other.part1, _this.part1) || other.part1 == _this.part1)&&(identical(other.part1Max, _this.part1Max) || other.part1Max == _this.part1Max)&&(identical(other.part2, _this.part2) || other.part2 == _this.part2)&&(identical(other.part2Max, _this.part2Max) || other.part2Max == _this.part2Max));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as ExamParts;
  return Object.hash(runtimeType,_this.part1,_this.part1Max,_this.part2,_this.part2Max);
}

@override
String toString() {
  final _this = this as ExamParts;
  return 'ExamParts(part1: ${_this.part1}, part1Max: ${_this.part1Max}, part2: ${_this.part2}, part2Max: ${_this.part2Max})';
}


}

/// @nodoc
abstract mixin class $ExamPartsCopyWith<$Res>  {
  factory $ExamPartsCopyWith(ExamParts value, $Res Function(ExamParts) _then) = _$ExamPartsCopyWithImpl;
@useResult
$Res call({
 num part1, num part1Max, num part2, num part2Max
});




}
/// @nodoc
class _$ExamPartsCopyWithImpl<$Res>
    implements $ExamPartsCopyWith<$Res> {
  _$ExamPartsCopyWithImpl(this._self, this._then);

  final ExamParts _self;
  final $Res Function(ExamParts) _then;

/// Create a copy of ExamParts
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? part1 = null,Object? part1Max = null,Object? part2 = null,Object? part2Max = null,}) {
  return _then(ExamParts(
part1: null == part1 ? _self.part1 : part1 // ignore: cast_nullable_to_non_nullable
as num,part1Max: null == part1Max ? _self.part1Max : part1Max // ignore: cast_nullable_to_non_nullable
as num,part2: null == part2 ? _self.part2 : part2 // ignore: cast_nullable_to_non_nullable
as num,part2Max: null == part2Max ? _self.part2Max : part2Max // ignore: cast_nullable_to_non_nullable
as num,
  ));
}

}


/// Adds pattern-matching-related methods to [ExamParts].
extension ExamPartsPatterns on ExamParts {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ExamParts value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ExamParts() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ExamParts value)  $default,){
final _that = this;
switch (_that) {
case _ExamParts():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ExamParts value)?  $default,){
final _that = this;
switch (_that) {
case _ExamParts() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( num part1,  num part1Max,  num part2,  num part2Max)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ExamParts() when $default != null:
return $default(_that.part1,_that.part1Max,_that.part2,_that.part2Max);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( num part1,  num part1Max,  num part2,  num part2Max)  $default,) {final _that = this;
switch (_that) {
case _ExamParts():
return $default(_that.part1,_that.part1Max,_that.part2,_that.part2Max);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( num part1,  num part1Max,  num part2,  num part2Max)?  $default,) {final _that = this;
switch (_that) {
case _ExamParts() when $default != null:
return $default(_that.part1,_that.part1Max,_that.part2,_that.part2Max);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ExamParts implements ExamParts {
  const _ExamParts({this.part1 = 0, this.part1Max = 0, this.part2 = 0, this.part2Max = 0});
  factory _ExamParts.fromJson(Map<String, dynamic> json) => _$ExamPartsFromJson(json);

@override@JsonKey() final  num part1;
@override@JsonKey() final  num part1Max;
@override@JsonKey() final  num part2;
@override@JsonKey() final  num part2Max;

/// Create a copy of ExamParts
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ExamPartsCopyWith<_ExamParts> get copyWith => __$ExamPartsCopyWithImpl<_ExamParts>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ExamPartsToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _ExamParts&&(identical(other.part1, part1) || other.part1 == part1)&&(identical(other.part1Max, part1Max) || other.part1Max == part1Max)&&(identical(other.part2, part2) || other.part2 == part2)&&(identical(other.part2Max, part2Max) || other.part2Max == part2Max));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,part1,part1Max,part2,part2Max);
}

@override
String toString() {
    return 'ExamParts(part1: $part1, part1Max: $part1Max, part2: $part2, part2Max: $part2Max)';
}


}

/// @nodoc
abstract mixin class _$ExamPartsCopyWith<$Res> implements $ExamPartsCopyWith<$Res> {
  factory _$ExamPartsCopyWith(_ExamParts value, $Res Function(_ExamParts) _then) = __$ExamPartsCopyWithImpl;
@override @useResult
$Res call({
 num part1, num part1Max, num part2, num part2Max
});




}
/// @nodoc
class __$ExamPartsCopyWithImpl<$Res>
    implements _$ExamPartsCopyWith<$Res> {
  __$ExamPartsCopyWithImpl(this._self, this._then);

  final _ExamParts _self;
  final $Res Function(_ExamParts) _then;

/// Create a copy of ExamParts
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? part1 = null,Object? part1Max = null,Object? part2 = null,Object? part2Max = null,}) {
  return _then(_ExamParts(
part1: null == part1 ? _self.part1 : part1 // ignore: cast_nullable_to_non_nullable
as num,part1Max: null == part1Max ? _self.part1Max : part1Max // ignore: cast_nullable_to_non_nullable
as num,part2: null == part2 ? _self.part2 : part2 // ignore: cast_nullable_to_non_nullable
as num,part2Max: null == part2Max ? _self.part2Max : part2Max // ignore: cast_nullable_to_non_nullable
as num,
  ));
}


}


/// @nodoc
mixin _$WeakTopic {

 String get name; num get percent;
/// Create a copy of WeakTopic
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WeakTopicCopyWith<WeakTopic> get copyWith => _$WeakTopicCopyWithImpl<WeakTopic>(this as WeakTopic, _$identity);

  /// Serializes this WeakTopic to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as WeakTopic;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is WeakTopic&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.percent, _this.percent) || other.percent == _this.percent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as WeakTopic;
  return Object.hash(runtimeType,_this.name,_this.percent);
}

@override
String toString() {
  final _this = this as WeakTopic;
  return 'WeakTopic(name: ${_this.name}, percent: ${_this.percent})';
}


}

/// @nodoc
abstract mixin class $WeakTopicCopyWith<$Res>  {
  factory $WeakTopicCopyWith(WeakTopic value, $Res Function(WeakTopic) _then) = _$WeakTopicCopyWithImpl;
@useResult
$Res call({
 String name, num percent
});




}
/// @nodoc
class _$WeakTopicCopyWithImpl<$Res>
    implements $WeakTopicCopyWith<$Res> {
  _$WeakTopicCopyWithImpl(this._self, this._then);

  final WeakTopic _self;
  final $Res Function(WeakTopic) _then;

/// Create a copy of WeakTopic
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? percent = null,}) {
  return _then(WeakTopic(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,percent: null == percent ? _self.percent : percent // ignore: cast_nullable_to_non_nullable
as num,
  ));
}

}


/// Adds pattern-matching-related methods to [WeakTopic].
extension WeakTopicPatterns on WeakTopic {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _WeakTopic value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _WeakTopic() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _WeakTopic value)  $default,){
final _that = this;
switch (_that) {
case _WeakTopic():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _WeakTopic value)?  $default,){
final _that = this;
switch (_that) {
case _WeakTopic() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  num percent)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _WeakTopic() when $default != null:
return $default(_that.name,_that.percent);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  num percent)  $default,) {final _that = this;
switch (_that) {
case _WeakTopic():
return $default(_that.name,_that.percent);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  num percent)?  $default,) {final _that = this;
switch (_that) {
case _WeakTopic() when $default != null:
return $default(_that.name,_that.percent);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _WeakTopic implements WeakTopic {
  const _WeakTopic({required this.name, this.percent = 0});
  factory _WeakTopic.fromJson(Map<String, dynamic> json) => _$WeakTopicFromJson(json);

@override final  String name;
@override@JsonKey() final  num percent;

/// Create a copy of WeakTopic
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WeakTopicCopyWith<_WeakTopic> get copyWith => __$WeakTopicCopyWithImpl<_WeakTopic>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$WeakTopicToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _WeakTopic&&(identical(other.name, name) || other.name == name)&&(identical(other.percent, percent) || other.percent == percent));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,name,percent);
}

@override
String toString() {
    return 'WeakTopic(name: $name, percent: $percent)';
}


}

/// @nodoc
abstract mixin class _$WeakTopicCopyWith<$Res> implements $WeakTopicCopyWith<$Res> {
  factory _$WeakTopicCopyWith(_WeakTopic value, $Res Function(_WeakTopic) _then) = __$WeakTopicCopyWithImpl;
@override @useResult
$Res call({
 String name, num percent
});




}
/// @nodoc
class __$WeakTopicCopyWithImpl<$Res>
    implements _$WeakTopicCopyWith<$Res> {
  __$WeakTopicCopyWithImpl(this._self, this._then);

  final _WeakTopic _self;
  final $Res Function(_WeakTopic) _then;

/// Create a copy of WeakTopic
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? percent = null,}) {
  return _then(_WeakTopic(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,percent: null == percent ? _self.percent : percent // ignore: cast_nullable_to_non_nullable
as num,
  ));
}


}

// dart format on
