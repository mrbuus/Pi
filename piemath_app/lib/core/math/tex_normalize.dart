/// flutter_math_fork-ийн дэмждэггүй, гэхдээ вэбийн KaTeX-ийн дэмждэг LaTeX-ийг дэмждэг хувилбар
/// руу хөрвүүлэх (зөвхөн ХАРАГДАЦАД — сангийн өгөгдөл өөрчлөгдөхгүй).
///
/// Жагсаалтыг `tool/latex_audit/` аудит ба KaTeX командын шалгалтаар (`test/core/math/
/// tex_normalize_test.dart`) гаргасан. Шинэ команд бүтэлгүйтвэл энд нэмж, тестэд оруул.
///
/// Санаатайгаар ХӨРВҮҮЛЭХГҮЙ: `\includegraphics`, `\html*`, `\def`, `\let`, `\gdef`,
/// `\newcommand` — вэб ч эдгээрийг хориглодог (trust/аюулгүй байдал), апп-д алдаа хэвээр.
library;

/// Нэг аргументгүй энгийн орлуулалт: `\команд` → утга.
const _simple = <String, String>{
  'Q': r'\mathbb{Q}',
  'C': r'\mathbb{C}',
  'textdegree': r'{}^{\circ}',
  'Arrowvert': r'\Vert',
  'iddots': r'\ddots',
  'textless': '<',
  'textgreater': '>',
  'textbar': '|',
  'textunderscore': r'\_',
  'textbackslash': r'\backslash',
  'textasciitilde': r'\sim',
  'varangle': r'\sphericalangle',
  'nonumber': '',
  'notag': '',
};

/// Нэг аргументтэй командыг өөр команд руу (`\pmb{a}` → `\boldsymbol{a}`).
const _rename1 = <String, String>{
  'pmb': r'\boldsymbol',
  'mathbbm': r'\mathbb',
  'overarc': r'\overset{\frown}',
  'wideparen': r'\overset{\frown}',
  'overgroup': r'\overset{\frown}',
  'overlinesegment': r'\overline',
  'underlinesegment': r'\underline',
  'emph': r'\textit',
  'textsl': r'\textit',
  'textsc': r'\text',
  'bbox': r'\fbox',
  'url': r'\text',
};

/// Нэг аргументийг өөрчлөлтгүй үлдээх (`\smash{y}` → `{y}`) — байрлалын нарийн тохиргоо л.
const _unwrap1 = <String>{'smash', 'llap', 'rlap', 'clap', 'mathllap', 'mathrlap', 'mathclap'};

/// Орчны нэр солих (`\begin{align*}` → `\begin{aligned}`). `null` = орчныг арилгах.
const _envRename = <String, String?>{
  'align': 'aligned',
  'align*': 'aligned',
  'alignat': 'alignedat',
  'alignat*': 'alignedat',
  'gathered': 'array}{c',
  'gather': 'array}{c',
  'gather*': 'array}{c',
  'equation': null,
  'equation*': null,
};

final _cmdRe = RegExp(r'\\([A-Za-z]+)');

/// Нормчлох гол функц. Өөрчлөх зүйлгүй бол эх мөрийг буцаана (хурдан зам).
String normalizeTex(String tex) {
  if (!tex.contains(r'\')) return tex;
  var s = tex;
  s = _renameEnvironments(s);
  s = _replaceCommands(s);
  s = _balanceLeftRight(s);
  s = _wrapTopLevelNewlines(s);
  s = _dropDanglingFrac(s);
  return s;
}

/// Импортоор аргументаа алдсан төгсгөлийн `\frac` (`$10\frac$ км ц` — эх нь `\frac{км}{ц}`).
/// Вэбийн KaTeX улаан алдаа харуулдаг; апп-д тоог нь л үлдээнэ. Контентыг санд засах ёстой
/// (`docs/LATEX-AUDIT.md`).
String _dropDanglingFrac(String s) => s.replaceFirst(RegExp(r'\\[dtc]?frac\s*$'), '');

String _renameEnvironments(String s) {
  if (!s.contains(r'\begin')) return s;
  return s.replaceAllMapped(RegExp(r'\\(begin|end)\{([A-Za-z]+\*?)\}'), (m) {
    final env = m.group(2)!;
    if (!_envRename.containsKey(env)) return m.group(0)!;
    final to = _envRename[env];
    if (to == null) return '';
    final isBegin = m.group(1) == 'begin';
    if (to == 'array}{c') return isBegin ? r'\begin{array}{c}' : r'\end{array}';
    return '\\${m.group(1)}{$to}';
  });
}

/// `{`-ээс эхэлсэн тэнцвэртэй хаалтын төгсгөлийн индекс (хаалтгүй бол -1).
int _matchBrace(String s, int open) {
  if (open >= s.length || s[open] != '{') return -1;
  var depth = 0;
  for (var i = open; i < s.length; i++) {
    final ch = s[i];
    if (ch == r'\') {
      i++; // `\{`, `\}` тоологдохгүй
      continue;
    }
    if (ch == '{') depth++;
    if (ch == '}') {
      depth--;
      if (depth == 0) return i;
    }
  }
  return -1;
}

int _skipSpaces(String s, int i) {
  while (i < s.length && s[i] == ' ') {
    i++;
  }
  return i;
}

String _replaceCommands(String s) {
  final out = StringBuffer();
  var i = 0;
  while (i < s.length) {
    final m = _cmdRe.matchAsPrefix(s, i);
    if (m == null) {
      // `\\`, `\{` гэх мэт хоёр тэмдэгт командыг бүхлээр нь алгасна.
      if (s[i] == r'\' && i + 1 < s.length) {
        out.write(s.substring(i, i + 2));
        i += 2;
      } else {
        out.write(s[i]);
        i++;
      }
      continue;
    }
    final name = m.group(1)!;
    final end = m.end;

    if (_simple.containsKey(name)) {
      out.write(_simple[name]);
      // Үсгээр үргэлжилбэл зай үлдээнэ (`\Q x` → `\mathbb{Q} x` хэвээр).
      i = end;
      continue;
    }

    if (_rename1.containsKey(name) || _unwrap1.contains(name) || name == 'set' || name == 'Set') {
      // `\smash[b]{y}` — сонголтын аргументийг алгасна.
      var argStart = _skipSpaces(s, end);
      if (_unwrap1.contains(name) && argStart < s.length && s[argStart] == '[') {
        final close = s.indexOf(']', argStart);
        if (close > 0) argStart = _skipSpaces(s, close + 1);
      }
      final close = _matchBrace(s, argStart);
      if (close < 0) {
        out.write(m.group(0));
        i = end;
        continue;
      }
      final arg = _replaceCommands(s.substring(argStart + 1, close));
      if (name == 'set' || name == 'Set') {
        out.write('\\left\\{$arg\\right\\}');
      } else if (_unwrap1.contains(name)) {
        out.write('{$arg}');
      } else {
        out.write('${_rename1[name]}{$arg}');
      }
      i = close + 1;
      continue;
    }

    if (name == 'href') {
      // `\href{url}{бичвэр}` → бичвэр л (апп-д томьёон доторх холбоос нээхгүй).
      final a1 = _skipSpaces(s, end);
      final c1 = _matchBrace(s, a1);
      final a2 = c1 < 0 ? -1 : _skipSpaces(s, c1 + 1);
      final c2 = a2 < 0 ? -1 : _matchBrace(s, a2);
      if (c2 > 0) {
        out.write('{${_replaceCommands(s.substring(a2 + 1, c2))}}');
        i = c2 + 1;
        continue;
      }
    }

    if (name == 'label' || name == 'tag') {
      final a = _skipSpaces(s, end);
      final close = _matchBrace(s, a);
      if (close > 0) {
        if (name == 'tag') out.write('\\qquad(\\text{${s.substring(a + 1, close)}})');
        i = close + 1;
        continue;
      }
    }

    if (name == 'hline' && !s.contains(r'\begin')) {
      // Хүснэгтээс гадуурх `\hline` — утгагүй, арилгана.
      i = end;
      continue;
    }

    out.write(m.group(0));
    i = end;
  }
  return out.toString();
}

/// `\left`/`\right` тэнцвэргүй бол (импортын алдаа: `\lbrack - 1;\infty\left\lbrack`)
/// түлхүүр үгсийг арилгаж хаалтыг энгийн тэмдэгт болгоно. Вэбийн KaTeX энд алдаа өгдөг.
String _balanceLeftRight(String s) {
  final left = RegExp(r'\\left(?![A-Za-z])');
  final right = RegExp(r'\\right(?![A-Za-z])');
  final l = left.allMatches(s).length;
  final r = right.allMatches(s).length;
  if (l == r) return s;
  return s.replaceAll(RegExp(r'\\(left|right)\.'), '').replaceAll(left, '').replaceAll(right, '');
}

/// Орчин, хаалтаас гадуурх мөр шилжилт (`a\\b`) flutter_math_fork-д алдаа өгдөг (KaTeX
/// дэмждэг) — бүхэлд нь нэг баганатай `array` болгоно.
String _wrapTopLevelNewlines(String s) {
  if (!s.contains(r'\\') && !s.contains(r'\newline') && !s.contains(r'\cr')) return s;
  var brace = 0;
  var env = 0;
  var found = false;
  for (var i = 0; i < s.length; i++) {
    final ch = s[i];
    if (ch == '{') brace++;
    if (ch == '}') brace--;
    if (ch != r'\') continue;
    if (s.startsWith(r'\begin', i)) env++;
    if (s.startsWith(r'\end', i)) env--;
    final isBreak =
        s.startsWith(r'\\', i) ||
        (s.startsWith(r'\newline', i) && !_letterAt(s, i + 8)) ||
        (s.startsWith(r'\cr', i) && !_letterAt(s, i + 3));
    if (isBreak && brace == 0 && env == 0) {
      found = true;
      break;
    }
    i++; // `\{`, `\\` зэргийн хоёр дахь тэмдэгтийг алгасна
  }
  if (!found) return s;
  final body = s.replaceAll(RegExp(r'\\newline(?![A-Za-z])|\\cr(?![A-Za-z])'), r'\\');
  return '\\begin{array}{c}$body\\end{array}';
}

bool _letterAt(String s, int i) => i < s.length && RegExp('[A-Za-z]').hasMatch(s[i]);
