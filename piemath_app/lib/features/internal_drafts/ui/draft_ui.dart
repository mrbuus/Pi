import 'package:flutter/material.dart';

import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/draft_models.dart';

String draftError(Object e, [String fallback = 'Хадгалж чадсангүй. Дахин оролдоно уу']) =>
    e is ApiError && e.kind != ApiErrorKind.unknown && e.message.trim().isNotEmpty ? e.message : fallback;

void draftSnack(BuildContext context, String m) => ScaffoldMessenger.maybeOf(context)
  ?..hideCurrentSnackBar()
  ..showSnackBar(SnackBar(content: Text(m)));

/// Нэг бодлогын харагдац: нөхцөл, A–E сонголт (зөв нь тодорсон), хариу, тэмдэглэл.
class DraftContentView extends StatelessWidget {
  const DraftContentView({super.key, required this.content, this.issues = const [], this.hasImage = false});

  final DraftContent content;
  final List<String> issues;
  final bool hasImage;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final small = context.text.bodySmall?.copyWith(color: c.inkDim);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (content.statement.trim().isEmpty) Text('Нөхцөл бичээгүй', style: small) else MathText(content.statement),
        if (content.kind == DraftKind.choice) ...[
          const SizedBox(height: AppSpace.sm),
          for (var i = 0; i < content.choices.length && i < draftLetters.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 24,
                    child: Text(
                      draftLetters[i],
                      style: context.text.labelLarge?.copyWith(
                        color: content.answer == draftLetters[i] ? c.success : c.inkDim,
                      ),
                    ),
                  ),
                  Expanded(child: MathText(content.choices[i].isEmpty ? '-' : content.choices[i])),
                ],
              ),
            ),
        ],
        const SizedBox(height: AppSpace.sm),
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.xs,
          children: [
            MetaChip(label: content.kind.label),
            MetaChip(
              label: content.answer == null || content.answer!.isEmpty ? 'Хариу алга' : 'Хариу: ${content.answer}',
              tone: content.answer == null || content.answer!.isEmpty ? ChipTone.warning : ChipTone.success,
            ),
            if (content.points != 1) MetaChip(label: '${content.points} оноо'),
            if (content.tag != null && content.tag!.isNotEmpty) MetaChip(label: content.tag!),
            if (content.solution != null && content.solution!.isNotEmpty) const MetaChip(label: 'Бодолттой'),
            if (hasImage) const MetaChip(label: 'Зурагтай', icon: AppIcons.images),
          ],
        ),
        for (final issue in issues)
          Padding(
            padding: const EdgeInsets.only(top: AppSpace.xs),
            child: Row(
              children: [
                Icon(AppIcons.warning, size: 14, color: c.warning),
                const SizedBox(width: AppSpace.xs),
                Expanded(child: Text(issue, style: small)),
              ],
            ),
          ),
      ],
    );
  }
}

/// Бодлого засах доод хуудас — `DraftContent` буцаана (хаавал `null`).
Future<DraftContent?> showDraftBlockSheet(
  BuildContext context,
  DraftContent initial, {
  String title = 'Бодлого засах',
}) => showModalBottomSheet<DraftContent>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (_) => _BlockSheet(initial: initial, title: title),
);

class _BlockSheet extends StatefulWidget {
  const _BlockSheet({required this.initial, required this.title});

  final DraftContent initial;
  final String title;

  @override
  State<_BlockSheet> createState() => _BlockSheetState();
}

class _BlockSheetState extends State<_BlockSheet> {
  late DraftKind _kind = widget.initial.kind;
  late final _statement = TextEditingController(text: widget.initial.statement);
  late final _choices = [
    for (var i = 0; i < 5; i++)
      TextEditingController(text: i < widget.initial.choices.length ? widget.initial.choices[i] : ''),
  ];
  late int _choiceCount = widget.initial.choices.length.clamp(2, 5);
  late String? _letter = widget.initial.kind == DraftKind.choice ? widget.initial.answer : null;
  late final _numeric = TextEditingController(
    text: widget.initial.kind == DraftKind.numeric ? widget.initial.answer ?? '' : '',
  );
  late final _solution = TextEditingController(text: widget.initial.solution ?? '');
  late final _tag = TextEditingController(text: widget.initial.tag ?? '');
  late int _points = widget.initial.points;

  @override
  void dispose() {
    for (final c in [_statement, _numeric, _solution, _tag, ..._choices]) {
      c.dispose();
    }
    super.dispose();
  }

  void _done() {
    String? opt(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();
    Navigator.of(context).pop(
      DraftContent(
        kind: _kind,
        statement: _statement.text.trim(),
        choices: [for (var i = 0; i < _choiceCount; i++) _choices[i].text.trim()],
        answer: _kind == DraftKind.choice ? _letter : opt(_numeric),
        solution: opt(_solution),
        tag: opt(_tag),
        points: _points,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: ListView(
        shrinkWrap: true,
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
        children: [
          Text(widget.title, style: context.text.titleMedium),
          const SizedBox(height: AppSpace.md),
          SegmentedButton<DraftKind>(
            segments: [for (final k in DraftKind.values) ButtonSegment(value: k, label: Text(k.label))],
            selected: {_kind},
            onSelectionChanged: (v) => setState(() => _kind = v.first),
          ),
          const SizedBox(height: AppSpace.md),
          TextField(
            controller: _statement,
            minLines: 3,
            maxLines: 10,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Нөхцөл',
              alignLabelWithHint: true,
              helperText: r'Томьёог $...$ дотор: $x^2-4=0$',
            ),
          ),
          if (_statement.text.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            AppCard(child: MathText(_statement.text)),
          ],
          const SizedBox(height: AppSpace.md),
          if (_kind == DraftKind.choice) ...[
            for (var i = 0; i < _choiceCount; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: Row(
                  children: [
                    ChoiceChip(
                      label: Text(draftLetters[i]),
                      selected: _letter == draftLetters[i],
                      tooltip: 'Зөв хариу',
                      onSelected: (_) => setState(() => _letter = draftLetters[i]),
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: TextField(
                        controller: _choices[i],
                        decoration: InputDecoration(labelText: '${draftLetters[i]} сонголт'),
                      ),
                    ),
                  ],
                ),
              ),
            OverflowBar(
              alignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(
                  onPressed: _choiceCount > 2
                      ? () => setState(() {
                          _choiceCount--;
                          if (_letter == draftLetters[_choiceCount]) _letter = null;
                        })
                      : null,
                  child: const Text('Сонголт хасах'),
                ),
                TextButton(
                  onPressed: _choiceCount < 5 ? () => setState(() => _choiceCount++) : null,
                  child: const Text('Сонголт нэмэх'),
                ),
              ],
            ),
          ] else
            TextField(
              controller: _numeric,
              decoration: const InputDecoration(labelText: 'Зөв хариу (тоо)'),
            ),
          const SizedBox(height: AppSpace.md),
          TextField(
            controller: _solution,
            minLines: 2,
            maxLines: 8,
            decoration: const InputDecoration(labelText: 'Бодолт (заавал биш)', alignLabelWithHint: true),
          ),
          const SizedBox(height: AppSpace.md),
          TextField(
            controller: _tag,
            maxLength: 120,
            decoration: const InputDecoration(labelText: 'Сэдэв (заавал биш)'),
          ),
          Row(
            children: [
              const Text('Оноо'),
              const Spacer(),
              IconButton(
                tooltip: 'Хасах',
                icon: const Icon(AppIcons.minus),
                onPressed: _points > 1 ? () => setState(() => _points--) : null,
              ),
              Text('$_points', style: context.text.titleMedium),
              IconButton(
                tooltip: 'Нэмэх',
                icon: const Icon(AppIcons.add),
                onPressed: _points < 100 ? () => setState(() => _points++) : null,
              ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          FilledButton(onPressed: _done, child: const Text('Болсон')),
        ],
      ),
    );
  }
}

/// Сонгох жагсаалт (бүлэг сэдэв г.м.).
Future<T?> pickOne<T>(BuildContext context, String title, List<SelectOption<T>> options, {T? selected}) async =>
    (await showSelectSheet<T>(context, title: title, options: options, selected: selected))?.value;
