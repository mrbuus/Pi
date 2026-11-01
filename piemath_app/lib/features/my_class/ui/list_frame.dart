import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';

/// Урт жагсаалтыг (ListView.builder / SliverList) нэг карт мэт харуулах мөрийн хүрээ:
/// эхний мөр дээд булантай, сүүлийнх доод булантай, хооронд нь хуваагч.
class ListFrameTile extends StatelessWidget {
  const ListFrameTile({super.key, required this.first, required this.last, required this.child});

  final bool first;
  final bool last;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final side = BorderSide(color: c.line);
    return Material(
      color: c.surface,
      shape: _FrameBorder(first: first, last: last, side: side),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          child,
          if (!last) Divider(height: 1, color: c.line),
        ],
      ),
    );
  }
}

class _FrameBorder extends ShapeBorder {
  const _FrameBorder({required this.first, required this.last, required this.side});

  final bool first;
  final bool last;
  final BorderSide side;

  RRect _rrect(Rect rect) => RRect.fromRectAndCorners(
        rect,
        topLeft: first ? const Radius.circular(AppRadius.lg) : Radius.zero,
        topRight: first ? const Radius.circular(AppRadius.lg) : Radius.zero,
        bottomLeft: last ? const Radius.circular(AppRadius.lg) : Radius.zero,
        bottomRight: last ? const Radius.circular(AppRadius.lg) : Radius.zero,
      );

  @override
  EdgeInsetsGeometry get dimensions => EdgeInsets.zero;

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) => Path()..addRRect(_rrect(rect));

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) => Path()..addRRect(_rrect(rect));

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final paint = side.toPaint();
    final rr = _rrect(rect.deflate(0.5));
    final path = Path();
    // Зүүн, баруун хүрээ үргэлж; дээд — эхний мөрөнд, доод — сүүлийн мөрөнд.
    path.moveTo(rr.left, first ? rr.top + rr.tlRadiusY : rr.top);
    path.lineTo(rr.left, last ? rr.bottom - rr.blRadiusY : rr.bottom);
    path.moveTo(rr.right, first ? rr.top + rr.trRadiusY : rr.top);
    path.lineTo(rr.right, last ? rr.bottom - rr.brRadiusY : rr.bottom);
    canvas.drawPath(path, paint);
    if (first) {
      canvas.drawPath(
        Path()
          ..moveTo(rr.left, rr.top + rr.tlRadiusY)
          ..arcToPoint(Offset(rr.left + rr.tlRadiusX, rr.top), radius: rr.tlRadius)
          ..lineTo(rr.right - rr.trRadiusX, rr.top)
          ..arcToPoint(Offset(rr.right, rr.top + rr.trRadiusY), radius: rr.trRadius),
        paint,
      );
    }
    if (last) {
      canvas.drawPath(
        Path()
          ..moveTo(rr.left, rr.bottom - rr.blRadiusY)
          ..arcToPoint(Offset(rr.left + rr.blRadiusX, rr.bottom), radius: rr.blRadius, clockwise: false)
          ..lineTo(rr.right - rr.brRadiusX, rr.bottom)
          ..arcToPoint(Offset(rr.right, rr.bottom - rr.brRadiusY), radius: rr.brRadius, clockwise: false),
        paint,
      );
    }
  }

  @override
  ShapeBorder scale(double t) => this;
}
