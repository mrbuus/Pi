import 'dart:async';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';

/// Файлын байтын кэш: санах ой (LRU, байтаар хязгаартай) + диск.
///
/// Сервер `Cache-Control: no-store` өгдөг тул HTTP кэш ажиллахгүй — апп өөрөө кэшилнэ.
/// Түлхүүр нь UUID (агуулга өөрчлөгддөггүй) тул хугацаагүй, зөвхөн хэмжээгээр шахна.
/// Гарахад (logout) бүрэн устгана (SECURITY §3).
class FileBytesCache {
  FileBytesCache({
    this.directory,
    this.memoryBudget = 24 * 1024 * 1024,
    this.diskBudget = 120 * 1024 * 1024,
  });

  /// Дискийн кэшийн суурь хавтас. null буцаавал зөвхөн санах ой.
  final Future<Directory?> Function()? directory;
  final int memoryBudget;
  final int diskBudget;

  final _memory = <String, Uint8List>{}; // LinkedHashMap — оруулсан дарааллаар
  int _memoryBytes = 0;
  Future<Directory?>? _dir;
  int _writesSinceTrim = 0;
  bool _trimming = false;

  Future<Directory?> _cacheDir() => _dir ??= () async {
        try {
          final base = await directory?.call();
          if (base == null) return null;
          final d = Directory('${base.path}/pm_files');
          await d.create(recursive: true);
          return d;
        } catch (_) {
          return null; // Диск ашиглах боломжгүй — зөвхөн санах ой.
        }
      }();

  /// Дискэн дээрх нэр — түлхүүрийг шууд биш, хэш болгож (замын тэмдэгтээс хамгаална).
  static String fileName(String key) => sha1.convert(key.codeUnits).toString();

  Uint8List? peek(String key) {
    final hit = _memory.remove(key);
    if (hit != null) _memory[key] = hit; // LRU: сүүлд ашигласныг төгсгөлд
    return hit;
  }

  Future<Uint8List?> read(String key) async {
    final mem = peek(key);
    if (mem != null) return mem;
    final dir = await _cacheDir();
    if (dir == null) return null;
    final f = File('${dir.path}/${fileName(key)}');
    try {
      final bytes = await f.readAsBytes();
      _remember(key, bytes);
      // Ашигласан огноог шинэчилнэ — дискийг шахахад хамгийн хуучныг устгана (UI thread-д sync I/O-гүй).
      unawaited(f.setLastModified(DateTime.now()).then((_) => null, onError: (_) => null));
      return bytes;
    } catch (_) {
      return null; // Байхгүй эсвэл эвдэрсэн.
    }
  }

  Future<void> write(String key, Uint8List bytes) async {
    _remember(key, bytes);
    final dir = await _cacheDir();
    if (dir == null) return;
    try {
      await File('${dir.path}/${fileName(key)}').writeAsBytes(bytes);
      // Хавтсыг бичилт бүрт биш, 20 бичилт тутамд async-аар шахна (жагсаалтын sync I/O гацаадаг байсан).
      if (++_writesSinceTrim >= 20) {
        _writesSinceTrim = 0;
        unawaited(_trimDisk(dir));
      }
    } catch (_) {
      // Диск дүүрсэн гэх мэт — кэшгүй үргэлжилнэ.
    }
  }

  void _remember(String key, Uint8List bytes) {
    if (bytes.length > memoryBudget ~/ 3) return; // Хэт том файлыг санах ойд барихгүй.
    final old = _memory.remove(key);
    if (old != null) _memoryBytes -= old.length;
    _memory[key] = bytes;
    _memoryBytes += bytes.length;
    while (_memoryBytes > memoryBudget && _memory.isNotEmpty) {
      final first = _memory.keys.first;
      _memoryBytes -= _memory.remove(first)!.length;
    }
  }

  Future<void> _trimDisk(Directory dir) async {
    if (_trimming) return;
    _trimming = true;
    try {
      final stats = <(File, int, DateTime)>[];
      var total = 0;
      await for (final f in dir.list(followLinks: false)) {
        if (f is! File) continue;
        // ignore: avoid_slow_async_io — UI thread-ийг sync stat-аар гацаахгүй.
        final s = await f.stat();
        total += s.size;
        stats.add((f, s.size, s.modified));
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

  /// Санах ойн дарамт (2 GB утас) — санах ойг суллана, диск үлдэнэ.
  void clearMemory() {
    _memory.clear();
    _memoryBytes = 0;
  }

  /// Гарах үед — санах ой ба диск бүрэн.
  Future<void> clear() async {
    _memory.clear();
    _memoryBytes = 0;
    final dir = await _cacheDir();
    _dir = null;
    if (dir == null) return;
    try {
      await dir.delete(recursive: true);
    } catch (_) {} // Байхгүй бол — устгах зүйлгүй.
  }

  @visibleForTesting
  int get memoryBytes => _memoryBytes;

  @visibleForTesting
  int get memoryEntries => _memory.length;
}
