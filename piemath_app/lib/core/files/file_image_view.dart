import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../ui/icons.dart';
import '../ui/motion.dart';
import '../ui/skeleton.dart';
import '../ui/tokens.dart';
import 'file_image.dart';

/// Decode-ийн дээд өргөн (px) — том зургийг бүтнээр задалж санах ой дүүргэхгүй.
const kMaxDecodePx = 2048;

/// Харагдах логик өргөнөөр decode хийх зураг (`cacheWidth = logicalWidth * devicePixelRatio`).
/// Өндрийг өгөхгүй — харьцаа хадгалагдана, жижиг зургийг томруулахгүй.
ImageProvider decodeAtWidth(ImageProvider image, double logicalWidth, double devicePixelRatio) {
  final px = math.min((logicalWidth * devicePixelRatio).round(), kMaxDecodePx);
  return ResizeImage(image, width: math.max(px, 1), policy: ResizeImagePolicy.fit, allowUpscaling: false);
}

/// `/files/:key` зураг (жагсаалт, галерей, профайл): гүйлгэхэд гөлгөр байх 3 дүрэм нэг дор —
///
/// 1. Хайрцгийн бодит өргөнөөр decode ([decodeAtWidth]) — 12MP зургийг 4000px-ээр задлахгүй.
/// 2. Тогтвортой layout: [aspectRatio]-тай хайрцаг ачааллаас өмнө зай эзэлнэ (layout үсрэхгүй),
///    ачаалж байхад статик skeleton өнгө.
/// 3. Сүлжээнээс ирсэн зураг 150ms бүдгэрч гарна; кэшээс ирсэн нь шууд.
///
/// Алдаа гарвал (403 г.м.) дүрстэй тайван хайрцаг — дэлгэрэнгүй тайлбар хэрэгтэй бол
/// `ProblemFigure` ашигла.
class FileImageView extends ConsumerWidget {
  const FileImageView(
    this.fileKey, {
    super.key,
    this.aspectRatio = 4 / 3,
    this.fit = BoxFit.cover,
    this.borderRadius = AppRadius.md,
    this.semanticLabel,
  });

  final String fileKey;

  /// Өргөн / өндөр. `null` бол эцгийн өндрийн хязгаарыг дагана (эцэг өндрийг өгөх ёстой).
  final double? aspectRatio;
  final BoxFit fit;
  final double borderRadius;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final source = ref.watch(fileImageProvider).image(fileKey);
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final c = context.colors;
    Widget box = LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.hasBoundedWidth ? constraints.maxWidth : MediaQuery.sizeOf(context).width;
        return Image(
          image: decodeAtWidth(source, w, dpr),
          fit: fit,
          width: double.infinity,
          height: double.infinity,
          gaplessPlayback: true,
          filterQuality: FilterQuality.medium,
          semanticLabel: semanticLabel,
          excludeFromSemantics: semanticLabel == null,
          frameBuilder: (context, child, frame, sync) {
            if (frame == null) return const SkeletonBox(radius: 0);
            return FadeInOnce(enabled: !sync, child: child);
          },
          errorBuilder: (context, _, _) => ColoredBox(
            color: c.surfaceSunken,
            child: Center(child: Icon(AppIcons.gallery, color: c.inkDim)),
          ),
        );
      },
    );
    if (borderRadius > 0) {
      box = ClipRRect(borderRadius: BorderRadius.circular(borderRadius), child: box);
    }
    final ratio = aspectRatio;
    return RepaintBoundary(
      child: ratio == null ? box : AspectRatio(aspectRatio: ratio, child: box),
    );
  }
}
