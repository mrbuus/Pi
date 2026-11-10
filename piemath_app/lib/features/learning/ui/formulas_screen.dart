import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/math/math.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/formula_models.dart';
import '../data/formula_repository.dart';
import 'inline_message.dart';

/// `/app/formulas` — томьёоны сан: хайх, түвшин/хэсгээр шүүх, «Миний томьёо».
class FormulasScreen extends ConsumerStatefulWidget {
  const FormulasScreen({super.key});

  @override
  ConsumerState<FormulasScreen> createState() => _FormulasScreenState();
}

class _FormulasScreenState extends ConsumerState<FormulasScreen> {
  String _query = '';
  String _level = '';
  String _section = '';

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Томьёоны сан'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Бүгд'),
              Tab(text: 'Миний томьёо'),
            ],
          ),
        ),
        body: TabBarView(children: [_allTab(), const _MineTab()]),
      ),
    );
  }

  Widget _allTab() {
    final cat = ref.watch(formulaCatalogProvider);
    return cat.when(
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(
        title: 'Томьёоны сан ачаалж чадсангүй',
        message: errorText(e),
        onRetry: () => ref.invalidate(formulaCatalogProvider),
      ),
      data: (c) {
        final shown = filterFormulas(c.formulas, query: _query, level: _level, section: _section);
        final bySection = <String, List<FormulaSummary>>{};
        for (final f in shown) {
          bySection.putIfAbsent(f.section ?? '', () => []).add(f);
        }
        final known = c.sections.map((s) => s.slug).toSet();
        final headers = [
          for (final s in c.sections)
            if (bySection.containsKey(s.slug)) (s.slug, s.title),
          if (bySection.keys.any((k) => !known.contains(k))) ('', 'Бусад томьёо'),
        ];
        return ListView(
          padding: const EdgeInsets.all(AppSpace.gutter),
          children: [
            TextField(
              decoration: const InputDecoration(
                hintText: 'Томьёогоор хайх',
                prefixIcon: Icon(AppIcons.search, size: 20),
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
            const SizedBox(height: AppSpace.md),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                ChoiceChip(
                  label: const Text('Бүх түвшин'),
                  selected: _level.isEmpty,
                  onSelected: (_) => setState(() => _level = ''),
                ),
                ChoiceChip(
                  label: const Text('Үндсэн'),
                  selected: _level == 'CORE',
                  onSelected: (_) => setState(() => _level = 'CORE'),
                ),
                ChoiceChip(
                  label: const Text('Нэмэлт'),
                  selected: _level == 'EXTRA',
                  onSelected: (_) => setState(() => _level = 'EXTRA'),
                ),
              ],
            ),
            if (c.sections.isNotEmpty) ...[
              const SizedBox(height: AppSpace.sm),
              Wrap(
                spacing: AppSpace.sm,
                runSpacing: AppSpace.sm,
                children: [
                  for (final s in c.sections)
                    FilterChip(
                      label: Text(s.title),
                      selected: _section == s.slug,
                      onSelected: (v) => setState(() => _section = v ? s.slug : ''),
                    ),
                ],
              ),
            ],
            const SizedBox(height: AppSpace.xl),
            if (shown.isEmpty)
              const EmptyState(
                icon: AppIcons.formula,
                title: 'Томьёо олдсонгүй',
                message: 'Хайлт, шүүлтүүрээ өөрчилж үзнэ үү',
              )
            else
              for (final (slug, title) in headers) ...[
                SectionHeader(
                  title: title,
                  padding: const EdgeInsets.only(bottom: AppSpace.sm),
                ),
                for (final f in bySection[slug] ?? const <FormulaSummary>[]) ...[
                  _FormulaRow(title: f.title, latex: f.display, slug: f.slug, level: f.level),
                  const SizedBox(height: AppSpace.sm),
                ],
                const SizedBox(height: AppSpace.md),
              ],
          ],
        );
      },
    );
  }
}

class _FormulaRow extends StatelessWidget {
  const _FormulaRow({required this.title, required this.slug, this.latex, this.level = '', this.footer});

  final String title;
  final String slug;
  final String? latex;
  final String level;
  final String? footer;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: () => context.push('/app/formulas/${Uri.encodeComponent(slug)}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: context.text.titleSmall)),
              if (level == 'EXTRA')
                Text('Нэмэлт', style: context.text.labelSmall?.copyWith(color: context.colors.inkDim)),
            ],
          ),
          if (latex != null && latex!.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: MathText('\$$latex\$')),
            ),
          ],
          if (footer != null) ...[
            const SizedBox(height: AppSpace.xs),
            Text(footer!, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
          ],
        ],
      ),
    );
  }
}

class _MineTab extends ConsumerWidget {
  const _MineTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mine = ref.watch(myFormulasProvider);
    return mine.when(
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(
        title: 'Миний томьёо ачаалж чадсангүй',
        message: errorText(e),
        onRetry: () => ref.invalidate(myFormulasProvider),
      ),
      data: (m) {
        if (m.items.isEmpty) {
          return const EmptyState(
            icon: AppIcons.formula,
            title: 'Тестэд тулгарсан томьёо алга',
            message: 'Тест өгсний дараа тухайн бодлогуудад хэрэгтэй томьёо энд гарна',
          );
        }
        final now = UbDateTime.now();
        return ListView(
          padding: const EdgeInsets.all(AppSpace.gutter),
          children: [
            Text('${m.seen} / ${m.total} томьёотой тааралдсан', style: context.text.bodyMedium),
            const SizedBox(height: AppSpace.md),
            for (final g in SeenGroup.values)
              if (m.items.where((f) => seenGroupOf(f.firstSeenAt, now) == g).toList() case final group
                  when group.isNotEmpty) ...[
                SectionHeader(title: g.title, padding: const EdgeInsets.only(top: AppSpace.md, bottom: AppSpace.sm)),
                for (final f in group) ...[
                  _FormulaRow(
                    title: f.title,
                    slug: f.slug,
                    latex: f.latex,
                    footer: [
                      if (f.lastTestTitle != null) 'Сүүлд: ${f.lastTestTitle!}',
                      '${f.seenCount} удаа тааралдсан',
                    ].join(', '),
                  ),
                  const SizedBox(height: AppSpace.sm),
                ],
              ],
          ],
        );
      },
    );
  }
}
