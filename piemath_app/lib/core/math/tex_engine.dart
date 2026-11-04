import 'package:flutter_math_fork/ast.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:flutter_math_fork/tex.dart';

import 'tex_normalize.dart';

/// Нэг LaTeX мөрийг задалсан үр дүн (кэшлэгдэнэ).
class TexResult {
  TexResult._(this.source, this.ast, this.error);

  /// Эх LaTeX (нормчлолоос өмнөх).
  final String source;

  /// Амжилттай бол синтакс мод.
  final SyntaxTree? ast;

  /// Алдаа гарвал (вэбийн KaTeX `throwOnError: false`-тэй адил: апп унахгүй, эхийг харуулна).
  final FlutterMathException? error;

  bool get ok => ast != null;

  List<SyntaxTree>? _parts;

  /// Мөр доторх урт томьёог TeX-ийн дүрмээр (`=`, `<` гэх мэт харьцааны дараа) хуваасан хэсгүүд —
  /// нарийн дэлгэцэнд мөр шилжиж чадна. Нэг удаа тооцоод кэшлэнэ.
  List<SyntaxTree> get breakParts {
    final tree = ast;
    if (tree == null) return const [];
    return _parts ??= () {
      try {
        final parts = _relationBreak(tree.greenRoot);
        return parts.length <= 1 ? [tree] : parts;
      } on Object {
        return [tree];
      }
    }();
  }

  /// Үүнээс олон элементтэй хэсгийг `+`, `-`-ийн дараа ч хуваана (нарийн дэлгэцээс халихгүй).
  static const longPartAtoms = 12;

  /// flutter_math_fork-ийн `texBreak`-тэй ижил дүрэм, гэхдээ эхлээд ЗӨВХӨН харьцааны (=, <, >)
  /// дараа: `+`, `-`-ийн дараа хуваавал төгсгөлийн үйлдэл TeX-ийн зайгаа алддаг («2x- 1»).
  /// Харьцаагүй урт хэсгийг ([longPartAtoms]-аас олон) л үйлдлийн дараа нэмж хуваана.
  static List<SyntaxTree> _relationBreak(EquationRowNode row) {
    final children = row.flattenedChildList;
    final caret = row.caretPositions;
    bool breakable(int i) {
      if (i >= children.length - 1) return false;
      final next = children[i + 1];
      // `\nobreak` (10000 ба түүнээс их) — тасалж болохгүй.
      return !(next is SpaceNode && (next.breakPenalty ?? 0) >= 10000);
    }

    final rel = <int>[
      for (var i = 0; i < children.length; i++)
        if (breakable(i) && children[i].rightType == AtomType.rel) i,
    ];
    final breaks = <int>[];
    var start = 0;
    for (final r in [...rel, children.length - 1]) {
      if (r - start + 1 > longPartAtoms) {
        for (var i = start; i < r; i++) {
          if (breakable(i) && children[i].rightType == AtomType.bin) breaks.add(i);
        }
      }
      if (r < children.length - 1) breaks.add(r);
      start = r + 1;
    }
    breaks.sort();

    final out = <SyntaxTree>[];
    var pos = 1;
    for (final i in breaks) {
      final end = caret[i + 1];
      out.add(SyntaxTree(greenRoot: row.clipChildrenBetween(pos, end).wrapWithEquationRow()));
      pos = end;
    }
    if (pos != caret.last) {
      out.add(SyntaxTree(greenRoot: row.clipChildrenBetween(pos, caret.last).wrapWithEquationRow()));
    }
    return out;
  }
}

/// LaTeX задлагч + дахин ашиглах сан (PERFORMANCE.md: ижил томьёог дахин задлахгүй).
///
/// АНХААР: flutter_math_fork-ийн синтакс мод (`EquationRowNode`) дотроо `GlobalKey` агуулдаг
/// тул НЭГ модыг дэлгэцийн хоёр газар ЗЭРЭГ харуулж болохгүй (layout эвдэрнэ). Иймд энгийн
/// кэш биш, «зээлэх/буцаах» сан: widget [acquire]-аар авч, устахдаа [release]-ээр буцаана.
/// Жагсаалт гүйлгэхэд дэлгэцээс гарсан мөрийн мод шинээр орж ирэх мөрөнд дахин ашиглагдана.
///
/// Вэбийн KaTeX тохиргоотой дүйцүүлсэн: `maxExpand: 1000` (макро бөмбөгөөс хамгаална),
/// `strict` = анхааруулгагүй зөвшөөрнө (вэб `warn` — консолд л бичдэг).
/// `\href`, `\url`, `\includegraphics`, `\html*` зэрэг trust шаардах командыг
/// flutter_math_fork огт дэмждэггүй тул апп-д аюулгүй.
abstract final class TexEngine {
  static const settings = TexParserSettings(strict: Strict.ignore, maxExpand: 1000);

  /// Сан дахь томьёоны (түлхүүрийн) дээд тоо (вэбийн `RENDER_CACHE_MAX`-тай ижил).
  static const maxEntries = 500;

  /// Нэг томьёоны хадгалах сул хуулбарын дээд тоо.
  static const maxCopies = 4;

  /// tex → чөлөөтэй (дэлгэцэд байхгүй) хуулбарууд. Map-ийн дараалал = LRU.
  static final _free = <String, List<TexResult>>{};

  /// Алдаатай томьёо (мод байхгүй, GlobalKey-гүй) — хуваалцаж болно.
  static final _errors = <String, TexResult>{};

  /// Модыг зээлэх: сул хуулбар байвал түүнийг, үгүй бол шинээр задална.
  static TexResult acquire(String tex) {
    final err = _errors[tex];
    if (err != null) return err;
    final list = _free.remove(tex);
    if (list != null && list.isNotEmpty) {
      final r = list.removeLast();
      if (list.isNotEmpty) _free[tex] = list; // LRU: төгсгөлд
      return r;
    }
    final r = parseUncached(tex);
    if (!r.ok) {
      if (_errors.length >= maxEntries) _errors.remove(_errors.keys.first);
      _errors[tex] = r;
    }
    return r;
  }

  /// Модыг буцаах (widget устах, эх бичвэр өөрчлөгдөх үед).
  static void release(TexResult r) {
    if (!r.ok) return;
    final list = _free.remove(r.source) ?? <TexResult>[];
    if (list.length < maxCopies && !list.any((x) => identical(x, r))) list.add(r);
    _free[r.source] = list;
    while (_free.length > maxEntries) {
      _free.remove(_free.keys.first);
    }
  }

  /// Кэшгүй задлалт. [normalize] = false нь зөвхөн аудитад (нормчлолоос өмнөх тоо).
  static TexResult parseUncached(String tex, {bool normalize = true}) {
    final input = normalize ? normalizeTex(tex) : tex;
    try {
      final tree = SyntaxTree(greenRoot: TexParser(input, settings).parse());
      return TexResult._(tex, tree, null);
    } on FlutterMathException catch (e) {
      return TexResult._(tex, null, e);
    } on Object catch (e) {
      return TexResult._(tex, null, ParseException('Тодорхойгүй алдаа: $e'));
    }
  }

  /// Тест/аудитад санг цэвэрлэх.
  static void clearCache() {
    _free.clear();
    _errors.clear();
  }

  /// Сан дахь сул хуулбарын нийт тоо.
  static int get pooledCount => _free.values.fold(0, (a, b) => a + b.length);

  /// Сан дахь томьёоны (түлхүүрийн) тоо.
  static int get pooledKeys => _free.length;
}
