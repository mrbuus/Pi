import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'tokens.dart';

/// Ачаалж буй үеийн бодит бүтцийн хэлбэр (STATUS §6.7: «Ачаалж байна…» ганц мөр хангалтгүй).
///
/// Сул утсанд зориулж (UX-RESEARCH §4, §8):
/// - нэг [AnimationController], нэг [RepaintBoundary]; `Opacity`/`ShaderMask`/`saveLayer` ҮГҮЙ —
///   доторх [SkeletonBox]-ууд өнгөө `CustomPainter`-ээр лугшуулна (зөвхөн repaint, rebuild үгүй);
/// - 300ms-ээс өмнө юу ч зурахгүй (хурдан хариунд skeleton анивчихгүй), layout нь шууд тогтвортой;
/// - хөдөлгөөн багасгах горимд статик өнгө.
class SkeletonPulse extends StatefulWidget {
  const SkeletonPulse({super.key, required this.child});

  final Widget child;

  /// Харуулахын өмнөх хүлээлт.
  static const showDelay = Duration(milliseconds: 300);

  /// Лугшилтын бүтэн мөчлөг (нааш цааш) ~1.3 сек.
  static const period = Duration(milliseconds: 650);

  @override
  State<SkeletonPulse> createState() => _SkeletonPulseState();
}

class _SkeletonPulseState extends State<SkeletonPulse> with TickerProviderStateMixin {
  late final AnimationController _show = AnimationController(vsync: this, duration: SkeletonPulse.showDelay);
  late final AnimationController _pulse = AnimationController(vsync: this, duration: SkeletonPulse.period);
  late final _SkeletonPhase _phase = _SkeletonPhase(_show, _pulse);

  @override
  void initState() {
    super.initState();
    _show.forward().whenCompleteOrCancel(_maybePulse);
  }

  void _maybePulse() {
    if (!mounted || !_show.isCompleted) return;
    if (AppMotion.reduced(context)) {
      _pulse.stop();
      _pulse.value = 0;
    } else if (!_pulse.isAnimating) {
      _pulse.repeat(reverse: true);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _maybePulse();
  }

  @override
  void dispose() {
    _show.dispose();
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Ачаалж байна',
      liveRegion: true,
      child: ExcludeSemantics(
        child: RepaintBoundary(
          child: _SkeletonScope(phase: _phase, child: widget.child),
        ),
      ),
    );
  }
}

/// 0 = харагдахгүй (хүлээлт), эсвэл 1 + лугшилтын утга.
class _SkeletonPhase extends ChangeNotifier implements ValueListenable<double> {
  _SkeletonPhase(this._show, this._pulse) {
    _show.addListener(notifyListeners);
    _pulse.addListener(notifyListeners);
  }

  final AnimationController _show;
  final AnimationController _pulse;

  bool get visible => _show.isCompleted;

  /// Цайвар өнгө рүү холдох хэмжээ (0–1).
  @override
  double get value => _pulse.value;
}

class _SkeletonScope extends InheritedWidget {
  const _SkeletonScope({required this.phase, required super.child});

  final _SkeletonPhase phase;

  @override
  bool updateShouldNotify(_SkeletonScope old) => old.phase != phase;
}

/// Skeleton-ийн нэг хайрцаг. [SkeletonPulse] дотор байвал өнгө лугшина, гадна бол статик.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({super.key, this.width, this.height, this.radius = AppRadius.sm / 2});

  final double? width;
  final double? height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final phase = context.dependOnInheritedWidgetOfExactType<_SkeletonScope>()?.phase;
    // Container(width, height)-тэй ижил хэмжээ: хязгаартай бол дүүргэнэ, хязгааргүй бол 0.
    return SizedBox(
      width: width,
      height: height,
      child: LimitedBox(
        maxWidth: 0,
        maxHeight: 0,
        child: SizedBox.expand(
          child: CustomPaint(
            painter: _SkeletonPainter(
              phase: phase,
              base: c.skeleton,
              // Лугшилтын цайвар туйл: skeleton → surface руу 45%.
              light: Color.lerp(c.skeleton, c.surface, 0.45)!,
              radius: radius,
            ),
          ),
        ),
      ),
    );
  }
}

class _SkeletonPainter extends CustomPainter {
  _SkeletonPainter({required this.phase, required this.base, required this.light, required this.radius})
    : super(repaint: phase);

  final _SkeletonPhase? phase;
  final Color base;
  final Color light;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final p = phase;
    if (p != null && !p.visible) return;
    final color = p == null ? base : Color.lerp(base, light, p.value)!;
    canvas.drawRRect(RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)), Paint()..color = color);
  }

  @override
  bool shouldRepaint(_SkeletonPainter old) =>
      old.phase != phase || old.base != base || old.light != light || old.radius != radius;
}

/// Нэг мөр (бичвэрийн оронд).
class SkeletonLine extends StatelessWidget {
  const SkeletonLine({super.key, this.width, this.height = 14, this.widthFactor});

  final double? width;
  final double height;

  /// Эцгийн өргөний хувь (0–1). [width]-ээс давуу.
  final double? widthFactor;

  @override
  Widget build(BuildContext context) {
    final box = SkeletonBox(width: widthFactor == null ? width : null, height: height);
    if (widthFactor == null) return box;
    return FractionallySizedBox(widthFactor: widthFactor, alignment: AlignmentDirectional.centerStart, child: box);
  }
}

/// Хэдэн мөр — жагсаалтын оронд.
class SkeletonRows extends StatelessWidget {
  const SkeletonRows({super.key, this.rows = 3});

  final int rows;

  static const _factors = [0.92, 0.7, 0.84, 0.6, 0.78];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < rows; i++) ...[
          if (i > 0) const SizedBox(height: AppSpace.md),
          SkeletonLine(widthFactor: _factors[i % _factors.length]),
        ],
      ],
    );
  }
}

/// Карт хэлбэртэй skeleton (гарчиг + 2 мөр).
class SkeletonCard extends StatelessWidget {
  const SkeletonCard({super.key, this.lines = 2});

  final int lines;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // AppCard-тай ижил хэлбэр (уруул нь бодит картын адил доод хүрээ болж харагдана).
    return Container(
      padding: const EdgeInsets.all(AppSpace.lg),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(AppRadius.xl),
        border: Border(
          top: BorderSide(color: c.line, width: 1.5),
          left: BorderSide(color: c.line, width: 1.5),
          right: BorderSide(color: c.line, width: 1.5),
          bottom: BorderSide(color: c.line, width: 4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SkeletonLine(widthFactor: 0.5, height: 18),
          const SizedBox(height: AppSpace.md),
          SkeletonRows(rows: lines),
        ],
      ),
    );
  }
}
