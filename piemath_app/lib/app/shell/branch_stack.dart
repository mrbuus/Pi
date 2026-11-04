import 'package:flutter/widgets.dart';

import '../../core/ui/ui.dart';

/// Доод табын салбаруудыг (branch navigator) зэрэг хадгалж, идэвхтэйг нь харуулна — IndexedStack шиг,
/// гэхдээ солиход богино «fade-through» (гарах нь бүдгэрнэ, орох нь бүдгэрч + 0.96 → 1 томорно, нийт 200ms).
///
/// - Салбар бүр өөрийн байрлалд тогтвортой (widget мод өөрчлөгдөхгүй) — state, гүйлгэлт алдагдахгүй,
///   дахин build/ачаалал үгүй.
/// - Идэвхгүй салбар: `Offstage` (зурагдахгүй), `TickerMode` унтраастай, хүрэлт, semantics-гүй.
/// - Зөвхөн transform + opacity (`FadeTransition`, `ScaleTransition`), `RepaintBoundary` дотор —
///   хөдөлгөөний үед хуудсыг дахин зурахгүй, давхаргыг л холино.
/// - Хөдөлгөөн багасгах горим, сул төхөөрөмж: шууд солино.
class BranchStack extends StatefulWidget {
  const BranchStack({super.key, required this.currentIndex, required this.children});

  final int currentIndex;
  final List<Widget> children;

  static const duration = Duration(milliseconds: 200);

  /// Гарах хуудас эхний 35%-д бүдгэрч алга болно, дараа нь орох хуудас гарч ирнэ.
  static const outEnd = 0.35;
  static const scaleFrom = 0.96;

  @override
  State<BranchStack> createState() => _BranchStackState();
}

class _BranchStackState extends State<BranchStack> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: BranchStack.duration, value: 1);
  late final Animation<double> _fadeIn = _c.drive(
    CurveTween(curve: const Interval(BranchStack.outEnd, 1, curve: AppEasing.decelerate)),
  );
  late final Animation<double> _scaleIn = _c.drive(
    Tween<double>(
      begin: BranchStack.scaleFrom,
      end: 1,
    ).chain(CurveTween(curve: const Interval(BranchStack.outEnd, 1, curve: AppEasing.decelerate))),
  );
  late final Animation<double> _fadeOut = _c.drive(
    Tween<double>(begin: 1, end: 0).chain(CurveTween(curve: const Interval(0, BranchStack.outEnd))),
  );

  /// Бүдгэрч гарч буй салбар (хөдөлгөөн дуусахад null).
  int? _leaving;

  @override
  void didUpdateWidget(BranchStack old) {
    super.didUpdateWidget(old);
    if (old.currentIndex == widget.currentIndex) return;
    if (decorativeMotionOff(context)) {
      _leaving = null;
      _c.value = 1;
      return;
    }
    _leaving = old.currentIndex;
    _c.forward(from: 0).whenCompleteOrCancel(() {
      if (mounted) setState(() => _leaving = null);
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(fit: StackFit.expand, children: [for (var i = 0; i < widget.children.length; i++) _branch(i)]);
  }

  Widget _branch(int i) {
    final active = i == widget.currentIndex;
    final leaving = i == _leaving;
    return Offstage(
      offstage: !active && !leaving,
      child: TickerMode(
        enabled: active,
        child: IgnorePointer(
          ignoring: !active,
          child: ExcludeSemantics(
            excluding: !active,
            child: FadeTransition(
              opacity: active ? _fadeIn : (leaving ? _fadeOut : kAlwaysCompleteAnimation),
              child: ScaleTransition(
                scale: active ? _scaleIn : kAlwaysCompleteAnimation,
                child: RepaintBoundary(child: widget.children[i]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
