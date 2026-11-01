import 'dart:io';

/// `lib/` (болон шаардвал бусад) хавтсын бүх `.dart` эх файлыг уншина.
/// Үүсгэгдсэн (`*.g.dart`, `*.freezed.dart`) файлыг алгасна.
List<SourceFile> readSources(List<String> roots) {
  final out = <SourceFile>[];
  for (final root in roots) {
    final dir = Directory(root);
    if (!dir.existsSync()) continue;
    for (final entity in dir.listSync(recursive: true)) {
      if (entity is! File) continue;
      final path = entity.path.replaceAll(r'\', '/');
      if (!path.endsWith('.dart')) continue;
      if (path.endsWith('.g.dart') || path.endsWith('.freezed.dart')) continue;
      out.add(SourceFile(path, entity.readAsStringSync()));
    }
  }
  out.sort((a, b) => a.path.compareTo(b.path));
  return out;
}

class SourceFile {
  const SourceFile(this.path, this.text);
  final String path;
  final String text;

  /// Мөр бүрийг (1-ээс эхэлсэн дугаартай) буцаана.
  Iterable<(int, String)> get lines sync* {
    var n = 0;
    for (final line in text.split('\n')) {
      n++;
      yield (n, line);
    }
  }
}
