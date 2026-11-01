import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../../../core/integrity/integrity.dart';
import '../../../../core/math/math.dart';
import '../../../../core/ui/ui.dart';
import '../../data/exam_models.dart';
import '../../domain/answer.dart';
import '../../domain/autosave_engine.dart';
import '../../domain/timer_format.dart';
import '../exam_icons.dart';
import 'answer_inputs.dart';
import 'exam_timer.dart';

/// Шалгалтын толгой: үлдсэн хугацаа, хадгалалтын төлөв, хариулсан тоо, навигатор, дуусгах.
class ExamHeader extends StatelessWidget {
  const ExamHeader({
    super.key,
    required this.title,
    required this.remainingSec,
    required this.saveState,
    required this.answered,
    required this.total,
    required this.onNavigator,
    required this.onFinish,
  });

  final String title;
  final ValueListenable<int?> remainingSec;
  final SaveState saveState;
  final int answered;
  final int total;
  final VoidCallback onNavigator;
  final VoidCallback onFinish;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Material(
      color: c.surface,
      child: SafeArea(
        bottom: false,
        child: Container(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: c.line)),
          ),
          padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.sm, AppSpace.sm, AppSpace.sm),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(child: MetaTitle(title, style: context.text.titleSmall)),
                  TextButton(onPressed: onFinish, child: const Text('Дуусгах')),
                ],
              ),
              Row(
                children: [
                  Flexible(child: SaveChip(state: saveState)),
                  const SizedBox(width: AppSpace.md),
                  Flexible(
                    child: Text(
                      '$answered/$total хариулсан',
                      style: context.text.bodySmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const Spacer(),
                  ExamTimer(remaining: remainingSec),
                  IconButton(
                    tooltip: 'Бодлогын жагсаалт',
                    icon: const Icon(ExamIcons.navigator),
                    onPressed: onNavigator,
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

/// «Бүгд хадгалагдсан» / «Хадгалж байна» / «Утсанд хадгалсан».
class SaveChip extends StatelessWidget {
  const SaveChip({super.key, required this.state});

  final SaveState state;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (icon, label, color) = switch (state) {
      SaveState.saved => (ExamIcons.saved, 'Хадгалагдсан', c.success),
      SaveState.saving => (ExamIcons.saving, 'Хадгалж байна', c.inkDim),
      SaveState.offline => (ExamIcons.offline, 'Утсанд хадгалсан', c.warning),
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: AppSpace.xs),
        Flexible(
          child: Text(
            label,
            style: context.text.bodySmall?.copyWith(color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

/// Сүлжээ тасрахад шалгалтын дээд тууз — айлгах биш, тайвшруулах.
class ExamOfflineBanner extends StatelessWidget {
  const ExamOfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        color: c.ink,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
        child: Row(
          children: [
            Icon(ExamIcons.offline, size: 18, color: c.surface),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Text(
                'Холболт тасарлаа. Хариултууд утсанд хадгалагдсан — холбогдмогц илгээгдэнэ.',
                style: context.text.bodySmall?.copyWith(color: c.surface),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Нэг бодлого: дугаар, нөхцөл (LaTeX), зураг, хариу, өөрийн үнэлгээ, тэмдэглэх.
class QuestionView extends StatelessWidget {
  const QuestionView({
    super.key,
    required this.problem,
    required this.number,
    required this.total,
    required this.answer,
    required this.selfState,
    required this.flagged,
    required this.onAnswer,
    required this.onSelfState,
    required this.onToggleFlag,
    required this.imageFor,
    this.partLabel,
    this.enabled = true,
  });

  final ExamProblem problem;
  final int number;
  final int total;
  final Object? answer;
  final SelfState? selfState;
  final bool flagged;
  final ValueChanged<Object?> onAnswer;
  final ValueChanged<SelfState?> onSelfState;
  final VoidCallback onToggleFlag;
  final ImageFor imageFor;
  final String? partLabel;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final statement = problem.statementText;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Semantics(header: true, child: Text('$number-р бодлого', style: context.text.titleMedium)),
            ),
            if (partLabel != null) Text(partLabel!, style: context.text.bodySmall),
            const SizedBox(width: AppSpace.sm),
            Text('${formatScore(problem.points)} оноо', style: context.text.bodySmall),
          ],
        ),
        const SizedBox(height: AppSpace.md),
        RepaintBoundary(
          child: ProblemFigure(
            image: problem.imageKey == null ? null : imageFor(problem.imageKey!),
            alt: '$number-р бодлогын зураг',
            child: statement == null || statement.isEmpty ? null : MathText(statement, style: context.text.bodyLarge),
          ),
        ),
        const SizedBox(height: AppSpace.xl),
        AnswerInput(
          problem: problem,
          number: number,
          value: answer,
          onChanged: onAnswer,
          imageFor: imageFor,
          enabled: enabled,
        ),
        const SizedBox(height: AppSpace.xl),
        Text('Би энэ бодлогыг', style: context.text.bodySmall),
        const SizedBox(height: AppSpace.xs),
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          children: [
            for (final s in SelfState.values)
              ChoiceChip(
                label: Text(s.label),
                selected: selfState == s,
                showCheckmark: true,
                onSelected: enabled ? (on) => onSelfState(on ? s : null) : null,
              ),
          ],
        ),
        const SizedBox(height: AppSpace.md),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: TextButton.icon(
            onPressed: onToggleFlag,
            icon: Icon(ExamIcons.flag, size: 18, color: flagged ? c.brand : c.inkDim),
            label: Text(flagged ? 'Дараа харах: тэмдэглэсэн' : 'Дараа харах'),
          ),
        ),
      ],
    );
  }
}

/// Бодлогын дугааруудын тор — хариулсан / тэмдэглэсэн / одоогийн (өнгөөс гадна дүрс, хүрээгээр).
class NavigatorGrid extends StatelessWidget {
  const NavigatorGrid({
    super.key,
    required this.problems,
    required this.answers,
    required this.flagged,
    required this.current,
    required this.onJump,
    this.partIIStart,
    this.showLegend = true,
  });

  final List<ExamProblem> problems;
  final Map<String, Object?> answers;
  final Set<String> flagged;
  final int current;
  final ValueChanged<int> onJump;
  final int? partIIStart;
  final bool showLegend;

  @override
  Widget build(BuildContext context) {
    Widget grid(int from, int to) => Wrap(
      spacing: AppSpace.sm,
      runSpacing: AppSpace.sm,
      children: [
        for (var i = from; i < to; i++)
          _NavCell(
            number: i + 1,
            answered: isAnswered(answers[problems[i].id]),
            flagged: flagged.contains(problems[i].id),
            current: i == current,
            onTap: () => onJump(i),
          ),
      ],
    );
    final split = partIIStart;
    final legend = showLegend ? const NavigatorLegend() : null;
    if (split == null || split == 0) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [grid(0, problems.length), if (legend != null) ...[const SizedBox(height: AppSpace.lg), legend]],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('I хэсэг — Сонгох ($split)', style: context.text.labelMedium),
        const SizedBox(height: AppSpace.sm),
        grid(0, split),
        const SizedBox(height: AppSpace.lg),
        Text('II хэсэг — Тоо нөхөх (${problems.length - split})', style: context.text.labelMedium),
        const SizedBox(height: AppSpace.sm),
        grid(split, problems.length),
        if (legend != null) ...[const SizedBox(height: AppSpace.lg), legend],
      ],
    );
  }
}

/// Илгээхийн өмнөх жагсаалт: гарчиг + дугаарууд (товшоод тухайн бодлого руу).
class NumberJumpList extends StatelessWidget {
  const NumberJumpList({super.key, required this.title, required this.indexes, required this.onJump});

  final String title;

  /// 0-ээс эхлэх индекс; дэлгэцэд +1.
  final List<int> indexes;
  final ValueChanged<int> onJump;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(header: true, child: Text(title, style: context.text.labelMedium)),
        const SizedBox(height: AppSpace.sm),
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          children: [
            for (final i in indexes)
              Semantics(
                button: true,
                label: '${i + 1}-р бодлого руу очих',
                onTap: () => onJump(i),
                excludeSemantics: true,
                child: InkWell(
                  onTap: () => onJump(i),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  child: Container(
                    width: AppSizes.minTap,
                    height: AppSizes.minTap,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      border: Border.all(color: c.line),
                    ),
                    child: Text('${i + 1}', style: context.text.labelLarge),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// Торны тайлбар — жагсаалтын ДООР (RULES §3).
class NavigatorLegend extends StatelessWidget {
  const NavigatorLegend({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    Widget item(Widget mark, String label) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [mark, const SizedBox(width: AppSpace.xs), Text(label, style: context.text.bodySmall)],
    );
    Widget swatch({required bool answered, IconData? icon}) => Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: answered ? c.brandTint : c.surface,
        borderRadius: BorderRadius.circular(AppRadius.sm / 2),
        border: Border.all(color: c.line),
      ),
      child: icon == null ? null : Icon(icon, size: 12, color: c.brand),
    );
    return Wrap(
      spacing: AppSpace.lg,
      runSpacing: AppSpace.sm,
      children: [
        item(swatch(answered: true, icon: AppIcons.check), 'Хариулсан'),
        item(swatch(answered: false), 'Хариулаагүй'),
        item(swatch(answered: false, icon: ExamIcons.flag), 'Дараа харах'),
      ],
    );
  }
}

class _NavCell extends StatelessWidget {
  const _NavCell({
    required this.number,
    required this.answered,
    required this.flagged,
    required this.current,
    required this.onTap,
  });

  final int number;
  final bool answered;
  final bool flagged;
  final bool current;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final label = [
      '$number-р бодлого',
      answered ? 'хариулсан' : 'хариулаагүй',
      if (flagged) 'тэмдэглэсэн',
      if (current) 'одоогийн',
    ].join(', ');
    return Semantics(
      button: true,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: answered ? c.brandTint : c.surface,
            borderRadius: BorderRadius.circular(AppRadius.sm),
            border: Border.all(color: current ? c.brandBright : c.line, width: current ? 2 : 1),
          ),
          child: Stack(
            children: [
              Center(
                child: Text(
                  '$number',
                  style: context.text.labelLarge?.copyWith(
                    color: answered ? c.brand : c.inkDim,
                    decoration: answered ? null : TextDecoration.none,
                  ),
                ),
              ),
              if (answered) Positioned(right: 3, bottom: 3, child: Icon(AppIcons.check, size: 11, color: c.brand)),
              if (flagged) Positioned(right: 3, top: 3, child: Icon(ExamIcons.flag, size: 11, color: c.brand)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Аппаас гараад буцаж ирэхэд — тайлбарлах, айлгахгүй (EXAM-INTEGRITY §3).
class LeaveNoticeView extends StatelessWidget {
  const LeaveNoticeView({
    super.key,
    required this.leaveCount,
    required this.maxLeaves,
    required this.away,
    required this.finalWarning,
    required this.onContinue,
  });

  final int leaveCount;
  final int maxLeaves;
  final Duration? away;
  final bool finalWarning;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final left = (maxLeaves - leaveCount).clamp(0, maxLeaves);
    return Material(
      color: c.bg,
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpace.xl),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Semantics(
                liveRegion: true,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(AppIcons.warning, size: 40, color: finalWarning ? c.error : c.warning),
                    const SizedBox(height: AppSpace.lg),
                    Text(
                      'Шалгалтын үеэр аппаас гарсан нь багшид харагдана',
                      style: context.text.titleLarge,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpace.md),
                    Text(
                      ['Та $leaveCount удаа гарсан', if (away != null) 'сүүлд ${spokenDuration(away!)}'].join(', '),
                      style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: AppSpace.lg),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        for (var i = 0; i < maxLeaves; i++)
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 3),
                            child: Icon(
                              i < leaveCount ? AppIcons.failure : ExamIcons.blank,
                              size: 18,
                              color: i < leaveCount ? c.error : c.line,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: AppSpace.sm),
                    Text('$left удаа үлдсэн', style: context.text.bodySmall),
                    if (finalWarning) ...[
                      const SizedBox(height: AppSpace.lg),
                      Text(
                        'Дахин гарвал шалгалт автоматаар илгээгдэнэ',
                        style: context.text.titleSmall?.copyWith(color: c.error),
                        textAlign: TextAlign.center,
                      ),
                    ],
                    const SizedBox(height: AppSpace.xl),
                    FilledButton(onPressed: onContinue, child: const Text('Үргэлжлүүлэх')),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// iOS дэлгэц бичлэг / AirPlay идэвхтэй үед агуулгыг нууна.
class RecordingCover extends StatelessWidget {
  const RecordingCover({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Material(
      color: c.bg,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(ExamIcons.recording, size: 40, color: c.inkDim),
              const SizedBox(height: AppSpace.lg),
              Text('Дэлгэц бичлэгийг зогсооно уу', style: context.text.titleLarge, textAlign: TextAlign.center),
              const SizedBox(height: AppSpace.sm),
              Text(
                'Бичлэг зогсмогц шалгалт үргэлжилнэ. Хугацаа үргэлжлэн тоологдож байна.',
                style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Шалгалтын өмнөх тайлбар — гарах дүрмийг УРЬДЧИЛАН хэлнэ (STATUS §7.3).
class ExamIntroView extends StatelessWidget {
  const ExamIntroView({
    super.key,
    required this.meta,
    required this.policy,
    required this.starting,
    required this.onStart,
    required this.onBack,
    this.error,
  });

  final TestMeta meta;
  final LeavePolicy policy;
  final bool starting;
  final VoidCallback onStart;
  final VoidCallback onBack;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final resume = meta.sessionStatus == SessionStatus.inProgress;
    final minutes = meta.timeLimitMin;
    Widget fact(String label, String value) => Expanded(
      child: Column(
        children: [
          Text(value, style: context.text.displaySmall?.copyWith(fontSize: 22)),
          const SizedBox(height: 2),
          Text(label, style: context.text.bodySmall),
        ],
      ),
    );
    Widget rule(IconData icon, String text) => Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: c.brand),
          const SizedBox(width: AppSpace.md),
          Expanded(child: Text(text, style: context.text.bodyMedium)),
        ],
      ),
    );
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(AppIcons.back), tooltip: AppStrings.back, onPressed: onBack),
        title: const Text('Шалгалт'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpace.gutter),
          children: [
            MetaTitle(meta.title, style: context.text.headlineSmall),
            if (meta.variantLabel != null) ...[
              const SizedBox(height: AppSpace.xs),
              Text('${meta.variantLabel} хувилбар', style: context.text.bodySmall),
            ],
            const SizedBox(height: AppSpace.lg),
            AppCard(
              child: Row(
                children: [
                  fact('Бодлого', '${meta.problemCount}'),
                  fact('Хугацаа', minutes == null || minutes == 0 ? 'Хязгааргүй' : '$minutes мин'),
                  fact('Нийт оноо', formatScore(meta.totalPoints)),
                ],
              ),
            ),
            const SectionHeader(title: 'Анхаарах зүйл'),
            rule(ExamIcons.saved, 'Хариулт бүр шууд хадгалагдана — сүлжээ тасарсан ч үргэлжлүүлж болно.'),
            rule(ExamIcons.timer, 'Цагийг сервер тоолно — хугацаа дуусахад хариулт автоматаар илгээгдэнэ.'),
            rule(
              AppIcons.secure,
              'Шалгалтын үеэр аппаас гарвал багшид харагдана. 1, ${policy.maxLeaves - 1} дахь удаад анхааруулга '
              'гарч, ${policy.maxLeaves} дахь удаад шалгалт автоматаар илгээгдэнэ. Дуудлага, мэдэгдэл зэрэг '
              '${policy.minAway.inSeconds} секундээс богино хугацаанд гарсныг тооцохгүй.',
            ),
            rule(AppIcons.notifications, 'Эхлэхээсээ өмнө утсаа цэнэглэж, мэдэгдлээ түр унтраавал тайван бодно.'),
            if (meta.manual)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.sm),
                child: Text(
                  'Энэ шалгалтын дүнг багш гараар оруулна — апп дээр өгөхгүй.',
                  style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                ),
              ),
            if (error != null) ...[
              const SizedBox(height: AppSpace.md),
              Text(error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
            ],
          ],
        ),
      ),
      // Эхлэх товч доод талд тогтмол — урт тайлбар гүйлгэлгүй харагдана.
      bottomNavigationBar: meta.manual
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.md),
                child: FilledButton(
                  onPressed: starting ? null : onStart,
                  child: starting
                      ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : Text(resume ? 'Үргэлжлүүлэх' : 'Шалгалт эхлүүлэх'),
                ),
              ),
            ),
    );
  }
}
