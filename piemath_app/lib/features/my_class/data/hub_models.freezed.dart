// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'hub_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$HubOverview {

 List<HubClassroom> get classrooms; AttendanceTotals get attendance; HomeworkTotals get homework; HubToday? get today;/// Хоёр ангид зэрэг суудаг сурагчийн (математик + Нийгэм) өнөөдрийн нөгөө ангийн хичээл (вэб 2026-11-12).
 List<HubToday> get todayOther; LatestMark? get latestMark;
/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HubOverviewCopyWith<HubOverview> get copyWith => _$HubOverviewCopyWithImpl<HubOverview>(this as HubOverview, _$identity);

  /// Serializes this HubOverview to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HubOverview;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HubOverview&&const DeepCollectionEquality().equals(other.classrooms, _this.classrooms)&&(identical(other.attendance, _this.attendance) || other.attendance == _this.attendance)&&(identical(other.homework, _this.homework) || other.homework == _this.homework)&&(identical(other.today, _this.today) || other.today == _this.today)&&const DeepCollectionEquality().equals(other.todayOther, _this.todayOther)&&(identical(other.latestMark, _this.latestMark) || other.latestMark == _this.latestMark));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HubOverview;
  return Object.hash(runtimeType,const DeepCollectionEquality().hash(_this.classrooms),_this.attendance,_this.homework,_this.today,const DeepCollectionEquality().hash(_this.todayOther),_this.latestMark);
}

@override
String toString() {
  final _this = this as HubOverview;
  return 'HubOverview(classrooms: ${_this.classrooms}, attendance: ${_this.attendance}, homework: ${_this.homework}, today: ${_this.today}, todayOther: ${_this.todayOther}, latestMark: ${_this.latestMark})';
}


}

/// @nodoc
abstract mixin class $HubOverviewCopyWith<$Res>  {
  factory $HubOverviewCopyWith(HubOverview value, $Res Function(HubOverview) _then) = _$HubOverviewCopyWithImpl;
@useResult
$Res call({
 List<HubClassroom> classrooms, AttendanceTotals attendance, HomeworkTotals homework, HubToday? today, List<HubToday> todayOther, LatestMark? latestMark
});


$AttendanceTotalsCopyWith<$Res> get attendance;$HomeworkTotalsCopyWith<$Res> get homework;$HubTodayCopyWith<$Res>? get today;$LatestMarkCopyWith<$Res>? get latestMark;

}
/// @nodoc
class _$HubOverviewCopyWithImpl<$Res>
    implements $HubOverviewCopyWith<$Res> {
  _$HubOverviewCopyWithImpl(this._self, this._then);

  final HubOverview _self;
  final $Res Function(HubOverview) _then;

/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? classrooms = null,Object? attendance = null,Object? homework = null,Object? today = freezed,Object? todayOther = null,Object? latestMark = freezed,}) {
  return _then(HubOverview(
classrooms: null == classrooms ? _self.classrooms : classrooms // ignore: cast_nullable_to_non_nullable
as List<HubClassroom>,attendance: null == attendance ? _self.attendance : attendance // ignore: cast_nullable_to_non_nullable
as AttendanceTotals,homework: null == homework ? _self.homework : homework // ignore: cast_nullable_to_non_nullable
as HomeworkTotals,today: freezed == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as HubToday?,todayOther: null == todayOther ? _self.todayOther : todayOther // ignore: cast_nullable_to_non_nullable
as List<HubToday>,latestMark: freezed == latestMark ? _self.latestMark : latestMark // ignore: cast_nullable_to_non_nullable
as LatestMark?,
  ));
}
/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AttendanceTotalsCopyWith<$Res> get attendance {
  
  return $AttendanceTotalsCopyWith<$Res>(_self.attendance, (value) {
    return _then(_self.copyWith(attendance: value));
  });
}/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HomeworkTotalsCopyWith<$Res> get homework {
  
  return $HomeworkTotalsCopyWith<$Res>(_self.homework, (value) {
    return _then(_self.copyWith(homework: value));
  });
}/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HubTodayCopyWith<$Res>? get today {
    if (_self.today == null) {
    return null;
  }

  return $HubTodayCopyWith<$Res>(_self.today!, (value) {
    return _then(_self.copyWith(today: value));
  });
}/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LatestMarkCopyWith<$Res>? get latestMark {
    if (_self.latestMark == null) {
    return null;
  }

  return $LatestMarkCopyWith<$Res>(_self.latestMark!, (value) {
    return _then(_self.copyWith(latestMark: value));
  });
}
}


/// Adds pattern-matching-related methods to [HubOverview].
extension HubOverviewPatterns on HubOverview {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HubOverview value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HubOverview() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HubOverview value)  $default,){
final _that = this;
switch (_that) {
case _HubOverview():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HubOverview value)?  $default,){
final _that = this;
switch (_that) {
case _HubOverview() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<HubClassroom> classrooms,  AttendanceTotals attendance,  HomeworkTotals homework,  HubToday? today,  List<HubToday> todayOther,  LatestMark? latestMark)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HubOverview() when $default != null:
return $default(_that.classrooms,_that.attendance,_that.homework,_that.today,_that.todayOther,_that.latestMark);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<HubClassroom> classrooms,  AttendanceTotals attendance,  HomeworkTotals homework,  HubToday? today,  List<HubToday> todayOther,  LatestMark? latestMark)  $default,) {final _that = this;
switch (_that) {
case _HubOverview():
return $default(_that.classrooms,_that.attendance,_that.homework,_that.today,_that.todayOther,_that.latestMark);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<HubClassroom> classrooms,  AttendanceTotals attendance,  HomeworkTotals homework,  HubToday? today,  List<HubToday> todayOther,  LatestMark? latestMark)?  $default,) {final _that = this;
switch (_that) {
case _HubOverview() when $default != null:
return $default(_that.classrooms,_that.attendance,_that.homework,_that.today,_that.todayOther,_that.latestMark);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HubOverview implements HubOverview {
  const _HubOverview({ List<HubClassroom> classrooms = const <HubClassroom>[], required this.attendance, required this.homework, this.today,  List<HubToday> todayOther = const <HubToday>[], this.latestMark}): _classrooms = classrooms,_todayOther = todayOther;
  factory _HubOverview.fromJson(Map<String, dynamic> json) => _$HubOverviewFromJson(json);

 final  List<HubClassroom> _classrooms;
@override@JsonKey() List<HubClassroom> get classrooms {
  if (_classrooms is EqualUnmodifiableListView) return _classrooms;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_classrooms);
}

@override final  AttendanceTotals attendance;
@override final  HomeworkTotals homework;
@override final  HubToday? today;
/// Хоёр ангид зэрэг суудаг сурагчийн (математик + Нийгэм) өнөөдрийн нөгөө ангийн хичээл (вэб 2026-11-12).
 final  List<HubToday> _todayOther;
/// Хоёр ангид зэрэг суудаг сурагчийн (математик + Нийгэм) өнөөдрийн нөгөө ангийн хичээл (вэб 2026-11-12).
@override@JsonKey() List<HubToday> get todayOther {
  if (_todayOther is EqualUnmodifiableListView) return _todayOther;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_todayOther);
}

@override final  LatestMark? latestMark;

/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HubOverviewCopyWith<_HubOverview> get copyWith => __$HubOverviewCopyWithImpl<_HubOverview>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HubOverviewToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HubOverview&&const DeepCollectionEquality().equals(other.classrooms, _classrooms)&&(identical(other.attendance, attendance) || other.attendance == attendance)&&(identical(other.homework, homework) || other.homework == homework)&&(identical(other.today, today) || other.today == today)&&const DeepCollectionEquality().equals(other.todayOther, _todayOther)&&(identical(other.latestMark, latestMark) || other.latestMark == latestMark));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,const DeepCollectionEquality().hash(_classrooms),attendance,homework,today,const DeepCollectionEquality().hash(_todayOther),latestMark);
}

@override
String toString() {
    return 'HubOverview(classrooms: $classrooms, attendance: $attendance, homework: $homework, today: $today, todayOther: $todayOther, latestMark: $latestMark)';
}


}

/// @nodoc
abstract mixin class _$HubOverviewCopyWith<$Res> implements $HubOverviewCopyWith<$Res> {
  factory _$HubOverviewCopyWith(_HubOverview value, $Res Function(_HubOverview) _then) = __$HubOverviewCopyWithImpl;
@override @useResult
$Res call({
 List<HubClassroom> classrooms, AttendanceTotals attendance, HomeworkTotals homework, HubToday? today, List<HubToday> todayOther, LatestMark? latestMark
});


@override $AttendanceTotalsCopyWith<$Res> get attendance;@override $HomeworkTotalsCopyWith<$Res> get homework;@override $HubTodayCopyWith<$Res>? get today;@override $LatestMarkCopyWith<$Res>? get latestMark;

}
/// @nodoc
class __$HubOverviewCopyWithImpl<$Res>
    implements _$HubOverviewCopyWith<$Res> {
  __$HubOverviewCopyWithImpl(this._self, this._then);

  final _HubOverview _self;
  final $Res Function(_HubOverview) _then;

/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? classrooms = null,Object? attendance = null,Object? homework = null,Object? today = freezed,Object? todayOther = null,Object? latestMark = freezed,}) {
  return _then(_HubOverview(
classrooms: null == classrooms ? _self._classrooms : classrooms // ignore: cast_nullable_to_non_nullable
as List<HubClassroom>,attendance: null == attendance ? _self.attendance : attendance // ignore: cast_nullable_to_non_nullable
as AttendanceTotals,homework: null == homework ? _self.homework : homework // ignore: cast_nullable_to_non_nullable
as HomeworkTotals,today: freezed == today ? _self.today : today // ignore: cast_nullable_to_non_nullable
as HubToday?,todayOther: null == todayOther ? _self._todayOther : todayOther // ignore: cast_nullable_to_non_nullable
as List<HubToday>,latestMark: freezed == latestMark ? _self.latestMark : latestMark // ignore: cast_nullable_to_non_nullable
as LatestMark?,
  ));
}

/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$AttendanceTotalsCopyWith<$Res> get attendance {
  
  return $AttendanceTotalsCopyWith<$Res>(_self.attendance, (value) {
    return _then(_self.copyWith(attendance: value));
  });
}/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HomeworkTotalsCopyWith<$Res> get homework {
  
  return $HomeworkTotalsCopyWith<$Res>(_self.homework, (value) {
    return _then(_self.copyWith(homework: value));
  });
}/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HubTodayCopyWith<$Res>? get today {
    if (_self.today == null) {
    return null;
  }

  return $HubTodayCopyWith<$Res>(_self.today!, (value) {
    return _then(_self.copyWith(today: value));
  });
}/// Create a copy of HubOverview
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$LatestMarkCopyWith<$Res>? get latestMark {
    if (_self.latestMark == null) {
    return null;
  }

  return $LatestMarkCopyWith<$Res>(_self.latestMark!, (value) {
    return _then(_self.copyWith(latestMark: value));
  });
}
}


/// @nodoc
mixin _$HubClassroom {

 String get id; String get name;
/// Create a copy of HubClassroom
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HubClassroomCopyWith<HubClassroom> get copyWith => _$HubClassroomCopyWithImpl<HubClassroom>(this as HubClassroom, _$identity);

  /// Serializes this HubClassroom to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HubClassroom;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HubClassroom&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HubClassroom;
  return Object.hash(runtimeType,_this.id,_this.name);
}

@override
String toString() {
  final _this = this as HubClassroom;
  return 'HubClassroom(id: ${_this.id}, name: ${_this.name})';
}


}

/// @nodoc
abstract mixin class $HubClassroomCopyWith<$Res>  {
  factory $HubClassroomCopyWith(HubClassroom value, $Res Function(HubClassroom) _then) = _$HubClassroomCopyWithImpl;
@useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class _$HubClassroomCopyWithImpl<$Res>
    implements $HubClassroomCopyWith<$Res> {
  _$HubClassroomCopyWithImpl(this._self, this._then);

  final HubClassroom _self;
  final $Res Function(HubClassroom) _then;

/// Create a copy of HubClassroom
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,}) {
  return _then(HubClassroom(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [HubClassroom].
extension HubClassroomPatterns on HubClassroom {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HubClassroom value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HubClassroom() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HubClassroom value)  $default,){
final _that = this;
switch (_that) {
case _HubClassroom():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HubClassroom value)?  $default,){
final _that = this;
switch (_that) {
case _HubClassroom() when $default != null:
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
case _HubClassroom() when $default != null:
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
case _HubClassroom():
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
case _HubClassroom() when $default != null:
return $default(_that.id,_that.name);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HubClassroom implements HubClassroom {
  const _HubClassroom({required this.id, required this.name});
  factory _HubClassroom.fromJson(Map<String, dynamic> json) => _$HubClassroomFromJson(json);

@override final  String id;
@override final  String name;

/// Create a copy of HubClassroom
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HubClassroomCopyWith<_HubClassroom> get copyWith => __$HubClassroomCopyWithImpl<_HubClassroom>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HubClassroomToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HubClassroom&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name);
}

@override
String toString() {
    return 'HubClassroom(id: $id, name: $name)';
}


}

/// @nodoc
abstract mixin class _$HubClassroomCopyWith<$Res> implements $HubClassroomCopyWith<$Res> {
  factory _$HubClassroomCopyWith(_HubClassroom value, $Res Function(_HubClassroom) _then) = __$HubClassroomCopyWithImpl;
@override @useResult
$Res call({
 String id, String name
});




}
/// @nodoc
class __$HubClassroomCopyWithImpl<$Res>
    implements _$HubClassroomCopyWith<$Res> {
  __$HubClassroomCopyWithImpl(this._self, this._then);

  final _HubClassroom _self;
  final $Res Function(_HubClassroom) _then;

/// Create a copy of HubClassroom
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,}) {
  return _then(_HubClassroom(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$AttendanceTotals {

 int get total;@JsonKey(name: 'PRESENT') int get present;@JsonKey(name: 'LATE') int get late;@JsonKey(name: 'ABSENT') int get absent;@JsonKey(name: 'EXCUSED') int get excused; int get rate;
/// Create a copy of AttendanceTotals
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AttendanceTotalsCopyWith<AttendanceTotals> get copyWith => _$AttendanceTotalsCopyWithImpl<AttendanceTotals>(this as AttendanceTotals, _$identity);

  /// Serializes this AttendanceTotals to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as AttendanceTotals;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AttendanceTotals&&(identical(other.total, _this.total) || other.total == _this.total)&&(identical(other.present, _this.present) || other.present == _this.present)&&(identical(other.late, _this.late) || other.late == _this.late)&&(identical(other.absent, _this.absent) || other.absent == _this.absent)&&(identical(other.excused, _this.excused) || other.excused == _this.excused)&&(identical(other.rate, _this.rate) || other.rate == _this.rate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as AttendanceTotals;
  return Object.hash(runtimeType,_this.total,_this.present,_this.late,_this.absent,_this.excused,_this.rate);
}

@override
String toString() {
  final _this = this as AttendanceTotals;
  return 'AttendanceTotals(total: ${_this.total}, present: ${_this.present}, late: ${_this.late}, absent: ${_this.absent}, excused: ${_this.excused}, rate: ${_this.rate})';
}


}

/// @nodoc
abstract mixin class $AttendanceTotalsCopyWith<$Res>  {
  factory $AttendanceTotalsCopyWith(AttendanceTotals value, $Res Function(AttendanceTotals) _then) = _$AttendanceTotalsCopyWithImpl;
@useResult
$Res call({
 int total,@JsonKey(name: 'PRESENT') int present,@JsonKey(name: 'LATE') int late,@JsonKey(name: 'ABSENT') int absent,@JsonKey(name: 'EXCUSED') int excused, int rate
});




}
/// @nodoc
class _$AttendanceTotalsCopyWithImpl<$Res>
    implements $AttendanceTotalsCopyWith<$Res> {
  _$AttendanceTotalsCopyWithImpl(this._self, this._then);

  final AttendanceTotals _self;
  final $Res Function(AttendanceTotals) _then;

/// Create a copy of AttendanceTotals
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? total = null,Object? present = null,Object? late = null,Object? absent = null,Object? excused = null,Object? rate = null,}) {
  return _then(AttendanceTotals(
total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,present: null == present ? _self.present : present // ignore: cast_nullable_to_non_nullable
as int,late: null == late ? _self.late : late // ignore: cast_nullable_to_non_nullable
as int,absent: null == absent ? _self.absent : absent // ignore: cast_nullable_to_non_nullable
as int,excused: null == excused ? _self.excused : excused // ignore: cast_nullable_to_non_nullable
as int,rate: null == rate ? _self.rate : rate // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [AttendanceTotals].
extension AttendanceTotalsPatterns on AttendanceTotals {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AttendanceTotals value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AttendanceTotals() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AttendanceTotals value)  $default,){
final _that = this;
switch (_that) {
case _AttendanceTotals():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AttendanceTotals value)?  $default,){
final _that = this;
switch (_that) {
case _AttendanceTotals() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int total, @JsonKey(name: 'PRESENT')  int present, @JsonKey(name: 'LATE')  int late, @JsonKey(name: 'ABSENT')  int absent, @JsonKey(name: 'EXCUSED')  int excused,  int rate)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AttendanceTotals() when $default != null:
return $default(_that.total,_that.present,_that.late,_that.absent,_that.excused,_that.rate);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int total, @JsonKey(name: 'PRESENT')  int present, @JsonKey(name: 'LATE')  int late, @JsonKey(name: 'ABSENT')  int absent, @JsonKey(name: 'EXCUSED')  int excused,  int rate)  $default,) {final _that = this;
switch (_that) {
case _AttendanceTotals():
return $default(_that.total,_that.present,_that.late,_that.absent,_that.excused,_that.rate);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int total, @JsonKey(name: 'PRESENT')  int present, @JsonKey(name: 'LATE')  int late, @JsonKey(name: 'ABSENT')  int absent, @JsonKey(name: 'EXCUSED')  int excused,  int rate)?  $default,) {final _that = this;
switch (_that) {
case _AttendanceTotals() when $default != null:
return $default(_that.total,_that.present,_that.late,_that.absent,_that.excused,_that.rate);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AttendanceTotals extends AttendanceTotals {
  const _AttendanceTotals({this.total = 0, @JsonKey(name: 'PRESENT') this.present = 0, @JsonKey(name: 'LATE') this.late = 0, @JsonKey(name: 'ABSENT') this.absent = 0, @JsonKey(name: 'EXCUSED') this.excused = 0, this.rate = 0}): super._();
  factory _AttendanceTotals.fromJson(Map<String, dynamic> json) => _$AttendanceTotalsFromJson(json);

@override@JsonKey() final  int total;
@override@JsonKey(name: 'PRESENT') final  int present;
@override@JsonKey(name: 'LATE') final  int late;
@override@JsonKey(name: 'ABSENT') final  int absent;
@override@JsonKey(name: 'EXCUSED') final  int excused;
@override@JsonKey() final  int rate;

/// Create a copy of AttendanceTotals
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AttendanceTotalsCopyWith<_AttendanceTotals> get copyWith => __$AttendanceTotalsCopyWithImpl<_AttendanceTotals>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AttendanceTotalsToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _AttendanceTotals&&(identical(other.total, total) || other.total == total)&&(identical(other.present, present) || other.present == present)&&(identical(other.late, late) || other.late == late)&&(identical(other.absent, absent) || other.absent == absent)&&(identical(other.excused, excused) || other.excused == excused)&&(identical(other.rate, rate) || other.rate == rate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,total,present,late,absent,excused,rate);
}

@override
String toString() {
    return 'AttendanceTotals(total: $total, present: $present, late: $late, absent: $absent, excused: $excused, rate: $rate)';
}


}

/// @nodoc
abstract mixin class _$AttendanceTotalsCopyWith<$Res> implements $AttendanceTotalsCopyWith<$Res> {
  factory _$AttendanceTotalsCopyWith(_AttendanceTotals value, $Res Function(_AttendanceTotals) _then) = __$AttendanceTotalsCopyWithImpl;
@override @useResult
$Res call({
 int total,@JsonKey(name: 'PRESENT') int present,@JsonKey(name: 'LATE') int late,@JsonKey(name: 'ABSENT') int absent,@JsonKey(name: 'EXCUSED') int excused, int rate
});




}
/// @nodoc
class __$AttendanceTotalsCopyWithImpl<$Res>
    implements _$AttendanceTotalsCopyWith<$Res> {
  __$AttendanceTotalsCopyWithImpl(this._self, this._then);

  final _AttendanceTotals _self;
  final $Res Function(_AttendanceTotals) _then;

/// Create a copy of AttendanceTotals
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? total = null,Object? present = null,Object? late = null,Object? absent = null,Object? excused = null,Object? rate = null,}) {
  return _then(_AttendanceTotals(
total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,present: null == present ? _self.present : present // ignore: cast_nullable_to_non_nullable
as int,late: null == late ? _self.late : late // ignore: cast_nullable_to_non_nullable
as int,absent: null == absent ? _self.absent : absent // ignore: cast_nullable_to_non_nullable
as int,excused: null == excused ? _self.excused : excused // ignore: cast_nullable_to_non_nullable
as int,rate: null == rate ? _self.rate : rate // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$HomeworkTotals {

 int get total;@JsonKey(name: 'DONE') int get done;@JsonKey(name: 'PARTIAL') int get partial;@JsonKey(name: 'NOT_DONE') int get notDone; int get rate;
/// Create a copy of HomeworkTotals
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HomeworkTotalsCopyWith<HomeworkTotals> get copyWith => _$HomeworkTotalsCopyWithImpl<HomeworkTotals>(this as HomeworkTotals, _$identity);

  /// Serializes this HomeworkTotals to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HomeworkTotals;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HomeworkTotals&&(identical(other.total, _this.total) || other.total == _this.total)&&(identical(other.done, _this.done) || other.done == _this.done)&&(identical(other.partial, _this.partial) || other.partial == _this.partial)&&(identical(other.notDone, _this.notDone) || other.notDone == _this.notDone)&&(identical(other.rate, _this.rate) || other.rate == _this.rate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HomeworkTotals;
  return Object.hash(runtimeType,_this.total,_this.done,_this.partial,_this.notDone,_this.rate);
}

@override
String toString() {
  final _this = this as HomeworkTotals;
  return 'HomeworkTotals(total: ${_this.total}, done: ${_this.done}, partial: ${_this.partial}, notDone: ${_this.notDone}, rate: ${_this.rate})';
}


}

/// @nodoc
abstract mixin class $HomeworkTotalsCopyWith<$Res>  {
  factory $HomeworkTotalsCopyWith(HomeworkTotals value, $Res Function(HomeworkTotals) _then) = _$HomeworkTotalsCopyWithImpl;
@useResult
$Res call({
 int total,@JsonKey(name: 'DONE') int done,@JsonKey(name: 'PARTIAL') int partial,@JsonKey(name: 'NOT_DONE') int notDone, int rate
});




}
/// @nodoc
class _$HomeworkTotalsCopyWithImpl<$Res>
    implements $HomeworkTotalsCopyWith<$Res> {
  _$HomeworkTotalsCopyWithImpl(this._self, this._then);

  final HomeworkTotals _self;
  final $Res Function(HomeworkTotals) _then;

/// Create a copy of HomeworkTotals
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? total = null,Object? done = null,Object? partial = null,Object? notDone = null,Object? rate = null,}) {
  return _then(HomeworkTotals(
total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,done: null == done ? _self.done : done // ignore: cast_nullable_to_non_nullable
as int,partial: null == partial ? _self.partial : partial // ignore: cast_nullable_to_non_nullable
as int,notDone: null == notDone ? _self.notDone : notDone // ignore: cast_nullable_to_non_nullable
as int,rate: null == rate ? _self.rate : rate // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [HomeworkTotals].
extension HomeworkTotalsPatterns on HomeworkTotals {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HomeworkTotals value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HomeworkTotals() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HomeworkTotals value)  $default,){
final _that = this;
switch (_that) {
case _HomeworkTotals():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HomeworkTotals value)?  $default,){
final _that = this;
switch (_that) {
case _HomeworkTotals() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int total, @JsonKey(name: 'DONE')  int done, @JsonKey(name: 'PARTIAL')  int partial, @JsonKey(name: 'NOT_DONE')  int notDone,  int rate)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HomeworkTotals() when $default != null:
return $default(_that.total,_that.done,_that.partial,_that.notDone,_that.rate);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int total, @JsonKey(name: 'DONE')  int done, @JsonKey(name: 'PARTIAL')  int partial, @JsonKey(name: 'NOT_DONE')  int notDone,  int rate)  $default,) {final _that = this;
switch (_that) {
case _HomeworkTotals():
return $default(_that.total,_that.done,_that.partial,_that.notDone,_that.rate);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int total, @JsonKey(name: 'DONE')  int done, @JsonKey(name: 'PARTIAL')  int partial, @JsonKey(name: 'NOT_DONE')  int notDone,  int rate)?  $default,) {final _that = this;
switch (_that) {
case _HomeworkTotals() when $default != null:
return $default(_that.total,_that.done,_that.partial,_that.notDone,_that.rate);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HomeworkTotals extends HomeworkTotals {
  const _HomeworkTotals({this.total = 0, @JsonKey(name: 'DONE') this.done = 0, @JsonKey(name: 'PARTIAL') this.partial = 0, @JsonKey(name: 'NOT_DONE') this.notDone = 0, this.rate = 0}): super._();
  factory _HomeworkTotals.fromJson(Map<String, dynamic> json) => _$HomeworkTotalsFromJson(json);

@override@JsonKey() final  int total;
@override@JsonKey(name: 'DONE') final  int done;
@override@JsonKey(name: 'PARTIAL') final  int partial;
@override@JsonKey(name: 'NOT_DONE') final  int notDone;
@override@JsonKey() final  int rate;

/// Create a copy of HomeworkTotals
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HomeworkTotalsCopyWith<_HomeworkTotals> get copyWith => __$HomeworkTotalsCopyWithImpl<_HomeworkTotals>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HomeworkTotalsToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HomeworkTotals&&(identical(other.total, total) || other.total == total)&&(identical(other.done, done) || other.done == done)&&(identical(other.partial, partial) || other.partial == partial)&&(identical(other.notDone, notDone) || other.notDone == notDone)&&(identical(other.rate, rate) || other.rate == rate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,total,done,partial,notDone,rate);
}

@override
String toString() {
    return 'HomeworkTotals(total: $total, done: $done, partial: $partial, notDone: $notDone, rate: $rate)';
}


}

/// @nodoc
abstract mixin class _$HomeworkTotalsCopyWith<$Res> implements $HomeworkTotalsCopyWith<$Res> {
  factory _$HomeworkTotalsCopyWith(_HomeworkTotals value, $Res Function(_HomeworkTotals) _then) = __$HomeworkTotalsCopyWithImpl;
@override @useResult
$Res call({
 int total,@JsonKey(name: 'DONE') int done,@JsonKey(name: 'PARTIAL') int partial,@JsonKey(name: 'NOT_DONE') int notDone, int rate
});




}
/// @nodoc
class __$HomeworkTotalsCopyWithImpl<$Res>
    implements _$HomeworkTotalsCopyWith<$Res> {
  __$HomeworkTotalsCopyWithImpl(this._self, this._then);

  final _HomeworkTotals _self;
  final $Res Function(_HomeworkTotals) _then;

/// Create a copy of HomeworkTotals
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? total = null,Object? done = null,Object? partial = null,Object? notDone = null,Object? rate = null,}) {
  return _then(_HomeworkTotals(
total: null == total ? _self.total : total // ignore: cast_nullable_to_non_nullable
as int,done: null == done ? _self.done : done // ignore: cast_nullable_to_non_nullable
as int,partial: null == partial ? _self.partial : partial // ignore: cast_nullable_to_non_nullable
as int,notDone: null == notDone ? _self.notDone : notDone // ignore: cast_nullable_to_non_nullable
as int,rate: null == rate ? _self.rate : rate // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$HubToday {

 String get classroomId; String get classroomName; String get date; int get startMinute; int get endMinute; String? get room; String? get topic;
/// Create a copy of HubToday
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HubTodayCopyWith<HubToday> get copyWith => _$HubTodayCopyWithImpl<HubToday>(this as HubToday, _$identity);

  /// Serializes this HubToday to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HubToday;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HubToday&&(identical(other.classroomId, _this.classroomId) || other.classroomId == _this.classroomId)&&(identical(other.classroomName, _this.classroomName) || other.classroomName == _this.classroomName)&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.startMinute, _this.startMinute) || other.startMinute == _this.startMinute)&&(identical(other.endMinute, _this.endMinute) || other.endMinute == _this.endMinute)&&(identical(other.room, _this.room) || other.room == _this.room)&&(identical(other.topic, _this.topic) || other.topic == _this.topic));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HubToday;
  return Object.hash(runtimeType,_this.classroomId,_this.classroomName,_this.date,_this.startMinute,_this.endMinute,_this.room,_this.topic);
}

@override
String toString() {
  final _this = this as HubToday;
  return 'HubToday(classroomId: ${_this.classroomId}, classroomName: ${_this.classroomName}, date: ${_this.date}, startMinute: ${_this.startMinute}, endMinute: ${_this.endMinute}, room: ${_this.room}, topic: ${_this.topic})';
}


}

/// @nodoc
abstract mixin class $HubTodayCopyWith<$Res>  {
  factory $HubTodayCopyWith(HubToday value, $Res Function(HubToday) _then) = _$HubTodayCopyWithImpl;
@useResult
$Res call({
 String classroomId, String classroomName, String date, int startMinute, int endMinute, String? room, String? topic
});




}
/// @nodoc
class _$HubTodayCopyWithImpl<$Res>
    implements $HubTodayCopyWith<$Res> {
  _$HubTodayCopyWithImpl(this._self, this._then);

  final HubToday _self;
  final $Res Function(HubToday) _then;

/// Create a copy of HubToday
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? classroomId = null,Object? classroomName = null,Object? date = null,Object? startMinute = null,Object? endMinute = null,Object? room = freezed,Object? topic = freezed,}) {
  return _then(HubToday(
classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,topic: freezed == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [HubToday].
extension HubTodayPatterns on HubToday {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HubToday value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HubToday() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HubToday value)  $default,){
final _that = this;
switch (_that) {
case _HubToday():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HubToday value)?  $default,){
final _that = this;
switch (_that) {
case _HubToday() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String classroomId,  String classroomName,  String date,  int startMinute,  int endMinute,  String? room,  String? topic)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HubToday() when $default != null:
return $default(_that.classroomId,_that.classroomName,_that.date,_that.startMinute,_that.endMinute,_that.room,_that.topic);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String classroomId,  String classroomName,  String date,  int startMinute,  int endMinute,  String? room,  String? topic)  $default,) {final _that = this;
switch (_that) {
case _HubToday():
return $default(_that.classroomId,_that.classroomName,_that.date,_that.startMinute,_that.endMinute,_that.room,_that.topic);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String classroomId,  String classroomName,  String date,  int startMinute,  int endMinute,  String? room,  String? topic)?  $default,) {final _that = this;
switch (_that) {
case _HubToday() when $default != null:
return $default(_that.classroomId,_that.classroomName,_that.date,_that.startMinute,_that.endMinute,_that.room,_that.topic);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HubToday implements HubToday {
  const _HubToday({required this.classroomId, required this.classroomName, required this.date, required this.startMinute, required this.endMinute, this.room, this.topic});
  factory _HubToday.fromJson(Map<String, dynamic> json) => _$HubTodayFromJson(json);

@override final  String classroomId;
@override final  String classroomName;
@override final  String date;
@override final  int startMinute;
@override final  int endMinute;
@override final  String? room;
@override final  String? topic;

/// Create a copy of HubToday
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HubTodayCopyWith<_HubToday> get copyWith => __$HubTodayCopyWithImpl<_HubToday>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HubTodayToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HubToday&&(identical(other.classroomId, classroomId) || other.classroomId == classroomId)&&(identical(other.classroomName, classroomName) || other.classroomName == classroomName)&&(identical(other.date, date) || other.date == date)&&(identical(other.startMinute, startMinute) || other.startMinute == startMinute)&&(identical(other.endMinute, endMinute) || other.endMinute == endMinute)&&(identical(other.room, room) || other.room == room)&&(identical(other.topic, topic) || other.topic == topic));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,classroomId,classroomName,date,startMinute,endMinute,room,topic);
}

@override
String toString() {
    return 'HubToday(classroomId: $classroomId, classroomName: $classroomName, date: $date, startMinute: $startMinute, endMinute: $endMinute, room: $room, topic: $topic)';
}


}

/// @nodoc
abstract mixin class _$HubTodayCopyWith<$Res> implements $HubTodayCopyWith<$Res> {
  factory _$HubTodayCopyWith(_HubToday value, $Res Function(_HubToday) _then) = __$HubTodayCopyWithImpl;
@override @useResult
$Res call({
 String classroomId, String classroomName, String date, int startMinute, int endMinute, String? room, String? topic
});




}
/// @nodoc
class __$HubTodayCopyWithImpl<$Res>
    implements _$HubTodayCopyWith<$Res> {
  __$HubTodayCopyWithImpl(this._self, this._then);

  final _HubToday _self;
  final $Res Function(_HubToday) _then;

/// Create a copy of HubToday
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? classroomId = null,Object? classroomName = null,Object? date = null,Object? startMinute = null,Object? endMinute = null,Object? room = freezed,Object? topic = freezed,}) {
  return _then(_HubToday(
classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,startMinute: null == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int,endMinute: null == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,topic: freezed == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$LatestMark {

 String get date;@JsonKey(unknownEnumValue: _nullEnum) HomeworkStatus? get status; String? get comment; String? get classroomId; String? get lessonDate;
/// Create a copy of LatestMark
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LatestMarkCopyWith<LatestMark> get copyWith => _$LatestMarkCopyWithImpl<LatestMark>(this as LatestMark, _$identity);

  /// Serializes this LatestMark to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as LatestMark;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LatestMark&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.comment, _this.comment) || other.comment == _this.comment)&&(identical(other.classroomId, _this.classroomId) || other.classroomId == _this.classroomId)&&(identical(other.lessonDate, _this.lessonDate) || other.lessonDate == _this.lessonDate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as LatestMark;
  return Object.hash(runtimeType,_this.date,_this.status,_this.comment,_this.classroomId,_this.lessonDate);
}

@override
String toString() {
  final _this = this as LatestMark;
  return 'LatestMark(date: ${_this.date}, status: ${_this.status}, comment: ${_this.comment}, classroomId: ${_this.classroomId}, lessonDate: ${_this.lessonDate})';
}


}

/// @nodoc
abstract mixin class $LatestMarkCopyWith<$Res>  {
  factory $LatestMarkCopyWith(LatestMark value, $Res Function(LatestMark) _then) = _$LatestMarkCopyWithImpl;
@useResult
$Res call({
 String date,@JsonKey(unknownEnumValue: _nullEnum) HomeworkStatus? status, String? comment, String? classroomId, String? lessonDate
});




}
/// @nodoc
class _$LatestMarkCopyWithImpl<$Res>
    implements $LatestMarkCopyWith<$Res> {
  _$LatestMarkCopyWithImpl(this._self, this._then);

  final LatestMark _self;
  final $Res Function(LatestMark) _then;

/// Create a copy of LatestMark
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? status = freezed,Object? comment = freezed,Object? classroomId = freezed,Object? lessonDate = freezed,}) {
  return _then(LatestMark(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as HomeworkStatus?,comment: freezed == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String?,classroomId: freezed == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String?,lessonDate: freezed == lessonDate ? _self.lessonDate : lessonDate // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [LatestMark].
extension LatestMarkPatterns on LatestMark {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LatestMark value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LatestMark() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LatestMark value)  $default,){
final _that = this;
switch (_that) {
case _LatestMark():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LatestMark value)?  $default,){
final _that = this;
switch (_that) {
case _LatestMark() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date, @JsonKey(unknownEnumValue: _nullEnum)  HomeworkStatus? status,  String? comment,  String? classroomId,  String? lessonDate)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LatestMark() when $default != null:
return $default(_that.date,_that.status,_that.comment,_that.classroomId,_that.lessonDate);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date, @JsonKey(unknownEnumValue: _nullEnum)  HomeworkStatus? status,  String? comment,  String? classroomId,  String? lessonDate)  $default,) {final _that = this;
switch (_that) {
case _LatestMark():
return $default(_that.date,_that.status,_that.comment,_that.classroomId,_that.lessonDate);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date, @JsonKey(unknownEnumValue: _nullEnum)  HomeworkStatus? status,  String? comment,  String? classroomId,  String? lessonDate)?  $default,) {final _that = this;
switch (_that) {
case _LatestMark() when $default != null:
return $default(_that.date,_that.status,_that.comment,_that.classroomId,_that.lessonDate);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LatestMark implements LatestMark {
  const _LatestMark({required this.date, @JsonKey(unknownEnumValue: _nullEnum) this.status, this.comment, this.classroomId, this.lessonDate});
  factory _LatestMark.fromJson(Map<String, dynamic> json) => _$LatestMarkFromJson(json);

@override final  String date;
@override@JsonKey(unknownEnumValue: _nullEnum) final  HomeworkStatus? status;
@override final  String? comment;
@override final  String? classroomId;
@override final  String? lessonDate;

/// Create a copy of LatestMark
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LatestMarkCopyWith<_LatestMark> get copyWith => __$LatestMarkCopyWithImpl<_LatestMark>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LatestMarkToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _LatestMark&&(identical(other.date, date) || other.date == date)&&(identical(other.status, status) || other.status == status)&&(identical(other.comment, comment) || other.comment == comment)&&(identical(other.classroomId, classroomId) || other.classroomId == classroomId)&&(identical(other.lessonDate, lessonDate) || other.lessonDate == lessonDate));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,status,comment,classroomId,lessonDate);
}

@override
String toString() {
    return 'LatestMark(date: $date, status: $status, comment: $comment, classroomId: $classroomId, lessonDate: $lessonDate)';
}


}

/// @nodoc
abstract mixin class _$LatestMarkCopyWith<$Res> implements $LatestMarkCopyWith<$Res> {
  factory _$LatestMarkCopyWith(_LatestMark value, $Res Function(_LatestMark) _then) = __$LatestMarkCopyWithImpl;
@override @useResult
$Res call({
 String date,@JsonKey(unknownEnumValue: _nullEnum) HomeworkStatus? status, String? comment, String? classroomId, String? lessonDate
});




}
/// @nodoc
class __$LatestMarkCopyWithImpl<$Res>
    implements _$LatestMarkCopyWith<$Res> {
  __$LatestMarkCopyWithImpl(this._self, this._then);

  final _LatestMark _self;
  final $Res Function(_LatestMark) _then;

/// Create a copy of LatestMark
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? status = freezed,Object? comment = freezed,Object? classroomId = freezed,Object? lessonDate = freezed,}) {
  return _then(_LatestMark(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as HomeworkStatus?,comment: freezed == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String?,classroomId: freezed == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String?,lessonDate: freezed == lessonDate ? _self.lessonDate : lessonDate // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$HubDays {

 String get month; String? get prevMonth; String? get nextMonth; List<HubDay> get days;
/// Create a copy of HubDays
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HubDaysCopyWith<HubDays> get copyWith => _$HubDaysCopyWithImpl<HubDays>(this as HubDays, _$identity);

  /// Serializes this HubDays to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HubDays;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HubDays&&(identical(other.month, _this.month) || other.month == _this.month)&&(identical(other.prevMonth, _this.prevMonth) || other.prevMonth == _this.prevMonth)&&(identical(other.nextMonth, _this.nextMonth) || other.nextMonth == _this.nextMonth)&&const DeepCollectionEquality().equals(other.days, _this.days));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HubDays;
  return Object.hash(runtimeType,_this.month,_this.prevMonth,_this.nextMonth,const DeepCollectionEquality().hash(_this.days));
}

@override
String toString() {
  final _this = this as HubDays;
  return 'HubDays(month: ${_this.month}, prevMonth: ${_this.prevMonth}, nextMonth: ${_this.nextMonth}, days: ${_this.days})';
}


}

/// @nodoc
abstract mixin class $HubDaysCopyWith<$Res>  {
  factory $HubDaysCopyWith(HubDays value, $Res Function(HubDays) _then) = _$HubDaysCopyWithImpl;
@useResult
$Res call({
 String month, String? prevMonth, String? nextMonth, List<HubDay> days
});




}
/// @nodoc
class _$HubDaysCopyWithImpl<$Res>
    implements $HubDaysCopyWith<$Res> {
  _$HubDaysCopyWithImpl(this._self, this._then);

  final HubDays _self;
  final $Res Function(HubDays) _then;

/// Create a copy of HubDays
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? month = null,Object? prevMonth = freezed,Object? nextMonth = freezed,Object? days = null,}) {
  return _then(HubDays(
month: null == month ? _self.month : month // ignore: cast_nullable_to_non_nullable
as String,prevMonth: freezed == prevMonth ? _self.prevMonth : prevMonth // ignore: cast_nullable_to_non_nullable
as String?,nextMonth: freezed == nextMonth ? _self.nextMonth : nextMonth // ignore: cast_nullable_to_non_nullable
as String?,days: null == days ? _self.days : days // ignore: cast_nullable_to_non_nullable
as List<HubDay>,
  ));
}

}


/// Adds pattern-matching-related methods to [HubDays].
extension HubDaysPatterns on HubDays {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HubDays value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HubDays() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HubDays value)  $default,){
final _that = this;
switch (_that) {
case _HubDays():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HubDays value)?  $default,){
final _that = this;
switch (_that) {
case _HubDays() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String month,  String? prevMonth,  String? nextMonth,  List<HubDay> days)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HubDays() when $default != null:
return $default(_that.month,_that.prevMonth,_that.nextMonth,_that.days);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String month,  String? prevMonth,  String? nextMonth,  List<HubDay> days)  $default,) {final _that = this;
switch (_that) {
case _HubDays():
return $default(_that.month,_that.prevMonth,_that.nextMonth,_that.days);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String month,  String? prevMonth,  String? nextMonth,  List<HubDay> days)?  $default,) {final _that = this;
switch (_that) {
case _HubDays() when $default != null:
return $default(_that.month,_that.prevMonth,_that.nextMonth,_that.days);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HubDays implements HubDays {
  const _HubDays({required this.month, this.prevMonth, this.nextMonth,  List<HubDay> days = const <HubDay>[]}): _days = days;
  factory _HubDays.fromJson(Map<String, dynamic> json) => _$HubDaysFromJson(json);

@override final  String month;
@override final  String? prevMonth;
@override final  String? nextMonth;
 final  List<HubDay> _days;
@override@JsonKey() List<HubDay> get days {
  if (_days is EqualUnmodifiableListView) return _days;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_days);
}


/// Create a copy of HubDays
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HubDaysCopyWith<_HubDays> get copyWith => __$HubDaysCopyWithImpl<_HubDays>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HubDaysToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HubDays&&(identical(other.month, month) || other.month == month)&&(identical(other.prevMonth, prevMonth) || other.prevMonth == prevMonth)&&(identical(other.nextMonth, nextMonth) || other.nextMonth == nextMonth)&&const DeepCollectionEquality().equals(other.days, _days));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,month,prevMonth,nextMonth,const DeepCollectionEquality().hash(_days));
}

@override
String toString() {
    return 'HubDays(month: $month, prevMonth: $prevMonth, nextMonth: $nextMonth, days: $days)';
}


}

/// @nodoc
abstract mixin class _$HubDaysCopyWith<$Res> implements $HubDaysCopyWith<$Res> {
  factory _$HubDaysCopyWith(_HubDays value, $Res Function(_HubDays) _then) = __$HubDaysCopyWithImpl;
@override @useResult
$Res call({
 String month, String? prevMonth, String? nextMonth, List<HubDay> days
});




}
/// @nodoc
class __$HubDaysCopyWithImpl<$Res>
    implements _$HubDaysCopyWith<$Res> {
  __$HubDaysCopyWithImpl(this._self, this._then);

  final _HubDays _self;
  final $Res Function(_HubDays) _then;

/// Create a copy of HubDays
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? month = null,Object? prevMonth = freezed,Object? nextMonth = freezed,Object? days = null,}) {
  return _then(_HubDays(
month: null == month ? _self.month : month // ignore: cast_nullable_to_non_nullable
as String,prevMonth: freezed == prevMonth ? _self.prevMonth : prevMonth // ignore: cast_nullable_to_non_nullable
as String?,nextMonth: freezed == nextMonth ? _self.nextMonth : nextMonth // ignore: cast_nullable_to_non_nullable
as String?,days: null == days ? _self._days : days // ignore: cast_nullable_to_non_nullable
as List<HubDay>,
  ));
}


}


/// @nodoc
mixin _$HubDay {

 String get date; String get classroomId; String get classroomName; int? get startMinute; int? get endMinute; String? get room; String? get topic;/// Багш+ нэрэнд «+» сервер өөрөө залгасан — дахин бүү нэм.
 List<String> get teachers; String? get problemNumbers; List<HubDayTest> get tests; DayAttendance? get attendance; DayHomework get homework; DayTheory get theory; HomeworkPhoto? get homeworkPhoto; bool get canSendHomework;
/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HubDayCopyWith<HubDay> get copyWith => _$HubDayCopyWithImpl<HubDay>(this as HubDay, _$identity);

  /// Serializes this HubDay to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HubDay;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HubDay&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.classroomId, _this.classroomId) || other.classroomId == _this.classroomId)&&(identical(other.classroomName, _this.classroomName) || other.classroomName == _this.classroomName)&&(identical(other.startMinute, _this.startMinute) || other.startMinute == _this.startMinute)&&(identical(other.endMinute, _this.endMinute) || other.endMinute == _this.endMinute)&&(identical(other.room, _this.room) || other.room == _this.room)&&(identical(other.topic, _this.topic) || other.topic == _this.topic)&&const DeepCollectionEquality().equals(other.teachers, _this.teachers)&&(identical(other.problemNumbers, _this.problemNumbers) || other.problemNumbers == _this.problemNumbers)&&const DeepCollectionEquality().equals(other.tests, _this.tests)&&(identical(other.attendance, _this.attendance) || other.attendance == _this.attendance)&&(identical(other.homework, _this.homework) || other.homework == _this.homework)&&(identical(other.theory, _this.theory) || other.theory == _this.theory)&&(identical(other.homeworkPhoto, _this.homeworkPhoto) || other.homeworkPhoto == _this.homeworkPhoto)&&(identical(other.canSendHomework, _this.canSendHomework) || other.canSendHomework == _this.canSendHomework));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HubDay;
  return Object.hash(runtimeType,_this.date,_this.classroomId,_this.classroomName,_this.startMinute,_this.endMinute,_this.room,_this.topic,const DeepCollectionEquality().hash(_this.teachers),_this.problemNumbers,const DeepCollectionEquality().hash(_this.tests),_this.attendance,_this.homework,_this.theory,_this.homeworkPhoto,_this.canSendHomework);
}

@override
String toString() {
  final _this = this as HubDay;
  return 'HubDay(date: ${_this.date}, classroomId: ${_this.classroomId}, classroomName: ${_this.classroomName}, startMinute: ${_this.startMinute}, endMinute: ${_this.endMinute}, room: ${_this.room}, topic: ${_this.topic}, teachers: ${_this.teachers}, problemNumbers: ${_this.problemNumbers}, tests: ${_this.tests}, attendance: ${_this.attendance}, homework: ${_this.homework}, theory: ${_this.theory}, homeworkPhoto: ${_this.homeworkPhoto}, canSendHomework: ${_this.canSendHomework})';
}


}

/// @nodoc
abstract mixin class $HubDayCopyWith<$Res>  {
  factory $HubDayCopyWith(HubDay value, $Res Function(HubDay) _then) = _$HubDayCopyWithImpl;
@useResult
$Res call({
 String date, String classroomId, String classroomName, int? startMinute, int? endMinute, String? room, String? topic, List<String> teachers, String? problemNumbers, List<HubDayTest> tests, DayAttendance? attendance, DayHomework homework, DayTheory theory, HomeworkPhoto? homeworkPhoto, bool canSendHomework
});


$DayAttendanceCopyWith<$Res>? get attendance;$DayHomeworkCopyWith<$Res> get homework;$DayTheoryCopyWith<$Res> get theory;$HomeworkPhotoCopyWith<$Res>? get homeworkPhoto;

}
/// @nodoc
class _$HubDayCopyWithImpl<$Res>
    implements $HubDayCopyWith<$Res> {
  _$HubDayCopyWithImpl(this._self, this._then);

  final HubDay _self;
  final $Res Function(HubDay) _then;

/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? classroomId = null,Object? classroomName = null,Object? startMinute = freezed,Object? endMinute = freezed,Object? room = freezed,Object? topic = freezed,Object? teachers = null,Object? problemNumbers = freezed,Object? tests = null,Object? attendance = freezed,Object? homework = null,Object? theory = null,Object? homeworkPhoto = freezed,Object? canSendHomework = null,}) {
  return _then(HubDay(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,startMinute: freezed == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int?,endMinute: freezed == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int?,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,topic: freezed == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String?,teachers: null == teachers ? _self.teachers : teachers // ignore: cast_nullable_to_non_nullable
as List<String>,problemNumbers: freezed == problemNumbers ? _self.problemNumbers : problemNumbers // ignore: cast_nullable_to_non_nullable
as String?,tests: null == tests ? _self.tests : tests // ignore: cast_nullable_to_non_nullable
as List<HubDayTest>,attendance: freezed == attendance ? _self.attendance : attendance // ignore: cast_nullable_to_non_nullable
as DayAttendance?,homework: null == homework ? _self.homework : homework // ignore: cast_nullable_to_non_nullable
as DayHomework,theory: null == theory ? _self.theory : theory // ignore: cast_nullable_to_non_nullable
as DayTheory,homeworkPhoto: freezed == homeworkPhoto ? _self.homeworkPhoto : homeworkPhoto // ignore: cast_nullable_to_non_nullable
as HomeworkPhoto?,canSendHomework: null == canSendHomework ? _self.canSendHomework : canSendHomework // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}
/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DayAttendanceCopyWith<$Res>? get attendance {
    if (_self.attendance == null) {
    return null;
  }

  return $DayAttendanceCopyWith<$Res>(_self.attendance!, (value) {
    return _then(_self.copyWith(attendance: value));
  });
}/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DayHomeworkCopyWith<$Res> get homework {
  
  return $DayHomeworkCopyWith<$Res>(_self.homework, (value) {
    return _then(_self.copyWith(homework: value));
  });
}/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DayTheoryCopyWith<$Res> get theory {
  
  return $DayTheoryCopyWith<$Res>(_self.theory, (value) {
    return _then(_self.copyWith(theory: value));
  });
}/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HomeworkPhotoCopyWith<$Res>? get homeworkPhoto {
    if (_self.homeworkPhoto == null) {
    return null;
  }

  return $HomeworkPhotoCopyWith<$Res>(_self.homeworkPhoto!, (value) {
    return _then(_self.copyWith(homeworkPhoto: value));
  });
}
}


/// Adds pattern-matching-related methods to [HubDay].
extension HubDayPatterns on HubDay {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HubDay value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HubDay() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HubDay value)  $default,){
final _that = this;
switch (_that) {
case _HubDay():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HubDay value)?  $default,){
final _that = this;
switch (_that) {
case _HubDay() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date,  String classroomId,  String classroomName,  int? startMinute,  int? endMinute,  String? room,  String? topic,  List<String> teachers,  String? problemNumbers,  List<HubDayTest> tests,  DayAttendance? attendance,  DayHomework homework,  DayTheory theory,  HomeworkPhoto? homeworkPhoto,  bool canSendHomework)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HubDay() when $default != null:
return $default(_that.date,_that.classroomId,_that.classroomName,_that.startMinute,_that.endMinute,_that.room,_that.topic,_that.teachers,_that.problemNumbers,_that.tests,_that.attendance,_that.homework,_that.theory,_that.homeworkPhoto,_that.canSendHomework);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date,  String classroomId,  String classroomName,  int? startMinute,  int? endMinute,  String? room,  String? topic,  List<String> teachers,  String? problemNumbers,  List<HubDayTest> tests,  DayAttendance? attendance,  DayHomework homework,  DayTheory theory,  HomeworkPhoto? homeworkPhoto,  bool canSendHomework)  $default,) {final _that = this;
switch (_that) {
case _HubDay():
return $default(_that.date,_that.classroomId,_that.classroomName,_that.startMinute,_that.endMinute,_that.room,_that.topic,_that.teachers,_that.problemNumbers,_that.tests,_that.attendance,_that.homework,_that.theory,_that.homeworkPhoto,_that.canSendHomework);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date,  String classroomId,  String classroomName,  int? startMinute,  int? endMinute,  String? room,  String? topic,  List<String> teachers,  String? problemNumbers,  List<HubDayTest> tests,  DayAttendance? attendance,  DayHomework homework,  DayTheory theory,  HomeworkPhoto? homeworkPhoto,  bool canSendHomework)?  $default,) {final _that = this;
switch (_that) {
case _HubDay() when $default != null:
return $default(_that.date,_that.classroomId,_that.classroomName,_that.startMinute,_that.endMinute,_that.room,_that.topic,_that.teachers,_that.problemNumbers,_that.tests,_that.attendance,_that.homework,_that.theory,_that.homeworkPhoto,_that.canSendHomework);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HubDay implements HubDay {
  const _HubDay({required this.date, required this.classroomId, required this.classroomName, this.startMinute, this.endMinute, this.room, this.topic,  List<String> teachers = const <String>[], this.problemNumbers,  List<HubDayTest> tests = const <HubDayTest>[], this.attendance, this.homework = const DayHomework(), this.theory = const DayTheory(), this.homeworkPhoto, this.canSendHomework = false}): _teachers = teachers,_tests = tests;
  factory _HubDay.fromJson(Map<String, dynamic> json) => _$HubDayFromJson(json);

@override final  String date;
@override final  String classroomId;
@override final  String classroomName;
@override final  int? startMinute;
@override final  int? endMinute;
@override final  String? room;
@override final  String? topic;
/// Багш+ нэрэнд «+» сервер өөрөө залгасан — дахин бүү нэм.
 final  List<String> _teachers;
/// Багш+ нэрэнд «+» сервер өөрөө залгасан — дахин бүү нэм.
@override@JsonKey() List<String> get teachers {
  if (_teachers is EqualUnmodifiableListView) return _teachers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_teachers);
}

@override final  String? problemNumbers;
 final  List<HubDayTest> _tests;
@override@JsonKey() List<HubDayTest> get tests {
  if (_tests is EqualUnmodifiableListView) return _tests;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tests);
}

@override final  DayAttendance? attendance;
@override@JsonKey() final  DayHomework homework;
@override@JsonKey() final  DayTheory theory;
@override final  HomeworkPhoto? homeworkPhoto;
@override@JsonKey() final  bool canSendHomework;

/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HubDayCopyWith<_HubDay> get copyWith => __$HubDayCopyWithImpl<_HubDay>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HubDayToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HubDay&&(identical(other.date, date) || other.date == date)&&(identical(other.classroomId, classroomId) || other.classroomId == classroomId)&&(identical(other.classroomName, classroomName) || other.classroomName == classroomName)&&(identical(other.startMinute, startMinute) || other.startMinute == startMinute)&&(identical(other.endMinute, endMinute) || other.endMinute == endMinute)&&(identical(other.room, room) || other.room == room)&&(identical(other.topic, topic) || other.topic == topic)&&const DeepCollectionEquality().equals(other.teachers, _teachers)&&(identical(other.problemNumbers, problemNumbers) || other.problemNumbers == problemNumbers)&&const DeepCollectionEquality().equals(other.tests, _tests)&&(identical(other.attendance, attendance) || other.attendance == attendance)&&(identical(other.homework, homework) || other.homework == homework)&&(identical(other.theory, theory) || other.theory == theory)&&(identical(other.homeworkPhoto, homeworkPhoto) || other.homeworkPhoto == homeworkPhoto)&&(identical(other.canSendHomework, canSendHomework) || other.canSendHomework == canSendHomework));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,classroomId,classroomName,startMinute,endMinute,room,topic,const DeepCollectionEquality().hash(_teachers),problemNumbers,const DeepCollectionEquality().hash(_tests),attendance,homework,theory,homeworkPhoto,canSendHomework);
}

@override
String toString() {
    return 'HubDay(date: $date, classroomId: $classroomId, classroomName: $classroomName, startMinute: $startMinute, endMinute: $endMinute, room: $room, topic: $topic, teachers: $teachers, problemNumbers: $problemNumbers, tests: $tests, attendance: $attendance, homework: $homework, theory: $theory, homeworkPhoto: $homeworkPhoto, canSendHomework: $canSendHomework)';
}


}

/// @nodoc
abstract mixin class _$HubDayCopyWith<$Res> implements $HubDayCopyWith<$Res> {
  factory _$HubDayCopyWith(_HubDay value, $Res Function(_HubDay) _then) = __$HubDayCopyWithImpl;
@override @useResult
$Res call({
 String date, String classroomId, String classroomName, int? startMinute, int? endMinute, String? room, String? topic, List<String> teachers, String? problemNumbers, List<HubDayTest> tests, DayAttendance? attendance, DayHomework homework, DayTheory theory, HomeworkPhoto? homeworkPhoto, bool canSendHomework
});


@override $DayAttendanceCopyWith<$Res>? get attendance;@override $DayHomeworkCopyWith<$Res> get homework;@override $DayTheoryCopyWith<$Res> get theory;@override $HomeworkPhotoCopyWith<$Res>? get homeworkPhoto;

}
/// @nodoc
class __$HubDayCopyWithImpl<$Res>
    implements _$HubDayCopyWith<$Res> {
  __$HubDayCopyWithImpl(this._self, this._then);

  final _HubDay _self;
  final $Res Function(_HubDay) _then;

/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? classroomId = null,Object? classroomName = null,Object? startMinute = freezed,Object? endMinute = freezed,Object? room = freezed,Object? topic = freezed,Object? teachers = null,Object? problemNumbers = freezed,Object? tests = null,Object? attendance = freezed,Object? homework = null,Object? theory = null,Object? homeworkPhoto = freezed,Object? canSendHomework = null,}) {
  return _then(_HubDay(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,startMinute: freezed == startMinute ? _self.startMinute : startMinute // ignore: cast_nullable_to_non_nullable
as int?,endMinute: freezed == endMinute ? _self.endMinute : endMinute // ignore: cast_nullable_to_non_nullable
as int?,room: freezed == room ? _self.room : room // ignore: cast_nullable_to_non_nullable
as String?,topic: freezed == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String?,teachers: null == teachers ? _self._teachers : teachers // ignore: cast_nullable_to_non_nullable
as List<String>,problemNumbers: freezed == problemNumbers ? _self.problemNumbers : problemNumbers // ignore: cast_nullable_to_non_nullable
as String?,tests: null == tests ? _self._tests : tests // ignore: cast_nullable_to_non_nullable
as List<HubDayTest>,attendance: freezed == attendance ? _self.attendance : attendance // ignore: cast_nullable_to_non_nullable
as DayAttendance?,homework: null == homework ? _self.homework : homework // ignore: cast_nullable_to_non_nullable
as DayHomework,theory: null == theory ? _self.theory : theory // ignore: cast_nullable_to_non_nullable
as DayTheory,homeworkPhoto: freezed == homeworkPhoto ? _self.homeworkPhoto : homeworkPhoto // ignore: cast_nullable_to_non_nullable
as HomeworkPhoto?,canSendHomework: null == canSendHomework ? _self.canSendHomework : canSendHomework // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DayAttendanceCopyWith<$Res>? get attendance {
    if (_self.attendance == null) {
    return null;
  }

  return $DayAttendanceCopyWith<$Res>(_self.attendance!, (value) {
    return _then(_self.copyWith(attendance: value));
  });
}/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DayHomeworkCopyWith<$Res> get homework {
  
  return $DayHomeworkCopyWith<$Res>(_self.homework, (value) {
    return _then(_self.copyWith(homework: value));
  });
}/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DayTheoryCopyWith<$Res> get theory {
  
  return $DayTheoryCopyWith<$Res>(_self.theory, (value) {
    return _then(_self.copyWith(theory: value));
  });
}/// Create a copy of HubDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HomeworkPhotoCopyWith<$Res>? get homeworkPhoto {
    if (_self.homeworkPhoto == null) {
    return null;
  }

  return $HomeworkPhotoCopyWith<$Res>(_self.homeworkPhoto!, (value) {
    return _then(_self.copyWith(homeworkPhoto: value));
  });
}
}


/// @nodoc
mixin _$HubDayTest {

/// null = гараар бичсэн тест — нээгдэхгүй.
 String? get testId; String get title; String? get variant; bool get open;@JsonKey(unknownEnumValue: _nullEnum) TestClosedReason? get closedReason;
/// Create a copy of HubDayTest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HubDayTestCopyWith<HubDayTest> get copyWith => _$HubDayTestCopyWithImpl<HubDayTest>(this as HubDayTest, _$identity);

  /// Serializes this HubDayTest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HubDayTest;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HubDayTest&&(identical(other.testId, _this.testId) || other.testId == _this.testId)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.variant, _this.variant) || other.variant == _this.variant)&&(identical(other.open, _this.open) || other.open == _this.open)&&(identical(other.closedReason, _this.closedReason) || other.closedReason == _this.closedReason));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HubDayTest;
  return Object.hash(runtimeType,_this.testId,_this.title,_this.variant,_this.open,_this.closedReason);
}

@override
String toString() {
  final _this = this as HubDayTest;
  return 'HubDayTest(testId: ${_this.testId}, title: ${_this.title}, variant: ${_this.variant}, open: ${_this.open}, closedReason: ${_this.closedReason})';
}


}

/// @nodoc
abstract mixin class $HubDayTestCopyWith<$Res>  {
  factory $HubDayTestCopyWith(HubDayTest value, $Res Function(HubDayTest) _then) = _$HubDayTestCopyWithImpl;
@useResult
$Res call({
 String? testId, String title, String? variant, bool open,@JsonKey(unknownEnumValue: _nullEnum) TestClosedReason? closedReason
});




}
/// @nodoc
class _$HubDayTestCopyWithImpl<$Res>
    implements $HubDayTestCopyWith<$Res> {
  _$HubDayTestCopyWithImpl(this._self, this._then);

  final HubDayTest _self;
  final $Res Function(HubDayTest) _then;

/// Create a copy of HubDayTest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? testId = freezed,Object? title = null,Object? variant = freezed,Object? open = null,Object? closedReason = freezed,}) {
  return _then(HubDayTest(
testId: freezed == testId ? _self.testId : testId // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,variant: freezed == variant ? _self.variant : variant // ignore: cast_nullable_to_non_nullable
as String?,open: null == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as bool,closedReason: freezed == closedReason ? _self.closedReason : closedReason // ignore: cast_nullable_to_non_nullable
as TestClosedReason?,
  ));
}

}


/// Adds pattern-matching-related methods to [HubDayTest].
extension HubDayTestPatterns on HubDayTest {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HubDayTest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HubDayTest() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HubDayTest value)  $default,){
final _that = this;
switch (_that) {
case _HubDayTest():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HubDayTest value)?  $default,){
final _that = this;
switch (_that) {
case _HubDayTest() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? testId,  String title,  String? variant,  bool open, @JsonKey(unknownEnumValue: _nullEnum)  TestClosedReason? closedReason)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HubDayTest() when $default != null:
return $default(_that.testId,_that.title,_that.variant,_that.open,_that.closedReason);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? testId,  String title,  String? variant,  bool open, @JsonKey(unknownEnumValue: _nullEnum)  TestClosedReason? closedReason)  $default,) {final _that = this;
switch (_that) {
case _HubDayTest():
return $default(_that.testId,_that.title,_that.variant,_that.open,_that.closedReason);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? testId,  String title,  String? variant,  bool open, @JsonKey(unknownEnumValue: _nullEnum)  TestClosedReason? closedReason)?  $default,) {final _that = this;
switch (_that) {
case _HubDayTest() when $default != null:
return $default(_that.testId,_that.title,_that.variant,_that.open,_that.closedReason);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HubDayTest implements HubDayTest {
  const _HubDayTest({this.testId, required this.title, this.variant, this.open = false, @JsonKey(unknownEnumValue: _nullEnum) this.closedReason});
  factory _HubDayTest.fromJson(Map<String, dynamic> json) => _$HubDayTestFromJson(json);

/// null = гараар бичсэн тест — нээгдэхгүй.
@override final  String? testId;
@override final  String title;
@override final  String? variant;
@override@JsonKey() final  bool open;
@override@JsonKey(unknownEnumValue: _nullEnum) final  TestClosedReason? closedReason;

/// Create a copy of HubDayTest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HubDayTestCopyWith<_HubDayTest> get copyWith => __$HubDayTestCopyWithImpl<_HubDayTest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HubDayTestToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HubDayTest&&(identical(other.testId, testId) || other.testId == testId)&&(identical(other.title, title) || other.title == title)&&(identical(other.variant, variant) || other.variant == variant)&&(identical(other.open, open) || other.open == open)&&(identical(other.closedReason, closedReason) || other.closedReason == closedReason));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,testId,title,variant,open,closedReason);
}

@override
String toString() {
    return 'HubDayTest(testId: $testId, title: $title, variant: $variant, open: $open, closedReason: $closedReason)';
}


}

/// @nodoc
abstract mixin class _$HubDayTestCopyWith<$Res> implements $HubDayTestCopyWith<$Res> {
  factory _$HubDayTestCopyWith(_HubDayTest value, $Res Function(_HubDayTest) _then) = __$HubDayTestCopyWithImpl;
@override @useResult
$Res call({
 String? testId, String title, String? variant, bool open,@JsonKey(unknownEnumValue: _nullEnum) TestClosedReason? closedReason
});




}
/// @nodoc
class __$HubDayTestCopyWithImpl<$Res>
    implements _$HubDayTestCopyWith<$Res> {
  __$HubDayTestCopyWithImpl(this._self, this._then);

  final _HubDayTest _self;
  final $Res Function(_HubDayTest) _then;

/// Create a copy of HubDayTest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? testId = freezed,Object? title = null,Object? variant = freezed,Object? open = null,Object? closedReason = freezed,}) {
  return _then(_HubDayTest(
testId: freezed == testId ? _self.testId : testId // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,variant: freezed == variant ? _self.variant : variant // ignore: cast_nullable_to_non_nullable
as String?,open: null == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as bool,closedReason: freezed == closedReason ? _self.closedReason : closedReason // ignore: cast_nullable_to_non_nullable
as TestClosedReason?,
  ));
}


}


/// @nodoc
mixin _$DayAttendance {

@JsonKey(unknownEnumValue: _nullEnum) AttendanceStatus? get status;@JsonKey(unknownEnumValue: _nullEnum) LateRange? get lateRange;
/// Create a copy of DayAttendance
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DayAttendanceCopyWith<DayAttendance> get copyWith => _$DayAttendanceCopyWithImpl<DayAttendance>(this as DayAttendance, _$identity);

  /// Serializes this DayAttendance to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as DayAttendance;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DayAttendance&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.lateRange, _this.lateRange) || other.lateRange == _this.lateRange));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as DayAttendance;
  return Object.hash(runtimeType,_this.status,_this.lateRange);
}

@override
String toString() {
  final _this = this as DayAttendance;
  return 'DayAttendance(status: ${_this.status}, lateRange: ${_this.lateRange})';
}


}

/// @nodoc
abstract mixin class $DayAttendanceCopyWith<$Res>  {
  factory $DayAttendanceCopyWith(DayAttendance value, $Res Function(DayAttendance) _then) = _$DayAttendanceCopyWithImpl;
@useResult
$Res call({
@JsonKey(unknownEnumValue: _nullEnum) AttendanceStatus? status,@JsonKey(unknownEnumValue: _nullEnum) LateRange? lateRange
});




}
/// @nodoc
class _$DayAttendanceCopyWithImpl<$Res>
    implements $DayAttendanceCopyWith<$Res> {
  _$DayAttendanceCopyWithImpl(this._self, this._then);

  final DayAttendance _self;
  final $Res Function(DayAttendance) _then;

/// Create a copy of DayAttendance
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? status = freezed,Object? lateRange = freezed,}) {
  return _then(DayAttendance(
status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as AttendanceStatus?,lateRange: freezed == lateRange ? _self.lateRange : lateRange // ignore: cast_nullable_to_non_nullable
as LateRange?,
  ));
}

}


/// Adds pattern-matching-related methods to [DayAttendance].
extension DayAttendancePatterns on DayAttendance {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DayAttendance value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DayAttendance() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DayAttendance value)  $default,){
final _that = this;
switch (_that) {
case _DayAttendance():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DayAttendance value)?  $default,){
final _that = this;
switch (_that) {
case _DayAttendance() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(unknownEnumValue: _nullEnum)  AttendanceStatus? status, @JsonKey(unknownEnumValue: _nullEnum)  LateRange? lateRange)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DayAttendance() when $default != null:
return $default(_that.status,_that.lateRange);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(unknownEnumValue: _nullEnum)  AttendanceStatus? status, @JsonKey(unknownEnumValue: _nullEnum)  LateRange? lateRange)  $default,) {final _that = this;
switch (_that) {
case _DayAttendance():
return $default(_that.status,_that.lateRange);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(unknownEnumValue: _nullEnum)  AttendanceStatus? status, @JsonKey(unknownEnumValue: _nullEnum)  LateRange? lateRange)?  $default,) {final _that = this;
switch (_that) {
case _DayAttendance() when $default != null:
return $default(_that.status,_that.lateRange);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DayAttendance implements DayAttendance {
  const _DayAttendance({@JsonKey(unknownEnumValue: _nullEnum) this.status, @JsonKey(unknownEnumValue: _nullEnum) this.lateRange});
  factory _DayAttendance.fromJson(Map<String, dynamic> json) => _$DayAttendanceFromJson(json);

@override@JsonKey(unknownEnumValue: _nullEnum) final  AttendanceStatus? status;
@override@JsonKey(unknownEnumValue: _nullEnum) final  LateRange? lateRange;

/// Create a copy of DayAttendance
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DayAttendanceCopyWith<_DayAttendance> get copyWith => __$DayAttendanceCopyWithImpl<_DayAttendance>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DayAttendanceToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _DayAttendance&&(identical(other.status, status) || other.status == status)&&(identical(other.lateRange, lateRange) || other.lateRange == lateRange));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,status,lateRange);
}

@override
String toString() {
    return 'DayAttendance(status: $status, lateRange: $lateRange)';
}


}

/// @nodoc
abstract mixin class _$DayAttendanceCopyWith<$Res> implements $DayAttendanceCopyWith<$Res> {
  factory _$DayAttendanceCopyWith(_DayAttendance value, $Res Function(_DayAttendance) _then) = __$DayAttendanceCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(unknownEnumValue: _nullEnum) AttendanceStatus? status,@JsonKey(unknownEnumValue: _nullEnum) LateRange? lateRange
});




}
/// @nodoc
class __$DayAttendanceCopyWithImpl<$Res>
    implements _$DayAttendanceCopyWith<$Res> {
  __$DayAttendanceCopyWithImpl(this._self, this._then);

  final _DayAttendance _self;
  final $Res Function(_DayAttendance) _then;

/// Create a copy of DayAttendance
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? status = freezed,Object? lateRange = freezed,}) {
  return _then(_DayAttendance(
status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as AttendanceStatus?,lateRange: freezed == lateRange ? _self.lateRange : lateRange // ignore: cast_nullable_to_non_nullable
as LateRange?,
  ));
}


}


/// @nodoc
mixin _$DayHomework {

@JsonKey(unknownEnumValue: _nullEnum) HomeworkStatus? get status; String? get comment; String? get checkedOn;/// Шалгалтаар даалгавар шалгасан оноо (эзэн 2026-11-08 19:08); байхгүй бол null.
 HubQuiz? get quiz;
/// Create a copy of DayHomework
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DayHomeworkCopyWith<DayHomework> get copyWith => _$DayHomeworkCopyWithImpl<DayHomework>(this as DayHomework, _$identity);

  /// Serializes this DayHomework to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as DayHomework;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DayHomework&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.comment, _this.comment) || other.comment == _this.comment)&&(identical(other.checkedOn, _this.checkedOn) || other.checkedOn == _this.checkedOn)&&(identical(other.quiz, _this.quiz) || other.quiz == _this.quiz));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as DayHomework;
  return Object.hash(runtimeType,_this.status,_this.comment,_this.checkedOn,_this.quiz);
}

@override
String toString() {
  final _this = this as DayHomework;
  return 'DayHomework(status: ${_this.status}, comment: ${_this.comment}, checkedOn: ${_this.checkedOn}, quiz: ${_this.quiz})';
}


}

/// @nodoc
abstract mixin class $DayHomeworkCopyWith<$Res>  {
  factory $DayHomeworkCopyWith(DayHomework value, $Res Function(DayHomework) _then) = _$DayHomeworkCopyWithImpl;
@useResult
$Res call({
@JsonKey(unknownEnumValue: _nullEnum) HomeworkStatus? status, String? comment, String? checkedOn, HubQuiz? quiz
});


$HubQuizCopyWith<$Res>? get quiz;

}
/// @nodoc
class _$DayHomeworkCopyWithImpl<$Res>
    implements $DayHomeworkCopyWith<$Res> {
  _$DayHomeworkCopyWithImpl(this._self, this._then);

  final DayHomework _self;
  final $Res Function(DayHomework) _then;

/// Create a copy of DayHomework
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? status = freezed,Object? comment = freezed,Object? checkedOn = freezed,Object? quiz = freezed,}) {
  return _then(DayHomework(
status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as HomeworkStatus?,comment: freezed == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String?,checkedOn: freezed == checkedOn ? _self.checkedOn : checkedOn // ignore: cast_nullable_to_non_nullable
as String?,quiz: freezed == quiz ? _self.quiz : quiz // ignore: cast_nullable_to_non_nullable
as HubQuiz?,
  ));
}
/// Create a copy of DayHomework
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HubQuizCopyWith<$Res>? get quiz {
    if (_self.quiz == null) {
    return null;
  }

  return $HubQuizCopyWith<$Res>(_self.quiz!, (value) {
    return _then(_self.copyWith(quiz: value));
  });
}
}


/// Adds pattern-matching-related methods to [DayHomework].
extension DayHomeworkPatterns on DayHomework {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DayHomework value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DayHomework() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DayHomework value)  $default,){
final _that = this;
switch (_that) {
case _DayHomework():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DayHomework value)?  $default,){
final _that = this;
switch (_that) {
case _DayHomework() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(unknownEnumValue: _nullEnum)  HomeworkStatus? status,  String? comment,  String? checkedOn,  HubQuiz? quiz)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DayHomework() when $default != null:
return $default(_that.status,_that.comment,_that.checkedOn,_that.quiz);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(unknownEnumValue: _nullEnum)  HomeworkStatus? status,  String? comment,  String? checkedOn,  HubQuiz? quiz)  $default,) {final _that = this;
switch (_that) {
case _DayHomework():
return $default(_that.status,_that.comment,_that.checkedOn,_that.quiz);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(unknownEnumValue: _nullEnum)  HomeworkStatus? status,  String? comment,  String? checkedOn,  HubQuiz? quiz)?  $default,) {final _that = this;
switch (_that) {
case _DayHomework() when $default != null:
return $default(_that.status,_that.comment,_that.checkedOn,_that.quiz);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DayHomework implements DayHomework {
  const _DayHomework({@JsonKey(unknownEnumValue: _nullEnum) this.status, this.comment, this.checkedOn, this.quiz});
  factory _DayHomework.fromJson(Map<String, dynamic> json) => _$DayHomeworkFromJson(json);

@override@JsonKey(unknownEnumValue: _nullEnum) final  HomeworkStatus? status;
@override final  String? comment;
@override final  String? checkedOn;
/// Шалгалтаар даалгавар шалгасан оноо (эзэн 2026-11-08 19:08); байхгүй бол null.
@override final  HubQuiz? quiz;

/// Create a copy of DayHomework
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DayHomeworkCopyWith<_DayHomework> get copyWith => __$DayHomeworkCopyWithImpl<_DayHomework>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DayHomeworkToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _DayHomework&&(identical(other.status, status) || other.status == status)&&(identical(other.comment, comment) || other.comment == comment)&&(identical(other.checkedOn, checkedOn) || other.checkedOn == checkedOn)&&(identical(other.quiz, quiz) || other.quiz == quiz));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,status,comment,checkedOn,quiz);
}

@override
String toString() {
    return 'DayHomework(status: $status, comment: $comment, checkedOn: $checkedOn, quiz: $quiz)';
}


}

/// @nodoc
abstract mixin class _$DayHomeworkCopyWith<$Res> implements $DayHomeworkCopyWith<$Res> {
  factory _$DayHomeworkCopyWith(_DayHomework value, $Res Function(_DayHomework) _then) = __$DayHomeworkCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(unknownEnumValue: _nullEnum) HomeworkStatus? status, String? comment, String? checkedOn, HubQuiz? quiz
});


@override $HubQuizCopyWith<$Res>? get quiz;

}
/// @nodoc
class __$DayHomeworkCopyWithImpl<$Res>
    implements _$DayHomeworkCopyWith<$Res> {
  __$DayHomeworkCopyWithImpl(this._self, this._then);

  final _DayHomework _self;
  final $Res Function(_DayHomework) _then;

/// Create a copy of DayHomework
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? status = freezed,Object? comment = freezed,Object? checkedOn = freezed,Object? quiz = freezed,}) {
  return _then(_DayHomework(
status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as HomeworkStatus?,comment: freezed == comment ? _self.comment : comment // ignore: cast_nullable_to_non_nullable
as String?,checkedOn: freezed == checkedOn ? _self.checkedOn : checkedOn // ignore: cast_nullable_to_non_nullable
as String?,quiz: freezed == quiz ? _self.quiz : quiz // ignore: cast_nullable_to_non_nullable
as HubQuiz?,
  ));
}

/// Create a copy of DayHomework
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HubQuizCopyWith<$Res>? get quiz {
    if (_self.quiz == null) {
    return null;
  }

  return $HubQuizCopyWith<$Res>(_self.quiz!, (value) {
    return _then(_self.copyWith(quiz: value));
  });
}
}


/// @nodoc
mixin _$HubQuiz {

 double get score; int get problemCount;
/// Create a copy of HubQuiz
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HubQuizCopyWith<HubQuiz> get copyWith => _$HubQuizCopyWithImpl<HubQuiz>(this as HubQuiz, _$identity);

  /// Serializes this HubQuiz to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HubQuiz;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HubQuiz&&(identical(other.score, _this.score) || other.score == _this.score)&&(identical(other.problemCount, _this.problemCount) || other.problemCount == _this.problemCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HubQuiz;
  return Object.hash(runtimeType,_this.score,_this.problemCount);
}

@override
String toString() {
  final _this = this as HubQuiz;
  return 'HubQuiz(score: ${_this.score}, problemCount: ${_this.problemCount})';
}


}

/// @nodoc
abstract mixin class $HubQuizCopyWith<$Res>  {
  factory $HubQuizCopyWith(HubQuiz value, $Res Function(HubQuiz) _then) = _$HubQuizCopyWithImpl;
@useResult
$Res call({
 double score, int problemCount
});




}
/// @nodoc
class _$HubQuizCopyWithImpl<$Res>
    implements $HubQuizCopyWith<$Res> {
  _$HubQuizCopyWithImpl(this._self, this._then);

  final HubQuiz _self;
  final $Res Function(HubQuiz) _then;

/// Create a copy of HubQuiz
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? score = null,Object? problemCount = null,}) {
  return _then(HubQuiz(
score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as double,problemCount: null == problemCount ? _self.problemCount : problemCount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [HubQuiz].
extension HubQuizPatterns on HubQuiz {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HubQuiz value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HubQuiz() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HubQuiz value)  $default,){
final _that = this;
switch (_that) {
case _HubQuiz():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HubQuiz value)?  $default,){
final _that = this;
switch (_that) {
case _HubQuiz() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( double score,  int problemCount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HubQuiz() when $default != null:
return $default(_that.score,_that.problemCount);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( double score,  int problemCount)  $default,) {final _that = this;
switch (_that) {
case _HubQuiz():
return $default(_that.score,_that.problemCount);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( double score,  int problemCount)?  $default,) {final _that = this;
switch (_that) {
case _HubQuiz() when $default != null:
return $default(_that.score,_that.problemCount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HubQuiz implements HubQuiz {
  const _HubQuiz({required this.score, this.problemCount = 0});
  factory _HubQuiz.fromJson(Map<String, dynamic> json) => _$HubQuizFromJson(json);

@override final  double score;
@override@JsonKey() final  int problemCount;

/// Create a copy of HubQuiz
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HubQuizCopyWith<_HubQuiz> get copyWith => __$HubQuizCopyWithImpl<_HubQuiz>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HubQuizToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HubQuiz&&(identical(other.score, score) || other.score == score)&&(identical(other.problemCount, problemCount) || other.problemCount == problemCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,score,problemCount);
}

@override
String toString() {
    return 'HubQuiz(score: $score, problemCount: $problemCount)';
}


}

/// @nodoc
abstract mixin class _$HubQuizCopyWith<$Res> implements $HubQuizCopyWith<$Res> {
  factory _$HubQuizCopyWith(_HubQuiz value, $Res Function(_HubQuiz) _then) = __$HubQuizCopyWithImpl;
@override @useResult
$Res call({
 double score, int problemCount
});




}
/// @nodoc
class __$HubQuizCopyWithImpl<$Res>
    implements _$HubQuizCopyWith<$Res> {
  __$HubQuizCopyWithImpl(this._self, this._then);

  final _HubQuiz _self;
  final $Res Function(_HubQuiz) _then;

/// Create a copy of HubQuiz
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? score = null,Object? problemCount = null,}) {
  return _then(_HubQuiz(
score: null == score ? _self.score : score // ignore: cast_nullable_to_non_nullable
as double,problemCount: null == problemCount ? _self.problemCount : problemCount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$DayTheory {

 int get count; bool get mine; bool get canUpload; bool get assignedToMe;
/// Create a copy of DayTheory
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DayTheoryCopyWith<DayTheory> get copyWith => _$DayTheoryCopyWithImpl<DayTheory>(this as DayTheory, _$identity);

  /// Serializes this DayTheory to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as DayTheory;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DayTheory&&(identical(other.count, _this.count) || other.count == _this.count)&&(identical(other.mine, _this.mine) || other.mine == _this.mine)&&(identical(other.canUpload, _this.canUpload) || other.canUpload == _this.canUpload)&&(identical(other.assignedToMe, _this.assignedToMe) || other.assignedToMe == _this.assignedToMe));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as DayTheory;
  return Object.hash(runtimeType,_this.count,_this.mine,_this.canUpload,_this.assignedToMe);
}

@override
String toString() {
  final _this = this as DayTheory;
  return 'DayTheory(count: ${_this.count}, mine: ${_this.mine}, canUpload: ${_this.canUpload}, assignedToMe: ${_this.assignedToMe})';
}


}

/// @nodoc
abstract mixin class $DayTheoryCopyWith<$Res>  {
  factory $DayTheoryCopyWith(DayTheory value, $Res Function(DayTheory) _then) = _$DayTheoryCopyWithImpl;
@useResult
$Res call({
 int count, bool mine, bool canUpload, bool assignedToMe
});




}
/// @nodoc
class _$DayTheoryCopyWithImpl<$Res>
    implements $DayTheoryCopyWith<$Res> {
  _$DayTheoryCopyWithImpl(this._self, this._then);

  final DayTheory _self;
  final $Res Function(DayTheory) _then;

/// Create a copy of DayTheory
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? count = null,Object? mine = null,Object? canUpload = null,Object? assignedToMe = null,}) {
  return _then(DayTheory(
count: null == count ? _self.count : count // ignore: cast_nullable_to_non_nullable
as int,mine: null == mine ? _self.mine : mine // ignore: cast_nullable_to_non_nullable
as bool,canUpload: null == canUpload ? _self.canUpload : canUpload // ignore: cast_nullable_to_non_nullable
as bool,assignedToMe: null == assignedToMe ? _self.assignedToMe : assignedToMe // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [DayTheory].
extension DayTheoryPatterns on DayTheory {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DayTheory value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DayTheory() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DayTheory value)  $default,){
final _that = this;
switch (_that) {
case _DayTheory():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DayTheory value)?  $default,){
final _that = this;
switch (_that) {
case _DayTheory() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int count,  bool mine,  bool canUpload,  bool assignedToMe)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DayTheory() when $default != null:
return $default(_that.count,_that.mine,_that.canUpload,_that.assignedToMe);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int count,  bool mine,  bool canUpload,  bool assignedToMe)  $default,) {final _that = this;
switch (_that) {
case _DayTheory():
return $default(_that.count,_that.mine,_that.canUpload,_that.assignedToMe);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int count,  bool mine,  bool canUpload,  bool assignedToMe)?  $default,) {final _that = this;
switch (_that) {
case _DayTheory() when $default != null:
return $default(_that.count,_that.mine,_that.canUpload,_that.assignedToMe);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DayTheory implements DayTheory {
  const _DayTheory({this.count = 0, this.mine = false, this.canUpload = false, this.assignedToMe = false});
  factory _DayTheory.fromJson(Map<String, dynamic> json) => _$DayTheoryFromJson(json);

@override@JsonKey() final  int count;
@override@JsonKey() final  bool mine;
@override@JsonKey() final  bool canUpload;
@override@JsonKey() final  bool assignedToMe;

/// Create a copy of DayTheory
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DayTheoryCopyWith<_DayTheory> get copyWith => __$DayTheoryCopyWithImpl<_DayTheory>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DayTheoryToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _DayTheory&&(identical(other.count, count) || other.count == count)&&(identical(other.mine, mine) || other.mine == mine)&&(identical(other.canUpload, canUpload) || other.canUpload == canUpload)&&(identical(other.assignedToMe, assignedToMe) || other.assignedToMe == assignedToMe));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,count,mine,canUpload,assignedToMe);
}

@override
String toString() {
    return 'DayTheory(count: $count, mine: $mine, canUpload: $canUpload, assignedToMe: $assignedToMe)';
}


}

/// @nodoc
abstract mixin class _$DayTheoryCopyWith<$Res> implements $DayTheoryCopyWith<$Res> {
  factory _$DayTheoryCopyWith(_DayTheory value, $Res Function(_DayTheory) _then) = __$DayTheoryCopyWithImpl;
@override @useResult
$Res call({
 int count, bool mine, bool canUpload, bool assignedToMe
});




}
/// @nodoc
class __$DayTheoryCopyWithImpl<$Res>
    implements _$DayTheoryCopyWith<$Res> {
  __$DayTheoryCopyWithImpl(this._self, this._then);

  final _DayTheory _self;
  final $Res Function(_DayTheory) _then;

/// Create a copy of DayTheory
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? count = null,Object? mine = null,Object? canUpload = null,Object? assignedToMe = null,}) {
  return _then(_DayTheory(
count: null == count ? _self.count : count // ignore: cast_nullable_to_non_nullable
as int,mine: null == mine ? _self.mine : mine // ignore: cast_nullable_to_non_nullable
as bool,canUpload: null == canUpload ? _self.canUpload : canUpload // ignore: cast_nullable_to_non_nullable
as bool,assignedToMe: null == assignedToMe ? _self.assignedToMe : assignedToMe // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$HomeworkPhoto {

 String get id; String get fileKey; int get pages; String get uploadedAt;
/// Create a copy of HomeworkPhoto
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HomeworkPhotoCopyWith<HomeworkPhoto> get copyWith => _$HomeworkPhotoCopyWithImpl<HomeworkPhoto>(this as HomeworkPhoto, _$identity);

  /// Serializes this HomeworkPhoto to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HomeworkPhoto;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HomeworkPhoto&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.fileKey, _this.fileKey) || other.fileKey == _this.fileKey)&&(identical(other.pages, _this.pages) || other.pages == _this.pages)&&(identical(other.uploadedAt, _this.uploadedAt) || other.uploadedAt == _this.uploadedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HomeworkPhoto;
  return Object.hash(runtimeType,_this.id,_this.fileKey,_this.pages,_this.uploadedAt);
}

@override
String toString() {
  final _this = this as HomeworkPhoto;
  return 'HomeworkPhoto(id: ${_this.id}, fileKey: ${_this.fileKey}, pages: ${_this.pages}, uploadedAt: ${_this.uploadedAt})';
}


}

/// @nodoc
abstract mixin class $HomeworkPhotoCopyWith<$Res>  {
  factory $HomeworkPhotoCopyWith(HomeworkPhoto value, $Res Function(HomeworkPhoto) _then) = _$HomeworkPhotoCopyWithImpl;
@useResult
$Res call({
 String id, String fileKey, int pages, String uploadedAt
});




}
/// @nodoc
class _$HomeworkPhotoCopyWithImpl<$Res>
    implements $HomeworkPhotoCopyWith<$Res> {
  _$HomeworkPhotoCopyWithImpl(this._self, this._then);

  final HomeworkPhoto _self;
  final $Res Function(HomeworkPhoto) _then;

/// Create a copy of HomeworkPhoto
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? fileKey = null,Object? pages = null,Object? uploadedAt = null,}) {
  return _then(HomeworkPhoto(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,fileKey: null == fileKey ? _self.fileKey : fileKey // ignore: cast_nullable_to_non_nullable
as String,pages: null == pages ? _self.pages : pages // ignore: cast_nullable_to_non_nullable
as int,uploadedAt: null == uploadedAt ? _self.uploadedAt : uploadedAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [HomeworkPhoto].
extension HomeworkPhotoPatterns on HomeworkPhoto {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HomeworkPhoto value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HomeworkPhoto() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HomeworkPhoto value)  $default,){
final _that = this;
switch (_that) {
case _HomeworkPhoto():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HomeworkPhoto value)?  $default,){
final _that = this;
switch (_that) {
case _HomeworkPhoto() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String fileKey,  int pages,  String uploadedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HomeworkPhoto() when $default != null:
return $default(_that.id,_that.fileKey,_that.pages,_that.uploadedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String fileKey,  int pages,  String uploadedAt)  $default,) {final _that = this;
switch (_that) {
case _HomeworkPhoto():
return $default(_that.id,_that.fileKey,_that.pages,_that.uploadedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String fileKey,  int pages,  String uploadedAt)?  $default,) {final _that = this;
switch (_that) {
case _HomeworkPhoto() when $default != null:
return $default(_that.id,_that.fileKey,_that.pages,_that.uploadedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HomeworkPhoto implements HomeworkPhoto {
  const _HomeworkPhoto({required this.id, required this.fileKey, this.pages = 1, required this.uploadedAt});
  factory _HomeworkPhoto.fromJson(Map<String, dynamic> json) => _$HomeworkPhotoFromJson(json);

@override final  String id;
@override final  String fileKey;
@override@JsonKey() final  int pages;
@override final  String uploadedAt;

/// Create a copy of HomeworkPhoto
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HomeworkPhotoCopyWith<_HomeworkPhoto> get copyWith => __$HomeworkPhotoCopyWithImpl<_HomeworkPhoto>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HomeworkPhotoToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HomeworkPhoto&&(identical(other.id, id) || other.id == id)&&(identical(other.fileKey, fileKey) || other.fileKey == fileKey)&&(identical(other.pages, pages) || other.pages == pages)&&(identical(other.uploadedAt, uploadedAt) || other.uploadedAt == uploadedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,fileKey,pages,uploadedAt);
}

@override
String toString() {
    return 'HomeworkPhoto(id: $id, fileKey: $fileKey, pages: $pages, uploadedAt: $uploadedAt)';
}


}

/// @nodoc
abstract mixin class _$HomeworkPhotoCopyWith<$Res> implements $HomeworkPhotoCopyWith<$Res> {
  factory _$HomeworkPhotoCopyWith(_HomeworkPhoto value, $Res Function(_HomeworkPhoto) _then) = __$HomeworkPhotoCopyWithImpl;
@override @useResult
$Res call({
 String id, String fileKey, int pages, String uploadedAt
});




}
/// @nodoc
class __$HomeworkPhotoCopyWithImpl<$Res>
    implements _$HomeworkPhotoCopyWith<$Res> {
  __$HomeworkPhotoCopyWithImpl(this._self, this._then);

  final _HomeworkPhoto _self;
  final $Res Function(_HomeworkPhoto) _then;

/// Create a copy of HomeworkPhoto
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? fileKey = null,Object? pages = null,Object? uploadedAt = null,}) {
  return _then(_HomeworkPhoto(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,fileKey: null == fileKey ? _self.fileKey : fileKey // ignore: cast_nullable_to_non_nullable
as String,pages: null == pages ? _self.pages : pages // ignore: cast_nullable_to_non_nullable
as int,uploadedAt: null == uploadedAt ? _self.uploadedAt : uploadedAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$HubTestRow {

 String? get testId; String get title; String? get variant; String get date; String get classroomName; int get problemCount; bool get open;@JsonKey(unknownEnumValue: _nullEnum) TestClosedReason? get closedReason;
/// Create a copy of HubTestRow
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HubTestRowCopyWith<HubTestRow> get copyWith => _$HubTestRowCopyWithImpl<HubTestRow>(this as HubTestRow, _$identity);

  /// Serializes this HubTestRow to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HubTestRow;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HubTestRow&&(identical(other.testId, _this.testId) || other.testId == _this.testId)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.variant, _this.variant) || other.variant == _this.variant)&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.classroomName, _this.classroomName) || other.classroomName == _this.classroomName)&&(identical(other.problemCount, _this.problemCount) || other.problemCount == _this.problemCount)&&(identical(other.open, _this.open) || other.open == _this.open)&&(identical(other.closedReason, _this.closedReason) || other.closedReason == _this.closedReason));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HubTestRow;
  return Object.hash(runtimeType,_this.testId,_this.title,_this.variant,_this.date,_this.classroomName,_this.problemCount,_this.open,_this.closedReason);
}

@override
String toString() {
  final _this = this as HubTestRow;
  return 'HubTestRow(testId: ${_this.testId}, title: ${_this.title}, variant: ${_this.variant}, date: ${_this.date}, classroomName: ${_this.classroomName}, problemCount: ${_this.problemCount}, open: ${_this.open}, closedReason: ${_this.closedReason})';
}


}

/// @nodoc
abstract mixin class $HubTestRowCopyWith<$Res>  {
  factory $HubTestRowCopyWith(HubTestRow value, $Res Function(HubTestRow) _then) = _$HubTestRowCopyWithImpl;
@useResult
$Res call({
 String? testId, String title, String? variant, String date, String classroomName, int problemCount, bool open,@JsonKey(unknownEnumValue: _nullEnum) TestClosedReason? closedReason
});




}
/// @nodoc
class _$HubTestRowCopyWithImpl<$Res>
    implements $HubTestRowCopyWith<$Res> {
  _$HubTestRowCopyWithImpl(this._self, this._then);

  final HubTestRow _self;
  final $Res Function(HubTestRow) _then;

/// Create a copy of HubTestRow
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? testId = freezed,Object? title = null,Object? variant = freezed,Object? date = null,Object? classroomName = null,Object? problemCount = null,Object? open = null,Object? closedReason = freezed,}) {
  return _then(HubTestRow(
testId: freezed == testId ? _self.testId : testId // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,variant: freezed == variant ? _self.variant : variant // ignore: cast_nullable_to_non_nullable
as String?,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,problemCount: null == problemCount ? _self.problemCount : problemCount // ignore: cast_nullable_to_non_nullable
as int,open: null == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as bool,closedReason: freezed == closedReason ? _self.closedReason : closedReason // ignore: cast_nullable_to_non_nullable
as TestClosedReason?,
  ));
}

}


/// Adds pattern-matching-related methods to [HubTestRow].
extension HubTestRowPatterns on HubTestRow {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HubTestRow value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HubTestRow() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HubTestRow value)  $default,){
final _that = this;
switch (_that) {
case _HubTestRow():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HubTestRow value)?  $default,){
final _that = this;
switch (_that) {
case _HubTestRow() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? testId,  String title,  String? variant,  String date,  String classroomName,  int problemCount,  bool open, @JsonKey(unknownEnumValue: _nullEnum)  TestClosedReason? closedReason)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HubTestRow() when $default != null:
return $default(_that.testId,_that.title,_that.variant,_that.date,_that.classroomName,_that.problemCount,_that.open,_that.closedReason);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? testId,  String title,  String? variant,  String date,  String classroomName,  int problemCount,  bool open, @JsonKey(unknownEnumValue: _nullEnum)  TestClosedReason? closedReason)  $default,) {final _that = this;
switch (_that) {
case _HubTestRow():
return $default(_that.testId,_that.title,_that.variant,_that.date,_that.classroomName,_that.problemCount,_that.open,_that.closedReason);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? testId,  String title,  String? variant,  String date,  String classroomName,  int problemCount,  bool open, @JsonKey(unknownEnumValue: _nullEnum)  TestClosedReason? closedReason)?  $default,) {final _that = this;
switch (_that) {
case _HubTestRow() when $default != null:
return $default(_that.testId,_that.title,_that.variant,_that.date,_that.classroomName,_that.problemCount,_that.open,_that.closedReason);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HubTestRow implements HubTestRow {
  const _HubTestRow({this.testId, required this.title, this.variant, required this.date, this.classroomName = '', this.problemCount = 0, this.open = false, @JsonKey(unknownEnumValue: _nullEnum) this.closedReason});
  factory _HubTestRow.fromJson(Map<String, dynamic> json) => _$HubTestRowFromJson(json);

@override final  String? testId;
@override final  String title;
@override final  String? variant;
@override final  String date;
@override@JsonKey() final  String classroomName;
@override@JsonKey() final  int problemCount;
@override@JsonKey() final  bool open;
@override@JsonKey(unknownEnumValue: _nullEnum) final  TestClosedReason? closedReason;

/// Create a copy of HubTestRow
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HubTestRowCopyWith<_HubTestRow> get copyWith => __$HubTestRowCopyWithImpl<_HubTestRow>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HubTestRowToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HubTestRow&&(identical(other.testId, testId) || other.testId == testId)&&(identical(other.title, title) || other.title == title)&&(identical(other.variant, variant) || other.variant == variant)&&(identical(other.date, date) || other.date == date)&&(identical(other.classroomName, classroomName) || other.classroomName == classroomName)&&(identical(other.problemCount, problemCount) || other.problemCount == problemCount)&&(identical(other.open, open) || other.open == open)&&(identical(other.closedReason, closedReason) || other.closedReason == closedReason));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,testId,title,variant,date,classroomName,problemCount,open,closedReason);
}

@override
String toString() {
    return 'HubTestRow(testId: $testId, title: $title, variant: $variant, date: $date, classroomName: $classroomName, problemCount: $problemCount, open: $open, closedReason: $closedReason)';
}


}

/// @nodoc
abstract mixin class _$HubTestRowCopyWith<$Res> implements $HubTestRowCopyWith<$Res> {
  factory _$HubTestRowCopyWith(_HubTestRow value, $Res Function(_HubTestRow) _then) = __$HubTestRowCopyWithImpl;
@override @useResult
$Res call({
 String? testId, String title, String? variant, String date, String classroomName, int problemCount, bool open,@JsonKey(unknownEnumValue: _nullEnum) TestClosedReason? closedReason
});




}
/// @nodoc
class __$HubTestRowCopyWithImpl<$Res>
    implements _$HubTestRowCopyWith<$Res> {
  __$HubTestRowCopyWithImpl(this._self, this._then);

  final _HubTestRow _self;
  final $Res Function(_HubTestRow) _then;

/// Create a copy of HubTestRow
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? testId = freezed,Object? title = null,Object? variant = freezed,Object? date = null,Object? classroomName = null,Object? problemCount = null,Object? open = null,Object? closedReason = freezed,}) {
  return _then(_HubTestRow(
testId: freezed == testId ? _self.testId : testId // ignore: cast_nullable_to_non_nullable
as String?,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,variant: freezed == variant ? _self.variant : variant // ignore: cast_nullable_to_non_nullable
as String?,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,problemCount: null == problemCount ? _self.problemCount : problemCount // ignore: cast_nullable_to_non_nullable
as int,open: null == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as bool,closedReason: freezed == closedReason ? _self.closedReason : closedReason // ignore: cast_nullable_to_non_nullable
as TestClosedReason?,
  ));
}


}


/// @nodoc
mixin _$HubTestDetail {

 String get testId; String get title; String? get variant; String get date;/// А хувилбар (ангид хийдэг) — хариу хэзээ ч ирэхгүй, «Хариу харах» товчгүй (вэб 2026-11-10).
 bool get answersHidden; List<HubProblem> get problems;
/// Create a copy of HubTestDetail
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HubTestDetailCopyWith<HubTestDetail> get copyWith => _$HubTestDetailCopyWithImpl<HubTestDetail>(this as HubTestDetail, _$identity);

  /// Serializes this HubTestDetail to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HubTestDetail;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HubTestDetail&&(identical(other.testId, _this.testId) || other.testId == _this.testId)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.variant, _this.variant) || other.variant == _this.variant)&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.answersHidden, _this.answersHidden) || other.answersHidden == _this.answersHidden)&&const DeepCollectionEquality().equals(other.problems, _this.problems));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HubTestDetail;
  return Object.hash(runtimeType,_this.testId,_this.title,_this.variant,_this.date,_this.answersHidden,const DeepCollectionEquality().hash(_this.problems));
}

@override
String toString() {
  final _this = this as HubTestDetail;
  return 'HubTestDetail(testId: ${_this.testId}, title: ${_this.title}, variant: ${_this.variant}, date: ${_this.date}, answersHidden: ${_this.answersHidden}, problems: ${_this.problems})';
}


}

/// @nodoc
abstract mixin class $HubTestDetailCopyWith<$Res>  {
  factory $HubTestDetailCopyWith(HubTestDetail value, $Res Function(HubTestDetail) _then) = _$HubTestDetailCopyWithImpl;
@useResult
$Res call({
 String testId, String title, String? variant, String date, bool answersHidden, List<HubProblem> problems
});




}
/// @nodoc
class _$HubTestDetailCopyWithImpl<$Res>
    implements $HubTestDetailCopyWith<$Res> {
  _$HubTestDetailCopyWithImpl(this._self, this._then);

  final HubTestDetail _self;
  final $Res Function(HubTestDetail) _then;

/// Create a copy of HubTestDetail
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? testId = null,Object? title = null,Object? variant = freezed,Object? date = null,Object? answersHidden = null,Object? problems = null,}) {
  return _then(HubTestDetail(
testId: null == testId ? _self.testId : testId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,variant: freezed == variant ? _self.variant : variant // ignore: cast_nullable_to_non_nullable
as String?,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,answersHidden: null == answersHidden ? _self.answersHidden : answersHidden // ignore: cast_nullable_to_non_nullable
as bool,problems: null == problems ? _self.problems : problems // ignore: cast_nullable_to_non_nullable
as List<HubProblem>,
  ));
}

}


/// Adds pattern-matching-related methods to [HubTestDetail].
extension HubTestDetailPatterns on HubTestDetail {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HubTestDetail value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HubTestDetail() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HubTestDetail value)  $default,){
final _that = this;
switch (_that) {
case _HubTestDetail():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HubTestDetail value)?  $default,){
final _that = this;
switch (_that) {
case _HubTestDetail() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String testId,  String title,  String? variant,  String date,  bool answersHidden,  List<HubProblem> problems)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HubTestDetail() when $default != null:
return $default(_that.testId,_that.title,_that.variant,_that.date,_that.answersHidden,_that.problems);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String testId,  String title,  String? variant,  String date,  bool answersHidden,  List<HubProblem> problems)  $default,) {final _that = this;
switch (_that) {
case _HubTestDetail():
return $default(_that.testId,_that.title,_that.variant,_that.date,_that.answersHidden,_that.problems);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String testId,  String title,  String? variant,  String date,  bool answersHidden,  List<HubProblem> problems)?  $default,) {final _that = this;
switch (_that) {
case _HubTestDetail() when $default != null:
return $default(_that.testId,_that.title,_that.variant,_that.date,_that.answersHidden,_that.problems);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HubTestDetail implements HubTestDetail {
  const _HubTestDetail({required this.testId, required this.title, this.variant, required this.date, this.answersHidden = false,  List<HubProblem> problems = const <HubProblem>[]}): _problems = problems;
  factory _HubTestDetail.fromJson(Map<String, dynamic> json) => _$HubTestDetailFromJson(json);

@override final  String testId;
@override final  String title;
@override final  String? variant;
@override final  String date;
/// А хувилбар (ангид хийдэг) — хариу хэзээ ч ирэхгүй, «Хариу харах» товчгүй (вэб 2026-11-10).
@override@JsonKey() final  bool answersHidden;
 final  List<HubProblem> _problems;
@override@JsonKey() List<HubProblem> get problems {
  if (_problems is EqualUnmodifiableListView) return _problems;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_problems);
}


/// Create a copy of HubTestDetail
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HubTestDetailCopyWith<_HubTestDetail> get copyWith => __$HubTestDetailCopyWithImpl<_HubTestDetail>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HubTestDetailToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HubTestDetail&&(identical(other.testId, testId) || other.testId == testId)&&(identical(other.title, title) || other.title == title)&&(identical(other.variant, variant) || other.variant == variant)&&(identical(other.date, date) || other.date == date)&&(identical(other.answersHidden, answersHidden) || other.answersHidden == answersHidden)&&const DeepCollectionEquality().equals(other.problems, _problems));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,testId,title,variant,date,answersHidden,const DeepCollectionEquality().hash(_problems));
}

@override
String toString() {
    return 'HubTestDetail(testId: $testId, title: $title, variant: $variant, date: $date, answersHidden: $answersHidden, problems: $problems)';
}


}

/// @nodoc
abstract mixin class _$HubTestDetailCopyWith<$Res> implements $HubTestDetailCopyWith<$Res> {
  factory _$HubTestDetailCopyWith(_HubTestDetail value, $Res Function(_HubTestDetail) _then) = __$HubTestDetailCopyWithImpl;
@override @useResult
$Res call({
 String testId, String title, String? variant, String date, bool answersHidden, List<HubProblem> problems
});




}
/// @nodoc
class __$HubTestDetailCopyWithImpl<$Res>
    implements _$HubTestDetailCopyWith<$Res> {
  __$HubTestDetailCopyWithImpl(this._self, this._then);

  final _HubTestDetail _self;
  final $Res Function(_HubTestDetail) _then;

/// Create a copy of HubTestDetail
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? testId = null,Object? title = null,Object? variant = freezed,Object? date = null,Object? answersHidden = null,Object? problems = null,}) {
  return _then(_HubTestDetail(
testId: null == testId ? _self.testId : testId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,variant: freezed == variant ? _self.variant : variant // ignore: cast_nullable_to_non_nullable
as String?,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,answersHidden: null == answersHidden ? _self.answersHidden : answersHidden // ignore: cast_nullable_to_non_nullable
as bool,problems: null == problems ? _self._problems : problems // ignore: cast_nullable_to_non_nullable
as List<HubProblem>,
  ));
}


}


/// @nodoc
mixin _$HubProblem {

 String get id; int get order; String? get stem; String? get imageKey; List<HubChoice> get choices; String? get correctAnswer; bool get hasVideo;
/// Create a copy of HubProblem
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HubProblemCopyWith<HubProblem> get copyWith => _$HubProblemCopyWithImpl<HubProblem>(this as HubProblem, _$identity);

  /// Serializes this HubProblem to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HubProblem;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HubProblem&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.order, _this.order) || other.order == _this.order)&&(identical(other.stem, _this.stem) || other.stem == _this.stem)&&(identical(other.imageKey, _this.imageKey) || other.imageKey == _this.imageKey)&&const DeepCollectionEquality().equals(other.choices, _this.choices)&&(identical(other.correctAnswer, _this.correctAnswer) || other.correctAnswer == _this.correctAnswer)&&(identical(other.hasVideo, _this.hasVideo) || other.hasVideo == _this.hasVideo));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HubProblem;
  return Object.hash(runtimeType,_this.id,_this.order,_this.stem,_this.imageKey,const DeepCollectionEquality().hash(_this.choices),_this.correctAnswer,_this.hasVideo);
}

@override
String toString() {
  final _this = this as HubProblem;
  return 'HubProblem(id: ${_this.id}, order: ${_this.order}, stem: ${_this.stem}, imageKey: ${_this.imageKey}, choices: ${_this.choices}, correctAnswer: ${_this.correctAnswer}, hasVideo: ${_this.hasVideo})';
}


}

/// @nodoc
abstract mixin class $HubProblemCopyWith<$Res>  {
  factory $HubProblemCopyWith(HubProblem value, $Res Function(HubProblem) _then) = _$HubProblemCopyWithImpl;
@useResult
$Res call({
 String id, int order, String? stem, String? imageKey, List<HubChoice> choices, String? correctAnswer, bool hasVideo
});




}
/// @nodoc
class _$HubProblemCopyWithImpl<$Res>
    implements $HubProblemCopyWith<$Res> {
  _$HubProblemCopyWithImpl(this._self, this._then);

  final HubProblem _self;
  final $Res Function(HubProblem) _then;

/// Create a copy of HubProblem
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? order = null,Object? stem = freezed,Object? imageKey = freezed,Object? choices = null,Object? correctAnswer = freezed,Object? hasVideo = null,}) {
  return _then(HubProblem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,order: null == order ? _self.order : order // ignore: cast_nullable_to_non_nullable
as int,stem: freezed == stem ? _self.stem : stem // ignore: cast_nullable_to_non_nullable
as String?,imageKey: freezed == imageKey ? _self.imageKey : imageKey // ignore: cast_nullable_to_non_nullable
as String?,choices: null == choices ? _self.choices : choices // ignore: cast_nullable_to_non_nullable
as List<HubChoice>,correctAnswer: freezed == correctAnswer ? _self.correctAnswer : correctAnswer // ignore: cast_nullable_to_non_nullable
as String?,hasVideo: null == hasVideo ? _self.hasVideo : hasVideo // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [HubProblem].
extension HubProblemPatterns on HubProblem {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HubProblem value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HubProblem() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HubProblem value)  $default,){
final _that = this;
switch (_that) {
case _HubProblem():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HubProblem value)?  $default,){
final _that = this;
switch (_that) {
case _HubProblem() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  int order,  String? stem,  String? imageKey,  List<HubChoice> choices,  String? correctAnswer,  bool hasVideo)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HubProblem() when $default != null:
return $default(_that.id,_that.order,_that.stem,_that.imageKey,_that.choices,_that.correctAnswer,_that.hasVideo);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  int order,  String? stem,  String? imageKey,  List<HubChoice> choices,  String? correctAnswer,  bool hasVideo)  $default,) {final _that = this;
switch (_that) {
case _HubProblem():
return $default(_that.id,_that.order,_that.stem,_that.imageKey,_that.choices,_that.correctAnswer,_that.hasVideo);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  int order,  String? stem,  String? imageKey,  List<HubChoice> choices,  String? correctAnswer,  bool hasVideo)?  $default,) {final _that = this;
switch (_that) {
case _HubProblem() when $default != null:
return $default(_that.id,_that.order,_that.stem,_that.imageKey,_that.choices,_that.correctAnswer,_that.hasVideo);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HubProblem implements HubProblem {
  const _HubProblem({required this.id, this.order = 0, this.stem, this.imageKey,  List<HubChoice> choices = const <HubChoice>[], this.correctAnswer, this.hasVideo = false}): _choices = choices;
  factory _HubProblem.fromJson(Map<String, dynamic> json) => _$HubProblemFromJson(json);

@override final  String id;
@override@JsonKey() final  int order;
@override final  String? stem;
@override final  String? imageKey;
 final  List<HubChoice> _choices;
@override@JsonKey() List<HubChoice> get choices {
  if (_choices is EqualUnmodifiableListView) return _choices;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_choices);
}

@override final  String? correctAnswer;
@override@JsonKey() final  bool hasVideo;

/// Create a copy of HubProblem
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HubProblemCopyWith<_HubProblem> get copyWith => __$HubProblemCopyWithImpl<_HubProblem>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HubProblemToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HubProblem&&(identical(other.id, id) || other.id == id)&&(identical(other.order, order) || other.order == order)&&(identical(other.stem, stem) || other.stem == stem)&&(identical(other.imageKey, imageKey) || other.imageKey == imageKey)&&const DeepCollectionEquality().equals(other.choices, _choices)&&(identical(other.correctAnswer, correctAnswer) || other.correctAnswer == correctAnswer)&&(identical(other.hasVideo, hasVideo) || other.hasVideo == hasVideo));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,order,stem,imageKey,const DeepCollectionEquality().hash(_choices),correctAnswer,hasVideo);
}

@override
String toString() {
    return 'HubProblem(id: $id, order: $order, stem: $stem, imageKey: $imageKey, choices: $choices, correctAnswer: $correctAnswer, hasVideo: $hasVideo)';
}


}

/// @nodoc
abstract mixin class _$HubProblemCopyWith<$Res> implements $HubProblemCopyWith<$Res> {
  factory _$HubProblemCopyWith(_HubProblem value, $Res Function(_HubProblem) _then) = __$HubProblemCopyWithImpl;
@override @useResult
$Res call({
 String id, int order, String? stem, String? imageKey, List<HubChoice> choices, String? correctAnswer, bool hasVideo
});




}
/// @nodoc
class __$HubProblemCopyWithImpl<$Res>
    implements _$HubProblemCopyWith<$Res> {
  __$HubProblemCopyWithImpl(this._self, this._then);

  final _HubProblem _self;
  final $Res Function(_HubProblem) _then;

/// Create a copy of HubProblem
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? order = null,Object? stem = freezed,Object? imageKey = freezed,Object? choices = null,Object? correctAnswer = freezed,Object? hasVideo = null,}) {
  return _then(_HubProblem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,order: null == order ? _self.order : order // ignore: cast_nullable_to_non_nullable
as int,stem: freezed == stem ? _self.stem : stem // ignore: cast_nullable_to_non_nullable
as String?,imageKey: freezed == imageKey ? _self.imageKey : imageKey // ignore: cast_nullable_to_non_nullable
as String?,choices: null == choices ? _self._choices : choices // ignore: cast_nullable_to_non_nullable
as List<HubChoice>,correctAnswer: freezed == correctAnswer ? _self.correctAnswer : correctAnswer // ignore: cast_nullable_to_non_nullable
as String?,hasVideo: null == hasVideo ? _self.hasVideo : hasVideo // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$HubChoice {

 String get label; String get text; String? get imageKey;
/// Create a copy of HubChoice
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HubChoiceCopyWith<HubChoice> get copyWith => _$HubChoiceCopyWithImpl<HubChoice>(this as HubChoice, _$identity);

  /// Serializes this HubChoice to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HubChoice;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HubChoice&&(identical(other.label, _this.label) || other.label == _this.label)&&(identical(other.text, _this.text) || other.text == _this.text)&&(identical(other.imageKey, _this.imageKey) || other.imageKey == _this.imageKey));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HubChoice;
  return Object.hash(runtimeType,_this.label,_this.text,_this.imageKey);
}

@override
String toString() {
  final _this = this as HubChoice;
  return 'HubChoice(label: ${_this.label}, text: ${_this.text}, imageKey: ${_this.imageKey})';
}


}

/// @nodoc
abstract mixin class $HubChoiceCopyWith<$Res>  {
  factory $HubChoiceCopyWith(HubChoice value, $Res Function(HubChoice) _then) = _$HubChoiceCopyWithImpl;
@useResult
$Res call({
 String label, String text, String? imageKey
});




}
/// @nodoc
class _$HubChoiceCopyWithImpl<$Res>
    implements $HubChoiceCopyWith<$Res> {
  _$HubChoiceCopyWithImpl(this._self, this._then);

  final HubChoice _self;
  final $Res Function(HubChoice) _then;

/// Create a copy of HubChoice
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? label = null,Object? text = null,Object? imageKey = freezed,}) {
  return _then(HubChoice(
label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,text: null == text ? _self.text : text // ignore: cast_nullable_to_non_nullable
as String,imageKey: freezed == imageKey ? _self.imageKey : imageKey // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [HubChoice].
extension HubChoicePatterns on HubChoice {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HubChoice value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HubChoice() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HubChoice value)  $default,){
final _that = this;
switch (_that) {
case _HubChoice():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HubChoice value)?  $default,){
final _that = this;
switch (_that) {
case _HubChoice() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String label,  String text,  String? imageKey)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HubChoice() when $default != null:
return $default(_that.label,_that.text,_that.imageKey);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String label,  String text,  String? imageKey)  $default,) {final _that = this;
switch (_that) {
case _HubChoice():
return $default(_that.label,_that.text,_that.imageKey);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String label,  String text,  String? imageKey)?  $default,) {final _that = this;
switch (_that) {
case _HubChoice() when $default != null:
return $default(_that.label,_that.text,_that.imageKey);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HubChoice implements HubChoice {
  const _HubChoice({required this.label, this.text = '', this.imageKey});
  factory _HubChoice.fromJson(Map<String, dynamic> json) => _$HubChoiceFromJson(json);

@override final  String label;
@override@JsonKey() final  String text;
@override final  String? imageKey;

/// Create a copy of HubChoice
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HubChoiceCopyWith<_HubChoice> get copyWith => __$HubChoiceCopyWithImpl<_HubChoice>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HubChoiceToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HubChoice&&(identical(other.label, label) || other.label == label)&&(identical(other.text, text) || other.text == text)&&(identical(other.imageKey, imageKey) || other.imageKey == imageKey));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,label,text,imageKey);
}

@override
String toString() {
    return 'HubChoice(label: $label, text: $text, imageKey: $imageKey)';
}


}

/// @nodoc
abstract mixin class _$HubChoiceCopyWith<$Res> implements $HubChoiceCopyWith<$Res> {
  factory _$HubChoiceCopyWith(_HubChoice value, $Res Function(_HubChoice) _then) = __$HubChoiceCopyWithImpl;
@override @useResult
$Res call({
 String label, String text, String? imageKey
});




}
/// @nodoc
class __$HubChoiceCopyWithImpl<$Res>
    implements _$HubChoiceCopyWith<$Res> {
  __$HubChoiceCopyWithImpl(this._self, this._then);

  final _HubChoice _self;
  final $Res Function(_HubChoice) _then;

/// Create a copy of HubChoice
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? label = null,Object? text = null,Object? imageKey = freezed,}) {
  return _then(_HubChoice(
label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,text: null == text ? _self.text : text // ignore: cast_nullable_to_non_nullable
as String,imageKey: freezed == imageKey ? _self.imageKey : imageKey // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$AttendanceRow {

 String get date;@JsonKey(unknownEnumValue: _nullEnum) AttendanceStatus? get status;@JsonKey(unknownEnumValue: _nullEnum) LateRange? get lateRange; HubClassroom? get classroom;
/// Create a copy of AttendanceRow
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AttendanceRowCopyWith<AttendanceRow> get copyWith => _$AttendanceRowCopyWithImpl<AttendanceRow>(this as AttendanceRow, _$identity);

  /// Serializes this AttendanceRow to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as AttendanceRow;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AttendanceRow&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.lateRange, _this.lateRange) || other.lateRange == _this.lateRange)&&(identical(other.classroom, _this.classroom) || other.classroom == _this.classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as AttendanceRow;
  return Object.hash(runtimeType,_this.date,_this.status,_this.lateRange,_this.classroom);
}

@override
String toString() {
  final _this = this as AttendanceRow;
  return 'AttendanceRow(date: ${_this.date}, status: ${_this.status}, lateRange: ${_this.lateRange}, classroom: ${_this.classroom})';
}


}

/// @nodoc
abstract mixin class $AttendanceRowCopyWith<$Res>  {
  factory $AttendanceRowCopyWith(AttendanceRow value, $Res Function(AttendanceRow) _then) = _$AttendanceRowCopyWithImpl;
@useResult
$Res call({
 String date,@JsonKey(unknownEnumValue: _nullEnum) AttendanceStatus? status,@JsonKey(unknownEnumValue: _nullEnum) LateRange? lateRange, HubClassroom? classroom
});


$HubClassroomCopyWith<$Res>? get classroom;

}
/// @nodoc
class _$AttendanceRowCopyWithImpl<$Res>
    implements $AttendanceRowCopyWith<$Res> {
  _$AttendanceRowCopyWithImpl(this._self, this._then);

  final AttendanceRow _self;
  final $Res Function(AttendanceRow) _then;

/// Create a copy of AttendanceRow
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? date = null,Object? status = freezed,Object? lateRange = freezed,Object? classroom = freezed,}) {
  return _then(AttendanceRow(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as AttendanceStatus?,lateRange: freezed == lateRange ? _self.lateRange : lateRange // ignore: cast_nullable_to_non_nullable
as LateRange?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as HubClassroom?,
  ));
}
/// Create a copy of AttendanceRow
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HubClassroomCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $HubClassroomCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// Adds pattern-matching-related methods to [AttendanceRow].
extension AttendanceRowPatterns on AttendanceRow {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AttendanceRow value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AttendanceRow() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AttendanceRow value)  $default,){
final _that = this;
switch (_that) {
case _AttendanceRow():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AttendanceRow value)?  $default,){
final _that = this;
switch (_that) {
case _AttendanceRow() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String date, @JsonKey(unknownEnumValue: _nullEnum)  AttendanceStatus? status, @JsonKey(unknownEnumValue: _nullEnum)  LateRange? lateRange,  HubClassroom? classroom)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AttendanceRow() when $default != null:
return $default(_that.date,_that.status,_that.lateRange,_that.classroom);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String date, @JsonKey(unknownEnumValue: _nullEnum)  AttendanceStatus? status, @JsonKey(unknownEnumValue: _nullEnum)  LateRange? lateRange,  HubClassroom? classroom)  $default,) {final _that = this;
switch (_that) {
case _AttendanceRow():
return $default(_that.date,_that.status,_that.lateRange,_that.classroom);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String date, @JsonKey(unknownEnumValue: _nullEnum)  AttendanceStatus? status, @JsonKey(unknownEnumValue: _nullEnum)  LateRange? lateRange,  HubClassroom? classroom)?  $default,) {final _that = this;
switch (_that) {
case _AttendanceRow() when $default != null:
return $default(_that.date,_that.status,_that.lateRange,_that.classroom);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AttendanceRow implements AttendanceRow {
  const _AttendanceRow({required this.date, @JsonKey(unknownEnumValue: _nullEnum) this.status, @JsonKey(unknownEnumValue: _nullEnum) this.lateRange, this.classroom});
  factory _AttendanceRow.fromJson(Map<String, dynamic> json) => _$AttendanceRowFromJson(json);

@override final  String date;
@override@JsonKey(unknownEnumValue: _nullEnum) final  AttendanceStatus? status;
@override@JsonKey(unknownEnumValue: _nullEnum) final  LateRange? lateRange;
@override final  HubClassroom? classroom;

/// Create a copy of AttendanceRow
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AttendanceRowCopyWith<_AttendanceRow> get copyWith => __$AttendanceRowCopyWithImpl<_AttendanceRow>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AttendanceRowToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _AttendanceRow&&(identical(other.date, date) || other.date == date)&&(identical(other.status, status) || other.status == status)&&(identical(other.lateRange, lateRange) || other.lateRange == lateRange)&&(identical(other.classroom, classroom) || other.classroom == classroom));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,date,status,lateRange,classroom);
}

@override
String toString() {
    return 'AttendanceRow(date: $date, status: $status, lateRange: $lateRange, classroom: $classroom)';
}


}

/// @nodoc
abstract mixin class _$AttendanceRowCopyWith<$Res> implements $AttendanceRowCopyWith<$Res> {
  factory _$AttendanceRowCopyWith(_AttendanceRow value, $Res Function(_AttendanceRow) _then) = __$AttendanceRowCopyWithImpl;
@override @useResult
$Res call({
 String date,@JsonKey(unknownEnumValue: _nullEnum) AttendanceStatus? status,@JsonKey(unknownEnumValue: _nullEnum) LateRange? lateRange, HubClassroom? classroom
});


@override $HubClassroomCopyWith<$Res>? get classroom;

}
/// @nodoc
class __$AttendanceRowCopyWithImpl<$Res>
    implements _$AttendanceRowCopyWith<$Res> {
  __$AttendanceRowCopyWithImpl(this._self, this._then);

  final _AttendanceRow _self;
  final $Res Function(_AttendanceRow) _then;

/// Create a copy of AttendanceRow
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? date = null,Object? status = freezed,Object? lateRange = freezed,Object? classroom = freezed,}) {
  return _then(_AttendanceRow(
date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,status: freezed == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as AttendanceStatus?,lateRange: freezed == lateRange ? _self.lateRange : lateRange // ignore: cast_nullable_to_non_nullable
as LateRange?,classroom: freezed == classroom ? _self.classroom : classroom // ignore: cast_nullable_to_non_nullable
as HubClassroom?,
  ));
}

/// Create a copy of AttendanceRow
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HubClassroomCopyWith<$Res>? get classroom {
    if (_self.classroom == null) {
    return null;
  }

  return $HubClassroomCopyWith<$Res>(_self.classroom!, (value) {
    return _then(_self.copyWith(classroom: value));
  });
}
}


/// @nodoc
mixin _$MakeupItem {

 String get classroomId; String get classroomName; String get date;@JsonKey(unknownEnumValue: MakeupReason.absent) MakeupReason get reason;@JsonKey(unknownEnumValue: MakeupStatus.pending) MakeupStatus get status; int get photos; List<String> get imageKeys; String? get submittedAt; bool get resubmit; bool get photosAccepted; List<MakeupTest> get tests;
/// Create a copy of MakeupItem
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MakeupItemCopyWith<MakeupItem> get copyWith => _$MakeupItemCopyWithImpl<MakeupItem>(this as MakeupItem, _$identity);

  /// Serializes this MakeupItem to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as MakeupItem;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MakeupItem&&(identical(other.classroomId, _this.classroomId) || other.classroomId == _this.classroomId)&&(identical(other.classroomName, _this.classroomName) || other.classroomName == _this.classroomName)&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.reason, _this.reason) || other.reason == _this.reason)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.photos, _this.photos) || other.photos == _this.photos)&&const DeepCollectionEquality().equals(other.imageKeys, _this.imageKeys)&&(identical(other.submittedAt, _this.submittedAt) || other.submittedAt == _this.submittedAt)&&(identical(other.resubmit, _this.resubmit) || other.resubmit == _this.resubmit)&&(identical(other.photosAccepted, _this.photosAccepted) || other.photosAccepted == _this.photosAccepted)&&const DeepCollectionEquality().equals(other.tests, _this.tests));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as MakeupItem;
  return Object.hash(runtimeType,_this.classroomId,_this.classroomName,_this.date,_this.reason,_this.status,_this.photos,const DeepCollectionEquality().hash(_this.imageKeys),_this.submittedAt,_this.resubmit,_this.photosAccepted,const DeepCollectionEquality().hash(_this.tests));
}

@override
String toString() {
  final _this = this as MakeupItem;
  return 'MakeupItem(classroomId: ${_this.classroomId}, classroomName: ${_this.classroomName}, date: ${_this.date}, reason: ${_this.reason}, status: ${_this.status}, photos: ${_this.photos}, imageKeys: ${_this.imageKeys}, submittedAt: ${_this.submittedAt}, resubmit: ${_this.resubmit}, photosAccepted: ${_this.photosAccepted}, tests: ${_this.tests})';
}


}

/// @nodoc
abstract mixin class $MakeupItemCopyWith<$Res>  {
  factory $MakeupItemCopyWith(MakeupItem value, $Res Function(MakeupItem) _then) = _$MakeupItemCopyWithImpl;
@useResult
$Res call({
 String classroomId, String classroomName, String date,@JsonKey(unknownEnumValue: MakeupReason.absent) MakeupReason reason,@JsonKey(unknownEnumValue: MakeupStatus.pending) MakeupStatus status, int photos, List<String> imageKeys, String? submittedAt, bool resubmit, bool photosAccepted, List<MakeupTest> tests
});




}
/// @nodoc
class _$MakeupItemCopyWithImpl<$Res>
    implements $MakeupItemCopyWith<$Res> {
  _$MakeupItemCopyWithImpl(this._self, this._then);

  final MakeupItem _self;
  final $Res Function(MakeupItem) _then;

/// Create a copy of MakeupItem
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? classroomId = null,Object? classroomName = null,Object? date = null,Object? reason = null,Object? status = null,Object? photos = null,Object? imageKeys = null,Object? submittedAt = freezed,Object? resubmit = null,Object? photosAccepted = null,Object? tests = null,}) {
  return _then(MakeupItem(
classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,reason: null == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as MakeupReason,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as MakeupStatus,photos: null == photos ? _self.photos : photos // ignore: cast_nullable_to_non_nullable
as int,imageKeys: null == imageKeys ? _self.imageKeys : imageKeys // ignore: cast_nullable_to_non_nullable
as List<String>,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as String?,resubmit: null == resubmit ? _self.resubmit : resubmit // ignore: cast_nullable_to_non_nullable
as bool,photosAccepted: null == photosAccepted ? _self.photosAccepted : photosAccepted // ignore: cast_nullable_to_non_nullable
as bool,tests: null == tests ? _self.tests : tests // ignore: cast_nullable_to_non_nullable
as List<MakeupTest>,
  ));
}

}


/// Adds pattern-matching-related methods to [MakeupItem].
extension MakeupItemPatterns on MakeupItem {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MakeupItem value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MakeupItem() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MakeupItem value)  $default,){
final _that = this;
switch (_that) {
case _MakeupItem():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MakeupItem value)?  $default,){
final _that = this;
switch (_that) {
case _MakeupItem() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String classroomId,  String classroomName,  String date, @JsonKey(unknownEnumValue: MakeupReason.absent)  MakeupReason reason, @JsonKey(unknownEnumValue: MakeupStatus.pending)  MakeupStatus status,  int photos,  List<String> imageKeys,  String? submittedAt,  bool resubmit,  bool photosAccepted,  List<MakeupTest> tests)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MakeupItem() when $default != null:
return $default(_that.classroomId,_that.classroomName,_that.date,_that.reason,_that.status,_that.photos,_that.imageKeys,_that.submittedAt,_that.resubmit,_that.photosAccepted,_that.tests);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String classroomId,  String classroomName,  String date, @JsonKey(unknownEnumValue: MakeupReason.absent)  MakeupReason reason, @JsonKey(unknownEnumValue: MakeupStatus.pending)  MakeupStatus status,  int photos,  List<String> imageKeys,  String? submittedAt,  bool resubmit,  bool photosAccepted,  List<MakeupTest> tests)  $default,) {final _that = this;
switch (_that) {
case _MakeupItem():
return $default(_that.classroomId,_that.classroomName,_that.date,_that.reason,_that.status,_that.photos,_that.imageKeys,_that.submittedAt,_that.resubmit,_that.photosAccepted,_that.tests);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String classroomId,  String classroomName,  String date, @JsonKey(unknownEnumValue: MakeupReason.absent)  MakeupReason reason, @JsonKey(unknownEnumValue: MakeupStatus.pending)  MakeupStatus status,  int photos,  List<String> imageKeys,  String? submittedAt,  bool resubmit,  bool photosAccepted,  List<MakeupTest> tests)?  $default,) {final _that = this;
switch (_that) {
case _MakeupItem() when $default != null:
return $default(_that.classroomId,_that.classroomName,_that.date,_that.reason,_that.status,_that.photos,_that.imageKeys,_that.submittedAt,_that.resubmit,_that.photosAccepted,_that.tests);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MakeupItem extends MakeupItem {
  const _MakeupItem({required this.classroomId, this.classroomName = '', required this.date, @JsonKey(unknownEnumValue: MakeupReason.absent) this.reason = MakeupReason.absent, @JsonKey(unknownEnumValue: MakeupStatus.pending) this.status = MakeupStatus.pending, this.photos = 0,  List<String> imageKeys = const <String>[], this.submittedAt, this.resubmit = false, this.photosAccepted = false,  List<MakeupTest> tests = const <MakeupTest>[]}): _imageKeys = imageKeys,_tests = tests,super._();
  factory _MakeupItem.fromJson(Map<String, dynamic> json) => _$MakeupItemFromJson(json);

@override final  String classroomId;
@override@JsonKey() final  String classroomName;
@override final  String date;
@override@JsonKey(unknownEnumValue: MakeupReason.absent) final  MakeupReason reason;
@override@JsonKey(unknownEnumValue: MakeupStatus.pending) final  MakeupStatus status;
@override@JsonKey() final  int photos;
 final  List<String> _imageKeys;
@override@JsonKey() List<String> get imageKeys {
  if (_imageKeys is EqualUnmodifiableListView) return _imageKeys;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_imageKeys);
}

@override final  String? submittedAt;
@override@JsonKey() final  bool resubmit;
@override@JsonKey() final  bool photosAccepted;
 final  List<MakeupTest> _tests;
@override@JsonKey() List<MakeupTest> get tests {
  if (_tests is EqualUnmodifiableListView) return _tests;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tests);
}


/// Create a copy of MakeupItem
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MakeupItemCopyWith<_MakeupItem> get copyWith => __$MakeupItemCopyWithImpl<_MakeupItem>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MakeupItemToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _MakeupItem&&(identical(other.classroomId, classroomId) || other.classroomId == classroomId)&&(identical(other.classroomName, classroomName) || other.classroomName == classroomName)&&(identical(other.date, date) || other.date == date)&&(identical(other.reason, reason) || other.reason == reason)&&(identical(other.status, status) || other.status == status)&&(identical(other.photos, photos) || other.photos == photos)&&const DeepCollectionEquality().equals(other.imageKeys, _imageKeys)&&(identical(other.submittedAt, submittedAt) || other.submittedAt == submittedAt)&&(identical(other.resubmit, resubmit) || other.resubmit == resubmit)&&(identical(other.photosAccepted, photosAccepted) || other.photosAccepted == photosAccepted)&&const DeepCollectionEquality().equals(other.tests, _tests));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,classroomId,classroomName,date,reason,status,photos,const DeepCollectionEquality().hash(_imageKeys),submittedAt,resubmit,photosAccepted,const DeepCollectionEquality().hash(_tests));
}

@override
String toString() {
    return 'MakeupItem(classroomId: $classroomId, classroomName: $classroomName, date: $date, reason: $reason, status: $status, photos: $photos, imageKeys: $imageKeys, submittedAt: $submittedAt, resubmit: $resubmit, photosAccepted: $photosAccepted, tests: $tests)';
}


}

/// @nodoc
abstract mixin class _$MakeupItemCopyWith<$Res> implements $MakeupItemCopyWith<$Res> {
  factory _$MakeupItemCopyWith(_MakeupItem value, $Res Function(_MakeupItem) _then) = __$MakeupItemCopyWithImpl;
@override @useResult
$Res call({
 String classroomId, String classroomName, String date,@JsonKey(unknownEnumValue: MakeupReason.absent) MakeupReason reason,@JsonKey(unknownEnumValue: MakeupStatus.pending) MakeupStatus status, int photos, List<String> imageKeys, String? submittedAt, bool resubmit, bool photosAccepted, List<MakeupTest> tests
});




}
/// @nodoc
class __$MakeupItemCopyWithImpl<$Res>
    implements _$MakeupItemCopyWith<$Res> {
  __$MakeupItemCopyWithImpl(this._self, this._then);

  final _MakeupItem _self;
  final $Res Function(_MakeupItem) _then;

/// Create a copy of MakeupItem
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? classroomId = null,Object? classroomName = null,Object? date = null,Object? reason = null,Object? status = null,Object? photos = null,Object? imageKeys = null,Object? submittedAt = freezed,Object? resubmit = null,Object? photosAccepted = null,Object? tests = null,}) {
  return _then(_MakeupItem(
classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,reason: null == reason ? _self.reason : reason // ignore: cast_nullable_to_non_nullable
as MakeupReason,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as MakeupStatus,photos: null == photos ? _self.photos : photos // ignore: cast_nullable_to_non_nullable
as int,imageKeys: null == imageKeys ? _self._imageKeys : imageKeys // ignore: cast_nullable_to_non_nullable
as List<String>,submittedAt: freezed == submittedAt ? _self.submittedAt : submittedAt // ignore: cast_nullable_to_non_nullable
as String?,resubmit: null == resubmit ? _self.resubmit : resubmit // ignore: cast_nullable_to_non_nullable
as bool,photosAccepted: null == photosAccepted ? _self.photosAccepted : photosAccepted // ignore: cast_nullable_to_non_nullable
as bool,tests: null == tests ? _self._tests : tests // ignore: cast_nullable_to_non_nullable
as List<MakeupTest>,
  ));
}


}


/// @nodoc
mixin _$MakeupTest {

 String get testId; String get title; String? get variant; bool get done; bool get inClass; bool get online; bool get open;
/// Create a copy of MakeupTest
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MakeupTestCopyWith<MakeupTest> get copyWith => _$MakeupTestCopyWithImpl<MakeupTest>(this as MakeupTest, _$identity);

  /// Serializes this MakeupTest to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as MakeupTest;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MakeupTest&&(identical(other.testId, _this.testId) || other.testId == _this.testId)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.variant, _this.variant) || other.variant == _this.variant)&&(identical(other.done, _this.done) || other.done == _this.done)&&(identical(other.inClass, _this.inClass) || other.inClass == _this.inClass)&&(identical(other.online, _this.online) || other.online == _this.online)&&(identical(other.open, _this.open) || other.open == _this.open));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as MakeupTest;
  return Object.hash(runtimeType,_this.testId,_this.title,_this.variant,_this.done,_this.inClass,_this.online,_this.open);
}

@override
String toString() {
  final _this = this as MakeupTest;
  return 'MakeupTest(testId: ${_this.testId}, title: ${_this.title}, variant: ${_this.variant}, done: ${_this.done}, inClass: ${_this.inClass}, online: ${_this.online}, open: ${_this.open})';
}


}

/// @nodoc
abstract mixin class $MakeupTestCopyWith<$Res>  {
  factory $MakeupTestCopyWith(MakeupTest value, $Res Function(MakeupTest) _then) = _$MakeupTestCopyWithImpl;
@useResult
$Res call({
 String testId, String title, String? variant, bool done, bool inClass, bool online, bool open
});




}
/// @nodoc
class _$MakeupTestCopyWithImpl<$Res>
    implements $MakeupTestCopyWith<$Res> {
  _$MakeupTestCopyWithImpl(this._self, this._then);

  final MakeupTest _self;
  final $Res Function(MakeupTest) _then;

/// Create a copy of MakeupTest
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? testId = null,Object? title = null,Object? variant = freezed,Object? done = null,Object? inClass = null,Object? online = null,Object? open = null,}) {
  return _then(MakeupTest(
testId: null == testId ? _self.testId : testId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,variant: freezed == variant ? _self.variant : variant // ignore: cast_nullable_to_non_nullable
as String?,done: null == done ? _self.done : done // ignore: cast_nullable_to_non_nullable
as bool,inClass: null == inClass ? _self.inClass : inClass // ignore: cast_nullable_to_non_nullable
as bool,online: null == online ? _self.online : online // ignore: cast_nullable_to_non_nullable
as bool,open: null == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [MakeupTest].
extension MakeupTestPatterns on MakeupTest {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MakeupTest value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MakeupTest() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MakeupTest value)  $default,){
final _that = this;
switch (_that) {
case _MakeupTest():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MakeupTest value)?  $default,){
final _that = this;
switch (_that) {
case _MakeupTest() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String testId,  String title,  String? variant,  bool done,  bool inClass,  bool online,  bool open)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _MakeupTest() when $default != null:
return $default(_that.testId,_that.title,_that.variant,_that.done,_that.inClass,_that.online,_that.open);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String testId,  String title,  String? variant,  bool done,  bool inClass,  bool online,  bool open)  $default,) {final _that = this;
switch (_that) {
case _MakeupTest():
return $default(_that.testId,_that.title,_that.variant,_that.done,_that.inClass,_that.online,_that.open);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String testId,  String title,  String? variant,  bool done,  bool inClass,  bool online,  bool open)?  $default,) {final _that = this;
switch (_that) {
case _MakeupTest() when $default != null:
return $default(_that.testId,_that.title,_that.variant,_that.done,_that.inClass,_that.online,_that.open);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MakeupTest implements MakeupTest {
  const _MakeupTest({required this.testId, required this.title, this.variant, this.done = false, this.inClass = false, this.online = true, this.open = false});
  factory _MakeupTest.fromJson(Map<String, dynamic> json) => _$MakeupTestFromJson(json);

@override final  String testId;
@override final  String title;
@override final  String? variant;
@override@JsonKey() final  bool done;
@override@JsonKey() final  bool inClass;
@override@JsonKey() final  bool online;
@override@JsonKey() final  bool open;

/// Create a copy of MakeupTest
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MakeupTestCopyWith<_MakeupTest> get copyWith => __$MakeupTestCopyWithImpl<_MakeupTest>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MakeupTestToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _MakeupTest&&(identical(other.testId, testId) || other.testId == testId)&&(identical(other.title, title) || other.title == title)&&(identical(other.variant, variant) || other.variant == variant)&&(identical(other.done, done) || other.done == done)&&(identical(other.inClass, inClass) || other.inClass == inClass)&&(identical(other.online, online) || other.online == online)&&(identical(other.open, open) || other.open == open));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,testId,title,variant,done,inClass,online,open);
}

@override
String toString() {
    return 'MakeupTest(testId: $testId, title: $title, variant: $variant, done: $done, inClass: $inClass, online: $online, open: $open)';
}


}

/// @nodoc
abstract mixin class _$MakeupTestCopyWith<$Res> implements $MakeupTestCopyWith<$Res> {
  factory _$MakeupTestCopyWith(_MakeupTest value, $Res Function(_MakeupTest) _then) = __$MakeupTestCopyWithImpl;
@override @useResult
$Res call({
 String testId, String title, String? variant, bool done, bool inClass, bool online, bool open
});




}
/// @nodoc
class __$MakeupTestCopyWithImpl<$Res>
    implements _$MakeupTestCopyWith<$Res> {
  __$MakeupTestCopyWithImpl(this._self, this._then);

  final _MakeupTest _self;
  final $Res Function(_MakeupTest) _then;

/// Create a copy of MakeupTest
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? testId = null,Object? title = null,Object? variant = freezed,Object? done = null,Object? inClass = null,Object? online = null,Object? open = null,}) {
  return _then(_MakeupTest(
testId: null == testId ? _self.testId : testId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,variant: freezed == variant ? _self.variant : variant // ignore: cast_nullable_to_non_nullable
as String?,done: null == done ? _self.done : done // ignore: cast_nullable_to_non_nullable
as bool,inClass: null == inClass ? _self.inClass : inClass // ignore: cast_nullable_to_non_nullable
as bool,online: null == online ? _self.online : online // ignore: cast_nullable_to_non_nullable
as bool,open: null == open ? _self.open : open // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$TheoryDay {

 String get classroomId; String get classroomName; String get date; bool get upcoming; String? get topic; TheoryUploader? get uploader; bool get canUpload; bool get assignedToMe; List<TheoryPhotoSet> get photos;
/// Create a copy of TheoryDay
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TheoryDayCopyWith<TheoryDay> get copyWith => _$TheoryDayCopyWithImpl<TheoryDay>(this as TheoryDay, _$identity);

  /// Serializes this TheoryDay to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as TheoryDay;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TheoryDay&&(identical(other.classroomId, _this.classroomId) || other.classroomId == _this.classroomId)&&(identical(other.classroomName, _this.classroomName) || other.classroomName == _this.classroomName)&&(identical(other.date, _this.date) || other.date == _this.date)&&(identical(other.upcoming, _this.upcoming) || other.upcoming == _this.upcoming)&&(identical(other.topic, _this.topic) || other.topic == _this.topic)&&(identical(other.uploader, _this.uploader) || other.uploader == _this.uploader)&&(identical(other.canUpload, _this.canUpload) || other.canUpload == _this.canUpload)&&(identical(other.assignedToMe, _this.assignedToMe) || other.assignedToMe == _this.assignedToMe)&&const DeepCollectionEquality().equals(other.photos, _this.photos));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as TheoryDay;
  return Object.hash(runtimeType,_this.classroomId,_this.classroomName,_this.date,_this.upcoming,_this.topic,_this.uploader,_this.canUpload,_this.assignedToMe,const DeepCollectionEquality().hash(_this.photos));
}

@override
String toString() {
  final _this = this as TheoryDay;
  return 'TheoryDay(classroomId: ${_this.classroomId}, classroomName: ${_this.classroomName}, date: ${_this.date}, upcoming: ${_this.upcoming}, topic: ${_this.topic}, uploader: ${_this.uploader}, canUpload: ${_this.canUpload}, assignedToMe: ${_this.assignedToMe}, photos: ${_this.photos})';
}


}

/// @nodoc
abstract mixin class $TheoryDayCopyWith<$Res>  {
  factory $TheoryDayCopyWith(TheoryDay value, $Res Function(TheoryDay) _then) = _$TheoryDayCopyWithImpl;
@useResult
$Res call({
 String classroomId, String classroomName, String date, bool upcoming, String? topic, TheoryUploader? uploader, bool canUpload, bool assignedToMe, List<TheoryPhotoSet> photos
});


$TheoryUploaderCopyWith<$Res>? get uploader;

}
/// @nodoc
class _$TheoryDayCopyWithImpl<$Res>
    implements $TheoryDayCopyWith<$Res> {
  _$TheoryDayCopyWithImpl(this._self, this._then);

  final TheoryDay _self;
  final $Res Function(TheoryDay) _then;

/// Create a copy of TheoryDay
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? classroomId = null,Object? classroomName = null,Object? date = null,Object? upcoming = null,Object? topic = freezed,Object? uploader = freezed,Object? canUpload = null,Object? assignedToMe = null,Object? photos = null,}) {
  return _then(TheoryDay(
classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,upcoming: null == upcoming ? _self.upcoming : upcoming // ignore: cast_nullable_to_non_nullable
as bool,topic: freezed == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String?,uploader: freezed == uploader ? _self.uploader : uploader // ignore: cast_nullable_to_non_nullable
as TheoryUploader?,canUpload: null == canUpload ? _self.canUpload : canUpload // ignore: cast_nullable_to_non_nullable
as bool,assignedToMe: null == assignedToMe ? _self.assignedToMe : assignedToMe // ignore: cast_nullable_to_non_nullable
as bool,photos: null == photos ? _self.photos : photos // ignore: cast_nullable_to_non_nullable
as List<TheoryPhotoSet>,
  ));
}
/// Create a copy of TheoryDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TheoryUploaderCopyWith<$Res>? get uploader {
    if (_self.uploader == null) {
    return null;
  }

  return $TheoryUploaderCopyWith<$Res>(_self.uploader!, (value) {
    return _then(_self.copyWith(uploader: value));
  });
}
}


/// Adds pattern-matching-related methods to [TheoryDay].
extension TheoryDayPatterns on TheoryDay {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TheoryDay value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TheoryDay() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TheoryDay value)  $default,){
final _that = this;
switch (_that) {
case _TheoryDay():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TheoryDay value)?  $default,){
final _that = this;
switch (_that) {
case _TheoryDay() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String classroomId,  String classroomName,  String date,  bool upcoming,  String? topic,  TheoryUploader? uploader,  bool canUpload,  bool assignedToMe,  List<TheoryPhotoSet> photos)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TheoryDay() when $default != null:
return $default(_that.classroomId,_that.classroomName,_that.date,_that.upcoming,_that.topic,_that.uploader,_that.canUpload,_that.assignedToMe,_that.photos);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String classroomId,  String classroomName,  String date,  bool upcoming,  String? topic,  TheoryUploader? uploader,  bool canUpload,  bool assignedToMe,  List<TheoryPhotoSet> photos)  $default,) {final _that = this;
switch (_that) {
case _TheoryDay():
return $default(_that.classroomId,_that.classroomName,_that.date,_that.upcoming,_that.topic,_that.uploader,_that.canUpload,_that.assignedToMe,_that.photos);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String classroomId,  String classroomName,  String date,  bool upcoming,  String? topic,  TheoryUploader? uploader,  bool canUpload,  bool assignedToMe,  List<TheoryPhotoSet> photos)?  $default,) {final _that = this;
switch (_that) {
case _TheoryDay() when $default != null:
return $default(_that.classroomId,_that.classroomName,_that.date,_that.upcoming,_that.topic,_that.uploader,_that.canUpload,_that.assignedToMe,_that.photos);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TheoryDay implements TheoryDay {
  const _TheoryDay({required this.classroomId, this.classroomName = '', required this.date, this.upcoming = false, this.topic, this.uploader, this.canUpload = false, this.assignedToMe = false,  List<TheoryPhotoSet> photos = const <TheoryPhotoSet>[]}): _photos = photos;
  factory _TheoryDay.fromJson(Map<String, dynamic> json) => _$TheoryDayFromJson(json);

@override final  String classroomId;
@override@JsonKey() final  String classroomName;
@override final  String date;
@override@JsonKey() final  bool upcoming;
@override final  String? topic;
@override final  TheoryUploader? uploader;
@override@JsonKey() final  bool canUpload;
@override@JsonKey() final  bool assignedToMe;
 final  List<TheoryPhotoSet> _photos;
@override@JsonKey() List<TheoryPhotoSet> get photos {
  if (_photos is EqualUnmodifiableListView) return _photos;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_photos);
}


/// Create a copy of TheoryDay
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TheoryDayCopyWith<_TheoryDay> get copyWith => __$TheoryDayCopyWithImpl<_TheoryDay>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TheoryDayToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _TheoryDay&&(identical(other.classroomId, classroomId) || other.classroomId == classroomId)&&(identical(other.classroomName, classroomName) || other.classroomName == classroomName)&&(identical(other.date, date) || other.date == date)&&(identical(other.upcoming, upcoming) || other.upcoming == upcoming)&&(identical(other.topic, topic) || other.topic == topic)&&(identical(other.uploader, uploader) || other.uploader == uploader)&&(identical(other.canUpload, canUpload) || other.canUpload == canUpload)&&(identical(other.assignedToMe, assignedToMe) || other.assignedToMe == assignedToMe)&&const DeepCollectionEquality().equals(other.photos, _photos));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,classroomId,classroomName,date,upcoming,topic,uploader,canUpload,assignedToMe,const DeepCollectionEquality().hash(_photos));
}

@override
String toString() {
    return 'TheoryDay(classroomId: $classroomId, classroomName: $classroomName, date: $date, upcoming: $upcoming, topic: $topic, uploader: $uploader, canUpload: $canUpload, assignedToMe: $assignedToMe, photos: $photos)';
}


}

/// @nodoc
abstract mixin class _$TheoryDayCopyWith<$Res> implements $TheoryDayCopyWith<$Res> {
  factory _$TheoryDayCopyWith(_TheoryDay value, $Res Function(_TheoryDay) _then) = __$TheoryDayCopyWithImpl;
@override @useResult
$Res call({
 String classroomId, String classroomName, String date, bool upcoming, String? topic, TheoryUploader? uploader, bool canUpload, bool assignedToMe, List<TheoryPhotoSet> photos
});


@override $TheoryUploaderCopyWith<$Res>? get uploader;

}
/// @nodoc
class __$TheoryDayCopyWithImpl<$Res>
    implements _$TheoryDayCopyWith<$Res> {
  __$TheoryDayCopyWithImpl(this._self, this._then);

  final _TheoryDay _self;
  final $Res Function(_TheoryDay) _then;

/// Create a copy of TheoryDay
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? classroomId = null,Object? classroomName = null,Object? date = null,Object? upcoming = null,Object? topic = freezed,Object? uploader = freezed,Object? canUpload = null,Object? assignedToMe = null,Object? photos = null,}) {
  return _then(_TheoryDay(
classroomId: null == classroomId ? _self.classroomId : classroomId // ignore: cast_nullable_to_non_nullable
as String,classroomName: null == classroomName ? _self.classroomName : classroomName // ignore: cast_nullable_to_non_nullable
as String,date: null == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as String,upcoming: null == upcoming ? _self.upcoming : upcoming // ignore: cast_nullable_to_non_nullable
as bool,topic: freezed == topic ? _self.topic : topic // ignore: cast_nullable_to_non_nullable
as String?,uploader: freezed == uploader ? _self.uploader : uploader // ignore: cast_nullable_to_non_nullable
as TheoryUploader?,canUpload: null == canUpload ? _self.canUpload : canUpload // ignore: cast_nullable_to_non_nullable
as bool,assignedToMe: null == assignedToMe ? _self.assignedToMe : assignedToMe // ignore: cast_nullable_to_non_nullable
as bool,photos: null == photos ? _self._photos : photos // ignore: cast_nullable_to_non_nullable
as List<TheoryPhotoSet>,
  ));
}

/// Create a copy of TheoryDay
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$TheoryUploaderCopyWith<$Res>? get uploader {
    if (_self.uploader == null) {
    return null;
  }

  return $TheoryUploaderCopyWith<$Res>(_self.uploader!, (value) {
    return _then(_self.copyWith(uploader: value));
  });
}
}


/// @nodoc
mixin _$TheoryUploader {

 String get name; bool get isMe;
/// Create a copy of TheoryUploader
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TheoryUploaderCopyWith<TheoryUploader> get copyWith => _$TheoryUploaderCopyWithImpl<TheoryUploader>(this as TheoryUploader, _$identity);

  /// Serializes this TheoryUploader to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as TheoryUploader;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TheoryUploader&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.isMe, _this.isMe) || other.isMe == _this.isMe));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as TheoryUploader;
  return Object.hash(runtimeType,_this.name,_this.isMe);
}

@override
String toString() {
  final _this = this as TheoryUploader;
  return 'TheoryUploader(name: ${_this.name}, isMe: ${_this.isMe})';
}


}

/// @nodoc
abstract mixin class $TheoryUploaderCopyWith<$Res>  {
  factory $TheoryUploaderCopyWith(TheoryUploader value, $Res Function(TheoryUploader) _then) = _$TheoryUploaderCopyWithImpl;
@useResult
$Res call({
 String name, bool isMe
});




}
/// @nodoc
class _$TheoryUploaderCopyWithImpl<$Res>
    implements $TheoryUploaderCopyWith<$Res> {
  _$TheoryUploaderCopyWithImpl(this._self, this._then);

  final TheoryUploader _self;
  final $Res Function(TheoryUploader) _then;

/// Create a copy of TheoryUploader
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? isMe = null,}) {
  return _then(TheoryUploader(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,isMe: null == isMe ? _self.isMe : isMe // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [TheoryUploader].
extension TheoryUploaderPatterns on TheoryUploader {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TheoryUploader value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TheoryUploader() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TheoryUploader value)  $default,){
final _that = this;
switch (_that) {
case _TheoryUploader():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TheoryUploader value)?  $default,){
final _that = this;
switch (_that) {
case _TheoryUploader() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  bool isMe)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TheoryUploader() when $default != null:
return $default(_that.name,_that.isMe);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  bool isMe)  $default,) {final _that = this;
switch (_that) {
case _TheoryUploader():
return $default(_that.name,_that.isMe);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  bool isMe)?  $default,) {final _that = this;
switch (_that) {
case _TheoryUploader() when $default != null:
return $default(_that.name,_that.isMe);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TheoryUploader implements TheoryUploader {
  const _TheoryUploader({this.name = 'Сурагч', this.isMe = false});
  factory _TheoryUploader.fromJson(Map<String, dynamic> json) => _$TheoryUploaderFromJson(json);

@override@JsonKey() final  String name;
@override@JsonKey() final  bool isMe;

/// Create a copy of TheoryUploader
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TheoryUploaderCopyWith<_TheoryUploader> get copyWith => __$TheoryUploaderCopyWithImpl<_TheoryUploader>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TheoryUploaderToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _TheoryUploader&&(identical(other.name, name) || other.name == name)&&(identical(other.isMe, isMe) || other.isMe == isMe));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,name,isMe);
}

@override
String toString() {
    return 'TheoryUploader(name: $name, isMe: $isMe)';
}


}

/// @nodoc
abstract mixin class _$TheoryUploaderCopyWith<$Res> implements $TheoryUploaderCopyWith<$Res> {
  factory _$TheoryUploaderCopyWith(_TheoryUploader value, $Res Function(_TheoryUploader) _then) = __$TheoryUploaderCopyWithImpl;
@override @useResult
$Res call({
 String name, bool isMe
});




}
/// @nodoc
class __$TheoryUploaderCopyWithImpl<$Res>
    implements _$TheoryUploaderCopyWith<$Res> {
  __$TheoryUploaderCopyWithImpl(this._self, this._then);

  final _TheoryUploader _self;
  final $Res Function(_TheoryUploader) _then;

/// Create a copy of TheoryUploader
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? isMe = null,}) {
  return _then(_TheoryUploader(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,isMe: null == isMe ? _self.isMe : isMe // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$TheoryPhotoSet {

 String get id; String get uploaderName; bool get isMine; bool get isAssigned; List<String> get imageKeys; int get pages; String? get createdAt;
/// Create a copy of TheoryPhotoSet
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$TheoryPhotoSetCopyWith<TheoryPhotoSet> get copyWith => _$TheoryPhotoSetCopyWithImpl<TheoryPhotoSet>(this as TheoryPhotoSet, _$identity);

  /// Serializes this TheoryPhotoSet to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as TheoryPhotoSet;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is TheoryPhotoSet&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.uploaderName, _this.uploaderName) || other.uploaderName == _this.uploaderName)&&(identical(other.isMine, _this.isMine) || other.isMine == _this.isMine)&&(identical(other.isAssigned, _this.isAssigned) || other.isAssigned == _this.isAssigned)&&const DeepCollectionEquality().equals(other.imageKeys, _this.imageKeys)&&(identical(other.pages, _this.pages) || other.pages == _this.pages)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as TheoryPhotoSet;
  return Object.hash(runtimeType,_this.id,_this.uploaderName,_this.isMine,_this.isAssigned,const DeepCollectionEquality().hash(_this.imageKeys),_this.pages,_this.createdAt);
}

@override
String toString() {
  final _this = this as TheoryPhotoSet;
  return 'TheoryPhotoSet(id: ${_this.id}, uploaderName: ${_this.uploaderName}, isMine: ${_this.isMine}, isAssigned: ${_this.isAssigned}, imageKeys: ${_this.imageKeys}, pages: ${_this.pages}, createdAt: ${_this.createdAt})';
}


}

/// @nodoc
abstract mixin class $TheoryPhotoSetCopyWith<$Res>  {
  factory $TheoryPhotoSetCopyWith(TheoryPhotoSet value, $Res Function(TheoryPhotoSet) _then) = _$TheoryPhotoSetCopyWithImpl;
@useResult
$Res call({
 String id, String uploaderName, bool isMine, bool isAssigned, List<String> imageKeys, int pages, String? createdAt
});




}
/// @nodoc
class _$TheoryPhotoSetCopyWithImpl<$Res>
    implements $TheoryPhotoSetCopyWith<$Res> {
  _$TheoryPhotoSetCopyWithImpl(this._self, this._then);

  final TheoryPhotoSet _self;
  final $Res Function(TheoryPhotoSet) _then;

/// Create a copy of TheoryPhotoSet
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? uploaderName = null,Object? isMine = null,Object? isAssigned = null,Object? imageKeys = null,Object? pages = null,Object? createdAt = freezed,}) {
  return _then(TheoryPhotoSet(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,uploaderName: null == uploaderName ? _self.uploaderName : uploaderName // ignore: cast_nullable_to_non_nullable
as String,isMine: null == isMine ? _self.isMine : isMine // ignore: cast_nullable_to_non_nullable
as bool,isAssigned: null == isAssigned ? _self.isAssigned : isAssigned // ignore: cast_nullable_to_non_nullable
as bool,imageKeys: null == imageKeys ? _self.imageKeys : imageKeys // ignore: cast_nullable_to_non_nullable
as List<String>,pages: null == pages ? _self.pages : pages // ignore: cast_nullable_to_non_nullable
as int,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [TheoryPhotoSet].
extension TheoryPhotoSetPatterns on TheoryPhotoSet {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _TheoryPhotoSet value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _TheoryPhotoSet() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _TheoryPhotoSet value)  $default,){
final _that = this;
switch (_that) {
case _TheoryPhotoSet():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _TheoryPhotoSet value)?  $default,){
final _that = this;
switch (_that) {
case _TheoryPhotoSet() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String uploaderName,  bool isMine,  bool isAssigned,  List<String> imageKeys,  int pages,  String? createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _TheoryPhotoSet() when $default != null:
return $default(_that.id,_that.uploaderName,_that.isMine,_that.isAssigned,_that.imageKeys,_that.pages,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String uploaderName,  bool isMine,  bool isAssigned,  List<String> imageKeys,  int pages,  String? createdAt)  $default,) {final _that = this;
switch (_that) {
case _TheoryPhotoSet():
return $default(_that.id,_that.uploaderName,_that.isMine,_that.isAssigned,_that.imageKeys,_that.pages,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String uploaderName,  bool isMine,  bool isAssigned,  List<String> imageKeys,  int pages,  String? createdAt)?  $default,) {final _that = this;
switch (_that) {
case _TheoryPhotoSet() when $default != null:
return $default(_that.id,_that.uploaderName,_that.isMine,_that.isAssigned,_that.imageKeys,_that.pages,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _TheoryPhotoSet implements TheoryPhotoSet {
  const _TheoryPhotoSet({required this.id, this.uploaderName = '', this.isMine = false, this.isAssigned = false,  List<String> imageKeys = const <String>[], this.pages = 0, this.createdAt}): _imageKeys = imageKeys;
  factory _TheoryPhotoSet.fromJson(Map<String, dynamic> json) => _$TheoryPhotoSetFromJson(json);

@override final  String id;
@override@JsonKey() final  String uploaderName;
@override@JsonKey() final  bool isMine;
@override@JsonKey() final  bool isAssigned;
 final  List<String> _imageKeys;
@override@JsonKey() List<String> get imageKeys {
  if (_imageKeys is EqualUnmodifiableListView) return _imageKeys;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_imageKeys);
}

@override@JsonKey() final  int pages;
@override final  String? createdAt;

/// Create a copy of TheoryPhotoSet
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$TheoryPhotoSetCopyWith<_TheoryPhotoSet> get copyWith => __$TheoryPhotoSetCopyWithImpl<_TheoryPhotoSet>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$TheoryPhotoSetToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _TheoryPhotoSet&&(identical(other.id, id) || other.id == id)&&(identical(other.uploaderName, uploaderName) || other.uploaderName == uploaderName)&&(identical(other.isMine, isMine) || other.isMine == isMine)&&(identical(other.isAssigned, isAssigned) || other.isAssigned == isAssigned)&&const DeepCollectionEquality().equals(other.imageKeys, _imageKeys)&&(identical(other.pages, pages) || other.pages == pages)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,uploaderName,isMine,isAssigned,const DeepCollectionEquality().hash(_imageKeys),pages,createdAt);
}

@override
String toString() {
    return 'TheoryPhotoSet(id: $id, uploaderName: $uploaderName, isMine: $isMine, isAssigned: $isAssigned, imageKeys: $imageKeys, pages: $pages, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$TheoryPhotoSetCopyWith<$Res> implements $TheoryPhotoSetCopyWith<$Res> {
  factory _$TheoryPhotoSetCopyWith(_TheoryPhotoSet value, $Res Function(_TheoryPhotoSet) _then) = __$TheoryPhotoSetCopyWithImpl;
@override @useResult
$Res call({
 String id, String uploaderName, bool isMine, bool isAssigned, List<String> imageKeys, int pages, String? createdAt
});




}
/// @nodoc
class __$TheoryPhotoSetCopyWithImpl<$Res>
    implements _$TheoryPhotoSetCopyWith<$Res> {
  __$TheoryPhotoSetCopyWithImpl(this._self, this._then);

  final _TheoryPhotoSet _self;
  final $Res Function(_TheoryPhotoSet) _then;

/// Create a copy of TheoryPhotoSet
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? uploaderName = null,Object? isMine = null,Object? isAssigned = null,Object? imageKeys = null,Object? pages = null,Object? createdAt = freezed,}) {
  return _then(_TheoryPhotoSet(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,uploaderName: null == uploaderName ? _self.uploaderName : uploaderName // ignore: cast_nullable_to_non_nullable
as String,isMine: null == isMine ? _self.isMine : isMine // ignore: cast_nullable_to_non_nullable
as bool,isAssigned: null == isAssigned ? _self.isAssigned : isAssigned // ignore: cast_nullable_to_non_nullable
as bool,imageKeys: null == imageKeys ? _self._imageKeys : imageKeys // ignore: cast_nullable_to_non_nullable
as List<String>,pages: null == pages ? _self.pages : pages // ignore: cast_nullable_to_non_nullable
as int,createdAt: freezed == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$Announcement {

 String get id; String get title; String get body; bool get pinned; String get createdAt;
/// Create a copy of Announcement
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AnnouncementCopyWith<Announcement> get copyWith => _$AnnouncementCopyWithImpl<Announcement>(this as Announcement, _$identity);

  /// Serializes this Announcement to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Announcement;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Announcement&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.title, _this.title) || other.title == _this.title)&&(identical(other.body, _this.body) || other.body == _this.body)&&(identical(other.pinned, _this.pinned) || other.pinned == _this.pinned)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Announcement;
  return Object.hash(runtimeType,_this.id,_this.title,_this.body,_this.pinned,_this.createdAt);
}

@override
String toString() {
  final _this = this as Announcement;
  return 'Announcement(id: ${_this.id}, title: ${_this.title}, body: ${_this.body}, pinned: ${_this.pinned}, createdAt: ${_this.createdAt})';
}


}

/// @nodoc
abstract mixin class $AnnouncementCopyWith<$Res>  {
  factory $AnnouncementCopyWith(Announcement value, $Res Function(Announcement) _then) = _$AnnouncementCopyWithImpl;
@useResult
$Res call({
 String id, String title, String body, bool pinned, String createdAt
});




}
/// @nodoc
class _$AnnouncementCopyWithImpl<$Res>
    implements $AnnouncementCopyWith<$Res> {
  _$AnnouncementCopyWithImpl(this._self, this._then);

  final Announcement _self;
  final $Res Function(Announcement) _then;

/// Create a copy of Announcement
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? body = null,Object? pinned = null,Object? createdAt = null,}) {
  return _then(Announcement(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,body: null == body ? _self.body : body // ignore: cast_nullable_to_non_nullable
as String,pinned: null == pinned ? _self.pinned : pinned // ignore: cast_nullable_to_non_nullable
as bool,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [Announcement].
extension AnnouncementPatterns on Announcement {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Announcement value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Announcement() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Announcement value)  $default,){
final _that = this;
switch (_that) {
case _Announcement():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Announcement value)?  $default,){
final _that = this;
switch (_that) {
case _Announcement() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title,  String body,  bool pinned,  String createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Announcement() when $default != null:
return $default(_that.id,_that.title,_that.body,_that.pinned,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title,  String body,  bool pinned,  String createdAt)  $default,) {final _that = this;
switch (_that) {
case _Announcement():
return $default(_that.id,_that.title,_that.body,_that.pinned,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title,  String body,  bool pinned,  String createdAt)?  $default,) {final _that = this;
switch (_that) {
case _Announcement() when $default != null:
return $default(_that.id,_that.title,_that.body,_that.pinned,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Announcement implements Announcement {
  const _Announcement({required this.id, this.title = '', this.body = '', this.pinned = false, required this.createdAt});
  factory _Announcement.fromJson(Map<String, dynamic> json) => _$AnnouncementFromJson(json);

@override final  String id;
@override@JsonKey() final  String title;
@override@JsonKey() final  String body;
@override@JsonKey() final  bool pinned;
@override final  String createdAt;

/// Create a copy of Announcement
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AnnouncementCopyWith<_Announcement> get copyWith => __$AnnouncementCopyWithImpl<_Announcement>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AnnouncementToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Announcement&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.body, body) || other.body == body)&&(identical(other.pinned, pinned) || other.pinned == pinned)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,title,body,pinned,createdAt);
}

@override
String toString() {
    return 'Announcement(id: $id, title: $title, body: $body, pinned: $pinned, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$AnnouncementCopyWith<$Res> implements $AnnouncementCopyWith<$Res> {
  factory _$AnnouncementCopyWith(_Announcement value, $Res Function(_Announcement) _then) = __$AnnouncementCopyWithImpl;
@override @useResult
$Res call({
 String id, String title, String body, bool pinned, String createdAt
});




}
/// @nodoc
class __$AnnouncementCopyWithImpl<$Res>
    implements _$AnnouncementCopyWith<$Res> {
  __$AnnouncementCopyWithImpl(this._self, this._then);

  final _Announcement _self;
  final $Res Function(_Announcement) _then;

/// Create a copy of Announcement
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? body = null,Object? pinned = null,Object? createdAt = null,}) {
  return _then(_Announcement(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,body: null == body ? _self.body : body // ignore: cast_nullable_to_non_nullable
as String,pinned: null == pinned ? _self.pinned : pinned // ignore: cast_nullable_to_non_nullable
as bool,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$MyClassroom {

 String get id; String get name; String get type; int? get grade;
/// Create a copy of MyClassroom
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$MyClassroomCopyWith<MyClassroom> get copyWith => _$MyClassroomCopyWithImpl<MyClassroom>(this as MyClassroom, _$identity);

  /// Serializes this MyClassroom to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as MyClassroom;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is MyClassroom&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.type, _this.type) || other.type == _this.type)&&(identical(other.grade, _this.grade) || other.grade == _this.grade));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as MyClassroom;
  return Object.hash(runtimeType,_this.id,_this.name,_this.type,_this.grade);
}

@override
String toString() {
  final _this = this as MyClassroom;
  return 'MyClassroom(id: ${_this.id}, name: ${_this.name}, type: ${_this.type}, grade: ${_this.grade})';
}


}

/// @nodoc
abstract mixin class $MyClassroomCopyWith<$Res>  {
  factory $MyClassroomCopyWith(MyClassroom value, $Res Function(MyClassroom) _then) = _$MyClassroomCopyWithImpl;
@useResult
$Res call({
 String id, String name, String type, int? grade
});




}
/// @nodoc
class _$MyClassroomCopyWithImpl<$Res>
    implements $MyClassroomCopyWith<$Res> {
  _$MyClassroomCopyWithImpl(this._self, this._then);

  final MyClassroom _self;
  final $Res Function(MyClassroom) _then;

/// Create a copy of MyClassroom
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? type = null,Object? grade = freezed,}) {
  return _then(MyClassroom(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}

}


/// Adds pattern-matching-related methods to [MyClassroom].
extension MyClassroomPatterns on MyClassroom {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _MyClassroom value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _MyClassroom() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _MyClassroom value)  $default,){
final _that = this;
switch (_that) {
case _MyClassroom():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _MyClassroom value)?  $default,){
final _that = this;
switch (_that) {
case _MyClassroom() when $default != null:
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
case _MyClassroom() when $default != null:
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
case _MyClassroom():
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
case _MyClassroom() when $default != null:
return $default(_that.id,_that.name,_that.type,_that.grade);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _MyClassroom implements MyClassroom {
  const _MyClassroom({required this.id, required this.name, this.type = 'IN_PERSON', this.grade});
  factory _MyClassroom.fromJson(Map<String, dynamic> json) => _$MyClassroomFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  String type;
@override final  int? grade;

/// Create a copy of MyClassroom
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$MyClassroomCopyWith<_MyClassroom> get copyWith => __$MyClassroomCopyWithImpl<_MyClassroom>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$MyClassroomToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _MyClassroom&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.type, type) || other.type == type)&&(identical(other.grade, grade) || other.grade == grade));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,type,grade);
}

@override
String toString() {
    return 'MyClassroom(id: $id, name: $name, type: $type, grade: $grade)';
}


}

/// @nodoc
abstract mixin class _$MyClassroomCopyWith<$Res> implements $MyClassroomCopyWith<$Res> {
  factory _$MyClassroomCopyWith(_MyClassroom value, $Res Function(_MyClassroom) _then) = __$MyClassroomCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String type, int? grade
});




}
/// @nodoc
class __$MyClassroomCopyWithImpl<$Res>
    implements _$MyClassroomCopyWith<$Res> {
  __$MyClassroomCopyWithImpl(this._self, this._then);

  final _MyClassroom _self;
  final $Res Function(_MyClassroom) _then;

/// Create a copy of MyClassroom
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? type = null,Object? grade = freezed,}) {
  return _then(_MyClassroom(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,grade: freezed == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as int?,
  ));
}


}

// dart format on
