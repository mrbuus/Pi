import 'dart:convert';

import 'package:flutter/foundation.dart';

/// Энэ хэмжээнээс том JSON-ийг тусдаа isolate-д задална (UI thread гацахгүй).
/// dio-гийн өгөгдмөлтэй ижил: 50KB ≈ Moto G4 дээр 2–3ms, 2 GB-ийн хуучин утсан дээр 2 дахин удаан.
const kJsonIsolateThreshold = 50 * 1024;

final _utf8Json = const Utf8Decoder(allowMalformed: true).fuse(const JsonDecoder());

Object? _decode(Uint8List bytes) => _utf8Json.convert(bytes);

/// Хариуны байтыг JSON болгох. Хоосон бол `null`. Том бол [compute]-ээр.
Future<Object?> decodeJsonBytes(Uint8List bytes, {int isolateThreshold = kJsonIsolateThreshold}) async {
  if (bytes.isEmpty) return null;
  if (isolateThreshold >= 0 && bytes.length >= isolateThreshold) {
    return compute(_decode, bytes, debugLabel: 'json');
  }
  return _decode(bytes);
}

/// `Content-Type` JSON эсэх (`application/json; charset=utf-8`, `application/problem+json`).
bool isJsonContentType(String? contentType) {
  if (contentType == null) return false;
  final mime = contentType.split(';').first.trim().toLowerCase();
  return mime == 'application/json' || mime.endsWith('+json') || mime == 'text/json';
}

/// Байтын хурдан хэш (FNV-1a 32 бит) — «шинэ хариу өөрчлөгдсөн үү» гэдгийг хуучин байтыг
/// санах ойд барихгүйгээр шалгахад. Криптограф биш.
int fnv1a32(Uint8List bytes) {
  var h = 0x811c9dc5;
  for (var i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = (h * 0x01000193) & 0xffffffff;
  }
  return h;
}
