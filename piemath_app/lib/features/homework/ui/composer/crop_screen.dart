import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/files/files.dart';
import '../../../../core/ui/ui.dart';
import '../../data/photo_processor.dart';
import '../../domain/photo_quality.dart';

/// Тайрах алхмын үр дүн.
sealed class CropOutcome {
  const CropOutcome();
}

/// Зураг (тайрсан эсвэл анхных) хадгалагдсан.
class CropApplied extends CropOutcome {
  const CropApplied(this.page);
  final PhotoPage page;
}

/// Хэрэглэгч «Дахин авах» сонгосон.
class CropRetake extends CropOutcome {
  const CropRetake();
}

/// Дэвтрийн хуудсыг тайрах дэлгэц: A4 хүрээг хуруугаар чирж тохируулна, гадна тал бүдгэрнэ.
/// Зураг бүдэг бол дээр нь «Дахин авах» санал гарна (хүлээж авахыг хориглохгүй).
class CropScreen extends ConsumerStatefulWidget {
  const CropScreen({super.key, required this.page, this.blurry = false});

  final PhotoPage page;
  final bool blurry;

  static Future<CropOutcome?> open(BuildContext context, {required PhotoPage page, bool blurry = false}) =>
      Navigator.of(context).push<CropOutcome>(
        MaterialPageRoute(
          fullscreenDialog: true,
          builder: (_) => CropScreen(page: page, blurry: blurry),
        ),
      );

  @override
  ConsumerState<CropScreen> createState() => _CropScreenState();
}

class _CropScreenState extends ConsumerState<CropScreen> {
  late PhotoPage _page = widget.page;
  CropRect _rect = CropRect.full;
  CropHandle? _active;
  (int, int)? _size;
  bool _saving = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _loadSize();
  }

  Future<void> _loadSize() async {
    final s = await ref.read(photoProcessorProvider).sizeOf(widget.page.bytes);
    if (!mounted) return;
    setState(() {
      _size = s;
      _failed = s == null;
    });
  }

  /// Харагдах харьцаа (эргүүлэлтийг тооцсон).
  double get _aspect {
    final s = _size!;
    final sideways = _page.rotation % 180 != 0;
    return sideways ? s.$2 / s.$1 : s.$1 / s.$2;
  }

  void _rotate() => setState(() {
    _page = _page.rotated();
    _rect = CropRect.full;
  });

  Future<void> _apply() async {
    if (_rect.isFull) {
      Navigator.of(context).pop(CropApplied(_page));
      return;
    }
    setState(() => _saving = true);
    try {
      final out = await ref.read(photoProcessorProvider).crop(_page, _rect);
      if (mounted) Navigator.of(context).pop(CropApplied(out));
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('Зургийг тайрч чадсангүй. Бүтнээр нь үлдээх эсвэл дахин оролдоно уу.')),
      );
    }
  }

  CropHandle? _hit(Offset p, Rect box) {
    // Хуруугаар барихад 48dp талбай.
    const slop = 24.0;
    final r = Rect.fromLTRB(
      box.left + _rect.left * box.width,
      box.top + _rect.top * box.height,
      box.left + _rect.right * box.width,
      box.top + _rect.bottom * box.height,
    );
    bool near(double a, double b) => (a - b).abs() <= slop;
    final nl = near(p.dx, r.left), nr = near(p.dx, r.right), nt = near(p.dy, r.top), nb = near(p.dy, r.bottom);
    if (nl && nt) return CropHandle.topLeft;
    if (nr && nt) return CropHandle.topRight;
    if (nl && nb) return CropHandle.bottomLeft;
    if (nr && nb) return CropHandle.bottomRight;
    final inX = p.dx > r.left - slop && p.dx < r.right + slop;
    final inY = p.dy > r.top - slop && p.dy < r.bottom + slop;
    if (nt && inX) return CropHandle.top;
    if (nb && inX) return CropHandle.bottom;
    if (nl && inY) return CropHandle.left;
    if (nr && inY) return CropHandle.right;
    if (r.contains(p)) return CropHandle.move;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(AppIcons.close),
          tooltip: AppStrings.close,
          onPressed: _saving ? null : () => Navigator.of(context).pop(),
        ),
        title: const Text('Хуудсаа тайрах'),
      ),
      body: Column(
        children: [
          if (widget.blurry)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
              child: _BlurNotice(onRetake: _saving ? null : () => Navigator.of(context).pop(const CropRetake())),
            ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(AppSpace.gutter),
              child: _size == null
                  ? Center(
                      child: _failed
                          ? Text('Зургийг нээж чадсангүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
                          : const CircularProgressIndicator(),
                    )
                  : LayoutBuilder(
                      builder: (context, cons) {
                        final maxW = cons.maxWidth, maxH = cons.maxHeight;
                        var w = maxW, h = maxW / _aspect;
                        if (h > maxH) {
                          h = maxH;
                          w = maxH * _aspect;
                        }
                        final box = Rect.fromLTWH((maxW - w) / 2, (maxH - h) / 2, w, h);
                        return Semantics(
                          label: 'Тайрах хүрээ. Булан болон ирмэгийг чирж тохируулна',
                          child: GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onPanStart: (d) => _active = _hit(d.localPosition, box),
                            onPanUpdate: (d) {
                              final handle = _active;
                              if (handle == null || _saving) return;
                              setState(
                                () => _rect = _rect.drag(handle, d.delta.dx / box.width, d.delta.dy / box.height),
                              );
                            },
                            onPanEnd: (_) => _active = null,
                            onPanCancel: () => _active = null,
                            child: Stack(
                              children: [
                                Positioned.fromRect(
                                  rect: box,
                                  child: RotatedBox(
                                    quarterTurns: _page.rotation ~/ 90,
                                    child: Image.memory(_page.bytes, fit: BoxFit.fill, gaplessPlayback: true),
                                  ),
                                ),
                                Positioned.fill(
                                  child: CustomPaint(
                                    painter: _CropPainter(
                                      box: box,
                                      rect: _rect,
                                      dim: c.ink.withValues(alpha: 0.55),
                                      frame: c.surface,
                                      handle: c.surface,
                                      handleEdge: c.brand,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.md),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Эргүүлэх',
                    icon: const Icon(AppIcons.rotate),
                    onPressed: _size == null || _saving ? null : _rotate,
                  ),
                  TextButton(
                    onPressed: _size == null || _saving || _rect.isFull
                        ? null
                        : () => setState(() => _rect = CropRect.full),
                    child: const Text('Бүтэн'),
                  ),
                  const Spacer(),
                  FilledButton.icon(
                    onPressed: _size == null || _saving ? null : _apply,
                    icon: _saving
                        ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(AppIcons.check, size: 18),
                    label: Text(_rect.isFull ? 'Болсон' : 'Тайрах'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Бүдэг зургийн зөвлөмж — хүлээж авахыг хориглохгүй.
class _BlurNotice extends StatelessWidget {
  const _BlurNotice({required this.onRetake});

  final VoidCallback? onRetake;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.xs, AppSpace.xs, AppSpace.xs),
        decoration: BoxDecoration(
          border: Border.all(color: c.line),
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Row(
          children: [
            Icon(AppIcons.warning, size: 18, color: c.warning),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              child: Text(
                'Зураг бүдэг харагдаж байна. Ойртуулж, гэрэлтэй газар дахин авбал багш уншихад амар',
                style: context.text.bodySmall,
              ),
            ),
            TextButton(onPressed: onRetake, child: const Text('Дахин авах')),
          ],
        ),
      ),
    );
  }
}

class _CropPainter extends CustomPainter {
  _CropPainter({
    required this.box,
    required this.rect,
    required this.dim,
    required this.frame,
    required this.handle,
    required this.handleEdge,
  });

  final Rect box;
  final CropRect rect;
  final Color dim;
  final Color frame;
  final Color handle;
  final Color handleEdge;

  @override
  void paint(Canvas canvas, Size size) {
    final r = Rect.fromLTRB(
      box.left + rect.left * box.width,
      box.top + rect.top * box.height,
      box.left + rect.right * box.width,
      box.top + rect.bottom * box.height,
    );
    final outside = Path.combine(PathOperation.difference, Path()..addRect(box), Path()..addRect(r));
    canvas.drawPath(outside, Paint()..color = dim);
    canvas.drawRect(
      r,
      Paint()
        ..color = frame
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
    final fill = Paint()..color = handle;
    final edge = Paint()
      ..color = handleEdge
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    for (final p in [r.topLeft, r.topRight, r.bottomLeft, r.bottomRight]) {
      canvas.drawCircle(p, 9, fill);
      canvas.drawCircle(p, 9, edge);
    }
  }

  @override
  bool shouldRepaint(_CropPainter old) =>
      old.box != box || old.rect != rect || old.dim != dim || old.frame != frame || old.handle != handle;
}
