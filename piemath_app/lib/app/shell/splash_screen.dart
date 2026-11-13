import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/ui/ui.dart';
import 'brand_intro.dart';

/// Логоны анимац дууссан эсэх — хадгалсан нэвтрэлт сэргэсэн ч анимац дуустал эхлэх дэлгэц үлдэнэ
/// (`bootstrap` → `SessionController.restore(notBefore:)`). Апп асахад нэг л удаа.
final brandIntroDone = Completer<void>();

/// Апп асахад: логоны анимац ([BrandIntro]) — бичвэр → дугуй → бүтэн лого (эзэн 2026-11-14). Системийн эхний
/// цонх (`flutter_native_splash.yaml`) бичвэрийг яг ижил байрлал, хэмжээ, дэвсгэртэй харуулдаг тул шилжилт
/// анзаарагдахгүй. Нэвтрэлт шалгах нь удвал (сүлжээ муу) л доор нь жижиг ачааллын тэмдэг гарна.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  /// Энэ хугацаанаас богино ачаалалд эргэлдэх тэмдэг харуулахгүй (анивчихгүй).
  static const spinnerDelay = Duration(milliseconds: 1800);

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
    final screen = MediaQuery.sizeOf(context).width;
    final width = screen - 2 * AppSpace.gutter < BrandIntro.canvasWidth
        ? screen - 2 * AppSpace.gutter
        : BrandIntro.canvasWidth;
    return Scaffold(
      body: Stack(
        alignment: Alignment.center,
        children: [
          // Лого яг дэлгэцийн голд — системийн эхний цонхтой ижил цэг.
          Center(
            child: BrandIntro(
              width: width,
              onDone: () {
                if (!brandIntroDone.isCompleted) brandIntroDone.complete();
              },
            ),
          ),
          Align(
            alignment: const Alignment(0, 0.45),
            child: SizedBox.square(
              dimension: 24,
              child: AnimatedOpacity(
                opacity: _slow ? 1 : 0,
                duration: AppMotion.base,
                child: const CircularProgressIndicator(strokeWidth: 2.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
