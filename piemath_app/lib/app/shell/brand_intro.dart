import 'dart:async';
import 'dart:ui' show lerpDouble;

import 'package:flutter/material.dart';

import '../../core/ui/ui.dart';

/// Апп нээгдэх үеийн логоны анимац (эзний кадрууд, 2026-11-14): «Shine ireeduin ezed» бичвэр дэлгэцийн
/// голд (системийн эхний цонхтой яг ижил байрлал, хэмжээ) → бичвэр зүүн тийш гулсаж, цайвар дугуй гарч ирэн
/// язгуур ба хязгааргүй тэмдэг зурагдана → дугуй хар хөх болж тэмдэг цагаан болно = бүтэн лого. Давхарга бүр жинхэнэ логоноос
/// (`assets/brand/intro`, `make_branding.py`) — үсэг, дугуйн хэлбэр гажихгүй. Хөдөлгөөн багасгах тохиргоотой
/// бол шууд бүтэн лого. Товшвол алгасна. Дуусахад [onDone].
class BrandIntro extends StatefulWidget {
  const BrandIntro({super.key, this.width = canvasWidth, this.onDone});

  /// Бүтэн логоны өргөн (pt). Системийн эхний цонхны зураг (`splash-wordmark-*.png`) энэ өргөнд тааруулж
  /// 4x-ээр гарсан тул өөрчилбөл `make_branding.py`-г дахин ажиллуул.
  static const canvasWidth = 280.0;

  /// Давхаргын зургийн харьцаа (1498 × 625 эх кадраас).
  static const aspect = 1498 / 625;

  /// Бичвэрийн хүрээний төв (зургийн өргөн/өндрийн хувиар) — эхний кадрт энэ цэг дэлгэцийн голд байна.
  static const wordmarkCenter = Offset(544.5 / 1498, 317.5 / 625);

  /// Дугуйн зүүн ирмэг (өргөний хувиар) — язгуур ба хязгааргүй тэмдэг зурагдаж эхлэх газар.
  static const discLeft = (1159.0 - 314.4) / 1498;

  /// Дугуйн төв (томрох цэг), [Alignment]-аар.
  static const discCenter = Alignment(1159.0 / 1498 * 2 - 1, 314.2 / 625 * 2 - 1);

  static const duration = Duration(milliseconds: 1150);

  static const layers = [
    'assets/brand/intro/disc.png',
    'assets/brand/intro/wordmark.png',
    'assets/brand/intro/text-on-disc.png',
    'assets/brand/intro/root-infinity.png',
  ];

  final double width;
  final VoidCallback? onDone;

  @override
  State<BrandIntro> createState() => _BrandIntroState();
}

class _BrandIntroState extends State<BrandIntro> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: BrandIntro.duration);
  bool _started = false;
  bool _done = false;

  // Хуваарь (0–1): гулсалт → дугуй орж ирэх → язгуур ба хязгааргүй тэмдэг зурах → өнгө дүүргэх.
  static const _slide = Interval(0.0, 0.42, curve: Curves.easeInOutCubic);
  static const _discIn = Interval(0.12, 0.52, curve: Curves.easeOutBack);
  static const _draw = Interval(0.28, 0.68, curve: Curves.easeInOutSine);
  static const _fade = Interval(0.10, 0.40, curve: Curves.easeOut);
  static const _fill = Interval(0.62, 0.95, curve: Curves.easeInOutCubic);

  @override
  void initState() {
    super.initState();
    _c.addStatusListener((s) {
      if (s == AnimationStatus.completed) _finish();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (AppMotion.reduced(context)) {
      _c.value = 1;
      WidgetsBinding.instance.addPostFrameCallback((_) => _finish());
      return;
    }
    // Давхаргууд санах ойд орсны дараа эхэлнэ — эхний кадр хоосон гарахгүй.
    final ready = [for (final a in BrandIntro.layers) precacheImage(AssetImage(a), context)];
    unawaited(
      Future.wait(ready).whenComplete(() {
        if (mounted && !_done) unawaited(_c.forward());
      }),
    );
  }

  void _finish() {
    if (_done) return;
    _done = true;
    widget.onDone?.call();
  }

  void _skip() {
    _c.value = 1;
    _finish();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final w = widget.width;
    final h = w / BrandIntro.aspect;
    final ink = dark ? LogoInk.paper : LogoInk.navy;
    final paleDisc = dark ? c.surface : c.surfaceSunken;
    final paleMark = dark ? c.brand : LogoInk.navy;
    return Semantics(
      label: AppStrings.orgName,
      image: true,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _skip,
        child: SizedBox(
          width: w,
          height: h,
          child: AnimatedBuilder(
            animation: _c,
            builder: (context, _) {
              final t = _c.value;
              final slide = 1 - _slide.transform(t);
              final start = Offset((0.5 - BrandIntro.wordmarkCenter.dx) * w, (0.5 - BrandIntro.wordmarkCenter.dy) * h);
              final disc = _discIn.transform(t);
              final draw = _draw.transform(t);
              final fill = _fill.transform(t);
              // Дугуй орж ирэх үед бичвэр бүдгэрч, өнгө дүүргэхэд буцаж тодорно (эзний 2-р кадр).
              final dim = _fade.transform(t) * (1 - fill);
              final markColor = Color.lerp(paleMark, LogoInk.paper, fill)!;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  if (disc > 0)
                    Opacity(
                      opacity: disc.clamp(0.0, 1.0),
                      child: Transform.scale(
                        scale: lerpDouble(0.72, 1, disc)!,
                        alignment: BrandIntro.discCenter,
                        child: _Layer(BrandIntro.layers[0], w, h, Color.lerp(paleDisc, LogoInk.navy, fill)!),
                      ),
                    ),
                  Transform.translate(
                    offset: start * slide,
                    child: _Layer(BrandIntro.layers[1], w, h, ink.withValues(alpha: 1 - 0.7 * dim)),
                  ),
                  if (slide == 0) _Layer(BrandIntro.layers[2], w, h, Color.lerp(ink, LogoInk.paper, fill)!),
                  if (draw > 0)
                    ShaderMask(
                      blendMode: BlendMode.dstIn,
                      shaderCallback: (r) {
                        final edge = lerpDouble(BrandIntro.discLeft, 1.02, draw)!;
                        return LinearGradient(
                          colors: [LogoInk.navy, LogoInk.navy, LogoInk.navy.withValues(alpha: 0)],
                          stops: [0, (edge - 0.02).clamp(0.0, 1.0), edge.clamp(0.0, 1.0)],
                        ).createShader(r);
                      },
                      child: _Layer(BrandIntro.layers[3], w, h, markColor),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

/// Цагаан, ил тод давхаргыг өгсөн өнгөөр будна.
class _Layer extends StatelessWidget {
  const _Layer(this.asset, this.w, this.h, this.color);

  final String asset;
  final double w;
  final double h;
  final Color color;

  @override
  Widget build(BuildContext context) => Image.asset(
    asset,
    width: w,
    height: h,
    color: color,
    colorBlendMode: BlendMode.srcIn,
    filterQuality: FilterQuality.medium,
    gaplessPlayback: true,
    excludeFromSemantics: true,
  );
}
