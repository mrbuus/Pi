// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'payment_record.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$PaymentRecord {

 String get id; num get amount; String? get method; String get status; String? get description;/// «2026-09» — аль сарын төлбөр.
 String? get forMonth; String? get paidAt; String get createdAt;
/// Create a copy of PaymentRecord
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PaymentRecordCopyWith<PaymentRecord> get copyWith => _$PaymentRecordCopyWithImpl<PaymentRecord>(this as PaymentRecord, _$identity);

  /// Serializes this PaymentRecord to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as PaymentRecord;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is PaymentRecord&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.amount, _this.amount) || other.amount == _this.amount)&&(identical(other.method, _this.method) || other.method == _this.method)&&(identical(other.status, _this.status) || other.status == _this.status)&&(identical(other.description, _this.description) || other.description == _this.description)&&(identical(other.forMonth, _this.forMonth) || other.forMonth == _this.forMonth)&&(identical(other.paidAt, _this.paidAt) || other.paidAt == _this.paidAt)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as PaymentRecord;
  return Object.hash(runtimeType,_this.id,_this.amount,_this.method,_this.status,_this.description,_this.forMonth,_this.paidAt,_this.createdAt);
}

@override
String toString() {
  final _this = this as PaymentRecord;
  return 'PaymentRecord(id: ${_this.id}, amount: ${_this.amount}, method: ${_this.method}, status: ${_this.status}, description: ${_this.description}, forMonth: ${_this.forMonth}, paidAt: ${_this.paidAt}, createdAt: ${_this.createdAt})';
}


}

/// @nodoc
abstract mixin class $PaymentRecordCopyWith<$Res>  {
  factory $PaymentRecordCopyWith(PaymentRecord value, $Res Function(PaymentRecord) _then) = _$PaymentRecordCopyWithImpl;
@useResult
$Res call({
 String id, num amount, String? method, String status, String? description, String? forMonth, String? paidAt, String createdAt
});




}
/// @nodoc
class _$PaymentRecordCopyWithImpl<$Res>
    implements $PaymentRecordCopyWith<$Res> {
  _$PaymentRecordCopyWithImpl(this._self, this._then);

  final PaymentRecord _self;
  final $Res Function(PaymentRecord) _then;

/// Create a copy of PaymentRecord
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? amount = null,Object? method = freezed,Object? status = null,Object? description = freezed,Object? forMonth = freezed,Object? paidAt = freezed,Object? createdAt = null,}) {
  return _then(PaymentRecord(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as num,method: freezed == method ? _self.method : method // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,forMonth: freezed == forMonth ? _self.forMonth : forMonth // ignore: cast_nullable_to_non_nullable
as String?,paidAt: freezed == paidAt ? _self.paidAt : paidAt // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [PaymentRecord].
extension PaymentRecordPatterns on PaymentRecord {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _PaymentRecord value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _PaymentRecord() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _PaymentRecord value)  $default,){
final _that = this;
switch (_that) {
case _PaymentRecord():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _PaymentRecord value)?  $default,){
final _that = this;
switch (_that) {
case _PaymentRecord() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  num amount,  String? method,  String status,  String? description,  String? forMonth,  String? paidAt,  String createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _PaymentRecord() when $default != null:
return $default(_that.id,_that.amount,_that.method,_that.status,_that.description,_that.forMonth,_that.paidAt,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  num amount,  String? method,  String status,  String? description,  String? forMonth,  String? paidAt,  String createdAt)  $default,) {final _that = this;
switch (_that) {
case _PaymentRecord():
return $default(_that.id,_that.amount,_that.method,_that.status,_that.description,_that.forMonth,_that.paidAt,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  num amount,  String? method,  String status,  String? description,  String? forMonth,  String? paidAt,  String createdAt)?  $default,) {final _that = this;
switch (_that) {
case _PaymentRecord() when $default != null:
return $default(_that.id,_that.amount,_that.method,_that.status,_that.description,_that.forMonth,_that.paidAt,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _PaymentRecord implements PaymentRecord {
  const _PaymentRecord({required this.id, required this.amount, this.method, required this.status, this.description, this.forMonth, this.paidAt, required this.createdAt});
  factory _PaymentRecord.fromJson(Map<String, dynamic> json) => _$PaymentRecordFromJson(json);

@override final  String id;
@override final  num amount;
@override final  String? method;
@override final  String status;
@override final  String? description;
/// «2026-09» — аль сарын төлбөр.
@override final  String? forMonth;
@override final  String? paidAt;
@override final  String createdAt;

/// Create a copy of PaymentRecord
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PaymentRecordCopyWith<_PaymentRecord> get copyWith => __$PaymentRecordCopyWithImpl<_PaymentRecord>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PaymentRecordToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _PaymentRecord&&(identical(other.id, id) || other.id == id)&&(identical(other.amount, amount) || other.amount == amount)&&(identical(other.method, method) || other.method == method)&&(identical(other.status, status) || other.status == status)&&(identical(other.description, description) || other.description == description)&&(identical(other.forMonth, forMonth) || other.forMonth == forMonth)&&(identical(other.paidAt, paidAt) || other.paidAt == paidAt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,amount,method,status,description,forMonth,paidAt,createdAt);
}

@override
String toString() {
    return 'PaymentRecord(id: $id, amount: $amount, method: $method, status: $status, description: $description, forMonth: $forMonth, paidAt: $paidAt, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$PaymentRecordCopyWith<$Res> implements $PaymentRecordCopyWith<$Res> {
  factory _$PaymentRecordCopyWith(_PaymentRecord value, $Res Function(_PaymentRecord) _then) = __$PaymentRecordCopyWithImpl;
@override @useResult
$Res call({
 String id, num amount, String? method, String status, String? description, String? forMonth, String? paidAt, String createdAt
});




}
/// @nodoc
class __$PaymentRecordCopyWithImpl<$Res>
    implements _$PaymentRecordCopyWith<$Res> {
  __$PaymentRecordCopyWithImpl(this._self, this._then);

  final _PaymentRecord _self;
  final $Res Function(_PaymentRecord) _then;

/// Create a copy of PaymentRecord
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? amount = null,Object? method = freezed,Object? status = null,Object? description = freezed,Object? forMonth = freezed,Object? paidAt = freezed,Object? createdAt = null,}) {
  return _then(_PaymentRecord(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,amount: null == amount ? _self.amount : amount // ignore: cast_nullable_to_non_nullable
as num,method: freezed == method ? _self.method : method // ignore: cast_nullable_to_non_nullable
as String?,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,forMonth: freezed == forMonth ? _self.forMonth : forMonth // ignore: cast_nullable_to_non_nullable
as String?,paidAt: freezed == paidAt ? _self.paidAt : paidAt // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
