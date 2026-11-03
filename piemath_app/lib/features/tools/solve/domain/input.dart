// Хэрэглэгчийн бичвэрийг задлагчид ойлгогдох хэлбэрт (вэбийн `solve/input.ts`):
//   кирилл «х», «у» → x, y;  «:» → «/»;  доод индекс «log₂» → log_2;
//   «30°» → градус;  C(n,k), A(n,k) → факториалын томьёо.

const _sub = {
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
};

class InputError implements Exception {
  InputError(this.message);
  final String message;
  @override
  String toString() => message;
}

String prepare(String src, {bool degrees = false}) {
  var s = src
      .replaceAll(RegExp('[хХ]'), 'x')
      .replaceAll(RegExp('[уУ]'), 'y')
      .replaceAll(' ', ' ')
      .replaceAllMapped(
        RegExp('[₀-₉]+'),
        (m) => '_${m.group(0)!.split('').map((c) => _sub[c]).join()}',
      )
      .replaceAllMapped(RegExp(r'(\d)\s*:\s*(?=[\d(a-zA-Z])'), (m) => '${m.group(1)}/')
      .replaceAll(RegExp(r'\)\s*:\s*(?=[\d(a-zA-Z])'), ')/');
  if (RegExp('\u2260|!=').hasMatch(s)) {
    throw InputError('«\u2260» тэмдгийг ойлгохгүй — тэгшитгэл эсвэл тэнцэтгэл биш оруулна уу');
  }
  s = degrees
      ? s.replaceAll('°', '')
      : s.replaceAllMapped(RegExp(r'(\d+(?:\.\d+)?)\s*°'), (m) => '(${m.group(1)}*pi/180)');
  return expandComb(s);
}

/// C(n,k) → n!/(k!(n-k)!), A(n,k) → n!/(n-k)! — хаалт дотор хаалтгүй аргумент.
String expandComb(String s) {
  return s
      .replaceAllMapped(
        RegExp(r'\bC\s*\(\s*([^,;()]+?)\s*[,;]\s*([^,;()]+?)\s*\)'),
        (m) => '((${m.group(1)})!/((${m.group(2)})!*((${m.group(1)})-(${m.group(2)}))!))',
      )
      .replaceAllMapped(
        RegExp(r'\bA\s*\(\s*([^,;()]+?)\s*[,;]\s*([^,;()]+?)\s*\)'),
        (m) => '((${m.group(1)})!/(((${m.group(1)})-(${m.group(2)}))!))',
      );
}

class CombPattern {
  const CombPattern(this.kind, this.n, this.k);

  /// 'C', 'A' эсвэл 'F' (факториал)
  final String kind;
  final int n;
  final int k;
}

/// «C(10,3)», «A(5,2)», «20!» хэлбэр бол бүхэл аргументуудыг буцаана.
CombPattern? combPattern(String src) {
  final s = src.replaceAll(RegExp(r'\s'), '');
  var m = RegExp(r'^([CA])\((\d+)[,;](\d+)\)$').firstMatch(s);
  if (m != null) return CombPattern(m.group(1)!, _num(m.group(2)!), _num(m.group(3)!));
  m = RegExp(r'^(\d+)!$').firstMatch(s);
  if (m != null) return CombPattern('F', _num(m.group(1)!), 0);
  return null;
}

int _num(String s) {
  final v = int.tryParse(s);
  // хэт урт тоо — хязгаарын шалгалтад унагахын тулд их утга
  return v ?? (1 << 62);
}

/// Олон мөрийг тусгаарлах (систем): шинэ мөр эсвэл «;» (хаалтнаас гадна).
List<String> splitLines(String src) {
  final out = <String>[];
  var depth = 0;
  var cur = StringBuffer();
  for (final ch in src.split('')) {
    if (ch == '(' || ch == '[' || ch == '{') depth++;
    if (ch == ')' || ch == ']' || ch == '}') depth--;
    if ((ch == '\n' || ch == ';') && depth <= 0) {
      final t = cur.toString().trim();
      if (t.isNotEmpty) out.add(t);
      cur = StringBuffer();
      continue;
    }
    cur.write(ch);
  }
  final t = cur.toString().trim();
  if (t.isNotEmpty) out.add(t);
  return out;
}
