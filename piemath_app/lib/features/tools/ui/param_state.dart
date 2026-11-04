import 'package:flutter/foundation.dart';

import '../../../shared/math_keyboard/math_keyboard_lib.dart';
import '../domain/shapes.dart' show ParamSpec;

/// Дүрсийн утгуудын талбарууд. Бичиж дуусаагүй (жишээ нь `\frac{3}{\square}`) үед
/// сүүлийн хүчинтэй утгаар зурсаар байна — зураг анивчихгүй. Дүрс сольж буцаж ирэхэд
/// өмнө бичсэн утга хадгалагдана.
class ParamState extends ChangeNotifier {
  ParamState(this.group);

  final MathFieldGroup group;
  Map<String, MathInputController> _controllers = const {};
  List<ParamSpec> _specs = const [];
  String _scope = '';
  final _last = <String, double>{};
  final _memory = <String, double?>{};

  Map<String, MathInputController> get controllers => _controllers;
  List<ParamSpec> get specs => _specs;

  /// Дүрс солигдоход талбаруудыг шинээр үүсгэнэ.
  void configure(String scope, List<ParamSpec> specs) {
    _saveMemory();
    for (final c in _controllers.values) {
      c
        ..removeListener(_changed)
        ..dispose();
    }
    _scope = scope;
    _specs = specs;
    _last.clear();
    _controllers = {
      for (final s in specs)
        s.key: MathInputController(
          kind: s.kind,
          value: _memory.containsKey('$scope/${s.key}') ? _memory['$scope/${s.key}'] : s.def,
        )..addListener(_changed),
    };
    for (final s in specs) {
      final v = _controllers[s.key]!.value;
      if (v != null) _last[s.key] = v;
    }
    group.setFields([for (final s in specs) _controllers[s.key]!]);
    notifyListeners();
  }

  void _saveMemory() {
    for (final e in _controllers.entries) {
      _memory['$_scope/${e.key}'] = e.value.value ?? _last[e.key];
    }
  }

  void _changed() {
    for (final e in _controllers.entries) {
      final v = e.value.value;
      if (v != null) _last[e.key] = v;
      if (e.value.isEmpty) _last.remove(e.key);
    }
    notifyListeners();
  }

  /// Тооцоонд өгөх утгууд (хоосон талбар — NaN).
  Map<String, double> get values => {for (final s in _specs) s.key: _last[s.key] ?? double.nan};

  /// Бичсэн боловч хүчингүй (задлагдахгүй) талбарууд.
  Set<String> get invalid => {
    for (final e in _controllers.entries)
      if (!e.value.isEmpty && e.value.value == null) e.key,
  };

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c
        ..removeListener(_changed)
        ..dispose();
    }
    super.dispose();
  }
}
