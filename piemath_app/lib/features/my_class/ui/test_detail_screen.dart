import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/file_image.dart';
import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../data/hub_models.dart';
import '../data/my_class_repository.dart';
import '../domain/hub_logic.dart';
import 'common.dart';
import 'my_class_icons.dart';

/// Анги хийсэн тестийн бодлогууд (`/app/my-class/tests/:testId`): нөхцөл, сонголт (LaTeX), зураг,
/// бодлого бүрийн зөв хариу товчоор нээгдэнэ (анхдагч нуусан — өөрийгөө шалгах).
/// 403 нь алдаа биш — «маргааш нээгдэнэ» / «танай анги хийгээгүй» гэж тайван тайлбарлана.
class TestDetailScreen extends ConsumerStatefulWidget {
  const TestDetailScreen({super.key, required this.testId});

  final String testId;

  @override
  ConsumerState<TestDetailScreen> createState() => _TestDetailScreenState();
}

class _TestDetailScreenState extends ConsumerState<TestDetailScreen> {
  bool _revealAll = false;
  final Set<String> _toggled = {};

  @override
  Widget build(BuildContext context) {
    final result = ref.watch(hubTestDetailProvider(widget.testId));
    final ready = result.value is TestDetailReady ? (result.value! as TestDetailReady).detail : null;
    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: Text(ready == null ? 'Тест' : cleanTitle(ready.title, variant: ready.variant, fallback: ready.title)),
        actions: [
          if (ready != null && ready.problems.isNotEmpty)
            TextButton.icon(
              icon: Icon(_revealAll ? AppIcons.hide : AppIcons.show, size: 18),
              label: Text(_revealAll ? 'Хариуг нуух' : 'Бүх хариу'),
              onPressed: () => setState(() {
                _revealAll = !_revealAll;
                _toggled.clear();
              }),
            ),
        ],
      ),
      body: AsyncBody(
        value: result,
        onRetry: () => ref.invalidate(hubTestDetailProvider(widget.testId)),
        builder: (r) => switch (r) {
          TestDetailLocked(reason: TestLockReason.tomorrow) => const EmptyState(
              icon: AppIcons.time,
              title: 'Маргааш нээгдэнэ',
              message: 'Ангид хийсэн тест дараагийн өдөр нь энд нээгдэнэ',
            ),
          TestDetailLocked() => const EmptyState(icon: AppIcons.password, title: 'Танай анги энэ тестийг хийгээгүй'),
          TestDetailMissing() => const EmptyState(icon: MyClassIcons.noProblem, title: 'Тест олдсонгүй'),
          TestDetailReady(:final detail) => _Problems(
              detail: detail,
              isOpen: (id) => _revealAll != _toggled.contains(id),
              onToggle: (id) => setState(() => _toggled.contains(id) ? _toggled.remove(id) : _toggled.add(id)),
            ),
        },
      ),
    );
  }
}

class _Problems extends StatelessWidget {
  const _Problems({required this.detail, required this.isOpen, required this.onToggle});

  final HubTestDetail detail;
  final bool Function(String id) isOpen;
  final void Function(String id) onToggle;

  @override
  Widget build(BuildContext context) {
    final problems = [...detail.problems]..sort((a, b) => a.order.compareTo(b.order));
    if (problems.isEmpty) return const EmptyState(icon: MyClassIcons.noProblem, title: 'Энэ тестэд бодлого алга');
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpace.gutter),
      itemCount: problems.length + 1,
      itemBuilder: (context, i) {
        if (i == 0) {
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.md),
            child: Meta(
              items: [
                dayTitle(detail.date),
                if (detail.variant != null) '${detail.variant} хувилбар',
                '${problems.length} бодлого',
              ],
            ),
          );
        }
        final p = problems[i - 1];
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.md),
          child: ProblemCard(problem: p, number: i, open: isOpen(p.id), onToggle: () => onToggle(p.id)),
        );
      },
    );
  }
}

/// Нэг бодлого: дугаар, нөхцөл (MathText), зураг, сонголт, «Хариу харах».
class ProblemCard extends ConsumerWidget {
  const ProblemCard({super.key, required this.problem, required this.number, required this.open, required this.onToggle});

  final HubProblem problem;
  final int number;
  final bool open;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final images = ref.watch(fileImageProvider);
    final correct = correctChoice(problem);
    final answer = problem.correctAnswer?.trim() ?? '';
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 28,
                height: 28,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  border: Border.all(color: c.brandBright),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Text('$number', style: context.text.labelMedium?.copyWith(color: c.brandSoft, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: ProblemFigure(
                  image: problem.imageKey == null ? null : images.image(problem.imageKey!),
                  alt: '$number-р бодлогын зураг',
                  child: problem.stem == null ? null : MathText(problem.stem!),
                ),
              ),
            ],
          ),
          if (problem.choices.isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            ChoiceGrid(
              variant: ChoiceGridVariant.compact,
              showCorrect: open,
              groupLabel: '$number-р бодлогын сонголтууд',
              choices: [
                for (final ch in problem.choices)
                  ChoiceItem(
                    label: ch.label,
                    text: ch.text,
                    image: ch.imageKey == null ? null : images.image(ch.imageKey!),
                    isCorrect: open && correct?.label == ch.label,
                  ),
              ],
            ),
          ],
          const SizedBox(height: AppSpace.sm),
          Wrap(
            spacing: AppSpace.md,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              TextButton.icon(
                icon: Icon(open ? AppIcons.hide : AppIcons.show, size: 18),
                label: Text(open ? 'Хариуг нуух' : 'Хариу харах'),
                onPressed: onToggle,
              ),
              if (open && answer.isNotEmpty)
                Semantics(
                  liveRegion: true,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Хариу ', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
                      if (correct != null)
                        Text(correct.label, style: context.text.titleSmall?.copyWith(color: c.success))
                      else
                        Flexible(
                          child: MathText(answer, style: context.text.titleSmall?.copyWith(color: c.success)),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
