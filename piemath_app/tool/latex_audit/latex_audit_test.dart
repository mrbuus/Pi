// LaTeX аудит (PLAN.md M2.2): репод байгаа ЖИНХЭНЭ контентын бүх томьёог flutter_math_fork-оор
// задалж, бүтэлгүйтснийг `docs/LATEX-AUDIT.md`-д бичнэ.
//
// Ажиллуулах (piemath_app хавтсаас):
//   flutter test tool/latex_audit/latex_audit_test.dart
//
// `test/` дотор биш тул энгийн `flutter test`-д орохгүй (удаан, ~1 минут).
import 'dart:convert';
import 'dart:io';

import 'package:flutter/painting.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/math/math_parse.dart';
import 'package:piemath_app/core/math/tex_engine.dart';

/// Аудитын нэг томьёо.
class _Item {
  _Item(this.source, this.where, this.tex);
  final String source;
  final String where;
  final String tex;
}

class _Outcome {
  _Outcome(this.item, this.error);
  final _Item item;
  final String? error;
  bool get ok => error == null;
}

const _dataRoot = '../api/prisma/data';
const _reportsRoot = '../api/prisma/reports';

Object? _json(String path) => jsonDecode(File(path).readAsStringSync());

List<Object?> _list(Object? x) => x is List ? x : const [];
Map<String, Object?> _map(Object? x) => x is Map<String, Object?> ? x : const {};
String? _str(Object? x) => x is String && x.trim().isNotEmpty ? x : null;

/// MathText-ээр зурагддаг бичвэр → томьёо хэсгүүд (вэбийн задлалтаар).
void _addMathText(List<_Item> out, String source, String where, Object? text) {
  final s = _str(text);
  if (s == null) return;
  for (final seg in splitMath(s)) {
    if (seg.isMath) out.add(_Item(source, where, seg.value));
  }
}

/// Шууд LaTeX (вэб `$$…$$` болгож зурдаг талбар).
void _addRaw(List<_Item> out, String source, String where, Object? tex) {
  final s = _str(tex);
  if (s != null) out.add(_Item(source, where, s));
}

List<_Item> _collect() {
  final items = <_Item>[];

  // 1) 100x100 V3 — бодлого, сонголт
  final v3a = _map(_json('$_dataRoot/100x100-v3/plan-100x100-v3.json'));
  for (final t in _list(v3a['tests'])) {
    for (final p in _list(_map(t)['problems'])) {
      final pm = _map(p);
      final token = pm['token']?.toString() ?? '?';
      _addMathText(items, '100x100 V3', token, pm['statementLatex']);
      for (final c in _list(pm['choicesLatex'])) {
        _addMathText(items, '100x100 V3', '$token сонголт', c);
      }
    }
  }

  // 2) 200x200 V3 — бодлого, сонголт
  for (final p in _list(_json('$_dataRoot/200x200-v3/plan-200x200-v3.json'))) {
    final pm = _map(p);
    final token = pm['token']?.toString() ?? '?';
    _addMathText(items, '200x200 V3', token, pm['statement']);
    for (final c in _list(pm['choices'])) {
      _addMathText(items, '200x200 V3', '$token сонголт', c);
    }
  }

  // 3) Контентын засвар (100V2/200V2 — санд орсон хувилбар)
  for (final f in Directory('$_dataRoot/content-fix-1024/applied').listSync().whereType<File>()) {
    if (!f.path.endsWith('.json')) continue;
    for (final p in _list(_json(f.path))) {
      final pm = _map(p);
      final token = pm['token']?.toString() ?? '?';
      _addMathText(items, 'V2 засвар', token, pm['statementText']);
      for (final c in _list(pm['choices'])) {
        _addMathText(items, 'V2 засвар', '$token сонголт', _map(c)['text']);
      }
    }
  }

  // 4) Томьёоны сан
  for (final f in Directory('$_dataRoot/formulas').listSync().whereType<File>()) {
    if (!f.path.endsWith('.json') || f.path.endsWith('_example.json')) continue;
    for (final fo in _list(_map(_json(f.path))['formulas'])) {
      final m = _map(fo);
      final slug = m['slug']?.toString() ?? '?';
      _addRaw(items, 'Томьёоны сан', '$slug latex', m['latex']);
      if (m['general'] != m['latex']) _addRaw(items, 'Томьёоны сан', '$slug general', m['general']);
      for (final c in _list(m['conditions'])) {
        _addRaw(items, 'Томьёоны сан', '$slug нөхцөл', c);
      }
      for (final v in _list(m['variants'])) {
        _addRaw(items, 'Томьёоны сан', '$slug хувилбар', _map(v)['latex']);
      }
      _addMathText(items, 'Томьёоны сан', '$slug тайлбар', m['explanation']);
      _addMathText(items, 'Томьёоны сан', '$slug санамж', m['mnemonic']);
      _addMathText(items, 'Томьёоны сан', '$slug ЭЕШ', m['eeshTip']);
      for (final d in _list(m['derivation'])) {
        _addMathText(items, 'Томьёоны сан', '$slug гаргалгаа', d);
      }
      for (final d in _list(m['commonMistakes'])) {
        _addMathText(items, 'Томьёоны сан', '$slug алдаа', d);
      }
      for (final e in _list(m['examples'])) {
        final em = _map(e);
        _addMathText(items, 'Томьёоны сан', '$slug жишээ', em['problem']);
        _addMathText(items, 'Томьёоны сан', '$slug жишээ хариу', em['answer']);
        for (final s in _list(em['steps'])) {
          _addMathText(items, 'Томьёоны сан', '$slug жишээ алхам', s);
        }
      }
      for (final q in _list(m['quiz'])) {
        final qm = _map(q);
        _addRaw(items, 'Томьёоны сан', '$slug дасгал', qm['prompt']);
        if (qm['type'] != 'truefalse') _addRaw(items, 'Томьёоны сан', '$slug дасгал хариу', qm['answer']);
        for (final d in _list(qm['distractors'])) {
          _addRaw(items, 'Томьёоны сан', '$slug дасгал сонголт', d);
        }
        _addMathText(items, 'Томьёоны сан', '$slug дасгал тайлбар', qm['why']);
      }
    }
  }

  // 5) Импортын тайлангийн жишээнүүд (300x300, 200x200 V2/V3, V2 LaTeX)
  for (final name in ['300x300-import.json', '200x200-v2-import.json', '200x200-v3-import.json', 'latex-reimport.json']) {
    final f = File('$_reportsRoot/$name');
    if (!f.existsSync()) continue;
    for (final s in _list(_map(_json(f.path))['samples'])) {
      final sm = _map(s);
      final token = sm['token']?.toString() ?? '?';
      _addMathText(items, 'Импортын жишээ', token, sm['statement']);
      for (final c in _list(sm['choices'])) {
        _addMathText(items, 'Импортын жишээ', '$token сонголт', c is Map ? _map(c)['text'] : c);
      }
    }
  }

  // 6) 100x100 V2 ангиллын томьёо (бодлогын шинжилгээнд хэрэглэгддэг шууд LaTeX)
  final cls = File('$_reportsRoot/100x100-v2-classification.json');
  if (cls.existsSync()) {
    for (final t in _list(_map(_json(cls.path))['tests'])) {
      for (final p in _list(_map(t)['problems'])) {
        final pm = _map(p);
        for (final fo in _list(pm['formulas'])) {
          _addRaw(items, 'V2 ангиллын томьёо', pm['token']?.toString() ?? '?', _map(fo)['latex']);
        }
      }
    }
  }
  return items;
}

/// Задлах + widget мод болгох (BuildException-ийг ч барина).
String? check(String tex, {required bool normalize}) {
  final r = TexEngine.parseUncached(tex, normalize: normalize);
  final err = r.error;
  if (err != null) return err.message;
  try {
    r.ast!.buildWidget(MathOptions(fontSize: 16, color: const Color(0xFF000000)));
  } on FlutterMathException catch (e) {
    return e.message;
  } on Object catch (e) {
    return 'build: $e';
  }
  return null;
}

/// Алдааг бүлэглэх түлхүүр: тодорхойгүй команд бол команд, бусад нь мессежийн эхний хэсэг.
String errorKey(String message) {
  final cs = RegExp(r'Undefined control sequence: (\\[A-Za-z]+|\\.)').firstMatch(message);
  if (cs != null) return 'Тодорхойгүй команд `${cs.group(1)}`';
  final env = RegExp(r'No such environment: ([A-Za-z*]+)').firstMatch(message);
  if (env != null) return 'Орчин `${env.group(1)}`';
  final unicode = RegExp('Unrecognized Unicode character|Unicode text character|Unknown symbol').firstMatch(message);
  if (unicode != null) return message.split(' at ').first;
  return message.replaceAll(RegExp(r'\s+'), ' ').split(' at position').first.split(':').first;
}

String _md(String s) => s.replaceAll('|', r'\|').replaceAll('\n', ' ');

void main() {
  test('LaTeX аудит', () {
    final items = _collect();
    // Ижил томьёог нэг л удаа тоолно (давхардлыг тусад нь харуулна).
    final unique = <String, _Item>{};
    for (final it in items) {
      unique.putIfAbsent(it.tex, () => it);
    }

    Map<String, List<_Outcome>> run(bool normalize) {
      final failures = <String, List<_Outcome>>{};
      for (final it in unique.values) {
        final err = check(it.tex, normalize: normalize);
        if (err != null) failures.putIfAbsent(errorKey(err), () => []).add(_Outcome(it, err));
      }
      return failures;
    }

    final before = run(false);
    final after = run(true);
    int count(Map<String, List<_Outcome>> m) => m.values.fold(0, (a, b) => a + b.length);
    final total = unique.length;
    final failBefore = count(before);
    final failAfter = count(after);
    String pct(int fail) => (100 * (total - fail) / total).toStringAsFixed(2);

    final bySource = <String, int>{};
    for (final it in unique.values) {
      bySource[it.source] = (bySource[it.source] ?? 0) + 1;
    }

    final b = StringBuffer()
      ..writeln('# LaTeX аудит — flutter_math_fork')
      ..writeln()
      ..writeln('Үүсгэсэн: `flutter test tool/latex_audit/latex_audit_test.dart` (гараар засахгүй, дахин ажиллуул).')
      ..writeln()
      ..writeln('Эх сурвалж: репод байгаа жинхэнэ контент — `api/prisma/data/**` (100x100 V3, 200x200 V3, V2 засвар,')
      ..writeln('томьёоны сан) ба `api/prisma/reports/*` (импортын жишээ, V2 ангиллын томьёо). Бичвэрийг вэбийн')
      ..writeln('`MathText`-тэй ижил дүрмээр (`splitMath`) задалж, `\$…\$`/`\$\$…\$\$` хэсэг бүрийг шалгав.')
      ..writeln('Сангийн бодит өгөгдөл (прод) энд ороогүй — прод санд холбогдохгүй (RULES §6).')
      ..writeln()
      ..writeln('## Дүн')
      ..writeln()
      ..writeln('| | Тоо |')
      ..writeln('|---|---|')
      ..writeln('| Нийт томьёо (давхардалтай) | ${items.length} |')
      ..writeln('| Давхардалгүй томьёо | $total |')
      ..writeln('| Нормчлолоос ӨМНӨ амжилттай | ${total - failBefore} (${pct(failBefore)}%) |')
      ..writeln('| Нормчлолын ДАРАА амжилттай (`normalizeTex`) | ${total - failAfter} (${pct(failAfter)}%) |')
      ..writeln()
      ..writeln('Эх сурвалж тус бүр (давхардалгүй):')
      ..writeln();
    for (final e in bySource.entries) {
      b.writeln('- ${e.key}: ${e.value}');
    }

    void section(String title, Map<String, List<_Outcome>> failures) {
      b
        ..writeln()
        ..writeln('## $title')
        ..writeln();
      if (failures.isEmpty) {
        b.writeln('Алдаа алга.');
        return;
      }
      b
        ..writeln('| Шалтгаан | Тоо | Жишээ |')
        ..writeln('|---|---|---|');
      final sorted = failures.entries.toList()..sort((x, y) => y.value.length.compareTo(x.value.length));
      for (final e in sorted) {
        final ex = e.value.take(3).map((o) => '`${_md(o.item.tex)}` (${o.item.source}, ${_md(o.item.where)})').join('<br>');
        b.writeln('| ${_md(e.key)} | ${e.value.length} | $ex |');
      }
    }

    section('Нормчлолоос өмнөх алдаа', before);
    section('Нормчлолын дараа үлдсэн алдаа', after);

    final out = File('docs/LATEX-AUDIT.md');
    final existing = out.existsSync() ? out.readAsStringSync() : '';
    // Гараар бичсэн «Шийдэл» хэсгийг хадгална.
    final marker = existing.indexOf('<!-- гараар -->');
    final manual = marker >= 0 ? '\n${existing.substring(marker)}' : '';
    out.writeAsStringSync('$b$manual');

    // ignore: avoid_print
    print('Аудит: нийт $total, өмнө ${pct(failBefore)}%, дараа ${pct(failAfter)}%');
  }, timeout: const Timeout(Duration(minutes: 10)));
}
