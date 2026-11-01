import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../../exam/data/exam_models.dart' show ChoiceMode;
import '../application/study_review_controller.dart';
import '../data/study_models.dart';
import '../domain/study_logic.dart';
import '../learning_icons.dart';
import 'inline_message.dart';

/// `/app/study/review` — хугацаатай, сэдвээр давтлага. [runId]: түүхээс нээсэн давтлага.
class ReviewScreen extends ConsumerStatefulWidget {
  const ReviewScreen({super.key, this.runId});

  final String? runId;

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (mounted) ref.read(studyReviewProvider.notifier).init(runId: widget.runId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(studyReviewProvider);
    final ctl = ref.read(studyReviewProvider.notifier);
    Widget body;
    if (s.loading) {
      body = const LoadingState(cards: 2);
    } else if (s.loadError != null) {
      body = ErrorState(
        title: 'Давтлага нээгдсэнгүй',
        message: s.loadError!,
        onRetry: () => ctl.init(runId: widget.runId),
      );
    } else if (s.run == null) {
      body = _Setup(state: s);
    } else {
      body = _RunView(state: s);
    }
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Давтлага')),
      body: body,
    );
  }
}

class _Setup extends ConsumerStatefulWidget {
  const _Setup({required this.state});

  final ReviewState state;

  @override
  ConsumerState<_Setup> createState() => _SetupState();
}

class _SetupState extends ConsumerState<_Setup> {
  int _budget = 10;
  final _selected = <String>{};

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final fresh = (s.options?.chapters ?? const <StudyChapterOption>[]).where((c) => c.freshCount > 0).toList();
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        const PageHeader(title: 'Сэдвээ сонгон давтах'),
        Text('Хугацаа', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        SegmentedButton<int>(
          showSelectedIcon: false,
          segments: [
            for (final e in reviewBudgets.entries) ButtonSegment(value: e.key, label: Text('${e.key} мин')),
          ],
          selected: {_budget},
          onSelectionChanged: (v) => setState(() => _budget = v.first),
        ),
        const SizedBox(height: AppSpace.sm),
        Text(
          'Дээд тал нь ${reviewBudgets[_budget]} бодлого',
          style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
        ),
        const SizedBox(height: AppSpace.xl),
        Row(
          children: [
            Expanded(child: Text('Сэдэв (1 - $maxReviewChapters)', style: context.text.titleSmall)),
            const InfoHint(
              title: 'Хувийн давтлага',
              message:
                  'Эхний хариулт хадгалагдана. Албан ёсны шалгалт, эрэмбэд орохгүй. Бодлогын тоо нь хязгаар бөгөөд бодох хурдны норм биш.',
            ),
          ],
        ),
        if (fresh.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: AppSpace.xl),
            child: EmptyState(
              title: 'Шинэ бодлого алга',
              message: 'Эрхтэй сэдвүүдэд давтах шинэ бодлого одоогоор байхгүй байна',
            ),
          )
        else
          for (final c in fresh)
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _selected.contains(c.id),
              onChanged: !_selected.contains(c.id) && _selected.length >= maxReviewChapters
                  ? null
                  : (v) => setState(() => v == true ? _selected.add(c.id) : _selected.remove(c.id)),
              title: MathText(c.title),
              subtitle: Text('${c.freshCount} бодлого'),
            ),
        if (s.error != null) ...[
          const SizedBox(height: AppSpace.md),
          InlineMessage(s.error!),
        ],
        const SizedBox(height: AppSpace.xl),
        FilledButton(
          onPressed: s.busy || _selected.isEmpty
              ? null
              : () => ref.read(studyReviewProvider.notifier).start(budgetMinutes: _budget, chapterIds: _selected.toList()),
          child: Text(s.busy ? 'Эхэлж байна' : 'Давтлага эхлэх'),
        ),
      ],
    );
  }
}

class _RunView extends ConsumerStatefulWidget {
  const _RunView({required this.state});

  final ReviewState state;

  @override
  ConsumerState<_RunView> createState() => _RunViewState();
}

class _RunViewState extends ConsumerState<_RunView> {
  String _answer = '';
  final _flags = <String>{};
  String _seenItem = '';

  void _syncDraft(StudyItem? item) {
    final id = item == null ? '' : '${item.id}-${item.responses.length}';
    if (id != _seenItem) {
      _seenItem = id;
      _answer = '';
      _flags.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.state;
    final run = s.run!;
    final item = s.item;
    _syncDraft(item);
    final ctl = ref.read(studyReviewProvider.notifier);
    final canAnswer = item != null && (item.first != null || run.isOpen);
    final hasInput = _answer.trim().isNotEmpty || _flags.contains('could-not');
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        Row(
          children: [
            Icon(LearningIcons.timer, size: 20, color: context.colors.inkDim),
            const SizedBox(width: AppSpace.sm),
            run.isOpen
                ? ReviewCountdown(
                    key: ValueKey(run.id),
                    run: run,
                    fetchedAtDevice: s.fetchedAtDevice ?? DateTime.now().toUtc(),
                    onExpired: ctl.refreshRun,
                  )
                : Text(run.isExpired ? 'Хугацаа дууссан' : 'Давтлага хаагдсан', style: context.text.titleSmall),
            const Spacer(),
            Text('${s.index + 1} / ${run.items.length}', style: context.text.titleSmall),
          ],
        ),
        const SizedBox(height: AppSpace.lg),
        if (item != null)
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _ItemBody(item: item),
                if (item.first != null) ...[
                  const SizedBox(height: AppSpace.lg),
                  _FirstSummary(item: item),
                ],
                if (canAnswer) ...[
                  const SizedBox(height: AppSpace.lg),
                  _AnswerBox(
                    key: ValueKey('${item.id}-${item.responses.length}'),
                    item: item,
                    run: run,
                    initial: _answer,
                    enabled: !s.busy,
                    onChanged: (v) => setState(() => _answer = v),
                  ),
                  const SizedBox(height: AppSpace.md),
                  Text('Өөрийн тэмдэглэгээ (заавал биш)', style: context.text.labelLarge),
                  const SizedBox(height: AppSpace.sm),
                  Wrap(
                    spacing: AppSpace.sm,
                    runSpacing: AppSpace.sm,
                    children: [
                      for (final e in reviewFlagLabels.entries)
                        FilterChip(
                          label: Text(e.value),
                          selected: _flags.contains(e.key),
                          onSelected: (v) => setState(() => v ? _flags.add(e.key) : _flags.remove(e.key)),
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.lg),
                  FilledButton(
                    onPressed: s.busy || !hasInput || (item.first == null && !run.isOpen)
                        ? null
                        : () => ctl.respond(answer: _answer.trim(), flags: _flags.toList()),
                    child: Text(item.first != null ? 'Дахин бодсон хариу хадгалах' : 'Эхний хариу хадгалах'),
                  ),
                ],
                for (final r in item.responses.where((r) => r.isCorrection)) ...[
                  const SizedBox(height: AppSpace.sm),
                  Text(
                    '${r.assistance ? 'Тайлбартай дахин бодолт' : 'Тайлбар нээхээс өмнөх дахин бодолт'}: '
                    '${displayReviewAnswer(item.source, r.answer)} (${correctnessLabel(r.correct)})',
                    style: context.text.bodySmall,
                  ),
                ],
                if (!run.isOpen) _Reveal(item: item),
              ],
            ),
          ),
        if (s.error != null) ...[
          const SizedBox(height: AppSpace.md),
          InlineMessage(s.error!),
        ],
        const SizedBox(height: AppSpace.lg),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(onPressed: s.index == 0 || s.busy ? null : () => ctl.moveTo(s.index - 1), child: const Text('Өмнөх')),
            ),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: OutlinedButton(
                onPressed: s.index >= run.items.length - 1 || s.busy ? null : () => ctl.moveTo(s.index + 1),
                child: const Text('Дараах'),
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpace.md),
        if (run.isOpen)
          FilledButton(onPressed: s.busy ? null : ctl.submit, child: const Text('Давтлагыг хааж, тайлбар үзэх'))
        else
          _Evidence(run: run, onReset: ctl.reset),
      ],
    );
  }
}

class _ItemBody extends ConsumerWidget {
  const _ItemBody({required this.item});

  final StudyItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final src = item.source;
    final images = ref.watch(fileImageProvider);
    return RepaintBoundary(
      child: ProblemFigure(
        image: src.imageKey == null ? null : images.image(src.imageKey!),
        alt: 'Бодлогын зураг',
        child: src.statement == null || src.statement!.isEmpty ? null : MathText(src.statement!, style: context.text.bodyLarge),
      ),
    );
  }
}

class _FirstSummary extends StatelessWidget {
  const _FirstSummary({required this.item});

  final StudyItem item;

  @override
  Widget build(BuildContext context) {
    final f = item.first!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Эхний хариу: ', style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
            Expanded(child: MathText(displayReviewAnswer(item.source, f.answer))),
          ],
        ),
        const SizedBox(height: AppSpace.xs),
        Text(correctnessLabel(f.correct), style: context.text.titleSmall),
        if (item.hasFirstAssistance)
          Text(
            'Эхний хариултаас өмнө нээсэн материал эсвэл тусламжийн тэмдэглэгээ бүртгэгдсэн',
            style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
          ),
        if (f.flags.isNotEmpty)
          Text(f.flags.map((x) => reviewFlagLabels[x] ?? x).join(', '), style: context.text.bodySmall),
      ],
    );
  }
}

/// Сонголт бол ChoiceGrid, үгүй бол богино бичвэр (бутархай `1/3` зэргийг зөвшөөрнө).
class _AnswerBox extends StatefulWidget {
  const _AnswerBox({
    super.key,
    required this.item,
    required this.run,
    required this.initial,
    required this.enabled,
    required this.onChanged,
  });

  final StudyItem item;
  final StudyRun run;
  final String initial;
  final bool enabled;
  final ValueChanged<String> onChanged;

  @override
  State<_AnswerBox> createState() => _AnswerBoxState();
}

class _AnswerBoxState extends State<_AnswerBox> {
  late String _value = widget.initial;
  late final _text = TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final src = widget.item.source;
    if (src.hasChoices) {
      final letter = src.choiceMode == ChoiceMode.letter;
      final selected = src.choices!.indexed.where((e) => choiceAnswerCode(src.choiceMode, e.$1) == _value).map((e) => e.$1);
      return ChoiceGrid(
        groupLabel: 'Хариултын сонголтууд',
        selectedIndex: selected.isEmpty ? null : selected.first,
        choices: [
          for (final (i, c) in src.choices!.indexed)
            ChoiceItem(label: letter ? (c.label ?? String.fromCharCode(65 + i)) : '${i + 1}', text: c.text),
        ],
        onSelect: widget.enabled
            ? (i) {
                final code = choiceAnswerCode(src.choiceMode, i);
                setState(() => _value = _value == code ? '' : code);
                widget.onChanged(_value);
              }
            : null,
      );
    }
    final label = widget.item.first != null
        ? (widget.run.isOpen ? 'Дахин бодсон хариу' : 'Давтлагын дараах дасгалын хариу')
        : 'Эхний хариу';
    return TextField(
      controller: _text,
      enabled: widget.enabled,
      maxLength: 128,
      decoration: InputDecoration(
        labelText: label,
        hintText: src.format.name == 'fillNumber' ? 'Жишээ: 2, -0.5 эсвэл 1/3' : null,
      ),
      onChanged: widget.onChanged,
    );
  }
}

class _Reveal extends StatelessWidget {
  const _Reveal({required this.item});

  final StudyItem item;

  @override
  Widget build(BuildContext context) {
    final key = item.answerKey;
    final keyText = key == null ? null : (key is String ? key : key.toString());
    return ExpansionTile(
      tilePadding: EdgeInsets.zero,
      title: const Text('Хариу, тайлбар нээх'),
      childrenPadding: const EdgeInsets.only(bottom: AppSpace.md),
      expandedCrossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (keyText != null && keyText.isNotEmpty) MathText(keyText),
        if ((item.solution ?? '').isNotEmpty) ...[
          const SizedBox(height: AppSpace.sm),
          MathText(item.solution!),
        ] else
          Text('Бичгэн тайлбар оруулаагүй', style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
        const SizedBox(height: AppSpace.sm),
        Text(
          'Хаасны дараах дахин бодолт эхний үр дүнг өөрчлөхгүй',
          style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
        ),
      ],
    );
  }
}

class _Evidence extends StatelessWidget {
  const _Evidence({required this.run, required this.onReset});

  final StudyRun run;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    final e = run.evidence;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Эхний хариу өгсөн ${e.answered} / ${e.assigned}, зөв ${e.firstCorrect}. '
            'Тусламжийн тэмдэглэгээгүй эхний зөв ${e.independentFirstCorrect}.',
            style: context.text.bodyMedium,
          ),
          const SizedBox(height: AppSpace.sm),
          Text(
            'Хариулаагүй эсвэл тодорхойгүй ${e.unknown}. Дахин бодолтыг эхний зөвд нэмж тооцохгүй.',
            style: context.text.bodyMedium,
          ),
          if (run.caution.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Text(run.caution, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
          ],
          const SizedBox(height: AppSpace.lg),
          OutlinedButton.icon(
            onPressed: onReset,
            icon: const Icon(AppIcons.retry, size: 18),
            label: const Text('Өөр давтлага сонгох'),
          ),
        ],
      ),
    );
  }
}

/// Үлдсэн хугацаа. Серверийн цагтай тэгшилнэ; 0 болоход [onExpired] нэг удаа дуудна.
class ReviewCountdown extends StatefulWidget {
  const ReviewCountdown({super.key, required this.run, required this.fetchedAtDevice, required this.onExpired});

  final StudyRun run;
  final DateTime fetchedAtDevice;
  final VoidCallback onExpired;

  @override
  State<ReviewCountdown> createState() => _ReviewCountdownState();
}

class _ReviewCountdownState extends State<ReviewCountdown> {
  Timer? _timer;
  late int _left = _compute();
  bool _fired = false;

  int _compute() => remainingSeconds(
    deadlineAt: widget.run.deadlineAt,
    serverNow: widget.run.serverNow,
    deviceNowAtFetch: widget.fetchedAtDevice,
    deviceNow: DateTime.now().toUtc(),
    budgetMinutes: widget.run.budgetMinutes,
  );

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final left = _compute();
      setState(() => _left = left);
      if (left == 0 && !_fired) {
        _fired = true;
        widget.onExpired();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      Semantics(label: 'Үлдсэн хугацаа', child: Text(formatCountdown(_left), style: context.text.titleSmall));
}
