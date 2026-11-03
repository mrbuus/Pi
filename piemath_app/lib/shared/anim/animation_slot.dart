import 'dart:async';
import 'dart:ui' show FramePhase;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:lottie/lottie.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/perf/perf_tier.dart';
import '../../core/ui/tokens.dart';
import 'anim_manifest.dart';
import 'anim_slot.dart';

export 'anim_slot.dart';

/// Нэг анимацын байр (`docs/RESEARCH-2026-11.md` §4, `assets/anim/README.md`).
///
/// - Файл bundle-д байхгүй (одоо бүх слот) → [fallback]-ыг шууд, хэмжээ нэмэлгүй зурна.
/// - Poster-ыг шууд харуулж, Lottie-ийн эхний кадр бэлэн болмогц 180мс-д солино (`FadeTransition`).
/// - Хөдөлгөөн багасгах горим, сул төхөөрөмж, эсвэл тухайн слот удаан гэж тэмдэглэгдсэн бол зөвхөн poster.
/// - `TickerMode` унтарсан, апп далд орсон, [active] = false үед зогсоно. Нэг удаад нэг давталттай слот.
/// - Lottie 30fps. 2с-д кадрын 15%-иас олон нь 16мс хэтэрвэл poster болж, сонголтыг слот бүрээр хадгална.
class AnimationSlot extends StatefulWidget {
  const AnimationSlot({
    super.key,
    required this.slot,
    required this.fallback,
    this.size,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.active = true,
    this.semanticLabel,
  });

  final AnimSlot slot;

  /// Файл байхгүй үед яг энэ widget (одоогийн дүрс г.м.) — дэлгэц өөрчлөгдөхгүй.
  final Widget fallback;

  /// Дөрвөлжин хэмжээ ([width], [height]-ийн өгөгдмөл).
  final double? size;
  final double? width;
  final double? height;
  final BoxFit fit;

  /// false бол тоглуулахгүй (жишээ нь гар нээлттэй).
  final bool active;

  /// Өгвөл дэлгэц уншигчид зураг гэж уншигдана, эс бөгөөс чимэглэл.
  final String? semanticLabel;

  static const crossFade = Duration(milliseconds: 180);
  static const frameRate = FrameRate(30);

  @override
  State<AnimationSlot> createState() => _AnimationSlotState();
}

class _AnimationSlotState extends State<AnimationSlot> with TickerProviderStateMixin, WidgetsBindingObserver {
  late final AnimationController _progress = AnimationController(vsync: this);
  late final AnimationController _fade = AnimationController(vsync: this, duration: AnimationSlot.crossFade);
  final Object _token = Object();

  AnimManifest? _manifest = AnimManifest.cached;
  bool? _degraded;
  bool _ready = false;
  bool _faded = false;
  bool _finished = false;
  bool _foreground = true;
  bool _tickers = true;
  bool _motionOff = false;
  bool _dark = false;
  bool _claimed = false;
  FrameBudgetMonitor? _monitor;

  AnimEntry? get _entry => _manifest?[widget.slot];

  String? get _file => _manifest?.fileFor(widget.slot, dark: _dark);

  /// Lottie тоглуулж болох эсэх (poster-оос гадна).
  bool get _canPlay => _entry?.kind == AnimKind.lottie && _file != null && !_motionOff && _degraded == false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    AnimLoopGate.owner.addListener(_onGate);
    if (_manifest == null) {
      AnimManifest.load().then((m) {
        if (!mounted) return;
        setState(() => _manifest = m);
        _checkDegraded();
      });
    } else {
      _checkDegraded();
    }
  }

  void _checkDegraded() {
    if (_entry?.kind != AnimKind.lottie || _manifest?.fileFor(widget.slot, dark: false) == null) return;
    AnimDegradeStore.isDegraded(widget.slot).then((d) {
      if (mounted) setState(() => _degraded = d);
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _tickers = TickerMode.valuesOf(context).enabled;
    _motionOff = AppMotion.reduced(context) || DevicePerf.tier.isLow;
    _dark = Theme.of(context).brightness == Brightness.dark;
    _sync();
  }

  @override
  void didUpdateWidget(AnimationSlot old) {
    super.didUpdateWidget(old);
    if (old.slot != widget.slot) {
      _reset();
      _checkDegraded();
    }
    _sync();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    _sync();
  }

  void _onGate() => _sync(steal: false);

  void _reset() {
    _stop();
    _progress.value = 0;
    _fade.value = 0;
    _ready = _faded = _finished = false;
    _degraded = null;
  }

  void _onLoaded(LottieComposition c) {
    _progress.duration = c.duration;
    // Эхний кадр зурагдсаны дараа солино (poster → анимац).
    SchedulerBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _ready) return;
      setState(() => _ready = true);
      _fade.forward().whenComplete(() {
        if (mounted && _fade.isCompleted) setState(() => _faded = true);
      });
      _sync();
    });
  }

  /// Тоглуулах/зогсоох шийдвэр. [steal] — шинээр харагдсан давталттай слот бусдыг зогсооно.
  void _sync({bool steal = true}) {
    final entry = _entry;
    final want = _ready && _canPlay && widget.active && _foreground && _tickers && !_finished;
    if (!want || entry == null) {
      _stop();
      return;
    }
    if (entry.loop) {
      if (!steal && !AnimLoopGate.isFree(_token)) {
        _stop();
        return;
      }
      AnimLoopGate.claim(_token);
      _claimed = true;
      if (!_progress.isAnimating) _progress.repeat();
    } else if (!_progress.isAnimating) {
      _progress.forward().whenComplete(() {
        if (mounted && _progress.isCompleted) {
          _finished = true;
          _stop();
        }
      });
    }
    _watchFrames();
  }

  void _stop() {
    if (_progress.isAnimating) _progress.stop();
    _unwatchFrames();
    if (_claimed) {
      _claimed = false;
      AnimLoopGate.release(_token);
    }
  }

  void _watchFrames() {
    if (_monitor != null) return;
    _monitor = FrameBudgetMonitor();
    SchedulerBinding.instance.addTimingsCallback(_onTimings);
  }

  void _unwatchFrames() {
    if (_monitor == null) return;
    _monitor = null;
    SchedulerBinding.instance.removeTimingsCallback(_onTimings);
  }

  void _onTimings(List<FrameTiming> timings) {
    final m = _monitor;
    if (m == null || !mounted) return;
    for (final t in timings) {
      if (m.add(t.totalSpan, t.timestampInMicroseconds(FramePhase.vsyncStart))) {
        _stop();
        unawaited(AnimDegradeStore.mark(widget.slot));
        setState(() => _degraded = true);
        return;
      }
    }
  }

  @override
  void dispose() {
    // Эхлээд сонсохоо болино — эс бөгөөс өөрийн чөлөөлөлтөөр дахин эзэмшинэ.
    AnimLoopGate.owner.removeListener(_onGate);
    _stop();
    WidgetsBinding.instance.removeObserver(this);
    _progress.dispose();
    _fade.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final m = _manifest;
    final file = _file;
    final poster = m?.posterFor(widget.slot, dark: _dark);
    if (m == null || (file == null && poster == null)) return widget.fallback;

    final posterView = poster == null
        ? widget.fallback
        : Image.asset(
            poster,
            fit: widget.fit,
            excludeFromSemantics: true,
            gaplessPlayback: true,
            errorBuilder: (_, _, _) => widget.fallback,
          );
    Widget child = posterView;
    if (_canPlay) {
      final lottie = Lottie.asset(
        file!,
        key: ValueKey(file),
        controller: _progress,
        frameRate: AnimationSlot.frameRate,
        fit: widget.fit,
        onLoaded: _onLoaded,
        errorBuilder: (_, _, _) => const SizedBox.shrink(),
      );
      child = _faded
          ? lottie
          : Stack(
              fit: StackFit.expand,
              children: [
                posterView,
                FadeTransition(opacity: _fade, child: lottie),
              ],
            );
    }
    final w = widget.width ?? widget.size;
    final h = widget.height ?? widget.size;
    final sized = SizedBox(
      width: w,
      height: h,
      child: RepaintBoundary(child: child),
    );
    final label = widget.semanticLabel;
    return label == null ? ExcludeSemantics(child: sized) : Semantics(label: label, image: true, child: sized);
  }
}

/// Нэг удаад нэг давталттай слот: шинээр харагдсан нь эзэмшиж, өмнөх нь зогсоно; чөлөөлөгдвөл
/// хүлээж байсан нь үргэлжилнэ. Нэвтрэх hero-гийн видео ч энэ хаалгаар явна.
abstract final class AnimLoopGate {
  static final owner = ValueNotifier<Object?>(null);

  static bool isFree(Object token) => owner.value == null || identical(owner.value, token);

  static void claim(Object token) => owner.value = token;

  static void release(Object token) {
    if (identical(owner.value, token)) owner.value = null;
  }
}

/// 2с-ийн цонхонд 16мс-ээс удаан кадрын хувийг тоолно (цэвэр, тесттэй).
class FrameBudgetMonitor {
  FrameBudgetMonitor({
    this.window = const Duration(seconds: 2),
    this.budget = const Duration(milliseconds: 16),
    this.maxSlowRatio = 0.15,
    this.minFrames = 20,
  });

  final Duration window;
  final Duration budget;
  final double maxSlowRatio;

  /// Цөөн кадраар (жишээ нь анимац эхлэх мөчийн нэг удаагийн саатал) дүгнэхгүй.
  final int minFrames;

  int? _startUs;
  int _total = 0;
  int _slow = 0;

  /// Цонх дуусахад удаан бол true.
  bool add(Duration span, int timestampUs) {
    final start = _startUs ??= timestampUs;
    _total++;
    if (span > budget) _slow++;
    if (timestampUs - start < window.inMicroseconds) return false;
    final bad = _total >= minFrames && _slow / _total > maxSlowRatio;
    _startUs = null;
    _total = _slow = 0;
    return bad;
  }
}

/// Удаан гэж тэмдэглэсэн слот (дараагийн нээлтэд ч poster). Хувийн мэдээлэл биш — SharedPreferences.
abstract final class AnimDegradeStore {
  static const prefix = 'anim.degraded.';
  static final _memo = <AnimSlot, bool>{};

  static Future<bool> isDegraded(AnimSlot slot) async {
    final known = _memo[slot];
    if (known != null) return known;
    try {
      return _memo[slot] = (await SharedPreferences.getInstance()).getBool('$prefix${slot.key}') ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<void> mark(AnimSlot slot) async {
    _memo[slot] = true;
    try {
      await (await SharedPreferences.getInstance()).setBool('$prefix${slot.key}', true);
    } catch (_) {}
  }

  @visibleForTesting
  static void debugReset() => _memo.clear();
}

/// `EmptyState` / `ErrorState`-ийн `art`-д өгөх бэлэн слотууд (`art: AnimArt.emptyHomework`).
/// Файл байхгүй бол дүрс яг хэвээр.
abstract final class AnimArt {
  static const size = 160.0;

  static Widget emptyHomework(Widget icon) => AnimationSlot(slot: AnimSlot.emptyHomework, size: size, fallback: icon);

  static Widget emptyNotifications(Widget icon) =>
      AnimationSlot(slot: AnimSlot.emptyNotifications, size: size, fallback: icon);

  static Widget offline(Widget icon) => AnimationSlot(slot: AnimSlot.offline, size: size, fallback: icon);
}
