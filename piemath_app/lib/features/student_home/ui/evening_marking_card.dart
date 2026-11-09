import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../homework/domain/homework_logic.dart' show dayLabel;
import '../../my_class/ui/common.dart' show InlineError, errorMessageOf;
import '../data/evening_marking.dart';

/// «Ангийн тестээ тэмдэглэх» — сурагчийн самбар (вэбийн `EveningMarking hideWhenEmpty collapsible`).
/// Тэмдэглэх тест байхгүй бол огт харагдахгүй. Тест бүр хураалттай, дарахад бодлогууд нээгдэнэ;
/// товч дармагц шууд хадгална (алдаа гарвал буцааж, серверийн төлөвийг дахин ачаална).
class EveningMarkingCard extends ConsumerStatefulWidget {
  const EveningMarkingCard({super.key});

  @override
  ConsumerState<EveningMarkingCard> createState() => _EveningMarkingCardState();
}

class _EveningMarkingCardState extends ConsumerState<EveningMarkingCard> {
  /// problemId → optimistic тэмдэглэгээ (серверийн утгыг давна).
  final _marks = <String, EveningState>{};
  final _open = <String>{};
  final _saving = <String>{};
  String? _markError;

  EveningState? _stateOf(EveningProblem p) => _marks[p.problemId] ?? p.myState;

  Future<void> _mark(EveningSession s, EveningProblem p, EveningState value) async {
    if (_saving.contains(p.problemId)) return;
    final prev = _marks[p.problemId];
    setState(() {
      _markError = null;
      _marks[p.problemId] = value;
      _saving.add(p.problemId);
    });
    try {
      await ref.read(eveningMarkingRepositoryProvider).mark(date: s.rawDate, problemId: p.problemId, state: value);
    } on ApiError catch (e) {
      if (!mounted) return;
      setState(() {
        if (prev == null) {
          _marks.remove(p.problemId);
        } else {
          _marks[p.problemId] = prev;
        }
        _markError = e.message;
      });
      ref.invalidate(eveningTodoProvider);
    } finally {
      if (mounted) setState(() => _saving.remove(p.problemId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final todo = ref.watch(eveningTodoProvider);
    final sessions = todo.value;
    // Ачаалж байх үед ба хоосон үед харуулахгүй (самбарыг бүү түгжээ)
    if (sessions == null && !todo.hasError) return const SizedBox.shrink();
    if (sessions != null && sessions.isEmpty) return const SizedBox.shrink();
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.md),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Ангийн тестээ тэмдэглэх', style: context.text.titleMedium?.copyWith(color: c.brand)),
            const SizedBox(height: 2),
            Text('Ангид хийсэн бодлогуудаа цаасан дээрээсээ хараад тэмдэглээрэй', style: context.text.bodySmall),
            if (todo.hasError && sessions == null)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.sm),
                child: InlineError(
                  message: errorMessageOf(todo.error!),
                  onRetry: () => ref.invalidate(eveningTodoProvider),
                ),
              ),
            if (_markError != null)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.sm),
                child: Text(_markError!, style: context.text.bodySmall?.copyWith(color: c.error)),
              ),
            for (final s in sessions ?? const <EveningSession>[]) ...[
              const SizedBox(height: AppSpace.sm),
              _SessionBlock(
                session: s,
                open: _open.contains(s.sessionId),
                stateOf: _stateOf,
                onToggle: () => setState(() {
                  if (!_open.remove(s.sessionId)) _open.add(s.sessionId);
                }),
                onMark: (p, v) => _mark(s, p, v),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SessionBlock extends StatelessWidget {
  const _SessionBlock({
    required this.session,
    required this.open,
    required this.stateOf,
    required this.onToggle,
    required this.onMark,
  });

  final EveningSession session;
  final bool open;
  final EveningState? Function(EveningProblem) stateOf;
  final VoidCallback onToggle;
  final void Function(EveningProblem, EveningState) onMark;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final done = session.problems.where((p) => stateOf(p) != null).length;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.surfaceSunken,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: c.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(AppRadius.md),
            onTap: onToggle,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 56),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(session.testTitle, style: context.text.titleSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                          Meta(
                            items: [
                              dayLabel(session.date, withWeekday: false),
                              if (session.closesOn.isNotEmpty) '${dayLabel(session.closesOn, withWeekday: false)} хүртэл',
                            ],
                          ),
                        ],
                      ),
                    ),
                    Text('$done/${session.problems.length}', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
                    const SizedBox(width: AppSpace.xs),
                    AnimatedRotation(
                      turns: open ? 0.5 : 0,
                      duration: AppMotion.base,
                      child: Icon(AppIcons.expand, size: 18, color: c.inkDim),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (open)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.md, 0, AppSpace.md, AppSpace.md),
              child: Column(
                children: [
                  for (final p in session.problems)
                    _ProblemRow(problem: p, state: stateOf(p), onMark: (v) => onMark(p, v)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _ProblemRow extends ConsumerWidget {
  const _ProblemRow({required this.problem, required this.state, required this.onMark});

  final EveningProblem problem;
  final EveningState? state;
  final ValueChanged<EveningState> onMark;

  Color _tone(AppColors c, EveningState s) => switch (s) {
        EveningState.solvedClean => c.success,
        EveningState.fixedAfterError => c.warning,
        EveningState.failed => c.error,
        EveningState.guessed => c.info,
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: c.brandTint, borderRadius: BorderRadius.circular(AppRadius.sm)),
                child: Text('${problem.index}', style: context.text.labelSmall?.copyWith(color: c.brand)),
              ),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: problem.statement != null
                    ? MathText(problem.statement!, style: context.text.bodyMedium)
                    : problem.imageKey != null
                        ? ProblemFigure(
                            image: ref.watch(fileImageProvider).image(problem.imageKey!),
                            alt: 'Бодлого ${problem.index}',
                          )
                        : Text('Бодлого ${problem.index}', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          Padding(
            padding: const EdgeInsets.only(left: 32),
            child: Wrap(
              spacing: AppSpace.xs,
              runSpacing: AppSpace.xs,
              children: [
                for (final s in EveningState.values)
                  _StateButton(
                    label: s.label,
                    selected: state == s,
                    tone: _tone(c, s),
                    onTap: () => onMark(s),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StateButton extends StatelessWidget {
  const _StateButton({required this.label, required this.selected, required this.tone, required this.onTap});

  final String label;
  final bool selected;
  final Color tone;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      selected: selected,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        child: Container(
          constraints: const BoxConstraints(minHeight: 44, minWidth: 64),
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
          decoration: BoxDecoration(
            color: selected ? tone.withValues(alpha: 0.14) : c.surface,
            borderRadius: BorderRadius.circular(AppRadius.sm),
            border: Border.all(color: selected ? tone : c.line),
          ),
          child: Text(
            label,
            style: context.text.labelMedium?.copyWith(color: selected ? tone : c.inkDim),
          ),
        ),
      ),
    );
  }
}
