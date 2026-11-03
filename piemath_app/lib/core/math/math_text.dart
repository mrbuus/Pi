import 'package:flutter/material.dart';
import 'package:flutter_math_fork/ast.dart';
import 'package:flutter_math_fork/flutter_math.dart';

import '../ui/icons.dart';
import '../ui/tokens.dart';
import 'math_parse.dart';
import 'tex_engine.dart';

/// Математик томьёотой бичвэр (вэбийн `MathText`-тэй ижил задлал, RULES §4).
///
/// - `$...$` — мөр доторх томьёо: бичвэртэй хамт мөр шилжинэ (урт томьёо `=`, `+`-ийн
///   дараа хуваагдана), суурь шугамаар (baseline) зэрэгцэнэ.
/// - `$$...$$` — тусдаа мөрийн томьёо: голлоно, дэлгэцээс өргөн бол хэвтээ гүйлгэнэ
///   (хэзээ ч дэлгэцээс халихгүй). Өргөн нь хязгаартай эцэг дотор байх ёстой.
/// - Алдаатай LaTeX: апп унахгүй, эх бичвэрийг алдааны өнгөөр харуулна (вэбийн KaTeX
///   `throwOnError: false`-тэй адил). Багшийн урьдчилан харахад «LaTeX алдаа» тэмдэг.
/// - `**тод**` бичвэр тод болно, хосгүй `**` арилна.
///
/// Гүйцэтгэл: задлалт ([splitMath]) LRU кэштэй, LaTeX мод [TexEngine]-ийн сангаас
/// зээлж, widget устахад буцаана — жагсаалт гүйлгэхэд ижил томьёог дахин задлахгүй.
///
/// Хязгаарлалт: мөр доторх томьёотой бичвэрийг `IntrinsicWidth/IntrinsicHeight` дотор БҮҮ
/// тавь — flutter_math_fork intrinsic/dry baseline-ыг дэмждэггүй (debug assertion).
class MathText extends StatefulWidget {
  const MathText(
    this.source, {
    super.key,
    this.style,
    this.textAlign = TextAlign.start,
    this.displayAlignment = AlignmentDirectional.center,
    this.showErrorInTeacherView = false,
    this.maxLines,
    this.overflow,
  });

  final String source;

  /// Өгөөгүй бол `DefaultTextStyle` (theme-ийн bodyLarge г.м.)-аас удамшина.
  final TextStyle? style;
  final TextAlign textAlign;

  /// `$$...$$` томьёоны байрлал (вэб: MathText — голд, томьёоны сан — зүүн).
  final AlignmentGeometry displayAlignment;

  /// Багшийн урьдчилан харах горимд LaTeX алдааг тэмдэглэх. Сурагчид техникийн алдаа харуулахгүй.
  final bool showErrorInTeacherView;

  /// Зөвхөн мөр доторх бичвэрт (display томьёогүй үед) — жагсаалтын товч харагдац.
  final int? maxLines;
  final TextOverflow? overflow;

  /// KaTeX-ийн анхдагч `.katex { font-size: 1.21em }` — вэбтэй ижил харьцаа.
  static const katexScale = 1.21;

  static const _segmentCacheMax = 300;
  static final _segmentCache = <String, List<MathSegment>>{};

  /// Кэштэй задлалт.
  static List<MathSegment> segmentsOf(String source) {
    final hit = _segmentCache.remove(source);
    if (hit != null) {
      _segmentCache[source] = hit;
      return hit;
    }
    final segs = List<MathSegment>.unmodifiable(splitMath(source));
    if (_segmentCache.length >= _segmentCacheMax) _segmentCache.remove(_segmentCache.keys.first);
    _segmentCache[source] = segs;
    return segs;
  }

  /// Дэлгэц уншигчид: томьёог ойролцоо уншигдах хэлбэрээр.
  static String semanticsOf(List<MathSegment> segs) => segs
      .map((s) => s.isMath ? ' ${speakableTex(s.value)} ' : s.value.replaceAll('**', ''))
      .join()
      .replaceAll(RegExp(r'[ \t]+'), ' ')
      .trim();

  @override
  State<MathText> createState() => _MathTextState();
}

class _MathTextState extends State<MathText> {
  late List<MathSegment> _segs;

  /// Сегментийн индекс → зээлсэн мод (зөвхөн томьёо сегментэд).
  final _trees = <int, TexResult>{};

  @override
  void initState() {
    super.initState();
    _acquire();
  }

  @override
  void didUpdateWidget(MathText old) {
    super.didUpdateWidget(old);
    if (old.source != widget.source) {
      _release();
      _acquire();
    }
  }

  @override
  void dispose() {
    _release();
    super.dispose();
  }

  void _acquire() {
    _segs = MathText.segmentsOf(widget.source);
    for (var i = 0; i < _segs.length; i++) {
      if (_segs[i].isMath) _trees[i] = TexEngine.acquire(_segs[i].value);
    }
  }

  void _release() {
    _trees.values.forEach(TexEngine.release);
    _trees.clear();
  }

  @override
  Widget build(BuildContext context) {
    final segs = _segs;
    if (segs.isEmpty) return const SizedBox.shrink();
    final base = DefaultTextStyle.of(context).style.merge(widget.style);
    final hasDisplay = segs.any((s) => s.type == MathSegmentType.display);

    final blocks = <Widget>[];
    var spans = <InlineSpan>[];
    var spanSegs = <MathSegment>[];

    void flush() {
      if (spans.isEmpty) return;
      blocks.add(
        Text.rich(
          TextSpan(children: spans),
          style: base,
          textAlign: widget.textAlign,
          maxLines: hasDisplay ? null : widget.maxLines,
          overflow: hasDisplay ? null : widget.overflow,
          semanticsLabel: MathText.semanticsOf(spanSegs),
        ),
      );
      spans = <InlineSpan>[];
      spanSegs = <MathSegment>[];
    }

    // Томьёонд наалдсан үг (`$x$-ийн`, `($a$`) томьёогоосоо мөрийн төгсгөлд тасрахгүйн тулд
    // тэр үгийг томьёотой НЭГ WidgetSpan-д хийнэ (SkParagraph placeholder-ийн хажууд
    // WORD JOINER-ийг үл тоомсорлодог). Эхлээд бичвэрээс тасдаж авна.
    final texts = [for (final s in segs) s.type == MathSegmentType.text ? s.value : ''];
    final prefix = <int, String>{};
    final suffix = <int, String>{};
    for (var i = 0; i < segs.length; i++) {
      if (segs[i].type != MathSegmentType.inline || !(_trees[i]?.ok ?? false)) continue;
      if (i > 0 && segs[i - 1].type == MathSegmentType.text) {
        final m = _gluedTail.firstMatch(texts[i - 1]);
        if (m != null) {
          prefix[i] = m.group(1)!.replaceAll('**', '');
          texts[i - 1] = texts[i - 1].substring(0, m.start + m.group(0)!.length - m.group(1)!.length);
        }
      }
      if (i + 1 < segs.length && segs[i + 1].type == MathSegmentType.text) {
        final m = _gluedHead.firstMatch(texts[i + 1]);
        if (m != null) {
          suffix[i] = m.group(1)!.replaceAll('**', '');
          texts[i + 1] = texts[i + 1].substring(m.group(1)!.length);
        }
      }
    }

    for (var i = 0; i < segs.length; i++) {
      final seg = segs[i];
      final prev = i > 0 ? segs[i - 1] : null;
      final next = i + 1 < segs.length ? segs[i + 1] : null;
      switch (seg.type) {
        case MathSegmentType.text:
          var text = texts[i];
          // Display томьёоны өмнө/дараах ганц мөр шилжилт давхар зай үүсгэхгүй.
          if (next?.type == MathSegmentType.display && text.endsWith('\n')) {
            text = text.substring(0, text.length - 1);
          }
          if (prev?.type == MathSegmentType.display && text.startsWith('\n')) text = text.substring(1);
          if (text.isEmpty) continue;
          spanSegs.add(MathSegment.text(text));
          for (final run in splitBold(text)) {
            spans.add(
              TextSpan(
                text: run.text,
                style: run.bold ? const TextStyle(fontWeight: FontWeight.w700) : null,
              ),
            );
          }
        case MathSegmentType.inline:
          spanSegs
            ..add(MathSegment.text(prefix[i] ?? ''))
            ..add(seg)
            ..add(MathSegment.text(suffix[i] ?? ''));
          _addInline(spans, _trees[i]!, base, prefix: prefix[i], suffix: suffix[i]);
        case MathSegmentType.display:
          flush();
          blocks.add(_display(_trees[i]!, base));
      }
    }
    flush();

    final Widget child = blocks.length == 1
        ? blocks.first
        : Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: blocks);
    return RepaintBoundary(child: child);
  }

  TextStyle _mathStyle(TextStyle base) => base.copyWith(fontSize: (base.fontSize ?? 16) * MathText.katexScale);

  void _addInline(List<InlineSpan> spans, TexResult result, TextStyle base, {String? prefix, String? suffix}) {
    if (!result.ok) {
      if (prefix != null) spans.add(TextSpan(text: prefix));
      spans.addAll(_errorSpans(result.source, base));
      if (suffix != null) spans.add(TextSpan(text: suffix));
      return;
    }
    final mathStyle = _mathStyle(base);
    final parts = result.breakParts;
    for (var p = 0; p < parts.length; p++) {
      // Хэсгүүд тусдаа зурагддаг тул `=`-ийн дараах TeX-ийн зай алга болдог —
      // энгийн зай нөхөж, мөр шилжих боломжийг ч үүсгэнэ.
      if (p > 0) spans.add(const TextSpan(text: ' '));
      final before = p == 0 ? prefix : null;
      final after = p == parts.length - 1 ? suffix : null;
      Widget child = _MathView(ast: parts[p], source: result.source, style: mathStyle, mathStyle: MathStyle.text);
      if (before != null || after != null) {
        child = Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            if (before != null) Text(before, style: base),
            child,
            if (after != null) Text(after, style: base),
          ],
        );
      }
      spans.add(WidgetSpan(alignment: PlaceholderAlignment.baseline, baseline: TextBaseline.alphabetic, child: child));
    }
  }

  Widget _display(TexResult result, TextStyle base) {
    if (!result.ok) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
        child: Text.rich(TextSpan(children: _errorSpans(result.source, base)), style: base),
      );
    }
    return Semantics(
      label: speakableTex(result.source),
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
          child: Align(
            alignment: widget.displayAlignment,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: _MathView(
                ast: result.ast!,
                source: result.source,
                style: _mathStyle(base),
                mathStyle: MathStyle.display,
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<InlineSpan> _errorSpans(String tex, TextStyle base) {
    final c = context.colors;
    return [
      if (widget.showErrorInTeacherView)
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: _LatexErrorBadge(color: c.warning, style: base),
        ),
      TextSpan(
        text: tex,
        style: TextStyle(color: c.error),
      ),
    ];
  }

  /// Бичвэрийн төгсгөлийн, томьёонд наалдсан богино үг (12 тэмдэгт хүртэл).
  static final _gluedTail = RegExp(r'(?:^|\s)(\S{1,12})$');

  /// Бичвэрийн эхний, томьёонд наалдсан богино үг (12 тэмдэгт хүртэл).
  static final _gluedHead = RegExp(r'^(\S{1,12})(?=\s|$)');
}

/// Нэг томьёоны зураг. Build алдаа гарвал (ховор) эх бичвэрийг харуулна.
class _MathView extends StatelessWidget {
  const _MathView({required this.ast, required this.source, required this.style, required this.mathStyle});

  final SyntaxTree ast;
  final String source;
  final TextStyle style;
  final MathStyle mathStyle;

  @override
  Widget build(BuildContext context) {
    return Math(
      ast: ast,
      mathStyle: mathStyle,
      textStyle: style,
      onErrorFallback: (_) => Text(source, style: style.copyWith(color: context.colors.error)),
    );
  }
}

class _LatexErrorBadge extends StatelessWidget {
  const _LatexErrorBadge({required this.color, required this.style});

  final Color color;
  final TextStyle style;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsetsDirectional.only(end: AppSpace.xs),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        border: Border.all(color: color),
        borderRadius: BorderRadius.circular(AppRadius.sm / 2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(AppIcons.warning, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            'LaTeX алдаа',
            style: style.copyWith(fontSize: 12, color: color, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }
}
