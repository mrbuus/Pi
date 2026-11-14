import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/anim/animation_slot.dart';
import '../../../shared/solution/solution.dart';
import '../data/problem_review_models.dart';
import '../data/problem_review_repository.dart';
import '../domain/mistake_answer.dart';
import 'inline_message.dart';
import 'mistake_detail.dart' show RetryAnswerInput;

/// `/app/study/due` — хугацаа нь болсон алдсан бодлогуудыг нэг нэгээр нь дахин бодно. Хариуг сервер шалгаж,
/// зөв бол дараагийн давталт хойшилно. Зөв хариу, бодолт зөвхөн сервер илгээсэн үед (хариулсны дараа).
class ProblemReviewScreen extends ConsumerStatefulWidget {
  const ProblemReviewScreen({super.key});

  @override
  ConsumerState<ProblemReviewScreen> createState() => _ProblemReviewScreenState();
}

class _ProblemReviewScreenState extends ConsumerState<ProblemReviewScreen> {
  /// Сесс эхлэх үеийн жагсаалт — дунд нь шинэчлэгдэж байр солигдохгүй.
  List<DueReview>? _items;
  int _position = 0;
  bool _done = false;
  final _results = <String, ReviewAnswerResult>{};

  void _finish() {
    ref.invalidate(dueProblemsProvider);
    setState(() => _done = true);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(dueProblemsProvider);
    final items = _items ?? async.value?.items;
    if (_items == null && async.hasValue) _items = async.value!.items;
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Бодлого давтах')),
      body: items == null
          ? async.hasError
                ? ErrorState(
                    title: 'Давтлага ачаалж чадсангүй',
                    message: errorText(async.error!),
                    onRetry: () => ref.invalidate(dueProblemsProvider),
                  )
                : const LoadingState(cards: 2)
          : items.isEmpty
          ? const EmptyState(
              icon: AppIcons.repeat,
              title: 'Өнөөдөр давтах бодлого алга',
              message: 'Алдсан бодлого маргаашаас эхлэн энд давтагдана',
            )
          : _done
          ? _Summary(total: _results.length, correct: _results.values.where((r) => r.correct).length)
          : _session(context, items),
    );
  }

  Widget _session(BuildContext context, List<DueReview> items) {
    final item = items[_position];
    final answered = _results.containsKey(item.id);
    final last = _position + 1 == items.length;
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(AppSpace.gutter),
            children: [
              Text('${_position + 1} / ${items.length}', style: context.text.labelLarge),
              const SizedBox(height: AppSpace.md),
              _ReviewItem(
                key: ValueKey(item.id),
                item: item,
                onAnswered: (r) => setState(() => _results.putIfAbsent(item.id, () => r)),
              ),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(AppSpace.gutter),
            child: SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: !answered
                    ? null
                    : last
                    ? _finish
                    : () => setState(() => _position++),
                child: Text(last ? 'Дүнгээ харах' : 'Дараагийнх'),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Нэг бодлого: нөхцөл, хариу оруулах (алдааны дэвтрийн widget), шалгах, үр дүн.
class _ReviewItem extends ConsumerStatefulWidget {
  const _ReviewItem({super.key, required this.item, required this.onAnswered});

  final DueReview item;
  final ValueChanged<ReviewAnswerResult> onAnswered;

  @override
  ConsumerState<_ReviewItem> createState() => _ReviewItemState();
}

class _ReviewItemState extends ConsumerState<_ReviewItem> {
  Object? _value;
  bool _busy = false;
  String? _error;
  ReviewAnswerResult? _result;

  Future<void> _submit() async {
    final answer = buildRetryAnswer(widget.item.problem, _value);
    if (answer == null || _busy || _result != null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final r = await ref.read(problemReviewRepositoryProvider).answer(widget.item.id, answer);
      if (!mounted) return;
      setState(() => _result = r);
      widget.onAnswered(r);
    } catch (e) {
      if (mounted) {
        setState(() => _error = errorText(e, 'Хариуг шалгаж чадсангүй. Холболтоо шалгаад дахин оролдоно уу.'));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = widget.item.problem;
    final images = ref.watch(fileImageProvider);
    final r = _result;
    final correct = r == null ? null : displayCorrectAnswer(r.correctAnswer);
    final solution = r?.solutionOutline ?? '';
    final locked = _busy || r != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        RepaintBoundary(
          child: ProblemFigure(
            image: p.imageKey == null ? null : images.image(p.imageKey!),
            alt: 'Бодлогын зураг',
            child: MathText(p.statementText ?? 'Бодлогын нөхцөл олдсонгүй', style: context.text.bodyLarge),
          ),
        ),
        const SizedBox(height: AppSpace.xl),
        Text('Дахин бодоод хариулна уу', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.md),
        RetryAnswerInput(
          problem: p,
          value: _value,
          enabled: !locked,
          imageFor: images.image,
          onChanged: (v) => setState(() => _value = v),
        ),
        const SizedBox(height: AppSpace.lg),
        if (r == null)
          FilledButton(
            onPressed: buildRetryAnswer(p, _value) != null && !_busy ? _submit : null,
            child: Text(_busy ? 'Шалгаж байна' : 'Хариуг шалгах'),
          ),
        if (_error != null) ...[const SizedBox(height: AppSpace.md), InlineMessage(_error!)],
        if (r != null) ...[
          if (r.correct)
            const Center(
              child: AnimationSlot(slot: AnimSlot.correctBurst, size: 96, fallback: SizedBox.shrink()),
            ),
          InlineMessage(
            r.correct ? 'Зөв' : 'Одоохондоо зөрүүтэй байна',
            icon: r.correct ? AppIcons.success : AppIcons.info,
            isError: false,
          ),
          if (r.dueAt != null) ...[
            const SizedBox(height: AppSpace.xs),
            Text(
              'Дараагийн давталт: ${DateMn.numeric(UbDateTime.fromInstant(r.dueAt!))}',
              style: context.text.bodySmall?.copyWith(color: c.inkDim),
            ),
          ],
        ],
        if (correct != null || solution.isNotEmpty) ...[
          const SizedBox(height: AppSpace.lg),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (correct != null)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Зөв хариу: ', style: context.text.titleSmall),
                      Expanded(child: MathText(correct)),
                    ],
                  ),
                if (solution.isNotEmpty) ...[
                  if (correct != null) const SizedBox(height: AppSpace.md),
                  SolutionView(source: solution),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.total, required this.correct});

  final int total;
  final int correct;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: AppIcons.success,
      title: '$total бодлогоос $correct-ийг зөв бодлоо',
      message: total - correct > 0
          ? 'Зөрүүтэй бодлогууд маргааш дахин гарна'
          : 'Дараагийн давталт хэдэн өдрийн дараа гарна',
      action: FilledButton(onPressed: () => context.go('/app/study'), child: const Text('Суралцах руу буцах')),
    );
  }
}
