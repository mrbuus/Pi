import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/draft_models.dart';
import '../data/draft_repository.dart';
import 'draft_ui.dart';

/// Ноорогийг сурагч шиг бодож түлхүүртэй тулгах (`/app/internal/:id/solve`, вэбийн `SolveView`).
/// Дүгнэлт серверийн шалгалтын хөдөлгүүрээр — юу ч хадгалахгүй.
class DraftSolveScreen extends ConsumerStatefulWidget {
  const DraftSolveScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<DraftSolveScreen> createState() => _DraftSolveScreenState();
}

class _DraftSolveScreenState extends ConsumerState<DraftSolveScreen> {
  final _answers = <String, String>{};
  final _numeric = <String, TextEditingController>{};
  DraftCheck? _result;
  bool _checking = false;

  @override
  void dispose() {
    for (final c in _numeric.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _check() async {
    setState(() => _checking = true);
    try {
      final r = await ref.read(draftRepositoryProvider).check(widget.id, {
        for (final e in _answers.entries)
          if (e.value.trim().isNotEmpty) e.key: e.value.trim(),
      });
      if (mounted) setState(() => _result = r);
    } catch (e) {
      if (mounted) draftSnack(context, draftError(e, 'Шалгаж чадсангүй'));
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!ref.watch(draftAccessProvider)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Бодох')),
        body: const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden),
      );
    }
    final async = isSafeId(widget.id) ? ref.watch(draftSetProvider(widget.id)) : null;
    return Scaffold(
      appBar: AppBar(title: const Text('Бодож шалгах')),
      body: switch (async) {
        null => const EmptyState(icon: AppIcons.fileQuestion, title: AppStrings.notFound),
        AsyncData(:final value) => _body(value),
        AsyncError(:final error) => ErrorState(
          message: error is ApiError ? error.message : AppStrings.genericError,
          onRetry: () => ref.invalidate(draftSetProvider(widget.id)),
        ),
        _ => const LoadingState(),
      },
    );
  }

  Widget _body(DraftSet s) {
    final byBlock = {for (final r in _result?.results ?? const <DraftCheckResult>[]) r.blockId: r};
    final answered = s.blocks.where((b) => (_answers[b.id] ?? '').trim().isNotEmpty).length;
    final c = context.colors;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xl),
            children: [
              if (_result != null) ...[
                StatRow(
                  tiles: [
                    StatTile(
                      label: 'Зөв',
                      value: '${_result!.correct}',
                      tone: ChipTone.success,
                      icon: AppIcons.success,
                    ),
                    StatTile(label: 'Буруу', value: '${_result!.wrong}', tone: ChipTone.error, icon: AppIcons.failure),
                    StatTile(label: 'Хоосон', value: '${_result!.blank}'),
                  ],
                ),
                if (_result!.unkeyed > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpace.sm),
                    child: Text(
                      '${_result!.unkeyed} бодлогод хариу оруулаагүй байна',
                      style: context.text.bodySmall?.copyWith(color: c.warning),
                    ),
                  ),
                const SizedBox(height: AppSpace.md),
              ],
              if (s.blocks.isEmpty) const EmptyState(icon: AppIcons.draft, title: 'Бодлого алга'),
              for (var i = 0; i < s.blocks.length; i++) _card(s.blocks[i], i + 1, byBlock[s.blocks[i].id]),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _checking || answered == 0 ? null : _check,
                child: Text(_checking ? 'Шалгаж байна' : 'Шалгах ($answered/${s.blocks.length})'),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _card(DraftBlock b, int n, DraftCheckResult? r) {
    final c = context.colors;
    final content = b.content;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.sm),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('$n.', style: context.text.titleSmall),
                const Spacer(),
                if (r != null)
                  MetaChip(
                    label: switch (r.correct) {
                      true => 'Зөв',
                      false => 'Буруу, зөв нь ${r.key ?? '-'}',
                      null => r.key == null ? 'Хариугүй бодлого' : 'Хоосон',
                    },
                    tone: switch (r.correct) {
                      true => ChipTone.success,
                      false => ChipTone.error,
                      null => ChipTone.neutral,
                    },
                  ),
              ],
            ),
            const SizedBox(height: AppSpace.xs),
            MathText(content.statement.isEmpty ? '-' : content.statement),
            const SizedBox(height: AppSpace.sm),
            if (content.kind == DraftKind.choice)
              for (var i = 0; i < content.choices.length && i < draftLetters.length; i++)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.xs),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    onTap: () => setState(() {
                      _answers[b.id] = draftLetters[i];
                      _result = null;
                    }),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                      child: Row(
                        children: [
                          Icon(
                            _answers[b.id] == draftLetters[i] ? AppIcons.circleDot : AppIcons.circle,
                            size: 20,
                            color: _answers[b.id] == draftLetters[i] ? c.brand : c.inkDim,
                          ),
                          const SizedBox(width: AppSpace.sm),
                          Text(draftLetters[i], style: context.text.labelLarge),
                          const SizedBox(width: AppSpace.sm),
                          Expanded(child: MathText(content.choices[i].isEmpty ? '-' : content.choices[i])),
                        ],
                      ),
                    ),
                  ),
                ),
            if (content.kind == DraftKind.numeric)
              TextField(
                controller: _numeric.putIfAbsent(b.id, () => TextEditingController(text: _answers[b.id] ?? '')),
                keyboardType: const TextInputType.numberWithOptions(signed: true, decimal: true),
                decoration: const InputDecoration(labelText: 'Хариу'),
                onChanged: (v) => setState(() {
                  _answers[b.id] = v;
                  _result = null;
                }),
              ),
          ],
        ),
      ),
    );
  }
}
