import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:yaml/yaml.dart';

import 'anim_slot.dart';

/// Манифестын нэг мөр: слот → файл, төрөл, poster, давталт, хэмжээний дээд хязгаар.
@immutable
class AnimEntry {
  const AnimEntry({
    required this.slot,
    required this.kind,
    required this.file,
    required this.loop,
    required this.maxKb,
    this.fileDark,
    this.poster,
    this.posterDark,
    this.posterMaxKb = AnimManifest.defaultPosterMaxKb,
    this.seconds,
  });

  final AnimSlot slot;
  final AnimKind kind;

  /// Бүтэн asset зам (`assets/anim/...`).
  final String file;
  final String? fileDark;
  final String? poster;
  final String? posterDark;
  final bool loop;
  final int maxKb;
  final int posterMaxKb;

  /// Зорилтот урт (дизайнерт мэдээлэл), state machine бол null.
  final double? seconds;

  /// Энэ entry-ийн бүх файл (тестэд хэмжээг шалгах).
  Iterable<({String path, int maxKb})> get files => [
    (path: file, maxKb: maxKb),
    if (fileDark != null) (path: fileDark!, maxKb: maxKb),
    if (poster != null) (path: poster!, maxKb: posterMaxKb),
    if (posterDark != null) (path: posterDark!, maxKb: posterMaxKb),
  ];
}

/// `assets/anim/manifest.yaml`-ийг НЭГ удаа уншиж санана. Bundle-д байгаа файлыг `AssetManifest`-ээс
/// шалгадаг тул байхгүй файлыг нээх гэж оролдохгүй.
@immutable
class AnimManifest {
  const AnimManifest({this.entries = const {}, this.bundled = const {}});

  static const dir = 'assets/anim/';
  static const path = '${dir}manifest.yaml';
  static const defaultPosterMaxKb = 40;

  final Map<AnimSlot, AnimEntry> entries;

  /// Апп-д багцлагдсан asset-ууд (зөвхөн манифестэд нэр гарсан нь).
  final Set<String> bundled;

  AnimEntry? operator [](AnimSlot slot) => entries[slot];

  /// Тоглуулах файл: харанхуй горимд `.dark` хувилбар, байхгүй бол ердийнх. Bundle-д байхгүй бол null.
  String? fileFor(AnimSlot slot, {required bool dark}) {
    final e = entries[slot];
    if (e == null) return null;
    return _pick(dark ? e.fileDark : null, e.file);
  }

  String? posterFor(AnimSlot slot, {required bool dark}) {
    final e = entries[slot];
    if (e == null) return null;
    return _pick(dark ? e.posterDark : null, e.poster);
  }

  String? _pick(String? preferred, String? base) {
    if (preferred != null && bundled.contains(preferred)) return preferred;
    if (base != null && bundled.contains(base)) return base;
    return null;
  }

  /// `assets/`-ээр эхэлбэл бүтэн зам, эс бөгөөс `assets/anim/`-ээс харьцангуй.
  static String resolve(String p) => p.startsWith('assets/') ? p : '$dir$p';

  /// YAML-ийг задлана. Буруу мөрийг алгасна (апп унахгүй, слот нь fallback болно).
  static AnimManifest parse(String source, {Set<String> bundled = const {}}) {
    Object? doc;
    try {
      doc = loadYaml(source);
    } catch (_) {
      return const AnimManifest();
    }
    final slots = doc is YamlMap ? doc['slots'] : null;
    if (slots is! YamlMap) return const AnimManifest();
    final entries = <AnimSlot, AnimEntry>{};
    for (final MapEntry(:key, :value) in slots.entries) {
      final slot = key is String ? AnimSlot.byKey(key) : null;
      if (slot == null || value is! YamlMap) continue;
      final kind = AnimKind.parse(value['kind']);
      final file = value['file'];
      final maxKb = value['max_kb'];
      if (kind == null || file is! String || maxKb is! int) continue;
      String? opt(String k) => value[k] is String ? resolve(value[k] as String) : null;
      final seconds = value['seconds'];
      final posterMax = value['poster_max_kb'];
      entries[slot] = AnimEntry(
        slot: slot,
        kind: kind,
        file: resolve(file),
        fileDark: opt('dark'),
        poster: opt('poster'),
        posterDark: opt('poster_dark'),
        loop: value['loop'] == true,
        maxKb: maxKb,
        posterMaxKb: posterMax is int ? posterMax : defaultPosterMaxKb,
        seconds: seconds is num ? seconds.toDouble() : null,
      );
    }
    final named = {for (final e in entries.values) ...e.files.map((f) => f.path)};
    return AnimManifest(entries: entries, bundled: bundled.where(named.contains).toSet());
  }

  static AnimManifest? _cached;
  static Future<AnimManifest>? _loading;

  /// Ачаалсан бол шууд (widget-ийн эхний build-д fallback анивчихгүй).
  static AnimManifest? get cached => _cached;

  /// Апп-д нэг удаа. Алдаа гарвал хоосон манифест (бүх слот fallback).
  static Future<AnimManifest> load({AssetBundle? bundle}) {
    final c = _cached;
    if (c != null) return SynchronousFuture(c);
    return _loading ??= () async {
      final b = bundle ?? rootBundle;
      var m = const AnimManifest();
      try {
        final source = await b.loadString(path, cache: false);
        final assets = (await AssetManifest.loadFromAssetBundle(b)).listAssets().where((a) => a.startsWith('assets/'));
        m = parse(source, bundled: assets.toSet());
      } catch (_) {}
      return _cached = m;
    }();
  }

  /// Тестэд: санасан манифестыг солих / цэвэрлэх.
  @visibleForTesting
  static void debugOverride(AnimManifest? m) {
    _cached = m;
    _loading = m == null ? null : SynchronousFuture(m);
  }
}
