import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';
import '../domain/figure.dart';
import '../domain/geom.dart';

/// Зургийн өнгө — ЗӨВХӨН токеноос (RULES §3).
class FigurePalette {
  const FigurePalette({
    required this.ink,
    required this.brand,
    required this.dim,
    required this.accent,
    required this.fill,
    required this.grid,
    required this.bg,
  });

  factory FigurePalette.of(BuildContext context) {
    final c = context.colors;
    return FigurePalette(
      ink: c.ink,
      brand: c.brand,
      dim: c.inkDim,
      accent: c.brandBright,
      fill: c.brandTint,
      grid: c.line,
      bg: c.surface,
    );
  }

  final Color ink, brand, dim, accent, fill, grid, bg;

  Color tone(Tone t) => switch (t) {
    Tone.ink => ink,
    Tone.brand => brand,
    Tone.dim => dim,
    Tone.accent => accent,
  };

  @override
  bool operator ==(Object other) =>
      other is FigurePalette && other.ink == ink && other.brand == brand && other.fill == fill && other.bg == bg;

  @override
  int get hashCode => Object.hash(ink, brand, fill, bg);
}

/// Математик → дэлгэц: (ox + x*s, oy - y*s).
class FigureView {
  const FigureView(this.s, this.ox, this.oy);
  final double s, ox, oy;
  Offset toScreen(Pt p) => Offset(ox + p.x * s, oy - p.y * s);
  Pt toMath(Offset o) => Pt((o.dx - ox) / s, (oy - o.dy) / s);

  /// Анхдагч дүрсийг багтаах харагдац.
  static FigureView fit(List<Prim> prims, Size size, {double pad = 40}) {
    var box = Box.empty;
    for (final p in prims) {
      switch (p) {
        case PolyPrim():
          for (final q in p.pts) {
            box = box.add(q);
          }
        case SegPrim():
          box = box.add(p.a).add(p.b);
        case CirclePrim():
          box = box.add(Pt(p.c.x - p.r, p.c.y - p.r)).add(Pt(p.c.x + p.r, p.c.y + p.r));
        case SectorPrim():
          box = box.add(Pt(p.c.x - p.r, p.c.y - p.r)).add(Pt(p.c.x + p.r, p.c.y + p.r));
        default:
          break;
      }
    }
    final v = fitView(box, size.width, size.height, pad);
    return FigureView(v.s, v.ox, v.oy);
  }
}

/// Хавтгайн зургийг нэг CustomPainter-ээр (Opacity/blur-гүй, хуучин утсанд хөнгөн).
class FigurePainter extends CustomPainter {
  FigurePainter({required this.prims, required this.palette, this.view, this.grid});

  final List<Prim> prims;
  final FigurePalette palette;

  /// null бол дүрсийг багтаана.
  final FigureView? view;

  /// Торын алхам (математик нэгж) — чөлөөт горимд.
  final double? grid;

  @override
  void paint(Canvas canvas, Size size) {
    final v = view ?? FigureView.fit(prims, size);
    if (grid != null) _grid(canvas, size, v, grid!);
    // Дүүргэлт эхэлж, дараа нь шугам, хамгийн сүүлд шошго.
    for (final p in prims) {
      if (p is SectorPrim) _sector(canvas, v, p);
      if (p is PolyPrim && p.fill) {
        final path = Path()..addPolygon([for (final q in p.pts) v.toScreen(q)], true);
        canvas.drawPath(path, Paint()..color = palette.fill);
      }
    }
    for (final p in prims) {
      switch (p) {
        case PolyPrim():
          if (p.width >= 0.1) {
            _stroke(
              canvas,
              Path()..addPolygon([for (final q in p.pts) v.toScreen(q)], true),
              palette.tone(p.tone),
              p.width,
              dash: p.dash,
            );
          }
        case SegPrim():
          _stroke(
            canvas,
            Path()
              ..moveTo(v.toScreen(p.a).dx, v.toScreen(p.a).dy)
              ..lineTo(v.toScreen(p.b).dx, v.toScreen(p.b).dy),
            palette.tone(p.tone),
            p.width,
            dash: p.dash,
          );
        case CirclePrim():
          final c = v.toScreen(p.c);
          final path = Path()..addOval(Rect.fromCircle(center: c, radius: p.r * v.s));
          _stroke(canvas, path, palette.tone(p.tone), p.width, dash: p.dash);
        case TicksPrim():
          _ticks(canvas, v, p);
        case AnglePrim():
          _angle(canvas, v, p);
        default:
          break;
      }
    }
    for (final p in prims) {
      switch (p) {
        case DotPrim():
          canvas.drawCircle(v.toScreen(p.p), p.radius, Paint()..color = palette.tone(p.tone));
          canvas.drawCircle(v.toScreen(p.p), p.radius - 1.6, Paint()..color = palette.bg);
          canvas.drawCircle(v.toScreen(p.p), math.max(0, p.radius - 3), Paint()..color = palette.tone(p.tone));
        case LabelPrim():
          _label(canvas, v, p);
        case SidePrim():
          _side(canvas, v, p);
        default:
          break;
      }
    }
  }

  void _grid(Canvas canvas, Size size, FigureView v, double step) {
    final paint = Paint()
      ..color = palette.grid
      ..strokeWidth = 0.7;
    final axis = Paint()
      ..color = palette.dim.withValues(alpha: 0.5)
      ..strokeWidth = 1;
    final px = step * v.s;
    if (px < 6) return;
    final x0 = ((0 - v.ox) / px).floor(), x1 = ((size.width - v.ox) / px).ceil();
    for (var i = x0; i <= x1; i++) {
      final x = v.ox + i * px;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), i == 0 ? axis : paint);
    }
    final y0 = ((v.oy - size.height) / px).floor(), y1 = (v.oy / px).ceil();
    for (var j = y0; j <= y1; j++) {
      final y = v.oy - j * px;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), j == 0 ? axis : paint);
    }
  }

  void _sector(Canvas canvas, FigureView v, SectorPrim p) {
    final c = v.toScreen(p.c);
    final rect = Rect.fromCircle(center: c, radius: p.r * v.s);
    // Дэлгэцийн y доош тул өнцгийн тэмдэг эсрэг.
    final path = Path()
      ..moveTo(c.dx, c.dy)
      ..arcTo(rect, -p.a0, -(p.a1 - p.a0), false)
      ..close();
    canvas.drawPath(path, Paint()..color = palette.fill);
  }

  void _stroke(Canvas canvas, Path path, Color color, double width, {bool dash = false}) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = width
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(dash ? dashPath(path, 6, 4.5) : path, paint);
  }

  void _ticks(Canvas canvas, FigureView v, TicksPrim p) {
    final a = v.toScreen(p.a), b = v.toScreen(p.b);
    final d = b - a;
    final l = d.distance;
    if (l < 1) return;
    final u = d / l, n = Offset(-u.dy, u.dx);
    final m = (a + b) / 2;
    final paint = Paint()
      ..color = palette.brand
      ..strokeWidth = 1.6;
    for (var i = 0; i < p.n; i++) {
      final o = m + u * ((i - (p.n - 1) / 2) * 4.5);
      canvas.drawLine(o - n * 6, o + n * 6, paint);
    }
  }

  void _angle(Canvas canvas, FigureView v, AnglePrim p) {
    final o = v.toScreen(p.v), a = v.toScreen(p.a), b = v.toScreen(p.b);
    final ua = a - o, ub = b - o;
    if (ua.distance < 1 || ub.distance < 1) return;
    final na = ua / ua.distance, nb = ub / ub.distance;
    final paint = Paint()
      ..color = palette.brand
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    final maxR = math.min(ua.distance, ub.distance) * 0.45;
    if (p.right) {
      final k = math.min(11.0, maxR);
      final path = Path()
        ..moveTo(o.dx + na.dx * k, o.dy + na.dy * k)
        ..lineTo(o.dx + (na.dx + nb.dx) * k, o.dy + (na.dy + nb.dy) * k)
        ..lineTo(o.dx + nb.dx * k, o.dy + nb.dy * k);
      canvas.drawPath(path, paint);
      return;
    }
    final t0 = math.atan2(na.dy, na.dx);
    var sweep = math.atan2(nb.dy, nb.dx) - t0;
    while (sweep > math.pi) {
      sweep -= 2 * math.pi;
    }
    while (sweep < -math.pi) {
      sweep += 2 * math.pi;
    }
    final base = math.min(18.0, maxR);
    for (var i = 0; i < p.arcs; i++) {
      final r = base + i * 4;
      canvas.drawArc(Rect.fromCircle(center: o, radius: r), t0, sweep, false, paint);
    }
    final text = p.letter ?? (p.degrees == null ? null : _deg(p.degrees!));
    if (text == null) return;
    final mid = t0 + sweep / 2;
    final dir = Offset(math.cos(mid), math.sin(mid));
    final r = base + 16 + (sweep.abs() < 0.8 ? 10 : 0);
    _text(canvas, text, o + dir * r, palette.brand, 13, degree: p.letter == null);
  }

  static String _deg(double d) {
    if ((d - d.roundToDouble()).abs() < 1e-6) return '${d.round()}';
    return d.toStringAsFixed(1);
  }

  void _label(Canvas canvas, FigureView v, LabelPrim p) {
    final s = v.toScreen(p.p);
    Offset dir;
    if (p.away != null) {
      final d = s - v.toScreen(p.away!);
      dir = d.distance < 1e-6 ? const Offset(0.7, -0.7) : d / d.distance;
    } else {
      final d = Offset(p.dir?.x ?? 0.7, -(p.dir?.y ?? 0.7));
      dir = d.distance < 1e-6 ? const Offset(0.7, -0.7) : d / d.distance;
    }
    _text(canvas, p.text, s + dir * 15, palette.tone(p.tone), 16, italic: true, sub: p.sub, weight: FontWeight.w600);
  }

  void _side(Canvas canvas, FigureView v, SidePrim p) {
    final a = v.toScreen(p.a), b = v.toScreen(p.b);
    final m = (a + b) / 2;
    final d = b - a;
    if (d.distance < 1) return;
    var n = Offset(-d.dy, d.dx) / d.distance;
    final inside = v.toScreen(p.inside);
    if ((inside - m).dx * n.dx + (inside - m).dy * n.dy > 0) n = -n;
    _text(canvas, p.text, m + n * 13, palette.brand, 13, italic: p.italic, weight: FontWeight.w500);
  }

  /// Бичвэрийг төвөөр нь байрлуулна. [degree] — араас нь жижиг хэмийн тойрог (глифгүй).
  void _text(
    Canvas canvas,
    String text,
    Offset center,
    Color color,
    double size, {
    bool italic = false,
    String? sub,
    bool degree = false,
    FontWeight weight = FontWeight.w500,
  }) {
    final style = TextStyle(
      color: color,
      fontSize: size,
      fontWeight: weight,
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
    final extra = (sp?.width ?? 0) + (degree ? 5 : 0);
    final w = tp.width + extra;
    final topLeft = center - Offset(w / 2, tp.height / 2);
    // Цагаан «гало» биш — дэвсгэр өнгөтэй нимгэн хүрээгээр шугамаас салгана.
    final halo = TextPainter(
      text: TextSpan(
        text: text,
        style: style.copyWith(
          foreground: Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 3
            ..color = palette.bg,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    halo.paint(canvas, topLeft);
    tp.paint(canvas, topLeft);
    if (sp != null) sp.paint(canvas, topLeft + Offset(tp.width, tp.height * 0.45));
    if (degree) {
      canvas.drawCircle(
        topLeft + Offset(tp.width + 3, tp.height * 0.28),
        1.8,
        Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.2,
      );
    }
  }

  @override
  bool shouldRepaint(FigurePainter old) =>
      old.prims != prims || old.palette != palette || old.view != view || old.grid != grid;
}

/// Тасархай зам (PathMetric-ээр).
Path dashPath(Path source, double dash, double gap) {
  final out = Path();
  for (final ui.PathMetric m in source.computeMetrics()) {
    var d = 0.0;
    while (d < m.length) {
      out.addPath(m.extractPath(d, math.min(d + dash, m.length)), Offset.zero);
      d += dash + gap;
    }
  }
  return out;
}
