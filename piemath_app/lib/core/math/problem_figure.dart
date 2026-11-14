import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../ui/icons.dart';
import '../ui/motion.dart';
import '../ui/skeleton.dart';
import '../ui/strings.dart';
import '../ui/tokens.dart';

/// Бодлогын зургийн байрлал.
enum ProblemFigureVariant {
  /// Шалгалтын дэлгэц: утсанд зураг дээр, бичвэр доор; таблетад (768dp ба түүнээс өргөн) хажуугаар
  /// (зураг ~42%), өргөн зураг (харьцаа 1.6-аас их) үргэлж бүтэн өргөнөөр (вэбийн `adaptive`).
  adaptive,

  /// Бодлогын сан: нөхцөл → тогтмол өндөртэй зургийн хүрээ (вэбийн `stacked`).
  stacked,
}

/// Геометрийн зураг/график бүхий бодлого (вэбийн `components/ProblemFigure.tsx`).
///
/// - Зургийг [image]-ээр (нэвтрэлттэй ачаалагчийг `core/network` өгнө) — энд сүлжээ мэдэхгүй.
/// - Ачаалж байхад skeleton; 403 бол «эвдэрсэн» биш, тайван тайлбар (жишээ: шалгалт эхлээгүй
///   сурагчид шалгалтын зураг, ARCHITECTURE §4); бусад алдаанд «Дахин оролдох».
/// - Дарахад бүтэн дэлгэцэд томруулж (чимхэж) харна. «Томруулах», «Зөв» зэрэг илүүц шошгогүй.
/// - Дэлгэцийн өргөнөөр decode хийнэ (сул утсанд том зургийг бүтнээр нь задлахгүй).
class ProblemFigure extends StatefulWidget {
  const ProblemFigure({
    super.key,
    required this.image,
    this.child,
    this.alt,
    this.variant = ProblemFigureVariant.adaptive,
    this.isForbidden = defaultIsForbidden,
    this.forbiddenTitle = 'Зураг одоохондоо хаалттай',
    this.forbiddenMessage = 'Шалгалт эхэлсний дараа энэ зураг харагдана.',
  });

  /// `null` бол зураггүй бодлого — зөвхөн [child].
  final ImageProvider? image;

  /// Бодлогын нөхцөл (ихэвчлэн `MathText`).
  final Widget? child;

  /// Дэлгэц уншигчид зургийн тайлбар.
  final String? alt;
  final ProblemFigureVariant variant;

  /// Алдааг «эрх хараахан нээгдээгүй» (403) гэж ангилах. Өөрийн ачаалагчтай бол дамжуул.
  final bool Function(Object error) isForbidden;
  final String forbiddenTitle;
  final String forbiddenMessage;

  /// `NetworkImage`-ийн 403-ийг танина.
  static bool defaultIsForbidden(Object error) => error is NetworkImageLoadException && error.statusCode == 403;

  @override
  State<ProblemFigure> createState() => _ProblemFigureState();
}

enum _Phase { loading, ready, forbidden, failed }

class _ProblemFigureState extends State<ProblemFigure> {
  ImageStream? _stream;
  ImageStreamListener? _listener;
  ImageInfo? _info;
  _Phase _phase = _Phase.loading;
  ImageProvider? _resolved;

  /// `resolve` дотор шууд (кэшээс) ирсэн эсэх — тэгвэл бүдгэрүүлэхгүй.
  bool _resolvingSync = false;
  bool _fadeIn = false;

  /// Шалгалтын дэлгэцний өндрийн хязгаар (вэб: `max-h-[60vh]`, өргөн зураг `50vh`).
  static const _maxHeightFactor = 0.6;
  static const _wideAspect = 1.6;
  static const _stackedHeight = 224.0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _resolve();
  }

  @override
  void didUpdateWidget(ProblemFigure old) {
    super.didUpdateWidget(old);
    if (old.image != widget.image) _resolve(force: true);
  }

  @override
  void dispose() {
    _detach();
    _info?.dispose();
    super.dispose();
  }

  /// Дэлгэцийн өргөнөөр (px) decode хийх зураг.
  ImageProvider? _decodeTarget() {
    final image = widget.image;
    if (image == null) return null;
    final width = MediaQuery.sizeOf(context).width * MediaQuery.devicePixelRatioOf(context);
    final px = math.min(width, 2048).round();
    return ResizeImage(image, width: px, policy: ResizeImagePolicy.fit, allowUpscaling: false);
  }

  void _resolve({bool force = false}) {
    final target = _decodeTarget();
    if (target == null) {
      _detach();
      return;
    }
    if (!force && target == _resolved) return;
    _resolved = target;
    _detach();
    // didChangeDependencies/didUpdateWidget-ийн дараа build заавал явагдана — setState хэрэггүй.
    _phase = _Phase.loading;
    _info?.dispose();
    _info = null;
    final stream = target.resolve(createLocalImageConfiguration(context));
    final listener = ImageStreamListener(
      (info, sync) {
        if (!mounted) return;
        final immediate = sync || _resolvingSync;
        void apply() {
          _info?.dispose();
          _info = info;
          _fadeIn = !immediate && _phase == _Phase.loading;
          _phase = _Phase.ready;
        }

        // Шууд ирвэл build удахгүй явагдана (didChangeDependencies/didUpdateWidget) — setState хэрэггүй.
        if (_resolvingSync) {
          apply();
        } else {
          setState(apply);
        }
      },
      onError: (error, _) {
        if (!mounted) return;
        setState(() => _phase = widget.isForbidden(error) ? _Phase.forbidden : _Phase.failed);
      },
    );
    _resolvingSync = true;
    stream.addListener(listener);
    _resolvingSync = false;
    _stream = stream;
    _listener = listener;
  }

  void _detach() {
    final s = _stream;
    final l = _listener;
    if (s != null && l != null) s.removeListener(l);
    _stream = null;
    _listener = null;
  }

  Future<void> _retry() async {
    final image = widget.image;
    if (image == null) return;
    await _resolved?.evict();
    await image.evict();
    if (!mounted) return;
    setState(() => _resolve(force: true));
  }

  void _openViewer() {
    final image = widget.image;
    if (image == null || _phase != _Phase.ready) return;
    Navigator.of(context).push(
      PageRouteBuilder<void>(
        opaque: false,
        barrierColor: AppColors.scrim,
        pageBuilder: (context, a, b) => FigureViewer(image: image, alt: widget.alt),
        transitionsBuilder: (context, a, b, child) => FadeTransition(opacity: a, child: child),
        transitionDuration: AppMotion.of(context, AppMotion.base),
      ),
    );
  }

  bool get _wide {
    final img = _info?.image;
    if (img == null) return false;
    return img.width / math.max(1, img.height) >= _wideAspect;
  }

  @override
  Widget build(BuildContext context) {
    if (widget.image == null) return widget.child ?? const SizedBox.shrink();
    final figure = _figureBox(context);
    final child = widget.child;
    if (child == null) return figure;

    if (widget.variant == ProblemFigureVariant.stacked) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          child,
          const SizedBox(height: AppSpace.md),
          figure,
        ],
      );
    }
    return LayoutBuilder(
      builder: (context, constraints) {
        final side = constraints.maxWidth >= AppSizes.tabletBreakpoint && !_wide;
        if (!side) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              figure,
              const SizedBox(height: AppSpace.lg),
              child,
            ],
          );
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            SizedBox(width: constraints.maxWidth * 0.42, child: figure),
            const SizedBox(width: AppSpace.lg),
            Expanded(child: child),
          ],
        );
      },
    );
  }

  Widget _figureBox(BuildContext context) {
    final c = context.colors;
    final stacked = widget.variant == ProblemFigureVariant.stacked;
    final screenH = MediaQuery.sizeOf(context).height;
    final maxH = stacked ? _stackedHeight : screenH * (_wide ? 0.5 : _maxHeightFactor);

    final Widget inner = switch (_phase) {
      _Phase.loading => SkeletonPulse(
        child: SkeletonBox(height: stacked ? _stackedHeight - AppSpace.lg : 180, radius: AppRadius.sm),
      ),
      _Phase.forbidden => _FigureNotice(
        icon: AppIcons.password,
        iconColor: c.inkDim,
        title: widget.forbiddenTitle,
        message: widget.forbiddenMessage,
      ),
      _Phase.failed => _FigureNotice(
        icon: AppIcons.gallery,
        iconColor: c.inkDim,
        title: 'Зураг ачаалагдсангүй',
        message: AppStrings.networkError,
        action: TextButton.icon(
          onPressed: _retry,
          icon: const Icon(AppIcons.retry, size: 18),
          label: const Text(AppStrings.retry),
        ),
      ),
      _Phase.ready => ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxH),
        child: FadeInOnce(
          enabled: _fadeIn,
          child: RawImage(
            image: _info!.image,
            scale: _info!.scale,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.medium,
          ),
        ),
      ),
    };

    final box = Container(
      width: double.infinity,
      height: stacked ? _stackedHeight : null,
      padding: const EdgeInsets.all(AppSpace.sm),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: c.line),
      ),
      child: inner,
    );

    final alt = (widget.alt?.trim().isNotEmpty ?? false) ? widget.alt!.trim() : 'Бодлогын зураг';
    return Semantics(
      image: true,
      button: _phase == _Phase.ready,
      label: alt,
      child: GestureDetector(onTap: _phase == _Phase.ready ? _openViewer : null, child: box),
    );
  }
}

class _FigureNotice extends StatelessWidget {
  const _FigureNotice({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.message,
    this.action,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.lg, horizontal: AppSpace.sm),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 28, color: iconColor),
          const SizedBox(height: AppSpace.sm),
          Text(title, style: context.text.titleSmall, textAlign: TextAlign.center),
          const SizedBox(height: AppSpace.xs),
          Text(message, style: context.text.bodySmall, textAlign: TextAlign.center),
          if (action != null) ...[const SizedBox(height: AppSpace.sm), action!],
        ],
      ),
    );
  }
}

/// Бүтэн дэлгэцийн зураг: хоёр хуруугаар томруулах/чирэх, хоёр товшиж анхны хэмжээнд.
class FigureViewer extends StatefulWidget {
  const FigureViewer({super.key, required this.image, this.alt});

  final ImageProvider image;
  final String? alt;

  @override
  State<FigureViewer> createState() => _FigureViewerState();
}

class _FigureViewerState extends State<FigureViewer> {
  final _controller = TransformationController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Stack(
          children: [
            Positioned.fill(
              child: GestureDetector(
                onDoubleTap: () => _controller.value = Matrix4.identity(),
                child: InteractiveViewer(
                  transformationController: _controller,
                  maxScale: 6,
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpace.lg),
                      child: DecoratedBox(
                        decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(AppRadius.md)),
                        child: Padding(
                          padding: const EdgeInsets.all(AppSpace.sm),
                          child: Image(
                            image: widget.image,
                            fit: BoxFit.contain,
                            semanticLabel: widget.alt ?? 'Бодлогын зураг',
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            PositionedDirectional(
              top: AppSpace.sm,
              end: AppSpace.sm,
              child: IconButton.filled(
                tooltip: AppStrings.close,
                style: IconButton.styleFrom(backgroundColor: c.surface, foregroundColor: c.ink),
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(AppIcons.close),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
