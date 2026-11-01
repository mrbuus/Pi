// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'current_user.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$CurrentUser {

 String get id;@JsonKey(unknownEnumValue: UserRole.unknown) UserRole get role; String get firstName; String? get lastName; String? get phone; String? get email; String? get username; String? get studentCode; String? get teacherCode; String? get avatarUrl; bool get mustChangePassword;/// Сурагчийн профайл (анги, `type`: ONLINE / IN_PERSON …) — M1-д бүрэн загвар.
 Map<String, Object?>? get studentProfile; Map<String, Object?>? get teacherProfile; Map<String, Object?>? get externalTeacherProfile;
/// Create a copy of CurrentUser
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CurrentUserCopyWith<CurrentUser> get copyWith => _$CurrentUserCopyWithImpl<CurrentUser>(this as CurrentUser, _$identity);

  /// Serializes this CurrentUser to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as CurrentUser;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CurrentUser&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.role, _this.role) || other.role == _this.role)&&(identical(other.firstName, _this.firstName) || other.firstName == _this.firstName)&&(identical(other.lastName, _this.lastName) || other.lastName == _this.lastName)&&(identical(other.phone, _this.phone) || other.phone == _this.phone)&&(identical(other.email, _this.email) || other.email == _this.email)&&(identical(other.username, _this.username) || other.username == _this.username)&&(identical(other.studentCode, _this.studentCode) || other.studentCode == _this.studentCode)&&(identical(other.teacherCode, _this.teacherCode) || other.teacherCode == _this.teacherCode)&&(identical(other.avatarUrl, _this.avatarUrl) || other.avatarUrl == _this.avatarUrl)&&(identical(other.mustChangePassword, _this.mustChangePassword) || other.mustChangePassword == _this.mustChangePassword)&&const DeepCollectionEquality().equals(other.studentProfile, _this.studentProfile)&&const DeepCollectionEquality().equals(other.teacherProfile, _this.teacherProfile)&&const DeepCollectionEquality().equals(other.externalTeacherProfile, _this.externalTeacherProfile));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as CurrentUser;
  return Object.hash(runtimeType,_this.id,_this.role,_this.firstName,_this.lastName,_this.phone,_this.email,_this.username,_this.studentCode,_this.teacherCode,_this.avatarUrl,_this.mustChangePassword,const DeepCollectionEquality().hash(_this.studentProfile),const DeepCollectionEquality().hash(_this.teacherProfile),const DeepCollectionEquality().hash(_this.externalTeacherProfile));
}

@override
String toString() {
  final _this = this as CurrentUser;
  return 'CurrentUser(id: ${_this.id}, role: ${_this.role}, firstName: ${_this.firstName}, lastName: ${_this.lastName}, phone: ${_this.phone}, email: ${_this.email}, username: ${_this.username}, studentCode: ${_this.studentCode}, teacherCode: ${_this.teacherCode}, avatarUrl: ${_this.avatarUrl}, mustChangePassword: ${_this.mustChangePassword}, studentProfile: ${_this.studentProfile}, teacherProfile: ${_this.teacherProfile}, externalTeacherProfile: ${_this.externalTeacherProfile})';
}


}

/// @nodoc
abstract mixin class $CurrentUserCopyWith<$Res>  {
  factory $CurrentUserCopyWith(CurrentUser value, $Res Function(CurrentUser) _then) = _$CurrentUserCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(unknownEnumValue: UserRole.unknown) UserRole role, String firstName, String? lastName, String? phone, String? email, String? username, String? studentCode, String? teacherCode, String? avatarUrl, bool mustChangePassword, Map<String, Object?>? studentProfile, Map<String, Object?>? teacherProfile, Map<String, Object?>? externalTeacherProfile
});




}
/// @nodoc
class _$CurrentUserCopyWithImpl<$Res>
    implements $CurrentUserCopyWith<$Res> {
  _$CurrentUserCopyWithImpl(this._self, this._then);

  final CurrentUser _self;
  final $Res Function(CurrentUser) _then;

/// Create a copy of CurrentUser
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? role = null,Object? firstName = null,Object? lastName = freezed,Object? phone = freezed,Object? email = freezed,Object? username = freezed,Object? studentCode = freezed,Object? teacherCode = freezed,Object? avatarUrl = freezed,Object? mustChangePassword = null,Object? studentProfile = freezed,Object? teacherProfile = freezed,Object? externalTeacherProfile = freezed,}) {
  return _then(CurrentUser(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as UserRole,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,username: freezed == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as String?,studentCode: freezed == studentCode ? _self.studentCode : studentCode // ignore: cast_nullable_to_non_nullable
as String?,teacherCode: freezed == teacherCode ? _self.teacherCode : teacherCode // ignore: cast_nullable_to_non_nullable
as String?,avatarUrl: freezed == avatarUrl ? _self.avatarUrl : avatarUrl // ignore: cast_nullable_to_non_nullable
as String?,mustChangePassword: null == mustChangePassword ? _self.mustChangePassword : mustChangePassword // ignore: cast_nullable_to_non_nullable
as bool,studentProfile: freezed == studentProfile ? _self.studentProfile : studentProfile // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>?,teacherProfile: freezed == teacherProfile ? _self.teacherProfile : teacherProfile // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>?,externalTeacherProfile: freezed == externalTeacherProfile ? _self.externalTeacherProfile : externalTeacherProfile // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>?,
  ));
}

}


/// Adds pattern-matching-related methods to [CurrentUser].
extension CurrentUserPatterns on CurrentUser {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CurrentUser value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CurrentUser() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CurrentUser value)  $default,){
final _that = this;
switch (_that) {
case _CurrentUser():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CurrentUser value)?  $default,){
final _that = this;
switch (_that) {
case _CurrentUser() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(unknownEnumValue: UserRole.unknown)  UserRole role,  String firstName,  String? lastName,  String? phone,  String? email,  String? username,  String? studentCode,  String? teacherCode,  String? avatarUrl,  bool mustChangePassword,  Map<String, Object?>? studentProfile,  Map<String, Object?>? teacherProfile,  Map<String, Object?>? externalTeacherProfile)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CurrentUser() when $default != null:
return $default(_that.id,_that.role,_that.firstName,_that.lastName,_that.phone,_that.email,_that.username,_that.studentCode,_that.teacherCode,_that.avatarUrl,_that.mustChangePassword,_that.studentProfile,_that.teacherProfile,_that.externalTeacherProfile);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(unknownEnumValue: UserRole.unknown)  UserRole role,  String firstName,  String? lastName,  String? phone,  String? email,  String? username,  String? studentCode,  String? teacherCode,  String? avatarUrl,  bool mustChangePassword,  Map<String, Object?>? studentProfile,  Map<String, Object?>? teacherProfile,  Map<String, Object?>? externalTeacherProfile)  $default,) {final _that = this;
switch (_that) {
case _CurrentUser():
return $default(_that.id,_that.role,_that.firstName,_that.lastName,_that.phone,_that.email,_that.username,_that.studentCode,_that.teacherCode,_that.avatarUrl,_that.mustChangePassword,_that.studentProfile,_that.teacherProfile,_that.externalTeacherProfile);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(unknownEnumValue: UserRole.unknown)  UserRole role,  String firstName,  String? lastName,  String? phone,  String? email,  String? username,  String? studentCode,  String? teacherCode,  String? avatarUrl,  bool mustChangePassword,  Map<String, Object?>? studentProfile,  Map<String, Object?>? teacherProfile,  Map<String, Object?>? externalTeacherProfile)?  $default,) {final _that = this;
switch (_that) {
case _CurrentUser() when $default != null:
return $default(_that.id,_that.role,_that.firstName,_that.lastName,_that.phone,_that.email,_that.username,_that.studentCode,_that.teacherCode,_that.avatarUrl,_that.mustChangePassword,_that.studentProfile,_that.teacherProfile,_that.externalTeacherProfile);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CurrentUser extends CurrentUser {
  const _CurrentUser({required this.id, @JsonKey(unknownEnumValue: UserRole.unknown) required this.role, this.firstName = '', this.lastName, this.phone, this.email, this.username, this.studentCode, this.teacherCode, this.avatarUrl, this.mustChangePassword = false,  Map<String, Object?>? studentProfile,  Map<String, Object?>? teacherProfile,  Map<String, Object?>? externalTeacherProfile}): _studentProfile = studentProfile,_teacherProfile = teacherProfile,_externalTeacherProfile = externalTeacherProfile,super._();
  factory _CurrentUser.fromJson(Map<String, dynamic> json) => _$CurrentUserFromJson(json);

@override final  String id;
@override@JsonKey(unknownEnumValue: UserRole.unknown) final  UserRole role;
@override@JsonKey() final  String firstName;
@override final  String? lastName;
@override final  String? phone;
@override final  String? email;
@override final  String? username;
@override final  String? studentCode;
@override final  String? teacherCode;
@override final  String? avatarUrl;
@override@JsonKey() final  bool mustChangePassword;
/// Сурагчийн профайл (анги, `type`: ONLINE / IN_PERSON …) — M1-д бүрэн загвар.
 final  Map<String, Object?>? _studentProfile;
/// Сурагчийн профайл (анги, `type`: ONLINE / IN_PERSON …) — M1-д бүрэн загвар.
@override Map<String, Object?>? get studentProfile {
  final value = _studentProfile;
  if (value == null) return null;
  if (_studentProfile is EqualUnmodifiableMapView) return _studentProfile;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(value);
}

 final  Map<String, Object?>? _teacherProfile;
@override Map<String, Object?>? get teacherProfile {
  final value = _teacherProfile;
  if (value == null) return null;
  if (_teacherProfile is EqualUnmodifiableMapView) return _teacherProfile;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(value);
}

 final  Map<String, Object?>? _externalTeacherProfile;
@override Map<String, Object?>? get externalTeacherProfile {
  final value = _externalTeacherProfile;
  if (value == null) return null;
  if (_externalTeacherProfile is EqualUnmodifiableMapView) return _externalTeacherProfile;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(value);
}


/// Create a copy of CurrentUser
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CurrentUserCopyWith<_CurrentUser> get copyWith => __$CurrentUserCopyWithImpl<_CurrentUser>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CurrentUserToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _CurrentUser&&(identical(other.id, id) || other.id == id)&&(identical(other.role, role) || other.role == role)&&(identical(other.firstName, firstName) || other.firstName == firstName)&&(identical(other.lastName, lastName) || other.lastName == lastName)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.email, email) || other.email == email)&&(identical(other.username, username) || other.username == username)&&(identical(other.studentCode, studentCode) || other.studentCode == studentCode)&&(identical(other.teacherCode, teacherCode) || other.teacherCode == teacherCode)&&(identical(other.avatarUrl, avatarUrl) || other.avatarUrl == avatarUrl)&&(identical(other.mustChangePassword, mustChangePassword) || other.mustChangePassword == mustChangePassword)&&const DeepCollectionEquality().equals(other.studentProfile, _studentProfile)&&const DeepCollectionEquality().equals(other.teacherProfile, _teacherProfile)&&const DeepCollectionEquality().equals(other.externalTeacherProfile, _externalTeacherProfile));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,role,firstName,lastName,phone,email,username,studentCode,teacherCode,avatarUrl,mustChangePassword,const DeepCollectionEquality().hash(_studentProfile),const DeepCollectionEquality().hash(_teacherProfile),const DeepCollectionEquality().hash(_externalTeacherProfile));
}

@override
String toString() {
    return 'CurrentUser(id: $id, role: $role, firstName: $firstName, lastName: $lastName, phone: $phone, email: $email, username: $username, studentCode: $studentCode, teacherCode: $teacherCode, avatarUrl: $avatarUrl, mustChangePassword: $mustChangePassword, studentProfile: $studentProfile, teacherProfile: $teacherProfile, externalTeacherProfile: $externalTeacherProfile)';
}


}

/// @nodoc
abstract mixin class _$CurrentUserCopyWith<$Res> implements $CurrentUserCopyWith<$Res> {
  factory _$CurrentUserCopyWith(_CurrentUser value, $Res Function(_CurrentUser) _then) = __$CurrentUserCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(unknownEnumValue: UserRole.unknown) UserRole role, String firstName, String? lastName, String? phone, String? email, String? username, String? studentCode, String? teacherCode, String? avatarUrl, bool mustChangePassword, Map<String, Object?>? studentProfile, Map<String, Object?>? teacherProfile, Map<String, Object?>? externalTeacherProfile
});




}
/// @nodoc
class __$CurrentUserCopyWithImpl<$Res>
    implements _$CurrentUserCopyWith<$Res> {
  __$CurrentUserCopyWithImpl(this._self, this._then);

  final _CurrentUser _self;
  final $Res Function(_CurrentUser) _then;

/// Create a copy of CurrentUser
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? role = null,Object? firstName = null,Object? lastName = freezed,Object? phone = freezed,Object? email = freezed,Object? username = freezed,Object? studentCode = freezed,Object? teacherCode = freezed,Object? avatarUrl = freezed,Object? mustChangePassword = null,Object? studentProfile = freezed,Object? teacherProfile = freezed,Object? externalTeacherProfile = freezed,}) {
  return _then(_CurrentUser(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,role: null == role ? _self.role : role // ignore: cast_nullable_to_non_nullable
as UserRole,firstName: null == firstName ? _self.firstName : firstName // ignore: cast_nullable_to_non_nullable
as String,lastName: freezed == lastName ? _self.lastName : lastName // ignore: cast_nullable_to_non_nullable
as String?,phone: freezed == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String?,email: freezed == email ? _self.email : email // ignore: cast_nullable_to_non_nullable
as String?,username: freezed == username ? _self.username : username // ignore: cast_nullable_to_non_nullable
as String?,studentCode: freezed == studentCode ? _self.studentCode : studentCode // ignore: cast_nullable_to_non_nullable
as String?,teacherCode: freezed == teacherCode ? _self.teacherCode : teacherCode // ignore: cast_nullable_to_non_nullable
as String?,avatarUrl: freezed == avatarUrl ? _self.avatarUrl : avatarUrl // ignore: cast_nullable_to_non_nullable
as String?,mustChangePassword: null == mustChangePassword ? _self.mustChangePassword : mustChangePassword // ignore: cast_nullable_to_non_nullable
as bool,studentProfile: freezed == studentProfile ? _self._studentProfile : studentProfile // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>?,teacherProfile: freezed == teacherProfile ? _self._teacherProfile : teacherProfile // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>?,externalTeacherProfile: freezed == externalTeacherProfile ? _self._externalTeacherProfile : externalTeacherProfile // ignore: cast_nullable_to_non_nullable
as Map<String, Object?>?,
  ));
}


}

// dart format on
