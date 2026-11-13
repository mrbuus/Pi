import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../application/board_controller.dart';
import '../application/quiz_controller.dart';
import '../domain/quiz_score.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

// Шалгалтаар даалгавар шалгах (эзэн 2026-11-08) — вэбийн `QuizBar`, `QuizScoreInput`.

/// Утгаар харьцуулах id-ийн олонлог (`select`-д — жагсаалт өөрчлөгдөөгүй бол дахин зурахгүй).
@immutable
class IdSet {
  const IdSet(this.ids);

  static const empty = IdSet(<String>{});

  final Set<String> ids;

  bool contains(String id) => ids.contains(id);

  @override
  bool operator ==(Object other) => other is IdSet && setEquals(other.ids, ids);

  @override
  int get hashCode => Object.hashAllUnordered(ids);
}

/// Энэ өдрийн шалгалтын оноотой сурагчид (оноо нуусан ч) — «Тэмдэглээгүй», «Бүгд хийсэн», шүүлтүүрт
/// тоологдохгүй, «Шалгаагүй» гэж тодрохгүй.
final quizScoredProvider = Provider.autoDispose.family<IdSet, BoardArgs>(
  (ref, a) => ref.watch(homeworkQuizProvider(a).select((s) => IdSet(s.scores.keys.toSet()))),
);

/// Онооны талбаруудын дараалал (жагсаалтын, шүүлтүүрт харагдаж буйгаар): Enter/«Дараах» → дараагийн сурагч.
class QuizFocusChain {
  final _nodes = <String, FocusNode>{};
  List<String> order = const [];

  void register(String id, FocusNode node) => _nodes[id] = node;

  void unregister(String id, FocusNode node) {
    if (_nodes[id] == node) _nodes.remove(id);
  }

  /// [id]-ийн дараагийн ([dir] = 1) эсвэл өмнөх (-1) талбар; байхгүй бол null.
  FocusNode? next(String id, int dir) {
    final i = order.indexOf(id);
    if (i < 0) return null;
    for (var j = i + dir; j >= 0 && j < order.length; j += dir) {
      final n = _nodes[order[j]];
      if (n != null) return n;
    }
    return null;
  }
}

final quizFocusChainProvider = Provider.autoDispose.family<QuizFocusChain, BoardArgs>((ref, _) => QuizFocusChain());

/// Онооны өнгө → токен.
Color quizToneColor(AppColors c, QuizTone t) => t.color(c);

/// Өнгөт хайрцаг доторх хувь («80%») — самбарын талбартай ижил өнгө.
class QuizPctChip extends StatelessWidget {
  const QuizPctChip({super.key, required this.pct, this.fontSize = 13});

  final double pct;
  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final tone = quizToneColor(c, percentTone(pct)!);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Color.alphaBlend(tone.withValues(alpha: 0.15), c.surface),
        borderRadius: BorderRadius.circular(AppRadius.sm / 2),
        border: Border.all(color: tone),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
        child: Text(
          formatPercent(pct),
          style: context.text.labelMedium?.copyWith(
            fontSize: fontSize,
            fontWeight: FontWeight.w700,
            color: tone,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ),
    );
  }
}

/// «i» — онооны өнгөний муж (MathText-ээр): $0 \le$ улаан $< 50 \le$ улбар шар $< 80 \le$ ногоон $\le 100$.
class QuizLegendButton extends StatelessWidget {
  const QuizLegendButton({super.key});

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: 'Өнгөний тайлбар',
    constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
    icon: Icon(AppIcons.info, size: 18, color: context.colors.inkDim),
    onPressed: () => showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        final c = ctx.colors;
        Widget chip(QuizTone t, String text) {
          final tone = quizToneColor(c, t);
          return DecoratedBox(
            decoration: BoxDecoration(
              color: Color.alphaBlend(tone.withValues(alpha: 0.15), c.surface),
              borderRadius: BorderRadius.circular(AppRadius.sm / 2),
              border: Border.all(color: tone),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              child: Text(
                text,
                style: ctx.text.labelMedium?.copyWith(color: tone, fontWeight: FontWeight.w600),
              ),
            ),
          );
        }

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.xl, 0, AppSpace.xl, AppSpace.xl),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Онооны өнгө, хувиар', style: ctx.text.titleMedium),
                const SizedBox(height: AppSpace.md),
                Wrap(
                  spacing: AppSpace.xs,
                  runSpacing: AppSpace.sm,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    const MathText(r'$0 \le$'),
                    chip(MarkTone.error, 'улаан'),
                    const MathText(r'$< 50 \le$'),
                    chip(MarkTone.warning, 'улбар шар'),
                    const MathText(r'$< 80 \le$'),
                    chip(MarkTone.success, 'ногоон'),
                    const MathText(r'$\le 100$'),
                  ],
                ),
                const SizedBox(height: AppSpace.md),
                Text(
                  'Дунджийг зөвхөн оноо оруулсан сурагчаар бодно',
                  style: ctx.text.bodyMedium?.copyWith(color: c.inkDim),
                ),
              ],
            ),
          ),
        );
      },
    ),
  );
}

/// «Шалгалтаар даалгавар шалгах» — шүүлтүүрийн доор. Шалгалтгүй үед ганц товч; эхлүүлсний дараа
/// бодлогын тоо, ангийн дундаж (зөвхөн оноотой сурагчаар), «i», хадгалалтын төлөв, «Нуух».
/// Нуухад оноо устахгүй — «Онлайн» нүд буцаж гарна.
class QuizBar extends ConsumerWidget {
  const QuizBar({super.key, required this.args, required this.studentIds});

  final BoardArgs args;
  final List<String> studentIds;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final q = ref.watch(homeworkQuizProvider(args));
    final ctl = ref.read(homeworkQuizProvider(args).notifier);
    final c = context.colors;
    final quiz = q.quiz;
    final roster = [for (final id in studentIds) q.scores[id]];
    final scored = roster.whereType<num>().length;
    final buttonStyle = OutlinedButton.styleFrom(
      minimumSize: const Size(teacherTap, teacherTap),
      foregroundColor: c.ink,
      side: BorderSide(color: c.line),
      backgroundColor: c.surface,
    );
    Future<void> openCount({required bool editing}) => QuizCountSheet.open(
      context,
      args: args,
      editing: editing,
      initial: editing ? quiz?.problemCount : null,
      scored: scored,
    );

    switch (q.status) {
      case QuizLoad.loading:
        return const Align(
          alignment: Alignment.centerLeft,
          child: SkeletonBox(width: 240, height: teacherTap),
        );
      case QuizLoad.error:
        return Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(
            style: buttonStyle.copyWith(foregroundColor: WidgetStatePropertyAll(c.inkDim)),
            onPressed: ctl.reload,
            icon: const Icon(AppIcons.retry, size: 16),
            label: const Text('Шалгалтын мэдээлэл ачаалагдсангүй, дахин оролдох'),
          ),
        );
      case QuizLoad.ready:
        break;
    }
    if (quiz == null) {
      return Align(
        alignment: Alignment.centerLeft,
        child: OutlinedButton.icon(
          key: const ValueKey('quiz-start'),
          style: buttonStyle,
          onPressed: () => openCount(editing: false),
          icon: Icon(TeacherIcons.clipboardCheck, size: 16, color: c.brand),
          label: const Text('Шалгалтаар даалгавар шалгах'),
        ),
      );
    }
    if (q.hidden) {
      return Align(
        alignment: Alignment.centerLeft,
        child: OutlinedButton.icon(
          key: const ValueKey('quiz-show'),
          style: buttonStyle,
          onPressed: () => ctl.setHidden(false),
          icon: Icon(AppIcons.show, size: 16, color: c.brand),
          label: Text('Шалгалтын оноо харах ($scored/${studentIds.length})'),
        ),
      );
    }
    final avg = quizAverage(roster, quiz.problemCount);
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    final status = q.saving > 0
        ? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox.square(dimension: 12, child: CircularProgressIndicator(strokeWidth: 2, color: c.brand)),
              const SizedBox(width: AppSpace.xs),
              Flexible(
                child: Text('Хадгалж байна', maxLines: 1, overflow: TextOverflow.ellipsis, style: dim),
              ),
            ],
          )
        : q.failed > 0 || q.invalid > 0
        ? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(AppIcons.warning, size: 14, color: c.error),
              const SizedBox(width: AppSpace.xs),
              Flexible(
                child: Text(
                  q.failed > 0 ? '${q.failed} оноо хадгалагдсангүй' : '${q.invalid} оноо буруу',
                  style: dim?.copyWith(color: c.error),
                ),
              ),
            ],
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(AppIcons.cloudCheck, size: 14, color: q.saved ? c.success : c.inkDim),
              const SizedBox(width: AppSpace.xs),
              Flexible(
                child: Text(
                  q.saved ? 'Хадгалагдсан' : 'Автоматаар хадгалагдана',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: dim,
                ),
              ),
            ],
          );
    return Semantics(
      container: true,
      label: 'Шалгалтаар даалгавар шалгах',
      explicitChildNodes: true,
      child: DecoratedBox(
        key: const ValueKey('quiz-bar'),
        decoration: BoxDecoration(
          color: c.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: c.brandBright.withValues(alpha: 0.4)),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: AppSpace.xs),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Wrap(
                spacing: AppSpace.sm,
                runSpacing: AppSpace.xs,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(TeacherIcons.clipboardCheck, size: 16, color: c.brand),
                      const SizedBox(width: AppSpace.xs),
                      Text('Шалгалт', style: context.text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                    ],
                  ),
                  OutlinedButton(
                    key: const ValueKey('quiz-edit'),
                    style: buttonStyle.copyWith(
                      padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: AppSpace.sm)),
                    ),
                    onPressed: () => openCount(editing: true),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '${quiz.problemCount} бодлого',
                          semanticsLabel: '${quiz.problemCount} бодлого, бодлогын тоог өөрчлөх',
                          style: const TextStyle(fontFeatures: [FontFeature.tabularFigures()]),
                        ),
                        const SizedBox(width: AppSpace.xs),
                        Icon(TeacherIcons.pencil, size: 14, color: c.inkDim),
                      ],
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Дундаж', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
                      const SizedBox(width: AppSpace.xs),
                      if (avg == null)
                        Text(
                          '–',
                          style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w700, color: c.inkDim),
                        )
                      else
                        QuizPctChip(key: const ValueKey('quiz-avg'), pct: avg.pct),
                      const SizedBox(width: AppSpace.xs),
                      Text('($scored/${studentIds.length})', style: dim),
                      const QuizLegendButton(),
                    ],
                  ),
                ],
              ),
              Row(
                children: [
                  Expanded(child: Semantics(liveRegion: true, child: status)),
                  TextButton.icon(
                    key: const ValueKey('quiz-hide'),
                    style: TextButton.styleFrom(
                      minimumSize: const Size(teacherTap, teacherTap),
                      foregroundColor: c.inkDim,
                    ),
                    onPressed: () => ctl.setHidden(true),
                    icon: const Icon(AppIcons.hide, size: 16),
                    label: const Text('Нуух', semanticsLabel: 'Шалгалтын оноог нуух, оноо устахгүй'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Бодлогын тоо асуух доод хуудас: эхлүүлэх ба засах (засахад «Шалгалтыг устгах»).
class QuizCountSheet extends ConsumerStatefulWidget {
  const QuizCountSheet({super.key, required this.args, required this.editing, this.initial, required this.scored});

  final BoardArgs args;
  final bool editing;
  final int? initial;

  /// Оноо оруулсан сурагчийн тоо (устгахын өмнө хэлнэ).
  final int scored;

  static Future<void> open(
    BuildContext context, {
    required BoardArgs args,
    required bool editing,
    int? initial,
    required int scored,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => QuizCountSheet(args: args, editing: editing, initial: initial, scored: scored),
  );

  @override
  ConsumerState<QuizCountSheet> createState() => _QuizCountSheetState();
}

class _QuizCountSheetState extends ConsumerState<QuizCountSheet> {
  late final _text = TextEditingController(text: widget.initial?.toString() ?? '');
  String? _error;
  bool _busy = false;
  bool _confirm = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  HomeworkQuizController get _ctl => ref.read(homeworkQuizProvider(widget.args).notifier);

  Future<void> _submit() async {
    final r = parseProblemCount(_text.text);
    if (!r.ok) {
      setState(() => _error = r.error);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _ctl.setProblemCount(r.value!.toInt());
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e is ApiError && e.message.trim().isNotEmpty ? e.message : 'Хадгалж чадсангүй';
        });
      }
    }
  }

  Future<void> _remove() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _ctl.remove();
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e is ApiError && e.message.trim().isNotEmpty ? e.message : 'Устгаж чадсангүй';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              widget.editing ? 'Шалгалтын бодлогын тоо' : 'Шалгалтаар даалгавар шалгах',
              style: context.text.titleMedium,
            ),
            const SizedBox(height: 2),
            Text(
              widget.editing ? 'Тоог өөрчлөхөд өнгө дахин бодогдоно' : 'Ангид хэдэн бодлого өгснөө бичнэ үү',
              style: context.text.bodySmall?.copyWith(color: c.inkDim),
            ),
            const SizedBox(height: AppSpace.md),
            TextField(
              key: const ValueKey('quiz-count-input'),
              controller: _text,
              autofocus: true,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.done,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(3)],
              style: context.text.titleMedium?.copyWith(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
              decoration: InputDecoration(
                labelText: 'Бодлогын тоо',
                hintText: 'ж: 10',
                helperText: '1-ээс $quizMaxProblems хүртэл',
                errorText: _error,
              ),
              onChanged: (_) {
                if (_error != null) setState(() => _error = null);
              },
              onSubmitted: (_) => _submit(),
            ),
            const SizedBox(height: AppSpace.md),
            ListenableBuilder(
              listenable: _text,
              builder: (context, _) => FilledButton(
                key: const ValueKey('quiz-count-save'),
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
                onPressed: _busy || _text.text.isEmpty ? null : _submit,
                child: Text(widget.editing ? AppStrings.save : 'Эхлүүлэх'),
              ),
            ),
            if (widget.editing) ...[
              const SizedBox(height: AppSpace.md),
              Divider(height: 1, color: c.line),
              const SizedBox(height: AppSpace.sm),
              if (_confirm) ...[
                Text(
                  widget.scored > 0
                      ? '${widget.scored} сурагчийн оруулсан оноо хамт устна. Устгах уу?'
                      : 'Шалгалтыг устгах уу?',
                  style: context.text.bodyMedium,
                ),
                const SizedBox(height: AppSpace.sm),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
                        onPressed: _busy ? null : () => setState(() => _confirm = false),
                        child: const Text(AppStrings.cancel),
                      ),
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: FilledButton(
                        key: const ValueKey('quiz-remove-confirm'),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(teacherTap),
                          backgroundColor: c.error,
                          foregroundColor: c.onStatus,
                        ),
                        onPressed: _busy ? null : _remove,
                        child: const Text('Устгах'),
                      ),
                    ),
                  ],
                ),
              ] else
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    key: const ValueKey('quiz-remove'),
                    style: TextButton.styleFrom(
                      minimumSize: const Size(teacherTap, teacherTap),
                      foregroundColor: c.error,
                    ),
                    onPressed: () => setState(() => _confirm = true),
                    icon: const Icon(AppIcons.trash, size: 16),
                    label: const Text('Шалгалтыг устгах'),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Шалгалтын онооны талбар: «Онлайн» хайрцгийн оронд. Тоон гар (бутархай 7,5), «Дараах» → дараагийн
/// сурагч. Хувийг бичихгүй — хайрцгийн өнгө нь хувиар. Оноогүй бол өнгөгүй.
class QuizScoreInput extends ConsumerStatefulWidget {
  const QuizScoreInput({super.key, required this.args, required this.studentId, required this.name, required this.max});

  final BoardArgs args;
  final String studentId;
  final String name;
  final int max;

  @override
  ConsumerState<QuizScoreInput> createState() => _QuizScoreInputState();
}

class _QuizScoreInputState extends ConsumerState<QuizScoreInput> {
  late final TextEditingController _text;
  final _focus = FocusNode();
  late final HomeworkQuizController _ctl;
  late final QuizFocusChain _chain;

  String get _id => widget.studentId;

  @override
  void initState() {
    super.initState();
    _ctl = ref.read(homeworkQuizProvider(widget.args).notifier);
    _chain = ref.read(quizFocusChainProvider(widget.args));
    _chain.register(_id, _focus);
    final s = ref.read(homeworkQuizProvider(widget.args)).scores[_id];
    _text = TextEditingController(text: s == null ? '' : formatScore(s));
    _focus.addListener(() {
      if (!mounted) return;
      if (!_focus.hasFocus) {
        _commit();
      } else {
        _text.selection = TextSelection(baseOffset: 0, extentOffset: _text.text.length);
      }
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _chain.unregister(_id, _focus);
    _focus.dispose();
    _text.dispose();
    // Талбар алга болоход (шалгалтыг нуух) «буруу» төлөв үлдэхгүй.
    final ctl = _ctl;
    final id = _id;
    scheduleMicrotask(() {
      try {
        ctl.markInvalid(id, false);
      } catch (_) {
        // самбар хаагдсан
      }
    });
    super.dispose();
  }

  void _commit() {
    final r = parseScoreInput(_text.text, widget.max);
    if (!r.ok) return;
    final v = r.value;
    if (v != null && _text.text != formatScore(v)) _text.text = formatScore(v);
    final cell = ref.read(homeworkQuizProvider(widget.args)).cells[_id];
    if (cell == QuizCell.error) {
      _ctl.setScore(_id, v, now: true);
    } else {
      _ctl.flush(_id);
    }
  }

  void _onChanged(String raw) {
    final t = sanitizeScoreText(raw);
    if (t != raw) {
      _text.value = TextEditingValue(
        text: t,
        selection: TextSelection.collapsed(offset: t.length),
      );
    }
    final r = parseScoreInput(t, widget.max);
    if (r.ok) _ctl.setScore(_id, r.value);
    setState(() {});
  }

  void _next() {
    final r = parseScoreInput(_text.text, widget.max);
    if (!r.ok) return; // буруу утгатай байхад цааш явахгүй
    final n = _chain.next(_id, 1);
    if (n != null) {
      n.requestFocus();
    } else {
      _focus.unfocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    final select = homeworkQuizProvider(widget.args).select((s) => (score: s.scores[_id], cell: s.cells[_id]));
    final q = ref.watch(select);
    // Өөр газраас (бодлогын тоо засах, дахин ачаалах) ирсэн утгыг бичиж байх үед дарахгүй.
    ref.listen(select, (_, n) {
      if (_focus.hasFocus || n.cell == QuizCell.invalid || n.cell == QuizCell.saving) return;
      final shown = _text.text.trim().isEmpty ? null : num.tryParse(_text.text.replaceFirst(',', '.'));
      final same = shown == null || n.score == null ? shown == n.score : toHundredths(shown) == toHundredths(n.score!);
      if (!same) _text.text = n.score == null ? '' : formatScore(n.score!);
    });
    final c = context.colors;
    final max = widget.max;
    final parsed = parseScoreInput(_text.text, max);
    final invalid = !parsed.ok;
    // Бодлогын тоо өөрчлөгдөхөд бичсэн утгыг дахин шалгана (ж: 12 → 10 болсон).
    if (invalid && q.cell != QuizCell.invalid) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _ctl.markInvalid(_id, true);
      });
    } else if (!invalid && q.cell == QuizCell.invalid) {
      final v = parsed.value;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _ctl.setScore(_id, v);
      });
    }

    final tone = invalid ? null : quizTone(q.score, max);
    final toneColor = tone == null ? null : quizToneColor(c, tone);
    final pct = quizPercent(q.score, max);
    final status = q.cell == QuizCell.invalid || invalid
        ? '0-ээс $max хүртэл, бутархай нь 2 хүртэл оронтой (7,5)'
        : q.cell == QuizCell.error
        ? 'Хадгалагдсангүй, дахин оролдоно уу'
        : q.cell == QuizCell.saving
        ? 'Хадгалж байна'
        : pct != null
        ? formatPercent(pct)
        : '';
    final fg = toneColor ?? c.ink;
    final radius = BorderRadius.circular(AppRadius.sm);
    final field = TextField(
      key: ValueKey('quiz-input-$_id'),
      controller: _text,
      focusNode: _focus,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      textInputAction: TextInputAction.next,
      textAlign: TextAlign.center,
      maxLines: 1,
      // iPhone дээр томруулахгүй: 16
      style: context.text.titleMedium?.copyWith(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: fg,
        fontFeatures: const [FontFeature.tabularFigures()],
      ),
      decoration: InputDecoration(
        isCollapsed: true,
        border: InputBorder.none,
        enabledBorder: InputBorder.none,
        focusedBorder: InputBorder.none,
        filled: false,
        hintText: '–',
        hintStyle: TextStyle(color: c.inkDim.withValues(alpha: 0.6), fontWeight: FontWeight.w400),
        contentPadding: const EdgeInsets.only(left: 2, right: 22),
      ),
      onChanged: _onChanged,
      onSubmitted: (_) => _next(),
      onTapOutside: (_) => _focus.unfocus(),
    );
    final box = Stack(
      children: [
        Positioned.fill(child: Center(child: field)),
        Positioned(
          right: 4,
          top: 0,
          bottom: 0,
          child: IgnorePointer(
            child: Center(
              child: Text(
                '/$max',
                style: context.text.labelSmall?.copyWith(
                  fontSize: 11,
                  color: fg.withValues(alpha: 0.7),
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ),
        ),
        if (q.cell == QuizCell.saving)
          Positioned(
            right: 2,
            top: 2,
            child: SizedBox.square(dimension: 10, child: CircularProgressIndicator(strokeWidth: 1.5, color: c.brand)),
          )
        else if (q.cell == QuizCell.error || q.cell == QuizCell.invalid)
          Positioned(right: 2, top: 2, child: Icon(AppIcons.warning, size: 11, color: c.error)),
      ],
    );
    final decorated = invalid
        ? DashedBox(radius: AppRadius.sm, color: c.error, child: box)
        : DecoratedBox(
            decoration: BoxDecoration(
              color: toneColor == null ? c.surface : Color.alphaBlend(toneColor.withValues(alpha: 0.15), c.surface),
              borderRadius: radius,
              border: Border.all(color: _focus.hasFocus ? c.brandBright : (toneColor ?? c.line)),
            ),
            child: box,
          );
    return Tooltip(
      message: status,
      excludeFromSemantics: true,
      child: Semantics(
        textField: true,
        label: '${widget.name}, шалгалтын оноо, $max бодлогоос',
        hint: status.isEmpty ? null : status,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: teacherTap),
          child: decorated,
        ),
      ),
    );
  }
}
