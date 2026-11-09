import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/cupertino.dart' show CupertinoPageTransition, CupertinoPageTransitionsBuilder;
import 'package:flutter/gestures.dart';
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
/// - iOS: Cupertino + зүүн ирмэгийн буцах зангаа бүх хуудсанд ([EdgeBackGesture]).
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
        TargetPlatform.iOS: const IosPageTransitionsBuilder(),
        TargetPlatform.macOS: const IosPageTransitionsBuilder(),
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

/// iOS: Cupertino шилжилт + зүүн ирмэгээс буцах зангаа ([EdgeBackGesture]) БҮХ хуудсанд —
/// `fullscreenDialog` хуудас ч хэвтээ шилжилттэй, зангаагаар буцна (эзэн: «Apple-ийн апп шиг»).
/// Хөдөлгөөн багасгах горимд нээгдэх/хаагдах нь бүдгэрэлт, харин зангаа хурууг дагасаар үлдэнэ.
class IosPageTransitionsBuilder extends PageTransitionsBuilder {
  const IosPageTransitionsBuilder();

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
    final gesture = EdgeBackGesture(route: route, child: child);
    if (AppMotion.reduced(context)) {
      return _ReducedIosTransition(animation: animation, gesture: route.popGestureInProgress, child: gesture);
    }
    return CupertinoPageTransition(
      primaryRouteAnimation: animation,
      secondaryRouteAnimation: secondaryAnimation,
      // Зангааны үед шугаман — хуруу дагана.
      linearTransition: route.popGestureInProgress,
      child: gesture,
    );
  }
}

/// Хөдөлгөөн багасгах горим: бүдгэрэлт; буцах зангааны үед хуудас хурууг дагаж гулсана.
/// Widget-ийн бүтэц хоёр горимд ижил — зангаа эхлэхэд [EdgeBackGesture] дахин үүсэхгүй.
class _ReducedIosTransition extends StatelessWidget {
  const _ReducedIosTransition({required this.animation, required this.gesture, required this.child});

  final Animation<double> animation;
  final bool gesture;
  final Widget child;

  static final _slide = Tween(begin: const Offset(1, 0), end: Offset.zero);
  static const _still = AlwaysStoppedAnimation(Offset.zero);

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: gesture ? animation.drive(_slide) : _still,
      child: FadeTransition(
        opacity: gesture ? kAlwaysCompleteAnimation : CurveTween(curve: AppEasing.standard).animate(animation),
        child: child,
      ),
    );
  }
}

/// Буцах товчны «буцах газар» — хуудасны [EdgeBackGesture]-д бүртгэгдэнэ. Stack-д өмнөх хуудас байхгүй
/// (`go`-оор, deep link-ээр нээгдсэн) үед зүүн ирмэгийн зангаа яг энэ товчтой ижил үйлдэл хийнэ.
class EdgeBackScope extends InheritedWidget {
  const EdgeBackScope._(this._state, {required super.child});

  /// Доорх хуудасны буцах товч дээд хуудасны зангаанд бүртгэгдэхгүй (хэсгийн дэд хуудас г.м.).
  const EdgeBackScope.none({super.key, required super.child}) : _state = null;

  final _EdgeBackGestureState? _state;

  /// [onBack]-ийг энэ хуудасны ирмэгийн зангаанд бүртгэнэ; буцаасан функцээр бүртгэлээс гаргана.
  static VoidCallback register(BuildContext context, VoidCallback onBack) {
    final state = context.dependOnInheritedWidgetOfExactType<EdgeBackScope>()?._state;
    if (state == null) return () {};
    state._fallbacks.add(onBack);
    return () => state._fallbacks.remove(onBack);
  }

  @override
  bool updateShouldNotify(EdgeBackScope old) => old._state != _state;
}

enum _EdgeMode {
  /// Өмнөх хуудас руу — хуудас хурууг дагана (Cupertino).
  pop,

  /// `PopScope(canPop: false)` (шалгалт, хадгалаагүй маягт) — хуудас бага зэрэг хөдөлж, гаргах үед
  /// хуудасны өөрийн асуулт гарна (`maybePop`). Чимээгүй гарахгүй.
  guarded,

  /// Өмнөх хуудасгүй ч буцах товчтой — хуудас хурууг дагаж гараад товчны үйлдэл хийгдэнэ.
  fallback,
}

/// iOS-ийн зүүн ирмэгээс баруун тийш шудрах «буцах» (Messenger, Apple-ийн апп шиг).
///
/// Хуудас бүрийн шилжилт дотор ([IosPageTransitionsBuilder]). Ирмэгийн [edgeWidth] зурваст эхэлсэн
/// хэвтээ шудралт гоё хүлээгдэнэ: доторх хэвтээ гүйлгэлт (дэд табын `TabBarView`, `PageView`) энэ
/// зурваст түүнийг булаахгүй — заагчийг түрүүлж бүртгэдэг тул arena-д эхэлж ялна. Буцах газаргүй
/// хуудсанд (табын эхлэл) огт оролцохгүй, доторх гүйлгэлт хэвийн ажиллана.
class EdgeBackGesture extends StatefulWidget {
  const EdgeBackGesture({super.key, required this.route, required this.child});

  final PageRoute<dynamic> route;
  final Widget child;

  /// Ирмэгийн зурвасын өргөн (pt); notch-той талд safe-area-аас багагүй.
  static const edgeWidth = 24.0;

  /// Хурдаар шийдэх босго (дэлгэцийн өргөн / секунд) — Cupertino-той ижил.
  static const minFlingVelocity = 1.0;

  /// Хаалттай (`PopScope`) хуудсанд асуулт гаргах зай (өргөний хувь).
  static const guardedThreshold = 0.25;

  @override
  State<EdgeBackGesture> createState() => _EdgeBackGestureState();
}

class _EdgeBackGestureState extends State<EdgeBackGesture> with TickerProviderStateMixin {
  late final HorizontalDragGestureRecognizer _recognizer = HorizontalDragGestureRecognizer(debugOwner: this)
    ..onStart = _onStart
    ..onUpdate = _onUpdate
    ..onEnd = _onEnd
    ..onCancel = _onCancel;

  /// Бүртгэгдсэн буцах товчнууд (сүүлийнх нь хүчинтэй).
  final List<VoidCallback> _fallbacks = [];

  /// Хаалттай/буцах товчтой горимд хуудасны шилжилт (өргөний хувь, 0..1).
  late final AnimationController _shift = AnimationController(vsync: this);

  /// Буцах горимд route-ийн явцыг хурууны дараа зөөлөн дуусгах.
  late final AnimationController _settle = AnimationController(vsync: this);

  _EdgeMode? _mode;
  double _progress = 1;
  double _dx = 0;
  NavigatorState? _gestureNavigator;
  Timer? _resetTimer;
  bool _disposed = false;

  PageRoute<dynamic> get _route => widget.route;

  _EdgeMode? _availableMode() {
    final r = _route;
    final nav = r.navigator;
    if (nav == null || !r.isCurrent || nav.userGestureInProgress) return null;
    // `PageRoute.popGestureEnabled` нь fullscreenDialog-ийг хасдаг — энд ч гэсэн буцна (зураг, маягт хуудас).
    final poppable =
        !r.isFirst &&
        !r.willHandlePopInternally &&
        r.popDisposition != RoutePopDisposition.doNotPop &&
        (r.animation?.isCompleted ?? false);
    if (poppable) return _EdgeMode.pop;
    if (!(r.animation?.isCompleted ?? false)) return null;
    if (!r.isFirst && (r.popDisposition == RoutePopDisposition.doNotPop || r.willHandlePopInternally)) {
      return _EdgeMode.guarded;
    }
    if (_fallbacks.isNotEmpty && r.popDisposition != RoutePopDisposition.doNotPop) return _EdgeMode.fallback;
    return null;
  }

  double get _width => context.size?.width ?? MediaQuery.sizeOf(context).width;

  double _logical(double v) => Directionality.of(context) == TextDirection.rtl ? -v : v;

  Duration _settleDuration(double distance) {
    if (AppMotion.reduced(context)) return const Duration(milliseconds: 120);
    return Duration(milliseconds: (350 * distance.clamp(0.3, 1.0)).round());
  }

  void _onPointerDown(PointerDownEvent event) {
    if (_availableMode() != null) _recognizer.addPointer(event);
  }

  void _onStart(DragStartDetails details) {
    _resetTimer?.cancel();
    _mode = _availableMode();
    _dx = 0;
    switch (_mode) {
      case _EdgeMode.pop:
        _gestureNavigator = _route.navigator;
        _progress = 1;
        _route.handleStartBackGesture(progress: 1);
      case _EdgeMode.guarded || _EdgeMode.fallback:
        _shift.stop();
      case null:
        break;
    }
  }

  void _onUpdate(DragUpdateDetails details) {
    final delta = _logical(details.primaryDelta ?? 0);
    _dx += delta;
    switch (_mode) {
      case _EdgeMode.pop:
        _progress = (_progress - delta / _width).clamp(0.0, 1.0);
        _route.handleUpdateBackGestureProgress(progress: _progress);
      case _EdgeMode.fallback:
        _shift.value = (_dx / _width).clamp(0.0, 1.0);
      case _EdgeMode.guarded:
        // Сунадаг мэдрэмж: хуруу 4 дахин илүү явна, 48pt-ээс хэтрэхгүй.
        _shift.value = (math.min(math.max(_dx, 0) / 4, 48) / _width).clamp(0.0, 1.0);
      case null:
        break;
    }
  }

  void _onEnd(DragEndDetails details) {
    final velocity = _logical(details.velocity.pixelsPerSecond.dx) / _width;
    final fling = velocity.abs() >= EdgeBackGesture.minFlingVelocity;
    final mode = _mode;
    _mode = null;
    switch (mode) {
      case _EdgeMode.pop:
        _finishPop(back: fling ? velocity > 0 : _progress < 0.5);
      case _EdgeMode.fallback:
        _finishFallback(back: fling ? velocity > 0 : _shift.value > 0.5);
      case _EdgeMode.guarded:
        final ask = (fling && velocity > 0) || _dx / _width > EdgeBackGesture.guardedThreshold;
        unawaited(_shift.animateTo(0, duration: _settleDuration(1), curve: AppEasing.decelerate));
        if (ask) unawaited(_route.navigator?.maybePop());
      case null:
        break;
    }
  }

  void _onCancel() {
    final mode = _mode;
    _mode = null;
    switch (mode) {
      case _EdgeMode.pop:
        _finishPop(back: false);
      case _EdgeMode.guarded || _EdgeMode.fallback:
        unawaited(_shift.animateTo(0, duration: _settleDuration(_shift.value), curve: AppEasing.decelerate));
      case null:
        break;
    }
  }

  /// Хурууг тавьсны дараа route-ийн явцыг зорилт руу зөөлөн хүргээд гаргах/буцаана.
  void _finishPop({required bool back}) {
    final from = _progress;
    final to = back ? 0.0 : 1.0;
    final route = _route;
    void done() {
      if (_disposed) return;
      _gestureNavigator = null;
      if (back) {
        route.handleCommitBackGesture();
      } else {
        route.handleCancelBackGesture();
      }
    }

    if ((from - to).abs() < 0.001 || !route.isCurrent) {
      done();
      return;
    }
    final curve = CurveTween(curve: Curves.fastEaseInToSlowEaseOut);
    void tick() => route.handleUpdateBackGestureProgress(progress: from + (to - from) * curve.transform(_settle.value));
    _settle
      ..value = 0
      ..duration = _settleDuration((from - to).abs())
      ..addListener(tick);
    _settle.forward().whenCompleteOrCancel(() {
      _settle.removeListener(tick);
      done();
    });
  }

  void _finishFallback({required bool back}) {
    if (!back) {
      unawaited(_shift.animateTo(0, duration: _settleDuration(_shift.value), curve: AppEasing.decelerate));
      return;
    }
    final action = _fallbacks.isEmpty ? null : _fallbacks.last;
    unawaited(
      _shift.animateTo(1, duration: _settleDuration(1 - _shift.value), curve: Curves.fastEaseInToSlowEaseOut).whenComplete(
        () {
          if (!mounted) return;
          action?.call();
          // Шинэ хуудас (өөр таб) гарч ирсний дараа энэ хуудсыг байранд нь (харагдахгүй үед) буцаана.
          _resetTimer = Timer(const Duration(milliseconds: 600), () {
            if (mounted) _shift.value = 0;
          });
        },
      ),
    );
  }

  @override
  void dispose() {
    // Зангааны дундуур хуудас устгагдвал navigator-ын «зангаа явагдаж байна» төлөвийг цэвэрлэнэ.
    final nav = _gestureNavigator;
    _disposed = true;
    _resetTimer?.cancel();
    _recognizer.dispose();
    _settle.dispose();
    _shift.dispose();
    if (nav != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (nav.mounted && nav.userGestureInProgress) nav.didStopUserGesture();
      });
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final rtl = Directionality.of(context) == TextDirection.rtl;
    final padding = MediaQuery.paddingOf(context);
    final edge = math.max(EdgeBackGesture.edgeWidth, rtl ? padding.right : padding.left);
    final shadow = context.colors.ink.withValues(alpha: 0.12);
    return EdgeBackScope._(
      this,
      child: Stack(
        fit: StackFit.passthrough,
        children: [
          AnimatedBuilder(
            animation: _shift,
            builder: (context, child) {
              final v = _shift.value;
              // Бүтэц үргэлж ижил (Transform + DecoratedBox) — хуудасны state дахин үүсэхгүй.
              return FractionalTranslation(
                translation: Offset(rtl ? -v : v, 0),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    boxShadow: v == 0 ? const [] : [BoxShadow(color: shadow, blurRadius: 16)],
                  ),
                  child: child,
                ),
              );
            },
            child: widget.child,
          ),
          PositionedDirectional(
            start: 0,
            width: edge,
            top: 0,
            bottom: 0,
            child: Listener(onPointerDown: _onPointerDown, behavior: HitTestBehavior.translucent),
          ),
        ],
      ),
    );
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
  // Доод табын идэвхгүй салбарын хуудас (TickerMode унтраастай) системийн буцах зангааг булаахгүй —
  // салбар бүр өөрийн navigator-тэй тул тэдгээрийн дээд хуудас ч `isCurrent`.
  bool _visible = true;

  bool get _enabled => _visible && widget.route.isCurrent && widget.route.popGestureEnabled;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _visible = TickerMode.valuesOf(context).enabled;
  }

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
