import 'draft_models.dart';

/// ChatGPT / Word-оос хуулсан бичвэрийг ноорогийн бодлогууд болгох — вэбийн `components/internal/parse.ts`-ийн
/// `parseDraftText`-тэй ижил дүрэм: «1.» дугаар, «A. … B. …» сонголт, «Хариу:», «Бодолт:», «Сэдэв:», «Оноо:».
/// Юникод томьёог LaTeX болгох алхмыг апп хийхгүй — сервер блок бүрийн `issues`-д сануулна.
class ParsedDraft {
  const ParsedDraft(this.content, this.notes);

  final DraftContent content;

  /// Ажилтанд харуулах тэмдэглэл (монголоор).
  final List<String> notes;
}

final _label = RegExp(
  r'^\**\s*(хариу|хариулт|зөв хариу|answer|бодолт|бодолтын тайлбар|solution|сэдэв|бүлэг|topic|оноо|points)\s*\**\s*[:：]\s*\**\s*(.*?)\s*\**\s*$',
  caseSensitive: false,
);
final _number = RegExp(r'^\**\s*(?:бодлого\s*|№\s*)?(\d{1,3})\s*[.)]\**(?:\s+(.*))?$', caseSensitive: false);
final _separator = RegExp(r'^(?:-{3,}|_{3,}|\*{3,}|={3,})$');
const _choiceLabels = 'A-EАБВГДЕС';
final _choiceStart = RegExp('^\\(?([$_choiceLabels])\\s*[.)]\\s*(.*)\$');
final _choiceInline = RegExp('(^|\\s)\\(?([$_choiceLabels])\\s*[.)](?=\\s|\$)');
final _imageMark = RegExp(r'\[\s*(?:зураг|figure|image)[^\]]*\]', caseSensitive: false);
const _wordFormula = '[Томьёог гараар шалгана уу]';

typedef _Raw = ({String label, String text});

int _order(String l) {
  final latin = 'ABCDE'.indexOf(l);
  if (latin >= 0) return latin;
  final homo = 'АВСЕ'.indexOf(l);
  if (homo >= 0) return const [0, 1, 2, 4][homo];
  return 'АБВГД'.indexOf(l);
}

List<_Raw>? _splitChoices(String line) {
  final start = _choiceStart.firstMatch(line);
  if (start == null) return null;
  final masked = line.replaceAllMapped(RegExp(r'\$[^$]*\$'), (m) => '\u0001' * m[0]!.length);
  final marks = <({int at, int end, String label})>[];
  for (final m in _choiceInline.allMatches(masked)) {
    marks.add((at: m.start + m[1]!.length, end: m.end, label: m[2]!));
  }
  if (marks.isEmpty || marks.first.at != 0) return [(label: start[1]!, text: start[2]!.trim())];
  final kept = [marks.first];
  for (final mark in marks.skip(1)) {
    final prev = kept.last;
    final mongol = 'АБВГД'.contains(prev.label) && 'АБВГД'.indexOf(mark.label) == 'АБВГД'.indexOf(prev.label) + 1;
    if (_order(mark.label) == _order(prev.label) + 1 || mongol) kept.add(mark);
  }
  return [
    for (var i = 0; i < kept.length; i++)
      (
        label: kept[i].label,
        text: line.substring(kept[i].end, i + 1 < kept.length ? kept[i + 1].at : line.length).trim(),
      ),
  ];
}

String? Function(String) _letterMapper(List<String> labels) {
  final mongolOrder = labels.any((l) => 'БГД'.contains(l));
  return (label) {
    final upper = label.toUpperCase();
    if ('ABCDE'.contains(upper)) return upper;
    if (mongolOrder) {
      final i = 'АБВГД'.indexOf(upper);
      return i >= 0 ? draftLetters[i] : null;
    }
    final i = 'АВСЕ'.indexOf(upper);
    return i >= 0 ? const ['A', 'B', 'C', 'E'][i] : null;
  };
}

String? _normalizeNumber(String raw) {
  var v = raw.replaceAll(r'$', '').trim();
  if (v.contains('=')) v = v.substring(v.lastIndexOf('=') + 1);
  v = v.replaceAll(RegExp(r'\s+'), '').replaceAllMapped(RegExp(r'^(-?\d+),(\d+)$'), (m) => '${m[1]}.${m[2]}');
  if (v.endsWith('.')) v = v.substring(0, v.length - 1);
  return RegExp(r'^[-+]?\d+(\.\d+)?$').hasMatch(v) ? v.replaceFirst(RegExp(r'^\+'), '') : null;
}

class _Draft {
  _Draft(this.numbered);

  final bool numbered;
  final statement = <String>[];
  final choices = <_Raw>[];
  String? answerRaw;
  final solution = <String>[];
  String? tag;
  int? points;
}

String _trimBlank(List<String> lines) => lines.join('\n').replaceAll(RegExp(r'\n{3,}'), '\n\n').trim();

String _clean(String line) =>
    line.replaceAll('\t', '  ').replaceFirst(RegExp(r'^\s*(?:[-*\u2022]\s+|#{1,6}\s+|>\s+)'), '').trimRight();

ParsedDraft? _finish(_Draft d) {
  final statement = _trimBlank(d.statement);
  if (statement.isEmpty && d.choices.isEmpty && d.answerRaw == null) return null;
  final notes = <String>[];
  final map = _letterMapper([for (final c in d.choices) c.label]);
  final byLetter = <String, String>{};
  for (final c in d.choices) {
    final l = map(c.label);
    if (l != null) byLetter[l] = c.text;
  }
  final kind = byLetter.isNotEmpty ? DraftKind.choice : DraftKind.numeric;
  var choices = <String>[];
  if (kind == DraftKind.choice) {
    final last = byLetter.keys.map(draftLetters.indexOf).reduce((a, b) => a > b ? a : b);
    choices = [for (final l in draftLetters.take(last + 1 < 2 ? 2 : last + 1)) byLetter[l] ?? ''];
    final missing = [
      for (final l in draftLetters.take(last + 1))
        if (!byLetter.containsKey(l)) l,
    ];
    if (missing.isNotEmpty) notes.add('${missing.join(', ')} сонголт алга');
  }
  String? answer;
  final raw0 = d.answerRaw;
  if (raw0 != null) {
    final raw = raw0.replaceAll(RegExp(r'[*$()]'), ' ').trim();
    if (kind == DraftKind.choice) {
      final m = RegExp(r'^([A-Ea-eАБВГДЕС])(?![A-Za-zА-Яа-я])').firstMatch(raw);
      answer = m == null ? null : map(m[1]!);
      if (answer == null) {
        String plain(String s) => s.replaceAll(RegExp(r'[\s$]'), '');
        final i = choices.indexWhere((c) => c.isNotEmpty && plain(c) == plain(raw0));
        if (i >= 0) answer = draftLetters[i];
      }
      if (answer == null) notes.add('Хариуны үсэг танигдсангүй');
    } else {
      answer = _normalizeNumber(raw0);
      if (answer == null) {
        final t = raw0.replaceAll(r'$', '').trim();
        answer = t.isEmpty ? null : t;
        notes.add('Хариу тоо биш, шалгана уу');
      }
    }
  } else {
    notes.add('Хариу алга');
  }
  final solution = _trimBlank(d.solution);
  if (_imageMark.hasMatch(statement)) notes.add('Зураг хавсаргана');
  if (statement.contains(_wordFormula) || choices.any((c) => c.contains(_wordFormula))) {
    notes.add('Томьёог гараар засна');
  }
  if (statement.isEmpty) notes.add('Өгүүлбэр хоосон');
  return ParsedDraft(
    DraftContent(
      kind: kind,
      statement: statement,
      choices: choices,
      answer: answer,
      solution: solution.isEmpty ? null : solution,
      tag: d.tag,
      points: d.points ?? 1,
    ),
    notes,
  );
}

/// `\( \)` → `$ $`, `\[ \]` → `$$ $$` (ChatGPT-ийн зуршил).
String normalizeDelimiters(String text) => text
    .replaceAllMapped(RegExp(r'\\\[([\s\S]+?)\\\]'), (m) => '\$\$${m[1]!.trim()}\$\$')
    .replaceAllMapped(RegExp(r'\\\(([\s\S]+?)\\\)'), (m) => '\$${m[1]!.trim()}\$');

/// Бичвэрийг бодлогууд болгоно. Хоосон бичвэрт `[]`.
List<ParsedDraft> parseDraftText(String raw) {
  final text = normalizeDelimiters(raw.replaceAll(RegExp(r'\r\n?'), '\n').replaceAll('\u00A0', ' '));
  final lines = text.split('\n').where((l) => !RegExp(r'^\s*```').hasMatch(l));
  final out = <({ParsedDraft block, bool numbered, bool prose})>[];
  _Draft? cur;
  var mode = 'statement';

  void flush() {
    final d = cur;
    final block = d == null ? null : _finish(d);
    if (d != null && block != null) {
      out.add((
        block: block,
        numbered: d.numbered,
        prose: d.choices.isEmpty && d.answerRaw == null && d.solution.isEmpty,
      ));
    }
    cur = null;
    mode = 'statement';
  }

  _Draft start([bool numbered = false]) {
    flush();
    return cur = _Draft(numbered);
  }

  _Draft current() => cur ?? start();

  for (final original in lines) {
    final t = _clean(original).trim();
    if (t.isEmpty) {
      if (cur != null && mode == 'statement') cur!.statement.add('');
      if (cur != null && mode == 'solution') cur!.solution.add('');
      continue;
    }
    if (_separator.hasMatch(t)) {
      flush();
      continue;
    }
    final num = _number.firstMatch(t);
    if (num != null) {
      final d = start(true);
      final rest = num[2]?.trim() ?? '';
      if (rest.isNotEmpty) d.statement.add(rest);
      continue;
    }
    final label = _label.firstMatch(t);
    if (label != null) {
      final d = current();
      final key = label[1]!.toLowerCase();
      final value = label[2]!.replaceFirst(RegExp(r'\*+$'), '').trim();
      if (const ['хариу', 'хариулт', 'зөв хариу', 'answer'].contains(key)) {
        d.answerRaw = value.isEmpty ? null : value;
        mode = 'after';
      } else if (const ['бодолт', 'бодолтын тайлбар', 'solution'].contains(key)) {
        if (value.isNotEmpty) d.solution.add(value);
        mode = 'solution';
      } else if (const ['сэдэв', 'бүлэг', 'topic'].contains(key)) {
        d.tag = value.isEmpty ? null : (value.length > 120 ? value.substring(0, 120) : value);
        if (mode == 'solution') mode = 'after';
      } else {
        final p = int.tryParse(value);
        if (p != null && p >= 1 && p <= 100) d.points = p;
        if (mode == 'solution') mode = 'after';
      }
      continue;
    }
    if (mode == 'statement' || mode == 'choices') {
      final choices = _splitChoices(t);
      if (choices != null) {
        current().choices.addAll(choices);
        mode = 'choices';
        continue;
      }
    }
    if (mode == 'solution') {
      current().solution.add(t);
    } else if (mode == 'choices' || mode == 'after') {
      start().statement.add(t);
    } else {
      current().statement.add(t);
    }
  }
  flush();
  final numbered = out.any((o) => o.numbered);
  return [
    for (final o in out)
      if (!(numbered && !o.numbered && o.prose)) o.block,
  ];
}
