import 'package:flutter/material.dart';

import '../../core/math/math.dart';
import '../../core/ui/ui.dart';
import 'expr.dart';
import 'math_input_controller.dart';

/// Гарнаас бичих талбар: шошго (LaTeX, `a`, `\alpha`) + утга (LaTeX). Товшвол [MathKeyboard]
/// энэ талбарт бичнэ — системийн гар ХЭЗЭЭ Ч гарахгүй (TextField биш).
class MathField extends StatelessWidget {
  const MathField({
    super.key,
    required this.controller,
    required this.group,
    required this.labelTex,
    this.name,
    this.invalid = false,
  });

  final MathInputController controller;
  final MathFieldGroup group;

  /// Тэмдэг (`a`, `h`, `\alpha`) — `$`-гүй LaTeX.
  final String labelTex;

  /// Монгол нэр (дэлгэц уншигчид, жижиг тайлбар).
  final String? name;

  /// Утга хүчингүй (хүрээ улаан).
  final bool invalid;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ListenableBuilder(
      listenable: Listenable.merge([controller, group]),
      builder: (context, _) {
        final active = group.active == controller;
        final tex = controller.displayTex;
        final unit = controller.kind == MathInputKind.angle && !controller.tokens.contains(degreeSign) && tex.isNotEmpty
            ? r'^{\circ}'
            : '';
        final border = invalid && !active ? c.error : (active ? c.brandBright : c.line);
        return Semantics(
          textField: true,
          focused: active,
          label: name ?? labelTex,
          value: controller.text,
          onTap: () => group.focus(controller),
          excludeSemantics: true,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => group.focus(controller),
            child: Container(
              constraints: const BoxConstraints(minHeight: AppSizes.minTap + 4),
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.xs),
              decoration: BoxDecoration(
                color: active ? c.surface : c.surfaceSunken,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: border, width: active ? 2 : 1),
              ),
              child: Row(
                children: [
                  MathText('\$$labelTex=\$', style: TextStyle(fontSize: 17, color: c.inkDim)),
                  const SizedBox(width: AppSpace.xs),
                  Flexible(
                    child: tex.isEmpty
                        ? Text(active ? '' : 'бичих', style: TextStyle(fontSize: 14, color: c.inkDim))
                        : FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: MathText('\$$tex$unit\$', style: TextStyle(fontSize: 19, color: c.ink)),
                          ),
                  ),
                  if (active) _Caret(color: c.brandBright),
                  const Spacer(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Анивчдаггүй курсор (тасралтгүй лугшдаг элемент хориотой — UX §0).
class _Caret extends StatelessWidget {
  const _Caret({required this.color});
  final Color color;

  @override
  Widget build(BuildContext context) =>
      Container(width: 2, height: 22, margin: const EdgeInsets.only(left: 2), color: color);
}
