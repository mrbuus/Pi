import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/formula_review_models.dart';
import '../data/formula_review_repository.dart';
import 'inline_message.dart';

enum _SubState { saving, failed, saved }

class _Submission {
  const _Submission({
    required this.card,
    required this.body,
    required this.state,
    this.error,
    this.needsRefresh = false,
    this.receipt,
  });

  final ReviewCard card;
  final ReviewAnswer body;
  final _SubState state;
  final String? error;
  final bool needsRefresh;
  final ReviewReceipt? receipt;

  _Submission copy({required _SubState state, String? error, bool needsRefresh = false, ReviewReceipt? receipt}) =>
      _Submission(
        card: card,
        body: body,
        state: state,
        error: error,
        needsRefresh: needsRefresh,
        receipt: receipt ?? this.receipt,
      );
}

/// `/app/formulas/review` — томьёо цээжлэх (SRS). Вэбийн `ReviewClient`-тэй ижил урсгал:
/// өнөөдрийн карт → нэг нэгээр нь хариулж, ХАРИУЛТ БҮР ХАДГАЛАГДСАНЫ дараа дараагийн карт руу орно.
/// Флэш картыг өөрөө үнэлнэ, бусад дасгалыг сервер шалгана. Өдрийн цуваа, дарамт, зэмлэл үгүй.
class FormulaReviewScreen extends ConsumerStatefulWidget {
  const FormulaReviewScreen({super.key});

  @override
  ConsumerState<FormulaReviewScreen> createState() => _FormulaReviewScreenState();
}

class _FormulaReviewScreenState extends ConsumerState<FormulaReviewScreen> {
  List<ReviewCard>? _deck;
  int _index = 0;
  DateTime _startedAt = DateTime.now();
  int _elapsed = 0;
  final Map<String, ReviewReceipt> _outcomes = {};
  _Submission? _sub;

  void _home() {
    setState(() {
      _deck = null;
      _sub = null;
    });
    ref.invalidate(formulaReviewHomeProvider);
    ref.invalidate(formulaReviewCountProvider);
  }

  void _start(List<ReviewCard> cards) => setState(() {
    _deck = cards;
    _index = 0;
    _outcomes.clear();
    _sub = null;
    _startedAt = DateTime.now();
  });

  Future<void> _send(_Submission pending) async {
    setState(() => _sub = pending.copy(state: _SubState.saving));
    bool same() => _sub?.body.exerciseToken == pending.body.exerciseToken;
    try {
      final receipt = await ref.read(formulaReviewRepositoryProvider).answer(pending.card.slug, pending.body);
      if (!mounted) return;
      _outcomes[pending.card.slug] = receipt;
      if (same()) {
        setState(() => _sub = pending.copy(state: _SubState.saved, receipt: receipt));
      }
    } catch (e) {
      if (!mounted || !same()) return;
      final conflict = e is ApiError && e.kind == ApiErrorKind.conflict;
      setState(
        () => _sub = pending.copy(
          state: _SubState.failed,
          error: errorText(e, 'Хариулт хадгалагдсангүй. Дахин оролдоно уу'),
          needsRefresh: conflict,
        ),
      );
    }
  }

  void _answer(ReviewCard card, {ReviewResult? result, String? answer}) {
    if (_sub != null) return;
    _send(
      _Submission(
        card: card,
        body: ReviewAnswer(exerciseToken: card.exercise.token, result: result, answer: answer),
        state: _SubState.saving,
      ),
    );
  }

  void _next() {
    if (_sub?.state != _SubState.saved) return;
    setState(() {
      _sub = null;
      _index += 1;
      _elapsed = DateTime.now().difference(_startedAt).inSeconds.clamp(1, 86400);
    });
  }

  @override
  Widget build(BuildContext context) {
    final deck = _deck;
    final Widget body;
    if (deck == null) {
      body = _HomeView(onStart: _start);
    } else if (_index >= deck.length) {
      body = _DoneView(deck: deck, outcomes: _outcomes, elapsed: _elapsed, onHome: _home);
    } else {
      body = _RunView(
        deck: deck,
        index: _index,
        outcomes: _outcomes,
        sub: _sub,
        onAnswer: _answer,
        onRetry: () => _send(_sub!),
        onNext: _next,
        onReload: _home,
      );
    }
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Томьёо цээжлэх')),
      body: body,
    );
  }
}

class _HomeView extends ConsumerWidget {
  const _HomeView({required this.onStart});

  final void Function(List<ReviewCard>) onStart;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(formulaReviewHomeProvider);
    return async.when(
      loading: () => const LoadingState(cards: 3),
      error: (e, _) => ErrorState(
        title: 'Давталт ачаалж чадсангүй',
        message: errorText(e),
        onRetry: () => ref.invalidate(formulaReviewHomeProvider),
      ),
      data: (h) {
        final c = context.colors;
        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(formulaReviewHomeProvider);
            await ref.read(formulaReviewHomeProvider.future).then<Object?>((v) => v, onError: (Object _) => null);
          },
          child: ListView(
            padding: const EdgeInsets.all(AppSpace.gutter),
            children: [
              Text('Өдөр бүр бага багаар', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
              const SizedBox(height: AppSpace.xs),
              Text('Санаанаасаа сэргээж, өөр төрлийн дасгалаар мэдлэгээ бататгаарай', style: context.text.bodyMedium),
              const SizedBox(height: AppSpace.lg),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(AppIcons.formula, size: 20, color: c.brandSoft),
                        const SizedBox(width: AppSpace.sm),
                        Text('Өнөөдрийн карт', style: context.text.titleMedium?.copyWith(color: c.brandSoft)),
                      ],
                    ),
                    const SizedBox(height: AppSpace.sm),
                    Text('${h.due.total}', style: context.text.displaySmall),
                    Text(
                      'Давтах ${h.due.dueCount}, шинэ ${h.due.newCount}, өнөөдөр давтсан ${h.stats.reviewedToday}',
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                    ),
                    const SizedBox(height: AppSpace.md),
                    if (h.due.cards.isNotEmpty)
                      FilledButton(
                        onPressed: () => onStart(h.due.cards),
                        child: Text('Эхлэх (${h.due.cards.length} карт)'),
                      )
                    else
                      const EmptyState(
                        icon: AppIcons.success,
                        title: 'Өнөөдрийн давталт дууслаа',
                        message: 'Дараагийн давталтын өдөр шинэ карт гарна',
                      ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpace.md),
              Row(
                children: [
                  Expanded(
                    child: _Stat(label: 'Эзэмшсэн', value: h.stats.mastered),
                  ),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(
                    child: _Stat(label: 'Сурч байгаа', value: h.stats.learning),
                  ),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(
                    child: _Stat(label: 'Шинэ', value: h.stats.fresh),
                  ),
                ],
              ),
              if (h.stats.streakDays > 0) ...[
                const SizedBox(height: AppSpace.md),
                Text(
                  '${h.stats.streakDays} өдөр дараалан давтсан',
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  textAlign: TextAlign.center,
                ),
              ],
              const SizedBox(height: AppSpace.md),
              Text(
                'Хариулт бүрийг хадгалсны дараа дараагийн карт руу орно. Флэш картыг өөрөө үнэлнэ, бусад дасгалыг систем шалгана',
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: AppSpace.md),
      child: Column(
        children: [
          Text(
            label,
            style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpace.xs),
          Text('$value', style: context.text.titleLarge),
        ],
      ),
    );
  }
}

class _DoneView extends StatelessWidget {
  const _DoneView({required this.deck, required this.outcomes, required this.elapsed, required this.onHome});

  final List<ReviewCard> deck;
  final Map<String, ReviewReceipt> outcomes;
  final int elapsed;
  final VoidCallback onHome;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    bool hardOf(ReviewCard x) =>
        outcomes[x.slug]?.result == ReviewResult.again || outcomes[x.slug]?.result == ReviewResult.hard;
    final hard = deck.where(hardOf).toList()
      ..sort(
        (a, b) => (outcomes[a.slug]?.result == ReviewResult.again ? 0 : 1).compareTo(
          outcomes[b.slug]?.result == ReviewResult.again ? 0 : 1,
        ),
      );
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        AppCard(
          child: Column(
            children: [
              Icon(AppIcons.ranking, size: 40, color: c.brand),
              const SizedBox(height: AppSpace.sm),
              Text('${deck.length}/${deck.length} давтлаа', style: context.text.titleLarge),
              const SizedBox(height: AppSpace.xs),
              Text(
                'Хугацаа: ${elapsed ~/ 60} мин ${elapsed % 60} сек',
                style: context.text.bodyMedium?.copyWith(color: c.inkDim),
              ),
              const SizedBox(height: AppSpace.xs),
              const Text('Өнөөдрийн хариултууд хадгалагдлаа'),
              const SizedBox(height: AppSpace.lg),
              FilledButton(onPressed: onHome, child: const Text('Давталтын нүүр рүү')),
            ],
          ),
        ),
        if (hard.isNotEmpty) ...[
          const SectionHeader(title: 'Дахин анхаарах томьёонууд'),
          for (final x in hard.take(3)) ...[
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, AppSizes.minTap),
                alignment: AlignmentDirectional.centerStart,
              ),
              onPressed: () => context.push('/app/formulas/${Uri.encodeComponent(x.slug)}'),
              child: Text(x.title, textAlign: TextAlign.start),
            ),
            const SizedBox(height: AppSpace.sm),
          ],
        ],
      ],
    );
  }
}

class _RunView extends StatelessWidget {
  const _RunView({
    required this.deck,
    required this.index,
    required this.outcomes,
    required this.sub,
    required this.onAnswer,
    required this.onRetry,
    required this.onNext,
    required this.onReload,
  });

  final List<ReviewCard> deck;
  final int index;
  final Map<String, ReviewReceipt> outcomes;
  final _Submission? sub;
  final void Function(ReviewCard card, {ReviewResult? result, String? answer}) onAnswer;
  final VoidCallback onRetry;
  final VoidCallback onNext;
  final VoidCallback onReload;

  @override
  Widget build(BuildContext context) {
    final card = deck[index];
    final locked = sub != null;
    final group = card.exercise.groupId == null
        ? const <ReviewCard>[]
        : [
            for (final x in deck)
              if (x.exercise.groupId == card.exercise.groupId) x,
          ];
    final feedback = sub?.receipt?.feedback;
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        Row(
          children: [
            Expanded(child: Text(card.exercise.mode.label, style: context.text.titleSmall)),
            Text('${index + 1}/${deck.length} карт', style: context.text.titleSmall),
          ],
        ),
        const SizedBox(height: AppSpace.sm),
        LinearProgressIndicator(
          value: index / deck.length,
          minHeight: 6,
          borderRadius: BorderRadius.circular(3),
          semanticsLabel: 'Давталтын явц',
        ),
        const SizedBox(height: AppSpace.lg),
        switch (card.exercise.mode) {
          ReviewMode.flashcard => _FlashCard(
            key: ValueKey(card.slug),
            card: card,
            disabled: locked,
            onRate: (r) => onAnswer(card, result: r),
          ),
          ReviewMode.match => _MatchExercise(
            key: ValueKey(card.exercise.groupId ?? card.slug),
            cards: group.isEmpty ? [card] : group,
            outcomes: outcomes,
            disabled: locked,
            onAnswer: (target, id) => onAnswer(target, answer: id),
          ),
          _ => _ChoiceExercise(
            card: card,
            selected: sub?.body.answer,
            feedback: feedback,
            disabled: locked,
            onPick: (id) => onAnswer(card, answer: id),
          ),
        },
        const SizedBox(height: AppSpace.lg),
        if (sub?.state == _SubState.saving)
          Row(
            children: [
              const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
              const SizedBox(width: AppSpace.sm),
              Text('Хариулт хадгалж байна', style: context.text.bodyMedium),
            ],
          ),
        if (sub?.state == _SubState.failed) ...[
          InlineMessage(sub!.error ?? 'Хариулт хадгалагдсангүй. Дахин оролдоно уу'),
          const SizedBox(height: AppSpace.sm),
          if (sub!.needsRefresh) ...[
            Text(
              'Дасгалын мэдээлэл шинэчлэгдсэн эсвэл хугацаа дууссан байна. Өмнө хадгалсан давталтууд хэвээр үлдэнэ',
              style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
            ),
            const SizedBox(height: AppSpace.sm),
            FilledButton(onPressed: onReload, child: const Text('Давталтыг шинээр ачаалах')),
          ] else ...[
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(AppIcons.retry, size: 18),
              label: const Text(AppStrings.retry),
            ),
            const SizedBox(height: AppSpace.sm),
            Text(
              'Сонгосон хариулт хадгалагдаагүй байна. Дахин оролдвол давхар бүртгэгдэхгүй',
              style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
            ),
          ],
        ],
        if (sub?.state == _SubState.saved) ...[
          _FeedbackPanel(card: sub!.card, receipt: sub!.receipt!),
          const SizedBox(height: AppSpace.md),
          FilledButton(onPressed: onNext, child: Text(index + 1 == deck.length ? 'Дүнгээ харах' : 'Дараагийн карт')),
        ],
      ],
    );
  }
}

class _FlashCard extends StatefulWidget {
  const _FlashCard({super.key, required this.card, required this.disabled, required this.onRate});

  final ReviewCard card;
  final bool disabled;
  final void Function(ReviewResult) onRate;

  @override
  State<_FlashCard> createState() => _FlashCardState();
}

class _FlashCardState extends State<_FlashCard> {
  bool _flipped = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final card = widget.card;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Өөрийн үнэлгээ. Томьёогоо санаад картыг эргүүлээрэй',
          style: context.text.bodySmall?.copyWith(color: c.inkDim),
        ),
        const SizedBox(height: AppSpace.md),
        Semantics(
          button: true,
          label: '${card.title}: ${_flipped ? 'Томьёоны асуулт руу эргүүлэх' : 'Томьёоны хариуг харах'}',
          excludeSemantics: true,
          child: InkWell(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            onTap: widget.disabled ? null : () => setState(() => _flipped = !_flipped),
            child: Container(
              constraints: const BoxConstraints(minHeight: 200),
              padding: const EdgeInsets.all(AppSpace.lg),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: c.line, width: 2),
              ),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 180),
                child: Column(
                  key: ValueKey(_flipped),
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(card.title, style: context.text.titleMedium, textAlign: TextAlign.center),
                    const SizedBox(height: AppSpace.md),
                    if (_flipped)
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: MathText('\$\$${card.latex ?? ''}\$\$'),
                      )
                    else ...[
                      const MathText(r'$$\square$$'),
                      const SizedBox(height: AppSpace.md),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(AppIcons.retry, size: 16, color: c.inkDim),
                          const SizedBox(width: AppSpace.xs),
                          Text('Эргүүлж шалгах', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
        if (_flipped) ...[
          const SizedBox(height: AppSpace.md),
          Semantics(
            container: true,
            label: 'Өөрийн үнэлгээ',
            child: Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final r in ReviewResult.values)
                  SizedBox(
                    width: (MediaQuery.sizeOf(context).width - AppSpace.gutter * 2 - AppSpace.sm) / 2 - 0.5,
                    child: r == ReviewResult.good
                        ? FilledButton(
                            style: FilledButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                            onPressed: widget.disabled ? null : () => widget.onRate(r),
                            child: Text(r.label),
                          )
                        : OutlinedButton(
                            style: OutlinedButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                            onPressed: widget.disabled ? null : () => widget.onRate(r),
                            child: Text(r.label),
                          ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// «Нөхөх», «Үнэн эсвэл худал».
class _ChoiceExercise extends StatelessWidget {
  const _ChoiceExercise({
    required this.card,
    required this.selected,
    required this.feedback,
    required this.disabled,
    required this.onPick,
  });

  final ReviewCard card;
  final String? selected;
  final ReviewFeedback? feedback;
  final bool disabled;
  final void Function(String id) onPick;

  @override
  Widget build(BuildContext context) {
    final ex = card.exercise;
    final blank = ex.mode == ReviewMode.blank;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(card.title, style: context.text.titleMedium),
        const SizedBox(height: AppSpace.sm),
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: MathText('\$${ex.prompt ?? ''}\$')),
        const SizedBox(height: AppSpace.md),
        Semantics(
          container: true,
          label: 'Хариултын сонголтууд',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final o in ex.options)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.sm),
                  child: _OptionButton(
                    selected: selected == o.id,
                    correct: feedback != null && (blank ? o.text == feedback!.answer : o.id == feedback!.answer),
                    onPressed: disabled ? null : () => onPick(o.id),
                    child: blank ? MathText('\$${o.text}\$') : Text(o.text),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _OptionButton extends StatelessWidget {
  const _OptionButton({required this.selected, required this.correct, required this.onPressed, required this.child});

  final bool selected;
  final bool correct;
  final VoidCallback? onPressed;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      selected: selected,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(0, AppSizes.minTap),
          side: BorderSide(
            color: correct ? c.success : (selected ? c.brand : c.line),
            width: correct || selected ? 2 : 1,
          ),
        ),
        onPressed: onPressed,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (correct) ...[Icon(AppIcons.success, size: 18, color: c.success), const SizedBox(width: AppSpace.sm)],
            Flexible(
              child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: child),
            ),
          ],
        ),
      ),
    );
  }
}

/// «Хос тааруулах»: гарчиг сонгоод тохирох томьёог дарна. Хос бүрийн эхний хариултыг бүртгэнэ.
class _MatchExercise extends StatefulWidget {
  const _MatchExercise({
    super.key,
    required this.cards,
    required this.outcomes,
    required this.disabled,
    required this.onAnswer,
  });

  final List<ReviewCard> cards;
  final Map<String, ReviewReceipt> outcomes;
  final bool disabled;
  final void Function(ReviewCard target, String optionId) onAnswer;

  @override
  State<_MatchExercise> createState() => _MatchExerciseState();
}

class _MatchExerciseState extends State<_MatchExercise> {
  late String _selected = widget.cards.first.slug;

  @override
  Widget build(BuildContext context) {
    final cards = widget.cards;
    final remaining = [
      for (final x in cards)
        if (!widget.outcomes.containsKey(x.slug)) x,
    ];
    ReviewCard? active;
    for (final x in remaining) {
      if (x.slug == _selected) active = x;
    }
    active ??= remaining.isEmpty ? null : remaining.first;
    final used = {for (final x in cards) ?widget.outcomes[x.slug]?.feedback?.answer};
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Гарчиг сонгоод тохирох томьёог дарна уу. Хос бүрийн эхний хариултыг бүртгэнэ',
          style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
        ),
        const SizedBox(height: AppSpace.md),
        for (final x in cards)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.sm),
            child: Semantics(
              selected: active?.slug == x.slug,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, AppSizes.minTap),
                  alignment: AlignmentDirectional.centerStart,
                  side: BorderSide(
                    color: active?.slug == x.slug ? context.colors.brand : context.colors.line,
                    width: active?.slug == x.slug ? 2 : 1,
                  ),
                ),
                onPressed: widget.disabled || widget.outcomes.containsKey(x.slug)
                    ? null
                    : () => setState(() => _selected = x.slug),
                icon: widget.outcomes.containsKey(x.slug)
                    ? const Icon(AppIcons.check, size: 18)
                    : const SizedBox(width: 0),
                label: Text(x.title, textAlign: TextAlign.start),
              ),
            ),
          ),
        const SizedBox(height: AppSpace.sm),
        for (final o in cards.first.exercise.options)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.sm),
            child: OutlinedButton(
              style: OutlinedButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
              onPressed: widget.disabled || active == null || used.contains(o.text)
                  ? null
                  : () => widget.onAnswer(active!, o.id),
              child: SingleChildScrollView(scrollDirection: Axis.horizontal, child: MathText('\$${o.text}\$')),
            ),
          ),
        if (active != null)
          Semantics(
            liveRegion: true,
            child: Text(
              'Сонгосон гарчиг: ${active.title}',
              style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
            ),
          ),
      ],
    );
  }
}

class _FeedbackPanel extends StatelessWidget {
  const _FeedbackPanel({required this.card, required this.receipt});

  final ReviewCard card;
  final ReviewReceipt receipt;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final f = receipt.feedback;
    final mode = card.exercise.mode;
    final answer = f == null
        ? null
        : (mode == ReviewMode.match || mode == ReviewMode.blank)
        ? '\$${f.answer}\$'
        : f.answer == 'true'
        ? 'Үнэн'
        : f.answer == 'false'
        ? 'Худал'
        : f.answer;
    final due = parseApiInstant(receipt.dueAt);
    return Semantics(
      liveRegion: true,
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  f?.correct == false ? AppIcons.info : AppIcons.success,
                  size: 20,
                  color: f?.correct == false ? c.info : c.success,
                ),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Text(
                    f == null ? 'Өөрийн үнэлгээ хадгалагдлаа' : (f.correct ? 'Зөв хариуллаа' : 'Дахин санаарай'),
                    style: context.text.titleSmall,
                  ),
                ),
              ],
            ),
            if (f != null && answer != null) ...[
              const SizedBox(height: AppSpace.sm),
              Text('Зөв хариулт', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
              SingleChildScrollView(scrollDirection: Axis.horizontal, child: MathText(answer)),
              if (f.why != null && f.why!.isNotEmpty) ...[const SizedBox(height: AppSpace.sm), MathText(f.why!)],
            ],
            if (due != null) ...[
              const SizedBox(height: AppSpace.sm),
              Text(
                'Дараагийн давталт: ${DateMn.numericWithTime(UbDateTime.fromInstant(due))}',
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
