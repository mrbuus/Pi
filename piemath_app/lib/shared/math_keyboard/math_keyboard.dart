import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/math/math.dart';
import '../../core/ui/ui.dart';
import 'math_input_controller.dart';

/// Геометрийн утга бичих дэлгэцийн гар (системийн гар гарахгүй).
///
/// 5 багана, 4 мөр, товч бүр 48dp-ээс багагүй, нэг гараар хүрэхүйц доод хэсэгт.
/// Математик товчнууд LaTeX-ээр (MathText). Дарах бүрт хөнгөн haptic.
class MathKeyboard extends StatelessWidget {
  const MathKeyboard({super.key, required this.group, this.keyHeight = 52});

  final MathFieldGroup group;
  final double keyHeight;

  static const double gap = 6;

  /// Гарын нийт өндөр (байрлал тооцоход).
  static double heightFor(double keyHeight) => keyHeight * 4 + gap * 3 + AppSpace.sm * 2;

  void _press(MathKey k) {
    final c = group.active;
    if (c == null) return;
    if (!c.allows(k)) return;
    HapticFeedback.selectionClick();
    if (k == MathKey.next) {
      group.next();
    } else {
      c.press(k);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    return ListenableBuilder(
      listenable: group,
      builder: (context, _) {
        final c = group.active;
        final isLast = group.activeIndex != null && group.activeIndex == group.fields.length - 1;
        bool on(MathKey k) => c?.allows(k) ?? false;
        Widget key(MathKey k, {int flex = 1}) => Expanded(
          flex: flex,
          child: _KeyButton(
            mathKey: k,
            enabled: on(k),
            height: keyHeight,
            nextLabel: isLast ? 'Болсон' : 'Дараах',
            onTap: () => _press(k),
          ),
        );
        Widget row(List<Widget> keys) => Row(
          children: [
            for (var i = 0; i < keys.length; i++) ...[if (i > 0) const SizedBox(width: gap), keys[i]],
          ],
        );
        return Material(
          color: colors.surfaceSunken,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.sm, AppSpace.sm, AppSpace.sm, AppSpace.sm),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  row([key(MathKey.d7), key(MathKey.d8), key(MathKey.d9), key(MathKey.sqrt), key(MathKey.backspace)]),
                  const SizedBox(height: gap),
                  row([key(MathKey.d4), key(MathKey.d5), key(MathKey.d6), key(MathKey.frac), key(MathKey.clear)]),
                  const SizedBox(height: gap),
                  row([key(MathKey.d1), key(MathKey.d2), key(MathKey.d3), key(MathKey.square), key(MathKey.pi)]),
                  const SizedBox(height: gap),
                  row([key(MathKey.d0), key(MathKey.dot), key(MathKey.degree), key(MathKey.next, flex: 2)]),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _KeyButton extends StatefulWidget {
  const _KeyButton({
    required this.mathKey,
    required this.enabled,
    required this.height,
    required this.nextLabel,
    required this.onTap,
  });

  final MathKey mathKey;
  final bool enabled;
  final double height;
  final String nextLabel;
  final VoidCallback onTap;

  @override
  State<_KeyButton> createState() => _KeyButtonState();
}

class _KeyButtonState extends State<_KeyButton> {
  bool _down = false;

  String get _semantic => switch (widget.mathKey) {
    MathKey.dot => 'Аравтын цэг',
    MathKey.sqrt => 'Квадрат язгуур',
    MathKey.frac => 'Бутархай',
    MathKey.square => 'Квадрат зэрэг',
    MathKey.pi => 'Пи',
    MathKey.degree => 'Градус',
    MathKey.backspace => 'Арилгах',
    MathKey.clear => 'Цэвэрлэх',
    MathKey.next => widget.nextLabel,
    _ => '${widget.mathKey.index}',
  };

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final k = widget.mathKey;
    final primary = k == MathKey.next;
    final fg = !widget.enabled
        ? c.inkDim.withValues(alpha: 0.35)
        : primary
        ? c.onBrand
        : c.ink;
    final bg = primary ? (widget.enabled ? c.brand : c.line) : (_down ? c.line : c.surface);
    final lip = primary ? c.brandSoft : c.line;
    final textStyle = TextStyle(fontSize: 22, fontWeight: FontWeight.w500, color: fg, height: 1);

    Widget label;
    switch (k) {
      case MathKey.backspace:
        label = Icon(LucideIcons.delete, size: 24, color: fg);
      case MathKey.clear:
        label = FittedBox(
          fit: BoxFit.scaleDown,
          child: Text('Цэвэрлэх', style: textStyle.copyWith(fontSize: 14, fontWeight: FontWeight.w600)),
        );
      case MathKey.next:
        label = Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(widget.nextLabel, style: textStyle.copyWith(fontSize: 17, fontWeight: FontWeight.w600)),
            const SizedBox(width: AppSpace.xs),
            Icon(widget.nextLabel == 'Болсон' ? LucideIcons.check : LucideIcons.arrowRight, size: 20, color: fg),
          ],
        );
      case MathKey.dot:
        label = Text('.', style: textStyle.copyWith(fontSize: 28));
      case MathKey.sqrt:
        label = _tex(r'\sqrt{\square}', fg);
      case MathKey.frac:
        label = _tex(r'\frac{a}{b}', fg, size: 18);
      case MathKey.square:
        label = _tex(r'x^2', fg);
      case MathKey.pi:
        label = _tex(r'\pi', fg);
      case MathKey.degree:
        label = _tex(r'x^{\circ}', fg);
      default:
        label = Text('${k.index}', style: textStyle);
    }

    return Semantics(
      button: true,
      enabled: widget.enabled,
      label: _semantic,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: widget.enabled ? (_) => setState(() => _down = true) : null,
        onTapCancel: () => setState(() => _down = false),
        onTapUp: (_) => setState(() => _down = false),
        onTap: widget.enabled ? widget.onTap : null,
        child: Transform.translate(
          offset: Offset(0, _down ? 1.5 : 0),
          // Сурах бичгийн «уруул»: доод талын бараан зурвас (сүүдэргүй).
          child: Container(
            key: ValueKey('math-key-${k.name}'),
            height: widget.height,
            padding: EdgeInsets.only(bottom: _down ? 1 : 2.5),
            decoration: BoxDecoration(color: lip, borderRadius: BorderRadius.circular(AppRadius.sm)),
            child: Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: primary ? null : Border.all(color: c.line, width: 0.5),
              ),
              child: label,
            ),
          ),
        ),
      ),
    );
  }

  Widget _tex(String tex, Color color, {double size = 20}) => IgnorePointer(
    child: MathText(
      '\$$tex\$',
      style: TextStyle(fontSize: size, color: color),
    ),
  );
}
