import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/anim/animation_slot.dart';
import '../../exam/data/exam_models.dart' show ExamProblem, ProblemFormat;
import '../../exam/ui/widgets/answer_inputs.dart';
import '../data/practice_models.dart';
import '../data/practice_repository.dart';
import 'inline_message.dart';
import 'problem_video_disclosure.dart';

/// `/app/practice` — серверийн санал болгосон бодлогууд. `?chapter=a,b&title=…` бол тэр сэдвээр.
class PracticeScreen extends ConsumerWidget {
  const PracticeScreen({super.key, this.chapters, this.title});

  /// Таслалаар нийлүүлсэн бүлгийн ID (сэдвээр дасгал). null бол ерөнхий санал.
  final String? chapters;
  final String? title;

  void _invalidate(WidgetRef ref) {
    final key = chapters;
    if (key == null || key.isEmpty) {
      ref.invalidate(recommendationsProvider);
    } else {
      ref.invalidate(topicRecommendationsProvider(key));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final list = ref.watch(recommendationsFor(chapters));
    final topic = title?.trim();
    final focused = chapters != null && chapters!.isNotEmpty;
    return Scaffold(
      appBar: AppBar(
        leading: focused ? const AppBackButton() : null,
        title: Text(focused && topic != null && topic.isNotEmpty ? topic : 'Дасгал'),
      ),
      body: list.when(
        loading: () => const LoadingState(),
        error: (e, _) =>
            ErrorState(title: 'Дасгал ачаалж чадсангүй', message: errorText(e), onRetry: () => _invalidate(ref)),
        data: (items) {
          if (items.isEmpty) {
            return EmptyState(
              icon: AppIcons.practice,
              title: focused ? 'Энэ сэдвээр одоогоор бодлого алга' : 'Одоогоор санал болгох бодлого алга',
              message: focused
                  ? 'Ерөнхий дасгалаас танд тохирсон бодлого сонгоорой'
                  : 'Тест, дасгал хийх тусам танд тохирсон бодлогууд энд гарна',
              action: focused
                  ? OutlinedButton(
                      onPressed: () => context.pushReplacement('/app/practice'),
                      child: const Text('Дасгал'),
                    )
                  : null,
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              _invalidate(ref);
              await ref.read(recommendationsFor(chapters).future);
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(AppSpace.gutter),
              itemCount: items.length,
              itemBuilder: (context, i) {
                final r = items[i];
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.md),
                  child: AppCard(
                    onTap: () => context.push(_problemPath(r.problemId, chapters)),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${i + 1}-р бодлого', style: context.text.titleSmall),
                              Text(
                                r.reason.label,
                                style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                              ),
                              if (isMongolianText(r.explanation)) Text(r.explanation!, style: context.text.bodySmall),
                            ],
                          ),
                        ),
                        Icon(AppIcons.forward, color: context.colors.inkDim),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

/// Бодлогын зам; сэдвээр дасгал бол «Дараагийн бодлого» мөн тэр жагсаалтаас.
String _problemPath(String problemId, String? chapters) => Uri(
  path: '/app/practice/${Uri.encodeComponent(problemId)}',
  queryParameters: chapters == null || chapters.isEmpty ? null : {'chapter': chapters},
).toString();

/// `/app/practice/:problemId` — нэг бодлого бодох.
class PracticeProblemScreen extends ConsumerStatefulWidget {
  const PracticeProblemScreen({super.key, required this.problemId, this.chapters});

  final String problemId;

  /// Сэдвээр дасгалаас ирсэн бол тэр жагсаалт (дараагийн бодлогод).
  final String? chapters;

  @override
  ConsumerState<PracticeProblemScreen> createState() => _PracticeProblemScreenState();
}

class _PracticeProblemScreenState extends ConsumerState<PracticeProblemScreen> {
  Object? _value;
  bool _busy = false;
  String? _error;
  AttemptResult? _result;

  Object? _answer(PracticeProblem p) {
    final v = _value;
    if (v == null) return null;
    if (v is String) return v.trim().isEmpty ? null : v.trim();
    return v;
  }

  Future<void> _submit(PracticeProblem p) async {
    final a = _answer(p);
    if (a == null || _busy || _result != null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final r = await ref.read(practiceRepositoryProvider).attempt(p.id, a);
      if (mounted) setState(() => _result = r);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Хариу хадгалагдсангүй. Дахин оролдоно уу.'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String? _nextId() {
    final list = ref.read(recommendationsFor(widget.chapters)).value;
    if (list == null) return null;
    final i = list.indexWhere((r) => r.problemId == widget.problemId);
    return i >= 0 && i + 1 < list.length ? list[i + 1].problemId : null;
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(practiceProblemProvider(widget.problemId));
    // Жагсаалтыг амьд байлгана (дараагийн бодлогыг олохын тулд).
    ref.watch(recommendationsFor(widget.chapters));
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Бодлого бодох')),
      body: async.when(
        loading: () => const LoadingState(cards: 2),
        error: (e, _) => ErrorState(
          title: 'Бодлого нээгдсэнгүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(practiceProblemProvider(widget.problemId)),
        ),
        data: (p) => _body(context, p),
      ),
    );
  }

  Widget _body(BuildContext context, PracticeProblem p) {
    final images = ref.watch(fileImageProvider);
    final locked = _busy || _result != null;
    final next = _nextId();
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        RepaintBoundary(
          child: ProblemFigure(
            image: p.imageKey == null ? null : images.image(p.imageKey!),
            alt: 'Бодлогын зураг',
            child: MathText(p.statementText ?? 'Бодлогын текст алга, зургаас уншина уу', style: context.text.bodyLarge),
          ),
        ),
        const SizedBox(height: AppSpace.md),
        ProblemVideoDisclosure(problemId: p.id),
        const SizedBox(height: AppSpace.xl),
        if (p.isChoice)
          ChoiceGrid(
            groupLabel: 'Хариултын сонголтууд',
            selectedIndex: _selectedIndex(p),
            choices: [
              for (final (i, c) in p.choices!.indexed)
                ChoiceItem(label: p.hasLabels ? (c.label ?? String.fromCharCode(65 + i)) : '${i + 1}', text: c.text),
            ],
            onSelect: locked
                ? null
                : (i) => setState(() {
                    final v = p.hasLabels ? (p.choices![i].label ?? String.fromCharCode(65 + i)) : i;
                    _value = _value == v ? null : v;
                  }),
          )
        else
          AnswerInput(
            problem: ExamProblem(
              id: p.id,
              format: p.format == ProblemFormat.choice ? ProblemFormat.open : p.format,
              statementText: p.statementText,
            ),
            number: 1,
            value: _value,
            enabled: !locked,
            imageFor: images.image,
            onChanged: (v) => setState(() => _value = v),
          ),
        const SizedBox(height: AppSpace.lg),
        if (_result == null)
          FilledButton(
            onPressed: _answer(p) == null || _busy ? null : () => _submit(p),
            child: Text(_busy ? 'Шалгаж байна' : 'Хариуг илгээх'),
          ),
        if (_error != null) ...[const SizedBox(height: AppSpace.md), InlineMessage(_error!)],
        if (_result != null) ...[
          if (_result!.correct == true)
            const Center(
              child: AnimationSlot(slot: AnimSlot.correctBurst, size: 96, fallback: SizedBox.shrink()),
            ),
          InlineMessage(
            switch (_result!.correct) {
              true => 'Зөв',
              false => 'Одоохондоо зөрүүтэй байна. Энэ бодлого алдааны дэвтэрт хадгалагдлаа',
              null => 'Хариу хадгалагдлаа',
            },
            icon: _result!.correct == true ? AppIcons.success : AppIcons.info,
            isError: false,
          ),
          const SizedBox(height: AppSpace.lg),
          if (_result!.correct == false)
            OutlinedButton(onPressed: () => context.push('/app/mistakes'), child: const Text('Алдааны дэвтэр нээх')),
          if (next != null) ...[
            const SizedBox(height: AppSpace.md),
            FilledButton(
              onPressed: () => context.pushReplacement(_problemPath(next, widget.chapters)),
              child: const Text('Дараагийн бодлого'),
            ),
          ],
        ],
      ],
    );
  }

  int? _selectedIndex(PracticeProblem p) {
    final v = _value;
    if (v == null) return null;
    if (v is int) return v;
    final i = p.choices!.indexWhere((c) => c.label == v);
    return i >= 0 ? i : null;
  }
}
