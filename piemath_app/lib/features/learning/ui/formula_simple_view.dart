import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../data/formula_models.dart';
import '../data/formula_repository.dart';
import '../data/json.dart';
import 'inline_message.dart';

String _hex(Color c) =>
    '#${(c.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase()}';

/// `\colA{…}`–`\colD{…}` → `\textcolor{#hex}{…}` (вэб `colorize`). Өнгө зөвхөн токеноос, бичвэрт л:
/// A = тодотгол хөх, B = улаавтар, C = ногоон, D = гүн хөх. Шар/алтан, өнгөт дэвсгэр байхгүй.
String colorizeTex(String src, AppColors c) {
  final map = {
    'A': c.brandBright,
    'B': c.error,
    'C': c.success,
    'D': c.brandSoft,
  };
  return src.replaceAllMapped(
    RegExp(r'\\col([A-D])\{'),
    (m) => '\\textcolor{${_hex(map[m[1]]!)}}{',
  );
}

/// Томьёоны «Энгийнээр» хэсэг: өнгөт томьёо, нэг өгүүлбэр, үсгийн утга, «Алхамаар ойлгох» (хойшлуулан татна).
class FormulaSimpleView extends ConsumerStatefulWidget {
  const FormulaSimpleView({
    super.key,
    required this.slug,
    required this.simple,
    required this.section,
  });

  final String slug;
  final FormulaSimple simple;
  final String? section;

  @override
  ConsumerState<FormulaSimpleView> createState() => _FormulaSimpleViewState();
}

class _FormulaSimpleViewState extends ConsumerState<FormulaSimpleView> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final s = widget.simple;
    String col(String t) => colorizeTex(t, c);
    final section = widget.section;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: MathText(
              '\$\$${col(s.formula)}\$\$',
              displayAlignment: AlignmentDirectional.centerStart,
            ),
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        MathText(col(s.say), style: context.text.bodyLarge),
        if (s.parts.isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          for (final p in s.parts)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.sm),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  SizedBox(width: 64, child: MathText('\$${col(p.tex)}\$')),
                  Expanded(
                    child: MathText(
                      col(p.mean),
                      style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                    ),
                  ),
                ],
              ),
            ),
        ],
        if (section != null && isSafeId(section)) ...[
          const SizedBox(height: AppSpace.xs),
          TextButton.icon(
            onPressed: () => setState(() => _open = !_open),
            icon: const Icon(AppIcons.lightbulb, size: 18),
            label: Text(_open ? 'Алхмуудыг хураах' : 'Алхамаар ойлгох'),
          ),
          if (_open) _Steps(slug: widget.slug, section: section),
        ],
      ],
    );
  }
}

/// «Алхамаар ойлгох»: бүлгийн дэлгэрэнгүйг анх нээхэд л татна (бүлэг тутамд нэг удаа кэшлэгдэнэ).
class _Steps extends ConsumerWidget {
  const _Steps({required this.slug, required this.section});

  final String slug;
  final String section;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final async = ref.watch(formulaSectionDetailProvider(section));
    return async.when(
      loading: () => const Padding(
        padding: EdgeInsets.symmetric(vertical: AppSpace.sm),
        child: SkeletonRows(rows: 3),
      ),
      error: (e, _) => Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
        child: Row(
          children: [
            const Expanded(child: InlineMessage('Алхмуудыг ачаалж чадсангүй')),
            TextButton(
              onPressed: () =>
                  ref.invalidate(formulaSectionDetailProvider(section)),
              child: const Text(AppStrings.retry),
            ),
          ],
        ),
      ),
      data: (map) {
        final more = map[slug];
        if (more == null) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
            child: Text(
              'Алхам хараахан нэмэгдээгүй байна',
              style: context.text.bodyMedium?.copyWith(color: c.inkDim),
            ),
          );
        }
        String col(String t) => colorizeTex(t, c);
        final ex = more.example;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final (i, t) in more.steps.indexed)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 28,
                      child: Text(
                        '${i + 1}.',
                        style: context.text.labelLarge?.copyWith(
                          color: c.brand,
                        ),
                      ),
                    ),
                    Expanded(child: MathText(col(t))),
                  ],
                ),
              ),
            if (ex != null) ...[
              const SizedBox(height: AppSpace.sm),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Жишээ', style: context.text.titleSmall),
                    const SizedBox(height: AppSpace.sm),
                    MathText(col(ex.problem)),
                    for (final t in ex.steps)
                      Padding(
                        padding: const EdgeInsets.only(top: AppSpace.sm),
                        child: Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: MathText(col(t)),
                          ),
                        ),
                      ),
                    if (ex.answer.isNotEmpty) ...[
                      const SizedBox(height: AppSpace.sm),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Хариу: ',
                            style: context.text.titleSmall?.copyWith(
                              color: c.success,
                            ),
                          ),
                          Expanded(child: MathText(col(ex.answer))),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
            if (more.watch != null) ...[
              const SizedBox(height: AppSpace.md),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(AppIcons.warning, size: 20, color: c.error),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(child: MathText(col(more.watch!))),
                ],
              ),
            ],
          ],
        );
      },
    );
  }
}
