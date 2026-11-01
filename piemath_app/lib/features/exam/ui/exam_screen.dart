import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/session.dart';
import '../../../core/files/file_image.dart';
import '../../../core/ui/ui.dart';
import '../application/exam_controller.dart';
import '../data/exam_draft_store.dart';
import '../data/exam_models.dart';
import '../data/exam_repository.dart';
import '../domain/answer.dart';
import '../domain/autosave_engine.dart';
import '../domain/test_list_logic.dart';
import 'exam_icons.dart';
import 'widgets/exam_parts.dart';

/// Дүн/эргэн харалтын зам (вэб: шалгалтын төрөлд `/result`, бусдад `/review`).
String resultPathFor(String testId, String? type) =>
    isExamType(type) ? '/app/tests/$testId/result' : '/app/tests/$testId/review';

/// `/app/tests/:id` — интро → шалгалт өгөх (бүтэн дэлгэц, доод табгүй).
class ExamScreen extends ConsumerStatefulWidget {
  const ExamScreen({super.key, required this.testId});

  final String testId;

  @override
  ConsumerState<ExamScreen> createState() => _ExamScreenState();
}

class _ExamScreenState extends ConsumerState<ExamScreen> {
  late final ExamController _c;
  String? _shownToast;
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    final s = ref.read(sessionProvider);
    _c = ExamController(
      testId: widget.testId,
      userId: s is SignedIn ? s.auth.userId : '',
      repository: ref.read(examRepositoryProvider),
      drafts: ref.read(examDraftStoreProvider),
      guardFactory: ref.read(examGuardFactoryProvider),
      config: ref.read(autosaveConfigProvider),
    )..addListener(_onChange);
    unawaited(_c.load());
  }

  @override
  void dispose() {
    _c
      ..removeListener(_onChange)
      ..dispose();
    super.dispose();
  }

  void _onChange() {
    if (!mounted) return;
    final t = _c.toast;
    if (t != null && t != _shownToast) {
      _shownToast = t;
      ScaffoldMessenger.maybeOf(context)
        ?..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(t), duration: const Duration(seconds: 8)));
      _c.clearToast();
    }
    if (_c.phase == ExamPhase.finished && !_navigated) {
      _navigated = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go(resultPathFor(widget.testId, _c.meta?.type));
      });
    }
    setState(() {});
  }

  void _back() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/app/tests');
    }
  }

  Future<void> _start() async {
    final resume = _c.meta?.sessionStatus == SessionStatus.inProgress;
    if (!resume) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Шалгалтыг эхлүүлэх үү?'),
          content: Text(
            _c.meta?.timeLimitMin == null
                ? 'Эхэлсний дараа хариултаа бөглөөд илгээнэ.'
                : 'Эхэлмэгц ${_c.meta!.timeLimitMin} минутын хугацаа тоологдож эхэлнэ.',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text(AppStrings.cancel)),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Эхлэх')),
          ],
        ),
      );
      if (ok != true) return;
    }
    await _c.begin();
  }

  @override
  Widget build(BuildContext context) {
    switch (_c.phase) {
      case ExamPhase.loading:
      case ExamPhase.finished:
        return const Scaffold(body: SafeArea(child: LoadingState()));
      case ExamPhase.error:
        return Scaffold(
          appBar: AppBar(
            leading: IconButton(icon: const Icon(AppIcons.back), tooltip: AppStrings.back, onPressed: _back),
          ),
          body: ErrorState(message: _c.errorMessage ?? AppStrings.genericError, onRetry: _c.load),
        );
      case ExamPhase.intro:
        return ExamIntroView(
          meta: _c.meta!,
          policy: _c.policy,
          starting: _c.starting,
          error: _c.errorMessage,
          onStart: _start,
          onBack: _back,
        );
      case ExamPhase.taking:
        return _Taking(controller: _c);
    }
  }
}

class _Taking extends ConsumerWidget {
  const _Taking({required this.controller});

  final ExamController controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = controller;
    final p = c.current!;
    final files = ref.watch(fileImageProvider);
    final split = c.partIIStart;
    final isLast = c.index == c.problems.length - 1;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_openSubmit(context, c));
      },
      child: Stack(
        children: [
          Scaffold(
            body: Column(
              children: [
                ExamHeader(
                  title: c.meta?.title ?? '',
                  remainingSec: c.remaining,
                  saveState: c.saveState,
                  answered: c.answeredCount,
                  total: c.problems.length,
                  onNavigator: () => unawaited(_openNavigator(context, c)),
                  onFinish: () => unawaited(_openSubmit(context, c)),
                ),
                if (c.saveState == SaveState.offline) const ExamOfflineBanner(),
                Expanded(
                  child: SingleChildScrollView(
                    key: PageStorageKey('q-${p.id}'),
                    padding: const EdgeInsets.all(AppSpace.gutter),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: AppSizes.readableWidth),
                        child: RepaintBoundary(
                          child: QuestionView(
                            key: ValueKey(p.id),
                            problem: p,
                            number: c.index + 1,
                            total: c.problems.length,
                            answer: c.answers[p.id],
                            selfState: c.states[p.id],
                            flagged: c.flagged.contains(p.id),
                            partLabel: split == null || split == 0 ? null : (c.index < split ? 'I хэсэг' : 'II хэсэг'),
                            enabled: !c.submitting,
                            imageFor: files.image,
                            onAnswer: (v) => c.setAnswer(p.id, v),
                            onSelfState: (s) => c.setSelfState(p.id, s),
                            onToggleFlag: () => c.toggleFlag(p.id),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                _Footer(
                  canBack: c.index > 0,
                  isLast: isLast,
                  onPrevious: c.previous,
                  onNext: isLast ? () => unawaited(_openSubmit(context, c)) : c.next,
                ),
              ],
            ),
          ),
          if (c.submitting) const _Busy(label: 'Илгээж байна'),
          if (c.notice != null)
            LeaveNoticeView(
              leaveCount: c.notice!.leaveCount,
              maxLeaves: c.policy.maxLeaves,
              away: c.notice!.away,
              finalWarning: c.notice!.finalWarning,
              onContinue: c.dismissNotice,
            ),
          if (c.covered) const RecordingCover(),
        ],
      ),
    );
  }

  static Future<void> _openNavigator(BuildContext context, ExamController c) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Бодлогууд', style: ctx.text.titleMedium),
              const SizedBox(height: AppSpace.md),
              NavigatorGrid(
                problems: c.problems,
                answers: c.answers,
                flagged: c.flagged,
                current: c.index,
                partIIStart: c.partIIStart,
                onJump: (i) {
                  Navigator.pop(ctx);
                  c.goTo(i);
                },
              ),
            ],
          ),
        ),
      ),
    ),
  );

  static Future<void> _openSubmit(BuildContext context, ExamController c) async {
    final submit = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => _SubmitSheet(controller: c),
    );
    if (submit != true || !context.mounted) return;
    await c.submit();
  }
}

class _SubmitSheet extends StatelessWidget {
  const _SubmitSheet({required this.controller});

  final ExamController controller;

  @override
  Widget build(BuildContext context) {
    final c = controller;
    final unanswered = c.unansweredCount;
    final unansweredIdx = [
      for (var i = 0; i < c.problems.length; i++)
        if (!isAnswered(c.answers[c.problems[i].id])) i,
    ];
    final flaggedIdx = [
      for (var i = 0; i < c.problems.length; i++)
        if (c.flagged.contains(c.problems[i].id)) i,
    ];
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Илгээхээсээ өмнө шалгах', style: context.text.titleLarge),
              const SizedBox(height: AppSpace.sm),
              Text(
                unanswered > 0 ? 'Илгээх үү? $unanswered бодлого хариулаагүй байна' : 'Илгээх үү? Бүх бодлогод хариулсан байна',
                style: context.text.bodyMedium,
              ),
              const SizedBox(height: AppSpace.xs),
              Meta(
                items: [
                  '${c.answeredCount} хариулсан',
                  if (unanswered > 0) '$unanswered хариулаагүй',
                  if (flaggedIdx.isNotEmpty) '${flaggedIdx.length} дараа харах',
                ],
              ),
              if (unansweredIdx.isNotEmpty) ...[
                const SizedBox(height: AppSpace.lg),
                NumberJumpList(
                  title: 'Хариулаагүй',
                  indexes: unansweredIdx,
                  onJump: (i) {
                    Navigator.pop(context, false);
                    c.goTo(i);
                  },
                ),
              ],
              if (flaggedIdx.isNotEmpty) ...[
                const SizedBox(height: AppSpace.lg),
                NumberJumpList(
                  title: 'Дараа харах',
                  indexes: flaggedIdx,
                  onJump: (i) {
                    Navigator.pop(context, false);
                    c.goTo(i);
                  },
                ),
              ],
              if (c.submitError != null) ...[
                const SizedBox(height: AppSpace.lg),
                Text(c.submitError!, style: context.text.bodyMedium?.copyWith(color: context.colors.error)),
              ],
              const SizedBox(height: AppSpace.xl),
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.md),
                child: Text('Илгээсний дараа засах боломжгүй.', style: context.text.bodySmall),
              ),
              FilledButton.icon(
                icon: const Icon(ExamIcons.send, size: 18),
                label: const Text('Шалгалт илгээх'),
                onPressed: () => Navigator.pop(context, true),
              ),
              const SizedBox(height: AppSpace.sm),
              OutlinedButton(onPressed: () => Navigator.pop(context, false), child: const Text('Үргэлжлүүлэх')),
            ],
          ),
        ),
      ),
    );
  }
}

class _Footer extends StatelessWidget {
  const _Footer({required this.canBack, required this.isLast, required this.onPrevious, required this.onNext});

  final bool canBack;
  final bool isLast;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Material(
      color: c.surface,
      child: SafeArea(
        top: false,
        child: Container(
          decoration: BoxDecoration(
            border: Border(top: BorderSide(color: c.line)),
          ),
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter, vertical: AppSpace.sm),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: canBack ? onPrevious : null,
                  icon: const Icon(ExamIcons.previous, size: 18),
                  label: const Text('Өмнөх'),
                ),
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: FilledButton.icon(
                  onPressed: onNext,
                  icon: Icon(isLast ? ExamIcons.review : ExamIcons.next, size: 18),
                  label: Text(isLast ? 'Шалгах' : 'Дараах'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Busy extends StatelessWidget {
  const _Busy({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: AppColors.scrim,
        child: Center(
          child: AppCard(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                const SizedBox(width: AppSpace.md),
                Text(label),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Хариуг бичвэрээр (жагсаалт, эргэн харалтад).
String? describeAnswer(Object? v) => isAnswered(v) ? answerDisplay(v) : null;
