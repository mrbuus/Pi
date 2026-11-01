import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../data/formula_models.dart';
import '../data/formula_repository.dart';
import 'inline_message.dart';

/// `/app/formulas/:slug` — томьёоны дэлгэрэнгүй.
class FormulaDetailScreen extends ConsumerWidget {
  const FormulaDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(formulaDetailProvider(slug));
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Томьёо')),
      body: async.when(
        loading: () => const LoadingState(cards: 2),
        error: (e, _) => ErrorState(
          title: 'Томьёо нээгдсэнгүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(formulaDetailProvider(slug)),
        ),
        data: (f) => _Body(f: f),
      ),
    );
  }
}

Widget _display(String latex) => Align(
  alignment: AlignmentDirectional.centerStart,
  child: SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: MathText('\$\$$latex\$\$', displayAlignment: AlignmentDirectional.centerStart),
  ),
);

class _Block extends StatelessWidget {
  const _Block(this.title, this.child);

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: AppSpace.xl),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(header: true, child: Text(title, style: context.text.titleMedium)),
        const SizedBox(height: AppSpace.sm),
        child,
      ],
    ),
  );
}

class _Body extends StatelessWidget {
  const _Body({required this.f});

  final FormulaDetail f;

  @override
  Widget build(BuildContext context) {
    final main = f.display;
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        Text(f.title, style: context.text.headlineSmall),
        if (f.sectionTitle != null)
          Text(f.sectionTitle!, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
        if (main != null && main.isNotEmpty) ...[
          const SizedBox(height: AppSpace.lg),
          AppCard(
            child: Row(
              children: [
                Expanded(child: _display(main)),
                IconButton(
                  tooltip: 'Томьёог хуулах',
                  icon: const Icon(AppIcons.copy, size: 20),
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: main));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Хуулагдлаа')));
                    }
                  },
                ),
              ],
            ),
          ),
        ],
        for (final v in f.variants) ...[
          const SizedBox(height: AppSpace.md),
          Text(v.label, style: context.text.titleSmall),
          _display(v.latex),
        ],
        if (f.conditions.isNotEmpty)
          _Block(
            'Хэрэглэх нөхцөл',
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final c in f.conditions)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpace.sm),
                    child: MathText(c),
                  ),
              ],
            ),
          ),
        _Block(
          'Энгийнээр',
          f.explanation == null || f.explanation!.isEmpty
              ? Text(
                  'Тайлбар хараахан нэмэгдээгүй байна',
                  style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                )
              : MathText(f.explanation!),
        ),
        if (f.derivation.isNotEmpty) _Block('Яагаад ийм болдог вэ', _Steps(steps: f.derivation)),
        if (f.mnemonic != null && f.mnemonic!.isNotEmpty)
          _Block(
            'Цээжлэх арга',
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(AppIcons.lightbulb, size: 20, color: context.colors.brand),
                const SizedBox(width: AppSpace.sm),
                Expanded(child: MathText(f.mnemonic!)),
              ],
            ),
          ),
        if (f.examples.isNotEmpty)
          _Block(
            'Жишээ',
            Column(
              children: [
                for (final (i, e) in f.examples.indexed) ...[
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Жишээ ${i + 1}', style: context.text.titleSmall),
                        const SizedBox(height: AppSpace.sm),
                        MathText(e.problem),
                        if (e.steps.isNotEmpty) ...[const SizedBox(height: AppSpace.sm), _Steps(steps: e.steps)],
                        if (e.answer.isNotEmpty) ...[
                          const SizedBox(height: AppSpace.sm),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Хариу: ', style: context.text.titleSmall),
                              Expanded(child: MathText(e.answer)),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpace.md),
                ],
              ],
            ),
          ),
        if (f.commonMistakes.isNotEmpty)
          _Block(
            'Түгээмэл алдаа',
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final m in f.commonMistakes)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpace.sm),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 9, right: AppSpace.sm),
                          child: SizedBox.square(
                            dimension: 5,
                            child: DecoratedBox(
                              decoration: BoxDecoration(color: context.colors.inkDim, shape: BoxShape.circle),
                            ),
                          ),
                        ),
                        Expanded(child: MathText(m)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        if (f.eeshTip != null && f.eeshTip!.isNotEmpty) _Block('ЭЕШ-д', MathText(f.eeshTip!)),
        if (f.related.isNotEmpty)
          _Block(
            'Холбоотой томьёо',
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final r in f.related)
                  ActionChip(
                    label: Text(r.title),
                    onPressed: r.slug.isEmpty
                        ? null
                        : () => context.push('/app/formulas/${Uri.encodeComponent(r.slug)}'),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Алхмуудыг дугаартай харуулна.
class _Steps extends StatelessWidget {
  const _Steps({required this.steps});

  final List<String> steps;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      for (final (i, s) in steps.indexed)
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.sm),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 28,
                child: Text('${i + 1}.', style: context.text.labelLarge?.copyWith(color: context.colors.inkDim)),
              ),
              Expanded(child: MathText(s)),
            ],
          ),
        ),
    ],
  );
}
