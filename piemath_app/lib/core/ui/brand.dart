import 'package:flutter/material.dart';

import 'strings.dart';
import 'tokens.dart';

/// Логоны дугуй тэмдэг. Ард нь цагаан хайрцаг тавихгүй (RULES §3).
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.size = 40});

  final double size;

  @override
  Widget build(BuildContext context) {
    final px = (size * MediaQuery.devicePixelRatioOf(context)).round();
    return Image.asset(
      'assets/brand/logo-circle.png',
      width: size,
      height: size,
      cacheWidth: px,
      semanticLabel: AppStrings.appName,
      filterQuality: FilterQuality.medium,
    );
  }
}

/// Бүтэн лого (дугуй тэмдэг + «Shine ireeduin ezed» бичвэр, вэбийн `LogoMark`). Хар горимд бичвэр нь цагаан
/// хувилбар. Өргөн : өндөр ≈ 2.26 : 1.
class BrandLogoFull extends StatelessWidget {
  const BrandLogoFull({super.key, this.width = 280});

  final double width;

  static const aspect = 840 / 372;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final px = (width * MediaQuery.devicePixelRatioOf(context)).round();
    return Image.asset(
      dark ? 'assets/brand/logo-full-dark.png' : 'assets/brand/logo-full.png',
      width: width,
      height: width / aspect,
      cacheWidth: px,
      semanticLabel: AppStrings.orgName,
      filterQuality: FilterQuality.medium,
      gaplessPlayback: true,
    );
  }
}

/// Лого + «Piemath» + «Шинэ ирээдүйн эзэд».
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.logoSize = 44, this.showOrg = true});

  final double logoSize;
  final bool showOrg;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        ExcludeSemantics(child: BrandLogo(size: logoSize)),
        const SizedBox(width: AppSpace.md),
        Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              AppStrings.appName,
              style: context.text.displaySmall?.copyWith(fontSize: logoSize * 0.5, color: context.colors.logo),
            ),
            if (showOrg) Text(AppStrings.orgName, style: context.text.bodySmall),
          ],
        ),
      ],
    );
  }
}
