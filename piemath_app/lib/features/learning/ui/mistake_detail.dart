import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/solution/solution.dart';
import '../../exam/data/exam_models.dart' show ProblemFormat;
import '../../exam/domain/fill_slots.dart';
import '../../exam/ui/widgets/answer_inputs.dart';
import '../data/mistake_models.dart';
import '../data/mistakes_repository.dart';
import '../domain/mistake_answer.dart';
import 'inline_message.dart';

/// Нэг алдааны бүтэн харагдац: бодлого, өмнөх хариу, шалтгаан, тэмдэглэл, дахин бодох, бодолт.
/// Зөв хариу, бодолтыг ЗӨВХӨН сервер илгээсэн (`item.correctAnswer`) үед харуулна.
class MistakeDetail extends ConsumerStatefulWidget {
  const MistakeDetail({
    super.key,
    required this.item,
    required this.onChanged,
    this.sessionMode = false,
    this.onRetried,
  });

  final Mistake item;

  /// Шинэчлэгдсэн алдааг эзэмшигч (жагсаалт, сесс) өөрийн төлөвт хадгална.
  final ValueChanged<Mistake> onChanged;

  /// Сессийн горимд нэг удаа л дахин бодно.
  final bool sessionMode;
  final ValueChanged<RetryResult>? onRetried;

  @override
  ConsumerState<MistakeDetail> createState() => _MistakeDetailState();
}

enum _Busy { none, retry, reason, note }

class _MistakeDetailState extends ConsumerState<MistakeDetail> {
  late final _note = TextEditingController(text: widget.item.note ?? '');
  late String _savedNote = widget.item.note ?? '';
  Object? _value;
  int _attempt = 0;
  _Busy _busy = _Busy.none;
  String? _error;
  RetryResult? _result;

  Mistake get _item => widget.item;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  bool get _ready => buildRetryAnswer(_item.problem, _value) != null;

  bool get _locked => _busy != _Busy.none || (widget.sessionMode && _result != null);

  Future<void> _retry() async {
    final answer = buildRetryAnswer(_item.problem, _value);
    if (answer == null || _locked) return;
    setState(() {
      _busy = _Busy.retry;
      _error = null;
    });
    try {
      final r = await ref.read(mistakesRepositoryProvider).retry(_item.id, answer);
      if (!mounted) return;
      setState(() {
        _result = r;
        _value = null;
        _attempt++;
      });
      widget.onChanged(r.applyTo(_item));
      widget.onRetried?.call(r);
    } catch (e) {
      if (mounted) {
        setState(() => _error = errorText(e, 'Хариуг шалгаж чадсангүй. Холболтоо шалгаад дахин оролдоно уу.'));
      }
    } finally {
      if (mounted) setState(() => _busy = _Busy.none);
    }
  }

  Future<void> _saveReason(MistakeReason r) async {
    if (_busy != _Busy.none) return;
    setState(() {
      _busy = _Busy.reason;
      _error = null;
    });
    try {
      await ref.read(mistakesRepositoryProvider).patch(_item.id, reason: r);
      if (mounted) widget.onChanged(_item.copyWith(reason: r));
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Хадгалж чадсангүй. Дахин оролдоно уу.'));
    } finally {
      if (mounted) setState(() => _busy = _Busy.none);
    }
  }

  Future<void> _saveNote() async {
    if (_busy != _Busy.none) return;
    final text = _note.text.trim();
    setState(() {
      _busy = _Busy.note;
      _error = null;
    });
    try {
      await ref.read(mistakesRepositoryProvider).patch(_item.id, note: text);
      if (mounted) {
        _savedNote = text;
        widget.onChanged(_item.copyWith(note: text));
      }
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Тэмдэглэл хадгалагдсангүй. Дахин оролдоно уу.'));
    } finally {
      if (mounted) setState(() => _busy = _Busy.none);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = _item.problem;
    final images = ref.watch(fileImageProvider);
    final given = displayGivenAnswer(p, _item.givenAnswer);
    final correct = displayCorrectAnswer(_item.correctAnswer);
    final next = _item.nextRetryAt;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Text(_item.status.label, style: context.text.labelLarge?.copyWith(color: c.brand)),
            if (_item.testTitle != null) ...[
              const Dot(),
              Expanded(
                child: Text(
                  _item.testTitle!,
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: AppSpace.md),
        RepaintBoundary(
          child: ProblemFigure(
            image: p.imageKey == null ? null : images.image(p.imageKey!),
            alt: 'Бодлогын зураг',
            child: MathText(p.statementText ?? 'Бодлогын нөхцөл олдсонгүй', style: context.text.bodyLarge),
          ),
        ),
        const SizedBox(height: AppSpace.md),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Таны өмнөх хариу: ', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
            Expanded(child: given == null ? Text('Хариулаагүй', style: context.text.bodyMedium) : MathText(given)),
          ],
        ),
        const SizedBox(height: AppSpace.xl),
        Text('Алдааны шалтгаан', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          children: [
            for (final r in MistakeReason.values)
              ChoiceChip(
                label: Text(r.label),
                selected: _item.reason == r,
                onSelected: _busy == _Busy.none ? (_) => _saveReason(r) : null,
              ),
          ],
        ),
        const SizedBox(height: AppSpace.xl),
        TextField(
          controller: _note,
          maxLength: 500,
          minLines: 2,
          maxLines: 5,
          enabled: _busy != _Busy.note,
          decoration: const InputDecoration(labelText: 'Тэмдэглэл', hintText: 'Дараа бодохдоо юуг анхаарах вэ'),
          onChanged: (_) => setState(() {}),
        ),
        Align(
          alignment: AlignmentDirectional.centerEnd,
          child: OutlinedButton.icon(
            onPressed: _busy == _Busy.none && _note.text.trim() != _savedNote ? _saveNote : null,
            icon: const Icon(AppIcons.save, size: 18),
            label: const Text('Тэмдэглэл хадгалах'),
          ),
        ),
        const SizedBox(height: AppSpace.xl),
        Text('Дахин бодоод хариулна уу', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.md),
        RetryAnswerInput(
          key: ValueKey('retry-${_item.id}-$_attempt'),
          problem: p,
          value: _value,
          enabled: !_locked,
          imageFor: images.image,
          onChanged: (v) => setState(() => _value = v),
        ),
        const SizedBox(height: AppSpace.lg),
        FilledButton(
          onPressed: _ready && !_locked ? _retry : null,
          child: Text(_busy == _Busy.retry ? 'Шалгаж байна' : 'Хариуг шалгах'),
        ),
        if (_error != null) ...[const SizedBox(height: AppSpace.md), InlineMessage(_error!)],
        if (_result != null) ...[
          const SizedBox(height: AppSpace.lg),
          InlineMessage(
            _result!.correct ? 'Зөв' : 'Одоохондоо зөрүүтэй байна',
            icon: _result!.correct ? AppIcons.success : AppIcons.info,
            isError: false,
          ),
          const SizedBox(height: AppSpace.xs),
          Text(
            _result!.status == MistakeStatus.mastered
                ? 'Өөр өдрүүдэд бататгаж, эзэмшсэн төлөвт орлоо'
                : 'Зөв аргаа ойлгоод дараагийн давтлагаар бататгана уу',
            style: context.text.bodySmall?.copyWith(color: c.inkDim),
          ),
        ],
        if (correct != null || (_item.solutionOutline ?? '').isNotEmpty) ...[
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
                if ((_item.solutionOutline ?? '').isNotEmpty) ...[
                  if (correct != null) const SizedBox(height: AppSpace.md),
                  SolutionView(source: _item.solutionOutline),
                ],
              ],
            ),
          ),
        ],
        if (next != null) ...[
          const SizedBox(height: AppSpace.md),
          Text(
            'Дараагийн давтлага: ${DateMn.numeric(UbDateTime.fromInstant(next))}',
            style: context.text.bodySmall?.copyWith(color: c.inkDim),
          ),
        ],
        if (_item.formulas.isNotEmpty) ...[
          const SizedBox(height: AppSpace.xl),
          Text('Хэрэгтэй томьёо', style: context.text.titleSmall),
          const SizedBox(height: AppSpace.sm),
          for (final f in _item.formulas) _FormulaTile(formula: f),
        ],
      ],
    );
  }
}

class _FormulaTile extends StatelessWidget {
  const _FormulaTile({required this.formula});

  final MistakeFormula formula;

  @override
  Widget build(BuildContext context) {
    final latex = formula.latex;
    return ExpansionTile(
      tilePadding: EdgeInsets.zero,
      title: Align(alignment: AlignmentDirectional.centerStart, child: MathText(formula.title)),
      childrenPadding: const EdgeInsets.only(bottom: AppSpace.md),
      children: [
        if (latex != null && latex.isNotEmpty)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: MathText('\$\$$latex\$\$', displayAlignment: AlignmentDirectional.centerStart),
          )
        else
          Text('Томьёоны бичвэр одоогоор алга', style: context.text.bodySmall),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: TextButton(
            onPressed: formula.slug.isEmpty
                ? null
                : () => context.push('/app/formulas/${Uri.encodeComponent(formula.slug)}'),
            child: const Text('Томьёоны сан дотор нээх'),
          ),
        ),
      ],
    );
  }
}

/// Хариу оруулах хэсэг (алдааны дэвтэр, хугацаатай давталт) — шалгалтын widget-үүдийг дахин ашиглана (`exam/ui/widgets/answer_inputs.dart`).
class RetryAnswerInput extends StatelessWidget {
  const RetryAnswerInput({
    super.key,
    required this.problem,
    required this.value,
    required this.enabled,
    required this.imageFor,
    required this.onChanged,
  });

  final MistakeProblem problem;
  final Object? value;
  final bool enabled;
  final ImageFor imageFor;
  final ValueChanged<Object?> onChanged;

  @override
  Widget build(BuildContext context) {
    if (problem.format == ProblemFormat.fillNumber && problem.answerFields.isNotEmpty) {
      return SlotNumberInput(
        groups: [for (final k in problem.answerFields) FillSlotGroup(k)],
        value: value is String ? value! as String : '',
        number: 1,
        enabled: enabled,
        onChanged: onChanged,
      );
    }
    return AnswerInput(
      problem: problem.toExamProblem(),
      number: 1,
      value: value,
      enabled: enabled,
      imageFor: imageFor,
      onChanged: onChanged,
    );
  }
}
