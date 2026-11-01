// Огторгуйн биетийн ортографик проекц: y тэнхлэгийг тойрох эргэлт (yaw) ба
// дээрээс харах өнцөг (pitch). Дэлгэцийн координат математикийнх (y дээш).
import 'dart:math' as math;

import 'geom.dart';
import 'solids.dart';

class View3 {
  const View3({this.yaw = 0.45, this.pitch = 0.36});

  /// y тэнхлэгийг тойрох эргэлт (радиан).
  final double yaw;

  /// Дээрээс харах өнцөг (радиан). Сурах бичгийн зураг шиг үргэлж дээрээс.
  final double pitch;

  static const minPitch = 0.12;
  static const maxPitch = 1.2;

  View3 rotate(double dYaw, double dPitch) => View3(yaw: yaw + dYaw, pitch: (pitch + dPitch).clamp(minPitch, maxPitch));

  /// Камер руу чиглэсэн нэгж вектор (дэлхийн координатад).
  Vec3 get camDir => Vec3(-math.sin(yaw) * math.cos(pitch), math.sin(pitch), math.cos(yaw) * math.cos(pitch));

  /// Дэлгэц дээрх цэг.
  Pt project(Vec3 p) {
    final x1 = p.x * math.cos(yaw) + p.z * math.sin(yaw);
    final z1 = -p.x * math.sin(yaw) + p.z * math.cos(yaw);
    return Pt(x1, p.y * math.cos(pitch) - z1 * math.sin(pitch));
  }

  /// Камер хүртэлх «ойр байдал» (их бол ойр).
  double depth(Vec3 p) => p.dot(camDir);
}

/// Талс бүр камер руу харсан эсэх (гүдгэр биет — гадагш нормалиар).
List<bool> faceVisibility(SolidModel m, View3 v) {
  final c = m.center;
  final cam = v.camDir;
  return [
    for (final f in m.faces)
      () {
        final p0 = m.pts[f[0]]!, p1 = m.pts[f[1]]!, p2 = m.pts[f[2]]!;
        var n = (p1 - p0).cross(p2 - p0);
        var fc = const Vec3(0, 0, 0);
        for (final k in f) {
          fc = fc + m.pts[k]!;
        }
        fc = fc * (1 / f.length);
        if (n.dot(fc - c) < 0) n = n * -1;
        return n.dot(cam) > 1e-9;
      }(),
  ];
}

/// Ирмэг харагдах эсэх: аль нэг хөрш талс харагдвал харагдана.
Map<(String, String), bool> edgeVisibility(SolidModel m, View3 v) {
  final vis = faceVisibility(m, v);
  return {for (final e in m.edges.entries) e.key: e.value.any((f) => vis[f])};
}

/// Тойргийн проекц (эллипс): y түвшинд r радиустай. Цэг(t) = c + u cos t + w sin t.
class Ellipse2 {
  const Ellipse2(this.c, this.u, this.w);
  final Pt c, u, w;
  Pt at(double t) => c + u * math.cos(t) + w * math.sin(t);
}

Ellipse2 circleAt(View3 v, double r, double y) {
  final c = v.project(Vec3(0, y, 0));
  return Ellipse2(c, v.project(Vec3(r, y, 0)) - c, v.project(Vec3(0, y, r)) - c);
}

/// Хажуу гадаргуу (цилиндр, бөмбөрцгийн экватор)-ийн хүрээ болох параметрүүд:
/// (t1, t2) — t1-ээс t2 хүртэл (өсөх) нь урд (харагдах) нум.
(double, double) frontArc(View3 v) {
  final cam = v.camDir;
  final t1 = math.atan2(-cam.x, cam.z);
  // Урд цэг: нормаль (cos t, 0, sin t) камер руу.
  final tm = math.atan2(cam.z, cam.x);
  var a = t1, b = t1 + math.pi;
  if (!_inArc(tm, a, b)) {
    a = t1 + math.pi;
    b = t1 + 2 * math.pi;
  }
  return (a, b);
}

/// Конусын оройгоос суурийн эллипст татсан шүргэгчийн параметрүүд: (t1, t2) нь
/// урд (харагдах) нум. Орой эллипс дотор бол null (суурь бүхэлдээ нуугдана).
(double, double)? coneTangents(View3 v, double r, double h) {
  final e = circleAt(v, r, 0);
  final apex = v.project(Vec3(0, h, 0));
  final d = e.c - apex;
  final a = cross(d, e.w), b = -cross(d, e.u), k = cross(e.u, e.w);
  final rr = math.sqrt(a * a + b * b);
  if (rr < 1e-12 || k.abs() > rr) return null;
  final phi = math.atan2(b, a);
  final delta = math.acos((-k / rr).clamp(-1.0, 1.0));
  var t1 = phi - delta, t2 = phi + delta;
  final cam = v.camDir;
  final tm = math.atan2(cam.z, cam.x);
  if (!_inArc(tm, t1, t2)) {
    final tmp = t1;
    t1 = t2;
    t2 = tmp + 2 * math.pi;
  }
  return (t1, t2);
}

bool _inArc(double t, double a, double b) {
  var x = t;
  while (x < a) {
    x += 2 * math.pi;
  }
  while (x > a + 2 * math.pi) {
    x -= 2 * math.pi;
  }
  return x <= b;
}
