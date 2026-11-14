import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/math_keyboard/math_keyboard_lib.dart';
import '../../../shared/native/native.dart';
import '../../exam/data/exam_models.dart' as exam;
import '../../exam/domain/answer.dart' show SelfState;
import '../../exam/domain/fill_slots.dart';
import '../../exam/ui/widgets/exam_parts.dart' show QuestionView;
import '../data/authoring_models.dart';
import '../domain/authoring_permissions.dart';
import '../domain/editor_model.dart';
import '../domain/latex_input.dart';

/// Нэвтэрсэн хэрэглэгчийн тест зохиох эрх.
final authoringPermissionsProvider = Provider<AuthoringPermissions>((ref) {
  final s = ref.watch(sessionProvider);
  if (s is! SignedIn) return const AuthoringPermissions(UserRole.unknown);
  return AuthoringPermissions(s.role, userId: s.user?.id ?? s.auth.userId);
});

/// Эрхгүй үеийн төвийг сахисан тайлбар.
class AuthoringDenied extends StatelessWidget {
  const AuthoringDenied({super.key});

  @override
  Widget build(BuildContext context) => const EmptyState(
    icon: AppIcons.shield,
    title: 'Энэ хэсэг танд нээгдээгүй',
    message: 'Тестийг Багш, Багш+, Админ үүсгэж засна',
  );
}

/// Анхааруулга, алдааны мөр — карт саарал/цагаан, өнгө зөвхөн дүрс, зурвас (RULES §3).
class NoticeBox extends StatelessWidget {
  const NoticeBox({super.key, required this.message, this.tone = ChipTone.warning, this.action});

  final String message;
  final ChipTone tone;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final color = MetaChip.toneColor(context, tone);
    final icon = switch (tone) {
      ChipTone.error => AppIcons.error,
      ChipTone.success => AppIcons.success,
      ChipTone.info || ChipTone.brand || ChipTone.neutral => AppIcons.info,
      ChipTone.warning => AppIcons.warning,
    };
    return Semantics(
      liveRegion: true,
      child: AppCard(
        accent: color,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(width: AppSpace.sm),
                Expanded(child: Text(message, style: context.text.bodyMedium)),
              ],
            ),
            if (action != null) ...[const SizedBox(height: AppSpace.sm), action!],
          ],
        ),
      ),
    );
  }
}

/// Хэсгийн карт (алхам 1–4, тохиргоо).
class StepCard extends StatelessWidget {
  const StepCard({super.key, required this.title, required this.child, this.step, this.hint, this.trailing});

  final String title;
  final int? step;
  final String? hint;
  final Widget? trailing;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(step == null ? title : '$step. $title', style: context.text.titleMedium),
                ),
              ),
              ?trailing,
            ],
          ),
          if (hint != null) ...[
            const SizedBox(height: AppSpace.xs),
            Text(hint!, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
          ],
          const SizedBox(height: AppSpace.md),
          child,
        ],
      ),
    );
  }
}

/// Сонгох мөр (дарахад доороос сонголт) — 48dp.
class PickerRow extends StatelessWidget {
  const PickerRow({super.key, required this.label, required this.value, this.onTap, this.icon});

  final String label;
  final String value;
  final VoidCallback? onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: onTap != null,
      label: label,
      value: value,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: AppSizes.minTap + 8),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
            child: Row(
              children: [
                if (icon != null) ...[Icon(icon, size: 20, color: c.inkDim), const SizedBox(width: AppSpace.md)],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(label, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                      Text(value, style: context.text.bodyLarge, maxLines: 2, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                if (onTap != null) Icon(AppIcons.expand, size: 20, color: c.inkDim),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Бодлогын төрөл, оноо, төлөвийн чипүүд.
class BlockChips extends StatelessWidget {
  const BlockChips({super.key, required this.content, required this.points, this.isNew = false, this.changed = false});

  final BlockContent content;
  final int points;
  final bool isNew;
  final bool changed;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: AppSpace.xs,
    runSpacing: AppSpace.xs,
    children: [
      MetaChip(label: ProblemFormats.label(content.format), tone: ChipTone.brand),
      MetaChip(label: '$points оноо'),
      if (isNew) const MetaChip(label: 'Шинэ', tone: ChipTone.info),
      if (changed && !isNew) const MetaChip(label: 'Засварласан', tone: ChipTone.info),
      if (content.missingAnswer) const MetaChip(label: 'Хариугүй', icon: AppIcons.warning, tone: ChipTone.error),
    ],
  );
}

/// Багшийн харагдац: бодлого + зөв хариу тодорсон (вэбийн `ReadView`). Хариу A–E — [ChoiceGrid]
/// (нэг мөрөнд 5 эсвэл 3+2, өнчингүй).
class ProblemReadView extends ConsumerWidget {
  const ProblemReadView({super.key, required this.content, this.compact = false});

  final BlockContent content;

  /// Жагсаалтын картад: бодлогын бичвэр богино.
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final images = ref.watch(fileImageProvider);
    final statement = content.statement.trim();
    final c = context.colors;
    Widget body = statement.isEmpty
        ? Text('Бодлогын текст хоосон', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
        : MathText(content.statement, showErrorInTeacherView: true);
    if (compact) {
      body = ConstrainedBox(
        constraints: const BoxConstraints(maxHeight: 132),
        child: ClipRect(child: body),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ProblemFigure(
          image: content.imageKey == null ? null : images.image(content.imageKey!),
          forbiddenMessage: 'Зургийг ачаалж чадсангүй',
          child: body,
        ),
        if (content.format == ProblemFormats.choice && content.choices.isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          ChoiceGrid(
            variant: ChoiceGridVariant.compact,
            showCorrect: true,
            choices: teacherChoiceItems(content, images.image),
          ),
        ],
        if (content.format == ProblemFormats.fill) ...[
          const SizedBox(height: AppSpace.sm),
          FillAnswerLine(content: content),
        ],
      ],
    );
  }
}

/// Багшид: A, B, C … шошготой, зөв хариу тэмдэглэгдсэн.
List<ChoiceItem> teacherChoiceItems(BlockContent content, ImageProvider Function(String key) imageFor) => [
  for (var i = 0; i < content.choices.length; i++)
    ChoiceItem(
      label: choiceLetter(i),
      text: content.choices[i].text,
      image: content.choices[i].imageKey == null ? null : imageFor(content.choices[i].imageKey!),
      isCorrect: content.choices[i].isCorrect,
    ),
];

/// Нөхөх бодлогын хариу: `[a] 3`, `[bc] 25`.
class FillAnswerLine extends StatelessWidget {
  const FillAnswerLine({super.key, required this.content});

  final BlockContent content;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final groups = parseFillSlots(content.statement);
    final total = slotsTotalLength(groups);
    final label = context.text.bodyMedium?.copyWith(color: c.inkDim);
    final value = context.text.bodyMedium?.copyWith(color: c.success, fontWeight: FontWeight.w700);
    if (total == 0) {
      return Text.rich(
        TextSpan(
          children: [
            TextSpan(text: 'Хариу: ', style: label),
            TextSpan(text: content.fill.isEmpty ? 'алга' : content.fill, style: value),
          ],
        ),
      );
    }
    final digits = decodeSlotValue(content.fill, total);
    var start = 0;
    final parts = <InlineSpan>[TextSpan(text: 'Хариу: ', style: label)];
    for (final g in groups) {
      final part = digits.sublist(start, start + g.length).map((d) => d.isEmpty ? fillEmpty : d).join();
      parts
        ..add(TextSpan(text: '[${g.key}] ', style: label))
        ..add(TextSpan(text: '$part   ', style: value));
      start += g.length;
    }
    return Text.rich(TextSpan(children: parts));
  }
}

/// Сурагчид ЯГ харагдах хэлбэр — шалгалтын [QuestionView] (сонголт дугаартай, зөв хариугүй).
/// Хариу сонгож туршиж болно; юу ч хадгалагдахгүй.
class StudentPreview extends ConsumerStatefulWidget {
  const StudentPreview({super.key, required this.content, required this.points, this.number = 1, this.total = 1});

  final BlockContent content;
  final int points;
  final int number;
  final int total;

  @override
  ConsumerState<StudentPreview> createState() => _StudentPreviewState();
}

class _StudentPreviewState extends ConsumerState<StudentPreview> {
  Object? _answer;
  SelfState? _self;
  bool _flag = false;

  @override
  Widget build(BuildContext context) {
    final images = ref.watch(fileImageProvider);
    return QuestionView(
      problem: studentProblemOf(widget.content, points: widget.points),
      number: widget.number,
      total: widget.total,
      answer: _answer,
      selfState: _self,
      flagged: _flag,
      imageFor: images.image,
      onAnswer: (v) => setState(() => _answer = v),
      onSelfState: (s) => setState(() => _self = s),
      onToggleFlag: () => setState(() => _flag = !_flag),
    );
  }
}

/// Засварлагчийн агуулга → шалгалтын бодлого (сервер сурагчид илгээдэгтэй ижил: түлхүүргүй).
exam.ExamProblem studentProblemOf(BlockContent c, {required int points, String id = 'preview'}) {
  final format = exam.ProblemFormat.parse(c.format);
  final choice = c.format == ProblemFormats.choice && c.choices.isNotEmpty;
  return exam.ExamProblem(
    id: id,
    format: format,
    statementText: c.statement.trim().isEmpty ? null : c.statement,
    imageKey: c.imageKey,
    points: points.toDouble(),
    choiceMode: choice ? exam.ChoiceMode.text : null,
    choices: choice ? [for (final ch in c.choices) ch.text] : null,
    choiceImages: choice ? [for (final ch in c.choices) ch.imageKey] : null,
  );
}

/// Сурагчийн харагдацыг доороос гаргах (сангаас сонгох, үүсгэх хуудсанд).
Future<void> showStudentPreview(BuildContext context, BlockContent content, {required int points}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.85,
        maxChildSize: 0.95,
        builder: (ctx, scroll) => ListView(
          controller: scroll,
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
          children: [
            Text('Сурагчид харагдах байдал', style: ctx.text.titleMedium),
            const SizedBox(height: AppSpace.md),
            StudentPreview(content: content, points: points),
          ],
        ),
      ),
    );

/// Оноо асуух (1–100).
Future<int?> askPoints(BuildContext context, {required int initial, String title = 'Оноо'}) => showFormSheet<int>(
  context,
  title: title,
  fields: [FormNumberField(name: 'points', label: 'Оноо', initial: initial, required: true, min: 1, max: 100)],
  onSubmit: (v) async => v.integer('points') ?? initial,
);

// ======================= LaTeX талбар =======================

/// LaTeX-ийн түүхий талбар + туслах товчнуудын мөр + томьёоны гар (`MathKeyboard`).
/// Доор нь шууд [MathText] харагдац.
class LatexField extends StatefulWidget {
  const LatexField({
    super.key,
    required this.value,
    required this.onChanged,
    required this.label,
    this.minLines = 3,
    this.maxLines = 12,
    this.preview = true,
    this.fieldKey,
    this.hint,
    this.alwaysShowTools = false,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final String label;
  final int minLines;
  final int maxLines;

  /// Талбарын доор шууд харагдац.
  final bool preview;
  final Key? fieldKey;
  final String? hint;

  /// Туслах товчнууд үргэлж харагдана (үгүй бол талбарт бичиж байхад л).
  final bool alwaysShowTools;

  @override
  State<LatexField> createState() => _LatexFieldState();
}

class _LatexFieldState extends State<LatexField> {
  late final _controller = TextEditingController(text: widget.value);
  final _focus = FocusNode();
  bool _tools = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(_onFocus);
  }

  void _onFocus() {
    // Томьёоны гар нээгдэхэд фокус алдагдана — товчнууд нуугдахгүй (буцаад бичнэ).
    if (_focus.hasFocus && !_tools) setState(() => _tools = true);
  }

  @override
  void didUpdateWidget(LatexField old) {
    super.didUpdateWidget(old);
    if (widget.value != _controller.text) _controller.text = widget.value;
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus
      ..removeListener(_onFocus)
      ..dispose();
    super.dispose();
  }

  void _apply(TextEditingValue v) {
    _controller.value = v;
    widget.onChanged(v.text);
    _focus.requestFocus();
  }

  Future<void> _formula() async {
    final latex = await showFormulaKeyboard(context);
    if (latex == null || latex.isEmpty || !mounted) return;
    _apply(insertFormula(_controller.value, latex));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          key: widget.fieldKey,
          controller: _controller,
          focusNode: _focus,
          minLines: widget.minLines,
          maxLines: widget.maxLines,
          autocorrect: false,
          enableSuggestions: false,
          keyboardType: TextInputType.multiline,
          style: const TextStyle(fontFamily: 'monospace', fontSize: 15, height: 1.4),
          decoration: InputDecoration(labelText: widget.label, hintText: widget.hint, alignLabelWithHint: true),
          onChanged: (t) {
            final clean = normalizeMultiplication(t);
            if (clean != t) {
              final sel = _controller.selection;
              _controller.value = TextEditingValue(
                text: clean,
                selection: TextSelection.collapsed(offset: (sel.end + clean.length - t.length).clamp(0, clean.length)),
              );
            }
            widget.onChanged(clean);
          },
        ),
        if (_tools || widget.alwaysShowTools) ...[
          const SizedBox(height: AppSpace.xs),
          SizedBox(
            height: AppSizes.minTap,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _SnippetButton(
                  semantics: 'Томьёоны гар',
                  onTap: () => unawaited(_formula()),
                  child: Icon(AppIcons.keyboard, size: 20, color: c.brand),
                ),
                for (final s in latexSnippets)
                  _SnippetButton(
                    semantics: s.semantics,
                    onTap: () => _apply(insertSnippet(_controller.value, s.insert)),
                    child: MathText('\$${s.preview}\$', style: TextStyle(fontSize: 15, color: c.ink)),
                  ),
              ],
            ),
          ),
        ],
        if (widget.preview) ...[
          const SizedBox(height: AppSpace.sm),
          Text('Харагдац', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
          const SizedBox(height: AppSpace.xs),
          Container(
            constraints: const BoxConstraints(minHeight: AppSizes.minTap),
            padding: const EdgeInsets.all(AppSpace.md),
            decoration: BoxDecoration(
              border: Border.all(color: c.line),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: widget.value.trim().isEmpty
                ? Text('Бичвэр энд харагдана', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
                : MathText(widget.value, showErrorInTeacherView: true),
          ),
        ],
      ],
    );
  }
}

class _SnippetButton extends StatelessWidget {
  const _SnippetButton({required this.semantics, required this.onTap, required this.child});

  final String semantics;
  final VoidCallback onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(right: AppSpace.xs),
      child: Semantics(
        button: true,
        label: semantics,
        excludeSemantics: true,
        child: Material(
          color: c.surfaceSunken,
          borderRadius: BorderRadius.circular(AppRadius.sm),
          child: InkWell(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            onTap: onTap,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
                child: Center(child: child),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Томьёоны гар (`MathKeyboard`): тоо, язгуур, бутархай, квадрат, пи. «Болсон» дарвал LaTeX буцаана.
Future<String?> showFormulaKeyboard(BuildContext context) => showModalBottomSheet<String>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (_) => const _FormulaSheet(),
);

class _FormulaSheet extends StatefulWidget {
  const _FormulaSheet();

  @override
  State<_FormulaSheet> createState() => _FormulaSheetState();
}

class _FormulaSheetState extends State<_FormulaSheet> {
  final _input = MathInputController();
  final _group = MathFieldGroup();
  bool _incomplete = false;

  @override
  void initState() {
    super.initState();
    _group
      ..setFields([_input])
      ..focus(_input)
      ..addListener(_onGroup);
  }

  void _onGroup() {
    // «Болсон» (сүүлийн талбарын «Дараах») — гар хаагдана.
    if (_group.active == null) _done();
  }

  void _done() {
    if (_input.isEmpty) {
      Navigator.of(context).pop();
      return;
    }
    if (_input.value == null) {
      setState(() => _incomplete = true);
      _group.focus(_input);
      return;
    }
    Navigator.of(context).pop(_input.displayTex);
  }

  @override
  void dispose() {
    _group
      ..removeListener(_onGroup)
      ..dispose();
    _input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.lg, AppSpace.gutter, AppSpace.sm),
          child: Text('Томьёо', style: context.text.titleMedium),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          child: ListenableBuilder(
            listenable: _input,
            builder: (context, _) => Container(
              constraints: const BoxConstraints(minHeight: AppSizes.minTap + 8),
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
              decoration: BoxDecoration(
                border: Border.all(color: _incomplete ? c.error : c.brandBright, width: 2),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: _input.isEmpty
                  ? Text('Доорх товчоор бичнэ', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
                  : MathText('\$${_input.displayTex}\$', style: TextStyle(fontSize: 20, color: c.ink)),
            ),
          ),
        ),
        if (_incomplete)
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, 0),
            child: Text('Томьёо дуусаагүй байна', style: context.text.bodySmall?.copyWith(color: c.error)),
          ),
        const SizedBox(height: AppSpace.sm),
        MathKeyboard(group: _group),
      ],
    );
  }
}
