import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import '../../core/ui/ui.dart';

/// Апп нээгдэх үеийн логоны анимац (эзэн 2026-11-14, 2-р хувилбар). Бүх бүрэлдэхүүн гарч ирэхдээ шууд
/// жинхэнэ өнгөөрөө (хар хөх [LogoInk.navy], цагаан) — бүдгэрүүлэх, саарал болгох алхам огт байхгүй:
///
/// 1. Хар хөх дугуй дангаараа дэлгэцийн голд — системийн эхний цонхтой (`splash-disc.png`) яг ижил кадр.
/// 2. Цагаан гэрлийн цэг хязгааргүйн тэмдгийн замаар нэг эргэж, ардаа жинхэнэ тэмдгийг ил гаргана.
/// 3. Язгуурын тэмдэг зүүн богино сүүлээс → хонхор → дээд урт шугам хүртэл нэг зурлагаар ил гарна.
/// 4. Дугуй баруун тийш эцсийн байрлалдаа шилжиж (бага зэрэг давж буцна), бичвэр зүүнээс баруун тийш
///    налуу ирмэгээр бичигдэнэ.
/// 5. Бүтэн лого (вэбийн `logo-full.png`-тэй давхцана) хэсэг зогсож, [onDone].
///
/// Давхарга бүр жинхэнэ логоноос задалсан (`make_branding.py intro`), дугуйг кодоор зурна — эхний кадрт
/// зураг ачаалахыг хүлээхгүй. Хөдөлгөөн багасгах тохиргоотой бол шууд бүтэн лого. Товшвол алгасна.
class BrandIntro extends StatefulWidget {
  const BrandIntro({super.key, this.width = canvasWidth, this.onDone});

  /// Бүтэн логоны өргөн (pt). Давхаргууд 4x (1120px) — өөрчилбөл `make_branding.py intro`-г дахин ажиллуул.
  static const canvasWidth = 280.0;

  /// Давхаргын зургийн координат (px) — жинхэнэ логоны хүрээ.
  static const canvas = Size(1120, 469);

  static const aspect = 1120 / 469;

  static const duration = Duration(milliseconds: 1900);

  /// Зураг ачаалагдахгүй удвал (сул төхөөрөмж) анимацыг үүнээс хойш хүлээлгүй эхлүүлнэ.
  static const loadTimeout = Duration(milliseconds: 350);

  static const layers = [
    'assets/brand/intro/wordmark.png',
    'assets/brand/intro/text-on-disc.png',
    'assets/brand/intro/root.png',
    'assets/brand/intro/infinity.png',
  ];

  final double width;
  final VoidCallback? onDone;

  @override
  State<BrandIntro> createState() => _BrandIntroState();
}

class _BrandIntroState extends State<BrandIntro> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: BrandIntro.duration);
  final _infos = List<ImageInfo?>.filled(BrandIntro.layers.length, null);
  final _streams = <(ImageStream, ImageStreamListener)>[];
  Timer? _timeout;
  int _pending = BrandIntro.layers.length;
  bool _started = false;
  bool _running = false;
  bool _done = false;

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
    // Давхаргыг нэг удаа задалж санах ойд барина — кадр бүрт шинэ зураг үүсгэхгүй.
    final config = createLocalImageConfiguration(context);
    for (var i = 0; i < BrandIntro.layers.length; i++) {
      final stream = AssetImage(BrandIntro.layers[i]).resolve(config);
      late final ImageStreamListener listener;
      listener = ImageStreamListener((info, _) {
        if (!mounted) return info.dispose();
        final first = _infos[i] == null;
        setState(() {
          _infos[i]?.dispose();
          _infos[i] = info;
        });
        if (first) _loaded();
      }, onError: (_, _) => _loaded());
      stream.addListener(listener);
      _streams.add((stream, listener));
    }
    if (AppMotion.reduced(context)) {
      _c.value = 1;
      WidgetsBinding.instance.addPostFrameCallback((_) => _finish());
      return;
    }
    _timeout = Timer(BrandIntro.loadTimeout, _run);
  }

  void _loaded() {
    if (--_pending <= 0) _run();
  }

  void _run() {
    _timeout?.cancel();
    if (_running || _done || !mounted) return;
    _running = true;
    unawaited(_c.forward());
  }

  void _finish() {
    if (_done) return;
    _done = true;
    _timeout?.cancel();
    widget.onDone?.call();
  }

  void _skip() {
    _c.value = 1;
    _finish();
  }

  @override
  void dispose() {
    _timeout?.cancel();
    for (final (stream, listener) in _streams) {
      stream.removeListener(listener);
    }
    for (final info in _infos) {
      info?.dispose();
    }
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final w = widget.width;
    return Semantics(
      label: AppStrings.orgName,
      image: true,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: _skip,
        child: RepaintBoundary(
          child: CustomPaint(
            size: Size(w, w / BrandIntro.aspect),
            painter: _IntroPainter(
              progress: _c,
              images: [for (final info in _infos) info?.image],
              ink: dark ? LogoInk.paper : LogoInk.navy,
            ),
          ),
        ),
      ),
    );
  }
}

/// Давхаргын байрлал (зургийн px) — `make_branding.py intro`-гийн хэвлэсэн offset.
const _offsets = [Offset.zero, Offset(627, 3), Offset(641, 2), Offset(906, 250)];

/// Логоны дугуй — бага зэрэг өргөн эллипс (жинхэнэ логоноос тааруулсан).
final _disc = Rect.fromCenter(center: const Offset(866.53, 234.69), width: 2 * 238.98, height: 2 * 233.39);

/// Хязгааргүйн тэмдгийн төв шугам (зургийн px): төвөөс баруун дээш → баруун гогцоо → төв → зүүн гогцоо.
/// Зураасны дундаж цэгүүдээс хэмжсэн, Catmull-Rom-оор зөөллөнө.
const _infinityPoints = [
  Offset(982, 284.5), Offset(988, 270.5), Offset(996, 264.9), Offset(1004, 259.2), Offset(1012, 255), //
  Offset(1020, 253), Offset(1029, 260), Offset(1036, 272), Offset(1041.5, 284), Offset(1036, 296), //
  Offset(1029, 308), Offset(1021, 315.6), Offset(1012, 313.9), Offset(1004, 310), Offset(996, 304), //
  Offset(988, 298.4), Offset(982, 284.5), Offset(968, 277), Offset(960, 270.7), Offset(952, 267), //
  Offset(942, 255), Offset(936, 254.5), Offset(928, 258.5), Offset(921, 265), Offset(916, 273), //
  Offset(913.5, 285), Offset(916, 297), Offset(921, 304.5), Offset(928, 311), Offset(936, 314.6), //
  Offset(943, 314), Offset(952, 301.8), Offset(960, 297.9), Offset(968, 291.8),
];

/// Язгуурын тэмдэг: зүүн сүүл → хонхор → дээд шугамын эхлэл → баруун үзүүр.
const _rootPoints = [
  Offset(665, 320),
  Offset(820, 321.6),
  Offset(847.5, 421),
  Offset(898.5, 175.5),
  Offset(1121, 174.5),
];

final ui.PathMetric _infinity = _closedSpline(_infinityPoints).computeMetrics().first;
final ui.PathMetric _root = (Path()..addPolygon(_rootPoints, false)).computeMetrics().first;

Path _closedSpline(List<Offset> p) {
  final n = p.length;
  final path = Path()..moveTo(p[0].dx, p[0].dy);
  for (var i = 0; i < n; i++) {
    final p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    final c1 = p1 + (p2 - p0) / 6;
    final c2 = p2 - (p3 - p1) / 6;
    path.cubicTo(c1.dx, c1.dy, c2.dx, c2.dy, p2.dx, p2.dy);
  }
  return path..close();
}

class _IntroPainter extends CustomPainter {
  _IntroPainter({required this.progress, required this.images, required this.ink}) : super(repaint: progress);

  final Animation<double> progress;
  final List<ui.Image?> images;
  final Color ink;

  /// Зураг бүрт нэг shader (painter нь зураг ачаалагдах үед л шинэчлэгдэнэ, кадр бүрт биш).
  final _shaders = <int, ImageShader>{};

  // Хуваарь (0–1 = 1.9с): тэмдэг → язгуур → дугуй шилжих → бичвэр → 285мс зогсолт.
  static const _drawInfinity = Interval(0.06, 0.38, curve: Curves.easeInOutSine);
  static const _drawRoot = Interval(0.36, 0.54, curve: Curves.easeInOutCubic);
  static const _move = Interval(0.50, 0.72, curve: Cubic(0.34, 1.3, 0.64, 1));
  static const _write = Interval(0.58, 0.85, curve: Curves.easeInOutCubic);

  /// Бичвэрийн налуу ирмэг (px): дээд тал нь доод талаасаа түрүүлнэ — бийрийн зурлага шиг.
  static const _slant = 70.0;
  static const _textRight = 850.0;

  @override
  void paint(Canvas canvas, Size size) {
    final t = progress.value;
    canvas
      ..save()
      ..scale(size.width / BrandIntro.canvas.width);
    // Эхний кадрт дугуйн төв = зургийн төв (дэлгэцийн гол), дараа нь эцсийн байрлал руу.
    final start = BrandIntro.canvas.center(Offset.zero) - _disc.center;
    final shift = start * (1 - _move.transform(t));
    canvas.drawOval(_disc.shift(shift), Paint()..color = LogoInk.navy);

    final write = _write.transform(t);
    if (write > 0) {
      canvas.save();
      if (write < 1) {
        final f = -_slant - 4 + (_textRight + _slant + 8) * write;
        canvas.clipPath(
          Path()..addPolygon([
            const Offset(-10, -10),
            Offset(f + _slant, -10),
            Offset(f, BrandIntro.canvas.height + 10),
            Offset(-10, BrandIntro.canvas.height + 10),
          ], true),
        );
      }
      _layer(canvas, 0, ink);
      _layer(canvas, 1, LogoInk.paper);
      canvas.restore();
    }

    canvas.translate(shift.dx, shift.dy);
    _reveal(canvas, 2, _root, _drawRoot.transform(t), 40);
    final inf = _drawInfinity.transform(t);
    _reveal(canvas, 3, _infinity, inf, 28);
    if (inf > 0 && inf < 1) _spark(canvas, _infinity.length * inf);
    canvas.restore();
  }

  Rect? _rect(int i) {
    final img = images[i];
    if (img == null) return null;
    return _offsets[i] & Size(img.width.toDouble(), img.height.toDouble());
  }

  Paint _tint(Color color) => Paint()
    ..colorFilter = ColorFilter.mode(color, BlendMode.srcIn)
    ..filterQuality = FilterQuality.medium;

  void _layer(Canvas canvas, int i, Color color) {
    final dst = _rect(i);
    if (dst == null) return;
    final img = images[i]!;
    canvas.drawImageRect(img, Offset.zero & dst.size, dst, _tint(color));
  }

  /// Жинхэнэ давхаргыг замын дагуу [p] хүртэл ил гаргана: зурлага нь давхаргын зургийг (shader) л будна,
  /// өөрийн гэсэн хэлбэр, өнгөгүй — логоноос зөрөхгүй.
  void _reveal(Canvas canvas, int i, ui.PathMetric path, double p, double width) {
    if (p <= 0) return;
    if (p >= 1) return _layer(canvas, i, LogoInk.paper);
    final img = images[i];
    if (img == null) return;
    final shader = _shaders[i] ??= ImageShader(
      img,
      TileMode.decal,
      TileMode.decal,
      Matrix4.translationValues(_offsets[i].dx, _offsets[i].dy, 0).storage,
      filterQuality: FilterQuality.medium,
    );
    canvas.drawPath(
      path.extractPath(0, path.length * p),
      _tint(LogoInk.paper)
        ..shader = shader
        ..style = PaintingStyle.stroke
        ..strokeWidth = width
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  /// Гэрлийн цэг: цагаан дугуй толгой + нарийссаар алга болох богино цагаан мөр.
  void _spark(Canvas canvas, double at) {
    const trail = 64.0;
    const parts = 6;
    final paint = Paint()
      ..color = LogoInk.paper
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    for (var k = 0; k < parts; k++) {
      final from = at - trail * (k + 1) / parts;
      final to = at - trail * k / parts;
      if (to <= 0) break;
      paint.strokeWidth = 7 - 5.5 * k / (parts - 1);
      canvas.drawPath(_infinity.extractPath(from < 0 ? 0 : from, to), paint);
    }
    final head = _infinity.getTangentForOffset(at)!.position;
    canvas.drawCircle(head, 6.5, Paint()..color = LogoInk.paper);
  }

  @override
  bool shouldRepaint(_IntroPainter old) => old.ink != ink || !_same(old.images, images);

  static bool _same(List<ui.Image?> a, List<ui.Image?> b) {
    for (var i = 0; i < a.length; i++) {
      if (!identical(a[i], b[i])) return false;
    }
    return true;
  }
}
