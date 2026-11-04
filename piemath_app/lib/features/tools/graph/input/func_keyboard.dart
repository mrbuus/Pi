import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/math/math.dart';
import '../../../../core/ui/ui.dart';
import 'func_input.dart';

/// Функц, тэгшитгэл бичих дэлгэцийн гар (системийн гар гарахгүй).
///
/// Хоёр хуудас: «123» (тоо, үйлдэл, x) ба «f(x)» (функц, тэмдэг, параметр).
/// 6 багана, товч бүр 44dp-ээс багагүй; математик товч LaTeX-ээр. Дарах бүрт хөнгөн haptic.
class FuncKeyboard extends StatefulWidget {
  const FuncKeyboard({
    super.key,
    required this.controller,
    required this.onDone,
    this.allowNewline = false,
    this.doneLabel = 'Болсон',
    this.keyHeight = 46,
  });

  final FuncInputController controller;
  final VoidCallback onDone;

  /// Систем бичих (мөр бүр нэг тэгшитгэл).
  final bool allowNewline;
  final String doneLabel;
  final double keyHeight;

  static const double gap = 5;

  @override
  State<FuncKeyboard> createState() => _FuncKeyboardState();
}

/// Нэг товч: [insert] — оруулах токен; [tex] — LaTeX шошго эсвэл [text] — энгийн шошго.
class _K {
  const _K(this.insert, {this.tex, this.text, required this.say, this.flex = 1});
  final String insert;
  final String? tex;
  final String? text;
  final String say;
  final int flex;
}

const _bs = '\u0008';
const _page = '\u0001';
const _done = '\u0002';
const _clear = '\u0003';

_K _d(String n) => _K(n, text: n, say: n);

final _main = <List<_K>>[
  [
    _d('7'),
    _d('8'),
    _d('9'),
    const _K('/', tex: r'\frac{a}{b}', say: 'Хуваах'),
    const _K('(', tex: '(', say: 'Хаалт нээх'),
    const _K(')', tex: ')', say: 'Хаалт хаах'),
  ],
  [
    _d('4'),
    _d('5'),
    _d('6'),
    const _K('*', tex: r'\times', say: 'Үржих'),
    const _K('x', tex: 'x', say: 'x'),
    const _K('^', tex: r'a^{n}', say: 'Зэрэг'),
  ],
  [
    _d('1'),
    _d('2'),
    _d('3'),
    const _K('-', tex: '-', say: 'Хасах'),
    const _K('^2', tex: r'x^{2}', say: 'Квадрат'),
    const _K('sqrt(', tex: r'\sqrt{\square}', say: 'Квадрат язгуур'),
  ],
  [
    _d('0'),
    const _K('.', text: '.', say: 'Аравтын цэг'),
    const _K('=', tex: '=', say: 'Тэнцүү'),
    const _K('+', tex: '+', say: 'Нэмэх'),
    const _K('pi', tex: r'\pi', say: 'Пи'),
    const _K(_bs, say: 'Арилгах'),
  ],
];

final _func = <List<_K>>[
  [
    const _K('sin(', tex: r'\sin', say: 'Синус'),
    const _K('cos(', tex: r'\cos', say: 'Косинус'),
    const _K('tg(', tex: r'\operatorname{tg}', say: 'Тангенс'),
    const _K('ctg(', tex: r'\operatorname{ctg}', say: 'Котангенс'),
    const _K('ln(', tex: r'\ln', say: 'Натурал логарифм'),
    const _K('log_', tex: r'\log_{a}', say: 'Логарифм'),
  ],
  [
    const _K('|', tex: r'|x|', say: 'Модуль'),
    const _K('e', tex: 'e', say: 'e тоо'),
    const _K('a', tex: 'a', say: 'a'),
    const _K('b', tex: 'b', say: 'b'),
    const _K('k', tex: 'k', say: 'k'),
    const _K('y', tex: 'y', say: 'y'),
  ],
  [
    const _K('<', tex: '<', say: 'Бага'),
    const _K('>', tex: '>', say: 'Их'),
    const _K('<=', tex: r'\le', say: 'Бага буюу тэнцүү'),
    const _K('>=', tex: r'\ge', say: 'Их буюу тэнцүү'),
    const _K('cbrt(', tex: r'\sqrt[3]{\square}', say: 'Куб язгуур'),
    const _K('!', tex: 'n!', say: 'Факториал'),
  ],
  [
    const _K('x', tex: 'x', say: 'x'),
    const _K('(', tex: '(', say: 'Хаалт нээх'),
    const _K(')', tex: ')', say: 'Хаалт хаах'),
    const _K(',', text: ',', say: 'Таслал'),
    const _K('arcsin(', tex: r'\arcsin', say: 'Арксинус'),
    const _K(_bs, say: 'Арилгах'),
  ],
];

class _FuncKeyboardState extends State<FuncKeyboard> {
  bool _funcPage = false;

  void _press(String k) {
    HapticFeedback.selectionClick();
    final c = widget.controller;
    switch (k) {
      case _bs:
        c.backspace();
      case _clear:
        c.clear();
      case _page:
        setState(() => _funcPage = !_funcPage);
      case _done:
        widget.onDone();
      default:
        c.insert(k);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final rows = _funcPage ? _func : _main;
    Widget key(_K k, {bool primary = false, String? label, IconData? icon}) => Expanded(
      flex: k.flex,
      child: _KeyButton(
        k: k,
        height: widget.keyHeight,
        primary: primary,
        label: label,
        icon: icon,
        onTap: () => _press(k.insert),
      ),
    );
    Widget row(List<Widget> keys) => Row(
      children: [
        for (var i = 0; i < keys.length; i++) ...[if (i > 0) const SizedBox(width: FuncKeyboard.gap), keys[i]],
      ],
    );
    return Material(
      key: const ValueKey('func-keyboard'),
      color: colors.surfaceSunken,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.sm),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final r in rows) ...[
                row([for (final k in r) key(k, icon: k.insert == _bs ? LucideIcons.delete : null)]),
                const SizedBox(height: FuncKeyboard.gap),
              ],
              row([
                key(
                  _K(
                    _page,
                    tex: _funcPage ? null : 'f(x)',
                    text: _funcPage ? '123' : null,
                    say: _funcPage ? 'Тооны гар' : 'Функцийн гар',
                  ),
                ),
                if (widget.allowNewline)
                  key(const _K('\n', say: 'Шинэ мөр'), icon: LucideIcons.cornerDownLeft),
                key(const _K(_clear, say: 'Цэвэрлэх', flex: 2), label: 'Цэвэрлэх'),
                key(
                  _K(_done, say: widget.doneLabel, flex: widget.allowNewline ? 2 : 3),
                  primary: true,
                  label: widget.doneLabel,
                  icon: LucideIcons.check,
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

class _KeyButton extends StatefulWidget {
  const _KeyButton({
    required this.k,
    required this.height,
    required this.onTap,
    this.primary = false,
    this.label,
    this.icon,
  });

  final _K k;
  final double height;
  final VoidCallback onTap;
  final bool primary;
  final String? label;
  final IconData? icon;

  @override
  State<_KeyButton> createState() => _KeyButtonState();
}

class _KeyButtonState extends State<_KeyButton> {
  bool _down = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final k = widget.k;
    final fg = widget.primary ? c.onBrand : c.ink;
    final bg = widget.primary ? c.brand : (_down ? c.line : c.surface);
    final lip = widget.primary ? c.brandSoft : c.line;
    final textStyle = TextStyle(fontSize: 20, fontWeight: FontWeight.w500, color: fg, height: 1);

    Widget content;
    if (widget.label != null) {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(widget.label!, style: textStyle.copyWith(fontSize: 15, fontWeight: FontWeight.w600)),
            ),
          ),
          if (widget.icon != null) ...[const SizedBox(width: AppSpace.xs), Icon(widget.icon, size: 18, color: fg)],
        ],
      );
    } else if (widget.icon != null) {
      content = Icon(widget.icon, size: 22, color: fg);
    } else if (k.tex != null) {
      content = IgnorePointer(
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: MathText('\$${k.tex}\$', style: TextStyle(fontSize: 18, color: fg)),
        ),
      );
    } else {
      content = Text(k.text ?? '', style: textStyle);
    }

    return Semantics(
      button: true,
      label: k.say,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => setState(() => _down = true),
        onTapCancel: () => setState(() => _down = false),
        onTapUp: (_) => setState(() => _down = false),
        onTap: widget.onTap,
        child: Transform.translate(
          offset: Offset(0, _down ? 1.5 : 0),
          // Сурах бичгийн «уруул»: доод талын бараан зурвас (сүүдэргүй).
          child: Container(
            key: ValueKey('fkey-${k.say}'),
            height: widget.height,
            padding: EdgeInsets.only(bottom: _down ? 1 : 2.5),
            decoration: BoxDecoration(color: lip, borderRadius: BorderRadius.circular(AppRadius.sm)),
            child: Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: widget.primary ? null : Border.all(color: c.line, width: 0.5),
              ),
              child: content,
            ),
          ),
        ),
      ),
    );
  }
}
