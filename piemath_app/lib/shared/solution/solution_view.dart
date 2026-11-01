import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/math/math.dart';
import '../../core/ui/ui.dart';
import 'solution_parser.dart';

/// Бодлогын томьёоны лавлагаа (жишээ нь алдааны `formulas`) — товшвол томьёоны сан нээгдэнэ.
@immutable
class SolutionFormulaRef {
  const SolutionFormulaRef({required this.slug, required this.title});

  final String slug;
  final String title;
}

/// Бодолтыг алхам алхмаар нээж үзэх харагдац.
///
/// - Анхдагчаар 1-р алхам; «Дараагийн алхам» нэг нэгээр, «Бүгдийг харах» бүгдийг нээнэ.
/// - Урт алхам эвхэгдэж, «Дэлгэрэнгүй» товчоор дэлгэгдэнэ.
/// - Хайлт: дүрсээр нээгдэнэ, нэр томьёо агуулсан алхмыг л үзүүлж зүүн зурвасаар тодруулна.
/// - Томьёоны чип: `/app/formulas/:slug` руу.
///
/// БОДОЛТ ХЭЗЭЭ НЭЭГДЭХИЙГ СЕРВЕР ШИЙДНЭ — энэ widget зөвхөн ирсэн [source]-ыг харуулна,
/// хоосон бол юу ч зурахгүй (`SizedBox.shrink`).
class SolutionView extends StatefulWidget {
  const SolutionView({
    super.key,
    required this.source,
    this.formulas = const [],
    this.title = 'Бодолт',
    this.showTitle = true,
    this.initiallyExpanded = false,
    this.onOpenFormula,
  });

  final String? source;
  final List<SolutionFormulaRef> formulas;
  final String title;
  final bool showTitle;

  /// `true` бол бүх алхам эхнээс нээлттэй.
  final bool initiallyExpanded;

  /// Тестэд / тусгай навигаци. Өгөөгүй бол GoRouter `/app/formulas/:slug`.
  final void Function(SolutionFormulaRef formula)? onOpenFormula;

  @override
  State<SolutionView> createState() => _SolutionViewState();
}

class _SolutionViewState extends State<SolutionView> {
  late ParsedSolution _parsed;
  late int _shown;
  late int _initialShown;
  bool _searching = false;
  final _query = TextEditingController();
  final _detail = <int>{};

  @override
  void initState() {
    super.initState();
    _reset();
  }

  void _reset() {
    _parsed = parseSolution(widget.source);
    final n = _parsed.steps.length;
    _shown = widget.initiallyExpanded ? n : (n == 0 ? 0 : 1);
    _initialShown = _shown;
    _detail.clear();
    _searching = false;
    _query.clear();
  }

  @override
  void didUpdateWidget(SolutionView old) {
    super.didUpdateWidget(old);
    if (old.source != widget.source) _reset();
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  void _openFormula(SolutionFormulaRef f) {
    if (widget.onOpenFormula != null) {
      widget.onOpenFormula!(f);
    } else if (f.slug.isNotEmpty) {
      context.push('/app/formulas/${Uri.encodeComponent(f.slug)}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final steps = _parsed.steps;
    if (_parsed.isEmpty) return const SizedBox.shrink();
    final c = context.colors;
    final term = _query.text.trim();
    final searching = _searching && term.isNotEmpty;
    final allShown = _shown >= steps.length;
    final visible = <int>[
      for (var i = 0; i < steps.length; i++)
        if (searching ? solutionMatches(steps[i].text, term) : i < _shown) i,
    ];
    final answer = _parsed.answer;
    final showAnswer = answer != null && (searching ? solutionMatches(answer, term) : allShown);
    final canSearch = steps.length > 1;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.showTitle || canSearch)
          Row(
            children: [
              Expanded(
                child: widget.showTitle
                    ? Text(widget.title, style: context.text.titleSmall?.copyWith(color: c.brand))
                    : const SizedBox.shrink(),
              ),
              if (steps.length > 1)
                Padding(
                  padding: const EdgeInsets.only(right: AppSpace.xs),
                  child: Text(
                    searching ? 'Олдсон ${visible.length}' : 'Алхам ${_shown.clamp(1, steps.length)} / ${steps.length}',
                    style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  ),
                ),
              if (canSearch)
                IconButton(
                  tooltip: _searching ? 'Хайлтыг хаах' : 'Алхмаас хайх',
                  constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
                  icon: Icon(_searching ? AppIcons.close : AppIcons.search, size: 20),
                  onPressed: () => setState(() {
                    _searching = !_searching;
                    if (!_searching) _query.clear();
                  }),
                ),
            ],
          ),
        AnimatedSize(
          duration: AppMotion.of(context, AppMotion.base),
          alignment: Alignment.topCenter,
          child: _searching
              ? Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.md),
                  child: TextField(
                    controller: _query,
                    autofocus: true,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'Алхмаас хайх',
                      prefixIcon: const Icon(AppIcons.search, size: 20),
                      suffixIcon: term.isEmpty
                          ? null
                          : IconButton(
                              tooltip: 'Арилгах',
                              constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
                              icon: const Icon(AppIcons.close, size: 18),
                              onPressed: () => setState(_query.clear),
                            ),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                )
              : const SizedBox(width: double.infinity),
        ),
        if (searching && visible.isEmpty && !showAnswer)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
            child: Text('Таарах алхам олдсонгүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
          ),
        for (final i in visible)
          _Appear(
            key: ValueKey('step-$i'),
            animate: i >= _initialShown,
            child: _StepTile(
              step: steps[i],
              badge: steps[i].number ?? (_parsed.hasNumbers ? null : i + 1),
              highlighted: searching,
              open: searching || _detail.contains(i),
              onToggle: () => setState(() => _detail.contains(i) ? _detail.remove(i) : _detail.add(i)),
            ),
          ),
        if (!searching && !allShown)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.sm),
            child: Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.xs,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                FilledButton.tonalIcon(
                  style: FilledButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                  icon: const Icon(AppIcons.expand, size: 18),
                  label: const Text('Дараагийн алхам'),
                  onPressed: () => setState(() => _shown++),
                ),
                TextButton.icon(
                  style: TextButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                  icon: const Icon(AppIcons.checklist, size: 18),
                  label: const Text('Бүгдийг харах'),
                  onPressed: () => setState(() => _shown = steps.length),
                ),
              ],
            ),
          ),
        if (showAnswer)
          _Appear(
            key: const ValueKey('answer'),
            animate: !widget.initiallyExpanded && _shown > _initialShown,
            child: _AnswerBlock(answer: answer),
          ),
        if (widget.formulas.isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          Text('Хэрэгтэй томьёо', style: context.text.labelLarge?.copyWith(color: c.inkDim)),
          const SizedBox(height: AppSpace.xs),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.sm,
            children: [for (final f in widget.formulas) _FormulaChip(formula: f, onTap: () => _openFormula(f))],
          ),
        ],
      ],
    );
  }
}

/// Нэг алхам: дугаар + агуулга, урт бол эвхэгдэнэ.
class _StepTile extends StatelessWidget {
  const _StepTile({
    required this.step,
    required this.badge,
    required this.highlighted,
    required this.open,
    required this.onToggle,
  });

  final SolutionStep step;
  final int? badge;
  final bool highlighted;
  final bool open;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final long = step.isLong;
    final body = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 28,
          height: 28,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: highlighted ? c.brand : c.line),
          ),
          child: badge == null
              ? Icon(AppIcons.note, size: 14, color: c.inkDim)
              : Text('$badge', style: context.text.labelMedium?.copyWith(color: c.brand)),
        ),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AnimatedSize(
                duration: AppMotion.of(context, AppMotion.base),
                alignment: Alignment.topCenter,
                child: MathText(long && !open ? step.head : step.text),
              ),
              if (long)
                Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: TextButton(
                    style: TextButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap), padding: EdgeInsets.zero),
                    onPressed: onToggle,
                    child: Text(open ? 'Хураах' : 'Дэлгэрэнгүй'),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: Semantics(
        container: true,
        child: highlighted
            ? DecoratedBox(
                decoration: BoxDecoration(
                  border: Border(left: BorderSide(color: c.brand, width: 3)),
                ),
                child: Padding(
                  padding: const EdgeInsets.only(left: AppSpace.sm),
                  child: body,
                ),
              )
            : body,
      ),
    );
  }
}

/// Эцсийн «Хариу» — алхмуудаас тусдаа.
class _AnswerBlock extends StatelessWidget {
  const _AnswerBlock({required this.answer});

  final String answer;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.only(top: AppSpace.xs),
      padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: c.line)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(AppIcons.success, size: 20, color: c.brand),
          const SizedBox(width: AppSpace.sm),
          Text('Хариу: ', style: context.text.titleSmall),
          Expanded(child: MathText(answer, style: context.text.titleSmall)),
        ],
      ),
    );
  }
}

class _FormulaChip extends StatelessWidget {
  const _FormulaChip({required this.formula, required this.onTap});

  final SolutionFormulaRef formula;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      label: 'Томьёо: ${formula.title}',
      excludeSemantics: true,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          onTap: onTap,
          child: Container(
            constraints: const BoxConstraints(minHeight: AppSizes.minTap, maxWidth: 320),
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadius.pill),
              border: Border.all(color: c.line),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(AppIcons.formula, size: 18, color: c.brand),
                const SizedBox(width: AppSpace.sm),
                Flexible(child: MathText(formula.title, maxLines: 1, overflow: TextOverflow.ellipsis)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Шинээр гарч ирэх агуулга: зөөлөн өндөр + бүдэг → тод. Хөдөлгөөн багасгахад тэр дор.
class _Appear extends StatefulWidget {
  const _Appear({super.key, required this.animate, required this.child});

  final bool animate;
  final Widget child;

  @override
  State<_Appear> createState() => _AppearState();
}

class _AppearState extends State<_Appear> with SingleTickerProviderStateMixin {
  late final AnimationController _ctl = AnimationController(vsync: this);
  late final Animation<double> _curve = CurvedAnimation(parent: _ctl, curve: Curves.easeOutCubic);
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    _ctl.duration = AppMotion.of(context, AppMotion.enter);
    if (widget.animate) {
      _ctl.forward();
    } else {
      _ctl.value = 1;
    }
  }

  @override
  void dispose() {
    _ctl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SizeTransition(
    sizeFactor: _curve,
    alignment: Alignment.topCenter,
    child: FadeTransition(opacity: _curve, child: widget.child),
  );
}
