import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/cache/json_bytes.dart';
import 'package:piemath_app/core/cache/response_cache.dart';

CachedResponse _entry(Object? data, Uint8List bytes, {String? etag}) =>
    CachedResponse(data: data, fetchedAt: DateTime.now(), bytes: bytes.length, hash: fnv1a32(bytes), etag: etag);

Uint8List _bytes(Object? v) => Uint8List.fromList(utf8.encode(jsonEncode(v)));

Future<void> _flush() => Future<void>.delayed(const Duration(milliseconds: 30));

void main() {
  late Directory dir;

  setUp(() async => dir = await Directory.systemTemp.createTemp('pm_rc_test'));
  tearDown(() async {
    if (dir.existsSync()) await dir.delete(recursive: true);
  });

  test('keyOf: query эрэмбэлэгдэж, null утга алгасна', () {
    expect(ResponseCache.keyOf('/a', {'b': 2, 'a': 1, 'c': null}), '/a?a=1&b=2');
    expect(ResponseCache.keyOf('/a', null), '/a');
    expect(ResponseCache.groupOf('/student-hub/tests?q=1'), '/student-hub');
    expect(ResponseCache.groupOf('/announcements'), '/announcements');
  });

  test('диск: шинэ instance дахин уншина, ETag хадгалагдана', () async {
    final a = ResponseCache(directory: () async => dir)..setScope('u1');
    final b = _bytes({'x': 'Өдөр Үнэлгээ'});
    a.put('/x', _entry({'x': 'Өдөр Үнэлгээ'}, b, etag: 'W/"e"'), b);
    await _flush();
    final fresh = ResponseCache(directory: () async => dir)..setScope('u1');
    final r = await fresh.read('/x');
    expect(r?.data, {'x': 'Өдөр Үнэлгээ'});
    expect(r?.etag, 'W/"e"');
    expect(r?.epoch, -1); // дискнээс — баталгаажаагүй
  });

  test('хэрэглэгч бүр тусдаа — u2 нь u1-ийн хариуг уншихгүй', () async {
    final a = ResponseCache(directory: () async => dir)..setScope('u1');
    final b = _bytes([1]);
    a.put('/x', _entry([1], b), b);
    await _flush();
    final other = ResponseCache(directory: () async => dir)..setScope('u2');
    expect(await other.read('/x'), isNull);
  });

  test('clearAll — санах ой, диск бүрэн', () async {
    final a = ResponseCache(directory: () async => dir)..setScope('u1');
    final b = _bytes([1]);
    a.put('/x', _entry([1], b), b);
    await _flush();
    await a.clearAll();
    expect(a.memoryEntries, 0);
    expect(Directory('${dir.path}/pm_api').existsSync(), isFalse);
  });

  test('invalidatePrefix — санах ой ба дискний бүлэг', () async {
    final a = ResponseCache(directory: () async => dir)..setScope('u1');
    final b = _bytes([1]);
    a
      ..put('/assignments/my', _entry([1], b), b)
      ..put('/assignmentsX', _entry([1], b), b)
      ..put('/announcements', _entry([1], b), b);
    await _flush();
    final e0 = a.epoch;
    a.invalidatePrefix('/assignments');
    expect(a.peek('/assignments/my'), isNull);
    expect(a.peek('/assignmentsX'), isNotNull); // ижил эхлэлтэй ч өөр зам
    expect(a.peek('/announcements'), isNotNull);
    expect(a.epoch, greaterThan(e0));
    await _flush();
    final fresh = ResponseCache(directory: () async => dir)..setScope('u1');
    expect(await fresh.read('/assignments/my'), isNull);
    expect(await fresh.read('/announcements'), isNotNull);
  });

  test('санах ой байтын төсвөөр LRU шахагдана', () {
    final a = ResponseCache(memoryBudget: 400)..setScope('u1');
    for (var i = 0; i < 10; i++) {
      final b = Uint8List(90);
      a.put('/k$i', _entry(i, b), b);
    }
    expect(a.memoryBytes, lessThanOrEqualTo(400));
    expect(a.peek('/k0'), isNull);
    expect(a.peek('/k9'), isNotNull);
  });

  test('хэт хуучин дискний хариуг хэрэглэхгүй', () async {
    var now = DateTime(2026, 11, 1);
    final a = ResponseCache(directory: () async => dir, now: () => now)..setScope('u1');
    final b = _bytes([1]);
    a.put('/x', CachedResponse(data: [1], fetchedAt: now, bytes: b.length, hash: fnv1a32(b)), b);
    await _flush();
    now = now.add(const Duration(days: 15));
    final later = ResponseCache(directory: () async => dir, now: () => now)..setScope('u1');
    expect(await later.read('/x'), isNull);
  });

  test('scope null үед юу ч хадгалахгүй', () {
    final a = ResponseCache();
    final b = _bytes([1]);
    a.put('/x', _entry([1], b), b);
    expect(a.memoryEntries, 0);
  });

  test('JSON: том хариуг isolate-д задална, хоосон бол null', () async {
    expect(await decodeJsonBytes(Uint8List(0)), isNull);
    final big = List.generate(8000, (i) => {'id': i, 'name': 'Бодлого $i'});
    final bytes = _bytes(big);
    expect(bytes.length, greaterThan(kJsonIsolateThreshold));
    final decoded = await decodeJsonBytes(bytes);
    expect((decoded! as List).length, 8000);
    expect(isJsonContentType('application/json; charset=utf-8'), isTrue);
    expect(isJsonContentType('text/calendar'), isFalse);
  });
}
