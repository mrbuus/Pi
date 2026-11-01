import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/homework_models.dart';
import '../data/homework_repository.dart';
import '../domain/homework_logic.dart';
import 'homework_badges.dart';
import 'homework_icons.dart';
import 'homework_providers.dart';

/// `/app/homework/:testId?date=&classroomId=` — ангид хийсэн тестийн нөгөө (B) хувилбарыг гэртээ бодох.
/// «Шалгах» 2 удаа (зөв/буруу л — зөв хариу ХЭЗЭЭ Ч харагдахгүй), дараа нь «Илгээх». Оноо, хугацаа серверт.
class HomeworkSolveScreen extends ConsumerStatefulWidget {
  const HomeworkSolveScreen({super.key, required this.testId, required this.date});

  final String testId;

  /// Анги тестийг хийсэн өдөр (`YYYY-MM-DD`).
  final String date;

  @override
  ConsumerState<HomeworkSolveScreen> createState() => _HomeworkSolveScreenState();
}

class _HomeworkSolveScreenState extends ConsumerState<HomeworkSolveScreen> {
  HwAttempt? _attempt;
  ApiError? _loadError;
  final _answers = <String, Object?>{};
  final _saved = <String, Object?>{};
  final _controllers = <String, TextEditingController>{};
  Map<String, CheckResult>? _results;
  int _checksUsed = 0;
  HwScore? _score;
  bool _submitted = false;
  bool _busy = false;
  bool _saving = false;
  Timer? _debounce;
  Timer? _ticker;
  int? _remaining;

  HomeworkRepository get _repo => ref.read(homeworkRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _ticker?.cancel();
    // Хүлээгдэж буй хариуг алдахгүй.
    if (!_submitted && _attempt != null && changedAnswers(_answers, _saved).isNotEmpty) {
      unawaited(_repo.saveAnswers(_attempt!.attemptId, changedAnswers(_answers, _saved)).catchError((_) {}));
    }
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loadError = null;
      _attempt = null;
    });
    try {
      final a = await _repo.startAttempt(testId: widget.testId, date: widget.date);
      if (!mounted) return;
      setState(() {
        _attempt = a;
        _answers
          ..clear()
          ..addAll(a.answers);
        _saved
          ..clear()
          ..addAll(a.answers);
        _checksUsed = a.checksUsed;
        _submitted = a.submitted;
        _score = a.score;
        _results = a.lastCheck;
        _remaining = a.submitted ? null : a.remainingSec;
      });
      _startTicker();
    } on ApiError catch (e) {
      if (mounted) setState(() => _loadError = e);
    }
  }

  void _startTicker() {
    _ticker?.cancel();
    if (_remaining == null) return;
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _remaining = (_remaining ?? 0) - 1);
      if ((_remaining ?? 1) <= 0) {
        _ticker?.cancel();
        // Хугацаа дууссан — сервер хадгалсан хариугаар дүгнэнэ.
        unawaited(_submit(confirm: false));
      }
    });
  }

  TextEditingController _controller(String id, String initial) =>
      _controllers.putIfAbsent(id, () => TextEditingController(text: initial));

  void _set(String problemId, Object? value) {
    setState(() {
      _answers[problemId] = value;
      _results = null; // Хариу өөрчлөгдвөл өмнөх шалгалтын тэмдэг хуучирна.
    });
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 1200), _save);
  }

  Future<void> _save() async {
    final a = _attempt;
    if (a == null || _submitted) return;
    final diff = changedAnswers(_answers, _saved);
    if (diff.isEmpty) return;
    setState(() => _saving = true);
    try {
      await _repo.saveAnswers(a.attemptId, diff);
      _saved.addAll(diff);
    } on ApiError catch (e) {
      if (e.kind == ApiErrorKind.conflict) _snack(e.message);
      // Сүлжээний алдаа — дараагийн өөрчлөлтөөр дахин илгээнэ.
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _check() async {
    final a = _attempt;
    if (a == null) return;
    setState(() => _busy = true);
    try {
      final r = await _repo.check(a.attemptId, Map.of(_answers));
      _saved.addAll(_answers);
      if (!mounted) return;
      setState(() {
        _results = r.results;
        _checksUsed = r.checksUsed ?? _checksUsed + 1;
      });
      _snack('${r.total} бодлогоос ${r.correct} нь зөв');
    } on ApiError catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit({bool confirm = true}) async {
    final a = _attempt;
    if (a == null || _submitted) return;
    if (confirm) {
      final yes = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Илгээх үү?'),
          content: const Text('Илгээсний дараа хариугаа өөрчлөх боломжгүй.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text(AppStrings.cancel)),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Илгээх')),
          ],
        ),
      );
      if (yes != true) return;
    }
    _debounce?.cancel();
    setState(() => _busy = true);
    try {
      final r = await _repo.submit(a.attemptId, Map.of(_answers));
      _saved.addAll(_answers);
      _ticker?.cancel();
      ref.invalidate(homeworkDaysProvider);
      if (!mounted) return;
      setState(() {
        _submitted = true;
        _results = r.results;
        _score = HwScore(r.correct, r.total);
        _remaining = null;
      });
    } on ApiError catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _snack(String text) => ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) {
    final a = _attempt;
    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const Text('Гэрийн даалгавар'),
        actions: [
          if (_remaining != null)
            Padding(
              padding: const EdgeInsets.only(right: AppSpace.lg),
              child: Center(
                child: Semantics(
                  label: 'Үлдсэн хугацаа ${formatClock(_remaining!)}',
                  child: ExcludeSemantics(
                    child: Row(
                      children: [
                        Icon(HomeworkIcons.deadline, size: 16, color: context.colors.inkDim),
                        const SizedBox(width: AppSpace.xs),
                        Text(formatClock(_remaining!), style: context.text.titleSmall),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: _loadError != null
          ? ErrorState(
              title: _loadError!.kind == ApiErrorKind.forbidden ? 'Нээгдээгүй байна' : 'Алдаа гарлаа',
              message: _loadError!.message,
              onRetry: _loadError!.isRetryable ? _load : null,
            )
          : a == null
              ? const LoadingState()
              : _body(a),
      bottomNavigationBar: a == null || _submitted ? null : _actions(a),
    );
  }

  Widget _body(HwAttempt a) {
    if (a.problems.isEmpty) return const EmptyState(title: 'Бодлого алга');
    final header = _submitted
        ? _ResultHeader(score: _score)
        : _SaveStatus(saving: _saving, checksLeft: (a.maxChecks - _checksUsed).clamp(0, a.maxChecks));
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      itemCount: a.problems.length + 1,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpace.md),
      itemBuilder: (context, i) {
        if (i == 0) return header;
        final p = a.problems[i - 1];
        return _ProblemCard(
          number: i,
          problem: p,
          answer: _answers[p.id],
          result: _results?[p.id],
          enabled: !_submitted && !_busy,
          onChanged: (v) => _set(p.id, v),
          controller: _controller,
        );
      },
    );
  }

  Widget _actions(HwAttempt a) {
    final left = (a.maxChecks - _checksUsed).clamp(0, a.maxChecks);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.md),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _busy || left <= 0 ? null : _check,
                child: Text(left > 0 ? 'Шалгах ($left)' : 'Шалгах эрх дууссан'),
              ),
            ),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              child: FilledButton(onPressed: _busy ? null : _submit, child: const Text('Илгээх')),
            ),
          ],
        ),
      ),
    );
  }
}

class _SaveStatus extends StatelessWidget {
  const _SaveStatus({required this.saving, required this.checksLeft});

  final bool saving;
  final int checksLeft;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            'Хариугаа бөглөөд «Шалгах»-аар зөв эсэхийг харна ($checksLeft удаа үлдсэн)',
            style: context.text.bodySmall,
          ),
        ),
        if (saving) Text('Хадгалж байна', style: context.text.labelSmall),
      ],
    );
  }
}

class _ResultHeader extends StatelessWidget {
  const _ResultHeader({required this.score});

  final HwScore? score;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppCard(
      child: Row(
        children: [
          Icon(HomeworkIcons.submitted, color: c.success, size: 32),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Илгээсэн', style: context.text.titleMedium),
                if (score != null) Text('${score!.total} бодлогоос ${score!.correct} зөв', style: context.text.bodyMedium),
              ],
            ),
          ),
          if (score != null) Text('${score!.correct}/${score!.total}', style: context.text.displaySmall),
        ],
      ),
    );
  }
}

class _ProblemCard extends ConsumerWidget {
  const _ProblemCard({
    required this.number,
    required this.problem,
    required this.answer,
    required this.result,
    required this.enabled,
    required this.onChanged,
    required this.controller,
  });

  final int number;
  final HwProblem problem;
  final Object? answer;
  final CheckResult? result;
  final bool enabled;
  final ValueChanged<Object?> onChanged;
  final TextEditingController Function(String id, String initial) controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final images = ref.watch(fileImageProvider);
    final p = problem;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text('$number-р бодлого', style: context.text.titleSmall)),
              if (result != null) _ResultMark(result: result!),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          ProblemFigure(
            image: p.imageKey == null ? null : images.image(p.imageKey!),
            forbiddenMessage: 'Энэ зураг одоохондоо нээгдээгүй байна.',
            child: p.statementText == null ? null : MathText(p.statementText!),
          ),
          const SizedBox(height: AppSpace.md),
          _answerInput(context, images),
        ],
      ),
    );
  }

  Widget _answerInput(BuildContext context, FileImageFactory images) {
    final p = problem;
    final choices = p.choices;
    if (choices != null && choices.isNotEmpty) {
      final selected = choices.indexWhere((c) => c.label == answer);
      return ChoiceGrid(
        groupLabel: '$number-р бодлогын хариулт',
        choices: [
          for (final c in choices)
            ChoiceItem(label: c.label, text: c.text, image: c.imageKey == null ? null : images.image(c.imageKey!)),
        ],
        selectedIndex: selected < 0 ? null : selected,
        onSelect: enabled ? (i) => onChanged(choices[i].label) : null,
      );
    }
    if (p.fillSlots.isNotEmpty) {
      final current = answer is Map ? (answer! as Map).cast<String, Object?>() : const <String, Object?>{};
      return Wrap(
        spacing: AppSpace.md,
        runSpacing: AppSpace.sm,
        children: [
          for (final slot in p.fillSlots)
            SizedBox(
              width: 140,
              child: TextField(
                controller: controller('${p.id}/$slot', '${current[slot] ?? ''}'),
                enabled: enabled,
                keyboardType: const TextInputType.numberWithOptions(signed: true, decimal: true),
                decoration: InputDecoration(labelText: slot),
                onChanged: (v) => onChanged({...current, slot: v}),
              ),
            ),
        ],
      );
    }
    return TextField(
      controller: controller(p.id, answer is String ? answer! as String : ''),
      enabled: enabled,
      maxLength: 1000,
      decoration: const InputDecoration(labelText: 'Хариулт'),
      onChanged: onChanged,
    );
  }
}

class _ResultMark extends StatelessWidget {
  const _ResultMark({required this.result});

  final CheckResult result;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return switch (result) {
      CheckResult.correct => StatusPill(icon: HomeworkIcons.submitted, label: 'Зөв', color: c.success),
      CheckResult.wrong => StatusPill(icon: HomeworkIcons.wrong, label: 'Буруу', color: c.error),
      CheckResult.blank => StatusPill(icon: HomeworkIcons.blank, label: 'Хариулаагүй', color: c.inkDim, dashed: true),
    };
  }
}
