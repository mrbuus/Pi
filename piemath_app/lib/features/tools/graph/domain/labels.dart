// Зургийн шошгыг давхцалгүй байрлуулах (вэбийн `tools/graph/labels.ts`).
//
// Цэг бүрийн эргэн тойронд 8 боломжит байрлал туршиж, өмнө тавьсан шошго,
// хориглосон тэгш өнцөгт, зургийн хүрээтэй давхцахгүй эхнийхийг авна.
// Багтахгүй шошгыг алгасна — давхцсан тоо харуулахаас хоосон нь дээр.

class LBox {
  const LBox(this.x, this.y, this.w, this.h);
  final double x, y, w, h;
}

class LabelReq {
  const LabelReq(this.px, this.py, this.w, this.h);

  /// зангуу цэг (px)
  final double px, py;
  final double w, h;
}

/// Ойролцоо бичвэрийн өргөн: тоо ~0.56em, хаалт/таслал нарийн.
double textWidth(String s, double size) {
  var w = 0.0;
  for (final ch in s.split('')) {
    w += RegExp(r'[()\-;.,:\s]').hasMatch(ch) ? 0.33 : (ch == '\u2212' ? 0.6 : 0.56);
  }
  return w * size;
}

bool _overlap(LBox a, LBox b, [double pad = 2]) =>
    a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/// [reqs] — байрлуулах шошгууд (чухлыг нь эхэнд); багтаагүй бол null.
List<LBox?> placeLabels(List<LabelReq> reqs, double areaW, double areaH, {List<LBox> blocked = const [], double gap = 6}) {
  final taken = <LBox>[...blocked];
  return reqs.map((r) {
    final d = gap;
    final cands = <(double, double)>[
      (d, -d - r.h), // баруун дээд
      (-d - r.w, -d - r.h), // зүүн дээд
      (d, d), // баруун доод
      (-d - r.w, d), // зүүн доод
      (-r.w / 2, -d - r.h - 2), // шууд дээр
      (-r.w / 2, d + 2), // шууд доор
      (d + 2, -r.h / 2), // баруун
      (-d - 2 - r.w, -r.h / 2), // зүүн
    ];
    for (final (ox, oy) in cands) {
      final b = LBox(r.px + ox, r.py + oy, r.w, r.h);
      if (b.x < 2 || b.y < 2 || b.x + b.w > areaW - 2 || b.y + b.h > areaH - 2) continue;
      if (taken.any((t) => _overlap(t, b))) continue;
      taken.add(b);
      return b;
    }
    return null;
  }).toList();
}

/// Тоог шошгонд: бүхэлд ойр бол бүхэл, үгүй бол <=2 орон; хасах нь «-».
String shortNum(double v) {
  if (!v.isFinite) return '';
  final r = v.roundToDouble();
  if ((v - r).abs() < 5e-4) return r.toInt().toString().replaceFirst('-', '\u2212');
  var s = v.toStringAsFixed(2);
  s = s.replaceFirst(RegExp(r'0+$'), '').replaceFirst(RegExp(r'\.$'), '');
  return s.replaceFirst('-', '\u2212');
}
