import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/content_providers.dart';
import '../data/content_models.dart';
import 'content_widgets.dart';

/// Түвшин тогтоох шалгалтын агуулга (`GET/PUT /placement/config`). Багш зөвхөн харна; Админ, Багш+ гарчиг,
/// хугацаа, заавар, бодлогуудыг засна. Шинэ хувилбар дараагийн хүүхдээс эхэлнэ — өмнөх дүн өөрчлөгдөхгүй.
class PlacementConfigView extends ConsumerStatefulWidget {
  const PlacementConfigView({super.key});

  @override
  ConsumerState<PlacementConfigView> createState() => _PlacementConfigViewState();
}

class _PlacementConfigViewState extends ConsumerState<PlacementConfigView> {
  PlacementConfig? _draft;
  bool _busy = false;

  void _set(PlacementConfig c) => setState(() => _draft = c);

  PlacementConfig _with(
    PlacementConfig c, {
    String? title,
    int? minutes,
    String? instructions,
    List<PlacementProblem>? problems,
  }) => PlacementConfig(
    title: title ?? c.title,
    minutes: minutes ?? c.minutes,
    instructions: instructions ?? c.instructions,
    problems: problems ?? c.problems,
  );

  Future<void> _editHeader(PlacementConfig c) async {
    final r = await showFormSheet<PlacementConfig>(
      context,
      title: 'Шалгалтын мэдээлэл',
      fields: [
        FormTextField(name: 'title', label: 'Гарчиг', initial: c.title, required: true, maxLength: 120),
        FormNumberField(
          name: 'minutes',
          label: 'Хугацаа',
          initial: c.minutes,
          min: 5,
          max: 180,
          suffixText: 'мин',
          required: true,
        ),
        FormTextField(
          name: 'instructions',
          label: 'Хүүхдэд харагдах заавар',
          helper: 'Мөр бүр нэг дүрэм',
          initial: c.instructions,
          maxLines: 6,
          maxLength: 3000,
        ),
      ],
      onSubmit: (v) async =>
          _with(c, title: v.text('title'), minutes: v.integer('minutes'), instructions: v.text('instructions')),
    );
    if (r != null) _set(r);
  }

  Future<void> _editProblem(PlacementConfig c, int? index) async {
    final base = index == null
        ? PlacementProblem(n: c.problems.length + 1, statement: '', kind: 'choice', answerChoice: 'A')
        : c.problems[index];
    final edited = await showModalBottomSheet<PlacementProblem>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _ProblemSheet(problem: base),
    );
    if (edited == null) return;
    final list = [...c.problems];
    if (index == null) {
      list.add(edited);
    } else {
      list[index] = edited;
    }
    _set(_with(c, problems: list));
  }

  void _move(PlacementConfig c, int i, int d) {
    final j = i + d;
    if (j < 0 || j >= c.problems.length) return;
    final list = [...c.problems];
    final t = list[i];
    list[i] = list[j];
    list[j] = t;
    _set(_with(c, problems: list));
  }

  Future<void> _remove(PlacementConfig c, int i) async {
    final ok = await confirmAction(
      context,
      title: '${i + 1}-р бодлогыг хасах уу',
      message: 'Хадгалсны дараа дараагийн хүүхдэд харагдахгүй. Өмнө өгсөн хүүхдийн дүн өөрчлөгдөхгүй',
      confirmLabel: 'Хасах',
    );
    if (!ok) return;
    _set(_with(c, problems: [...c.problems]..removeAt(i)));
  }

  Future<void> _save(PlacementConfig c) async {
    setState(() => _busy = true);
    try {
      await ref.read(contentRepositoryProvider).savePlacementConfig(c);
      if (!mounted) return;
      contentSnack(context, 'Шалгалт шинэчлэгдлээ');
      setState(() => _draft = null);
      ref.invalidate(placementConfigProvider);
    } catch (e) {
      if (mounted) contentSnack(context, contentError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canEdit = ref.watch(contentAccessProvider).canEditPlacementConfig;
    return AsyncBody<PlacementConfig>(
      value: ref.watch(placementConfigProvider),
      onRetry: () => ref.invalidate(placementConfigProvider),
      data: (server) {
        final c = _draft ?? server;
        final dirty = _draft != null;
        return Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xl),
                children: [
                  if (!canEdit)
                    const Padding(
                      padding: EdgeInsets.only(bottom: AppSpace.md),
                      child: InfoHint(title: 'Зөвхөн харах', message: 'Засах эрх Админ, Багш+ хэрэглэгчид бий'),
                    ),
                  AppCard(
                    onTap: canEdit ? () => _editHeader(c) : null,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(c.title, style: context.text.titleMedium),
                        const SizedBox(height: 2),
                        Meta(items: ['${c.minutes} мин', '${c.problems.length} бодлого']),
                        if (c.instructions.trim().isNotEmpty) ...[
                          const SizedBox(height: AppSpace.sm),
                          Text(c.instructions, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpace.sm),
                  for (var i = 0; i < c.problems.length; i++)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.sm),
                      child: AppCard(
                        onTap: canEdit ? () => _editProblem(c, i) : null,
                        padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.xs, AppSpace.md),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Meta(
                                    items: [
                                      '${i + 1}-р бодлого',
                                      c.problems[i].isChoice ? 'A–E сонголттой' : 'Нүдэнд бичих',
                                      '${c.problems[i].points} оноо',
                                    ],
                                  ),
                                  const SizedBox(height: AppSpace.xs),
                                  MathText(c.problems[i].statement.isEmpty ? '-' : c.problems[i].statement),
                                  const SizedBox(height: AppSpace.xs),
                                  Text(
                                    'Зөв хариу: ${c.problems[i].formatAnswer(c.problems[i].correctAnswer)}',
                                    style: context.text.bodySmall?.copyWith(color: context.colors.success),
                                  ),
                                ],
                              ),
                            ),
                            if (canEdit)
                              Column(
                                children: [
                                  IconButton(
                                    tooltip: 'Дээш',
                                    icon: const RotatedBox(quarterTurns: 2, child: Icon(AppIcons.expand, size: 20)),
                                    onPressed: i == 0 ? null : () => _move(c, i, -1),
                                  ),
                                  IconButton(
                                    tooltip: 'Доош',
                                    icon: const Icon(AppIcons.expand, size: 20),
                                    onPressed: i == c.problems.length - 1 ? null : () => _move(c, i, 1),
                                  ),
                                  IconButton(
                                    tooltip: 'Хасах',
                                    icon: const Icon(AppIcons.circleMinus, size: 20),
                                    onPressed: () => _remove(c, i),
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                    ),
                  if (canEdit)
                    OutlinedButton.icon(
                      onPressed: () => _editProblem(c, null),
                      icon: const Icon(AppIcons.add, size: 18),
                      label: const Text('Бодлого нэмэх'),
                    ),
                ],
              ),
            ),
            if (canEdit && dirty)
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _busy ? null : () => setState(() => _draft = null),
                          child: const Text('Буцаах'),
                        ),
                      ),
                      const SizedBox(width: AppSpace.sm),
                      Expanded(
                        child: FilledButton(
                          onPressed: _busy ? null : () => _save(c),
                          child: Text(_busy ? 'Хадгалж байна' : AppStrings.save),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

/// Нэг бодлого засах: нөхцөл, төрөл, оноо, A–E сонголт эсвэл нүд (нэр, орон, зөв хариу).
class _ProblemSheet extends StatefulWidget {
  const _ProblemSheet({required this.problem});

  final PlacementProblem problem;

  @override
  State<_ProblemSheet> createState() => _ProblemSheetState();
}

class _ProblemSheetState extends State<_ProblemSheet> {
  late final _statement = TextEditingController(text: widget.problem.statement);
  late String _kind = widget.problem.kind;
  late int _points = widget.problem.points;
  late String _answer = widget.problem.answerChoice ?? 'A';
  late final _choices = {for (final k in choiceKeys) k: TextEditingController(text: widget.problem.choices[k] ?? '')};
  late final _boxes = [
    for (final b in widget.problem.boxes)
      (
        key: TextEditingController(text: b.key),
        digits: TextEditingController(text: '${b.digits}'),
        answer: TextEditingController(text: widget.problem.answerBoxes[b.key] ?? ''),
      ),
  ];
  String? _error;

  @override
  void dispose() {
    _statement.dispose();
    for (final c in _choices.values) {
      c.dispose();
    }
    for (final b in _boxes) {
      b.key.dispose();
      b.digits.dispose();
      b.answer.dispose();
    }
    super.dispose();
  }

  void _addBox() => setState(
    () => _boxes.add((
      key: TextEditingController(text: String.fromCharCode(97 + _boxes.length)),
      digits: TextEditingController(text: '1'),
      answer: TextEditingController(),
    )),
  );

  void _done() {
    if (_statement.text.trim().isEmpty) return setState(() => _error = 'Нөхцөл бичнэ үү');
    if (_kind == 'boxes' && _boxes.isEmpty) return setState(() => _error = 'Дор хаяж нэг нүд нэмнэ үү');
    final boxes = [
      for (final b in _boxes)
        (key: b.key.text.trim().toLowerCase(), digits: (int.tryParse(b.digits.text.trim()) ?? 1).clamp(1, 3)),
    ];
    Navigator.of(context).pop(
      widget.problem.copyWith(
        statement: _statement.text.trim(),
        kind: _kind,
        points: _points,
        choices: {for (final e in _choices.entries) e.key: e.value.text.trim()},
        answerChoice: _answer,
        boxes: boxes,
        answerBoxes: {for (var i = 0; i < _boxes.length; i++) boxes[i].key: _boxes[i].answer.text.trim()},
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
          Text('Бодлого', style: context.text.titleMedium),
          const SizedBox(height: AppSpace.md),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'choice', label: Text('A–E сонголт')),
              ButtonSegment(value: 'boxes', label: Text('Нүдэнд бичих')),
            ],
            selected: {_kind},
            onSelectionChanged: (v) => setState(() {
              _kind = v.first;
              if (_kind == 'boxes' && _boxes.isEmpty) _addBox();
            }),
          ),
          const SizedBox(height: AppSpace.md),
          TextField(
            controller: _statement,
            minLines: 3,
            maxLines: 8,
            onChanged: (_) => setState(() => _error = null),
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
                onPressed: _points < 10 ? () => setState(() => _points++) : null,
              ),
            ],
          ),
          if (_kind == 'choice')
            RadioGroup<String>(
              groupValue: _answer,
              onChanged: (v) => setState(() => _answer = v ?? _answer),
              child: Column(
                children: [
                  for (final k in choiceKeys)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.sm),
                      child: Row(
                        children: [
                          Radio<String>(value: k),
                          Expanded(
                            child: TextField(
                              controller: _choices[k],
                              decoration: InputDecoration(labelText: k == _answer ? '$k (зөв)' : k, hintText: r'$-4$'),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            )
          else ...[
            for (var i = 0; i < _boxes.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _boxes[i].key,
                        maxLength: 3,
                        decoration: const InputDecoration(labelText: 'Нүд', counterText: ''),
                      ),
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: TextField(
                        controller: _boxes[i].digits,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Орон'),
                      ),
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      flex: 2,
                      child: TextField(
                        controller: _boxes[i].answer,
                        decoration: const InputDecoration(labelText: 'Зөв хариу'),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Нүд хасах',
                      icon: const Icon(AppIcons.circleMinus),
                      onPressed: () => setState(() => _boxes.removeAt(i)),
                    ),
                  ],
                ),
              ),
            OutlinedButton.icon(
              onPressed: _addBox,
              icon: const Icon(AppIcons.add, size: 18),
              label: const Text('Нүд нэмэх'),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: AppSpace.sm),
            Text(_error!, style: context.text.bodyMedium?.copyWith(color: context.colors.error)),
          ],
          const SizedBox(height: AppSpace.md),
          FilledButton(onPressed: _done, child: const Text('Болсон')),
        ],
      ),
    );
  }
}
