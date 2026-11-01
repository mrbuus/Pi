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
