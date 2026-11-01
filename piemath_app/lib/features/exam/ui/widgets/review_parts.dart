import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/math/math.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/solution/solution.dart';
import '../../data/exam_models.dart';
import '../exam_icons.dart';
import 'answer_inputs.dart';

/// Бодлогын эргэн харалтын карт: нөхцөл, зураг, сонголт, өөрийн/зөв хариу, бодолт, бичлэг.
/// Юу харуулахыг СЕРВЕР шийднэ (ирсэн талбар л) — апп нээгдэх эрхийг тооцохгүй.
class ReviewProblemCard extends StatelessWidget {
  const ReviewProblemCard({
    super.key,
    required this.number,
    required this.problem,
    required this.imageFor,
    this.status,
    this.trailing,
  });

  final int number;
  final ReviewProblem problem;
  final ImageFor imageFor;

  /// «Буруу», «Хариулаагүй» … (дүрстэй).
  final Widget? status;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = problem;
    final choices = p.choices;
    final my = p.myAnswer;
    final correct = p.correctAnswer;
    final myText = answerDisplay(my);
    final correctText = answerDisplay(correct);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text('$number-р бодлого', style: context.text.titleSmall)),
              ?status,
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          RepaintBoundary(
            child: ProblemFigure(
              image: p.imageKey == null ? null : imageFor(p.imageKey!),
              alt: '$number-р бодлогын зураг',
              child: p.statementText == null ? null : MathText(p.statementText!),
            ),
          ),
          if (choices != null && choices.isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            ChoiceGrid(
              variant: ChoiceGridVariant.compact,
              groupLabel: 'Сонголтууд',
              showCorrect: correct is String,
              selectedIndex: my is String ? _indexOf(choices, my) : null,
              choices: [
                for (final ch in choices)
                  ChoiceItem(
                    label: ch.letter,
                    text: ch.text,
                    image: ch.image == null ? null : imageFor(ch.image!),
                    isCorrect: correct is String && correct == ch.letter,
                  ),
              ],
            ),
          ],
          const SizedBox(height: AppSpace.md),
          _AnswerRow(label: 'Таны хариу', value: myText ?? 'Хариулаагүй', dim: myText == null),
          if (correctText != null) _AnswerRow(label: 'Зөв хариу', value: correctText),
          if (p.answerNeedsCheck)
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.xs),
              child: Text('Хариуг багш шалгаж байна', style: context.text.bodySmall),
            ),
          if (p.solution != null && p.solution!.trim().isNotEmpty)
            Theme(
              data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                tilePadding: EdgeInsets.zero,
                childrenPadding: const EdgeInsets.only(bottom: AppSpace.sm),
                expandedCrossAxisAlignment: CrossAxisAlignment.start,
                title: Text('Бодолт', style: context.text.titleSmall?.copyWith(color: c.brand)),
                children: [SolutionView(source: p.solution, showTitle: false)],
              ),
            ),
          if (p.youtube != null)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                icon: const Icon(ExamIcons.video, size: 18),
                label: const Text('Бодолтын бичлэг'),
                onPressed: () => launchUrl(Uri.parse(p.youtube!.url), mode: LaunchMode.externalApplication),
              ),
            ),
          ?trailing,
        ],
      ),
    );
  }

  static int? _indexOf(List<ReviewChoice> choices, String letter) {
    final i = choices.indexWhere((c) => c.letter == letter);
    return i < 0 ? null : i;
  }
}

class _AnswerRow extends StatelessWidget {
  const _AnswerRow({required this.label, required this.value, this.dim = false});

  final String label;
  final String value;
  final bool dim;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 96, child: Text(label, style: context.text.bodySmall)),
          Expanded(
            child: dim
                ? Text(value, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim))
                : MathText(value, style: context.text.bodyMedium),
          ),
        ],
      ),
    );
  }
}

/// Зөв / буруу / хариулаагүй / тодорхойгүй — дүрс + бичвэр (өнгө дангаараа биш).
class ReviewStatus extends StatelessWidget {
  const ReviewStatus.correct({super.key}) : _kind = 0;
  const ReviewStatus.wrong({super.key}) : _kind = 1;
  const ReviewStatus.blank({super.key}) : _kind = 2;
  const ReviewStatus.unknown({super.key}) : _kind = 3;

  final int _kind;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (icon, label, color) = switch (_kind) {
      0 => (AppIcons.success, 'Зөв', c.success),
      1 => (AppIcons.failure, 'Буруу', c.error),
      2 => (ExamIcons.blank, 'Хариулаагүй', c.inkDim),
      _ => (ExamIcons.unknown, 'Дүнд тооцогдоогүй', c.inkDim),
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: AppSpace.xs),
        Text(label, style: context.text.labelMedium?.copyWith(color: color)),
      ],
    );
  }
}

/// Нийт оноо — том тоо (Unbounded).
class ScoreSummary extends StatelessWidget {
  const ScoreSummary({super.key, required this.score, this.percent, this.subtitle});

  final ScorePair score;
  final int? percent;
  final Widget? subtitle;

  @override
  Widget build(BuildContext context) {
    final p = percent ?? score.percent;
    return AppCard(
      child: Column(
        children: [
          Semantics(
            label: '${formatScore(score.total)} оноо, ${formatScore(score.max)}-аас',
            excludeSemantics: true,
            child: Text('${formatScore(score.total)} / ${formatScore(score.max)}', style: context.text.displayMedium),
          ),
          if (p != null) Text('$p хувь', style: context.text.titleMedium?.copyWith(color: context.colors.inkDim)),
          if (subtitle != null) ...[const SizedBox(height: AppSpace.sm), subtitle!],
        ],
      ),
    );
  }
}
