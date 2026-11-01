import 'package:flutter/material.dart';

import '../../../../core/math/math.dart';
import '../../../../core/ui/ui.dart';
import '../../data/exam_models.dart';
import '../../domain/fill_slots.dart';

typedef ImageFor = ImageProvider Function(String key);

/// Бодлогын төрлөөр хариу оруулах хэсэг (`docs/api-contract/exam.md` §3.2).
class AnswerInput extends StatelessWidget {
  const AnswerInput({
    super.key,
    required this.problem,
    required this.number,
    required this.value,
    required this.onChanged,
    required this.imageFor,
    this.enabled = true,
  });

  final ExamProblem problem;
  final int number;
  final Object? value;
  final ValueChanged<Object?> onChanged;
  final ImageFor imageFor;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    switch (problem.format) {
      case ProblemFormat.choice when problem.isChoice:
        final choices = problem.choices!;
        final letter = problem.choiceMode == ChoiceMode.letter;
        final selected = letter
            ? choices.indexOf(value is String ? value! as String : '')
            : (value is int ? value! as int : -1);
        return ChoiceGrid(
          groupLabel: '$number-р бодлогын хариултын сонголтууд',
          // TEXT горимд сонголт сурагч бүрд өөр дарааллаар (холилдсон) — үсэг биш, дугаар.
          choices: [
            for (var i = 0; i < choices.length; i++)
              ChoiceItem(label: letter ? choices[i] : '${i + 1}', text: letter ? '' : choices[i], image: _imageAt(i)),
          ],
          selectedIndex: selected >= 0 ? selected : null,
          onSelect: !enabled
              ? null
              : (i) {
                  final v = letter ? choices[i] : i;
                  onChanged(i == selected ? null : v);
                },
        );
      case ProblemFormat.fillNumber:
        final groups = parseFillSlots(problem.statementText);
        final text = value is String ? value! as String : '';
        if (groups.isNotEmpty) {
          return SlotNumberInput(groups: groups, value: text, number: number, enabled: enabled, onChanged: onChanged);
        }
        return FreeNumberInput(value: text, number: number, enabled: enabled, onChanged: onChanged);
      case ProblemFormat.choice:
      case ProblemFormat.open:
        return OpenAnswerInput(
          key: ValueKey('open-${problem.id}'),
          value: value is String ? value! as String : '',
          number: number,
          enabled: enabled,
          onChanged: onChanged,
        );
    }
  }

  ImageProvider? _imageAt(int i) {
    final keys = problem.choiceImages;
    if (keys == null || i >= keys.length) return null;
    final k = keys[i];
    return k == null || k.isEmpty ? null : imageFor(k);
  }
}

/// Нүдтэй тоо нөхөх: «[a]», «[bc]» — нүд бүр нэг цифр. Хоосон нүд `_` (вэбийн FillNumberAnswer).
class SlotNumberInput extends StatefulWidget {
  const SlotNumberInput({
    super.key,
    required this.groups,
    required this.value,
    required this.number,
    required this.onChanged,
    this.enabled = true,
  });

  final List<FillSlotGroup> groups;
  final String value;
  final int number;
  final ValueChanged<Object?> onChanged;
  final bool enabled;

  @override
  State<SlotNumberInput> createState() => _SlotNumberInputState();
}

class _SlotNumberInputState extends State<SlotNumberInput> {
  int? _active;

  /// Дотоод хуулбар — дараалсан хурдан товшилт хуучин утгаар бичихгүй.
  late String _value = widget.value;

  @override
  void didUpdateWidget(SlotNumberInput old) {
    super.didUpdateWidget(old);
    if (old.value != widget.value) _value = widget.value;
  }

  void _emit(String v) {
    _value = v;
    widget.onChanged(v);
  }

  int get _total => slotsTotalLength(widget.groups);

  void _digit(String d) {
    final total = _total;
    final digits = decodeSlotValue(_value, total);
    final idx = _active ?? digits.indexWhere((x) => x.isEmpty);
    if (idx < 0) return;
    _emit(setSlotDigit(_value, total, idx, d));
    setState(() => _active = idx + 1 < total ? idx + 1 : null);
  }

  void _backspace() {
    final total = _total;
    if (_active != null) {
      final digits = decodeSlotValue(_value, total);
      final idx = digits[_active!].isEmpty && _active! > 0 ? _active! - 1 : _active!;
      _emit(setSlotDigit(_value, total, idx, ''));
      setState(() => _active = idx);
      return;
    }
    _emit(backspaceSlot(_value, total));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final total = _total;
    final digits = decodeSlotValue(_value, total);
    var offset = 0;
    final groupWidgets = <Widget>[];
    for (final g in widget.groups) {
      final start = offset;
      offset += g.length;
      groupWidgets.add(
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(g.key, style: context.text.labelMedium?.copyWith(color: c.inkDim)),
            const SizedBox(height: AppSpace.xs),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = start; i < start + g.length; i++)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: _SlotCell(
                      digit: digits[i],
                      active: _active == i,
                      label: '${widget.number}-р бодлого, ${i + 1}-р цифр ($total-с)',
                      onTap: widget.enabled ? () => setState(() => _active = i) : null,
                    ),
                  ),
              ],
            ),
          ],
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Хариугаа нүд бүрт нэг цифрээр бичнэ үү', style: context.text.bodySmall),
        const SizedBox(height: AppSpace.md),
        Wrap(alignment: WrapAlignment.center, spacing: AppSpace.lg, runSpacing: AppSpace.md, children: groupWidgets),
        const SizedBox(height: AppSpace.lg),
        NumericKeypad(
          enabled: widget.enabled,
          onDigit: _digit,
          onBackspace: _backspace,
          onClear: () {
            _emit('');
            setState(() => _active = null);
          },
        ),
      ],
    );
  }
}

class _SlotCell extends StatelessWidget {
  const _SlotCell({required this.digit, required this.active, required this.label, this.onTap});

  final String digit;
  final bool active;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      selected: active,
      label: '$label${digit.isEmpty ? ', хоосон' : ', $digit'}',
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        child: Container(
          width: 44,
          height: 52,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: c.surface,
            borderRadius: BorderRadius.circular(AppRadius.sm),
            border: Border.all(color: active ? c.brandBright : c.line, width: active ? 2 : 1),
          ),
          child: Text(digit, style: context.text.headlineSmall),
        ),
      ),
    );
  }
}

/// Нүдгүй тоон хариу: цифр, `-`, `.` (вэбийн гарын дүрэм).
class FreeNumberInput extends StatelessWidget {
  const FreeNumberInput({
    super.key,
    required this.value,
    required this.number,
    required this.onChanged,
    this.enabled = true,
  });

  final String value;
  final int number;
  final ValueChanged<Object?> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          label: '$number-р бодлогын хариу',
          value: value.isEmpty ? 'хоосон' : value,
          child: Container(
            height: 56,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: c.surface,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: c.line),
            ),
            child: Text(
              value.isEmpty ? 'Хариу' : value,
              style: context.text.headlineSmall?.copyWith(color: value.isEmpty ? c.inkDim : c.ink),
            ),
          ),
        ),
        const SizedBox(height: AppSpace.lg),
        NumericKeypad(
          enabled: enabled,
          extraKeys: const ['-', '.'],
          onDigit: (d) => onChanged(typeFreeNumber(value, d)),
          onBackspace: () => onChanged(backspaceFree(value)),
          onClear: () => onChanged(''),
        ),
      ],
    );
  }
}

/// Дэлгэц дээрх тоон гар — системийн гар гарч бодлогыг халхлахгүй, хариу тохиолдлоор алга болохгүй.
class NumericKeypad extends StatelessWidget {
  const NumericKeypad({
    super.key,
    required this.onDigit,
    required this.onBackspace,
    required this.onClear,
    this.extraKeys = const [],
    this.enabled = true,
  });

  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;
  final VoidCallback onClear;
  final List<String> extraKeys;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    Widget key(String label, VoidCallback onTap, {String? semantics, Widget? child}) => Expanded(
      child: Padding(
        padding: const EdgeInsets.all(3),
        child: SizedBox(
          height: 52,
          child: OutlinedButton(
            onPressed: enabled ? onTap : null,
            style: OutlinedButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(44, 52)),
            child: Semantics(
              label: semantics,
              child: child ?? Text(label, style: context.text.titleLarge),
            ),
          ),
        ),
      ),
    );
    final rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
    ];
    return Column(
      children: [
        for (final r in rows) Row(children: [for (final d in r) key(d, () => onDigit(d))]),
        Row(
          children: [
            if (extraKeys.isEmpty)
              key(
                '',
                onClear,
                semantics: 'Цэвэрлэх',
                child: Text('Цэвэрлэх', style: context.text.labelLarge),
              )
            else
              for (final k in extraKeys) key(k, () => onDigit(k), semantics: k == '-' ? 'Хасах тэмдэг' : 'Аравтын цэг'),
            key('0', () => onDigit('0')),
            key('', onBackspace, semantics: 'Арилгах', child: const Icon(AppIcons.backspace)),
          ],
        ),
        if (extraKeys.isNotEmpty)
          Align(
            alignment: AlignmentDirectional.centerEnd,
            child: TextButton(onPressed: enabled ? onClear : null, child: const Text('Цэвэрлэх')),
          ),
      ],
    );
  }
}

/// Нээлттэй хариу (OPEN) — чөлөөт бичвэр.
class OpenAnswerInput extends StatefulWidget {
  const OpenAnswerInput({
    super.key,
    required this.value,
    required this.number,
    required this.onChanged,
    this.enabled = true,
  });

  final String value;
  final int number;
  final ValueChanged<Object?> onChanged;
  final bool enabled;

  @override
  State<OpenAnswerInput> createState() => _OpenAnswerInputState();
}

class _OpenAnswerInputState extends State<OpenAnswerInput> {
  late final _c = TextEditingController(text: widget.value);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _c,
      enabled: widget.enabled,
      minLines: 2,
      maxLines: 6,
      maxLength: 1000,
      decoration: InputDecoration(labelText: '${widget.number}-р бодлогын хариу'),
      onChanged: widget.onChanged,
    );
  }
}
