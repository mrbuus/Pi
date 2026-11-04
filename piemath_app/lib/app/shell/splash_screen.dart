import 'package:flutter/material.dart';

import '../../core/ui/ui.dart';

/// Апп асахад хадгалсан нэвтрэлтийг шалгах зуур (ихэвчлэн хором).
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            BrandMark(logoSize: 56),
            SizedBox(height: AppSpace.xxl),
            SizedBox.square(dimension: 24, child: CircularProgressIndicator(strokeWidth: 2.5)),
          ],
        ),
      ),
    );
  }
}
