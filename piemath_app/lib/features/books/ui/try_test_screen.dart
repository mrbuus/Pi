import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/books_models.dart';
import '../data/books_repository.dart';
import '../domain/try_logic.dart';
import 'books_common.dart';

/// Үнэгүй тестийг нэвтрэлтгүй бодох (`/books/:code/try/:testId`, вэбийн `books/TryTest.tsx`).
///
/// Хариу утсан дээр (санах ойд), дүнг СЕРВЕР бодно (зөв/буруу л ирнэ — зөв хариу, бодолт
/// эрхтэй сурагчдад). Сонголт холилдохгүй (TEXT хариу = эх индекс).
class TryTestScreen extends ConsumerStatefulWidget {
  const TryTestScreen({super.key, required this.code, required this.testId, this.now});

  final String code;
  final String testId;

  /// Тестэд цаг солих.
  final DateTime Function()? now;

  @override
  ConsumerState<TryTestScreen> createState() => _TryTestScreenState();
}

class _TryTestScreenState extends ConsumerState<TryTestScreen> {
  final _answers = <String, Object>{};
  DateTime? _startedAt;
  TryResult? _result;
  bool _busy = false;
  Timer? _ticker;
  final _scroll = ScrollController();

  DateTime _now() => (widget.now ?? DateTime.now)();

  @override
  void dispose() {
    _ticker?.cancel();
    _scroll.dispose();
    super.dispose();
  }

  void _begin(TryView view) {
    if (_startedAt != null) return;
    setState(() => _startedAt = _now());
    final limit = view.timeLimitMin ?? 0;
    if (limit <= 0) return;
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _result != null) return;
      if (_left(view) <= 0) {
        _ticker?.cancel();
        unawaited(_grade());
      } else {
        setState(() {});
      }
    });
  }

  int _left(TryView view) {
    final limit = (view.timeLimitMin ?? 0) * 60;
    if (_startedAt == null || limit == 0) return limit;
    return limit - _now().difference(_startedAt!).inSeconds;
  }

  void _answer(TryView view, String pid, Object? value) {
    setState(() {
      if (value == null || !isAnswered(value)) {
        _answers.remove(pid);
      } else {
        _answers[pid] = value;
      }
    });
    _begin(view);
  }

  Future<void> _grade() async {
    if (_busy || _result != null) return;
    setState(() => _busy = true);
    try {
      final r = await gradeTryTest(ref, widget.testId, Map.of(_answers));
      if (!mounted) return;
      _ticker?.cancel();
      setState(() => _result = r);
      if (_scroll.hasClients) {
        unawaited(_scroll.animateTo(0, duration: AppMotion.of(context, AppMotion.enter), curve: Curves.easeOut));
      }
    } on ApiError catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _reset() {
    _ticker?.cancel();
    setState(() {
      _answers.clear();
      _result = null;
      _startedAt = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(tryTestProvider(widget.testId));
    final view = async.value;
    final title = view == null
        ? 'Үнэгүй тест'
        : '${MetaTitle.split(view.chapterTitle).last}${view.variantLabel != null ? ', ${view.variantLabel} хувилбар' : ''}';
    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          if (view != null && _startedAt != null && _result == null && (view.timeLimitMin ?? 0) > 0)
            Padding(
              padding: const EdgeInsets.only(right: AppSpace.lg),
              child: _TimerChip(seconds: _left(view)),
            ),
        ],
      ),
      body: async.when(
        loading: () => const LoadingState(),
        error: (e, _) {
          if (e is ApiError && e.kind == ApiErrorKind.forbidden) {
            return EmptyState(
              icon: BooksIcons.lock,
              title: e.message,
              message: accessNoteText,
              action: OutlinedButton(
                onPressed: () => openWeb('/books/${Uri.encodeComponent(widget.code)}'),
                child: const Text('Вэбээр нээх'),
              ),
            );
          }
          return publicError(e, onRetry: () => ref.invalidate(tryTestProvider(widget.testId)));
        },
        data: (v) => _buildBody(context, v),
      ),
    );
  }

  Widget _buildBody(BuildContext context, TryView view) {
    final answered = view.problems.where((p) => _answers.containsKey(p.id)).length;
    final result = _result;
    return ListView(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        if (result != null)
          _ResultCard(result: result, onAgain: _reset)
        else if (_startedAt == null)
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  view.timeLimitMin != null && view.timeLimitMin! > 0
                      ? '${view.problems.length} бодлого, ${view.timeLimitMin} минут'
                      : '${view.problems.length} бодлого',
                  style: context.text.titleSmall,
                ),
                const SizedBox(height: AppSpace.xs),
                Text('Эхний хариугаа сонгомогц цаг явна', style: context.text.bodySmall),
                const SizedBox(height: AppSpace.md),
                OutlinedButton.icon(
                  icon: const Icon(AppIcons.time, size: 18),
                  label: const Text('Цагаа эхлүүлэх'),
                  onPressed: () => _begin(view),
                ),
              ],
            ),
          )
        else
          Text('$answered/${view.problems.length} бодлогод хариулсан', style: context.text.bodySmall),
        for (final p in view.problems) ...[
          const SizedBox(height: AppSpace.md),
          _ProblemCard(
            key: ValueKey(p.id),
            testId: widget.testId,
            problem: p,
            answer: _answers[p.id],
            locked: result != null,
            verdict: result?.perProblem.containsKey(p.id) ?? false ? result!.perProblem[p.id] : null,
            graded: result != null,
            onAnswer: (v) => _answer(view, p.id, v),
          ),
        ],
        if (result == null) ...[
          const SizedBox(height: AppSpace.xl),
          FilledButton.icon(
            icon: _busy
                ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(BooksIcons.send, size: 18),
            label: const Text('Дүгнүүлэх'),
            onPressed: _busy ? null : _grade,
          ),
        ],
        const SizedBox(height: AppSpace.xl),
        AccessNoteCard(webPath: '/books/${Uri.encodeComponent(widget.code)}'),
      ],
    );
  }
}

class _TimerChip extends StatelessWidget {
  const _TimerChip({required this.seconds});

  final int seconds;

  @override
  Widget build(BuildContext context) {
    final low = seconds < 120;
    final color = low ? context.colors.error : context.colors.brand;
    return Semantics(
      label: 'Үлдсэн хугацаа ${seconds ~/ 60} минут',
      child: ExcludeSemantics(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(AppIcons.time, size: 16, color: color),
            const SizedBox(width: AppSpace.xs),
            Text(
              mmss(seconds),
              style: context.text.titleSmall?.copyWith(color: color, fontFeatures: const [FontFeature.tabularFigures()]),
            ),
          ],
        ),
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.result, required this.onAgain});

  final TryResult result;
  final VoidCallback onAgain;

  @override
  Widget build(BuildContext context) {
    final pct = result.percent;
    return Semantics(
      liveRegion: true,
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${_fmt(result.score)} / ${_fmt(result.max)} оноо', style: context.text.displaySmall),
            const SizedBox(height: AppSpace.xs),
            Text('$pct%, ${result.answered} бодлогод хариулсан, ${tryVerdict(pct)}', style: context.text.bodyMedium),
            const SizedBox(height: AppSpace.md),
            OutlinedButton.icon(
              icon: const Icon(BooksIcons.again, size: 18),
              label: const Text('Дахин бодох'),
              onPressed: onAgain,
            ),
            const SizedBox(height: AppSpace.sm),
            Text('Зөв хариу, бодолт, видео тайлбар номын эрхтэй сурагчдад нээгдэнэ', style: context.text.bodySmall),
          ],
        ),
      ),
    );
  }

  static String _fmt(num v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();
}

class _ProblemCard extends ConsumerWidget {
  const _ProblemCard({
    super.key,
    required this.testId,
    required this.problem,
    required this.answer,
    required this.locked,
    required this.verdict,
    required this.graded,
    required this.onAnswer,
  });

  final String testId;
  final TryProblem problem;
  final Object? answer;
  final bool locked;
  final bool? verdict;
  final bool graded;
  final ValueChanged<Object?> onAnswer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = problem;
    final c = context.colors;
    final accent = !graded ? null : (verdict == true ? c.success : (verdict == false ? c.error : null));
    return AppCard(
      accent: accent,
      semanticLabel: '${p.n}-р бодлого',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text('${p.n}.', style: context.text.titleMedium?.copyWith(color: c.brand)),
              const Spacer(),
              if (graded) _VerdictBadge(verdict: verdict) else Text('${p.points} оноо', style: context.text.bodySmall),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          ProblemFigure(
            image: p.imageKey == null ? null : tryImage(ref, testId, p.imageKey!),
            alt: '${p.n}-р бодлогын зураг',
            child: MathText(p.statementText ?? ''),
          ),
          const SizedBox(height: AppSpace.lg),
          if (p.hasChoices)
            _choices(ref)
          else if (p.format == 'FILL_NUMBER')
            _FillAnswer(problem: p, value: answer, locked: locked, onChanged: onAnswer)
          else
            _TextAnswer(value: answer is String ? answer! as String : '', locked: locked, onChanged: onAnswer),
        ],
      ),
    );
  }

  Widget _choices(WidgetRef ref) {
    final p = problem;
    final textMode = p.choiceMode == 'TEXT';
    final choices = p.choices!;
    final selected = textMode ? (answer is int ? answer! as int : null) : (answer is String ? choices.indexOf(answer! as String) : null);
    return ChoiceGrid(
      groupLabel: '${p.n}-р бодлогын хариултын сонголтууд',
      selectedIndex: selected == null || selected < 0 ? null : selected,
      onSelect: locked ? null : (i) => onAnswer(textMode ? i : choices[i]),
      choices: [
        for (var i = 0; i < choices.length; i++)
          textMode
              ? ChoiceItem(
                  label: i < choiceLetters.length ? choiceLetters[i] : '${i + 1}',
                  text: choices[i],
                  image: (p.choiceImages != null && i < p.choiceImages!.length && p.choiceImages![i] != null)
                      ? tryImage(ref, testId, p.choiceImages![i]!)
                      : null,
                )
              : ChoiceItem(label: choices[i]),
      ],
    );
  }
}

class _VerdictBadge extends StatelessWidget {
  const _VerdictBadge({required this.verdict});

  final bool? verdict;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (icon, text, color) = switch (verdict) {
      true => (AppIcons.success, 'Зөв', c.success),
      false => (AppIcons.failure, 'Буруу', c.error),
      null => (AppIcons.info, 'Дүнд ороогүй', c.inkDim),
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: AppSpace.xs),
        Text(text, style: context.text.labelMedium?.copyWith(color: color)),
      ],
    );
  }
}

/// Нөхөх бодлого: нүдтэй (`[a]`, `[bc]`) бол нүд бүрт талбар, үгүй бол нэг талбар.
class _FillAnswer extends StatefulWidget {
  const _FillAnswer({required this.problem, required this.value, required this.locked, required this.onChanged});

  final TryProblem problem;
  final Object? value;
  final bool locked;
  final ValueChanged<Object?> onChanged;

  @override
  State<_FillAnswer> createState() => _FillAnswerState();
}

class _FillAnswerState extends State<_FillAnswer> {
  late final List<String> _slots = parseFillSlots(widget.problem.statementText);
  final _ctrls = <String, TextEditingController>{};

  TextEditingController _ctrl(String slot) => _ctrls.putIfAbsent(slot, TextEditingController.new);

  @override
  void didUpdateWidget(covariant _FillAnswer old) {
    super.didUpdateWidget(old);
    // «Дахин бодох» — хариу арилсан бол талбаруудыг цэвэрлэнэ.
    if (widget.value == null) {
      for (final c in _ctrls.values) {
        c.clear();
      }
    }
  }

  @override
  void dispose() {
    for (final c in _ctrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_slots.isEmpty) {
      return _TextAnswer(
        value: widget.value is String ? widget.value! as String : '',
        locked: widget.locked,
        numeric: true,
        onChanged: widget.onChanged,
      );
    }
    return Wrap(
      spacing: AppSpace.md,
      runSpacing: AppSpace.md,
      children: [
        for (final s in _slots)
          SizedBox(
            width: 64.0 + s.length * 16,
            child: TextField(
              controller: _ctrl(s),
              enabled: !widget.locked,
              keyboardType: const TextInputType.numberWithOptions(signed: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9\-]')),
                LengthLimitingTextInputFormatter(s.length),
              ],
              textAlign: TextAlign.center,
              decoration: InputDecoration(labelText: s),
              onChanged: (_) => widget.onChanged(encodeSlotAnswer({for (final x in _slots) x: _ctrl(x).text})),
            ),
          ),
      ],
    );
  }
}

class _TextAnswer extends StatefulWidget {
  const _TextAnswer({required this.value, required this.locked, required this.onChanged, this.numeric = false});

  final String value;
  final bool locked;
  final bool numeric;
  final ValueChanged<Object?> onChanged;

  @override
  State<_TextAnswer> createState() => _TextAnswerState();
}

class _TextAnswerState extends State<_TextAnswer> {
  late final _ctrl = TextEditingController(text: widget.value);

  @override
  void didUpdateWidget(covariant _TextAnswer old) {
    super.didUpdateWidget(old);
    if (widget.value.isEmpty && _ctrl.text.isNotEmpty && old.value.isNotEmpty) _ctrl.clear();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 320),
      child: TextField(
        controller: _ctrl,
        enabled: !widget.locked,
        maxLength: 1000,
        keyboardType: widget.numeric ? const TextInputType.numberWithOptions(signed: true, decimal: true) : null,
        decoration: const InputDecoration(labelText: 'Хариугаа бич', counterText: ''),
        onChanged: (v) => widget.onChanged(v),
      ),
    );
  }
}
