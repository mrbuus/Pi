import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../domain/geom.dart';
import '../domain/projection.dart';
import '../domain/solids.dart';
import 'figure_painter.dart';

/// Сурах бичгийн хэв маягийн биет: харагдах ирмэг тод, нуугдсан нь тасархай,
/// оройн нэр, хэмжээсийн үсэг. [view] нь ValueNotifier — эргүүлэхэд зөвхөн дахин зурна.
class SolidPainter extends CustomPainter {
  SolidPainter({required this.model, required this.view, required this.palette}) : super(repaint: view);

  final SolidModel model;
  final ValueNotifier<View3> view;
  final FigurePalette palette;

  late double _s;
  late Offset _o;

  Offset _scr(Pt p) => Offset(_o.dx + p.x * _s, _o.dy - p.y * _s);

  @override
  void paint(Canvas canvas, Size size) {
    final v = view.value;
    // Хэмжээ эргэлтээс хамаарахгүй (эргүүлэхэд «үсэрч» томрохгүй): хүрээний диагональаар.
    _s = (math.min(size.width, size.height) - 64) / (model.size * 1.25);
    final c = v.project(model.center);
    _o = Offset(size.width / 2 - c.x * _s, size.height / 2 + c.y * _s);
    if (model.kind.curved) {
      _curved(canvas, v);
    } else {
      _poly(canvas, v);
    }
  }

  Paint _line(bool visible, {Color? color}) => Paint()
    ..color = color ?? (visible ? palette.ink : palette.dim)
    ..strokeWidth = visible ? 2.2 : 1.3
    ..style = PaintingStyle.stroke
    ..strokeCap = StrokeCap.round;

  void _seg(Canvas canvas, Offset a, Offset b, bool visible, {Color? color}) {
    final path = Path()
      ..moveTo(a.dx, a.dy)
      ..lineTo(b.dx, b.dy);
    canvas.drawPath(visible ? path : dashPath(path, 6, 5), _line(visible, color: color));
  }

  void _poly(Canvas canvas, View3 v) {
    final m = model;
    final scr = {for (final e in m.pts.entries) e.key: _scr(v.project(e.value))};
    final vis = faceVisibility(m, v);
    // Харагдах талсыг маш цайвар өнгөөр — биет «хатуу» харагдана.
    for (var i = 0; i < m.faces.length; i++) {
      if (!vis[i]) continue;
      final path = Path()..addPolygon([for (final k in m.faces[i]) scr[k]!], true);
      canvas.drawPath(path, Paint()..color = palette.fill.withValues(alpha: 0.55));
    }
    final edges = edgeVisibility(m, v);
    // Эхлээд нуугдсан, дараа нь харагдах ирмэг (тод нь дээр).
    for (final pass in [false, true]) {
      for (final e in edges.entries) {
        if (e.value != pass) continue;
        _seg(canvas, scr[e.key.$1]!, scr[e.key.$2]!, e.value);
      }
    }
    for (final (a, b) in m.inner) {
      _seg(canvas, scr[a]!, scr[b]!, false, color: palette.brand);
    }
    final center = _scr(v.project(m.center));
    for (final e in scr.entries) {
      if (e.key == 'O' && m.inner.isEmpty) continue;
      final hidden = !_vertexVisible(e.key, vis);
      canvas.drawCircle(e.value, 2.4, Paint()..color = hidden ? palette.dim : palette.ink);
      _label(canvas, e.key, e.value, center, hidden ? palette.dim : palette.ink);
    }
    for (final d in m.dims) {
      final a = scr[d.a]!, b = scr[d.b]!;
      final mid = (a + b) / 2;
      if (d.inner) {
        _text(canvas, d.letter, mid + const Offset(9, 0), palette.brand, 16, italic: true, alignLeft: true);
      } else {
        _edgeLabel(canvas, d.letter, a, b, center);
      }
    }
  }

  bool _vertexVisible(String name, List<bool> faceVis) {
    for (var i = 0; i < model.faces.length; i++) {
      if (faceVis[i] && model.faces[i].contains(name)) return true;
    }
    return model.faces.every((f) => !f.contains(name));
  }

  void _curved(Canvas canvas, View3 v) {
    final m = model;
    switch (m.kind) {
      case SolidKind.cylinder:
        final bottom = circleAt(v, m.r, 0), top = circleAt(v, m.r, m.h);
        final (t1, t2) = frontArc(v);
        _fillBody(canvas, [..._arc(top, t2, t1 + 2 * math.pi), ..._arc(bottom, t1, t2)]);
        _arcPath(canvas, bottom, t1, t2, true);
        _arcPath(canvas, bottom, t2, t1 + 2 * math.pi, false);
        _arcPath(canvas, top, 0, 2 * math.pi, true);
        _seg(canvas, _scr(bottom.at(t1)), _scr(top.at(t1)), true);
        _seg(canvas, _scr(bottom.at(t2)), _scr(top.at(t2)), true);
        final o = _scr(bottom.c), o1 = _scr(top.c);
        _seg(canvas, o, o1, false, color: palette.brand);
        final rp = _scr(bottom.at(-0.25 * math.pi + (t1 + t2) / 2));
        _seg(canvas, o, rp, false, color: palette.brand);
        _dot(canvas, o, false);
        _dot(canvas, o1, true);
        _text(canvas, 'O', o + const Offset(-12, 6), palette.dim, 15, italic: true);
        _text(canvas, 'O', o1 + const Offset(-12, -10), palette.ink, 15, italic: true, sub: '1');
        _text(canvas, 'h', (o + o1) / 2 + const Offset(9, 0), palette.brand, 16, italic: true, alignLeft: true);
        _text(canvas, 'r', (o + rp) / 2 + const Offset(0, -11), palette.brand, 16, italic: true);
      case SolidKind.cone:
        final base = circleAt(v, m.r, 0);
        final apex = _scr(v.project(Vec3(0, m.h, 0)));
        final tg = coneTangents(v, m.r, m.h);
        final o = _scr(base.c);
        if (tg == null) {
          _fillBody(canvas, _arc(base, 0, 2 * math.pi));
          _arcPath(canvas, base, 0, 2 * math.pi, false);
        } else {
          final (t1, t2) = tg;
          _fillBody(canvas, [apex, ..._arc(base, t1, t2)]);
          _arcPath(canvas, base, t1, t2, true);
          _arcPath(canvas, base, t2, t1 + 2 * math.pi, false);
          _seg(canvas, apex, _scr(base.at(t1)), true);
          _seg(canvas, apex, _scr(base.at(t2)), true);
          final pa = _scr(base.at((t1 + t2) / 2 + 0.35));
          _seg(canvas, apex, pa, true, color: palette.brand);
          _seg(canvas, o, pa, false, color: palette.brand);
          _text(canvas, 'l', (apex + pa) / 2 + const Offset(-11, 0), palette.brand, 16, italic: true);
          _text(canvas, 'r', (o + pa) / 2 + const Offset(0, -11), palette.brand, 16, italic: true);
          _dot(canvas, pa, true);
          _text(canvas, 'A', pa + const Offset(0, 14), palette.ink, 15, italic: true);
        }
        _seg(canvas, apex, o, false, color: palette.brand);
        _dot(canvas, apex, true);
        _dot(canvas, o, false);
        _text(canvas, 'S', apex + const Offset(0, -14), palette.ink, 15, italic: true);
        _text(canvas, 'O', o + const Offset(-12, 6), palette.dim, 15, italic: true);
        _text(canvas, 'h', (o + apex) / 2 + const Offset(9, 0), palette.brand, 16, italic: true, alignLeft: true);
      case SolidKind.sphere:
        final o = _scr(v.project(const Vec3(0, 0, 0)));
        final rad = m.r * _s;
        canvas.drawCircle(o, rad, Paint()..color = palette.fill.withValues(alpha: 0.55));
        canvas.drawCircle(o, rad, _line(true));
        final eq = circleAt(v, m.r, 0);
        final (t1, t2) = frontArc(v);
        _arcPath(canvas, eq, t1, t2, true, width: 1.5);
        _arcPath(canvas, eq, t2, t1 + 2 * math.pi, false);
        final rp = _scr(eq.at((t1 + t2) / 2 + 0.6));
        _seg(canvas, o, rp, true, color: palette.brand);
        _dot(canvas, o, true);
        _text(canvas, 'O', o + const Offset(-12, -8), palette.ink, 15, italic: true);
        _text(canvas, 'R', (o + rp) / 2 + const Offset(0, -12), palette.brand, 16, italic: true);
      default:
        break;
    }
  }

  List<Offset> _arc(Ellipse2 e, double a, double b) {
    const steps = 48;
    return [for (var i = 0; i <= steps; i++) _scr(e.at(a + (b - a) * i / steps))];
  }

  void _arcPath(Canvas canvas, Ellipse2 e, double a, double b, bool visible, {double? width}) {
    final pts = _arc(e, a, b);
    final path = Path()..addPolygon(pts, false);
    final paint = _line(visible);
    if (width != null) paint.strokeWidth = width;
    canvas.drawPath(visible ? path : dashPath(path, 6, 5), paint);
  }

  void _fillBody(Canvas canvas, List<Offset> outline) {
    canvas.drawPath(Path()..addPolygon(outline, true), Paint()..color = palette.fill.withValues(alpha: 0.55));
  }

  void _dot(Canvas canvas, Offset p, bool visible) =>
      canvas.drawCircle(p, 2.4, Paint()..color = visible ? palette.ink : palette.dim);

  void _label(Canvas canvas, String name, Offset p, Offset center, Color color) {
    final d = p - center;
    final dir = d.distance < 1e-6 ? const Offset(0, -1) : d / d.distance;
    final parts = name.split('_');
    _text(canvas, parts[0], p + dir * 15, color, 15, italic: true, sub: parts.length > 1 ? parts[1] : null);
  }

  void _edgeLabel(Canvas canvas, String letter, Offset a, Offset b, Offset center) {
    final mid = (a + b) / 2;
    final d = b - a;
    if (d.distance < 1) return;
    var n = Offset(-d.dy, d.dx) / d.distance;
    if ((mid - center).dx * n.dx + (mid - center).dy * n.dy < 0) n = -n;
    _text(canvas, letter, mid + n * 14, palette.brand, 16, italic: true);
  }

  void _text(
    Canvas canvas,
    String text,
    Offset at,
    Color color,
    double size, {
    bool italic = false,
    String? sub,
    bool alignLeft = false,
  }) {
    final style = TextStyle(
      color: color,
      fontSize: size,
      fontWeight: FontWeight.w600,
      fontStyle: italic ? FontStyle.italic : FontStyle.normal,
      fontFamily: 'Onest',
    );
    final tp = TextPainter(
      text: TextSpan(text: text, style: style),
      textDirection: TextDirection.ltr,
    )..layout();
    TextPainter? sp;
    if (sub != null) {
      sp = TextPainter(
        text: TextSpan(
          text: sub,
          style: style.copyWith(fontSize: size * 0.68),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
    }
    final w = tp.width + (sp?.width ?? 0);
    final topLeft = alignLeft ? at - Offset(0, tp.height / 2) : at - Offset(w / 2, tp.height / 2);
    tp.paint(canvas, topLeft);
    sp?.paint(canvas, topLeft + Offset(tp.width, tp.height * 0.45));
  }

  @override
  bool shouldRepaint(SolidPainter old) => old.model != model || old.palette != palette || old.view != view;
}
