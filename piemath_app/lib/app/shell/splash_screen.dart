import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/ui/ui.dart';

/// Апп асахад: бүтэн лого (эзэн 2026-11-14 — «бүтэн лого хамгийн түрүүнд»). Системийн эхний цонх
/// (`flutter_native_splash.yaml`) ижил лого, ижил дэвсгэртэй тул шилжилт анзаарагдахгүй. Хадгалсан
/// нэвтрэлтийг шалгах нь удвал (сүлжээ муу) л доор нь жижиг ачааллын тэмдэг гарна.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  /// Энэ хугацаанаас богино ачаалалд эргэлдэх тэмдэг харуулахгүй (анивчихгүй).
  static const spinnerDelay = Duration(milliseconds: 700);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _slow = false;
  late final Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(SplashScreen.spinnerDelay, () {
      if (mounted) setState(() => _slow = true);
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final width = (MediaQuery.sizeOf(context).width * 0.72).clamp(200.0, 320.0);
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            BrandLogoFull(width: width),
            const SizedBox(height: AppSpace.xxl),
            SizedBox.square(
              dimension: 24,
              child: AnimatedOpacity(
                opacity: _slow ? 1 : 0,
                duration: AppMotion.base,
                child: const CircularProgressIndicator(strokeWidth: 2.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
