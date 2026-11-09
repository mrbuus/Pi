import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../exam/data/exam_models.dart' show ProblemFormat, ReviewChoice, ReviewProblem, YoutubeLink;
import '../../exam/ui/widgets/review_parts.dart' show ReviewProblemCard;
import '../data/homework_models.dart';
import '../data/homework_repository.dart';
import '../domain/homework_activity.dart';
import '../domain/homework_logic.dart';
import 'homework_badges.dart';
import 'homework_photo_panel.dart';
import 'homework_providers.dart';

/// `/app/homework/:testId?date=&classroomId=` — ангид хийсэн тестийн нөгөө (B) хувилбарыг гэртээ бодох.
/// «Шалгах» 2 удаа (зөв/буруу л — бодож байх үед зөв хариу харагдахгүй), дараа нь «Илгээх». Оноо, хугацаа
/// серверт. Илгээсний дараа алдсан бодлогын зөв хариу, бодолт, бичлэг (сервер нээсэн бол) ба дэвтрийн зураг
/// илгээх товч (вэбийн `HomeworkResult`). Идэвхийн тоолуур 45 секунд тутам хадгалагдана.
class HomeworkSolveScreen extends ConsumerStatefulWidget {
  const HomeworkSolveScreen({super.key, required this.testId, required this.date, this.classroomId});

  final String testId;

  /// Анги тестийг хийсэн өдөр (`YYYY-MM-DD`).
  final String date;

  /// Дэвтрийн зураг илгээх товчинд (жагсаалтаас ирсэн бол).
  final String? classroomId;

  @override
  ConsumerState<HomeworkSolveScreen> createState() => _HomeworkSolveScreenState();
}

class _HomeworkSolveScreenState extends ConsumerState<HomeworkSolveScreen> {
  HwAttempt? _attempt;
  ApiError? _loadError;
  final _answers = <String, Object?>{};
  final _saved = <String, Object?>{};
  final _controllers = <String, TextEditingController>{};
  Map<String, CheckResult>? _results;
  int _checksUsed = 0;
  HwScore? _score;
  bool _submitted = false;
  bool _busy = false;
  bool _saving = false;
  Timer? _debounce;
  Timer? _ticker;
  Timer? _heartbeat;
  int? _remaining;
  HwReview? _review;
  HomeworkActivityClock? _clock;
  AppLifecycleListener? _lifecycle;

  /// Өөр төхөөрөмжөөс илгээгдсэн (409) — дахин ачаалж байна, давхар бүү хадгал.
  bool _reloading = false;

  static const heartbeat = Duration(seconds: 45);

  HwActivity? get _activity => _clock?.snapshot(DateTime.now());

  /// initState-д авна — dispose дотор `ref` ашиглаж болохгүй.
  late final HomeworkRepository _repo;

  @override
  void initState() {
    super.initState();
    _repo = ref.read(homeworkRepositoryProvider);
    _lifecycle = AppLifecycleListener(
      onHide: () {
        _clock?.hide(DateTime.now());
        unawaited(_save(force: true)); // гарах агшинд хариу, тоолуурыг шууд хадгална
      },
      onShow: () => _clock?.show(DateTime.now()),
    );
    _load();
  }

  @override
  void dispose() {
    _lifecycle?.dispose();
    _debounce?.cancel();
    _ticker?.cancel();
    _heartbeat?.cancel();
    // Хүлээгдэж буй хариуг алдахгүй (тоолуур нь 45 секундын цохилт, апп-аас гарах үед хадгалагддаг).
    if (!_submitted && !_reloading && _attempt != null && changedAnswers(_answers, _saved).isNotEmpty) {
      unawaited(
        _repo.saveAnswers(_attempt!.attemptId, changedAnswers(_answers, _saved), activity: _activity).catchError((_) {}),
      );
    }
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loadError = null;
      _attempt = null;
    });
    try {
      final a = await _repo.startAttempt(testId: widget.testId, date: widget.date);
      if (!mounted) return;
      setState(() {
        _attempt = a;
        _answers
          ..clear()
          ..addAll(a.answers);
        _saved
          ..clear()
          ..addAll(a.answers);
        _checksUsed = a.checksUsed;
        _submitted = a.submitted;
        _score = a.score;
        _results = a.lastCheck;
        _remaining = a.submitted ? null : a.remainingSec;
        _review = a.review;
        _reloading = false;
        _clock = a.submitted ? null : HomeworkActivityClock(a.activity, DateTime.now());
      });
      _startTicker();
      _heartbeat?.cancel();
      if (!a.submitted) _heartbeat = Timer.periodic(heartbeat, (_) => unawaited(_save(force: true)));
    } on ApiError catch (e) {
      if (mounted) setState(() => _loadError = e);
    }
  }

  void _startTicker() {
    _ticker?.cancel();
    if (_remaining == null) return;
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _remaining = (_remaining ?? 0) - 1);
      if ((_remaining ?? 1) <= 0) {
        _ticker?.cancel();
        // Хугацаа дууссан — сервер хадгалсан хариугаар дүгнэнэ.
        unawaited(_submit(confirm: false));
      }
    });
  }

  TextEditingController _controller(String id, String initial) =>
      _controllers.putIfAbsent(id, () => TextEditingController(text: initial));

  void _set(String problemId, Object? value) {
    setState(() {
      _answers[problemId] = value;
      _results = null; // Хариу өөрчлөгдвөл өмнөх шалгалтын тэмдэг хуучирна.
    });
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 1200), _save);
  }

  /// [force] — хариу өөрчлөгдөөгүй ч идэвхийн тоолуурыг илгээнэ (45 секундын цохилт, апп-аас гарах).
  Future<void> _save({bool force = false}) async {
    final a = _attempt;
    if (a == null || _submitted || _reloading) return;
    final diff = changedAnswers(_answers, _saved);
    if (diff.isEmpty && !force) return;
    if (diff.isNotEmpty && mounted) setState(() => _saving = true);
    try {
      await _repo.saveAnswers(a.attemptId, diff, activity: _activity);
      _saved.addAll(diff);
    } on ApiError catch (e) {
      if (e.kind == ApiErrorKind.conflict) {
        // Өөр төхөөрөмжөөс илгээгдсэн эсвэл хугацаа дууссан — серверийн төлөвийг (дүнг) дахин ачаална.
        _reloading = true;
        _snack(e.message);
        if (mounted) unawaited(_load());
      }
      // Сүлжээний алдаа — дараагийн өөрчлөлт / цохилтоор дахин илгээнэ.
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _check() async {
    final a = _attempt;
    if (a == null) return;
    setState(() => _busy = true);
    try {
      final r = await _repo.check(a.attemptId, Map.of(_answers), activity: _activity);
      _saved.addAll(_answers);
      if (!mounted) return;
      setState(() {
        _results = r.results;
        _checksUsed = r.checksUsed ?? _checksUsed + 1;
      });
      _snack('${r.total} бодлогоос ${r.correct} нь зөв');
    } on ApiError catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit({bool confirm = true}) async {
    final a = _attempt;
    if (a == null || _submitted) return;
    if (confirm) {
      final yes = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Илгээх үү?'),
          content: const Text('Илгээсний дараа хариугаа өөрчлөх боломжгүй.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text(AppStrings.cancel)),
            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Илгээх')),
          ],
        ),
      );
      if (yes != true) return;
    }
    _debounce?.cancel();
    setState(() => _busy = true);
    try {
      final r = await _repo.submit(a.attemptId, Map.of(_answers), activity: _activity);
      _saved.addAll(_answers);
      _ticker?.cancel();
      _heartbeat?.cancel();
      ref.invalidate(homeworkDaysProvider);
      if (!mounted) return;
      setState(() {
        _submitted = true;
        _results = r.results;
        _score = HwScore(r.correct, r.total);
        _remaining = null;
        _review = r.review;
      });
    } on ApiError catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _snack(String text) => ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) {
    final a = _attempt;
    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const Text('Гэрийн даалгавар'),
        actions: [
          if (_remaining != null)
            Padding(
              padding: const EdgeInsets.only(right: AppSpace.lg),
              child: Center(
                child: Semantics(
                  label: 'Үлдсэн хугацаа ${formatClock(_remaining!)}',
                  child: ExcludeSemantics(
                    child: Row(
                      children: [
                        Icon(AppIcons.time, size: 16, color: context.colors.inkDim),
                        const SizedBox(width: AppSpace.xs),
                        Text(formatClock(_remaining!), style: context.text.titleSmall),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: _loadError != null
          ? ErrorState(
              title: _loadError!.kind == ApiErrorKind.forbidden ? 'Нээгдээгүй байна' : 'Алдаа гарлаа',
              message: _loadError!.message,
              onRetry: _loadError!.isRetryable ? _load : null,
            )
          : a == null
          ? const LoadingState()
          : _body(a),
      bottomNavigationBar: a == null || _submitted ? null : _actions(a),
    );
  }

  Widget _body(HwAttempt a) {
    if (a.problems.isEmpty) return const EmptyState(title: 'Бодлого алга');
    if (_submitted) return _resultBody(a);
    final header = _submitted
        ? _ResultHeader(score: _score)
        : _SaveStatus(saving: _saving, checksLeft: (a.maxChecks - _checksUsed).clamp(0, a.maxChecks));
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      itemCount: a.problems.length + 1,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpace.md),
      itemBuilder: (context, i) {
        if (i == 0) return header;
        final p = a.problems[i - 1];
        return _ProblemCard(
          number: i,
          problem: p,
          answer: _answers[p.id],
          result: _results?[p.id],
          enabled: !_submitted && !_busy,
          onChanged: (v) => _set(p.id, v),
          controller: _controller,
        );
      },
    );
  }

  /// Илгээсний дараа: дүн → алдсан бодлогын зөв хариу, бодолт → дэвтрийн зураг (вэбийн `HomeworkResult`).
  Widget _resultBody(HwAttempt a) {
    final images = ref.watch(fileImageProvider);
    final results = _results ?? const <String, CheckResult>{};
    final missed = [
      for (var i = 0; i < a.problems.length; i++)
        if (results[a.problems[i].id] == CheckResult.wrong || results[a.problems[i].id] == CheckResult.blank)
          (n: i + 1, p: a.problems[i]),
    ];
    final review = _review;
    final opensAt = review?.opensAt;
    final children = <Widget>[
      _ResultHeader(score: _score),
      if (missed.length > 1)
        _Notice(
          icon: AppIcons.warning,
          tone: context.colors.warning,
          text: '${missed.length} бодлого алдсан байна. Доорх зөв хариуг харж алдаагаа засаарай',
        ),
      if (missed.isNotEmpty && review != null && review.locked)
        _Notice(icon: AppIcons.password, tone: context.colors.inkDim, text: 'Зөв хариу удахгүй нээгдэнэ'),
      if (missed.isNotEmpty && review != null && !review.locked) ...[
        const SectionHeader(title: 'Алдсан бодлогууд', padding: EdgeInsets.only(top: AppSpace.sm)),
        if (opensAt != null)
          _Notice(
            icon: AppIcons.time,
            tone: context.colors.inkDim,
            text: 'Хариулаагүй бодлогын зөв хариу ${DateMn.numericWithTime(UbDateTime.fromInstant(opensAt))}-с нээгдэнэ',
          ),
        for (final m in missed)
          ReviewProblemCard(
            number: m.n,
            problem: _reviewProblem(m.p, review.items[m.p.id]),
            imageFor: images.image,
            status: results[m.p.id] == CheckResult.blank
                ? StatusPill(icon: AppIcons.circleDashed, label: 'Хариулаагүй', color: context.colors.inkDim, dashed: true)
                : StatusPill(icon: AppIcons.failure, label: 'Буруу', color: context.colors.error),
          ),
      ],
      if (widget.classroomId != null) _PhotoForDay(classroomId: widget.classroomId!, date: widget.date),
    ];
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      itemCount: children.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpace.md),
      itemBuilder: (_, i) => children[i],
    );
  }

  ReviewProblem _reviewProblem(HwProblem p, HwReviewItem? item) => ReviewProblem(
        format: ProblemFormat.parse(p.format),
        statementText: p.statementText,
        imageKey: p.imageKey,
        choices: p.choices == null
            ? null
            : [for (final c in p.choices!) ReviewChoice(letter: c.label, text: c.text, image: c.imageKey)],
        myAnswer: isBlankAnswer(_answers[p.id]) ? null : _answers[p.id],
        correctAnswer: item?.correct,
        solution: item?.solution,
        youtube: item?.videoUrl == null ? null : YoutubeLink(item!.videoUrl!, null),
      );

  Widget _actions(HwAttempt a) {
    final left = (a.maxChecks - _checksUsed).clamp(0, a.maxChecks);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.md),
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _busy || left <= 0 ? null : _check,
                child: Text(left > 0 ? 'Шалгах ($left)' : 'Шалгах эрх дууссан'),
              ),
            ),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              child: FilledButton(onPressed: _busy ? null : _submit, child: const Text('Илгээх')),
            ),
          ],
        ),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.tone, required this.text});

  final IconData icon;
  final Color tone;
  final String text;

  @override
  Widget build(BuildContext context) => Semantics(
        liveRegion: true,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(padding: const EdgeInsets.only(top: 2), child: Icon(icon, size: 18, color: tone)),
            const SizedBox(width: AppSpace.sm),
            Expanded(child: Text(text, style: context.text.bodyMedium)),
          ],
        ),
      );
}

/// Илгээсний дараа тухайн хичээлийн өдрийн дэвтрийн зураг (вэбийн `PhotoButton`). Өдөр жагсаалтад
/// байхгүй бол (14 хоногоос хуучин) юу ч харуулахгүй.
class _PhotoForDay extends ConsumerWidget {
  const _PhotoForDay({required this.classroomId, required this.date});

  final String classroomId;
  final String date;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final days = ref.watch(homeworkDaysProvider).value;
    final today = ref.watch(todayKeyProvider);
    HwDay? day;
    for (final d in days ?? const <HwDay>[]) {
      if (d.classroomId == classroomId && d.date == date) day = d;
    }
    if (day == null) return const SizedBox.shrink();
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Дэвтрийн зураг', style: context.text.titleSmall),
          const SizedBox(height: AppSpace.sm),
          HomeworkPhotoPanel(day: day, canSend: canSendPhoto(day, today)),
        ],
      ),
    );
  }
}

class _SaveStatus extends StatelessWidget {
  const _SaveStatus({required this.saving, required this.checksLeft});

  final bool saving;
  final int checksLeft;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            'Хариугаа бөглөөд «Шалгах»-аар зөв эсэхийг харна ($checksLeft удаа үлдсэн)',
            style: context.text.bodySmall,
          ),
        ),
        if (saving) Text('Хадгалж байна', style: context.text.labelSmall),
      ],
    );
  }
}

class _ResultHeader extends StatelessWidget {
  const _ResultHeader({required this.score});

  final HwScore? score;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppCard(
      child: Row(
        children: [
          Icon(AppIcons.success, color: c.success, size: 32),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Илгээсэн', style: context.text.titleMedium),
                if (score != null)
                  Text('${score!.total} бодлогоос ${score!.correct} зөв', style: context.text.bodyMedium),
              ],
            ),
          ),
          if (score != null) Text('${score!.correct}/${score!.total}', style: context.text.displaySmall),
        ],
      ),
    );
  }
}

class _ProblemCard extends ConsumerWidget {
  const _ProblemCard({
    required this.number,
    required this.problem,
    required this.answer,
    required this.result,
    required this.enabled,
    required this.onChanged,
    required this.controller,
  });

  final int number;
  final HwProblem problem;
  final Object? answer;
  final CheckResult? result;
  final bool enabled;
  final ValueChanged<Object?> onChanged;
  final TextEditingController Function(String id, String initial) controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final images = ref.watch(fileImageProvider);
    final p = problem;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text('$number-р бодлого', style: context.text.titleSmall)),
              if (result != null) _ResultMark(result: result!),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          ProblemFigure(
            image: p.imageKey == null ? null : images.image(p.imageKey!),
            forbiddenMessage: 'Энэ зураг одоохондоо нээгдээгүй байна.',
            child: p.statementText == null ? null : MathText(p.statementText!),
          ),
          const SizedBox(height: AppSpace.md),
          _answerInput(context, images),
        ],
      ),
    );
  }

  Widget _answerInput(BuildContext context, FileImageFactory images) {
    final p = problem;
    final choices = p.choices;
    if (choices != null && choices.isNotEmpty) {
      final selected = choices.indexWhere((c) => c.label == answer);
      return ChoiceGrid(
        groupLabel: '$number-р бодлогын хариулт',
        choices: [
          for (final c in choices)
            ChoiceItem(label: c.label, text: c.text, image: c.imageKey == null ? null : images.image(c.imageKey!)),
        ],
        selectedIndex: selected < 0 ? null : selected,
        onSelect: enabled ? (i) => onChanged(choices[i].label) : null,
      );
    }
    if (p.fillSlots.isNotEmpty) {
      final current = answer is Map ? (answer! as Map).cast<String, Object?>() : const <String, Object?>{};
      return Wrap(
        spacing: AppSpace.md,
        runSpacing: AppSpace.sm,
        children: [
          for (final slot in p.fillSlots)
            SizedBox(
              width: 140,
              child: TextField(
                controller: controller('${p.id}/$slot', '${current[slot] ?? ''}'),
                enabled: enabled,
                keyboardType: const TextInputType.numberWithOptions(signed: true, decimal: true),
                decoration: InputDecoration(labelText: slot),
                onChanged: (v) => onChanged({...current, slot: v}),
              ),
            ),
        ],
      );
    }
    return TextField(
      controller: controller(p.id, answer is String ? answer! as String : ''),
      enabled: enabled,
      maxLength: 1000,
      decoration: const InputDecoration(labelText: 'Хариулт'),
      onChanged: onChanged,
    );
  }
}

class _ResultMark extends StatelessWidget {
  const _ResultMark({required this.result});

  final CheckResult result;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return switch (result) {
      CheckResult.correct => StatusPill(icon: AppIcons.success, label: 'Зөв', color: c.success),
      CheckResult.wrong => StatusPill(icon: AppIcons.failure, label: 'Буруу', color: c.error),
      CheckResult.blank => StatusPill(icon: AppIcons.circleDashed, label: 'Хариулаагүй', color: c.inkDim, dashed: true),
    };
  }
}
