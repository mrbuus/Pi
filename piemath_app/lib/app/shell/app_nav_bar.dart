import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';

import '../../core/ui/ui.dart';

/// Доод табын нэг товч.
@immutable
class AppNavItem {
  const AppNavItem({required this.icon, required this.label, this.tooltip});

  final Widget icon;

  /// Үргэлж харагдах богино шошго.
  final String label;

  /// Бүтэн нэр (богино шошгоос өөр бол урт дарахад, дэлгэц уншигчид).
  final String? tooltip;
}

/// Утасны доод таб: шошго үргэлж харагдана, сонгогдсон товчны ард цайвар хөх «pill» нэг товчноос
/// нөгөө рүү гулсана (зөвхөн transform, тасалж болох spring). Хатуу өнгө, шилгүй (UX-RESEARCH §5.7).
/// Хүрэх талбай товч бүр бүтэн өргөн, өндөр 64dp.
class AppNavBar extends StatefulWidget {
  const AppNavBar({super.key, required this.items, required this.currentIndex, required this.onTap});

  final List<AppNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  static const height = 64.0;
  static const pillSize = Size(56, 32);

  @override
  State<AppNavBar> createState() => _AppNavBarState();
}

class _AppNavBarState extends State<AppNavBar> with SingleTickerProviderStateMixin {
  // value = pill-ийн байрлал (товчны индексээр, бутархай нь шилжилтийн дунд).
  late final AnimationController _pos = AnimationController.unbounded(
    vsync: this,
    value: widget.currentIndex.toDouble(),
  );

  @override
  void didUpdateWidget(AppNavBar old) {
    super.didUpdateWidget(old);
    final target = widget.currentIndex.toDouble();
    if (_pos.value == target && !_pos.isAnimating) return;
    if (decorativeMotionOff(context)) {
      _pos.value = target;
      return;
    }
    _pos.animateWith(SpringSimulation(AppSprings.standard, _pos.value, target, _pos.velocity));
  }

  @override
  void dispose() {
    _pos.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final n = widget.items.length;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return RepaintBoundary(
      child: Material(
        color: c.surface,
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: c.line, width: 1.5)),
          ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              height: AppNavBar.height,
              child: LayoutBuilder(
                builder: (context, box) {
                  final w = box.maxWidth / n;
                  return Stack(
                    children: [
                      AnimatedBuilder(
                        animation: _pos,
                        builder: (context, child) {
                          final slot = rtl ? (n - 1 - _pos.value) : _pos.value;
                          return Transform.translate(
                            offset: Offset(slot * w + (w - AppNavBar.pillSize.width) / 2, 10),
                            child: child,
                          );
                        },
                        child: Container(
                          width: AppNavBar.pillSize.width,
                          height: AppNavBar.pillSize.height,
                          decoration: BoxDecoration(
                            color: c.brandTint,
                            borderRadius: BorderRadius.circular(AppRadius.pill),
                          ),
                        ),
                      ),
                      Row(
                        children: [
                          for (var i = 0; i < n; i++)
                            Expanded(
                              child: _NavButton(
                                item: widget.items[i],
                                selected: i == widget.currentIndex,
                                index: i,
                                count: n,
                                onTap: () => widget.onTap(i),
                              ),
                            ),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({
    required this.item,
    required this.selected,
    required this.index,
    required this.count,
    required this.onTap,
  });

  final AppNavItem item;
  final bool selected;
  final int index;
  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final color = selected ? c.brand : c.inkDim;
    Widget button = MergeSemantics(
      child: Semantics(
        button: true,
        selected: selected,
        inMutuallyExclusiveGroup: true,
        hint: 'Таб ${index + 1}/$count',
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                height: AppNavBar.pillSize.height,
                child: Center(
                  child: IconTheme.merge(
                    data: IconThemeData(color: color, size: 22),
                    child: item.icon,
                  ),
                ),
              ),
              const SizedBox(height: AppSpace.xs),
              Text(
                item.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: context.text.labelSmall?.copyWith(
                  color: color,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
    final tip = item.tooltip;
    if (tip != null && tip != item.label) button = Tooltip(message: tip, excludeFromSemantics: true, child: button);
    return button;
  }
}
