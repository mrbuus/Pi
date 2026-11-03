import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show PredictiveBackEvent;

import '../perf/perf_tier.dart';
import 'motion.dart';
import 'tokens.dart';

/// Апп даяарх хуудасны шилжилт (UX-RESEARCH §4, §8) — `ThemeData.pageTransitionsTheme`-ээр
/// бүх `MaterialPage`/`MaterialPageRoute`-д (go_router-ийн өгөгдмөл) автоматаар хэрэгжинэ.
///
/// - Android, high: shared-axis (30dp гулсах + бүдгэрэх, 280ms) + predictive back
///   (Android 14+: хуудас хурууг дагаж буцна; manifest-д `enableOnBackInvokedCallback`).
/// - Android, low: зөвхөн гулсах (transform), opacity давхаргагүй — хуучин OpenGL-д `saveLayer` үнэтэй.
/// - iOS: Cupertino (натив шударга буцах).
/// - Хөдөлгөөн багасгах (Android «Remove animations», iOS «Reduce Motion»): 150ms бүдгэрэх.
abstract final class AppPageTransitions {
  static const sharedAxisDuration = Duration(milliseconds: 280);
  static const slideDuration = Duration(milliseconds: 240);
  static const reducedDuration = Duration(milliseconds: 150);

  /// Гулсах зай (dp).
  static const axisShift = 30.0;

  static PageTransitionsTheme theme([PerfTier? tier]) {
    final t = tier ?? DevicePerf.tier;
    final android = t.isLow ? const SlidePageTransitionsBuilder() : const SharedAxisPageTransitionsBuilder();
    return PageTransitionsTheme(
      builders: {
        TargetPlatform.android: android,
        TargetPlatform.fuchsia: android,
        TargetPlatform.linux: android,
        TargetPlatform.windows: android,
        TargetPlatform.iOS: const _ReducibleCupertinoBuilder(),
        TargetPlatform.macOS: const _ReducibleCupertinoBuilder(),
      },
    );
  }

  /// Хөдөлгөөн багасгах систем тохиргоо (route-ийн хугацааг context-гүй үед).
  static bool get systemReduced {
    final f = PlatformDispatcher.instance.accessibilityFeatures;
    return f.disableAnimations || f.reduceMotion;
  }

  static Widget fade(Animation<double> animation, Widget child) => FadeTransition(
    opacity: CurveTween(curve: AppEasing.standard).animate(animation),
    child: child,
  );
}

/// Shared-axis (хэвтээ): шинэ хуудас +30dp-ээс орж бүдгэрч гарна, хуучин нь -30dp руу бүдгэрнэ.
class SharedAxisPageTransitionsBuilder extends PageTransitionsBuilder {
  const SharedAxisPageTransitionsBuilder();

  @override
  Duration get transitionDuration =>
      AppPageTransitions.systemReduced ? AppPageTransitions.reducedDuration : AppPageTransitions.sharedAxisDuration;

  @override
  Duration get reverseTransitionDuration => transitionDuration;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (AppMotion.reduced(context)) return AppPageTransitions.fade(animation, child);
    return _BackGestureDriver(
      route: route,
      child: _SharedAxis(animation: animation, secondaryAnimation: secondaryAnimation, child: child),
    );
  }
}

/// Сул төхөөрөмж: зөвхөн transform — шинэ хуудас баруунаас бүтэн өргөнөөр, хуучин нь 25% зүүн тийш.
class SlidePageTransitionsBuilder extends PageTransitionsBuilder {
  const SlidePageTransitionsBuilder();

  @override
  Duration get transitionDuration =>
      AppPageTransitions.systemReduced ? AppPageTransitions.reducedDuration : AppPageTransitions.slideDuration;

  @override
  Duration get reverseTransitionDuration => transitionDuration;

  static final _inTween = Tween(
    begin: const Offset(1, 0),
    end: Offset.zero,
  ).chain(CurveTween(curve: AppEasing.standard));
  static final _outTween = Tween(
    begin: Offset.zero,
    end: const Offset(-0.25, 0),
  ).chain(CurveTween(curve: AppEasing.standard));

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (AppMotion.reduced(context)) return AppPageTransitions.fade(animation, child);
    return SlideTransition(
      position: secondaryAnimation.drive(_outTween),
      child: SlideTransition(position: animation.drive(_inTween), child: child),
    );
  }
}

class _ReducibleCupertinoBuilder extends PageTransitionsBuilder {
  const _ReducibleCupertinoBuilder();

  static const _cupertino = CupertinoPageTransitionsBuilder();

  @override
  Duration get transitionDuration =>
      AppPageTransitions.systemReduced ? AppPageTransitions.reducedDuration : _cupertino.transitionDuration;

  @override
  Duration get reverseTransitionDuration =>
      AppPageTransitions.systemReduced ? AppPageTransitions.reducedDuration : _cupertino.reverseTransitionDuration;

  @override
  DelegatedTransitionBuilder? get delegatedTransition =>
      AppPageTransitions.systemReduced ? null : _cupertino.delegatedTransition;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (AppMotion.reduced(context)) return AppPageTransitions.fade(animation, child);
    return _cupertino.buildTransitions(route, context, animation, secondaryAnimation, child);
  }
}

class _SharedAxis extends StatelessWidget {
  const _SharedAxis({required this.animation, required this.secondaryAnimation, required this.child});

  final Animation<double> animation;
  final Animation<double> secondaryAnimation;
  final Widget child;

  // Орох: 0.3-аас эхэлж бүдгэрч гарна; гарах: эхний 30%-д бүдгэрнэ (Material shared-axis).
  static final _fadeIn = CurveTween(curve: const Interval(0.3, 1, curve: AppEasing.standard));
  static final _fadeOut = Tween<double>(begin: 1, end: 0).chain(CurveTween(curve: const Interval(0, 0.3)));
  static final _slide = CurveTween(curve: AppEasing.standard);

  @override
  Widget build(BuildContext context) {
    final rtl = Directionality.of(context) == TextDirection.rtl ? -1.0 : 1.0;
    const d = AppPageTransitions.axisShift;
    return FadeTransition(
      opacity: secondaryAnimation.drive(_fadeOut),
      child: _Translate(
        animation: secondaryAnimation.drive(_slide),
        dx: (t) => -d * t * rtl,
        child: FadeTransition(
          opacity: animation.drive(_fadeIn),
          child: _Translate(animation: animation.drive(_slide), dx: (t) => d * (1 - t) * rtl, child: child),
        ),
      ),
    );
  }
}

/// dp-ээр хэвтээ шилжүүлэх (SlideTransition хувиар л ажилладаг).
class _Translate extends AnimatedWidget {
  const _Translate({required Animation<double> animation, required this.dx, required this.child})
    : super(listenable: animation);

  final double Function(double t) dx;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final v = (listenable as Animation<double>).value;
    return Transform.translate(offset: Offset(dx(v), 0), child: child);
  }
}

/// Android 14+-ийн predictive back: системийн буцах зангааг route-ийн анимацад дамжуулна —
/// shared-axis шилжилт хурууг дагаж ухарна, цуцалбал буцаж орно.
class _BackGestureDriver extends StatefulWidget {
  const _BackGestureDriver({required this.route, required this.child});

  final PageRoute<dynamic> route;
  final Widget child;

  @override
  State<_BackGestureDriver> createState() => _BackGestureDriverState();
}

class _BackGestureDriverState extends State<_BackGestureDriver> with WidgetsBindingObserver {
  bool get _enabled => widget.route.isCurrent && widget.route.popGestureEnabled;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  bool handleStartBackGesture(PredictiveBackEvent backEvent) {
    if (backEvent.isButtonEvent || !_enabled) return false;
    widget.route.handleStartBackGesture(progress: 1 - backEvent.progress);
    return true;
  }

  @override
  void handleUpdateBackGestureProgress(PredictiveBackEvent backEvent) =>
      widget.route.handleUpdateBackGestureProgress(progress: 1 - backEvent.progress);

  @override
  void handleCancelBackGesture() => widget.route.handleCancelBackGesture();

  @override
  void handleCommitBackGesture() => widget.route.handleCommitBackGesture();

  @override
  Widget build(BuildContext context) => widget.child;
}
