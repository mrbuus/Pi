import 'package:flutter/material.dart';

import 'tokens.dart';

/// Ачаалж буй үеийн бодит бүтцийн хэлбэр (STATUS §6.7: «Ачаалж байна…» ганц мөр хангалтгүй).
///
/// Сул утсанд зориулж: нэг [AnimationController], зөвхөн opacity (`FadeTransition`),
/// `MediaQuery.disableAnimations` үед хөдөлгөөнгүй.
class SkeletonPulse extends StatefulWidget {
  const SkeletonPulse({super.key, required this.child});

  final Widget child;

  @override
  State<SkeletonPulse> createState() => _SkeletonPulseState();
}

class _SkeletonPulseState extends State<SkeletonPulse> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
    lowerBound: 0.55,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (reduce) {
      _c.stop();
      _c.value = 1;
    } else if (!_c.isAnimating) {
      _c.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Ачаалж байна',
      liveRegion: true,
      child: ExcludeSemantics(
        child: RepaintBoundary(child: FadeTransition(opacity: _c, child: widget.child)),
      ),
    );
  }
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
    final box = Container(
      width: widthFactor == null ? width : null,
      height: height,
      decoration: BoxDecoration(
        color: context.colors.skeleton,
        borderRadius: BorderRadius.circular(AppRadius.sm / 2),
      ),
    );
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
    return Container(
      padding: const EdgeInsets.all(AppSpace.lg),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: c.line),
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
