import 'package:flutter/material.dart';

import '../../core/ui/ui.dart';
import '../marks/marks.dart';

// Гэрийн даалгаврыг ангид богино шалгалтаар шалгасан оноо (эзэн 2026-11-08 19:08) — сурагч, эцэг эх,
// сурагчийн хуудасны хуанлид харагдана. Цэвэр тооцоо = вэбийн `web/src/lib/quizScore.ts`
// (= `api/src/homework-quiz/quiz-score.ts`). Өнгө (эзэн): 0 <= улаан < 50 <= улбар шар < 80 <= ногоон.
// Хувийг хөвөгч тоогоор бус, ЗУУНЫ НЭГЭЭР бүхэл болгож харьцуулна (49,99% улаан, 80% ногоон).

/// Оноог зууны нэгээр бүхэл тоо болгоно (7.5 → 750).
int toHundredths(num x) => (x * 100).round();

bool _valid(num? score, int problemCount) => score != null && score.isFinite && problemCount > 0;

/// Оноо → өнгөний аяс. Оноогүй эсвэл буруу бодлогын тоо → null.
MarkTone? quizTone(num? score, int problemCount) {
  if (!_valid(score, problemCount)) return null;
  final s = toHundredths(score!);
  final c = toHundredths(problemCount);
  if (2 * s < c) return MarkTone.error;
  if (5 * s < 4 * c) return MarkTone.warning;
  return MarkTone.success;
}

/// Оноо → хувь (0..100); оноогүй бол null.
double? quizPercent(num? score, int problemCount) {
  if (!_valid(score, problemCount)) return null;
  return toHundredths(score!) * 100 / toHundredths(problemCount);
}

/// Хувийг БҮХЭЛ хүртэл доош тайрна (79,99 → «79%») — бичиг, өнгө хоёр зөрөхгүй.
String formatPercent(double pct) => '${(pct + 1e-9).floor()}%';

/// Монгол бичлэгээр: 7.5 → «7,5», 8 → «8», 7.25 → «7,25».
String formatScore(num score) {
  final h = toHundredths(score);
  if (h % 100 == 0) return '${h ~/ 100}';
  final whole = h ~/ 100;
  final frac = (h.abs() % 100).toString().padLeft(2, '0').replaceFirst(RegExp(r'0$'), '');
  return '$whole,$frac';
}

/// Дэлгэц уншигч, тайлбарт: «шалгалт 8/10, 80%».
String quizDayText(num score, int problemCount) {
  final pct = quizPercent(score, problemCount);
  return 'шалгалт ${formatScore(score)}/$problemCount${pct == null ? '' : ', ${formatPercent(pct)}'}';
}

/// «Шалгалт 7,5/10» + хувь өнгөт хүрээтэй (вэбийн `QuizScoreChip`). Оноо буруу бол юу ч зурахгүй.
/// [compact] — зөвхөн дүрс ба хувь; [withLabel] false — «Шалгалт» үггүй (шошго хажууд нь байгаа үед).
class QuizScoreChip extends StatelessWidget {
  const QuizScoreChip({
    super.key,
    required this.score,
    required this.problemCount,
    this.compact = false,
    this.withLabel = true,
  });

  final num score;
  final int problemCount;
  final bool compact;
  final bool withLabel;

  @override
  Widget build(BuildContext context) {
    final tone = quizTone(score, problemCount);
    final pct = quizPercent(score, problemCount);
    if (tone == null || pct == null) return const SizedBox.shrink();
    final c = context.colors;
    final text = 'Шалгалт ${formatScore(score)}/$problemCount, ${formatPercent(pct)}';
    return Semantics(
      label: text,
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(AppIcons.exam, size: 16, color: c.brand),
          const SizedBox(width: AppSpace.xs),
          if (!compact) ...[
            Flexible(
              child: Text.rich(
                TextSpan(
                  children: [
                    if (withLabel) const TextSpan(text: 'Шалгалт '),
                    TextSpan(
                      text: formatScore(score),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    TextSpan(
                      text: '/$problemCount',
                      style: TextStyle(color: c.inkDim),
                    ),
                  ],
                ),
                style: context.text.bodyMedium,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: AppSpace.xs),
          ],
          QuizPercentBadge(percent: pct, tone: tone),
        ],
      ),
    );
  }
}

/// Хувийг өнгөт хүрээнд («76%») — хуанлийн хайрцаг, чип.
class QuizPercentBadge extends StatelessWidget {
  const QuizPercentBadge({super.key, required this.percent, required this.tone, this.small = false});

  final double percent;
  final MarkTone tone;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final color = tone.color(context.colors);
    return Container(
      padding: EdgeInsets.symmetric(horizontal: small ? 2 : AppSpace.xs),
      decoration: BoxDecoration(
        border: Border.all(color: color),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        formatPercent(percent),
        style: (small ? context.text.labelSmall : context.text.labelMedium)?.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
          fontFeatures: const [FontFeature.tabularFigures()],
          height: 1.25,
        ),
      ),
    );
  }
}
