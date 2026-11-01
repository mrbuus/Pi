// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'support_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$HelpTopic {

 String get id; String get question;
/// Create a copy of HelpTopic
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HelpTopicCopyWith<HelpTopic> get copyWith => _$HelpTopicCopyWithImpl<HelpTopic>(this as HelpTopic, _$identity);

  /// Serializes this HelpTopic to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HelpTopic;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HelpTopic&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.question, _this.question) || other.question == _this.question));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HelpTopic;
  return Object.hash(runtimeType,_this.id,_this.question);
}

@override
String toString() {
  final _this = this as HelpTopic;
  return 'HelpTopic(id: ${_this.id}, question: ${_this.question})';
}


}

/// @nodoc
abstract mixin class $HelpTopicCopyWith<$Res>  {
  factory $HelpTopicCopyWith(HelpTopic value, $Res Function(HelpTopic) _then) = _$HelpTopicCopyWithImpl;
@useResult
$Res call({
 String id, String question
});




}
/// @nodoc
class _$HelpTopicCopyWithImpl<$Res>
    implements $HelpTopicCopyWith<$Res> {
  _$HelpTopicCopyWithImpl(this._self, this._then);

  final HelpTopic _self;
  final $Res Function(HelpTopic) _then;

/// Create a copy of HelpTopic
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? question = null,}) {
  return _then(HelpTopic(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,question: null == question ? _self.question : question // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [HelpTopic].
extension HelpTopicPatterns on HelpTopic {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HelpTopic value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HelpTopic() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HelpTopic value)  $default,){
final _that = this;
switch (_that) {
case _HelpTopic():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HelpTopic value)?  $default,){
final _that = this;
switch (_that) {
case _HelpTopic() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String question)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HelpTopic() when $default != null:
return $default(_that.id,_that.question);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String question)  $default,) {final _that = this;
switch (_that) {
case _HelpTopic():
return $default(_that.id,_that.question);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String question)?  $default,) {final _that = this;
switch (_that) {
case _HelpTopic() when $default != null:
return $default(_that.id,_that.question);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HelpTopic implements HelpTopic {
  const _HelpTopic({required this.id, required this.question});
  factory _HelpTopic.fromJson(Map<String, dynamic> json) => _$HelpTopicFromJson(json);

@override final  String id;
@override final  String question;

/// Create a copy of HelpTopic
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HelpTopicCopyWith<_HelpTopic> get copyWith => __$HelpTopicCopyWithImpl<_HelpTopic>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HelpTopicToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HelpTopic&&(identical(other.id, id) || other.id == id)&&(identical(other.question, question) || other.question == question));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,question);
}

@override
String toString() {
    return 'HelpTopic(id: $id, question: $question)';
}


}

/// @nodoc
abstract mixin class _$HelpTopicCopyWith<$Res> implements $HelpTopicCopyWith<$Res> {
  factory _$HelpTopicCopyWith(_HelpTopic value, $Res Function(_HelpTopic) _then) = __$HelpTopicCopyWithImpl;
@override @useResult
$Res call({
 String id, String question
});




}
/// @nodoc
class __$HelpTopicCopyWithImpl<$Res>
    implements _$HelpTopicCopyWith<$Res> {
  __$HelpTopicCopyWithImpl(this._self, this._then);

  final _HelpTopic _self;
  final $Res Function(_HelpTopic) _then;

/// Create a copy of HelpTopic
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? question = null,}) {
  return _then(_HelpTopic(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,question: null == question ? _self.question : question // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$HelpSource {

 String get label; String get href;
/// Create a copy of HelpSource
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HelpSourceCopyWith<HelpSource> get copyWith => _$HelpSourceCopyWithImpl<HelpSource>(this as HelpSource, _$identity);

  /// Serializes this HelpSource to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HelpSource;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HelpSource&&(identical(other.label, _this.label) || other.label == _this.label)&&(identical(other.href, _this.href) || other.href == _this.href));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HelpSource;
  return Object.hash(runtimeType,_this.label,_this.href);
}

@override
String toString() {
  final _this = this as HelpSource;
  return 'HelpSource(label: ${_this.label}, href: ${_this.href})';
}


}

/// @nodoc
abstract mixin class $HelpSourceCopyWith<$Res>  {
  factory $HelpSourceCopyWith(HelpSource value, $Res Function(HelpSource) _then) = _$HelpSourceCopyWithImpl;
@useResult
$Res call({
 String label, String href
});




}
/// @nodoc
class _$HelpSourceCopyWithImpl<$Res>
    implements $HelpSourceCopyWith<$Res> {
  _$HelpSourceCopyWithImpl(this._self, this._then);

  final HelpSource _self;
  final $Res Function(HelpSource) _then;

/// Create a copy of HelpSource
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? label = null,Object? href = null,}) {
  return _then(HelpSource(
label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,href: null == href ? _self.href : href // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [HelpSource].
extension HelpSourcePatterns on HelpSource {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HelpSource value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HelpSource() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HelpSource value)  $default,){
final _that = this;
switch (_that) {
case _HelpSource():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HelpSource value)?  $default,){
final _that = this;
switch (_that) {
case _HelpSource() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String label,  String href)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HelpSource() when $default != null:
return $default(_that.label,_that.href);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String label,  String href)  $default,) {final _that = this;
switch (_that) {
case _HelpSource():
return $default(_that.label,_that.href);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String label,  String href)?  $default,) {final _that = this;
switch (_that) {
case _HelpSource() when $default != null:
return $default(_that.label,_that.href);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HelpSource implements HelpSource {
  const _HelpSource({this.label = '', this.href = ''});
  factory _HelpSource.fromJson(Map<String, dynamic> json) => _$HelpSourceFromJson(json);

@override@JsonKey() final  String label;
@override@JsonKey() final  String href;

/// Create a copy of HelpSource
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HelpSourceCopyWith<_HelpSource> get copyWith => __$HelpSourceCopyWithImpl<_HelpSource>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HelpSourceToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HelpSource&&(identical(other.label, label) || other.label == label)&&(identical(other.href, href) || other.href == href));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,label,href);
}

@override
String toString() {
    return 'HelpSource(label: $label, href: $href)';
}


}

/// @nodoc
abstract mixin class _$HelpSourceCopyWith<$Res> implements $HelpSourceCopyWith<$Res> {
  factory _$HelpSourceCopyWith(_HelpSource value, $Res Function(_HelpSource) _then) = __$HelpSourceCopyWithImpl;
@override @useResult
$Res call({
 String label, String href
});




}
/// @nodoc
class __$HelpSourceCopyWithImpl<$Res>
    implements _$HelpSourceCopyWith<$Res> {
  __$HelpSourceCopyWithImpl(this._self, this._then);

  final _HelpSource _self;
  final $Res Function(_HelpSource) _then;

/// Create a copy of HelpSource
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? label = null,Object? href = null,}) {
  return _then(_HelpSource(
label: null == label ? _self.label : label // ignore: cast_nullable_to_non_nullable
as String,href: null == href ? _self.href : href // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$HelpMatch {

 String get id; String get question;/// Урьдчилан бичсэн хариулт (LaTeX байж болно — MathText).
 String get answer; HelpSource? get source;
/// Create a copy of HelpMatch
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HelpMatchCopyWith<HelpMatch> get copyWith => _$HelpMatchCopyWithImpl<HelpMatch>(this as HelpMatch, _$identity);

  /// Serializes this HelpMatch to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HelpMatch;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HelpMatch&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.question, _this.question) || other.question == _this.question)&&(identical(other.answer, _this.answer) || other.answer == _this.answer)&&(identical(other.source, _this.source) || other.source == _this.source));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HelpMatch;
  return Object.hash(runtimeType,_this.id,_this.question,_this.answer,_this.source);
}

@override
String toString() {
  final _this = this as HelpMatch;
  return 'HelpMatch(id: ${_this.id}, question: ${_this.question}, answer: ${_this.answer}, source: ${_this.source})';
}


}

/// @nodoc
abstract mixin class $HelpMatchCopyWith<$Res>  {
  factory $HelpMatchCopyWith(HelpMatch value, $Res Function(HelpMatch) _then) = _$HelpMatchCopyWithImpl;
@useResult
$Res call({
 String id, String question, String answer, HelpSource? source
});


$HelpSourceCopyWith<$Res>? get source;

}
/// @nodoc
class _$HelpMatchCopyWithImpl<$Res>
    implements $HelpMatchCopyWith<$Res> {
  _$HelpMatchCopyWithImpl(this._self, this._then);

  final HelpMatch _self;
  final $Res Function(HelpMatch) _then;

/// Create a copy of HelpMatch
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? question = null,Object? answer = null,Object? source = freezed,}) {
  return _then(HelpMatch(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,question: null == question ? _self.question : question // ignore: cast_nullable_to_non_nullable
as String,answer: null == answer ? _self.answer : answer // ignore: cast_nullable_to_non_nullable
as String,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as HelpSource?,
  ));
}
/// Create a copy of HelpMatch
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HelpSourceCopyWith<$Res>? get source {
    if (_self.source == null) {
    return null;
  }

  return $HelpSourceCopyWith<$Res>(_self.source!, (value) {
    return _then(_self.copyWith(source: value));
  });
}
}


/// Adds pattern-matching-related methods to [HelpMatch].
extension HelpMatchPatterns on HelpMatch {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HelpMatch value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HelpMatch() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HelpMatch value)  $default,){
final _that = this;
switch (_that) {
case _HelpMatch():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HelpMatch value)?  $default,){
final _that = this;
switch (_that) {
case _HelpMatch() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String question,  String answer,  HelpSource? source)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HelpMatch() when $default != null:
return $default(_that.id,_that.question,_that.answer,_that.source);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String question,  String answer,  HelpSource? source)  $default,) {final _that = this;
switch (_that) {
case _HelpMatch():
return $default(_that.id,_that.question,_that.answer,_that.source);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String question,  String answer,  HelpSource? source)?  $default,) {final _that = this;
switch (_that) {
case _HelpMatch() when $default != null:
return $default(_that.id,_that.question,_that.answer,_that.source);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HelpMatch implements HelpMatch {
  const _HelpMatch({required this.id, this.question = '', this.answer = '', this.source});
  factory _HelpMatch.fromJson(Map<String, dynamic> json) => _$HelpMatchFromJson(json);

@override final  String id;
@override@JsonKey() final  String question;
/// Урьдчилан бичсэн хариулт (LaTeX байж болно — MathText).
@override@JsonKey() final  String answer;
@override final  HelpSource? source;

/// Create a copy of HelpMatch
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HelpMatchCopyWith<_HelpMatch> get copyWith => __$HelpMatchCopyWithImpl<_HelpMatch>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HelpMatchToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HelpMatch&&(identical(other.id, id) || other.id == id)&&(identical(other.question, question) || other.question == question)&&(identical(other.answer, answer) || other.answer == answer)&&(identical(other.source, source) || other.source == source));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,question,answer,source);
}

@override
String toString() {
    return 'HelpMatch(id: $id, question: $question, answer: $answer, source: $source)';
}


}

/// @nodoc
abstract mixin class _$HelpMatchCopyWith<$Res> implements $HelpMatchCopyWith<$Res> {
  factory _$HelpMatchCopyWith(_HelpMatch value, $Res Function(_HelpMatch) _then) = __$HelpMatchCopyWithImpl;
@override @useResult
$Res call({
 String id, String question, String answer, HelpSource? source
});


@override $HelpSourceCopyWith<$Res>? get source;

}
/// @nodoc
class __$HelpMatchCopyWithImpl<$Res>
    implements _$HelpMatchCopyWith<$Res> {
  __$HelpMatchCopyWithImpl(this._self, this._then);

  final _HelpMatch _self;
  final $Res Function(_HelpMatch) _then;

/// Create a copy of HelpMatch
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? question = null,Object? answer = null,Object? source = freezed,}) {
  return _then(_HelpMatch(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,question: null == question ? _self.question : question // ignore: cast_nullable_to_non_nullable
as String,answer: null == answer ? _self.answer : answer // ignore: cast_nullable_to_non_nullable
as String,source: freezed == source ? _self.source : source // ignore: cast_nullable_to_non_nullable
as HelpSource?,
  ));
}

/// Create a copy of HelpMatch
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$HelpSourceCopyWith<$Res>? get source {
    if (_self.source == null) {
    return null;
  }

  return $HelpSourceCopyWith<$Res>(_self.source!, (value) {
    return _then(_self.copyWith(source: value));
  });
}
}


/// @nodoc
mixin _$HelpReply {

 List<HelpMatch> get matches; String? get fallback;
/// Create a copy of HelpReply
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HelpReplyCopyWith<HelpReply> get copyWith => _$HelpReplyCopyWithImpl<HelpReply>(this as HelpReply, _$identity);

  /// Serializes this HelpReply to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as HelpReply;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HelpReply&&const DeepCollectionEquality().equals(other.matches, _this.matches)&&(identical(other.fallback, _this.fallback) || other.fallback == _this.fallback));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as HelpReply;
  return Object.hash(runtimeType,const DeepCollectionEquality().hash(_this.matches),_this.fallback);
}

@override
String toString() {
  final _this = this as HelpReply;
  return 'HelpReply(matches: ${_this.matches}, fallback: ${_this.fallback})';
}


}

/// @nodoc
abstract mixin class $HelpReplyCopyWith<$Res>  {
  factory $HelpReplyCopyWith(HelpReply value, $Res Function(HelpReply) _then) = _$HelpReplyCopyWithImpl;
@useResult
$Res call({
 List<HelpMatch> matches, String? fallback
});




}
/// @nodoc
class _$HelpReplyCopyWithImpl<$Res>
    implements $HelpReplyCopyWith<$Res> {
  _$HelpReplyCopyWithImpl(this._self, this._then);

  final HelpReply _self;
  final $Res Function(HelpReply) _then;

/// Create a copy of HelpReply
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? matches = null,Object? fallback = freezed,}) {
  return _then(HelpReply(
matches: null == matches ? _self.matches : matches // ignore: cast_nullable_to_non_nullable
as List<HelpMatch>,fallback: freezed == fallback ? _self.fallback : fallback // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [HelpReply].
extension HelpReplyPatterns on HelpReply {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HelpReply value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HelpReply() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HelpReply value)  $default,){
final _that = this;
switch (_that) {
case _HelpReply():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HelpReply value)?  $default,){
final _that = this;
switch (_that) {
case _HelpReply() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( List<HelpMatch> matches,  String? fallback)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HelpReply() when $default != null:
return $default(_that.matches,_that.fallback);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( List<HelpMatch> matches,  String? fallback)  $default,) {final _that = this;
switch (_that) {
case _HelpReply():
return $default(_that.matches,_that.fallback);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( List<HelpMatch> matches,  String? fallback)?  $default,) {final _that = this;
switch (_that) {
case _HelpReply() when $default != null:
return $default(_that.matches,_that.fallback);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _HelpReply implements HelpReply {
  const _HelpReply({ List<HelpMatch> matches = const <HelpMatch>[], this.fallback}): _matches = matches;
  factory _HelpReply.fromJson(Map<String, dynamic> json) => _$HelpReplyFromJson(json);

 final  List<HelpMatch> _matches;
@override@JsonKey() List<HelpMatch> get matches {
  if (_matches is EqualUnmodifiableListView) return _matches;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_matches);
}

@override final  String? fallback;

/// Create a copy of HelpReply
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HelpReplyCopyWith<_HelpReply> get copyWith => __$HelpReplyCopyWithImpl<_HelpReply>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$HelpReplyToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _HelpReply&&const DeepCollectionEquality().equals(other.matches, _matches)&&(identical(other.fallback, fallback) || other.fallback == fallback));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,const DeepCollectionEquality().hash(_matches),fallback);
}

@override
String toString() {
    return 'HelpReply(matches: $matches, fallback: $fallback)';
}


}

/// @nodoc
abstract mixin class _$HelpReplyCopyWith<$Res> implements $HelpReplyCopyWith<$Res> {
  factory _$HelpReplyCopyWith(_HelpReply value, $Res Function(_HelpReply) _then) = __$HelpReplyCopyWithImpl;
@override @useResult
$Res call({
 List<HelpMatch> matches, String? fallback
});




}
/// @nodoc
class __$HelpReplyCopyWithImpl<$Res>
    implements _$HelpReplyCopyWith<$Res> {
  __$HelpReplyCopyWithImpl(this._self, this._then);

  final _HelpReply _self;
  final $Res Function(_HelpReply) _then;

/// Create a copy of HelpReply
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? matches = null,Object? fallback = freezed,}) {
  return _then(_HelpReply(
matches: null == matches ? _self._matches : matches // ignore: cast_nullable_to_non_nullable
as List<HelpMatch>,fallback: freezed == fallback ? _self.fallback : fallback // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$FeedbackTicket {

 String get id;/// BUG | SUGGESTION | QUESTION
 String get kind; String get subject; String get body;/// OPEN | IN_REVIEW | RESOLVED
 String get state; String? get response; String? get contextPath; String get createdAt;
/// Create a copy of FeedbackTicket
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$FeedbackTicketCopyWith<FeedbackTicket> get copyWith => _$FeedbackTicketCopyWithImpl<FeedbackTicket>(this as FeedbackTicket, _$identity);

  /// Serializes this FeedbackTicket to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as FeedbackTicket;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is FeedbackTicket&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.kind, _this.kind) || other.kind == _this.kind)&&(identical(other.subject, _this.subject) || other.subject == _this.subject)&&(identical(other.body, _this.body) || other.body == _this.body)&&(identical(other.state, _this.state) || other.state == _this.state)&&(identical(other.response, _this.response) || other.response == _this.response)&&(identical(other.contextPath, _this.contextPath) || other.contextPath == _this.contextPath)&&(identical(other.createdAt, _this.createdAt) || other.createdAt == _this.createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as FeedbackTicket;
  return Object.hash(runtimeType,_this.id,_this.kind,_this.subject,_this.body,_this.state,_this.response,_this.contextPath,_this.createdAt);
}

@override
String toString() {
  final _this = this as FeedbackTicket;
  return 'FeedbackTicket(id: ${_this.id}, kind: ${_this.kind}, subject: ${_this.subject}, body: ${_this.body}, state: ${_this.state}, response: ${_this.response}, contextPath: ${_this.contextPath}, createdAt: ${_this.createdAt})';
}


}

/// @nodoc
abstract mixin class $FeedbackTicketCopyWith<$Res>  {
  factory $FeedbackTicketCopyWith(FeedbackTicket value, $Res Function(FeedbackTicket) _then) = _$FeedbackTicketCopyWithImpl;
@useResult
$Res call({
 String id, String kind, String subject, String body, String state, String? response, String? contextPath, String createdAt
});




}
/// @nodoc
class _$FeedbackTicketCopyWithImpl<$Res>
    implements $FeedbackTicketCopyWith<$Res> {
  _$FeedbackTicketCopyWithImpl(this._self, this._then);

  final FeedbackTicket _self;
  final $Res Function(FeedbackTicket) _then;

/// Create a copy of FeedbackTicket
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? kind = null,Object? subject = null,Object? body = null,Object? state = null,Object? response = freezed,Object? contextPath = freezed,Object? createdAt = null,}) {
  return _then(FeedbackTicket(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,subject: null == subject ? _self.subject : subject // ignore: cast_nullable_to_non_nullable
as String,body: null == body ? _self.body : body // ignore: cast_nullable_to_non_nullable
as String,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as String,response: freezed == response ? _self.response : response // ignore: cast_nullable_to_non_nullable
as String?,contextPath: freezed == contextPath ? _self.contextPath : contextPath // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [FeedbackTicket].
extension FeedbackTicketPatterns on FeedbackTicket {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _FeedbackTicket value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _FeedbackTicket() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _FeedbackTicket value)  $default,){
final _that = this;
switch (_that) {
case _FeedbackTicket():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _FeedbackTicket value)?  $default,){
final _that = this;
switch (_that) {
case _FeedbackTicket() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String kind,  String subject,  String body,  String state,  String? response,  String? contextPath,  String createdAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _FeedbackTicket() when $default != null:
return $default(_that.id,_that.kind,_that.subject,_that.body,_that.state,_that.response,_that.contextPath,_that.createdAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String kind,  String subject,  String body,  String state,  String? response,  String? contextPath,  String createdAt)  $default,) {final _that = this;
switch (_that) {
case _FeedbackTicket():
return $default(_that.id,_that.kind,_that.subject,_that.body,_that.state,_that.response,_that.contextPath,_that.createdAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String kind,  String subject,  String body,  String state,  String? response,  String? contextPath,  String createdAt)?  $default,) {final _that = this;
switch (_that) {
case _FeedbackTicket() when $default != null:
return $default(_that.id,_that.kind,_that.subject,_that.body,_that.state,_that.response,_that.contextPath,_that.createdAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _FeedbackTicket implements FeedbackTicket {
  const _FeedbackTicket({required this.id, required this.kind, this.subject = '', this.body = '', this.state = 'OPEN', this.response, this.contextPath, required this.createdAt});
  factory _FeedbackTicket.fromJson(Map<String, dynamic> json) => _$FeedbackTicketFromJson(json);

@override final  String id;
/// BUG | SUGGESTION | QUESTION
@override final  String kind;
@override@JsonKey() final  String subject;
@override@JsonKey() final  String body;
/// OPEN | IN_REVIEW | RESOLVED
@override@JsonKey() final  String state;
@override final  String? response;
@override final  String? contextPath;
@override final  String createdAt;

/// Create a copy of FeedbackTicket
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$FeedbackTicketCopyWith<_FeedbackTicket> get copyWith => __$FeedbackTicketCopyWithImpl<_FeedbackTicket>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$FeedbackTicketToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _FeedbackTicket&&(identical(other.id, id) || other.id == id)&&(identical(other.kind, kind) || other.kind == kind)&&(identical(other.subject, subject) || other.subject == subject)&&(identical(other.body, body) || other.body == body)&&(identical(other.state, state) || other.state == state)&&(identical(other.response, response) || other.response == response)&&(identical(other.contextPath, contextPath) || other.contextPath == contextPath)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,kind,subject,body,state,response,contextPath,createdAt);
}

@override
String toString() {
    return 'FeedbackTicket(id: $id, kind: $kind, subject: $subject, body: $body, state: $state, response: $response, contextPath: $contextPath, createdAt: $createdAt)';
}


}

/// @nodoc
abstract mixin class _$FeedbackTicketCopyWith<$Res> implements $FeedbackTicketCopyWith<$Res> {
  factory _$FeedbackTicketCopyWith(_FeedbackTicket value, $Res Function(_FeedbackTicket) _then) = __$FeedbackTicketCopyWithImpl;
@override @useResult
$Res call({
 String id, String kind, String subject, String body, String state, String? response, String? contextPath, String createdAt
});




}
/// @nodoc
class __$FeedbackTicketCopyWithImpl<$Res>
    implements _$FeedbackTicketCopyWith<$Res> {
  __$FeedbackTicketCopyWithImpl(this._self, this._then);

  final _FeedbackTicket _self;
  final $Res Function(_FeedbackTicket) _then;

/// Create a copy of FeedbackTicket
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? kind = null,Object? subject = null,Object? body = null,Object? state = null,Object? response = freezed,Object? contextPath = freezed,Object? createdAt = null,}) {
  return _then(_FeedbackTicket(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,kind: null == kind ? _self.kind : kind // ignore: cast_nullable_to_non_nullable
as String,subject: null == subject ? _self.subject : subject // ignore: cast_nullable_to_non_nullable
as String,body: null == body ? _self.body : body // ignore: cast_nullable_to_non_nullable
as String,state: null == state ? _self.state : state // ignore: cast_nullable_to_non_nullable
as String,response: freezed == response ? _self.response : response // ignore: cast_nullable_to_non_nullable
as String?,contextPath: freezed == contextPath ? _self.contextPath : contextPath // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}

// dart format on
