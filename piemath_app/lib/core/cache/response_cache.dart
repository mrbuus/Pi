import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';

import 'json_bytes.dart';

/// Кэшлэгдсэн GET хариу (задалсан JSON + мета).
class CachedResponse {
  CachedResponse({
    required this.data,
    required this.fetchedAt,
    required this.bytes,
    required this.hash,
    this.etag,
    this.epoch = -1,
  });

  /// Задалсан JSON (`parse`-д шууд өгнө — өөрчилж болохгүй).
  final Object? data;

  /// Серверээс сүүлд баталгаажсан цаг (304 ирэхэд шинэчлэгдэнэ).
  DateTime fetchedAt;

  /// Түүхий хариуны хэмжээ (санах ойн төсөвт).
  final int bytes;

  /// Түүхий байтын [fnv1a32] — шинэ хариу өөрчлөгдсөн эсэх.
  final int hash;

  /// Express-ийн weak ETag (`W/"…"`) — `If-None-Match`-д.
  final String? etag;

  /// Сүлжээнээс авах үеийн [ResponseCache.epoch]. -1 = дискнээс сэргээсэн (баталгаажаагүй).
  int epoch;

  /// SWR-ийн арын шинэчлэл өөр хариу авчирч провайдерыг дахин бүтээлгэсэн — дараагийн SWR
  /// уншилт сүлжээ рүү дахин явахгүй (нэг удаа).
  bool pendingSwr = false;
}

/// GET хариуны кэш: санах ой (LRU, байтаар хязгаартай) + диск (хэрэглэгч тус бүрийн хавтас).
///
/// - Түлхүүр: `path?sortedQuery` ([keyOf]). Хэрэглэгч бүр тусдаа [scope] (userId) — өөр хүний
///   өгөгдөл хэзээ ч холилдохгүй. [scope] null (нэвтрээгүй) бол юу ч хадгалахгүй.
/// - Гарахад [clearAll] — санах ой, диск бүрэн (SECURITY §3).
/// - Дискэнд нэг файл = нэг хариу: эхний мөр мета JSON, дараа нь серверийн түүхий байт
///   (дахин encode хийхгүй). Замын эхний хэсгээр (`/student-hub`) дэд хавтсанд — mutation-ий
///   дараа нэг дор устгахад.
/// - Дискний бичилт, шахалт бүгд async — UI thread-д sync I/O хийхгүй.
class ResponseCache {
  ResponseCache({
    this.directory,
    this.memoryBudget = 4 * 1024 * 1024,
    this.diskBudget = 24 * 1024 * 1024,
    this.maxAge = const Duration(days: 14),
    DateTime Function()? now,
  }) : _now = now ?? DateTime.now;

  /// Дискний суурь хавтас. null буцаавал зөвхөн санах ой (тест).
  final Future<Directory?> Function()? directory;

  /// Санах ойн төсөв (түүхий JSON байтаар; задалсан объект ~3–4 дахин их зай эзэлнэ).
  final int memoryBudget;
  final int diskBudget;

  /// Үүнээс хуучин дискний хариуг хэрэглэхгүй.
  final Duration maxAge;
  final DateTime Function() _now;

  static const _format = 'v1';

  String? _scope;
  final _memory = <String, CachedResponse>{}; // LinkedHashMap — LRU дараалал
  int _memoryBytes = 0;
  int _epoch = 0;
  Future<Directory?>? _dir;
  int _writesSinceTrim = 0;
  bool _trimming = false;

  /// Дисктэй эсэх. Үгүй бол [read] санах ойгоос л — async завсаргүй (widget тестийн FakeAsync).
  bool get hasDisk => directory != null;

  /// Одоогийн хэрэглэгч (userId). null = кэш унтраалттай.
  String? get scope => _scope;

  /// Mutation бүрт нэмэгдэнэ — «саяхан баталгаажсан» хариуг дахин шалгуулна.
  int get epoch => _epoch;

  void bumpEpoch() => _epoch++;

  /// Хэрэглэгч солигдоход. Санах ойг цэвэрлэнэ (дискэнд хэрэглэгч бүр тусдаа хавтастай).
  void setScope(String? userId) {
    if (userId == _scope) return;
    _scope = userId;
    _memory.clear();
    _memoryBytes = 0;
    _dir = null;
    _epoch++;
    if (userId != null) unawaited(_scopeDir());
  }

  /// `/student-hub/days` + `{month: 2026-11}` → `/student-hub/days?month=2026-11`.
  static String keyOf(String path, Map<String, Object?>? query) {
    if (query == null || query.isEmpty) return path;
    final keys = [for (final e in query.entries) if (e.value != null) e.key]..sort();
    if (keys.isEmpty) return path;
    return '$path?${keys.map((k) => '$k=${query[k]}').join('&')}';
  }

  /// Замын эхний хэсэг: `/student-hub/tests/x` → `/student-hub`.
  static String groupOf(String key) {
    final path = key.split('?').first;
    final i = path.indexOf('/', 1);
    return i < 0 ? path : path.substring(0, i);
  }

  Future<Directory?> _scopeDir() {
    final scope = _scope;
    if (scope == null) return Future.value();
    return _dir ??= () async {
      try {
        final base = await directory?.call();
        if (base == null) return null;
        final user = sha1.convert(utf8.encode(scope)).toString().substring(0, 16);
        final d = Directory('${base.path}/pm_api/$_format/$user');
        await d.create(recursive: true);
        return d;
      } catch (_) {
        return null;
      }
    }();
  }

  static String _hash(String s) => sha1.convert(utf8.encode(s)).toString();

  File _fileFor(Directory dir, String key) => File('${dir.path}/${_hash(groupOf(key)).substring(0, 12)}/${_hash(key)}');

  /// Зөвхөн санах ойгоос (синхрон).
  CachedResponse? peek(String key) {
    final hit = _memory.remove(key);
    if (hit != null) _memory[key] = hit; // LRU: сүүлд ашигласныг төгсгөлд
    return hit;
  }

  /// Санах ой, эсвэл дискнээс (апп шинээр асахад өмнөх өгөгдлийг шууд харуулах).
  Future<CachedResponse?> read(String key) async {
    final mem = peek(key);
    if (mem != null) return mem;
    final scope = _scope;
    final dir = await _scopeDir();
    if (dir == null) return null;
    try {
      final f = _fileFor(dir, key);
      final Uint8List raw;
      try {
        raw = await f.readAsBytes();
      } on FileSystemException {
        return null; // Кэшэд байхгүй.
      }
      final nl = raw.indexOf(10);
      if (nl < 0) return null;
      final meta = jsonDecode(utf8.decode(raw.sublist(0, nl))) as Map<String, Object?>;
      if (meta['k'] != key) return null; // хэшийн мөргөлдөөн — бараг боломжгүй ч
      final t = DateTime.fromMillisecondsSinceEpoch((meta['t'] as num).toInt());
      if (_now().difference(t) > maxAge) {
        unawaited(f.delete().then((_) => null, onError: (_) => null));
        return null;
      }
      final body = Uint8List.sublistView(raw, nl + 1);
      final data = await decodeJsonBytes(body);
      if (scope != _scope) return null; // унших явцад хэрэглэгч солигдсон
      final entry = CachedResponse(
        data: data,
        fetchedAt: t,
        bytes: body.length,
        hash: (meta['h'] as num?)?.toInt() ?? fnv1a32(body),
        etag: meta['e'] as String?,
      );
      // Санах ойд бусад бичилт (сүлжээний шинэ хариу) түрүүлсэн бол түүнийг хэвээр үлдээнэ.
      final newer = _memory[key];
      if (newer != null) return newer;
      _remember(key, entry);
      return entry;
    } catch (_) {
      return null; // Эвдэрсэн файл — кэшгүй үргэлжилнэ.
    }
  }

  /// Сүлжээнээс ирсэн шинэ хариу. Диск рүү арын төлөвт бичнэ.
  void put(String key, CachedResponse entry, Uint8List rawBytes) {
    if (_scope == null) return;
    entry.epoch = _epoch;
    _remember(key, entry);
    if (rawBytes.length > diskBudget ~/ 8) return;
    unawaited(_writeDisk(key, entry, rawBytes));
  }

  /// 304 — хариу хэвээр, зөвхөн баталгаажсан цагийг шинэчилнэ.
  void touch(String key, CachedResponse entry) {
    entry
      ..fetchedAt = _now()
      ..epoch = _epoch;
    if (!_memory.containsKey(key)) _remember(key, entry);
  }

  Future<void> _writeDisk(String key, CachedResponse entry, Uint8List rawBytes) async {
    final scope = _scope;
    final dir = await _scopeDir();
    if (dir == null || scope != _scope) return;
    try {
      final f = _fileFor(dir, key);
      await f.parent.create(recursive: true);
      final meta = utf8.encode(jsonEncode({
        'k': key,
        't': entry.fetchedAt.millisecondsSinceEpoch,
        'h': entry.hash,
        'e': ?entry.etag,
      }));
      final out = BytesBuilder(copy: false)
        ..add(meta)
        ..addByte(10)
        ..add(rawBytes);
      // Түр файл → rename: апп бичих дундаа хаагдвал эвдэрсэн файл үлдэхгүй.
      final tmp = File('${f.path}.tmp');
      await tmp.writeAsBytes(out.takeBytes(), flush: false);
      await tmp.rename(f.path);
      if (++_writesSinceTrim >= 25) {
        _writesSinceTrim = 0;
        unawaited(_trimDisk(dir));
      }
    } catch (_) {
      // Диск дүүрсэн гэх мэт — кэшгүй үргэлжилнэ.
    }
  }

  Future<void> _trimDisk(Directory dir) async {
    if (_trimming) return;
    _trimming = true;
    try {
      final stats = <(File, int, DateTime)>[];
      var total = 0;
      await for (final e in dir.list(recursive: true, followLinks: false)) {
        if (e is! File) continue;
        // ignore: avoid_slow_async_io — UI thread-ийг sync stat-аар гацаахгүй.
        final s = await e.stat();
        total += s.size;
        stats.add((e, s.size, s.modified));
      }
      if (total <= diskBudget) return;
      stats.sort((a, b) => a.$3.compareTo(b.$3));
      for (final (f, size, _) in stats) {
        if (total <= diskBudget * 0.8) break;
        try {
          await f.delete();
          total -= size;
        } catch (_) {}
      }
    } catch (_) {
    } finally {
      _trimming = false;
    }
  }

  void _remember(String key, CachedResponse entry) {
    final old = _memory.remove(key);
    if (old != null) _memoryBytes -= old.bytes;
    if (entry.bytes > memoryBudget ~/ 4) return; // Хэт том хариуг санах ойд барихгүй (диск хангалттай).
    _memory[key] = entry;
    _memoryBytes += entry.bytes;
    while (_memoryBytes > memoryBudget && _memory.isNotEmpty) {
      final first = _memory.keys.first;
      _memoryBytes -= _memory.remove(first)!.bytes;
    }
  }

  /// Нэг хариуг устгах (403/404 — эрх хаагдсан бол хуучныг харуулахгүй).
  void remove(String key) {
    final old = _memory.remove(key);
    if (old != null) _memoryBytes -= old.bytes;
    unawaited(() async {
      final dir = await _scopeDir();
      if (dir == null) return;
      try {
        await _fileFor(dir, key).delete();
      } catch (_) {}
    }());
  }

  /// [prefix]-ээр эхэлсэн бүх хариуг устгана (`/assignments` → `/assignments/...`).
  /// Дискэнд замын эхний хэсгийн хавтсаар бүхэлд нь устгана (илүү устгах нь аюулгүй).
  void invalidatePrefix(String prefix) {
    bool matches(String key) {
      if (!key.startsWith(prefix)) return false;
      if (key.length == prefix.length) return true;
      final next = key[prefix.length];
      return next == '/' || next == '?' || prefix.endsWith('/');
    }

    for (final key in _memory.keys.where(matches).toList()) {
      _memoryBytes -= _memory.remove(key)!.bytes;
    }
    _epoch++;
    final group = groupOf(prefix);
    unawaited(() async {
      final dir = await _scopeDir();
      if (dir == null) return;
      try {
        await Directory('${dir.path}/${_hash(group).substring(0, 12)}').delete(recursive: true);
      } catch (_) {} // Байхгүй бол — устгах зүйлгүй.
    }());
  }

  /// Санах ойн дарамт (2 GB утас) — санах ойг суллана, диск үлдэнэ.
  void clearMemory() {
    _memory.clear();
    _memoryBytes = 0;
  }

  /// Гарах үед — бүх хэрэглэгчийн санах ой ба диск бүрэн.
  Future<void> clearAll() async {
    _memory.clear();
    _memoryBytes = 0;
    _epoch++;
    _dir = null;
    try {
      final base = await directory?.call();
      if (base == null) return;
      await Directory('${base.path}/pm_api').delete(recursive: true);
    } catch (_) {} // Байхгүй бол — устгах зүйлгүй.
    // Устгах явцад шинэ хэрэглэгч нэвтэрсэн бол түүний хавтсыг дахин үүсгэнэ.
    if (_scope != null) unawaited(_scopeDir());
  }

  @visibleForTesting
  int get memoryBytes => _memoryBytes;

  @visibleForTesting
  int get memoryEntries => _memory.length;
}
