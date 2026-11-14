import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../ui/icons.dart';
import '../ui/tokens.dart';
import 'choice_layout.dart';
import 'math_text.dart';

/// Нэг хариултын сонголт.
@immutable
class ChoiceItem {
  const ChoiceItem({required this.label, this.text = '', this.image, this.isCorrect = false});

  /// «A», «B» … эсвэл холилдсон дарааллын «1», «2» …
  final String label;

  /// LaTeX холимог бичвэр ([MathText]). Зурагтай сонголтод хоосон байж болно.
  final String text;

  /// Сонголтын зураг (график хариу) — нэвтрэлттэй ачаалагчийг дуудагч өгнө.
  final ImageProvider? image;

  /// Зөвхөн багшид (сервер сурагчид илгээдэггүй).
  final bool isCorrect;
}

/// Харагдах хэлбэр.
enum ChoiceGridVariant {
  /// Товч хэлбэр — шалгалтанд сонгох, хүрэх талбай 48+.
  buttons,

  /// Нягт харагдац — бодлогын сан, эргэн харалт (вэбийн `library/ChoiceGrid`).
  compact,
}

/// A–E хариулт. Баганын тоог хариу бүрийн БОДИТ өргөнөөр (томьёо зурсны дараа) шийднэ:
/// бүгд нэг мөрөнд багтвал тэнцүү багана, үгүй бол 3+2, үгүй бол нэг багана —
/// ганц хариу өнчин мөрөнд үлдэхгүй ([choiceColumnOptions]).
///
/// Сонгосон төлөв ӨНГӨӨС ГАДНА зузаан хүрээ + шалгах тэмдгээр ялгарна (хүртээмж).
class ChoiceGrid extends StatelessWidget {
  const ChoiceGrid({
    super.key,
    required this.choices,
    this.selectedIndex,
    this.onSelect,
    this.showCorrect = false,
    this.variant = ChoiceGridVariant.buttons,
    this.groupLabel,
  });

  final List<ChoiceItem> choices;
  final int? selectedIndex;

  /// `null` бол зөвхөн харах (эргэн харалт, хугацаа дууссан).
  final ValueChanged<int>? onSelect;

  /// Багшид зөв хариуг тэмдэглэх.
  final bool showCorrect;
  final ChoiceGridVariant variant;

  /// Дэлгэц уншигчид бүлгийн нэр («3-р бодлогын хариултын сонголтууд»).
  final String? groupLabel;

  static const hGap = 12.0;
  static const vGapCompact = 8.0;
  static const vGapButtons = 10.0;

  @override
  Widget build(BuildContext context) {
    final compact = variant == ChoiceGridVariant.compact;
    return Semantics(
      container: true,
      label: groupLabel,
      child: ChoiceGridLayout(
        hGap: hGap,
        vGap: compact ? vGapCompact : vGapButtons,
        children: [
          for (var i = 0; i < choices.length; i++)
            _ChoiceCell(
              item: choices[i],
              selected: selectedIndex == i,
              correct: showCorrect && choices[i].isCorrect,
              compact: compact,
              onTap: onSelect == null ? null : () => onSelect!(i),
            ),
        ],
      ),
    );
  }
}

class _ChoiceCell extends StatelessWidget {
  const _ChoiceCell({
    required this.item,
    required this.selected,
    required this.correct,
    required this.compact,
    required this.onTap,
  });

  final ChoiceItem item;
  final bool selected;
  final bool correct;
  final bool compact;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final textStyle = context.text.bodyLarge!;

    final content = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (item.text.trim().isNotEmpty) MathText(item.text, style: textStyle),
        if (item.image != null) ...[
          if (item.text.trim().isNotEmpty) const SizedBox(height: AppSpace.sm),
          _ChoiceImage(image: item.image!),
        ],
      ],
    );

    final Color border = correct
        ? c.success
        : selected
            ? c.brandBright
            : (compact ? Colors.transparent : c.line);
    final double borderWidth = (selected || correct) ? 2 : 1;

    final Widget marker = compact
        ? _CompactLabel(label: item.label, correct: correct, selected: selected)
        : _ButtonLabel(label: item.label, selected: selected, correct: correct);

    Widget cell = Container(
      constraints: BoxConstraints(minHeight: compact ? 0 : 48),
      padding: compact
          ? const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: 2)
          : const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: 10),
      decoration: BoxDecoration(
        color: compact ? null : c.surface,
        border: Border.all(color: border, width: borderWidth),
        borderRadius: BorderRadius.circular(compact ? AppRadius.sm : AppRadius.md),
      ),
      child: Row(
        // min: хэмжилтийн үед нүд агуулгынхаа өргөнтэй (ChoiceGridLayout).
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: compact ? CrossAxisAlignment.start : CrossAxisAlignment.center,
        children: [
          marker,
          SizedBox(width: compact ? 6 : AppSpace.md),
          Flexible(child: content),
        ],
      ),
    );

    if (onTap != null) {
      cell = Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(compact ? AppRadius.sm : AppRadius.md),
          child: cell,
        ),
      );
    }

    return Semantics(
      container: true,
      button: onTap != null,
      selected: selected,
      label: '${item.label} хариулт${correct ? ', зөв' : ''}',
      // Товч хэлбэр баганаа бүтэн дүүргэнэ (хүрэх талбай том, хүрээ нэг шугамд);
      // нягт хэлбэр агуулгынхаа хэмжээгээр (вэбийн `inline-flex`).
      child: compact ? Align(alignment: AlignmentDirectional.centerStart, widthFactor: 1, child: cell) : cell,
    );
  }
}

/// Товч хэлбэрийн үсэг: дугуй дотор үсэг, сонгосон бол шалгах тэмдэг.
class _ButtonLabel extends StatelessWidget {
  const _ButtonLabel({required this.label, required this.selected, required this.correct});

  final String label;
  final bool selected;
  final bool correct;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final filled = selected || correct;
    final color = correct ? c.success : c.brandBright;
    return ExcludeSemantics(
      child: Container(
        width: 28,
        height: 28,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: filled ? color : null,
          border: Border.all(color: filled ? color : c.line, width: 2),
        ),
        child: filled
            ? Icon(AppIcons.check, size: 16, color: correct ? c.onStatus : c.onBrand)
            : Text(label, style: context.text.labelMedium?.copyWith(color: c.inkDim, fontWeight: FontWeight.w700)),
      ),
    );
  }
}

/// Нягт хэлбэрийн «A.» шошго (зөв бол шалгах тэмдэгтэй).
class _CompactLabel extends StatelessWidget {
  const _CompactLabel({required this.label, required this.correct, required this.selected});

  final String label;
  final bool correct;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final color = correct ? c.success : (selected ? c.brand : c.inkDim);
    return ExcludeSemantics(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('$label.', style: context.text.bodyLarge?.copyWith(color: color, fontWeight: FontWeight.w700)),
          if (correct || selected) ...[
            const SizedBox(width: 2),
            Icon(AppIcons.check, size: 14, color: color),
          ],
        ],
      ),
    );
  }
}

class _ChoiceImage extends StatelessWidget {
  const _ChoiceImage({required this.image});

  final ImageProvider image;

  /// Вэбийн `max-h-40` (160px).
  static const maxHeight = 160.0;

  @override
  Widget build(BuildContext context) {
    final px = (maxHeight * MediaQuery.devicePixelRatioOf(context)).round();
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: Image(
        image: ResizeImage(image, height: px, policy: ResizeImagePolicy.fit, allowUpscaling: false),
        height: maxHeight,
        fit: BoxFit.contain,
        semanticLabel: 'Сонголтын зураг',
        errorBuilder: (context, error, stack) => SizedBox(
          height: 48,
          child: Icon(AppIcons.gallery, color: context.colors.inkDim, semanticLabel: 'Зураг ачаалагдсангүй'),
        ),
      ),
    );
  }
}

/// Нүднүүдийг бодит өргөнөөр нь баганад хуваах layout.
///
/// Вэб хариу бүрийг нуугдмал давхаргад ЖИНХЭНЭЭР зурж өргөнийг хэмжинэ; энд ч мөн адил:
/// нүд бүрийг эхлээд сул хязгаараар (боломжит өргөнөөр) layout хийж өргөнийг авна, дараа нь
/// [pickChoiceColumns]-ээр баганаа шийдээд тэнцүү өргөнөөр дахин layout хийнэ.
///
/// Intrinsic/dry layout ашиглаагүй шалтгаан: flutter_math_fork-ийн `RenderLine` нь
/// `computeDryBaseline`-гүй тул мөр доторх томьёотой бичвэрийн intrinsic хэмжилт debug горимд
/// assertion өгдөг. Иймд энэ layout-ыг `IntrinsicWidth/IntrinsicHeight` дотор БҮҮ хий.
class ChoiceGridLayout extends MultiChildRenderObjectWidget {
  const ChoiceGridLayout({super.key, required this.hGap, required this.vGap, required super.children});

  final double hGap;
  final double vGap;

  @override
  RenderChoiceGrid createRenderObject(BuildContext context) => RenderChoiceGrid(hGap, vGap);

  @override
  void updateRenderObject(BuildContext context, RenderChoiceGrid renderObject) {
    renderObject
      ..hGap = hGap
      ..vGap = vGap;
  }
}

class ChoiceGridParentData extends ContainerBoxParentData<RenderBox> {}

class RenderChoiceGrid extends RenderBox
    with
        ContainerRenderObjectMixin<RenderBox, ChoiceGridParentData>,
        RenderBoxContainerDefaultsMixin<RenderBox, ChoiceGridParentData> {
  RenderChoiceGrid(this._hGap, this._vGap);

  double _hGap;
  double get hGap => _hGap;
  set hGap(double v) {
    if (v == _hGap) return;
    _hGap = v;
    markNeedsLayout();
  }

  double _vGap;
  double get vGap => _vGap;
  set vGap(double v) {
    if (v == _vGap) return;
    _vGap = v;
    markNeedsLayout();
  }

  /// Хязгааргүй өргөнтэй эцэг дотор хэмжих дээд өргөн.
  static const _unboundedMeasure = 4096.0;

  /// Сүүлийн layout-ын баганын тоо (тестэд).
  int columns = 1;

  @override
  void setupParentData(RenderBox child) {
    if (child.parentData is! ChoiceGridParentData) child.parentData = ChoiceGridParentData();
  }

  List<RenderBox> get _children {
    final out = <RenderBox>[];
    var child = firstChild;
    while (child != null) {
      out.add(child);
      child = childAfter(child);
    }
    return out;
  }

  @override
  void performLayout() {
    final kids = _children;
    if (kids.isEmpty) {
      size = constraints.smallest;
      return;
    }
    final avail = constraints.hasBoundedWidth ? constraints.maxWidth : _unboundedMeasure;

    // 1) Хэмжилт: нүд бүр өөрийн байгалийн өргөнөөр (боломжит өргөнөөс хэтрэхгүй).
    var widest = 0.0;
    for (final k in kids) {
      k.layout(BoxConstraints(maxWidth: avail), parentUsesSize: true);
      widest = math.max(widest, k.size.width);
    }
    final width = constraints.hasBoundedWidth ? avail : widest * kids.length + hGap * (kids.length - 1);
    final cols = pickChoiceColumns(count: kids.length, widest: widest, width: width, gap: hGap);
    final colW = math.max(0.0, (width - hGap * (cols - 1)) / cols);

    // 2) Тэнцүү багана.
    final childConstraints = BoxConstraints.tightFor(width: colW);
    var y = 0.0;
    for (var start = 0; start < kids.length; start += cols) {
      final rowKids = kids.sublist(start, math.min(start + cols, kids.length));
      var rowH = 0.0;
      for (var i = 0; i < rowKids.length; i++) {
        final k = rowKids[i]..layout(childConstraints, parentUsesSize: true);
        (k.parentData! as ChoiceGridParentData).offset = Offset(i * (colW + hGap), y);
        rowH = math.max(rowH, k.size.height);
      }
      y += rowH;
      if (start + cols < kids.length) y += vGap;
    }
    columns = cols;
    size = constraints.constrain(Size(width, y));
  }

  @override
  double? computeDistanceToActualBaseline(TextBaseline baseline) => defaultComputeDistanceToFirstActualBaseline(baseline);

  @override
  void paint(PaintingContext context, Offset offset) => defaultPaint(context, offset);

  @override
  bool hitTestChildren(BoxHitTestResult result, {required Offset position}) =>
      defaultHitTestChildren(result, position: position);
}
