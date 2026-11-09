// Эзний дүрэм (2026-11-10): апп хэрэглэгчийг вэб хуудас руу ХЭЗЭЭ Ч явуулахгүй. Вэбийн бүх «Вэбээр нээх /
// шалгалт өгөх / бүртгүүлэх»-ийг апп доторх дэлгэцээр сольсон. `Env.webBaseUrl` нь зөвхөн өгөгдөл (JSON) татах,
// хост харьцуулахад л үлдэнэ.
import 'package:flutter_test/flutter_test.dart';

import 'rules/source_scan.dart';

bool _isComment(String line) => line.trimLeft().startsWith('//');

void main() {
  final sources = readSources(['lib']);

  test('lib/-д «Вэбээр …» товч, бичвэр байхгүй', () {
    final hits = <String>[];
    for (final file in sources) {
      for (final (n, line) in file.lines) {
        // Тайлбар (comment) бусад agent-ын хуучин тэмдэглэл байж болно — харин бичвэр, товч хэзээ ч үгүй.
        final bad = line.contains('Вэбээр') || (!_isComment(line) && line.toLowerCase().contains('вэбээр'));
        if (bad) hits.add('${file.path}:$n  ${line.trim()}');
      }
    }
    expect(hits, isEmpty, reason: hits.join('\n'));
  });

  test('launchUrl нь вэбийн хаяг (Env.webBaseUrl, pimath.mn) руу нээхгүй', () {
    final hits = <String>[];
    final launch = RegExp(r'launchUrl(String)?\(');
    for (final file in sources) {
      if (!launch.hasMatch(file.text)) continue;
      // launchUrl дууддаг файл вэбийн хаягийг огт хэрэглэхгүй (шууд ч, хувьсагчаар ч дамжуулахгүй).
      if (file.text.contains('webBaseUrl') || file.text.contains('WebBase')) {
        hits.add('${file.path}: launchUrl + webBaseUrl');
      }
      for (final m in launch.allMatches(file.text)) {
        final end = file.text.indexOf(';', m.end);
        final call = file.text.substring(m.start, end < 0 ? file.text.length : end);
        if (call.contains('pimath.mn') || call.contains('Env.')) hits.add('${file.path}: $call');
      }
    }
    expect(hits, isEmpty, reason: hits.join('\n'));
  });

  test('хөтчөөр зөвхөн tel:, mailto:, YouTube нээгдэнэ', () {
    // launchUrl дууддаг файлуудын жагсаалт — шинэ файл нэмэгдвэл энд шалгаж нэмнэ.
    const allowed = {
      'lib/features/support/ui/support_screen.dart', // tel:, mailto:
      'lib/features/support/ui/centre_info_screen.dart', // tel:, mailto:
      'lib/features/legal/legal_screen.dart', // mailto:
      'lib/features/learning/data/lesson_repository.dart', // зөвхөн YouTube хост (isPlayableVideoUri)
      'lib/features/scan/ui/scan_result_screen.dart', // YouTube бодолт
      'lib/features/exam/ui/widgets/review_parts.dart', // YouTube бодолт
    };
    final callers = [
      for (final f in sources)
        if (RegExp(r'launchUrl(String)?\(').hasMatch(f.text)) f.path.substring(f.path.indexOf('lib/')),
    ];
    final unexpected = callers.where((p) => !allowed.contains(p)).toList();
    expect(unexpected, isEmpty, reason: 'Шинэ launchUrl: ${unexpected.join(', ')} — вэб рүү хөтлөхгүйг шалгаад жагсаалтад нэм');
  });
}
