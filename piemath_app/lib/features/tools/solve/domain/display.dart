// Хариуг дэлгэцэнд цэвэрхэн харуулах (вэбийн `solve/display.ts`) — тооцоо өөрчлөхгүй:
// хэт олон оронтой аравтын тоог богиносгох, «бодлого = хариу»-аас бодлогыг хасах,
// холимог тоог дэлгэрэнгүй рүү, утгагүй ойролцоог хасах.
import 'steps.dart';

/// Нэг аравтын тоог богиносгоно: |v|>=1 → 2 орон, |v|<1 → 3 цифр.
String shortDec(String s) {
  final v = double.tryParse(s);
  if (v == null || !v.isFinite) return s;
  var out = v.abs() >= 1 ? v.toStringAsFixed(2) : double.parse(v.toStringAsPrecision(3)).toString();
  if (out.contains('.')) out = out.replaceFirst(RegExp(r'0+$'), '').replaceFirst(RegExp(r'\.$'), '');
  if (RegExp('e', caseSensitive: false).hasMatch(out)) {
    out = v.toStringAsFixed(4).replaceFirst(RegExp(r'0+$'), '').replaceFirst(RegExp(r'\.$'), '');
  }
  return out;
}

/// LaTeX дотор 4+ орны бутархай хэсэгтэй тоо бүрийг богиносгоно.
String tidyTex(String tex) => tex.replaceAllMapped(RegExp(r'(\d+\.\d{4,})'), (m) => shortDec(m.group(0)!));

final _mixedRe = RegExp(r'^=\s*-?\d+\\frac\{\d+\}\{\d+\}$');

class Display {
  const Display({required this.main, required this.approx, required this.alt, required this.inline});

  /// Үндсэн хариу (том)
  final List<String> main;

  /// Ойролцоо утга (жижиг саарал)
  final List<String> approx;

  /// Холимог тоо гэх мэт нэмэлт хэлбэр
  final List<String> alt;

  /// Богино хариу мөрүүд нэг мөрөнд багтах уу (x_1 = 2, x_2 = 3)
  final bool inline;
}

String _stripProblem(String a, String? problem) {
  if (problem == null) return a;
  final p = problem.trim();
  if (a.startsWith(p)) {
    final rest = a.substring(p.length).trim();
    if (RegExp(r'^(=|\\approx)').hasMatch(rest)) return rest;
  }
  return a;
}

bool _trivialApprox(String s) {
  final parts = s.split(r'\approx').map((x) => x.trim()).toList();
  if (parts.length != 2) return false;
  final l = parts[0], r = parts[1];
  if (l.isEmpty) return false;
  if (l == r) return true;
  return RegExp(r'^-?\d+$').hasMatch(l);
}

Display displayOf(Solution sol) {
  final main = <String>[];
  final alt = <String>[];
  for (final a in sol.answer) {
    final t = tidyTex(_stripProblem(a, sol.problem));
    if (_mixedRe.hasMatch(t.replaceAll(RegExp(r'\s+'), '')) && main.isNotEmpty) {
      alt.add(t);
    } else {
      main.add(t);
    }
  }
  final approx = (sol.approx ?? const <String>[]).where((x) => !_trivialApprox(x)).map(tidyTex).toList();
  final inline =
      main.length > 1 &&
      main.length <= 4 &&
      main.every((m) => m.length <= 28 && RegExp(r'^[a-z](_\{\d+\})?\s*=').hasMatch(m));
  return Display(main: main, approx: approx, alt: alt, inline: inline);
}
