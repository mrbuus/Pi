import 'package:flutter/material.dart';

import '../../../../core/math/math.dart';
import '../../../../core/ui/ui.dart';
import '../domain/steps.dart';

/// Тэнцэтгэл бишийн хариу тооны шулуун дээр (сурах бичгийн хэв, вэбийн `NumberLine`):
/// цэгүүд тэнцүү зайтай, дүүрэн — орно, хоосон — орохгүй, шийдийн хэсэг тод
/// хөх зураасаар, интервал бүрийн тэмдэг (+ / -) дээр нь.
class NumberLineView extends StatelessWidget {
  const NumberLineView({super.key, required this.data});
  final NumberLineData data;

  static const double height = 92;
  static const double axisY = 50;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: 'Тооны шулуун дээрх хариу',
      image: true,
      child: SizedBox(
        height: height,
        child: LayoutBuilder(
          builder: (context, box) {
            final w = box.maxWidth;
            final xs = _xs(w);
            return Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned.fill(
                  child: CustomPaint(painter: _NlPainter(data: data, xs: xs, w: w, colors: c)),
                ),
                for (var i = 0; i < data.points.length; i++)
                  Positioned(
                    left: xs[i] - 40,
                    width: 80,
                    top: axisY + 12,
                    child: Center(
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: MathText('\$${data.points[i].label}\$', style: TextStyle(fontSize: 15, color: c.ink)),
                      ),
                    ),
                  ),
                Positioned(
                  right: 0,
                  top: axisY + 10,
                  child: MathText(r'$x$', style: TextStyle(fontSize: 16, color: c.ink)),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  List<double> _xs(double w) {
    final n = data.points.length;
    final l = 24.0, r = w - 24;
    if (n == 1) return [(l + r) / 2];
    return [for (var i = 0; i < n; i++) l + 48 + (r - l - 48 - 40) * i / (n - 1)];
  }
}

class _NlPainter extends CustomPainter {
  _NlPainter({required this.data, required this.xs, required this.w, required this.colors});
  final NumberLineData data;
  final List<double> xs;
  final double w;
  final AppColors colors;

  @override
  void paint(Canvas canvas, Size size) {
    const y = NumberLineView.axisY;
    const l = 8.0;
    final r = w - 14;
    final ink = Paint()
      ..color = colors.ink
      ..strokeWidth = 1.5;
    canvas.drawLine(const Offset(l, y), Offset(r, y), ink);
    canvas.drawPath(
      Path()
        ..moveTo(r + 10, y)
        ..lineTo(r - 2, y - 5)
        ..lineTo(r - 2, y + 5)
        ..close(),
      Paint()..color = colors.ink,
    );
    double at(int? i, bool left) => i == null ? (left ? l + 4 : r - 4) : xs[i];
    final seg = Paint()
      ..color = colors.brand
      ..strokeWidth = 6;
    for (final s in data.segments) {
      canvas.drawLine(Offset(at(s.from, true), y), Offset(at(s.to, false), y), seg);
    }
    // Тэмдэг
    final signs = data.signs ?? const [];
    final sp = Paint()
      ..color = colors.inkDim
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    for (var i = 0; i < signs.length; i++) {
      final a = i == 0 ? l : xs[i - 1], b = i == xs.length ? r : xs[i];
      final m = (a + b) / 2;
      const sy = 20.0, k = 6.0;
      if (signs[i].isEmpty) continue;
      canvas.drawLine(Offset(m - k, sy), Offset(m + k, sy), sp);
      if (signs[i] == '+') canvas.drawLine(Offset(m, sy - k), Offset(m, sy + k), sp);
    }
    // Цэгүүд
    for (var i = 0; i < data.points.length; i++) {
      final c = Offset(xs[i], y);
      final iso = data.isolated?.contains(i) ?? false;
      final filled = data.points[i].filled || iso;
      canvas.drawCircle(c, 6, Paint()..color = filled ? colors.brand : colors.surface);
      canvas.drawCircle(
        c,
        6,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = colors.brand,
      );
    }
  }

  @override
  bool shouldRepaint(_NlPainter old) => old.data != data || old.w != w || old.colors != colors;
}
