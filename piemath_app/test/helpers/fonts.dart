import 'dart:io';

import 'package:flutter/services.dart';

bool _loaded = false;

/// flutter_test анхдагчаар pubspec-ийн фонтыг ачаалдаггүй (бичвэр хайрцаг болж зурагдана).
/// Golden зураг бодит харагдахын тулд Onest, Unbounded, Lucide-ийг ачаална.
Future<void> loadAppFonts() async {
  if (_loaded) return;
  _loaded = true;
  Future<void> load(String family, List<String> paths) async {
    final loader = FontLoader(family);
    for (final p in paths) {
      final bytes = File(p).readAsBytesSync();
      loader.addFont(Future.value(ByteData.view(bytes.buffer)));
    }
    await loader.load();
  }

  await load('Onest', [
    'assets/fonts/Onest-Regular.ttf',
    'assets/fonts/Onest-Medium.ttf',
    'assets/fonts/Onest-SemiBold.ttf',
    'assets/fonts/Onest-Bold.ttf',
  ]);
  await load('Unbounded', ['assets/fonts/Unbounded-SemiBold.ttf']);

  // Lucide: багцын фонт (fontPackage-тэй IconData нь 'packages/<pkg>/<family>' нэрээр хайдаг).
  final lucide = _packageFile('lucide_icons_flutter', 'assets/lucide.ttf');
  if (lucide != null) {
    final loader = FontLoader('packages/lucide_icons_flutter/Lucide')
      ..addFont(Future.value(ByteData.view(lucide.readAsBytesSync().buffer)));
    await loader.load();
  }
}

/// `.dart_tool/package_config.json`-оос багцын хавтсыг олно.
File? _packageFile(String package, String relative) {
  final config = File('.dart_tool/package_config.json');
  if (!config.existsSync()) return null;
  final text = config.readAsStringSync();
  final m = RegExp('"name":\\s*"$package",\\s*"rootUri":\\s*"([^"]+)"').firstMatch(text);
  if (m == null) return null;
  var root = m.group(1)!;
  if (root.startsWith('file://')) root = Uri.parse(root).toFilePath();
  if (!root.startsWith('/')) root = '${Directory('.dart_tool').absolute.path}/$root';
  final f = File('$root/$relative');
  return f.existsSync() ? f : null;
}
