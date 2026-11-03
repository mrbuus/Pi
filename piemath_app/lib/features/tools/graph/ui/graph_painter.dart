import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../../../core/ui/ui.dart';
import '../../../../shared/math_keyboard/expr.dart';
import '../domain/graph_math.dart';
import '../domain/labels.dart';

/// Зурах нэг мөр (функц, далд муруй, муж, цэг).
class PlotLine {
  const PlotLine({required this.idx, required this.item, required this.color, required this.scope});
  final int idx;
  final GraphItem item;
  final Color color;
  final Scope scope;
}

/// Зургийн тохиргоо — хөдөлгөөний үед (харагдац солигдоход) widget мод дахин бүтээгдэхгүй:
/// painter нь [view]-г сонсож зөвхөн дахин зурна.
class GraphScene {
  const GraphScene({
    required this.lines,
    required this.grid,
    required this.piAxis,
    required this.degrees,
    required this.specials,
    required this.showSpecials,
    this.focus,
    this.trace,
    this.lowRes = false,
    this.tangent,
    this.area,
  });

  final List<PlotLine> lines;
  final bool grid;
  final bool piAxis;
  final bool degrees;
  final List<Special> specials;
  final bool showSpecials;

  /// Тодруулсан онцгой цэг ([specials]-ийн индекс).
  final int? focus;

  /// Муруй дээр хүрсэн цэг: (мөрийн idx, x).
  final (int, double)? trace;

  /// Чирж, томруулж байх үед далд муруйг бүдүүн тороор (сул утсанд гөлгөр).
  final bool lowRes;

  /// Шүргэгч y = kx + b, шүргэх цэг (x0, y0); [idx] — функцийн мөр.
  final ({int idx, double x0, double y0, double k, double b})? tangent;

  /// Интегралын талбай [a, b] (утга төгсгөлөг үед л дамжуулна).
  final ({int idx, double a, double b})? area;
}

/// Цэгийн шошгоны LaTeX-гүй канвас бичвэр (KaTeX фонтоор): «(2; -1)».
String pointLabel(double x, double y) => '(${shortNum(x)}; ${shortNum(y)})';

class GraphPainter extends CustomPainter {
  GraphPainter({required this.view, required this.scene, required this.colors}) : super(repaint: view);

  final ValueNotifier<GView> view;
  final GraphScene scene;
  final AppColors colors;

  static const _katexMain = 'KaTeX_Main';
  static const _katexMath = 'KaTeX_Math';
  static const _pkg = 'flutter_math_fork';

  TextPainter _tp(String s, {double size = 12, Color? color, bool italic = false, Color? halo}) {
    final paint = halo == null
        ? null
        : (Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 3
            ..color = halo);
    final style = TextStyle(
      fontFamily: italic ? _katexMath : _katexMain,
      package: _pkg,
      fontSize: size,
      fontStyle: italic ? FontStyle.italic : FontStyle.normal,
      color: paint == null ? (color ?? colors.inkDim) : null,
      foreground: paint,
    );
    return TextPainter(text: TextSpan(text: s, style: style), textDirection: TextDirection.ltr)..layout();
  }

  void _text(Canvas canvas, String s, Offset at, {double size = 12, Color? color, bool italic = false}) {
    _tp(s, size: size, italic: italic, halo: colors.surface).paint(canvas, at);
    _tp(s, size: size, color: color, italic: italic).paint(canvas, at);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final v = view.value;
    if (v.w <= 0 || v.h <= 0) return;
    canvas.clipRect(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, Paint()..color = colors.surface);

    final xStep = scene.piAxis
        ? piStep(v.sx)
        : (scene.degrees ? degStep(v.sx) : niceStep(v.sx));
    final yStep = niceStep(v.sy);
    final xs = tickValues(v.xMin, v.xMax, xStep);
    final ys = tickValues(v.yMin, v.yMax, yStep);

    // Тор
    if (scene.grid) {
      final minor = Paint()
        ..color = colors.line.withValues(alpha: 0.45)
        ..strokeWidth = 1;
      final major = Paint()
        ..color = colors.line
        ..strokeWidth = 1;
      final sub = scene.piAxis ? 1 : 5;
      for (final x in tickValues(v.xMin, v.xMax, xStep / sub)) {
        final px = v.pxOf(x).roundToDouble() + 0.5;
        canvas.drawLine(Offset(px, 0), Offset(px, v.h), minor);
      }
      for (final y in tickValues(v.yMin, v.yMax, yStep / 5)) {
        final py = v.pyOf(y).roundToDouble() + 0.5;
        canvas.drawLine(Offset(0, py), Offset(v.w, py), minor);
      }
      for (final x in xs) {
        final px = v.pxOf(x).roundToDouble() + 0.5;
        canvas.drawLine(Offset(px, 0), Offset(px, v.h), major);
      }
      for (final y in ys) {
        final py = v.pyOf(y).roundToDouble() + 0.5;
        canvas.drawLine(Offset(0, py), Offset(v.w, py), major);
      }
    }

    // Тэнхлэг
    final ox = v.pxOf(0), oy = v.pyOf(0);
    final axis = Paint()
      ..color = colors.ink.withValues(alpha: 0.75)
      ..strokeWidth = 1.4;
    final axY = clampD(oy, 0, v.h), axX = clampD(ox, 0, v.w);
    canvas.drawLine(Offset(0, axY), Offset(v.w, axY), axis);
    canvas.drawLine(Offset(axX, 0), Offset(axX, v.h), axis);
    // Сум
    final arrow = Path()
      ..moveTo(v.w, axY)
      ..lineTo(v.w - 9, axY - 4)
      ..lineTo(v.w - 9, axY + 4)
      ..close()
      ..moveTo(axX, 0)
      ..lineTo(axX - 4, 9)
      ..lineTo(axX + 4, 9)
      ..close();
    canvas.drawPath(arrow, Paint()..color = colors.ink.withValues(alpha: 0.75));

    // Тэнхлэгийн шошго (KaTeX фонт — LaTeX-тэй ижил хэв)
    final labelY = clampD(oy + 4, 2, v.h - 18);
    final blocked = <LBox>[];
    for (final x in xs) {
      if (x.abs() < xStep * 1e-6) continue;
      final px = v.pxOf(x);
      if (px < 12 || px > v.w - 24) continue; // захад давхцах шошгогүй
      final tp = _xLabel(x, xStep);
      final at = Offset(px - tp.width / 2, labelY);
      _paintLabel(canvas, tp, at);
      if (scene.degrees && !scene.piAxis) {
        canvas.drawCircle(
          Offset(at.dx + tp.width + 2.5, at.dy + 3),
          1.8,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1
            ..color = colors.inkDim,
        );
      }
      blocked.add(LBox(at.dx, at.dy, tp.width + 4, tp.height));
    }
    for (final y in ys) {
      if (y.abs() < yStep * 1e-6) continue;
      final py = v.pyOf(y);
      if (py < 14 || py > v.h - 14) continue;
      final tp = _tp(numLabel(y, yStep), size: 12);
      final lx = ox + 5 + tp.width > v.w - 2 ? ox - 5 - tp.width : ox + 5;
      final at = Offset(clampD(lx, 2, v.w - tp.width - 2), py - tp.height / 2);
      _paintLabel(canvas, tp, at);
      blocked.add(LBox(at.dx, at.dy, tp.width, tp.height));
    }
    if (ox >= 0 && ox <= v.w && oy >= 0 && oy <= v.h) _text(canvas, 'O', Offset(ox - 13, oy + 2), size: 13, italic: true);
    _text(canvas, 'x', Offset(v.w - 14, clampD(oy, 14, v.h - 22) - 18), size: 15, color: colors.ink, italic: true);
    _text(canvas, 'y', Offset(clampD(ox, 16, v.w - 14) + 8, 2), size: 15, color: colors.ink, italic: true);

    // Муруйнууд
    for (final ln in scene.lines) {
      _drawLine(canvas, v, ln);
    }

    _paintArea(canvas, v);
    _paintTangent(canvas, v);

    // Онцгой цэгүүд
    if (scene.showSpecials) {
      final fill = Paint()..color = colors.surface;
      for (var i = 0; i < scene.specials.length; i++) {
        final s = scene.specials[i];
        final color = _colorOf(s.line);
        final c = Offset(v.pxOf(s.x), v.pyOf(s.y));
        if (c.dx < -8 || c.dx > v.w + 8 || c.dy < -8 || c.dy > v.h + 8) continue;
        final focused = scene.focus == i;
        canvas.drawCircle(c, focused ? 6.5 : 4, fill);
        canvas.drawCircle(
          c,
          focused ? 6.5 : 4,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = focused ? 2.5 : 1.8
            ..color = color,
        );
        if (focused) canvas.drawCircle(c, 3, Paint()..color = color);
      }
      final f = scene.focus;
      if (f != null && f < scene.specials.length) {
        final s = scene.specials[f];
        _pointLabel(canvas, v, s.x, s.y, blocked);
      }
    }

    // Муруй дээр хүрсэн цэг
    final tr = scene.trace;
    if (tr != null) {
      for (final ln in scene.lines) {
        if (ln.idx != tr.$1 || ln.item.kind != ItemKind.fn) continue;
        ln.scope['x'] = tr.$2;
        final y = ln.item.f!(ln.scope);
        if (!y.isFinite) break;
        final c = Offset(v.pxOf(tr.$2), v.pyOf(y));
        final guide = Paint()
          ..color = ln.color.withValues(alpha: 0.5)
          ..strokeWidth = 1;
        _dashed(canvas, Offset(c.dx, v.pyOf(0)), c, guide);
        _dashed(canvas, Offset(v.pxOf(0), c.dy), c, guide);
        canvas.drawCircle(c, 6, Paint()..color = colors.surface);
        canvas.drawCircle(c, 5, Paint()..color = ln.color);
        _pointLabel(canvas, v, tr.$2, y, blocked);
      }
    }
  }

  Color _colorOf(int idx) {
    for (final l in scene.lines) {
      if (l.idx == idx) return l.color;
    }
    return colors.brand;
  }

  TextPainter _xLabel(double x, double step) {
    if (!scene.piAxis) return _tp(numLabel(x, step), size: 12);
    final (sign, top, den) = piLabelParts(x);
    final base = TextStyle(fontFamily: _katexMain, package: _pkg, fontSize: 12, color: colors.inkDim);
    final pi = base.copyWith(fontFamily: _katexMath, fontStyle: FontStyle.italic);
    return TextPainter(
      text: TextSpan(
        style: base,
        children: [
          TextSpan(text: '$sign$top'),
          if (top != '0') TextSpan(text: '\u03C0', style: pi),
          if (den != null) TextSpan(text: '/$den'),
        ],
      ),
      textDirection: TextDirection.ltr,
    )..layout();
  }

  void _paintLabel(Canvas canvas, TextPainter tp, Offset at) {
    // Тор, муруйн дээр уншигдахуйц: гадаргуугийн өнгөөр доор нь дэвсгэр
    canvas.drawRect(
      Rect.fromLTWH(at.dx - 1, at.dy + 1, tp.width + 2, tp.height - 2),
      Paint()..color = colors.surface.withValues(alpha: 0.85),
    );
    tp.paint(canvas, at);
  }

  void _pointLabel(Canvas canvas, GView v, double x, double y, List<LBox> blocked) {
    final s = pointLabel(x, y);
    final tp = _tp(s, size: 13, color: colors.ink);
    final px = v.pxOf(x), py = v.pyOf(y);
    final placed = placeLabels([LabelReq(px, py, tp.width, tp.height)], v.w, v.h, blocked: blocked).single;
    final at = placed != null ? Offset(placed.x, placed.y) : Offset(clampD(px + 8, 2, v.w - tp.width - 2), clampD(py - 22, 2, v.h - 18));
    final r = RRect.fromRectAndRadius(Rect.fromLTWH(at.dx - 4, at.dy - 2, tp.width + 8, tp.height + 4), const Radius.circular(4));
    canvas.drawRRect(r, Paint()..color = colors.surface);
    canvas.drawRRect(
      r,
      Paint()
        ..style = PaintingStyle.stroke
        ..color = colors.line,
    );
    tp.paint(canvas, at);
  }

  PlotLine? _lineOf(int idx) {
    for (final ln in scene.lines) {
      if (ln.idx == idx && ln.item.kind == ItemKind.fn) return ln;
    }
    return null;
  }

  void _paintArea(Canvas canvas, GView v) {
    final a = scene.area;
    if (a == null) return;
    final ln = _lineOf(a.idx);
    if (ln == null) return;
    final pts = areaPolygon(ln.item.f!, ln.scope, v, a.a, a.b);
    final path = Path()..moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) {
      path.lineTo(pts[i], pts[i + 1]);
    }
    path.close();
    canvas.drawPath(path, Paint()..color = ln.color.withValues(alpha: 0.18));
  }

  void _paintTangent(Canvas canvas, GView v) {
    final t = scene.tangent;
    if (t == null) return;
    double py(double x) => clampD(v.pyOf(t.k * x + t.b), -1e5, 1e5);
    final p = Paint()
      ..color = colors.ink
      ..strokeWidth = 1.6;
    _dashed(canvas, Offset(0, py(v.xMin)), Offset(v.w, py(v.xMax)), p);
    final c = Offset(v.pxOf(t.x0), v.pyOf(t.y0));
    canvas.drawCircle(c, 6.5, Paint()..color = colors.surface);
    canvas.drawCircle(c, 5, Paint()..color = colors.ink);
  }

  void _dashed(Canvas canvas, Offset a, Offset b, Paint p) {
    final d = (b - a).distance;
    if (d < 1) return;
    final dir = (b - a) / d;
    for (var t = 0.0; t < d; t += 8) {
      canvas.drawLine(a + dir * t, a + dir * math.min(t + 4, d), p);
    }
  }

  void _drawLine(Canvas canvas, GView v, PlotLine ln) {
    final item = ln.item;
    final stroke = Paint()
      ..color = ln.color
      ..strokeWidth = 2.4
      ..style = PaintingStyle.stroke
      ..strokeJoin = StrokeJoin.round
      ..strokeCap = StrokeCap.round
      ..isAntiAlias = true;
    switch (item.kind) {
      case ItemKind.fn:
        final path = Path();
        for (final pl in fnPolylines(item.f!, ln.scope, v, basePx: scene.lowRes ? 3 : 2)) {
          path.moveTo(pl[0], pl[1]);
          for (var i = 2; i < pl.length; i += 2) {
            path.lineTo(pl[i], pl[i + 1]);
          }
        }
        canvas.drawPath(path, stroke);
      case ItemKind.vline:
        final x = item.f!(ln.scope);
        if (!x.isFinite) return;
        final px = v.pxOf(x);
        canvas.drawLine(Offset(px, 0), Offset(px, v.h), stroke);
      case ItemKind.implicit:
        final g = sampleGrid(item.f!, ln.scope, v, maxCells: scene.lowRes ? 9000 : 40000);
        final segs = contourSegments(g);
        if (segs.isEmpty) return;
        canvas.drawRawPoints(ui.PointMode.lines, Float32List.fromList(segs), stroke..strokeCap = StrokeCap.round);
      case ItemKind.ineq:
        final g = sampleGrid(item.f!, ln.scope, v, maxCells: scene.lowRes ? 6000 : 25000);
        final rects = regionRects(g, item.op!);
        final region = Path();
        for (var i = 0; i < rects.length; i += 4) {
          region.addRect(Rect.fromLTWH(rects[i], rects[i + 1], rects[i + 2] + 0.5, rects[i + 3] + 0.5));
        }
        canvas.drawPath(region, Paint()..color = ln.color.withValues(alpha: 0.16));
        final segs = contourSegments(g);
        if (segs.isEmpty) return;
        final strict = item.op == RelOp.lt || item.op == RelOp.gt;
        // Хатуу тэнцэтгэл бишийн хил тасархай (сурах бичгийн дүрэм): цэгэн хэрчмээр
        if (strict) {
          final p = Paint()
            ..color = ln.color
            ..strokeWidth = 2
            ..strokeCap = StrokeCap.round;
          for (var i = 0; i < segs.length; i += 4) {
            if ((i ~/ 4).isOdd) continue;
            canvas.drawLine(Offset(segs[i], segs[i + 1]), Offset(segs[i + 2], segs[i + 3]), p);
          }
        } else {
          canvas.drawRawPoints(ui.PointMode.lines, Float32List.fromList(segs), stroke);
        }
      case ItemKind.point:
        final x = item.f!(ln.scope), y = item.py!(ln.scope);
        if (!x.isFinite || !y.isFinite) return;
        final c = Offset(v.pxOf(x), v.pyOf(y));
        canvas.drawCircle(c, 5, Paint()..color = ln.color);
        final tp = _tp(pointLabel(x, y), size: 12, color: colors.ink);
        tp.paint(canvas, c + const Offset(8, -20));
      case ItemKind.empty || ItemKind.error:
        return;
    }
  }

  @override
  bool shouldRepaint(GraphPainter old) => old.scene != scene || old.colors != colors || old.view != view;
}
