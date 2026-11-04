// Функц, тэгшитгэл бичих талбарын төлөв (График, Бодогч хоёулаа хэрэглэнэ).
//
// Системийн гар ХЭЗЭЭ Ч гарахгүй: оролт зөвхөн [FuncKeyboard]-ээр, токеноор
// (`7`, `x`, `sin(`, `^`, `sqrt(` …) — буцаах товч нэг токеныг бүтнээр нь арилгана.
// Бичвэр нь задлагчийн ASCII (`2x^2-sin(x)`), дэлгэцэнд LaTeX-ээр.
import 'package:flutter/foundation.dart';

import '../../../../shared/math_keyboard/expr.dart';

class FuncInputController extends ChangeNotifier {
  FuncInputController([String initial = '']) {
    if (initial.isNotEmpty) _tokens.addAll(initial.split(''));
  }

  final List<String> _tokens = [];
  static const maxTokens = 120;

  List<String> get tokens => List.unmodifiable(_tokens);
  bool get isEmpty => _tokens.isEmpty;

  /// Задлагчид өгөх бичвэр.
  String get text => _tokens.join();

  set text(String v) {
    _tokens
      ..clear()
      ..addAll(v.split(''));
    notifyListeners();
  }

  void insert(String tok) {
    if (_tokens.length >= maxTokens) return;
    // Шинэ мөр дараалан эсвэл эхэнд хэрэггүй.
    if (tok == '\n' && (_tokens.isEmpty || _tokens.last == '\n')) return;
    _tokens.add(tok);
    notifyListeners();
  }

  void backspace() {
    if (_tokens.isEmpty) return;
    _tokens.removeLast();
    notifyListeners();
  }

  void clear() {
    if (_tokens.isEmpty) return;
    _tokens.clear();
    notifyListeners();
  }

  /// Мөр бүрийн LaTeX (дуусаагүй хэсэгт `\square`, хаалтыг түр хаана).
  List<String> get lineTex => text.split('\n').map(previewTex).toList();
}

final _trailingOp = RegExp(r'(log_|[+\-*/^(_=<>,])$');

/// Бичиж дуусаагүй ASCII мөрийг LaTeX-ээр урьдчилан харуулах.
String previewTex(String line) {
  var s = line;
  if (s.trim().isEmpty) return '';
  if (_trailingOp.hasMatch(s)) s = '$s?';
  if ('|'.allMatches(s).length.isOdd) s = '$s|';
  var open = 0;
  for (final ch in s.split('')) {
    if (ch == '(') open++;
    if (ch == ')') open--;
  }
  if (open > 0) s = s + ')' * open;
  try {
    final rel = parseRelation(s);
    if (rel != null) {
      final op = switch (rel.op) {
        RelOp.eq => '=',
        RelOp.lt => '<',
        RelOp.gt => '>',
        RelOp.le => r'\le ',
        RelOp.ge => r'\ge ',
      };
      return '${toLatex(rel.lhs, raw: true)}$op${toLatex(rel.rhs, raw: true)}';
    }
    return toLatex(parseExpr(s), raw: true);
  } catch (_) {
    return _rawTex(line);
  }
}

/// Задлагдахгүй бичвэрийг аюулгүй LaTeX болгоно (тусгай тэмдгийг escape).
String _rawTex(String s) => s
    .replaceAll(r'\', '')
    .replaceAll('{', r'\{')
    .replaceAll('}', r'\}')
    .replaceAll('*', r'\cdot ')
    .replaceAll('<=', r'\le ')
    .replaceAll('>=', r'\ge ')
    .replaceAll('pi', r'\pi ')
    .replaceAll('_', r'\_')
    .replaceAll('^', r'\hat{}')
    .replaceAll('|', r'\vert ');
