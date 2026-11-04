// Зургийн «хэл»: загвар ба чөлөөт горим эдгээр анхдагч дүрсийг үүсгэж,
// FigurePainter нэг л газар зурна (вэбийн `plane/figure.ts`). Координат математикийнх.
import 'fmt.dart';
import 'geom.dart';

/// ink — үндсэн; brand — нэмэлт шугам; dim — туслах; accent — сонгосон.
enum Tone { ink, brand, dim, accent }

sealed class Prim {
  const Prim();
}

/// Битүү олон өнцөгт.
class PolyPrim extends Prim {
  const PolyPrim(this.pts, {this.fill = true, this.tone = Tone.ink, this.dash = false, this.width = 2.2});
  final List<Pt> pts;
  final bool fill;
  final Tone tone;
  final bool dash;
  final double width;
}

class SegPrim extends Prim {
  const SegPrim(this.a, this.b, {this.tone = Tone.ink, this.dash = false, this.width = 2});
  final Pt a, b;
  final Tone tone;
  final bool dash;
  final double width;
}

class CirclePrim extends Prim {
  const CirclePrim(this.c, this.r, {this.tone = Tone.ink, this.fill = false, this.dash = false, this.width = 2.2});
  final Pt c;
  final double r;
  final Tone tone;
  final bool fill;
  final bool dash;
  final double width;
}

/// Сектор (будсан): a0-аас a1 хүртэл цагийн зүүний эсрэг (радиан).
class SectorPrim extends Prim {
  const SectorPrim(this.c, this.r, this.a0, this.a1);
  final Pt c;
  final double r, a0, a1;
}

class DotPrim extends Prim {
  const DotPrim(this.p, {this.tone = Tone.ink, this.radius = 3.5});
  final Pt p;
  final Tone tone;
  final double radius;
}

/// Цэгийн нэр: [away] цэгээс холдох чиглэлд. [sub] — доод индекс (A_1).
class LabelPrim extends Prim {
  const LabelPrim(this.p, this.text, {this.sub, this.away, this.dir, this.tone = Tone.ink});
  final Pt p;
  final String text;
  final String? sub;
  final Pt? away;
  final Pt? dir;
  final Tone tone;
}

/// Өнцгийн тэмдэг v оройд v-a ба v-b хооронд (бага өнцөг). [degrees] — шошгоны утга.
class AnglePrim extends Prim {
  const AnglePrim(this.v, this.a, this.b, {this.degrees, this.letter, this.right = false, this.arcs = 1});
  final Pt v, a, b;
  final double? degrees;
  final String? letter;
  final bool right;
  final int arcs;
}

/// Тэнцүү хэрчмийн зураас (n ширхэг).
class TicksPrim extends Prim {
  const TicksPrim(this.a, this.b, this.n);
  final Pt a, b;
  final int n;
}

/// Талын урт: [inside] цэгийн эсрэг талд.
class SidePrim extends Prim {
  const SidePrim(this.a, this.b, this.text, this.inside, {this.italic = false});
  final Pt a, b;
  final String text;
  final Pt inside;
  final bool italic;
}

/// Нэг үр дүнгийн мөр: sym = steps[0] = ... = утга.
class ResultRow {
  const ResultRow(this.sym, this.v, {this.steps = const [], this.unit = ''});
  final String sym;
  final List<String> steps;

  /// null — утгагүй мөр (координат г.м.).
  final Val? v;
  final String unit;

  /// Нэг мөрт LaTeX: «S=\frac{ab}{2}=6».
  String get tex {
    // Орлуулга нь хариутайгаа ижил бол давтахгүй («4\\sqrt{3}=4\\sqrt{3}» биш).
    final shown = steps.where((s) => v == null || (s != v!.exact && s != v!.dec)).toList();
    return '$sym${shown.map((s) => '=$s').join()}${v == null ? '' : valTex(v!, unit)}';
  }
}

class Metric {
  const Metric(this.name, {this.rows = const [], this.text, this.key = false});
  final String name;
  final List<ResultRow> rows;

  /// Энгийн бичвэр (гурвалжны төрөл г.м.).
  final String? text;

  /// Гол үр дүн — эхэнд.
  final bool key;

  String get tex => rows.map((r) => r.tex).join(r',\ ');
}

/// Хаалтын гадна талын «=»-ээр хуваана.
List<String> splitEq(String s) {
  final out = <String>[];
  var depth = 0;
  final cur = StringBuffer();
  for (final ch in s.split('')) {
    if (ch == '{' || ch == '(') depth++;
    if (ch == '}' || ch == ')') depth--;
    if (ch == '=' && depth == 0) {
      out.add(cur.toString());
      cur.clear();
    } else {
      cur.write(ch);
    }
  }
  out.add(cur.toString());
  return out.where((x) => x.isNotEmpty).toList();
}

ResultRow lenRow(String sym, String subst, double value, [String unit = '']) =>
    ResultRow(sym, val(value), steps: subst.isEmpty ? const [] : splitEq(subst), unit: unit);

ResultRow angRow(String sym, String subst, double deg) =>
    ResultRow(sym, degVal(deg), steps: subst.isEmpty ? const [] : splitEq(subst));

ResultRow piRow(String sym, String subst, double k, [String unit = '']) =>
    ResultRow(sym, piVal(k), steps: subst.isEmpty ? const [] : splitEq(subst), unit: unit);

/// Тэнцүү утгуудыг бүлэглэж зураасны тоо (1, 2, 3); ганцаараа бол 0.
List<int> equalGroups(List<double> vals, [double tol = 1e-7]) {
  bool near(double x, double y) => (x - y).abs() <= tol * [1.0, x.abs(), y.abs()].reduce((a, b) => a > b ? a : b);
  final out = List.filled(vals.length, 0);
  var g = 0;
  for (var i = 0; i < vals.length; i++) {
    if (out[i] != 0) continue;
    final same = [
      for (var j = i + 1; j < vals.length; j++)
        if (out[j] == 0 && near(vals[j], vals[i])) j,
    ];
    if (same.isEmpty) continue;
    g++;
    out[i] = g;
    for (final j in same) {
      out[j] = g;
    }
  }
  return out;
}

/// Зурах бэлэн дүрс эсвэл алдааны тайлбар.
class Built {
  const Built.ok(this.prims, this.metrics, {this.note}) : reason = null, reasonTex = null;
  const Built.bad(String this.reason, [this.reasonTex]) : prims = const [], metrics = const [], note = null;
  final List<Prim> prims;
  final List<Metric> metrics;
  final String? note;
  final String? reason;
  final String? reasonTex;
  bool get ok => reason == null;

  Metric? metric(String name) {
    for (final m in metrics) {
      if (m.name == name) return m;
    }
    return null;
  }
}
