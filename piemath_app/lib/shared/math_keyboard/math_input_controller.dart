import 'package:flutter/foundation.dart';

import 'expr.dart';

/// Талбарт зөвшөөрөх утгын төрөл — гарны ямар товч идэвхтэйг тодорхойлно.
enum MathInputKind {
  /// Урт, талбай … (язгуур, бутархай, квадрат, пи зөвшөөрнө).
  length,

  /// Өнцөг (градус) — хэмийн тэмдэг зөвшөөрнө.
  angle,

  /// Бүхэл тоо (олон өнцөгтийн өнцгийн тоо г.м.) — зөвхөн цифр.
  integer,
}

/// Гарны нэг товчны үйлдэл.
enum MathKey {
  d0,
  d1,
  d2,
  d3,
  d4,
  d5,
  d6,
  d7,
  d8,
  d9,
  dot,
  sqrt,
  frac,
  square,
  pi,
  degree,
  backspace,
  clear,
  next;

  static const digits = [d0, d1, d2, d3, d4, d5, d6, d7, d8, d9];

  bool get isDigit => index <= d9.index;
}

/// Гарнаас бичих талбарын төлөв. Системийн гар хэзээ ч гарахгүй — оролт зөвхөн
/// [MathKey]-ээр. Дотооддоо токены жагсаалт (`2`, `sqrt(`, `3`, `)`, `/`, …) —
/// буцаах товч нэг токеныг бүтнээр нь арилгана.
///
/// Язгуур нь дараагийн ТООГ л хамарна: цифрээс өөр товч дармагц хаалт автоматаар хаагдана
/// (`2\sqrt{3}`, `\frac{\sqrt{3}}{2}` гэх мэт геометрийн утгад хангалттай, нэмэлт
/// «гарах» товч хэрэггүй).
class MathInputController extends ChangeNotifier {
  MathInputController({this.kind = MathInputKind.length, double? value}) {
    if (value != null) _setTokens(_tokensOf(value));
  }

  final MathInputKind kind;
  final List<String> _tokens = [];

  List<String> get tokens => List.unmodifiable(_tokens);
  bool get isEmpty => _tokens.isEmpty;

  /// Задлагчид өгөх бичвэр (`2sqrt(3)/3`).
  String get text => _plain(complete: true, placeholder: false);

  /// Хүчинтэй тоо; дуусаагүй эсвэл алдаатай бол null.
  double? get value {
    if (_tokens.isEmpty || _incomplete) return null;
    final v = evaluate(text);
    if (v == null || !v.isFinite) return null;
    return v;
  }

  /// Дэлгэцэнд харуулах LaTeX (дуусаагүй хэсэгт `\square`).
  String get displayTex {
    if (_tokens.isEmpty) return '';
    String body;
    try {
      body = toLatex(parseExpr(_plain(complete: true, placeholder: true)), raw: true);
    } on ExprParseError {
      body = _tokens.join();
    }
    if (_tokens.contains(degreeSign)) body = '$body^{\\circ}';
    return body;
  }

  /// Гадна талаас утга тавих (анхдагч утга, дахин эхлүүлэх).
  void setValue(double? v) {
    _setTokens(v == null ? const [] : _tokensOf(v));
    notifyListeners();
  }

  void _setTokens(List<String> t) {
    _tokens
      ..clear()
      ..addAll(t);
  }

  /// Энэ товч энэ талбарт идэвхтэй эсэх.
  bool allows(MathKey k) {
    switch (k) {
      case MathKey.backspace || MathKey.clear || MathKey.next:
        return true;
      case MathKey.degree:
        return kind == MathInputKind.angle;
      case MathKey.dot || MathKey.sqrt || MathKey.frac || MathKey.square || MathKey.pi:
        return kind != MathInputKind.integer;
      default:
        return true;
    }
  }

  /// Товч дарав. `next`-ийг гар өөрөө (талбар солих) шийднэ — энд юу ч хийхгүй.
  void press(MathKey k) {
    if (!allows(k)) return;
    switch (k) {
      case MathKey.next:
        return;
      case MathKey.backspace:
        if (_tokens.isEmpty) return;
        _tokens.removeLast();
      case MathKey.clear:
        if (_tokens.isEmpty) return;
        _tokens.clear();
      case MathKey.dot:
        if (_tokens.length >= _maxTokens) return;
        // Нэг тоонд ганц цэг.
        final run = _numberRun();
        if (run.contains('.')) return;
        if (run.isEmpty) _tokens.add('0');
        _tokens.add('.');
      case MathKey.sqrt:
        if (_tokens.length >= _maxTokens) return;
        _closeSqrt();
        _tokens.add('sqrt(');
      case MathKey.frac:
        if (_tokens.isEmpty || _endsWithOperator) return;
        _closeSqrt();
        _tokens.add('/');
      case MathKey.square:
        if (_tokens.isEmpty || _endsWithOperator || _tokens.last == degreeSign) return;
        _closeSqrt();
        _tokens.add('^2');
      case MathKey.pi:
        if (_tokens.length >= _maxTokens) return;
        if (!(_openSqrt && _tokens.last == 'sqrt(')) _closeSqrt();
        _tokens.add('pi');
      case MathKey.degree:
        if (_tokens.isEmpty || _tokens.contains(degreeSign) || _endsWithOperator) return;
        _closeSqrt();
        _tokens.add(degreeSign);
      default:
        if (_tokens.length >= _maxTokens) return;
        if (_tokens.isNotEmpty && _tokens.last == degreeSign) return;
        // `^2`, `)`-ийн араас цифр бичвэл далд үржвэр биш шинэ тоо болох нь төөрөгдөл — хориглоно.
        if (_tokens.isNotEmpty && (_tokens.last == '^2')) return;
        _tokens.add('${k.index}');
    }
    notifyListeners();
  }

  static const _maxTokens = 24;

  bool get _openSqrt => _openCount > 0;

  int get _openCount {
    var n = 0;
    for (final t in _tokens) {
      if (t == 'sqrt(') n++;
      if (t == ')') n--;
    }
    return n;
  }

  bool get _endsWithOperator {
    if (_tokens.isEmpty) return false;
    final l = _tokens.last;
    return l == '/' || l == 'sqrt(' || l == '.';
  }

  bool get _incomplete => _endsWithOperator && _tokens.last != '.';

  void _closeSqrt() {
    if (_openSqrt && _tokens.last != 'sqrt(') _tokens.add(')');
  }

  String _numberRun() {
    final b = StringBuffer();
    for (var i = _tokens.length - 1; i >= 0; i--) {
      final t = _tokens[i];
      if (t.length == 1 && RegExp(r'[0-9.]').hasMatch(t)) {
        b.write(t);
      } else {
        break;
      }
    }
    return b.toString();
  }

  String _plain({required bool complete, required bool placeholder}) {
    final b = StringBuffer();
    for (final t in _tokens) {
      if (t == degreeSign) continue;
      b.write(t);
    }
    if (placeholder && _incomplete) b.write('?');
    if (complete) {
      for (var i = 0; i < _openCount; i++) {
        b.write(')');
      }
    }
    return b.toString();
  }

  /// Тоог токен болгох: 4 → `4`, 2.5 → `2`, `.`, `5`.
  static List<String> _tokensOf(double v) {
    final s = v == v.roundToDouble() ? v.toInt().toString() : double.parse(v.toStringAsFixed(6)).toString();
    return [for (final ch in s.split('')) ch];
  }
}

/// Нэг дэлгэцийн талбаруудын бүлэг: аль нь идэвхтэй (гар нээлттэй), «Дараах»-аар дараагийнх.
class MathFieldGroup extends ChangeNotifier {
  MathFieldGroup();

  List<MathInputController> _fields = const [];
  int? _active;

  List<MathInputController> get fields => _fields;
  int? get activeIndex => _active;
  MathInputController? get active => _active == null || _active! >= _fields.length ? null : _fields[_active!];
  bool get isOpen => active != null;

  /// Дүрс солигдоход талбаруудыг шинэчилнэ (гар хаагдана).
  void setFields(List<MathInputController> f) {
    _fields = f;
    _active = null;
    notifyListeners();
  }

  void focus(MathInputController c) {
    final i = _fields.indexOf(c);
    if (i < 0 || i == _active) return;
    _active = i;
    notifyListeners();
  }

  /// Дараагийн талбар; сүүлийнх бол гарыг хаана.
  void next() {
    if (_active == null) return;
    _active = _active! + 1 < _fields.length ? _active! + 1 : null;
    notifyListeners();
  }

  void close() {
    if (_active == null) return;
    _active = null;
    notifyListeners();
  }
}
