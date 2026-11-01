import 'dart:math' as math;
import 'dart:typed_data';

/// Зургийн тайралтын тэгш өнцөгт — 0..1 харьцаагаар, ХАРАГДАЖ БУЙ чиглэлээр (эргүүлсний дараах).
class CropRect {
  const CropRect(this.left, this.top, this.right, this.bottom);

  static const full = CropRect(0, 0, 1, 1);

  /// Хамгийн жижиг тал (бүтэн зургийн харьцаагаар) — хуруугаар барьж болохоор.
  static const minSide = 0.18;

  final double left;
  final double top;
  final double right;
  final double bottom;

  double get width => right - left;
  double get height => bottom - top;

  /// Огт тайраагүй (≈ бүтэн зураг).
  bool get isFull => left <= 0.001 && top <= 0.001 && right >= 0.999 && bottom >= 0.999;

  /// [handle]-ийг (dx, dy) — бүтэн зургийн харьцаагаар — зөөнө. Хил даваагүй, хэт жижиг болохгүй.
  CropRect drag(CropHandle handle, double dx, double dy) {
    var l = left, t = top, r = right, b = bottom;
    switch (handle) {
      case CropHandle.move:
        final w = width, h = height;
        l = (left + dx).clamp(0.0, 1 - w);
        t = (top + dy).clamp(0.0, 1 - h);
        return CropRect(l, t, l + w, t + h);
      case CropHandle.topLeft:
        l += dx;
        t += dy;
      case CropHandle.topRight:
        r += dx;
        t += dy;
      case CropHandle.bottomLeft:
        l += dx;
        b += dy;
      case CropHandle.bottomRight:
        r += dx;
        b += dy;
      case CropHandle.top:
        t += dy;
      case CropHandle.bottom:
        b += dy;
      case CropHandle.left:
        l += dx;
      case CropHandle.right:
        r += dx;
    }
    l = l.clamp(0.0, right - minSide);
    r = r.clamp(left + minSide, 1.0);
    t = t.clamp(0.0, bottom - minSide);
    b = b.clamp(top + minSide, 1.0);
    return CropRect(l, t, r, b);
  }

  @override
  bool operator ==(Object other) =>
      other is CropRect && other.left == left && other.top == top && other.right == right && other.bottom == bottom;

  @override
  int get hashCode => Object.hash(left, top, right, bottom);

  @override
  String toString() => 'CropRect($left, $top, $right, $bottom)';
}

enum CropHandle { topLeft, topRight, bottomLeft, bottomRight, top, bottom, left, right, move }

/// Лапласын хуваарийн дисперс — зургийн «тод байдал»-ын үзүүлэлт (бага = бүдэг).
/// [gray] нь [width]*[height] урттай саарал (0..255) пиксел. Хэт жижиг зураг бол 0.
double laplacianVariance(Uint8List gray, int width, int height) {
  if (width < 3 || height < 3 || gray.length < width * height) return 0;
  var sum = 0.0, sumSq = 0.0;
  var n = 0;
  for (var y = 1; y < height - 1; y++) {
    final row = y * width;
    for (var x = 1; x < width - 1; x++) {
      final i = row + x;
      final v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  final mean = sum / n;
  return math.max(0, sumSq / n - mean * mean);
}

/// ~480px өргөнтэй багасгасан зураг дээрх босго. Үүнээс бага бол «бүдэг байж магадгүй».
/// Эвристик — бодит утсанд тааруулна (PROGRESS: төхөөрөмжийн шалгалт).
const double blurVarianceThreshold = 45;

bool isBlurry(double? variance) => variance != null && variance < blurVarianceThreshold;

/// RGBA байтыг саарал болгоно (Rec.601).
Uint8List rgbaToGray(Uint8List rgba, int width, int height) {
  final out = Uint8List(width * height);
  for (var i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) ~/ 1000;
  }
  return out;
}
