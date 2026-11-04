import 'dart:math' as math;
import 'dart:ui' show PathMetric;

import 'package:flutter/physics.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import '../perf/perf_tier.dart';
import 'tokens.dart';

/// Spring-ийн токен (UX-RESEARCH §4). Standard ζ≈0.9 (бараг үсрэлтгүй) өгөгдмөл,
/// expressive ζ 0.8 зөвхөн онцгой мөчид. ζ < 0.7 ХОРИОТОЙ.
abstract final class AppSprings {
  /// Дарах: scale 0.97, ~110ms (k3800 ζ1 — үсрэлтгүй).
  static final press = SpringDescription.withDampingRatio(mass: 1, stiffness: 3800, ratio: 1);

  /// Өгөгдмөл орон зайн хөдөлгөөн.
  static final standard = SpringDescription.withDampingRatio(mass: 1, stiffness: 700, ratio: 0.9);

  /// Bottom sheet (чирэх хурдыг дагана).
  static final sheet = SpringDescription.withDampingRatio(mass: 1, stiffness: 700, ratio: 0.9);

  /// Зөв хариу / амжилтын дүрс 0.8 → 1.
  static final expressive = SpringDescription.withDampingRatio(mass: 1, stiffness: 380, ratio: 0.8);
}

/// Муруй (curve) токен.
abstract final class AppEasing {
  /// Сонгох / toggle, 100–150ms.
  static const standard = Cubic(0.2, 0, 0, 1);

  /// Орж ирэх (хурдан эхэлж зөөлөн зогсоно).
  static const decelerate = Cubic(0.05, 0.7, 0.1, 1);
}

/// Хөдөлгөөн тоглуулах эсэх: хөдөлгөөн багасгах тохиргоо (Android + iOS) эсвэл сул төхөөрөмжид
/// чимэглэлийн хөдөлгөөн (шатлал г.м.) хийхгүй.
bool decorativeMotionOff(BuildContext context) => AppMotion.reduced(context) || DevicePerf.tier.isLow;

/// Дарахад 0.97 болж жижгэрнэ — зөвхөн transform (`Opacity`, `saveLayer` үгүй).
///
/// Хүүхэд өөрөө товшилтыг (InkWell, товч) хүлээж авна — энэ widget зөвхөн заагчийг сонсоно,
/// тоглоомын arena-д оролцохгүй. Хөдөлгөөн багасгах горимд scale хийхгүй (зөвхөн хүүхдийн
/// төлөвийн давхарга).
class PressableScale extends StatefulWidget {
  const PressableScale({super.key, required this.child, this.scale = 0.97, this.enabled = true});

  final Widget child;
  final double scale;
  final bool enabled;

  @override
  State<PressableScale> createState() => _PressableScaleState();
}

class _PressableScaleState extends State<PressableScale> with SingleTickerProviderStateMixin {
  // value: 0 = чөлөөтэй, 1 = дарсан. Хязгааргүй — spring бага зэрэг давж болно.
  late final AnimationController _c = AnimationController.unbounded(vsync: this);
  late final Animation<double> _scale = _c.drive(Tween(begin: 1, end: widget.scale));

  void _to(double target) {
    // Чирж байх үед карт салгагдвал (reorderable жагсаалт) pointer-up нь салгагдсаны дараа ирж болно
    if (!mounted) return;
    if (!widget.enabled || AppMotion.reduced(context)) {
      _c.value = 0;
      return;
    }
    _c.animateWith(SpringSimulation(AppSprings.press, _c.value, target, _c.velocity));
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      onPointerDown: (_) => _to(1),
      onPointerUp: (_) => _to(0),
      onPointerCancel: (_) => _to(0),
      child: ScaleTransition(scale: _scale, child: widget.child),
    );
  }
}

/// Жагсаалтын мөр гарч ирэх: бүдгэрэх + 8dp дээшлэх, 200ms, 30ms шатлал.
///
/// Зөвхөн эхний [StaggerIn.maxItems] мөр, зөвхөн АНХ удаа (гүйлгээд буцаж ирэхэд дахин
/// тоглохгүй — `PageStorage`-д тэмдэглэнэ). Хөдөлгөөн багасгах горим, сул төхөөрөмжид шууд.
class StaggerIn extends StatefulWidget {
  const StaggerIn({super.key, required this.index, required this.child, this.group = 'list'});

  final int index;
  final Widget child;

  /// Нэг хуудсанд хэд хэдэн жагсаалт байвал ялгах нэр.
  final String group;

  static const maxItems = 8;
  static const itemDuration = Duration(milliseconds: 200);
  static const step = Duration(milliseconds: 30);
  static const rise = 8.0;

  @override
  State<StaggerIn> createState() => _StaggerInState();
}

class _StaggerInState extends State<StaggerIn> with SingleTickerProviderStateMixin {
  AnimationController? _c;
  Animation<double>? _t;

  String get _id => 'stagger:${widget.group}:${widget.index}';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_c != null) return;
    final storage = PageStorage.maybeOf(context);
    final played = storage?.readState(context, identifier: _id) == true;
    if (played || widget.index >= StaggerIn.maxItems || decorativeMotionOff(context)) return;
    storage?.writeState(context, true, identifier: _id);
    final delay = StaggerIn.step * widget.index;
    final total = delay + StaggerIn.itemDuration;
    final c = AnimationController(vsync: this, duration: total);
    final start = delay.inMicroseconds / total.inMicroseconds;
    // drive(): build бүрт CurvedAnimation үүсгэж listener алдагдуулахгүй.
    _t = c.drive(CurveTween(curve: Interval(start, 1, curve: AppEasing.decelerate)));
    _c = c..forward();
  }

  @override
  void dispose() {
    _c?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = _t;
    if (t == null) return widget.child;
    return FadeTransition(
      opacity: t,
      child: AnimatedBuilder(
        animation: t,
        builder: (context, child) =>
            Transform.translate(offset: Offset(0, (1 - t.value) * StaggerIn.rise), child: child),
        child: widget.child,
      ),
    );
  }
}

/// `ListView.builder`-ийн itemBuilder-т: `staggerIn(i, Row(...))`.
Widget staggerIn(int index, Widget child, {String group = 'list'}) =>
    StaggerIn(index: index, group: group, child: child);

/// Ганц «амжилт»-ын мөч: дугуй + check зурагдана (~280ms), дүрс 0.8 → 1 (k380 ζ0.8),
/// нэг хөнгөн haptic. Confetti, лугшилт үгүй. Хөдөлгөөн багасгах горимд шууд эцсийн төлөв.
class SuccessCheck extends StatefulWidget {
  const SuccessCheck({super.key, this.size = 56, this.color, this.haptic = true, this.semanticLabel = 'Амжилттай'});

  final double size;

  /// Өгөөгүй бол брэндийн өнгө.
  final Color? color;
  final bool haptic;
  final String semanticLabel;

  static const drawDuration = Duration(milliseconds: 280);

  @override
  State<SuccessCheck> createState() => _SuccessCheckState();
}

class _SuccessCheckState extends State<SuccessCheck> with TickerProviderStateMixin {
  late final AnimationController _draw = AnimationController(vsync: this, duration: SuccessCheck.drawDuration);
  late final AnimationController _pop = AnimationController.unbounded(vsync: this, value: 1);
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (widget.haptic) HapticFeedback.lightImpact();
    if (AppMotion.reduced(context)) {
      _draw.value = 1;
      return;
    }
    _pop.animateWith(SpringSimulation(AppSprings.expressive, 0.8, 1, 0));
    _draw.forward();
  }

  @override
  void dispose() {
    _draw.dispose();
    _pop.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? context.colors.brand;
    return Semantics(
      label: widget.semanticLabel,
      image: true,
      child: ScaleTransition(
        scale: _pop,
        child: RepaintBoundary(
          child: CustomPaint(
            size: Size.square(widget.size),
            painter: _CheckPainter(progress: _draw, color: color),
          ),
        ),
      ),
    );
  }
}

class _CheckPainter extends CustomPainter {
  _CheckPainter({required this.progress, required this.color}) : super(repaint: progress);

  final Animation<double> progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.shortestSide;
    final stroke = math.max(2.0, s / 14);
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final t = progress.value;
    final center = size.center(Offset.zero);
    final r = s / 2 - stroke / 2;
    // Эхний 55% — дугуй, үлдсэн нь check (PathMetric.extractPath).
    final ring = (t / 0.55).clamp(0.0, 1.0);
    canvas.drawArc(Rect.fromCircle(center: center, radius: r), -math.pi / 2, ring * 2 * math.pi, false, paint);
    final tick = ((t - 0.4) / 0.6).clamp(0.0, 1.0);
    if (tick <= 0) return;
    final path = Path()
      ..moveTo(s * 0.29, s * 0.52)
      ..lineTo(s * 0.44, s * 0.66)
      ..lineTo(s * 0.72, s * 0.37);
    final PathMetric metric = path.computeMetrics().first;
    canvas.drawPath(metric.extractPath(0, metric.length * tick), paint);
  }

  @override
  bool shouldRepaint(_CheckPainter old) => old.color != color || old.progress != progress;
}

/// Асинк ачаалагдсан агуулгыг (зураг) 150ms бүдгэрүүлж гаргана, дууссаны дараа opacity давхаргыг
/// хасна. [enabled] = false (кэшээс шууд ирсэн, хөдөлгөөн багасгах) бол шууд.
class FadeInOnce extends StatefulWidget {
  const FadeInOnce({super.key, required this.child, this.enabled = true, this.duration = fadeInDuration});

  final Widget child;
  final bool enabled;
  final Duration duration;

  static const fadeInDuration = Duration(milliseconds: 150);

  @override
  State<FadeInOnce> createState() => _FadeInOnceState();
}

class _FadeInOnceState extends State<FadeInOnce> with SingleTickerProviderStateMixin {
  AnimationController? _c;
  bool _done = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_c != null || _done) return;
    if (!widget.enabled || AppMotion.reduced(context)) {
      _done = true;
      return;
    }
    _c = AnimationController(vsync: this, duration: widget.duration)
      ..forward().whenComplete(() {
        if (mounted) setState(() => _done = true);
      });
  }

  @override
  void dispose() {
    _c?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = _c;
    if (_done || c == null) return widget.child;
    return FadeTransition(opacity: c, child: widget.child);
  }
}
