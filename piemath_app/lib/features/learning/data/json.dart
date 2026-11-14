/// Серверийн JSON-г аюулгүй задлах туслахууд. Үл мэдэгдэх утга → аюулгүй өгөгдмөл (хэзээ ч шиднэ үгүй).
library;

typedef Json = Map<String, Object?>;

Json asMap(Object? v) => v is Map ? v.cast<String, Object?>() : const {};

List<Object?> asList(Object? v) => v is List ? v : const [];

String? asStr(Object? v) => v is String ? v : null;

int? asInt(Object? v) => v is int ? v : (v is double && v.isFinite ? v.round() : null);

double? asNum(Object? v) => v is num ? v.toDouble() : null;

bool asBool(Object? v) => v == true;

/// Замын параметр (id) зөвхөн аюулгүй тэмдэгттэй байх ёстой (deep link-ээс ирж болно).
final _safeId = RegExp(r'^[A-Za-z0-9_-]{1,200}$');

bool isSafeId(String id) => _safeId.hasMatch(id);
