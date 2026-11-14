import 'package:flutter/foundation.dart';

/// Бодолтын нэг алхам.
@immutable
class SolutionStep {
  const SolutionStep({required this.text, this.number});

  /// Эх бичвэрт «1.» гэж дугаарласан бол тэр дугаар.
  final int? number;

  /// Алхмын бичвэр (markdown + LaTeX), дугаар хассан.
  final String text;

  /// Урт алхмыг эвхэхэд харуулах эхний хэсэг.
  String get head => _split(text).$1;

  /// Эвхэгдсэн үед нуугдах үлдсэн хэсэг. Богино алхамд `null`.
  String? get rest => _split(text).$2;

  /// Урт алхам (эвхэгдэнэ).
  bool get isLong => rest != null;

  @override
  bool operator ==(Object other) => other is SolutionStep && other.number == number && other.text == text;

  @override
  int get hashCode => Object.hash(number, text);

  @override
  String toString() => 'SolutionStep($number, $text)';
}

/// Задалсан бодолт: алхмууд + тусдаа «Хариу» мөр.
@immutable
class ParsedSolution {
  const ParsedSolution({required this.steps, this.answer});

  final List<SolutionStep> steps;

  /// «Хариу: …» мөрийн агуулга (тод тэмдэг, шошгогүй).
  final String? answer;

  bool get isEmpty => steps.isEmpty && (answer == null || answer!.isEmpty);

  /// Ядаж нэг алхам эх бичвэрт дугаартай байсан.
  bool get hasNumbers => steps.any((s) => s.number != null);
}

final _numbered = RegExp(r'^\s*(?:\*\*)?(\d{1,3})[.)](?:\*\*)?\s+(.*)$');
final _answerLine = RegExp(r'^\s*(?:\*\*)?\s*Хариу\s*[:：]\s*(.*)$', caseSensitive: false);

/// `solutionOutline`-ийг алхмуудад хуваана.
///
/// - «1. …», «2) …» мөр шинэ алхам эхлүүлнэ.
/// - Дугааргүй бол хоосон мөрөөр тусгаарласан догол мөр бүр нэг алхам.
/// - Дугаартай алхамын дараах хоосон мөртэй догол мөр өмнөх алхамд хамаарна.
/// - «Хариу: …» мөр (болон түүнээс хойших мөрүүд) алхам биш, [ParsedSolution.answer].
/// - `$$ … $$` дотрох мөр, хоосон мөр хэзээ ч хуваагдахгүй.
ParsedSolution parseSolution(String? source) {
  final src = (source ?? '').replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  if (src.trim().isEmpty) return const ParsedSolution(steps: []);

  final lines = src.split('\n');
  // Мөр бүрийн эхэнд `$$` дотор байсан эсэх.
  final inMath = <bool>[];
  var open = false;
  for (final l in lines) {
    inMath.add(open);
    if (_countDisplay(l).isOdd) open = !open;
  }
  var hasNumbers = false;
  for (var i = 0; i < lines.length; i++) {
    if (!inMath[i] && _numbered.hasMatch(lines[i])) {
      hasNumbers = true;
      break;
    }
  }

  final drafts = <_Draft>[];
  List<String>? answer;
  var pendingBlank = false;

  for (var i = 0; i < lines.length; i++) {
    final line = lines[i];
    if (answer != null) {
      answer.add(line);
      continue;
    }
    if (inMath[i]) {
      drafts.last.lines.add(line); // томьёо нээсэн мөр draft-д орсон тул drafts хоосон биш
      continue;
    }
    final ans = _answerLine.firstMatch(line);
    if (ans != null) {
      answer = [ans.group(1)!];
      continue;
    }
    final num = _numbered.firstMatch(line);
    if (num != null) {
      drafts.add(_Draft(int.parse(num.group(1)!))..lines.add(num.group(2)!));
      pendingBlank = false;
      continue;
    }
    if (line.trim().isEmpty) {
      pendingBlank = true;
      continue;
    }
    if (drafts.isEmpty || (pendingBlank && !hasNumbers)) {
      drafts.add(_Draft(null));
    } else if (pendingBlank) {
      drafts.last.lines.add('');
    }
    drafts.last.lines.add(line);
    pendingBlank = false;
  }

  final steps = [
    for (final d in drafts)
      if (d.text.isNotEmpty) SolutionStep(number: d.number, text: d.text),
  ];
  final ansText = answer == null ? null : _cleanAnswer(answer.join('\n'));
  return ParsedSolution(steps: steps, answer: (ansText == null || ansText.isEmpty) ? null : ansText);
}

class _Draft {
  _Draft(this.number);
  final int? number;
  final lines = <String>[];
  String get text => lines.join('\n').trim();
}

String _cleanAnswer(String s) => s.trim().replaceAll(RegExp(r'^\*+\s*|\s*\*+$'), '').trim();

int _countDisplay(String line) {
  var n = 0;
  for (var i = 0; i < line.length - 1; i++) {
    if (line[i] == r'\') {
      i++;
      continue;
    }
    if (line[i] == r'$' && line[i + 1] == r'$') {
      n++;
      i++;
    }
  }
  return n;
}

const _minLong = 140;
const _minRest = 40;

/// Урт бичвэрийг (толгой, үлдэгдэл)-д хуваана. Томьёоны дундуур хэзээ ч таслахгүй.
(String, String?) _split(String text) {
  if (text.length < _minLong) return (text, null);
  var display = false;
  var inline = false;
  for (var i = 0; i < text.length; i++) {
    final ch = text[i];
    if (ch == r'\') {
      i++;
      continue;
    }
    if (ch == r'$') {
      if (i + 1 < text.length && text[i + 1] == r'$') {
        display = !display;
        i++;
      } else if (!display) {
        inline = !inline;
      }
      continue;
    }
    if (display || inline) continue;
    final isBreak = ch == '\n' ||
        ((ch == '.' || ch == '!' || ch == '?') && i + 1 < text.length && (text[i + 1] == ' ' || text[i + 1] == '\n'));
    if (!isBreak) continue;
    final end = ch == '\n' ? i : i + 1;
    final head = text.substring(0, end).trim();
    final rest = text.substring(end).trim();
    if (head.isEmpty) continue;
    if (rest.length < _minRest) return (text, null);
    return (head, rest);
  }
  return (text, null);
}

/// Тест болон хайлтад: алхам [term]-ийг агуулах эсэх (том/жижиг үсэг үл ялгана).
bool solutionMatches(String text, String term) {
  final t = term.trim().toLowerCase();
  return t.isNotEmpty && text.toLowerCase().contains(t);
}
