import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/files/ui/file_gallery_screen.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../../homework/domain/homework_logic.dart' show cleanTitle;
import '../application/board_controller.dart';
import '../application/staff_providers.dart';
import '../data/staff_models.dart';
import '../domain/board_logic.dart';
import 'teacher_widgets.dart';

/// «Онлайн» дэлгэрэнгүй (вэбийн `OnlineDetail`, эзэн 2026-11-03): сурагчийн онлайн гэрийн даалгавар —
/// тестийн нэр дээд талд (дарахад тэр тестийн хариу), оноо, бодсон хугацаа, вэбээс гарсан тоо, хариуны
/// ганц багана (бодлогын дугаар + үсэг), илгээсэн дэвтрийн зураг. Бодлогын агуулга харуулахгүй.
class OnlineHomeworkSheet extends ConsumerStatefulWidget {
  const OnlineHomeworkSheet({
    super.key,
    required this.args,
    required this.className,
    required this.studentId,
    required this.name,
  });

  final BoardArgs args;
  final String className;
  final String studentId;
  final String name;

  static Future<void> open(
    BuildContext context, {
    required BoardArgs args,
    required String className,
    required String studentId,
    required String name,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => OnlineHomeworkSheet(args: args, className: className, studentId: studentId, name: name),
  );

  @override
  ConsumerState<OnlineHomeworkSheet> createState() => _OnlineHomeworkSheetState();
}

class _OnlineHomeworkSheetState extends ConsumerState<OnlineHomeworkSheet> {
  String? _pick;

  OnlineDetailArgs get _key => (classId: widget.args.classId, studentId: widget.studentId, date: widget.args.date);

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final async = ref.watch(onlineDetailProvider(_key));
    final data = async.value;
    final tests = data?.tests ?? const <OnlineDetailTest>[];
    final current = data?.current(_pick);
    return ConstrainedBox(
      constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.92),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.xs, AppSpace.sm),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Icon(AppIcons.laptop, size: 20, color: c.brand),
                ),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(
                        header: true,
                        child: Text(widget.name, style: context.text.titleLarge, overflow: TextOverflow.ellipsis),
                      ),
                      Meta(
                        items: [widget.className, previousLessonLabel(data?.previousLessonDate)],
                        style: context.text.bodySmall?.copyWith(color: c.inkDim),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Хаах',
                  constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
                  icon: Icon(AppIcons.close, color: c.inkDim),
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ],
            ),
          ),
          // Тестийн нэр — дээд талд; дарахад тэр тестийн хариу
          if (tests.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.sm),
              child: Semantics(
                container: true,
                label: 'Онлайн гэрийн даалгаврын тест',
                child: Wrap(
                  spacing: AppSpace.sm,
                  runSpacing: AppSpace.sm,
                  children: [
                    for (final t in tests)
                      _TestChip(
                        key: ValueKey('online-test-${t.testId}'),
                        title: cleanTitle(t.title, variantLabel: t.variant, fallback: 'Тест'),
                        selected: t.testId == current?.testId,
                        submitted: t.attempt?.submitted ?? false,
                        onTap: () => setState(() => _pick = t.testId),
                      ),
                  ],
                ),
              ),
            ),
          Divider(height: 1, color: c.line),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xl),
              child: _body(context, async, data, current),
            ),
          ),
        ],
      ),
    );
  }

  Widget _body(BuildContext context, AsyncValue<OnlineDetail> async, OnlineDetail? data, OnlineDetailTest? current) {
    final c = context.colors;
    final dim = context.text.bodyMedium?.copyWith(color: c.inkDim);
    if (data == null && async.hasError) {
      final e = async.error;
      return ErrorState(
        message: e is ApiError && e.message.trim().isNotEmpty ? e.message : 'Мэдээлэл ачаалагдсангүй',
        onRetry: () => ref.invalidate(onlineDetailProvider(_key)),
      );
    }
    if (data == null) {
      return Semantics(
        liveRegion: true,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpace.xl),
          child: Row(
            children: [
              const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)),
              const SizedBox(width: AppSpace.sm),
              Text('Ачаалж байна', style: dim),
            ],
          ),
        ),
      );
    }
    final rec = ref.watch(boardControllerProvider(widget.args).select((s) => s.recs[widget.studentId]));
    final hw = rec?.hw;
    final hwNote = rec?.hwNote.trim() ?? '';
    final photo = data.photo;
    if (data.tests.isEmpty && photo == null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpace.xl),
        child: Text('Энэ хичээлд онлайн гэрийн даалгавар алга', textAlign: TextAlign.center, style: dim),
      );
    }
    final a = current?.attempt;
    final exam = current?.exam;
    const gap = SizedBox(height: AppSpace.md);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (current != null && a == null && exam == null) ...[
          DashedBox(
            padding: const EdgeInsets.all(AppSpace.md),
            child: Text('Онлайнаар бодоогүй', style: dim),
          ),
          gap,
        ],
        if (current != null && a == null && exam != null) ...[
          _Bordered(
            padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.xs, AppSpace.xs, AppSpace.xs),
            child: Row(
              children: [
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      text: 'Оноо ',
                      children: [
                        TextSpan(
                          text: scoreText(exam.score, exam.max),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                    style: context.text.bodyMedium,
                  ),
                ),
                TextButton.icon(
                  style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                  onPressed: () => context.push('/app/tests/${Uri.encodeComponent(current.testId)}/results'),
                  iconAlignment: IconAlignment.end,
                  icon: const Icon(AppIcons.externalLink, size: 14),
                  label: const Text('Дүн нээх'),
                ),
              ],
            ),
          ),
          gap,
        ],
        if (a != null) ...[
          _Stats(attempt: a),
          const SizedBox(height: AppSpace.sm),
          Meta(
            items: [
              if (a.late) 'Хоцорч илгээсэн',
              if (a.awaySec > 0) 'вэбээс гарсан ${durationSpan(a.awaySec)}',
              if (a.durationSec != null) 'эхэлснээс илгээх хүртэл ${durationSpan(a.durationSec!)}',
              if (a.checksUsed > 0) 'шалгасан ${a.checksUsed} удаа',
            ],
            style: context.text.bodySmall?.copyWith(color: c.inkDim),
          ),
          gap,
        ],
        // Дэвтрийн зураг — дарж бүтэн дэлгэцээр харна
        if (photo != null) ...[_PhotoSection(photo: photo, name: widget.name, className: widget.className), gap],
        // Хариуны ганц багана: бодлогын дугаар + үсэг; алдсан бол зөв хариу
        if (a != null) ...[_Answers(items: a.items), gap],
        if (photo == null && a != null) ...[
          Text('Дэвтрийн зураг илгээгээгүй', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
          gap,
        ],
        if (data.redos.isNotEmpty) ...[_Redos(redos: data.redos), gap],
        if (hw != null || hwNote.isNotEmpty)
          Semantics(
            container: true,
            label: 'Даалгаврын тэмдэглэл',
            child: _Bordered(
              color: c.surfaceSunken,
              padding: const EdgeInsets.all(AppSpace.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _Heading('Даалгаврын тэмдэглэл'),
                  const SizedBox(height: AppSpace.xs),
                  if (hw != null)
                    Text(homeworkMeta(hw).label, style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                  if (hwNote.isNotEmpty) Text(hwNote, style: context.text.bodyMedium),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _TestChip extends StatelessWidget {
  const _TestChip({
    super.key,
    required this.title,
    required this.selected,
    required this.submitted,
    required this.onTap,
  });

  final String title;
  final bool selected;
  final bool submitted;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final radius = BorderRadius.circular(AppRadius.md);
    return Semantics(
      button: true,
      selected: selected,
      label: title,
      excludeSemantics: true,
      child: Material(
        color: selected ? c.brandBright.withValues(alpha: 0.1) : c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: radius,
          side: BorderSide(color: selected ? c.brandBright : c.line),
        ),
        child: InkWell(
          borderRadius: radius,
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: teacherTap),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Flexible(
                    child: Text(
                      title,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.labelLarge?.copyWith(color: selected ? c.brandSoft : c.ink),
                    ),
                  ),
                  if (submitted) ...[
                    const SizedBox(width: AppSpace.xs),
                    Icon(AppIcons.success, size: 16, color: c.success),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Stats extends StatelessWidget {
  const _Stats({required this.attempt});

  final OnlineAttempt attempt;

  @override
  Widget build(BuildContext context) {
    final a = attempt;
    final score = a.score != null && a.total != null
        ? scoreText(a.score!, a.total!)
        : a.submitted
        ? '–'
        : 'Бодож байна';
    final stats = <(String, String, bool)>[
      ('Зөв', score, false),
      ('Бодсон хугацаа', durationSpan(a.activeSec), false),
      ('Вэбээс гарсан', a.leaveCount > 0 ? '${a.leaveCount} удаа' : 'Гараагүй', a.leaveCount > 3),
      ('Эхэлсэн', onlineStamp(a.startedAt), false),
      (
        a.submittedAt != null ? 'Илгээсэн' : 'Төлөв',
        a.submittedAt != null ? onlineStamp(a.submittedAt) : 'Илгээгээгүй',
        a.late,
      ),
      ('Нээсэн', '${a.openCount} удаа', false),
    ];
    return LayoutBuilder(
      builder: (context, box) {
        final cols = box.maxWidth >= 480 ? 3 : 2;
        const gap = AppSpace.sm;
        final w = (box.maxWidth - gap * (cols - 1)) / cols;
        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            for (final (label, value, warn) in stats)
              SizedBox(
                width: w,
                child: _Stat(label: label, value: value, warn: warn),
              ),
          ],
        );
      },
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, this.warn = false});

  final String label;
  final String value;
  final bool warn;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: '$label $value',
      excludeSemantics: true,
      child: _Bordered(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm - 2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: context.text.labelSmall?.copyWith(color: c.inkDim),
            ),
            Text(
              value,
              overflow: TextOverflow.ellipsis,
              style: context.text.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: warn ? c.warning : c.ink,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PhotoSection extends StatelessWidget {
  const _PhotoSection({required this.photo, required this.name, required this.className});

  final OnlinePhoto photo;
  final String name;
  final String className;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final small = context.text.labelMedium?.copyWith(color: c.inkDim);
    return Semantics(
      container: true,
      label: 'Илгээсэн дэвтрийн зураг',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: AppSpace.sm,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const _Heading('Дэвтрийн зураг'),
              Text('илгээсэн ${onlineStamp(photo.uploadedAt)}', style: small),
              if (photo.late)
                Text(
                  'Хоцорсон',
                  style: context.text.labelMedium?.copyWith(color: c.error, fontWeight: FontWeight.w600),
                ),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          OutlinedButton.icon(
            key: const ValueKey('online-photo'),
            style: OutlinedButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
            onPressed: () => FileGalleryScreen.open(
              context,
              fileKeys: [photo.fileKey],
              title: '$name — дэвтрийн зураг',
              subtitle: className,
            ),
            icon: const Icon(AppIcons.gallery, size: 18),
            label: Text('Харах, ${photo.pages} хуудас'),
          ),
        ],
      ),
    );
  }
}

class _Answers extends StatelessWidget {
  const _Answers({required this.items});

  final List<OnlineItem> items;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      container: true,
      label: 'Хариу',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _Heading('Хариу'),
          const SizedBox(height: AppSpace.xs),
          _Bordered(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: Column(
                children: [
                  for (final (i, it) in items.indexed) ...[
                    if (i > 0) Divider(height: 1, color: c.line),
                    _AnswerRow(item: it),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AnswerRow extends StatelessWidget {
  const _AnswerRow({required this.item});

  final OnlineItem item;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final it = item;
    const tabular = [FontFeature.tabularFigures()];
    final verdict = switch (it.result) {
      OnlineItemResult.correct => 'Зөв',
      OnlineItemResult.wrong => 'Буруу',
      OnlineItemResult.blank => 'Хариулаагүй',
      null => null,
    };
    final showCorrect = (it.wrong || it.result == OnlineItemResult.blank) && it.correct != null;
    final semantic = [
      '${it.n}',
      it.blank ? 'хариугүй' : (it.mine ?? ''),
      ?verdict,
      if (showCorrect) 'зөв хариу ${it.correct}',
    ].join(', ');
    return Semantics(
      container: true,
      label: semantic,
      excludeSemantics: true,
      child: Container(
        key: ValueKey('online-answer-${it.n}'),
        constraints: const BoxConstraints(minHeight: 32),
        color: it.wrong ? c.error.withValues(alpha: 0.07) : null,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.md - 2),
        child: Row(
          children: [
            SizedBox(
              width: 24,
              child: Text(
                '${it.n}',
                textAlign: TextAlign.right,
                style: context.text.labelSmall?.copyWith(color: c.inkDim, fontFeatures: tabular),
              ),
            ),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              child: Text(
                it.blank ? '–' : (it.mine ?? ''),
                overflow: TextOverflow.ellipsis,
                style: context.text.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: it.blank ? c.inkDim : c.ink,
                  fontFeatures: tabular,
                ),
              ),
            ),
            if (it.result == OnlineItemResult.correct) Icon(AppIcons.success, size: 16, color: c.success),
            if (it.wrong || it.result == OnlineItemResult.blank) ...[
              Icon(AppIcons.failure, size: 16, color: c.error),
              if (showCorrect) ...[
                const SizedBox(width: AppSpace.xs),
                Text(
                  it.correct!,
                  style: context.text.labelSmall?.copyWith(color: c.inkDim, fontWeight: FontWeight.w600),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _Redos extends StatelessWidget {
  const _Redos({required this.redos});

  final List<OnlineRedo> redos;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      container: true,
      label: 'Дахин бодсон',
      child: _Bordered(
        padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.sm, AppSpace.md, AppSpace.xs),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const _Heading('Дахин бодсон'),
            for (final (i, r) in redos.indexed) ...[
              if (i > 0) Divider(height: 1, color: c.line),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpace.sm - 2),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            cleanTitle(r.title, variantLabel: r.variant, fallback: 'Тест'),
                            overflow: TextOverflow.ellipsis,
                            style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          Meta(
                            items: [
                              if (r.inClass) 'Ангид бодсон тест' else 'Гэрийн тест',
                              if (r.submittedAt != null) 'илгээсэн ${onlineStamp(r.submittedAt)}' else 'илгээгээгүй',
                              'бодсон ${durationSpan(r.activeSec)}',
                              if (r.leaveCount > 0) 'вэбээс гарсан ${r.leaveCount} удаа',
                            ],
                            style: context.text.bodySmall?.copyWith(color: c.inkDim),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Text(
                      r.score != null && r.total != null ? scoreText(r.score!, r.total!) : 'Бодож байна',
                      style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Semantics(
    header: true,
    child: Text(
      text,
      style: context.text.labelMedium?.copyWith(color: context.colors.inkDim, fontWeight: FontWeight.w700),
    ),
  );
}

/// Нимгэн хүрээтэй саарал/цагаан хайрцаг (өнгөт дэвсгэргүй).
class _Bordered extends StatelessWidget {
  const _Bordered({required this.child, this.padding = EdgeInsets.zero, this.color});

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;

  @override
  Widget build(BuildContext context) => Container(
    padding: padding,
    decoration: BoxDecoration(
      color: color ?? context.colors.surface,
      borderRadius: BorderRadius.circular(AppRadius.md),
      border: Border.all(color: context.colors.line),
    ),
    child: child,
  );
}
