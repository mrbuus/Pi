import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/solution/solution.dart';
import '../../exam/domain/fill_slots.dart';
import '../data/authoring_models.dart';
import '../data/authoring_storage.dart';
import '../domain/editor_model.dart';
import 'authoring_widgets.dart';

/// Бодлого засварлагчийн үр дүн.
@immutable
class ProblemEditResult {
  const ProblemEditResult({required this.content, required this.points});
  final BlockContent content;
  final int points;
}

/// Бүтэн дэлгэцийн бодлого засварлагч: «Засах» (талбарууд) / «Харах» (сурагчид ЯГ харагдах).
///
/// Вэбийн `ProblemBlock`-ийн засах горим: LaTeX + шууд харагдац, зураг, сонголт ба зөв хариу,
/// нөхөх нүд, оноо. Буцах эсвэл «Болсон» — өөрчлөлт тестийн засварт нэг алхам болж орно
/// (хадгалах нь тестийн «Хадгалах»-аар).
class ProblemEditorScreen extends ConsumerStatefulWidget {
  const ProblemEditorScreen({
    super.key,
    required this.content,
    required this.points,
    required this.number,
    required this.total,
    required this.editable,
    this.isNew = false,
    this.answerLocked = false,
    this.pointsLocked = false,
    this.solution,
  });

  final BlockContent content;
  final int points;
  final int number;
  final int total;

  /// Агуулгыг засах эрх (шинэ бодлого үргэлж, байгаа нь Админ, Багш+).
  final bool editable;
  final bool isNew;

  /// Сурагч өгсөн тест — хариуг өөрчилбөл анхааруулна.
  final bool answerLocked;

  /// Сурагч өгсөн тест — оноо түгжээтэй.
  final bool pointsLocked;

  /// Урьдчилан бэлтгэсэн бодолт (зөвхөн харах).
  final String? solution;

  static Future<ProblemEditResult?> open(
    BuildContext context, {
    required BlockContent content,
    required int points,
    required int number,
    required int total,
    required bool editable,
    bool isNew = false,
    bool answerLocked = false,
    bool pointsLocked = false,
    String? solution,
  }) => Navigator.of(context).push<ProblemEditResult>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => ProblemEditorScreen(
        content: content,
        points: points,
        number: number,
        total: total,
        editable: editable,
        isNew: isNew,
        answerLocked: answerLocked,
        pointsLocked: pointsLocked,
        solution: solution,
      ),
    ),
  );

  @override
  ConsumerState<ProblemEditorScreen> createState() => _ProblemEditorScreenState();
}

enum _Segment { edit, view }

class _ProblemEditorScreenState extends ConsumerState<ProblemEditorScreen> {
  late BlockContent _content = widget.content;
  late int _points = widget.points;
  _Segment _segment = _Segment.edit;
  String? _uploading;
  String _uploadError = '';

  void _done() => Navigator.of(context).pop(ProblemEditResult(content: _content, points: _points));

  void _set(BlockContent next) => setState(() => _content = next);

  /// [target] — `null` бодлогын зураг, эс бөгөөс сонголтын индекс.
  Future<void> _pickImage({int? target, required bool camera}) async {
    setState(() {
      _uploading = target == null ? 'main' : 'c$target';
      _uploadError = '';
    });
    try {
      final key = await ref.read(authoringUploadsProvider).image(camera: camera);
      if (key == null || !mounted) return;
      if (target == null) {
        _set(_content.copyWith(imageKey: () => key));
      } else {
        _setChoice(target, _content.choices[target].copyWith(imageKey: () => key));
      }
    } on ApiError catch (e) {
      if (mounted) setState(() => _uploadError = e.message);
    } on Object {
      if (mounted) setState(() => _uploadError = 'Зураг байршуулж чадсангүй');
    } finally {
      if (mounted) setState(() => _uploading = null);
    }
  }

  Future<void> _imageMenu({int? target}) async {
    final picked = await showSelectSheet<bool>(
      context,
      title: 'Зураг',
      options: const [
        SelectOption(false, 'Зургийн сангаас', icon: AppIcons.gallery),
        SelectOption(true, 'Камераар', icon: AppIcons.camera),
      ],
    );
    if (picked == null) return;
    await _pickImage(target: target, camera: picked.value);
  }

  void _setChoice(int i, EditorChoice c) => _set(
    _content.copyWith(choices: [for (var j = 0; j < _content.choices.length; j++) j == i ? c : _content.choices[j]]),
  );

  void _markCorrect(int i) => _set(
    _content.copyWith(
      choices: [for (var j = 0; j < _content.choices.length; j++) _content.choices[j].copyWith(isCorrect: j == i)],
    ),
  );

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _done();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text('${widget.number}-р бодлого'),
          leading: IconButton(icon: const Icon(AppIcons.back), tooltip: AppStrings.back, onPressed: _done),
          actions: [
            TextButton(onPressed: _done, child: const Text('Болсон')),
            const SizedBox(width: AppSpace.sm),
          ],
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
              child: SizedBox(
                width: double.infinity,
                child: SegmentedButton<_Segment>(
                  segments: const [
                    ButtonSegment(value: _Segment.edit, label: Text('Засах'), icon: Icon(AppIcons.pencilLine)),
                    ButtonSegment(value: _Segment.view, label: Text('Харах'), icon: Icon(AppIcons.show)),
                  ],
                  selected: {_segment},
                  showSelectedIcon: false,
                  style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(0, AppSizes.minTap))),
                  onSelectionChanged: (s) => setState(() => _segment = s.first),
                ),
              ),
            ),
            Expanded(child: _segment == _Segment.edit ? _editPane(context) : _viewPane()),
          ],
        ),
      ),
    );
  }

  Widget _viewPane() => ListView(
    key: const ValueKey('student-view'),
    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
    children: [StudentPreview(content: _content, points: _points, number: widget.number, total: widget.total)],
  );

  Widget _editPane(BuildContext context) {
    final c = context.colors;
    final error = validateContent(_content);
    final images = ref.watch(fileImageProvider);
    return ListView(
      key: const ValueKey('edit-pane'),
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        BlockChips(content: _content, points: _points, isNew: widget.isNew),
        const SizedBox(height: AppSpace.md),
        if (!widget.editable) ...[
          ProblemReadView(content: _content),
          const SizedBox(height: AppSpace.md),
          const NoticeBox(message: 'Бодлогын агуулгыг Багш+ эсвэл админ засна', tone: ChipTone.info),
        ] else ...[
          if (error.isNotEmpty) ...[
            NoticeBox(message: error, tone: ChipTone.error),
            const SizedBox(height: AppSpace.md),
          ],
          LatexField(
            fieldKey: const Key('statement-field'),
            label: 'Бодлого (LaTeX)',
            value: _content.statement,
            minLines: 4,
            alwaysShowTools: true,
            onChanged: (t) => _set(_content.copyWith(statement: t)),
          ),
          const SizedBox(height: AppSpace.md),
          _imageRow(context, images),
          if (_uploadError.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.xs),
              child: Text(_uploadError, style: context.text.bodySmall?.copyWith(color: c.error)),
            ),
          const SizedBox(height: AppSpace.lg),
          if (_content.format == ProblemFormats.choice) _choiceEditor(context, images),
          if (_content.format == ProblemFormats.fill) _FillEditor(content: _content, onChanged: _set),
          if (widget.answerLocked) ...[
            const SizedBox(height: AppSpace.md),
            const NoticeBox(message: 'Сурагч өгсөн тест — хариуг өөрчилбөл өмнөх дүн дахин бодогдохгүй'),
          ],
        ],
        if (!widget.pointsLocked) ...[
          const SizedBox(height: AppSpace.lg),
          PickerRow(
            label: 'Оноо',
            value: '$_points оноо',
            icon: AppIcons.medal,
            onTap: () async {
              final p = await askPoints(context, initial: _points);
              if (p != null) setState(() => _points = p);
            },
          ),
        ],
        if ((widget.solution ?? '').trim().isNotEmpty) ...[
          const SizedBox(height: AppSpace.lg),
          SolutionView(source: widget.solution),
        ],
      ],
    );
  }

  Widget _imageRow(BuildContext context, FileImageFactory images) {
    final key = _content.imageKey;
    final busy = _uploading == 'main';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (key != null) ...[
          ProblemFigure(image: images.image(key), alt: 'Бодлогын зураг'),
          const SizedBox(height: AppSpace.sm),
        ],
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          children: [
            OutlinedButton.icon(
              onPressed: busy ? null : () => unawaited(_imageMenu()),
              icon: busy
                  ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(AppIcons.imagePlus, size: 18),
              label: Text(busy ? 'Байршуулж байна' : (key == null ? 'Зураг нэмэх' : 'Зураг солих')),
            ),
            if (key != null)
              TextButton.icon(
                onPressed: () => _set(_content.copyWith(imageKey: () => null)),
                icon: const Icon(AppIcons.close, size: 18),
                label: const Text('Зураг хасах'),
              ),
          ],
        ),
      ],
    );
  }

  Widget _choiceEditor(BuildContext context, FileImageFactory images) {
    final choices = _content.choices;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Сонголт ба зөв хариу', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        for (var i = 0; i < choices.length; i++) ...[
          _ChoiceRow(
            key: ValueKey('choice-$i'),
            index: i,
            choice: choices[i],
            canRemove: choices.length > 2,
            uploading: _uploading == 'c$i',
            image: choices[i].imageKey == null ? null : images.image(choices[i].imageKey!),
            onCorrect: () => _markCorrect(i),
            onText: (t) => _setChoice(i, choices[i].copyWith(text: t)),
            onImage: () => unawaited(_imageMenu(target: i)),
            onRemoveImage: () => _setChoice(i, choices[i].copyWith(imageKey: () => null)),
            onRemove: () => _set(
              _content.copyWith(
                choices: [
                  for (var j = 0; j < choices.length; j++)
                    if (j != i) choices[j],
                ],
              ),
            ),
          ),
          const SizedBox(height: AppSpace.sm),
        ],
        if (choices.length < choiceLetters.length)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              onPressed: () => _set(_content.copyWith(choices: [...choices, const EditorChoice()])),
              icon: const Icon(AppIcons.add, size: 18),
              label: const Text('Сонголт нэмэх'),
            ),
          ),
        if (choices.isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          Text('Байрлал', style: context.text.labelMedium?.copyWith(color: context.colors.inkDim)),
          const SizedBox(height: AppSpace.xs),
          ChoiceGrid(
            variant: ChoiceGridVariant.compact,
            showCorrect: true,
            choices: teacherChoiceItems(_content, images.image),
          ),
        ],
      ],
    );
  }
}

class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({
    super.key,
    required this.index,
    required this.choice,
    required this.canRemove,
    required this.uploading,
    required this.image,
    required this.onCorrect,
    required this.onText,
    required this.onImage,
    required this.onRemoveImage,
    required this.onRemove,
  });

  final int index;
  final EditorChoice choice;
  final bool canRemove;
  final bool uploading;
  final ImageProvider? image;
  final VoidCallback onCorrect;
  final ValueChanged<String> onText;
  final VoidCallback onImage;
  final VoidCallback onRemoveImage;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final letter = choiceLetter(index);
    return AppCard(
      accent: choice.isCorrect ? c.success : null,
      padding: const EdgeInsets.all(AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Semantics(
                button: true,
                selected: choice.isCorrect,
                label: '$letter сонголтыг зөв болгох',
                excludeSemantics: true,
                child: Material(
                  color: choice.isCorrect ? c.success : c.surfaceSunken,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  child: InkWell(
                    key: Key('correct-$index'),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    onTap: () {
                      HapticFeedback.selectionClick();
                      onCorrect();
                    },
                    child: SizedBox.square(
                      dimension: AppSizes.minTap,
                      child: Center(
                        child: choice.isCorrect
                            ? Icon(AppIcons.check, color: c.onStatus)
                            : Text(letter, style: context.text.titleMedium?.copyWith(color: c.inkDim)),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Text(
                  choice.isCorrect ? '$letter — зөв хариу' : '$letter сонголт',
                  style: context.text.bodyMedium?.copyWith(color: choice.isCorrect ? c.success : c.inkDim),
                ),
              ),
              IconButton(
                tooltip: '$letter сонголтын зураг',
                onPressed: uploading ? null : onImage,
                icon: uploading
                    ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(AppIcons.imagePlus),
              ),
              if (canRemove)
                IconButton(tooltip: '$letter сонголтыг хасах', onPressed: onRemove, icon: const Icon(AppIcons.close)),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          LatexField(
            fieldKey: Key('choice-text-$index'),
            label: choice.imageKey == null ? '$letter сонголт (LaTeX)' : 'Текст (заавал биш)',
            value: choice.text,
            minLines: 1,
            maxLines: 4,
            onChanged: onText,
          ),
          if (image != null) ...[
            const SizedBox(height: AppSpace.sm),
            ProblemFigure(image: image, alt: '$letter сонголтын зураг'),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                onPressed: onRemoveImage,
                icon: const Icon(AppIcons.close, size: 18),
                label: const Text('Зураг хасах'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Нөхөх бодлогын хариу: `[a]`, `[bc]` нүд бүрт нэг цифр (эсвэл нүдгүй бол чөлөөт хариу).
class _FillEditor extends StatelessWidget {
  const _FillEditor({required this.content, required this.onChanged});

  final BlockContent content;
  final ValueChanged<BlockContent> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final groups = parseFillSlots(content.statement);
    final total = slotsTotalLength(groups);
    if (total == 0) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Хариу (бодлогод [a] нүд алга)', style: context.text.titleSmall),
          const SizedBox(height: AppSpace.sm),
          TextFormField(
            key: const Key('fill-free'),
            initialValue: content.fill,
            keyboardType: const TextInputType.numberWithOptions(signed: true, decimal: true),
            decoration: const InputDecoration(labelText: 'Хариу'),
            onChanged: (v) => onChanged(content.copyWith(fill: v.trim())),
          ),
        ],
      );
    }
    final digits = decodeSlotValue(content.fill, total);
    var start = 0;
    final rows = <Widget>[];
    for (final g in groups) {
      final from = start;
      rows.add(
        Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.sm),
          child: Row(
            children: [
              SizedBox(
                width: 56,
                child: Text('[${g.key}]', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
              ),
              for (var j = 0; j < g.length; j++)
                Padding(
                  padding: const EdgeInsets.only(right: AppSpace.xs),
                  child: SizedBox(
                    width: AppSizes.minTap,
                    child: TextFormField(
                      key: Key('fill-${from + j}'),
                      initialValue: digits[from + j],
                      textAlign: TextAlign.center,
                      keyboardType: const TextInputType.numberWithOptions(signed: true),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp('[0-9-]')),
                        LengthLimitingTextInputFormatter(1),
                      ],
                      style: context.text.titleMedium,
                      decoration: InputDecoration(
                        semanticCounterText: '',
                        labelText: g.length > 1 ? g.key[j] : null,
                        contentPadding: const EdgeInsets.symmetric(vertical: AppSpace.md),
                      ),
                      onChanged: (v) =>
                          onChanged(content.copyWith(fill: setSlotDigit(content.fill, total, from + j, v))),
                    ),
                  ),
                ),
            ],
          ),
        ),
      );
      start += g.length;
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Хариу — нүд бүрт нэг цифр', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        ...rows,
      ],
    );
  }
}
